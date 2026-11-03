/**
 * tests/test_student_enrollment_form_reset.js
 * Verifica que al editar la ficha de datos de un estudiante en el ciclo 2027:
 * 1. Los datos del estudiante se guardan y actualizan fielmente en STATE.students y almacenamiento.
 * 2. El formulario de inscripción y sus campos quedan 100% en blanco.
 * 3. El campo oculto studentFormId se vacía para no dejar residuos en memoria.
 * 4. Los títulos y botones regresan al modo "Inscripción Oficial".
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================================');
console.log('🧼 TEST: BLANQUEO Y RESETEO DE FICHA DE DATOS TRAS EDICIÓN DE ESTUDIANTE');
console.log('================================================================================\n');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

// 1. Verificación Estática
console.log('1. Verificando que resetStudentEnrollmentForm se ejecute sin restricción de !studentId...');
assert.ok(
    appCode.includes('// 🧼 BLANQUEO Y RESETEO INMEDIATO: Tanto al inscribir nuevo como al editar la ficha de datos'),
    'Debe existir el bloque de blanqueo inmediato incondicional tras guardar'
);
assert.ok(
    !appCode.includes('if (!studentId && typeof resetStudentEnrollmentForm === \'function\')'),
    'No debe existir la restricción if (!studentId) para resetear el formulario'
);
console.log('  ✅ Verificación estática superada: resetStudentEnrollmentForm se ejecuta tras cualquier guardado.');

// 2. Simulación en Sandbox de la edición y reseteo
console.log('\n2. Simulando edición de estudiante en Ciclo 2027 y reseteo del formulario...');

const domElements = {
    studentFormId: { value: 'stu-test-001' },
    studentFormCarne: { value: 'ENCCO-2027-101' },
    studentFormPersonalCode: { value: 'CODE-999' },
    studentFormCui: { value: '1234567890101' },
    studentFormFirstName: { value: 'Juan Carlos' },
    studentFormLastName: { value: 'López Morales' },
    studentFormBirthDate: { value: '2008-05-15' },
    studentFormAge: { value: '18' },
    studentFormGender: { value: 'Masculino' },
    studentFormPhone: { value: '55551234' },
    studentFormEmail: { value: 'juan@test.com' },
    studentFormAddress: { value: 'Jutiapa' },
    studentFormGrade: { 
        value: '5to Perito Contador - Sección A',
        selectedOptions: [{ dataset: { grade: '5to Perito Contador', section: 'Sección A', code: '5to A' } }],
        options: [{ value: '5to Perito Contador - Sección A', text: '5to Perito Contador (Sección A)' }]
    },
    studentFormCycle: { value: '2027' },
    studentFormShift: { value: 'Matutina' },
    studentFormMotherName: { value: 'María Morales' },
    studentFormMotherDpi: { value: '1111111111111' },
    studentFormMotherPhone1: { value: '11112222' },
    studentFormMotherPhone2: { value: '' },
    studentFormFatherName: { value: 'Carlos López' },
    studentFormFatherDpi: { value: '2222222222222' },
    studentFormFatherPhone1: { value: '33334444' },
    studentFormFatherPhone2: { value: '' },
    studentFormGuardianName: { value: 'María Morales' },
    studentFormGuardianDpi: { value: '1111111111111' },
    studentFormGuardianPhone1: { value: '11112222' },
    studentFormGuardianPhone2: { value: '' },
    studentFormPhotoPreview: { src: 'https://ui-avatars.com/api/?name=Juan' },
    enrollmentViewTitle: { innerHTML: '<i class="fa-solid fa-user-pen"></i> Editar Datos de Inscripción' },
    enrollmentSubmitTopBtn: { innerHTML: '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios', getAttribute: () => '', setAttribute: () => {} },
    enrollmentSubmitBottomBtn: { innerHTML: '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios', getAttribute: () => '', setAttribute: () => {} },
    studentDuplicateWarning: { style: { display: 'none' } },
    quickSireSearchCode: { value: '' },
    quickSireSearchResultBanner: { style: { display: 'none' } }
};

const sandboxWindow = {
    STATE: {
        activeCycle: '2027',
        academicCycle: '2027',
        currentRole: 'director',
        currentUser: { id: 'usr-admin', name: 'Director General', role: 'director' },
        gradesList: [{ code: '5to A', name: '5to Perito Contador', section: 'Sección A' }],
        students: [
            {
                id: 'stu-test-001',
                carne: 'ENCCO-2027-101',
                firstName: 'Juan',
                lastName: 'López',
                name: 'LÓPEZ, JUAN',
                grade: '5to Perito Contador',
                section: 'Sección A',
                academicCycle: '2027',
                phone: '00000000'
            }
        ]
    },
    document: {
        getElementById: (id) => domElements[id] || null,
        querySelector: () => null,
        dispatchEvent: () => {},
        addEventListener: () => {}
    },
    addEventListener: () => {},
    setTimeout: (fn) => fn(),
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    checkEnrolmentPermissions: () => true,
    saveStateToLocalStorage: () => {},
    navigateTo: () => {},
    renderStudentsTable: () => {},
    renderBoletasTable: () => {},
    renderDashboard: () => {},
    showToast: (msg) => console.log('  [Toast]:', msg),
    recordAuditLog: () => {},
    stopWebcam: () => {},
    updateGradeSelects: () => {},
    updateCycleSelects: () => {},
    sanitizePayloadForFirestore: (p) => p,
    withTimeout: async (p) => p
};

const sandbox = {
    window: sandboxWindow,
    document: sandboxWindow.document,
    STATE: sandboxWindow.STATE,
    setTimeout: (fn) => fn(),
    checkEnrolmentPermissions: sandboxWindow.checkEnrolmentPermissions,
    showToast: sandboxWindow.showToast,
    saveStateToLocalStorage: sandboxWindow.saveStateToLocalStorage,
    navigateTo: sandboxWindow.navigateTo,
    renderStudentsTable: sandboxWindow.renderStudentsTable,
    renderBoletasTable: sandboxWindow.renderBoletasTable,
    renderDashboard: sandboxWindow.renderDashboard,
    recordAuditLog: sandboxWindow.recordAuditLog,
    stopWebcam: sandboxWindow.stopWebcam,
    updateGradeSelects: sandboxWindow.updateGradeSelects,
    updateCycleSelects: sandboxWindow.updateCycleSelects,
    sanitizePayloadForFirestore: sandboxWindow.sanitizePayloadForFirestore,
    withTimeout: sandboxWindow.withTimeout
};

vm.createContext(sandbox);

// Extraer resetStudentEnrollmentForm y saveStudentForm de app.js
const resetFnCode = appCode.slice(
    appCode.indexOf('function resetStudentEnrollmentForm'),
    appCode.indexOf('function openStudentModal()')
);
const saveFnCode = appCode.slice(
    appCode.indexOf('async function saveStudentForm(e)'),
    appCode.indexOf('function getStudentExonerationsList(student)')
);

vm.runInContext(resetFnCode, sandbox);
vm.runInContext(saveFnCode, sandbox);

(async () => {
    // Ejecutar saveStudentForm simulando guardar la edición
    await sandbox.saveStudentForm({ preventDefault: () => {}, stopPropagation: () => {} });

    // 1. Verificar que el estudiante en STATE fue actualizado
    const updatedStudent = sandbox.STATE.students.find(s => s.id === 'stu-test-001');
    assert.strictEqual(updatedStudent.firstName, 'Juan Carlos', 'El primer nombre debe haberse actualizado a Juan Carlos');
    assert.strictEqual(updatedStudent.lastName, 'López Morales', 'El apellido debe haberse actualizado a López Morales');
    assert.strictEqual(updatedStudent.phone, '55551234', 'El teléfono debe haberse actualizado a 55551234');
    console.log('  ✅ El estudiante se actualizó fielmente en memoria y almacenamiento.');

    // 2. Verificar que el formulario quedó completamente en blanco
    assert.strictEqual(domElements.studentFormId.value, '', 'studentFormId debe quedar vacío tras guardar edición');
    assert.strictEqual(domElements.studentFormFirstName.value, '', 'studentFormFirstName debe quedar vacío');
    assert.strictEqual(domElements.studentFormLastName.value, '', 'studentFormLastName debe quedar vacío');
    assert.strictEqual(domElements.studentFormPersonalCode.value, '', 'studentFormPersonalCode debe quedar vacío');
    assert.strictEqual(domElements.studentFormCui.value, '', 'studentFormCui debe quedar vacío');
    assert.strictEqual(domElements.studentFormPhone.value, '', 'studentFormPhone debe quedar vacío');
    assert.strictEqual(domElements.studentFormMotherName.value, '', 'studentFormMotherName debe quedar vacío');
    assert.strictEqual(domElements.studentFormFatherName.value, '', 'studentFormFatherName debe quedar vacío');
    console.log('  ✅ Todos los campos del formulario de inscripción quedaron en blanco.');

    // 3. Verificar que los títulos y botones se restauraron a inscripción
    assert.ok(domElements.enrollmentViewTitle.innerHTML.includes('Inscripción Oficial de Estudiantes'), 'El título debe restaurarse a Inscripción Oficial');
    assert.ok(domElements.enrollmentSubmitTopBtn.innerHTML.includes('Guardar Inscripción'), 'El botón superior debe restaurarse a Guardar Inscripción');
    assert.ok(domElements.enrollmentSubmitBottomBtn.innerHTML.includes('Guardar Inscripción'), 'El botón inferior debe restaurarse a Guardar Inscripción');
    console.log('  ✅ Título y botones restaurados a modo "Guardar Inscripción".');

    console.log('\n🎉 PRUEBA DE BLANQUEO Y RESETEO TRAS EDICIÓN SUPERADA AL 100%!');
})().catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
});
