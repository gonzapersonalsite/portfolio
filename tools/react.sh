#!/bin/sh
set -eu

junit_guard=/workspace/tools/guards/junit.py
cd /workspace/frontend

# The executable, dependency graph, install policy, and configuration all affect this checkout's modules.
fingerprint() {
    engine=$(node --version) || return 1
    cli=$(pnpm --version) || return 1
    inputs=$(sha256sum package.json pnpm-lock.yaml pnpm-workspace.yaml) || return 1
    printf '%s\n' "$engine" "$cli" "$inputs" | sha256sum
}

action=${1:?expected a React operation}
stamp=node_modules/.template-prepared
if [ "$action" = prepare ]; then
    rm -f "$stamp"
    pnpm install --store-dir /pnpm/store --frozen-lockfile --ignore-scripts
    fingerprint > "$stamp.tmp"
    mv "$stamp.tmp" "$stamp"
    exit 0
fi
expected=$(fingerprint)
if [ ! -f "$stamp" ] || [ "$(cat "$stamp")" != "$expected" ]; then
    echo 'Dependency inputs or toolchain changed. Run the project launcher with prepare.' >&2
    exit 2
fi

case "$action" in
    dependencies) exec pnpm install --store-dir /pnpm/store --frozen-lockfile --offline --ignore-scripts ;;
    format) exec pnpm run format:check ;;
    format-fix) exec pnpm run format ;;
    lint|typecheck) exec pnpm run "$action" ;;
    tests)
        report="reports/vitest/${TPL_RUN_ID:?use the project launcher}/junit.xml"
        exec python3 "$junit_guard" --forbid-skipped --report "$report" -- \
            pnpm run test --reporter=default --reporter=junit "--outputFile.junit=$report"
        ;;
    build) exec pnpm run build ;;
    dev)
        if [ "${TPL_HOST_OS:-}" = windows ]; then export CHOKIDAR_USEPOLLING=true; fi
        exec pnpm run dev --host 0.0.0.0 --port 5173 --strictPort
        ;;
    preview)
        test -s dist/index.html || { echo 'Build the project before starting the production preview.' >&2; exit 2; }
        exec pnpm run preview --host 0.0.0.0 --port 4173 --strictPort
        ;;
    *) echo "Unknown React operation: $action" >&2; exit 2 ;;
esac
