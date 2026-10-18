#!/usr/bin/env python3
"""Runs a test command of package:test, `flutter test` or `dart test`, that
writes the JSON report of its file reporter, and prints, from it, the three
guards that gates.txt declares (`#lesson-a-silent-suite-reads-as-green`).
Neither runner writes JUnit XML.

    python tools/guards/dart_test.py --report <file> -- <command ...>

The command names the same file in its reporter, as in
`flutter test --file-reporter json:build/reports/tests.json`. Before it runs,
the report a previous run left is removed, so none passes for this one: only a
file whose first event is the reporter's `start`; any other file there is
neither removed nor read as a report. A report path that is the root of the
repository, holds it, or is versioned is refused before anything is removed or
run, as junit.py refuses it. The command is joined again and runs through the
system's shell, from where the gate runs; it is bounded by the budget verify.py
gives the gate. Then the report is read, one JSON event per line:

- `guard registered`: the tests that started, the hidden ones out (the loading
  of a suite, setUpAll and tearDownAll), against the tests the root group of
  every suite declares, and at least one; every suite declares tests (a test
  file without any has no root group); and every line of the report is an
  event. A suite that does not load shows up as a visible test that the groups
  never declared. Only the root groups count: a nested group declares a part
  of its root's tests.
- `guard finished`: every test that started finished, none in `error` (it
  crashed or did not load instead of failing an assertion), and the report
  closes with the runner's `done` event. flutter test reports an expectation
  that fails inside testWidgets as an `error` too, so a widget test that
  fails turns this guard red as well: the verdict is red either way.
- `guard silent`: the report does not count the assertions of a test, so this
  is the weaker guard junit.py prints for a report that does not count them,
  and it says so: more than 0 tests ran and none failed. A test that checks
  nothing passes it.

The verdict is green only if the command exits 0, nothing failed or crashed
and the three guards hold. Requires Python 3.8+ and nothing else.
"""
import json
import os
import subprocess
import sys

import junit

SEPARATOR = "--"
REPORT_FLAG = "--report"
USAGE = "uso: python tools/guards/dart_test.py --report <fichero> -- <comando ...>"
START, DONE = "start", "done"


def parse_args(argv):
    """The report path and the command, or an error in words."""
    if SEPARATOR not in argv:
        return {"report": "", "command": [], "error": "falta '%s' antes del comando" % SEPARATOR}
    cut = argv.index(SEPARATOR)
    options, command = argv[:cut], argv[cut + 1:]
    if len(options) != 2 or options[0] != REPORT_FLAG or not command:
        return {"report": "", "command": [], "error": "hacen falta un %s <fichero> y un comando" % REPORT_FLAG}
    return {"report": options[1], "command": command, "error": ""}


def read_events(text):
    """The events of a report, one JSON object per line, and what could not
    be read as one."""
    events, problems = [], []
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except ValueError:
            problems.append("la linea %d del informe no es JSON" % number)
            continue
        if not isinstance(event, dict) or not isinstance(event.get("type"), str):
            problems.append("la linea %d del informe no es un evento" % number)
            continue
        events.append(event)
    return events, problems


def is_report(path):
    """Whether a file is a report of the JSON reporter: its first event is the
    runner's `start`, with the protocol version."""
    try:
        with open(path, "rb") as handle:
            first = handle.readline().decode("utf-8", "replace")
    except OSError:
        return False
    events, _ = read_events(first)
    return bool(events) and events[0]["type"] == START and "protocolVersion" in events[0]


def counts_of(events):
    """What the events of a report say, by test id."""
    declared, started, finished, suites, declaring = 0, {}, {}, set(), set()
    for event in events:
        kind = event["type"]
        if kind == "suite" and isinstance(event.get("suite"), dict):
            suites.add(event["suite"].get("id"))
        elif kind == "group" and isinstance(event.get("group"), dict) and event["group"].get("parentID") is None:
            count = event["group"].get("testCount")
            declared += count if isinstance(count, int) else 0
            declaring.add(event["group"].get("suiteID"))
        elif kind == "testStart" and isinstance(event.get("test"), dict):
            started[event["test"].get("id")] = event["test"].get("name", "")
        elif kind == "testDone":
            finished[event.get("testID")] = event
    visible = [test for test in started if not finished.get(test, {}).get("hidden")]
    done = [finished[test] for test in visible if test in finished]
    ran = [event for event in done if not event.get("skipped")]
    return {"declared": declared, "started": len(visible), "unfinished": len(visible) - len(done),
            "crashed": sum(1 for event in done if event.get("result") == "error"),
            "failed": sum(1 for event in done if event.get("result") == "failure"),
            "ran": len(ran), "closed": any(event["type"] == DONE for event in events), "empty": len(suites - declaring)}


def guard_lines(counts, problems):
    """The three guards by their canonical names, [PASS] or [FAIL], and whether all hold."""
    registered = counts["started"] > 0 and counts["started"] == counts["declared"] and counts["empty"] == 0 and not problems
    finished = counts["crashed"] == 0 and counts["unfinished"] == 0 and counts["closed"] and not problems
    silent = counts["ran"] > 0 and counts["failed"] == 0
    lines = ["[%s] guard registered: %d arrancados, %d declarados por los grupos de sus suites, %d suites sin ningun test"
             % ("PASS" if registered else "FAIL", counts["started"], counts["declared"], counts["empty"]),
             "[%s] guard finished: %d con error, %d sin terminar%s" % ("PASS" if finished else "FAIL", counts["crashed"], counts["unfinished"],
                                                                     "" if counts["closed"] else ", y el informe no llega al final del runner"),
             "[%s] guard silent: %d ejecutados, %d fallidos (%s)" % ("PASS" if silent else "FAIL", counts["ran"], counts["failed"], junit.WEAKER)]
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
    report = request["report"]
    unsafe = junit.unsafe_report_path(report, os.getcwd(), junit.tracked_under)
    if not unsafe and os.path.isdir(report):
        unsafe = "'%s' es un directorio: el informe de este runner es un fichero" % report
    if unsafe:
        print(unsafe)
        print("RESULT: la ruta del informe no se puede vaciar; no se borro ni se corrio nada")
        return 2
    if os.path.isfile(report) and is_report(report):
        os.remove(report)
    sys.stdout.flush()
    code = subprocess.run(junit.shell_line(request["command"]), shell=True, stdin=subprocess.DEVNULL).returncode
    events, problems = [], []
    if not os.path.isfile(report):
        problems.append("el comando no escribio el informe %s" % report)
    elif not is_report(report):
        problems.append("%s no es un informe del reporter JSON: su primer evento no es el '%s' con la version del protocolo" % (report, START))
    else:
        with open(report, "rb") as handle:
            events, problems = read_events(handle.read().decode("utf-8", "replace"))
    counts = counts_of(events)
    for problem in problems:
        print(problem)
    guards = guard_lines(counts, problems)
    for line in guards["lines"]:
        print(line)
    print("RESULT: %d tests, %d fallidos, %d con error, el comando salio con %d" % (counts["started"], counts["failed"], counts["crashed"], code))
    # guard silent holds only with no test failed.
    return 0 if code == 0 and guards["hold"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
