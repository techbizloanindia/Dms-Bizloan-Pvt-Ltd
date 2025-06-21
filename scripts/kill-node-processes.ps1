# Kill Node.js processes that might be blocking ports
Write-Host "🔍 Checking for Node.js processes..." -ForegroundColor Blue

# Get all Node.js processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    foreach ($process in $nodeProcesses) {
        Write-Host "  - PID: $($process.Id), Name: $($process.ProcessName)" -ForegroundColor Gray
    }
    
    $choice = Read-Host "Do you want to kill all Node.js processes? (y/n)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        try {
            $nodeProcesses | Stop-Process -Force
            Write-Host "✅ All Node.js processes have been terminated." -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Error killing processes: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "ℹ️  No processes were killed." -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ No Node.js processes found." -ForegroundColor Green
}

# Check specific ports
Write-Host "`n🔍 Checking ports 3000-3005..." -ForegroundColor Blue
$ports = 3000..3005
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "Port $port is in use by: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
    }
    else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
}

Write-Host "`n🚀 Ports checked. You can now start the server." -ForegroundColor Blue 