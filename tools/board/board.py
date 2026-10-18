#!/usr/bin/env python3
"""The project board: it VALIDATES the living documents and the records against
the tree, and it GENERATES the derived files (STATUS.txt and the registry
indices).

    python tools/board/board.py check    GREEN: "0 hallazgos" + exit 0
    python tools/board/board.py build    GREEN: "BOARD_OK" + exit 0

Everything it reads is DATA: which documents are alive, where the records live,
what is read at startup, the caps, the exceptions and the words of the team
language it reads in prose, all in the data files of tools/board under the root
it is given. Adding a case is adding a row.
Every check is a pure function over strings, so `test_board.py` exercises each
on a defective fixture, and runs check and build end to end on a scratch tree.

Requires Python 3.8+ and nothing else.
"""
import datetime
import errno
import hashlib
import importlib.util
import json
import os
import posixpath
import re
import subprocess
import sys
import tempfile
import time
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RUNNER_FILE = "verify.py"
RUNNER_MODULE = "verify"


def load_runner(root):
    """verify.py of this root, loaded by its path: on sys.path, a package of
    the product named `verify` would stand in for it (a package wins over a
    module of the same name)."""
    path = os.path.join(root, RUNNER_FILE)
    loaded = sys.modules.get(RUNNER_MODULE)
    if loaded is not None and os.path.normcase(os.path.abspath(getattr(loaded, "__file__", None) or "")) == os.path.normcase(path):
        return loaded
    spec = importlib.util.spec_from_file_location(RUNNER_MODULE, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[RUNNER_MODULE] = module
    spec.loader.exec_module(module)
    return module


# gates.txt has one grammar and one parser, verify.py's; the board reads the
# harness rows and the guards through it. verify.py imports nothing from here.
V = load_runner(ROOT)

# The data files are read from the root the board is given, never from where
# this script happens to live: a test can point the board at any tree.
BOARD_DIR = "tools/board"
CONTRACT = "AGENTS.md"
BOARD_README = "tools/board/README.md"
REGISTRY_README = "docs/registry/README.md"
# The words of the team language the board reads in prose are data: the
# headings of the sections it reads by name (the authority table of the
# contract, the numbered checks of the board's README, the field table of the
# registry's README, the section of the contract that has to be gone) and the
# words that name a state.
PROSE_FILE = "prose.txt"
# Instantiating an existing repository leaves the contract it had whole under
# this heading, to merge (tools/board/instantiate.py writes it): while the
# contract keeps that section, two contracts govern.
PENDING_KEY = "pending"
PROSE_HEADINGS = ("authority", "checklist", "fields", PENDING_KEY)
STATE_WORD_KEY = "state-word"
# The heading of the contract's section that indexes the project's skills:
# required once a skills directory is declared, because not every tool reads it.
SKILLS_KEY = "skills"
SKILL_FILE = "SKILL.md"
SKILL_BLOCKS = ("|", ">", "|-", ">-", "|+", ">+")
# A plain YAML scalar cannot open with these: they start another kind of node.
YAML_INDICATORS = "[]{}&*!%@`"
# An adapter is how one tool reaches the startup reading: documents.txt
# declares each, with the startup documents its tool reads by itself.
ADAPTER_KEY = "adapter"
ADAPTER_LIST = "instructions"
VERDICT_FILE = "tools/board/verdict.txt"
SUMMARY_FILE = "STATUS.txt"
DECISIONS_INDEX_FILE = "docs/registry/DECISIONS.md"
NOTES_INDEX_FILE = "docs/registry/NOTES.md"
# The board owns this directory: one index per phase that decisions name and
# one per month that notes carry, all derived. What no source generates is removed.
INDEX_DIR = "docs/registry/index"
# How many deliveries and lessons the main notes index shows: enough to see
# what happened lately; every one of them is in the index of its month.
RECENT_NOTES = 20
UNDATED = "undated"
SKIPPED_TREES = {".git", "__pycache__", ".venv", "node_modules"}
# A directory that says what it is is skipped too, whatever its name: a cache
# tagged by the Cache Directory Tagging Specification (pytest, ruff and mypy
# write one) or a Python virtual environment.
CACHE_TAG = "CACHEDIR.TAG"
CACHE_TAG_SIGNATURE = b"Signature: 8a477f597d28d172789f06886806bc55"
VENV_MARK = "pyvenv.cfg"
# With a .git in the root, the tree is what git lists: tracked plus untracked
# that .gitignore does not exclude. Paths come NUL-separated and unquoted.
GIT_LIST = ["git", "ls-files", "-co", "--exclude-standard", "-z"]
GIT_SECONDS = 30
GIT_SOURCE = "git ls-files"
# A file of the hooks directory without an extension is a hook, and git on
# Linux and macOS ignores a hook that is not executable; the mode that counts
# is the index's, the one a clone checks out.
HOOKS_DIR = ".githooks"
GIT_MODES = ["git", "ls-files", "-s", "-z", "--", HOOKS_DIR]
EXECUTABLE_MODE = "100755"
UTF8_BOM = b"\xef\xbb\xbf"
# Windows refuses to replace a file that another program holds open (a board
# check reading it, an editor, an antivirus); they hold it for a moment, so the
# replace, which is idempotent, is tried again after each of these pauses. A
# holder that keeps it longer gets an error that names the file.
REPLACE_PAUSES = (0.05, 0.1, 0.2, 0.4, 0.8)
EXTERNAL_LINK = re.compile(r"^(?:[A-Za-z][A-Za-z0-9+.\-]*:|//)")
# A reference definition is the label, the destination and at most a quoted
# title, alone on the line: '[nota]: esto es prosa' is a sentence, not a link.
LINK_DEFINITION = re.compile(r"^ {0,3}\[[^\]^][^\]]*\]:[ \t]*(<[^>]*>|\S+)(?:[ \t]+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?[ \t]*$")
STARTUP_LIMIT = "startup"
LINE_LIMIT = "line"
IDENTITY_LIMIT = "identity"
INDEX_LIMIT = "index"
DONE, IN_PROGRESS, PENDING = "DONE", "IN PROGRESS", "PENDING"
PHASE_MARKERS = [DONE, IN_PROGRESS, PENDING]
# How the summary, a text for a person, shows the state of a part.
PART_SHOWN = {DONE: "HECHA", IN_PROGRESS: "EN CURSO", PENDING: "PENDIENTE"}
# The verdict of a gate as verify.py writes it in verdict.txt.
GREEN = "GREEN"
# What separates the steps of an order line, and what a done phase carries there.
ORDER_SEPARATORS = ("→", "·")
DONE_MARK = "✔"
KEY_STOPS = ["(", ":", " — ", " – ", " -- "]
NOT_IN_A_PATH = " ()[]{}<>*?\"'|=+,;!#$%&@^~`\\:"
GATES_FILE = "gates.txt"
# A word of a command: a quoted run or a run without blanks.
COMMAND_WORD = re.compile(r"\"[^\"]*\"|'[^']*'|\S+")
SETTLED_STATES = ["confirmed", "resolved"]
IMPORT_MARK = "@"
STAMP_MARK = "board-fingerprint:"
DATE_TOKEN = "@DATE@"
PRINT_TOKEN = "@FINGERPRINT@"
DERIVED_MISSING, DERIVED_CURRENT, DERIVED_STALE, DERIVED_EDITED = "missing", "current", "stale", "edited"
TITLE_SHOWN = 60

KIND_CITE = "citation"
KIND_MARKER = "marker"
KIND_ORDER = "order"
KIND_SHAPE = "shape"
KIND_SLUG = "slug"
KIND_RECORD = "record"
KIND_DERIVED = "derived"
KIND_DATA = "data"
KIND_ENCODING = "encoding"
KIND_ENGINE = "engine"

# The engine of this copy: the template's version and the sha256 of each of
# its files as the template shipped them. A copy that changes one declares it
# as an exception (an `engine` finding is excusable), so an upgrade knows what
# to merge by hand; the template itself reseals with `board.py seal`.
MANIFEST_FILE = "MANIFEST.txt"
VERSION_KEY, ENGINE_KEY, TEMPLATE_KEY = "version", "engine", "template"
UNSEALED = "-"
# Where a copy learns how its engine is upgraded: the header of the file the upgrade rewrites.
UPGRADE_POINTER = "como se actualiza el motor lo dice la cabecera de %s/%s" % (BOARD_DIR, MANIFEST_FILE)
VERSION_SHAPE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")

# ----------------------------------------------------------------- records

SCHEMA = {
    "decision": {"required": ["title", "state", "date"], "known": ["phase", "type", "criterion", "retired", "origin"]},
    "lesson": {"required": ["title", "date"], "known": ["origin"]},
    "delivery": {"required": ["title", "date"], "known": ["phase"]},
}
STATES = ["confirmed", "provisional", "open", "resolved", "postponed", "discarded"]
OPEN_STATES = ["open", "postponed"]
RESOLVED_STATE = "resolved"
DEBT_TYPE = "debt"
DATE_FIELDS = ["date", "retired"]
NO_PHASE = "none"
FENCE = "---"
RECORD_SUFFIX = ".md"
DIR_KEYS = {"decisions": "decision", "lessons": "lesson", "deliveries": "delivery"}


def finding(kind, key, where, message):
    return {"kind": kind, "key": key, "where": where, "message": message}


def is_slug(text):
    return len(text) >= 2 and all(c == "-" or c.isdigit() or ("a" <= c <= "z") for c in text)


def is_date(text):
    if len(text) != 10 or text[4] != "-" or text[7] != "-":
        return False
    if not all(text[i].isdigit() for i in (0, 1, 2, 3, 5, 6, 8, 9)):
        return False
    try:
        datetime.date(int(text[:4]), int(text[5:7]), int(text[8:]))
    except ValueError:
        return False
    return True


def record_id(file):
    name = os.path.basename(file)
    return name[:-len(RECORD_SUFFIX)] if name.endswith(RECORD_SUFFIX) else name


def parse_record(text, file):
    record = {"file": file, "id": record_id(file), "fields": {}, "body": "", "body_line": 0, "problems": []}
    lines = text.split("\n")
    if not lines or lines[0].strip() != FENCE:
        record["problems"].append("no abre con la cabecera '%s'" % FENCE)
        record["body"] = text
        record["body_line"] = 1
        return record
    closed = -1
    for i in range(1, len(lines)):
        line = lines[i]
        if line.strip() == FENCE:
            closed = i
            break
        if not line.strip():
            continue
        colon = line.find(":")
        if colon <= 0:
            record["problems"].append("linea %d de la cabecera no es 'clave: valor': '%s'" % (i + 1, line.strip()))
            continue
        key = line[:colon].strip()
        value = line[colon + 1:].strip()
        if key in record["fields"]:
            record["problems"].append("la clave '%s' se repite en la cabecera" % key)
            continue
        record["fields"][key] = value
    if closed < 0:
        record["problems"].append("la cabecera no se cierra con '%s'" % FENCE)
        return record
    record["body_line"] = closed + 2
    record["body"] = "\n".join(lines[closed + 1:])
    return record


def phases_of(record):
    return [token for token in record["fields"].get("phase", "").split(" ") if token.strip()]


def is_debt(record):
    return record["fields"].get("type", "") == DEBT_TYPE


def is_resolved(record):
    return record["fields"].get("state", "") == RESOLVED_STATE


def is_retired(record):
    return "retired" in record["fields"]


def is_open(record):
    return record["fields"].get("state", "") in OPEN_STATES and not is_retired(record)


def needs_phase(record):
    fields = record["fields"]
    if is_retired(record):
        return False
    if fields.get("state", "") in OPEN_STATES:
        return True
    return is_debt(record) and fields.get("state", "") != RESOLVED_STATE


def governs(record):
    state = record["fields"].get("state", "")
    if is_retired(record):
        return False
    return state in ("confirmed", "provisional") or state in OPEN_STATES


def validate_record(record, kind, known_phases):
    found = list(record["problems"])
    if kind not in SCHEMA:
        found.append("'%s' no es una clase de registro conocida" % kind)
        return found
    if not is_slug(record["id"]):
        found.append("el nombre del fichero no es una identidad valida (minusculas, digitos y guiones): '%s'" % record["id"])
    schema, fields = SCHEMA[kind], record["fields"]
    for key in schema["required"]:
        if not fields.get(key, ""):
            found.append("falta el campo obligatorio '%s'" % key)
    for key in fields:
        if key not in schema["required"] and key not in schema["known"]:
            found.append("el campo '%s' no existe para un registro de clase '%s'" % (key, kind))
    for key in DATE_FIELDS:
        if key in fields and not is_date(fields[key]):
            found.append("'%s' no es una fecha AAAA-MM-DD: '%s'" % (key, fields[key]))
    if "state" in fields and fields["state"] not in STATES:
        found.append("el estado '%s' no es uno de %s" % (fields["state"], "/".join(STATES)))
    if "phase" in fields:
        for token in phases_of(record):
            if token != NO_PHASE and token not in known_phases:
                found.append("la fase '%s' no existe en ningun plan" % token)
    if needs_phase(record) and "phase" not in fields:
        why = "'%s'" % DEBT_TYPE if is_debt(record) else "'%s'" % fields.get("state", "")
        found.append("un registro %s tiene que decir su 'phase' (o '%s' con el motivo en el cuerpo)" % (why, NO_PHASE))
    if is_debt(record) and "criterion" not in fields:
        found.append("una deuda declara su 'criterion' de pago")
    return found


def all_fields():
    fields = []
    for kind in SCHEMA:
        for key in SCHEMA[kind]["required"] + SCHEMA[kind]["known"]:
            if key not in fields:
                fields.append(key)
    return fields


def opening_bold(body):
    text = body.lstrip("\n")
    if not text.startswith("**"):
        return ""
    close = text.find("**", 2)
    return "" if close < 0 else text[2:close]


def has_word(text, word):
    """Whether `word` is in `text` as a whole word: 'DONE' is not in 'ABANDONED'."""
    at = text.find(word)
    while at >= 0:
        before = text[at - 1] if at > 0 else " "
        end = at + len(word)
        after = text[end] if end < len(text) else " "
        if not before.isalpha() and not after.isalpha():
            return True
        at = text.find(word, at + 1)
    return False


def state_words(team_words):
    """The words that name a state in a decision's prose: those of the team
    language, declared in prose.txt, and the states of the schema in capitals."""
    words = list(team_words)
    for state in STATES:
        if state.upper() not in words:
            words.append(state.upper())
    return words


def state_word_in_opening(body, words):
    run = opening_bold(body)
    for word in words:
        if has_word(run, word):
            return word
    return ""


def longest_line(record):
    longest, at = 0, record["body_line"]
    for number, line in prose_lines(record["body"]):
        if not line.startswith("|") and len(line) > longest:
            longest, at = len(line), record["body_line"] + number - 1
    return {"length": longest, "line": at}


def read_dir(rel_dir, names, read):
    records, problems = [], []
    for name in sorted(names):
        file = rel_dir + "/" + name
        if name.startswith("."):
            # A hidden file is no record: '.gitkeep' keeps an empty directory in git.
            continue
        if not name.endswith(RECORD_SUFFIX):
            problems.append("'%s' no es un registro: en este directorio solo viven ficheros %s" % (file, RECORD_SUFFIX))
            continue
        records.append(parse_record(read(file), file))
    return {"records": records, "problems": problems}


def dirs_of(documents):
    return {entry["keyword"]: entry["value"] for entry in documents if entry["keyword"] in DIR_KEYS}


def load_dirs(root, dirs, reader):
    """Every record group; 'read' says whether its directory could be read at
    all, and 'problems' what is wrong with it or with a file in it."""
    loaded = {}
    for plural, kind in DIR_KEYS.items():
        group = {"kind": kind, "dir": dirs.get(plural, ""), "records": [], "problems": [], "read": False}
        if plural not in dirs:
            group["problems"].append("documents.txt no declara el directorio de '%s'" % plural)
        elif not os.path.isdir(os.path.join(root, group["dir"])):
            group["problems"].append("el directorio de registros '%s' no existe" % group["dir"])
        else:
            names = [n for n in os.listdir(os.path.join(root, group["dir"])) if os.path.isfile(os.path.join(root, group["dir"], n))]
            result = read_dir(group["dir"], names, reader.text)
            group["records"], group["read"] = result["records"], True
            group["problems"].extend(result["problems"])
        loaded[plural] = group
    return loaded


def count_records(loaded):
    return sum(len(group["records"]) for group in loaded.values())

# ----------------------------------------------------------------- data files

LEGEND_OPEN = "--- KEYS ---"


def legend_keys(text):
    keys, inside = [], False
    for raw in text.split("\n"):
        line = raw.strip()
        if not line.startswith("#"):
            if inside:
                break
            continue
        body = line[1:].strip()
        if body == LEGEND_OPEN:
            inside = True
            continue
        if not inside:
            continue
        if not body:
            break
        colon = body.find(":")
        if colon <= 0:
            continue
        key = body[:colon].strip()
        if " " in key or key in keys:
            continue
        keys.append(key)
    return keys


def parse_data(text, source, problems):
    keywords = legend_keys(text)
    if not keywords:
        problems.append("%s: su leyenda no declara ninguna clave (falta '%s'?)" % (source, LEGEND_OPEN))
        return []
    entries, commented = [], ""
    for number, raw in enumerate(text.split("\n"), 1):
        line = raw.strip()
        if not line:
            commented = ""
            continue
        if line.startswith("#"):
            sentence = line[1:].strip()
            commented = sentence if not commented else commented + " " + sentence
            continue
        if " " not in line:
            problems.append("%s:%d: '%s' no es 'palabra valor'" % (source, number, line))
            continue
        keyword, value = line.split(" ", 1)
        value = value.strip()
        if keyword not in keywords:
            problems.append("%s:%d: palabra desconocida '%s' (validas: %s)" % (source, number, keyword, ", ".join(keywords)))
            continue
        if not value:
            problems.append("%s:%d: '%s' sin valor" % (source, number, keyword))
            continue
        entries.append({"keyword": keyword, "value": value, "line": number, "motive": commented})
    return entries


def values_of(entries, keyword):
    return [entry["value"] for entry in entries if entry["keyword"] == keyword]


def one_value(entries, keyword, source, problems):
    """The value of a keyword that a data file declares exactly once, or ''
    with the problem said: a missing or repeated one is never guessed."""
    values = values_of(entries, keyword)
    if len(values) == 1:
        return values[0]
    problems.append("%s tiene que declarar exactamente una '%s' y declara %d" % (source, keyword, len(values)))
    return ""

# ----------------------------------------------------------------- documents

def fence_opening(stripped):
    for char in "`~":
        if stripped.startswith(char * 3):
            return char * (len(stripped) - len(stripped.lstrip(char)))
    return ""


def prose_lines(text):
    """(line number, line) of every line outside fenced code blocks. A fence is
    three or more backticks or tildes, and only a run of the same character,
    at least as long and alone on its line, closes it."""
    lines, fence = [], ""
    for number, raw in enumerate(text.split("\n"), 1):
        stripped = raw.strip()
        if fence:
            if stripped.startswith(fence) and not stripped.strip(fence[0]):
                fence = ""
            continue
        fence = fence_opening(stripped)
        if not fence:
            lines.append((number, raw))
    return lines


def inline_code(text):
    spans = []
    for number, raw in prose_lines(text):
        i = 0
        while i < len(raw):
            if raw[i] != "`":
                i += 1
                continue
            close = raw.find("`", i + 1)
            if close < 0:
                break
            value = raw[i + 1:close]
            if value:
                spans.append({"value": value, "line": number})
            i = close + 1
    return spans


def blank_code_spans(line):
    """The line with every `code span` turned into spaces, so a link written
    as code is not a link; positions do not move."""
    out, i = list(line), 0
    while i < len(line):
        if line[i] != "`":
            i += 1
            continue
        close = line.find("`", i + 1)
        if close < 0:
            break
        for j in range(i, close + 1):
            out[j] = " "
        i = close + 1
    return "".join(out)


def link_target(line, start):
    """The destination of the inline link whose '(' is just before `start`, and
    where scanning resumes. None when the parentheses never close on the line."""
    if line[start:start + 1] == "<":
        close = line.find(">", start)
        return (None, start) if close < 0 else (line[start + 1:close], close + 1)
    depth, i = 0, start
    while i < len(line):
        if line[i] == "(":
            depth += 1
        elif line[i] == ")":
            if depth == 0:
                inside = line[start:i].split()
                return (inside[0] if inside else "", i + 1)
            depth -= 1
        i += 1
    return None, start


def escaped(line, at):
    """Whether the character at `at` is escaped by an odd run of backslashes."""
    slashes = 0
    while at - slashes - 1 >= 0 and line[at - slashes - 1] == "\\":
        slashes += 1
    return slashes % 2 == 1


def closes_link_text(line, close):
    """Whether the ']' at `close` ends a link text: it is not escaped, and an
    unescaped '[' opens it earlier on the line, nested brackets counted."""
    if escaped(line, close):
        return False
    depth = 0
    for i in range(close - 1, -1, -1):
        if line[i] not in "[]" or escaped(line, i):
            continue
        if line[i] == "]":
            depth += 1
        elif depth == 0:
            return True
        else:
            depth -= 1
    return False


def markdown_links(text):
    """Every markdown link destination, inline `[text](dest)`, image or
    reference definition `[label]: dest`, with its line. Fenced blocks and code
    spans are not prose and are skipped; escaped brackets are not a link."""
    links = []
    for number, raw in prose_lines(text):
        line = blank_code_spans(raw)
        definition = LINK_DEFINITION.match(line)
        if definition:
            links.append({"value": definition.group(1).strip("<>"), "line": number})
        at = line.find("](")
        while at >= 0:
            target, resume = link_target(line, at + 2) if closes_link_text(line, at) else (None, at + 2)
            if target:
                links.append({"value": target, "line": number})
            at = line.find("](", max(resume, at + 2))
    return links


def link_path(target):
    """The repository path a link points at, or '' when it points outside the
    tree (a URL, a mail address) or only at an anchor of the same page."""
    if not target or target.startswith("#") or EXTERNAL_LINK.match(target):
        return ""
    return unquote(target.split("#", 1)[0].split("?", 1)[0])


def phase_ids(text, prefixes):
    found, i = [], 0
    while i < len(text):
        c = text[i]
        if c not in prefixes or (i > 0 and text[i - 1].isalnum()):
            i += 1
            continue
        j = i + 1
        while j < len(text) and text[j].isdigit():
            j += 1
        if j == i + 1:
            i += 1
            continue
        found.append({"id": text[i:j], "from": i, "to": j - 1})
        i = j
    return found


def is_phase_id(value, prefixes):
    found = phase_ids(value, prefixes)
    return len(found) == 1 and found[0]["id"] == value


def trailing_marker(line):
    if not line.endswith(")"):
        return ""
    open_at = line.rfind("(")
    if open_at < 0:
        return ""
    marker = line[open_at + 1:-1]
    return marker if marker in PHASE_MARKERS else ""


def phase_headers(text, prefixes):
    headers = []
    for number, raw in enumerate(text.split("\n"), 1):
        line = raw.strip()
        if not line.startswith("## ") or line[3:4] not in prefixes:
            continue
        body = line[3:]
        cut = body.find(" ")
        pid = body if cut < 0 else body[:cut]
        if not is_phase_id(pid, prefixes):
            continue
        headers.append({"id": pid, "marker": trailing_marker(line), "line": number, "value": line})
    return headers


def opens_with_phase_id(line, prefixes):
    if not line.startswith("**"):
        return False
    rest = line[2:]
    cut = rest.find(" ")
    return cut > 0 and is_phase_id(rest[:cut], prefixes)


def order_step(item, prefixes):
    """One step of an order line: a phase id of its plan with at most its
    marker, '✔' when done or one parenthesis that may say IN PROGRESS. The id
    and the marker it gives, or None when the step is anything else."""
    ids = phase_ids(item, prefixes)
    if not ids or ids[0]["from"] != 0:
        return None
    rest = item[ids[0]["to"] + 1:].strip()
    if rest not in ("", DONE_MARK) and not (rest.startswith("(") and rest.find(")") == len(rest) - 1):
        return None
    marker = IN_PROGRESS if IN_PROGRESS in rest else (DONE if rest == DONE_MARK else PENDING)
    return {"id": ids[0]["id"], "marker": marker}


def is_order_line(folded, prefixes):
    """A bold run with separators, or a bold run that is ONE step: a plan with
    a single phase still has an order."""
    if any(separator in folded for separator in ORDER_SEPARATORS):
        return True
    return order_step(folded.strip("*").strip(), prefixes) is not None


def order_lines(text, prefixes):
    lines, raw_lines, i = [], text.split("\n"), 0
    while i < len(raw_lines):
        line = raw_lines[i].strip()
        if not opens_with_phase_id(line, prefixes):
            i += 1
            continue
        folded, last = line, i
        while not folded.endswith("**") and last + 1 < len(raw_lines):
            last += 1
            folded += " " + raw_lines[last].strip()
        if not is_order_line(folded, prefixes):
            i += 1
            continue
        lines.append({"value": folded, "line": i + 1})
        i = last + 1
    return lines


def order_items(line):
    """What lies between the separators of an order line."""
    flat = line.replace("**", "")
    for separator in ORDER_SEPARATORS[1:]:
        flat = flat.replace(separator, ORDER_SEPARATORS[0])
    return [item.strip() for item in flat.split(ORDER_SEPARATORS[0]) if item.strip()]


def read_order(line, prefixes):
    """The steps of an order line, each phase once and in its order with the
    marker the line gives it, and the items that are no step."""
    steps, strays, seen = [], [], set()
    for item in order_items(line):
        step = order_step(item, prefixes)
        if step is None:
            strays.append(item)
        elif step["id"] not in seen:
            seen.add(step["id"])
            steps.append(step)
    return {"steps": steps, "strays": strays}


def heading_matches(line, heading):
    return line.startswith("## ") and line[3:].strip().startswith(heading)


def section(text, heading):
    lines, inside = [], False
    for number, raw in enumerate(text.split("\n"), 1):
        if raw.startswith("## "):
            inside = heading_matches(raw, heading)
            continue
        if inside:
            lines.append({"value": raw, "line": number})
    return lines


def has_section(text, heading):
    return any(heading_matches(raw, heading) for raw in text.split("\n"))


def without_trailing_punctuation(text):
    while text.endswith(".") or text.endswith(","):
        text = text[:-1].strip()
    return text


def bullet_name(value):
    plain = value.replace("**", "").replace("`", "").replace("*", "")
    cut = len(plain)
    for stop in KEY_STOPS:
        at = plain.find(stop)
        if 0 <= at < cut:
            cut = at
    return without_trailing_punctuation(plain[:cut].strip())


def bullets(lines):
    found = []
    for entry in lines:
        line = entry["value"]
        if line.startswith("- "):
            value = line[2:].strip()
            found.append({"name": bullet_name(value), "head": value, "value": value, "line": entry["line"]})
            continue
        if not found or not line.strip():
            continue
        found[-1]["value"] += " " + line.strip()
    return found


def ordered_items(lines):
    items = []
    for entry in lines:
        line = entry["value"]
        dot = line.find(". ")
        if dot <= 0:
            continue
        head = line[:dot]
        if not head.isdigit():
            continue
        items.append({"value": int(head), "line": entry["line"]})
    return items


def table_rows(lines):
    rows = []
    for entry in lines:
        line = entry["value"].strip()
        if not line.startswith("|"):
            continue
        parts = line.split("|")
        if len(parts) >= 2:
            parts = parts[1:-1]
        rows.append({"cells": [part.strip() for part in parts], "line": entry["line"]})
    for i, row in enumerate(rows):
        if row["cells"] and all(cell and set(cell) <= set("-:") for cell in row["cells"]):
            return rows[i + 1:]
    return rows


def dates_in(text):
    found = []
    for number, raw in enumerate(text.split("\n"), 1):
        at = raw.find("-")
        while at >= 0:
            if at >= 4 and at + 5 < len(raw) and raw[at + 3] == "-":
                candidate = raw[at - 4:at + 6]
                if is_date(candidate):
                    found.append({"value": candidate, "line": number})
            at = raw.find("-", at + 1)
    return found

# ----------------------------------------------------------------- checks

def apply_exceptions(findings, exceptions):
    used = {(e["keyword"], e["value"]): False for e in exceptions}
    reported = []
    for f in findings:
        key = (f["kind"], f["key"])
        if key in used:
            used[key] = True
            continue
        reported.append(f)
    for e in exceptions:
        if not used[(e["keyword"], e["value"])]:
            reported.append(finding(KIND_DATA, e["value"], "exceptions.txt:%d" % e["line"],
                                    "excepcion huerfana: '%s %s' ya no excusa nada" % (e["keyword"], e["value"])))
    return reported


def is_path_citation(value, extensions):
    if not value or any(c in NOT_IN_A_PATH for c in value):
        return False
    if value.endswith("/"):
        return True
    dot = value.rfind(".")
    if dot < 0 or (dot == 0 and "/" not in value):
        return False
    return value[dot:] in extensions


def inside_generated(path, generated):
    return any(path.startswith(tree + "/") for tree in generated)


def resolves(value, from_dir, known, generated=()):
    target = value.rstrip("/")
    if not target:
        return False
    if target in known or inside_generated(target, generated):
        return True
    if not from_dir:
        return False
    relative = os.path.normpath(from_dir + "/" + target).replace("\\", "/")
    return relative in known or inside_generated(relative, generated)


def cited_files_exist(citations, extensions, known, generated=()):
    broken, order = {}, []
    for c in citations:
        value = c["value"]
        if not is_path_citation(value, extensions) or resolves(value, c["dir"], known, generated):
            continue
        if value not in broken:
            broken[value] = []
            order.append(value)
        broken[value].append("%s:%d" % (c["doc"], c["line"]))
    return [finding(KIND_CITE, v, broken[v][0], "`%s` no existe en el arbol (citado %d vez/veces: %s)" % (v, len(broken[v]), ", ".join(broken[v]))) for v in order]


def link_resolves(path, from_dir, paths, generated=()):
    """A link resolves the way a renderer resolves it: from the directory of the
    document that writes it ('/' = the root of the repository), to a path that
    exists whole. Unlike a quoted fragment, a link is never matched by suffix."""
    if path.startswith("/"):
        target = posixpath.normpath(path.lstrip("/") or ".")
    else:
        target = posixpath.normpath(posixpath.join(from_dir or ".", path))
    if target == ".":
        return True
    if target == ".." or target.startswith("../"):
        return False
    return target in paths or inside_generated(target, generated)


def linked_files_exist(links, paths, generated=()):
    broken, order = {}, []
    for link in links:
        path = link_path(link["value"])
        if not path or link_resolves(path, link["dir"], paths, generated):
            continue
        value = link["value"]
        if value not in broken:
            broken[value] = []
            order.append(value)
        broken[value].append("%s:%d" % (link["doc"], link["line"]))
    return [finding(KIND_CITE, v, broken[v][0], "el enlace '%s' no lleva a nada del arbol desde donde se escribe (citado %d vez/veces: %s)" % (v, len(broken[v]), ", ".join(broken[v]))) for v in order]


def order_and_headers_agree(headers, lines, doc, prefixes):
    findings, by_id = [], {}
    for header in headers:
        if header["id"] in by_id:
            findings.append(finding(KIND_ORDER, header["id"], "%s:%d" % (doc, header["line"]), "hay dos secciones '## %s'" % header["id"]))
            continue
        by_id[header["id"]] = header
        if not header["marker"]:
            findings.append(finding(KIND_MARKER, header["id"], "%s:%d" % (doc, header["line"]), "la cabecera de %s no termina en %s" % (header["id"], ", ".join("(%s)" % m for m in PHASE_MARKERS))))
    if len(lines) != 1:
        findings.append(finding(KIND_ORDER, "line", doc, "se esperaba UNA linea de orden y hay %d" % len(lines)))
        return findings
    where, named, order = "%s:%d" % (doc, lines[0]["line"]), set(), read_order(lines[0]["value"], prefixes)
    for item in order["strays"]:
        findings.append(finding(KIND_ORDER, item, where, "la linea de orden solo nombra fases de su plan, cada una con '%s' o su estado entre parentesis como mucho, y '%s' no es eso: una candidata a fase o una duda se escriben en la prosa del plan o en su registro" % (DONE_MARK, item)))
    for phase in order["steps"]:
        named.add(phase["id"])
        if phase["id"] not in by_id:
            findings.append(finding(KIND_ORDER, phase["id"], where, "la linea de orden nombra %s y no hay seccion '## %s'" % (phase["id"], phase["id"])))
            continue
        header = by_id[phase["id"]]
        if header["marker"] and header["marker"] != phase["marker"]:
            findings.append(finding(KIND_ORDER, phase["id"], where, "la linea de orden da %s por %s y su cabecera dice (%s)" % (phase["id"], phase["marker"], header["marker"])))
    for header in headers:
        if header["id"] not in named:
            findings.append(finding(KIND_ORDER, header["id"], "%s:%d" % (doc, header["line"]), "'## %s' tiene seccion y no aparece en la linea de orden" % header["id"]))
    return findings


def document_opens_with_its_title(text, doc):
    first = text.split("\n")[0]
    if first.startswith("# "):
        return []
    shown = first.strip()
    if len(shown) > TITLE_SHOWN:
        shown = shown[:TITLE_SHOWN] + "…"
    if not shown:
        shown = "(linea vacia)"
    return [finding(KIND_SHAPE, doc, "%s:1" % doc, "'%s' no empieza por su titulo '# ...' sino por '%s'" % (doc, shown))]


def records_are_well_formed(groups, known_phases):
    findings = []
    for group in groups:
        for record in group["records"]:
            for message in validate_record(record, group["kind"], known_phases):
                findings.append(finding(KIND_RECORD, "#" + record["id"], record["file"], "%s: %s" % (record["file"], message)))
        for problem in group["problems"]:
            findings.append(finding(KIND_RECORD, problem, group["dir"], problem))
    return findings


def record_ids_are_unique(groups):
    seen, findings = {}, []
    for group in groups:
        for record in group["records"]:
            rid = record["id"]
            if rid in seen:
                findings.append(finding(KIND_SLUG, "#" + rid, record["file"], "la identidad '#%s' ya la usa %s: una identidad nombra UNA cosa" % (rid, seen[rid])))
                continue
            seen[rid] = record["file"]
    return findings


def is_slug_citation(value):
    return value.startswith("#") and is_slug(value[1:])


def slug_citations_resolve(citations, declared):
    known, broken, order = set(declared), {}, []
    for c in citations:
        value = c["value"]
        if not is_slug_citation(value) or value[1:] in known:
            continue
        slug = value[1:]
        if slug not in broken:
            broken[slug] = []
            order.append(slug)
        broken[slug].append("%s:%d" % (c["doc"], c["line"]))
    return [finding(KIND_SLUG, "#" + s, broken[s][0], "'#%s' no es ningun registro: ni decision, ni leccion, ni entrega (citado %d vez/veces: %s)" % (s, len(broken[s]), ", ".join(broken[s]))) for s in order]


def read_sections_exist(text, headings, doc):
    return [finding(KIND_SHAPE, h, doc, "el documento no tiene seccion '%s', y las comprobaciones que la leen se quedan sin nada que mirar" % h)
            for h in headings if not has_section(text, h)]


def contract_is_merged(text, heading, doc):
    """The section under `heading`, where instantiating an existing repository
    leaves the contract it had, is gone from the contract: while it is there,
    two contracts govern and nothing says which one wins."""
    for number, raw in enumerate(text.split("\n"), 1):
        if heading_matches(raw, heading):
            return [finding(KIND_SHAPE, heading, "%s:%d" % (doc, number), "%s conserva la seccion '%s', donde la instanciacion dejo el contrato que"
                            " tenia el repositorio: lo suyo pasa al contrato, al §3 o al §4 (cada conflicto entre los dos, una decision), y la seccion"
                            " se borra" % (doc, heading))]
    return []


def authority_rows_are_declared(rows, declared, extensions, doc):
    known, findings = set(declared), []
    for row in rows:
        cells = row["cells"]
        if len(cells) <= 1:
            continue
        for span in inline_code(cells[1]):
            value = span["value"]
            if not is_path_citation(value, extensions) or value in known:
                continue
            findings.append(finding(KIND_DATA, value, "%s:%d" % (doc, row["line"]), "'%s' manda en §4 y no esta declarado en documents.txt: nada de lo que escriba se comprueba" % value))
    return findings


def numbered_list_matches(lines, rows, doc):
    items, findings = ordered_items(lines), []
    for i, item in enumerate(items):
        if item["value"] != i + 1:
            findings.append(finding(KIND_SHAPE, str(item["value"]), "%s:%d" % (doc, item["line"]), "la lista numerada llega a %d donde tocaba %d" % (item["value"], i + 1)))
            break
    if len(items) != rows:
        findings.append(finding(KIND_SHAPE, "lista numerada", doc, "el README numera %d comprobaciones y board.py corre %d" % (len(items), rows)))
    return findings


def closed_sections_are_tombstones(sections, archives, doc):
    findings = []
    for s in sections:
        if len(s["bullets"]) != 1:
            findings.append(finding(KIND_SHAPE, s["id"], "%s:%d" % (doc, s["line"]), "'%s' esta (%s) y su cuerpo sigue en el plan: %d vinetas donde va una lapida" % (s["id"], DONE, len(s["bullets"]))))
            continue
        cited = any(archive.endswith(span["value"]) for span in inline_code(s["bullets"][0]["value"]) for archive in archives)
        if not cited:
            findings.append(finding(KIND_SHAPE, s["id"], "%s:%d" % (doc, s["bullets"][0]["line"]), "la lapida de '%s' no cita ningun archivo declarado: su cuerpo no se sabe donde fue" % s["id"]))
    return findings


def startup_reading_within(sizes, cap, source):
    total = sum(sizes.values())
    if total <= cap:
        return []
    said = ", ".join("%s %d" % (name, sizes[name]) for name in sorted(sizes))
    return [finding(KIND_SHAPE, STARTUP_LIMIT, source, "la lectura obligatoria pesa %d B y el tope son %d: %s — la pregunta es que documento sale de la lista, no cuanto subir el tope" % (total, cap, said))]


def adapter_reads(path, text):
    """What an adapter makes its tool load at startup, by its kind: the '@'
    lines of a markdown file, the 'instructions' list of a JSON one."""
    if path.endswith(".md"):
        return {"listed": [line.strip()[1:].strip() for line in text.split("\n") if line.strip().startswith(IMPORT_MARK)], "problem": ""}
    if not path.endswith(".json"):
        kind = os.path.splitext(path)[1] or "sin extension"
        return {"listed": [], "problem": "'%s': el tablero no sabe leer un adaptador %s; sabe .md, con lineas '%s', y .json, con '%s'" % (path, kind, IMPORT_MARK, ADAPTER_LIST)}
    try:
        data = json.loads(text)
    except ValueError as error:
        return {"listed": [], "problem": "'%s' no es JSON valido: %s" % (path, error)}
    listed = data.get(ADAPTER_LIST) if isinstance(data, dict) else None
    if not isinstance(listed, list) or not all(isinstance(item, str) for item in listed):
        return {"listed": [], "problem": "'%s' no tiene una lista '%s' de rutas" % (path, ADAPTER_LIST)}
    return {"listed": listed, "problem": ""}


def adapter_reaches_startup(adapter, listed, native, startup):
    """Between what the adapter lists and what its tool reads by itself, the
    tool loads the whole startup reading, once, and in the declared order."""
    findings, seen = [], []
    for path in startup:
        if path not in listed and path not in native:
            findings.append(finding(KIND_DATA, path, adapter, "'%s' es lectura de arranque (`startup`) y %s no lo carga" % (path, adapter)))
    for path in listed:
        if path not in startup:
            findings.append(finding(KIND_DATA, path, adapter, "%s carga '%s' y documents.txt no lo declara como `startup`" % (adapter, path)))
        elif path in native or path in seen:
            findings.append(finding(KIND_DATA, path, adapter, "%s carga '%s' dos veces: lo lista%s" % (adapter, path, " y su herramienta ya lo lee por si misma" if path in native else " mas de una vez")))
        else:
            seen.append(path)
    for path in native:
        if path not in startup:
            findings.append(finding(KIND_DATA, path, adapter, "documents.txt dice que la herramienta de %s lee '%s' por si misma, y no es lectura de arranque" % (adapter, path)))
    if seen != [path for path in startup if path in seen]:
        findings.append(finding(KIND_DATA, adapter, adapter, "%s carga la lectura de arranque en otro orden que documents.txt: %s" % (adapter, ", ".join(seen))))
    return findings


def adapter_reading_within(adapter, sizes, cap):
    """What a tool loads at startup through its adapter, the adapter itself
    included when its own text is instructions, against the startup cap."""
    total = sum(sizes.values())
    if total <= cap:
        return []
    said = ", ".join("%s %d" % (name, sizes[name]) for name in sorted(sizes))
    return [finding(KIND_SHAPE, adapter, adapter, "lo que una herramienta carga por %s pesa %d B y el tope de arranque son %d: %s" % (adapter, total, cap, said))]


def documents_are_timeless(texts):
    findings = []
    for doc in sorted(texts):
        dates = dates_in(texts[doc])
        if not dates:
            continue
        first = dates[0]
        findings.append(finding(KIND_SHAPE, doc, "%s:%d" % (doc, first["line"]), "'%s' es intemporal y lleva %d fecha(s), la primera '%s': la historia vive en un registro que este documento cita por identidad" % (doc, len(dates), first["value"])))
    return findings


def record_lines_within(groups, cap, source):
    findings = []
    for group in groups:
        for record in group["records"]:
            longest = longest_line(record)
            if longest["length"] <= cap:
                continue
            findings.append(finding(KIND_SHAPE, "#" + record["id"], "%s:%d" % (record["file"], longest["line"]), "%s tiene una linea de %d caracteres y el tope (%s) son %d: parte el parrafo" % (record["file"], longest["length"], source, cap)))
    return findings


def record_ids_within(groups, cap, source):
    """An id is a file name: under a clone's path, a long one passes the 260
    characters that git on Windows refuses without core.longpaths."""
    findings = []
    for group in groups:
        for record in group["records"]:
            if len(record["id"]) <= cap:
                continue
            findings.append(finding(KIND_RECORD, "#" + record["id"], record["file"], "la identidad de %s tiene %d caracteres y el tope (%s) son %d: con la ruta del clon, git en Windows sin core.longpaths no la puede versionar" % (record["file"], len(record["id"]), source, cap)))
    return findings


def markdown_files_are_declared(markdown, allowed):
    known = set(allowed)
    return [finding(KIND_DATA, path, path, "'%s' es un documento sin casa: no es `live` ni `closed` en documents.txt, ni registro, ni derivado, ni adaptador" % path)
            for path in sorted(markdown) if path not in known]


def schema_is_documented(rows, fields, states, doc):
    documented, state_cell = {}, ""
    for row in rows:
        cells = row["cells"]
        if not cells:
            continue
        for span in inline_code(cells[0]):
            documented[span["value"]] = row["line"]
            if span["value"] == "state" and len(cells) > 1:
                state_cell = cells[-1]
    findings = []
    for field in fields:
        if field not in documented:
            findings.append(finding(KIND_SHAPE, field, doc, "el esquema conoce el campo '%s' y la tabla de campos de %s no lo documenta" % (field, doc)))
    for field in documented:
        if field not in fields:
            findings.append(finding(KIND_SHAPE, field, "%s:%d" % (doc, documented[field]), "la tabla de campos documenta '%s' y el esquema no lo conoce" % field))
    if not state_cell:
        return findings
    named = {span["value"] for span in inline_code(state_cell)}
    for state in states:
        if state not in named:
            findings.append(finding(KIND_SHAPE, state, doc, "el esquema admite el estado '%s' y la fila 'state' de %s no lo nombra" % (state, doc)))
    for state in sorted(named):
        if state not in states:
            findings.append(finding(KIND_SHAPE, state, doc, "la fila 'state' de %s nombra '%s' y el esquema no lo admite" % (doc, state)))
    return findings


def record_bodies_declare_no_state(groups, words):
    findings = []
    for group in groups:
        if group["kind"] != "decision":
            continue
        for record in group["records"]:
            word = state_word_in_opening(record["body"], words)
            if word:
                findings.append(finding(KIND_RECORD, "#" + record["id"], "%s:%d" % (record["file"], record["body_line"]), "%s abre su cuerpo declarando '%s': el estado lo manda la cabecera y el cuerpo no lo repite" % (record["file"], word)))
    return findings


def named_files(command, files):
    """The files of the tree a gate's command names, once each and in order:
    its words, unquoted, with '{local:...}' unwrapped and Windows separators
    folded. The other tokens ('{python}') name no file."""
    named = []
    for word in COMMAND_WORD.findall(command):
        word = word.strip("\"'")
        local = V.LOCAL_TOKEN.fullmatch(word)
        if local:
            word = local.group(1)
        elif word.startswith("{"):
            continue
        word = word.replace("\\", "/")
        while word.startswith("./"):
            word = word[2:]
        if word in files and word not in named:
            named.append(word)
    return named


def harnesses_carry_every_guard(rows, guards):
    """The static half: the files a [harness] row runs carry the name of every
    guard, and a row whose files carry them all is marked [harness]. The
    dynamic half lives in verify.py, which demands the names in the runner's
    output, so a docstring alone never satisfies the convention."""
    findings = []
    for row in rows:
        where = "%s:%d" % (GATES_FILE, row.get("line", 0))
        named = row["named"]
        carried = [guard for guard in guards if any(guard in text for text in named.values())]
        if row["harness"] and not named:
            findings.append(finding(KIND_DATA, row["label"], where, "la puerta '%s' es un runner de tests ([%s]) y su comando no nombra ningun fichero del arbol:"
                                    " no se ven sus guardas; corre el runner, o su adaptador, por su ruta" % (row["label"], V.HARNESS_TAG)))
        elif row["harness"]:
            for guard in guards:
                if guard not in carried:
                    findings.append(finding(KIND_DATA, row["label"], where, "la puerta '%s' es un runner de tests y ninguno de los ficheros que corre (%s) lleva la '%s':"
                                            " una leccion que solo alcanza a un arnes no es una regla" % (row["label"], ", ".join(named), guard)))
        elif guards and len(carried) == len(guards):
            findings.append(finding(KIND_DATA, row["label"], where, "la puerta '%s' corre %s, que lleva las guardas, y su fila no lleva la marca [%s]:"
                                    " verify.py no exigiria verlas impresas" % (row["label"], ", ".join(named), V.HARNESS_TAG)))
    return findings


def quoted_end(value):
    """Where the quoted YAML scalar that opens `value` closes, or -1: '' is a
    single quote inside single quotes, and a backslash escapes the next
    character inside double quotes."""
    quote, at = value[0], 1
    while at < len(value):
        if quote == '"' and value[at] == "\\":
            at += 2
            continue
        if value[at] == quote:
            if quote == "'" and value[at + 1:at + 2] == "'":
                at += 2
                continue
            return at
        at += 1
    return -1


def yaml_scalar(value):
    """The text of a one-line YAML scalar, and what keeps it from being one ('' when
    nothing does): a quoted one is unquoted; a plain one loses its trailing
    comment, and may neither carry ': ' nor open another kind of node."""
    if value[:1] in ("'", '"'):
        end = quoted_end(value)
        rest = value[end + 1:].strip() if end >= 0 else ""
        if end < 0 or (rest and not rest.startswith("#")):
            return value, "abre comillas y no las cierra al final del valor"
        return (value[1:end].replace("''", "'") if value[0] == "'" else value[1:end]), ""
    cut = value.find(" #")
    text = value[:cut].rstrip() if cut >= 0 else value
    if ": " in text or text.endswith(":"):
        return text, "lleva ': ' sin comillas, y YAML lo lee como otra clave: ponlo entre comillas"
    if text[:1] in YAML_INDICATORS or text.startswith("- ") or text == "-":
        return text, "empieza por '%s', que en YAML abre otra cosa que un texto: ponlo entre comillas" % text[:1]
    return text, ""


def skill_frontmatter(text):
    """The top-level 'key: value' pairs of a skill's YAML header, with quotes
    and folded or literal blocks read as their text; nested maps are skipped.
    'problem' says what keeps the header from being YAML that a tool loads:
    the first thing found, its fields read all the same."""
    lines = text.split("\n")
    if not lines or lines[0].strip() != FENCE:
        return {"fields": {}, "problem": "no abre con su cabecera YAML '%s'" % FENCE}
    fields, key, block, problem = {}, "", False, ""
    for number in range(1, len(lines)):
        line = lines[number]
        if line.strip() == FENCE:
            return {"fields": fields, "problem": problem}
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line[0] in " \t":
            if block:
                fields[key] = (fields[key] + " " + line.strip()).strip()
            continue
        colon = line.find(":")
        if colon <= 0:
            return {"fields": fields, "problem": "la linea %d de la cabecera no es 'clave: valor'" % (number + 1)}
        key, value = line[:colon].strip(), line[colon + 1:].strip()
        block = value in SKILL_BLOCKS
        if block:
            value = ""
        elif value:
            value, wrong = yaml_scalar(value)
            problem = problem or ("el valor de '%s' %s" % (key, wrong) if wrong else "")
        fields[key] = value
    return {"fields": fields, "problem": "la cabecera YAML no se cierra con '%s'" % FENCE}


def skills_are_well_formed(directory, folders, texts, indexed):
    """Every folder of a skills directory is a skill: an id, a SKILL.md whose
    header names it and says when to use it, and a line in the contract's
    index; and every line of the index is a skill that exists."""
    findings, wanted = [], set()
    for folder in folders:
        path = "%s/%s/%s" % (directory, folder, SKILL_FILE)
        wanted.add(path)
        if not is_slug(folder):
            findings.append(finding(KIND_SHAPE, folder, path, "la carpeta de la skill '%s' no es una identidad (minusculas, digitos y guiones, en ingles como todo nombre)" % folder))
        if folder not in texts:
            findings.append(finding(KIND_SHAPE, folder, "%s/%s" % (directory, folder), "la carpeta '%s/%s' no tiene %s: no es una skill que una herramienta pueda cargar" % (directory, folder, SKILL_FILE)))
            continue
        header = skill_frontmatter(texts[folder])
        fields = header["fields"]
        if header["problem"]:
            findings.append(finding(KIND_SHAPE, folder, path, "%s %s" % (path, header["problem"])))
        elif fields.get("name", "") != folder:
            findings.append(finding(KIND_SHAPE, folder, path, "%s dice 'name: %s' y su carpeta es '%s': una herramienta la carga por su nombre" % (path, fields.get("name", ""), folder)))
        elif not fields.get("description", ""):
            findings.append(finding(KIND_SHAPE, folder, path, "%s no dice su 'description': sin ella, nadie sabe cuando usarla" % path))
        if path not in indexed:
            findings.append(finding(KIND_SHAPE, folder, path, "la skill '%s' no esta en el indice de skills del contrato: no todas las herramientas leen %s" % (folder, directory)))
    for path in indexed:
        if path not in wanted:
            findings.append(finding(KIND_SHAPE, path, CONTRACT, "el indice de skills del contrato cita '%s' y esa skill no existe" % path))
    return findings


def engine_hash(raw):
    """The sha256 of an engine file's content, its line ends folded to LF: the
    repository fixes line ends (.gitattributes), a checkout does not change
    the engine."""
    return hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()


def engine_files_are_unchanged(declared, actual):
    """`declared`: (path, sha256) rows of MANIFEST.txt; `actual`: the sha256
    of each path today, None when it is gone."""
    findings = []
    for path, sealed in declared:
        now = actual.get(path)
        if now is None:
            findings.append(finding(KIND_ENGINE, path, path, "'%s' es del motor de la plantilla y no existe: restauralo de su version, o declara por que falta;"
                                    " %s" % (path, UPGRADE_POINTER)))
        elif sealed == UNSEALED:
            findings.append(finding(KIND_ENGINE, path, MANIFEST_FILE, "'%s' es del motor y su huella esta sin sellar: en la plantilla, `python tools/board/board.py seal`" % path))
        elif now != sealed:
            findings.append(finding(KIND_ENGINE, path, path, "'%s' es del motor y cambio respecto a la plantilla: un parche local se declara en exceptions.txt"
                                    " (`%s %s`) con su motivo, para que una actualizacion sepa que fusionar a mano; %s" % (path, KIND_ENGINE, path, UPGRADE_POINTER)))
    return findings


def read_manifest(rows, problems):
    """The version, the engine rows and the template-only paths of MANIFEST.txt."""
    versions = values_of(rows, VERSION_KEY)
    if len(versions) != 1:
        problems.append("%s tiene que declarar exactamente una '%s' y declara %d" % (MANIFEST_FILE, VERSION_KEY, len(versions)))
    elif not VERSION_SHAPE.match(versions[0]):
        problems.append("%s: la version '%s' no es X.Y.Z" % (MANIFEST_FILE, versions[0]))
    engine = []
    for value in values_of(rows, ENGINE_KEY):
        parts = value.split()
        if len(parts) != 2:
            problems.append("%s: '%s %s' no es '%s <ruta> <sha256>'" % (MANIFEST_FILE, ENGINE_KEY, value, ENGINE_KEY))
            continue
        engine.append((parts[0], parts[1]))
    return {"version": versions[0] if versions else "", "engine": engine, "template": values_of(rows, TEMPLATE_KEY)}


def is_template(manifest):
    """The template is the tree whose MANIFEST.txt declares `template` rows: a
    copy's never does (instantiate.py writes it without them), so a folder of
    the same name in a copy never makes it the template."""
    return bool(manifest["template"])


def under_any(path, roots):
    """Whether a path is one of `roots` or lies under one of them."""
    return path in roots or inside_generated(path, roots)


def hooks_are_executable(entries):
    """(mode, path) of what the index holds under the hooks directory: a hook
    (a file with no extension) is executable there, or a clone on Linux or
    macOS never runs it."""
    findings = []
    for mode, path in entries:
        if "." in path.rsplit("/", 1)[-1] or mode == EXECUTABLE_MODE:
            continue
        findings.append(finding(KIND_DATA, path, path, "el hook '%s' esta en el indice como %s: git en Linux y macOS ignora un hook que no es ejecutable;"
                                " `git update-index --chmod=+x %s`" % (path, mode, path)))
    return findings


def timeless_cites_only_settled(citations, records):
    """A timeless document states rules; a rule resting on a provisional, open,
    postponed or discarded decision has no base, and one resting on a retired
    confirmed decision lost it. A resolved question, a lesson and a delivery
    are history and always qualify. Citations that resolve to nothing are the
    identity check's business, not this one's."""
    findings = []
    for c in citations:
        if not is_slug_citation(c["value"]):
            continue
        record = records.get(c["value"][1:])
        if record is None or record["kind"] != "decision":
            continue
        fields = record["fields"]
        state = fields.get("state", "")
        if state == RESOLVED_STATE or (state in SETTLED_STATES and "retired" not in fields):
            continue
        why = "'retired'" if "retired" in fields else ("'%s'" % state if state else "sin estado")
        findings.append(finding(KIND_SHAPE, c["value"], "%s:%d" % (c["doc"], c["line"]), "'%s' se apoya en '%s', una decision %s: un documento intemporal solo cita decisiones confirmadas o resueltas, lecciones y entregas" % (c["doc"], c["value"], why)))
    return findings


def fingerprint(template):
    return hashlib.sha256(template.encode("utf-8")).hexdigest()[:16]


def stamp(template, date):
    return template.replace(PRINT_TOKEN, fingerprint(template)).replace(DATE_TOKEN, date)


def stored_stamp(text):
    at = text.find(STAMP_MARK)
    if at < 0:
        return ""
    value, i = "", at + len(STAMP_MARK)
    while i < len(text) and text[i] in "0123456789abcdef":
        value += text[i]
        i += 1
    return value


def stored_date(stored_text, template):
    """The date the stored derivative was sealed with, read where the template
    puts it: right after the text that precedes the date token on its line."""
    sealed = template.replace(PRINT_TOKEN, fingerprint(template))
    at = sealed.find(DATE_TOKEN)
    if at < 0:
        return ""
    anchor = sealed[sealed.rfind("\n", 0, at) + 1:at]
    found = stored_text.find(anchor) if anchor else (0 if stored_text.startswith(sealed[:at]) else -1)
    if found < 0:
        return ""
    candidate = stored_text[found + len(anchor):found + len(anchor) + 10]
    return candidate if is_date(candidate) else ""


def is_current(stored_text, template):
    """Current means the WHOLE text is what the template seals, with the stored
    date: the fingerprint alone would let a hand edit that kept it live on."""
    if DATE_TOKEN not in template:
        return stored_text == stamp(template, "")
    date = stored_date(stored_text, template)
    return bool(date) and stored_text == stamp(template, date)


def today():
    return time.strftime("%Y-%m-%d")


def latest_honest_date(day):
    """A derivative is sealed with the local date, and a collaborator east of
    here may already be on tomorrow; anything later was typed by a hand."""
    return (datetime.date.fromisoformat(day) + datetime.timedelta(days=1)).isoformat()


def derived_state(stored_text, template, day):
    """What a stored derivative is against what its sources say on `day`, and
    the date to seal it with when it is rewritten. Only a hand writes a
    derivative without its fingerprint, with its fingerprint and other text,
    or with a date after tomorrow; one with another fingerprint is just old."""
    if not stored_text.strip():
        return {"state": DERIVED_MISSING, "date": day, "why": ""}
    print_value = stored_stamp(stored_text)
    if not print_value:
        return {"state": DERIVED_EDITED, "date": day, "why": "no lleva su huella"}
    if print_value != fingerprint(template):
        return {"state": DERIVED_STALE, "date": day, "why": ""}
    date = stored_date(stored_text, template)
    if date > latest_honest_date(day):
        return {"state": DERIVED_EDITED, "date": day, "why": "lleva la fecha %s, posterior a hoy" % date}
    if not is_current(stored_text, template):
        return {"state": DERIVED_EDITED, "date": date or day, "why": "conserva su huella y dice algo que sus fuentes no dicen"}
    return {"state": DERIVED_CURRENT, "date": date, "why": ""}


DERIVED_FINDINGS = {
    DERIVED_MISSING: "el derivado '{file}' no existe o esta vacio: lo escribe el build",
    DERIVED_STALE: "el derivado '{file}' se quedo viejo: dice algo distinto de lo que dicen hoy las fuentes",
    DERIVED_EDITED: "el derivado '{file}' {why}: lo editaron a mano; se regenera, no se edita",
}


def derived_files_are_current(derived, day):
    findings = []
    for entry in derived:
        judged, file = derived_state(entry["stored"], entry["template"], day), entry["file"]
        if judged["state"] in DERIVED_FINDINGS:
            findings.append(finding(KIND_DERIVED, file, file, DERIVED_FINDINGS[judged["state"]].format(file=file, why=judged["why"])))
    return findings

# ----------------------------------------------------------------- model

def parse_verdict(text):
    verdict = {"date": "", "rows": []}
    for raw in text.split("\n"):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if parts[0] == "date" and len(parts) >= 2:
            verdict["date"] = parts[1]
        elif parts[0] == "gate" and len(parts) >= 3:
            verdict["rows"].append({"label": parts[1], "verdict": parts[2]})
    return verdict


def title_of(line, marker):
    text = line[3:].strip()
    if marker:
        text = text[:len(text) - len(marker) - 2].strip()
    dash = text.find("—")
    return text if dash < 0 else text[dash + 1:].strip()


def part_state(name):
    """A part says DONE or IN PROGRESS in its name; one that says neither is
    still to be done."""
    if has_word(name, IN_PROGRESS):
        return IN_PROGRESS
    return DONE if has_word(name, DONE) else PENDING


def parts_of(lines):
    parts, inside = [], False
    for entry in lines:
        line = entry["value"]
        if not line.startswith("  "):
            inside = False
            continue
        stripped = line.strip()
        dot = stripped.find(". ")
        number = "" if dot <= 0 else stripped[:dot]
        if number.isdigit():
            parts.append({"number": number, "text": stripped[dot + 2:]})
            inside = True
            continue
        if inside and parts:
            parts[-1]["text"] += " " + stripped
    # The bold run is the part's name, and its marker lives there and nowhere
    # else: the prose after it, or a part with no bold name, may mention a
    # marker without being one.
    named = [(p, opening_bold(p["text"])) for p in parts]
    return [{"number": p["number"], "title": bullet_name(bold or p["text"]), "state": part_state(bold)} for p, bold in named]


def order_steps(line, phases, prefixes):
    """The phases of the line in its order, then the plan's phases it leaves
    out. A step that is no phase of the plan is not painted: the order check
    reports it."""
    steps, placed = [], set()
    for step in read_order(line, prefixes)["steps"]:
        pid = step["id"]
        if pid not in phases:
            continue
        placed.add(pid)
        steps.append({"kind": "phase", "id": pid, "label": phases[pid]["title"], "marker": phases[pid]["marker"]})
    for pid in phases:
        if pid not in placed:
            steps.append({"kind": "outside", "id": pid, "label": phases[pid]["title"], "marker": phases[pid]["marker"]})
    return steps


def next_step(steps):
    for step in steps:
        if step["kind"] == "outside" or (step["kind"] == "phase" and step["marker"] == DONE):
            continue
        return step
    return {}


def build_axis(axis, file, text):
    prefixes = [axis]
    phases = {}
    for header in phase_headers(text, prefixes):
        phases[header["id"]] = {"id": header["id"], "title": title_of(header["value"], header["marker"]), "marker": header["marker"]}
    lines = order_lines(text, prefixes)
    steps = order_steps(lines[0]["value"], phases, prefixes) if lines else []
    current = {}
    for pid, phase in phases.items():
        if phase["marker"] == IN_PROGRESS:
            current = {"id": pid, "title": phase["title"], "parts": parts_of(section(text, pid + " "))}
            break
    return {"axis": axis, "file": file, "phases": phases, "steps": steps, "current": current, "next": next_step(steps)}


def build_model(plans, records, verdict):
    axes = [build_axis(p["axis"], p["file"], p["text"]) for p in plans]
    anywhere, order = {}, []
    for axis in axes:
        order.append(axis["axis"])
        anywhere.update(axis["phases"])
    decisions = records.get("decisions", {}).get("records", [])
    return {
        "axes": axes,
        "axis_order": order,
        "phases": anywhere,
        "fronts": fronts_of(decisions, anywhere, order),
        "resolved": sum(1 for r in decisions if is_resolved(r) and not is_debt(r)),
        "debts": debts_of(decisions),
        "records": records,
        "gates": verdict,
    }


def sort_key(order):
    return lambda pid: (order.index(pid[0]) if pid[0] in order else 99, int(pid[1:]))


def pending_named_by(ids, phases, order):
    pending = sorted([pid for pid in ids if phases[pid]["marker"] != DONE], key=sort_key(order))
    if not pending:
        return {}
    return {"names": pending, "open": phases[pending[0]]["marker"] == IN_PROGRESS}


def fronts_of(decisions, phases, order):
    found = []
    for record in decisions:
        if not is_open(record) or is_debt(record):
            continue
        ids = []
        for token in phases_of(record):
            if token in phases and token not in ids:
                ids.append(token)
        found.append({"id": record["id"], "name": record["fields"].get("title", record["id"]),
                      "phases": ids, "named_by": pending_named_by(ids, phases, order)})
    return found


def debts_of(decisions):
    found = []
    for record in decisions:
        if not is_debt(record):
            continue
        ids = [t for t in phases_of(record) if t != NO_PHASE]
        found.append({"id": record["id"], "name": record["fields"].get("title", record["id"]), "phases": ids,
                      "criterion": record["fields"].get("criterion", ""), "paid": is_resolved(record)})
    return found

# ----------------------------------------------------------------- render

WIDTH = 78


def by_plan_then_name(order):
    return lambda front: (sort_key(order)(front["named_by"]["names"][0]), front["name"])


def render_summary(model):
    text = "ESTADO DEL PROYECTO\n"
    text += "GENERADO por tools/board desde el repositorio. No editar a mano: se reescribe.\n"
    text += STAMP_MARK + PRINT_TOKEN + " — su contenido cambió por última vez el " + DATE_TOKEN + ".\n"
    text += "Esto es un resumen derivado. Manda el documento o el registro, no este fichero.\n"
    text += "-" * WIDTH + "\n"
    rows = model["gates"].get("rows", [])
    if not rows:
        text += "PUERTAS      NO DERIVABLE: no hay veredicto guardado todavía.\n"
    else:
        red = [r["label"] for r in rows if r["verdict"] != GREEN]
        text += "PUERTAS      %d de %d en verde" % (len(rows) - len(red), len(rows))
        if red:
            text += " · EN ROJO: " + ", ".join(red)
        text += " (sin cambios desde %s)\n" % model["gates"]["date"]
    for axis in model["axes"]:
        pieces, outside = [], []
        for step in axis["steps"]:
            if step["kind"] == "phase":
                mark = {DONE: " " + DONE_MARK, IN_PROGRESS: " (en curso)", "": " (SIN MARCADOR)"}.get(step["marker"], "")
                pieces.append(step["id"] + mark)
            else:
                outside.append(step["id"])
        if pieces:
            text += "%-12s %s\n" % ("ORDEN " + axis["axis"], " > ".join(pieces))
        if outside:
            text += "             (fuera de la linea, con motivo registrado: " + " ".join(outside) + ")\n"
    for axis in model["axes"]:
        current = axis["current"]
        if not current:
            if axis["next"]:
                step = axis["next"]
                label = "%s — %s" % (step["id"], step["label"]) if step["label"] else step["id"]
                text += "\nEN CURSO     nada en el eje %s; SIGUIENTE, derivado de la línea: %s\n" % (axis["axis"], label)
            continue
        text += "\nEN CURSO — %s: %s\n" % (current["id"], current["title"])
        for part in current["parts"]:
            text += "  %-6s %-44s %s\n" % (current["id"] + "." + part["number"], part["title"], PART_SHOWN[part["state"]])
    placed = sorted([f for f in model["fronts"] if f["named_by"]], key=by_plan_then_name(model["axis_order"]))
    unplaced = [f for f in model["fronts"] if not f["named_by"]]
    any_current = any(axis["current"] for axis in model["axes"])
    now = [f for f in placed if not any_current or f["named_by"]["open"]]
    rest = [f for f in placed if any_current and not f["named_by"]["open"]]
    text += "\nFRENTES ABIERTOS  %d vivos (%d resueltos que conservan su rastro)\n" % (len(placed) + len(unplaced), model["resolved"])
    text += "  Cada frente es una decision abierta; la fase es la que su registro declara. La\n"
    text += "  lista entera, en el indice de decisiones (seccion ABIERTAS).\n"
    text += ("  DE LA FASE EN CURSO (%d) — lo que arrastra de verdad:\n" if any_current else "  POR FASE (%d):\n") % len(now)
    for front in now:
        text += "    · %-14s %s\n" % (" ".join(front["named_by"]["names"]), front["name"])
    if any_current:
        counts, order = {}, []
        for front in rest:
            first = front["named_by"]["names"][0]
            if first not in counts:
                counts[first] = 0
                order.append(first)
            counts[first] += 1
        text += "  DEL RESTO, POR FASE (%d): %s\n" % (len(rest), " · ".join("%s %d" % (pid, counts[pid]) for pid in order) or "ninguno")
    text += "  SIN FASE PENDIENTE (%d) — su registro dice `%s`, o solo nombra fases ya hechas:\n" % (len(unplaced), NO_PHASE)
    for front in unplaced:
        text += "    · " + front["name"] + "\n"
    alive = [d for d in model["debts"] if not d["paid"]]
    text += "\nDEUDAS       %d vivas, %d pagadas\n" % (len(alive), len(model["debts"]) - len(alive))
    for debt in alive:
        text += "  %-12s %s\n" % (" ".join(debt["phases"]) or "sin fase", debt["name"])
    text += "-" * WIDTH + "\n"
    text += "NO DERIVABLE\n  · Estado del árbol de trabajo y último commit: se miran con `git status`.\n"
    return text


DECISION_SECTIONS = [
    {"title": "ABIERTAS", "states": ["open", "postponed"], "debts": False, "work": True},
    {"title": "DEUDAS VIVAS", "states": ["open", "postponed", "provisional", "confirmed"], "debts": True, "work": True},
    {"title": "PROVISIONALES", "states": ["provisional"], "debts": False, "work": True},
    {"title": "CONFIRMADAS", "states": ["confirmed"], "debts": False, "work": False},
    {"title": "RESUELTAS", "states": ["resolved"], "debts": None, "work": False},
    {"title": "DESCARTADAS", "states": ["discarded"], "debts": None, "work": False},
]
RETIRED_SECTION = "RETIRADAS"


def by_date(records):
    """Newest first, and by identity within a day: derived and stable, so a
    versioned index never churns for an unrelated edit."""
    def key(record):
        date = record["fields"].get("date", "")
        digits = date.replace("-", "") if is_date(date) else "0"
        return (-int(digits), record["id"])
    return sorted(records, key=key)


def decision_line(record):
    fields = record["fields"]
    line = "- `#%s` — %s (%s %s)" % (record["id"], fields.get("title", record["id"]), fields.get("state", "").upper(), fields.get("date", ""))
    phases = phases_of(record)
    if phases:
        line += " · " + " ".join(phases)
    if is_debt(record):
        line += " · " + DEBT_TYPE
    if is_retired(record):
        line += " · retired " + fields["retired"]
    return line


def decision_sections(records):
    """Every decision under the one section its state, its debt and its
    retirement give it, newest first: [(title, records, asks for work)]."""
    sections = []
    for sec in DECISION_SECTIONS:
        rows = [r for r in by_date(records) if not is_retired(r) and r["fields"].get("state", "") in sec["states"]
                and (sec["debts"] is None or is_debt(r) == sec["debts"])]
        sections.append((sec["title"], rows, sec["work"]))
    sections.append((RETIRED_SECTION, [r for r in by_date(records) if is_retired(r)], False))
    return sections


def rendered_section(title, records):
    return "\n## %s (%d)\n\n" % (title, len(records)) + "".join(decision_line(r) + "\n" for r in records)


def index_header(title, sources, about):
    """The opening every registry index shares: what generated it, its
    fingerprint and date, and what it holds."""
    text = "# %s (índice)\n\n" % title
    text += "GENERADO por tools/board desde %s. No editar a mano: se reescribe.\n" % sources
    text += STAMP_MARK + PRINT_TOKEN + " — su contenido cambió por última vez el " + DATE_TOKEN + ".\n\n"
    return text + about


def phase_keys(record, phases, order):
    """The per-phase indexes a decision belongs to: each phase of a plan it
    names, or NO_PHASE when it names none."""
    keys = sorted({token for token in phases_of(record) if token in phases}, key=sort_key(order))
    return keys or [NO_PHASE]


def decisions_by_phase(model):
    records = model["records"].get("decisions", {}).get("records", [])
    grouped = {}
    for record in records:
        for key in phase_keys(record, model["phases"], model["axis_order"]):
            grouped.setdefault(key, []).append(record)
    keys = sorted([k for k in grouped if k != NO_PHASE], key=sort_key(model["axis_order"]))
    return [(key, grouped[key]) for key in keys + ([NO_PHASE] if NO_PHASE in grouped else [])]


def decisions_index_file(key):
    return "%s/decisions-%s.md" % (INDEX_DIR, key)


def month_of(record):
    date = record["fields"].get("date", "")
    return date[:7] if is_date(date) else UNDATED


def notes_by_month(model):
    deliveries = model["records"].get("deliveries", {}).get("records", [])
    lessons = model["records"].get("lessons", {}).get("records", [])
    grouped = {}
    for kind, records in (("deliveries", deliveries), ("lessons", lessons)):
        for record in records:
            grouped.setdefault(month_of(record), {"deliveries": [], "lessons": []})[kind].append(record)
    months = sorted([m for m in grouped if m != UNDATED], reverse=True) + ([UNDATED] if UNDATED in grouped else [])
    return [(month, grouped[month]) for month in months]


def notes_index_file(month):
    return "%s/notes-%s.md" % (INDEX_DIR, month)


def delivery_line(record):
    return "- %s `#%s` %s" % (record["fields"].get("date", ""), record["id"], record["fields"].get("title", record["id"]))


def lesson_line(record):
    return "- `#%s` %s" % (record["id"], record["fields"].get("title", record["id"]))


def render_decisions_index(model, dirs):
    """The main index lists in full what asks for work (open decisions, live
    debts, provisional ones) and only counts the rest, which every per-phase
    index lists: its size follows the work in flight, not the history."""
    records = model["records"].get("decisions", {}).get("records", [])
    dec_dir = dirs.get("decisions", "docs/registry/decisions") + "/"
    text = index_header("Registro de decisiones", "`%s`" % dec_dir,
                        "Cada decisión es un fichero `%s<identidad>.md` con su cabecera de campos y su\n"
                        "texto; una cita `#<identidad>` resuelve abriendo ese fichero. Cómo se escribe una y cómo\n"
                        "cambia de estado, en `%s`. Una decisión no existe hasta tener su fichero; la\n"
                        "que deja de gobernar cambia de estado o lleva `retired`, y sigue en su índice.\n\n"
                        "Aquí van enteras las que piden trabajo; el resto solo se cuenta. Todas, sea cual sea su\n"
                        "estado, están en el índice de cada fase que nombran, y las que no nombran ninguna, en el\n"
                        "de `%s`.\n" % (dec_dir, REGISTRY_README, NO_PHASE))
    rest, counted = [], 0
    for title, rows, work in decision_sections(records):
        if work:
            text += rendered_section(title, rows)
            continue
        rest.append("%s %d" % (title, len(rows)))
        counted += len(rows)
    text += "\n## EL RESTO (%d), SOLO CONTADAS\n\n%s\n" % (counted, " · ".join(rest))
    groups = decisions_by_phase(model)
    text += "\n## Por fase (%d índices)\n\n" % len(groups)
    for key, group in groups:
        text += "- `%s` — %s: %d\n" % (decisions_index_file(key), key if key != NO_PHASE else "sin fase", len(group))
    return text


def render_phase_index(key, records, dirs):
    dec_dir = dirs.get("decisions", "docs/registry/decisions") + "/"
    if key == NO_PHASE:
        title, about = "Decisiones sin fase", "Las decisiones que no nombran ninguna fase de los planes: sin `phase`, o con `%s`.\n" % NO_PHASE
    else:
        title, about = "Decisiones de %s" % key, "Las decisiones que nombran %s en su campo `phase`, por estado.\n" % key
    text = index_header(title, "`%s`" % dec_dir, about + "El índice principal es `%s`.\n" % DECISIONS_INDEX_FILE)
    for section_title, rows, _ in decision_sections(records):
        text += rendered_section(section_title, rows)
    return text


def render_notes_index(model, dirs):
    """The main notes index shows the most recent deliveries and lessons;
    every one of them, month by month, is in its monthly index."""
    deliveries = by_date(model["records"].get("deliveries", {}).get("records", []))
    lessons = by_date(model["records"].get("lessons", {}).get("records", []))
    del_dir = dirs.get("deliveries", "docs/registry/deliveries") + "/"
    les_dir = dirs.get("lessons", "docs/registry/lessons") + "/"
    text = index_header("Notas de desarrollo", "`%s` y `%s`" % (del_dir, les_dir),
                        "Cada entrega es un fichero `%s<fecha>-<tema>.md` con lo que se hizo, cómo se\n"
                        "verificó y qué costó; cada lección es un fichero `%s<identidad>.md` y se cita como\n"
                        "`#<identidad>`. Para saber cómo está un sistema hoy se leen su código y sus tests; las\n"
                        "entregas dicen cómo llegó a estar así. Aquí van las más recientes de cada clase; todas,\n"
                        "mes a mes, en su índice del mes.\n" % (del_dir, les_dir))
    text += "\n## Entregas (%d; aquí las %d más recientes)\n\n" % (len(deliveries), min(len(deliveries), RECENT_NOTES))
    text += "".join(delivery_line(r) + "\n" for r in deliveries[:RECENT_NOTES])
    text += "\n## Lecciones (%d; aquí las %d más recientes)\n\n" % (len(lessons), min(len(lessons), RECENT_NOTES))
    text += "".join(lesson_line(r) + "\n" for r in lessons[:RECENT_NOTES])
    months = notes_by_month(model)
    text += "\n## Por mes (%d índices)\n\n" % len(months)
    for month, notes in months:
        text += "- `%s` — %s: %d entregas, %d lecciones\n" % (notes_index_file(month), month, len(notes["deliveries"]), len(notes["lessons"]))
    return text


def render_month_index(month, notes, dirs):
    del_dir = dirs.get("deliveries", "docs/registry/deliveries") + "/"
    les_dir = dirs.get("lessons", "docs/registry/lessons") + "/"
    shown = month if month != UNDATED else "sin fecha válida"
    text = index_header("Notas de %s" % shown, "`%s` y `%s`" % (del_dir, les_dir),
                        "Las entregas y las lecciones fechadas en %s. El índice principal es `%s`.\n" % (shown, NOTES_INDEX_FILE))
    deliveries, lessons = by_date(notes["deliveries"]), by_date(notes["lessons"])
    text += "\n## Entregas (%d, la más reciente primero)\n\n" % len(deliveries) + "".join(delivery_line(r) + "\n" for r in deliveries)
    text += "\n## Lecciones (%d, la más reciente primero)\n\n" % len(lessons) + "".join(lesson_line(r) + "\n" for r in lessons)
    return text


def derived_of(model, dirs):
    """Every derivative the board writes, with its template: the summary, the
    two main indexes, one index per phase that decisions name and one per
    month that notes carry."""
    derived = [
        {"file": SUMMARY_FILE, "template": render_summary(model)},
        {"file": DECISIONS_INDEX_FILE, "template": render_decisions_index(model, dirs)},
        {"file": NOTES_INDEX_FILE, "template": render_notes_index(model, dirs)},
    ]
    derived += [{"file": decisions_index_file(key), "template": render_phase_index(key, records, dirs)} for key, records in decisions_by_phase(model)]
    derived += [{"file": notes_index_file(month), "template": render_month_index(month, notes, dirs)} for month, notes in notes_by_month(model)]
    return derived


def is_index_file(path):
    return path.startswith(INDEX_DIR + "/") and path.endswith(".md")


def stray_index_files(files, derived_paths):
    """A markdown file in the index directory that no source generates any
    more: the board owns that directory, so it is a derivative to remove."""
    wanted = set(derived_paths)
    return [finding(KIND_DERIVED, path, path, "'%s' ya no lo genera ninguna fuente: el build lo borra si lleva la huella del tablero" % path)
            for path in sorted(files) if is_index_file(path) and path not in wanted]


# The indexes a session consults before it opens records or touches anything
# (AGENTS.md §5.1), each a cost per session under the `index` cap, with the
# question its finding asks: a main index grows with the work in flight, and
# the `none` one never closes.
CAPPED_INDEXES = {
    DECISIONS_INDEX_FILE: "lo que pide trabajo ha crecido; la pregunta es qué se cierra",
    NOTES_INDEX_FILE: "lo que pide trabajo ha crecido; la pregunta es qué se cierra",
    decisions_index_file(NO_PHASE): "no se cierra nunca; la pregunta es cómo se parte, con los datos de este registro",
}


def indexes_within(sizes, cap, source):
    return [finding(KIND_SHAPE, INDEX_LIMIT, path, "el índice %s pesa %d B y el tope (%s) son %d: %s, no cuánto subir el tope" % (path, size, source, cap, CAPPED_INDEXES[path]))
            for path, size in sorted(sizes.items()) if size > cap]

# ----------------------------------------------------------------- encoding

def decode_text(raw):
    """UTF-8 without BOM is the only clean shape. Returns the text (BOM dropped,
    undecodable bytes replaced, line ends folded to '\\n') and what was wrong:
    'bom', and the offset of the first byte that is not UTF-8 (-1 when none)."""
    bom = raw.startswith(UTF8_BOM)
    body = raw[len(UTF8_BOM):] if bom else raw
    bad_byte = -1
    try:
        text = body.decode("utf-8")
    except UnicodeDecodeError as error:
        text = body.decode("utf-8", "replace")
        bad_byte = error.start + (len(UTF8_BOM) if bom else 0)
    return {"text": text.replace("\r\n", "\n").replace("\r", "\n"), "bom": bom, "bad_byte": bad_byte}


def document_encoding(path, decoded):
    """A document, a record, a data file or a derivative is UTF-8 without BOM,
    or a [datos] finding says what it is instead: never a traceback, and never
    the misleading findings that a BOM causes in a header or a first line."""
    if decoded["bad_byte"] >= 0:
        return [finding(KIND_DATA, path, path, "'%s' no es UTF-8 (byte %d): reescribelo en UTF-8 sin BOM" % (path, decoded["bad_byte"]))]
    if decoded["bom"]:
        return [finding(KIND_DATA, path, path, "'%s' empieza por BOM (EF BB BF): guardalo como UTF-8 sin BOM" % path)]
    return []


def source_encoding(path, decoded):
    """A code source is read only for its comments. Some editors write a BOM in
    their languages, so a BOM is dropped with a warning; bytes that are not
    UTF-8 are an excusable finding, because a legacy source may have to stay."""
    if decoded["bad_byte"] >= 0:
        message = "'%s' no es UTF-8 (byte %d): sus comentarios se leen con sustituciones; conviertelo a UTF-8 o excusalo con su motivo" % (path, decoded["bad_byte"])
        return {"findings": [finding(KIND_ENCODING, path, path, message)], "warnings": []}
    if decoded["bom"]:
        return {"findings": [], "warnings": ["'%s' empieza por BOM (EF BB BF): se ignora para leer sus comentarios" % path]}
    return {"findings": [], "warnings": []}

# ----------------------------------------------------------------- I/O edge

class TreeReader:
    """Every file content the board reads comes through here: documents,
    records, data files and derivatives with `text`, decoded once per path;
    declared code sources with `code`, read each time and never kept, because a
    large repository's code does not fit in memory for one comment pass. What
    is wrong with an encoding is gathered, once per path, in `findings` and
    `warnings` for the caller to report."""

    def __init__(self, root):
        self.root = root
        self.findings, self.warnings = [], []
        self._decoded, self._judged = {}, set()

    def _decode(self, rel):
        path = os.path.join(self.root, rel)
        if not os.path.isfile(path):
            return None
        try:
            with open(path, "rb") as handle:
                return decode_text(handle.read())
        except OSError as error:
            if rel not in self._judged:
                self._judged.add(rel)
                self.findings.append(finding(KIND_DATA, rel, rel, "'%s' no se pudo leer: %s" % (rel, error)))
            return None

    def _read(self, rel):
        if rel not in self._decoded:
            self._decoded[rel] = self._decode(rel)
        return self._decoded[rel]

    def text(self, rel):
        decoded = self._read(rel)
        if decoded is None:
            return ""
        if rel not in self._judged:
            self._judged.add(rel)
            self.findings += document_encoding(rel, decoded)
        return decoded["text"]

    def code(self, rel):
        decoded = self._decode(rel)
        if decoded is None:
            return ""
        if rel not in self._judged:
            self._judged.add(rel)
            judged = source_encoding(rel, decoded)
            self.findings += judged["findings"]
            self.warnings += judged["warnings"]
        return decoded["text"]

    def raw(self, rel):
        """The bytes of a file as they are on disk, or None when it is not
        there: what the engine's fingerprint is taken over."""
        path = os.path.join(self.root, rel)
        if not os.path.isfile(path):
            return None
        with open(path, "rb") as handle:
            return handle.read()

    def unjudged(self, rel):
        """The text of a file read only to look for names in it (what a gate
        runs may be any kind of file): its encoding is nobody's finding here."""
        decoded = self._read(rel)
        return "" if decoded is None else decoded["text"]

    def encoding_is_clean(self, rel):
        """UTF-8 without BOM, or absent: a missing file has no encoding to fault."""
        decoded = self._read(rel)
        return decoded is None or (not decoded["bom"] and decoded["bad_byte"] < 0)


class TreeListError(Exception):
    """git could not list the tree; the message says why."""


def join_rel(rel_dir, name):
    return rel_dir + "/" + name if rel_dir else name


def is_tagged_cache(directory):
    try:
        with open(os.path.join(directory, CACHE_TAG), "rb") as handle:
            return handle.read(len(CACHE_TAG_SIGNATURE)) == CACHE_TAG_SIGNATURE
    except OSError:
        # No tag, or a tag that cannot be read: neither proves a cache.
        return False


def is_skipped_dir(rel, directory, generated):
    name = rel.rsplit("/", 1)[-1]
    return (name in SKIPPED_TREES or rel in generated or is_tagged_cache(directory)
            or os.path.isfile(os.path.join(directory, VENV_MARK)))


def walk_files(root, generated):
    files, dirs, findings = [], [], []

    def unreadable(error):
        rel = os.path.relpath(error.filename or root, root).replace("\\", "/")
        findings.append(finding(KIND_DATA, rel, rel, "no se pudo recorrer '%s': %s" % (rel, error)))

    for dirpath, dirnames, filenames in os.walk(root, onerror=unreadable):
        rel_dir = os.path.relpath(dirpath, root).replace("\\", "/")
        rel_dir = "" if rel_dir == "." else rel_dir
        dirnames[:] = [d for d in dirnames if not is_skipped_dir(join_rel(rel_dir, d), os.path.join(dirpath, d), generated)]
        dirs += [join_rel(rel_dir, d) for d in dirnames]
        files += [join_rel(rel_dir, name) for name in filenames]
    return {"files": files, "dirs": dirs, "findings": findings}


def run_git(root, command):
    """What a read-only git command prints, NUL-separated, about the tree at
    `root`, never about the repository a hook's environment points at."""
    env = V.without_git_location(os.environ)
    try:
        done = subprocess.run(command, cwd=root, env=env, stdin=subprocess.DEVNULL, capture_output=True, timeout=GIT_SECONDS)
    except subprocess.TimeoutExpired:
        raise TreeListError("git ls-files no respondio en %ds" % GIT_SECONDS)
    except OSError as error:
        raise TreeListError("git no se pudo lanzar: %s" % error)
    if done.returncode != 0:
        said = done.stderr.decode("utf-8", "replace").strip().split("\n")[0]
        raise TreeListError("git ls-files salio con %d: %s" % (done.returncode, said))
    return [os.fsdecode(item) for item in done.stdout.split(b"\0") if item]


def git_names(root):
    return run_git(root, GIT_LIST)


def git_modes(root):
    """(mode, path) of every entry the index holds under the hooks directory."""
    entries = []
    for item in run_git(root, GIT_MODES):
        meta, _, path = item.partition("\t")
        entries.append((meta.split(" ")[0], path))
    return entries


def git_files(root, generated, names):
    """What git listed, once per name (an unmerged path comes once per stage),
    minus what the walk would skip and what is gone from the working tree (a
    tracked file deleted and not committed yet)."""
    files, dirs, verdicts = [], set(), {}

    def skipped(rel):
        if rel not in verdicts:
            verdicts[rel] = is_skipped_dir(rel, os.path.join(root, rel), generated)
        return verdicts[rel]

    for name in dict.fromkeys(names):
        parts = name.split("/")
        ancestors = ["/".join(parts[:i]) for i in range(1, len(parts))]
        full = os.path.join(root, name)
        if any(skipped(a) for a in ancestors) or not os.path.lexists(full):
            continue
        if os.path.isdir(full):
            dirs.add(name)
        else:
            files.append(name)
        dirs.update(ancestors)
    return {"files": files, "dirs": sorted(dirs), "findings": []}


def tree_listing(root, generated):
    """The files and directories of the tree. With a .git in the root, git says
    which, so .gitignore decides what is not the repository's; without one, the
    walk skips the known trees and the directories that tag themselves."""
    if os.path.exists(os.path.join(root, ".git")):
        try:
            listing = git_files(root, generated, git_names(root))
            listing["source"] = GIT_SOURCE
            return listing
        except TreeListError as error:
            walked = walk_files(root, generated)
            walked["findings"].append(finding(KIND_DATA, ".git", ".git", "el arbol no se pudo listar con git (%s): se recorrio con os.walk, que no lee .gitignore" % error))
            walked["source"] = "os.walk (git fallo)"
            return walked
    walked = walk_files(root, generated)
    walked["source"] = "os.walk"
    return walked


def index_tree(files, dirs, generated):
    """Every path of the tree (relative, with '/') plus its suffixes at segment
    boundaries; the whole paths; and the markdown and source files."""
    known, markdown = set(), []
    for tree in generated:
        add_suffixes(known, tree)
    for directory in dirs:
        add_suffixes(known, directory)
    for file in files:
        add_suffixes(known, file)
        if file.endswith(".md"):
            markdown.append(file)
    return {"known": known, "paths": set(files) | set(dirs), "markdown": markdown, "sources": list(files)}


def add_suffixes(known, path):
    parts = path.split("/")
    suffix = ""
    for part in reversed(parts):
        suffix = part if not suffix else part + "/" + suffix
        known.add(suffix)


def comment_start(line, prefix):
    """Where the comment of a line starts: the first `prefix` that opens the
    line or follows a blank. A prefix glued to other text ('"## ...', 'http://',
    '`#id`') is inside a string or a word, not a comment."""
    at = line.find(prefix)
    while at >= 0:
        if at == 0 or line[at - 1].isspace():
            return at
        at = line.find(prefix, at + 1)
    return -1


def comments_only(text, prefix):
    """The comment part of every line: a comment at the end of a line of code
    cites as much as a whole-line one. A blank-preceded prefix inside a string
    only widens what is read, and only `#<identity>` spans count."""
    kept = []
    for raw in text.split("\n"):
        at = comment_start(raw, prefix)
        kept.append(raw[at:] if at >= 0 else "")
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
    write would be. verify.py has the same function; a test crosses the two
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


def read_gate_rows(root, reader):
    """The gates and guards of gates.txt, read with verify.py's own parser; a
    file that parser refuses is a finding, never a traceback."""
    if not os.path.isfile(os.path.join(root, GATES_FILE)):
        return {"rows": [], "guards": [], "findings": [finding(KIND_DATA, GATES_FILE, GATES_FILE, "%s no existe: sin el no hay puertas" % GATES_FILE)]}
    try:
        listing = V.parse_gates(reader.text(GATES_FILE), "python")
    except V.GatesFileError as error:
        return {"rows": [], "guards": [], "findings": [finding(KIND_DATA, GATES_FILE, GATES_FILE, str(error))]}
    return {"rows": listing["gates"], "guards": listing["guards"], "findings": []}


def read_skills(directories, files, reader):
    """What the skills directories hold: the folders of each, the SKILL.md of
    each folder, and every markdown under them with its citations and links,
    which are checked as a living document's are."""
    found = {"folders": {}, "texts": {}, "markdown": [], "citations": [], "links": []}
    for directory in directories:
        folders, texts = [], {}
        for path in sorted(files):
            if not path.startswith(directory + "/"):
                continue
            rest = path[len(directory) + 1:].split("/")
            if len(rest) > 1 and rest[0] not in folders:
                folders.append(rest[0])
            if not path.endswith(".md"):
                continue
            found["markdown"].append(path)
            text = reader.text(path)
            if len(rest) == 2 and rest[1] == SKILL_FILE:
                texts[rest[0]] = text
            where = {"doc": path, "dir": os.path.dirname(path)}
            found["citations"] += [dict(where, value=s["value"], line=s["line"]) for s in inline_code(text)]
            found["links"] += [dict(where, value=s["value"], line=s["line"]) for s in markdown_links(text)]
        found["folders"][directory], found["texts"][directory] = folders, texts
    return found


def load(root, reader):
    problems = []
    documents = parse_data(reader.text(BOARD_DIR + "/documents.txt"), "documents.txt", problems)
    exceptions = parse_data(reader.text(BOARD_DIR + "/exceptions.txt"), "exceptions.txt", problems)
    limits = parse_data(reader.text(BOARD_DIR + "/limits.txt"), "limits.txt", problems)
    prose_rows = parse_data(reader.text(BOARD_DIR + "/" + PROSE_FILE), PROSE_FILE, problems)
    prose = {key: one_value(prose_rows, key, PROSE_FILE, problems) for key in PROSE_HEADINGS}
    prose["state_words"] = state_words(values_of(prose_rows, STATE_WORD_KEY))
    prose[SKILLS_KEY] = values_of(prose_rows, SKILLS_KEY)
    manifest = read_manifest(parse_data(reader.text(BOARD_DIR + "/" + MANIFEST_FILE), MANIFEST_FILE, problems), problems)
    plans = []
    for value in values_of(documents, "axis"):
        parts = value.split(" ", 1)
        if len(parts) != 2 or len(parts[0]) != 1 or not parts[0].isupper():
            problems.append("documents.txt: 'axis' espera '<LETRA> <ruta>' y tiene '%s'" % value)
            continue
        plans.append({"axis": parts[0], "file": parts[1].strip(), "text": reader.text(parts[1].strip())})
    return {"documents": documents, "exceptions": exceptions, "limits": limits, "prose": prose, "manifest": manifest, "plans": plans, "problems": problems}


def inspect(root, day=None):
    """Every check over the tree at `root` on `day` (today when not given),
    without printing anything: the findings left after the exceptions, the
    warnings, the counts and how many checks ran."""
    day = day or today()
    reader = TreeReader(root)
    data = load(root, reader)
    documents, exceptions, limits, plans = data["documents"], data["exceptions"], data["limits"], data["plans"]
    findings = [finding(KIND_DATA, p, "", p) for p in data["problems"]]
    for e in exceptions:
        if not e["motive"]:
            findings.append(finding(KIND_DATA, e["value"], "exceptions.txt:%d" % e["line"], "la excepcion '%s %s' no lleva su motivo escrito al lado" % (e["keyword"], e["value"])))
    live, archives = values_of(documents, "live"), values_of(documents, "closed")
    # A plan is a living document by definition: declared once, under 'axis'.
    live += [p["file"] for p in plans if p["file"] not in live]
    extensions, generated = values_of(documents, "extension"), values_of(documents, "generated")
    startup, timeless = values_of(documents, "startup"), values_of(documents, "timeless")
    declared = live + archives
    adapters = [{"file": value.split()[0], "native": value.split()[1:]} for value in values_of(documents, ADAPTER_KEY)]
    for path in declared + startup + timeless + [p["file"] for p in plans] + [a["file"] for a in adapters]:
        if not os.path.isfile(os.path.join(root, path)):
            findings.append(finding(KIND_DATA, path, "documents.txt", "el documento declarado '%s' no existe" % path))
    listing = tree_listing(root, generated)
    findings += listing["findings"]
    tree = index_tree(listing["files"], listing["dirs"], generated)
    known, markdown, sources = tree["known"], tree["markdown"], tree["sources"]
    texts, citations, links = {}, [], []
    for doc in live:
        texts[doc] = reader.text(doc)
        citations += [{"value": s["value"], "line": s["line"], "doc": doc, "dir": os.path.dirname(doc)} for s in inline_code(texts[doc])]
        links += [{"value": s["value"], "line": s["line"], "doc": doc, "dir": os.path.dirname(doc)} for s in markdown_links(texts[doc])]
    # What only the template has is material for instances, not documents of
    # this tree: it asks for no home. Its markdown quotes the engine, though,
    # so its quoted citations are checked; its links are not, because a
    # layer's files resolve them in the instance they go to.
    template_only = data["manifest"]["template"]
    for doc in [m for m in markdown if under_any(m, template_only)]:
        citations += [{"value": s["value"], "line": s["line"], "doc": doc, "dir": os.path.dirname(doc)} for s in inline_code(reader.text(doc))]
    skill_dirs = values_of(documents, SKILLS_KEY)
    skills = read_skills(skill_dirs, listing["files"], reader)
    citations += skills["citations"]
    links += skills["links"]
    timeless_texts = {doc: reader.text(doc) for doc in timeless}
    code_rules = []
    for value in values_of(documents, "code"):
        parts = value.split(" ", 1)
        if len(parts) == 2:
            code_rules.append((parts[0], parts[1].strip()))
    code_citations = []
    for path in sources:
        for ext, prefix in code_rules:
            if path.endswith(ext):
                for s in inline_code(comments_only(reader.code(path), prefix)):
                    if is_slug_citation(s["value"]):
                        code_citations.append({"value": s["value"], "line": s["line"], "doc": path, "dir": os.path.dirname(path)})
    dirs = dirs_of(documents)
    records = load_dirs(root, dirs, reader)
    groups = list(records.values())
    record_ids, record_files, identity_citations = [], [], []
    for group in groups:
        for record in group["records"]:
            record_ids.append(record["id"])
            record_files.append(record["file"])
            gov = group["kind"] == "lesson" or (group["kind"] == "decision" and governs(record))
            for s in inline_code(record["body"]):
                c = {"value": s["value"], "line": s["line"] + record["body_line"] - 1, "doc": record["file"], "dir": os.path.dirname(record["file"])}
                if gov:
                    citations.append(c)
                elif is_slug_citation(s["value"]):
                    identity_citations.append(c)
            if gov:
                links += [{"value": s["value"], "line": s["line"] + record["body_line"] - 1, "doc": record["file"], "dir": os.path.dirname(record["file"])}
                          for s in markdown_links(record["body"])]
    known_phases = []
    for plan in plans:
        known_phases += [h["id"] for h in phase_headers(plan["text"], [plan["axis"]])]
    gates = read_gate_rows(root, reader)
    findings += gates["findings"]
    records_by_id = {record["id"]: {"kind": group["kind"], "fields": record["fields"]} for group in groups for record in group["records"]}
    timeless_citations = [{"value": s["value"], "line": s["line"], "doc": doc} for doc in timeless for s in inline_code(timeless_texts[doc])]
    contract = texts.get(CONTRACT, "")
    prose = data["prose"]

    def under(text, heading):
        """The lines of a section the board reads by name, or none when
        prose.txt does not name it: an empty heading would match any."""
        return section(text, heading) if heading else []

    def sections_read(text, key, doc):
        return read_sections_exist(text, [prose[key]], doc) if prose[key] else []

    authority_rows = table_rows(under(contract, prose["authority"]))

    def order_of_every_plan():
        found = []
        for plan in plans:
            found += order_and_headers_agree(phase_headers(plan["text"], [plan["axis"]]), order_lines(plan["text"], [plan["axis"]]), plan["file"], [plan["axis"]])
        return found

    def closed_sections():
        found = []
        for plan in plans:
            sections = []
            for header in phase_headers(plan["text"], [plan["axis"]]):
                if header["marker"] == DONE:
                    sections.append({"id": header["id"], "line": header["line"], "bullets": bullets(section(plan["text"], header["value"][3:]))})
            found += closed_sections_are_tombstones(sections, archives, plan["file"])
        return found

    def cap(name):
        values = values_of(limits, name)
        if len(values) != 1 or not values[0].isdigit():
            return None
        return int(values[0])

    def capped(name):
        value = cap(name)
        if value is None:
            return None, [finding(KIND_DATA, name, "limits.txt", "limits.txt tiene que declarar exactamente un tope '%s' y ser un numero" % name)]
        return value, []

    def reading_caps():
        """What a session reads: the startup reading, always, and the main
        indexes and the `none` one, whenever it consults the registry."""
        value, found = capped(STARTUP_LIMIT)
        if value is not None and not startup:
            found.append(finding(KIND_DATA, STARTUP_LIMIT, "documents.txt", "documents.txt no declara ninguna lectura de arranque (`startup`)"))
        elif value is not None:
            found += startup_reading_within({doc: len(reader.text(doc).encode("utf-8")) for doc in startup}, value, "limits.txt")
        value, missing = capped(INDEX_LIMIT)
        found += missing
        if value is not None:
            consulted = {e["file"]: len(stamp(e["template"], day).encode("utf-8")) for e in derived if e["file"] in CAPPED_INDEXES}
            found += indexes_within(consulted, value, INDEX_LIMIT)
        return found

    def record_caps():
        found = []
        for name, judge in ((IDENTITY_LIMIT, record_ids_within), (LINE_LIMIT, record_lines_within)):
            value, missing = capped(name)
            found += missing if value is None else judge(groups, value, name)
        return found

    model = build_model(plans, records, parse_verdict(reader.text(VERDICT_FILE)))
    derived = derived_of(model, dirs) if model["phases"] else []
    derived_paths = [e["file"] for e in derived] or [SUMMARY_FILE, DECISIONS_INDEX_FILE, NOTES_INDEX_FILE]

    def adapters_check():
        """Each adapter on its own: what it lists, read by its kind, plus what
        its tool reads by itself, is the startup reading, within its cap."""
        found, limit = [], cap(STARTUP_LIMIT)
        for adapter in adapters:
            file = adapter["file"]
            if not os.path.isfile(os.path.join(root, file)):
                continue
            text = reader.text(file)
            read = adapter_reads(file, text)
            if read["problem"]:
                found.append(finding(KIND_DATA, file, file, read["problem"]))
                continue
            found += adapter_reaches_startup(file, read["listed"], adapter["native"], startup)
            if limit is not None:
                sizes = {path: len(reader.text(path).encode("utf-8")) for path in read["listed"] + adapter["native"] if path in startup}
                if file.endswith(".md"):
                    sizes[file] = len(text.encode("utf-8"))
                found += adapter_reading_within(file, sizes, limit)
        return found

    def skills_check():
        """The skills directories, their skills and the contract's index of
        them, read under the heading that prose.txt declares."""
        if not skill_dirs:
            return []
        if len(prose[SKILLS_KEY]) != 1:
            return [finding(KIND_DATA, SKILLS_KEY, PROSE_FILE, "documents.txt declara skills y %s tiene que declarar exactamente una '%s',"
                            " la cabecera del indice de skills del contrato, y declara %d" % (PROSE_FILE, SKILLS_KEY, len(prose[SKILLS_KEY])))]
        heading = prose[SKILLS_KEY][0]
        found = read_sections_exist(contract, [heading], CONTRACT)
        # The index is the section's bullets: its prose may show the shape of a path.
        spans = [s["value"] for b in bullets(section(contract, heading)) for s in inline_code(b["value"])]
        for directory in skill_dirs:
            if not os.path.isdir(os.path.join(root, directory)):
                found.append(finding(KIND_DATA, directory, "documents.txt", "el directorio de skills declarado '%s' no existe" % directory))
                continue
            indexed = [v for v in spans if v.startswith(directory + "/") and v.endswith("/" + SKILL_FILE)]
            found += skills_are_well_formed(directory, skills["folders"][directory], skills["texts"][directory], indexed)
        return found

    def engine_unchanged():
        found = []
        for path, _ in data["manifest"]["engine"]:
            raw = reader.raw(path)
            found.append((path, None if raw is None else engine_hash(raw)))
        return engine_files_are_unchanged(data["manifest"]["engine"], dict(found))

    def executable_hooks():
        """Only where git listed the tree: without a .git there is no index,
        and a git that failed is already a finding."""
        if listing["source"] != GIT_SOURCE:
            return []
        try:
            return hooks_are_executable(git_modes(root))
        except TreeListError as error:
            return [finding(KIND_DATA, HOOKS_DIR, HOOKS_DIR, "los modos de %s no se pudieron leer con git (%s)" % (HOOKS_DIR, error))]

    def derived_current():
        if not model["phases"]:
            return [finding(KIND_DERIVED, "axis", "documents.txt", "cero cabeceras de fase: sin plan no se puede juzgar si los derivados estan al dia")]
        stored = [{"file": e["file"], "template": e["template"], "stored": reader.text(e["file"])} for e in derived]
        return derived_files_are_current(stored, day) + stray_index_files(listing["files"], derived_paths)

    rows = [
        ("citations", lambda: cited_files_exist(citations, extensions, known, generated) + linked_files_exist(links, tree["paths"], generated)),
        ("order", order_of_every_plan),
        ("title", lambda: [f for doc in live for f in document_opens_with_its_title(texts[doc], doc)]),
        ("records", lambda: records_are_well_formed(groups, known_phases)),
        ("unique ids", lambda: record_ids_are_unique(groups)),
        ("id citations", lambda: slug_citations_resolve(citations + identity_citations + code_citations, record_ids)),
        ("read sections", lambda: sections_read(contract, "authority", CONTRACT)
            + sections_read(texts.get(BOARD_README, ""), "checklist", BOARD_README)
            + sections_read(texts.get(REGISTRY_README, ""), "fields", REGISTRY_README)),
        ("declared authority", lambda: authority_rows_are_declared(authority_rows, declared, extensions, CONTRACT)),
        ("current derivatives", derived_current),
        ("harness guards", lambda: harnesses_carry_every_guard(
            [{"label": g["label"], "harness": g["harness"], "line": g["line"], "named": {p: reader.unjudged(p) for p in named_files(g["raw"], set(listing["files"]))}}
             for g in gates["rows"]], gates["guards"])),
        ("skills", skills_check),
        ("executable hooks", executable_hooks),
        ("engine", engine_unchanged),
        ("tombstones", closed_sections),
        ("reading caps", reading_caps),
        ("adapters", adapters_check),
        ("timeless", lambda: documents_are_timeless(timeless_texts)),
        ("record caps", record_caps),
        # A markdown file in the index directory is a derivative: current or stray, the row above judges it.
        ("markdown home", lambda: markdown_files_are_declared([m for m in markdown if not is_index_file(m) and not under_any(m, template_only)],
                                                              declared + record_files + derived_paths + [a["file"] for a in adapters] + [p["file"] for p in plans] + skills["markdown"])),
        ("documented schema", lambda: schema_is_documented(table_rows(under(texts.get(REGISTRY_README, ""), prose["fields"])), all_fields(), STATES, REGISTRY_README)
            if prose["fields"] else []),
        ("body without state", lambda: record_bodies_declare_no_state(groups, prose["state_words"])),
        ("timeless rests on settled", lambda: timeless_cites_only_settled(timeless_citations, records_by_id)),
        ("merged contract", lambda: contract_is_merged(contract, prose[PENDING_KEY], CONTRACT) if prose[PENDING_KEY] else []),
    ]
    total = len(rows) + 1
    rows.append(("numbered readme", lambda: numbered_list_matches(under(texts.get(BOARD_README, ""), prose["checklist"]), total, BOARD_README)
                 if prose["checklist"] else []))
    for _, run in rows:
        findings += run()
    # Reads happen inside the rows too (the adapter, the derivatives), so what the
    # reader found is gathered after every row ran.
    findings += reader.findings
    return {
        "findings": apply_exceptions(findings, exceptions),
        "warnings": list(reader.warnings),
        "rows": len(rows),
        "stats": {"live": len(live), "known": len(known), "citations": len(citations), "links": len(links), "plans": len(plans),
                  "records": count_records(records), "by_kind": ", ".join("%d %s" % (len(records[k]["records"]), k) for k in DIR_KEYS),
                  "exceptions": len(exceptions), "files": len(listing["files"]), "source": listing["source"]},
    }


def check(root):
    print("=== VALIDADOR DEL TABLERO ===")
    result = inspect(root)
    stats = result["stats"]
    print("documentos vivos: %d | rutas del arbol: %d | fragmentos entre comillas: %d | enlaces: %d | planes: %d" % (stats["live"], stats["known"], stats["citations"], stats["links"], stats["plans"]))
    print("registros: %d (%s) | excepciones: %d | arbol: %d ficheros, por %s" % (stats["records"], stats["by_kind"], stats["exceptions"], stats["files"], stats["source"]))
    for warning in result["warnings"]:
        print("WARNING: " + warning)
    for f in result["findings"]:
        print("[%-8s] %-28s %s" % (f["kind"], f["where"], f["message"]))
    print("RESULT: %d comprobaciones, %d hallazgos" % (result["rows"], len(result["findings"])))
    return 1 if result["findings"] else 0


def build(root):
    """Rewrites the derivatives that do not say what the sources say. One that
    a hand edited (see derived_state), or that some tool wrote with a BOM or
    another encoding, is restored, with its own date when it is trustworthy,
    and the gate goes red once, so the edit is seen instead of vanishing."""
    print("=== TABLERO ===")
    reader = TreeReader(root)
    data = load(root, reader)
    for problem in data["problems"]:
        print("  WARNING: " + problem)
    if not data["plans"]:
        print("RESULT: documents.txt no declara ningun plan")
        return 1
    dirs = dirs_of(data["documents"])
    records = load_dirs(root, dirs, reader)
    unread = [problem for group in records.values() if not group["read"] for problem in group["problems"]]
    if unread:
        # Indexes rendered without a whole group of records would empty or delete
        # what that group still holds: nothing is written until it can be read.
        print("RESULT: BOARD_RED, %s: los derivados no se reescriben ni se borran sin todos sus registros" % "; ".join(unread))
        return 1
    for group in records.values():
        for problem in group["problems"]:
            print("  WARNING: " + problem)
    model = build_model(data["plans"], records, parse_verdict(reader.text(VERDICT_FILE)))
    if not model["phases"]:
        print("RESULT: cero cabeceras de fase; el tablero no pinta un plan vacio")
        return 1
    day, written, restored, entries = today(), [], [], derived_of(model, dirs)
    for entry in entries:
        stored = reader.text(entry["file"])
        judged = derived_state(stored, entry["template"], day)
        clean = reader.encoding_is_clean(entry["file"])
        if judged["state"] == DERIVED_CURRENT and clean:
            continue
        try:
            write_atomically(os.path.join(root, entry["file"]), stamp(entry["template"], judged["date"]))
        except OSError as error:
            print("RESULT: no se pudo escribir %s: %s" % (entry["file"], error))
            return 1
        written.append(entry["file"])
        # Only an edited derivative has a 'why'; one in a dirty encoding was saved
        # by some tool, which is an edit all the same.
        touched = judged["why"] or ("" if clean else "no estaba en UTF-8 sin BOM")
        if touched:
            restored.append("%s (%s)" % (entry["file"], touched))
    removed, kept = [], []
    for path in stray_index_paths(root, [entry["file"] for entry in entries]):
        # Only what carries the board's fingerprint was written by the board.
        if STAMP_MARK not in reader.text(path):
            kept.append(path)
            continue
        try:
            os.remove(os.path.join(root, path))
        except OSError as error:
            print("RESULT: no se pudo borrar %s: %s" % (path, error))
            return 1
        removed.append(path)
    for f in reader.findings:
        print("  WARNING: " + f["message"])
    print("fases: %d | frentes: %d | deudas: %d | registros: %d | puertas en el veredicto: %d" % (len(model["phases"]), len(model["fronts"]), len(model["debts"]), count_records(records), len(model["gates"]["rows"])))
    said = []
    if restored:
        said.append("restaurado %s: lo editaron a mano; un derivado se regenera, no se edita" % ", ".join(restored))
    if kept:
        said.append("%s no lleva la huella del tablero y no se borra: el directorio de indices es del tablero, sacalo de ahi" % ", ".join(kept))
    if said:
        print("RESULT: BOARD_RED, %s; esta corrida sale roja para que se vea" % "; ".join(said))
        return 1
    done = ["reescrito " + ", ".join(written)] if written else []
    done += ["borrado " + ", ".join(removed)] if removed else []
    print("RESULT: BOARD_OK, %s" % ("; ".join(done) or "sin cambios"))
    return 0


def index_paths(root):
    """The markdown files of the index directory, as paths from the root."""
    folder = os.path.join(root, *INDEX_DIR.split("/"))
    if not os.path.isdir(folder):
        return []
    return sorted(INDEX_DIR + "/" + name for name in os.listdir(folder) if name.endswith(".md") and os.path.isfile(os.path.join(folder, name)))


def stray_index_paths(root, derived_paths):
    """The markdown files of the index directory that no source generates."""
    wanted = set(derived_paths)
    return [path for path in index_paths(root) if path not in wanted]


def utf8_console():
    """Findings quote the documents, and a Windows console may not be UTF-8:
    a quoted '✔' must never turn a red check into a crash."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def seal(root):
    """Rewrites the sha256 of every engine row of MANIFEST.txt with the content
    the engine has now. Only in the template: in a copy, a local change to the
    engine is declared as an exception, never blessed."""
    print("=== SELLO DEL MOTOR ===")
    reader = TreeReader(root)
    manifest = load(root, reader)["manifest"]
    if not is_template(manifest):
        print("RESULT: esto no es la plantilla (su %s no declara ninguna fila '%s'): un cambio local del motor se declara en exceptions.txt"
              " (`%s <ruta>`), no se sella" % (MANIFEST_FILE, TEMPLATE_KEY, KIND_ENGINE))
        return 1
    rel = BOARD_DIR + "/" + MANIFEST_FILE
    lines, changed = reader.text(rel).split("\n"), []
    for at, line in enumerate(lines):
        parts = line.split()
        if len(parts) != 3 or parts[0] != ENGINE_KEY:
            continue
        raw = reader.raw(parts[1])
        if raw is None:
            print("RESULT: %s declara '%s' y no existe: nada se sella" % (MANIFEST_FILE, parts[1]))
            return 1
        if engine_hash(raw) != parts[2]:
            lines[at] = "%s %s %s" % (ENGINE_KEY, parts[1], engine_hash(raw))
            changed.append(parts[1])
    if changed:
        write_atomically(os.path.join(root, *rel.split("/")), "\n".join(lines))
    print("RESULT: sellado %s" % (", ".join(changed) or "nada: el motor ya estaba sellado"))
    return 0


COMMANDS = {"check": check, "build": build, "seal": seal}


def main_on(argv, root):
    if len(argv) != 1 or argv[0] not in COMMANDS:
        print("uso: board.py check | build | seal")
        return 2
    utf8_console()
    return COMMANDS[argv[0]](root)


def main(argv):
    return main_on(argv, ROOT)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
