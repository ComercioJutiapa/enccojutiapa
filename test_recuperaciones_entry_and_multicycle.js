// test_recuperaciones_entry_and_multicycle.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("=== INICIANDO VALIDACIÓN DE RECUPERACIONES (INGRESO, VERIFICACIÓN, IMPRESIÓN, EXCEL Y MULTICICLOS) ===");

// 1. Mock completo de navegador y fetch (cero llamadas reales a Firebase)
const mockDomElements = {};
const fetchCalls = [];
let lastPrintHtml = '';
let lastBlobParts = [];

global.window = global;
global.Blob = function(parts) {
    lastBlobParts = parts || [];
    this.parts = lastBlobParts;
};
global.URL = {
    createObjectURL: () => 'blob:mock-excel',
    revokeObjectURL: () => {}
};
global.document = {
    getElementById: function(id) {
        if (!mockDomElements[id]) {
            mockDomElements[id] = {
                id,
                style: {},
                classList: { add() {}, remove() {}, contains() { return false; } },
                innerHTML: '',
                value: 'ALL',
                options: [],
                remove() {}
            };
        }
        return mockDomElements[id];
    },
    querySelectorAll: () => [],
    createElement: (tag) => ({
        tagName: tag,
        style: {},
        setAttribute() {},
        appendChild() {},
        click() {}
    }),
    body: { appendChild() {}, removeChild() {} },
    head: { appendChild() {} }
};
global.window.open = function() {
    return {
        document: {
            open() {},
            write(html) { lastPrintHtml = String(html || ''); },
            close() {}
        },
        focus() {},
        print() {}
    };
};
global.fetch = async function(url, opts = {}) {
    fetchCalls.push({
        url: String(url),
        method: String((opts && opts.method) || 'GET').toUpperCase(),
        body: opts && opts.body ? opts.body : null
    });
    if (String(url).includes('/historico/2027.json')) {
        return {
            ok: true,
            json: async () => global._mockArchived2027 || null
        };
    }
    return { ok: true, json: async () => ({}) };
};
global.showToast = function() {};
global.getFirebaseDatabaseUrl = () => 'https://mock-encco-rtdb.firebaseio.com';
global.renderDashboard = () => {};

// Cargar módulos del sistema
require('./audit_2026_data.js');
require('./grade_stats.js');
require('./cycle_archiver.js');

async function runTests() {
    // TEST 1: Registro de API pública de Recuperaciones
    console.log("\n[TEST 1] Verificando funciones registradas en window...");
    [
        'switchReprobadosConDerechoMode',
        'onReprobadosPostStatusChange',
        'getStudentSubjectRecoveryRecord',
        'evaluateStudentPostRecovery',
        'canEditRecoveryGrade',
        'saveRecoverySubjectGrade',
        'printReprobadosRecuperacionView',
        'exportReprobadosRecuperacionExcel'
    ].forEach(fn => {
        assert.strictEqual(typeof window[fn], 'function', `Falta función global ${fn}`);
    });
    console.log("✓ Todas las funciones públicas de recuperación están registradas.");

    // TEST 2: RBAC multi-rol y bloqueo histórico para docentes
    console.log("\n[TEST 2] Verificando permisos RBAC (Director, Secretaria, Docente propio vs ajeno, Histórico)...");
    global.STATE = {
        activeCycle: '2027',
        currentRole: 'director',
        currentUser: { name: 'Ana Directora', role: 'director' },
        students: [],
        pensum: [],
        users: [],
        recuperaciones: {},
        schoolHeader: { schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES', schoolCode: '22-01-0014-46', jornada: 'Matutina', location: 'Jutiapa, Guatemala' }
    };
    assert.strictEqual(window.canEditRecoveryGrade('Otro Catedrático', '2027'), true, 'Director debe editar cualquier curso en 2027');

    global.STATE.currentRole = 'secretaria';
    global.STATE.currentUser = { name: 'Secretaria Oficial', role: 'secretaria' };
    assert.strictEqual(window.canEditRecoveryGrade('Otro Catedrático', '2027'), true, 'Secretaria debe editar cualquier curso en 2027');

    global.STATE.isHistoricalReadOnlyMode = true;
    global.STATE.viewingHistoricalCycle = '2026';
    global.STATE.currentRole = 'director';
    assert.strictEqual(window.canEditRecoveryGrade('Cualquiera', '2026'), true, 'Director puede editar recuperación histórica 2026');

    global.STATE.currentRole = 'docente';
    global.STATE.currentUser = { name: 'Carlos Méndez', role: 'docente' };
    assert.strictEqual(window.canEditRecoveryGrade('Carlos Méndez', '2026'), false, 'Docente NO debe editar ciclos históricos');

    global.STATE.isHistoricalReadOnlyMode = false;
    global.STATE.viewingHistoricalCycle = null;
    assert.strictEqual(window.canEditRecoveryGrade('Carlos Méndez', '2027'), true, 'Docente SÍ edita su propio curso en ciclo activo 2027');
    assert.strictEqual(window.canEditRecoveryGrade('María López', '2027'), false, 'Docente NO edita curso de otro catedrático');
    console.log("✓ Reglas RBAC validadas.");

    // TEST 3: Ciclo 2027 — Ingreso 1ª y 2ª Oportunidad, Validación 0-100, Cero mutación de notas ordinarias y Limpieza sin residuos
    console.log("\n[TEST 3] Verificando Ciclo 2027: 1ª/2ª oportunidad, notas ordinarias intactas y DELETE sin residuos...");
    fetchCalls.length = 0;
    const stu2027OriginalGrades = {
        'Contabilidad de Sociedades': [40, 42, 44, 42],
        'Fundamentos de Derecho': [50, 52, 50, 52],
        'Matemática Comercial': [80, 82, 85, 84]
    };
    global.STATE = {
        activeCycle: '2027',
        academicCycle: '2027',
        currentRole: 'director',
        currentUser: { name: 'Directora General', role: 'director' },
        schoolHeader: { schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES', schoolCode: '22-01-0014-46', jornada: 'Matutina', location: 'Jutiapa, Guatemala' },
        gradesList: [{ id: 'g4', name: '4to Perito Contador', jornada: 'Matutina', secciones: ['A'] }],
        pensum: [
            { grade: '4to Perito Contador', section: 'A', subject: 'Contabilidad de Sociedades', teacher: 'Carlos Méndez' },
            { grade: '4to Perito Contador', section: 'A', subject: 'Fundamentos de Derecho', teacher: 'Carlos Méndez' },
            { grade: '4to Perito Contador', section: 'A', subject: 'Matemática Comercial', teacher: 'María López' }
        ],
        users: [],
        students: [
            {
                id: 'stu-27-1',
                code: 'T2027A01',
                name: 'JUAN PÉREZ LÓPEZ',
                gender: 'M',
                grade: '4to Perito Contador',
                section: 'A',
                status: 'Activo',
                cycle: '2027',
                academicCycle: '2027',
                grades: JSON.parse(JSON.stringify(stu2027OriginalGrades))
            }
        ],
        recuperaciones: {}
    };
    window._enccoRecupHydratedCycles = { '2027': true };
    window._reprobadosSubView = 'con_derecho';
    window._reprobadosConDerechoMode = 'papel';
    window._reprobadosConDerechoLayout = 'horizontal';
    window._reprobadosGradeFilter = 'ALL';
    window._reprobadosSectionFilter = 'ALL';
    window._reprobadosTeacherFilter = 'ALL';
    window._reprobadosSearchQuery = '';
    window._reprobadosPostStatusFilter = 'ALL';

    window.renderReprobadosRecuperacionView();
    assert.strictEqual(window._lastReprobadosReportData.students.length, 1);
    assert.strictEqual(window._lastReprobadosReportData.students[0].isConDerecho, true);

    // 3a. Modo Papel por defecto -> casilla en blanco
    window.printReprobadosRecuperacionView();
    assert(lastPrintHtml.includes('width:62px; height:22px'), 'Modo Papel debe mantener casilla en blanco 62x22');
    assert(!lastPrintHtml.includes('Fdo.') && !lastPrintHtml.includes('Director(a)'), 'Impresión NO debe llevar firmas');
    assert(lastPrintHtml.includes('Matutina'), 'Impresión debe reflejar Jornada Matutina');

    // 3b. Ingresar 1ª oportunidad reprobada (48 pts) en Contabilidad de Sociedades
    const saved1 = await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Contabilidad de Sociedades', 1, '48');
    assert.strictEqual(saved1, true);
    const recCosto1 = window.getStudentSubjectRecoveryRecord('T2027A01', 'Contabilidad de Sociedades', 'CUARTO', '2027');
    assert(recCosto1 && recCosto1.opp1 === 48 && recCosto1.aprobada === false && recCosto1.notaFinalRecup === 48);
    assert(fetchCalls.some(c => c.method === 'PUT' && c.url.includes('/encc_school_state/recuperaciones/T2027A01/contabilidad_de_sociedades.json')));

    // Cambiar a Modo Con Notas y verificar input dinámico de 2ª oportunidad visible
    window.switchReprobadosConDerechoMode('con_notas');
    const containerHtml1 = document.getElementById('gradeStatsDocumentContainer').innerHTML;
    assert(containerHtml1.includes('1ª:') && containerHtml1.includes('2ª:'), 'Al reprobar 1ª oportunidad (<60), debe desbloquearse casilla 2ª');
    assert(containerHtml1.includes('Promovidos en Recup.'), 'Debe mostrar barra de KPIs Post-Recuperación');

    // 3c. Aprobar Contabilidad de Sociedades en 2ª oportunidad (72 pts) y Fundamentos de Derecho en 1ª (78 pts)
    await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Contabilidad de Sociedades', 2, '72');
    await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Fundamentos de Derecho', 1, '78');

    const postEval = window.evaluateStudentPostRecovery(window._lastReprobadosReportData.students[0], '2027');
    assert.strictEqual(postEval.postStatus, 'PROMOVIDO_RECUP');
    assert.strictEqual(postEval.isPromovidoRecup, true);
    assert.strictEqual(postEval.ganadas, 2);

    // Verificar que las notas ordinarias NO fueron alteradas
    assert.deepStrictEqual(global.STATE.students[0].grades, stu2027OriginalGrades, 'Notas ordinarias jamás deben sobrescribirse');

    // 3d. Impresión y Excel en Modo Con Notas (Horizontal y Vertical)
    window._reprobadosConDerechoLayout = 'horizontal';
    window.printReprobadosRecuperacionView();
    assert(lastPrintHtml.includes('CON NOTAS ASENTADAS'), 'Impresión Con Notas debe indicar subtítulo');
    assert(lastPrintHtml.includes('72 APROB.') && lastPrintHtml.includes('78 APROB.'), 'Impresión debe incluir notas asentadas');
    assert(lastPrintHtml.includes('PROMOVIDO EN RECUPERACIÓN'), 'Impresión debe mostrar estado post-recuperación');
    assert(!lastPrintHtml.includes('Fdo.'), 'Impresión Con Notas NO debe llevar firmas');

    window._reprobadosConDerechoLayout = 'vertical';
    window.printReprobadosRecuperacionView();
    assert(lastPrintHtml.includes('1ª:48/2ª:72'), 'Impresión Vertical debe detallar 1ª y 2ª oportunidad cuando aplica');
    assert(lastPrintHtml.includes('PROMOVIDO EN RECUPERACIÓN'));

    window.exportReprobadosRecuperacionExcel();
    const excelHtml = lastBlobParts.join('');
    assert(excelHtml.includes('72 pts') && excelHtml.includes('PROMOVIDO EN RECUPERACIÓN'), 'Excel debe exportar notas y estado final');

    // 3e. Protección contra escritura no autorizada (docente ajeno)
    global.STATE.currentRole = 'docente';
    global.STATE.currentUser = { name: 'Otro Catedrático', role: 'docente' };
    const fetchBeforeUnauth = fetchCalls.length;
    const unauthOk = await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Contabilidad de Sociedades', 1, '99');
    assert.strictEqual(unauthOk, false, 'Docente ajeno no debe poder guardar');
    assert.strictEqual(fetchCalls.length, fetchBeforeUnauth, 'No debe enviarse PUT no autorizado a Firebase');

    // 3f. Borrado sin residuos (vaciar oportunidades -> DELETE y limpieza de nodos vacíos)
    global.STATE.currentRole = 'director';
    global.STATE.currentUser = { name: 'Directora General', role: 'director' };
    await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Contabilidad de Sociedades', 2, '');
    await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Contabilidad de Sociedades', 1, '');
    await window.saveRecoverySubjectGrade('T2027A01', 'CUARTO', 'Fundamentos de Derecho', 1, '');
    assert(fetchCalls.some(c => c.method === 'DELETE' && c.url.includes('contabilidad_de_sociedades.json')), 'Vaciar nota debe lanzar DELETE en RTDB');
    assert.strictEqual(global.STATE.recuperaciones['T2027A01'], undefined, 'Cero residuos: nodo del estudiante vacío debe eliminarse');
    console.log("✓ Ingreso 1ª/2ª opp, RBAC, Impresión, Excel y limpieza DELETE sin residuos validados.");

    // TEST 4: Aislamiento Ciclo Histórico 2026 vs Activo 2027
    console.log("\n[TEST 4] Verificando aislamiento estricto de escritura entre 2026 Histórico y 2027 Activo...");
    fetchCalls.length = 0;
    global.STATE.isHistoricalReadOnlyMode = true;
    global.STATE.viewingHistoricalCycle = '2026';
    global.STATE.historicalViewingCycle = '2026';
    global.STATE.activeCycle = '2026';
    global.STATE.currentRole = 'director';
    window._enccoRecupHydratedCycles['2026'] = true;

    window.renderReprobadosRecuperacionView();
    const first2026Cd = window._lastReprobadosReportData.students.find(s => s.isConDerecho);
    assert(first2026Cd && first2026Cd.reprobadas.length > 0, 'Debe existir alumno con derecho en 2026');
    const subj2026 = first2026Cd.reprobadas[0].materia;
    const saved2026 = await window.saveRecoverySubjectGrade(first2026Cd.code, first2026Cd.grade, subj2026, 1, '66');
    assert.strictEqual(saved2026, true);
    assert(fetchCalls.some(c => c.method === 'PUT' && c.url.includes('/encc_school_state/historico/2026/recuperacionesSnapshot/')), 'Ciclo 2026 debe guardar en nodo histórico aislado');
    assert.strictEqual(Object.keys(global.STATE.recuperaciones).length, 0, 'STATE.recuperaciones activo (2027) no debe contaminarse al editar 2026');
    console.log("✓ Aislamiento histórico 2026 verificado.");

    // TEST 5: Integración Ciclo 2027 -> 2028 en EnccoCycleArchiver (auto-promoción por recuperación + cero residuos)
    console.log("\n[TEST 5] Verificando EnccoCycleArchiver: promoción automática con recuperaciones y transición 2027 -> 2028 limpia...");
    fetchCalls.length = 0;
    global.STATE = {
        activeCycle: '2027',
        academicCycle: '2027',
        currentRole: 'director',
        currentUser: { name: 'Directora', role: 'director' },
        cycles: [{ id: 'cyc-2027', name: '2027', year: '2027', status: 'Activo', isArchived: false }],
        gradesList: [{ id: 'g4', name: '4to Perito Contador' }, { id: 'g6', name: '6to Perito Contador' }],
        pensum: [
            { id: 'p1', grade: '4to Perito Contador', section: 'A', subject: 'Contabilidad de Sociedades', teacher: 'Carlos Méndez' }
        ],
        students: [
            {
                id: 'st-rec-pass',
                code: 'R2027P1',
                name: 'APROBADO RECUP CUARTO',
                grade: '4to Perito Contador',
                section: 'A',
                status: 'Activo',
                grades: { 'Contabilidad de Sociedades': [45, 48, 50, 49] }
            },
            {
                id: 'st-rec-fail6',
                code: 'R2027F6',
                name: 'REPROBADO POST RECUP SEXTO',
                grade: '6to Perito Contador',
                section: 'A',
                status: 'Activo',
                grades: { 'Auditoría': [40, 42, 44, 46] }
            },
            {
                id: 'st-rec-grad6',
                code: 'R2027G6',
                name: 'GRADUADO RECUP SEXTO',
                grade: '6to Perito Contador',
                section: 'B',
                status: 'Activo',
                grades: { 'Seminario': [50, 52, 51, 53] }
            },
            {
                id: 'st-rec-pend',
                code: 'R2027PD',
                name: 'PENDIENTE RECUP CUARTO',
                grade: '4to Perito Contador',
                section: 'A',
                status: 'Activo',
                grades: { 'Contabilidad de Sociedades': [35, 38, 40, 42] }
            }
        ],
        recuperaciones: {
            'R2027P1': { 'contabilidad_de_sociedades': { materia: 'Contabilidad de Sociedades', opp1: 68, opp2: null, notaFinalRecup: 68, aprobada: true } },
            'R2027F6': { 'auditoria': { materia: 'Auditoría', opp1: 45, opp2: 54, notaFinalRecup: 54, aprobada: false } },
            'R2027G6': { 'seminario': { materia: 'Seminario', opp1: 75, opp2: null, notaFinalRecup: 75, aprobada: true } }
        },
        config: { bimestreActivoOficial: 4, lockedBimestres: { 1: true, 2: true, 3: true, 4: true } }
    };
    window._enccoRecupHydratedCycles = { '2027': true };

    const archRes = await window.EnccoCycleArchiver.archiveCycleData('2027');
    assert.strictEqual(archRes.success, true);
    assert(archRes.payload.recuperacionesSnapshot && archRes.payload.recuperacionesSnapshot['R2027P1'], 'archiveCycleData debe incluir recuperacionesSnapshot');
    global._mockArchived2027 = archRes.payload;

    const openRes = await window.EnccoCycleArchiver.openNewAcademicCycle('2028', { promoteStudents: true, archiveCurrent: false });
    assert.strictEqual(openRes.success, true);
    assert.strictEqual(openRes.newCycle, '2028');

    // Verificar egresado 6to aprobado en recuperación excluido del activo 2028
    assert.strictEqual(global.STATE.students.some(s => s.code === 'R2027G6'), false, '6to aprobado en recuperación debe egresar');
    assert.strictEqual(global.STATE.graduatedStudentsByCycle['2027'].some(s => s.code === 'R2027G6'), true, 'Debe resguardarse en cohorte egresados 2027');

    // Verificar 4to aprobado en recuperación ascendió a 5to
    const p1 = global.STATE.students.find(s => s.code === 'R2027P1');
    assert(p1 && p1.grade.includes('5to') && p1.academicPromotionStatus === 'Promovido en Recuperación', '4to aprobado en recuperación debe subir a 5to');

    // Verificar 6to reprobado post-recup se queda en 6to (NO egresa!)
    const f6 = global.STATE.students.find(s => s.code === 'R2027F6');
    assert(f6 && f6.grade.includes('6to') && f6.academicPromotionStatus === 'Reprobado Post-Recuperación', '6to reprobado en recuperación debe repetir 6to');

    // Verificar pendiente se queda en 4to
    const pd = global.STATE.students.find(s => s.code === 'R2027PD');
    assert(pd && pd.grade.includes('4to') && pd.academicPromotionStatus === 'Pendiente Recuperación', 'Alumno sin nota de recup debe quedar retenido');

    // Verificar cero residuos de recuperaciones en ciclo 2028
    assert.deepStrictEqual(global.STATE.recuperaciones, {}, 'Ciclo 2028 debe arrancar con STATE.recuperaciones = {}');
    assert(fetchCalls.some(c => c.method === 'PUT' && c.url.endsWith('/encc_school_state/recuperaciones.json') && c.body === '{}'), 'Debe limpiar /encc_school_state/recuperaciones.json en nube');

    // Verificar consulta histórica de 2027 y retorno limpio a 2028
    const histLoad = await window.EnccoCycleArchiver.loadHistoricalCycle('2027');
    assert.strictEqual(histLoad.success, true);
    assert(global.STATE.recuperaciones['R2027P1'], 'Modo histórico 2027 debe restaurar recuperacionesSnapshot');
    window.EnccoCycleArchiver.exitHistoricalView();
    assert.deepStrictEqual(global.STATE.recuperaciones, {}, 'Al salir de modo histórico vuelve a 2028 con recuperaciones = {}');

    console.log("✓ Transición 2027 -> 2028 con promoción automática por recuperaciones y aislamiento histórico validada.");
    console.log("\n========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE RECUPERACIONES MULTICICLO PASARON (5/5)");
    console.log("========================================================");
}

runTests().catch(err => {
    console.error("❌ ERROR EN TEST:", err);
    process.exit(1);
});
