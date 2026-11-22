# Print Docker bind specifications for one checkout. The caller supplies a
# private scratch directory and decides whether a catalog creation needs writes.
param([string]$Root, [ValidateSet('source','target','workspace')][string]$Slot,
      [string]$Scratch, [ValidateSet('ro','rw')][string]$Access)
$ErrorActionPreference = 'Stop'
$link = Join-Path $Root '.git'
if (-not (Test-Path -LiteralPath $link)) { return }
$git = Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $git) {
    if ([IO.Directory]::Exists($link)) { return }
    throw 'Git is required on the host to resolve its linked worktree.'
}
$dest = "/run/template-git-$Slot"
$repoGit = "/$Slot/.git"
$savedGit = @{}
try {
    foreach ($name in @('GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_NAMESPACE')) {
        $savedGit[$name] = [Environment]::GetEnvironmentVariable($name)
        Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
    }
    function Read-HostGit([string[]]$Options) {
        $output = & $git.Source -C $Root @Options
        if ($LASTEXITCODE -ne 0) { throw "Git could not resolve checkout metadata at $Root" }
        [string]$output
    }
    if ([IO.File]::Exists($link)) {
        $admin = [IO.DirectoryInfo]::new((Read-HostGit @('rev-parse','--absolute-git-dir')))
        $common = [IO.DirectoryInfo]::new((Read-HostGit @('rev-parse','--path-format=absolute','--git-common-dir')))
        $backlink = [IO.File]::ReadAllText((Join-Path $admin.FullName 'gitdir')).TrimEnd([char[]]"`r`n")
        if (-not [IO.Path]::IsPathRooted($backlink)) { $backlink = Join-Path $admin.FullName $backlink }
        if ($admin.Parent.Name -ne 'worktrees' -or $admin.Parent.Parent.FullName -ne $common.FullName -or
            [IO.Path]::GetFullPath($backlink) -ne [IO.Path]::GetFullPath($link)) {
            throw 'Git metadata does not belong to this linked worktree.'
        }
        foreach ($dir in @($common,$admin.Parent,$admin,[IO.DirectoryInfo]::new((Join-Path $common.FullName 'objects')))) {
            if ($dir.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing linked Git metadata.' }
        }
        $repoGit = "$dest/common/worktrees/$($admin.Name)"
        $pointer = Join-Path $Scratch "$Slot.git"
        [IO.File]::WriteAllText($pointer, "gitdir: $repoGit`n")
        "$($common.FullName):$dest/common:ro"
        if ($Access -eq 'rw') {
            # git add writes blobs and locks this worktree's index. Other refs,
            # worktree indexes, hooks and the shared Git configuration stay read-only.
            "$(Join-Path $common.FullName 'objects'):$dest/common/objects:rw"
            "$($admin.FullName):${repoGit}:rw"
        }
        "${pointer}:/$Slot/.git:ro"
    }
    $default = if ($env:XDG_CONFIG_HOME) { "$env:XDG_CONFIG_HOME/git/ignore" } else { '~/.config/git/ignore' }
    $trusted = Read-HostGit @('config','--global','--includes','--path','--default',$default,'--get','core.excludesFile')
    $selected = Read-HostGit @('config','--path','--default',$trusted,'--get','core.excludesFile')
    if (-not [IO.Path]::IsPathRooted($selected)) { $selected = Join-Path $Root $selected }
    if (-not [IO.File]::Exists($selected)) { return }
    $file = [IO.FileInfo]::new($selected)
    if ($file.FullName -ne [IO.Path]::GetFullPath($trusted)) {
        if (-not $file.FullName.StartsWith($Root.TrimEnd('\','/') + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw 'An external per-project core.excludesFile must be declared in the user Git configuration.'
        }
        if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing a linked project ignore file.' }
        for ($cursor = $file.Directory; $null -ne $cursor; $cursor = $cursor.Parent) {
            if ($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing a linked project ignore file.' }
            if ($cursor.FullName -eq $Root) { break }
        }
    }
    $settings = Join-Path $Scratch "$Slot.settings"
    $config = Join-Path $Scratch "$Slot.config"
    [IO.File]::WriteAllText($settings, "[core]`n excludesFile = $dest/ignore`n")
    if ([IO.File]::Exists($link)) { $repoGit = "$dest/common/worktrees/*" }
    [void](Read-HostGit @('config','--file',$config,"includeIf.gitdir:$repoGit.path","$dest/settings"))
    "$($file.FullName):$dest/ignore:ro"
    "${settings}:$dest/settings:ro"
    "${config}:$dest/config:ro"
} finally {
    foreach ($name in $savedGit.Keys) {
        if ($null -ne $savedGit[$name]) { [Environment]::SetEnvironmentVariable($name,$savedGit[$name]) }
    }
}
