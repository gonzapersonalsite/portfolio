# Unified project host launcher (Windows PowerShell 5.1+, no Git Bash, no host Python/SDK).
# Coordinates Docker/Compose strictly from the host; zero Docker socket inside containers.
# A normal script preserves a literal -- for verify.py in Windows PowerShell 5.1.
$CliArgs = @($args)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_OK = 0
$EXIT_RED = 1
$EXIT_REFUSED = 2
$EXIT_BUSY = 3
$EXIT_INTERRUPTED = 130
$EXIT_PREPUSH_SKIP = 20

$DOCKER_QUICK_TIMEOUT = 30
$TEARDOWN_TIMEOUT = 30
$SAFE_TOKEN_REGEX = '^[A-Za-z0-9._:/=,@+\-]+$'
$SAFE_NAME_REGEX = '^[a-z0-9][a-z0-9_-]{0,62}$'

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class TplPathUtil {
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    private const uint FILE_SHARE_READ = 1;
    private const uint FILE_SHARE_WRITE = 2;
    private const uint FILE_SHARE_DELETE = 4;
    private const uint OPEN_EXISTING = 3;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateFileW(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFinalPathNameByHandleW(
        IntPtr hFile, StringBuilder lpszFilePath, uint cchFilePath, uint dwFlags);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    public static string GetCanonicalPhysicalPath(string path) {
        string full = Path.GetFullPath(path);
        IntPtr handle = CreateFileW(
            full, 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            IntPtr.Zero, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, IntPtr.Zero);
        if (handle == IntPtr.Zero || handle == new IntPtr(-1)) {
            return full;
        }
        try {
            var sb = new StringBuilder(1024);
            uint res = GetFinalPathNameByHandleW(handle, sb, (uint)sb.Capacity, 0);
            if (res == 0) {
                return full;
            }
            if (res >= sb.Capacity) {
                sb = new StringBuilder((int)res + 1);
                res = GetFinalPathNameByHandleW(handle, sb, (uint)sb.Capacity, 0);
                if (res == 0) return full;
            }
            string finalPath = sb.ToString();
            if (finalPath.StartsWith(@"\\?\UNC\", StringComparison.OrdinalIgnoreCase)) {
                finalPath = @"\\" + finalPath.Substring(8);
            } else if (finalPath.StartsWith(@"\\?\", StringComparison.Ordinal)) {
                finalPath = finalPath.Substring(4);
            }
            return finalPath;
        } finally {
            CloseHandle(handle);
        }
    }
}

public sealed class TplProcessIO : IDisposable {
    private readonly List<string> _out = new List<string>();
    private readonly List<string> _err = new List<string>();
    private readonly List<string> _combined = new List<string>();
    private readonly object _gate = new object();
    private readonly Thread _outThread;
    private readonly Thread _errThread;

    public TplProcessIO(Process proc, bool streamOutput) {
        _outThread = new Thread(() => ReadLoop(proc.StandardOutput, _out, streamOutput ? Console.Out : null)) { IsBackground = true };
        _errThread = new Thread(() => ReadLoop(proc.StandardError, _err, streamOutput ? Console.Error : null)) { IsBackground = true };
        _outThread.Start();
        _errThread.Start();
    }

    private void ReadLoop(StreamReader reader, List<string> target, TextWriter echo) {
        try {
            string line;
            while ((line = reader.ReadLine()) != null) {
                lock (_gate) {
                    target.Add(line);
                    _combined.Add(line);
                    if (echo != null) {
                        echo.WriteLine(line);
                        echo.Flush();
                    }
                }
            }
        } catch (IOException) {
        } catch (ObjectDisposedException) {
        }
    }

    public bool WaitForDrain(int timeoutMs) {
        var sw = Stopwatch.StartNew();
        bool okOut = _outThread.Join(timeoutMs);
        int rem = Math.Max(0, timeoutMs - (int)sw.ElapsedMilliseconds);
        bool okErr = _errThread.Join(rem);
        return okOut && okErr;
    }

    public string[] OutLines { get { lock (_gate) { return _out.ToArray(); } } }
    public string[] ErrLines { get { lock (_gate) { return _err.ToArray(); } } }
    public string[] CombinedLines { get { lock (_gate) { return _combined.ToArray(); } } }
    public void Dispose() { }
}
'@ -ErrorAction Stop

# ------------------------------------------------------------------ Utilities

function Get-Sha256Hex([string]$Text) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
        $hash = $sha.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function New-RunId {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 8
        $rng.GetBytes($bytes)
        return ([System.BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    } finally {
        $rng.Dispose()
    }
}

function Get-CanonicalRoot([string]$ScriptFile) {
    $launcherDir = Split-Path -Parent $ScriptFile
    $toolsDir = Split-Path -Parent $launcherDir
    $root = Split-Path -Parent $toolsDir
    $physical = [TplPathUtil]::GetCanonicalPhysicalPath($root)
    return $physical.TrimEnd('\', '/')
}

function Get-CheckoutId([string]$PhysicalRoot) {
    $normalized = $PhysicalRoot.Replace('\', '/').ToLowerInvariant()
    return (Get-Sha256Hex $normalized).Substring(0, 12)
}

function Join-ArgList([object[]]$Parts) {
    $list = New-Object System.Collections.Generic.List[string]
    foreach ($p in $Parts) {
        if ($null -eq $p) { continue }
        if ($p -is [string]) {
            [void]$list.Add($p)
        } elseif ($p -is [System.Collections.IEnumerable]) {
            foreach ($item in $p) {
                if ($null -ne $item) { [void]$list.Add([string]$item) }
            }
        } else {
            [void]$list.Add([string]$p)
        }
    }
    return ,([string[]]$list.ToArray())
}

function Format-Win32Arg([string]$Arg) {
    if ($null -eq $Arg -or $Arg.Length -eq 0) { return '""' }
    if ($Arg -notmatch '[\s"]') { return $Arg }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    $backslashes = 0
    for ($i = 0; $i -lt $Arg.Length; $i++) {
        $ch = $Arg[$i]
        if ($ch -eq '\') {
            $backslashes++
        } elseif ($ch -eq '"') {
            [void]$sb.Append('\', ($backslashes * 2) + 1)
            [void]$sb.Append('"')
            $backslashes = 0
        } else {
            if ($backslashes -gt 0) {
                [void]$sb.Append('\', $backslashes)
                $backslashes = 0
            }
            [void]$sb.Append($ch)
        }
    }
    if ($backslashes -gt 0) {
        [void]$sb.Append('\', $backslashes * 2)
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

function Resolve-Executable([string]$Name) {
    $cmd = Get-Command -Name $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $cmd) { return $null }
    return $cmd.Source
}

function Stop-ExternalTree([System.Diagnostics.Process]$Process) {
    if ($Process.HasExited) { return }
    $killer = New-Object System.Diagnostics.ProcessStartInfo
    $killer.FileName = Join-Path ([Environment]::SystemDirectory) 'taskkill.exe'
    $killer.Arguments = "/pid $($Process.Id) /t /f"
    $killer.UseShellExecute = $false
    $killer.CreateNoWindow = $true
    $cleanup = [System.Diagnostics.Process]::Start($killer)
    try { [void]$cleanup.WaitForExit(5000) } finally { $cleanup.Dispose() }
    if (-not $Process.HasExited) { $Process.Kill() }
    [void]$Process.WaitForExit(5000)
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = '',
        [hashtable]$Environment = @{},
        [int]$TimeoutSeconds = 300,
        [switch]$StreamOutput,

        [byte[]]$StdinBytes = $null
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = (($Arguments | ForEach-Object { Format-Win32Arg $_ }) -join ' ')
    if ($WorkingDirectory) { $psi.WorkingDirectory = $WorkingDirectory }
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $false
    $psi.RedirectStandardInput = ($null -ne $StdinBytes)
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    foreach ($k in $Environment.Keys) {
        $psi.EnvironmentVariables[$k] = [string]$Environment[$k]
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi

    $timedOut = $false
    $interrupted = $false
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $exitCode = -1
    $io = $null
    $outLines = @()
    $errLines = @()
    $combinedLines = @()
    try {
        [void]$proc.Start()
        $io = New-Object TplProcessIO($proc, [bool]$StreamOutput)
        if ($null -ne $StdinBytes) {
            $proc.StandardInput.BaseStream.Write($StdinBytes, 0, $StdinBytes.Length)
            $proc.StandardInput.BaseStream.Flush()
            $proc.StandardInput.Close()
        }
        $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
        while (-not $proc.WaitForExit(200)) {
            if ([DateTime]::UtcNow -ge $deadline) {
                $timedOut = $true
                break
            }
        }
        if ($timedOut) {
            Stop-ExternalTree $proc
            [void]$io.WaitForDrain(1000)
            $exitCode = 124
        } else {
            # A detached descendant can inherit either pipe after the client exits.
            if ($io.WaitForDrain(5000)) { $exitCode = $proc.ExitCode }
            else { Stop-ExternalTree $proc; $timedOut = $true; $exitCode = 124 }
        }
    } catch [System.Management.Automation.PipelineStoppedException] {
        $interrupted = $true
        if ($null -ne $io) {
            Stop-ExternalTree $proc
            [void]$io.WaitForDrain(1000)
        }
        $exitCode = $EXIT_INTERRUPTED
    } finally {
        $sw.Stop()
        if ($null -ne $io) {
            $outLines = @($io.OutLines)
            $errLines = @($io.ErrLines)
            $combinedLines = @($io.CombinedLines)
            $io.Dispose()
        }
        try { $proc.Dispose() } catch { }
    }

    return [pscustomobject]@{
        ExitCode      = $exitCode
        TimedOut      = $timedOut
        Interrupted   = $interrupted
        ElapsedSec    = [Math]::Round($sw.Elapsed.TotalSeconds, 3)
        StdOut        = ($outLines -join "`n")
        StdErr        = ($errLines -join "`n")
        OutLines      = $outLines
        ErrLines      = $errLines
        CombinedLines = $combinedLines
    }
}

function Test-TransientFileError($ErrorRecord) {
    $ex = $ErrorRecord.Exception
    while ($null -ne $ex) {
        if ($ex -is [System.IO.FileNotFoundException] -or
            $ex -is [System.IO.DirectoryNotFoundException] -or
            $ex -is [System.IO.PathTooLongException] -or
            $ex -is [System.IO.DriveNotFoundException]) {
            return $false
        }
        if ($ex -is [System.IO.IOException] -or $ex -is [System.UnauthorizedAccessException]) {
            return $true
        }
        $ex = $ex.InnerException
    }
    return $false
}

function Invoke-WithFileRetry([scriptblock]$Action, [int]$MaxAttempts = 20) {
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            return (& $Action)
        } catch {
            if ($attempt -ge $MaxAttempts -or -not (Test-TransientFileError $_)) {
                throw
            }
            $delayMs = [Math]::Min(25 * $attempt, 200)
            [System.Threading.Thread]::Sleep($delayMs)
        }
    }
}

function Write-TextAtomic([string]$Path, [string]$Text) {
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $tmp = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    try {
        $fs = [System.IO.File]::Open($tmp, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $fs.Write($bytes, 0, $bytes.Length)
            $fs.Flush($true)
        } finally {
            $fs.Dispose()
        }
        # Windows file watchers and antivirus scanners briefly open newly written
        # runtime state files without FileShare.Delete; retry Replace/Move in a
        # bounded window so transient sharing violations do not abort a run.
        Invoke-WithFileRetry {
            if ([System.IO.File]::Exists($Path)) {
                [System.IO.File]::Replace($tmp, $Path, [NullString]::Value)
            } else {
                [System.IO.File]::Move($tmp, $Path)
            }
        }
    } finally {
        if ([System.IO.File]::Exists($tmp)) {
            try { [System.IO.File]::Delete($tmp) } catch { }
        }
    }
}

function Write-JsonAtomic([string]$Path, [hashtable]$Obj) {
    Write-TextAtomic -Path $Path -Text (($Obj | ConvertTo-Json -Depth 10 -Compress) + "`n")
}

function Read-TextShared([string]$Path) {
    return (Invoke-WithFileRetry {
        $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, ([System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete))
        try {
            $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8, $true)
            try { return $sr.ReadToEnd() } finally { $sr.Dispose() }
        } finally {
            $fs.Dispose()
        }
    })
}

function Read-JsonFile([string]$Path) {
    if (-not [System.IO.File]::Exists($Path)) { return $null }
    $raw = Read-TextShared -Path $Path
    return ($raw | ConvertFrom-Json)
}

function Remove-FileWithRetry([string]$Path) {
    if (-not [System.IO.File]::Exists($Path)) { return }
    Invoke-WithFileRetry {
        if ([System.IO.File]::Exists($Path)) {
            [System.IO.File]::Delete($Path)
        }
    }
}

function Acquire-CheckoutLock([string]$LockPath) {
    $dir = Split-Path -Parent $LockPath
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    try {
        $fs = [System.IO.File]::Open($LockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        $info = [System.Text.Encoding]::UTF8.GetBytes("pid=$PID started=$([DateTime]::UtcNow.ToString('o'))`n")
        $fs.SetLength(0)
        $fs.Write($info, 0, $info.Length)
        $fs.Flush($true)
        return $fs
    } catch [System.IO.IOException] {
        return $null
    }
}

function Release-CheckoutLock($Handle) {
    if ($null -ne $Handle) {
        try { $Handle.Dispose() } catch { }
    }
}

# ------------------------------------------------------------------ Contract Readers

function Assert-SafeToken([string]$Token, [string]$Context) {
    if (-not ($Token -match $SAFE_TOKEN_REGEX)) {
        throw "Refused unsafe $Context token: '$Token'"
    }
}

function Assert-SafeRelativeSubdir([string]$Subdir) {
    if ($Subdir -eq '' -or $Subdir -eq '-') { return '' }
    if ($Subdir.Contains('..') -or $Subdir.Contains('\') -or $Subdir.Contains(':') -or $Subdir.StartsWith('/')) {
        throw "Refused unsafe subdir: '$Subdir'"
    }
    Assert-SafeToken $Subdir 'subdir'
    return $Subdir
}

function Read-ScaffoldContract([string]$Root) {
    $path = Join-Path $Root 'tools\board\scaffold.json'
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    $obj = Read-JsonFile $path
    if ($null -eq $obj -or $obj.schemaVersion -ne 1) {
        throw "Invalid tools/board/scaffold.json"
    }
    return $obj
}

function Read-StackContract([string]$Root) {
    $path = Join-Path $Root 'tools\stack.txt'
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    $stack = @{
        schema      = 0
        id          = ''
        composeFile = 'compose.yaml'
        subdir      = ''
        volumes     = @()
        demo        = $null
        preview     = $null
        verifySteps = @()
        extraNames  = @()
        actions     = @{}
    }
    $lines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)
    foreach ($raw in $lines) {
        $line = $raw.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { continue }
        $spaceIdx = $line.IndexOf(' ')
        if ($spaceIdx -lt 1) { throw "Invalid row in tools/stack.txt: $line" }
        $key = $line.Substring(0, $spaceIdx)
        $val = $line.Substring($spaceIdx + 1).Trim()
        switch ($key) {
            'schema' { $stack.schema = [int]$val }
            'stack' {
                if (-not ($val -match $SAFE_NAME_REGEX)) { throw "Unsafe stack id '$val'" }
                $stack.id = $val
            }
            'compose' {
                Assert-SafeToken $val 'compose'
                $stack.composeFile = $val
            }
            'subdir' { $stack.subdir = Assert-SafeRelativeSubdir $val }
            'volume' {
                if (-not ($val -match $SAFE_NAME_REGEX)) { throw "Unsafe volume name '$val'" }
                $stack.volumes += $val
            }
            'extra' {
                if (-not ($val -match $SAFE_NAME_REGEX)) { throw "Unsafe extra action '$val'" }
                $stack.extraNames += $val
            }
            'harness' {
                if ($val -notmatch '^[a-zA-Z0-9_-]+\s*\|\s*[A-Za-z0-9_./-]+$') { throw "Invalid harness declaration: $val" }
            }
            'verify' {
                $parts = @($val -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
                foreach ($p in $parts) {
                    if (-not ($p -match $SAFE_NAME_REGEX)) { throw "Unsafe verify step '$p'" }
                }
                $stack.verifySteps = $parts
            }
            { $_ -in @('demo','preview') } {
                $parts = @($val -split '\|' | ForEach-Object { $_.Trim() })
                if (@($parts).Count -ne 4) { throw "Invalid demo row in tools/stack.txt" }
                $stack[$key] = @{
                    profile       = $parts[0]
                    service       = $parts[1]
                    containerPort = [int]$parts[2]
                    hostPort      = [int]$parts[3]
                }
            }
            'action' {
                $parts = @($val -split '\|' | ForEach-Object { $_.Trim() })
                if (@($parts).Count -ne 7) { throw "Invalid action row in tools/stack.txt: $line" }
                $aName = $parts[0]
                $aKind = $parts[1]
                $aProfile = $parts[2]
                $aService = $parts[3]
                $aTimeout = [int]$parts[4]
                $aExtra = $parts[5]
                $aArgsRaw = $parts[6]
                if (-not ($aName -match $SAFE_NAME_REGEX)) { throw "Unsafe action name '$aName'" }
                if ($aKind -notin @('compose_run', 'compose_with_deps', 'compose_sequence')) { throw "Unsupported action kind '$aKind'" }
                if ($aService -ne '-' -and -not ($aService -match $SAFE_NAME_REGEX)) { throw "Unsafe service '$aService'" }
                $aArgs = @()
                if ($aArgsRaw -ne '-' -and $aArgsRaw -ne '') {
                    $aArgs = @($aArgsRaw -split '\s+' | Where-Object { $_ -ne '' })
                    foreach ($t in $aArgs) { Assert-SafeToken $t "action:$aName" }
                }
                $stack.actions[$aName] = @{
                    name    = $aName
                    kind    = $aKind
                    profile = if ($aProfile -eq '-') { '' } else { $aProfile }
                    service = if ($aService -eq '-') { '' } else { $aService }
                    timeout = $aTimeout
                    extra   = if ($aExtra -eq '-') { '' } else { $aExtra }
                    args    = $aArgs
                }
            }
            default { throw "Unknown keyword '$key' in tools/stack.txt" }
        }
    }
    if ($stack.schema -ne 1 -or -not $stack.id) {
        throw "tools/stack.txt must declare 'schema 1' and 'stack <id>'"
    }
    return $stack
}

# ------------------------------------------------------------------ Docker & Barrier

function Test-DockerReady([string]$DockerExe, [string]$Root) {
    if (-not $env:DOCKER_HOST -and -not $env:DOCKER_CONTEXT) {
        $ctx = Invoke-External $DockerExe @('context','show') $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        if ($ctx.ExitCode -ne 0 -or -not $ctx.StdOut.Trim()) { return 'Cannot identify Docker context.' }
        $env:DOCKER_CONTEXT = $ctx.StdOut.Trim()
    }
    $info = Invoke-External $DockerExe @('info','--format','{{.ID}}') $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
    if ($info.TimedOut -or $info.ExitCode -ne 0) {
        return "Docker daemon not ready (exit $($info.ExitCode)): $($info.StdErr.Trim())"
    }
    $script:EngineId = $info.StdOut.Trim()
    if ($script:EngineId -notmatch '^[a-zA-Z0-9:-]+$') { return 'Cannot identify Docker engine.' }
    $comp = Invoke-External $DockerExe @('compose','version','--short') $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
    if ($comp.TimedOut -or $comp.ExitCode -ne 0) {
        return "Docker Compose plugin unavailable (exit $($comp.ExitCode)): $($comp.StdErr.Trim())"
    }
    return ''
}

function Get-ProjectResources([string]$DockerExe, [string]$Root, [string]$ProjectName) {
    $ps = Invoke-External -FilePath $DockerExe -Arguments @('ps', '-a', '-q', '--filter', "label=com.docker.compose.project=$ProjectName") -WorkingDirectory $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
    if ($ps.TimedOut -or $ps.ExitCode -ne 0) {
        return [pscustomobject]@{ Ok = $false; Containers = @(); Networks = @(); Error = "docker ps failed ($($ps.ExitCode)): $($ps.StdErr.Trim())" }
    }
    $nw = Invoke-External -FilePath $DockerExe -Arguments @('network', 'ls', '-q', '--filter', "label=com.docker.compose.project=$ProjectName") -WorkingDirectory $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
    if ($nw.TimedOut -or $nw.ExitCode -ne 0) {
        return [pscustomobject]@{ Ok = $false; Containers = @(); Networks = @(); Error = "docker network ls failed ($($nw.ExitCode)): $($nw.StdErr.Trim())" }
    }
    $cids = @($ps.StdOut -split "`r?`n" | Where-Object { $_.Trim() -ne '' })
    $nids = @($nw.StdOut -split "`r?`n" | Where-Object { $_.Trim() -ne '' })
    return [pscustomobject]@{ Ok = $true; Containers = $cids; Networks = $nids; Error = '' }
}

function Remove-EphemeralProject([string]$DockerExe, [string]$WorkDir, [string]$ComposeFile, [string]$ProjectName, [hashtable]$Env) {
    if ($ComposeFile) {
        $fullCf = if ([System.IO.Path]::IsPathRooted($ComposeFile)) { $ComposeFile } else { Join-Path $WorkDir $ComposeFile }
        if (Test-Path -LiteralPath $fullCf) {
            [void](Invoke-External -FilePath $DockerExe -Arguments @('compose', '-p', $ProjectName, '-f', $fullCf, 'down', '--remove-orphans', '--timeout', '10') -WorkingDirectory $WorkDir -Environment $Env -TimeoutSeconds $TEARDOWN_TIMEOUT)
        }
    }
    $res = Get-ProjectResources -DockerExe $DockerExe -Root $WorkDir -ProjectName $ProjectName
    if (-not $res.Ok) { return $res }
    foreach ($cid in $res.Containers) {
        [void](Invoke-External -FilePath $DockerExe -Arguments @('rm', '-f', $cid) -WorkingDirectory $WorkDir -TimeoutSeconds $DOCKER_QUICK_TIMEOUT)
    }
    foreach ($nid in $res.Networks) {
        [void](Invoke-External -FilePath $DockerExe -Arguments @('network', 'rm', $nid) -WorkingDirectory $WorkDir -TimeoutSeconds $DOCKER_QUICK_TIMEOUT)
    }
    $after = Get-ProjectResources -DockerExe $DockerExe -Root $WorkDir -ProjectName $ProjectName
    if (-not $after.Ok) { return $after }
    if (@($after.Containers).Count -gt 0 -or @($after.Networks).Count -gt 0) {
        return [pscustomobject]@{
            Ok         = $false
            Containers = $after.Containers
            Networks   = $after.Networks
            Error      = "Ephemeral resources still present for ${ProjectName}: containers=$(@($after.Containers).Count) networks=$(@($after.Networks).Count)"
        }
    }
    return [pscustomobject]@{ Ok = $true; Containers = @(); Networks = @(); Error = '' }
}

function Set-CreateRequest($Path, $Barrier, [string]$Token, [string[]]$Services) {
    if (-not $Barrier.createConfirmed) { throw "Previous Compose create request is indeterminate. Barrier retained at $Path." }
    $next = $Barrier.Clone()
    $next.createConfirmed = $false
    $next.stepToken = $Token
    $next.services = $Services
    Write-JsonAtomic $Path $next
    $Barrier.createConfirmed = $false
    $Barrier.stepToken = $Token
    $Barrier.services = $Services
}

function Get-ObjProp($Obj, [string]$Name, $Default = $null) {
    if ($null -eq $Obj) { return $Default }
    if ($Obj -is [System.Collections.IDictionary]) {
        if ($Obj.Contains($Name)) { return $Obj[$Name] }
        return $Default
    }
    if ($Obj.PSObject.Properties.Name -contains $Name) { return $Obj.$Name }
    return $Default
}

function Test-RequestObserved($DockerExe, $Root, $Barrier) {
    if ((Get-ObjProp $Barrier 'createConfirmed' $false) -eq $true) { return $true }
    $project = [string](Get-ObjProp $Barrier 'ephemeralProject' '')
    $token = [string](Get-ObjProp $Barrier 'stepToken' '')
    $runId = [string](Get-ObjProp $Barrier 'runId' '')
    if ($token -match '^[0-9a-f]{16}$') {
        $marker = Join-Path $Root ".dev-runtime\runs\$runId\started-$token"
        if ([IO.File]::Exists($marker) -and (Read-TextShared $marker).TrimEnd() -ceq $token) { return $true }
        $name = "$project-$token"
        $q = Invoke-External $DockerExe @('ps','-a','--format','{{.Names}}','--filter',"label=com.docker.compose.project=$project",'--filter',"name=^/$name$") $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        return ($q.ExitCode -eq 0 -and $q.StdOut.Trim() -ceq $name)
    }
    $rawServices = Get-ObjProp $Barrier 'services' @()
    $services = if ($rawServices -is [string]) {
        @($rawServices -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
    } else {
        @($rawServices | Where-Object { $null -ne $_ -and [string]$_ -ne '' })
    }
    if (@($services).Count -eq 0) { return $false }
    foreach ($svc in $services) {
        if ($svc -notmatch $SAFE_NAME_REGEX) { return $false }
        $q = Invoke-External $DockerExe @('ps','-a','-q','--filter',"label=com.docker.compose.project=$project",'--filter',"label=com.docker.compose.service=$svc") $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        if ($q.ExitCode -ne 0 -or -not $q.StdOut.Trim()) { return $false }
    }
    return $true
}

function Finish-StepRequest($DockerExe, $Root, $Path, $Barrier, $Result, $Action) {
    if (Test-RequestObserved $DockerExe $Root $Barrier) {
        $Barrier.createConfirmed = $true
        Write-JsonAtomic $Path $Barrier
    }
    if ($Result.ExitCode -eq 0 -and -not $Result.TimedOut -and -not $Result.Interrupted) {
        $receipt = Join-Path $Root ".dev-runtime\runs\$($Barrier.runId)\complete-$Action"
        if (-not [IO.File]::Exists($receipt) -or (Read-TextShared $receipt).TrimEnd() -cne $Barrier.stepToken) {
            [Console]::Error.WriteLine("REFUSED: Missing completion receipt for $Action")
            $Result.ExitCode = 125
        }
    }
}

function Resolve-StaleBarrier([string]$DockerExe, [string]$Root, [string]$CheckoutId, [string]$BarrierPath, [string]$ComposeFile, [hashtable]$Env) {
    if (-not (Test-Path -LiteralPath $BarrierPath)) { return $true }
    try {
        $b = Read-JsonFile $BarrierPath
    } catch {
        [Console]::Error.WriteLine("REFUSED: Unreadable barrier file $BarrierPath. Inspect Docker resources before removing it.")
        return $false
    }
    $schema = Get-ObjProp $b 'schemaVersion' $null
    $bCheckoutId = Get-ObjProp $b 'checkoutId' $null
    $bCheckoutPath = Get-ObjProp $b 'checkoutPath' $null
    $bProject = Get-ObjProp $b 'ephemeralProject' $null
    $bEngineId = Get-ObjProp $b 'engineId' $null
    $bRunId = Get-ObjProp $b 'runId' $null
    if ($null -eq $b -or $schema -ne 1 -or $bCheckoutId -cne $CheckoutId -or -not ($bCheckoutPath -is [string]) -or $bCheckoutPath -ne $Root) {
        [Console]::Error.WriteLine("REFUSED: Barrier $BarrierPath belongs to another checkout or has invalid schema; will not touch foreign resources.")
        return $false
    }
    if (-not ($bProject -is [string]) -or -not ($bProject -match "^tpl-$CheckoutId-r-[0-9a-f]{16}$")) {
        [Console]::Error.WriteLine("REFUSED: Barrier $BarrierPath has invalid ephemeralProject '$bProject'.")
        return $false
    }
    if (-not ($bEngineId -is [string]) -or $bEngineId -cne $script:EngineId -or
        -not ($bRunId -is [string]) -or $bRunId -notmatch '^[0-9a-f]{16}$' -or $bProject -cne "tpl-$CheckoutId-r-$bRunId") {
        [Console]::Error.WriteLine("REFUSED: Inconsistent run identity or Docker engine in $BarrierPath.")
        return $false
    }
    if (-not (Test-RequestObserved $DockerExe $Root $b)) {
        [Console]::Error.WriteLine("REFUSED: Previous run $bRunId ended before Docker confirmed container creation (createConfirmed=false). An empty inventory does not rule out a late create. Inspect $BarrierPath and confirm daemon settlement before removing it.")
        return $false
    }
    [Console]::Error.WriteLine("Recovering interrupted run $bRunId ($bProject)...")
    $clean = Remove-EphemeralProject -DockerExe $DockerExe -WorkDir $Root -ComposeFile $ComposeFile -ProjectName $bProject -Env $Env
    if (-not $clean.Ok) {
        [Console]::Error.WriteLine("REFUSED: Recovery could not confirm removal of ${bProject}: $($clean.Error). Barrier kept.")
        return $false
    }
    Remove-FileWithRetry -Path $BarrierPath
    return $true
}

function Get-DemoStatus($DockerExe, $Root, $CheckoutId, $DemoPath) {
    if (-not (Test-Path -LiteralPath $DemoPath)) { return 'stopped' }
    try {
        $state = Read-JsonFile $DemoPath
        if ($state.engineId -cne $script:EngineId -or $state.checkoutId -cne $CheckoutId -or
            $state.project -cne "tpl-$CheckoutId-demo" -or $state.service -notmatch $SAFE_NAME_REGEX) { return 'indeterminate' }
        $ids = Invoke-External $DockerExe @('ps','-a','-q','--filter',"label=com.docker.compose.project=$($state.project)",
            '--filter',"label=com.docker.compose.service=$($state.service)") $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        if ($ids.ExitCode -ne 0) { return 'indeterminate' }
        $cid = $ids.StdOut.Trim()
        if (-not $cid) { if ($state.state -eq 'running') { return 'stopped' }; return 'indeterminate' }
        if ($cid -notmatch '^[0-9a-f]+$') { return 'indeterminate' }
        $q = Invoke-External $DockerExe @('inspect','--format','{{if .State.Running}}{{if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}{{else}}stopped{{end}}',$cid) $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        if ($q.ExitCode -ne 0) { return 'indeterminate' }
        $observed = $q.StdOut.Trim()
        if ($observed -eq 'healthy') { return 'running' }
        if ($observed -in @('running','starting','unhealthy','stopped')) { return $observed }
        return 'indeterminate'
    } catch { return 'indeterminate' }
}

function Ensure-CacheVolumes([string]$DockerExe, [string]$Root, [string]$CheckoutId, [string[]]$VolumeNames) {
    $map = @{}
    foreach ($v in $VolumeNames) {
        $fullName = "tpl-$CheckoutId-$v"
        $envKey = 'TPL_VOL_' + $v.ToUpperInvariant().Replace('-', '_')
        $map[$envKey] = $fullName
        $res = Invoke-External -FilePath $DockerExe -Arguments @('volume', 'create', '--label', "tpl.checkout=$CheckoutId", '--label', 'tpl.kind=cache', $fullName) -WorkingDirectory $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        if ($res.TimedOut -or $res.ExitCode -ne 0) {
            throw "Could not ensure cache volume ${fullName}: $($res.StdErr.Trim())"
        }
    }
    return $map
}

# ------------------------------------------------------------------ Scaffold & Stack Runners

function Assert-LocalImages($DockerExe, $Root, $ComposeArgs, $Services, $EnvMap) {
    $query = Join-ArgList @($ComposeArgs, 'config', '--images', $Services)
    $images = Invoke-External $DockerExe $query $Root -Environment $EnvMap -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
    if ($images.ExitCode -ne 0 -or -not $images.StdOut.Trim()) { throw "Cannot resolve local images: $($images.StdErr)" }
    foreach ($image in @($images.OutLines | Where-Object { $_.Trim() } | Select-Object -Unique)) {
        $probe = Invoke-External $DockerExe @('image','inspect','--format','{{.Id}}',$image.Trim()) $Root -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
        if ($probe.ExitCode -ne 0) { throw "Missing local image $image. Run prepare." }
    }
}

function Invoke-ScaffoldRun {
    param(
        [string]$DockerExe,
        [string]$Root,
        [object]$Scaffold,
        [string]$EphemeralProject,
        [string]$RunId,
        [hashtable]$BaseEnv,
        [string[]]$PyArgs,
        [int]$TimeoutSeconds = 600,
        [string]$BarrierPath = '',
        [hashtable]$BarrierObj = $null,
        [switch]$StreamOutput,
        [byte[]]$StdinBytes = $null
    )
    $cf = Join-Path $Root ([string]$Scaffold.composeFile)
    $envMap = @{}
    foreach ($k in $BaseEnv.Keys) { $envMap[$k] = $BaseEnv[$k] }
    $envMap['TPL_RUN_ID'] = $RunId
    $envMap['COMPOSE_IGNORE_ORPHANS'] = 'true'

    Assert-LocalImages $DockerExe $Root @('compose','-p',$EphemeralProject,'-f',$cf) @([string]$Scaffold.service) $envMap
    $stepName = 'scaffold'
    $token = New-RunId
    $resultDir = Join-Path $Root ".dev-runtime\runs\$RunId"
    Set-CreateRequest $BarrierPath $BarrierObj $token @()
    $runArgs = Join-ArgList @('compose', '-p', $EphemeralProject, '-f', $cf, 'run', '--rm', '-T', '--no-deps', '--pull', 'never',
        '--name', "$EphemeralProject-$token", '--entrypoint', 'sh',
        '-e', "TPL_STEP_NAME=$stepName", '-e', "TPL_STEP_TOKEN=$token", '--volume', ('{0}:/run/template-result' -f $resultDir),
        $Scaffold.gitArguments, [string]$Scaffold.service, 'tools/launcher/run-step.sh', 'python3', $PyArgs)
    $res = Invoke-External -FilePath $DockerExe -Arguments $runArgs -WorkingDirectory $Root -Environment $envMap -TimeoutSeconds $TimeoutSeconds -StreamOutput:$StreamOutput -StdinBytes $StdinBytes
    Finish-StepRequest $DockerExe $Root $BarrierPath $BarrierObj $res $stepName
    return $res
}

function Invoke-StackAction {
    param(
        [string]$DockerExe,
        [string]$Root,
        [hashtable]$Stack,
        [string]$ActionName,
        [string]$EphemeralProject,
        [string]$RunId,
        [hashtable]$BaseEnv,
        [string]$BarrierPath,
        [hashtable]$BarrierObj,
        [int]$OverrideTimeout = 0,
        [switch]$StreamOutput
    )
    if (-not $Stack.actions.ContainsKey($ActionName)) {
        throw "Unknown stack action: $ActionName"
    }
    $action = $Stack.actions[$ActionName]
    $workDir = if ($Stack.subdir) { Join-Path $Root $Stack.subdir } else { $Root }
    $composeFull = Join-Path $workDir $Stack.composeFile
    $timeout = if ($OverrideTimeout -gt 0) { $OverrideTimeout } else { [int]$action.timeout }

    if ($action.kind -eq 'compose_sequence') {
        $allOut = New-Object System.Collections.ArrayList
        $allErr = New-Object System.Collections.ArrayList
        $allCombined = New-Object System.Collections.ArrayList
        $totalSec = 0.0
        foreach ($sub in $action.args) {
            $r = Invoke-StackAction -DockerExe $DockerExe -Root $Root -Stack $Stack -ActionName $sub -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -BarrierPath $BarrierPath -BarrierObj $BarrierObj -StreamOutput:$StreamOutput
            foreach ($l in $r.OutLines) { [void]$allOut.Add($l) }
            foreach ($l in $r.ErrLines) { [void]$allErr.Add($l) }
            foreach ($l in $r.CombinedLines) { [void]$allCombined.Add($l) }
            $totalSec += $r.ElapsedSec
            if ($r.Interrupted -or $r.TimedOut -or $r.ExitCode -ne 0) {
                return [pscustomobject]@{
                    ExitCode      = $r.ExitCode
                    TimedOut      = $r.TimedOut
                    Interrupted   = $r.Interrupted
                    ElapsedSec    = [Math]::Round($totalSec, 3)
                    StdOut        = ($allOut -join "`n")
                    StdErr        = ($allErr -join "`n")
                    OutLines      = @($allOut.ToArray())
                    ErrLines      = @($allErr.ToArray())
                    CombinedLines = @($allCombined.ToArray())
                }
            }
        }
        return [pscustomobject]@{
            ExitCode      = 0
            TimedOut      = $false
            Interrupted   = $false
            ElapsedSec    = [Math]::Round($totalSec, 3)
            StdOut        = ($allOut -join "`n")
            StdErr        = ($allErr -join "`n")
            OutLines      = @($allOut.ToArray())
            ErrLines      = @($allErr.ToArray())
            CombinedLines = @($allCombined.ToArray())
        }
    }

    $envMap = @{}
    foreach ($k in $BaseEnv.Keys) { $envMap[$k] = $BaseEnv[$k] }
    $envMap['TPL_RUN_ID'] = $RunId

    # Builds and pulls do not request a Compose project container.

    if ($action.extra -eq 'build' -or $action.extra -eq 'build_pull') {
        $bArgs = @('compose', '-p', $EphemeralProject, '-f', $composeFull)
        if ($action.profile) { $bArgs += @('--profile', $action.profile) }
        $bArgs += @('build', $action.service)
        $bRes = Invoke-External -FilePath $DockerExe -Arguments $bArgs -WorkingDirectory $workDir -Environment $envMap -TimeoutSeconds $timeout -StreamOutput:$StreamOutput
        if ($bRes.Interrupted -or $bRes.TimedOut -or $bRes.ExitCode -ne 0) { return $bRes }
    }
    if ($action.extra -eq 'pull' -or $action.extra -eq 'build_pull') {
        $pArgs = @('compose', '-p', $EphemeralProject, '-f', $composeFull)
        if ($action.profile) { $pArgs += @('--profile', $action.profile) }
        $pArgs += @('pull', '--ignore-buildable', '--policy', 'missing')
        $pRes = Invoke-External -FilePath $DockerExe -Arguments $pArgs -WorkingDirectory $workDir -Environment $envMap -TimeoutSeconds $timeout -StreamOutput:$StreamOutput
        if ($pRes.Interrupted -or $pRes.TimedOut -or $pRes.ExitCode -ne 0) { return $pRes }
    }

    $serviceArgs = @('compose','-p',$EphemeralProject,'-f',$composeFull)
    if ($action.profile) { $serviceArgs += @('--profile',$action.profile) }
    $services = @($action.service)
    if ($action.kind -eq 'compose_with_deps') { $services += @($action.extra -split ',') }
    Assert-LocalImages $DockerExe $workDir $serviceArgs $services $envMap
    if ($action.kind -eq 'compose_with_deps') {
        $deps = @($action.extra -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
        $upArgs = @('compose', '-p', $EphemeralProject, '-f', $composeFull)
        if ($action.profile) { $upArgs += @('--profile', $action.profile) }
        Set-CreateRequest $BarrierPath $BarrierObj '' $deps
        $upArgs = Join-ArgList @($upArgs, 'up', '-d', '--no-deps', '--no-recreate', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '45', $deps)
        $upRes = Invoke-External -FilePath $DockerExe -Arguments $upArgs -WorkingDirectory $workDir -Environment $envMap -TimeoutSeconds 75 -StreamOutput:$StreamOutput
        if (Test-RequestObserved $DockerExe $Root $BarrierObj) {
            $BarrierObj.createConfirmed = $true
            Write-JsonAtomic $BarrierPath $BarrierObj
        }
        if (-not $BarrierObj.createConfirmed -and $upRes.ExitCode -eq 0) { $upRes.ExitCode = 125 }
        if ($upRes.Interrupted -or $upRes.TimedOut -or $upRes.ExitCode -ne 0) { return $upRes }
    }

    $runArgs = @('compose', '-p', $EphemeralProject, '-f', $composeFull)
    if ($action.profile) { $runArgs += @('--profile', $action.profile) }
    $resultDir = Join-Path $Root ".dev-runtime\runs\$RunId"
    $token = New-RunId
    Set-CreateRequest $BarrierPath $BarrierObj $token @()
    $runArgs = Join-ArgList @($runArgs, 'run', '--name', "$EphemeralProject-$token", '--rm', '-T', '--no-deps', '--pull', 'never',
        '-e', "TPL_STEP_NAME=$ActionName", '-e', "TPL_STEP_TOKEN=$token",
        '--volume', "${resultDir}:/run/template-result", $action.service, $action.args)
    $res = Invoke-External -FilePath $DockerExe -Arguments $runArgs -WorkingDirectory $workDir -Environment $envMap -TimeoutSeconds $timeout -StreamOutput:$StreamOutput
    Finish-StepRequest $DockerExe $Root $BarrierPath $BarrierObj $res $ActionName
    return $res
}

# ------------------------------------------------------------------ Coordinated Verify

function Invoke-CoordinatedVerify {
    param(
        [string]$DockerExe,
        [string]$Root,
        [object]$Scaffold,
        [hashtable]$Stack,
        [string]$EphemeralProject,
        [string]$RunId,
        [hashtable]$BaseEnv,
        [string]$BarrierPath,
        [hashtable]$BarrierObj,
        [string[]]$FilterArgs
    )
    $runDir = Join-Path $Root ".dev-runtime\runs\$RunId"
    $stepsDir = Join-Path $runDir 'steps'
    New-Item -ItemType Directory -Path $stepsDir -Force | Out-Null

    # 1. Scaffold-only (no stack): direct verify.py --run-id inside scaffold container
    if ($null -eq $Stack) {
        $pyArgs = Join-ArgList @('verify.py', '--run-id', $RunId, $FilterArgs)
        $r = Invoke-ScaffoldRun -DockerExe $DockerExe -Root $Root -Scaffold $Scaffold -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -PyArgs $pyArgs -TimeoutSeconds ([int]$Scaffold.timeout) -BarrierPath $BarrierPath -BarrierObj $BarrierObj -StreamOutput
        if ($r.Interrupted) { return $EXIT_INTERRUPTED }
        if ($r.TimedOut) { return $EXIT_RED }
        return $r.ExitCode
    }

    # 2. Combined (stack + scaffold): 3-phase emit-plan -> per-step -> finalize
    $planArgs = Join-ArgList @('verify.py', '--emit-plan', $RunId, $FilterArgs)
    $planRes = Invoke-ScaffoldRun -DockerExe $DockerExe -Root $Root -Scaffold $Scaffold -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -PyArgs $planArgs -TimeoutSeconds 60 -BarrierPath $BarrierPath -BarrierObj $BarrierObj
    if ($planRes.Interrupted) { return $EXIT_INTERRUPTED }
    if ($planRes.TimedOut -or $planRes.ExitCode -ne 0) {
        if ($planRes.StdOut) { [Console]::Out.WriteLine($planRes.StdOut) }
        if ($planRes.StdErr) { [Console]::Error.WriteLine($planRes.StdErr) }
        return if ($planRes.ExitCode -gt 0) { $planRes.ExitCode } else { $EXIT_RED }
    }

    $plan = Read-JsonFile (Join-Path $runDir 'plan.json')
    if ($null -eq $plan -or $plan.runId -ne $RunId) {
        [Console]::Error.WriteLine("REFUSED: Invalid plan.json for run $RunId")
        return $EXIT_REFUSED
    }

    foreach ($step in @($plan.steps)) {
        $idx = [int]$step.index
        $budgetSec = [int][Math]::Ceiling([double]$step.budget)
        if ($step.executor -eq 'scaffold') {
            $sr = Invoke-ScaffoldRun -DockerExe $DockerExe -Root $Root -Scaffold $Scaffold -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -PyArgs @('verify.py', '--run-step', $RunId, [string]$idx) -TimeoutSeconds ($budgetSec + 30) -BarrierPath $BarrierPath -BarrierObj $BarrierObj
            if ($sr.Interrupted) { return $EXIT_INTERRUPTED }
            if ($sr.TimedOut -or $sr.ExitCode -ne 0) {
                $metaPath = Join-Path $stepsDir "$idx.meta"
                Write-TextAtomic -Path $metaPath -Text "runId=$RunId`nindex=$idx`nlabel=$($step.label)`ncode=$($sr.ExitCode)`ntimed_out=$($sr.TimedOut.ToString().ToLowerInvariant())`nseconds=$($sr.ElapsedSec)`n"
                Write-TextAtomic -Path (Join-Path $stepsDir "$idx.out") -Text ($sr.CombinedLines -join "`n")
            }
            continue
        }

        # Stack step (with optional scaffold guard adapter before/after)
        $hasGuard = ($null -ne $step.guard)
        $guardAdapter = if ($hasGuard) { [string]$step.guard.adapter } else { '' }
        $guardArgs = if ($hasGuard -and $null -ne $step.guard.args) { Join-ArgList @($step.guard.args) } else { [string[]]@() }

        if ($hasGuard) {
            $cleanPy = Join-ArgList @($guardAdapter, '--clean-only', $guardArgs)
            $cleanRes = Invoke-ScaffoldRun -DockerExe $DockerExe -Root $Root -Scaffold $Scaffold -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -PyArgs $cleanPy -TimeoutSeconds 60 -BarrierPath $BarrierPath -BarrierObj $BarrierObj
            if ($cleanRes.Interrupted) { return $EXIT_INTERRUPTED }
            if ($cleanRes.ExitCode -ne 0) {
                Write-TextAtomic -Path (Join-Path $stepsDir "$idx.meta") -Text "runId=$RunId`nindex=$idx`nlabel=$($step.label)`ncode=$($cleanRes.ExitCode)`ntimed_out=false`nseconds=$($cleanRes.ElapsedSec)`n"
                Write-TextAtomic -Path (Join-Path $stepsDir "$idx.out") -Text ($cleanRes.CombinedLines -join "`n")
                continue
            }
        }

        $actionRes = Invoke-StackAction -DockerExe $DockerExe -Root $Root -Stack $Stack -ActionName ([string]$step.action) -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -BarrierPath $BarrierPath -BarrierObj $BarrierObj -OverrideTimeout $budgetSec
        if ($actionRes.Interrupted) { return $EXIT_INTERRUPTED }

        $combinedLines = Join-ArgList @($actionRes.CombinedLines)
        $finalCode = $actionRes.ExitCode
        $totalSec = [double]$actionRes.ElapsedSec

        if ($hasGuard -and -not $actionRes.TimedOut) {
            $checkPy = Join-ArgList @($guardAdapter, '--check-only', '--exit-code', [string]$actionRes.ExitCode, $guardArgs)
            $checkRes = Invoke-ScaffoldRun -DockerExe $DockerExe -Root $Root -Scaffold $Scaffold -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -PyArgs $checkPy -TimeoutSeconds 60 -BarrierPath $BarrierPath -BarrierObj $BarrierObj
            if ($checkRes.Interrupted) { return $EXIT_INTERRUPTED }
            $combinedLines = Join-ArgList @($combinedLines, $checkRes.CombinedLines)
            if ($finalCode -eq 0) { $finalCode = $checkRes.ExitCode }
            $totalSec = [Math]::Round($totalSec + $checkRes.ElapsedSec, 3)
        }

        Write-TextAtomic -Path (Join-Path $stepsDir "$idx.meta") -Text "runId=$RunId`nindex=$idx`nlabel=$($step.label)`ncode=$finalCode`ntimed_out=$($actionRes.TimedOut.ToString().ToLowerInvariant())`nseconds=$totalSec`n"
        Write-TextAtomic -Path (Join-Path $stepsDir "$idx.out") -Text ($combinedLines -join "`n")
    }

    $finRes = Invoke-ScaffoldRun -DockerExe $DockerExe -Root $Root -Scaffold $Scaffold -EphemeralProject $EphemeralProject -RunId $RunId -BaseEnv $BaseEnv -PyArgs @('verify.py', '--finalize', $RunId) -TimeoutSeconds 300 -BarrierPath $BarrierPath -BarrierObj $BarrierObj -StreamOutput
    if ($finRes.Interrupted) { return $EXIT_INTERRUPTED }
    if ($finRes.TimedOut) { return $EXIT_RED }
    return $finRes.ExitCode
}

# ------------------------------------------------------------------ Main

function Main([string[]]$InputArgs) {
    $root = Get-CanonicalRoot $PSCommandPath
    $checkoutId = Get-CheckoutId $root
    $runtimeDir = Join-Path $root '.dev-runtime'
    $lockPath = Join-Path $runtimeDir 'checkout.lock'
    $barrierPath = Join-Path $runtimeDir 'barrier.json'
    $demoPath = Join-Path $runtimeDir 'demo.json'

    $argArr = @($InputArgs | Where-Object { $null -ne $_ })
    if (@($argArr).Count -eq 0) {
        [Console]::Out.WriteLine("Usage: dev.cmd <prepare|verify|build|start|stop|status>")
        return $EXIT_REFUSED
    }
    $command = [string]$argArr[0]
    [string[]]$rest = @()
    if (@($argArr).Count -gt 1) {
        $rest = Join-ArgList @($argArr[1..(@($argArr).Count - 1)])
    }

    $scaffold = Read-ScaffoldContract $root
    if ($null -ne $scaffold) { $scaffold.image = "$($scaffold.image)-$checkoutId" }
    $stack = Read-StackContract $root
    $workDir = if ($null -ne $stack -and $stack.subdir) { Join-Path $root $stack.subdir } else { $root }
    $stackCompose = if ($null -ne $stack) { Join-Path $workDir $stack.composeFile } else { '' }

    if ($command -eq 'status') {
        $barrierState = if (Test-Path -LiteralPath $barrierPath) { "PRESENT ($barrierPath)" } else { 'clear' }
        $demoState = 'stopped'
        if (Test-Path -LiteralPath $demoPath) {
            $exe = Resolve-Executable 'docker'
            if ($exe -and -not (Test-DockerReady $exe $root)) {
                $demoState = Get-DemoStatus $exe $root $checkoutId $demoPath
                if ($demoState -eq 'running') { $demoState += " url=$((Read-JsonFile $demoPath).url)" }
            } else { $demoState = 'indeterminate' }
        }
        $mode = if ($null -ne $stack -and $null -ne $scaffold) { "combined ($($stack.id)+scaffold)" } elseif ($null -ne $stack) { "stack ($($stack.id))" } elseif ($null -ne $scaffold) { 'scaffold' } else { 'unconfigured' }
        [Console]::Out.WriteLine("checkoutId=$checkoutId")
        [Console]::Out.WriteLine("mode=$mode")
        [Console]::Out.WriteLine("root=$root")
        [Console]::Out.WriteLine("barrier=$barrierState")
        [Console]::Out.WriteLine("demo=$demoState")
        if ($demoState -eq 'indeterminate') { return $EXIT_REFUSED }
        return $EXIT_OK
    }

    $allowed = @('prepare', 'verify', 'build', 'start', 'stop', 'check-commit-msg')
    if ($null -ne $stack) { $allowed += $stack.extraNames }
    if ($command -notin $allowed) {
        [Console]::Error.WriteLine("REFUSED: Unknown command '$command'. Allowed: $($allowed -join ', '), status")
        return $EXIT_REFUSED
    }

    $dockerExe = Resolve-Executable 'docker'
    if (-not $dockerExe) {
        [Console]::Error.WriteLine("REFUSED: 'docker' CLI not found on PATH.")
        return $EXIT_REFUSED
    }
    $dockerProblem = Test-DockerReady -DockerExe $dockerExe -Root $root
    if ($dockerProblem) {
        [Console]::Error.WriteLine("REFUSED: $dockerProblem")
        return $EXIT_REFUSED
    }

    if ($command -eq 'check-commit-msg') {
        if ($null -eq $scaffold) {
            [Console]::Error.WriteLine("REFUSED: check-commit-msg requires scaffold.")
            return $EXIT_REFUSED
        }
        $displayPath = if (@($rest).Count -ge 1) { [string]$rest[0] } else { 'stdin' }
        $stdinText = [Console]::In.ReadToEnd()
        $stdinBytes = [System.Text.Encoding]::UTF8.GetBytes($stdinText)
        $boardDir = Join-Path $root 'tools\board'
        $cmArgs = @('run', '--pull', 'never', '--rm', '-i', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000',
                    '-v', "${boardDir}:/workspace/tools/board:ro", '-w', '/workspace',
                    '-e', 'PYTHONDONTWRITEBYTECODE=1', '-e', 'PYTHONUTF8=1',
                    [string]$scaffold.image, 'python3', 'tools/board/commit_message.py', '-', $displayPath)
        $cmRes = Invoke-External -FilePath $dockerExe -Arguments $cmArgs -WorkingDirectory $root -TimeoutSeconds 30 -StreamOutput -StdinBytes $stdinBytes
        return $cmRes.ExitCode
    }

    if ($null -eq $stack -and $null -eq $scaffold) {
        [Console]::Error.WriteLine("REFUSED: Neither tools/stack.txt nor tools/board/scaffold.json exists in $root")
        return $EXIT_REFUSED
    }

    $lockHandle = Acquire-CheckoutLock $lockPath
    if ($null -eq $lockHandle) {
        [Console]::Error.WriteLine("BUSY: Another operation holds checkout $checkoutId ($lockPath). Wait for it to finish.")
        return $EXIT_BUSY
    }

    $runId = New-RunId
    $ephemeralProject = "tpl-$checkoutId-r-$runId"
    $demoProject = "tpl-$checkoutId-demo"
    $baseEnv = @{
        'TPL_CHECKOUT_ID'   = $checkoutId
        'TPL_UID'           = '1000'
        'TPL_GID'           = '1000'
        'TPL_USER'          = '1000:1000'
        'TPL_ROOT'          = $root
        'TPL_HOST_OS'       = 'windows'
        'TPL_VERDICT_OWNER' = if ($command -eq 'verify' -and $null -ne $scaffold) { 'scaffold' } else { 'stack' }
    }

    $gitScratch = $null
    try {
        if ($null -ne $scaffold) { $baseEnv['TPL_SCAFFOLD_IMAGE'] = [string]$scaffold.image }
        if ($null -ne $scaffold -and $command -eq 'verify') {
            $gitArguments = @()
            if (Test-Path -LiteralPath (Join-Path $root '.git')) {
                $gitScratch = [IO.Directory]::CreateDirectory((Join-Path ([IO.Path]::GetTempPath()) ('tpl-git-' + [guid]::NewGuid().ToString('N'))))
                $view = Join-Path $root 'tools/board/git-view.ps1'
                $gitArguments = @('-e','GIT_CONFIG_COUNT=1','-e','GIT_CONFIG_KEY_0=include.path','-e','GIT_CONFIG_VALUE_0=/run/template-git-workspace/config')
                foreach ($spec in @(& $view $root workspace $gitScratch.FullName ro)) { $gitArguments += @('--volume',$spec) }
            }
            $scaffold | Add-Member -NotePropertyName gitArguments -NotePropertyValue $gitArguments
        }
        if ($null -ne $stack -and @($stack.volumes).Count -gt 0) {
            $volEnv = Ensure-CacheVolumes -DockerExe $dockerExe -Root $root -CheckoutId $checkoutId -VolumeNames $stack.volumes
            foreach ($k in $volEnv.Keys) { $baseEnv[$k] = $volEnv[$k] }
        }

        if ($command -eq 'stop') {
            if ((Get-DemoStatus $dockerExe $root $checkoutId $demoPath) -eq 'indeterminate') {
                [Console]::Error.WriteLine("REFUSED: Cannot establish demo request or engine identity. Inspect $demoPath.")
                return $EXIT_REFUSED
            }
            $cleanDemo = Remove-EphemeralProject -DockerExe $dockerExe -WorkDir $workDir -ComposeFile $stackCompose -ProjectName $demoProject -Env $baseEnv
            if (-not $cleanDemo.Ok) {
                [Console]::Error.WriteLine("REFUSED: Could not confirm stop of ${demoProject}: $($cleanDemo.Error)")
                return $EXIT_REFUSED
            }
            Remove-FileWithRetry -Path $demoPath
            [Console]::Out.WriteLine("RESULT: demo stopped ($demoProject)")
            return $EXIT_OK
        }

        $recoverCompose = if ($stackCompose) { $stackCompose } elseif ($null -ne $scaffold) { Join-Path $root ([string]$scaffold.composeFile) } else { '' }
        if (-not (Resolve-StaleBarrier -DockerExe $dockerExe -Root $root -CheckoutId $checkoutId -BarrierPath $barrierPath -ComposeFile $recoverCompose -Env $baseEnv)) {
            return $EXIT_REFUSED
        }

        if ($command -eq 'start') {
            $serviceKey = 'demo'
            if (@($rest).Count -gt 0 -and $rest[0] -eq '--preview') {
                $serviceKey = 'preview'
                $rest = @($rest | Select-Object -Skip 1)
            }
            if ($null -eq $stack -or $null -eq $stack[$serviceKey]) {
                [Console]::Error.WriteLine("REFUSED: This project does not define a demo service.")
                return $EXIT_REFUSED
            }
            $demo = $stack[$serviceKey]
            $port = [int]$demo.hostPort
            if (@($rest).Count -eq 2 -and $rest[0] -eq '--port') {
                if (-not ($rest[1] -match '^\d+$') -or [int]$rest[1] -lt 0 -or [int]$rest[1] -gt 65535) {
                    [Console]::Error.WriteLine("REFUSED: Invalid --port value '$($rest[1])'")
                    return $EXIT_REFUSED
                }
                $port = [int]$rest[1]
            } elseif (@($rest).Count -gt 0) {
                [Console]::Error.WriteLine("REFUSED: Unsupported start arguments.")
                return $EXIT_REFUSED
            }
            $baseEnv['TPL_DEMO_PORT'] = [string]$port
            $baseEnv['TPL_RUN_ID'] = $runId
            $previous = Get-DemoStatus $dockerExe $root $checkoutId $demoPath
            if ($previous -ne 'stopped') {
                [Console]::Error.WriteLine("REFUSED: Demo is $previous. Use status and stop before starting it again.")
                return $EXIT_REFUSED
            }
            Assert-LocalImages $dockerExe $workDir @('compose','-p',$demoProject,'-f',$stackCompose,'--profile',[string]$demo.profile) @([string]$demo.service) $baseEnv
            $demoMarker = @{schemaVersion=1; engineId=$script:EngineId; checkoutId=$checkoutId; project=$demoProject; service=$demo.service; state='starting'; url=''; startedUtc=[DateTime]::UtcNow.ToString('o')}
            Write-JsonAtomic $demoPath $demoMarker
            $upArgs = @('compose', '-p', $demoProject, '-f', $stackCompose, '--profile', [string]$demo.profile, 'up', '-d', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '90', [string]$demo.service)
            $upRes = Invoke-External -FilePath $DockerExe -Arguments $upArgs -WorkingDirectory $workDir -Environment $baseEnv -TimeoutSeconds 120 -StreamOutput
            if ($upRes.Interrupted) { return $EXIT_INTERRUPTED }
            if ($upRes.TimedOut -or $upRes.ExitCode -ne 0) {
                if ((Get-DemoStatus $dockerExe $root $checkoutId $demoPath) -ne 'indeterminate') {
                    $clean = Remove-EphemeralProject $dockerExe $workDir $stackCompose $demoProject $baseEnv
                    if ($clean.Ok) { Remove-FileWithRetry -Path $demoPath }
                }
                [Console]::Error.WriteLine("FAILED: demo start failed (exit $($upRes.ExitCode)).")
                return $EXIT_RED
            }
            $portQuery = Invoke-External -FilePath $dockerExe -Arguments @('compose', '-p', $demoProject, '-f', $stackCompose, '--profile', [string]$demo.profile, 'port', [string]$demo.service, [string]$demo.containerPort) -WorkingDirectory $workDir -Environment $baseEnv -TimeoutSeconds $DOCKER_QUICK_TIMEOUT
            $bound = $portQuery.StdOut.Trim()
            if ($portQuery.ExitCode -ne 0 -or $bound -notmatch '^127\.0\.0\.1:[1-9][0-9]*$') {
                $clean = Remove-EphemeralProject $dockerExe $workDir $stackCompose $demoProject $baseEnv
                if ($clean.Ok) { Remove-FileWithRetry -Path $demoPath }
                [Console]::Error.WriteLine("REFUSED: Demo service did not bind a loopback port (got '$bound').")
                return $EXIT_REFUSED
            }
            $url = "http://$bound"
            $demoMarker.state = 'running'
            $demoMarker.url = $url
            Write-JsonAtomic $demoPath $demoMarker
            [Console]::Out.WriteLine("RESULT: demo ready at $url ($demoProject)")
            return $EXIT_OK
        }

        # Ephemeral lifecycle operations: prepare, verify, build, or extra stack action
        $runDir = Join-Path $runtimeDir "runs\$runId"
        New-Item -ItemType Directory -Path $runDir -Force | Out-Null

        $barrierObj = @{
            schemaVersion    = 1
            checkoutId       = $checkoutId
            checkoutPath     = $root
            runId            = $runId
            action           = $command
            ephemeralProject = $ephemeralProject
            engineId         = $script:EngineId
            stepToken        = ''
            services         = @()
            createConfirmed  = $true
            startedUtc       = [DateTime]::UtcNow.ToString('o')
        }
        Write-JsonAtomic -Path $barrierPath -Obj $barrierObj

        $overallExit = $EXIT_OK
        $wasInterrupted = $false
        $needsVerdict = ($command -eq 'verify' -or $command -eq 'build')

        try {
            if ($command -eq 'prepare') {
                if ($null -ne $scaffold) {
                    $scfCf = Join-Path $root ([string]$scaffold.composeFile)
                    $scfEnv = $baseEnv.Clone()
                    $scfEnv['COMPOSE_IGNORE_ORPHANS'] = 'true'
                    $bRes = Invoke-External -FilePath $dockerExe -Arguments @('compose', '-p', $ephemeralProject, '-f', $scfCf, 'build', [string]$scaffold.service) -WorkingDirectory $root -Environment $scfEnv -TimeoutSeconds 600 -StreamOutput
                    if ($bRes.Interrupted) { $wasInterrupted = $true; $overallExit = $EXIT_INTERRUPTED }
                    elseif ($bRes.TimedOut -or $bRes.ExitCode -ne 0) { $overallExit = $EXIT_RED }
                    else {
                        $barrierObj['createConfirmed'] = $true
                        Write-JsonAtomic -Path $barrierPath -Obj $barrierObj
                    }
                }
                if ($overallExit -eq $EXIT_OK -and $null -ne $stack) {
                    $sr = Invoke-StackAction -DockerExe $dockerExe -Root $root -Stack $stack -ActionName 'prepare' -EphemeralProject $ephemeralProject -RunId $runId -BaseEnv $baseEnv -BarrierPath $barrierPath -BarrierObj $barrierObj -StreamOutput
                    if ($sr.Interrupted) { $wasInterrupted = $true; $overallExit = $EXIT_INTERRUPTED }
                    elseif ($sr.TimedOut -or $sr.ExitCode -ne 0) { $overallExit = if ($sr.ExitCode -eq 125) { $EXIT_REFUSED } else { $EXIT_RED } }
                }
            } elseif ($command -eq 'verify' -and $null -ne $scaffold) {
                $overallExit = Invoke-CoordinatedVerify -DockerExe $dockerExe -Root $root -Scaffold $scaffold -Stack $stack -EphemeralProject $ephemeralProject -RunId $runId -BaseEnv $baseEnv -BarrierPath $barrierPath -BarrierObj $barrierObj -FilterArgs $rest
                if ($overallExit -eq $EXIT_INTERRUPTED) { $wasInterrupted = $true }
            } elseif ($command -eq 'verify') {
                # Stack standalone verify
                $stepList = @()
                foreach ($stepName in $stack.verifySteps) {
                    $sr = Invoke-StackAction -DockerExe $dockerExe -Root $root -Stack $stack -ActionName $stepName -EphemeralProject $ephemeralProject -RunId $runId -BaseEnv $baseEnv -BarrierPath $barrierPath -BarrierObj $barrierObj -StreamOutput
                    $stepList += @{ step = $stepName; exitCode = $sr.ExitCode; elapsedSec = $sr.ElapsedSec }
                    if ($sr.Interrupted) { $wasInterrupted = $true; $overallExit = $EXIT_INTERRUPTED; break }
                    if ($sr.TimedOut -or $sr.ExitCode -ne 0) { $overallExit = if ($sr.ExitCode -eq 125) { $EXIT_REFUSED } else { $EXIT_RED }; break }
                }
            } elseif ($command -eq 'build' -or ($null -ne $stack -and $command -in $stack.extraNames)) {
                if ($null -eq $stack) {
                    [Console]::Error.WriteLine("REFUSED: Command '$command' requires a stack.")
                    $overallExit = $EXIT_REFUSED
                    $barrierObj['createConfirmed'] = $true
                } else {
                    $sr = Invoke-StackAction -DockerExe $dockerExe -Root $root -Stack $stack -ActionName $command -EphemeralProject $ephemeralProject -RunId $runId -BaseEnv $baseEnv -BarrierPath $barrierPath -BarrierObj $barrierObj -StreamOutput
                    if ($sr.Interrupted) { $wasInterrupted = $true; $overallExit = $EXIT_INTERRUPTED }
                    elseif ($sr.TimedOut -or $sr.ExitCode -ne 0) { $overallExit = if ($sr.ExitCode -eq 125) { $EXIT_REFUSED } else { $EXIT_RED } }
                }
            }
        } finally {
            if (-not $barrierObj.createConfirmed -and (Test-RequestObserved $dockerExe $root $barrierObj)) {
                $barrierObj.createConfirmed = $true
                Write-JsonAtomic $barrierPath $barrierObj
            }
            $clean = Remove-EphemeralProject -DockerExe $dockerExe -WorkDir $workDir -ComposeFile $recoverCompose -ProjectName $ephemeralProject -Env $baseEnv
            if (-not $clean.Ok) {
                [Console]::Error.WriteLine("REFUSED: Ephemeral cleanup could not be confirmed: $($clean.Error). Barrier kept at $barrierPath.")
                $overallExit = $EXIT_REFUSED
            } elseif (-not $barrierObj['createConfirmed']) {
                [Console]::Error.WriteLine("REFUSED: Run ended without confirmed Docker create (createConfirmed=false). Barrier kept at $barrierPath.")
                $overallExit = $EXIT_REFUSED
            } else {
                Remove-FileWithRetry -Path $barrierPath
            }
        }

        if ($overallExit -eq $EXIT_OK -and -not $wasInterrupted) {
            if ($needsVerdict) {
                $verdictPath = Join-Path $runDir 'verdict.json'
                if ($command -eq 'build' -or $null -eq $scaffold) {
                    Write-JsonAtomic -Path $verdictPath -Obj @{runId=$runId; status='GREEN'; operation=$command}
                }
                if (-not (Test-Path -LiteralPath $verdictPath)) {
                    [Console]::Error.WriteLine("REFUSED: Missing fresh run verdict at $verdictPath for run $runId.")
                    return $EXIT_REFUSED
                }
                $v = Read-JsonFile $verdictPath
                if ($null -eq $v -or $v.runId -ne $runId -or $v.status -ne 'GREEN') {
                    [Console]::Error.WriteLine("REFUSED: Run verdict mismatch or non-GREEN for run $runId.")
                    return $EXIT_REFUSED
                }
            }
            [Console]::Out.WriteLine("RESULT: $command GREEN (checkout=$checkoutId run=$runId)")
            return $EXIT_OK
        }

        if ($wasInterrupted) {
            [Console]::Error.WriteLine("RESULT: $command INTERRUPTED (checkout=$checkoutId run=$runId)")
        } else {
            [Console]::Error.WriteLine("RESULT: $command FAILED exit=$overallExit (checkout=$checkoutId run=$runId)")
        }
        return $overallExit
    } finally {
        Release-CheckoutLock $lockHandle
        if ($null -ne $gitScratch) {
            foreach ($file in $gitScratch.GetFiles()) { $file.Delete() }
            $gitScratch.Delete()
        }
    }
}

$priorDockerContext = $env:DOCKER_CONTEXT
try { $code = Main $CliArgs } finally { $env:DOCKER_CONTEXT = $priorDockerContext }
exit $code
