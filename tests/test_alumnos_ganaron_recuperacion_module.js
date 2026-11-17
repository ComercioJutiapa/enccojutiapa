/**
 * tests/test_alumnos_ganaron_recuperacion_module.js
 * 
 * Verificación Rigurosa del Módulo:
 * "Listado de Alumnos que Ganaron su Recuperación (Promovidos)"
 * - Restricción exclusiva de Roles: Solo Dirección, Secretaría y Auxiliatura. Docentes bloqueados.
 * - Multi-ciclo Dinámico: Soporte nativo para 2026 (73 convocados / 58 promovidos) y ciclos activos 2027+.
 * - Cero pérdida de datos e integridad de notas de recuperación (Firebase RTDB / RAM).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('='.repeat(80));
console.log('🎓 TEST: MÓDULO INTUITIVO DE ALUMNOS QUE GANARON SU RECUPERACIÓN');
console.log('='.repeat(80));

const gradeStatsPath = path.join(__dirname, '..', 'grade_stats.js');
const auditDataPath = path.join(__dirname, '..', 'audit_2026_data.js');

const gradeStatsCode = fs.readFileSync(gradeStatsPath, 'utf8');
const auditDataCode = fs.readFileSync(auditDataPath, 'utf8');

const domElements = {};
const mockDoc = {
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: (id) => domElements[id] || { 
        style: {}, 
        classList: { add: () => {}, remove: () => {} }, 
        value: '', 
        innerHTML: '', 
        remove: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    },
    createElement: (tag) => ({ 
        tagName: tag.toUpperCase(), 
        style: {}, 
        classList: { add: () => {}, remove: () => {} }, 
        appendChild: () => {},
        removeChild: () => {},
        click: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
};

const sandbox = {
    console: console,
    window: {},
    document: mockDoc,
    Blob: typeof Blob !== 'undefined' ? Blob : function(parts) { this.parts = parts; },
    URL: typeof URL !== 'undefined' ? URL : { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => ({ unref: () => {} }),
    clearInterval: () => {},
    location: { reload: () => {} },
    scrollTo: () => {},
    addEventListener: () => {},
    showToast: (msg, type) => { sandbox._lastToast = { msg, type }; },
    escapeHtml: (s) => String(s || ''),
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    hasRolePermission: () => true,
    STATE: {
        activeCycle: '2026',
        academicCycle: '2026',
        currentRole: 'director',
        currentUser: { id: 'dir-1', name: 'Directora General', role: 'director' },
        cycles: [{ name: '2026', status: 'Histórico' }, { name: '2027', status: 'Activo' }],
        students: [],
        recuperaciones: {},
        recuperacionesByCycle: {}
    }
};
sandbox.window = sandbox;

vm.createContext(sandbox);

try {
    vm.runInContext(auditDataCode, sandbox);
    vm.runInContext(gradeStatsCode, sandbox);
    console.log('✅ grade_stats.js y audit_2026_data.js evaluados con éxito.');
} catch (e) {
    console.error('❌ Error cargando scripts:', e);
    process.exit(1);
}

// ==============================================================================
// PRUEBA 1: VERIFICACIÓN DE CONTROL DE ACCESO (RBAC)
// ==============================================================================
console.log('\n--- PRUEBA 1: Control de Acceso por Roles (RBAC) ---');
const canView = sandbox.canViewGanaronRecuperacion;
assert.strictEqual(typeof canView, 'function', 'canViewGanaronRecuperacion debe ser una función');

// Roles permitidos: Dirección, Secretaría, Auxiliatura, Admin
assert.strictEqual(canView('director'), true, 'Director debe tener acceso');
assert.strictEqual(canView('directora'), true, 'Directora debe tener acceso');
assert.strictEqual(canView('secretaria'), true, 'Secretaría debe tener acceso');
assert.strictEqual(canView('profesor_auxiliar'), true, 'Auxiliatura debe tener acceso');
assert.strictEqual(canView('auxiliar'), true, 'Auxiliar debe tener acceso');
assert.strictEqual(canView('admin'), true, 'Admin debe tener acceso');

// Roles bloqueados: Docentes y Estudiantes
assert.strictEqual(canView('docente'), false, 'Docente NO debe tener acceso');
assert.strictEqual(canView('catedratico'), false, 'Catedrático NO debe tener acceso');
assert.strictEqual(canView('profesor'), false, 'Profesor NO debe tener acceso');
assert.strictEqual(canView('estudiante'), false, 'Estudiante NO debe tener acceso');
assert.strictEqual(canView('guest'), false, 'Guest NO debe tener acceso');
console.log('✅ Prueba 1 superada: Acceso garantizado exclusivamente a Dirección, Secretaría y Auxiliatura. Docentes bloqueados.');

// ==============================================================================
// PRUEBA 2: BLOQUEO REACTIVO EN SUB-VISTA SI EL ROL ES DOCENTE
// ==============================================================================
console.log('\n--- PRUEBA 2: Bloqueo Reactivo de Navegación para Docentes ---');
sandbox.STATE.currentRole = 'docente';
sandbox._lastToast = null;
sandbox.switchReprobadosSubView('ganaron');
assert.strictEqual(sandbox.window._reprobadosSubView !== 'ganaron', true, 'Subvista no debe cambiar a ganaron si es docente');
assert.ok(sandbox._lastToast && sandbox._lastToast.type === 'warning', 'Debe emitir advertencia toast al docente');
console.log('✅ Prueba 2 superada: Docente no puede alternar ni forzar la subvista ganaron.');

// ==============================================================================
// PRUEBA 3: VISUALIZACIÓN DINÁMICA CICLO 2026 (58 PROMOVIDOS AUDITADOS)
// ==============================================================================
console.log('\n--- PRUEBA 3: Visualización Dinámica en Ciclo 2026 ---');
sandbox.STATE.currentRole = 'director';
sandbox.STATE.activeCycle = '2026';
sandbox.STATE.isHistoricalReadOnlyMode = true;
sandbox.STATE.historicalViewingCycle = '2026';
sandbox.STATE.viewingHistoricalCycle = '2026';

// Simular contenedor en DOM
const mockContainer = { innerHTML: '', style: {} };
domElements['gradeStatsDocumentContainer'] = mockContainer;

// Preparar mock de las 73 recuperaciones de 2026 en memoria
const mockRecupStore2026 = {};
const { AUDIT_2026_STUDENTS } = sandbox;
const conDerechoStudents2026 = AUDIT_2026_STUDENTS.filter(s => {
    const g = (s.grade || '').toUpperCase();
    const maxR = (g === 'SEXTO') ? 4 : 3;
    const n = Number(s.num_rep || (s.reprobadas ? s.reprobadas.length : 0));
    return n > 0 && n <= maxR;
});

assert.strictEqual(conDerechoStudents2026.length, 73, 'Debe haber 73 alumnos con derecho a recuperación en 2026');

// Simular que los primeros 58 ganaron todas sus materias con 75 pts
conDerechoStudents2026.forEach((st, idx) => {
    const code = String(st.code).toUpperCase();
    mockRecupStore2026[code] = {};
    const repArr = Array.isArray(st.reprobadas) ? st.reprobadas : [];
    const passed = idx < 58; // 58 ganados al 100%
    repArr.forEach(r => {
        const canon = sandbox.resolveCanonicalSubjectNameForSheet(r.materia, st.grade);
        const slug = sandbox._sanitizeRecupKeyToken(canon);
        mockRecupStore2026[code][slug] = {
            materia: canon,
            notaOriginal: r.nota || 45,
            notaRecup: passed ? 75 : 40,
            notaFinalRecup: passed ? 75 : 40,
            aprobada: passed,
            hasNote: true
        };
    });
});

sandbox.STATE.recuperaciones = mockRecupStore2026;
sandbox.STATE.recuperacionesByCycle['2026'] = mockRecupStore2026;
sandbox.window._enccoRecupHydratedCycles['2026'] = true;
delete sandbox.window._lastReprobadosReportData;

// Renderizar vista
sandbox.switchReprobadosSubView('ganaron');

assert.ok(mockContainer.innerHTML.includes('Nómina Oficial de Estudiantes que Ganaron Recuperación'), 'Debe renderizar el título oficial');
assert.ok(mockContainer.innerHTML.includes('58 alumnos'), 'Debe reflejar exactamente 58 alumnos promovidos');
assert.ok(mockContainer.innerHTML.includes('PROMOVIDO'), 'Debe incluir badges de PROMOVIDO');
console.log('✅ Prueba 3 superada: Renderizado de 58 alumnos promovidos en ciclo 2026 verificado con éxito.');

// ==============================================================================
// PRUEBA 4: SOPORTE DINÁMICO MULTI-CICLO (CICLO 2027 ACTIVO)
// ==============================================================================
console.log('\n--- PRUEBA 4: Funcionamiento Dinámico en Ciclo 2027 ---');
sandbox.STATE.activeCycle = '2027';
sandbox.STATE.academicCycle = '2027';
sandbox.STATE.isHistoricalReadOnlyMode = false;
sandbox.STATE.historicalViewingCycle = null;
sandbox.STATE.viewingHistoricalCycle = null;

// Agregar 2 alumnos en 2027
sandbox.STATE.students = [
    {
        id: 'stu-27-01',
        code: 'A123ABC',
        name: 'GÓMEZ PÉREZ, JUAN',
        grade: '4to Perito Contador',
        section: 'A',
        cycle: '2027',
        grades: { 'Contabilidad de Sociedades': [50, 45, 55, 40] } // Reprobado en ordinaria
    },
    {
        id: 'stu-27-02',
        code: 'B456DEF',
        name: 'LÓPEZ DÍAZ, ANA',
        grade: '4to Perito Contador',
        section: 'B',
        cycle: '2027',
        grades: { 'Contabilidad de Sociedades': [50, 50, 50, 40] } // Reprobado en ordinaria
    }
];

// Asentar nota de recuperación de 80 pts a Juan Gómez en 2027
sandbox.STATE.recuperaciones = {
    'A123ABC': {
        'contabilidad_de_sociedades': {
            materia: 'Contabilidad de Sociedades',
            notaOriginal: 48,
            notaRecup: 80,
            aprobada: true,
            hasNote: true
        }
    }
};
delete sandbox.window._lastReprobadosReportData;
sandbox.renderReprobadosRecuperacionView();

assert.ok(mockContainer.innerHTML.includes('A123ABC'), 'Debe incluir al alumno de 2027 con recuperación ganada');
assert.ok(mockContainer.innerHTML.includes('80 pts'), 'Debe mostrar la nota de 80 pts de recuperación ganada');
console.log('✅ Prueba 4 superada: Ciclo 2027 procesado dinámicamente en tiempo real sin requerir cambios de código.');

// ==============================================================================
// PRUEBA 5: EXPORTACIÓN OFICIAL EXCEL CON RESTRICCIÓN DE SEGURIDAD
// ==============================================================================
console.log('\n--- PRUEBA 5: Exportación a Excel Institucional y Protección de Roles ---');
sandbox.window._reprobadosSubView = 'ganaron';
global.Blob = function(parts) { this.parts = parts; };
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };

// Test como Director: Exportación exitosa
sandbox.STATE.currentRole = 'director';
sandbox.exportReprobadosRecuperacionExcel();
assert.ok(sandbox.window._lastReprobadosExcelHtml.includes('NÓMINA OFICIAL DE ESTUDIANTES PROMOVIDOS EN RECUPERACIÓN'), 'El excel debe tener el título oficial');
assert.ok(sandbox.window._lastReprobadosExcelHtml.includes('Código Personal'), 'El excel debe contener la columna Código Personal');

// Test como Docente: Bloqueado
sandbox.STATE.currentRole = 'docente';
sandbox._lastToast = null;
sandbox.window._lastReprobadosExcelHtml = null;
sandbox.exportReprobadosRecuperacionExcel();
assert.strictEqual(sandbox.window._lastReprobadosExcelHtml, null, 'Docente no debe generar el excel de promovidos en recuperación');
assert.ok(sandbox._lastToast && sandbox._lastToast.type === 'warning', 'Debe emitir toast de restricción al docente');
console.log('✅ Prueba 5 superada: Exportación Excel institucional y bloqueo a docentes 100% verificado.');

console.log('\n' + '='.repeat(80));
console.log('🎉 TODAS LAS PRUEBAS DEL MÓDULO DE RECUPERACIONES GANADAS APROBADAS AL 100%');
console.log('='.repeat(80));
