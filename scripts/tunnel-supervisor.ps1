param(
    [int]$PreferredPort = 3000
)

# Bless Writes tunnel supervisor
# - Starts the production Next.js server if it is not already running.
# - Starts a Cloudflare quick tunnel and keeps both alive.
# - Writes the current URL and a QR page to the Desktop.
# Runs at logon through the "Bless Books Phone Tunnel" scheduled task.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $env:LOCALAPPDATA "BlessBooksTunnel"
$desktop = [Environment]::GetFolderPath("Desktop")
if ([string]::IsNullOrWhiteSpace($desktop)) {
    $desktop = Join-Path $env:USERPROFILE "Desktop"
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
if (-not (Test-Path $desktop)) {
    New-Item -ItemType Directory -Force -Path $desktop | Out-Null
}

$logPath = Join-Path $stateDir "supervisor.log"
$urlPath = Join-Path $stateDir "current-url.txt"
$htmlPath = Join-Path $desktop "Bless Writes Phone Preview.html"
$cloudflared = Join-Path $stateDir "cloudflared.exe"

$mutex = New-Object System.Threading.Mutex($false, "Local\BlessBooksTunnelSupervisor")
$hasMutex = $false

try {
    $hasMutex = $mutex.WaitOne(0)
    if (-not $hasMutex) {
        exit 0
    }

    function Write-Log([string]$Message) {
        $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
        Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
    }

    function Test-TcpPort([int]$Port) {
        $client = $null
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
            if (-not $async.AsyncWaitHandle.WaitOne(700)) {
                return $false
            }
            $client.EndConnect($async)
            return $true
        }
        catch {
            return $false
        }
        finally {
            if ($client) {
                $client.Close()
            }
        }
    }

    function Test-BlessBooks([int]$Port) {
        try {
            $response = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/" -f $Port) -UseBasicParsing -TimeoutSec 3
            return ($response.StatusCode -eq 200 -and $response.Content -match "Bless Writes")
        }
        catch {
            return $false
        }
    }

    function Wait-ForPort([int]$Port, [int]$Seconds) {
        for ($i = 0; $i -lt ($Seconds * 2); $i++) {
            if (Test-TcpPort $Port) {
                return $true
            }
            Start-Sleep -Milliseconds 500
        }
        return $false
    }

    function Ensure-Cloudflared {
        if (Test-Path $cloudflared) {
            return $true
        }

        Write-Log "Downloading cloudflared..."
        $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "amd64" }
        $uri = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-$arch.exe"

        try {
            $ProgressPreference = "SilentlyContinue"
            Invoke-WebRequest -Uri $uri -OutFile $cloudflared -UseBasicParsing -TimeoutSec 300
            Write-Log "Downloaded cloudflared."
            return $true
        }
        catch {
            Write-Log "cloudflared download failed: $($_.Exception.Message)"
            return $false
        }
    }

    function Ensure-Build {
        $buildId = Join-Path $root ".next\BUILD_ID"
        if (Test-Path $buildId) {
            return $true
        }

        Write-Log "No production build found; running npm run build..."
        $out = Join-Path $stateDir "build.out.log"
        $err = Join-Path $stateDir "build.err.log"
        $process = Start-Process -FilePath $env:ComSpec -ArgumentList @("/c", "npm run build") -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
        $process.WaitForExit()

        if ($process.ExitCode -eq 0 -and (Test-Path $buildId)) {
            Write-Log "Build completed."
            return $true
        }

        Write-Log "Build failed with exit code $($process.ExitCode)."
        return $false
    }

    function Find-SitePort {
        if (Test-TcpPort $PreferredPort) {
            if (Test-BlessBooks $PreferredPort) {
                return $PreferredPort
            }
        }
        else {
            return $PreferredPort
        }

        for ($port = $PreferredPort + 1; $port -le $PreferredPort + 20; $port++) {
            if (-not (Test-TcpPort $port)) {
                return $port
            }
        }

        return $null
    }

    function Start-Site([int]$Port) {
        Write-Log "Starting site on port $Port..."
        $out = Join-Path $stateDir "server.out.log"
        $err = Join-Path $stateDir "server.err.log"
        $command = "npm start -- -p $Port"
        $process = Start-Process -FilePath $env:ComSpec -ArgumentList @("/c", $command) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru

        if (Wait-ForPort $Port 120) {
            Write-Log "Site is up on port $Port."
            return $process
        }

        Write-Log "Site did not become ready on port $Port."
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        return $null
    }

    function Publish-TunnelUrl([string]$Url) {
        Set-Content -LiteralPath $urlPath -Value $Url -Encoding UTF8

        $encoded = [uri]::EscapeDataString($Url)
        $qr = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&amp;margin=16&amp;data=$encoded"

        $html = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bless Writes - Phone Preview</title>
<style>
  body { font-family: Georgia, serif; background: #faf7f1; color: #221f1b; margin: 0; padding: 32px; }
  main { max-width: 680px; margin: 0 auto; background: #fdfbf7; border: 1px solid #e7decc; border-radius: 20px; padding: 28px; }
  h1 { margin: 0 0 8px; font-size: 28px; }
  p { line-height: 1.6; }
  a { color: #3a6049; word-break: break-all; }
  img { display: block; margin: 20px auto; border: 1px solid #e7decc; border-radius: 8px; }
  ul { padding-left: 20px; }
  .note { color: #6f675b; font-size: 14px; }
</style>
</head>
<body>
<main>
  <h1>Bless Writes - Phone Preview</h1>
  <p>Scan this code with your phone, or open the storefront link below:</p>
  <img src="$qr" width="320" height="320" alt="QR code for the Bless Writes phone preview">
  <p><strong>Storefront:</strong> <a href="$Url">$Url</a></p>
  <p><strong>Free excerpts:</strong></p>
  <ul>
    <li><a href="$Url/preview/demo-1">Faith Beyond My Resources</a></li>
    <li><a href="$Url/preview/demo-2">From a Five-Cedi Mat to First Class</a></li>
  </ul>
  <p class="note">This file updates automatically whenever the tunnel starts. The link changes after a reboot.</p>
</main>
</body>
</html>
"@

        Set-Content -LiteralPath $htmlPath -Value $html -Encoding UTF8
        Write-Log "Published tunnel URL: $Url"
    }

    function Start-Tunnel([int]$Port) {
        if (-not (Ensure-Cloudflared)) {
            return $null
        }

        $out = Join-Path $stateDir "cloudflared.out.log"
        $err = Join-Path $stateDir "cloudflared.err.log"
        Remove-Item -LiteralPath $out, $err -Force -ErrorAction SilentlyContinue

        # Force HTTP/2 rather than the default QUIC. Quick tunnels over QUIC drop
        # repeatedly on flaky Wi-Fi ("timeout: no recent network activity") and
        # reconnect every few minutes, which the client sees as intermittent
        # Cloudflare error pages. HTTP/2 keeps the tunnel up on the same network.
        $process = Start-Process -FilePath $cloudflared -ArgumentList @("tunnel", "--url", ("http://localhost:{0}" -f $Port), "--protocol", "http2", "--no-autoupdate") -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
        Write-Log "Starting Cloudflare tunnel to port $Port..."

        $url = $null
        for ($i = 0; $i -lt 120; $i++) {
            Start-Sleep -Milliseconds 500
            $text = ""
            foreach ($file in @($out, $err)) {
                if (Test-Path $file) {
                    try {
                        $text += (Get-Content -LiteralPath $file -Raw -ErrorAction Stop)
                    }
                    catch {
                    }
                }
            }

            # Only accept a quick-tunnel hostname. cloudflared also prints
            # service hostnames such as api.trycloudflare.com in error/help
            # output; those are not usable preview URLs.
            $match = [regex]::Match($text, "https://(?!api\.)[a-z0-9][a-z0-9-]*\.trycloudflare\.com")
            if ($match.Success) {
                $url = $match.Value
                break
            }

            if ($process.HasExited) {
                break
            }
        }

        if ($url) {
            Publish-TunnelUrl $url
            return @{ Process = $process; Url = $url }
        }

        Write-Log "Tunnel URL was not detected; restarting tunnel."
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        return $null
    }

    Write-Log "Supervisor starting."

    if (-not (Ensure-Build)) {
        Write-Log "Cannot continue without a build."
        exit 1
    }

    $sitePort = Find-SitePort
    if ($null -eq $sitePort) {
        Write-Log "No free local port found."
        exit 1
    }

    $siteProcess = $null
    if (-not (Test-TcpPort $sitePort)) {
        $siteProcess = Start-Site $sitePort
        if ($null -eq $siteProcess) {
            exit 1
        }
    }
    else {
        Write-Log "Reusing existing site on port $sitePort."
    }

    $tunnelState = $null
    while ($true) {
        try {
            if (-not (Test-TcpPort $sitePort)) {
                Write-Log "Site is down; restarting..."
                $siteProcess = Start-Site $sitePort
            }

            if ($null -eq $tunnelState -or $tunnelState.Process.HasExited) {
                if ($null -ne $tunnelState) {
                    Write-Log "Tunnel exited; restarting..."
                }
                $tunnelState = Start-Tunnel $sitePort
            }
        }
        catch {
            Write-Log "Supervisor error: $($_.Exception.Message)"
        }

        Start-Sleep -Seconds 10
    }
}
finally {
    if ($hasMutex) {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
