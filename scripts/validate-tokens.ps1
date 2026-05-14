Write-Host '--- Remaining rgba(15,23,42) shadows ---'
$hits = Get-ChildItem -Path 'src' -Recurse -Include '*.tsx','*.ts','*.css' |
    Select-String -Pattern 'rgba\(15,23,42'
if ($hits.Count -eq 0) { Write-Host 'CLEAN - no rgba(15,23,42) shadows remain' }
else { $hits | ForEach-Object { Write-Host $_.ToString() } }

Write-Host ''
Write-Host '--- Remaining Tailwind default palette usages ---'
$hits2 = Get-ChildItem -Path 'src' -Recurse -Include '*.tsx','*.ts' |
    Select-String -Pattern 'bg-blue-|text-blue-|bg-orange-|text-orange-|bg-amber-|text-amber-|text-gray-7'
if ($hits2.Count -eq 0) { Write-Host 'CLEAN - no default palette classes remain in tsx/ts' }
else { $hits2 | ForEach-Object { Write-Host $_.ToString() } }

Write-Host ''
Write-Host '--- Hardcoded hex colors in tsx/ts (first 15) ---'
$hits3 = Get-ChildItem -Path 'src' -Recurse -Include '*.tsx','*.ts' |
    Select-String -Pattern '#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b'
if ($hits3.Count -eq 0) { Write-Host 'CLEAN - no hex literals remain' }
else {
    Write-Host "$($hits3.Count) hex literal hits (includes comments/chart color strings):"
    $hits3 | Select-Object -First 15 | ForEach-Object { Write-Host $_.ToString() }
}
Write-Host ''
Write-Host 'Validation complete.'
