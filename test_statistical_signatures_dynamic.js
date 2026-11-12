// test_statistical_signatures_dynamic.js
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 PRUEBAS: CERO FIRMAS EN TODOS LOS CUADROS ESTADÍSTICOS (DINÁMICO)');
console.log('========================================================================\n');

let lastBlobText = '';
let lastOpenedPrintHtml = '';
let lastDownloadedExcelHtml = '';

const domNodes = {
    gradeStatsDocumentContainer: { id: 'gradeStatsDocumentContainer', innerHTML: '', style: {} },
    gradeStatsBimestreSelect: { id: 'gradeStatsBimestreSelect', value: 'FINAL' },
    gradeStatsGradeFilter: { id: 'gradeStatsGradeFilter', value: '4' },
    gradeStatsSectionFilter: {
        id: 'gradeStatsSectionFilter',
        value: 'A',
        innerHTML: '',
        options: [{ value: 'ALL' }, { value: 'A' }]
    }
};

global.window = global;
global.document = {
    getElementById: (id) => domNodes[id] || null,
    querySelectorAll: () => [],
    createElement: () => ({ tagName: 'a', style: {}, click: () => {}, set href(_) {}, set download(_) {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
};
global.Blob = function(parts) {
    lastBlobText = (parts || []).join('');
    this.parts = parts;
};
global.URL = {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
};
global.window.open = () => ({
    document: {
        open: () => {},
        write: (html) => { lastOpenedPrintHtml = html; },
        close: () => {},
        querySelector: () => null
    },
    focus: () => {},
    print: () => {}
});
global.escapeHtml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
global.hasRolePermission = () => true;
global.formatStudentDisplayName = (s) => s.name || 'Estudiante';
global.showToast = () => {};
global.downloadFormattedExcelWorkbook = (html) => { lastDownloadedExcelHtml = html; };
global.AUDIT_2026_STUDENTS = [
    {
        num: 1, code: 'F737WSW', name: 'EJEMPLO AUDITADO', sex: 'H', grade: 'CUARTO', section: 'A',
        num_rep: 1, condicion: 'CON DERECHO A RECUPERACIÓN',
        reprobadas: [{ materia: 'Auditoría', nota: 52, maestro: 'Lic. Jorge Morales' }]
    }
];

global.STATE = {
    currentRole: 'director',
    activeCycle: '2028',
    schoolHeader: {
        schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES',
        mineducCode: '22-01-0014-46',
        municipality: 'Jutiapa',
        department: 'Jutiapa'
    },
    users: [
        { id: 'dir-1', role: 'director', gender: 'Femenino', active: true, name: 'Mirza Elizabeth Aragón Polanco de Hernández' },
        { id: 'sec-1', role: 'secretaria', gender: 'Femenino', active: true, name: 'Secretaria Titular' },
        { id: 'doc-1', role: 'docente', gender: 'Masculino', renglon: '011', name: 'Lic. Mario Roberto Paz' }
    ],
    gradesList: [
        { id: 'g-4a', name: '4to Perito Contador', section: 'A', code: '4A', guideTeacherName: 'Lic. Mario Roberto Paz' }
    ],
    pensumCatalog: [
        { id: 'c1', grade: '4to Perito Contador', name: 'Contabilidad de Sociedades', order: 1 },
        { id: 'c2', grade: '4to Perito Contador', name: 'Matemática Comercial', order: 2 }
    ],
    pensum: [],
    students: [
        {
            id: 'stu-1',
            personalCode: 'ALU001',
            name: 'ALUMNO PRUEBA',
            gender: 'Masculino',
            grade: '4to Perito Contador',
            section: 'A',
            status: 'Activo',
            grades: {
                'Contabilidad de Sociedades': [80, 82, 84, 86],
                'Matemática Comercial': [50, 52, 54, 56]
            }
        }
    ]
};

require('./grade_stats.js');
require('./analytics.js');

const snapshotUsersJson = JSON.stringify(global.STATE.users);
const snapshotStudentsJson = JSON.stringify(global.STATE.students);
const snapshotGradesListJson = JSON.stringify(global.STATE.gradesList);

function assertHasNoSignatures(html, label) {
    assert(!html.includes('encco-stat-signatures'), `${label}: no debe contener encco-stat-signatures`);
    assert(!html.includes('cuadro-signatures'), `${label}: no debe contener cuadro-signatures`);
    assert(!html.includes('signatures-container'), `${label}: no debe contener signatures-container`);
    assert(!html.includes('sig-space'), `${label}: no debe contener sig-space`);
    assert(!html.includes('( S E L L O )'), `${label}: no debe contener ( S E L L O )`);
    assert(!html.includes('Mirza Elizabeth Aragón'), `${label}: no debe contener firma de Directora`);
    assert(!html.includes('Comisión de Evaluación'), `${label}: no debe contener firma de Comisión de Evaluación`);
    assert(!html.includes('________________'), `${label}: no debe contener líneas de firma`);
    assert(!html.includes('undefined'), `${label}: no debe contener undefined`);
}

// 1. Tab 1: Promedios y Estadísticas en pantalla (Resumen + Sábana) + Print + Excel
window._currentGradeStatsActiveTab = 'actas';
window.renderGradeStatsView();
const tab1Html = domNodes.gradeStatsDocumentContainer.innerHTML;
assertHasNoSignatures(tab1Html, 'Tab 1 pantalla');
assert(tab1Html.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), 'Tab 1 debe usar nombre oficial institucional');

lastOpenedPrintHtml = '';
window.printGradeStatsReport('section');
assertHasNoSignatures(lastOpenedPrintHtml, 'printGradeStatsReport(section)');
assert(lastOpenedPrintHtml.includes('2028'), 'printGradeStatsReport debe reflejar ciclo dinámico 2028');
assert(lastOpenedPrintHtml.includes('JORNADA MATUTINA'), 'printGradeStatsReport debe reflejar Jornada Matutina dinámica');

lastOpenedPrintHtml = '';
window.printGradeStatsReport('grades');
assertHasNoSignatures(lastOpenedPrintHtml, 'printGradeStatsReport(grades)');

lastDownloadedExcelHtml = '';
window.exportGradeStatsOfficialExcel();
assertHasNoSignatures(lastDownloadedExcelHtml, 'exportGradeStatsOfficialExcel (actas)');
assert(lastDownloadedExcelHtml.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), 'Excel debe incluir nombre oficial');
assert(lastDownloadedExcelHtml.includes('22-01-0014-46'), 'Excel debe incluir código MINEDUC dinámico');
assert(lastDownloadedExcelHtml.includes('JORNADA MATUTINA'), 'Excel debe incluir Jornada Matutina dinámica');
assert(!lastDownloadedExcelHtml.includes('ESCUELA NACIONAL EN CIENCIAS'), 'Excel no debe tener error tipográfico EN CIENCIAS');
console.log('✓ [TEST 1] Tab 1 (Pantalla Resumen + Sábana, Impresión Sección/Grados y Excel) verificados SIN firmas.');

// 2. Tab 2: Cuadro de Resumen Estadístico Oficial MINEDUC (2028 dinámico y 2026 histórico)
window._currentGradeStatsActiveTab = 'cuadro';
window.renderCuadroEstadisticoOficial();
const cuadroScreen2028 = domNodes.gradeStatsDocumentContainer.innerHTML;
assertHasNoSignatures(cuadroScreen2028, 'Cuadro Estadístico pantalla 2028');
assert(cuadroScreen2028.includes('cuadro-footer-meta'), 'Cuadro pantalla debe mostrar pie informativo limpio');
assert(cuadroScreen2028.includes('CICLO 2028'), 'Cuadro pantalla debe mostrar ciclo dinámico 2028');
assert(cuadroScreen2028.includes('Matutina / Oficial'), 'Cuadro pantalla debe mostrar Jornada Matutina dinámica');

lastOpenedPrintHtml = '';
window.printCuadroEstadisticoOficial();
assertHasNoSignatures(lastOpenedPrintHtml, 'printCuadroEstadisticoOficial');
assert(lastOpenedPrintHtml.includes('size: letter landscape'), 'printCuadroEstadisticoOficial debe mantener formato carta horizontal');
assert(lastOpenedPrintHtml.includes('cuadro-footer-meta'), 'printCuadroEstadisticoOficial debe mostrar pie limpio sin firmas');

lastBlobText = '';
window.exportGradeStatsOfficialExcel();
assertHasNoSignatures(lastBlobText, 'Excel Cuadro Estadístico');
assert(lastBlobText.includes('22-01-0014-46'), 'Excel Cuadro Estadístico debe mostrar código dinámico');
console.log('✓ [TEST 2] Tab 2 (Cuadro Resumen Estadístico MINEDUC Pantalla, Print y Excel) verificados SIN firmas.');

// 3. Tab 3: Alumnos Reprobados y Recuperación (Pantalla + Print + Excel)
window._currentGradeStatsActiveTab = 'reprobados';
window.renderReprobadosRecuperacionView();
const repScreen = domNodes.gradeStatsDocumentContainer.innerHTML;
assertHasNoSignatures(repScreen, 'Tab 3 pantalla');
assert(repScreen.includes('22-01-0014-46'), 'Tab 3 pantalla debe incluir metadato dinámico MINEDUC');

lastOpenedPrintHtml = '';
window.printReprobadosRecuperacionView();
assertHasNoSignatures(lastOpenedPrintHtml, 'printReprobadosRecuperacionView');

lastBlobText = '';
window.exportReprobadosRecuperacionExcel();
assertHasNoSignatures(lastBlobText, 'exportReprobadosRecuperacionExcel');
console.log('✓ [TEST 3] Tab 3 (Reprobados y Recuperación Pantalla, Print y Excel) verificados SIN firmas.');

// 4. Reporte Ejecutivo de Analítica Estadística (analytics.js)
lastOpenedPrintHtml = '';
window.EnccoAnalytics.printExecutiveRiskReport();
assertHasNoSignatures(lastOpenedPrintHtml, 'EnccoAnalytics.printExecutiveRiskReport');
console.log('✓ [TEST 4] Informe Ejecutivo Estadístico (analytics.js) verificado SIN firmas.');

// 5. Garantía de CERO pérdida/mutación de datos en STATE
assert.strictEqual(JSON.stringify(global.STATE.users), snapshotUsersJson, 'STATE.users no debe sufrir ninguna mutación ni pérdida');
assert.strictEqual(JSON.stringify(global.STATE.students), snapshotStudentsJson, 'STATE.students no debe sufrir ninguna mutación ni pérdida');
assert.strictEqual(JSON.stringify(global.STATE.gradesList), snapshotGradesListJson, 'STATE.gradesList no debe sufrir ninguna mutación ni pérdida');
console.log('✓ [TEST 5] Cero mutación ni pérdida de datos confirmada en STATE.');

console.log('\n========================================================================');
console.log('✅ TODAS LAS PRUEBAS DE CERO FIRMAS Y DINAMISMO PASARON AL 100%');
console.log('========================================================================\n');
