# Check if running with Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevating permissions to configure mpopro.local in Windows hosts file..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1`tmpopro.local"

if (-not (Test-Path $hostsPath)) {
    Write-Error "Windows hosts file not found at: $hostsPath"
    exit 1
}

$content = Get-Content $hostsPath -Raw
if ($content -match "\bmpopro\.local\b") {
    Write-Host "[OK] mpopro.local is already registered in hosts file." -ForegroundColor Green
} else {
    Add-Content -Path $hostsPath -Value "`n# MPO-pro Overlay Domain Alias`n$entry"
    Write-Host "[SUCCESS] Added '127.0.0.1 mpopro.local' to $hostsPath" -ForegroundColor Green
}

# Flush DNS resolver cache
Clear-DnsClientCache
Write-Host "[SUCCESS] DNS cache flushed. http://mpopro.local:4848 is ready!" -ForegroundColor Green
Start-Sleep -Seconds 2
