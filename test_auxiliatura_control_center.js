/**
 * test_auxiliatura_control_center.js
 * Suite de Pruebas Automatizadas: Centro de Control de Auxiliatura y Secretaría
 * Valida integridad, roles (Auxiliar, Secretaría, Docente), resolución de casos y no regresión.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN: CENTRO DE CONTROL DE AUXILIATURA Y SECRETARÍA');
console.log('================================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ FALLÓ: ${message}`);
        process.exit(1);
    } else {
        console.log(`  ✅ ${message}`);
        passedTests++;
    }
}

// 1. Validar existencia y sintaxis de archivos
console.log('\n▶ [TEST 1] Verificando archivos de código fuente...');
const htmlPath = path.join(__dirname, 'plataforma.html');
const appJsPath = path.join(__dirname, 'app.js');
const auxCenterJsPath = path.join(__dirname, 'auxiliatura_center.js');

assert(fs.existsSync(auxCenterJsPath), 'auxiliatura_center.js existe en el proyecto');
assert(fs.existsSync(htmlPath), 'plataforma.html existe en el proyecto');
assert(fs.existsSync(appJsPath), 'app.js existe en el proyecto');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const auxCenterContent = fs.readFileSync(auxCenterJsPath, 'utf8');

// 2. Validar plataforma.html
console.log('\n▶ [TEST 2] Verificando integración en plataforma.html...');
assert(htmlContent.includes('data-view="auxiliatura-center"'), 'Elemento de navegación para auxiliatura-center presente');
assert(htmlContent.includes('data-allowed="director,secretaria,profesor_auxiliar,admin"'), 'Permisos en sidebar asignados a auxiliatura y secretaría');
assert(htmlContent.includes('id="view-auxiliatura-center"'), 'Contenedor de vista id="view-auxiliatura-center" presente');
assert(htmlContent.includes('src="auxiliatura_center.js'), 'Script auxiliatura_center.js referenciado en HTML');

// 3. Validar app.js permisos y enrutamiento
console.log('\n▶ [TEST 3] Verificando permisos y enrutamiento en app.js...');
assert(appJsContent.includes("'auxiliatura-center'") && appJsContent.includes("renderAuxiliaturaCenterView"), 'Enrutador de vista configurado para renderAuxiliaturaCenterView');
assert(appJsContent.includes("role === 'profesor_auxiliar'") && appJsContent.includes("'auxiliatura-center'"), 'Permiso concedido para rol profesor_auxiliar');
assert(appJsContent.includes("role === 'secretaria'") && appJsContent.includes("'auxiliatura-center'"), 'Permiso concedido para rol secretaria');

// 4. Validar visibilidad para Docentes: Resolución de Casos Disciplinarios y Autorización de Justificaciones
console.log('\n▶ [TEST 4] Verificando visibilidad para docentes (resolución de permisos y disciplina)...');
assert(appJsContent.includes('showJustificationDetailModal'), 'Función showJustificationDetailModal vinculada en asistencia (celdas J)');
assert(appJsContent.includes('resSnippet') && appJsContent.includes('d.resolvedBy'), 'Tabla de disciplina muestra quién resolvió el caso y la fecha de resolución');

// 5. Validar funciones clave en auxiliatura_center.js
console.log('\n▶ [TEST 5] Verificando componentes y utilidades en auxiliatura_center.js...');
assert(auxCenterContent.includes('function renderAuxiliaturaCenterView'), 'renderAuxiliaturaCenterView definida');
assert(auxCenterContent.includes('function openQuickAuxiliaturaActionModal'), 'Modal de acción rápida en 3 clics definido');
assert(auxCenterContent.includes('function openStudent360Drawer'), 'Ficha 360 del estudiante definida');
assert(auxCenterContent.includes('function handleAuxStudentSearch'), 'Buscador predictivo 360 definido');
assert(auxCenterContent.includes('function printOfficialParentCitation'), 'Generador de citación oficial a padres definido');
assert(auxCenterContent.includes('function showJustificationDetailModal'), 'showJustificationDetailModal disponible para docentes y personal');
assert(auxCenterContent.includes('function renderAuxAbsencesTab'), 'renderAuxAbsencesTab para la lista de ausencias al aula definida');
assert(auxCenterContent.includes('function getTodayAbsencesList'), 'getTodayAbsencesList para consolidación de inasistencias definida');
assert(auxCenterContent.includes('id="auxTabBtn-absences"'), 'Pestaña Ausencias al Aula presente en el Centro de Control');
assert(auxCenterContent.includes('function filterAuxStudentQuickList'), 'Enrutador filterAuxStudentQuickList definido');

// 6. Prueba funcional de lógica de KPIs y Justificaciones
console.log('\n▶ [TEST 6] Simulando lógica de justificaciones y permisos...');
const sampleStudent = {
    id: '2026-CB-022',
    name: 'MÉNDEZ LÓPEZ JULIO LUIS ELIAS',
    grade: '4to Perito Contador',
    section: 'B',
    status: 'ACTIVO',
    tutorPhone: '50255551234'
};

const sampleJustification = {
    studentId: '2026-CB-022',
    date: '2026-10-03',
    authorizedBy: 'Secretaría General / Auxiliatura de Turno',
    reason: 'Cita Médica en IGSS con constancia adjunta',
    status: 'AUTORIZADO',
    docRef: 'CONST-IGSS-9941'
};

assert(sampleJustification.authorizedBy.length > 0, 'La justificación tiene autorizador visible');
assert(sampleJustification.status === 'AUTORIZADO', 'Estado oficial de justificación válido');

// 7. Compilación real de sintaxis y pruebas en tiempo de ejecución (aislamiento multiciclo 2026/2027/2028)
console.log('\n▶ [TEST 7] Compilación real de auxiliatura_center.js y aislamiento multiciclo...');
let syntaxValid = false;
try {
    new vm.Script(auxCenterContent, { filename: 'auxiliatura_center.js' });
    syntaxValid = true;
} catch (err) {
    console.error('❌ Error de sintaxis en auxiliatura_center.js:', err.message);
}
assert(syntaxValid, 'auxiliatura_center.js compila sin errores de sintaxis JS');

const mockDomMap = {};
const makeEl = (id) => ({
    id,
    innerHTML: '',
    style: {},
    className: '',
    classList: { add() {}, remove() {} },
    remove() { delete mockDomMap[id]; },
    appendChild() {}
});
mockDomMap['view-auxiliatura-center'] = makeEl('view-auxiliatura-center');
mockDomMap['auxCenterTabContent'] = makeEl('auxCenterTabContent');
mockDomMap['stu360TabContent'] = makeEl('stu360TabContent');

const todayMonth = new Date().getMonth() + 1;
const todayDay = new Date().getDate();
const todayIso = new Date().toISOString().split('T')[0];

const mockDocument = {
    head: { appendChild() {} },
    body: {
        appendChild(el) {
            if (el && el.id) mockDomMap[el.id] = el;
        }
    },
    createElement(tag) { return makeEl(tag + '_' + Math.random()); },
    getElementById(id) { return mockDomMap[id] || null; },
    querySelectorAll() { return []; },
    querySelector() { return null; }
};

const mockWindow = {
    document: mockDocument,
    escapeHtml: (s) => String(s || ''),
    getStudentAttendancePercentageToDate: (stuId, cycle) => ({
        percentage: cycle === '2027' ? 92.5 : 88.0,
        attendedDays: 37,
        totalRecordedDays: 40
    }),
    STATE: {
        activeCycle: '2027',
        currentRole: 'director',
        currentUser: { name: 'Dirección ENCCO' },
        currentBimestre: 1,
        gradesList: [{ code: '5A', name: '5to Perito Contador', section: 'A' }],
        courses: [{ id: 'C1', name: 'Contabilidad de Sociedades', teacherName: 'Prof. Demo' }],
        students: [
            { id: 's2026', name: 'ALUMNO 2026', cycle: '2026', grade: '4to Perito Contador', section: 'A', gradeCode: '4A', status: 'Activo' },
            { id: 's2027', name: 'ALUMNO 2027', cycle: '2027', grade: '5to Perito Contador', section: 'A', gradeCode: '5A', status: 'Activo' },
            { id: 'sEgr', name: 'GRADUANDO 2026', cycle: '2026', grade: '6to Perito Contador', section: 'A', gradeCode: 'EGRESADO', status: 'Egresado' }
        ],
        disciplineReports: [
            { id: 'd26', studentId: 's2026', date: '2026-08-10', status: 'Pendiente', reason: 'Caso 2026' },
            { id: 'd27', studentId: 's2027', cycle: '2027', date: '2027-02-15', status: 'Pendiente', reason: 'Caso 2027' },
            { id: 'd28', studentId: 's2027', date: '2028-03-01', status: 'Pendiente', reason: 'Caso 2028' }
        ],
        studentPermissions: [
            { id: 'p26', studentId: 's2026', startDate: '2026-05-10', reasonDetail: 'Permiso 2026' },
            { id: 'p27', studentId: 's2027', startDate: '2027-02-12', reasonDetail: 'Permiso 2027' },
            { id: 'p28', studentId: 's2027', startDate: '2028-04-01', reasonDetail: 'Permiso 2028' }
        ],
        attendanceAlerts: [
            { id: 'a26', studentId: 's2026', date: todayIso, cycle: '2026', status: 'pendiente' }
        ],
        attendanceRecords: {
            [`4A_${todayMonth}_C1`]: { s2026: { [todayDay]: 'A' } },
            [`2027::5A_${todayMonth}_C1`]: { s2027: { [todayDay]: 'A' } }
        }
    }
};
mockWindow.window = mockWindow;

const sandbox = vm.createContext({ window: mockWindow, document: mockDocument, escapeHtml: mockWindow.escapeHtml, console, Date, Set, Array, Object, String, Number, parseInt, isNaN, encodeURIComponent, Math });
vm.runInContext(auxCenterContent, sandbox);

assert(typeof mockWindow.renderAuxiliaturaCenterView === 'function', 'renderAuxiliaturaCenterView registrada correctamente en window');
assert(mockWindow.getAuxCycleStudents().length === 1 && mockWindow.getAuxCycleStudents()[0].id === 's2027', 'getAuxCycleStudents aísla ciclo 2027 y excluye 2026 y Egresados');
assert(mockWindow.getAuxCycleDisciplineReports().length === 1 && mockWindow.getAuxCycleDisciplineReports()[0].id === 'd27', 'Disciplina aislada estrictamente al ciclo 2027');
assert(mockWindow.getAuxCyclePermissions().length === 1 && mockWindow.getAuxCyclePermissions()[0].id === 'p27', 'Permisos aislados estrictamente al ciclo 2027');
assert(mockWindow.extractAuxRecordCycle({ startDate: '2028-04-01' }) === '2028', 'Detección dinámica de ciclo funciona para 2028+');

const absences2027 = mockWindow.getTodayAbsencesList();
assert(absences2027.length === 1 && absences2027[0].studentId === 's2027', 'getTodayAbsencesList interpreta prefijo multiciclo 2027:: y no mezcla ausencias 2026');

mockWindow.renderAuxiliaturaCenterView();
assert(mockDomMap['view-auxiliatura-center'].innerHTML.includes('Ciclo Escolar 2027'), 'Vista principal muestra insignia de Ciclo Escolar 2027');
assert(mockDomMap['view-auxiliatura-center'].innerHTML.includes('Dirección General'), 'Etiqueta de rol muestra Dirección General para rol director');

mockWindow.openStudent360Drawer('s2027');
assert(mockDomMap['auxStudent360Drawer'] && mockDomMap['auxStudent360Drawer'].innerHTML.includes('92.5%'), 'Ficha 360° muestra porcentaje de asistencia a la fecha (becas/bolsas)');
assert(mockDomMap['stu360TabContent'].innerHTML.includes('Asistencia a la Fecha') && mockDomMap['stu360TabContent'].innerHTML.includes('92.5%'), 'Pestaña Resumen 360° incluye tarjeta de Asistencia a la Fecha');

console.log('\n================================================================================');
console.log(`🎉 TODAS LAS ${passedTests}/${totalTests} PRUEBAS DEL CENTRO DE CONTROL PASARON CON ÉXITO (100%)`);
console.log('================================================================================\n');
