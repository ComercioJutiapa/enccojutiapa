/**
 * test_interactive_roles_and_docente_blocked.js
 * 
 * Verifica que los permisos y roles sean 100% interactivos:
 * Cuando un módulo está bloqueado ('none') para docentes u otros roles en rolesConfig,
 * NO debe mostrarse en la navegación ni en la interfaz, y no puede ser accedido.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 PRUEBAS: ROLES Y PERMISOS INTERACTIVOS (DOCENTES Y BLOQUEO)');
console.log('================================================================\n');

const mockStorage = {};
const localStorageMock = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const context = {
    window: {
        addEventListener: () => {},
        removeEventListener: () => {},
        location: { href: 'plataforma.html', pathname: '/plataforma.html' },
        scrollTo: () => {}
    },
    localStorage: localStorageMock,
    document: {
        querySelectorAll: () => [],
        getElementById: () => null,
        createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
        addEventListener: () => {},
        removeEventListener: () => {}
    },
    console: console,
    STATE: {
        currentRole: 'docente',
        currentUser: { id: 'usr-doc-01', name: 'Profesor Test', role: 'docente' },
        rolesConfig: null
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
};
const vm = require('vm');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

vm.createContext(context);

// Extraer y ejecutar las partes de RBAC de app.js en el contexto
vm.runInContext(appCode, context);

const { STATE, normalizeRolesConfig, getModulePermissionLevel, hasRolePermission, canRoleModify, updatePermCardStyle, setAllPermissionsLevel, SYSTEM_MODULES_LIST } = context;

console.log('▶ [TEST 1] Inicialización de rolesConfig por defecto...');
normalizeRolesConfig();
assert(Array.isArray(STATE.rolesConfig), 'rolesConfig debe ser un arreglo');
const docenteRole = STATE.rolesConfig.find(r => r.key === 'docente');
assert(docenteRole, 'El rol docente debe existir en rolesConfig');
assert(docenteRole.permissionLevels, 'docente debe tener matriz permissionLevels');
console.log('  ✅ Test 1 Superado: rolesConfig normalizado con los 6 roles oficiales.');

console.log('\n▶ [TEST 2] Verificación de bloqueo interactivo de módulos para docente...');
// Bloqueamos interactivamente 'honor-roll' y 'reports' para el docente
docenteRole.permissionLevels['honor-roll'] = 'none';
docenteRole.permissionLevels['reports'] = 'none';
docenteRole.permissions = docenteRole.permissions.filter(p => p !== 'honor-roll' && p !== 'reports');

assert.strictEqual(getModulePermissionLevel('honor-roll', 'docente'), 'none', 'honor-roll debe devolver "none" cuando está bloqueado');
assert.strictEqual(hasRolePermission('honor-roll', 'docente'), false, 'hasRolePermission para honor-roll debe ser false');
assert.strictEqual(canRoleModify('honor-roll', 'docente'), false, 'canRoleModify para honor-roll debe ser false');

assert.strictEqual(getModulePermissionLevel('reports', 'docente'), 'none', 'reports debe devolver "none" cuando está bloqueado');
assert.strictEqual(hasRolePermission('reports', 'docente'), false, 'hasRolePermission para reports debe ser false');

console.log('  ✅ Test 2 Superado: Módulos bloqueados ("none") devuelven false de forma interactiva y no se muestran.');

console.log('\n▶ [TEST 3] normalizeRolesConfig respeta la configuración interactiva sin sobrescribir...');
// Llamamos a normalizeRolesConfig() para simular recarga / sincronización
normalizeRolesConfig();
assert.strictEqual(docenteRole.permissionLevels['honor-roll'], 'none', 'normalizeRolesConfig NO debe revertir honor-roll a "view"');
assert.strictEqual(docenteRole.permissionLevels['reports'], 'none', 'normalizeRolesConfig NO debe revertir reports a "view"');
assert(!docenteRole.permissions.includes('honor-roll'), 'permissions no debe incluir honor-roll si está bloqueado');
console.log('  ✅ Test 3 Superado: normalizeRolesConfig preserva fielmente los bloqueos interactivos.');

console.log('\n▶ [TEST 4] Reactivación interactiva a Solo Ver y Modificar...');
// Cambiamos 'honor-roll' a 'view'
docenteRole.permissionLevels['honor-roll'] = 'view';
docenteRole.permissions.push('honor-roll', 'honor-roll_view');

assert.strictEqual(getModulePermissionLevel('honor-roll', 'docente'), 'view', 'honor-roll debe ser "view"');
assert.strictEqual(hasRolePermission('honor-roll', 'docente'), true, 'hasRolePermission para honor-roll debe ser true al estar en "view"');
assert.strictEqual(canRoleModify('honor-roll', 'docente'), false, 'canRoleModify para honor-roll debe ser false en modo consulta');

// Cambiamos 'gradebook' a 'edit'
docenteRole.permissionLevels['gradebook'] = 'edit';
assert.strictEqual(getModulePermissionLevel('gradebook', 'docente'), 'edit', 'gradebook debe ser "edit"');
assert.strictEqual(hasRolePermission('gradebook', 'docente'), true, 'hasRolePermission debe ser true');
assert.strictEqual(canRoleModify('gradebook', 'docente'), true, 'canRoleModify debe ser true');

console.log('  ✅ Test 4 Superado: Modos "view" y "edit" responden de manera reactiva e interactiva.');

console.log('\n▶ [TEST 5] Super Administrador siempre conserva acceso total incondicional...');
assert.strictEqual(getModulePermissionLevel('honor-roll', 'admin'), 'edit', 'Admin siempre tiene edit');
assert.strictEqual(hasRolePermission('honor-roll', 'admin'), true, 'Admin siempre tiene hasRolePermission true');
assert.strictEqual(canRoleModify('honor-roll', 'admin'), true, 'Admin siempre puede modificar');
console.log('  ✅ Test 5 Superado: Blindaje de privilegios del Super Administrador verificado.');

console.log('\n▶ [TEST 6] Simulación DOM de applyUserRole para verificar ocultamiento de nav-items bloqueados...');
// Simulación DOM completa de los ítems del sidebar
const fakeNavItems = [
    {
        dataset: { view: 'dashboard', perm: 'dashboard' },
        style: {
            display: '',
            setProperty: function(k, v) { this[k] = v; },
            removeProperty: function(k) { delete this[k]; }
        },
        classList: {
            classes: new Set(),
            add: function(c) { this.classes.add(c); },
            remove: function(c) { this.classes.delete(c); },
            contains: function(c) { return this.classes.has(c); }
        },
        getAttribute: function() { return null; }
    },
    {
        dataset: { view: 'honor-roll', perm: 'honor-roll' },
        style: {
            display: '',
            setProperty: function(k, v) { this[k] = v; },
            removeProperty: function(k) { delete this[k]; }
        },
        classList: {
            classes: new Set(),
            add: function(c) { this.classes.add(c); },
            remove: function(c) { this.classes.delete(c); },
            contains: function(c) { return this.classes.has(c); }
        },
        getAttribute: function() { return null; }
    },
    {
        dataset: { view: 'reports', perm: 'reports' },
        style: {
            display: '',
            setProperty: function(k, v) { this[k] = v; },
            removeProperty: function(k) { delete this[k]; }
        },
        classList: {
            classes: new Set(),
            add: function(c) { this.classes.add(c); },
            remove: function(c) { this.classes.delete(c); },
            contains: function(c) { return this.classes.has(c); }
        },
        getAttribute: function() { return null; }
    }
];

// Bloqueamos 'reports' para el docente
docenteRole.permissionLevels['reports'] = 'none';
docenteRole.permissions = docenteRole.permissions.filter(p => p !== 'reports');

// Ejecutamos la lógica de renderizado sobre los fakeNavItems
fakeNavItems.forEach(el => {
    const targetView = el.dataset.view;
    const permKey = el.dataset.perm || targetView;
    const hasAccess = hasRolePermission(permKey, 'docente');

    if (hasAccess) {
        el.style.removeProperty('display');
        el.classList.remove('hidden');
    } else {
        el.style.setProperty('display', 'none', 'important');
        el.classList.add('hidden');
    }
});

assert(!fakeNavItems[0].classList.contains('hidden'), 'dashboard debe ser visible');
assert(!fakeNavItems[1].classList.contains('hidden'), 'honor-roll debe ser visible');
assert(fakeNavItems[2].classList.contains('hidden'), 'reports DEBE ESTAR OCULTO cuando está bloqueado');
assert.strictEqual(fakeNavItems[2].style.display, 'none', 'reports debe tener display: none');

console.log('  ✅ Test 6 Superado: Los elementos bloqueados en la barra de navegación quedan ocultos (.hidden y display: none).');

console.log('\n▶ [TEST 7] Verificación de que currentUser=admin no invalida el ocultamiento al probar/aplicar rol docente...');
STATE.currentUser = { id: 'admin-01', name: 'Administrador', role: 'admin' };
context.document.querySelectorAll = function(selector) {
    if (selector === '.nav-item') return fakeNavItems;
    return [];
};
context.applyUserRole('docente');
assert(fakeNavItems[2].classList.contains('hidden'), 'reports DEBE SEGUIR OCULTO para rol docente aun si currentUser es admin');
assert.strictEqual(fakeNavItems[2].style.display, 'none', 'reports debe tener display: none para rol docente');
console.log('  ✅ Test 7 Superado: applyUserRole("docente") oculta módulos bloqueados incluso cuando currentUser es admin.');

console.log('\n================================================================');
console.log('🎉 TODAS LAS PRUEBAS DE ROLES INTERACTIVOS PASARON AL 100%');
console.log('================================================================\n');

process.exit(0);
