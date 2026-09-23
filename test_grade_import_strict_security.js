/**
 * ======================================================================
 * 🧪 PRUEBAS UNITARIAS: VALIDACIÓN ESTRICTA Y SEGURA DE IMPORTACIÓN (7 REGLAS)
 * ======================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRUEBAS DE SEGURIDAD ESTRICTA: IMPORTACIÓN DE NOTAS (7 REGLAS)');
console.log('========================================================================\n');

let lastToast = { msg: '', type: '' };

const mockState = {
    currentRole: 'docente',
    currentUser: {
        id: 'u-doc-1',
        name: 'PEM. Nehemias Yalil Salguero',
        role: 'docente'
    },
    activeCycle: '2026',
    config: { activeBimestre: 1, globalLocked: false },
    pensum: [
        {
            id: 'pensum-pc4-cont-gen',
            subject: 'Contabilidad General',
            grade: '4to Perito Contador',
            section: 'Sección A',
            teacher: 'PEM. Nehemias Yalil Salguero',
            career: 'Perito Contador'
        },
        {
            id: 'pensum-pc4-mat-com',
            subject: 'Matemática Comercial',
            grade: '4to Perito Contador',
            section: 'Sección A',
            teacher: 'Licda. Ana María Ortiz',
            career: 'Perito Contador'
        }
    ],
    students: [
        {
            id: 'st-01',
            no: 1,
            clave: 1,
            carne: '2026-0001-PC',
            firstName: 'Carlos Estuardo',
            lastName: 'Gómez Martínez',
            name: 'Carlos Estuardo Gómez Martínez',
            grade: '4to Perito Contador',
            section: 'Sección A',
            grades: { 'Contabilidad General': [0, 0, 0, 0] },
            gradebookDetails: {
                'Contabilidad General': { 1: { activities: [0,0,0,0,0,0,0,0,0,0], zona: 0, exam: 0, total: 0 } }
            }
        }
    ],
    users: []
};

const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

const mockWindow = {
    STATE: mockState,
    location: { href: '', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    document: {
        getElementById: function() { return { value: '', innerHTML: '', innerText: '', textContent: '', style: {} }; },
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
        addEventListener: () => {},
        body: { appendChild: () => {} }
    },
    saveStateToLocalStorage: function() {},
    showToast: function(msg, type) {
        lastToast = { msg, type };
        console.log(`  [Toast ${type ? type.toUpperCase() : 'INFO'}]: ${msg}`);
    }
};

global.showToast = mockWindow.showToast;

const evalContext = new Function(
    'window', 'document', 'localStorage', 'sessionStorage', 'location', 'console', 'showToast',
    appCode + '\nreturn { processGradebookImportRows };'
);

const { processGradebookImportRows } = evalContext(
    mockWindow, mockWindow.document, mockWindow.localStorage, mockWindow.sessionStorage, mockWindow.location, console, mockWindow.showToast
);

async function runSecurityTests() {
    const activeCourse = mockState.pensum[0]; // Contabilidad General, 4to A, Bimestre 1

    // 1. TEST MATERIA INCORRECTA (Debe rechazar con "¡Cuadro Erróneo!")
    console.log('\n--- Test 1: Rechazo si el cuadro es de otra materia ---');
    const wrongSubjRows = [
        ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES'],
        ['Catedra:', 'Matematica Comercial', 'Catedratico:', 'PEM. Nehemias Yalil Salguero'],
        ['Grado:', '4to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '1o. Bimestre'],
        ['Ponderacion Oficial:', 'Zona: 40', 'Examen: 60'],
        [],
        ['No.', 'Apellidos y Nombres', 'Act 1 (10 pts)', 'Total Zona', 'Examen', 'Total'],
        [1, 'Gómez Martínez, Carlos Estuardo', 10, 10, 50, 60]
    ];
    await processGradebookImportRows(wrongSubjRows, activeCourse, 1, 'Cuadro_Mate.xlsx');
    console.log("DEBUG TOAST:", lastToast);
    assert(lastToast.msg.includes('¡Cuadro Erróneo!'), 'Debe alertar ¡Cuadro Erróneo!');
    assert.strictEqual(mockState.students[0].grades['Contabilidad General'][0], 0, 'No debe modificar calificaciones');
    console.log('✅ TEST 1 APROBADO: Cuadro de otra materia rechazado en el acto.');

    // 2. TEST BIMESTRE INCORRECTO (Debe rechazar si el archivo es Bimestre 2 y en pantalla está Bimestre 1)
    console.log('\n--- Test 2: Rechazo si el cuadro es de otro bimestre ---');
    const wrongBimRows = [
        ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES'],
        ['Catedra:', 'Contabilidad General', 'Catedratico:', 'PEM. Nehemias Yalil Salguero'],
        ['Grado:', '4to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '2o. Bimestre'],
        ['Ponderacion Oficial:', 'Zona: 40', 'Examen: 60'],
        [],
        ['No.', 'Apellidos y Nombres', 'Act 1 (10 pts)', 'Total Zona', 'Examen', 'Total'],
        [1, 'Gómez Martínez, Carlos Estuardo', 10, 10, 50, 60]
    ];
    await processGradebookImportRows(wrongBimRows, activeCourse, 1, 'Cuadro_B2.xlsx');
    assert(lastToast.msg.includes('¡Bimestre Incorrecto!'), 'Debe alertar ¡Bimestre Incorrecto!');
    assert.strictEqual(mockState.students[0].grades['Contabilidad General'][0], 0, 'No debe modificar calificaciones');
    console.log('✅ TEST 2 APROBADO: Cuadro de otro bimestre rechazado.');

    // 3. TEST SECCIÓN INCORRECTA (Debe rechazar si el archivo es de Sección B y en pantalla está Sección A)
    console.log('\n--- Test 3: Rechazo si el cuadro es de otra sección ---');
    const wrongSecRows = [
        ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES'],
        ['Catedra:', 'Contabilidad General', 'Catedratico:', 'PEM. Nehemias Yalil Salguero'],
        ['Grado:', '4to Perito Contador', 'Seccion:', 'Sección B', 'Bimestre:', '1o. Bimestre'],
        ['Ponderacion Oficial:', 'Zona: 40', 'Examen: 60'],
        [],
        ['No.', 'Apellidos y Nombres', 'Act 1 (10 pts)', 'Total Zona', 'Examen', 'Total'],
        [1, 'Gómez Martínez, Carlos Estuardo', 10, 10, 50, 60]
    ];
    await processGradebookImportRows(wrongSecRows, activeCourse, 1, 'Cuadro_SecB.xlsx');
    assert(lastToast.msg.includes('¡Sección Incorrecta!'), 'Debe alertar ¡Sección Incorrecta!');
    assert.strictEqual(mockState.students[0].grades['Contabilidad General'][0], 0, 'No debe modificar calificaciones');
    console.log('✅ TEST 3 APROBADO: Cuadro de otra sección rechazado.');

    // 4. TEST DOCENTE INCORRECTO (Debe rechazar si pertenece a otro profesor)
    console.log('\n--- Test 4: Rechazo si el cuadro pertenece a otro docente ---');
    const wrongTeacherRows = [
        ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES'],
        ['Catedra:', 'Contabilidad General', 'Catedratico:', 'Prof. Juan Perez Morales'],
        ['Grado:', '4to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '1o. Bimestre'],
        ['Ponderacion Oficial:', 'Zona: 40', 'Examen: 60'],
        [],
        ['No.', 'Apellidos y Nombres', 'Act 1 (10 pts)', 'Total Zona', 'Examen', 'Total'],
        [1, 'Gómez Martínez, Carlos Estuardo', 10, 10, 50, 60]
    ];
    await processGradebookImportRows(wrongTeacherRows, activeCourse, 1, 'Cuadro_OtroDocente.xlsx');
    assert(lastToast.msg.includes('¡Cátedra de Otro Docente!'), 'Debe alertar ¡Cátedra de Otro Docente!');
    assert.strictEqual(mockState.students[0].grades['Contabilidad General'][0], 0, 'No debe modificar calificaciones');
    console.log('✅ TEST 4 APROBADO: Cuadro de otro docente rechazado.');

    // 5. TEST IMPORTACIÓN EXITOSA CON COTEJO ESTRICTO DE NOMBRES
    console.log('\n--- Test 5: Aceptación exitosa cuando todo coincide ---');
    const validRows = [
        ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES'],
        ['Catedra:', 'Contabilidad General', 'Catedratico:', 'PEM. Nehemias Yalil Salguero'],
        ['Grado:', '4to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '1o. Bimestre'],
        ['Ponderacion Oficial:', 'Zona: 40', 'Examen: 60'],
        [],
        ['No.', 'Apellidos y Nombres', 'Act 1: Libro Diario (15 pts)', 'Total Zona', 'Examen', 'Total'],
        [1, 'Gómez Martínez, Carlos Estuardo', 15, 15, 60, 75],
        [2, 'Alumno Desconocido Que No Existe', 15, 15, 60, 75] // Fila que debe omitirse
    ];
    await processGradebookImportRows(validRows, activeCourse, 1, 'Cuadro_Valido.xlsx');
    assert.strictEqual(mockState.students[0].grades['Contabilidad General'][0], 75, 'Debe asignar 75 a Carlos Gómez');
    assert(lastToast.msg.includes('¡Notas importadas con éxito'), 'Debe mostrar éxito');
    assert(lastToast.msg.includes('1 fila(s) omitida(s)'), 'Debe reportar 1 fila omitida por no coincidir el nombre');
    console.log('✅ TEST 5 APROBADO: Alumno coincidente calificado y alumno desconocido omitido.');

    console.log('\n========================================================================');
    console.log('🎉 ¡TODAS LAS PRUEBAS DE SEGURIDAD ESTRICTA (7 REGLAS) PASARON AL 100%!');
    console.log('========================================================================\n');
}

runSecurityTests().catch(err => {
    console.error('❌ Error en pruebas:', err);
    process.exit(1);
});
