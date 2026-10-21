/**
 * ============================================================================
 * MOTOR DE LICENCIAS Y CONTROL MAESTRO DEL PROPIETARIO (KILL-SWITCH & RBAC SAAS)
 * ============================================================================
 * Asegura que tú seas el único dueño de la plataforma y mantengas el control
 * absoluto e irrestricto de qué colegios la utilizan, cuándo vence su licencia,
 * su límite de alumnos, o si se suspende el servicio por falta de pago.
 */

const LICENSE_STATUS = {
    ACTIVE: 'ACTIVE',
    GRACE_PERIOD: 'GRACE_PERIOD',
    SUSPENDED: 'SUSPENDED',
    EXPIRED: 'EXPIRED'
};

class MasterLicenseManager {
    constructor() {
        this.storageKey = 'saas_master_license_payload';
        this.masterSecretHash = 'SAAS_PLATAFORMA_MASTER_OWNER_KEY_2026'; // Clave de firma interna
    }

    /**
     * Genera un token de licencia firmado digitalmente para un colegio cliente
     */
    generateLicenseToken(schoolId, schoolName, validUntilDate, maxStudents = 500, status = LICENSE_STATUS.ACTIVE) {
        const payload = {
            schoolId: String(schoolId).trim(),
            schoolName: String(schoolName).trim(),
            issuedAt: new Date().toISOString(),
            validUntil: validUntilDate, // Formato YYYY-MM-DD
            maxStudents: parseInt(maxStudents, 10) || 500,
            status: status,
            ownerEmail: 'desarrollador.maestro@saas.com',
            features: {
                asistencia: true,
                calificaciones: true,
                exoneraciones: true,
                bitacoras: true,
                carnets: true,
                nominasOficio: true,
                importadorExcel: true
            }
        };

        // Generar firma de verificación anti-manipulación
        const signature = this._computeSignature(payload);
        return {
            payload,
            signature,
            rawToken: btoa(unescape(encodeURIComponent(JSON.stringify({ payload, signature }))))
        };
    }

    _computeSignature(payload) {
        const str = `${payload.schoolId}|${payload.validUntil}|${payload.maxStudents}|${payload.status}|${this.masterSecretHash}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `SIG-LIC-${Math.abs(hash).toString(16).toUpperCase()}`;
    }

    /**
     * Valida la licencia actual del colegio
     */
    verifyLicense(tokenString = null) {
        let licenseData = null;
        try {
            const raw = tokenString || localStorage.getItem(this.storageKey);
            if (!raw) {
                return {
                    isValid: false,
                    reason: 'NO_LICENSE_FOUND',
                    message: 'No se ha registrado una licencia válida para este establecimiento.'
                };
            }
            licenseData = JSON.parse(decodeURIComponent(escape(atob(raw))));
        } catch (e) {
            return {
                isValid: false,
                reason: 'CORRUPTED_TOKEN',
                message: 'El certificado de licencia institucional es inválido o fue alterado.'
            };
        }

        const { payload, signature } = licenseData;
        const expectedSig = this._computeSignature(payload);

        if (signature !== expectedSig) {
            return {
                isValid: false,
                reason: 'TAMPERED_SIGNATURE',
                message: 'Violación de integridad: La firma de la licencia no coincide con el emisor.'
            };
        }

        if (payload.status === LICENSE_STATUS.SUSPENDED) {
            return {
                isValid: false,
                status: LICENSE_STATUS.SUSPENDED,
                reason: 'SUSPENDED_BY_OWNER',
                message: 'Servicio suspendido administrativamente por el proveedor del sistema.'
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiration = new Date(payload.validUntil);
        expiration.setHours(23, 59, 59, 999);

        if (today > expiration) {
            return {
                isValid: false,
                status: LICENSE_STATUS.EXPIRED,
                reason: 'EXPIRED_DATE',
                message: `La licencia institucional venció el ${payload.validUntil}. Contacte al proveedor para renovar.`
            };
        }

        return {
            isValid: true,
            status: payload.status,
            schoolId: payload.schoolId,
            schoolName: payload.schoolName,
            validUntil: payload.validUntil,
            maxStudents: payload.maxStudents,
            features: payload.features
        };
    }

    saveLicense(tokenString) {
        const verification = this.verifyLicense(tokenString);
        if (verification.isValid) {
            localStorage.setItem(this.storageKey, tokenString);
            return { success: true, verification };
        }
        return { success: false, verification };
    }

    /**
     * Interfaz de Bloqueo / Pantalla de Suspensión (Kill-Switch)
     */
    renderSuspensionScreen(reasonMessage) {
        const overlay = document.createElement('div');
        overlay.id = 'saasMasterSuspensionOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.95); z-index: 9999999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 25px;
        `;
        overlay.innerHTML = `
            <div style="background:#1e293b; border:2px solid #ef4444; border-radius:12px; max-width:550px; padding:35px 25px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                <div style="font-size:3.5rem; color:#ef4444; margin-bottom:15px;">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <h2 style="font-size:1.4rem; font-weight:800; margin:0 0 10px 0; color:#f8fafc;">
                    Acceso Institucional Restringido
                </h2>
                <p style="color:#94a3b8; font-size:0.95rem; line-height:1.5; margin-bottom:20px;">
                    ${reasonMessage || 'La plataforma no cuenta con una licencia activa de servicio.'}
                </p>
                <div style="background:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155; font-size:0.82rem; color:#cbd5e1; margin-bottom:20px;">
                    Para reactivación, contratación o soporte técnico oficial, comuníquese con el <strong>Administrador General de la Plataforma</strong>.
                </div>
                <button type="button" onclick="window.masterLicenseManager.openAdminUnlockModal()" style="background:#3b82f6; border:none; color:#ffffff; padding:9px 18px; border-radius:6px; font-weight:700; cursor:pointer;">
                    Panel del Propietario (Acceso Restringido)
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    openAdminUnlockModal() {
        const pass = prompt("Ingrese la Clave Maestra del Desarrollador / Propietario:");
        if (pass === "ADMIN_MASTER_OWNER_2026") {
            const nextAction = confirm("Acceso Concedido como Propietario de la Plataforma.\n¿Desea reactivar la licencia actual por 30 días de prueba?");
            if (nextAction) {
                const nextYear = new Date();
                nextYear.setDate(nextYear.getDate() + 30);
                const tokenObj = this.generateLicenseToken('DEMO-COLEGIO', 'Colegio Activo', nextYear.toISOString().split('T')[0], 500);
                this.saveLicense(tokenObj.rawToken);
                alert("Licencia reactivada con éxito. La plataforma se reiniciará.");
                window.location.reload();
            }
        } else if (pass !== null) {
            alert("Clave maestra incorrecta.");
        }
    }
}

if (typeof window !== 'undefined') {
    window.LICENSE_STATUS = LICENSE_STATUS;
    window.MasterLicenseManager = MasterLicenseManager;
    window.masterLicenseManager = new MasterLicenseManager();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LICENSE_STATUS, MasterLicenseManager };
}
