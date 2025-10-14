Param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$venv = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-Not (Test-Path $venv)) {
  Write-Error "Virtual env Python not found at $venv. Create venv and install requirements first."
}

Push-Location $PSScriptRoot
try {
  & $venv -m uvicorn app.main:app --host 0.0.0.0 --port $Port
}
finally {
  Pop-Location
}
