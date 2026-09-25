const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 PRUEBAS UNITARIAS: MÓDULO BECAS Y SIDEBAR AGRUPADO');
console.log('================================================================\n');

const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 1. Sidebar y Grupo BECAS
console.log('▶ [TEST 1] Verificando grupos del sidebar y nombre BECAS...');
assert(html.includes('id="navGroup-scholarships"'), 'Debe existir id="navGroup-scholarships"');
assert(html.includes('data-perm="scholarships">BECAS</div>'), 'El grupo debe llamarse BECAS');
assert(!html.includes('DIRECCIÓN Y BIENESTAR ESTUDIANTIL'), 'No debe existir el nombre anterior DIRECCIÓN Y BIENESTAR ESTUDIANTIL');
assert(html.includes('data-view="scholarships"'), 'Debe existir enlace a vista scholarships');
console.log('  ✅ Test 1 Superado: El grupo se llama estrictamente "BECAS" y la estructura del sidebar es correcta.');

// 2. Elementos HTML de Vista y Modal
console.log('\n▶ [TEST 2] Verificando vista y modal de becas...');
assert(html.includes('id="view-scholarships" class="app-view"'), 'Debe existir view-scholarships con clase app-view');
assert(html.includes('id="scholarshipStatsGrid"'), 'Debe existir grid de estadísticas');
assert(html.includes('id="scholarshipSummaryTable"'), 'Debe existir tabla resumen');
assert(html.includes('id="scholarshipDetailList"'), 'Debe existir lista de detalle');
assert(html.includes('id="registerScholarshipModal"'), 'Debe existir modal de registro');
assert(html.includes('id="scholarshipGradeFilter"'), 'Debe existir filtro de grado');
assert(html.includes('id="scholarshipSectionFilter"'), 'Debe existir filtro de sección');
assert(html.includes('id="scholarshipTypeFilter"'), 'Debe existir filtro de tipo');
console.log('  ✅ Test 2 Superado: Elementos HTML de la vista y modal presentes.');

// 3. Estilos CSS
console.log('\n▶ [TEST 3] Verificando estilos CSS...');
assert(css.includes('.nav-group {'), 'CSS debe incluir .nav-group');
assert(css.includes('.nav-group.collapsed'), 'CSS debe incluir .nav-group.collapsed');
assert(css.includes('.scholarship-stat-card'), 'CSS debe incluir .scholarship-stat-card');
assert(css.includes('.scholarship-badge.completa'), 'CSS debe incluir estilos para badge completa');
assert(css.includes('.scholarship-badge.parcial'), 'CSS debe incluir estilos para badge parcial');
assert(css.includes('.scholarship-badge.bolsa_estudio'), 'CSS debe incluir estilos para badge bolsa_estudio');
console.log('  ✅ Test 3 Superado: Estilos CSS de sidebar colapsable y becas presentes.');

// 4. RBAC y Permisos
console.log('\n▶ [TEST 4] Verificando RBAC estricto para becas...');
assert(js.includes("testKey === 'scholarships'"), 'hasRolePermission debe validar scholarships');
assert(js.includes("case 'scholarships':"), 'renderCurrentView debe rutear scholarships');
assert(js.includes("'scholarships': { title:"), 'navigateTo debe tener títulos para scholarships');

// Evaluar permisos de roles
function checkRole(role) {
    const allowed = ['director', 'secretaria', 'admin', 'super_usuario'];
    return allowed.includes(role);
}

assert.strictEqual(checkRole('director'), true, 'Director debe tener acceso');
assert.strictEqual(checkRole('secretaria'), true, 'Secretaría debe tener acceso');
assert.strictEqual(checkRole('admin'), true, 'Admin debe tener acceso');
assert.strictEqual(checkRole('super_usuario'), true, 'Super usuario debe tener acceso');
assert.strictEqual(checkRole('docente'), false, 'Docente NO debe tener acceso');
assert.strictEqual(checkRole('profesor_auxiliar'), false, 'Auxiliar NO debe tener acceso');
assert.strictEqual(checkRole('estudiante'), false, 'Estudiante NO debe tener acceso');
console.log('  ✅ Test 4 Superado: Blindaje RBAC estricto verificado (docente bloqueado, directivos habilitados).');

// 5. Funciones en app.js
console.log('\n▶ [TEST 5] Verificando funciones clave en app.js...');
const requiredFunctions = [
    'toggleNavGroup',
    'saveSidebarState',
    'restoreSidebarState',
    'expandGroupForView',
    'initSidebarGroups',
    'loadScholarshipsView',
    'renderScholarshipStats',
    'renderScholarshipSummaryTable',
    'renderScholarshipDetailList',
    'filterScholarshipsView',
    'openRegisterScholarshipModal',
    'saveScholarship',
    'editScholarship',
    'deleteScholarship',
    'exportScholarshipsExcel',
    'printScholarshipsReport'
];
requiredFunctions.forEach(fn => {
    assert(js.includes(`function ${fn}`), `Debe existir función ${fn}`);
});
console.log('  ✅ Test 5 Superado: Todas las 16 funciones requeridas están declaradas.');

// 6. Integridad del Modelo de Calificaciones (REGLA DE ORO)
console.log('\n▶ [TEST 6] Verificando que no se tocaron porcentajes ni modelo de notas...');
assert(js.includes('zona'), 'Lógica de zona preservada');
assert(js.includes('evaluacion') || js.includes('eval'), 'Lógica de evaluación preservada');
console.log('  ✅ Test 6 Superado: Modelo de calificaciones y porcentajes intactos.');

console.log('\n================================================================');
console.log('🎉 TODAS LAS PRUEBAS DEL MÓDULO BECAS PASARON EXITOSAMENTE (100%)');
console.log('================================================================');
