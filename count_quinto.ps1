$data = Invoke-RestMethod -Uri 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json' -Method GET

$seen = @{}
$sections = @{}
for ($i = 0; $i -lt $data.Count; $i++) {
    $s = $data[$i]
    if ($null -eq $s) { continue }
    $id = $s.id
    if ($seen.ContainsKey($id)) { continue }
    $seen[$id] = $true
    $grade = [string]$s.grade
    if ($grade -match '5|quinto|Quinto|QUINTO') {
        $sec = [string]$s.section
        if (-not $sections.ContainsKey($sec)) { $sections[$sec] = 0 }
        $sections[$sec]++
    }
}
Write-Host "=== QUINTO - Alumnos por seccion ==="
foreach ($k in ($sections.Keys | Sort-Object)) {
    Write-Host "  Seccion '$k': $($sections[$k]) alumnos"
}
Write-Host "  TOTAL Quinto: $(($sections.Values | Measure-Object -Sum).Sum)"
