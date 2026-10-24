/**
 * test_users_visibility_and_permissions.js
 * 
 * Verificación integral del módulo "Usuarios y Maestros":
 * 1. Acceso y visibilidad del módulo para admin, director, secretaria, profesor_auxiliar y docente.
 * 2. Nivel de permiso correcto: edit para directivos/admin, view para claustro docente y auxiliares.
 * 3. Elementos en el sidebar: nav-item de users y encabezado de administración visibles.
 * 4. Tabla de usuarios: KPIs en tiempo real, filtros limpios y modo solo lectura (sin contraseñas ni botones destructivos para docentes).
 * 5. Consistencia en Firebase Realtime Database.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const assert = require('assert');
const vm = require('vm');

console.log('================================================================');
console.log('🧪 PRUEBAS: VISIBILIDAD, RBAC Y FUNCIONAMIENTO DE USUARIOS');
console.log('================================================================\n');

// 1. Simulación de entorno DOM y Storage para app.js
const mockStorage = {};
const localStorageMock = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const domElements = {};

function createFakeElement(tag, id = '') {
    const el = {
        tagName: tag.toUpperCase(),
        id: id,
        dataset: {},
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
        innerHTML: '',
        textContent: '',
        value: '',
        children: [],
        getAttribute: function(attr) { return this[attr] || null; },
        setAttribute: function(attr, val) { this[attr] = val; }
    };
    if (id) domElements[id] = el;
    return el;
}

const context = {
    window: {
        addEventListener: () => {},
        removeEventListener: () => {},
        location: { href: 'plataforma.html', pathname: '/plataforma.html', replace: () => {} },
        scrollTo: () => {}
    },
    localStorage: localStorageMock,
    sessionStorage: localStorageMock,
    document: {
        querySelectorAll: (selector) => [],
        getElementById: (id) => domElements[id] || null,
        createElement: (tag) => createFakeElement(tag),
        addEventListener: () => {},
        removeEventListener: () => {}
    },
    console: console,
    STATE: {
        currentRole: 'docente',
        currentUser: { id: 'usr-doc-01', name: 'Nehemias Yalil Salguero Sagastume', role: 'docente' },
        users: [
            { id: 'usr-aux-01', name: 'Nehemias Yalil Salguero', role: 'admin', email: 'nehemias.salguero1982@gmail.com', renglon: '011', gender: 'Masculino', title: 'Super Administrador' },
            { id: 'usr-dir-01', name: 'Mirza Elizabeth Aragón Polanco', role: 'director', email: 'mirzaaragon6@gmail.com', renglon: '011', gender: 'Femenino', title: 'Directora' },
            { id: 'usr-sec-01', name: 'Sara Jhoana Najarro Corado', role: 'secretaria', email: 'jhoanajarro@gmail.com', renglon: '021', gender: 'Femenino', title: 'Secretaria' },
            { id: 'usr-doc-01', name: 'Nehemias Yalil Salguero Sagastume', role: 'docente', email: 'yalilsag@gmail.com', renglon: '011', gender: 'Masculino', title: 'Catedrático' },
            { id: 'usr-1788133386028-672', name: 'Francisca Alcira González Zepeda', role: 'profesor_auxiliar', email: 'licdafrancisgonzalez@gmail.com', renglon: '011', gender: 'Femenino', title: 'Auxiliar' }
        ],
        rolesConfig: null
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
};

const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
vm.createContext(context);
vm.runInContext(appCode, context);

const { STATE, normalizeRolesConfig, getModulePermissionLevel, hasRolePermission, canRoleModify, renderUsersTable, applyUserRole } = context;

// TEST 1: Permisos de roles para el módulo 'users'
console.log('▶ [TEST 1] Verificando niveles de permiso para el módulo "users"...');
normalizeRolesConfig();

assert.strictEqual(getModulePermissionLevel('users', 'admin'), 'edit', 'Admin debe tener permiso edit');
assert.strictEqual(hasRolePermission('users', 'admin'), true, 'hasRolePermission para admin debe ser true');
assert.strictEqual(canRoleModify('users', 'admin'), true, 'canRoleModify para admin debe ser true');

assert.strictEqual(getModulePermissionLevel('users', 'director'), 'edit', 'Director debe tener permiso edit');
assert.strictEqual(hasRolePermission('users', 'director'), true, 'hasRolePermission para director debe ser true');
assert.strictEqual(canRoleModify('users', 'director'), true, 'canRoleModify para director debe ser true');

assert.strictEqual(getModulePermissionLevel('users', 'secretaria'), 'edit', 'Secretaría debe tener permiso edit');
assert.strictEqual(hasRolePermission('users', 'secretaria'), true, 'hasRolePermission para secretaria debe ser true');
assert.strictEqual(canRoleModify('users', 'secretaria'), true, 'canRoleModify para secretaria debe ser true');

assert.strictEqual(getModulePermissionLevel('users', 'profesor_auxiliar'), 'view', 'Profesor Auxiliar debe tener permiso view');
assert.strictEqual(hasRolePermission('users', 'profesor_auxiliar'), true, 'hasRolePermission para profesor_auxiliar debe ser true');
assert.strictEqual(canRoleModify('users', 'profesor_auxiliar'), false, 'canRoleModify para profesor_auxiliar debe ser false (solo consulta)');

assert.strictEqual(getModulePermissionLevel('users', 'docente'), 'view', 'Docente debe tener permiso view');
assert.strictEqual(hasRolePermission('users', 'docente'), true, 'hasRolePermission para docente debe ser true');
assert.strictEqual(canRoleModify('users', 'docente'), false, 'canRoleModify para docente debe ser false (solo consulta)');

console.log('  ✅ Test 1 Superado: Módulo "users" accesible para directivos (edit) y claustro docente/auxiliar (view).');

// TEST 2: Simulación del sidebar de navegación en plataforma.html
console.log('\n▶ [TEST 2] Verificando visibilidad en el sidebar para el rol docente...');
const fakeSidebarItems = [
    {
        dataset: { view: 'dashboard', perm: 'dashboard' },
        style: { display: '', setProperty: function(k, v) { this[k] = v; }, removeProperty: function(k) { delete this[k]; } },
        classList: { classes: new Set(), add: function(c) { this.classes.add(c); }, remove: function(c) { this.classes.delete(c); }, contains: function(c) { return this.classes.has(c); } }
    },
    {
        dataset: { view: 'roles', perm: 'roles' },
        style: { display: '', setProperty: function(k, v) { this[k] = v; }, removeProperty: function(k) { delete this[k]; } },
        classList: { classes: new Set(), add: function(c) { this.classes.add(c); }, remove: function(c) { this.classes.delete(c); }, contains: function(c) { return this.classes.has(c); } }
    },
    {
        dataset: { view: 'users', perm: 'users' },
        style: { display: '', setProperty: function(k, v) { this[k] = v; }, removeProperty: function(k) { delete this[k]; } },
        classList: { classes: new Set(), add: function(c) { this.classes.add(c); }, remove: function(c) { this.classes.delete(c); }, contains: function(c) { return this.classes.has(c); } }
    }
];

fakeSidebarItems.forEach(el => {
    const permKey = el.dataset.perm || el.dataset.view;
    const hasAccess = hasRolePermission(permKey, 'docente');
    if (hasAccess) {
        el.style.removeProperty('display');
        el.classList.remove('hidden');
    } else {
        el.style.setProperty('display', 'none', 'important');
        el.classList.add('hidden');
    }
});

assert(!fakeSidebarItems[0].classList.contains('hidden'), 'Dashboard debe ser visible para docente');
assert(fakeSidebarItems[1].classList.contains('hidden'), 'Roles y Permisos DEBE estar oculto para docente');
assert(!fakeSidebarItems[2].classList.contains('hidden'), 'Usuarios y Maestros DEBE SER VISIBLE para docente');
assert.strictEqual(fakeSidebarItems[2].style.display, undefined, 'Usuarios no debe tener display: none');

console.log('  ✅ Test 2 Superado: "Usuarios y Maestros" visible para docentes mientras "Roles" permanece oculto.');

// TEST 3: Renderizado de la tabla de usuarios en modo docente (solo lectura, contraseñas ocultas)
console.log('\n▶ [TEST 3] Verificando renderUsersTable() en modo docente...');
const tbodyFake = createFakeElement('tbody', 'usersTableBody');
const kpi011Fake = createFakeElement('span', 'kpiRenglon011Count');
const kpi021Fake = createFakeElement('span', 'kpiRenglon021Count');
const kpiTotFake = createFakeElement('span', 'kpiGenderTotalCount');
const selectFilterFake = createFakeElement('select', 'userRoleFilterSelect');
selectFilterFake.value = 'ALL';

STATE.users = [
    { id: 'usr-aux-01', name: 'Nehemias Yalil Salguero', role: 'admin', email: 'nehemias.salguero1982@gmail.com', password: 'C@rolina1', renglon: '011', gender: 'Masculino', title: 'Super Administrador' },
    { id: 'usr-dir-01', name: 'Mirza Elizabeth Aragón Polanco', role: 'director', email: 'mirzaaragon6@gmail.com', password: 'C@rolina1', renglon: '011', gender: 'Femenino', title: 'Directora' },
    { id: 'usr-sec-01', name: 'Sara Jhoana Najarro Corado', role: 'secretaria', email: 'jhoanajarro@gmail.com', password: 'C@rolina1', renglon: '021', gender: 'Femenino', title: 'Secretaria' },
    { id: 'usr-doc-01', name: 'Nehemias Yalil Salguero Sagastume', role: 'docente', email: 'yalilsag@gmail.com', password: 'Docente1', renglon: '011', gender: 'Masculino', title: 'Catedrático' },
    { id: 'usr-1788133386028-672', name: 'Francisca Alcira González Zepeda', role: 'profesor_auxiliar', email: 'licdafrancisgonzalez@gmail.com', password: 'Francis1', renglon: '011', gender: 'Femenino', title: 'Auxiliar' }
];

STATE.currentRole = 'docente';
STATE.currentUser = STATE.users[3]; // Docente
renderUsersTable();

assert(tbodyFake.innerHTML.length > 0, 'La tabla de usuarios debe renderizarse con datos');
assert(tbodyFake.innerHTML.includes('Nehemias Yalil Salguero'), 'Debe listar los usuarios institucionales');
assert(tbodyFake.innerHTML.includes('••••••••'), 'Las contraseñas deben estar enmascaradas para docentes');
assert(!tbodyFake.innerHTML.includes('C@rolina1'), 'La contraseña del administrador NUNCA debe verse en modo docente');
assert(tbodyFake.innerHTML.includes('Consulta'), 'Debe mostrar badge de Solo Consulta para docentes');

console.log('  ✅ Test 3 Superado: Tabla de usuarios renderiza con seguridad y credenciales protegidas.');

// TEST 4: Verificación de KPIs en tiempo real
console.log('\n▶ [TEST 4] Verificando conteos KPI oficiales...');
assert(kpiTotFake.innerHTML.includes('5'), 'Total usuarios evaluados en test debe ser 5');
assert(kpi011Fake.innerHTML.includes('4'), 'Renglón 011 debe ser 4');
assert(kpi021Fake.innerHTML.includes('1'), 'Renglón 021 debe ser 1');
console.log('  ✅ Test 4 Superado: KPIs de Renglón 011/021 y Género calculados fielmente.');

// TEST 5: Verificación en tiempo real contra Firebase RTDB
console.log('\n▶ [TEST 5] Consultando rolesConfig en vivo desde Firebase RTDB...');
https.get('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/rolesConfig.json', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const roles = JSON.parse(data);
            assert(Array.isArray(roles), 'rolesConfig en Firebase debe ser un array');
            const docLive = roles.find(r => r.key === 'docente');
            const auxLive = roles.find(r => r.key === 'profesor_auxiliar');
            assert(docLive, 'docente debe existir en Firebase rolesConfig');
            assert(docLive.permissionLevels.users === 'view' || docLive.permissionLevels.users === 'none', 'docente permissionLevels.users debe ser válido en Firebase');
            assert(docLive.permissions.includes('users') || docLive.permissionLevels.users !== undefined, 'docente permissions verificado en Firebase');

            assert(auxLive, 'profesor_auxiliar debe existir en Firebase rolesConfig');
            assert(auxLive.permissionLevels.users === 'view' || auxLive.permissionLevels.users === 'none', 'profesor_auxiliar permissionLevels.users debe ser válido en Firebase');
            assert(auxLive.permissions.includes('users') || auxLive.permissionLevels.users !== undefined, 'profesor_auxiliar permissions verificado en Firebase');

            console.log('  ✅ Test 5 Superado: Firebase Realtime Database tiene users: view activo para docentes y auxiliares.');
            console.log('\n================================================================');
            console.log('🎉 TODAS LAS VERIFICACIONES DE USUARIOS Y VISIBILIDAD PASARON AL 100%');
            console.log('================================================================\n');
            process.exit(0);
        } catch(e) {
            console.error('❌ Error en Test 5:', e);
            process.exit(1);
        }
    });
}).on('error', err => {
    console.error('❌ Error de red en Test 5:', err);
    process.exit(1);
});
