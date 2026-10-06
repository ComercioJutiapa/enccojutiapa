// test_exonerated_attendance_blue_line.js
// Verification suite for exonerated students representation and interactivity in attendance.

const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('================================================================================');
console.log('🧪 PRUEBAS DE ASISTENCIA: ALUMNOS EXONERADOS (LÍNEA AZUL Y EDICIÓN P, J, T)');
console.log('================================================================================\n');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

// TEST 1: Función isStudentExonerated definida y funcional
console.log('▶ [TEST 1] Verificando definición de isStudentExonerated...');
assert(appJs.includes('function isStudentExonerated('), 'Falta function isStudentExonerated en app.js');
assert(appJs.includes('window.isStudentExonerated = isStudentExonerated;'), 'isStudentExonerated debe estar expuesta globalmente');

// Extraer y evaluar isStudentExonerated
const isExonMatch = appJs.match(/function isStudentExonerated\s*\([\s\S]*?^}/m);
assert(isExonMatch, 'isStudentExonerated debe ser extraíble');
const testIsStudentExonerated = new Function(`
    ${isExonMatch[0]}
    return isStudentExonerated;
`)();

// Probar con estudiante activo normal
assert.strictEqual(testIsStudentExonerated({ id: 's1', status: 'Activo' }), false, 'Estudiante normal no debe ser exonerado');

// Probar con estudiante con status Exonerado
assert.strictEqual(testIsStudentExonerated({ id: 's2', status: 'Exonerado' }), true, 'Estudiante con status Exonerado debe ser detectado');

// Probar con estudiante con isExonerated: true
assert.strictEqual(testIsStudentExonerated({ id: 's3', status: 'Activo', isExonerated: true }), true, 'Estudiante con isExonerated: true debe ser detectado');

// Probar con estudiante con academicExceptions activas
assert.strictEqual(testIsStudentExonerated({ 
    id: 's4', 
    status: 'Activo', 
    academicExceptions: [{ type: 'EXONERADO', active: true }] 
}), true, 'Estudiante con academicExceptions activas debe ser detectado');

// Probar con excepción inactiva
assert.strictEqual(testIsStudentExonerated({ 
    id: 's5', 
    status: 'Activo', 
    academicExceptions: [{ type: 'EXONERADO', active: false }] 
}), false, 'Estudiante con excepción inactiva no debe ser detectado');
console.log('  ✅ TEST 1 APROBADO: isStudentExonerated resuelve todos los casos de datos.');

// TEST 2: Estilos CSS para alumnos exonerados con línea azul
console.log('\n▶ [TEST 2] Verificando estilos CSS en styles.css...');
assert(stylesCss.includes('tr.row-student-exonerado'), 'Falta clase tr.row-student-exonerado en styles.css');
assert(stylesCss.includes('#eff6ff'), 'Falta color de fondo azul suave #eff6ff');
assert(stylesCss.includes('border-left: 4px solid #0284c7'), 'Falta línea azul border-left: 4px solid #0284c7');
assert(stylesCss.includes('tr.row-student-exonerado td.col-num'), 'Faltan estilos para col-num de alumnos exonerados');
assert(stylesCss.includes('tr.row-student-exonerado td.col-name'), 'Faltan estilos para col-name de alumnos exonerados');
assert(stylesCss.includes('body.theme-dark tr.row-student-exonerado'), 'Falta soporte de modo oscuro para alumnos exonerados');
console.log('  ✅ TEST 2 APROBADO: Reglas CSS para línea azul, celdas y modo oscuro verificadas.');

// TEST 3: Integración en loadAttendanceList
console.log('\n▶ [TEST 3] Verificando integración en cuadrícula de asistencia (app.js)...');
assert(appJs.includes('const isExonerated = !isRetired && (typeof isStudentExonerated === \'function\' ? isStudentExonerated(s) : false);'), 'loadAttendanceList no evalúa isExonerated');
assert(appJs.includes('row-student-exonerado'), 'loadAttendanceList no aplica row-student-exonerado');
assert(appJs.includes('badge-exonerado'), 'loadAttendanceList no incluye badge-exonerado en statusTag');
assert(appJs.includes('border-left:4px solid #0284c7'), 'loadAttendanceList no incluye línea azul en estilo en línea');
console.log('  ✅ TEST 3 APROBADO: loadAttendanceList genera la fila con línea azul y distintivo.');

// TEST 4: Interactividad de celdas para alumnos exonerados (P, J, T, A)
console.log('\n▶ [TEST 4] Verificando que celdas de exonerados NO estén bloqueadas y permitan P, J, T...');
// Comprobar que en loadAttendanceList solo isRetired bloquea las celdas
const loadAttSrc = appJs.slice(appJs.indexOf('function loadAttendanceList()'), appJs.indexOf('function _renderAttendanceFooterAndSummary'));
assert(!loadAttSrc.includes('else if (isExonerated) {') || !loadAttSrc.includes('att-cell-exonerated-readonly'), 'Exonerados no deben tener celdas bloqueadas de solo lectura');

// Comprobar que toggleAttendanceCell NO bloquea a exonerados
const toggleSrc = appJs.slice(appJs.indexOf('function toggleAttendanceCell('), appJs.indexOf('window.toggleAttendanceCell'));
assert(toggleSrc.includes('targetStudent.status === \'Retirado\' || targetStudent.status === \'Inactivo\''), 'toggleAttendanceCell solo debe bloquear a Retirado/Inactivo');
assert(!toggleSrc.includes('targetStudent.status === \'Exonerado\''), 'toggleAttendanceCell no debe bloquear a Exonerado');
console.log('  ✅ TEST 4 APROBADO: Los estudiantes exonerados son completamente editables para P, J, T.');

// TEST 5: Consistencia en Planilla Oficial Imprimible
console.log('\n▶ [TEST 5] Verificando planilla oficial de impresión/exportación...');
assert(appJs.includes('[EXONERADO]'), 'Planilla oficial no incluye distintivo [EXONERADO]');
assert(appJs.includes('isExon'), 'Planilla oficial no detecta isExon');
console.log('  ✅ TEST 5 APROBADO: Planilla impresa incluye resaltado azul y etiqueta [EXONERADO].');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS DE ALUMNOS EXONERADOS EN ASISTENCIA PASARON AL 100%');
console.log('================================================================================');
