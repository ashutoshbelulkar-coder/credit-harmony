Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.css" |
    ForEach-Object {
        $filePath = $_.FullName
        $content  = Get-Content $filePath -Raw
        # Replace the lighter 0_1px_2px variant (inline chip / subtle elevation = shadow-sm)
        $updated  = $content -replace 'shadow-\[0_1px_2px_rgba\(15,23,42,0\.04\)\]', 'shadow-sm'
        if ($updated -ne $content) {
            Set-Content $filePath $updated -NoNewline
            Write-Host "Updated: $filePath"
        }
    }
Write-Host "Done."
