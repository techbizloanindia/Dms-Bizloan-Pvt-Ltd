$url = "http://localhost:3001/api/admin/create-user"
$body = @{
    username = "psuser1"
    password = "test123"
    name = "PowerShell User"
    role = "user"
} | ConvertTo-Json

Write-Host "Sending POST request to $url"
Write-Host "Body: $body"

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "Success! Response:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)"
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)"
    }
} 