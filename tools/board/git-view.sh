#!/bin/sh
# Print one bind specification per line. The caller owns the private scratch
# directory. Only the explicit creation of a project needs a writable Git index.
set -eu
root=$1
slot=$2
scratch=$3
access=$4
case $slot in source|target|workspace) ;; *) exit 2 ;; esac
case $access in ro|rw) ;; *) exit 2 ;; esac
[ -e "$root/.git" ] || exit 0
if ! command -v git >/dev/null 2>&1; then
    [ -d "$root/.git" ] && exit 0
    echo 'Git is required on the host to resolve its linked worktree.' >&2
    exit 2
fi
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_NAMESPACE
host_git() { git -C "$root" "$@"; }
volume_path() {
    case "$1" in *:*|*'
'*|*"$(printf '\r')"*) echo 'This Git path cannot be represented as a Docker bind.' >&2; exit 2 ;; esac
}
volume_path "$scratch"
dest="/run/template-git-$slot"
repo_git="/$slot/.git"
if [ -f "$root/.git" ]; then
    admin=$(host_git rev-parse --absolute-git-dir)
    common=$(host_git rev-parse --path-format=absolute --git-common-dir)
    volume_path "$common"
    volume_path "$admin"
    name=${admin##*/}
    backlink=$(cat "$admin/gitdir")
    case $backlink in /*) ;; *) backlink="$admin/$backlink" ;; esac
    if [ "$admin" != "$common/worktrees/$name" ] || [ "$(CDPATH= cd -- "$(dirname -- "$backlink")" && pwd -P)/$(basename -- "$backlink")" != "$root/.git" ]; then
        echo 'Git metadata does not belong to this linked worktree.' >&2; exit 2
    fi
    if [ "$(cd -- "$admin" && pwd -P)" != "$admin" ] || [ "$(cd -- "$common/objects" && pwd -P)" != "$common/objects" ]; then
        echo 'Refusing Git metadata reached through a filesystem link.' >&2; exit 2
    fi
    repo_git="$dest/common/worktrees/$name"
    printf 'gitdir: %s\n' "$repo_git" > "$scratch/$slot.git"
    printf '%s\n' "$common:$dest/common:ro" "$scratch/$slot.git:/$slot/.git:ro"
    if [ "$access" = rw ]; then
        printf '%s\n' "$common/objects:$dest/common/objects:rw" "$admin:$repo_git:rw"
    fi
fi
# Only a user-owned, globally selected ignore file can add an external mount.
# A repository may also select an override inside its already mounted tree.
default="${XDG_CONFIG_HOME:-~/.config}/git/ignore"
trusted=$(host_git config --global --includes --path --default "$default" --get core.excludesFile)
selected=$(host_git config --path --default "$trusted" --get core.excludesFile)
case $selected in /*) ;; *) selected="$root/$selected" ;; esac
[ -f "$selected" ] || exit 0
volume_path "$selected"
selected_dir=$(CDPATH= cd -- "$(dirname -- "$selected")" && pwd -P)
if [ "$selected" != "$trusted" ]; then
    case "$selected_dir/" in "$root/"*) ;; *) echo 'An external per-project core.excludesFile must be declared in the user Git configuration.' >&2; exit 2 ;; esac
    [ ! -L "$selected" ] || { echo 'Refusing a linked project ignore file.' >&2; exit 2; }
fi
printf '[core]\n excludesFile = %s/ignore\n' "$dest" > "$scratch/$slot.settings"
if [ -f "$root/.git" ]; then repo_git="$dest/common/worktrees/*"; fi
git config --file "$scratch/$slot.config" "includeIf.gitdir:$repo_git.path" "$dest/settings"
printf '%s\n' "$selected:$dest/ignore:ro" "$scratch/$slot.settings:$dest/settings:ro" "$scratch/$slot.config:$dest/config:ro"
