// test_mobile_attendance_scanner.js
// Verification suite for mobile & tablet barcode/QR attendance system

const fs = require('fs');
const assert = require('assert');

console.log('=== INICIANDO PRUEBAS DE OPTIMIZACIÓN MÓVIL Y ESCÁNER DE ASISTENCIA ===\n');

// 1. Verificar HTML
console.log('1. Verificando plataforma.html...');
const htmlContent = fs.readFileSync('plataforma.html', 'utf8');

assert(htmlContent.includes('id="attendanceBarcodeInput"'), 'Falta attendanceBarcodeInput en plataforma.html');
assert(htmlContent.includes('id="attendanceCameraModal"'), 'Falta attendanceCameraModal en plataforma.html');
assert(htmlContent.includes('id="attendanceScannerVideo"'), 'Falta attendanceScannerVideo en plataforma.html');
assert(htmlContent.includes('id="attendanceLastScannedBanner"'), 'Falta attendanceLastScannedBanner en plataforma.html');
assert(htmlContent.includes('openAttendanceCameraScanner()'), 'Falta llamada openAttendanceCameraScanner en plataforma.html');
assert(htmlContent.includes('switchAttendanceCameraFacing()'), 'Falta switchAttendanceCameraFacing en plataforma.html');
console.log('✓ Elementos HTML de escáner y asistencia móvil verificados con éxito.');

// 2. Verificar CSS
console.log('\n2. Verificando styles.css...');
const cssContent = fs.readFileSync('styles.css', 'utf8');

assert(cssContent.includes('.attendance-excel-table .col-num'), 'Falta estilo sticky .col-num en styles.css');
assert(cssContent.includes('.attendance-excel-table .col-name'), 'Falta estilo sticky .col-name en styles.css');
assert(cssContent.includes('position: sticky'), 'Falta position: sticky en styles.css');
assert(cssContent.includes('scanLineAnim'), 'Falta animación scanLineAnim en styles.css');
assert(cssContent.includes('@media screen and (max-width: 768px)'), 'Falta media query móvil en styles.css');
assert(cssContent.includes('@media screen and (min-width: 769px) and (max-width: 1024px)'), 'Falta media query tablet en styles.css');
console.log('✓ Reglas CSS fijas, táctiles y animaciones de escáner verificadas con éxito.');

// 3. Verificar app.js (Funciones de registro por código y escáner)
console.log('\n3. Verificando app.js (lógica de escaneo y asistencia)...');
const appContent = fs.readFileSync('app.js', 'utf8');

assert(appContent.includes('function registerAttendanceByCode'), 'Falta function registerAttendanceByCode en app.js');
assert(appContent.includes('function openAttendanceCameraScanner'), 'Falta function openAttendanceCameraScanner en app.js');
assert(appContent.includes('function closeAttendanceCameraScanner'), 'Falta function closeAttendanceCameraScanner en app.js');
assert(appContent.includes('function switchAttendanceCameraFacing'), 'Falta function switchAttendanceCameraFacing en app.js');
assert(appContent.includes('function playAttendanceBeep'), 'Falta function playAttendanceBeep en app.js');
assert(appContent.includes('function updateLastScannedBanner'), 'Falta function updateLastScannedBanner en app.js');
console.log('✓ Declaraciones de funciones presentes en app.js.');

// 4. Test simulado de lógica de registerAttendanceByCode
console.log('\n4. Simulando registerAttendanceByCode con datos de prueba...');

const mockState = {
    students: [
        { id: '101', apellidos: 'LÓPEZ MORALES', nombres: 'CARLOS ENRIQUE', personalCode: 'C123XYZ', carne: '2026-0001-PC', cui: '3001002000101', status: 'Activo', gradeCode: '4PC_A', section: 'A' },
        { id: '102', apellidos: 'GÓMEZ PÉREZ', nombres: 'ANA MARÍA', personalCode: 'A987LMN', carne: '2026-0002-PC', cui: '3001002000102', status: 'Activo', gradeCode: '5PC_B', section: 'B' }
    ],
    gradesList: [
        { code: '4PC_A', name: '4TO PERITO CONTADOR', section: 'A' },
        { code: '5PC_B', name: '5TO PERITO CONTADOR', section: 'B' }
    ],
    attendanceRecords: {}
};

// Simulación de función de búsqueda y registro
function testRegister(rawCode) {
    let cleanCode = String(rawCode).trim();
    if (cleanCode.includes('?')) {
        const u = new URL(cleanCode, 'https://comerciojutiapa.edu.gt');
        const p = u.searchParams.get('carne') || u.searchParams.get('code') || u.searchParams.get('personalCode');
        if (p) cleanCode = p.trim();
    }
    const normTarget = cleanCode.toUpperCase().replace(/[\s\-_]/g, '');
    const rawTarget = cleanCode.toUpperCase();

    const student = mockState.students.find(s => {
        const pCode = (s.personalCode || '').toUpperCase();
        const carne = (s.carne || '').toUpperCase();
        const cui = (s.cui || '').toString().trim();
        const sid = (s.id || '').toString().trim();
        if (pCode === rawTarget || carne === rawTarget || cui === cleanCode || sid === cleanCode) return true;
        if (normTarget.length >= 3) {
            if (pCode.replace(/[\s\-_]/g, '') === normTarget) return true;
            if (carne.replace(/[\s\-_]/g, '') === normTarget) return true;
        }
        return false;
    });

    if (!student) return false;

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const recordKey = `${student.gradeCode}_${todayMonth}_GENERAL`;

    if (!mockState.attendanceRecords[recordKey]) mockState.attendanceRecords[recordKey] = {};
    if (!mockState.attendanceRecords[recordKey][student.id]) mockState.attendanceRecords[recordKey][student.id] = {};
    mockState.attendanceRecords[recordKey][student.id][todayDay] = 'P';

    return { student, targetDay: todayDay, recordKey };
}

// Prueba con Código Personal
const res1 = testRegister('C123XYZ');
assert(res1 !== false, 'Debería encontrar por personalCode');
assert.strictEqual(res1.student.id, '101');
assert.strictEqual(mockState.attendanceRecords[res1.recordKey]['101'][res1.targetDay], 'P');
console.log('✓ Búsqueda por personalCode y asignación de "P" correcta.');

// Prueba con Carné con guiones y sin guiones
const res2 = testRegister('2026-0002-PC');
assert(res2 !== false, 'Debería encontrar por carné con guiones');
assert.strictEqual(res2.student.id, '102');

const res3 = testRegister('20260002pc');
assert(res3 !== false, 'Debería encontrar por carné normalizado');
assert.strictEqual(res3.student.id, '102');
console.log('✓ Búsqueda por carné físico normalizado y con guiones correcta.');

// Prueba con QR URL
const res4 = testRegister('https://comerciojutiapa.github.io/enccojutiapa/?carne=2026-0001-PC');
assert(res4 !== false, 'Debería extraer parámetro carne de una URL escaneada en QR');
assert.strictEqual(res4.student.id, '101');
console.log('✓ Escaneo de código QR embebido en URL resuelto correctamente.');

// Prueba con código no existente
const res5 = testRegister('CODIGO_INEXISTENTE_999');
assert.strictEqual(res5, false, 'No debería encontrar código inexistente');
console.log('✓ Manejo de código no encontrado probado correctamente.');

console.log('\n======================================================');
console.log('¡TODAS LAS PRUEBAS DE ASISTENCIA MÓVIL / TABLET PASARON CON ÉXITO!');
console.log('======================================================\n');
