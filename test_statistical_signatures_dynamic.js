// test_statistical_signatures_dynamic.js
const assert = require('assert');
const fs = require('fs');

console.log('========================================================================');
console.log('🧪 PRUEBAS: FIRMAS DINÁMICAS EN TODOS LOS CUADROS ESTADÍSTICOS');
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
    activeCycle: '2027',
    schoolHeader: {
        schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES',
        mineducCode: '22-01-0014-46',
        municipality: 'Jutiapa'
    },
    users: [
        { id: 'dir-custom', role: 'director', gender: 'Femenino', active: true, name: 'Dra. Elena Marisol Estrada de Solís' },
        { id: 'sec-custom', role: 'secretaria', gender: 'Femenino', active: true, name: 'Profa. Carmen Lucía Méndez Ortega' },
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

// 1. Tab 1: Promedios y Estadísticas en pantalla (Resumen + Sábana) + Print + Excel
window._currentGradeStatsActiveTab = 'actas';
window.renderGradeStatsView();
const tab1Html = domNodes.gradeStatsDocumentContainer.innerHTML;
assert(tab1Html.includes('encco-stat-signatures'), 'Tab 1 pantalla debe incluir firmas en ambos cuadros (Resumen y Sábana)');
assert(tab1Html.includes('Dra. Elena Marisol Estrada de Solís'), 'Tab 1 pantalla debe resolver dinámicamente a la Directora activa');
assert(tab1Html.includes('Profa. Carmen Lucía Méndez Ortega'), 'Tab 1 pantalla debe resolver dinámicamente a la Secretaria activa');
assert(tab1Html.includes('Lic. Mario Roberto Paz'), 'Tab 1 sábana de sección debe incluir al Maestro Guía cuando hay sección seleccionada');
assert(tab1Html.includes('( S E L L O )'), 'Tab 1 pantalla debe incluir espacio para Sello');
assert(!tab1Html.includes('undefined'), 'Tab 1 pantalla no debe contener undefined');

lastOpenedPrintHtml = '';
window.printGradeStatsReport('section');
assert(lastOpenedPrintHtml.includes('Dra. Elena Marisol Estrada de Solís'), 'printGradeStatsReport(section) debe incluir Directora dinámica');
assert(lastOpenedPrintHtml.includes('Profa. Carmen Lucía Méndez Ortega'), 'printGradeStatsReport(section) debe incluir Secretaria dinámica');
assert(lastOpenedPrintHtml.includes('Comisión de Evaluación'), 'printGradeStatsReport(section) debe incluir Comisión de Evaluación');
assert(lastOpenedPrintHtml.includes('( S E L L O )'), 'printGradeStatsReport(section) debe incluir Sello');

lastOpenedPrintHtml = '';
window.printGradeStatsReport('grades');
assert(lastOpenedPrintHtml.includes('Dra. Elena Marisol Estrada de Solís'), 'printGradeStatsReport(grades) debe incluir Directora dinámica');

lastDownloadedExcelHtml = '';
window.exportGradeStatsOfficialExcel();
assert(lastDownloadedExcelHtml.includes('Dra. Elena Marisol Estrada de Solís'), 'Excel de Actas Estadísticas debe incluir firma de Directora dinámica');
assert(lastDownloadedExcelHtml.includes('Profa. Carmen Lucía Méndez Ortega'), 'Excel de Actas Estadísticas debe incluir firma de Secretaria dinámica');
assert(lastDownloadedExcelHtml.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), 'Excel debe usar nombre institucional correcto');
assert(!lastDownloadedExcelHtml.includes('ESCUELA NACIONAL EN CIENCIAS'), 'Excel no debe tener error tipográfico EN CIENCIAS');
console.log('✓ [TEST 1] Tab 1 (Pantalla Resumen + Sábana, Impresión Sección/Grados y Excel) verificados con firmas dinámicas.');

// 2. Tab 2: Cuadro de Resumen Estadístico Oficial MINEDUC (2027 activo y 2026 histórico)
window._currentGradeStatsActiveTab = 'cuadro';
window.renderCuadroEstadisticoOficial();
const cuadroScreen2027 = domNodes.gradeStatsDocumentContainer.innerHTML;
assert(cuadroScreen2027.includes('Dra. Elena Marisol Estrada de Solís'), 'Cuadro Estadístico 2027 pantalla debe usar Directora dinámica');
assert(cuadroScreen2027.includes('Profa. Carmen Lucía Méndez Ortega'), 'Cuadro Estadístico 2027 pantalla debe incluir Secretaria dinámica');
assert(cuadroScreen2027.includes('( S E L L O )'), 'Cuadro Estadístico pantalla debe incluir Sello');

lastOpenedPrintHtml = '';
window.printCuadroEstadisticoOficial();
assert(lastOpenedPrintHtml.includes('Dra. Elena Marisol Estrada de Solís'), 'printCuadroEstadisticoOficial debe usar Directora dinámica');
assert(lastOpenedPrintHtml.includes('Profa. Carmen Lucía Méndez Ortega'), 'printCuadroEstadisticoOficial debe incluir Secretaria dinámica');
assert(lastOpenedPrintHtml.includes('size: letter landscape'), 'printCuadroEstadisticoOficial debe mantener formato carta horizontal');

lastBlobText = '';
window.exportGradeStatsOfficialExcel();
assert(lastBlobText.includes('Dra. Elena Marisol Estrada de Solís'), 'Excel de Cuadro Estadístico debe incluir Directora dinámica');
assert(lastBlobText.includes('Profa. Carmen Lucía Méndez Ortega'), 'Excel de Cuadro Estadístico debe incluir Secretaria dinámica');
console.log('✓ [TEST 2] Tab 2 (Cuadro Resumen Estadístico MINEDUC Pantalla, Print y Excel) verificados con firmas dinámicas.');

// 3. Tab 3: Alumnos Reprobados y Recuperación (Pantalla + Print + Excel)
window._currentGradeStatsActiveTab = 'reprobados';
window.renderReprobadosRecuperacionView();
const repScreen = domNodes.gradeStatsDocumentContainer.innerHTML;
assert(repScreen.includes('encco-stat-signatures'), 'Tab 3 pantalla debe incluir pie institucional de firmas');
assert(repScreen.includes('Dra. Elena Marisol Estrada de Solís'), 'Tab 3 pantalla debe incluir Directora dinámica');
assert(repScreen.includes('Profa. Carmen Lucía Méndez Ortega'), 'Tab 3 pantalla debe incluir Secretaria dinámica');

lastOpenedPrintHtml = '';
window.printReprobadosRecuperacionView();
assert(lastOpenedPrintHtml.includes('Dra. Elena Marisol Estrada de Solís'), 'printReprobadosRecuperacionView debe usar Directora dinámica');
assert(lastOpenedPrintHtml.includes('Profa. Carmen Lucía Méndez Ortega'), 'printReprobadosRecuperacionView debe usar Secretaria dinámica');

lastBlobText = '';
window.exportReprobadosRecuperacionExcel();
assert(lastBlobText.includes('Dra. Elena Marisol Estrada de Solís'), 'Excel de Recuperación debe usar Directora dinámica');
console.log('✓ [TEST 3] Tab 3 (Reprobados y Recuperación Pantalla, Print y Excel) verificados con firmas dinámicas.');

// 4. Reporte Ejecutivo de Analítica Estadística (analytics.js)
lastOpenedPrintHtml = '';
window.EnccoAnalytics.printExecutiveRiskReport();
assert(lastOpenedPrintHtml.includes('Dra. Elena Marisol Estrada de Solís'), 'Informe Ejecutivo de Riesgo debe incluir firmas dinámicas');
console.log('✓ [TEST 4] Informe Ejecutivo Estadístico (analytics.js) verificado con firmas dinámicas.');

// 5. Garantía de CERO pérdida/mutación de datos en STATE
assert.strictEqual(JSON.stringify(global.STATE.users), snapshotUsersJson, 'STATE.users no debe sufrir ninguna mutación ni pérdida');
assert.strictEqual(JSON.stringify(global.STATE.students), snapshotStudentsJson, 'STATE.students no debe sufrir ninguna mutación ni pérdida');
console.log('✓ [TEST 5] Cero mutación ni pérdida de datos confirmada en STATE.users y STATE.students.');

console.log('\n========================================================================');
console.log('✅ TODAS LAS PRUEBAS DE FIRMAS DINÁMICAS PASARON AL 100%');
console.log('========================================================================\n');
