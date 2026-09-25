const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const appContent = fs.readFileSync('app.js', 'utf8');
const htmlContent = fs.readFileSync('plataforma.html', 'utf8');

console.log("=== VERIFICANDO TOMA DE ASISTENCIA POR FECHA SELECCIONADA ===");

// 1. Verificación HTML
assert(htmlContent.includes('id="attendanceDateInput"'), 'Falta attendanceDateInput en plataforma.html');
assert(htmlContent.includes('id="btnMarkAllPresent"'), 'Falta btnMarkAllPresent en plataforma.html');
assert(htmlContent.includes('id="btnMarkAllPresentLabel"'), 'Falta btnMarkAllPresentLabel en plataforma.html');
console.log("✔ Elementos HTML de selector de fecha e identificador de botón verificados.");

// 2. Simulación de entorno
let simulatedDateInputVal = '2026-09-18';
let simulatedBtnTitle = '';
let simulatedBtnLabel = '';

const sandbox = {
    window: {},
    STATE: {
        currentRole: 'docente',
        activeCycle: '2026',
        attendanceRecords: {},
        students: [
            { id: 'S1', name: 'Alba García', grade: '4to Perito Contador', section: 'A', status: 'Activo' },
            { id: 'S2', name: 'Carlos López', grade: '4to Perito Contador', section: 'A', status: 'Activo' }
        ],
        gradesList: [
            { code: '4PC_A', name: 'Cuarto Perito Contador', section: 'A' }
        ]
    },
    document: {
        getElementById: function(id) {
            if (id === 'attendanceGradeSelect') return { value: '4PC_A' };
            if (id === 'attendanceMonthSelect') return { value: '9' };
            if (id === 'attendanceCourseSelect') return { value: 'GENERAL' };
            if (id === 'attendanceDateInput') return { 
                get value() { return simulatedDateInputVal; },
                set value(v) { simulatedDateInputVal = v; }
            };
            if (id === 'btnMarkAllPresent') return { 
                set title(v) { simulatedBtnTitle = v; },
                get title() { return simulatedBtnTitle; }
            };
            if (id === 'btnMarkAllPresentLabel') return { 
                set textContent(v) { simulatedBtnLabel = v; },
                get textContent() { return simulatedBtnLabel; }
            };
            return null;
        }
    },
    showToast: function(msg, type) { console.log('Toast:', msg); },
    saveAttendanceRecords: function() {},
    loadAttendanceList: function() {},
    isStudentActive: function() { return true; },
    formatStudentDisplayName: function(s) { return s.name; },
    getCleanSectionLetter: function() { return 'A'; },
    getAttendanceRecordKey: function(g, m, c) { return g + '_' + m + '_' + c; },
    console: console
};
sandbox.window = sandbox;

// Extraer y evaluar funciones relevantes
const mGetDate = appContent.match(/function getSelectedAttendanceDate[\s\S]*?\n\}/)[0];
const mSelectDay = appContent.match(/function selectAttendanceDay[\s\S]*?\n\}/)[0];
const mUpdateLbl = appContent.match(/function updateMarkAllPresentButtonLabel[\s\S]*?\n\}/)[0];
const mMarkAll = appContent.match(/function markAllPresentToday[\s\S]*?\n\}/)[0];

vm.runInNewContext([mGetDate, mSelectDay, mUpdateLbl, mMarkAll].join('\n'), sandbox);

// Probar lectura de fecha
const dateRes = sandbox.getSelectedAttendanceDate();
assert.strictEqual(dateRes.day, 18, 'El día debe ser 18');
assert.strictEqual(dateRes.month, 9, 'El mes debe ser 9');
assert.strictEqual(dateRes.dateStr, '2026-09-18', 'dateStr debe ser 2026-09-18');
console.log("✔ getSelectedAttendanceDate resuelve correctamente la fecha elegida.");

// Probar actualización del label dinámico del botón
sandbox.updateMarkAllPresentButtonLabel();
assert(simulatedBtnLabel.includes('18 Sep'), `El botón debe indicar (18 Sep), valor actual: ${simulatedBtnLabel}`);
console.log(`✔ Botón actualizado dinámicamente: "${simulatedBtnLabel}"`);

// Probar marcar todos presentes para esa fecha específica (día 18)
sandbox.markAllPresentToday();
const recKey = '4PC_A_9_GENERAL';
assert(sandbox.STATE.attendanceRecords[recKey], 'Debe existir registro para la clase');
assert.strictEqual(sandbox.STATE.attendanceRecords[recKey]['S1'][18], 'P', 'El alumno S1 debe quedar marcado P el día 18');
assert.strictEqual(sandbox.STATE.attendanceRecords[recKey]['S2'][18], 'P', 'El alumno S2 debe quedar marcado P el día 18');
console.log("✔ markAllPresentToday registra la asistencia específicamente en la fecha seleccionada.");

// Probar cambio a otro día mediante clic de columna
sandbox.selectAttendanceDay(25);
assert.strictEqual(simulatedDateInputVal, '2026-09-25', 'Al seleccionar día 25, la fecha debe actualizarse');
sandbox.updateMarkAllPresentButtonLabel();
assert(simulatedBtnLabel.includes('25 Sep'), 'El botón debe actualizarse a 25 Sep');
console.log(`✔ Selección de día por columna verificado exitosamente.`);

console.log("\n🎉 TODAS LAS PRUEBAS DE TOMA DE ASISTENCIA POR FECHA COMPLETADAS AL 100%");
