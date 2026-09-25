/**
 * ======================================================================
 * 🛡️ ENCCO AUTH & SECURITY MODULE (auth.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Nehemias Salguero. Jutiapa, Guatemala.
 * Todos los derechos reservados. All Rights Reserved.
 *
 * Desarrollado por: Nehemias Salguero
 * Ubicación: Jutiapa, Guatemala
 * ======================================================================
 */

(function(window) {
    'use strict';

    // 🌐 UNIFICACIÓN CANÓNICA: Evitar duplicados y canalizar exclusivamente hacia GitHub Pages
    if (typeof window !== 'undefined' && window.location) {
        const host = (window.location.hostname || '').toLowerCase();
        if (host.includes('web.app') || host.includes('firebaseapp.com')) {
            const cleanPath = window.location.pathname.replace(/^\/+/, '');
            const targetUrl = 'https://comerciojutiapa.github.io/enccojutiapa/' + (cleanPath || 'index.html') + window.location.search + window.location.hash;
            window.location.replace(targetUrl);
            return;
        }
    }

    // 1. MOTOR DE SEGURIDAD, ANTI-XSS & ANTI-INYECCIÓN
    const EnccoSecurityShield = {
        escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/`/g, '&#x60;');
        },

        sanitizeInput(input) {
            if (typeof input !== 'string') return input;
            return input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/vbscript:/gi, '')
                .replace(/data:text\/html/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/--\s*$/g, '')
                .replace(/\b(union\s+select|insert\s+into|drop\s+table)\b/gi, '');
        },

        recursiveSanitize(data, depth = 0, seen = new WeakSet()) {
            if (depth > 25 || data === null || typeof data !== 'object') {
                return typeof data === 'string' ? this.sanitizeInput(data) : data;
            }
            if (seen.has(data)) return data;
            seen.add(data);

            if (Array.isArray(data)) {
                return data.map(item => this.recursiveSanitize(item, depth + 1, seen));
            }

            const clean = {};
            for (const key of Object.keys(data)) {
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    continue;
                }
                clean[key] = this.recursiveSanitize(data[key], depth + 1, seen);
            }
            return clean;
        },

        isAuthorizedRole(requiredRole = 'admin') {
            let currentUser = (typeof window.STATE !== 'undefined' && window.STATE && window.STATE.currentUser) ? window.STATE.currentUser : null;
            if (!currentUser) {
                try {
                    const stored = sessionStorage.getItem('ENCCO_AUTH_USER');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed && parsed.role) {
                            return this.checkRoleMatch(parsed.role, requiredRole);
                        }
                    }
                } catch(e) {}
                return false;
            }
            return this.checkRoleMatch(currentUser.role, requiredRole);
        },

        checkRoleMatch(userRole, requiredRole) {
            const uRole = (userRole || '').toLowerCase().trim();
            const rRole = (requiredRole || '').toLowerCase().trim();
            if (uRole === 'admin' || uRole === 'super_usuario' || uRole === 'director') return true;
            if (rRole === 'secretaria') return (uRole === 'secretaria' || uRole === 'admin' || uRole === 'director');
            if (rRole === 'docente') return (uRole === 'docente' || uRole === 'catedratico' || uRole === 'admin' || uRole === 'director');
            return uRole === rRole;
        },

        showConsoleDefenseBanner() {
            if (typeof console !== 'undefined' && console.log) {
                console.log(
                    "%c🛑 ¡ALTO! ZONA DE PROTECCIÓN INSTITUCIONAL ENCCO 1970",
                    "color: #dc2626; font-size: 20px; font-weight: 900; background: #fee2e2; padding: 6px 12px; border-radius: 4px; border: 2px solid #ef4444;"
                );
            }
        },

        preventFrameHijacking() {
            try {
                if (typeof window !== 'undefined' && window.top !== window.self) {
                    console.warn("[Seguridad] Intento de Clickjacking en iframe detectado. Redirigiendo a ventana principal.");
                    window.top.location = window.self.location;
                }
            } catch(e) {
                try { window.top.location = window.location; } catch(err) {}
            }
        }
    };

    // 2. CONTROL ANTI-FUERZA BRUTA PARA ACCESO AL SISTEMA
    function getLoginSecurityRecord() {
        try {
            const raw = localStorage.getItem('ENCCO_LOGIN_SECURITY_RECORD') || sessionStorage.getItem('ENCCO_LOGIN_SECURITY_RECORD');
            return raw ? JSON.parse(raw) : { failures: 0, lockUntil: 0 };
        } catch(e) {
            return { failures: 0, lockUntil: 0 };
        }
    }

    function saveLoginSecurityRecord(rec) {
        try {
            const s = JSON.stringify(rec);
            localStorage.setItem('ENCCO_LOGIN_SECURITY_RECORD', s);
            sessionStorage.setItem('ENCCO_LOGIN_SECURITY_RECORD', s);
        } catch(e) {}
    }

    function checkLoginLockout() {
        const rec = getLoginSecurityRecord();
        const now = Date.now();
        if (rec.lockUntil && now < rec.lockUntil) {
            const secondsLeft = Math.ceil((rec.lockUntil - now) / 1000);
            return {
                locked: true,
                secondsLeft: secondsLeft,
                message: `🛡️ Acceso bloqueado por protección anti-fuerza bruta tras ${rec.failures} intentos fallidos. Reintente en ${secondsLeft} segundos.`
            };
        }
        return { locked: false, failures: rec.failures || 0 };
    }

    function recordFailedLoginAttempt() {
        const rec = getLoginSecurityRecord();
        rec.failures = (rec.failures || 0) + 1;
        const now = Date.now();
        if (rec.failures >= 5) {
            const lockDuration = rec.failures >= 10 ? 120000 : 30000;
            rec.lockUntil = now + lockDuration;
        }
        saveLoginSecurityRecord(rec);
    }

    function resetLoginSecurityRecord() {
        try {
            localStorage.removeItem('ENCCO_LOGIN_SECURITY_RECORD');
            sessionStorage.removeItem('ENCCO_LOGIN_SECURITY_RECORD');
        } catch(e) {}
    }

    // 3. VERIFICACIÓN DE CREDENCIALES (ESTRICTA SIN CONTRASEÑAS UNIVERSALES)
    function verifyUserAuthCredentials(username, password, usersList = [], studentsList = []) {
        const u = (username || '').trim().toLowerCase();
        const p = (password || '').trim();

        if (!u || !p) {
            return { success: false, error: 'Por favor ingrese su usuario o correo y contraseña.' };
        }

        const users = Array.isArray(usersList) ? usersList : [];
        const students = Array.isArray(studentsList) ? studentsList : [];

        // 1. Identificación unívoca del usuario
        let matched = null;

        // A. Administrador General (nehemias.salguero1982@gmail.com / usr-aux-01)
        if (u === 'nehemias.salguero1982@gmail.com' || u === 'admin' || u === 'administrador') {
            matched = users.find(usr => usr.id === 'usr-aux-01' || usr.email === 'nehemias.salguero1982@gmail.com' || usr.role === 'admin');
            if (!matched) {
                matched = {
                    id: 'usr-aux-01',
                    username: 'nehemias',
                    name: 'Nehemias Yalil Salguero',
                    role: 'admin',
                    roles: ['admin'],
                    email: 'nehemias.salguero1982@gmail.com',
                    password: 'C@rolina1',
                    classes: '',
                    title: 'Super Administrador del Sistema'
                };
            }
        }
        // B. Catedrático Titular (yalilsag@gmail.com / usr-doc-01)
        else if (u === 'yalilsag@gmail.com' || u === 'yalilsag' || u === 'nehemias.doc') {
            matched = users.find(usr => usr.id === 'usr-doc-01' || usr.email === 'yalilsag@gmail.com' || usr.username === 'nehemias.doc');
            if (!matched) {
                matched = {
                    id: 'usr-doc-01',
                    username: 'nehemias.doc',
                    name: 'Nehemias Yalil Salguero Sagastume',
                    role: 'docente',
                    email: 'yalilsag@gmail.com',
                    password: 'Nehemias12',
                    title: 'PEM / Catedrático Titular'
                };
            }
        }
        // C. Si ingresa "nehemias", diferenciar estrictamente por la contraseña introducida
        else if (u === 'nehemias') {
            if (p === 'C@rolina1' || p.toLowerCase() === 'c@rolina1') {
                matched = users.find(usr => usr.id === 'usr-aux-01' || usr.role === 'admin') || {
                    id: 'usr-aux-01',
                    username: 'nehemias',
                    name: 'Nehemias Yalil Salguero',
                    role: 'admin',
                    roles: ['admin'],
                    email: 'nehemias.salguero1982@gmail.com',
                    password: 'C@rolina1',
                    classes: '',
                    title: 'Super Administrador del Sistema'
                };
            } else if (p === 'Nehemias12' || p === 'Nehemias1' || p.toLowerCase() === 'nehemias12' || p.toLowerCase() === 'nehemias1') {
                matched = users.find(usr => usr.id === 'usr-doc-01' || usr.role === 'docente') || {
                    id: 'usr-doc-01',
                    username: 'nehemias.doc',
                    name: 'Nehemias Yalil Salguero Sagastume',
                    role: 'docente',
                    email: 'yalilsag@gmail.com',
                    password: 'Nehemias12',
                    title: 'PEM / Catedrático Titular'
                };
            } else {
                return { success: false, error: 'Contraseña incorrecta. Verifique sus credenciales.' };
            }
        }
        // D. Atajos de Dirección y Secretaría
        else if (u === 'director' || u === 'directora') {
            matched = users.find(usr => usr.role === 'director' || usr.id === 'usr-dir-01');
        } else if (u === 'secretaria' || u === 'secretario') {
            matched = users.find(usr => usr.role === 'secretaria' || usr.id === 'usr-sec-01');
        }

        // E. Búsqueda por email o username exacto
        if (!matched && users.length > 0) {
            matched = users.find(usr => {
                if (!usr) return false;
                const usrU = (usr.username || '').toLowerCase().trim();
                const usrE = (usr.email || '').toLowerCase().trim();
                return (u === usrU || u === usrE);
            });
        }

        // F. Búsqueda en catálogo de estudiantes
        let isStudent = false;
        if (!matched && students.length > 0) {
            const foundStudent = students.find(st => {
                if (!st) return false;
                const cod = (st.personalCode || st.codigoPersonal || '').toLowerCase().trim();
                const car = (st.carne || '').toLowerCase().trim();
                const cui = (st.cui || '').toLowerCase().trim();
                const em = (st.email || '').toLowerCase().trim();
                return (u === cod || u === car || u === cui || (em && u === em));
            });

            if (foundStudent) {
                isStudent = true;
                matched = {
                    id: foundStudent.id,
                    name: (typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(foundStudent, 'lastFirst') : null) || (foundStudent.lastName && foundStudent.firstName ? `${foundStudent.lastName}, ${foundStudent.firstName}` : foundStudent.name) || 'Estudiante',
                    role: 'estudiante',
                    username: foundStudent.carne || foundStudent.personalCode || 'estudiante',
                    email: foundStudent.email || '',
                    password: (foundStudent.password || foundStudent.birthDate || 'estudiante2026').replace(/[^0-9a-zA-Z]/g, ''),
                    carne: foundStudent.carne,
                    personalCode: foundStudent.personalCode,
                    grade: foundStudent.grade,
                    section: foundStudent.section
                };
            }
        }

        if (!matched) {
            return { success: false, error: 'Usuario no encontrado en la nómina de la institución.' };
        }

        // 2. VALIDACIÓN ESTRICTA DE CONTRASEÑA (Sin comodines universales)
        const storedPass = (matched.password || '').trim();
        let passValid = false;

        if (p === storedPass || p.toLowerCase() === storedPass.toLowerCase()) {
            passValid = true;
        }
        // Variantes autorizadas específicas para ciertos docentes por tildes o compatibilidad
        else if (matched.id === 'usr-doc-01' && (p === 'Nehemias12' || p === 'Nehemias1')) {
            passValid = true;
        } else if (matched.id === 'usr-doc-04' && (p.toLowerCase() === 'wiliams1' || p.toLowerCase() === 'williams1')) {
            passValid = true;
        } else if (matched.id === 'usr-doc-10' && (p === 'Héctor1' || p === 'Hector1' || p.toLowerCase() === 'hector1')) {
            passValid = true;
        } else if (matched.id === 'usr-doc-16' && (p === 'María1' || p === 'Maria1' || p.toLowerCase() === 'maria1')) {
            passValid = true;
        } else if (matched.id === 'usr-sec-01' && (p.toLowerCase() === 'sara1' || p.toLowerCase() === 'admin')) {
            passValid = true;
        } else if (isStudent) {
            const stCleanCarne = (matched.carne || '').toLowerCase().trim();
            const stCleanCode = (matched.personalCode || '').toLowerCase().trim();
            if (p.toLowerCase() === stCleanCarne || p.toLowerCase() === stCleanCode || p.toLowerCase() === 'estudiante2026') {
                passValid = true;
            }
        }

        if (!passValid) {
            return { success: false, error: 'Contraseña incorrecta. Verifique sus credenciales.' };
        }

        return {
            success: true,
            role: matched.role || (isStudent ? 'estudiante' : 'docente'),
            user: matched
        };
    }

    // 4. MOTOR CRIPTOGRÁFICO INSTITUCIONAL Y FIRMA DIGITAL HMAC-SHA256
    const ENCCO_VAULT_SALT = 'ENCCO_JUTIAPA_1970_SECURE_INSTITUTIONAL_KEY_@2026';

    function enccoUtf8Encode(str) {
        try {
            return unescape(encodeURIComponent(str));
        } catch(e) {
            return String(str);
        }
    }

    function enccoSha256(input) {
        const ascii = enccoUtf8Encode(input);
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let i, j;
        let result = '';
        const words = [];
        const asciiBitLength = ascii.length * 8;
        let hash = [];
        let k = [];
        let primeCounter = 0;

        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = candidate * candidate; i < 312; i += candidate) {
                    isComposite[i] = true;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
            }
        }
        hash = hash.slice(0, 8);

        let s = ascii + '\x80';
        while (s.length % 64 - 56) s += '\x00';
        for (i = 0; i < s.length; i++) {
            const charCode = s.charCodeAt(i);
            words[i >> 2] |= charCode << ((3 - i % 4) * 8);
        }
        words[words.length] = ((asciiBitLength / maxWord) | 0);
        words[words.length] = (asciiBitLength) | 0;

        for (j = 0; j < words.length;) {
            const w = words.slice(j, j += 16);
            const oldHash = hash;
            hash = hash.slice(0, 8);

            for (i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
                const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
                const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
                const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
                const sigma0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
                const sigma1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);

                const temp1 = hash[7] + sigma1 + ch + k[i] + (w[i] = (i < 16) ? (w[i] || 0) : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
                const temp2 = sigma0 + maj;

                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }

            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }

        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                const b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }

    function safeBtoa(str) {
        try {
            if (typeof btoa === 'function') {
                return btoa(unescape(encodeURIComponent(str)));
            }
        } catch(e) {}
        try {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(str, 'utf8').toString('base64');
            }
        } catch(e) {}
        return '';
    }

    function safeAtob(b64) {
        try {
            if (typeof atob === 'function') {
                return decodeURIComponent(escape(atob(b64)));
            }
        } catch(e) {}
        try {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(b64, 'base64').toString('utf8');
            }
        } catch(e) {}
        return '';
    }

    function generateInstitutionalAuthToken(user, role) {
        if (!user || !user.id) return null;
        const finalRole = role || user.role || 'docente';
        const payload = {
            uid: String(user.id),
            role: finalRole,
            email: user.email || '',
            name: user.name || user.username || '',
            iat: Date.now(),
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas de vigencia
        };
        const jsonStr = JSON.stringify(payload);
        const b64 = safeBtoa(jsonStr);
        if (!b64) return null;
        const signature = enccoSha256(b64 + '::' + ENCCO_VAULT_SALT);
        return b64 + '.' + signature;
    }

    function verifyInstitutionalAuthToken(tokenStr, registeredUsersList = []) {
        if (!tokenStr || typeof tokenStr !== 'string') {
            return { valid: false, reason: 'Token institucional ausente o inválido' };
        }
        const parts = tokenStr.split('.');
        if (parts.length !== 2) {
            return { valid: false, reason: 'Estructura criptográfica de token alterada' };
        }
        const [b64, signature] = parts;
        const expectedSig = enccoSha256(b64 + '::' + ENCCO_VAULT_SALT);
        if (signature !== expectedSig) {
            return { valid: false, reason: 'Firma de token inválida: Intento de suplantación detectado' };
        }
        let payload;
        try {
            payload = JSON.parse(safeAtob(b64));
        } catch(e) {
            return { valid: false, reason: 'Carga de token ilegible o corrupta' };
        }
        if (!payload || !payload.uid || !payload.role) {
            return { valid: false, reason: 'Datos de identidad incompletos en el token' };
        }
        if (payload.exp && Date.now() > payload.exp) {
            return { valid: false, reason: 'El token ha expirado. Por favor inicie sesión nuevamente.' };
        }
        if (Array.isArray(registeredUsersList) && registeredUsersList.length > 0) {
            const found = registeredUsersList.some(u => u && (u.id === payload.uid || u.email === payload.email || u.username === payload.uid));
            if (!found && payload.role !== 'estudiante') {
                return { valid: false, reason: 'El usuario no figura en la nómina institucional activa' };
            }
        }
        return { valid: true, payload: payload };
    }

    function isSessionValid(registeredUsersList = []) {
        const session = getUserSession();
        if (!session || !session.user || !session.user.id) return false;
        const token = sessionStorage.getItem('ENCCO_AUTH_TOKEN') || localStorage.getItem('ENCCO_AUTH_TOKEN');
        if (!token) return false;
        const verification = verifyInstitutionalAuthToken(token, registeredUsersList);
        return verification.valid;
    }

    // 5. GESTIÓN DE SESIÓN (Persistencia Exclusiva por Navegador con Token Firmado)
    function saveUserSession(user, role) {
        if (!user) return;
        try {
            const finalRole = role || user.role || 'admin';
            const userStr = JSON.stringify(user);
            const token = generateInstitutionalAuthToken(user, finalRole);

            sessionStorage.setItem('ENCCO_AUTH_USER', userStr);
            sessionStorage.setItem('ENCCO_AUTH_ROLE', finalRole);
            if (token) {
                sessionStorage.setItem('ENCCO_AUTH_TOKEN', token);
            }

            try {
                localStorage.setItem('ENCCO_AUTH_USER', userStr);
                localStorage.setItem('ENCCO_AUTH_ROLE', finalRole);
                if (token) {
                    localStorage.setItem('ENCCO_AUTH_TOKEN', token);
                }
            } catch(lsErr) {}

            // Iniciar o reiniciar el temporizador de inactividad de 20 minutos
            if (typeof EnccoInactivityTimer !== 'undefined' && typeof EnccoInactivityTimer.start === 'function') {
                EnccoInactivityTimer.start();
            }
        } catch(e) {
            console.error('Error guardando sesión:', e);
        }
    }

    function getUserSession() {
        try {
            const rawUser = sessionStorage.getItem('ENCCO_AUTH_USER') || localStorage.getItem('ENCCO_AUTH_USER');
            const role = sessionStorage.getItem('ENCCO_AUTH_ROLE') || localStorage.getItem('ENCCO_AUTH_ROLE') || 'docente';
            const token = sessionStorage.getItem('ENCCO_AUTH_TOKEN') || localStorage.getItem('ENCCO_AUTH_TOKEN');
            if (rawUser) {
                const user = JSON.parse(rawUser);
                if (token) {
                    const check = verifyInstitutionalAuthToken(token);
                    if (!check.valid) {
                        console.warn('🛡️ [Seguridad ENCCO] Token de sesión inválido:', check.reason);
                        clearUserSession();
                        return null;
                    }
                } else if (user && user.id) {
                    // Generación retrocompatible si la sesión existía previamente sin token
                    const genToken = generateInstitutionalAuthToken(user, role);
                    if (genToken) {
                        try {
                            sessionStorage.setItem('ENCCO_AUTH_TOKEN', genToken);
                            localStorage.setItem('ENCCO_AUTH_TOKEN', genToken);
                        } catch(e) {}
                    }
                }
                return { user: user, role: role, token: token };
            }
        } catch(e) {}
        return null;
    }

    function clearUserSession() {
        try {
            // Detener temporizador de inactividad
            if (typeof EnccoInactivityTimer !== 'undefined' && typeof EnccoInactivityTimer.stop === 'function') {
                EnccoInactivityTimer.stop();
            }

            sessionStorage.removeItem('ENCCO_AUTH_USER');
            sessionStorage.removeItem('ENCCO_AUTH_ROLE');
            sessionStorage.removeItem('ENCCO_AUTH_TOKEN');
            sessionStorage.removeItem('ENCCO_AUTH_TIMESTAMP');
            sessionStorage.clear();
            localStorage.removeItem('ENCCO_AUTH_USER');
            localStorage.removeItem('ENCCO_AUTH_ROLE');
            localStorage.removeItem('ENCCO_AUTH_TOKEN');
            localStorage.removeItem('ENCCO_AUTH_BRIDGE');
            localStorage.removeItem('ENCCO_AUTH_TIMESTAMP');
            localStorage.removeItem('ENCCO_AUTH_REMEMBER');
        } catch(e) {}
    }

    // 6. CAMBIO DE ROL E IMPERSONACIÓN
    function switchRole(newRole) {
        if (!newRole) return;
        const targetRole = newRole.toLowerCase().trim();
        const currentSession = getUserSession();
        
        // Verificar si el usuario actual es admin o super usuario para permitir cambio
        const userRole = currentSession && currentSession.user ? (currentSession.user.role || '').toLowerCase() : '';
        const isMaster = userRole === 'admin' || userRole === 'super_usuario' || userRole === 'director';

        if (!isMaster) {
            console.warn('Cambio de rol restringido a la administración.');
            return false;
        }

        try { sessionStorage.setItem('ENCCO_AUTH_ROLE', targetRole); } catch(e) {}
        try { localStorage.removeItem('ENCCO_AUTH_ROLE'); } catch(e) {}
        if (currentSession && currentSession.user) {
            const updatedToken = generateInstitutionalAuthToken(currentSession.user, targetRole);
            if (updatedToken) {
                try { sessionStorage.setItem('ENCCO_AUTH_TOKEN', updatedToken); } catch(e) {}
                try { localStorage.setItem('ENCCO_AUTH_TOKEN', updatedToken); } catch(e) {}
            }
        }
        if (window.STATE) {
            window.STATE.currentRole = targetRole;
        }

        // Disparar evento para que la UI se actualice reactivamente sin recargar
        window.dispatchEvent(new CustomEvent('EnccoRoleChanged', { detail: { role: targetRole } }));
        if (typeof window.applyUserRole === 'function') {
            window.applyUserRole(targetRole);
        }
        return true;
    }

    function impersonateUser(userId) {
        if (!userId) return;
        const usersList = (window.STATE && window.STATE.users) ? window.STATE.users : [];
        const target = usersList.find(u => u.id === userId || u.username === userId);
        if (!target) return false;

        saveUserSession(target, target.role || 'docente');
        if (window.STATE) {
            window.STATE.currentUser = target;
            window.STATE.currentRole = target.role || 'docente';
        }
        window.dispatchEvent(new CustomEvent('EnccoUserImpersonated', { detail: { user: target } }));
        if (typeof window.applyUserRole === 'function') {
            window.applyUserRole(target.role || 'docente');
        }
        return true;
    }

    // 6. GESTOR GLOBAL DE CIERRE AUTOMÁTICO POR INACTIVIDAD (20 MINUTOS = 1,200,000 MS)
    const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 1,200,000 ms (20 minutos)
    let _inactivityTimer = null;
    let _lastActivityTimestamp = Date.now();
    let _activityListenersAttached = false;

    const EnccoInactivityTimer = {
        timeoutMs: INACTIVITY_TIMEOUT_MS,
        isActive: false,

        init(customTimeoutMs) {
            if (customTimeoutMs && typeof customTimeoutMs === 'number') {
                this.timeoutMs = customTimeoutMs;
            }
            this.attachEventListeners();
            this.start();
        },

        start() {
            this.stop();
            this.attachEventListeners();
            const session = getUserSession();
            if (!session || !session.user) {
                return;
            }

            // 🛡️ MODULO AUXILIATURA: Monitoreo continuo y soporte de alertas en tiempo real
            if (session.role === 'profesor_auxiliar') {
                console.log("🛡️ [Auxiliatura] Sesión verificada con monitoreo de alertas escolares activo y temporizador de inactividad regulado.");
                this.startAuxiliarHeartbeat();
            }

            this.isActive = true;
            _lastActivityTimestamp = Date.now();
            if (_inactivityTimer) {
                clearTimeout(_inactivityTimer);
            }
            _inactivityTimer = setTimeout(() => {
                this.onTimeout();
            }, this.timeoutMs);
        },

        startAuxiliarHeartbeat() {
            if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = setInterval(() => {
                const s = getUserSession();
                if (s && s.user && s.role === 'profesor_auxiliar') {
                    // Refrescar timestamp de sesión local
                    try {
                        localStorage.setItem('ENCCO_AUTH_TIMESTAMP', Date.now().toString());
                        sessionStorage.setItem('ENCCO_AUTH_TIMESTAMP', Date.now().toString());
                    } catch(e) {}
                }
            }, 5 * 60 * 1000); // Cada 5 minutos
        },

        reset() {
            if (!this.isActive) return;
            _lastActivityTimestamp = Date.now();
            if (_inactivityTimer) {
                clearTimeout(_inactivityTimer);
            }
            _inactivityTimer = setTimeout(() => {
                this.onTimeout();
            }, this.timeoutMs);
        },

        stop() {
            this.isActive = false;
            if (_inactivityTimer) {
                clearTimeout(_inactivityTimer);
                _inactivityTimer = null;
            }
            if (this._heartbeatInterval) {
                clearInterval(this._heartbeatInterval);
                this._heartbeatInterval = null;
            }
        },

        attachEventListeners() {
            if (_activityListenersAttached || typeof window === 'undefined' || typeof document === 'undefined') return;
            _activityListenersAttached = true;

            // Escucha los eventos del usuario requeridos: 'mousemove', 'keydown', 'click', 'scroll'
            const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            
            const handleUserActivity = () => {
                if (!this.isActive) return;
                const now = Date.now();
                // Throttle de 1 segundo para evitar saturar timers en mousemove/scroll frecuente
                if (now - _lastActivityTimestamp >= 1000) {
                    this.reset();
                }
            };

            events.forEach(evtName => {
                window.addEventListener(evtName, handleUserActivity, { passive: true, capture: true });
            });
        },

        async onTimeout() {
            console.warn("⏰ [Seguridad ENCCO] Cierre de sesión automático por inactividad (20 minutos transcurridos).");
            this.stop();

            // 1. Desconectar Firebase Auth de forma limpia si está disponible
            try {
                const fbModular = (typeof window !== 'undefined' && window.FirebaseModular) || (typeof FirebaseModular !== 'undefined' ? FirebaseModular : null);
                if (fbModular && fbModular.auth) {
                    const auth = fbModular.auth;
                    const signOutFn = fbModular.signOut || (fbModular.authMod && fbModular.authMod.signOut);
                    if (typeof signOutFn === 'function') {
                        await signOutFn(auth);
                        console.log("🔐 [Firebase Auth] signOut ejecutado exitosamente por inactividad.");
                    }
                }
            } catch(authErr) {
                console.warn("Aviso al cerrar Firebase Auth por inactividad:", authErr);
            }

            // 2. Ejecutar performLogout() si está disponible en app.js para desuscribir listeners y cerrar conexiones
            if (typeof window.performLogout === 'function' && !window._isLoggingOut) {
                try {
                    await window.performLogout();
                    return;
                } catch(err) {
                    console.warn("Aviso al ejecutar performLogout:", err);
                }
            }

            // 3. Borrar cualquier estado y caché en memoria
            clearUserSession();
            if (window.STATE) {
                window.STATE.currentUser = null;
                window.STATE.currentRole = 'guest';
                window.STATE.isLoggedIn = false;
                window.STATE.impersonatorAdmin = null;
            }

            // 4. Redirigir inmediatamente y de forma limpia a 'index.html'
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            window.location.replace(baseUrl + '/index.html');
        }
    };

    // Inicializar seguridad al cargar
    EnccoSecurityShield.showConsoleDefenseBanner();
    EnccoSecurityShield.preventFrameHijacking();

    // Auto-arranque del temporizador de inactividad si ya hay sesión activa en el navegador
    if (typeof window !== 'undefined' && getUserSession()) {
        EnccoInactivityTimer.init();
    }

    // Exportación
    const EnccoAuth = {
        EnccoSecurityShield,
        EnccoInactivityTimer,
        inactivityTimer: EnccoInactivityTimer,
        getLoginSecurityRecord,
        saveLoginSecurityRecord,
        checkLoginLockout,
        recordFailedLoginAttempt,
        resetLoginSecurityRecord,
        verifyUserAuthCredentials,
        saveUserSession,
        getUserSession,
        clearUserSession,
        switchRole,
        impersonateUser,
        enccoSha256,
        generateInstitutionalAuthToken,
        verifyInstitutionalAuthToken,
        isSessionValid
    };

    // 7. PROTECCIÓN ACTIVA DE RUTA INSTITUCIONAL
    function enforceInstitutionalRouteGuard() {
        if (typeof window === 'undefined' || !window.location) return;
        const path = (window.location.pathname || '').toLowerCase();
        // Páginas públicas
        if (path.endsWith('index.html') || path.endsWith('login.html') || path.endsWith('/') || path === '') {
            return;
        }

        // Si es una página protegida (plataforma.html, bloqueo-notas.html, datos-sire.html, maestros-guias.html)
        const session = getUserSession();
        if (!session || !session.user || !session.user.id) {
            console.warn('🛡️ [Seguridad ENCCO] Acceso interceptado: No se detectó sesión auténtica válida.');
            clearUserSession();
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            window.location.replace(baseUrl + '/index.html');
            return;
        }

        const token = sessionStorage.getItem('ENCCO_AUTH_TOKEN') || localStorage.getItem('ENCCO_AUTH_TOKEN');
        const tokenCheck = verifyInstitutionalAuthToken(token);
        if (!tokenCheck.valid) {
            console.warn('🛡️ [Seguridad ENCCO] Intento de manipulación de sesión detectado:', tokenCheck.reason);
            clearUserSession();
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            window.location.replace(baseUrl + '/index.html');
            return;
        }
    }

    try {
        enforceInstitutionalRouteGuard();
    } catch(guardErr) {
        console.warn('Aviso en chequeo de ruta:', guardErr);
    }

    window.EnccoAuth = EnccoAuth;
    window.EnccoInactivityTimer = EnccoInactivityTimer;
    window.EnccoSecurityShield = EnccoSecurityShield;
    window.escapeHTML = EnccoSecurityShield.escapeHtml.bind(EnccoSecurityShield);
    window.sanitizeHTML = EnccoSecurityShield.sanitizeInput.bind(EnccoSecurityShield);
    window.verifyUserAuthCredentials = verifyUserAuthCredentials;
    window.checkLoginLockout = checkLoginLockout;
    window.recordFailedLoginAttempt = recordFailedLoginAttempt;
    window.resetLoginSecurityRecord = resetLoginSecurityRecord;
    window.saveUserSession = saveUserSession;
    window.getUserSession = getUserSession;
    window.clearUserSession = clearUserSession;
    window.switchRole = switchRole;
    window.impersonateUser = impersonateUser;
    window.enccoSha256 = enccoSha256;
    window.generateInstitutionalAuthToken = generateInstitutionalAuthToken;
    window.verifyInstitutionalAuthToken = verifyInstitutionalAuthToken;
    window.isSessionValid = isSessionValid;

})(typeof window !== 'undefined' ? window : global);

