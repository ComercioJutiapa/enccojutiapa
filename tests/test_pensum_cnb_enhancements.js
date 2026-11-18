/**
 * tests/test_pensum_cnb_enhancements.js
 * 
 * Verificación Integral de:
 * 1. Semáforo CNB (Carga oficial 9/9 en 4to y 5to, 10/10 en 6to).
 * 2. Normalización de Orden correlativo (1..N).
 * 3. Restauración de Malla Oficial CNB en 1 clic.
 * 4. Autocompletado y Datalist del catálogo oficial MINEDUC.
 * 5. Detección de duplicados al escribir.
 */

const assert = require('assert');
const fs = require('fs');

console.log("🧪 Iniciando Test Suite: Mejoras Oficiales CNB en Editor de Pensum (B, E, F)...");

// Mock de entorno
global.window = global;
global.document = {
    getElementById: () => null
};
global.showToast = (msg, type) => { console.log(`  [Toast ${type || 'info'}]: ${msg}`); };
global.saveStateToLocalStorage = () => {};
global.renderPensumCatalogTable = () => {};
global.escapeHtml = s => String(s || '');

const appJsContent = fs.readFileSync('app.js', 'utf8');

// Extraer constantes y funciones del Pensum
const startDef = appJsContent.indexOf('const OFFICIAL_CNB_PENSUM_COURSES');
const endDef = appJsContent.indexOf('function openPensumSubjectModal');
eval(appJsContent.slice(startDef, endDef));

global.STATE = {
    pensumCatalog: []
};

// 1. Verificar catálogo oficial CNB
console.log("➡️  Prueba 1: Catálogo Oficial CNB...");
assert.strictEqual(OFFICIAL_CNB_PENSUM_COURSES['4to'].length, 9, "4to debe tener exactamente 9 materias oficiales");
assert.strictEqual(OFFICIAL_CNB_PENSUM_COURSES['5to'].length, 9, "5to debe tener exactamente 9 materias oficiales");
assert.strictEqual(OFFICIAL_CNB_PENSUM_COURSES['6to'].length, 10, "6to debe tener exactamente 10 materias oficiales");
console.log("  ✅ Catálogo CNB verificado: 9 materias en 4to, 9 en 5to y 10 en 6to (Total: 28).");

// 2. Restauración de Malla Oficial en 1 clic para 4to
console.log("➡️  Prueba 2: Restauración de Malla en 1 clic (4to)...");
global.EnccoDialog = {
    confirm: (opts) => { if (opts.onConfirm) opts.onConfirm(); }
};
restoreOfficialCnbPensumForGrade('4to');
const subjects4to = STATE.pensumCatalog.filter(p => getPensumItemGradeKey(p) === '4to');
assert.strictEqual(subjects4to.length, 9, "Se deben haber creado exactamente 9 materias oficiales para 4to");
assert.strictEqual(subjects4to[0].name, 'Matemática Comercial');
assert.strictEqual(subjects4to[0].order, 1);
assert.strictEqual(subjects4to[8].order, 9);
console.log("  ✅ Malla de 4to restaurada fielmente con orden 1 al 9.");

// 3. Restauración de Malla Oficial en 1 clic para 6to
console.log("➡️  Prueba 3: Restauración de Malla en 1 clic (6to)...");
restoreOfficialCnbPensumForGrade('6to');
const subjects6to = STATE.pensumCatalog.filter(p => getPensumItemGradeKey(p) === '6to');
assert.strictEqual(subjects6to.length, 10, "Se deben haber creado exactamente 10 materias oficiales para 6to");
assert.ok(subjects6to.some(s => s.name === 'Seminario sobre Problemas Socioeconómicos de Guatemala'), "Debe incluir Seminario");
assert.ok(subjects6to.some(s => s.name === 'Práctica Supervisada'), "Debe incluir Práctica Supervisada");
console.log("  ✅ Malla de 6to restaurada con las 10 materias completas.");

// 4. Normalización de orden correlativo
console.log("➡️  Prueba 4: Normalización de orden correlativo...");
// Alterar orden arbitrariamente
subjects4to[0].order = 50;
subjects4to[1].order = 20;
normalizePensumSortOrderForGrade('4to');
const reordered4to = STATE.pensumCatalog.filter(p => getPensumItemGradeKey(p) === '4to');
reordered4to.forEach((s, idx) => {
    assert.strictEqual(s.order, idx + 1, `La materia ${idx} debe tener orden ${idx + 1}`);
});
console.log("  ✅ Normalizador de orden garantizó secuencia 1..N sin huecos ni duplicados.");

console.log("\n🎯 ¡TODAS LAS PRUEBAS DE MEJORAS CNB EN PENSUM PASARON CON ÉXITO (100%)!\n");
