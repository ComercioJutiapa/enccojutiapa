/**
 * test_silent_boot_and_live_alerts.js
 * Prueba unitaria sin dependencias externas:
 * 1. Modo Silencioso en Arranque (Silent Boot): En recarga/inicio no suena ni satura la pantalla con toasts.
 * 2. Sonido Garantizado en Vivo: Cuando llegan nuevas alertas en tiempo real, siempre suena.
 * 3. Apilamiento en Centro de Alertas y Avisos: Las alertas se acumulan correctamente en la lista y badges.
 * 4. Anti-apilamiento de Toasts: Máximo 2 avisos simultáneos en pantalla para no tapar la ventana.
 */

const assert = require('assert');
const fs = require('fs');

console.log("================================================================================");
console.log("🧪 INICIANDO VERIFICACIÓN DE ARRANQUE SILENCIOSO, SONIDO EN VIVO Y CENTRO DE AVISOS");
console.log("================================================================================");

// Mock DOM container
function createElementMock(tag) {
    const el = {
        tagName: tag.toUpperCase(),
        className: '',
        style: {},
        innerHTML: '',
        parentNode: null,
        children: [],
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        remove() {
            if (this.parentNode) {
                const idx = this.parentNode.children.indexOf(this);
                if (idx !== -1) this.parentNode.children.splice(idx, 1);
                this.parentNode = null;
            }
        },
        closest() {
            return this;
        },
        get firstElementChild() {
            return this.children[0] || null;
        }
    };
    return el;
}

const toastContainer = createElementMock('div');
toastContainer.id = 'toastContainer';

const elements = {
    toastContainer: toastContainer,
    notifBadge: createElementMock('div'),
    notificationsListContainer: createElementMock('div'),
    notifModalUserLabel: createElementMock('div'),
    auxiliaturaAlertsBadge: createElementMock('div'),
    appHydrationOverlay: createElementMock('div')
};

global.window = {
    _appBootStartTime: Date.now(),
    _isAppBootCompleted: false
};
global.document = {
    getElementById(id) { return elements[id] || null; },
    createElement(tag) { return createElementMock(tag); }
};
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

// Mock STATE
global.STATE = {
    currentUser: { id: 'usr-aux-01', name: 'Nehemias Salguero', role: 'profesor_auxiliar' },
    currentRole: 'profesor_auxiliar',
    attendanceAlerts: [],
    attendanceRecords: {},
    students: [],
    activeCycle: '2026',
    activeBimestre: 1
};

// Track sound and toasts
let chimePlayedCount = 0;
global.playAlertChime = function() {
    chimePlayedCount++;
};
global.flashTabTitle = function() {};

// Load showToast and notifyAuxiliaturaAlert from app.js code
const appCode = fs.readFileSync('app.js', 'utf8');

// Extract showToast
const showToastMatch = appCode.match(/function showToast\([\s\S]*?\n\}/);
assert(showToastMatch, "showToast debe encontrarse en app.js");
eval(showToastMatch[0]);

// Extract notifyAuxiliaturaAlert
const notifyMatch = appCode.match(/function notifyAuxiliaturaAlert\([\s\S]*?\n\}/);
assert(notifyMatch, "notifyAuxiliaturaAlert debe encontrarse en app.js");
eval(notifyMatch[0]);

// Mock updateUserAlertsUI & updateAuxiliaturaBadge
let badgeUpdated = 0;
let userAlertsUpdated = 0;
global.updateAuxiliaturaBadge = function() { badgeUpdated++; };
global.updateUserAlertsUI = function() { userAlertsUpdated++; };

// --- TEST 1: Silent Boot (Arranque / Recarga) ---
console.log("\n▶ [TEST 1] Verificando Modo Silencioso en el Arranque (Silent Boot)...");
window._appBootStartTime = Date.now();
window._isAppBootCompleted = false;

const alertBoot = {
    id: 'alert_boot_001',
    studentId: 'st-001',
    studentName: 'PÉREZ LÓPEZ JUAN CARLOS',
    gradeLabel: '4to PC B',
    courseName: 'Contabilidad General',
    status: 'pendiente'
};

notifyAuxiliaturaAlert(alertBoot);

assert.strictEqual(chimePlayedCount, 0, "No debe sonar chime acústico durante la hidratación/arranque");
assert.strictEqual(toastContainer.children.length, 0, "No deben mostrarse toasts invasivos durante el arranque");
assert.strictEqual(STATE.attendanceAlerts.length, 1, "La alerta histórica DEBE quedar apilada en el estado");
assert.strictEqual(STATE.attendanceAlerts[0].id, 'alert_boot_001');
assert(badgeUpdated > 0, "Los badges deben actualizarse durante el arranque");
assert(userAlertsUpdated > 0, "El Centro de Notificaciones y Avisos debe actualizarse durante el arranque");
console.log("  ✅ Test 1 Superado: Arranque 100% silencioso sin toasts ni timbres, acumulando alertas en el centro.");

// --- TEST 2: Sonido Garantizado en Vivo y Acumulación ---
console.log("\n▶ [TEST 2] Verificando Sonido Garantizado en Vivo cuando llegan más alertas...");
// Boot completed
window._isAppBootCompleted = true;
window._appBootStartTime = Date.now() - 5000;

const alertLive = {
    id: 'alert_live_002',
    studentId: 'st-002',
    studentName: 'GARCÍA MORALES MARÍA JOSÉ',
    gradeLabel: '5to PC A',
    courseName: 'Matemática Comercial',
    status: 'pendiente'
};

notifyAuxiliaturaAlert(alertLive);

assert.strictEqual(chimePlayedCount, 1, "SIEMPRE debe sonar cuando llegan más notificaciones en vivo");
assert.strictEqual(STATE.attendanceAlerts.length, 2, "La nueva alerta debe quedar apilada en el primer lugar");
assert.strictEqual(STATE.attendanceAlerts[0].id, 'alert_live_002');
assert.strictEqual(toastContainer.children.length, 1, "Debe mostrarse 1 toast discreto");
console.log("  ✅ Test 2 Superado: Sonido y toast garantizados para alertas en tiempo real, apiladas correctamente.");

// --- TEST 3: Anti-Apilamiento de Toasts (Máximo 2 simultáneos) ---
console.log("\n▶ [TEST 3] Verificando Anti-Apilamiento de Toasts (máx 2 en pantalla)...");
showToast("Aviso 1", "info");
showToast("Aviso 2", "warning");
showToast("Aviso 3", "danger");
showToast("Aviso 4", "success");

assert(toastContainer.children.length <= 2, `Toasts visibles deben ser <= 2, actual: ${toastContainer.children.length}`);
console.log("  ✅ Test 3 Superado: Máximo 2 toasts visibles en pantalla. Los avisos nunca tapan la ventana.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE MODO SILENCIOSO Y ALERTAS PASARON SATISFACTORIAMENTE (100%)");
console.log("================================================================================");
