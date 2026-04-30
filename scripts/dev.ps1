$repoRoot = Split-Path -Parent $PSScriptRoot

function Test-PortInUse {
    param(
        [int]$Port
    )

    return [bool](Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1)
}

if (Test-PortInUse -Port 4000) {
    Write-Host "Backend already appears to be running on http://localhost:4000" -ForegroundColor Yellow
} else {
    Start-Process powershell.exe `
        -WorkingDirectory $repoRoot `
        -ArgumentList @(
            '-NoExit',
            '-Command',
            "Set-Location '$repoRoot'; npm run server"
        ) | Out-Null
    Write-Host "Starting backend on http://localhost:4000" -ForegroundColor Green
}

if (Test-PortInUse -Port 3000) {
    Write-Host "Frontend already appears to be running on http://localhost:3000" -ForegroundColor Yellow
} else {
    Start-Process powershell.exe `
        -WorkingDirectory $repoRoot `
        -ArgumentList @(
            '-NoExit',
            '-Command',
            "`$env:BROWSER='none'; `$env:PORT='3000'; Set-Location '$repoRoot'; npm start"
        ) | Out-Null
    Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Green
}

Write-Host ""
Write-Host "Dev startup launched." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend health: http://localhost:4000/api/health"
