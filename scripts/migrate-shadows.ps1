Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $filePath = $_.FullName
    $content  = Get-Content $filePath -Raw
    $updated  = $content -replace 'shadow-\[0_1px_3px_rgba\(15,23,42,0\.06\)\]', 'shadow-sm'
    if ($updated -ne $content) {
        Set-Content $filePath $updated -NoNewline
        Write-Host "Updated: $filePath"
    }
}
Write-Host "Shadow migration complete."
