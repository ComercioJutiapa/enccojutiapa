const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const bridgeCode = fs.readFileSync(path.join(rootDir, 'firebase_auth_bridge.js'), 'utf8');
const loginHtml = fs.readFileSync(path.join(rootDir, 'login.html'), 'utf8');
const platHtml = fs.readFileSync(path.join(rootDir, 'plataforma.html'), 'utf8');
const appCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

console.log('🧪 Iniciando Test Suite: Firebase Auth Bridge (Paso 1 — Transición Silenciosa)...');

// 1. Verificar integración en login.html, plataforma.html y app.js
assert(loginHtml.includes('firebase_auth_bridge.js'), 'login.html debe cargar firebase_auth_bridge.js');
assert(loginHtml.includes('EnccoFirebaseAuthBridge.signInSilently'), 'login.html debe invocar signInSilently tras validar credenciales');
assert(platHtml.includes('firebase_auth_bridge.js'), 'plataforma.html debe cargar firebase_auth_bridge.js antes de app.js');
assert(platHtml.indexOf('firebase_auth_bridge.js') < platHtml.indexOf('app.js?v='), 'firebase_auth_bridge.js debe cargarse antes que app.js');
assert(appCode.includes('EnccoFirebaseAuthBridge.appendAuthTokenToUrl'), 'app.js debe firmar las URLs EventSource SSE con appendAuthTokenToUrl');
console.log('  ✅ 1. Integración en login.html, plataforma.html y app.js (fetch + SSE) verificada.');

// 2. Ejecutar módulo en VM aislada
let lastFetchedUrl = null;
const mockWindow = {
    location: { href: 'https://encco-jutiapa-live-2026.web.app/plataforma.html' },
    fetch: async (url) => { lastFetchedUrl = url; return { ok: true }; },
    addEventListener: () => {}
};
mockWindow.window = mockWindow;

const ctx = {
    window: mockWindow,
    URL,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
};
vm.createContext(ctx);
vm.runInContext(bridgeCode, ctx);

const bridge = mockWindow.EnccoFirebaseAuthBridge;
assert(bridge, 'window.EnccoFirebaseAuthBridge debe quedar exportado');

// 3. Derivación segura para claves cortas (< 6 caracteres) sin cambiar las de >= 6
assert.strictEqual(bridge.deriveFirebaseAuthPassword('abc12').length >= 6, true, 'Claves de 5 chars deben derivarse a >= 6 chars para Firebase Auth');
assert.strictEqual(bridge.deriveFirebaseAuthPassword('claveSegura2026'), 'claveSegura2026', 'Claves >= 6 chars se conservan idénticas');
console.log('  ✅ 2. Derivación compatible para claves cortas (5 chars) y estándar (>= 6 chars) verificada.');

// 4. Firma de URLs únicamente para dominios Firebase RTDB (cero fuga de token a terceros)
bridge._setCachedIdTokenForTest('JWT_TEST_TOKEN_123');
const rtdbSigned = bridge.appendAuthTokenToUrl('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json');
assert(rtdbSigned.includes('auth=JWT_TEST_TOKEN_123'), 'Debe adjuntar ?auth=<token> en Firebase RTDB');

const rtdbWithQuery = bridge.appendAuthTokenToUrl('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/users.json?t=12345');
assert(rtdbWithQuery.includes('t=12345') && rtdbWithQuery.includes('auth=JWT_TEST_TOKEN_123'), 'Debe preservar parámetros existentes y agregar &auth=<token>');

const externalUrl = 'https://api.externa.com/data.json';
assert.strictEqual(bridge.appendAuthTokenToUrl(externalUrl), externalUrl, 'NUNCA debe enviar el token JWT a dominios externos');

// 5. Verificar interceptor de window.fetch
(async () => {
    await mockWindow.fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/pensum.json');
    assert(lastFetchedUrl.includes('auth=JWT_TEST_TOKEN_123'), 'Interceptor fetch debe firmar peticiones RTDB automáticamente');

    await mockWindow.fetch('https://ui-avatars.com/api/?name=JM');
    assert(!lastFetchedUrl.includes('auth='), 'Interceptor fetch NO debe agregar token a URLs externas');
    console.log('  ✅ 3. Interceptor fetch y protección anti-fuga de token verificados.');

    // 6. Verificar fallback silencioso si Email/Password no está habilitado aún
    mockWindow.FirebaseModular = {
        auth: {},
        authMod: {
            signInWithEmailAndPassword: async () => { const e = new Error('config'); e.code = 'auth/configuration-not-found'; throw e; },
            createUserWithEmailAndPassword: async () => { throw new Error('should not run'); }
        }
    };
    const resDisabled = await bridge.signInSilently('docente@encco.edu.gt', '12345', 1000);
    assert.strictEqual(resDisabled.authenticated, false);
    assert.strictEqual(resDisabled.reason, 'provider_not_enabled');

    // 7. Verificar auto-aprovisionamiento silencioso cuando Email/Password sí está habilitado
    mockWindow.FirebaseModular = {
        auth: {},
        authMod: {
            signInWithEmailAndPassword: async () => { const e = new Error('not found'); e.code = 'auth/user-not-found'; throw e; },
            createUserWithEmailAndPassword: async () => ({ user: { uid: 'uid-doc-01', getIdToken: async () => 'JWT_NEW_USER_456' } })
        }
    };
    const resProvision = await bridge.signInSilently('docente@encco.edu.gt', '12345', 1000);
    assert.strictEqual(resProvision.authenticated, true);
    assert.strictEqual(resProvision.provisioned, true);
    assert.strictEqual(bridge.getCurrentIdToken(), 'JWT_NEW_USER_456');
    console.log('  ✅ 4. Modo transición transparente y auto-aprovisionamiento silencioso verificados.');

    console.log('\n🎯 ¡TODAS LAS PRUEBAS DE FIREBASE AUTH BRIDGE (PASO 1) PASARON AL 100%!');
    process.exit(0);
})();
