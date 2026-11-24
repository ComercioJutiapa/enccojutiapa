/**
 * ======================================================================
 * 🔐 ENCCO FIREBASE AUTH BRIDGE (Paso 1 — Transición Silenciosa)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ----------------------------------------------------------------------
 * - Autentica silenciosamente al usuario en Firebase Authentication (JWT)
 *   sin cambiar correos ni contraseñas actuales de los docentes.
 * - Adjunta automáticamente ?auth=<idToken> a las peticiones hacia
 *   Firebase Realtime Database (fetch y EventSource) sin filtrar el token
 *   a ningún dominio externo.
 * - Si Email/Password aún no está habilitado en Firebase Console, opera
 *   en modo transparente con 0% impacto en el acceso actual.
 * ======================================================================
 */
(function (window) {
    'use strict';

    const RTDB_HOSTS = [
        'firebaseio.com',
        'firebasedatabase.app'
    ];

    let _cachedIdToken = null;
    let _tokenRefreshTimer = null;
    let _fetchWrapped = false;
    let _authListenerBound = false;

    /**
     * Normaliza la contraseña para cumplir el mínimo de 6 caracteres de Firebase Auth
     * sin obligar a los 5 docentes con claves de 5 caracteres a cambiar su contraseña hoy.
     */
    function deriveFirebaseAuthPassword(rawPassword) {
        const clean = String(rawPassword || '').trim();
        if (!clean) return '';
        if (clean.length >= 6) return clean;
        return clean + '#Encco70';
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
            if (!u.searchParams.has('auth')) {
                u.searchParams.set('auth', token);
            }
            return u.toString();
        } catch (e) {
            return urlStr;
        }
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
                        _cachedIdToken = await user.getIdToken();
                        scheduleTokenRefresh(user);
                    } catch (e) {
                        console.warn('[AuthBridge] Aviso al obtener ID Token:', e.message || e);
                    }
                } else {
                    _cachedIdToken = null;
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
        // Renovar silenciosamente cada 45 minutos (los JWT de Firebase expiran a los 60 min)
        _tokenRefreshTimer = setInterval(async () => {
            try {
                const mod = window.FirebaseModular;
                const activeUser = (mod && mod.auth && mod.auth.currentUser) || user;
                if (activeUser && typeof activeUser.getIdToken === 'function') {
                    _cachedIdToken = await activeUser.getIdToken(true);
                }
            } catch (e) {}
        }, 45 * 60 * 1000);
    }

    /**
     * Interceptor seguro de window.fetch que adjunta ?auth=<idToken> únicamente
     * a peticiones destinadas a Firebase Realtime Database cuando existe sesión Auth activa.
     */
    function installRtdbTokenInterceptor() {
        if (_fetchWrapped || typeof window.fetch !== 'function') return;
        _fetchWrapped = true;
        const originalFetch = window.fetch.bind(window);

        window.fetch = function (input, init) {
            try {
                if (_cachedIdToken) {
                    if (typeof input === 'string' && isRtdbUrl(input)) {
                        input = appendAuthTokenToUrl(input, _cachedIdToken);
                    } else if (input && typeof input === 'object' && typeof input.url === 'string' && isRtdbUrl(input.url)) {
                        const signedUrl = appendAuthTokenToUrl(input.url, _cachedIdToken);
                        if (signedUrl !== input.url && typeof Request === 'function') {
                            input = new Request(signedUrl, input);
                        }
                    }
                }
            } catch (e) {}
            return originalFetch(input, init);
        };
    }

    /**
     * Inicia sesión silenciosamente en Firebase Auth con correo + contraseña.
     * Si la cuenta aún no existe en Firebase Auth durante la fase de transición,
     * la aprovisiona automáticamente (solo tras haber validado el login institucional).
     */
    async function signInSilently(email, rawPassword, timeoutMs = 3500) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const authPass = deriveFirebaseAuthPassword(rawPassword);
        if (!cleanEmail || !cleanEmail.includes('@') || !authPass) {
            return { authenticated: false, reason: 'missing_credentials' };
        }

        const mod = window.FirebaseModular;
        if (!mod || !mod.auth || !mod.authMod) {
            return { authenticated: false, reason: 'sdk_not_ready' };
        }

        const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = mod.authMod;
        if (typeof signInWithEmailAndPassword !== 'function') {
            return { authenticated: false, reason: 'auth_method_unavailable' };
        }

        const runAuth = async () => {
            try {
                const cred = await signInWithEmailAndPassword(mod.auth, cleanEmail, authPass);
                if (cred && cred.user) {
                    _cachedIdToken = await cred.user.getIdToken();
                    bindAuthTokenListener();
                    scheduleTokenRefresh(cred.user);
                    return { authenticated: true, uid: cred.user.uid, provisioned: false };
                }
                return { authenticated: false, reason: 'empty_credential' };
            } catch (err) {
                const code = String((err && err.code) || '');
                // Si el proveedor Email/Password aún no se habilita en Firebase Console: modo transparente sin error
                if (code.includes('configuration-not-found') || code.includes('operation-not-allowed')) {
                    console.info('[AuthBridge] Email/Password aún pendiente de habilitar en Firebase Console. Operando en modo transición.');
                    return { authenticated: false, reason: 'provider_not_enabled' };
                }
                // Auto-aprovisionamiento silencioso durante Paso 1 para cuentas institucionales ya validadas
                if (
                    typeof createUserWithEmailAndPassword === 'function' &&
                    (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials')
                ) {
                    try {
                        const created = await createUserWithEmailAndPassword(mod.auth, cleanEmail, authPass);
                        if (created && created.user) {
                            _cachedIdToken = await created.user.getIdToken();
                            bindAuthTokenListener();
                            scheduleTokenRefresh(created.user);
                            return { authenticated: true, uid: created.user.uid, provisioned: true };
                        }
                    } catch (createErr) {
                        const cCode = String((createErr && createErr.code) || '');
                        return { authenticated: false, reason: cCode || 'provision_skipped' };
                    }
                }
                return { authenticated: false, reason: code || 'auth_error' };
            }
        };

        try {
            const timeoutPromise = new Promise(resolve =>
                setTimeout(() => resolve({ authenticated: false, reason: 'timeout' }), timeoutMs)
            );
            return await Promise.race([runAuth(), timeoutPromise]);
        } catch (e) {
            return { authenticated: false, reason: 'unexpected_error' };
        }
    }

    async function signOutSilently() {
        _cachedIdToken = null;
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
        _cachedIdToken = token || null;
    }

    // Activar interceptor desde el arranque y enlazar al evento FirebaseModularReady
    installRtdbTokenInterceptor();
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('FirebaseModularReady', bindAuthTokenListener);
    }
    bindAuthTokenListener();

    window.EnccoFirebaseAuthBridge = {
        deriveFirebaseAuthPassword,
        isRtdbUrl,
        appendAuthTokenToUrl,
        installRtdbTokenInterceptor,
        signInSilently,
        signOutSilently,
        getCurrentIdToken,
        _setCachedIdTokenForTest: setCachedIdTokenForTest
    };
})(window);
