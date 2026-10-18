# Sourced by the hooks of this directory: finds a REAL Python 3.8 or later, so
# both hooks look for it the same way. Git runs no file of this directory that
# is not named as a hook, and this one has an extension, so it is never one.
#
# On Windows, `python` and `python3` may be Store stubs that exist on PATH and
# run nothing, and an old machine may answer `python` with Python 2: the first
# candidate that runs and is 3.8 or later wins. PYTHON=... in the environment
# goes first and may carry arguments ("py -3"), so it is split on blanks; an
# interpreter whose path has blanks goes on PATH instead.

python_works() {
  "$@" -c "import sys; sys.exit(sys.version_info < (3, 8))" >/dev/null 2>&1
}

find_python() {
  if [ -n "${PYTHON:-}" ] && python_works $PYTHON; then
    echo "$PYTHON"
    return 0
  fi
  for candidate in python3 "py -3" python; do
    if python_works $candidate; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}
