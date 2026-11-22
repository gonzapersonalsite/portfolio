#!/usr/bin/env sh
# Unified project host launcher (POSIX sh: Linux, macOS, Git Bash).
# Shares contract, identities, barrier semantics, and exit codes with dev.ps1.
set -efu
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

EXIT_OK=0
EXIT_RED=1
EXIT_REFUSED=2
EXIT_BUSY=3
EXIT_INTERRUPTED=130
EXIT_PREPUSH_SKIP=20

LAUNCHER_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
# Git for Windows and PowerShell must contend for the same Windows file lock.
case "$(uname -s):${1:-}" in
  *:pre-push|*:check-commit-msg) ;;
  MINGW*|MSYS*|CYGWIN*)
    exec powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass \
      -File "$(cygpath -aw "$LAUNCHER_DIR/dev.ps1")" "$@" ;;
esac
ROOT_POSIX="$(CDPATH= cd -- "$LAUNCHER_DIR/../.." && pwd -P)"
if ROOT_WIN="$(CDPATH= cd -- "$ROOT_POSIX" && pwd -W 2>/dev/null)" && [ -n "$ROOT_WIN" ]; then
  ROOT_CANON="$(printf '%s' "$ROOT_WIN" | sed 's|\\|/|g' | tr '[:upper:]' '[:lower:]')"
  ROOT_HOST="$ROOT_WIN"
else
  ROOT_CANON="$ROOT_POSIX"
  ROOT_HOST="$ROOT_POSIX"
fi

sha256_str() {
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$1" | sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | awk '{print $1}'
  else
    printf '%s' "$1" | openssl dgst -sha256 | awk '{print $NF}'
  fi
}

new_run_id() {
  if [ -r /dev/urandom ]; then
    od -An -tx1 -N8 /dev/urandom | tr -d ' \n\r'
  else
    printf '%s-%s' "$$" "$(date +%s)" | sha256sum | cut -c1-16
  fi
}

CHECKOUT_ID="$(sha256_str "$ROOT_CANON" | cut -c1-12)"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) TPL_UID=1000; TPL_GID=1000 ;;
  *) TPL_UID="$(id -u)"; TPL_GID="$(id -g)" ;;
esac
case "$TPL_UID" in ''|*[!0-9]*) echo "REFUSED: Invalid host UID." >&2; exit 2 ;; esac
case "$TPL_GID" in ''|*[!0-9]*) echo "REFUSED: Invalid host GID." >&2; exit 2 ;; esac
[ "$TPL_UID" != 0 ] || TPL_UID=1000
[ "$TPL_GID" != 0 ] || TPL_GID=1000
TPL_USER="$TPL_UID:$TPL_GID"
export TPL_UID TPL_GID TPL_USER
RUNTIME_DIR="$ROOT_POSIX/.dev-runtime"
LOCK_FILE="$RUNTIME_DIR/checkout.lock"
BARRIER_FILE="$RUNTIME_DIR/barrier.json"
DEMO_FILE="$RUNTIME_DIR/demo.json"

HAS_SCAFFOLD="false"
SCAFFOLD_COMPOSE_REL=""
SCAFFOLD_SERVICE=""
SCAFFOLD_IMAGE=""
if [ -f "$ROOT_POSIX/tools/board/scaffold.json" ]; then
  HAS_SCAFFOLD="true"
  SCAFFOLD_COMPOSE_REL="$(sed -n 's/.*"composeFile"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_POSIX/tools/board/scaffold.json" | head -n 1)"
  SCAFFOLD_SERVICE="$(sed -n 's/.*"service"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_POSIX/tools/board/scaffold.json" | head -n 1)"
  image_base="$(sed -n 's/.*"image"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_POSIX/tools/board/scaffold.json" | head -n 1)"
  SCAFFOLD_IMAGE="$image_base-$CHECKOUT_ID"
  export TPL_SCAFFOLD_IMAGE="$SCAFFOLD_IMAGE"
fi

HAS_STACK="false"
STACK_ID=""
STACK_COMPOSE_REL="compose.yaml"
STACK_SUBDIR=""
STACK_VOLUMES=""
STACK_VERIFY=""
STACK_EXTRAS=""
DEMO_PROFILE=""
DEMO_SERVICE=""
DEMO_CPORT=""
DEMO_HPORT=""
DEMO_ROW=""
PREVIEW_ROW=""

if [ "${1:-}" != check-commit-msg ] && [ "${1:-}" != pre-push ] && [ -f "$ROOT_POSIX/tools/stack.txt" ]; then
  HAS_STACK="true"
  while IFS= read -r raw || [ -n "$raw" ]; do
    line="$(printf '%s' "$raw" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    case "$line" in
      ""|\#*) continue ;;
      stack\ *) STACK_ID="${line#stack }" ;;
      compose\ *) STACK_COMPOSE_REL="${line#compose }" ;;
      subdir\ *)
        sub="${line#subdir }"
        [ "$sub" = "-" ] || STACK_SUBDIR="$sub"
        ;;
      volume\ *) STACK_VOLUMES="$STACK_VOLUMES ${line#volume }" ;;
      extra\ *) STACK_EXTRAS="$STACK_EXTRAS ${line#extra }" ;;
      verify\ *) STACK_VERIFY="$(printf '%s' "${line#verify }" | sed 's/|/ /g')" ;;
      demo\ *) DEMO_ROW="${line#demo }" ;;
      preview\ *) PREVIEW_ROW="${line#preview }" ;;
    esac
  done < "$ROOT_POSIX/tools/stack.txt"
fi

if [ -n "$STACK_SUBDIR" ]; then
  WORK_POSIX="$ROOT_POSIX/$STACK_SUBDIR"
  WORK_HOST="$ROOT_HOST/$STACK_SUBDIR"
else
  WORK_POSIX="$ROOT_POSIX"
  WORK_HOST="$ROOT_HOST"
fi
STACK_COMPOSE_POSIX="$WORK_POSIX/$STACK_COMPOSE_REL"
STACK_COMPOSE_HOST="$WORK_HOST/$STACK_COMPOSE_REL"
SCAFFOLD_COMPOSE_POSIX="$ROOT_POSIX/$SCAFFOLD_COMPOSE_REL"
SCAFFOLD_COMPOSE_HOST="$ROOT_HOST/$SCAFFOLD_COMPOSE_REL"

if [ $# -lt 1 ]; then
  echo "Usage: ./dev <prepare|verify|build|start|stop|status>"
  exit "$EXIT_REFUSED"
fi

CMD="$1"
shift

DOCKER_BIN="$(command -v docker || true)"
CHILD_PID=""
INTERRUPTED=false
on_signal() {
    INTERRUPTED=true
    if [ -n "$CHILD_PID" ]; then kill -TERM "$CHILD_PID" 2>/dev/null || true; fi
}
trap on_signal INT TERM HUP

# A watchdog uses only POSIX utilities, including on hosts without GNU timeout.
run_timed() {
    [ "$INTERRUPTED" = false ] || [ "${CLEANING:-false}" = true ] || return 130
    timed_budget="$1"; shift
    timed_dir="$(mktemp -d)" || return 2
    "$@" <&0 &
    CHILD_PID=$!
    (
        trap 'kill "${sleeper:-}" 2>/dev/null || true; exit 0' TERM
        sleep "$timed_budget" & sleeper=$!
        wait "$sleeper" || exit 0
        : > "$timed_dir/expired"
        kill -TERM "$CHILD_PID" 2>/dev/null || exit 0
        sleep 2 & sleeper=$!
        wait "$sleeper" || exit 0
        kill -KILL "$CHILD_PID" 2>/dev/null || true
    ) </dev/null >/dev/null 2>&1 &
    timed_watch=$!
    timed_code=0
    wait "$CHILD_PID" || timed_code=$?
    if [ "$INTERRUPTED" = true ] && [ "${CLEANING:-false}" != true ]; then
        kill -KILL "$CHILD_PID" 2>/dev/null || true
        wait "$CHILD_PID" 2>/dev/null || true
        timed_code=130
    fi
    CHILD_PID=""
    kill -TERM "$timed_watch" 2>/dev/null || true
    wait "$timed_watch" 2>/dev/null || true
    if [ -f "$timed_dir/expired" ]; then timed_code=124; rm "$timed_dir/expired"; fi
    rmdir "$timed_dir"
    return "$timed_code"
}
docker() { run_timed 30 "$DOCKER_BIN" "$@"; }

select_engine() {
    [ -n "$DOCKER_BIN" ] || return 2
    if [ -z "${DOCKER_HOST:-}" ] && [ -z "${DOCKER_CONTEXT:-}" ]; then
        DOCKER_CONTEXT="$(docker context show)" && [ -n "$DOCKER_CONTEXT" ] || return 2
        export DOCKER_CONTEXT
    fi
    ENGINE_ID="$(docker info --format '{{.ID}}')" || return 2
    case "$ENGINE_ID" in ''|*[!a-zA-Z0-9:-]*) return 2 ;; esac
}

json_field() {
    sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1
}
require_images() (
  images="$(docker "$@")" && [ -n "$images" ] || { echo "REFUSED: Cannot resolve required images." >&2; return 2; }
  for image in $images; do
    docker image inspect --format '{{.Id}}' "$image" >/dev/null || { echo "REFUSED: Missing local image $image. Run prepare." >&2; return 2; }
  done
)
demo_status() {
    [ -f "$DEMO_FILE" ] || { echo stopped; return; }
    [ "$(json_field "$DEMO_FILE" engineId)" = "$ENGINE_ID" ] &&
        [ "$(json_field "$DEMO_FILE" checkoutId)" = "$CHECKOUT_ID" ] || { echo indeterminate; return; }
    ds_svc="$(json_field "$DEMO_FILE" service)"
    case "$ds_svc" in ''|*[!a-zA-Z0-9_-]*) echo indeterminate; return ;; esac
    ds_id="$(docker ps -a -q --filter "label=com.docker.compose.project=tpl-$CHECKOUT_ID-demo" --filter "label=com.docker.compose.service=$ds_svc")" || { echo indeterminate; return; }
    if [ -z "$ds_id" ]; then
        if [ "$(json_field "$DEMO_FILE" state)" = running ]; then echo stopped; else echo indeterminate; fi
        return
    fi
    case "$ds_id" in *[!a-f0-9]*) echo indeterminate; return ;; esac
    ds_state="$(docker inspect --format '{{if .State.Running}}{{if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}{{else}}stopped{{end}}' "$ds_id")" || { echo indeterminate; return; }
    case "$ds_state" in healthy) echo running ;; running|starting|unhealthy|stopped) echo "$ds_state";; *) echo indeterminate ;; esac
}

if [ "$CMD" = "status" ]; then
  if [ "$HAS_STACK" = "true" ] && [ "$HAS_SCAFFOLD" = "true" ]; then
    MODE="combined ($STACK_ID+scaffold)"
  elif [ "$HAS_STACK" = "true" ]; then
    MODE="stack ($STACK_ID)"
  elif [ "$HAS_SCAFFOLD" = "true" ]; then
    MODE="scaffold"
  else
    MODE="unconfigured"
  fi
  echo "checkoutId=$CHECKOUT_ID"
  echo "mode=$MODE"
  echo "root=$ROOT_HOST"
  if [ -f "$BARRIER_FILE" ]; then echo "barrier=PRESENT ($BARRIER_FILE)"; else echo "barrier=clear"; fi
  if [ -f "$DEMO_FILE" ]; then
    select_engine || { echo "demo=indeterminate"; exit "$EXIT_REFUSED"; }
    state="$(demo_status)"
    if [ "$state" = running ]; then echo "demo=running url=$(json_field "$DEMO_FILE" url)"; else echo "demo=$state"; fi
    [ "$state" != indeterminate ] || exit "$EXIT_REFUSED"
  else echo "demo=stopped"; fi
  exit "$EXIT_OK"
fi

if [ -z "$DOCKER_BIN" ]; then
  echo "REFUSED: 'docker' CLI not found on PATH." >&2
  exit "$EXIT_REFUSED"
fi
# A commit message invokes just one Docker client. Its exit code is the check.
# All multi-command operations pin their context before inspecting the daemon.
if [ "$CMD" != check-commit-msg ]; then
  select_engine || { echo "REFUSED: Docker daemon not ready." >&2; exit 2; }
  docker compose version --short >/dev/null 2>&1 || { echo "REFUSED: Docker Compose plugin unavailable." >&2; exit 2; }
fi

# Hook command: commit-msg (no checkout build lock needed; read-only tools/board mount)
if [ "$CMD" = "check-commit-msg" ]; then
  if [ "$HAS_SCAFFOLD" != "true" ]; then
    echo "REFUSED: check-commit-msg requires scaffold." >&2
    exit "$EXIT_REFUSED"
  fi
  DISPLAY_PATH="${1:-stdin}"
  docker run --pull never --rm -i --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user "$TPL_USER" \
    -v "$ROOT_HOST/tools/board:/workspace/tools/board:ro" -w /workspace \
    -e PYTHONDONTWRITEBYTECODE=1 -e PYTHONUTF8=1 \
    "$SCAFFOLD_IMAGE" python3 tools/board/commit_message.py - "$DISPLAY_PATH"
  exit $?
fi

# Hook command: pre-push (host Git governs HEAD/refs/status; container judges; calls `./dev verify`)
if [ "$CMD" = "pre-push" ]; then
  if [ "$HAS_SCAFFOLD" != "true" ]; then
    echo "REFUSED: pre-push requires scaffold." >&2
    exit "$EXIT_REFUSED"
  fi
  SNAP_DIR="$(mktemp -d)"
  trap 'rm -rf "$SNAP_DIR"' EXIT
  if SNAP_W="$(CDPATH= cd -- "$SNAP_DIR" && pwd -W 2>/dev/null)" && [ -n "$SNAP_W" ]; then
    SNAP_HOST="$SNAP_W"
  else
    SNAP_HOST="$SNAP_DIR"
  fi
  cat > "$SNAP_DIR/refs.txt"

  run_snapshot() {
    SNAP_MODE="$1"
    EXTRA_CODE="${2:-0}"
    if env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_COMMON_DIR -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES -u GIT_NAMESPACE \
         git -C "$ROOT_HOST" rev-parse --verify -q HEAD > "$SNAP_DIR/head.txt" 2>"$SNAP_DIR/head.err"; then
      printf '0\n' > "$SNAP_DIR/head_rc.txt"
    else
      printf '1\n' > "$SNAP_DIR/head_rc.txt"
      : > "$SNAP_DIR/head.txt"
    fi
    if env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_COMMON_DIR -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES -u GIT_NAMESPACE \
         git -C "$ROOT_HOST" status --porcelain=v1 -z --untracked-files=all > "$SNAP_DIR/status.z" 2>"$SNAP_DIR/status.err"; then
      printf '0\n' > "$SNAP_DIR/status_rc.txt"
    else
      printf '1\n' > "$SNAP_DIR/status_rc.txt"
    fi
    : > "$SNAP_DIR/commits.txt"
    while IFS= read -r rline || [ -n "$rline" ]; do
      set -- $rline
      if [ $# -eq 4 ]; then
        rsha="$2"
        rcmt="$(env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_COMMON_DIR -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES -u GIT_NAMESPACE \
                  git -C "$ROOT_HOST" rev-parse --verify -q "${rsha}^{commit}" 2>/dev/null || true)"
        printf '%s=%s\n' "$rsha" "$rcmt" >> "$SNAP_DIR/commits.txt"
      fi
    done < "$SNAP_DIR/refs.txt"
    docker run --pull never --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user "$TPL_USER" \
      -v "$ROOT_HOST:/workspace:ro" -v "$SNAP_HOST:/snap:ro" -w /workspace \
      -e PYTHONDONTWRITEBYTECODE=1 -e PYTHONUTF8=1 \
      "$SCAFFOLD_IMAGE" python3 -c '
import json, pathlib, subprocess, sys
s = pathlib.Path("/snap")
commit_of = {}
for row in (s / "commits.txt").read_text("utf-8", "replace").splitlines():
    if "=" in row:
        k, v = row.split("=", 1)
        commit_of[k] = v
snap = {
    "refs_stdin": (s / "refs.txt").read_bytes().decode("utf-8", "replace"),
    "head": (s / "head.txt").read_text("utf-8", "replace").strip(),
    "head_code": int((s / "head_rc.txt").read_text("utf-8").strip()),
    "head_err": (s / "head.err").read_text("utf-8", "replace").strip(),
    "status_code": int((s / "status_rc.txt").read_text("utf-8").strip()),
    "status_out": (s / "status.z").read_bytes().decode("utf-8", "replace"),
    "status_err": (s / "status.err").read_text("utf-8", "replace").strip(),
    "commit_of": commit_of,
}
mode = sys.argv[1]
if mode == "refused":
    args = [sys.executable, "tools/board/pre_push.py", "--refused-why", sys.argv[2]]
else:
    args = [sys.executable, "tools/board/pre_push.py", "--check-snapshot", mode]
p = subprocess.run(args, input=json.dumps(snap).encode("utf-8"))
sys.exit(p.returncode)
' "$SNAP_MODE" "$EXTRA_CODE"
  }

  RC=0
  run_snapshot before || RC=$?
  if [ "$RC" -eq "$EXIT_PREPUSH_SKIP" ]; then
    exit 0
  elif [ "$RC" -ne 0 ]; then
    exit "$RC"
  fi

  VRC=0
  sh "$ROOT_POSIX/tools/launcher/dev.sh" verify || VRC=$?
  if [ "$VRC" -ne 0 ]; then
    run_snapshot refused "$VRC" || true
    exit "$VRC"
  fi

  run_snapshot after
  exit $?
fi

# Validate allowed lifecycle commands
IS_ALLOWED="false"
case "$CMD" in
  prepare|verify|build|start|stop) IS_ALLOWED="true" ;;
  *)
    for ex in $STACK_EXTRAS; do
      [ "$CMD" = "$ex" ] && IS_ALLOWED="true"
    done
    ;;
esac
if [ "$IS_ALLOWED" != "true" ]; then
  echo "REFUSED: Unknown command '$CMD'." >&2
  exit "$EXIT_REFUSED"
fi

if [ "$HAS_STACK" != "true" ] && [ "$HAS_SCAFFOLD" != "true" ]; then
  echo "REFUSED: Neither tools/stack.txt nor tools/board/scaffold.json exists." >&2
  exit "$EXIT_REFUSED"
fi

mkdir -p "$RUNTIME_DIR"
LOCK_KIND=""
if command -v flock >/dev/null 2>&1; then
  exec 9>>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "BUSY: Another operation holds checkout $CHECKOUT_ID ($LOCK_FILE)." >&2
    exit "$EXIT_BUSY"
  fi
  LOCK_KIND="flock"
else
  # Each contender owns a unique directory. A dead contender can therefore be
  # removed without ever unlinking a successor's lock (also when this host
  # has no flock). Order simultaneous tickets by their live PID.
  HOST_KEY="$(sha256_str "$(uname -n)" | cut -c1-12)"
  CLAIMS="$RUNTIME_DIR/checkout-claims"
  mkdir -p "$CLAIMS"
  OWNER="$(mktemp -d "$CLAIMS/$HOST_KEY-$$-XXXXXXXX")"
  cleanup_claim() { rm -f "$OWNER/ready" "$OWNER/writing" "$OWNER/process"; rmdir "$OWNER" 2>/dev/null || :; }
  trap cleanup_claim EXIT
  LC_ALL=C TZ=UTC0 ps -p "$$" -o lstart= > "$OWNER/process" || exit 2
  scan_claims() (
    set +f
    highest=0
    for claim in "$CLAIMS"/*; do
      [ -d "$claim" ] && [ "$claim" != "$OWNER" ] || continue
      short=${claim##*/}; other_host=${short%%-*}; rest=${short#*-}; pid=${rest%%-*}
      case "$pid" in ''|*[!0-9]*) return 3 ;; esac
      [ "$other_host" = "$HOST_KEY" ] || return 3
      if ! kill -0 "$pid" 2>/dev/null && ! ps -p "$pid" >/dev/null 2>&1; then
        rm -f "$claim/ready" "$claim/writing" "$claim/process"; rmdir "$claim" 2>/dev/null || :
        continue
      fi
      if [ -s "$claim/process" ] && [ "$(cat "$claim/process" 2>/dev/null)" != "$(LC_ALL=C TZ=UTC0 ps -p "$pid" -o lstart= 2>/dev/null)" ]; then
        rm -f "$claim/ready" "$claim/writing" "$claim/process"; rmdir "$claim" 2>/dev/null || :
        continue
      fi
      if [ "$1" = acquire ] && [ ! -f "$claim/ready" ]; then
        # A contender which was already choosing its number must publish first.
        # An unresponsive peer yields BUSY, without ever bypassing its claim.
        for retry in 1 2; do
          [ -d "$claim" ] && [ ! -f "$claim/ready" ] || break
          sleep 1
        done
      fi
      if [ ! -f "$claim/ready" ]; then
        [ "$1" = choose ] || [ ! -d "$claim" ] || return 3
        continue
      fi
      number="$(cat "$claim/ready" 2>/dev/null)" || continue
      case "$number" in ''|*[!0-9]*) return 3 ;; esac
      if [ "$1" = acquire ]; then
        if [ "$number" -lt "$TICKET" ] || { [ "$number" -eq "$TICKET" ] && [ "$pid" -lt "$$" ]; }; then return 3; fi
      elif [ "$number" -gt "$highest" ]; then highest=$number; fi
    done
    [ "$1" != choose ] || echo "$highest"
  )
  highest="$(scan_claims choose)" || { echo "BUSY: A foreign checkout claim is present." >&2; exit 3; }
  TICKET=$((highest + 1))
  printf '%s\n' "$TICKET" > "$OWNER/writing" && mv "$OWNER/writing" "$OWNER/ready"
  scan_claims acquire || { echo "BUSY: Another operation owns checkout $CHECKOUT_ID." >&2; exit 3; }
  LOCK_KIND=ticket
fi
git_scratch=''
cleanup_lock() {
    if [ "$LOCK_KIND" = ticket ]; then cleanup_claim; LOCK_KIND=""; fi
    if [ -n "$git_scratch" ]; then
        rm -f -- "$git_scratch/mounts" "$git_scratch/workspace.git" "$git_scratch/workspace.config" "$git_scratch/workspace.settings"
        rmdir -- "$git_scratch"
    fi
}
trap cleanup_lock EXIT

RUN_ID="$(new_run_id)"
EPH_PROJECT="tpl-${CHECKOUT_ID}-r-${RUN_ID}"
DEMO_PROJECT="tpl-${CHECKOUT_ID}-demo"
CREATE_CONFIRMED=true
REQUEST_TOKEN=""
REQUEST_SERVICES=""

export TPL_CHECKOUT_ID="$CHECKOUT_ID"
export TPL_ROOT="$ROOT_HOST"
export TPL_RUN_ID="$RUN_ID"
if [ "$ROOT_HOST" != "$ROOT_POSIX" ]; then export TPL_HOST_OS="windows"; else export TPL_HOST_OS="posix"; fi
if [ "$CMD" = "verify" ] && [ "$HAS_SCAFFOLD" = "true" ]; then export TPL_VERDICT_OWNER="scaffold"; else export TPL_VERDICT_OWNER="stack"; fi

for v in $STACK_VOLUMES; do
  full="tpl-${CHECKOUT_ID}-${v}"
  envk="TPL_VOL_$(printf '%s' "$v" | tr '[:lower:]-' '[:upper:]_')"
  docker volume create --label "tpl.checkout=$CHECKOUT_ID" --label "tpl.kind=cache" "$full" >/dev/null
  export "$envk=$full"
done

remove_project() (
  CLEANING=true
  proj="$1"
  if [ "$HAS_STACK" = "true" ] && [ -f "$STACK_COMPOSE_POSIX" ]; then
    docker compose -p "$proj" -f "$STACK_COMPOSE_HOST" down --remove-orphans --timeout 10 >/dev/null 2>&1 || true
  fi
  if [ "$HAS_SCAFFOLD" = "true" ] && [ -f "$SCAFFOLD_COMPOSE_POSIX" ]; then
    docker compose -p "$proj" -f "$SCAFFOLD_COMPOSE_HOST" down --remove-orphans --timeout 10 >/dev/null 2>&1 || true
  fi
  cids="$(docker ps -a -q --filter "label=com.docker.compose.project=$proj" 2>/dev/null || echo "__ERR__")"
  nids="$(docker network ls -q --filter "label=com.docker.compose.project=$proj" 2>/dev/null || echo "__ERR__")"
  if [ "$cids" = "__ERR__" ] || [ "$nids" = "__ERR__" ]; then return 1; fi
  for c in $cids; do docker rm -f "$c" >/dev/null 2>&1 || true; done
  for n in $nids; do docker network rm "$n" >/dev/null 2>&1 || true; done
  cids="$(docker ps -a -q --filter "label=com.docker.compose.project=$proj" 2>/dev/null || echo "__ERR__")"
  nids="$(docker network ls -q --filter "label=com.docker.compose.project=$proj" 2>/dev/null || echo "__ERR__")"
  [ "$cids" = "" ] && [ "$nids" = "" ]
)

if [ "$CMD" = "stop" ]; then
  if [ "$(demo_status)" = indeterminate ]; then echo "REFUSED: Demo state is indeterminate on this Docker engine." >&2; exit 2; fi
  if ! remove_project "$DEMO_PROJECT"; then
    echo "REFUSED: Could not confirm stop of $DEMO_PROJECT." >&2
    cleanup_lock
    exit "$EXIT_REFUSED"
  fi
  rm -f "$DEMO_FILE"
  echo "RESULT: demo stopped ($DEMO_PROJECT)"
  cleanup_lock
  exit "$EXIT_OK"
fi

json_escape() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}
write_barrier() {
    printf '{"schemaVersion":1,"checkoutId":"%s","checkoutPath":"%s","engineId":"%s","runId":"%s","action":"%s","ephemeralProject":"%s","stepToken":"%s","services":"%s","createConfirmed":%s}\n' \
        "$CHECKOUT_ID" "$(json_escape "$ROOT_HOST")" "$ENGINE_ID" "$RUN_ID" "$CMD" "$EPH_PROJECT" "$REQUEST_TOKEN" "$REQUEST_SERVICES" "$CREATE_CONFIRMED" > "$BARRIER_FILE.$$.tmp" &&
        mv -f "$BARRIER_FILE.$$.tmp" "$BARRIER_FILE"
}
begin_request() {
    [ "$CREATE_CONFIRMED" = true ] || { echo "REFUSED: Previous create request is indeterminate." >&2; return 125; }
    CREATE_CONFIRMED=false
    REQUEST_TOKEN="$1"
    REQUEST_SERVICES="$2"
    write_barrier
}
observed_request() (
    id=$1; project=$2; token=$3; services=$4
    if [ -n "$token" ]; then
        printf '%s\n' "$token" | grep -Eq '^[a-f0-9]{16}$' || return 1
        marker="$RUNTIME_DIR/runs/$id/started-$token"
        [ -f "$marker" ] && [ "$(cat "$marker")" = "$token" ] && return 0
        name="$project-$token"
        observed="$(docker ps -a --format '{{.Names}}' --filter "label=com.docker.compose.project=$project" --filter "name=^/$name$")" && [ "$observed" = "$name" ]
    else
        [ -n "$services" ] || return 1
        for svc in $(printf '%s' "$services" | tr ',' ' '); do
            case "$svc" in ''|*[!A-Za-z0-9_-]*) return 1 ;; esac
            cid="$(docker ps -a -q --filter "label=com.docker.compose.project=$project" --filter "label=com.docker.compose.service=$svc")" && [ -n "$cid" ] || return 1
        done
    fi
)
confirm_request() {
    [ "$CREATE_CONFIRMED" = true ] && return 0
    observed_request "$RUN_ID" "$EPH_PROJECT" "$REQUEST_TOKEN" "$REQUEST_SERVICES" || return 1
    CREATE_CONFIRMED=true
    write_barrier
}
finish_step() {
    confirm_request || return 125
    if [ "$2" -eq 0 ] && [ "$(cat "$RUN_DIR/complete-$1" 2>/dev/null)" != "$REQUEST_TOKEN" ]; then
        echo "REFUSED: Missing completion receipt for $1" >&2; return 125
    fi
    return "$2"
}
if [ -f "$BARRIER_FILE" ]; then
    old_run="$(json_field "$BARRIER_FILE" runId)"
    old_project="$(json_field "$BARRIER_FILE" ephemeralProject)"
    if [ "$(json_field "$BARRIER_FILE" engineId)" != "$ENGINE_ID" ] ||
       [ "$(json_field "$BARRIER_FILE" checkoutId)" != "$CHECKOUT_ID" ] ||
       ! printf '%s\n' "$old_run" | grep -Eq '^[a-f0-9]{16}$' ||
       [ "$old_project" != "tpl-$CHECKOUT_ID-r-$old_run" ]; then
        echo "REFUSED: Foreign or invalid barrier at $BARRIER_FILE." >&2; exit 2
    fi
    if ! grep -Eq '"createConfirmed"[[:space:]]*:[[:space:]]*true' "$BARRIER_FILE" &&
       ! observed_request "$old_run" "$old_project" "$(json_field "$BARRIER_FILE" stepToken)" "$(json_field "$BARRIER_FILE" services)"; then
        echo "REFUSED: Unconfirmed create request at $BARRIER_FILE." >&2; exit 2
    fi
    remove_project "$old_project" || { echo "REFUSED: Recovery could not confirm cleanup of $old_project." >&2; exit 2; }
    rm -f "$BARRIER_FILE"
fi

if [ "$CMD" = "start" ]; then
  if [ "${1:-}" = "--preview" ]; then
    DEMO_ROW="$PREVIEW_ROW"
    shift
  fi
  IFS='|' read -r DEMO_PROFILE DEMO_SERVICE DEMO_CPORT DEMO_HPORT <<EOF
$(printf '%s' "$DEMO_ROW" | tr -d '[:space:]')
EOF
  if [ "$HAS_STACK" != "true" ] || [ -z "$DEMO_SERVICE" ]; then
    echo "REFUSED: This project does not define a demo service." >&2
    cleanup_lock
    exit "$EXIT_REFUSED"
  fi
  PORT="$DEMO_HPORT"
  if [ $# -eq 2 ] && [ "$1" = "--port" ]; then
    PORT="$2"
  elif [ $# -gt 0 ]; then
    echo "REFUSED: Unsupported start arguments." >&2
    cleanup_lock
    exit "$EXIT_REFUSED"
  fi
  export TPL_DEMO_PORT="$PORT"
  case "$PORT" in ''|*[!0-9]*) echo "REFUSED: Invalid port" >&2; cleanup_lock; exit 2 ;; esac
  if [ "$PORT" -gt 65535 ]; then cleanup_lock; exit 2; fi
  [ "$(demo_status)" = stopped ] || { echo "REFUSED: Inspect or stop the existing demo first." >&2; exit 2; }
  require_images compose -p "$DEMO_PROJECT" -f "$STACK_COMPOSE_HOST" --profile "$DEMO_PROFILE" config --images "$DEMO_SERVICE" || exit 2
  mark_demo() {
    printf '{"schemaVersion":1,"engineId":"%s","checkoutId":"%s","project":"%s","service":"%s","state":"%s","url":"%s"}\n' \
      "$ENGINE_ID" "$CHECKOUT_ID" "$DEMO_PROJECT" "$DEMO_SERVICE" "$1" "$2" > "$DEMO_FILE.$$.tmp" && mv -f "$DEMO_FILE.$$.tmp" "$DEMO_FILE"
  }
  mark_demo starting ""
  if ! run_timed 120 "$DOCKER_BIN" compose -p "$DEMO_PROJECT" -f "$STACK_COMPOSE_HOST" --profile "$DEMO_PROFILE" up -d --no-build --pull never --wait --wait-timeout 90 "$DEMO_SERVICE"; then
    if [ "$(demo_status)" != indeterminate ] && remove_project "$DEMO_PROJECT"; then rm -f "$DEMO_FILE"; fi
    echo "REFUSED: Demo failed to become ready." >&2; exit 2
  fi
  BOUND="$(docker compose -p "$DEMO_PROJECT" -f "$STACK_COMPOSE_HOST" --profile "$DEMO_PROFILE" port "$DEMO_SERVICE" "$DEMO_CPORT")"
  if ! printf '%s\n' "$BOUND" | grep -Eq '^127\.0\.0\.1:[1-9][0-9]*$'; then
    if remove_project "$DEMO_PROJECT"; then rm -f "$DEMO_FILE"; fi
    echo "REFUSED: Demo service did not bind a loopback port." >&2; exit 2
  fi
  mark_demo running "http://$BOUND"
  echo "RESULT: demo ready at http://$BOUND ($DEMO_PROJECT)"
  cleanup_lock
  exit "$EXIT_OK"
fi

RUN_DIR="$RUNTIME_DIR/runs/$RUN_ID"
STEPS_DIR="$RUN_DIR/steps"
mkdir -p "$STEPS_DIR"
if [ "$CMD" = verify ] && [ "$HAS_SCAFFOLD" = true ] && [ -e "$ROOT_POSIX/.git" ]; then
  git_scratch=$(mktemp -d "${TMPDIR:-/tmp}/tpl-git.XXXXXXXX")
  sh "$ROOT_POSIX/tools/board/git-view.sh" "$ROOT_POSIX" workspace "$git_scratch" ro > "$git_scratch/mounts"
fi
write_barrier
run_scaffold() {
  ( export COMPOSE_IGNORE_ORPHANS=true
    require_images compose -p "$EPH_PROJECT" -f "$SCAFFOLD_COMPOSE_HOST" config --images "$SCAFFOLD_SERVICE" ) || return $?
  set -- "$SCAFFOLD_SERVICE" tools/launcher/run-step.sh python3 "$@"
  if [ -n "$git_scratch" ]; then
    while IFS= read -r spec; do set -- --volume "$spec" "$@"; done < "$git_scratch/mounts"
    set -- -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=include.path -e GIT_CONFIG_VALUE_0=/run/template-git-workspace/config "$@"
  fi
  sc_token="$(new_run_id)"
  begin_request "$sc_token" "" || return $?
  sc_code=0
  sc_old_orphans="${COMPOSE_IGNORE_ORPHANS:-}"
  export COMPOSE_IGNORE_ORPHANS=true
  run_timed "${SCAFFOLD_BUDGET:-1200}" "$DOCKER_BIN" compose -p "$EPH_PROJECT" -f "$SCAFFOLD_COMPOSE_HOST" run \
    --name "$EPH_PROJECT-$sc_token" --rm -T --no-deps --pull never --entrypoint sh \
    -e TPL_STEP_NAME=scaffold -e "TPL_STEP_TOKEN=$sc_token" --volume "$ROOT_HOST/.dev-runtime/runs/$RUN_ID:/run/template-result" \
    "$@" || sc_code=$?
  if [ -n "$sc_old_orphans" ]; then COMPOSE_IGNORE_ORPHANS="$sc_old_orphans"; else unset COMPOSE_IGNORE_ORPHANS; fi
  finish_step scaffold "$sc_code"
}

lookup_action() {
  target_act="$1"
  awk -v act="$target_act" '
    /^[[:space:]]*action[[:space:]]+/ {
      sub(/^[[:space:]]*action[[:space:]]+/, "")
      sub(/\r$/, "")
      n = split($0, a, "|")
      for (i = 1; i <= n; i++) { gsub(/^[ \t]+|[ \t]+$/, "", a[i]) }
      if (a[1] == act) {
        printf "%s\t%s\t%s\t%s\t%s\t%s\n", a[2], a[3], a[4], a[5], a[6], a[7]
        exit 0
      }
    }
  ' "$ROOT_POSIX/tools/stack.txt"
}

run_stack_action() {
  act_name="$1"
  row="$(lookup_action "$act_name")"
  if [ -z "$row" ]; then
    echo "REFUSED: Unknown stack action '$act_name'" >&2
    return "$EXIT_REFUSED"
  fi
  a_kind="$(printf '%s' "$row" | cut -f1)"
  a_profile="$(printf '%s' "$row" | cut -f2)"
  a_service="$(printf '%s' "$row" | cut -f3)"
  a_timeout="${2:-$(printf '%s' "$row" | cut -f4)}"
  case "$a_timeout" in ''|0|*[!0-9]*) echo "REFUSED: Invalid action timeout." >&2; return 2 ;; esac
  a_extra="$(printf '%s' "$row" | cut -f5)"
  a_args="$(printf '%s' "$row" | cut -f6)"

  if [ "$a_kind" = "compose_sequence" ]; then
    for sub in $a_args; do
      run_stack_action "$sub" || return $?
    done
    return 0
  fi

  prof_args=""
  [ "$a_profile" != "-" ] && prof_args="--profile $a_profile"

  if [ "$a_extra" = "build" ] || [ "$a_extra" = "build_pull" ]; then
    # shellcheck disable=SC2086
    run_timed "$a_timeout" "$DOCKER_BIN" compose -p "$EPH_PROJECT" -f "$STACK_COMPOSE_HOST" $prof_args build "$a_service" || return $?
  fi
  if [ "$a_extra" = "pull" ] || [ "$a_extra" = "build_pull" ]; then
    # shellcheck disable=SC2086
    run_timed "$a_timeout" "$DOCKER_BIN" compose -p "$EPH_PROJECT" -f "$STACK_COMPOSE_HOST" $prof_args pull --ignore-buildable --policy missing || return $?
  fi
  deps=""
  if [ "$a_kind" = "compose_with_deps" ]; then deps="$(printf '%s' "$a_extra" | tr ',' ' ')"; fi
  require_images compose -p "$EPH_PROJECT" -f "$STACK_COMPOSE_HOST" $prof_args config --images "$a_service" $deps || return $?
  if [ "$a_kind" = "compose_with_deps" ]; then
    # shellcheck disable=SC2086
    begin_request "" "$a_extra" || return $?
    up_code=0
    run_timed 75 "$DOCKER_BIN" compose -p "$EPH_PROJECT" -f "$STACK_COMPOSE_HOST" $prof_args up -d --no-deps --no-recreate --no-build --pull never --wait --wait-timeout 45 $deps || up_code=$?
    confirm_request || return 125
    [ "$up_code" -eq 0 ] || return "$up_code"
  fi
  step_token="$(new_run_id)"
  [ "$a_args" != "-" ] || a_args=""
  begin_request "$step_token" "" || return $?
  action_code=0
  run_timed "$a_timeout" "$DOCKER_BIN" compose -p "$EPH_PROJECT" -f "$STACK_COMPOSE_HOST" $prof_args run --rm -T --no-deps --pull never \
    --name "$EPH_PROJECT-$step_token" -e "TPL_STEP_NAME=$act_name" -e "TPL_STEP_TOKEN=$step_token" \
    --volume "$ROOT_HOST/.dev-runtime/runs/$RUN_ID:/run/template-result" "$a_service" $a_args || action_code=$?
  finish_step "$act_name" "$action_code"
}

RC=0
NEEDS_VERDICT="false"
[ "$CMD" = "verify" ] || [ "$CMD" = "build" ] && NEEDS_VERDICT="true"

if [ "$CMD" = "prepare" ]; then
  if [ "$HAS_SCAFFOLD" = "true" ]; then
    sc_old_orphans="${COMPOSE_IGNORE_ORPHANS:-}"
    export COMPOSE_IGNORE_ORPHANS=true
    run_timed 600 "$DOCKER_BIN" compose -p "$EPH_PROJECT" -f "$SCAFFOLD_COMPOSE_HOST" build "$SCAFFOLD_SERVICE" || RC=$?
    if [ -n "$sc_old_orphans" ]; then COMPOSE_IGNORE_ORPHANS="$sc_old_orphans"; else unset COMPOSE_IGNORE_ORPHANS; fi
  fi
  if [ "$RC" -eq 0 ] && [ "$HAS_STACK" = "true" ]; then
    run_stack_action prepare || RC=$?
  fi
elif [ "$CMD" = "verify" ] && [ "$HAS_SCAFFOLD" = "true" ] && [ "$HAS_STACK" != "true" ]; then
  run_scaffold verify.py --run-id "$RUN_ID" "$@" || RC=$?
elif [ "$CMD" = "verify" ] && [ "$HAS_SCAFFOLD" = "true" ] && [ "$HAS_STACK" = "true" ]; then
  run_scaffold verify.py --emit-plan "$RUN_ID" "$@" >/dev/null || RC=$?
  if [ "$RC" -eq 0 ]; then
    TAB="$(printf '\t')"
    while IFS="$TAB" read -r s_idx s_exec s_act s_bud s_gadapt s_gargs s_label; do
      [ -z "$s_idx" ] && continue
      [ "$INTERRUPTED" = false ] && [ "$CREATE_CONFIRMED" = true ] || break
      if [ "$s_exec" = scaffold ]; then
        s_rc=0
        t0="$(date +%s)"
        : > "$STEPS_DIR/$s_idx.out"
        SCAFFOLD_BUDGET=$((s_bud + 30)) run_scaffold verify.py --run-step "$RUN_ID" "$s_idx" >> "$STEPS_DIR/$s_idx.out" 2>&1 || s_rc=$?
        if [ "$s_rc" -ne 0 ] && [ ! -f "$STEPS_DIR/$s_idx.json" ]; then
          s_elapsed=$(($(date +%s) - t0))
          s_timeout=false; [ "$s_rc" -ne 124 ] || s_timeout=true
          printf 'runId=%s\nindex=%s\nlabel=%s\ncode=%s\ntimed_out=%s\nseconds=%s\n' \
            "$RUN_ID" "$s_idx" "$s_label" "$s_rc" "$s_timeout" "$s_elapsed" > "$STEPS_DIR/$s_idx.meta"
        elif [ "$s_rc" -eq 0 ] && [ -f "$STEPS_DIR/$s_idx.json" ]; then
          rm -f "$STEPS_DIR/$s_idx.out"
        fi
      else
        s_rc=0
        t0="$(date +%s)"
        : > "$STEPS_DIR/$s_idx.out"
        guard_extra=""
        [ "$s_gargs" = "-" ] || guard_extra="$s_gargs"
        if [ "$s_gadapt" != "-" ]; then
          # shellcheck disable=SC2086
          SCAFFOLD_BUDGET=60 run_scaffold "$s_gadapt" --clean-only $guard_extra >> "$STEPS_DIR/$s_idx.out" 2>&1 || s_rc=$?
        fi
        if [ "$s_rc" -eq 0 ]; then
          run_stack_action "$s_act" "$s_bud" >> "$STEPS_DIR/$s_idx.out" 2>&1 || s_rc=$?
          if [ "$s_gadapt" != "-" ] && [ "$s_rc" -ne 124 ] && [ "$INTERRUPTED" = false ] && [ "$CREATE_CONFIRMED" = true ]; then
            guard_rc=0
            # shellcheck disable=SC2086
            SCAFFOLD_BUDGET=60 run_scaffold "$s_gadapt" --check-only --exit-code "$s_rc" $guard_extra >> "$STEPS_DIR/$s_idx.out" 2>&1 || guard_rc=$?
            [ "$s_rc" -ne 0 ] || s_rc=$guard_rc
          fi
        fi
        s_elapsed=$(($(date +%s) - t0))
        s_timeout=false; [ "$s_rc" -ne 124 ] || s_timeout=true
        printf 'runId=%s\nindex=%s\nlabel=%s\ncode=%s\ntimed_out=%s\nseconds=%s\n' \
          "$RUN_ID" "$s_idx" "$s_label" "$s_rc" "$s_timeout" "$s_elapsed" > "$STEPS_DIR/$s_idx.meta"
      fi
    done < "$RUN_DIR/plan.tsv"
    if [ "$INTERRUPTED" = false ] && [ "$CREATE_CONFIRMED" = true ]; then
      run_scaffold verify.py --finalize "$RUN_ID" || RC=$?
    fi
  fi
elif [ "$CMD" = "verify" ] && [ "$HAS_STACK" = "true" ]; then
  for st in $STACK_VERIFY; do
    run_stack_action "$st" || { RC=$?; break; }
  done
else
  run_stack_action "$CMD" || RC=$?
fi

if [ "$CREATE_CONFIRMED" = false ]; then CLEANING=true confirm_request || :; fi

if ! remove_project "$EPH_PROJECT"; then
  echo "REFUSED: Could not confirm cleanup of $EPH_PROJECT. Barrier kept." >&2
  cleanup_lock
  exit "$EXIT_REFUSED"
fi

if [ "$CREATE_CONFIRMED" != "true" ]; then
  echo "REFUSED: Create was not confirmed. Barrier kept." >&2
  cleanup_lock
  exit "$EXIT_REFUSED"
fi

rm -f "$BARRIER_FILE"

if [ "$INTERRUPTED" = "true" ]; then
  echo "RESULT: $CMD INTERRUPTED (checkout=$CHECKOUT_ID run=$RUN_ID)" >&2
  cleanup_lock
  exit "$EXIT_INTERRUPTED"
fi

if [ "$RC" -ne 0 ]; then
  echo "RESULT: $CMD FAILED exit=$RC (checkout=$CHECKOUT_ID run=$RUN_ID)" >&2
  cleanup_lock
  case "$RC" in 125|2) exit "$EXIT_REFUSED" ;; *) exit "$EXIT_RED" ;; esac
fi

if [ "$NEEDS_VERDICT" = "true" ]; then
  VERDICT_FILE="$RUN_DIR/verdict.json"
  if [ "$CMD" = build ] || [ "$HAS_SCAFFOLD" = false ]; then
    printf '{"runId":"%s","status":"GREEN","operation":"%s"}\n' "$RUN_ID" "$CMD" > "$VERDICT_FILE.tmp"
    mv -f "$VERDICT_FILE.tmp" "$VERDICT_FILE"
  fi
  if [ ! -f "$VERDICT_FILE" ] || ! grep -q "\"runId\"[[:space:]]*:[[:space:]]*\"$RUN_ID\"" "$VERDICT_FILE" || ! grep -q '"status"[[:space:]]*:[[:space:]]*"GREEN"' "$VERDICT_FILE"; then
    echo "REFUSED: Missing or mismatched GREEN verdict at $VERDICT_FILE for run $RUN_ID." >&2
    cleanup_lock
    exit "$EXIT_REFUSED"
  fi
fi

echo "RESULT: $CMD GREEN (checkout=$CHECKOUT_ID run=$RUN_ID)"
cleanup_lock
exit "$EXIT_OK"
