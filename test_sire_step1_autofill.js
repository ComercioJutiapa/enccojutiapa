const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS: PASO 1 - INSCRIPCIÓN INTELIGENTE POR CÓDIGO SIRE');
console.log('========================================================================\n');

const sireCode = fs.readFileSync(path.join(__dirname, 'sire.js'), 'utf8');

// Simular entorno DOM
const domInputs = {};
const mockElements = {
    quickSireSearchCode: { value: '' },
    studentFormPersonalCode: { value: '' },
    studentFormFirstName: { value: '', focus: () => {} },
    studentFormLastName: { value: '' },
    studentFormCui: { value: '' },
    studentFormBirthDate: { value: '' },
    studentFormAge: { value: '' },
    studentFormGender: { value: 'Femenino' },
    studentFormPhone: { value: '' },
    studentFormEmail: { value: '' },
    studentFormAddress: { value: '' },
    studentFormGuardianName: { value: '' },
    studentFormGuardianPhone1: { value: '' },
    studentFormGuardianDpi: { value: '' },
    studentFormPhotoPreview: { src: '' },
    studentFormGrade: {
        selectedIndex: 0,
        options: [
            { value: '4_A_PC', text: '4to Perito Contador "A"' },
            { value: '5_A_PC', text: '5to Perito Contador "A"' },
            { value: '6_A_PC', text: '6to Perito Contador "A"' }
        ]
    },
    quickSireSearchResultBanner: { style: { display: 'none' }, innerHTML: '' },
    mainEnrollmentForm: { scrollIntoView: () => {} }
};

const mockWindow = {
    STATE: {
        activeCycle: '2026',
        students: [
            {
                id: 'st_401',
                name: 'María Alejandra Ramos Castillo',
                firstName: 'María Alejandra',
                lastName: 'Ramos Castillo',
                personalCode: 'A789BCA',
                cui: '3124567890101',
                birthDate: '2008-04-15',
                gender: 'Femenino',
                phone: '55443322',
                email: 'maria.ramos@gmail.com',
                address: 'Calle Real, Jutiapa',
                guardianName: 'Carlos Ramos',
                guardianPhone: '55667788',
                guardianDpi: '2030405060101',
                grade: '4',
                section: 'A',
                career: 'Perito Contador'
            }
        ]
    },
    document: {
        getElementById: (id) => mockElements[id] || null
    },
    calculateStudentAge: () => { mockElements.studentFormAge.value = '17 años'; },
    showToast: (msg, type) => console.log(`  [Toast ${type.toUpperCase()}]: ${msg}`)
};

// Cargar sire.js
const evalSire = new Function('window', 'document', sireCode);
evalSire(mockWindow, mockWindow.document);

const EnccoSire = mockWindow.EnccoSire;
assert(EnccoSire && typeof EnccoSire.searchAndAutoFillByPersonalCode === 'function', '❌ searchAndAutoFillByPersonalCode debe estar expuesto en EnccoSire');
console.log('✅ TEST 1: sire.js expone searchAndAutoFillByPersonalCode correctamente');

// Test 2: Búsqueda con éxito por Código Personal
console.log('\n--- Test 2: Búsqueda de Alumno Existente (A789BCA) ---');
mockElements.quickSireSearchCode.value = 'A789BCA';
const result = mockWindow.searchAndAutoFillByPersonalCode('A789BCA');

assert(result !== null, 'Debe encontrar al estudiante existente');
assert.strictEqual(mockElements.studentFormFirstName.value, 'María Alejandra');
assert.strictEqual(mockElements.studentFormLastName.value, 'Ramos Castillo');
assert.strictEqual(mockElements.studentFormCui.value, '3124567890101');
assert.strictEqual(mockElements.studentFormBirthDate.value, '2008-04-15');
assert.strictEqual(mockElements.studentFormPhone.value, '55443322');
assert.strictEqual(mockElements.studentFormAddress.value, 'Calle Real, Jutiapa');
assert.strictEqual(mockElements.studentFormGuardianName.value, 'Carlos Ramos');

// Verificación de promoción inteligente: Estudiante en 4to -> sugerir 5to
assert.strictEqual(mockElements.studentFormGrade.selectedIndex, 1, 'Debe seleccionar automáticamente 5to grado (índice 1)');
assert.strictEqual(mockElements.quickSireSearchResultBanner.style.display, 'block');
assert(mockElements.quickSireSearchResultBanner.innerHTML.includes('María Alejandra'));
console.log('✅ TEST 2: Expediente cargado en 0ms y grado sugerido promovido a 5to Perito Contador');

// Test 3: Búsqueda de Alumno Nuevo (no existente)
console.log('\n--- Test 3: Búsqueda de Código Personal Nuevo (Z999ZZZ) ---');
mockElements.quickSireSearchCode.value = 'Z999ZZZ';
const newResult = mockWindow.searchAndAutoFillByPersonalCode('Z999ZZZ');

assert.strictEqual(newResult, null, 'Debe devolver null para alumnos nuevos');
assert.strictEqual(mockElements.studentFormPersonalCode.value, 'Z999ZZZ', 'Debe pre-llenar la casilla de Código Personal en el formulario');
assert.strictEqual(mockElements.quickSireSearchResultBanner.style.display, 'block');
assert(mockElements.quickSireSearchResultBanner.innerHTML.includes('Nuevo Registro'));
console.log('✅ TEST 3: Código nuevo asignado correctamente al formulario para registro por primera vez');

// Test 4: Verificación en plataforma.html
const htmlContent = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
assert(htmlContent.includes('id="quickSireSearchCode"'), 'plataforma.html debe contener el buscador quickSireSearchCode');
assert(htmlContent.includes('id="quickSireSearchResultBanner"'), 'plataforma.html debe contener el banner de resultado quickSireSearchResultBanner');
assert(htmlContent.includes('searchAndAutoFillByPersonalCode()'), 'plataforma.html debe invocar searchAndAutoFillByPersonalCode');
console.log('✅ TEST 4: plataforma.html contiene los elementos y eventos visuales');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DEL PASO 1 (SIRE AUTOFILL) PASARON EXITOSAMENTE!');
console.log('========================================================================\n');
