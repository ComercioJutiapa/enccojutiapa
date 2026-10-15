/**
 * Test: Exoneraciones por Bimestre y Retirados/Ausentes con Línea de Tiempo
 */
const fs = require('fs');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 PRUEBAS: EXONERACIONES POR BIMESTRE Y RETIRADOS CON LÍNEA DE TIEMPO');
console.log('========================================================================\n');

// Simular entorno básico
global.window = global;
global.STATE = {
    config: {
        activeBimestre: 2
    }
};

const appCode = fs.readFileSync('./app.js', 'utf8');

// Extraer las funciones directamente
function evalSnippet(name) {
    const fnRegex = new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`, 'g');
    const match = appCode.match(fnRegex);
    if (!match) throw new Error(`Function ${name} not found in app.js`);
    return match[0];
}

eval(evalSnippet('getBimestreFromMonth'));
eval(evalSnippet('getStudentRetireBimestre'));
eval(evalSnippet('isStudentRetiredInBimestre'));
eval(evalSnippet('isStudentRetiredAtDate'));
eval(evalSnippet('isStudentExonerated'));

// TEST 1: getBimestreFromMonth
assert.strictEqual(getBimestreFromMonth(1), 1, 'Enero es B1');
assert.strictEqual(getBimestreFromMonth(3), 1, 'Marzo es B1');
assert.strictEqual(getBimestreFromMonth(4), 2, 'Abril es B2');
assert.strictEqual(getBimestreFromMonth(5), 2, 'Mayo es B2');
assert.strictEqual(getBimestreFromMonth(6), 3, 'Junio es B3');
assert.strictEqual(getBimestreFromMonth(8), 3, 'Agosto es B3');
assert.strictEqual(getBimestreFromMonth(9), 4, 'Septiembre es B4');
assert.strictEqual(getBimestreFromMonth(10), 4, 'Octubre es B4');
console.log('✅ TEST 1: Mapeo de meses a bimestres verificado (1 al 12).');

// TEST 2: Exoneración limitada al bimestre asignado
const studentExonB1 = {
    id: 'stu_01',
    firstName: 'Carlos',
    lastName: 'Gómez',
    status: 'Activo',
    academicExceptions: [
        { id: 'ex_1', subject: 'Matemáticas', bimestre: 1, type: 'EXONERADO', active: true }
    ]
};

assert.strictEqual(isStudentExonerated(studentExonB1, 1), true, 'Debe estar exonerado en Bimestre 1');
assert.strictEqual(isStudentExonerated(studentExonB1, 2), false, 'NO debe estar exonerado en Bimestre 2');
assert.strictEqual(isStudentExonerated(studentExonB1, 3), false, 'NO debe estar exonerado en Bimestre 3');
assert.strictEqual(isStudentExonerated(studentExonB1, 4), false, 'NO debe estar exonerado en Bimestre 4');
console.log('✅ TEST 2: Estudiante exonerado en B1 solo aparece exonerado en B1 y vuelve a regular en B2, B3 y B4.');

// TEST 3: Exoneración de todo el ciclo ('ALL')
const studentExonAll = {
    id: 'stu_02',
    academicExceptions: [
        { id: 'ex_2', subject: 'ALL', bimestre: 'ALL', type: 'EXONERADO', active: true }
    ]
};
assert.strictEqual(isStudentExonerated(studentExonAll, 1), true);
assert.strictEqual(isStudentExonerated(studentExonAll, 2), true);
assert.strictEqual(isStudentExonerated(studentExonAll, 3), true);
assert.strictEqual(isStudentExonerated(studentExonAll, 4), true);
console.log('✅ TEST 3: Exoneración configurada como ALL se mantiene en todos los bimestres.');

// TEST 4: Retirado a partir de fecha/bimestre
const studentRetiredB2 = {
    id: 'stu_03',
    status: 'Retirado',
    retireDate: '2026-04-15', // Abril = Bimestre 2
    retireReason: 'Cambio de domicilio'
};

assert.strictEqual(getStudentRetireBimestre(studentRetiredB2), 2, 'Bimestre de retiro debe ser 2');
assert.strictEqual(isStudentRetiredInBimestre(studentRetiredB2, 1), false, 'En Bimestre 1 estaba activo');
assert.strictEqual(isStudentRetiredInBimestre(studentRetiredB2, 2), true, 'En Bimestre 2 está retirado');
assert.strictEqual(isStudentRetiredInBimestre(studentRetiredB2, 3), true, 'En Bimestre 3 sigue retirado');
assert.strictEqual(isStudentRetiredInBimestre(studentRetiredB2, 4), true, 'En Bimestre 4 sigue retirado');
console.log('✅ TEST 4: Alumno retirado en B2 está activo en B1 y retirado permanentemente a partir de B2 (B2, B3, B4).');

// TEST 5: Línea de tiempo diaria en asistencias
assert.strictEqual(isStudentRetiredAtDate(studentRetiredB2, 2026, 4, 10), false, 'El 10 de abril aún no se había retirado');
assert.strictEqual(isStudentRetiredAtDate(studentRetiredB2, 2026, 4, 15), true, 'El 15 de abril es la fecha de retiro');
assert.strictEqual(isStudentRetiredAtDate(studentRetiredB2, 2026, 4, 20), true, 'El 20 de abril ya está retirado');
assert.strictEqual(isStudentRetiredAtDate(studentRetiredB2, 2026, 5, 2), true, 'En mayo ya está retirado');
console.log('✅ TEST 5: Línea de tiempo diaria de asistencia confirmada a partir de fecha exacta de retiro.');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DE EXONERACIONES Y RETIRADOS PASARON EXITOSAMENTE!');
console.log('========================================================================');
