#!/bin/sh
# The client distinguishes a completed container command from an interrupted CLI.
set -eu
case ${TPL_STEP_NAME:-} in ''|*[!a-zA-Z0-9_-]*) exit 2 ;; esac
case ${TPL_STEP_TOKEN:-} in ''|*[!a-f0-9]*) exit 2 ;; esac
printf '%s\n' "$TPL_STEP_TOKEN" > "/run/template-result/started-$TPL_STEP_TOKEN.tmp"
mv "/run/template-result/started-$TPL_STEP_TOKEN.tmp" "/run/template-result/started-$TPL_STEP_TOKEN"
"$@"
receipt="/run/template-result/complete-$TPL_STEP_NAME"
printf '%s\n' "$TPL_STEP_TOKEN" > "$receipt.$TPL_STEP_TOKEN"
mv -f "$receipt.$TPL_STEP_TOKEN" "$receipt"
