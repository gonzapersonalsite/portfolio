#!/usr/bin/env python3
"""Runs the unittest tests of a Python product and prints the three guards that
gates.txt declares, which unittest does not count by itself
(`#lesson-a-silent-suite-reads-as-green`).

    python tools/guards/python_unittest.py [<start directory> [<pattern>]]    GREEN: exit 0

The tests are discovered under the start directory (`tests` by default) with
the pattern (`test*.py`). The root of the repository, where the gate runs, goes
on the path, so the product's packages import as they do in production; with
an `__init__.py` the start directory is a package of that root, and without
one its modules are top-level.

- `guard registered`: the tests discovered against the tests started, and at
  least one: a class whose setUpClass failed leaves tests that never start.
- `guard finished`: every test started ended without an error, that is an
  exception other than a failed assertion (a module that does not import is
  one).
- `guard silent`: every test that ran (a skipped one did not) called at least
  one `assert*` or `fail` method of its TestCase. A bare `assert` statement is
  not counted, so a test that only uses them reads as silent.

Requires Python 3.8+ and nothing else.
"""
import os
import sys
import unittest

DEFAULT_START = "tests"
DEFAULT_PATTERN = "test*.py"
SHOWN = 10


class CountingResult(unittest.TextTestResult):
    """A result that knows which test is running, how many checks each one
    made and which were skipped."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.started, self.current, self.checks, self.skipped_ids = 0, None, {}, set()

    def startTest(self, test):
        self.started += 1
        self.current = test.id()
        self.checks.setdefault(self.current, 0)
        super().startTest(test)

    def stopTest(self, test):
        super().stopTest(test)
        self.current = None

    def addSkip(self, test, reason):
        self.skipped_ids.add(test.id())
        super().addSkip(test, reason)

    def count(self):
        if self.current is not None:
            self.checks[self.current] += 1


def check_methods():
    """The names of the TestCase methods that check something."""
    return [name for name in dir(unittest.TestCase)
            if (name.startswith("assert") or name == "fail") and callable(getattr(unittest.TestCase, name))]


def counted(original, count):
    def method(self, *args, **kwargs):
        count()
        return original(self, *args, **kwargs)
    return method


def run(start, pattern, root, stream):
    """Discovers and runs the tests, every check method counting for the test
    that calls it; returns the counts the guards compare."""
    package = os.path.isfile(os.path.join(start, "__init__.py"))
    suite = unittest.TestLoader().discover(start, pattern=pattern, top_level_dir=root if package else start)
    made = []

    def make_result(*args, **kwargs):
        made.append(CountingResult(*args, **kwargs))
        return made[-1]

    def count():
        if made:
            made[-1].count()

    originals = {name: getattr(unittest.TestCase, name) for name in check_methods()}
    try:
        for name, original in originals.items():
            setattr(unittest.TestCase, name, counted(original, count))
        result = unittest.TextTestRunner(stream=stream, verbosity=1, resultclass=make_result).run(suite)
    finally:
        for name, original in originals.items():
            setattr(unittest.TestCase, name, original)
    errored = {test.id() for test, _ in result.errors}
    ran = [test for test in result.checks if test not in result.skipped_ids]
    return {"declared": suite.countTestCases(), "started": result.started, "errors": len(result.errors),
            "failures": len(result.failures) + len(result.unexpectedSuccesses), "ran": len(ran), "skipped": len(result.skipped_ids),
            "silent": sorted(test for test in ran if result.checks[test] == 0 and test not in errored)}


def guard_lines(counts):
    """The three guards by their canonical names, [PASS] or [FAIL], and whether all hold."""
    registered = counts["declared"] > 0 and counts["started"] == counts["declared"]
    finished = counts["errors"] == 0
    silent = counts["ran"] > 0 and not counts["silent"]
    named = "" if not counts["silent"] else " -> " + ", ".join(counts["silent"][:SHOWN])
    lines = ["[%s] guard registered: %d descubiertos, %d arrancados" % ("PASS" if registered else "FAIL", counts["declared"], counts["started"]),
             "[%s] guard finished: %d arrancados, %d con error" % ("PASS" if finished else "FAIL", counts["started"], counts["errors"]),
             "[%s] guard silent: %d ejecutados, %d sin un solo assert (%d saltados)%s"
             % ("PASS" if silent else "FAIL", counts["ran"], len(counts["silent"]), counts["skipped"], named)]
    return {"lines": lines, "hold": registered and finished and silent}


def main(argv, root=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    if len(argv) > 2:
        print("uso: python tools/guards/python_unittest.py [<directorio de tests> [<patron>]]")
        return 2
    root = os.path.abspath(root or os.getcwd())
    start = os.path.join(root, argv[0] if argv else DEFAULT_START)
    pattern = argv[1] if len(argv) > 1 else DEFAULT_PATTERN
    counts = {"declared": 0, "started": 0, "errors": 0, "failures": 0, "ran": 0, "skipped": 0, "silent": []}
    if not os.path.isdir(start):
        print("no existe el directorio de tests '%s'" % os.path.relpath(start, root))
    else:
        if root not in sys.path:
            sys.path.insert(0, root)
        counts = run(start, pattern, root, sys.stdout)
    guards = guard_lines(counts)
    for line in guards["lines"]:
        print(line)
    print("RESULT: %d tests, %d fallos, %d errores" % (counts["started"], counts["failures"], counts["errors"]))
    return 0 if guards["hold"] and counts["failures"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
