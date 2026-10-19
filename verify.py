#!/usr/bin/env python3
"""The one command that runs every gate of this repository and returns one verdict.

`gates.txt` is the executable list of gates and lives nowhere else. Each gate
runs in its own process and is watched from the outside: a hung gate comes out
red instead of never coming out, and a failing one does not stop the others.
The verdict of a gate is its exit code and its last line, never a partial print.

    python verify.py                 GREEN: "0 en rojo" + exit 0
    python verify.py -- "etiqueta"   one gate only, for iterating (not for verifying)

Requires Python 3.8+ and nothing else.
"""
import contextlib
import errno
import functools
import math
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
import types

ROOT = os.path.dirname(os.path.abspath(__file__))
GATES_FILE = "gates.txt"
VERDICT_FILE = os.path.join("tools", "board", "verdict.txt")
# A test runner is a gate whose label carries this tag, and the guards it must
# print are rows of gates.txt too: one file says both, verify.py demands the
# guards printed and the board demands them in the file the row runs.
HARNESS_TAG = "harness"
GUARD_KEY = "guard"
# The gate that renders the versioned derivatives. It runs a SECOND time when the
# verdict changes, because it reads the verdict of the previous run.
DERIVED_GATE = "board: build"
# Each gate declares its reference seconds and is killed at FACTOR times them,
# never under FLOOR: a gate is watched at its own scale and its growth is
# printed. The factor is margin for machines that slow a background process
# down (Windows moves it to slow cores and coarsens its clock, measured up to
# x2.5). gates.txt states these numbers to whoever edits it; a test crosses
# them with these constants.
REFERENCE_FACTOR = 4
BUDGET_FLOOR_SECONDS = 60
# The budget of a gate that declares no reference ('-', or a two-column row).
DEFAULT_BUDGET_SECONDS = 120
# A reference above this is a typo, or a way of switching the watchdog off.
MAX_REFERENCE_SECONDS = 3600
NO_REFERENCE = "-"
# How long a kill may take before the report says it did not happen.
KILL_WAIT_SECONDS = 30
KILL_POLL_SECONDS = 0.05
# A single wait on Windows is not interruptible: Ctrl+C reaches us between slices.
WAIT_SLICE_SECONDS = 0.25
# Windows refuses to replace a file that another program holds open (a board
# check reading it, an editor, an antivirus); they hold it for a moment, so the
# replace, which is idempotent, is tried again after each of these pauses. A
# holder that keeps it longer gets an error that names the file.
REPLACE_PAUSES = (0.05, 0.1, 0.2, 0.4, 0.8)
TAIL_ON_FAILURE = 25
PYTHON_TOKEN = "{python}"
# '{local:gradlew}' runs a script of the repository's root the way this system
# runs one: cmd.exe may be told not to look in the current directory
# (NoDefaultCurrentDirectoryInExePath), and a POSIX shell never does.
LOCAL_TOKEN = re.compile(r"\{local:([^{}\s]+)\}")
# What chains or pipes another command on a line in cmd.exe or in sh ('|',
# '||' and a lone '&' in both; ';' and a line break in sh only): a row that does
# is refused on every system, because on some shell its verdict would be its
# last command's exit code. '&&' stops at the first failure, and an '&' right
# after '>' or '<' ('2>&1', '>&2') is a redirection, so both stay.
CHAINING = ("||", "|", ";", "&", "\n")
REDIRECTION = (">", "<")
CHAINING_SAID = {"\n": "salto de linea"}
UTF8_BOM = b"\xef\xbb\xbf"
INTERRUPTED_EXIT = 130
# A daemon the gate asks to start something (dockerd and its containers) is
# outside the gate's job or process group on every system: a kill's report says
# so, because a container was seen running long after a gate's tree was dead.
OUTSIDE_THE_TREE = "lo que un daemon arranco para ella (un contenedor de Docker) esta fuera y no se comprobo"
# The verdict of one gate, as the report prints it and verdict.txt keeps it.
GREEN, RED, TIMEOUT = "GREEN", "RED", "TIMEOUT"
# A CI that cancels sends SIGTERM and a closed terminal SIGHUP. The running gate
# leads its own session on POSIX, so it would outlive verify: both take the
# Ctrl+C path, which kills the gate's tree first.
STOP_SIGNALS = ("SIGTERM", "SIGHUP")
# Variables that point git at another repository than the one the cwd is in. A
# hook exports some of them (GIT_DIR, in a linked worktree), and a gate starts
# without them: one whose tests make a repository of their own would run git
# against the caller's. The board's own git calls leave them out too.
GIT_LOCATION = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY",
                "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_NAMESPACE")
USAGE = ("uso: python verify.py                       todas las puertas; escribe el veredicto si cambia\n"
         "     python verify.py -- <etiqueta> [...]   solo esas, para iterar; no escribe el veredicto")


class GatesFileError(Exception):
    """gates.txt cannot be read as a list of gates; the message says where."""


class StopRequested(KeyboardInterrupt):
    """A stop signal (SIGTERM, SIGHUP) taken down the Ctrl+C path."""

    def __init__(self, name):
        super().__init__(name)
        self.name = name


class GateInterrupted(KeyboardInterrupt):
    """A stop that arrived while a gate ran, carrying what killing it did and
    the name of the stop."""

    def __init__(self, kill, name):
        super().__init__(name)
        self.kill = kill
        self.name = name


class TreeUnavailable(Exception):
    """This platform's way of holding a whole process tree cannot be used here."""

# ----------------------------------------------------------------- gates.txt

def decode_text(raw):
    """UTF-8 without BOM is the only clean shape. Returns the text and what is
    wrong with the bytes ('' when nothing is)."""
    if raw.startswith(UTF8_BOM):
        return raw[len(UTF8_BOM):].decode("utf-8", "replace"), "empieza por BOM (EF BB BF): guardalo como UTF-8 sin BOM"
    try:
        return raw.decode("utf-8"), ""
    except UnicodeDecodeError as error:
        return raw.decode("utf-8", "replace"), "no es UTF-8 (byte %d): reescribelo en UTF-8 sin BOM" % error.start


def read_text(path):
    with open(path, "rb") as handle:
        return decode_text(handle.read())


def budget_seconds(reference):
    if reference is None:
        return DEFAULT_BUDGET_SECONDS
    return max(BUDGET_FLOOR_SECONDS, REFERENCE_FACTOR * reference)


def parse_reference(text, number):
    if text == NO_REFERENCE:
        return None
    try:
        value = float(text)
    except ValueError:
        value = float("nan")
    if not math.isfinite(value) or value <= 0:
        raise GatesFileError("gates.txt:%d: '%s' no son segundos de referencia: un numero positivo, o '%s' si no estan medidos"
                             " (una fila antigua cuyo comando lleva '|' necesita la columna)" % (number, text, NO_REFERENCE))
    if value > MAX_REFERENCE_SECONDS:
        raise GatesFileError("gates.txt:%d: %g segundos de referencia pasan del maximo de %d: un vigilante con ese tope ya no vigila"
                             % (number, value, MAX_REFERENCE_SECONDS))
    return value


def is_reference_column(middle):
    """The middle of a three-field row is the reference column when it has no
    spaces (a two-column row's command has them) or starts like a number, so a
    malformed reference ('5 s') is reported instead of becoming a command."""
    return not any(c.isspace() for c in middle) or middle[0].isdigit() or middle[0] == "."


def local_script(match):
    if os.name == "nt":
        return ".\\" + match.group(1).replace("/", "\\")
    return "./" + match.group(1)


def expand(command, python):
    """The command a shell of this system runs: the tokens replaced."""
    return LOCAL_TOKEN.sub(local_script, command.replace(PYTHON_TOKEN, '"%s"' % python))


def split_tag(label, number):
    """'board: tests [harness]' -> ('board: tests', True). A tag is a word in
    brackets at the end of the label, and harness is the only one."""
    if not label.endswith("]") or " [" not in label:
        return label, False
    name, tag = label[:-1].rsplit(" [", 1)
    if tag != HARNESS_TAG:
        raise GatesFileError("gates.txt:%d: la marca '[%s]' no existe; la unica es '[%s]', la de un runner de tests" % (number, tag, HARNESS_TAG))
    return name.strip(), True


def chaining_operator(command):
    """The first operator of CHAINING outside double quotes, or ''. The line is
    read as cmd.exe reads it: each double quote opens or closes a quoted
    stretch, and a single quote protects nothing; sh protects as much inside
    double quotes, so a row means one command in both. A double quote that a
    shell reads as a plain character still opens or closes a stretch here: one
    escaped for either shell (\\" in sh, ^" in cmd.exe), or one inside sh's
    single quotes ('"')."""
    quoted, at = False, 0
    while at < len(command):
        if command[at] == '"':
            quoted = not quoted
        elif not quoted and command.startswith("&&", at):
            at += 1
        elif not quoted and not (command[at] == "&" and command[at - 1:at] in REDIRECTION):
            found = next((operator for operator in CHAINING if command.startswith(operator, at)), "")
            if found:
                return found
        at += 1
    return ""


def parse_gate_row(line, number, python):
    """'label | reference seconds | command', the label tagged '[harness]' when
    the gate is a test runner. The two-column form of the previous version
    ('label | command') still parses, as legacy. In both, the command is one
    command: one that chains another (chaining_operator) is refused."""
    if "|" not in line:
        raise GatesFileError("gates.txt:%d: se esperaba 'etiqueta | segundos de referencia | comando' o '%s <nombre>'" % (number, GUARD_KEY))
    parts = line.split("|", 2)
    label, harness = split_tag(parts[0].strip(), number)
    middle = parts[1].strip() if len(parts) == 3 else None
    if middle == "":
        raise GatesFileError("gates.txt:%d: la columna de segundos de referencia esta vacia: un numero, o '%s'" % (number, NO_REFERENCE))
    if middle is not None and is_reference_column(middle):
        reference, command, legacy = parse_reference(middle, number), parts[2].strip(), False
    else:
        reference, command, legacy = None, line.split("|", 1)[1].strip(), True
    if not label or not command:
        raise GatesFileError("gates.txt:%d: etiqueta o comando vacio" % number)
    chained = chaining_operator(command)
    if chained:
        raise GatesFileError("gates.txt:%d: el comando encadena otro con '%s' fuera de comillas dobles, y en algun shell su veredicto seria el codigo del ultimo"
                             " (#lesson-a-script-error-is-not-red): '&&' y las redirecciones valen, y lo demas va en un script de tools/"
                             % (number, CHAINING_SAID.get(chained, chained)))
    return {"label": label, "command": expand(command, python), "raw": command, "harness": harness, "reference": reference,
            "budget": budget_seconds(reference), "legacy": legacy, "line": number}


def guard_row(line):
    """The canonical name a 'guard <name>' row declares (the whole row), or ''."""
    if "|" in line or not line.startswith(GUARD_KEY + " ") or not line[len(GUARD_KEY):].strip():
        return ""
    return GUARD_KEY + " " + line[len(GUARD_KEY):].strip()


def parse_gates(text, python):
    gates, warnings, seen, guards = [], [], {}, {}
    for number, raw in enumerate(text.split("\n"), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        guard = guard_row(line)
        if guard:
            if guard in guards:
                raise GatesFileError("gates.txt:%d: '%s' ya se declara en la fila %d" % (number, guard, guards[guard]))
            guards[guard] = number
            continue
        gate = parse_gate_row(line, number, python)
        if gate["label"] in seen:
            raise GatesFileError("gates.txt:%d: la etiqueta '%s' ya es la de la fila %d: una etiqueta nombra UNA puerta" % (number, gate["label"], seen[gate["label"]]))
        seen[gate["label"]] = number
        if gate["legacy"]:
            warnings.append("gates.txt:%d usa la forma antigua 'etiqueta | comando', que esta en retirada:"
                            " anade la columna de segundos de referencia ('%s' si no estan medidos)" % (number, NO_REFERENCE))
        gates.append(gate)
    harnesses = [gate for gate in gates if gate["harness"]]
    if harnesses and not guards:
        raise GatesFileError("gates.txt:%d: la puerta '%s' es un runner de tests ([%s]) y gates.txt no declara ninguna '%s':"
                             " no habria nada que exigirle" % (harnesses[0]["line"], harnesses[0]["label"], HARNESS_TAG, GUARD_KEY))
    return {"gates": gates, "warnings": warnings, "guards": list(guards)}


def read_gates(root=ROOT):
    path = os.path.join(root, GATES_FILE)
    try:
        text, problem = read_text(path)
    except OSError as error:
        raise GatesFileError("gates.txt no se puede leer: %s" % error)
    if problem:
        raise GatesFileError("gates.txt " + problem)
    return parse_gates(text, sys.executable)

# ----------------------------------------------------------------- process trees
#
# A tree is how one platform starts a gate so that everything the gate starts
# can be killed with it, and what can be CHECKED afterwards. Each has:
#   launch(command, root, out, err) -> the gate's Popen
#   terminate(process)              -> what it did, in words
#   emptied(deadline)               -> True only when it saw nothing of the tree alive
#   close(process)                  -> lets go of what it holds

CREATE_SUSPENDED = 0x00000004
JOB_LIMIT_ACTIVE_PROCESS = 0x00000008
JOB_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000
JOB_INFO_BASIC_ACCOUNTING = 1
JOB_INFO_BASIC_PROCESS_ID_LIST = 3
JOB_INFO_EXTENDED_LIMITS = 9
PROCESS_TERMINATE = 0x0001
PROCESS_SET_QUOTA = 0x0100
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
SYNCHRONIZE = 0x00100000
THREAD_SUSPEND_RESUME = 0x0002
SNAPSHOT_THREADS = 0x00000004
RESUME_FAILED = 0xFFFFFFFF
ERROR_INVALID_PARAMETER = 87
ERROR_MORE_DATA = 234
WAIT_OBJECT_0 = 0
WAIT_TIMEOUT = 0x00000102


def without_git_location(environment):
    """The environment without GIT_LOCATION: git started with it finds the
    repository of its cwd, never the one the caller's environment points at."""
    return {key: value for key, value in environment.items() if key not in GIT_LOCATION}


def start(command, root, out, err, **platform):
    """Output goes to FILES, never pipes: a child that outlives the gate keeps
    a pipe open and the reader waits for it, so a gate that exits would read as
    hung. No new process group on Windows: that would cut the gate off from
    the console's Ctrl+C."""
    return subprocess.Popen(command, cwd=root, shell=True, env=without_git_location(os.environ), stdin=subprocess.DEVNULL,
                            stdout=out, stderr=err, **platform)


@functools.lru_cache(maxsize=None)
def win32():
    """kernel32 with the job and thread calls this file makes, typed once."""
    import ctypes
    from ctypes import wintypes

    class IoCounters(ctypes.Structure):
        _fields_ = [(name, ctypes.c_ulonglong) for name in ("ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
                                                             "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]

    class BasicLimits(ctypes.Structure):
        _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64), ("LimitFlags", wintypes.DWORD),
                    ("MinimumWorkingSetSize", ctypes.c_size_t), ("MaximumWorkingSetSize", ctypes.c_size_t),
                    ("ActiveProcessLimit", wintypes.DWORD), ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD),
                    ("SchedulingClass", wintypes.DWORD)]

    class ExtendedLimits(ctypes.Structure):
        _fields_ = [("BasicLimitInformation", BasicLimits), ("IoInfo", IoCounters), ("ProcessMemoryLimit", ctypes.c_size_t),
                    ("JobMemoryLimit", ctypes.c_size_t), ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]

    class Accounting(ctypes.Structure):
        _fields_ = [("TotalUserTime", ctypes.c_int64), ("TotalKernelTime", ctypes.c_int64), ("ThisPeriodTotalUserTime", ctypes.c_int64),
                    ("ThisPeriodTotalKernelTime", ctypes.c_int64), ("TotalPageFaultCount", wintypes.DWORD), ("TotalProcesses", wintypes.DWORD),
                    ("ActiveProcesses", wintypes.DWORD), ("TotalTerminatedProcesses", wintypes.DWORD)]

    class ThreadEntry(ctypes.Structure):
        _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD), ("th32ThreadID", wintypes.DWORD),
                    ("th32OwnerProcessID", wintypes.DWORD), ("tpBasePri", wintypes.LONG), ("tpDeltaPri", wintypes.LONG), ("dwFlags", wintypes.DWORD)]

    def process_id_list(capacity):
        class ProcessIdList(ctypes.Structure):
            _fields_ = [("NumberOfAssignedProcesses", wintypes.DWORD),
                        ("NumberOfProcessIdsInList", wintypes.DWORD),
                        ("ProcessIdList", ctypes.c_size_t * capacity)]
        return ProcessIdList()

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    handle, boolean, dword = wintypes.HANDLE, wintypes.BOOL, wintypes.DWORD
    for name, restype, argtypes in (("CreateJobObjectW", handle, [ctypes.c_void_p, wintypes.LPCWSTR]),
                                    ("SetInformationJobObject", boolean, [handle, ctypes.c_int, ctypes.c_void_p, dword]),
                                    ("QueryInformationJobObject", boolean, [handle, ctypes.c_int, ctypes.c_void_p, dword, ctypes.c_void_p]),
                                    ("AssignProcessToJobObject", boolean, [handle, handle]),
                                    ("IsProcessInJob", boolean, [handle, handle, ctypes.POINTER(boolean)]),
                                    ("TerminateJobObject", boolean, [handle, wintypes.UINT]),
                                    ("OpenProcess", handle, [dword, boolean, dword]),
                                    ("OpenThread", handle, [dword, boolean, dword]),
                                    ("ResumeThread", dword, [handle]),
                                    ("CreateToolhelp32Snapshot", handle, [dword, dword]),
                                    ("Thread32First", boolean, [handle, ctypes.c_void_p]),
                                    ("Thread32Next", boolean, [handle, ctypes.c_void_p]),
                                    ("WaitForSingleObject", dword, [handle, dword]),
                                    ("CloseHandle", boolean, [handle])):
        function = getattr(kernel, name)
        function.restype, function.argtypes = restype, argtypes
    return types.SimpleNamespace(kernel=kernel, ctypes=ctypes, ExtendedLimits=ExtendedLimits, Accounting=Accounting,
                                 ThreadEntry=ThreadEntry, process_id_list=process_id_list, invalid_handle=ctypes.c_void_p(-1).value)


def last_error(api):
    return str(api.ctypes.WinError(api.ctypes.get_last_error()))


def resume_threads(api, pid):
    """Resumes a process created suspended. Popen keeps no handle to its first
    thread, so the threads are found by their owner."""
    kernel, ctypes = api.kernel, api.ctypes
    snapshot = kernel.CreateToolhelp32Snapshot(SNAPSHOT_THREADS, 0)
    if snapshot is None or snapshot == api.invalid_handle:
        return False
    resumed = 0
    try:
        entry = api.ThreadEntry()
        entry.dwSize = ctypes.sizeof(entry)
        more = kernel.Thread32First(snapshot, ctypes.byref(entry))
        while more:
            if entry.th32OwnerProcessID == pid:
                thread = kernel.OpenThread(THREAD_SUSPEND_RESUME, False, entry.th32ThreadID)
                if thread:
                    if kernel.ResumeThread(thread) != RESUME_FAILED:
                        resumed += 1
                    kernel.CloseHandle(thread)
            more = kernel.Thread32Next(snapshot, ctypes.byref(entry))
    finally:
        kernel.CloseHandle(snapshot)
    return resumed > 0


class JobTree:
    """Windows. The gate runs inside a job object: everything it starts belongs
    to the job even after its parent exited, and the job counts how many are
    alive. The gate is created suspended and joins the job before it runs an
    instruction, so nothing it starts is born outside. Closing the last handle
    kills what the job holds, so a verify that dies abruptly takes its gate
    with it. What a daemon starts when the gate asks it (a Docker container)
    is the daemon's, not the gate's: no job holds it."""

    scope = "job de Windows"

    def __init__(self):
        self.api, self.killed, self.members = win32(), False, []
        self.job = self.api.kernel.CreateJobObjectW(None, None)
        if not self.job:
            raise TreeUnavailable("CreateJobObject fallo: %s" % last_error(self.api))
        if not self.set_job_limits(JOB_LIMIT_KILL_ON_JOB_CLOSE):
            reason = last_error(self.api)
            self.api.kernel.CloseHandle(self.job)
            raise TreeUnavailable("el job no acepta matar lo suyo al cerrarse: %s" % reason)

    def set_job_limits(self, flags, active_limit=0):
        """Sets the job's limits to `flags`, JOB_LIMIT_* values or'ed together
        (0 clears them); with JOB_LIMIT_ACTIVE_PROCESS, at most `active_limit`
        of its processes may be alive. True when Windows took them."""
        limits = self.api.ExtendedLimits()
        limits.BasicLimitInformation.LimitFlags = flags
        limits.BasicLimitInformation.ActiveProcessLimit = active_limit
        return bool(self.api.kernel.SetInformationJobObject(self.job, JOB_INFO_EXTENDED_LIMITS, self.api.ctypes.byref(limits),
                                                            self.api.ctypes.sizeof(limits)))

    def join(self, pid):
        """'' when the process joined the job, or why it did not."""
        kernel = self.api.kernel
        handle = kernel.OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, False, pid)
        if not handle:
            return "OpenProcess fallo: %s" % last_error(self.api)
        try:
            if not kernel.AssignProcessToJobObject(self.job, handle):
                return "AssignProcessToJobObject fallo: %s" % last_error(self.api)
        finally:
            kernel.CloseHandle(handle)
        return ""

    def launch(self, command, root, out, err):
        process = start(command, root, out, err, creationflags=CREATE_SUSPENDED)
        refused = self.join(process.pid)
        if refused:
            # It never ran an instruction: starting it again another way is safe.
            process.kill()
            process.wait(timeout=KILL_WAIT_SECONDS)
            raise TreeUnavailable("la puerta no pudo entrar en un job de Windows: %s" % refused)
        if not resume_threads(self.api, process.pid):
            reason = last_error(self.api)
            self.terminate(process)
            process.wait(timeout=KILL_WAIT_SECONDS)
            raise OSError("la puerta se creo suspendida y no se pudo reanudar: %s" % reason)
        return process

    def _listed(self):
        capacity = 1
        while True:
            listing = self.api.process_id_list(capacity)
            if self.api.kernel.QueryInformationJobObject(self.job, JOB_INFO_BASIC_PROCESS_ID_LIST, self.api.ctypes.byref(listing),
                                                         self.api.ctypes.sizeof(listing), None):
                return listing.ProcessIdList[:listing.NumberOfProcessIdsInList]
            if self.api.ctypes.get_last_error() != ERROR_MORE_DATA:
                return None
            capacity = max(capacity + 1, listing.NumberOfAssignedProcesses)

    def _open_member(self, pid):
        kernel, ctypes = self.api.kernel, self.api.ctypes
        handle = kernel.OpenProcess(SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return None if ctypes.get_last_error() == ERROR_INVALID_PARAMETER else False
        member = ctypes.wintypes.BOOL()
        if not kernel.IsProcessInJob(handle, self.job, ctypes.byref(member)):
            kernel.CloseHandle(handle)
            return False
        if member.value:
            return handle
        kernel.CloseHandle(handle)
        return None

    def _close_members(self):
        for member in self.members:
            if member:
                self.api.kernel.CloseHandle(member)
        self.members = []

    def terminate(self, process):
        self.killed = True
        self._close_members()
        self.set_job_limits(JOB_LIMIT_KILL_ON_JOB_CLOSE | JOB_LIMIT_ACTIVE_PROCESS, active_limit=1)
        pids = self._listed()
        if pids is None:
            self.members = [False]
        else:
            for pid in pids:
                member = self._open_member(pid)
                if member is not None:
                    self.members.append(member)
        if not self.api.kernel.TerminateJobObject(self.job, 1):
            return "TerminateJobObject fallo: %s" % last_error(self.api)
        return "TerminateJobObject"

    def active(self):
        info = self.api.Accounting()
        if not self.api.kernel.QueryInformationJobObject(self.job, JOB_INFO_BASIC_ACCOUNTING, self.api.ctypes.byref(info),
                                                         self.api.ctypes.sizeof(info), None):
            return None
        return info.ActiveProcesses

    def _members_stopped(self):
        for member in self.members:
            if not member:
                return None
            ended = self.api.kernel.WaitForSingleObject(member, 0)
            if ended == WAIT_TIMEOUT:
                return False
            if ended != WAIT_OBJECT_0:
                return None
        return True

    def emptied(self, deadline):
        while True:
            stopped = self._members_stopped()
            active = self.active() if stopped else None
            if stopped and active == 0:
                return True
            if stopped is None or (stopped and active is None) or time.monotonic() >= deadline:
                return False
            time.sleep(KILL_POLL_SECONDS)

    def close(self, process=None):
        """A gate that exited on its own leaves what it started alive, as on
        POSIX: a daemon it started on purpose is its business. If clearing the
        flag fails, closing errs on the side of killing."""
        self._close_members()
        if process is not None and not self.killed and process.poll() is not None:
            self.set_job_limits(0)
        self.api.kernel.CloseHandle(self.job)


def taskkill_path():
    """By absolute path: a 'taskkill' earlier on PATH must not decide a kill."""
    system = os.environ.get("SystemRoot") or os.environ.get("windir")
    return os.path.join(system, "System32", "taskkill.exe") if system else "taskkill"


class TaskkillTree:
    """Windows without a job (one could not be made or joined here). taskkill
    walks the tree by parent links, so a descendant whose parent already
    exited is out of its reach: this tree is never confirmed dead."""

    scope = "arbol segun taskkill"

    def __init__(self, why):
        self.why = why

    def launch(self, command, root, out, err):
        return start(command, root, out, err)

    def terminate(self, process):
        try:
            done = subprocess.run([taskkill_path(), "/F", "/T", "/PID", str(process.pid)], stdin=subprocess.DEVNULL,
                                  capture_output=True, timeout=KILL_WAIT_SECONDS)
        except (OSError, subprocess.TimeoutExpired) as error:
            return "taskkill no pudo correr: %s (sin job: %s)" % (error, self.why)
        return "taskkill salio con %d, y no ve a los huerfanos (sin job: %s)" % (done.returncode, self.why)

    def emptied(self, deadline):
        return False

    def close(self, process=None):
        """It holds nothing."""


def stat_fields(text):
    """State and process group from a /proc/<pid>/stat line. The command name
    may hold spaces and parentheses, so fields count from its last ')'."""
    fields = text.rsplit(")", 1)[-1].split()
    if len(fields) < 3 or not fields[2].lstrip("-").isdigit():
        return None
    return {"state": fields[0], "pgrp": int(fields[2])}


def proc_stats(proc_root="/proc"):
    """The stat line of every process, or None where there is no /proc."""
    if not os.path.isdir(proc_root):
        return None
    stats = []
    for name in os.listdir(proc_root):
        if not name.isdigit():
            continue
        try:
            with open(os.path.join(proc_root, name, "stat"), encoding="utf-8", errors="replace") as handle:
                stats.append(handle.read())
        except OSError:
            # It exited between the listing and the read: it is no member any more.
            continue
    return stats


def live_members(group, stats):
    """How many members of a process group are alive, or None when it cannot
    be told. A zombie is dead: it only waits for a parent to collect it, and in
    a container whose init does not reap, it waits forever."""
    if stats is None:
        return None
    alive = 0
    for text in stats:
        fields = stat_fields(text)
        if fields and fields["pgrp"] == group and fields["state"] != "Z":
            alive += 1
    return alive


def group_alive(group):
    try:
        os.killpg(group, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        # A member exists and belongs to another user.
        return True
    return live_members(group, proc_stats()) != 0


class GroupTree:
    """POSIX. The gate leads its own session, so what it starts shares its
    process group unless it opens a session of its own (a daemon does)."""

    scope = "grupo de procesos, sin lo que abrio su propia sesion"

    def __init__(self):
        self.group = 0

    def launch(self, command, root, out, err):
        process = start(command, root, out, err, start_new_session=True)
        self.group = process.pid
        return process

    def terminate(self, process):
        try:
            os.killpg(self.group, signal.SIGKILL)
        except ProcessLookupError:
            return "killpg: el grupo ya estaba vacio"
        except OSError as error:
            return "killpg fallo: %s" % error
        return "killpg"

    def emptied(self, deadline):
        while group_alive(self.group):
            if time.monotonic() >= deadline:
                return False
            time.sleep(KILL_POLL_SECONDS)
        return True

    def close(self, process=None):
        """It holds nothing: the group dies with its last member."""


def open_tree():
    """The way this platform holds a gate's whole tree: a job on Windows, or
    taskkill when no job can be made here (no ctypes, an old Windows)."""
    if os.name != "nt":
        return GroupTree()
    try:
        return JobTree()
    except (TreeUnavailable, OSError, ImportError, AttributeError) as error:
        return TaskkillTree(str(error))


def launch_watched(command, root, out, err, make_tree):
    tree = make_tree()
    try:
        return tree, tree.launch(command, root, out, err)
    except TreeUnavailable as why:
        tree.close()
        fallback = TaskkillTree(str(why))
        return fallback, fallback.launch(command, root, out, err)
    except BaseException:
        tree.close()
        raise

# ----------------------------------------------------------------- running a gate

def wait_within(process, budget):
    """The exit code, or None when the budget ran out."""
    deadline = time.monotonic() + budget
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return None
        try:
            return process.wait(timeout=min(WAIT_SLICE_SECONDS, remaining))
        except subprocess.TimeoutExpired:
            continue


def kill_tree(process, tree):
    """Kills the gate and the processes of its tree (its job or its process
    group, never what a daemon started for it), and reports only what it
    checked: 'tree' when the tree saw nothing of it left alive, 'gone' when at
    least the gate itself is dead, 'exited' when the gate had already exited on
    its own (a console's Ctrl+C reaches it too)."""
    exited = process.poll() is not None
    how = tree.terminate(process)
    if process.poll() is None:
        try:
            process.kill()
        except OSError as error:
            how += "; kill directo fallo: %s" % error
    deadline = time.monotonic() + KILL_WAIT_SECONDS
    try:
        process.wait(timeout=KILL_WAIT_SECONDS)
        gone = True
    except subprocess.TimeoutExpired:
        gone = False
    return {"tree": gone and tree.emptied(deadline), "gone": gone, "exited": exited, "how": how,
            "scope": tree.scope, "pid": process.pid}


def stop_reason(stop):
    return getattr(stop, "name", "") or "Ctrl+C"


def output_lines(handle):
    handle.seek(0)
    text = handle.read().decode("utf-8", "replace")
    return [line.rstrip() for line in text.splitlines() if line.strip()]


def run_gate(command, budget, root=ROOT, make_tree=open_tree):
    """stdout and stderr go to two files and are read in that order: a runner
    buffers stdout when it is not a console, so one file would put an error
    written to stderr BEFORE the progress lines that were still buffered."""
    started = time.monotonic()
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        try:
            tree, process = launch_watched(command, root, out, err, make_tree)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            return {"timed_out": False, "code": -1, "lines": ["no se pudo lanzar la puerta: %s" % error],
                    "seconds": time.monotonic() - started, "budget": budget, "kill": None}
        try:
            try:
                code = wait_within(process, budget)
            except KeyboardInterrupt as stop:
                raise GateInterrupted(kill_tree(process, tree), stop_reason(stop))
            kill = None if code is not None else kill_tree(process, tree)
        finally:
            tree.close(process)
        seconds = time.monotonic() - started
        lines = output_lines(out) + output_lines(err)
    return {"timed_out": kill is not None, "code": -1 if kill is not None else code, "lines": lines,
            "seconds": seconds, "budget": budget, "kill": kill}


def verdict_of(result):
    if result["timed_out"]:
        return TIMEOUT
    return GREEN if result["code"] == 0 else RED


def kill_said(kill):
    """What a kill did, in words that never claim more than kill_tree checked:
    the processes of the gate's tree, never what a daemon started for it."""
    gate = "la puerta ya habia salido" if kill["exited"] else "la puerta murio"
    if kill["tree"]:
        if kill["exited"]:
            return "%s, y no queda vivo ningun proceso de su %s; %s" % (gate, kill["scope"], OUTSIDE_THE_TREE)
        return "matada, y no queda vivo ningun proceso de su %s; %s" % (kill["scope"], OUTSIDE_THE_TREE)
    if kill["gone"]:
        return "%s, pero no se pudo comprobar que muriera todo lo que lanzo (%s): puede quedar algun proceso hijo vivo" % (gate, kill["how"])
    return "NO se pudo matar la puerta (pid %d, %s): sigue viva" % (kill["pid"], kill["how"])


def timeout_line(result):
    return "sin veredicto tras su tope de %gs: %s" % (result["budget"], kill_said(result["kill"]))


def last_line(result):
    if result["timed_out"]:
        return timeout_line(result)
    return result["lines"][-1] if result["lines"] else "(sin salida)"


def growth_of(seconds, reference):
    return "-" if reference is None else "x%.2f" % (seconds / reference)


def report_line(label, verdict, result, reference, tail):
    used = "%.1fs/%gs" % (result["seconds"], result["budget"])
    return "%-24s %-8s exit=%-4d %12s %-6s %s" % (label, verdict, result["code"], used, growth_of(result["seconds"], reference), tail)

# ----------------------------------------------------------------- guards

def missing_guards(lines, guards):
    """A runner that exits 0 without printing every guard is not green: the
    guards are what tell a run that tested nothing from a run that passed."""
    return [guard for guard in guards if not any(guard in line for line in lines)]

# ----------------------------------------------------------------- verdict

def render_verdict(rows, date):
    text = ("# The verdict of the gates. GENERATED by verify.py on every FULL run; never\n"
            "# edited by hand. It is rewritten only when the verdict changes, so its date is\n"
            "# that of the last CHANGE, not of the last run.\n")
    text += "date\t%s\n" % date
    for label, verdict in rows:
        text += "gate\t%s\t%s\n" % (label, verdict)
    return text


def verdict_body(text):
    kept = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("date\t"):
            continue
        kept.append(line)
    return "\n".join(kept)


def replace_patiently(source, target):
    for pause in REPLACE_PAUSES:
        try:
            os.replace(source, target)
            return
        except PermissionError:
            time.sleep(pause)
    os.replace(source, target)


def discard(temporary):
    if os.path.exists(temporary):
        os.remove(temporary)


def write_atomically(path, text):
    """A reader sees the old file or the new one, never half of one: the text
    goes to a temporary file in the same directory, which then replaces the
    target. A directory or a read-only target is refused, as opening it to
    write would be. The board has the same function; a test crosses the two
    copies."""
    if os.path.isdir(path):
        raise IsADirectoryError(errno.EISDIR, "es un directorio", path)
    if os.path.exists(path) and not os.access(path, os.W_OK):
        raise PermissionError(errno.EACCES, "es de solo lectura", path)
    folder = os.path.dirname(path) or "."
    os.makedirs(folder, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=folder, prefix="." + os.path.basename(path) + ".", suffix=".tmp")
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(text)
        # mkstemp creates the file private; the target keeps the mode it had.
        os.chmod(temporary, (os.stat(path).st_mode & 0o777) if os.path.exists(path) else 0o644)
        replace_patiently(temporary, path)
    except BaseException:
        discard(temporary)
        raise


def store_verdict(rows, root=ROOT):
    """Writes the verdict only when it CHANGED. 'changed' says whether it did;
    'error' is set when it changed and could not be written."""
    path = os.path.join(root, VERDICT_FILE)
    fresh = render_verdict(rows, time.strftime("%Y-%m-%d"))
    try:
        stored = read_text(path)[0] if os.path.exists(path) else ""
    except OSError:
        # Unreadable counts as different: the write below then fixes it or says why not.
        stored = ""
    if verdict_body(stored) == verdict_body(fresh):
        return {"changed": False, "error": ""}
    try:
        write_atomically(path, fresh)
    except OSError as error:
        return {"changed": True, "error": str(error)}
    return {"changed": True, "error": ""}

# ----------------------------------------------------------------- command line

def parse_args(argv):
    if argv in (["-h"], ["--help"]):
        return {"help": True, "labels": [], "error": ""}
    if not argv:
        return {"help": False, "labels": [], "error": ""}
    if argv[0] != "--" or len(argv) == 1:
        return {"help": False, "labels": [], "error": "argumentos no reconocidos: %s" % " ".join(argv)}
    return {"help": False, "labels": argv[1:], "error": ""}


def utf8_console():
    """Gate output quotes documents; a Windows console may not be UTF-8, and a
    quoted character must never turn a verdict into a crash."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def stop_on(number, frame):
    raise StopRequested(signal.Signals(number).name)


@contextlib.contextmanager
def stop_signals():
    """While the gates run, the stop signals this platform has take the Ctrl+C
    path; the handlers that were there come back afterwards."""
    previous = {}
    for name in STOP_SIGNALS:
        number = getattr(signal, name, None)
        if number is not None:
            previous[number] = signal.signal(number, stop_on)
    try:
        yield
    finally:
        for number, handler in previous.items():
            signal.signal(number, handler)


def run_all(gates, filter_labels, guards, root):
    red, rows = [], []
    for gate in gates:
        if filter_labels and gate["label"] not in filter_labels:
            continue
        result = run_gate(gate["command"], gate["budget"], root)
        verdict, tail = verdict_of(result), last_line(result)
        if verdict == GREEN and gate["harness"]:
            missing = missing_guards(result["lines"], guards)
            if missing:
                verdict, tail = RED, "salio 0 sin imprimir sus guardas: " + ", ".join(missing)
        print(report_line(gate["label"], verdict, result, gate["reference"], tail))
        rows.append((gate["label"], verdict))
        if verdict != GREEN:
            red.append(gate["label"])
            for line in result["lines"][-TAIL_ON_FAILURE:]:
                print("    | " + line)
    return {"red": red, "rows": rows}


def refresh_derived(gates, root):
    for gate in gates:
        if gate["label"] == DERIVED_GATE:
            result = run_gate(gate["command"], gate["budget"], root)
            verdict = verdict_of(result)
            print(report_line(gate["label"] + " *", verdict, result, gate["reference"], last_line(result)))
            if verdict != GREEN:
                for line in result["lines"][-TAIL_ON_FAILURE:]:
                    print("    | " + line)
            return verdict == GREEN
    print("WARNING: ninguna puerta se llama '%s': los derivados se quedan citando el veredicto anterior" % DERIVED_GATE)
    return True


def stop_said(stop):
    """What stopped a run and, when it stopped a gate, what killing that gate
    did: the words of the RESULT line of an interrupted run, here and in a
    tool that runs its steps through run_gate."""
    kill = getattr(stop, "kill", None)
    return "%s: %s" % (stop_reason(stop), kill_said(kill)) if kill else stop_reason(stop)


def interrupted_line(stop, stored):
    said = stop_said(stop)
    if stored["changed"] and not stored["error"]:
        return "RESULT: interrumpido (%s); el veredicto CAMBIO y ya se escribio, pero los derivados pueden citar el anterior: vuelve a correr" % said
    return "RESULT: interrumpido (%s); el veredicto no se escribe" % said


def run_and_store(gates, filter_labels, guards, root):
    stored = {"changed": False, "error": ""}
    try:
        outcome = run_all(gates, filter_labels, guards, root)
        if not filter_labels:
            stored = store_verdict(outcome["rows"], root)
            if stored["error"]:
                print("WARNING: el veredicto cambio y no se pudo escribir %s (%s): los derivados citan el anterior" % (VERDICT_FILE, stored["error"]))
            elif stored["changed"]:
                if not refresh_derived(gates, root) and DERIVED_GATE not in outcome["red"]:
                    outcome["red"].append(DERIVED_GATE)
    except KeyboardInterrupt as stop:
        print(interrupted_line(stop, stored))
        return INTERRUPTED_EXIT
    red = outcome["red"]
    refreshed = stored["changed"] and not stored["error"] and DERIVED_GATE not in red
    said = changed_result_line if refreshed else result_line
    print(said(len(outcome["rows"]), red))
    return 1 if red or stored["changed"] else 0


def result_line(count, red):
    """The last line of a run of `count` gates with the labels in `red` red,
    whose verdict did not change, or changed without its derivatives rendered
    again: the line a tool that runs verify.py reads its outcome from."""
    names = "" if not red else " -> " + ", ".join(red)
    return "RESULT: %d puertas, %d en rojo%s" % (count, len(red), names)


def changed_result_line(count, red):
    """result_line of a run whose verdict changed and whose derivatives were
    rendered again with it, which asks for another run."""
    return result_line(count, red) + "; el veredicto CAMBIO: los derivados se regeneraron con el nuevo, vuelve a correr"


def main(argv, root=ROOT):
    utf8_console()
    request = parse_args(argv)
    if request["help"] or request["error"]:
        print(USAGE)
        if request["help"]:
            return 0
        print("RESULT: %s; no se corrio ninguna puerta" % request["error"])
        return 2
    try:
        listing = read_gates(root)
    except GatesFileError as error:
        print("RESULT: %s" % error)
        return 1
    for warning in listing["warnings"]:
        print("WARNING: " + warning)
    gates, filter_labels = listing["gates"], request["labels"]
    labels = [gate["label"] for gate in gates]
    unknown = [label for label in filter_labels if label not in labels]
    if unknown:
        print("RESULT: etiquetas desconocidas -> %s (puertas: %s)" % (", ".join(unknown), ", ".join(labels)))
        return 1
    with stop_signals():
        return run_and_store(gates, filter_labels, listing["guards"], root)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
