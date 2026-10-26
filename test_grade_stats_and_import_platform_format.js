/**
 * Test Suite: Promedios y Estadísticas (A.1 y A.4) + Importación Universal de Notas con Formato de la Plataforma (B.1 y B.2)
 */
const fs = require('fs');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 PRUEBAS: PROMEDIOS/ESTADÍSTICAS (A.1, A.4) E IMPORTACIÓN EXCEL (B.1, B.2)');
console.log('========================================================================\n');

const appCode = fs.readFileSync('./app.js', 'utf8');
const gradeStatsCode = fs.readFileSync('./grade_stats.js', 'utf8');
const analyticsCode = fs.readFileSync('./analytics.js', 'utf8');

// Mock DOM & Global Environment
const elements = {};
global.window = global;
global.document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => ({ tagName: tag, style: {}, appendChild: () => {}, click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {}, insertAdjacentHTML: () => {} },
    querySelectorAll: () => []
};
global.sessionStorage = { getItem: () => null, setItem: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.escapeHtml = (s) => String(s || '');
global.hasRolePermission = () => true;
global.formatStudentDisplayName = (s) => `${s.lastName || ''}, ${s.firstName || ''}`.replace(/^,\s*/, '').trim() || s.name || '';
global.isMateriaEspecialGraduacion = (sub) => {
    const c = (sub || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return c.includes('seminario') || c.includes('practica');
};
global.isSubjectBimestreExonerated = (st, subj, bim) => {
    if (!st || !Array.isArray(st.academicExceptions)) return false;
    return st.academicExceptions.some(ex => ex.active !== false && ex.type === 'EXONERADO' && (ex.bimestre === 'ALL' || Number(ex.bimestre) === Number(bim)));
};
global.isGradebookEditableForUser = () => ({ editable: true });
global.ensureStudentGradebookStructure = (st, subj) => {
    if (!st.gradebookDetails) st.gradebookDetails = {};
    if (!st.gradebookDetails[subj]) st.gradebookDetails[subj] = {};
    for (let u = 1; u <= 4; u++) {
        if (!st.gradebookDetails[subj][u]) {
            st.gradebookDetails[subj][u] = { activities: [0,0,0,0,0,0,0,0,0,0], zona: 0, exam: 0, total: 0 };
        }
    }
    if (!st.grades) st.grades = {};
    if (!Array.isArray(st.grades[subj])) st.grades[subj] = [0, 0, 0, 0];
};
global.saveStateToLocalStorage = () => {};
global.loadTeacherGradebook = () => {};
global.renderGradebookTable = () => {};
let lastToast = null;
global.showToast = (msg, type) => { lastToast = { msg, type }; };

global.STATE = {
    currentRole: 'admin',
    currentUser: { id: 'admin-1', name: 'Administrador', role: 'admin' },
    activeCycle: '2026',
    pensumCatalog: [
        { id: 'c1', grade: '4to Perito Contador', name: 'Contabilidad de Sociedades', order: 1 },
        { id: 'c2', grade: '4to Perito Contador', name: 'Caligrafía y Ortografía', order: 2 },
        { id: 'c3', grade: '4to Perito Contador', name: 'Redacción y Correspondencia Mercantil', order: 3 },
        { id: 'c4', grade: '5to Perito Contador', name: 'Contabilidad de Costos', order: 1 }
    ],
    pensum: [
        { id: 'p-4a-soc', grade: '4to Perito Contador', gradeCode: '4A', section: 'A', career: 'Perito Contador', subject: 'Contabilidad de Sociedades', teacher: 'Lic. Juan Pérez' },
        { id: 'p-4a-cal', grade: '4to Perito Contador', gradeCode: '4A', section: 'A', career: 'Perito Contador', subject: 'Caligrafía y Ortografía', teacher: 'Lic. Juan Pérez' },
        { id: 'p-4a-red', grade: '4to Perito Contador', gradeCode: '4A', section: 'A', career: 'Perito Contador', subject: 'Redacción y Correspondencia Mercantil', teacher: 'Lic. Juan Pérez' },
        { id: 'p-5a-cos', grade: '5to Perito Contador', gradeCode: '5A', section: 'A', career: 'Perito Contador', subject: 'Contabilidad de Costos', teacher: 'Licda. María López' }
    ],
    students: [
        {
            id: 'stu-4a-1',
            no: 1,
            personalCode: 'B123JUT',
            cui: '1234567890101',
            firstName: 'Carlos Andrés',
            lastName: 'Gómez Pineda',
            grade: '4to Perito Contador',
            section: 'A',
            career: 'Perito Contador',
            status: 'Activo',
            grades: {
                'Contabilidad de Sociedades': [80, 84, 76, 80],
                'Caligrafía': [90, 90, 90, 90],
                'Redacción y Correspondencia': [70, 70, 70, 70]
            },
            gradebookDetails: {}
        },
        {
            id: 'stu-5a-1',
            no: 1,
            personalCode: 'C999JUT',
            cui: '2234567890101',
            firstName: 'Ana Sofía',
            lastName: 'Martínez Solís',
            grade: '5to Perito Contador',
            section: 'A',
            career: 'Perito Contador',
            status: 'Activo',
            grades: {},
            gradebookDetails: {}
        }
    ],
    attendance: []
};

// Extract functions from app.js
function extractSliceFromApp(startMarker, endMarker) {
    const startIdx = appCode.indexOf(startMarker);
    assert(startIdx !== -1, `No se encontró ${startMarker} en app.js`);
    const endIdx = appCode.indexOf(endMarker, startIdx);
    assert(endIdx !== -1, `No se encontró ${endMarker} en app.js`);
    return appCode.slice(startIdx, endIdx);
}

eval(extractSliceFromApp('const OFFICIAL_CNB_PENSUM_ORDER = {', 'function buildStudentReportCardInnerHtml(s)'));
eval(extractSliceFromApp('async function processGradebookImportRows(', '// printGradebookOfficialList implementado arriba'));
global.getReportCardSubjects = getReportCardSubjects;
global.getReportCardSubjectGrades = getReportCardSubjectGrades;

eval(gradeStatsCode);
eval(analyticsCode);

async function runTests() {
    // -------------------------------------------------------------------------
    // TEST 1 (A.1): Carga inmediata en Promedios y Estadísticas sin pantalla vacía
    // -------------------------------------------------------------------------
    elements['gradeStatsBimestreSelect'] = { value: 'FINAL' };
    elements['gradeStatsGradeFilter'] = { value: '' }; // Simula entrar sin selección previa
    elements['gradeStatsSectionFilter'] = { value: '', innerHTML: '', options: [] };
    elements['gradeStatsDocumentContainer'] = { innerHTML: '' };

    renderGradeStatsView();

    assert.strictEqual(elements['gradeStatsGradeFilter'].value, '4', 'Debe autoseleccionar 4to grado por defecto');
    assert.strictEqual(elements['gradeStatsSectionFilter'].value, 'ALL', 'Debe autoseleccionar Todas las Secciones (Consolidado)');
    assert(!elements['gradeStatsDocumentContainer'].innerHTML.includes('Seleccione los Parámetros del Reporte'), 'NO debe mostrar pantalla vacía de Seleccione los Parámetros');
    assert(elements['gradeStatsDocumentContainer'].innerHTML.includes('GÓMEZ PINEDA, CARLOS ANDRÉS'), 'Debe renderizar inmediatamente al estudiante en la sábana de promedios');
    console.log('✅ TEST 1 (A.1): Promedios y Estadísticas carga los datos inmediatamente al entrar (cero pantallas vacías).');

    // -------------------------------------------------------------------------
    // TEST 2 (A.4): Emparejamiento flexible de materias + Separación Dos Ramos + Analítica Predictiva
    // -------------------------------------------------------------------------
    const stu4 = STATE.students[0];
    const rCalig = getReportCardSubjectGrades(stu4, 'Caligrafía y Ortografía');
    const rRedac = getReportCardSubjectGrades(stu4, 'Redacción y Correspondencia Mercantil');
    assert.strictEqual(rCalig.avg, 90, 'Caligrafía y Ortografía debe emparejar con alias Caligrafía (90 pts)');
    assert.strictEqual(rRedac.avg, 70, 'Redacción y Correspondencia Mercantil debe mantenerse separada (70 pts)');

    const analyticsSummary = window.EnccoAnalytics.getAggregatedAnalytics('ALL', '4to Perito Contador', 'ALL');
    assert.strictEqual(analyticsSummary.evaluatedCount, 1, 'Analítica Predictiva debe evaluar correctamente al estudiante de 4to');
    assert.strictEqual(analyticsSummary.studentsList[0].overallAverage, 80, 'Promedio general en Analítica Predictiva debe ser 80 ((80+90+70)/3)');
    console.log('✅ TEST 2 (A.4): Unificación de materias, separación de Dos Ramos y Analítica Predictiva verificadas.');

    // -------------------------------------------------------------------------
    // TEST 3 (B.1 y B.2): Importación con Formato 1 (exportGradebookOfficialExcel con columna Resultado al final)
    // -------------------------------------------------------------------------
    elements['teacherCourseSelect'] = { value: 'p-5a-cos' };
    elements['gradebookBimestreSelect'] = { value: '1' };

    const rowsFormat1 = [
        ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES - ENCCO JUTIAPA'],
        ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES - CICLO ESCOLAR 2026'],
        ['Cátedra:', 'Contabilidad de Costos', '', 'Catedrático:', 'Licda. María López', '', 'Grado:', '5to Perito Contador', '', 'Sección:', 'A', '', 'Bimestre:', '1o. Bimestre'],
        ['Ponderación Oficial:', 'Zona: 40 pts', '', 'Examen / Evaluación: 60 pts', '', 'Total: 100 pts'],
        [],
        [
            'No.', 'Código Personal', 'CUI / DPI', 'Apellidos y Nombres del Estudiante',
            'Act 1: Tarea 1 (10 pts)', 'Act 2: Tarea 2 (10 pts)', 'Act 3: Lab 1 (10 pts)', 'Act 4: Lab 2 (10 pts)',
            'Act 5: Act 5 (0 pts)', 'Act 6: Act 6 (0 pts)', 'Act 7: Act 7 (0 pts)', 'Act 8: Act 8 (0 pts)', 'Act 9: Act 9 (0 pts)', 'Act 10: Act 10 (0 pts)',
            'Total Zona (40 pts)', 'Examen (60 pts)', 'Total Bimestre (100 pts)', 'Resultado'
        ],
        [
            1, 'C999JUT', '2234567890101', 'Martínez Solís, Ana Sofía',
            9, 8, 10, 8, 0, 0, 0, 0, 0, 0,
            0, // Incluso si el caché de fórmula en Excel venía en 0, debe sumar 9+8+10+8 = 35
            52,
            0, // Incluso si el caché de fórmula en Excel venía en 0, debe sumar 35+52 = 87
            'APROBADO'
        ]
    ];

    await processGradebookImportRows(rowsFormat1, STATE.pensum[3], 1, 'Cuadro_Notas_Contabilidad_de_Costos_5to_A_Bim1.xlsx');

    const stu5 = STATE.students[1];
    const det5B1 = stu5.gradebookDetails['Contabilidad de Costos'][1];
    assert.strictEqual(det5B1.zona, 35, 'Zona importada en Formato 1 debe ser 35');
    assert.strictEqual(det5B1.exam, 52, 'Examen importado en Formato 1 debe ser 52');
    assert.strictEqual(det5B1.total, 87, 'Total importado en Formato 1 debe ser 87 (sin confundirse con columna Resultado)');
    assert.strictEqual(stu5.grades['Contabilidad de Costos'][0], 87, 'student.grades[0] debe actualizarse a 87');
    console.log('✅ TEST 3 (B.1, B.2): Importación desde Cuadro Oficial de Registro de Calificaciones (Formato 1) exitosa.');

    // -------------------------------------------------------------------------
    // TEST 4 (B.1 y B.2): Importación con Formato 2 (generateOfficialExcelList CUADRO_CALIFICACIONES_EXCEL con metadatos en misma celda y "1º Bimestre")
    // -------------------------------------------------------------------------
    const rowsFormat2 = [
        ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES — JUTIAPA'],
        ['JORNADA MATUTINA | CICLO ESCOLAR 2026 | HOJA OFICIO'],
        ['CUADRO DE REGISTRO DE CALIFICACIONES — 5to Perito Contador (Sección A)'],
        ['CARRERA: Perito Contador', '', '', 'GRADO Y SECCIÓN: 5to Perito Contador (Sección A)', '', '', '', 'MAESTRO(A) GUÍA: Licda. María López', '', '', '', '', '', '', 'FECHA: 15/10/2026'],
        ['ASIGNATURA / MATERIA: Contabilidad de Costos', '', '', 'CATEDRÁTICO(A): Licda. María López', '', '', '', 'BIMESTRE: 2º Bimestre', '', '', '', 'ESTADÍSTICA: Total: 1'],
        [],
        [
            'No.', 'ESTUDIANTE (APELLIDOS Y NOMBRES)', 'CÓDIGO PERSONAL',
            'Act 1\n(4p)', 'Act 2\n(4p)', 'Act 3\n(4p)', 'Act 4\n(4p)', 'Act 5\n(4p)', 'Act 6\n(4p)', 'Act 7\n(4p)', 'Act 8\n(4p)', 'Act 9\n(4p)', 'Act 10\n(4p)',
            'ZONA (40 pts)', 'EXAMEN (60 pts)', 'TOTAL (100 pts)', 'RESULTADO'
        ],
        [
            1, 'Martínez Solís, Ana Sofía', 'C999JUT',
            4, 4, 4, 4, 4, 3, 3, 3, 3, 4,
            36, 55, 91, 'APROBADO'
        ]
    ];

    elements['gradebookBimestreSelect'] = { value: '2' };
    await processGradebookImportRows(rowsFormat2, STATE.pensum[3], 2, 'Cuadro_Calificaciones_5A.xlsx');

    const det5B2 = stu5.gradebookDetails['Contabilidad de Costos'][2];
    assert.strictEqual(det5B2.zona, 36, 'Zona importada en Formato 2 (2º Bimestre autodetectado) debe ser 36');
    assert.strictEqual(det5B2.exam, 55, 'Examen importado en Formato 2 debe ser 55');
    assert.strictEqual(det5B2.total, 91, 'Total importado en Formato 2 debe ser 91');
    assert.strictEqual(stu5.grades['Contabilidad de Costos'][1], 91, 'student.grades[1] (2º Bimestre) debe actualizarse a 91');
    console.log('✅ TEST 4 (B.1, B.2): Importación desde Modelo Oficial de Impresión Excel (Formato 2 con metadatos en misma celda y 2º Bimestre) exitosa.');

    // -------------------------------------------------------------------------
    // TEST 5 (B.1 y B.2): Importación con Formato 3 (LISTA_COTEJO de 40 pts preservando Examen existente)
    // -------------------------------------------------------------------------
    const rowsFormat3 = [
        ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES — JUTIAPA'],
        ['JORNADA MATUTINA | CICLO ESCOLAR 2026 | HOJA OFICIO'],
        ['LISTA DE COTEJO — 10 ACTIVIDADES DE ZONA (40 PTS) — 5to Perito Contador (Sección A)'],
        ['CARRERA: Perito Contador', '', '', 'GRADO Y SECCIÓN: 5to Perito Contador (Sección A)'],
        ['ASIGNATURA / MATERIA: Contabilidad de Costos', '', '', 'CATEDRÁTICO(A): Licda. María López', '', '', '', 'BIMESTRE: 2º Bimestre'],
        [],
        ['No.', 'ESTUDIANTE (APELLIDOS Y NOMBRES)', 'CÓDIGO PERSONAL', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'TOTAL ZONA (40p)', 'NIVEL DE LOGRO', 'OBSERVACIONES'],
        ['', 'Valor de Actividad ->', '', '4p', '4p', '4p', '4p', '4p', '4p', '4p', '4p', '4p', '4p', '40p', '', ''],
        [1, 'Martínez Solís, Ana Sofía', 'C999JUT', 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 38, 'EXCELENTE', '']
    ];

    await processGradebookImportRows(rowsFormat3, STATE.pensum[3], 2, 'Lista_Cotejo_5A.xlsx');

    const det5B2AfterCotejo = stu5.gradebookDetails['Contabilidad de Costos'][2];
    assert.strictEqual(det5B2AfterCotejo.zona, 38, 'Zona debe actualizarse a 38 desde Lista de Cotejo');
    assert.strictEqual(det5B2AfterCotejo.exam, 55, 'Examen previo (55) debe preservarse intacto al importar Lista de Cotejo');
    assert.strictEqual(det5B2AfterCotejo.total, 93, 'Total debe recalcularse a 38 + 55 = 93');
    console.log('✅ TEST 5 (B.1, B.2): Importación desde Lista de Cotejo (Formato 3) actualiza Zona y preserva Examen.');

    console.log('\n========================================================================');
    console.log('🎉 ¡TODAS LAS PRUEBAS (A.1, A.4, B.1, B.2) PASARON AL 100% SIN ERRORES!');
    console.log('========================================================================');
}

runTests().catch(err => {
    console.error('❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
});
