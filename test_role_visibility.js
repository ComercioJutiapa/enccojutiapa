/**
 * test_role_visibility.js
 * Verifica que el selector de mes y botón Autorizar Permiso
 * están ocultos para docentes y visibles para roles de auditoría.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'plataforma.html');
const jsPath = path.join(__dirname, 'app.js');

const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const jsSrc = fs.readFileSync(jsPath, 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✔ ${name}`);
        passed++;
    } catch (e) {
        console.log(`✖ ${name}: ${e.message}`);
        failed++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

console.log('=== VERIFICANDO VISIBILIDAD POR ROL EN TOOLBAR DE ASISTENCIA ===\n');

// TEST 1: HTML tiene id="attendanceMonthContainer" en el div del selector de mes
test('HTML: El contenedor del selector de mes tiene id="attendanceMonthContainer"', () => {
    assert(htmlSrc.includes('id="attendanceMonthContainer"'),
        'No se encontró id="attendanceMonthContainer" en plataforma.html');
});

// TEST 2: HTML tiene id="btnAutorizarPermiso" en el botón de autorización
test('HTML: El botón Autorizar Permiso tiene id="btnAutorizarPermiso"', () => {
    assert(htmlSrc.includes('id="btnAutorizarPermiso"'),
        'No se encontró id="btnAutorizarPermiso" en plataforma.html');
});

// TEST 3: JS define isAuditRole correctamente
test('JS: Se define isAuditRole excluyendo al docente', () => {
    assert(jsSrc.includes('const isAuditRole'),
        'No se encontró declaración de isAuditRole');
    // isAuditRole usa isDirectorOrAdmin (que contiene director, admin, secretaria)
    // más profesor_auxiliar, auxiliar, auxiliatura, super_usuario
    const auditRoleMatch = jsSrc.match(/const isAuditRole\s*=\s*\(([^;]+)\)/);
    assert(auditRoleMatch, 'No se encontró la expresión de isAuditRole');
    const expr = auditRoleMatch[1];
    assert(!expr.includes("'docente'"),
        'El docente NO debería estar en la lista de isAuditRole');
    // Verificar que incluye isDirectorOrAdmin (que ya tiene director, admin, secretaria)
    assert(expr.includes('isDirectorOrAdmin'), 'isDirectorOrAdmin debe estar en isAuditRole');
    assert(expr.includes('auxiliar'), 'auxiliar debe estar en isAuditRole');
    assert(expr.includes('profesor_auxiliar'), 'profesor_auxiliar debe estar en isAuditRole');
    assert(expr.includes('auxiliatura'), 'auxiliatura debe estar en isAuditRole');
    assert(expr.includes('super_usuario'), 'super_usuario debe estar en isAuditRole');
});

// TEST 4: JS oculta el selector de mes para no-audit roles
test('JS: Oculta attendanceMonthContainer cuando !isAuditRole', () => {
    assert(jsSrc.includes("getElementById('attendanceMonthContainer')"),
        'No se encontró getElementById attendanceMonthContainer');
    assert(jsSrc.includes("monthContainer.style.display = 'none'"),
        'No se encontró monthContainer.style.display = none');
});

// TEST 5: JS oculta el botón Autorizar Permiso para no-audit roles
test('JS: Oculta btnAutorizarPermiso cuando !isAuditRole', () => {
    assert(jsSrc.includes("getElementById('btnAutorizarPermiso')"),
        'No se encontró getElementById btnAutorizarPermiso');
    assert(jsSrc.includes("btnAutorizarPermiso.style.display = 'none'"),
        'No se encontró btnAutorizarPermiso.style.display = none');
});

// TEST 6: JS fuerza mes actual para docentes
test('JS: Fuerza monthSelect.value a todayMonth para docentes', () => {
    // Dentro del bloque !isAuditRole, debe forzar monthSelect.value = String(todayMonth)
    const block = jsSrc.match(/if\s*\(\s*!isAuditRole\s*\)\s*\{([\s\S]*?)\}\s*else/);
    assert(block, 'No se encontró el bloque if(!isAuditRole)');
    assert(block[1].includes("monthSelect.value = String(todayMonth)"),
        'No se fuerza monthSelect.value a todayMonth dentro de !isAuditRole');
});

// TEST 7: JS recalcula month y daysInMonth después del bloque de rol
test('JS: Recalcula month y daysInMonth después del bloque de visibilidad', () => {
    // month y daysInMonth deben ser 'let' (no 'const')
    assert(jsSrc.includes('let month = parseInt('),
        'month debe ser let, no const');
    assert(jsSrc.includes('let daysInMonth = new Date('),
        'daysInMonth debe ser let, no const');
    // Recálculo después del bloque
    assert(jsSrc.includes('// Recalcular mes y días después de posible forzado por rol'),
        'No se encontró el comentario de recálculo');
});

// TEST 8: JS restaura visibilidad para roles de auditoría
test('JS: Restaura visibilidad de monthContainer y btnAutorizarPermiso para audit roles', () => {
    const elseBlock = jsSrc.match(/}\s*else\s*\{\s*\/\/ Roles de auditoría([\s\S]*?)\}/);
    assert(elseBlock, 'No se encontró el bloque else de auditoría');
    assert(elseBlock[1].includes("monthContainer.style.display = ''"),
        'No restaura monthContainer.style.display para audit');
    assert(elseBlock[1].includes("btnAutorizarPermiso.style.display = ''"),
        'No restaura btnAutorizarPermiso.style.display para audit');
});

// TEST 9: openCreatePermissionModal todavía tiene guardia backend
test('JS: openCreatePermissionModal mantiene guardia de backend para docente', () => {
    const fnIdx = jsSrc.indexOf('function openCreatePermissionModal(');
    assert(fnIdx !== -1, 'No se encontró openCreatePermissionModal');
    // Buscar en los próximos 500 caracteres después de la declaración
    const fnSlice = jsSrc.substring(fnIdx, fnIdx + 500);
    assert(fnSlice.includes('canManagePerms') || fnSlice.includes("'director'"),
        'La función openCreatePermissionModal debe tener guardia de roles');
});

console.log(`\n=== RESULTADOS: ${passed} pasaron, ${failed} fallaron ===`);
if (failed === 0) {
    console.log('🎉 TODAS LAS VERIFICACIONES DE VISIBILIDAD POR ROL SUPERADAS CON ÉXITO.\n');
} else {
    console.log('❌ HAY FALLOS EN LAS VERIFICACIONES.\n');
    process.exit(1);
}
