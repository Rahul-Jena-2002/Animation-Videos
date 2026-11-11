$cdpPort = 9222
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileDir = "$PSScriptRoot\chrome-profile"

# Check if CDP port is already bound
$listening = netstat -ano | Select-String ":$cdpPort "
if ($listening) {
    Write-Host "✅ Chrome CDP already running on port $cdpPort — no action needed."
    exit 0
}

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

Write-Host "🚀 Launching Chrome with CDP on port $cdpPort ..."
Start-Process -FilePath $chromePath -ArgumentList @(
    "--remote-debugging-port=$cdpPort",
    "--user-data-dir=$profileDir",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,900",
    "https://flow.google.com"
)

Write-Host ""
Write-Host "👉 Chrome is opening to flow.google.com"
Write-Host "   Log into your Google account if prompted."
Write-Host "   Once logged in, return to Antigravity and use 'flow_generate' to create clips."
