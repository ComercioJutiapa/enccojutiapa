/**
 * test_zero_disk_footprint_and_backup_rbac.js
 * 
 * Verificación exhaustiva de:
 * 1. Control de Acceso Basado en Roles (RBAC) estricto para Respaldos (Backups):
 *    - Bloqueo total de apertura de modal, exportación JSON y descarga para docentes, secretarias, auxiliares y estudiantes.
 *    - Ocultamiento de botones de respaldo en la barra superior (updateTopRoleBar).
 *    - Permiso exclusivo concedido únicamente a Dirección, Administrador y Superusuario.
 * 2. Cero Huella en Disco (Zero Disk Footprint):
 *    - Eliminación de persistencia local en disco (localStorage) para registros escolares y ciclos históricos.
 *    - Almacenamiento seguro en memoria volátil (RAM / sessionStorage).
 *    - Purga exhaustiva de almacenamiento al cerrar sesión (performLogout).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🛡️ TEST: RBAC ESTRICTO DE RESPALDOS Y ARQUITECTURA CERO HUELLA EN DISCO');
console.log('='.repeat(80));

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

const archiverPath = path.join(__dirname, '..', 'cycle_archiver.js');
const archiverCode = fs.readFileSync(archiverPath, 'utf8');

// 1. Simulación de entorno Browser DOM & Storage
class MockStorage {
    constructor() {
        this._store = {};
    }
    getItem(key) {
        return this._store.hasOwnProperty(key) ? this._store[key] : null;
    }
    setItem(key, value) {
        this._store[key] = String(value);
    }
    removeItem(key) {
        delete this._store[key];
    }
    clear() {
        this._store = {};
    }
    get length() {
        return Object.keys(this._store).length;
    }
    key(index) {
        return Object.keys(this._store)[index] || null;
    }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

let lastToast = null;
let openedModalId = null;

const mockDocument = {
    getElementById: (id) => {
        if (!mockDocument._elements[id]) {
            mockDocument._elements[id] = {
                id,
                style: {
                    display: '',
                    setProperty: function(k, v) { this[k] = v; }
                },
                innerHTML: '',
                value: '',
                options: [],
                querySelector: () => null,
                querySelectorAll: () => [],
                classList: {
                    _classes: new Set(),
                    add: function(c) { this._classes.add(c); },
                    remove: function(c) { this._classes.delete(c); },
                    contains: function(c) { return this._classes.has(c); }
                }
            };
        }
        return mockDocument._elements[id];
    },
    querySelectorAll: (sel) => [],
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {
            display: '',
            setProperty: function(k, v) { this[k] = v; }
        },
        innerHTML: '',
        setAttribute: () => {},
        appendChild: () => {},
        remove: () => {},
        click: () => {}
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    _elements: {}
};

class MockEvent {
    constructor(type) {
        this.type = type;
    }
}

const sandbox = {
    window: null,
    document: mockDocument,
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    navigator: { onLine: true },
    location: { hash: '', origin: 'http://localhost', pathname: '/plataforma.html', replace: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    Event: MockEvent,
    CustomEvent: MockEvent,
    showToast: (msg, type) => { lastToast = { msg, type }; },
    showModalById: (id) => { openedModalId = id; },
    closeModalProperly: () => {},
    recordAuditLog: () => {},
    setTimeout: (fn) => setTimeout(fn, 1),
    clearTimeout: (t) => clearTimeout(t),
    setInterval: () => 1,
    clearInterval: () => {},
    Date: Date,
    JSON: JSON,
    console: console,
    Blob: class {},
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
    STATE: {
        currentRole: 'docente',
        currentUser: { username: 'prof_test', role: 'docente', name: 'Profesor Prueba' },
        users: [{ id: 'usr-1', username: 'prof_test', role: 'docente' }],
        activeCycle: '2027',
        cycles: [{ name: '2026', status: 'Histórico' }, { name: '2027', status: 'Activo' }],
        students: [
            { id: 'stu-1', name: 'Estudiante 1', grades: { 'Matemática': [70, 80, 75, 90] } }
        ],
        calificaciones: {},
        config: {}
    }
};
sandbox.window = sandbox;
global.window = sandbox;
global.document = mockDocument;
global.localStorage = mockLocalStorage;
global.sessionStorage = mockSessionStorage;

// Cargar app.js en contexto evaluado
eval(appJsCode);
eval(archiverCode);

console.log('\n1. Verificando RBAC en función canAccessBackup(role)...');
assert.strictEqual(typeof window.canAccessBackup, 'function', 'canAccessBackup debe estar expuesta en window');

// Roles permitidos:
assert.strictEqual(window.canAccessBackup('director'), true, 'Director debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('direccion'), true, 'Dirección debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('directora'), true, 'Directora debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('admin'), true, 'Admin debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('superadmin'), true, 'Superadmin debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('super_usuario'), true, 'Superusuario debe tener acceso a backup');

// Roles estrictamente bloqueados:
assert.strictEqual(window.canAccessBackup('docente'), false, 'Docente NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('secretaria'), false, 'Secretaria NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('secretario'), false, 'Secretario NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('secretaria_general'), false, 'Secretaria General NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('auxiliar'), false, 'Auxiliar NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('profesor_auxiliar'), false, 'Profesor auxiliar NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('estudiante'), false, 'Estudiante NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup('guest'), false, 'Invitado NO debe tener acceso a backup');
assert.strictEqual(window.canAccessBackup(null), false, 'Sin rol definido NO debe tener acceso a backup');
console.log('  ✅ RBAC canAccessBackup validado correctamente para todos los roles.');

console.log('\n2. Verificando protección de openUniversalBackupModal()...');
const modalBackupEl = mockDocument.getElementById('modalUniversalBackup');
modalBackupEl.classList.remove('active');
lastToast = null;
window.STATE.currentRole = 'docente';
window.STATE.currentUser.role = 'docente';
window.openUniversalBackupModal();
assert.strictEqual(modalBackupEl.classList.contains('active'), false, 'openUniversalBackupModal NO debe abrirse para rol docente');
assert.ok(lastToast && lastToast.type === 'danger', 'Debe emitir toast de peligro/bloqueo para docente');

modalBackupEl.classList.remove('active');
window.STATE.currentRole = 'secretaria';
window.STATE.currentUser.role = 'secretaria';
window.openUniversalBackupModal();
assert.strictEqual(modalBackupEl.classList.contains('active'), false, 'openUniversalBackupModal NO debe abrirse para secretaria');

modalBackupEl.classList.remove('active');
window.STATE.currentRole = 'director';
window.STATE.currentUser.role = 'director';
window.openUniversalBackupModal();
assert.strictEqual(modalBackupEl.classList.contains('active'), true, 'openUniversalBackupModal DEBE abrirse para director');
console.log('  ✅ Modal de respaldo universal blindado contra accesos no autorizados.');

console.log('\n3. Verificando protección de exportSystemSafeBackup() y exportDataBackupJSON()...');
lastToast = null;
window.STATE.currentRole = 'docente';
window.STATE.currentUser.role = 'docente';
window.exportSystemSafeBackup('all');
assert.ok(lastToast && lastToast.msg.includes('Acceso Restringido'), 'exportSystemSafeBackup debe bloquearse para docente');

lastToast = null;
window.exportDataBackupJSON();
assert.ok(lastToast && lastToast.msg.includes('Acceso denegado'), 'exportDataBackupJSON debe bloquearse para docente');

lastToast = null;
window.downloadCyclePreArchivingBackup();
assert.ok(lastToast && lastToast.msg.includes('Acceso denegado'), 'downloadCyclePreArchivingBackup debe bloquearse para docente');
console.log('  ✅ Funciones de descarga de copias de seguridad 100% bloqueadas para no directores.');

console.log('\n4. Verificando ocultamiento de botones en barra superior (updateTopRoleBar)...');
const btnMasterBackup = mockDocument.getElementById('btnHeaderMasterBackup');
const btnExportHeader = mockDocument.getElementById('btnExportSafeBackupHeader');

// Docente
window.STATE.currentRole = 'docente';
window.updateTopRoleBar();
assert.strictEqual(btnMasterBackup.style.display, 'none', 'btnHeaderMasterBackup debe estar oculto para docente');
assert.strictEqual(btnExportHeader.style.display, 'none', 'btnExportSafeBackupHeader debe estar oculto para docente');

// Secretaría
window.STATE.currentRole = 'secretaria';
window.updateTopRoleBar();
assert.strictEqual(btnMasterBackup.style.display, 'none', 'btnHeaderMasterBackup debe estar oculto para secretaria');
assert.strictEqual(btnExportHeader.style.display, 'none', 'btnExportSafeBackupHeader debe estar oculto para secretaria');

// Director
window.STATE.currentRole = 'director';
window.updateTopRoleBar();
assert.strictEqual(btnMasterBackup.style.display, 'inline-flex', 'btnHeaderMasterBackup debe ser visible para director');
assert.strictEqual(btnExportHeader.style.display, 'inline-flex', 'btnExportSafeBackupHeader debe ser visible para director');
console.log('  ✅ Visibilidad de botones en interfaz validada de acuerdo a las directivas de seguridad.');

console.log('\n5. Verificando Cero Huella en Disco (Zero Disk Footprint) en ciclo histórico...');
const sampleArchive = {
    cycle: '2026',
    studentsSnapshot: [
        { id: 'stu-hist-1', name: 'Alumno Histórico 1', grades: { 'Auditoría': [80, 85, 90, 95] } }
    ],
    calificacionesSnapshot: {}
};

// Cargar ciclo histórico en el archivador
window.EnccoCycleArchiver._sessionCache = {};
window.EnccoCycleArchiver._sessionCache['2026'] = sampleArchive;

// Simular llamada a loadHistoricalCycle
(async () => {
    // Asegurar que localStorage no tenga nada
    mockLocalStorage.removeItem('ENCCO_HISTORICO_2026');

    await window.EnccoCycleArchiver.loadHistoricalCycle('2026');

    // Comprobar que NO se guardó en localStorage (cero disco)
    assert.strictEqual(mockLocalStorage.getItem('ENCCO_HISTORICO_2026'), null, 'ENCCO_HISTORICO_2026 NO debe existir en localStorage');
    
    // Comprobar que SÍ está en sessionStorage (memoria de sesión que se borra al cerrar navegador)
    const inSession = mockSessionStorage.getItem('ENCCO_HISTORICO_2026');
    assert.ok(inSession, 'Debe residir en sessionStorage');
    console.log('  ✅ Ciclo histórico cargado exclusivamente en memoria volátil sin persistencia en disco.');

    console.log('\n6. Verificando purga exhaustiva de almacenamiento al cerrar sesión (performLogout)...');
    mockLocalStorage.setItem('ENCCO_AUTH_USER', 'test_user');
    mockLocalStorage.setItem('ENCCO_HISTORICO_2026', 'residual_data');
    mockLocalStorage.setItem('ENCCO_APP_STATE', 'residual_state');
    mockLocalStorage.setItem('ENCCO_ATTENDANCE_MASTER_BACKUP', 'residual_att');
    mockLocalStorage.setItem('ENCCO_FIREBASE_URL', 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com');
    mockLocalStorage.setItem('ENCCO_BUILD_VERSION', '2026.09');

    await window.performLogout();

    assert.strictEqual(mockLocalStorage.getItem('ENCCO_AUTH_USER'), null, 'ENCCO_AUTH_USER debe ser purgado en logout');
    assert.strictEqual(mockLocalStorage.getItem('ENCCO_HISTORICO_2026'), null, 'ENCCO_HISTORICO_2026 debe ser purgado en logout');
    assert.strictEqual(mockLocalStorage.getItem('ENCCO_APP_STATE'), null, 'ENCCO_APP_STATE debe ser purgado en logout');
    assert.strictEqual(mockLocalStorage.getItem('ENCCO_ATTENDANCE_MASTER_BACKUP'), null, 'ENCCO_ATTENDANCE_MASTER_BACKUP debe ser purgado');
    assert.strictEqual(mockSessionStorage.length, 0, 'sessionStorage debe ser completamente reseteado a 0 elementos');
    
    // Proteger únicamente configuración de conexión oficial
    assert.strictEqual(mockLocalStorage.getItem('ENCCO_FIREBASE_URL'), 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com', 'ENCCO_FIREBASE_URL debe ser preservado');
    assert.strictEqual(mockLocalStorage.getItem('ENCCO_BUILD_VERSION'), '2026.09', 'ENCCO_BUILD_VERSION debe ser preservado');

    console.log('  ✅ Purga exhaustiva de credenciales y datos en logout validada al 100%.');

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TODAS LAS PRUEBAS DE RBAC DE RESPALDOS Y CERO HUELLA EN DISCO PASARON!');
    console.log('='.repeat(80));
    process.exit(0);
})();
