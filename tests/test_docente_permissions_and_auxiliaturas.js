const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function extractFunction(source, funcName) {
    const start = source.indexOf('function ' + funcName);
    if (start === -1) throw new Error('Function ' + funcName + ' not found');
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

const sandbox = {
    window: {},
    STATE: {
        currentUser: { role: 'docente' },
        currentRole: 'docente',
        rolesConfig: []
    },
    console: console
};
sandbox.window = sandbox;

const normalizePermKeySrc = extractFunction(appJs, 'normalizePermKey');
const getModulePermissionLevelSrc = extractFunction(appJs, 'getModulePermissionLevel');
const hasRolePermissionSrc = extractFunction(appJs, 'hasRolePermission');
const initDefaultRolesConfigSrc = extractFunction(appJs, 'initDefaultRolesConfig');
const normalizeRolesConfigSrc = extractFunction(appJs, 'normalizeRolesConfig');

const sysModStart = appJs.indexOf('SYSTEM_MODULES_LIST = [');
const sysModEnd = appJs.indexOf('];', sysModStart) + 2;
const systemModulesListSrc = 'var ' + appJs.substring(sysModStart, sysModEnd);

const scriptToRun = `
const SYSTEM_ROLE_KEYS = ['admin', 'director', 'secretaria', 'profesor_auxiliar', 'docente', 'estudiante'];
window.SYSTEM_ROLE_KEYS = SYSTEM_ROLE_KEYS;

${systemModulesListSrc}
window.SYSTEM_MODULES_LIST = SYSTEM_MODULES_LIST;
${normalizePermKeySrc}
window.normalizePermKey = normalizePermKey;
${initDefaultRolesConfigSrc}
window.initDefaultRolesConfig = initDefaultRolesConfig;
${normalizeRolesConfigSrc}
window.normalizeRolesConfig = normalizeRolesConfig;
${getModulePermissionLevelSrc}
window.getModulePermissionLevel = getModulePermissionLevel;
${hasRolePermissionSrc}
window.hasRolePermission = hasRolePermission;
`;

vm.createContext(sandbox);
vm.runInContext(scriptToRun, sandbox);

sandbox.STATE.rolesConfig = sandbox.window.initDefaultRolesConfig();

const modulesToCheck = [
    { key: 'students', expectedHas: true, expectedLevel: 'view' },
    { key: 'reports', expectedHas: true, expectedLevel: 'view' },
    { key: 'honor-roll', expectedHas: true, expectedLevel: 'view' },
    { key: 'grade-stats', expectedHas: true, expectedLevel: 'view' },
    { key: 'gradebook', expectedHas: true, expectedLevel: 'edit' },
    { key: 'attendance', expectedHas: true, expectedLevel: 'edit' },
    { key: 'exam-schedules', expectedHas: false, expectedLevel: 'none' },
    { key: 'excel-import', expectedHas: false, expectedLevel: 'none' },
    { key: 'settings', expectedHas: false, expectedLevel: 'none' },
    { key: 'users', expectedHas: false, expectedLevel: 'none' }
];

console.log('--- REVISIÓN DE PERMISOS PARA ROL DOCENTE ---');
modulesToCheck.forEach(({ key, expectedHas, expectedLevel }) => {
    const has = sandbox.window.hasRolePermission(key, 'docente');
    const lvl = sandbox.window.getModulePermissionLevel(key, 'docente');
    console.log(`[${key}] hasRolePermission: ${has} (esperado ${expectedHas}) | level: '${lvl}' (esperado '${expectedLevel}')`);
    assert.strictEqual(has, expectedHas, `Error en hasRolePermission para ${key}`);
    assert.strictEqual(lvl, expectedLevel, `Error en getModulePermissionLevel para ${key}`);
});

console.log('\n--- REVISIÓN DE NORMALIZACIÓN DE ROLES (normalizeRolesConfig) ---');
const rawConfigFromDB = [
    { key: 'docente', permissions: ['grades', 'attendance'] } // simulando config antigua de BD sin reports ni students
];
sandbox.STATE.rolesConfig = rawConfigFromDB;
sandbox.window.normalizeRolesConfig();
const docNorm = sandbox.STATE.rolesConfig.find(r => r.key === 'docente');
console.log('Docente normalizado permissions:', docNorm.permissions);
assert(docNorm.permissions.includes('students'), 'Debe incluir students');
assert(docNorm.permissions.includes('reports'), 'Debe incluir reports');
assert(docNorm.permissions.includes('honor-roll'), 'Debe incluir honor-roll');
assert(docNorm.permissions.includes('grade-stats'), 'Debe incluir grade-stats');

console.log('\n--- REVISIÓN DE ETIQUETA "Auxiliaturas de Exámenes" ---');
const sysMod = sandbox.window.SYSTEM_MODULES_LIST.find(m => m.key === 'exam-schedules');
console.log('exam-schedules module name:', sysMod.name);
assert.strictEqual(sysMod.name, 'Auxiliaturas de Exámenes');

console.log('\n🎉 ¡TODAS LAS VERIFICACIONES PASARON AL 100%!');
