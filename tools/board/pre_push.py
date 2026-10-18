#!/usr/bin/env python3
"""The gates of what leaves this machine. Git hands the pre-push hook, on its
input, the refs it is about to push; the gates can only verify the working
tree, so every ref pushed must be the commit the tree holds (HEAD) and no
tracked or untracked file may differ from it, before and after the gates run.
Then verify.py runs every gate, and the push goes on only if they come out
green and the tree is still HEAD.

    git push        runs it through .githooks/pre-push

A push that only deletes remote refs publishes nothing to verify, and passes
without looking at the tree or running the gates. Untracked files are not
pushed, but the gates read them too: a gate that is green because of one is not
green in a clone, so they refuse the push as well. What .gitignore excludes is
not compared: caches, restored dependencies and generated outputs stay as they
are, so a tree that passes here is not a clone. A gate that reads one of them
prepares it from the commit's sources, or refuses it when it no longer matches
them, as a runner that fingerprints its lockfiles does. verify.py is bounded by
the budgets of its gates; every git call here has its own.

Requires Python 3.8+ and nothing else.
"""
import os
import re
import subprocess
import sys

import board as B

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
GIT_SECONDS = 30
SHOWN = 10


def pushed_refs(text):
    """Git's four fields per nonempty line; ValueError refuses malformed input."""
    refs = []
    for number, line in enumerate(text.splitlines(), 1):
        parts = line.split()
        if not parts:
            continue
        if len(parts) != 4:
            raise ValueError("entrada invalida en la linea %d: git debe entregar cuatro campos" % number)
        local_ref, local_sha, remote_ref, remote_sha = parts
        if (len(local_sha) not in (40, 64) or len(remote_sha) != len(local_sha)
                or re.fullmatch(r"[0-9a-fA-F]+", local_sha) is None or re.fullmatch(r"[0-9a-fA-F]+", remote_sha) is None):
            raise ValueError("entrada invalida en la linea %d: los identificadores deben ser hashes completos del mismo formato" % number)
        deletion = local_sha == "0" * len(local_sha)
        if ((local_ref == "(delete)") != deletion or (deletion and remote_sha == "0" * len(remote_sha))
                or not remote_ref.startswith("refs/") or len(remote_ref) <= len("refs/")):
            raise ValueError("entrada invalida en la linea %d: referencias o borrado incoherentes" % number)
        refs.append({"local_ref": local_ref, "local_sha": local_sha, "remote_ref": remote_ref, "remote_sha": remote_sha})
    return refs


def is_deletion(ref):
    return set(ref["local_sha"]) == {"0"}


def push_problems(refs, head, commit_of):
    """A pushed ref whose commit is not HEAD is content the gates never saw.
    `commit_of` maps a pushed sha to the commit it names (a tag names one)."""
    found = []
    for ref in refs:
        if is_deletion(ref):
            continue
        commit = commit_of.get(ref["local_sha"], "")
        if commit != head:
            found.append("empujas %s (%s) y el arbol de trabajo tiene HEAD en %s: las puertas verifican el arbol, no lo que empujas."
                         " Empuja desde ese commit, con el arbol en el, o empuja HEAD" % (ref["local_ref"], ref["local_sha"][:12], head[:12] or "ningun commit"))
    return found


def tree_changes(porcelain):
    """'git status --porcelain=v1 -z' split into tracked files that changed and
    untracked ones. A rename or a copy carries its old path as the next entry."""
    tracked, untracked, skip = [], [], False
    for entry in porcelain.split("\0"):
        if skip:
            skip = False
            continue
        if len(entry) < 4:
            continue
        status, path = entry[:2], entry[3:]
        if status == "??":
            untracked.append(path)
            continue
        tracked.append(path)
        skip = status[0] in "RC"
    return {"tracked": tracked, "untracked": untracked}


def git(root, *args):
    done = subprocess.run(["git"] + list(args), cwd=root, env=B.V.without_git_location(os.environ),
                          stdin=subprocess.DEVNULL, capture_output=True, timeout=GIT_SECONDS)
    return {"code": done.returncode, "out": done.stdout.decode("utf-8", "replace"), "err": done.stderr.decode("utf-8", "replace").strip()}


def shown(paths):
    more = "" if len(paths) <= SHOWN else " y %d mas" % (len(paths) - SHOWN)
    return ", ".join(paths[:SHOWN]) + more


def check_push(root, refs):
    """The problems that refuse the push."""
    head = git(root, "rev-parse", "--verify", "-q", "HEAD")
    if head["code"] != 0:
        return {"problems": ["no hay HEAD que verificar: %s" % (head["err"] or "el repositorio no tiene commits")]}
    commit_of = {}
    for ref in refs:
        if not is_deletion(ref):
            commit_of[ref["local_sha"]] = git(root, "rev-parse", "--verify", "-q", ref["local_sha"] + "^{commit}")["out"].strip()
    status = git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all")
    if status["code"] != 0:
        return {"problems": ["git status fallo: %s" % status["err"]]}
    changes = tree_changes(status["out"])
    problems = push_problems(refs, head["out"].strip(), commit_of)
    if changes["tracked"]:
        problems.append("el arbol tiene cambios sin commitear en ficheros versionados (%s): las puertas verificarian algo distinto de lo que"
                        " empujas. Commitealos o apartalos y vuelve a empujar" % shown(changes["tracked"]))
    if changes["untracked"]:
        problems.append("hay ficheros sin versionar (%s): no se empujan, pero las puertas los leen; una puerta verde por uno de ellos"
                        " no lo es en un clon. Commitealos, ignoralos o apartalos y vuelve a empujar" % shown(changes["untracked"]))
    return {"problems": problems}


def rewritten_files(root):
    """The tracked files that differ from HEAD now, or None when git cannot say."""
    try:
        status = git(root, "status", "--porcelain=v1", "-z", "--untracked-files=no")
    except (OSError, subprocess.TimeoutExpired):
        return None
    return tree_changes(status["out"])["tracked"] if status["code"] == 0 else None


def refused_why(rewritten):
    """What a run of the gates that did not come out green asks for. The tree
    had no tracked change before it, so what it changed verify.py rewrote,
    which it does only when the verdict changes; None is a tree git could not
    read."""
    if rewritten is None:
        return ("las puertas no salieron en verde: si alguna esta en rojo, arreglala; si solo cambio el veredicto, commitea los derivados que"
                " se regeneraron. Push rechazado")
    if not rewritten:
        return "las puertas salieron en rojo (arriba, cuales y por que): arreglalas y vuelve a empujar. Push rechazado"
    return ("el veredicto cambio y verify.py reescribio %s: si su linea RESULT dice 0 en rojo, son derivados, commitealos y vuelve a"
            " empujar; si no, arregla antes las puertas en rojo. Push rechazado" % shown(rewritten))


def main(argv, root=ROOT, stdin=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    try:
        refs = pushed_refs((stdin or sys.stdin).read())
    except ValueError as error:
        print("pre-push: %s; push rechazado" % error, file=sys.stderr)
        return 1
    if not refs:
        print("pre-push: no se empuja ninguna referencia; las puertas no corren")
        return 0
    if all(is_deletion(ref) for ref in refs):
        print("pre-push: solo se borran referencias remotas: no se publica nada que verificar, y las puertas no corren")
        return 0
    try:
        judged = check_push(root, refs)
    except (OSError, subprocess.TimeoutExpired) as error:
        print("pre-push: git no respondio (%s): sin saber que se empuja no hay verde; push rechazado" % error, file=sys.stderr)
        return 1
    if judged["problems"]:
        for problem in judged["problems"]:
            print("pre-push: " + problem, file=sys.stderr)
        print("pre-push: push rechazado", file=sys.stderr)
        return 1
    sys.stdout.flush()
    code = subprocess.run([sys.executable, os.path.join(root, "verify.py")], cwd=root, stdin=subprocess.DEVNULL).returncode
    if code != 0:
        print("pre-push: " + refused_why(rewritten_files(root)), file=sys.stderr)
        return code
    try:
        after = check_push(root, refs)
    except (OSError, subprocess.TimeoutExpired) as error:
        print("pre-push: git no respondio (%s): sin saber que se empuja no hay verde; push rechazado" % error, file=sys.stderr)
        return 1
    if after["problems"]:
        for problem in after["problems"]:
            print("pre-push: el arbol cambio mientras corrian las puertas: " + problem, file=sys.stderr)
        print("pre-push: push rechazado", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
