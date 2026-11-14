/**
 * tests/test_personal_code_uppercase_normalization.js
 * 
 * Verificación exhaustiva de la regla institucional:
 * "Todos los códigos personales deben normalizarse a mayúsculas aunque se ingresen en minúsculas."
 * 
 * Puntos evaluados:
 * 1. Función institucional `normalizePersonalCode(code)` en window / app.js.
 * 2. Transformación reactiva en tiempo real en los inputs de plataforma.html.
 * 3. Normalización garantizada a mayúsculas al guardar estudiante (saveStudentForm).
 * 4. Búsqueda y auto-llenado SIRE (searchAndAutoFillByPersonalCode) con código en minúsculas.
 * 5. Verificación de la base de datos en tiempo real: 0 códigos en minúsculas en el ciclo activo e histórico.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🔤 TEST: NORMALIZACIÓN OBLIGATORIA DE CÓDIGOS PERSONALES A MAYÚSCULAS');
console.log('='.repeat(80));

const appJsPath = path.join(__dirname, '..', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

const sireJsPath = path.join(__dirname, '..', 'sire.js');
const sireCode = fs.readFileSync(sireJsPath, 'utf8');

const htmlPath = path.join(__dirname, '..', 'plataforma.html');
const htmlCode = fs.readFileSync(htmlPath, 'utf8');

console.log('\n1. Verificando salvaguardas reactivas en plataforma.html...');
assert.ok(
    htmlCode.includes('id="studentFormPersonalCode"') &&
    htmlCode.includes('this.value = this.value.toUpperCase(); validateStudentFormLiveDuplicate()'),
    'studentFormPersonalCode debe tener oninput que auto-convierta a mayúsculas'
);
assert.ok(
    htmlCode.includes('id="studentFormPersonalCode"') &&
    htmlCode.includes('text-transform:uppercase'),
    'studentFormPersonalCode debe tener estilo visual de mayúsculas'
);
console.log('  ✅ Entradas de texto en interfaz blindadas con auto-conversión a mayúsculas en tiempo real.');

console.log('\n2. Verificando función helper normalizePersonalCode y persistencia en app.js...');
assert.ok(appCode.includes('function normalizePersonalCode(code)'), 'app.js debe definir normalizePersonalCode');
assert.ok(appCode.includes('window.normalizePersonalCode = normalizePersonalCode;'), 'normalizePersonalCode debe estar en window');
assert.ok(appCode.includes('const personalCode = (typeof normalizePersonalCode === \'function\')'), 'saveStudentForm debe usar normalizePersonalCode');
console.log('  ✅ Helper institucional y normalización en guardado verificados en app.js.');

console.log('\n3. Simulando búsqueda y guardado con código en minúsculas en sandbox...');
// Mock DOM & window
const dom = {
    quickSireSearchCode: { value: 'j844lbe', focus: () => {} },
    studentFormPersonalCode: { value: 'j844lbe' },
    studentFormId: { value: '' },
    studentFormCarne: { value: 'ENCCO-2027-999' },
    studentFormCui: { value: '1234567890101' },
    studentFormFirstName: { value: 'Prueba' },
    studentFormLastName: { value: 'Normalización' },
    studentFormGrade: { value: '4to Perito Contador - Sección A' },
    studentFormPhotoPreview: { src: '' }
};

const sandboxWindow = {
    STATE: {
        activeCycle: '2027',
        students: [
            { id: 'stu-sire-J844LBE', personalCode: 'J844LBE', name: 'AGUILAR BLANCO BLANCA CAROLINA', grade: '5' }
        ]
    },
    document: {
        getElementById: (id) => dom[id] || null,
        querySelector: () => null
    },
    showToast: () => {},
    checkEnrolmentPermissions: () => true
};

global.window = sandboxWindow;
global.document = sandboxWindow.document;

eval(sireCode);

// Buscar con código en minúsculas
const found = sandboxWindow.searchAndAutoFillByPersonalCode('j844lbe');
assert.ok(found, 'Debe encontrar al estudiante aun cuando se busca en minúsculas');
assert.strictEqual(dom.studentFormPersonalCode.value, 'J844LBE', 'El campo studentFormPersonalCode debe quedar en MAYÚSCULAS');
assert.strictEqual(dom.quickSireSearchCode.value, 'J844LBE', 'El campo quickSireSearchCode debe quedar en MAYÚSCULAS');
console.log('  ✅ Búsqueda SIRE con código en minúsculas autocompleta el formulario en MAYÚSCULAS.');

(async () => {
    console.log('\n4. Verificando que en la base de datos RTDB no existan códigos en minúsculas...');
    const dbUrl = 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';
    const res = await fetch(`${dbUrl}/encc_school_state/students.json`);
    const students = await res.json();
    const stList = Array.isArray(students) ? students : Object.values(students);

    let lowerCount = 0;
    stList.forEach(s => {
        if (!s || !s.personalCode) return;
        if (s.personalCode !== s.personalCode.toUpperCase()) {
            lowerCount++;
        }
    });

    assert.strictEqual(lowerCount, 0, `No debe existir ningún código personal en minúsculas en 2027 (Encontrados: ${lowerCount})`);
    console.log(`  ✅ Verificados ${stList.length} estudiantes: 0 códigos en minúsculas en base de datos.`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TODAS LAS PRUEBAS DE NORMALIZACIÓN A MAYÚSCULAS PASARON AL 100%!');
    console.log('='.repeat(80));
    process.exit(0);
})().catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
});
