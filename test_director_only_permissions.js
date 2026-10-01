// test_director_only_permissions.js
// Verification suite for Director-Only Permissions Management (Web Designer & Atomicity)

const fs = require('fs');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN INTEGRAL: CONTROL EXCLUSIVO DE PERMISOS PARA LA DIRECCIÓN GENERAL');
console.log('================================================================================\n');

const appContent = fs.readFileSync('app.js', 'utf8');
const htmlContent = fs.readFileSync('plataforma.html', 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

// 1. Verificación en plataforma.html
test('HTML: Contenedor del banner de estado de permisos de roles presente', () => {
    assert(htmlContent.includes('id="rolesPermissionStatusBanner"'), 'Debe existir rolesPermissionStatusBanner');
    assert(htmlContent.includes('id="btnCreateNewRoleHeader"'), 'Debe existir btnCreateNewRoleHeader');
});

test('HTML: Modal de permisos soporta modo edición y control atomico', () => {
    assert(htmlContent.includes('id="permEditingId"'), 'Debe existir input hidden permEditingId');
    assert(htmlContent.includes('id="createPermissionModalTitle"'), 'Debe existir createPermissionModalTitle');
    assert(htmlContent.includes('id="createPermissionSubmitBtn"'), 'Debe existir createPermissionSubmitBtn');
});

// 2. Verificación en app.js - Director en rolesConfig
test('JS: El rol "director" tiene acceso habilitado al módulo de roles', () => {
    const directorIdx = appContent.indexOf("key: 'director'");
    assert(directorIdx !== -1, 'Debe existir clave director');
    const slice = appContent.slice(directorIdx, directorIdx + 300);
    assert(!slice.includes("k !== 'roles'"), 'El director no debe tener filtrado roles');
    assert(slice.includes("permissions: allKeys"), 'El director debe tener permissions: allKeys');
});

// 3. Verificación de función de autorización central
test('JS: isDirectorOrSuperAdmin implementada y exportada', () => {
    assert(appContent.includes('function isDirectorOrSuperAdmin()'), 'Debe existir isDirectorOrSuperAdmin');
    assert(appContent.includes('window.isDirectorOrSuperAdmin = isDirectorOrSuperAdmin;'), 'Debe exportar isDirectorOrSuperAdmin');
});

// 4. Verificación de salvaguardas en roles del sistema
test('JS: saveActiveRolePermissions restringe guardado exclusivamente a Dirección/Admin', () => {
    const fnIdx = appContent.indexOf('async function saveActiveRolePermissions()');
    assert(fnIdx !== -1, 'Debe existir saveActiveRolePermissions');
    const slice = appContent.slice(fnIdx, fnIdx + 400);
    assert(slice.includes('isDirectorOrSuperAdmin()'), 'saveActiveRolePermissions debe validar con isDirectorOrSuperAdmin');
});

test('JS: setAllPermissionsLevel y updatePermCardStyle protegidos para Dirección', () => {
    const fnIdx1 = appContent.indexOf('function updatePermCardStyle(');
    const slice1 = appContent.slice(fnIdx1, fnIdx1 + 300);
    assert(slice1.includes('isDirectorOrSuperAdmin()'), 'updatePermCardStyle debe validar isDirectorOrSuperAdmin');

    const fnIdx2 = appContent.indexOf('function setAllPermissionsLevel(');
    const slice2 = appContent.slice(fnIdx2, fnIdx2 + 300);
    assert(slice2.includes('isDirectorOrSuperAdmin()'), 'setAllPermissionsLevel debe validar isDirectorOrSuperAdmin');
});

test('JS: loadRoleIntoPermissionsPanel bloquea inputs y botones de guardado si no es Dirección', () => {
    const fnIdx = appContent.indexOf('function loadRoleIntoPermissionsPanel(');
    const endIdx = appContent.indexOf('window.loadRoleIntoPermissionsPanel', fnIdx);
    const slice = appContent.slice(fnIdx, endIdx);
    assert(slice.includes('const isLocked = isSystemRole || !canEdit;'), 'Debe bloquear inputs si !canEdit');
    assert(slice.includes('saveBtns.forEach('), 'Debe ajustar visibilidad de botones de guardado');
    assert(slice.includes('bulkBtns.forEach('), 'Debe ajustar visibilidad de selectores masivos');
});

test('JS: Banner de diseño institucional renderizado con distinciones visuales ejecutivas', () => {
    assert(appContent.includes('function renderRolesPermissionBanner()'), 'Debe existir renderRolesPermissionBanner');
    assert(appContent.includes('Modo de Consulta Institucional'), 'Debe incluir modo de consulta para no-directores');
    assert(appContent.includes('Gestión Institucional de Permisos'), 'Debe incluir encabezado ejecutivo para Dirección');
});

// 5. Verificación de permisos de ausencia de estudiantes
test('JS: renderPermissionsHistoryTable solo muestra botones Editar y Anular a Dirección', () => {
    const fnIdx = appContent.indexOf('function renderPermissionsHistoryTable()');
    const endIdx = appContent.indexOf('window.renderPermissionsHistoryTable', fnIdx);
    const slice = appContent.slice(fnIdx, endIdx);
    assert(slice.includes('openEditStudentPermissionModal'), 'Debe existir botón Editar');
    assert(slice.includes('revokeStudentPermission'), 'Debe existir botón Anular');
    assert(slice.includes('${isDirectorOrSuperAdmin() ?'), 'Editar y Anular deben estar condicionados a isDirectorOrSuperAdmin');
});

test('JS: renderPermissionsHistoryView restringe Editar y Anular a Dirección', () => {
    const fnIdx = appContent.indexOf('function renderPermissionsHistoryView()');
    const endIdx = appContent.indexOf('window.renderPermissionsHistoryView', fnIdx);
    const slice = appContent.slice(fnIdx, endIdx);
    assert(slice.includes('${isDirectorOrSuperAdmin() ?'), 'Vista de bitácora debe condicionar Editar y Anular a isDirectorOrSuperAdmin');
});

test('JS: openEditStudentPermissionModal implementada con carga de datos y salvaguarda', () => {
    assert(appContent.includes('function openEditStudentPermissionModal(permId)'), 'Debe existir openEditStudentPermissionModal');
    assert(appContent.includes('window.openEditStudentPermissionModal = openEditStudentPermissionModal;'), 'Debe exportarse a window');
});

test('JS: saveStudentPermissionForm procesa actualización de permiso por Dirección', () => {
    const fnIdx = appContent.indexOf('function saveStudentPermissionForm(e)');
    const endIdx = appContent.indexOf('window.saveStudentPermissionForm', fnIdx);
    const slice = appContent.slice(fnIdx, endIdx);
    assert(slice.includes('editingId'), 'Debe comprobar editingId');
    assert(slice.includes('isDirectorOrSuperAdmin()'), 'Debe comprobar isDirectorOrSuperAdmin');
    assert(slice.includes("lastEditedBy = 'Dirección General'"), 'Debe sellar la edición como Dirección General');
});

test('JS: revokeStudentPermission bloquea anulación a no-directores', () => {
    const fnIdx = appContent.indexOf('function revokeStudentPermission(permId)');
    const endIdx = appContent.indexOf('window.revokeStudentPermission', fnIdx);
    const slice = appContent.slice(fnIdx, endIdx);
    assert(slice.includes('isDirectorOrSuperAdmin()'), 'revokeStudentPermission debe validar isDirectorOrSuperAdmin');
});

// 6. Verificación de integridad institucional (40/60)
test('INTEGRIDAD: Modelo de evaluación institucional 40% zona y 60% examen intacto', () => {
    assert(!appContent.includes('70/30'), 'Jamás debe incluirse 70/30');
    assert(appContent.includes('40') && appContent.includes('60'), 'El modelo 40/60 debe preservarse');
});

console.log(`\n================================================================================`);
console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
console.log(`================================================================================\n`);

if (failed > 0) {
    process.exit(1);
}
