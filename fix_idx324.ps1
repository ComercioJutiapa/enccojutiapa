# Obtener el alumno correcto de /students
$students = Invoke-RestMethod -Uri 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json' -Method GET
$yaquelin = $students | Where-Object { $null -ne $_ -and $_.carne -eq '2026-QD-028' }

if (-not $yaquelin) {
    Write-Host "ERROR: No se encontro a Yaquelin en /students"
    exit 1
}

Write-Host "Alumno a insertar en indice 324:"
Write-Host "  $($yaquelin.firstName) $($yaquelin.lastName1) $($yaquelin.lastName) - $($yaquelin.carne) - $($yaquelin.id)"

# Convertir a JSON y hacer PUT en /encc_school_state/students/324
$json = $yaquelin | ConvertTo-Json -Depth 10 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

$req = [System.Net.HttpWebRequest]::Create('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/324.json')
$req.Method = 'PUT'
$req.ContentType = 'application/json'
$req.ContentLength = $bytes.Length
$stream = $req.GetRequestStream()
$stream.Write($bytes, 0, $bytes.Length)
$stream.Close()

$resp = $req.GetResponse()
Write-Host "Respuesta HTTP: $([int]$resp.StatusCode) $($resp.StatusDescription)"
$resp.Close()

Write-Host "LISTO - Yaquelin insertada en indice 324"
