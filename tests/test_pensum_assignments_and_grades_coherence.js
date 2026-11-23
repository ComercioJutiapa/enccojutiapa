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
global.window.location = { pathname: '/', href: 'http://localhost/', search: '' };
global.window.addEventListener = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
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

// Verificación exhaustiva de los 6 nombres canónicos corregidos (Discrepancia A)
const c344 = STATE.pensumCatalog.find(p => p.code === '344');
assert.ok(c344, "Debe existir materia con código 344");
assert.strictEqual(c344.name, 'Ortografía y Caligrafía', "344 debe ser Ortografía y Caligrafía");

const c345 = STATE.pensumCatalog.find(p => p.code === '345');
assert.ok(c345, "Debe existir materia con código 345");
assert.strictEqual(c345.name, 'Administración y Organización de Oficina', "345 debe ser Administración y Organización de Oficina");

const c366 = STATE.pensumCatalog.find(p => p.code === '366');
assert.ok(c366, "Debe existir materia con código 366");
assert.strictEqual(c366.name, 'Legislación Fiscal y Aduanal', "366 debe ser Legislación Fiscal y Aduanal");

const c359 = STATE.pensumCatalog.find(p => p.code === '359');
assert.ok(c359, "Debe existir materia con código 359");
assert.strictEqual(c359.name, 'Organización de Empresas', "359 debe ser Organización de Empresas");

const c363 = STATE.pensumCatalog.find(p => p.code === '363');
assert.ok(c363, "Debe existir materia con código 363");
assert.strictEqual(c363.name, 'Derecho Mercantil y Nociones de Derecho Laboral', "363 debe ser Derecho Mercantil y Nociones de Derecho Laboral");

const c369 = STATE.pensumCatalog.find(p => p.code === '369');
assert.ok(c369, "Debe existir materia con código 369");
assert.strictEqual(c369.name, 'Contabilidad Gubernamental Integrada', "369 debe ser Contabilidad Gubernamental Integrada");

console.log("  ✅ Prueba 1 Superada: Catálogo del Pensum garantizado con 28 asignaturas oficiales, códigos MINEDUC de 3 dígitos y los 6 nombres canónicos validados.");

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

// 4. Prueba de Sección 4to E Activa y sus 9 Cátedras Oficiales (Discrepancia B)
console.log("\n➡️  Prueba 4: Garantía de Sección 4to E Activa sin Docentes pero con 9 Cátedras Oficiales...");
STATE.gradesList = [];
ensureOfficialGradesList();

const grade4E = STATE.gradesList.find(g => g.code === '4to E' || g.id === 'grd-4e');
assert.ok(grade4E, "4to E debe existir en STATE.gradesList");
assert.strictEqual(grade4E.active, true, "4to E debe estar activa");
assert.strictEqual(grade4E.guideTeacher, 'Sin asignar', "4to E debe tener guía 'Sin asignar'");
assert.strictEqual(STATE.gradesList.length, 13, "Deben existir exactamente 13 secciones oficiales (4to A-E, 5to A-D, 6to A-D)");

// Sincronizar cátedras con pensum para todas las 13 secciones
syncClassAssignmentsWithPensumAndGrades({ showNotification: false });

const asg4E = STATE.pensum.filter(a => a.gradeCode === '4to E' || (getPensumItemGradeKey(a) === '4to' && a.section.includes('E')));
assert.strictEqual(asg4E.length, 9, `4to E debe tener exactamente 9 cátedras oficiales generadas (obtenido ${asg4E.length})`);
asg4E.forEach(c => {
    assert.strictEqual(c.teacher, 'Sin asignar', `Cátedra ${c.name} en 4to E debe estar inicialmente 'Sin asignar'`);
    assert.ok(c.code && c.code.length === 3, `Cátedra ${c.name} debe tener código MINEDUC de 3 dígitos (${c.code})`);
});
console.log("  ✅ Prueba 4 Superada: 4to E activa con sus 9 cátedras normativas en estado 'Sin asignar'.");

// 5. Prueba de Migración de Nombres Antiguos Preservando Catedráticos (Discrepancia C)
console.log("\n➡️  Prueba 5: Migración de Nombres Antiguos y Sincronización con Listas...");
// Inyectar clase con nombre antiguo "Administración y Organización de Empresas" con docente asignado
STATE.pensum.push({
    id: 'asg-test-admon-old',
    code: '345',
    grade: '4to Perito Contador',
    gradeCode: '4to B',
    section: 'Sección B',
    subject: 'Administración y Organización de Empresas',
    name: 'Administración y Organización de Empresas',
    teacher: 'Lic. Juan Pérez Docente',
    teacherId: 'usr-doc-99',
    periodsPerWeek: 4
});

syncClassAssignmentsWithPensumAndGrades({ showNotification: false });

const migratedAdmon = STATE.pensum.find(a => a.code === '345' && a.section.includes('B'));
assert.ok(migratedAdmon, "La cátedra código 345 debe existir en 4to B");
assert.strictEqual(migratedAdmon.name, 'Administración y Organización de Oficina', "El nombre debe actualizarse al oficial 'Administración y Organización de Oficina'");
assert.strictEqual(migratedAdmon.teacher, 'Lic. Juan Pérez Docente', "El docente asignado debe preservarse al 100%");
assert.strictEqual(migratedAdmon.teacherId, 'usr-doc-99');

// Prueba de resolución canónica en diccionario (getFullOfficialSubjectName)
assert.strictEqual(getFullOfficialSubjectName("Caligrafía y Ortografía", 4), "Ortografía y Caligrafía");
assert.strictEqual(getFullOfficialSubjectName("Legislación Fiscal y Aduanera", 5), "Legislación Fiscal y Aduanal");
assert.strictEqual(getFullOfficialSubjectName("Contabilidad Gubernamental e Integrada", 6), "Contabilidad Gubernamental Integrada");
assert.strictEqual(getFullOfficialSubjectName("Derecho Mercantil y Laboral", 6), "Derecho Mercantil y Nociones de Derecho Laboral");
assert.strictEqual(getFullOfficialSubjectName("Organización y Métodos", 6), "Organización de Empresas");

console.log("  ✅ Prueba 5 Superada: Migración de nombres canónicos con preservación total de docentes y compatibilidad en listas.");

// 6. Prueba de Blindaje Anti-Borrado de Asignaciones en Arranque y syncNode('pensum')
console.log("\n➡️  Prueba 6: Blindaje Anti-Borrado de Asignaciones de Docentes en Firebase...");
const appSrcForGuard = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
assert(appSrcForGuard.includes("syncClassAssignmentsWithPensumAndGrades({ showNotification: false, syncCloud: false })"), "El arranque debe invocar syncClassAssignmentsWithPensumAndGrades con syncCloud: false");
assert(appSrcForGuard.includes("if (nodeName === 'pensum' && !(opts && opts.allowAllUnassigned))"), "EnccoCloudSync.syncNode debe bloquear sobreescrituras de /pensum con 0 docentes asignados");
assert(appSrcForGuard.includes("EnccoCloudSync.syncNode('pensum', STATE.pensum, { allowAllUnassigned: isUnassigning })"), "saveClassAssignmentForm debe persistir con reintento y permitir desasignación deliberada");
console.log("  ✅ Prueba 6 Superada: Blindaje anti-borrado de asignaciones verificado.");

console.log("\n🎯 ¡TODAS LAS PRUEBAS DE COHERENCIA PENSUM-GRADOS-ASIGNACIONES PASARON EXITOSAMENTE!\n");
process.exit(0);
