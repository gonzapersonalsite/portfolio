#!/usr/bin/env python3
"""Runs a test command that writes JUnit XML reports and prints, from them, the
three guards that gates.txt declares (`#lesson-a-silent-suite-reads-as-green`).
It is the adapter of any runner that writes that format: Gradle, Maven
Surefire, pytest (--junitxml), Vitest and Jest (with a junit reporter), Karma
(with karma-junit-reporter).

    python tools/guards/junit.py --report <file or directory> [--report ...] -- <command ...>

Before the command runs, the reports a previous run left are removed, so none
passes for this one: the XML files whose root is a test suite, the named file
or those under the named directory; any other XML there (a pom.xml, a
manifest) is neither removed nor read. A report path that is the root of the
repository, holds it, or holds versioned files is refused before anything is
removed or run: a report is not versioned, and a typo there would delete the
repository's files on every run. The command is joined again and runs through
the system's shell, from where the gate runs; it is bounded by the budget
verify.py gives the gate. Then every report is read:

- `guard registered`: the test cases the reports list against the tests their
  suites declare, and at least one.
- `guard finished`: no test case ended in <error>: it crashed instead of
  failing an assertion.
- `guard silent`: where the report counts the assertions of each test case (an
  `assertions` attribute), every one that ran made one. Where it does not, and
  most runners do not, the weaker guard the owner accepted is printed as such:
  more than 0 tests ran and none failed.

The verdict is green only if the command exits 0, nothing failed or crashed
and the three guards hold. Requires Python 3.8+ and nothing else.
"""
import os
import shlex
import subprocess
import sys
import xml.etree.ElementTree as ElementTree

SEPARATOR = "--"
REPORT_FLAG = "--report"
USAGE = "uso: python tools/guards/junit.py --report <fichero o directorio> [--report ...] -- <comando ...>"
WEAKER = "debil: el informe no cuenta aserciones, asi que vale mas de 0 ejecutados y 0 fallidos"
# The root elements of a JUnit XML report, with any namespace dropped.
REPORT_ROOTS = ("testsuite", "testsuites")
GIT_SECONDS = 30
SHOWN = 5


def parse_args(argv):
    """The report paths and the command, or an error in words."""
    if SEPARATOR not in argv:
        return {"reports": [], "command": [], "error": "falta '%s' antes del comando" % SEPARATOR}
    cut = argv.index(SEPARATOR)
    options, command = argv[:cut], argv[cut + 1:]
    reports = []
    while options:
        if options[0] != REPORT_FLAG or len(options) < 2:
            return {"reports": [], "command": [], "error": "argumento no reconocido: %s" % options[0]}
        reports.append(options[1])
        options = options[2:]
    if not reports or not command:
        return {"reports": [], "command": [], "error": "hacen falta al menos un %s y un comando" % REPORT_FLAG}
    return {"reports": reports, "command": command, "error": ""}


def root_tag(path):
    """The tag of an XML file's root element without its namespace, or ''
    when it does not open as XML. Only the start is read, so a report that a
    crash cut short still names its root."""
    try:
        with open(path, "rb") as handle:
            for _, element in ElementTree.iterparse(handle, events=("start",)):
                return element.tag.rsplit("}", 1)[-1]
    except (ElementTree.ParseError, OSError):
        return ""
    return ""


def is_report(path):
    return root_tag(path) in REPORT_ROOTS


def report_files(path):
    """The reports a report path names: the file itself, or the .xml files
    under the directory whose root is a test suite."""
    if os.path.isfile(path):
        return [path]
    found = []
    for folder, _, names in os.walk(path):
        found += [os.path.join(folder, name) for name in sorted(names) if name.endswith(".xml") and is_report(os.path.join(folder, name))]
    return sorted(found)


GIT_LOCATION = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY",
                "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CEILING_DIRECTORIES", "GIT_DISCOVERY_ACROSS_FILESYSTEM",
                "GIT_NAMESPACE", "GIT_PREFIX")


def tracked_under(path):
    """The files git versions under a path, [] where git cannot say (no git,
    no repository): then only reports are ever removed, which is still safe."""
    environment = {key: value for key, value in os.environ.items() if key not in GIT_LOCATION}
    try:
        done = subprocess.run(["git", "ls-files", "-z", "--", path], env=environment, stdin=subprocess.DEVNULL, capture_output=True, timeout=GIT_SECONDS)
    except (OSError, subprocess.TimeoutExpired):
        return []
    return [name for name in done.stdout.decode("utf-8", "replace").split("\0") if name] if done.returncode == 0 else []


def unsafe_report_path(path, here, tracked):
    """Why a report path must not be emptied, or '' when it may: the root of
    the repository (where the gate runs) or a folder that holds it, or one
    with versioned files. `tracked` lists what git versions under a path."""
    full, root = os.path.normcase(os.path.abspath(path)), os.path.normcase(os.path.abspath(here))
    if full == root or root.startswith(full.rstrip(os.sep) + os.sep):
        return "'%s' es la raiz del repositorio o la contiene: los informes viven en su propia carpeta" % path
    versioned = tracked(path)
    if versioned:
        more = "" if len(versioned) <= SHOWN else " y %d mas" % (len(versioned) - SHOWN)
        return "'%s' tiene ficheros versionados (%s%s): un informe no se versiona, y vaciar esa ruta los borraria" % (path, ", ".join(versioned[:SHOWN]), more)
    return ""


def shell_line(command):
    return subprocess.list2cmdline(command) if os.name == "nt" else " ".join(shlex.quote(word) for word in command)


def counts_of(texts):
    """What a set of JUnit XML reports say. A suite's 'tests' counts as
    declared only in the suites that hold test cases themselves, so a nested
    report is not counted twice. 'problems' names what could not be read."""
    counts = {"listed": 0, "declared": 0, "declares": True, "failed": 0, "crashed": 0, "skipped": 0, "ran": 0, "with_checks": 0,
              "counts_checks": True, "problems": []}
    for name, text in texts:
        try:
            root = ElementTree.fromstring(text)
        except ElementTree.ParseError as error:
            counts["problems"].append("%s no es XML: %s" % (name, error))
            continue
        tag = root.tag.rsplit("}", 1)[-1]
        if tag not in REPORT_ROOTS:
            counts["problems"].append("%s no es un informe JUnit: su raiz es <%s>, no <%s>" % (name, tag, "> ni <".join(REPORT_ROOTS)))
            continue
        for suite in root.iter("testsuite"):
            cases = suite.findall("testcase")
            if not cases:
                continue
            if suite.get("tests", "").isdigit():
                counts["declared"] += int(suite.get("tests"))
            else:
                counts["declares"] = False
        for case in root.iter("testcase"):
            counts["listed"] += 1
            if case.find("skipped") is not None:
                counts["skipped"] += 1
                continue
            counts["ran"] += 1
            counts["failed"] += 1 if case.find("failure") is not None else 0
            counts["crashed"] += 1 if case.find("error") is not None else 0
            checks = case.get("assertions", "")
            if not checks.isdigit():
                counts["counts_checks"] = False
            elif int(checks) > 0:
                counts["with_checks"] += 1
    return counts


def guard_lines(counts):
    """The three guards by their canonical names, [PASS] or [FAIL], and whether all hold."""
    declared = counts["declared"] if counts["declares"] else counts["listed"]
    registered = counts["listed"] > 0 and counts["listed"] == declared and not counts["problems"]
    finished = counts["crashed"] == 0 and not counts["problems"]
    if counts["counts_checks"] and counts["ran"]:
        silent = counts["with_checks"] == counts["ran"]
        said = "%d ejecutados, %d con al menos una asercion" % (counts["ran"], counts["with_checks"])
    else:
        silent = counts["ran"] > 0 and counts["failed"] == 0
        said = "%d ejecutados, %d fallidos (%s)" % (counts["ran"], counts["failed"], WEAKER)
    lines = ["[%s] guard registered: %d en los informes, %d declarados por sus suites%s"
             % ("PASS" if registered else "FAIL", counts["listed"], declared, "" if counts["declares"] else " (no declaran su total)"),
             "[%s] guard finished: %d con error" % ("PASS" if finished else "FAIL", counts["crashed"]),
             "[%s] guard silent: %s" % ("PASS" if silent else "FAIL", said)]
    return {"lines": lines, "hold": registered and finished and silent}


def main(argv):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    request = parse_args(argv)
    if request["error"]:
        print(USAGE)
        print("RESULT: %s" % request["error"])
        return 2
    unsafe = [why for why in (unsafe_report_path(path, os.getcwd(), tracked_under) for path in request["reports"]) if why]
    if unsafe:
        for why in unsafe:
            print(why)
        print("RESULT: una ruta de informes no se puede vaciar; no se borro ni se corrio nada")
        return 2
    for path in request["reports"]:
        for stale in report_files(path) if os.path.exists(path) else []:
            if is_report(stale):
                os.remove(stale)
    sys.stdout.flush()
    code = subprocess.run(shell_line(request["command"]), shell=True, stdin=subprocess.DEVNULL).returncode
    texts = []
    for path in request["reports"]:
        for file in report_files(path) if os.path.exists(path) else []:
            with open(file, "rb") as handle:
                texts.append((file, handle.read()))
    counts = counts_of(texts)
    if not texts:
        counts["problems"].append("el comando no escribio ningun informe en %s" % ", ".join(request["reports"]))
    for problem in counts["problems"]:
        print(problem)
    guards = guard_lines(counts)
    for line in guards["lines"]:
        print(line)
    print("RESULT: %d tests, %d fallidos, %d con error, el comando salio con %d" % (counts["listed"], counts["failed"], counts["crashed"], code))
    return 0 if code == 0 and guards["hold"] and counts["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
