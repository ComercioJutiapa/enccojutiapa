/**
 * ======================================================================
 * 🧪 PRUEBA INTEGRAL DE BLINDAJE INSTITUCIONAL PARA ESTUDIANTES RETIRADOS
 * Regla: "de los alumnos marcados como retirados no se coloca nota,
 *         ni se toma asistencia, ni se imprimen las tarjetas"
 * ======================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRUEBAS: BLINDAJE PARA ALUMNOS RETIRADOS (NOTAS, ASISTENCIA, TARJETAS)');
console.log('========================================================================\n');

// 1. CARGA DE ARCHIVOS
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const carnetsCode = fs.readFileSync(path.join(__dirname, 'carnets.js'), 'utf8');
const qrcode = require('./qrcode.min.js');

let toastMessages = [];
function mockShowToast(msg, type) {
    toastMessages.push({ msg, type });
}

// 2. CONFIGURACIÓN DEL ENTORNO MOCK
const mockWindow = {
    qrcode: qrcode,
    location: { origin: 'https://comerciojutiapa.edu.gt' },
    open: function() {
        return {
            document: {
                write: function(html) { this.lastHtml = html; },
                close: function() {}
            },
            print: function() {}
        };
    },
    STATE: {
        activeCycle: '2026',
        currentRole: 'director',
        currentUser: { id: 'admin1', name: 'Director General', role: 'director' },
        schoolHeader: { schoolName: 'Escuela Nacional de Ciencias Comerciales', code: 'ENCCO Jutiapa', location: 'Jutiapa' },
        gradesList: [
            { code: '4PC_A', name: '4to Perito Contador A', grade: '4to Grado', section: 'A' }
        ],
        pensum: [
            { id: 'c-01', subject: 'Contabilidad General', gradeCode: '4PC_A', grade: '4to Grado', section: 'A', teacher: 'Lic. Perez' }
        ],
        students: [
            {
                id: 'st-active',
                firstName: 'Juan',
                lastName: 'Pérez García',
                status: 'Inscrito',
                active: true,
                grade: '4to Grado',
                gradeCode: '4PC_A',
                section: 'A',
                carne: '2026-0001-PC',
                personalCode: 'C10001',
                cui: '1111111110101',
                grades: { 'Contabilidad General': [85, 0, 0, 0] },
                gradebookDetails: {
                    'Contabilidad General': {
                        1: { activities: [10, 10, 10, 10, 0, 0, 0, 0, 0, 0], exam: 45 }
                    }
                }
            },
            {
                id: 'st-retired',
                firstName: 'Carlos',
                lastName: 'Martínez López',
                status: 'Retirado',
                active: false,
                grade: '4to Grado',
                gradeCode: '4PC_A',
                section: 'A',
                carne: '2026-0002-PC',
                personalCode: 'C10002',
                cui: '2222222220101',
                grades: { 'Contabilidad General': [0, 0, 0, 0] },
                gradebookDetails: {
                    'Contabilidad General': {
                        1: { activities: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], exam: 0 }
                    }
                }
            }
        ],
        attendanceRecords: {},
        users: [
            { id: 'admin1', name: 'Director General', role: 'director' }
        ]
    },
    showToast: mockShowToast
};

const mockDoc = {
    getElementById: (id) => {
        if (id === 'reportCareer') return { value: 'ALL' };
        if (id === 'reportGrade') return { value: 'ALL' };
        if (id === 'reportSection') return { value: 'ALL' };
        if (id === 'reportSearchStudent') return { value: '' };
        if (id === 'carnetsCareerFilter') return { value: 'ALL' };
        if (id === 'carnetsGradeFilter') return { value: 'ALL' };
        if (id === 'carnetsSectionFilter') return { value: 'ALL' };
        if (id === 'carnetsSearchInput') return { value: '' };
        if (id === 'carnetsTeacherSearchInput') return { value: '' };
        if (id === 'carnetsTeacherRenglonFilter') return { value: 'ALL' };
        return null;
    }
};

global.window = mockWindow;
global.document = mockDoc;
mockWindow.document = mockDoc;

// Evaluar carnets.js
const evalCarnets = new Function('window', 'qrcode', 'showToast', 'formatStudentDisplayName', 'document', carnetsCode);
const formatStudentDisplayName = (s) => `${s.lastName || ''}, ${s.firstName || ''}`;
evalCarnets(mockWindow, qrcode, mockShowToast, formatStudentDisplayName, mockDoc);

console.log('✅ carnets.js evaluado con éxito.');

// ----------------------------------------------------------------------
// TEST 1: CARNETS - Impresión individual bloqueada para alumno retirado
// ----------------------------------------------------------------------
console.log('\n--- TEST 1: Impresión de Carné Estudiantil Individual ---');
toastMessages = [];
mockWindow.EnccoCarnets.printSingleCard('st-retired', 'student');
assert.ok(toastMessages.some(t => t.msg.includes('RETIRADO') || t.msg.includes('Retirado')), 'Debe mostrar advertencia de alumno Retirado');
console.log('  ✔ Impresión individual bloqueada correctamente para alumno Retirado.');

// ----------------------------------------------------------------------
// TEST 2: CARNETS - Impresión masiva excluye a alumnos retirados
// ----------------------------------------------------------------------
console.log('\n--- TEST 2: Impresión Masiva de Carnés Estudiantiles ---');
let lastBatchHtml = '';
const origDocWrite = mockWindow.open;
mockWindow.open = function() {
    return {
        document: {
            write: function(h) { lastBatchHtml = h; },
            close: function() {}
        }
    };
};
mockWindow.EnccoCarnets.printFilteredBatch();
assert.ok(lastBatchHtml.includes('C10001'), 'Debe incluir al alumno activo C10001');
assert.ok(!lastBatchHtml.includes('C10002'), 'NO debe incluir al alumno retirado C10002');
console.log('  ✔ Alumno retirado excluido estrictamente de la impresión por lotes de carnés.');

// ----------------------------------------------------------------------
// TEST 3: TARJETAS DE NOTAS (BOLETINES) - getFilteredReportStudents
// ----------------------------------------------------------------------
console.log('\n--- TEST 3: Filtro de Tarjetas de Notas (Report Cards) ---');
// Extraer y probar función getFilteredReportStudents desde app.js
const extractFunc = (fnName) => {
    let startIdx = appCode.indexOf(`async function ${fnName}(`);
    if (startIdx === -1) startIdx = appCode.indexOf(`function ${fnName}(`);
    if (startIdx === -1) throw new Error(`Function ${fnName} not found`);
    let braceCount = 0;
    let endIdx = startIdx;
    let started = false;
    for (let i = startIdx; i < appCode.length; i++) {
        if (appCode[i] === '{') {
            braceCount++;
            started = true;
        } else if (appCode[i] === '}') {
            braceCount--;
            if (started && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    return appCode.slice(startIdx, endIdx);
};

async function runAllTests() {
    // Probar filtrado de tarjetas
    const getFilteredReportStudentsCode = extractFunc('getFilteredReportStudents');
    const evalReportFilter = new Function('STATE', 'document', `${getFilteredReportStudentsCode}; return getFilteredReportStudents;`);
    const fnGetReportStudents = evalReportFilter(mockWindow.STATE, mockDoc);
    const reportFiltered = fnGetReportStudents();
    assert.strictEqual(reportFiltered.length, 1, 'Solo debe contener al estudiante activo');
    assert.strictEqual(reportFiltered[0].id, 'st-active', 'El estudiante filtrado debe ser st-active');
    console.log('  ✔ getFilteredReportStudents excluye exitosamente a alumnos retirados de las tarjetas de notas.');

    // ----------------------------------------------------------------------
    // TEST 4: TARJETAS DE NOTAS - printStudentReportCardOfficial
    // ----------------------------------------------------------------------
    console.log('\n--- TEST 4: Impresión Oficial de Tarjeta de Notas Individual ---');
    const printCardCode = extractFunc('printStudentReportCardOfficial');
    const evalPrintCard = new Function('STATE', 'showToast', 'hasRolePermission', 'canRoleModify', `${printCardCode}; return printStudentReportCardOfficial;`);
    toastMessages = [];
    const fnPrintOfficialCard = evalPrintCard(mockWindow.STATE, mockShowToast, () => true, () => true);
    const printResult = fnPrintOfficialCard('st-retired');
    assert.strictEqual(printResult, undefined, 'printStudentReportCardOfficial debe abortar para alumno retirado');
    assert.ok(toastMessages.some(t => t.msg.includes('Retirado') || t.msg.includes('retirados')), 'Debe mostrar toast de estudiante retirado');
    console.log('  ✔ Impresión de tarjeta de notas bloqueada formalmente para alumno retirado.');

    // ----------------------------------------------------------------------
    // TEST 5: CALIFICACIONES - saveStudentSubjectGradeAtomic y handleActivityBoxChange
    // ----------------------------------------------------------------------
    console.log('\n--- TEST 5: Guardado Atómico de Calificación y Manejador de Cuadrícula ---');
    const saveAtomicCode = extractFunc('saveStudentSubjectGradeAtomic');
    const evalSaveAtomic = new Function('STATE', 'showToast', 'window', `${saveAtomicCode}; return saveStudentSubjectGradeAtomic;`);
    toastMessages = [];
    const fnSaveAtomic = evalSaveAtomic(mockWindow.STATE, mockShowToast, mockWindow);
    const saveResRetired = await fnSaveAtomic('st-retired', 'Contabilidad General', 1, 95);
    assert.strictEqual(saveResRetired, false, 'No debe permitir guardar notas para alumno retirado');
    console.log('  ✔ Guardado atómico de notas bloqueado para alumno retirado.');

    // Probar también handleActivityBoxChange para alumno retirado
    const handleBoxCode = extractFunc('handleActivityBoxChange');
    const evalHandleBox = new Function(
        'STATE', 'showToast', 'document', 'isGradebookEditableForUser', 'loadTeacherGradebook', 'ensureStudentGradebookStructure', 'getGradingConfig',
        `${handleBoxCode}; return handleActivityBoxChange;`
    );
    toastMessages = [];
    let loadCalled = false;
    const fnHandleBox = evalHandleBox(
        mockWindow.STATE,
        mockShowToast,
        mockDoc,
        () => ({ editable: true }),
        () => { loadCalled = true; },
        () => {},
        () => ({})
    );
    fnHandleBox('st-retired', 0, 10, 'Contabilidad General', 1, true);
    assert.ok(toastMessages.some(t => t.msg.includes('Retirado')), 'Debe mostrar toast de Estudiante Retirado');
    assert.strictEqual(loadCalled, true, 'Debe recargar el libro de calificaciones para resetear valor');
    console.log('  ✔ handleActivityBoxChange alerta y resetea ante intento de ingresar notas a alumno retirado.');

    // ----------------------------------------------------------------------
    // TEST 6: ASISTENCIA - toggleAttendanceCell
    // ----------------------------------------------------------------------
    console.log('\n--- TEST 6: Toma de Asistencia por Clic (toggleAttendanceCell) ---');
    const toggleAttCode = extractFunc('toggleAttendanceCell');
    const evalToggle = new Function('STATE', 'showToast', 'document', `${toggleAttCode}; return toggleAttendanceCell;`);
    toastMessages = [];
    const fnToggle = evalToggle(mockWindow.STATE, mockShowToast, mockDoc);
    fnToggle('st-retired', 15);
    assert.ok(toastMessages.some(t => t.msg.includes('Retirado')), 'Debe mostrar alerta de Alumno Retirado');
    assert.deepStrictEqual(mockWindow.STATE.attendanceRecords, {}, 'No debe modificar el registro de asistencia');
    console.log('  ✔ toggleAttendanceCell bloquea el registro de asistencia para alumnos retirados.');

    // ----------------------------------------------------------------------
    // TEST 7: ASISTENCIA - registerAttendanceByCode (Scanner de Barras / QR)
    // ----------------------------------------------------------------------
    console.log('\n--- TEST 7: Scanner de Código de Barras / QR para Asistencia ---');
    const scanCode = extractFunc('registerAttendanceByCode');
    const evalScan = new Function(
        'STATE', 'showToast', 'playAttendanceBeep', 'updateLastScannedBanner', 'formatStudentDisplayName',
        `${scanCode}; return registerAttendanceByCode;`
    );
    toastMessages = [];
    let bannerUpdated = null;
    const fnScan = evalScan(
        mockWindow.STATE,
        mockShowToast,
        () => {},
        (student, type, msg) => { bannerUpdated = { type, msg }; },
        formatStudentDisplayName
    );

    const scanResult = fnScan('C10002'); // Código del alumno retirado
    assert.strictEqual(scanResult, false, 'El scanner debe rechazar al alumno retirado');
    assert.ok(bannerUpdated && bannerUpdated.type === 'error' && bannerUpdated.msg.includes('RETIRADO'), 'El banner debe indicar que el alumno está RETIRADO');
    assert.ok(toastMessages.some(t => t.msg.includes('RETIRADO') || t.msg.includes('Retirado')), 'Debe emitir toast de alumno retirado');
    console.log('  ✔ Scanner de asistencia rechaza inmediatamente el código de alumnos retirados.');

    console.log('\n========================================================================');
    console.log('🎉 TODAS LAS 7 PRUEBAS DE BLINDAJE INSTITUCIONAL PASARON CON ÉXITO');
    console.log('========================================================================\n');
}

runAllTests().catch(err => {
    console.error('❌ Error en pruebas:', err);
    process.exit(1);
});
