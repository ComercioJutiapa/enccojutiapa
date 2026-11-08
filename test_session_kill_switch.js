// test_session_kill_switch.js
const assert = require('assert');

console.log("=== INICIANDO VALIDACIÓN DEL MÓDULO CIERRE MASIVO DE SESIONES (KILL-SWITCH) ===");

// 1. Simular entorno DOM y Storage
const sessionStorageMock = {};
const localStorageMock = {};

global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.scrollTo = () => {};
global.window.location = {
    replace: () => {},
    href: '',
    search: '',
    origin: 'http://localhost',
    pathname: '/plataforma.html'
};

global.sessionStorage = {
    getItem: (k) => sessionStorageMock[k] || null,
    setItem: (k, v) => { sessionStorageMock[k] = String(v); },
    removeItem: (k) => { delete sessionStorageMock[k]; },
    clear: () => { Object.keys(sessionStorageMock).forEach(k => delete sessionStorageMock[k]); }
};
global.localStorage = {
    getItem: (k) => localStorageMock[k] || null,
    setItem: (k, v) => { localStorageMock[k] = String(v); },
    removeItem: (k) => { delete localStorageMock[k]; },
    clear: () => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }
};

let lastFetchCall = null;
global.fetch = async (url, opts) => {
    if (opts && opts.body) {
        lastFetchCall = { url, opts };
    }
    return { ok: true, status: 200, json: async () => ({}) };
};

global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: (id) => ({
        id,
        style: { setProperty: () => {} },
        textContent: '',
        innerHTML: ''
    }),
    createElement: (tag) => ({
        tagName: tag,
        style: { setProperty: () => {} },
        appendChild: () => {},
        innerHTML: ''
    }),
    body: {
        style: { setProperty: () => {} },
        appendChild: () => {}
    },
    querySelectorAll: () => [],
    querySelector: () => ({ style: {} })
};

global.BroadcastChannel = class {
    constructor(channel) {
        this.channel = channel;
    }
    postMessage(msg) {
        this.lastMsg = msg;
    }
    close() {}
};

// Cargar app.js
require('./app.js');

setTimeout(async () => {
    try {
        // 2. Verificar existencia de funciones
        console.log("\n[TEST 1] Verificando registro de funciones de seguridad...");
        assert.strictEqual(typeof window.cerrarTodasLasSesionesDocentesYSuper, 'function');
        assert.strictEqual(typeof window.handleIncomingSessionRevocation, 'function');
        assert.strictEqual(typeof window.showGlobalSessionRevokedOverlay, 'function');
        console.log("✓ Funciones registradas correctamente en window.");

        // 3. Probar restricción de rol (docente no puede)
        console.log("\n[TEST 2] Verificando protección de rol (solo super_usuario / admin)...");
        STATE.currentRole = 'docente';
        STATE.currentUser = { role: 'docente', name: 'Profesor Prueba' };

        let toastShown = null;
        global.showToast = (msg, type) => { toastShown = { msg, type }; };

        await window.cerrarTodasLasSesionesDocentesYSuper();
        assert(toastShown && toastShown.type === 'danger', "Debe denegar acceso a rol docente");
        console.log("✓ Acceso denegado correctamente a usuarios no autorizados.");

        // 4. Probar ejecución por Super Usuario
        console.log("\n[TEST 3] Verificando ejecución por Super Usuario...");
        STATE.currentRole = 'super_usuario';
        STATE.currentUser = { role: 'super_usuario', name: 'Super Admin ENCCO' };
        window.EnccoDialog = {
            confirm: async () => true // Confirma el diálogo
        };

        const beforeRunTime = Date.now();
        await window.cerrarTodasLasSesionesDocentesYSuper();

        // Verificar que guardó en localStorage el timestamp
        const revTs = Number(localStorage.getItem('ENCCO_REVOCATION_TIMESTAMP'));
        assert(revTs >= beforeRunTime, "Debe registrar revocation timestamp actual");

        // Verificar que envió a Firebase RTDB
        assert(lastFetchCall, "Debe haber llamado a fetch");
        assert(lastFetchCall.url.includes('/security/sessionRevocation.json'), "URL debe apuntar a sessionRevocation");
        const payload = JSON.parse(lastFetchCall.opts.body);
        assert.strictEqual(payload.revokedBy, 'Super Admin ENCCO');
        assert.deepStrictEqual(payload.targetRoles, ['docente', 'catedratico', 'super_usuario', 'admin']);
        console.log("✓ Orden de revocación masiva emitida exitosamente a Firebase y localStorage.");

        // 5. Simular cliente de un docente conectado
        console.log("\n[TEST 4] Verificando que cliente docente con sesión activa previa es expulsado...");
        STATE.currentRole = 'docente';
        STATE.currentUser = { role: 'docente', name: 'Profesor Juan' };
        
        // El docente inició sesión 10 minutos antes
        sessionStorage.setItem('ENCCO_AUTH_TIMESTAMP', String(revTs - 600000));
        window._isLoggingOut = false;

        let docenteExpulsado = false;
        global.performLogout = () => { docenteExpulsado = true; };

        window.handleIncomingSessionRevocation(payload);
        assert(window._isLoggingOut, "El cliente del docente debe entrar en modo logout");
        console.log("✓ Cliente docente detecta sesión obsoleta y activa protocolo de expulsión inmediata.");

        // 6. Simular que el docente inicia nueva sesión después
        console.log("\n[TEST 5] Verificando que inicio de sesión POSTERIOR es admitido normalmente...");
        window._isLoggingOut = false;
        let nuevoLogoutTriggered = false;
        global.performLogout = () => { nuevoLogoutTriggered = true; };

        // El docente inicia nueva sesión 5 segundos después de la revocación
        sessionStorage.setItem('ENCCO_AUTH_TIMESTAMP', String(revTs + 5000));
        window.handleIncomingSessionRevocation(payload);
        assert(!nuevoLogoutTriggered, "No debe expulsar si la sesión es posterior a la revocación");
        console.log("✓ Nueva sesión posterior a la revocación opera con total normalidad.");

        console.log("\n========================================================");
        console.log("✅ TODAS LAS PRUEBAS DEL KILL-SWITCH PASARON AL 100%");
        console.log("========================================================\n");
        process.exit(0);
    } catch(err) {
        console.error("❌ Error en prueba:", err);
        process.exit(1);
    }
}, 400);
