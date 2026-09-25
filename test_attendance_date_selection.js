const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const appContent = fs.readFileSync('app.js', 'utf8');
const htmlContent = fs.readFileSync('plataforma.html', 'utf8');

console.log("=== VERIFICANDO TOMA DE ASISTENCIA A LA FECHA ACTUAL (HOY) ===");

// 1. Verificación HTML: Toolbar limpio sin selector de fecha manual
assert(!htmlContent.includes('id="attendanceDateInput"'), 'attendanceDateInput NO debe existir en plataforma.html');
assert(htmlContent.includes('id="btnMarkAllPresent"'), 'Falta btnMarkAllPresent en plataforma.html');
assert(htmlContent.includes('Marcar Todos Presentes'), 'El botón debe decir Marcar Todos Presentes');
console.log("✔ Verificación HTML: Toolbar limpio y botón 'Marcar Todos Presentes' presente.");

// 2. Simulación de entorno
const today = new Date();
const todayDay = today.getDate();
const todayMonth = today.getMonth() + 1;

let currentMonthSelectVal = '1'; // Supongamos que estaba en Enero
let toastMessage = '';

const sandbox = {
    window: {},
    STATE: {
        currentRole: 'docente',
        activeCycle: '2026',
        attendanceRecords: {},
        students: [
            { id: 'S1', name: 'Alba García', grade: '4to Perito Contador', section: 'A', status: 'Activo' },
            { id: 'S2', name: 'Carlos López', grade: '4to Perito Contador', section: 'A', status: 'Activo' },
            { id: 'S3', name: 'Diana Méndez', grade: '4to Perito Contador', section: 'A', status: 'Activo' }
        ],
        gradesList: [
            { code: '4PC_A', name: 'Cuarto Perito Contador', section: 'A' }
        ]
    },
    document: {
        getElementById: function(id) {
            if (id === 'attendanceGradeSelect') return { value: '4PC_A' };
            if (id === 'attendanceMonthSelect') return { 
                get value() { return currentMonthSelectVal; },
                set value(v) { currentMonthSelectVal = String(v); }
            };
            if (id === 'attendanceCourseSelect') return { value: 'GENERAL' };
            if (id === 'btnMarkAllPresent') return { title: '' };
            return null;
        }
    },
    showToast: function(msg, type) { 
        toastMessage = msg;
        console.log('Toast:', msg); 
    },
    saveAttendanceRecords: function() {},
    loadAttendanceList: function() {},
    isStudentActive: function() { return true; },
    formatStudentDisplayName: function(s) { return s.name; },
    getCleanSectionLetter: function() { return 'A'; },
    getAttendanceRecordKey: function(g, m, c) { return g + '_' + m + '_' + c; },
    console: console
};
sandbox.window = sandbox;

// Preconfigurar permiso 'J' para el alumno S3 hoy
const expectedKey = `4PC_A_${todayMonth}_GENERAL`;
sandbox.STATE.attendanceRecords[expectedKey] = {
    'S3': { [todayDay]: 'J' }
};

// Extraer y evaluar markAllPresentToday desde app.js
const mMarkAll = appContent.match(/function markAllPresentToday[\s\S]*?\n\}/)[0];
vm.runInNewContext(mMarkAll, sandbox);

// Ejecutar toma de asistencia
sandbox.markAllPresentToday();

// 3. Verificaciones de negocio
// A. Sincronización automática de selector de mes con el mes actual
assert.strictEqual(currentMonthSelectVal, String(todayMonth), `El selector de mes debió sincronizarse a ${todayMonth}, pero tiene ${currentMonthSelectVal}`);
console.log(`✔ Selector de mes sincronizado automáticamente al mes actual (${todayMonth}).`);

// B. Registro de asistencia para la fecha de hoy
const recs = sandbox.STATE.attendanceRecords[expectedKey];
assert(recs, `Debe existir registro para la clave ${expectedKey}`);
assert.strictEqual(recs['S1'][todayDay], 'P', `S1 debe tener 'P' en el día de hoy (${todayDay})`);
assert.strictEqual(recs['S2'][todayDay], 'P', `S2 debe tener 'P' en el día de hoy (${todayDay})`);
assert.strictEqual(recs['S3'][todayDay], 'J', `S3 debe mantener 'J' justificado en el día de hoy (${todayDay})`);
console.log(`✔ Asistencia registrada estrictamente para el día actual (${todayDay}) respetando 'J'.`);

// C. Mensaje Toast informativo
assert(toastMessage.includes(String(todayDay)), `El toast debe mencionar el día ${todayDay}`);
assert(toastMessage.includes('permisos justificados'), 'El toast debe mencionar los permisos justificados respetados');
console.log(`✔ Toast informativo verificado: "${toastMessage}"`);

console.log("\n🎉 TODAS LAS PRUEBAS DE ASISTENCIA A LA FECHA ACTUAL SUPERADAS CON ÉXITO.");
