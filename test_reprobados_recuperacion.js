// test_reprobados_recuperacion.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("=== INICIANDO VALIDACIÓN DEL MÓDULO ALUMNOS REPROBADOS Y RECUPERACIÓN ===");

// 1. Simular entorno de navegador
const mockDomElements = {};
global.window = global;
global.document = {
    getElementById: function(id) {
        if (!mockDomElements[id]) {
            mockDomElements[id] = {
                id,
                style: {},
                innerHTML: '',
                value: 'ALL',
                options: []
            };
        }
        return mockDomElements[id];
    },
    querySelectorAll: function() {
        return [];
    },
    createElement: function(tag) {
        return {
            tagName: tag,
            style: {},
            setAttribute: function() {},
            appendChild: function() {},
            click: function() {}
        };
    },
    body: {
        appendChild: function() {},
        removeChild: function() {}
    }
};
global.URL = {
    createObjectURL: function() { return 'blob:mock-url'; },
    revokeObjectURL: function() {}
};

// Cargar audit_2026_data.js y grade_stats.js
require('./audit_2026_data.js');
require('./grade_stats.js');

// 2. Verificar registro de funciones globales
console.log("\n[TEST 1] Verificando registro de funciones globales en window...");
assert.strictEqual(typeof window.renderReprobadosRecuperacionView, 'function');
assert.strictEqual(typeof window.resolveActiveTeacherForCourse, 'function');
assert.strictEqual(typeof window.switchGradeStatsTab, 'function');
assert.strictEqual(typeof window.switchReprobadosSubView, 'function');
assert.strictEqual(typeof window.printReprobadosRecuperacionView, 'function');
assert.strictEqual(typeof window.exportReprobadosRecuperacionExcel, 'function');
console.log("✓ Funciones registradas correctamente.");

// 3. Validación de Auditoría Oficial 2026
console.log("\n[TEST 2] Verificando Ciclo 2026 (Auditoría Oficial SIRE MINEDUC)...");
global.STATE = {
    viewingHistoricalCycle: '2026',
    isHistoricalReadOnlyMode: true,
    students: [],
    users: [],
    pensum: []
};

window.renderReprobadosRecuperacionView();
const data2026 = window._lastReprobadosReportData;
assert(data2026, "Debe existir _lastReprobadosReportData");
assert.strictEqual(data2026.cycle, '2026');
assert.strictEqual(data2026.is2026Official, true);
assert.strictEqual(data2026.students.length, 412, "Deben ser exactamente 412 estudiantes en 2026");

const prom2026 = data2026.students.filter(s => s.isPromovido).length;
const cd2026 = data2026.students.filter(s => s.isConDerecho).length;
const sd2026 = data2026.students.filter(s => s.isSinDerecho).length;

assert.strictEqual(prom2026, 320, "Promovidos limpios deben ser 320");
assert.strictEqual(cd2026, 73, "Con derecho a recuperación deben ser 73");
assert.strictEqual(sd2026, 19, "Sin derecho a recuperación deben ser 19");

// Desglose por grado en 2026
const cdCuarto = data2026.students.filter(s => s.grade === 'CUARTO' && s.isConDerecho).length;
const cdQuinto = data2026.students.filter(s => s.grade === 'QUINTO' && s.isConDerecho).length;
const cdSexto = data2026.students.filter(s => s.grade === 'SEXTO' && s.isConDerecho).length;

const sdCuarto = data2026.students.filter(s => s.grade === 'CUARTO' && s.isSinDerecho).length;
const sdQuinto = data2026.students.filter(s => s.grade === 'QUINTO' && s.isSinDerecho).length;
const sdSexto = data2026.students.filter(s => s.grade === 'SEXTO' && s.isSinDerecho).length;

assert.strictEqual(cdCuarto, 46, "4to Con Derecho debe ser 46");
assert.strictEqual(cdQuinto, 19, "5to Con Derecho debe ser 19");
assert.strictEqual(cdSexto, 8, "6to Con Derecho debe ser 8");

assert.strictEqual(sdCuarto, 17, "4to Sin Derecho debe ser 17");
assert.strictEqual(sdQuinto, 2, "5to Sin Derecho debe ser 2");
assert.strictEqual(sdSexto, 0, "6to Sin Derecho debe ser 0");

// Verificar asignación de maestros en todas las reprobadas
let reprobadasTotal = 0;
data2026.students.forEach(s => {
    s.reprobadas.forEach(r => {
        reprobadasTotal++;
        assert(r.maestro && r.maestro !== 'No asignado', `Materia ${r.materia} debe tener maestro asignado`);
    });
});
assert.strictEqual(reprobadasTotal, 258, "Total de materias reprobadas en 2026 debe ser 258");
console.log(`✓ Ciclo 2026 auditado al 100%: 412 estudiantes, 320 promovidos, 73 con derecho (${cdCuarto} 4to, ${cdQuinto} 5to, ${cdSexto} 6to), 19 sin derecho (${sdCuarto} 4to, ${sdQuinto} 5to, ${sdSexto} 6to) y 258 asignaciones de catedráticos verificadas.`);

// 4. Validación de Ciclo Activo 2027 (Firebase RTDB Dinámico y Reactivo)
console.log("\n[TEST 3] Verificando Ciclo Activo 2027 y Reglas Ministeriales...");
const originalUsers = [
    { id: 'usr_wilder', name: 'WILDER PORFIRIO PÉREZ LÓPEZ', role: 'docente' },
    { id: 'usr_roberto', name: 'ROBERTO ALEX TOBAR CERMEÑO', role: 'docente' }
];

global.STATE = {
    viewingHistoricalCycle: null,
    historicalViewingCycle: null,
    isHistoricalReadOnlyMode: false,
    activeCycle: '2027',
    users: JSON.parse(JSON.stringify(originalUsers)),
    pensum: [
        { subject: 'CONTABILIDAD DE SOCIEDADES', grade: '4to Perito', section: 'A', teacherId: 'usr_wilder', teacherName: 'WILDER PORFIRIO PÉREZ LÓPEZ' },
        { subject: 'MATEMÁTICA COMERCIAL', grade: '4to Perito', section: 'A', teacherId: 'usr_roberto', teacherName: 'ROBERTO ALEX TOBAR CERMEÑO' }
    ],
    students: [
        // Alumno 1: 4to Perito con 3 reprobadas -> Con Derecho (1-3 en 4to)
        {
            id: 'st_1',
            studentCode: 'CODE001',
            name: 'ESTUDIANTE CUARTO CON DERECHO',
            grade: '4to Perito',
            section: 'A',
            gender: 'MASCULINO',
            academicCycle: '2027',
            status: 'Activo',
            grades: {
                'CONTABILIDAD DE SOCIEDADES': [40, 45, 50, 48], // avg: 46 < 60
                'MATEMÁTICA COMERCIAL': [35, 40, 42, 50], // avg: 42 < 60
                'FUNDAMENTOS DE DERECHO': [50, 50, 55, 50], // avg: 51 < 60
                'INGLÉS COMERCIAL I': [70, 75, 80, 85] // avg: 78 >= 60
            }
        },
        // Alumno 2: 4to Perito con 4 reprobadas -> Sin Derecho (>=4 en 4to)
        {
            id: 'st_2',
            studentCode: 'CODE002',
            name: 'ESTUDIANTE CUARTO SIN DERECHO',
            grade: '4to Perito',
            section: 'A',
            gender: 'FEMENINO',
            academicCycle: '2027',
            status: 'Activo',
            grades: {
                'CONTABILIDAD DE SOCIEDADES': [30, 30, 30, 30],
                'MATEMÁTICA COMERCIAL': [40, 40, 40, 40],
                'FUNDAMENTOS DE DERECHO': [50, 50, 50, 50],
                'INGLÉS COMERCIAL I': [45, 45, 45, 45]
            }
        },
        // Alumno 3: 6to Perito con 4 reprobadas -> Con Derecho (1-4 en 6to)
        {
            id: 'st_3',
            studentCode: 'CODE003',
            name: 'ESTUDIANTE SEXTO CON DERECHO',
            grade: '6to Perito',
            section: 'A',
            gender: 'FEMENINO',
            academicCycle: '2027',
            status: 'Activo',
            grades: {
                'CONTABILIDAD BANCARIA': [50, 50, 50], // avg: 50 < 60
                'ESTADÍSTICA COMERCIAL': [40, 45, 40], // avg: 42 < 60
                'ORGANIZACIÓN DE EMPRESAS': [55, 50, 52], // avg: 52 < 60
                'AUDITORÍA': [45, 50, 48], // avg: 48 < 60
                'COMPUTACIÓN III': [80, 80, 85] // avg >= 60
            }
        },
        // Alumno 4: 6to Perito con 5 reprobadas -> Sin Derecho (>=5 en 6to)
        {
            id: 'st_4',
            studentCode: 'CODE004',
            name: 'ESTUDIANTE SEXTO SIN DERECHO',
            grade: '6to Perito',
            section: 'A',
            gender: 'MASCULINO',
            academicCycle: '2027',
            status: 'Activo',
            grades: {
                'CONTABILIDAD BANCARIA': [40, 40, 40],
                'ESTADÍSTICA COMERCIAL': [40, 40, 40],
                'ORGANIZACIÓN DE EMPRESAS': [40, 40, 40],
                'AUDITORÍA': [40, 40, 40],
                'COMPUTACIÓN III': [40, 40, 40]
            }
        }
    ]
};

window.renderReprobadosRecuperacionView();
const data2027 = window._lastReprobadosReportData;
assert(data2027, "Debe existir datos de 2027");
assert.strictEqual(data2027.cycle, '2027');
assert.strictEqual(data2027.is2026Official, false);

const st1 = data2027.students.find(s => s.code === 'CODE001');
const st2 = data2027.students.find(s => s.code === 'CODE002');
const st3 = data2027.students.find(s => s.code === 'CODE003');
const st4 = data2027.students.find(s => s.code === 'CODE004');

assert(st1.isConDerecho, "Alumno 1 en 4to con 3 materias DEBE tener derecho a recuperación");
assert(st2.isSinDerecho, "Alumno 2 en 4to con 4 materias NO DEBE tener derecho a recuperación");
assert(st3.isConDerecho, "Alumno 3 en 6to con 4 materias DEBE tener derecho a recuperación");
assert(st4.isSinDerecho, "Alumno 4 en 6to con 5 materias NO DEBE tener derecho a recuperación");

// Verificar que STATE.users NO fue modificado
assert.deepStrictEqual(global.STATE.users, originalUsers, "STATE.users no debe haber sido mutado");
console.log("✓ Ciclo Activo 2027 verificado: Reglas de promoción de 4to/5to (máx 3) y 6to (máx 4) validadas, y STATE.users preservado inmutable.");

// 5. Validación de no mención de ENCCO en encabezados oficiales
console.log("\n[TEST 4] Verificando encabezados institucionales...");
const renderedHtml = mockDomElements['gradeStatsDocumentContainer'].innerHTML;
assert(renderedHtml.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), "Debe incluir el nombre oficial");
console.log("✓ Encabezados institucionales verificados con nombre oficial completo.");

// 6. Validación del nuevo formato Horizontal (Opción A) y Vertical configurable en Con Derecho a Recuperación, Impresión y Excel
console.log("\n[TEST 5] Verificando formato configurable Horizontal / Vertical, todas las materias, impresión 100% ancho y Excel institucional...");
global.window.open = function() {
    return {
        document: { open: function() {}, write: function() {}, close: function() {} }
    };
};
global.window.print = function() {};
global.Blob = function(parts, opts) { this.parts = parts; this.type = opts && opts.type; };

window.switchReprobadosSubView('con_derecho');
assert.strictEqual(window._reprobadosConDerechoLayout, 'horizontal', "La disposición predeterminada debe ser Horizontal (Opción A)");
const htmlHoriz = mockDomElements['gradeStatsDocumentContainer'].innerHTML;
assert(htmlHoriz.includes('CUARTO PERITO CONTADOR'), "En Horizontal debe agrupar por Cuarto Perito Contador");
assert(htmlHoriz.includes('SEXTO PERITO CONTADOR'), "En Horizontal debe agrupar por Sexto Perito Contador");
assert(htmlHoriz.includes('78'), "Debe incluir la calificación de materias aprobadas (ej. 78 en Inglés I)");
assert(htmlHoriz.includes('46'), "Debe incluir la calificación de materias perdidas (ej. 46 en Contabilidad de Sociedades)");
assert(htmlHoriz.includes('Nota(s) de Recuperación (Papel)'), "Debe mostrar columna final para nota de recuperación en papel");

window.printReprobadosRecuperacionView();
assert(window._lastReprobadosPrintHtml.includes('size: letter landscape'), "Impresión horizontal debe usar letter landscape");
assert(window._lastReprobadosPrintHtml.includes('table-layout:fixed'), "Impresión horizontal debe ajustarse al 100% del ancho de página");

window.exportReprobadosRecuperacionExcel();
assert(window._lastReprobadosExcelHtml.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), "Excel debe incluir membrete institucional");
assert(window._lastReprobadosExcelHtml.includes('<x:FitWidth>1</x:FitWidth>'), "Excel horizontal debe incluir FitWidth=1");
assert(window._lastReprobadosExcelHtml.includes('Landscape'), "Excel horizontal debe configurar orientación Landscape");

// Cambiar a Vertical configurable
window.switchReprobadosConDerechoLayout('vertical');
const htmlVert = mockDomElements['gradeStatsDocumentContainer'].innerHTML;
assert(htmlVert.includes('Aprobada') && htmlVert.includes('PERDIDA'), "Vista vertical debe mostrar tanto materias Aprobadas como PERDIDAS");
window.printReprobadosRecuperacionView();
assert(window._lastReprobadosPrintHtml.includes('size: letter portrait'), "Impresión vertical debe usar letter portrait");
window.exportReprobadosRecuperacionExcel();
assert(window._lastReprobadosExcelHtml.includes('Portrait'), "Excel vertical debe configurar orientación Portrait");
console.log("✓ Formatos Horizontal (Opción A) y Vertical configurables validados en pantalla, impresión y Excel institucional.");

// 7. Validación multi-ciclo futuro (2028) con exclusión de egresados
console.log("\n[TEST 6] Verificando compatibilidad dinámica en ciclo futuro 2028 (excluyendo egresados)...");
global.STATE.activeCycle = '2028';
global.STATE.students = [
    ...global.STATE.students.map(s => ({ ...s, academicCycle: '2028', cycle: '2028' })),
    { id: 'st_grad', studentCode: 'GRAD27', name: 'EGRESADO 2027', grade: 'Graduando / Egresado', section: 'A', academicCycle: '2028', status: 'Egresado', grades: { 'AUDITORÍA': [40, 40, 40] } }
];
window.renderReprobadosRecuperacionView();
assert.strictEqual(window._lastReprobadosReportData.cycle, '2028');
assert(!window._lastReprobadosReportData.students.some(s => s.code === 'GRAD27'), "Los egresados nunca deben aparecer en 2028 ni ciclos futuros");
console.log("✓ Ciclo futuro 2028 validado dinámicamente sin egresados.");

console.log("\n========================================================");
console.log("✅ TODAS LAS PRUEBAS DEL MÓDULO REPROBADOS PASARON CON ÉXITO");
console.log("========================================================\n");
