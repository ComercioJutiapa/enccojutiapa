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

// TEST 4: JS mantiene visible attendanceMonthContainer para consulta histórica
test('JS: Mantiene visible attendanceMonthContainer para todos los roles (histórico mensual)', () => {
    assert(jsSrc.includes("getElementById('attendanceMonthContainer')"),
        'No se encontró getElementById attendanceMonthContainer');
    assert(jsSrc.includes("monthContainer.style.display = 'block'") || jsSrc.includes("monthContainer.style.display = ''"),
        'No se encontró que monthContainer permanezca visible');
});

// TEST 5: JS oculta el botón Autorizar Permiso para no-audit roles
test('JS: Oculta btnAutorizarPermiso cuando !isAuditRole', () => {
    assert(jsSrc.includes("getElementById('btnAutorizarPermiso')"),
        'No se encontró getElementById btnAutorizarPermiso');
    assert(jsSrc.includes("btnAutorizarPermiso.style.display = 'none'"),
        'No se encontró btnAutorizarPermiso.style.display = none');
});

// TEST 6: JS permite seleccionar cualquier mes para consultar el histórico
test('JS: Permite a los docentes seleccionar cualquier mes para consultar el histórico', () => {
    assert(jsSrc.includes("month = parseInt(monthSelect ? monthSelect.value : String(todayMonth)) || todayMonth;"),
        'No se recalcula month según el mes seleccionado en monthSelect');
});

// TEST 7: JS recalcula month y daysInMonth después de leer el selector
test('JS: Recalcula month y daysInMonth según el mes seleccionado', () => {
    assert(jsSrc.includes('month = parseInt(monthSelect ? monthSelect.value : String(todayMonth)) || todayMonth;'),
        'month debe ser recalculado con el valor seleccionado');
    assert(jsSrc.includes('daysInMonth = new Date(year, month, 0).getDate();'),
        'daysInMonth debe ser recalculado con el mes seleccionado');
});

// TEST 8: JS restaura visibilidad para roles de auditoría
test('JS: Restaura visibilidad de btnAutorizarPermiso para audit roles', () => {
    assert(jsSrc.includes("btnAutorizarPermiso.style.display = ''"),
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
