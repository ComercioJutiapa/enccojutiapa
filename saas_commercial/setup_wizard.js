/**
 * ============================================================================
 * ASISTENTE DE CONFIGURACIÓN INICIAL (SETUP WIZARD) - SAAS MULTI-COLEGIO
 * ============================================================================
 * Guía paso a paso al nuevo establecimiento para configurar:
 * 1. Identidad Institucional (Nombre, código MINEDUC, carreras, logo).
 * 2. Paleta de Colores Corporativa (Theming dinámico).
 * 3. Autoridades Oficiales para Firmas (Dirección y Secretaría).
 * 4. Base de Datos en el correo del cliente (Firebase Realtime Database con propietario maestro).
 * 5. Términos y Condiciones Legales & Licencia de Uso.
 */

class SetupWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.config = {
            schoolId: '',
            schoolName: '',
            mineducCode: '',
            department: 'Jutiapa',
            municipality: 'Jutiapa',
            jornada: 'Matutina y Vespertina',
            levels: ['Básicos', 'Diversificado'],
            logoUrl: '',
            themeId: 'emerald',
            authorities: {
                directorName: '',
                directorTitle: 'Director(a) General',
                secretaryName: '',
                secretaryTitle: 'Secretario(a) de la Institución'
            },
            firebaseConfig: {
                apiKey: '',
                authDomain: '',
                databaseURL: '',
                projectId: '',
                storageBucket: '',
                messagingSenderId: '',
                appId: ''
            },
            termsAccepted: false,
            licenseToken: ''
        };
    }

    isConfigured() {
        try {
            const saved = localStorage.getItem('saas_school_profile_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                return !!(parsed && parsed.schoolName && parsed.firebaseConfig && parsed.firebaseConfig.databaseURL);
            }
        } catch(e) {}
        return false;
    }

    getConfig() {
        try {
            const saved = localStorage.getItem('saas_school_profile_config');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return this.config;
    }

    saveConfig(cfg) {
        this.config = Object.assign(this.config, cfg);
        localStorage.setItem('saas_school_profile_config', JSON.stringify(this.config));
        return this.config;
    }

    renderWizardModal() {
        let existing = document.getElementById('saasSetupWizardOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'saasSetupWizardOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.96); z-index: 999999;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; box-sizing: border-box;
        `;

        overlay.innerHTML = `
            <div style="background:#ffffff; width:100%; max-width:760px; max-height:92vh; border-radius:14px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                <!-- ENCABEZADO -->
                <div style="background:var(--primary-gradient, linear-gradient(135deg, #0f766e, #0d9488)); color:#ffffff; padding:18px 24px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; font-weight:800; opacity:0.9;">
                            Asistente de Implementación Oficial &bull; Plataforma SaaS
                        </div>
                        <h2 style="margin:2px 0 0 0; font-size:1.3rem; font-weight:900;">
                            Puesta en Marcha de Nuevo Establecimiento
                        </h2>
                    </div>
                    <div style="background:rgba(255,255,255,0.2); padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;" id="wizardStepCounter">
                        Paso 1 de 5
                    </div>
                </div>

                <!-- CONTENIDO DEL PASO -->
                <div style="padding:24px 28px; overflow-y:auto; flex:1; background:#f8fafc;" id="wizardStepContainer">
                    ${this._getStep1Html()}
                </div>

                <!-- BOTONES DE NAVEGACIÓN -->
                <div style="background:#ffffff; border-top:1px solid #e2e8f0; padding:14px 24px; display:flex; justify-content:space-between; align-items:center;">
                    <button type="button" id="btnWizardPrev" onclick="window.setupWizard.prevStep()" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#475569; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer; display:none;">
                        <i class="fa-solid fa-arrow-left"></i> Anterior
                    </button>
                    <div style="flex:1;"></div>
                    <button type="button" id="btnWizardNext" onclick="window.setupWizard.nextStep()" style="background:var(--primary-color, #0f766e); border:none; color:#ffffff; padding:9px 24px; border-radius:6px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                        Siguiente <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    _getStep1Html() {
        return `
            <div>
                <h3 style="margin:0 0 6px 0; color:#0f172a; font-size:1.15rem; font-weight:800;">
                    <i class="fa-solid fa-school" style="color:var(--primary-color, #0f766e);"></i> 1. Identidad Institucional del Plantel
                </h3>
                <p style="margin:0 0 16px 0; font-size:0.86rem; color:#64748b;">
                    Ingrese los datos oficiales que identificarán las actas, constancias y cuadros del colegio.
                </p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Nombre Oficial de la Institución *</label>
                        <input type="text" id="wzSchoolName" class="form-control" placeholder="Ej. Colegio Bilingüe Nueva Esperanza" value="${this.config.schoolName}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Código de Establecimiento (MINEDUC)</label>
                        <input type="text" id="wzMineducCode" class="form-control" placeholder="Ej. 22-01-0023-45" value="${this.config.mineducCode}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Jornada Oficial</label>
                        <input type="text" id="wzJornada" class="form-control" placeholder="Ej. Matutina / Vespertina" value="${this.config.jornada}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Departamento</label>
                        <input type="text" id="wzDept" class="form-control" value="${this.config.department}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Municipio</label>
                        <input type="text" id="wzMuni" class="form-control" value="${this.config.municipality}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; box-sizing:border-box;">
                    </div>
                </div>
            </div>
        `;
    }

    _getStep2Html() {
        const themes = (window.THEME_PALETTES) ? Object.values(window.THEME_PALETTES) : [];
        return `
            <div>
                <h3 style="margin:0 0 6px 0; color:#0f172a; font-size:1.15rem; font-weight:800;">
                    <i class="fa-solid fa-palette" style="color:var(--primary-color, #0f766e);"></i> 2. Paleta de Colores Institucional
                </h3>
                <p style="margin:0 0 16px 0; font-size:0.86rem; color:#64748b;">
                    Seleccione los colores corporativos de su institución para personalizar menús, botones, reportes y constancias.
                </p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    ${themes.map(t => `
                        <div onclick="window.setupWizard.selectTheme('${t.id}')" id="themeCard_${t.id}" style="border:2px solid ${this.config.themeId === t.id ? t.primary : '#e2e8f0'}; background:#ffffff; border-radius:8px; padding:12px; cursor:pointer; transition:all 0.2s ease;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                                <div style="width:24px; height:24px; border-radius:50%; background:${t.primary}; border:2px solid #ffffff; box-shadow:0 0 0 1px #cbd5e1;"></div>
                                <strong style="font-size:0.88rem; color:#0f172a;">${t.name}</strong>
                            </div>
                            <div style="height:6px; border-radius:3px; background:${t.gradient};"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    _getStep3Html() {
        return `
            <div>
                <h3 style="margin:0 0 6px 0; color:#0f172a; font-size:1.15rem; font-weight:800;">
                    <i class="fa-solid fa-signature" style="color:var(--primary-color, #0f766e);"></i> 3. Autoridades Oficiales para Firmas
                </h3>
                <p style="margin:0 0 16px 0; font-size:0.86rem; color:#64748b;">
                    Estas firmas aparecerán en los cuadros de notas, certificados de exoneración y boletas impresas.
                </p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
                        <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#0f172a; font-weight:800;">Dirección del Plantel</h4>
                        <label style="display:block; font-size:0.78rem; font-weight:700; color:#475569; margin-bottom:4px;">Nombre Completo del Director(a) *</label>
                        <input type="text" id="wzDirectorName" class="form-control" placeholder="Ej. Licda. María González" value="${this.config.authorities.directorName}" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; box-sizing:border-box;">
                    </div>
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
                        <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#0f172a; font-weight:800;">Secretaría / Registro</h4>
                        <label style="display:block; font-size:0.78rem; font-weight:700; color:#475569; margin-bottom:4px;">Nombre Completo del Secretario(a) *</label>
                        <input type="text" id="wzSecretaryName" class="form-control" placeholder="Ej. Prof. Juan Pérez" value="${this.config.authorities.secretaryName}" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; box-sizing:border-box;">
                    </div>
                </div>
            </div>
        `;
    }

    _getStep4Html() {
        return `
            <div>
                <h3 style="margin:0 0 6px 0; color:#0f172a; font-size:1.15rem; font-weight:800;">
                    <i class="fa-solid fa-database" style="color:var(--primary-color, #0f766e);"></i> 4. Base de Datos en la Nube (Firebase de su Correo)
                </h3>
                <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; padding:12px 14px; margin-bottom:14px; font-size:0.82rem; color:#166534; line-height:1.45;">
                    <i class="fa-solid fa-circle-check"></i> <strong>Aislamiento y Soberanía de Datos:</strong> Su información escolar reside en la cuenta de Google/Firebase de su institución. Para garantizar soporte y seguridad, agregue al desarrollador como <strong>Propietario / Owner</strong> en Firebase.
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:4px;">URL de Realtime Database *</label>
                        <input type="text" id="wzFbDbUrl" class="form-control" placeholder="https://nombre-colegio-default-rtdb.firebaseio.com" value="${this.config.firebaseConfig.databaseURL}" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:4px;">API Key de Firebase *</label>
                        <input type="text" id="wzFbApiKey" class="form-control" placeholder="AIzaSy..." value="${this.config.firebaseConfig.apiKey}" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:4px;">Project ID *</label>
                        <input type="text" id="wzFbProjectId" class="form-control" placeholder="nombre-colegio-2026" value="${this.config.firebaseConfig.projectId}" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; box-sizing:border-box;">
                    </div>
                </div>
            </div>
        `;
    }

    _getStep5Html() {
        return `
            <div>
                <h3 style="margin:0 0 6px 0; color:#0f172a; font-size:1.15rem; font-weight:800;">
                    <i class="fa-solid fa-file-contract" style="color:var(--primary-color, #0f766e);"></i> 5. Términos de Servicio y Activación de Licencia
                </h3>
                <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px; font-size:0.78rem; color:#475569; max-height:140px; overflow-y:auto; line-height:1.45; margin-bottom:14px;">
                    <strong>CONTRATO DE LICENCIA DE SOFTWARE COMO SERVICIO (SaaS):</strong><br>
                    1. La institución adquiere un derecho intransferible de uso de la plataforma académica escolar.<br>
                    2. La propiedad intelectual, arquitectura y derechos patrimoniales sobre el código fuente corresponden exclusivamente al Desarrollador / Proveedor.<br>
                    3. La institución es la única responsable y custodia de los datos personales ingresados, en cumplimiento con las leyes de la República de Guatemala.
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:0.85rem; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="wzAcceptTerms" ${this.config.termsAccepted ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
                        Acepto los Términos de Servicio, Licencia de Uso y Privacidad Institucional.
                    </label>
                </div>
                <div>
                    <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:4px;">Token de Activación de Licencia Proporcionado por el Desarrollador *</label>
                    <textarea id="wzLicenseToken" class="form-control" rows="2" placeholder="Pegue aquí el token oficial de activación emitido por el propietario de la plataforma..." style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; font-family:monospace; box-sizing:border-box;">${this.config.licenseToken}</textarea>
                </div>
            </div>
        `;
    }

    selectTheme(themeId) {
        this.config.themeId = themeId;
        if (window.themeManager) {
            window.themeManager.applyTheme(themeId, false);
        }
        const container = document.getElementById('wizardStepContainer');
        if (container) container.innerHTML = this._getStep2Html();
    }

    nextStep() {
        if (!this._validateCurrentStep()) return;

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this._renderCurrentStep();
        } else {
            this.finishWizard();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this._renderCurrentStep();
        }
    }

    _validateCurrentStep() {
        if (this.currentStep === 1) {
            const name = document.getElementById('wzSchoolName');
            if (!name || !name.value.trim()) {
                alert("Por favor ingrese el nombre oficial del establecimiento.");
                return false;
            }
            this.config.schoolName = name.value.trim();
            this.config.mineducCode = (document.getElementById('wzMineducCode') || {}).value || '';
            this.config.jornada = (document.getElementById('wzJornada') || {}).value || '';
            this.config.department = (document.getElementById('wzDept') || {}).value || '';
            this.config.municipality = (document.getElementById('wzMuni') || {}).value || '';
        } else if (this.currentStep === 3) {
            const dir = document.getElementById('wzDirectorName');
            const sec = document.getElementById('wzSecretaryName');
            if (!dir || !dir.value.trim()) {
                alert("Ingrese el nombre del Director(a) para las firmas oficiales.");
                return false;
            }
            this.config.authorities.directorName = dir.value.trim();
            this.config.authorities.secretaryName = sec ? sec.value.trim() : '';
        } else if (this.currentStep === 4) {
            const dbUrl = document.getElementById('wzFbDbUrl');
            const apiKey = document.getElementById('wzFbApiKey');
            const projId = document.getElementById('wzFbProjectId');
            if (!dbUrl || !dbUrl.value.trim().startsWith('http')) {
                alert("Ingrese una URL válida de Realtime Database de Firebase.");
                return false;
            }
            this.config.firebaseConfig.databaseURL = dbUrl.value.trim();
            this.config.firebaseConfig.apiKey = apiKey ? apiKey.value.trim() : '';
            this.config.firebaseConfig.projectId = projId ? projId.value.trim() : '';
        } else if (this.currentStep === 5) {
            const terms = document.getElementById('wzAcceptTerms');
            if (!terms || !terms.checked) {
                alert("Debe aceptar los Términos de Servicio y Licencia para continuar.");
                return false;
            }
            this.config.termsAccepted = true;
            const token = document.getElementById('wzLicenseToken');
            this.config.licenseToken = token ? token.value.trim() : '';

            // Si no tiene token, generar uno de demostración inicial válido
            if (!this.config.licenseToken && window.masterLicenseManager) {
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                const tokenObj = window.masterLicenseManager.generateLicenseToken(
                    this.config.schoolName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase(),
                    this.config.schoolName,
                    nextYear.toISOString().split('T')[0],
                    500
                );
                this.config.licenseToken = tokenObj.rawToken;
            }
        }
        return true;
    }

    _renderCurrentStep() {
        const container = document.getElementById('wizardStepContainer');
        const counter = document.getElementById('wizardStepCounter');
        const btnPrev = document.getElementById('btnWizardPrev');
        const btnNext = document.getElementById('btnWizardNext');

        if (counter) counter.innerText = `Paso ${this.currentStep} de ${this.totalSteps}`;
        if (btnPrev) btnPrev.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
        if (btnNext) btnNext.innerHTML = this.currentStep === this.totalSteps ? 'Finalizar e Iniciar Plataforma <i class="fa-solid fa-rocket"></i>' : 'Siguiente <i class="fa-solid fa-arrow-right"></i>';

        if (this.currentStep === 1) container.innerHTML = this._getStep1Html();
        else if (this.currentStep === 2) container.innerHTML = this._getStep2Html();
        else if (this.currentStep === 3) container.innerHTML = this._getStep3Html();
        else if (this.currentStep === 4) container.innerHTML = this._getStep4Html();
        else if (this.currentStep === 5) container.innerHTML = this._getStep5Html();
    }

    finishWizard() {
        // Guardar configuración completa y aplicar tema
        this.saveConfig(this.config);
        if (window.themeManager) {
            window.themeManager.applyTheme(this.config.themeId, true);
        }
        if (window.masterLicenseManager && this.config.licenseToken) {
            window.masterLicenseManager.saveLicense(this.config.licenseToken);
        }

        const overlay = document.getElementById('saasSetupWizardOverlay');
        if (overlay) overlay.remove();

        alert(`¡Configuración Completada con Éxito!\n\nEstablecimiento: ${this.config.schoolName}\nLa plataforma está lista para operar con su base de datos propia.`);
        window.location.reload();
    }
}

if (typeof window !== 'undefined') {
    window.SetupWizard = SetupWizard;
    window.setupWizard = new SetupWizard();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SetupWizard };
}
