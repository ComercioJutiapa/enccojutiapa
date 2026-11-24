/**
 * ======================================================================
 * 🔐 ENCCO FIREBASE AUTH BRIDGE (Paso 2 — Autenticación Real en Servidor)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ----------------------------------------------------------------------
 * - Autentica contra Google Firebase Authentication (JWT verificado en
 *   servidor, scrypt + anti-fuerza bruta real de Google).
 * - Adjunta automáticamente ?auth=<idToken> a todas las peticiones hacia
 *   Firebase Realtime Database (fetch y EventSource) sin filtrar el token
 *   a ningún dominio externo.
 * - Soporta ingreso con correo electrónico o alias institucional de docente
 *   sin almacenar contraseñas ni hashes en el frontend.
 * ======================================================================
 */
(function (window) {
    'use strict';

    const RTDB_HOSTS = [
        'firebaseio.com',
        'firebasedatabase.app'
    ];

    // Mapa público SIN contraseñas para que los docentes puedan escribir su alias corto o su correo
    const INSTITUTIONAL_LOGIN_ALIASES = {
        'nehemias': ['nehemias.salguero1982@gmail.com', 'yalilsag@gmail.com'],
        'admin': ['nehemias.salguero1982@gmail.com'],
        'administrador': ['nehemias.salguero1982@gmail.com'],
        'nehemias.doc': ['yalilsag@gmail.com'],
        'yalilsag': ['yalilsag@gmail.com'],
        'director': ['mirzaaragon6@gmail.com'],
        'directora': ['mirzaaragon6@gmail.com'],
        'secretaria': ['jhoanajarro@gmail.com'],
        'secretario': ['jhoanajarro@gmail.com'],
        'carlos.augusto': ['cajuarez2004@hotmail.com'],
        'aleida': ['alemarescobarflores@gmail.com'],
        'roberto': ['trobertoac1@gmail.com'],
        'williams': ['wiliamsesmely@gmail.com'],
        'lilian': ['lilyalas917@gmail.com'],
        'nery': ['nebegara47@gmail.com'],
        'edwin': ['ledvintrabajo@gmail.com'],
        'gamaliel': ['gum31777@outlook.com'],
        'hector': ['hectorelkatocho@gmail.com'],
        'wilder': ['wilder.porfirio@gmail.com'],
        'sandra': ['aranajulissa21@gmail.com'],
        'damaris': ['dalessandra2014@gmail.com'],
        'elda': ['eldaargentinalopez@gmail.com'],
        'enma': ['enlemagt@gmail.com'],
        'maria': ['salguerocomercio@gmail.com'],
        'sandra.paola': ['paolabernal0310@gmail.com'],
        'milvia': ['milvia_jacobo2010@hotmail.com'],
        'carlos': ['carlosvgrijalva@gmail.com'],
        'juan': ['juancarlospereiraquan@gmail.com'],
        'licdafrancis': ['licdafrancisgonzalez@gmail.com']
    };

    const SESSION_TOKEN_KEY = 'ENCCO_FB_ID_TOKEN';
    let _cachedIdToken = null;
    try {
        if (typeof window.sessionStorage !== 'undefined') {
            _cachedIdToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY) || null;
        }
    } catch (e) {}
    let _tokenRefreshTimer = null;
    let _fetchWrapped = false;
    let _authListenerBound = false;

    function _storeToken(token) {
        _cachedIdToken = token || null;
        try {
            if (typeof window.sessionStorage !== 'undefined') {
                if (_cachedIdToken) window.sessionStorage.setItem(SESSION_TOKEN_KEY, _cachedIdToken);
                else window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
            }
        } catch (e) {}
    }

    /**
     * Normaliza la contraseña para cumplir el mínimo de 6 caracteres de Firebase Auth
     * sin obligar a los docentes con claves de 5 caracteres a cambiar su contraseña.
     */
    function deriveFirebaseAuthPassword(rawPassword) {
        const clean = String(rawPassword || '').trim();
        if (!clean) return '';
        if (clean.length >= 6) return clean;
        return clean + '#Encco70';
    }

    function resolveLoginCandidateEmails(usernameOrEmail) {
        const raw = String(usernameOrEmail || '').trim().toLowerCase();
        if (!raw) return [];
        if (raw.includes('@')) return [raw];
        if (INSTITUTIONAL_LOGIN_ALIASES[raw]) {
            return [...INSTITUTIONAL_LOGIN_ALIASES[raw]];
        }
        return [];
    }

    function isRtdbUrl(urlStr) {
        if (!urlStr || typeof urlStr !== 'string') return false;
        try {
            const u = new URL(urlStr, (window.location && window.location.href) || 'https://encco-jutiapa-live-2026.web.app/');
            const host = (u.hostname || '').toLowerCase();
            return RTDB_HOSTS.some(h => host === h || host.endsWith('.' + h));
        } catch (e) {
            return false;
        }
    }

    function appendAuthTokenToUrl(urlStr, tokenOverride) {
        const token = tokenOverride || _cachedIdToken;
        if (!token || !isRtdbUrl(urlStr)) return urlStr;
        try {
            const u = new URL(urlStr, (window.location && window.location.href) || 'https://encco-jutiapa-live-2026.web.app/');
            if (tokenOverride || !u.searchParams.has('auth')) {
                u.searchParams.set('auth', token);
            }
            return u.toString();
        } catch (e) {
            return urlStr;
        }
    }

    function waitForFirebaseModular(timeoutMs = 5000) {
        if (window.FirebaseModular && window.FirebaseModular.auth && window.FirebaseModular.authMod) {
            return Promise.resolve(window.FirebaseModular);
        }
        return new Promise((resolve) => {
            let done = false;
            const finish = (val) => {
                if (done) return;
                done = true;
                if (typeof window.removeEventListener === 'function') {
                    window.removeEventListener('FirebaseModularReady', onReady);
                }
                resolve(val);
            };
            const onReady = () => finish(window.FirebaseModular || null);
            if (typeof window.addEventListener === 'function') {
                window.addEventListener('FirebaseModularReady', onReady);
            }
            setTimeout(() => finish(window.FirebaseModular || null), timeoutMs);
        });
    }

    function bindAuthTokenListener() {
        if (_authListenerBound) return;
        const mod = window.FirebaseModular;
        if (!mod || !mod.auth || !mod.authMod || typeof mod.authMod.onIdTokenChanged !== 'function') return;
        _authListenerBound = true;

        try {
            mod.authMod.onIdTokenChanged(mod.auth, async (user) => {
                if (user && typeof user.getIdToken === 'function') {
                    try {
                        const fresh = await user.getIdToken();
                        _storeToken(fresh);
                        scheduleTokenRefresh(user);
                    } catch (e) {
                        console.warn('[AuthBridge] Aviso al obtener ID Token:', e.message || e);
                    }
                } else {
                    _storeToken(null);
                    if (_tokenRefreshTimer) {
                        clearInterval(_tokenRefreshTimer);
                        _tokenRefreshTimer = null;
                    }
                }
            });
        } catch (e) {
            console.warn('[AuthBridge] No se pudo enlazar onIdTokenChanged:', e.message || e);
        }
    }

    function scheduleTokenRefresh(user) {
        if (_tokenRefreshTimer) clearInterval(_tokenRefreshTimer);
        if (!user || typeof user.getIdToken !== 'function') return;
        _tokenRefreshTimer = setInterval(async () => {
            try {
                const mod = window.FirebaseModular;
                const activeUser = (mod && mod.auth && mod.auth.currentUser) || user;
                if (activeUser && typeof activeUser.getIdToken === 'function') {
                    _storeToken(await activeUser.getIdToken(true));
                }
            } catch (e) {}
        }, 45 * 60 * 1000);
    }

    async function refreshIdTokenNow() {
        try {
            const mod = await waitForFirebaseModular(2500);
            if (mod && mod.auth && mod.auth.currentUser && typeof mod.auth.currentUser.getIdToken === 'function') {
                const fresh = await mod.auth.currentUser.getIdToken(true);
                _storeToken(fresh);
                return fresh;
            }
        } catch (e) {}
        return null;
    }

    function installRtdbTokenInterceptor() {
        if (_fetchWrapped || typeof window.fetch !== 'function') return;
        _fetchWrapped = true;
        const originalFetch = window.fetch.bind(window);

        window.fetch = async function (input, init) {
            const rawUrl = (typeof input === 'string') ? input : (input && typeof input.url === 'string' ? input.url : '');
            const isTargetRtdb = isRtdbUrl(rawUrl);

            let signedInput = input;
            try {
                if (isTargetRtdb && _cachedIdToken) {
                    if (typeof input === 'string') {
                        signedInput = appendAuthTokenToUrl(input, _cachedIdToken);
                    } else if (input && typeof input === 'object' && typeof Request === 'function') {
                        const signedUrl = appendAuthTokenToUrl(input.url, _cachedIdToken);
                        if (signedUrl !== input.url) signedInput = new Request(signedUrl, input);
                    }
                }
            } catch (e) {}

            const response = await originalFetch(signedInput, init);

            // 🔄 Auto-reintento transparente si el JWT expiró (> 60 min) o aún estaba cargando el SDK
            if (isTargetRtdb && response && response.status === 401) {
                const refreshed = await refreshIdTokenNow();
                if (refreshed) {
                    try {
                        let retryInput = input;
                        if (typeof input === 'string') {
                            retryInput = appendAuthTokenToUrl(input, refreshed);
                        } else if (input && typeof input === 'object' && typeof Request === 'function') {
                            retryInput = new Request(appendAuthTokenToUrl(input.url, refreshed), input);
                        }
                        return await originalFetch(retryInput, init);
                    } catch (retryErr) {}
                }
            }
            return response;
        };
    }

    /**
     * Autenticación estricta en el servidor de Google Firebase Authentication (Paso 2).
     * Resuelve correo o alias institucional y valida contra Firebase Auth ANTES de leer la BD.
     */
    async function signInStrict(usernameOrEmail, rawPassword, timeoutMs = 8000) {
        const candidates = resolveLoginCandidateEmails(usernameOrEmail);
        const authPass = deriveFirebaseAuthPassword(rawPassword);

        if (candidates.length === 0) {
            return { authenticated: false, reason: 'user_not_found', message: 'Usuario o correo institucional no reconocido. Ingrese su correo electrónico registrado.' };
        }
        if (!authPass) {
            return { authenticated: false, reason: 'missing_password', message: 'Por favor ingrese su contraseña.' };
        }

        const mod = await waitForFirebaseModular(4500);
        if (!mod || !mod.auth || !mod.authMod || typeof mod.authMod.signInWithEmailAndPassword !== 'function') {
            return { authenticated: false, reason: 'sdk_not_ready', message: 'No se pudo conectar con el servicio de autenticación de Google Firebase. Verifique su internet y recargue.' };
        }

        const { signInWithEmailAndPassword } = mod.authMod;

        const attemptLogin = async () => {
            let lastCode = '';
            for (const email of candidates) {
                try {
                    const cred = await signInWithEmailAndPassword(mod.auth, email, authPass);
                    if (cred && cred.user) {
                        const token = await cred.user.getIdToken();
                        _storeToken(token);
                        bindAuthTokenListener();
                        scheduleTokenRefresh(cred.user);
                        return { authenticated: true, email, uid: cred.user.uid, idToken: token };
                    }
                } catch (err) {
                    lastCode = String((err && err.code) || '');
                    if (lastCode === 'auth/too-many-requests') {
                        return {
                            authenticated: false,
                            reason: 'too_many_requests',
                            message: '🛡️ Demasiados intentos fallidos detectados por Google Firebase. Por seguridad, espere unos minutos antes de intentar nuevamente.'
                        };
                    }
                    if (lastCode === 'auth/network-request-failed') {
                        return {
                            authenticated: false,
                            reason: 'network_error',
                            message: 'Error de red al conectar con Google Firebase. Verifique su conexión a Internet.'
                        };
                    }
                }
            }
            return {
                authenticated: false,
                reason: lastCode || 'invalid_credentials',
                message: 'Correo/usuario o contraseña incorrectos. Verifique sus credenciales institucionales.'
            };
        };

        try {
            const timeoutPromise = new Promise(resolve =>
                setTimeout(() => resolve({ authenticated: false, reason: 'timeout', message: 'Tiempo de espera agotado al autenticar con Firebase.' }), timeoutMs)
            );
            return await Promise.race([attemptLogin(), timeoutPromise]);
        } catch (e) {
            return { authenticated: false, reason: 'unexpected_error', message: 'Error inesperado al iniciar sesión.' };
        }
    }

    async function signInSilently(email, rawPassword, timeoutMs = 3500) {
        return signInStrict(email, rawPassword, timeoutMs);
    }

    /**
     * Crea automáticamente una nueva cuenta en Firebase Auth desde ENCCO
     * usando REST Identity Toolkit con returnSecureToken: false, para NO cerrar
     * la sesión activa del Administrador/Director.
     */
    async function provisionNewUserAccount(email, rawPassword) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const authPass = deriveFirebaseAuthPassword(rawPassword);
        if (!cleanEmail || !cleanEmail.includes('@') || !authPass) {
            return { created: false, reason: 'invalid_input' };
        }
        try {
            const apiKey = (typeof atob === 'function')
                ? atob('QUl6YVN5QTRvcGJiV2trSzVGbkZ1ek15WjkzNGhJWml1UXBHZTBR')
                : Buffer.from('QUl6YVN5QTRvcGJiV2trSzVGbkZ1ek15WjkzNGhJWml1UXBHZTBR', 'base64').toString('utf8');
            const res = await window.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, password: authPass, returnSecureToken: false })
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok && body.localId) {
                return { created: true, uid: body.localId, email: cleanEmail };
            }
            if (body && body.error && body.error.message === 'EMAIL_EXISTS') {
                return { created: false, alreadyExists: true, email: cleanEmail };
            }
            return { created: false, reason: (body && body.error && body.error.message) || String(res.status) };
        } catch (e) {
            return { created: false, reason: e.message || 'network_error' };
        }
    }

    /**
     * Envía el correo oficial de Google Firebase para que el docente restablezca su contraseña.
     */
    async function sendPasswordReset(email) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return { sent: false, message: 'Ingrese un correo electrónico válido.' };
        }
        try {
            const mod = await waitForFirebaseModular(3500);
            if (mod && mod.auth && mod.authMod && typeof mod.authMod.sendPasswordResetEmail === 'function') {
                await mod.authMod.sendPasswordResetEmail(mod.auth, cleanEmail);
                return { sent: true, email: cleanEmail };
            }
            const apiKey = (typeof atob === 'function')
                ? atob('QUl6YVN5QTRvcGJiV2trSzVGbkZ1ek15WjkzNGhJWml1UXBHZTBR')
                : Buffer.from('QUl6YVN5QTRvcGJiV2trSzVGbkZ1ek15WjkzNGhJWml1UXBHZTBR', 'base64').toString('utf8');
            const res = await window.fetch('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + apiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: cleanEmail })
            });
            if (res.ok) return { sent: true, email: cleanEmail };
            const body = await res.json().catch(() => ({}));
            return { sent: false, message: (body && body.error && body.error.message) || 'No se pudo enviar el correo.' };
        } catch (e) {
            return { sent: false, message: e.message || 'Error al enviar correo de restablecimiento.' };
        }
    }

    /**
     * Revoca inmediatamente el acceso de un usuario eliminado en la lista blanca
     * de servidor (/authorized_uids en RTDB y colección authorized_uids en Firestore).
     */
    async function revokeAuthorizedUser(emailOrUid, dbUrl) {
        const needle = String(emailOrUid || '').trim().toLowerCase();
        if (!needle || !dbUrl) return { revoked: false, count: 0, uids: [] };
        const cleanDbUrl = String(dbUrl).replace(/\/+$/, '');
        const nowIso = new Date().toISOString();
        const revokedUids = [];

        try {
            const listRes = await window.fetch(`${cleanDbUrl}/authorized_uids.json`);
            if (!listRes || !listRes.ok) {
                return { revoked: false, count: 0, uids: [], reason: 'read_failed' };
            }
            const allowlist = await listRes.json().catch(() => null);
            if (!allowlist || typeof allowlist !== 'object') {
                return { revoked: false, count: 0, uids: [], reason: 'empty_allowlist' };
            }

            const matchedUids = Object.keys(allowlist).filter((uid) => {
                if (uid.toLowerCase() === needle) return true;
                const entry = allowlist[uid];
                return entry && String(entry.email || '').trim().toLowerCase() === needle;
            });

            for (const uid of matchedUids) {
                try {
                    const patchRes = await window.fetch(`${cleanDbUrl}/authorized_uids/${uid}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: false, revokedAt: nowIso })
                    });
                    if (patchRes && patchRes.ok) {
                        revokedUids.push(uid);
                    }
                } catch (e) {}

                // Espejo en Cloud Firestore (colección authorized_uids)
                try {
                    if (window.FirebaseModular && window.FirebaseModular.db && window.FirebaseModular.auth && window.FirebaseModular.auth.currentUser) {
                        const { db, doc, setDoc } = window.FirebaseModular;
                        if (typeof doc === 'function' && typeof setDoc === 'function') {
                            await setDoc(doc(db, 'authorized_uids', uid), { active: false, revokedAt: nowIso }, { merge: true });
                        }
                    }
                } catch (fsErr) {}
            }

            return { revoked: revokedUids.length > 0, count: revokedUids.length, uids: revokedUids };
        } catch (e) {
            return { revoked: false, count: 0, uids: [], reason: e.message || 'network_error' };
        }
    }

    async function signOutSilently() {
        _storeToken(null);
        if (_tokenRefreshTimer) {
            clearInterval(_tokenRefreshTimer);
            _tokenRefreshTimer = null;
        }
        try {
            const mod = window.FirebaseModular;
            if (mod && mod.auth && typeof mod.signOut === 'function') {
                await mod.signOut(mod.auth);
            }
        } catch (e) {}
    }

    function getCurrentIdToken() {
        return _cachedIdToken;
    }

    function setCachedIdTokenForTest(token) {
        _storeToken(token);
    }

    installRtdbTokenInterceptor();
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('FirebaseModularReady', bindAuthTokenListener);
    }
    bindAuthTokenListener();

    window.EnccoFirebaseAuthBridge = {
        INSTITUTIONAL_LOGIN_ALIASES,
        deriveFirebaseAuthPassword,
        resolveLoginCandidateEmails,
        isRtdbUrl,
        appendAuthTokenToUrl,
        waitForFirebaseModular,
        installRtdbTokenInterceptor,
        signInStrict,
        signInSilently,
        provisionNewUserAccount,
        revokeAuthorizedUser,
        sendPasswordReset,
        signOutSilently,
        getCurrentIdToken,
        _setCachedIdTokenForTest: setCachedIdTokenForTest
    };
})(window);
