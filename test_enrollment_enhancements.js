const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS: OPTIMIZACIÓN Y COHERENCIA DE INSCRIPCIONES');
console.log('========================================================================\n');

const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// TEST 1: Inscripción exprés eliminada de la vista de inscripción
console.log('▶ [TEST 1] Verificando eliminación de la barra exprés SIRE en HTML...');
assert(!html.includes('id="quickSireSearchCode"'), 'quickSireSearchCode no debe existir en plataforma.html');
assert(!html.includes('id="quickSireSearchResultBanner"'), 'quickSireSearchResultBanner no debe existir en plataforma.html');
assert(!html.includes('Inscripción Exprés por Código Personal'), 'El texto de inscripción exprés no debe existir');
console.log('  ✅ Test 1 Superado: Barra rápida eliminada; formulario oficial limpio y directo.');

// TEST 2: Presencia de elementos de persistencia y cupos
console.log('\n▶ [TEST 2] Verificando controles de persistencia y cupos...');
assert(html.includes('id="btnToggleEnrollmentSectionsSummary"'), 'Debe existir btnToggleEnrollmentSectionsSummary');
assert(html.includes('id="enrollmentSectionLiveBadge"'), 'Debe existir enrollmentSectionLiveBadge');
assert(appJs.includes('window._lastSelectedEnrollmentGrade'), 'Debe existir _lastSelectedEnrollmentGrade en app.js');
assert(appJs.includes('window._enrollmentCuposPanelVisible'), 'Debe existir _enrollmentCuposPanelVisible en app.js');
assert(appJs.includes('selectEnrollmentSectionFromSummary'), 'Debe existir selectEnrollmentSectionFromSummary en app.js');
console.log('  ✅ Test 2 Superado: Funciones y variables de persistencia presentes.');

// TEST 3: Generador de carné secuencial sin colisiones
console.log('\n▶ [TEST 3] Verificando generador de carné secuencial (cero colisiones)...');
assert(appJs.includes('function getNextOfficialStudentCarne'), 'Debe existir getNextOfficialStudentCarne en app.js');

// Simular entorno sandbox
const sandbox = {
    window: {},
    STATE: {
        activeCycle: '2027',
        students: [
            { carne: 'ENCCO-2027-420', cycle: '2027' },
            { carne: 'ENCCO-2027-421', cycle: '2027' }
        ]
    }
};
sandbox.window = sandbox;

const evalCarneGen = new Function('window', 'STATE', `
    ${appJs.substring(appJs.indexOf('function getNextOfficialStudentCarne'), appJs.indexOf('window.getNextOfficialStudentCarne = getNextOfficialStudentCarne;'))}
    return getNextOfficialStudentCarne('2027');
`);
const nextCarne = evalCarneGen(sandbox.window, sandbox.STATE);
assert.strictEqual(nextCarne, 'ENCCO-2027-422', `Se esperaba ENCCO-2027-422, pero se obtuvo ${nextCarne}`);
console.log(`  ✅ Test 3 Superado: Carné secuencial generado correctamente (${nextCarne}) sin colisión.`);

// TEST 4: Prueba de la "I": no disparar falso duplicado con solo teclear iniciales
console.log('\n▶ [TEST 4] Verificando que teclear "I" NO dispare falso duplicado...');
// Extraer lógica de validación de longitud
const valSnippet = appJs.substring(appJs.indexOf('function validateStudentFormLiveDuplicate()'), appJs.indexOf('async function saveStudentForm(e)'));
assert(valSnippet.includes('personalCode.length >= 6'), 'Debe exigir código de al menos 6 caracteres');
assert(valSnippet.includes('cui.replace'), 'Debe exigir CUI de al menos 10 dígitos');

// Simular inputs
let warningShown = false;
let warningText = '';
const mockWarnBox = {
    style: { display: 'none' }
};
const mockWarnText = {
    textContent: ''
};
const mockFormInputs = {
    studentFormId: { value: '' },
    studentFormCarne: { value: 'ENCCO-2027-420' }, // Carné que coincide con un alumno existente
    studentFormPersonalCode: { value: 'I' }, // Usuario solo tecleó la letra 'I'
    studentFormCui: { value: '' },
    studentFormFirstName: { value: '' },
    studentFormLastName: { value: '' },
    studentFormBirthDate: { value: '' },
    studentFormCycle: { value: '2027' },
    studentDuplicateWarning: mockWarnBox,
    studentDuplicateWarningText: mockWarnText
};

const evalValDup = new Function('inputs', 'STATE', 'normalizePersonalCode', 'checkStudentDuplicateEnrollment', 'formatStudentDisplayName', `
    const document = {
        getElementById: id => inputs[id] || null
    };
    ${valSnippet}
    validateStudentFormLiveDuplicate();
    return inputs.studentDuplicateWarning.style.display;
`);

const normalizePersonalCode = c => String(c || '').trim().toUpperCase();
const checkStudentDuplicateEnrollment = () => null;
const formatStudentDisplayName = () => '';

evalValDup(mockFormInputs, sandbox.STATE, normalizePersonalCode, checkStudentDuplicateEnrollment, formatStudentDisplayName);
assert.strictEqual(mockWarnBox.style.display, 'none', 'La alerta de duplicado DEBE permanecer oculta al teclear solo "I"');
console.log('  ✅ Test 4 Superado: Teclear la letra "I" NO genera falso duplicado.');

// TEST 5: Campo de expediente físico en modal de retiro
console.log('\n▶ [TEST 5] Verificando campo de expediente físico en retiro...');
assert(html.includes('id="profHasExpediente"'), 'Debe existir selector profHasExpediente en plataforma.html');
assert(appJs.includes("student.hasExpediente = (document.getElementById('profHasExpediente')?.value !== 'false');"), 'Debe guardarse hasExpediente en saveStudentProfileForm');
console.log('  ✅ Test 5 Superado: Trazabilidad del expediente físico integrada al modal de retiro.');

console.log('\n========================================================================');
console.log('🎉 TODAS LAS 5 PRUEBAS DE OPTIMIZACIÓN PASARON AL 100%');
console.log('========================================================================\n');
