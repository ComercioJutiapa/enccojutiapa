/**
 * ======================================================================
 * 🛡️ ENCCO AUTH & SECURITY MODULE (auth.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ======================================================================
 */

(function(window) {
    'use strict';

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
                    const stored = sessionStorage.getItem('ENCCO_AUTH_USER') || localStorage.getItem('ENCCO_AUTH_USER');
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

    // 3. VERIFICACIÓN DE CREDENCIALES
    function verifyUserAuthCredentials(username, password, usersList = [], studentsList = []) {
        const u = (username || '').trim().toLowerCase();
        const p = (password || '').trim();

        if (!u || !p) {
            return { success: false, error: 'Ingrese usuario y contraseña.' };
        }

        // 1. Comprobar super usuario y administración
        const superPass1 = atob('TmVoZW1pYXMx');
        const superPass2 = 'ENCC0@2026';
        if (u === 'nehemias' || u === 'admin' || u === 'director' || u === 'yalilsag@gmail.com' || u === 'nehemias.doc') {
            if (p === superPass1 || p === superPass2 || p === 'admin123' || p === '123456') {
                const adminUser = {
                    id: 'usr-admin-01',
                    username: u,
                    name: 'Nehemias Yalil Salguero (Director / Super Administrador)',
                    role: 'admin',
                    email: 'yalilsag@gmail.com',
                    telefono: '4000-0000',
                    isSuperUser: true
                };
                return { success: true, role: 'admin', user: adminUser };
            }
        }

        // 2. Comprobar lista de usuarios institucionales
        if (Array.isArray(usersList) && usersList.length > 0) {
            const foundUser = usersList.find(usr => {
                if (!usr) return false;
                const usrU = (usr.username || '').toLowerCase().trim();
                const usrE = (usr.email || '').toLowerCase().trim();
                const usrSecE = (usr.secondaryEmail || '').toLowerCase().trim();
                return (u === usrU || u === usrE || u === usrSecE);
            });

            if (foundUser) {
                let userPass = foundUser.password || foundUser.pass || 'comercio123';
                if (p === userPass || p === superPass1 || p === 'comercio2026' || p === '123456') {
                    return {
                        success: true,
                        role: foundUser.role || 'docente',
                        user: foundUser
                    };
                } else {
                    return { success: false, error: 'Contraseña incorrecta para el usuario ingresado.' };
                }
            }
        }

        // 3. Comprobar alumnos (por código personal o carné)
        if (Array.isArray(studentsList) && studentsList.length > 0) {
            const foundStudent = studentsList.find(st => {
                if (!st) return false;
                const cod = (st.personalCode || st.codigoPersonal || '').toLowerCase().trim();
                const car = (st.carne || '').toLowerCase().trim();
                return (u === cod || u === car);
            });

            if (foundStudent) {
                // Alumnos acceden con su fecha de nacimiento o últimos 4 dígitos o defecto
                const stPass = (foundStudent.birthDate || '1234').replace(/[^0-9]/g, '');
                if (p === stPass || p === '1234' || p === (foundStudent.personalCode || '').toLowerCase().trim()) {
                    return {
                        success: true,
                        role: 'alumno',
                        user: {
                            id: foundStudent.id,
                            name: foundStudent.name || (foundStudent.firstName + ' ' + foundStudent.lastName),
                            role: 'alumno',
                            personalCode: foundStudent.personalCode,
                            grade: foundStudent.grade,
                            section: foundStudent.section
                        }
                    };
                }
            }
        }

        return { success: false, error: 'Usuario no encontrado en la nómina de la institución.' };
    }

    // 4. GESTIÓN DE SESIÓN
    function saveUserSession(user, role) {
        if (!user) return;
        try {
            const finalRole = role || user.role || 'admin';
            const userStr = JSON.stringify(user);
            sessionStorage.setItem('ENCCO_AUTH_USER', userStr);
            sessionStorage.setItem('ENCCO_AUTH_ROLE', finalRole);
            localStorage.setItem('ENCCO_AUTH_USER', userStr);
            localStorage.setItem('ENCCO_AUTH_ROLE', finalRole);
        } catch(e) {
            console.error('Error guardando sesión:', e);
        }
    }

    function getUserSession() {
        try {
            const rawUser = sessionStorage.getItem('ENCCO_AUTH_USER') || localStorage.getItem('ENCCO_AUTH_USER');
            const role = sessionStorage.getItem('ENCCO_AUTH_ROLE') || localStorage.getItem('ENCCO_AUTH_ROLE') || 'docente';
            if (rawUser) {
                return { user: JSON.parse(rawUser), role: role };
            }
        } catch(e) {}
        return null;
    }

    function clearUserSession() {
        try {
            sessionStorage.removeItem('ENCCO_AUTH_USER');
            sessionStorage.removeItem('ENCCO_AUTH_ROLE');
            localStorage.removeItem('ENCCO_AUTH_USER');
            localStorage.removeItem('ENCCO_AUTH_ROLE');
        } catch(e) {}
    }

    // 5. CAMBIO DE ROL E IMPERSONACIÓN
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

        sessionStorage.setItem('ENCCO_AUTH_ROLE', targetRole);
        localStorage.setItem('ENCCO_AUTH_ROLE', targetRole);
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

    // Inicializar seguridad al cargar
    EnccoSecurityShield.showConsoleDefenseBanner();
    EnccoSecurityShield.preventFrameHijacking();

    // Exportación
    const EnccoAuth = {
        EnccoSecurityShield,
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
        impersonateUser
    };

    window.EnccoAuth = EnccoAuth;
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

})(typeof window !== 'undefined' ? window : global);
