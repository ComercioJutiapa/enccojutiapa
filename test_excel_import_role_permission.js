const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log("================================================================================");
console.log("🧪 VERIFICACIÓN DINÁMICA: ROL Y PERMISO 'PLANTILLAS Y LISTAS EXCEL'");
console.log("================================================================================");

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const plataformaHtml = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');

// TEST 1: Verificar elemento en el HTML con data-perm="excel-import" y data-view="excel-import"
console.log("\n▶ [TEST 1] Verificando elemento en plataforma.html...");
assert(plataformaHtml.includes('data-view="excel-import"'), "Falta data-view='excel-import' en plataforma.html");
assert(plataformaHtml.includes('data-perm="excel-import"'), "Falta data-perm='excel-import' en plataforma.html");
assert(plataformaHtml.includes('Plantillas y Listas Excel'), "Falta texto 'Plantillas y Listas Excel' en plataforma.html");
console.log("  ✅ Test 1 Superado: Elemento de navegación presente con data-perm='excel-import' y etiqueta correcta.");

// TEST 2: Verificar SYSTEM_MODULES_LIST en app.js
console.log("\n▶ [TEST 2] Verificando SYSTEM_MODULES_LIST...");
assert(appJs.includes("key: 'excel-import', name: 'Plantillas y Listas Excel'"), "SYSTEM_MODULES_LIST debe contener 'excel-import' con nombre 'Plantillas y Listas Excel'");
console.log("  ✅ Test 2 Superado: SYSTEM_MODULES_LIST configurado con 'Plantillas y Listas Excel'.");

// TEST 3: Verificar getAvailablePermissionsList en app.js
console.log("\n▶ [TEST 3] Verificando getAvailablePermissionsList...");
assert(appJs.includes("key: 'excel-import', label: 'Plantillas y Listas Excel'"), "getAvailablePermissionsList debe contener 'excel-import' con etiqueta 'Plantillas y Listas Excel'");
console.log("  ✅ Test 3 Superado: getAvailablePermissionsList tiene la etiqueta oficial.");

// TEST 4: Probar la lógica de normalizePermKey, getModulePermissionLevel y hasRolePermission
console.log("\n▶ [TEST 4] Evaluando funciones del motor de permisos...");

// Mock del entorno
const sandbox = {
    window: {},
    STATE: {
        currentUser: { role: 'admin' },
        currentRole: 'admin',
        rolesConfig: []
    },
    console: {
        log: () => {},
        warn: () => {},
        error: console.error
    }
};
sandbox.window = sandbox;

function extractFunction(source, funcName) {
    const start = source.indexOf(`function ${funcName}`);
    if (start === -1) throw new Error(`Function ${funcName} not found`);
    let braceCount = 0;
    let started = false;
    let end = start;
    for (let i = start; i < source.length; i++) {
        if (source[i] === '{') {
            braceCount++;
            started = true;
        } else if (source[i] === '}') {
            braceCount--;
            if (started && braceCount === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return source.substring(start, end);
}

// Extraemos normalizePermKey, getModulePermissionLevel, hasRolePermission, initDefaultRolesConfig
const normalizePermKeySrc = extractFunction(appJs, 'normalizePermKey');
const getModulePermissionLevelSrc = extractFunction(appJs, 'getModulePermissionLevel');
const hasRolePermissionSrc = extractFunction(appJs, 'hasRolePermission');
const initDefaultRolesConfigSrc = extractFunction(appJs, 'initDefaultRolesConfig');

// Extraer SYSTEM_MODULES_LIST
const sysModStart = appJs.indexOf('SYSTEM_MODULES_LIST = [');
const sysModEnd = appJs.indexOf('];', sysModStart) + 2;
const systemModulesListSrc = 'var ' + appJs.substring(sysModStart, sysModEnd);

const scriptToRun = `
${systemModulesListSrc}
window.SYSTEM_MODULES_LIST = SYSTEM_MODULES_LIST;

${normalizePermKeySrc}
window.normalizePermKey = normalizePermKey;

${initDefaultRolesConfigSrc}
window.initDefaultRolesConfig = initDefaultRolesConfig;

${getModulePermissionLevelSrc}
window.getModulePermissionLevel = getModulePermissionLevel;

${hasRolePermissionSrc}
window.hasRolePermission = hasRolePermission;
`;

vm.createContext(sandbox);
vm.runInContext(scriptToRun, sandbox);

const normalizePermKey = sandbox.window.normalizePermKey;
const initDefaultRolesConfig = sandbox.window.initDefaultRolesConfig;
const hasRolePermission = sandbox.window.hasRolePermission;

// Inicializamos rolesConfig
sandbox.STATE.rolesConfig = initDefaultRolesConfig();

// Test normalización de alias
assert.strictEqual(normalizePermKey('excel-import'), 'excel-import');
assert.strictEqual(normalizePermKey('excel_import'), 'excel-import');
assert.strictEqual(normalizePermKey('plantillas'), 'excel-import');
assert.strictEqual(normalizePermKey('plantillas-excel'), 'excel-import');
assert.strictEqual(normalizePermKey('plantillas_listas_excel'), 'excel-import');
assert.strictEqual(normalizePermKey('listas-excel'), 'excel-import');
console.log("  ✅ Test 4.1 Superado: Aliases de 'excel-import' se normalizan correctamente.");

// Test permisos por defecto
assert.strictEqual(hasRolePermission('excel-import', 'admin'), true, "Admin debe tener permiso excel-import por defecto");
assert.strictEqual(hasRolePermission('excel-import', 'director'), true, "Director debe tener permiso excel-import por defecto");
assert.strictEqual(hasRolePermission('excel-import', 'secretaria'), true, "Secretaria debe tener permiso excel-import por defecto");
assert.strictEqual(hasRolePermission('excel-import', 'docente'), false, "Docente NO debe tener permiso excel-import por defecto");
assert.strictEqual(hasRolePermission('excel-import', 'profesor_auxiliar'), false, "Profesor Auxiliar NO debe tener permiso excel-import por defecto");
console.log("  ✅ Test 4.2 Superado: Permisos por defecto correctos.");

// TEST 5: Dinamismo al activar y desactivar el rol
console.log("\n▶ [TEST 5] Verificando dinamismo al activar y desactivar el permiso...");

// Activar para docente
const docenteRole = sandbox.STATE.rolesConfig.find(r => r.key === 'docente');
assert(docenteRole, "Debe existir rol docente");
docenteRole.permissions.push('excel-import');

assert.strictEqual(hasRolePermission('excel-import', 'docente'), true, "Docente debe tener permiso una vez activado");
console.log("  ✓ Docente activado: hasRolePermission('excel-import', 'docente') === true");

// Probar desactivación
docenteRole.permissions = docenteRole.permissions.filter(p => p !== 'excel-import');
assert.strictEqual(hasRolePermission('excel-import', 'docente'), false, "Docente NO debe tener permiso una vez desactivado");
console.log("  ✓ Docente desactivado: hasRolePermission('excel-import', 'docente') === false");

// Probar con permissionLevels (matriz 3 niveles: none, read, full/edit)
docenteRole.permissionLevels = docenteRole.permissionLevels || {};
docenteRole.permissionLevels['excel-import'] = 'edit';
assert.strictEqual(hasRolePermission('excel-import', 'docente'), true, "Con permissionLevel 'edit', debe tener permiso");

docenteRole.permissionLevels['excel-import'] = 'view';
assert.strictEqual(hasRolePermission('excel-import', 'docente'), true, "Con permissionLevel 'view', debe tener permiso");

docenteRole.permissionLevels['excel-import'] = 'none';
assert.strictEqual(hasRolePermission('excel-import', 'docente'), false, "Con permissionLevel 'none', debe quedar denegado");
console.log("  ✓ Matriz de niveles (none / view / edit) responde dinámicamente.");

// TEST 6: Simulación de visibilidad en la barra de navegación (applyUserRole / applyReactivePermissions logic)
console.log("\n▶ [TEST 6] Simulando visibilidad en la barra de navegación...");

function simulateNavVisibility(role) {
    const navItem = {
        permKey: 'excel-import',
        style: {},
        classes: new Set(),
        setAttribute(k, v) { this[k] = v; },
        getAttribute(k) { return this[k]; }
    };
    navItem.style.setProperty = function(prop, val) { this[prop] = val; };
    navItem.classList = {
        add: function(c) { navItem.classes.add(c); },
        remove: function(c) { navItem.classes.delete(c); }
    };

    const isAllowed = hasRolePermission(navItem.permKey, role);
    if (!isAllowed) {
        navItem.style.setProperty('display', 'none', 'important');
        navItem.classList.add('hidden');
        navItem.setAttribute('data-allowed', 'false');
    } else {
        navItem.style.setProperty('display', '');
        navItem.classList.remove('hidden');
        navItem.setAttribute('data-allowed', 'true');
    }

    return {
        visible: navItem.style['display'] !== 'none' && !navItem.classes.has('hidden'),
        dataAllowed: navItem['data-allowed']
    };
}

// Para docente desactivado
delete docenteRole.permissionLevels['excel-import'];
let navDocente = simulateNavVisibility('docente');
assert.strictEqual(navDocente.visible, false, "Item de navegación debe estar oculto para docente sin permiso");
assert.strictEqual(navDocente.dataAllowed, 'false');
console.log("  ✓ Sin permiso: Item oculto (display: none, hidden class, data-allowed=false)");

// Ahora activamos permiso para docente
docenteRole.permissions.push('excel-import');
navDocente = simulateNavVisibility('docente');
assert.strictEqual(navDocente.visible, true, "Item de navegación debe ser visible para docente con permiso");
assert.strictEqual(navDocente.dataAllowed, 'true');
console.log("  ✓ Con permiso activado: Item visible en la barra de navegación");

// Desactivamos nuevamente
docenteRole.permissions = docenteRole.permissions.filter(p => p !== 'excel-import');
navDocente = simulateNavVisibility('docente');
assert.strictEqual(navDocente.visible, false, "Item de navegación vuelve a ocultarse");
assert.strictEqual(navDocente.dataAllowed, 'false');
console.log("  ✓ Al desactivar: Item vuelve a ocultarse automáticamente en tiempo real");

// Repetir para profesor_auxiliar
const auxRole = sandbox.STATE.rolesConfig.find(r => r.key === 'profesor_auxiliar');
assert(auxRole, "Debe existir rol profesor_auxiliar");

let navAux = simulateNavVisibility('profesor_auxiliar');
assert.strictEqual(navAux.visible, false, "Auxiliar sin permiso debe tener el item oculto");
console.log("  ✓ Auxiliar sin permiso: Item oculto");

auxRole.permissions.push('excel-import');
navAux = simulateNavVisibility('profesor_auxiliar');
assert.strictEqual(navAux.visible, true, "Auxiliar con permiso debe tener el item visible");
console.log("  ✓ Auxiliar con permiso: Item visible");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE ROL Y VISIBILIDAD DINÁMICA PASARON CON ÉXITO (100%)");
console.log("================================================================================");
