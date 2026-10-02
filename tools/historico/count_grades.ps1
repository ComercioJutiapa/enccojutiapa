$data = Invoke-RestMethod -Uri 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json' -Method GET
Write-Host "Total entradas Firebase: $($data.Count)"

$seen = @{}
$cuarto = 0; $quinto = 0; $sexto = 0; $otro = 0
for ($i = 0; $i -lt $data.Count; $i++) {
    $s = $data[$i]
    if ($null -eq $s) { Write-Host "NULL en indice $i"; continue }
    $id = $s.id
    if ($seen.ContainsKey($id)) { Write-Host "DUPLICADO id=$id en indice $i (nombre: $($s.firstName) $($s.lastName1))"; continue }
    $seen[$id] = $true
    $grade = [string]$s.grade
    if ($grade -match '4|cuarto|Cuarto|CUARTO') { $cuarto++ }
    elseif ($grade -match '5|quinto|Quinto|QUINTO') { $quinto++ }
    elseif ($grade -match '6|sexto|Sexto|SEXTO') { $sexto++ }
    else { $otro++; Write-Host "OTRO grado='$grade' nombre=$($s.firstName) $($s.lastName1)" }
}
Write-Host ""
Write-Host "Cuarto: $cuarto (esperado: 138)"
Write-Host "Quinto: $quinto (esperado: 146)"
Write-Host "Sexto:  $sexto (esperado: 128)"
Write-Host "Otro:   $otro"
Write-Host "Total unicos: $($cuarto + $quinto + $sexto + $otro) (esperado: 412)"
