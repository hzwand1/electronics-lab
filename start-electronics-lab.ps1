# Electronics Lab launcher - starts the Vite dev server if needed, then opens the browser.
$ErrorActionPreference = 'SilentlyContinue'

$proj = 'C:\Users\793\Doubao\chats\2026-09-14\new-chat\electronics-lab'
$port = 5173
$url  = "http://localhost:$port/"

function Find-Node {
  $fixed = 'C:\Users\793\AppData\Local\Doubao\User Data\sandbox_runtime\bases\c98c5042338ed152c6f10ecd8591889f\node\node.exe'
  if (Test-Path $fixed) { return $fixed }
  $glob = Get-ChildItem "$env:LOCALAPPDATA\Doubao\User Data\sandbox_runtime\bases\*\node\node.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($glob) { return $glob.FullName }
  $pf = 'C:\Program Files\nodejs\node.exe'
  if (Test-Path $pf) { return $pf }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$node = Find-Node
if (-not $node) { exit 2 }

if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $node `
    -ArgumentList 'node_modules/vite/bin/vite.js', '--port', "$port", '--strictPort' `
    -WorkingDirectory $proj -WindowStyle Hidden
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { break }
  }
}

Start-Process $url
