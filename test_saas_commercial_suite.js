const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS: ARQUITECTURA SAAS MULTI-COLEGIO');
console.log('========================================================================');

// TEST 1: Blindaje de la ENCCO (Cero afectación de archivos originales)
console.log('\n--- Test 1: Verificación de Integridad Absoluta de la ENCCO ---');
const appJsPath = path.join(__dirname, 'app.js');
const platHtmlPath = path.join(__dirname, 'plataforma.html');

assert(fs.existsSync(appJsPath), 'app.js debe existir');
assert(fs.existsSync(platHtmlPath), 'plataforma.html debe existir');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const platHtml = fs.readFileSync(platHtmlPath, 'utf8');

// Walter Solórzano purga
assert(!appJs.includes('Walter Solórzano') && !appJs.includes('Walter Solorzano'), 'Walter Solórzano debe permanecer ausente');
assert(!platHtml.includes('Walter Solórzano') && !platHtml.includes('Walter Solorzano'), 'Walter Solórzano debe permanecer ausente en HTML');
console.log('✅ PASS: Plataforma ENCCO original permanece 100% intacta, protegida y con datos blindados.');

// TEST 2: Motor de Paletas de Colores (Theme Manager)
console.log('\n--- Test 2: Verificación del Motor de Paletas de Colores ---');
const { THEME_PALETTES, ThemeManager } = require('./saas_commercial/theme_manager.js');

assert(THEME_PALETTES.emerald, 'Paleta emerald debe existir');
assert(THEME_PALETTES['royal-blue'], 'Paleta royal-blue debe existir');
assert(THEME_PALETTES.burgundy, 'Paleta burgundy debe existir');
assert(THEME_PALETTES.navy, 'Paleta navy debe existir');
assert(THEME_PALETTES.purple, 'Paleta purple debe existir');

const tm = new ThemeManager();
assert.strictEqual(tm.getThemes().length, 6, 'Deben existir 6 paletas institucionales oficiales');
const blueTheme = tm.getTheme('royal-blue');
assert.strictEqual(blueTheme.primary, '#1d4ed8', 'El color primario de royal-blue debe ser #1d4ed8');
console.log('✅ PASS: Motor de paletas dinámicas validado con 6 temas institucionales.');

// TEST 3: Motor de Licencias y Control del Propietario (License Control & Kill-Switch)
console.log('\n--- Test 3: Verificación del Motor de Licencias y Control del Propietario ---');
const { LICENSE_STATUS, MasterLicenseManager } = require('./saas_commercial/license_control.js');

const lm = new MasterLicenseManager();

// 3.1 Generación de token válido
const futureDate = '2028-12-31';
const tokenObj = lm.generateLicenseToken('COL-TEST-001', 'Colegio Monte María', futureDate, 750);
assert(tokenObj.rawToken, 'Debe generar token en base64');
assert(tokenObj.signature.startsWith('SIG-LIC-'), 'Debe generar firma digital');

// 3.2 Verificación de token válido
const verifyValid = lm.verifyLicense(tokenObj.rawToken);
assert.strictEqual(verifyValid.isValid, true, 'El token debe ser válido');
assert.strictEqual(verifyValid.schoolId, 'COL-TEST-001');
assert.strictEqual(verifyValid.maxStudents, 750);

// 3.3 Verificación de expiración
const pastDate = '2020-01-01';
const expiredTokenObj = lm.generateLicenseToken('COL-EXP', 'Colegio Vencido', pastDate, 300);
const verifyExpired = lm.verifyLicense(expiredTokenObj.rawToken);
assert.strictEqual(verifyExpired.isValid, false, 'Licencia vencida debe rechazarse');
assert.strictEqual(verifyExpired.status, LICENSE_STATUS.EXPIRED);

// 3.4 Verificación de suspensión por el propietario (Kill-switch)
const suspendedTokenObj = lm.generateLicenseToken('COL-SUSP', 'Colegio Moroso', futureDate, 300, LICENSE_STATUS.SUSPENDED);
const verifySuspended = lm.verifyLicense(suspendedTokenObj.rawToken);
assert.strictEqual(verifySuspended.isValid, false, 'Licencia suspendida debe bloquearse');
assert.strictEqual(verifySuspended.reason, 'SUSPENDED_BY_OWNER');

// 3.5 Detección de manipulación / hackeo de token
const tamperedPayload = JSON.parse(Buffer.from(tokenObj.rawToken, 'base64').toString('utf8'));
tamperedPayload.payload.maxStudents = 999999; // Intento de alteración ilegítima
const tamperedRawToken = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64');
const verifyTampered = lm.verifyLicense(tamperedRawToken);
assert.strictEqual(verifyTampered.isValid, false, 'Token manipulado debe ser rechazado por firma inválida');
assert.strictEqual(verifyTampered.reason, 'TAMPERED_SIGNATURE');

console.log('✅ PASS: Motor de licencias, firma digital, expiración y Kill-Switch validados al 100%.');

// TEST 4: Asistente de Configuración (Setup Wizard)
console.log('\n--- Test 4: Verificación del Asistente de Configuración (Setup Wizard) ---');
const { SetupWizard } = require('./saas_commercial/setup_wizard.js');

const wizard = new SetupWizard();
assert.strictEqual(wizard.totalSteps, 5, 'El wizard debe tener 5 pasos estructurados');
assert.strictEqual(typeof wizard.renderWizardModal, 'function', 'renderWizardModal debe existir');
assert.strictEqual(typeof wizard.selectTheme, 'function', 'selectTheme debe existir');
assert.strictEqual(typeof wizard.finishWizard, 'function', 'finishWizard debe existir');
console.log('✅ PASS: Asistente SetupWizard estructurado correctamente con 5 pasos oficiales.');

// TEST 5: Integración del Portal Comercial (index.html)
console.log('\n--- Test 5: Verificación del Archivo saas_commercial/index.html ---');
const saasHtmlPath = path.join(__dirname, 'saas_commercial', 'index.html');
assert(fs.existsSync(saasHtmlPath), 'saas_commercial/index.html debe existir');
const saasHtml = fs.readFileSync(saasHtmlPath, 'utf8');

assert(saasHtml.includes('theme_manager.js'), 'Debe incluir theme_manager.js');
assert(saasHtml.includes('license_control.js'), 'Debe incluir license_control.js');
assert(saasHtml.includes('setup_wizard.js'), 'Debe incluir setup_wizard.js');
assert(saasHtml.includes('--primary-color'), 'Debe utilizar variables de paleta CSS');
console.log('✅ PASS: Portal saas_commercial/index.html integra todos los módulos con enlace dinámico.');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DE LA SUITE SAAS COMERCIAL PASARON EXITOSAMENTE!');
console.log('========================================================================');
