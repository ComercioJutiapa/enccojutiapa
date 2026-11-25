const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const bridgeCode = fs.readFileSync(path.join(rootDir, 'firebase_auth_bridge.js'), 'utf8');
const loginHtml = fs.readFileSync(path.join(rootDir, 'login.html'), 'utf8');
const platHtml = fs.readFileSync(path.join(rootDir, 'plataforma.html'), 'utf8');
const sireHtml = fs.readFileSync(path.join(rootDir, 'datos-sire.html'), 'utf8');
const lockHtml = fs.readFileSync(path.join(rootDir, 'bloqueo-notas.html'), 'utf8');
const guideHtml = fs.readFileSync(path.join(rootDir, 'maestros-guias.html'), 'utf8');
const appCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
const dbRules = JSON.parse(fs.readFileSync(path.join(rootDir, 'database.rules.json'), 'utf8'));

console.log('🧪 Iniciando Test Suite: Firebase Auth Bridge (Paso 2 — Autenticación Real en Servidor)...');

// 1. Verificar integración en login.html, plataforma.html, páginas secundarias y app.js
assert(loginHtml.includes('firebase_auth_bridge.js'), 'login.html debe cargar firebase_auth_bridge.js');
assert(loginHtml.includes('EnccoFirebaseAuthBridge.signInStrict'), 'login.html debe autenticar primero contra Firebase Auth con signInStrict');
assert(!loginHtml.includes("localStorage.setItem('ENCCO_USERS_CACHE'"), 'login.html NO debe almacenar ENCCO_USERS_CACHE en localStorage');
assert(platHtml.includes('firebase_auth_bridge.js'), 'plataforma.html debe cargar firebase_auth_bridge.js');
assert(platHtml.indexOf('firebase_auth_bridge.js') < platHtml.indexOf('app.js?v='), 'firebase_auth_bridge.js debe cargarse antes que app.js');
assert(sireHtml.includes('firebase_auth_bridge.js'), 'datos-sire.html debe cargar firebase_auth_bridge.js');
assert(lockHtml.includes('firebase_auth_bridge.js'), 'bloqueo-notas.html debe cargar firebase_auth_bridge.js');
assert(guideHtml.includes('firebase_auth_bridge.js'), 'maestros-guias.html debe cargar firebase_auth_bridge.js');
assert(appCode.includes('EnccoFirebaseAuthBridge.appendAuthTokenToUrl'), 'app.js debe firmar las URLs EventSource SSE');
console.log('  ✅ 1. Integración en login.html, plataforma.html, páginas secundarias y app.js verificada.');

// 2. Verificar que database.rules.json exige auth != null en TODAS las lecturas y escrituras
function verifyStrictRules(obj, pathStr) {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj['.read'] !== 'undefined') {
        assert(String(obj['.read']).includes('auth != null') && String(obj['.read']).includes('authorized_uids'), `${pathStr}/.read debe exigir auth != null + authorized_uids`);
    }
    if (typeof obj['.write'] !== 'undefined') {
        assert(String(obj['.write']).includes('auth != null') && String(obj['.write']).includes('authorized_uids'), `${pathStr}/.write debe exigir auth != null + authorized_uids`);
    }
    for (const k of Object.keys(obj)) {
        if (!k.startsWith('.')) verifyStrictRules(obj[k], `${pathStr}/${k}`);
    }
}
verifyStrictRules(dbRules.rules, 'rules');
console.log('  ✅ 2. database.rules.json verificado: 100% de lecturas y escrituras requieren auth != null.');

// 3. Ejecutar módulo en VM aislada
let lastFetchedUrl = null;
const mockWindow = {
    location: { href: 'https://encco-jutiapa-live-2026.web.app/plataforma.html' },
    fetch: async (url) => { lastFetchedUrl = url; return { ok: true }; },
    addEventListener: () => {},
    removeEventListener: () => {}
};
mockWindow.window = mockWindow;

const ctx = { window: mockWindow, URL, console, setTimeout, clearTimeout, setInterval, clearInterval };
vm.createContext(ctx);
vm.runInContext(bridgeCode, ctx);

const bridge = mockWindow.EnccoFirebaseAuthBridge;

// 4. Resolución de alias y derivación de contraseñas cortas
assert.strictEqual(JSON.stringify(bridge.resolveLoginCandidateEmails('secretaria')), JSON.stringify(['jhoanajarro@gmail.com']));
assert.strictEqual(JSON.stringify(bridge.resolveLoginCandidateEmails('nehemias')), JSON.stringify(['nehemias.salguero1982@gmail.com', 'yalilsag@gmail.com']));
assert.strictEqual(JSON.stringify(bridge.resolveLoginCandidateEmails('docente@encco.edu.gt')), JSON.stringify(['docente@encco.edu.gt']));
assert.strictEqual(bridge.deriveFirebaseAuthPassword('abc12').length >= 6, true);
assert.strictEqual(bridge.deriveFirebaseAuthPassword('claveSegura2026'), 'claveSegura2026');
console.log('  ✅ 3. Resolución de alias sin contraseñas y derivación compatible verificadas.');

// 5. Interceptor fetch + protección anti-fuga de token + signInStrict
(async () => {
    mockWindow.FirebaseModular = {
        auth: {},
        authMod: {
            signInWithEmailAndPassword: async (_auth, email, pass) => {
                if (email === 'jhoanajarro@gmail.com' && pass === '12345#Encco70') {
                    return { user: { uid: 'uid-sec-01', getIdToken: async () => 'JWT_REAL_TOKEN_999' } };
                }
                const err = new Error('invalid');
                err.code = 'auth/invalid-credential';
                throw err;
            }
        }
    };

    const okRes = await bridge.signInStrict('secretaria', '12345', 2000);
    assert.strictEqual(okRes.authenticated, true);
    assert.strictEqual(okRes.email, 'jhoanajarro@gmail.com');
    assert.strictEqual(bridge.getCurrentIdToken(), 'JWT_REAL_TOKEN_999');

    await mockWindow.fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json');
    assert(lastFetchedUrl.includes('auth=JWT_REAL_TOKEN_999'), 'Interceptor fetch debe firmar peticiones RTDB con JWT');

    await mockWindow.fetch('https://externo.ejemplo.com/api');
    assert(!lastFetchedUrl.includes('auth='), 'Interceptor fetch NUNCA debe filtrar JWT a dominios externos');

    const badRes = await bridge.signInStrict('secretaria', 'wrongpass', 2000);
    assert.strictEqual(badRes.authenticated, false);
    console.log('  ✅ 4. signInStrict, interceptor JWT y rechazo de credenciales inválidas verificados.');

    // 6. Verificar hidratación 0ms en sessionStorage y auto-reintento transparente ante HTTP 401
    let callCount401 = 0;
    const storeMap = { ENCCO_FB_ID_TOKEN: 'STALE_JWT_OLD' };
    const mockWin2 = {
        location: { href: 'https://encco-jutiapa-live-2026.web.app/plataforma.html' },
        sessionStorage: {
            getItem: k => storeMap[k] || null,
            setItem: (k, v) => { storeMap[k] = v; },
            removeItem: k => { delete storeMap[k]; }
        },
        fetch: async (url) => {
            callCount401++;
            if (url.includes('STALE_JWT_OLD')) return { ok: false, status: 401 };
            return { ok: true, status: 200, url };
        },
        FirebaseModular: {
            auth: { currentUser: { getIdToken: async () => 'FRESH_JWT_NEW' } },
            authMod: {}
        },
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    mockWin2.window = mockWin2;
    const ctx2 = { window: mockWin2, URL, console, setTimeout, clearTimeout, setInterval, clearInterval };
    vm.createContext(ctx2);
    vm.runInContext(bridgeCode, ctx2);
    assert.strictEqual(mockWin2.EnccoFirebaseAuthBridge.getCurrentIdToken(), 'STALE_JWT_OLD', 'Debe hidratar token en 0ms desde sessionStorage');
    const retryRes = await mockWin2.fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json');
    assert.strictEqual(retryRes.status, 200, 'Debe refrescar token ante 401 y reintentar transparentemente');
    assert.strictEqual(callCount401, 2, 'Debe realizar exactamente 1 reintento con el token fresco');
    assert.strictEqual(storeMap.ENCCO_FB_ID_TOKEN, 'FRESH_JWT_NEW', 'Debe actualizar sessionStorage con el token fresco');
    console.log('  ✅ 5. Hidratación 0ms (sessionStorage) y auto-reintento transparente ante HTTP 401 verificados.');

    // 6. Fase 3: Revocación automática de UID, lista blanca Firestore, roles en RTDB, limpieza de password y CSP
    const patchedUrls = [];
    const fsRevokedDocs = [];
    const mockWin3 = {
        location: { href: 'https://encco-jutiapa-live-2026.web.app/plataforma.html' },
        sessionStorage: { getItem: () => 'ADMIN_JWT', setItem: () => {}, removeItem: () => {} },
        fetch: async (url, init) => {
            if (!init || !init.method || init.method === 'GET') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        uid_doc_1: { email: 'docente.prueba@gmail.com', role: 'docente', active: true },
                        uid_admin_1: { email: 'nehemias.salguero1982@gmail.com', role: 'admin', active: true }
                    })
                };
            }
            patchedUrls.push({ url, method: init.method, body: JSON.parse(init.body) });
            return { ok: true, status: 200, json: async () => ({}) };
        },
        FirebaseModular: {
            db: { __mock: true },
            auth: { currentUser: { uid: 'uid_admin_1' } },
            doc: (_db, col, id) => ({ col, id }),
            setDoc: async (ref, payload) => { fsRevokedDocs.push({ ref, payload }); }
        },
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    mockWin3.window = mockWin3;
    const ctx3 = { window: mockWin3, URL, console, setTimeout, clearTimeout, setInterval, clearInterval };
    vm.createContext(ctx3);
    vm.runInContext(bridgeCode, ctx3);

    const revRes = await mockWin3.EnccoFirebaseAuthBridge.revokeAuthorizedUser(
        'docente.prueba@gmail.com',
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com'
    );
    assert.strictEqual(revRes.revoked, true, 'Debe revocar el UID del docente eliminado');
    assert.strictEqual(revRes.count, 1, 'Debe revocar exactamente 1 UID coincidente');
    assert.strictEqual(patchedUrls.length, 1, 'Debe emitir PATCH en RTDB /authorized_uids/<uid>');
    assert.strictEqual(patchedUrls[0].body.active, false, 'Debe marcar active: false en RTDB');
    assert.strictEqual(fsRevokedDocs.length, 1, 'Debe espejar active: false en Firestore authorized_uids');
    assert.strictEqual(fsRevokedDocs[0].payload.active, false, 'Debe marcar active: false en Firestore');

    const roleSyncRes = await mockWin3.EnccoFirebaseAuthBridge.syncAuthorizedUserRoleAndStatus(
        'docente.prueba@gmail.com',
        'director',
        true,
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com'
    );
    assert.strictEqual(roleSyncRes.synced, true, 'Debe sincronizar cambio de rol en /authorized_uids');
    assert.strictEqual(patchedUrls[1].body.role, 'director', 'Debe actualizar role a director en RTDB');
    assert.strictEqual(patchedUrls[1].body.active, true, 'Debe actualizar active a true en RTDB');
    assert.strictEqual(fsRevokedDocs[1].payload.role, 'director', 'Debe espejar role a director en Firestore');

    const projectRoot = path.join(__dirname, '..');
    const fsRulesText = fs.readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8');
    assert.ok(fsRulesText.includes('function isAuthorizedStaff()'), 'firestore.rules debe definir isAuthorizedStaff()');
    assert.ok(fsRulesText.includes('function isAdminOrDirector()'), 'firestore.rules debe definir isAdminOrDirector()');
    assert.ok(fsRulesText.includes('allow read, write: if false;'), 'firestore.rules debe ser fail-closed por defecto');

    const rtdbRulesObj = JSON.parse(fs.readFileSync(path.join(projectRoot, 'database.rules.json'), 'utf8')).rules;
    assert.ok(rtdbRulesObj.encc_school_state.users['.write'].includes("'admin'"), 'RTDB encc_school_state/users debe restringir escritura a admin/director');
    assert.ok(rtdbRulesObj.encc_school_state.rolesConfig['.write'].includes("'admin'"), 'RTDB encc_school_state/rolesConfig debe restringir escritura a admin/director');

    const fbJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'firebase.json'), 'utf8'));
    const allHeaders = (fbJson.hosting.headers || []).flatMap(h => h.headers || []);
    assert.ok(allHeaders.some(h => h.key === 'Content-Security-Policy' && h.value.includes("object-src 'none'")), 'firebase.json debe incluir Content-Security-Policy');

    for (const htmlPage of ['login.html', 'plataforma.html', 'datos-sire.html', 'bloqueo-notas.html', 'maestros-guias.html']) {
        const pageTxt = fs.readFileSync(path.join(projectRoot, htmlPage), 'utf8');
        assert.ok(pageTxt.includes("'enccoInstitutionalApp'"), `${htmlPage} debe usar nombre determinístico enccoInstitutionalApp para persistencia de Firebase Auth`);
    }
    console.log('  ✅ 6. Fase 3 verificada: revocación UID dual, lista blanca Firestore, roles en RTDB, CSP y enccoInstitutionalApp unificado.');

    console.log('\n🎯 ¡TODAS LAS PRUEBAS DE AUTENTICACIÓN REAL (PASO 2 / OPCIÓN A) PASARON AL 100%!');
    process.exit(0);
})();
