#!/usr/bin/env python3
"""Checks the message of a commit before the commit exists: the shape that hard
rule 3 of AGENTS.md gives a subject, and no signature or co-authorship of an
agent. The types and the agents' names are data, in tools/board/commits.txt.

    python tools/board/commit_message.py <message file>    GREEN: exit 0

`.githooks/commit-msg` runs it. Git hands the hook the message as the editor
or `-m` left it, before cleaning it: under the scissors line of `commit -v`
lies the diff, which git drops and nobody judges; and with `-m`, lines that
open with '#' are kept, so a signature hidden in one is still a signature.
It imports nothing from the board: a broken board must not block the commit
that fixes it.

Requires Python 3.8+ and nothing else.
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DATA_FILE = "tools/board/commits.txt"
TYPE_KEY, AGENT_KEY = "type", "agent"
# A subject is a type, an optional scope in parentheses, an optional '!', ': '
# and the subject. A scope piece is a lower-case name or the id of a phase or a
# part (F6, H0.1), as the origin decided; pieces are separated by commas.
PARTS = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^()]*)\))?!?(?P<rest>.*)$", re.DOTALL)
SCOPE_PIECE = r"(?:[a-z0-9][a-z0-9 /_-]*|[A-Z][0-9]+(?:\.[0-9]+)*)"
SCOPE = re.compile(r"^" + SCOPE_PIECE + r"(?:, ?" + SCOPE_PIECE + r")*$")
SUBJECT = re.compile(r"^: \S")
# The subjects git writes itself (merge, revert, commit --fixup) pass the hook too.
GIT_SUBJECT = re.compile(r"^(?:Merge (?:branch|branches|remote-tracking branch|tag|commit|pull request) |(?:Revert|Reapply) \".*\"$|(?:fixup|squash|amend)! )")
TRAILER = re.compile(r"^[a-z-]+-by:", re.IGNORECASE)
GENERATED = re.compile(r"\b(?:generated|written|created) (?:with|by)\b", re.IGNORECASE)
# A '[bot]' account (GitHub's mark for an app) in a trailer is a tool's, whatever its name.
BOT = re.compile(r"\[bot\]", re.IGNORECASE)
SCISSORS = "------------------------ >8 ------------------------"
VERBOSE_DIFF = "diff --git "
COMMENT = "#"
UTF8_BOM = "\ufeff"
USAGE = "uso: python tools/board/commit_message.py <fichero del mensaje>"


def data_rows(text, key):
    """The values of one key in commits.txt: 'key value' lines, comments aside."""
    found = []
    for raw in text.split("\n"):
        line = raw.strip()
        if line.startswith(key + " ") and line[len(key):].strip():
            found.append(line[len(key):].strip())
    return found


def kept_lines(message):
    """The lines git keeps: everything above a scissors line that has the diff
    of 'commit -v' below it."""
    lines = [line.rstrip("\r") for line in message.split("\n")]
    for at, line in enumerate(lines):
        if line.startswith(COMMENT) and line[1:].strip() == SCISSORS and any(below.startswith(VERBOSE_DIFF) for below in lines[at:]):
            return lines[:at]
    return lines


def names_an_agent(line, agents):
    lowered = line.lower()
    return any(re.search(r"(?<![a-z0-9])" + re.escape(agent.lower()) + r"(?![a-z0-9])", lowered) for agent in agents)


def is_signature(line, agents):
    """A trailer ('...-by:') of a '[bot]' account, or a trailer or a
    'generated with' line that names an agent of commits.txt."""
    if TRAILER.match(line) and BOT.search(line):
        return True
    return bool(TRAILER.match(line) or GENERATED.search(line)) and names_an_agent(line, agents)


def shape_problem(subject):
    """Which part of 'type(scope): subject' a subject gets wrong, in words, or
    '' when it has the shape."""
    parts = PARTS.match(subject)
    if not parts:
        return "no empieza por un tipo en minusculas"
    if parts.group("scope") is not None and not SCOPE.match(parts.group("scope")):
        return ("el ambito '(%s)' no vale: va en minusculas (letras, digitos, espacios, '/', '_' o '-') o es el id de una fase o de una"
                " parte (F6, H0.1), y varios se separan con comas" % parts.group("scope"))
    if not SUBJECT.match(parts.group("rest")):
        return "tras el tipo, y el ambito si lo hay, van ': ' y el asunto"
    return ""


def problems(message, types, agents):
    """What is wrong with a commit message, in words; [] when nothing is."""
    kept = kept_lines(message.lstrip(UTF8_BOM))
    written = [line for line in kept if line.strip() and not line.startswith(COMMENT)]
    if not written:
        return ["el mensaje esta vacio"]
    found = []
    subject = written[0].strip()
    wrong = shape_problem(subject)
    if GIT_SUBJECT.match(subject):
        pass
    elif wrong:
        found.append("el asunto '%s' no tiene la forma 'tipo(ambito): asunto' de la regla dura 3 de AGENTS.md: %s" % (subject, wrong))
    elif PARTS.match(subject).group("type") not in types:
        found.append("el tipo '%s' no es ninguno de los de %s (%s): anadir uno es anadir una fila"
                     % (PARTS.match(subject).group("type"), DATA_FILE, ", ".join(types)))
    for line in kept:
        if is_signature(line.lstrip(COMMENT).strip(), agents):
            found.append("'%s' es firma o coautoria de un agente, y el mensaje no lleva ninguna (regla dura 3 de AGENTS.md)" % line.strip())
    return found


def read_text(path):
    with open(path, "rb") as handle:
        return handle.read().decode("utf-8", "replace")


def main(argv, root=ROOT):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    if len(argv) != 1:
        print(USAGE)
        return 2
    try:
        data = read_text(os.path.join(root, *DATA_FILE.split("/")))
    except OSError as error:
        print("commit-msg: %s no se puede leer (%s): sin tipos no se comprueba el mensaje, y sin comprobarlo no hay commit" % (DATA_FILE, error), file=sys.stderr)
        return 1
    types = data_rows(data, TYPE_KEY)
    if not types:
        print("commit-msg: %s no declara ningun 'type': sin tipos no hay mensaje valido" % DATA_FILE, file=sys.stderr)
        return 1
    try:
        message = read_text(argv[0])
    except OSError as error:
        print("commit-msg: el mensaje no se puede leer (%s)" % error, file=sys.stderr)
        return 1
    found = problems(message, types, data_rows(data, AGENT_KEY))
    for problem in found:
        print("commit-msg: " + problem, file=sys.stderr)
    if found:
        print("commit-msg: commit rechazado; el mensaje sigue en %s" % argv[0], file=sys.stderr)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
