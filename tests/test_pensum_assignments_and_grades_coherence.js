/**
 * tests/test_pensum_assignments_and_grades_coherence.js
 * 
 * Verificación Integral de Coherencia Bidireccional entre:
 * 1. Editor de Pensum (STATE.pensumCatalog) - 28 asignaturas oficiales normativas
 * 2. Grados y Secciones (STATE.gradesList) - Secciones oficiales sin duplicados
 * 3. Asignación de Clases a Docentes (STATE.pensum) - Matriz operativa de cátedras
 * 
 * Garantías:
 * - Cero pérdida de datos (los catedráticos previamente asignados se conservan al 100%)
 * - Cero duplicados en catálogo, secciones y cátedras
 * - Códigos oficiales normativos (04-01-01..06-01-10) reflejados en pensum y asignaciones
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("🧪 Iniciando Test Suite: Coherencia Dinámica Pensum, Grados y Asignaciones...");

// Mock de entorno global
global.window = global;
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};
global.showToast = (msg, type) => { console.log(`  [Toast ${type || 'info'}]: ${msg}`); };
global.saveStateToLocalStorage = () => {};
global.renderPensumCatalogTable = () => {};
global.renderAssignmentsTable = () => {};
global.updateClassAssignmentSelects = () => {};
global.escapeHtml = s => String(s || '');

const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Cargar app.js en contexto seguro
try {
    eval(appJsContent);
} catch (e) {
    // Si falla por dependencias de DOM/Firebase del navegador, ignorar errores de UI
    console.log("  [Nota de carga]:", e.message);
}

// 1. Prueba de ensureCanonicalPensumCatalogCoherence()
console.log("\n➡️  Prueba 1: Aseguramiento de Malla Oficial en Pensum Catalog (28 materias)...");
global.STATE = {
    pensumCatalog: [],
    gradesList: [],
    pensum: []
};

assert.strictEqual(typeof ensureCanonicalPensumCatalogCoherence, 'function', "ensureCanonicalPensumCatalogCoherence debe existir");
ensureCanonicalPensumCatalogCoherence();

assert.strictEqual(STATE.pensumCatalog.length, 28, "STATE.pensumCatalog debe tener exactamente 28 materias oficiales");
const p4to = STATE.pensumCatalog.filter(p => getPensumItemGradeKey(p) === '4to');
const p5to = STATE.pensumCatalog.filter(p => getPensumItemGradeKey(p) === '5to');
const p6to = STATE.pensumCatalog.filter(p => getPensumItemGradeKey(p) === '6to');
assert.strictEqual(p4to.length, 9, "4to debe tener 9 asignaturas");
assert.strictEqual(p5to.length, 9, "5to debe tener 9 asignaturas");
assert.strictEqual(p6to.length, 10, "6to debe tener 10 asignaturas");

// Verificar orden y códigos 2026
assert.strictEqual(p4to[0].name, 'Contabilidad de Sociedades');
assert.strictEqual(p4to[0].code, '338', 'Código MINEDUC de Contabilidad de Sociedades debe ser 338');
assert.strictEqual(p4to[0].order, 1);
assert.strictEqual(p5to[0].name, 'Contabilidad de Costos');
assert.strictEqual(p5to[0].code, '347', 'Código MINEDUC de Contabilidad de Costos debe ser 347');
assert.strictEqual(p6to[0].name, 'Contabilidad Bancaria');
assert.strictEqual(p6to[0].code, '356', 'Código MINEDUC de Contabilidad Bancaria debe ser 356');
console.log("  ✅ Prueba 1 Superada: Catálogo del Pensum garantizado con 28 asignaturas oficiales y códigos MINEDUC de 3 dígitos.");

// 2. Prueba de No Duplicación en Pensum Catalog
console.log("\n➡️  Prueba 2: Garantía Anti-Duplicados en Pensum Catalog...");
// Intentar inyectar materias duplicadas arbitrariamente
STATE.pensumCatalog.push({
    id: 'dup-1',
    code: '338',
    name: 'Contabilidad de Sociedades',
    subject: 'Contabilidad de Sociedades',
    grade: 'Cuarto Perito Contador',
    order: 1
});
STATE.pensumCatalog.push({
    id: 'dup-2',
    code: '339',
    name: 'matemática comercial',
    subject: 'Matemática Comercial',
    grade: '4to Grado',
    order: 2
});
assert.strictEqual(STATE.pensumCatalog.length, 30, "Longitud temporal con duplicados: 30");
ensureCanonicalPensumCatalogCoherence();
assert.strictEqual(STATE.pensumCatalog.length, 28, "Deduplicador debió limpiar las 2 copias redundantemente inyectadas");
console.log("  ✅ Prueba 2 Superada: Cero duplicados en pensumCatalog verificado.");

// 3. Prueba de Sincronización con Grados y Secciones sin Pérdida de Datos
console.log("\n➡️  Prueba 3: Sincronización con Secciones (STATE.pensum) preservando Docentes...");
// Definir 2 secciones de prueba
STATE.gradesList = [
    { id: 'grd-4a', name: '4to Perito Contador', section: 'Sección A', code: '4to A' },
    { id: 'grd-4b', name: '4to Perito Contador', section: 'Sección B', code: '4to B' }
];

// Inyectar una asignación previa con docente real
STATE.pensum = [
    {
        id: 'asg-existente-1',
        grade: '4to Perito Contador',
        gradeCode: '4to A',
        section: 'Sección A',
        subject: 'Introducción a la Economía',
        teacher: 'Williams Esmely Gudiel Paredes',
        teacherId: 'usr-doc-04',
        periodsPerWeek: 4
    },
    // Inyectar un duplicado de la misma clase para probar deduplicación
    {
        id: 'asg-existente-dup',
        grade: '4to Perito Contador',
        gradeCode: '4to A',
        section: 'Sección A',
        subject: 'Introducción a la Economía',
        teacher: 'Sin asignar',
        teacherId: null,
        periodsPerWeek: 4
    }
];

assert.strictEqual(typeof syncClassAssignmentsWithPensumAndGrades, 'function', "syncClassAssignmentsWithPensumAndGrades debe existir");
syncClassAssignmentsWithPensumAndGrades({ showNotification: false });

// 2 secciones * 9 materias = 18 cátedras esperadas para 4to
const asg4to = STATE.pensum.filter(a => getPensumItemGradeKey(a) === '4to');
assert.strictEqual(asg4to.length, 18, `Se debieron generar exactamente 18 cátedras para las 2 secciones (obtenido ${asg4to.length})`);

// Verificar que el docente real Williams Gudiel NO se perdió
const asgEconA = STATE.pensum.find(a => getPensumItemGradeKey(a) === '4to' && a.section.includes('A') && a.subject.includes('Economía'));
assert.ok(asgEconA, "Debe existir la cátedra de Economía en Sección A");
assert.strictEqual(asgEconA.teacher, 'Williams Esmely Gudiel Paredes', "El docente Williams Gudiel debe preservarse intacto");
assert.strictEqual(asgEconA.teacherId, 'usr-doc-04');
assert.strictEqual(asgEconA.code, '343', "Debe adoptar el código oficial de 3 dígitos de MINEDUC 343");

// Verificar que no hay duplicados de Economía en Sección A
const countEconA = STATE.pensum.filter(a => getPensumItemGradeKey(a) === '4to' && a.section.includes('A') && a.subject.includes('Economía')).length;
assert.strictEqual(countEconA, 1, "Debe existir exactamente 1 registro para Economía en 4to A (cero duplicados)");
console.log("  ✅ Prueba 3 Superada: 18 cátedras generadas, docente preservado y duplicado eliminado.");

console.log("\n🎯 ¡TODAS LAS PRUEBAS DE COHERENCIA PENSUM-GRADOS-ASIGNACIONES PASARON EXITOSAMENTE!\n");
