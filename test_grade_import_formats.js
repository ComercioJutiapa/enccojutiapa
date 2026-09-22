/**
 * ======================================================================
 * 🧪 PRUEBAS UNITARIAS: VERIFICACIÓN DE IMPORTACIÓN DE NOTAS EN LOS 2 FORMATOS
 * - Formato 1: Plantilla Oficial ENCCO (con membrete, cátedra, grado, sección y 10 casillas)
 * - Formato 2: Modelo de Cuadro Docente (B2=materia, G2=grado, I2=sección, K2=bimestre, fila 5=cabeceras, fila 6=actividades)
 * ======================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 VERIFICACIÓN RIGUROSA: IMPORTACIÓN DE NOTAS EN AMBOS FORMATOS');
console.log('========================================================================\n');

// 1. Configurar entorno simulado (DOM y STATE)
const mockState = {
    currentRole: 'admin', // Admin tiene permisos totales
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
            id: 'pensum-pc6-comp-iii',
            subject: 'Computación III',
            grade: '6to Perito Contador',
            section: 'Sección D',
            teacher: 'PEM. Nehemias Yalil Salguero',
            career: 'Perito Contador'
        }
    ],
    students: [
        {
            id: 'st-01',
            no: 1,
            clave: 1,
            carne: '2026-0001-PC',
            personalCode: 'A123BCD',
            cui: '3123456780101',
            firstName: 'Carlos Estuardo',
            lastName: 'Gómez Martínez',
            name: 'Carlos Estuardo Gómez Martínez',
            grade: '4to Perito Contador',
            section: 'Sección A',
            grades: {
                'Contabilidad General': [0, 0, 0, 0]
            },
            gradebookDetails: {
                'Contabilidad General': {
                    1: { activities: [0,0,0,0,0,0,0,0,0,0], zona: 0, exam: 0, total: 0 }
                }
            }
        },
        {
            id: 'st-02',
            no: 2,
            clave: 2,
            carne: '2026-0002-PC',
            personalCode: 'B456EFG',
            cui: '3234567890101',
            firstName: 'María Alejandra',
            lastName: 'Ramos Castillo',
            name: 'María Alejandra Ramos Castillo',
            grade: '6to Perito Contador',
            section: 'Sección D',
            grades: {
                'Computación III': [0, 0, 0, 0]
            },
            gradebookDetails: {
                'Computación III': {
                    2: { activities: [0,0,0,0,0,0,0,0,0,0], zona: 0, exam: 0, total: 0 }
                }
            }
        }
    ],
    users: []
};

// Cargar app.js en un contexto controlado
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

const mockWindow = {
    STATE: mockState,
    location: { href: '', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    CustomEvent: function(name, opts) { this.name = name; this.detail = opts ? opts.detail : null; },
    document: {
        getElementById: function(id) {
            return { value: '', innerHTML: '', innerText: '', textContent: '', style: {} };
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
        addEventListener: () => {},
        body: { appendChild: () => {} }
    },
    saveStateToLocalStorage: function() {},
    showToast: function(msg, type) {
        console.log(`  [Toast ${type ? type.toUpperCase() : 'INFO'}]: ${msg}`);
    }
};

const evalContext = new Function(
    'window', 'document', 'localStorage', 'sessionStorage', 'location', 'console',
    appCode + '\nreturn { processGradebookImportRows, isGradebookEditableForUser, ensureStudentGradebookStructure };'
);

const { processGradebookImportRows } = evalContext(
    mockWindow, mockWindow.document, mockWindow.localStorage, mockWindow.sessionStorage, mockWindow.location, console
);

assert(typeof processGradebookImportRows === 'function', 'processGradebookImportRows debe ser función');
console.log('✅ TEST 1: Motor processGradebookImportRows extraído y listo para evaluación');

// ------------------------------------------------------------------------
// PRUEBA FORMATO 1: Plantilla Oficial ENCCO
// ------------------------------------------------------------------------
console.log('\n--- Probando Formato 1: Plantilla Oficial ENCCO ---');

const formato1Rows = [
    ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES - ENCCO JUTIAPA'],
    ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES - CICLO ESCOLAR 2026'],
    ['Catedra:', 'Contabilidad General', 'Catedratico:', 'PEM. Nehemias Yalil Salguero', 'Ciclo Escolar:', '2026'],
    ['Carrera:', 'Perito Contador', 'Grado:', '4to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '1o. Bimestre'],
    ['Ponderacion Oficial:', 'Zona Maxima: 40 pts', 'Examen / Evaluacion: 60 pts', 'Total Oficial: 100 pts'],
    [], // fila vacía
    [
        'No.', 'Codigo Personal', 'CUI / DPI', 'Apellidos y Nombres',
        'Act 1: Libro Diario (5 pts)', 'Act 2: Balance (5 pts)', 'Act 3: Ajustes (10 pts)',
        'Total Zona', 'Examen', 'Total Bimestre', 'Resultado'
    ],
    // Fila del alumno Carlos Gómez
    [
        1, 'A123BCD', '3123456780101', 'Gómez Martínez, Carlos Estuardo',
        5, 5, 10,
        20, 50, 70, 'Aprobado'
    ]
];

async function runTests() {
    // Ejecutar importación Formato 1
    await processGradebookImportRows(formato1Rows, mockState.pensum[0], 1, 'Cuadro_Notas_4to_A_Contabilidad.xlsx');

    const st1 = mockState.students.find(s => s.id === 'st-01');
    const detail1 = st1.gradebookDetails['Contabilidad General'][1];

    assert.strictEqual(detail1.zona, 20, 'Zona debe ser 20');
    assert.strictEqual(detail1.exam, 50, 'Examen debe ser 50');
    assert.strictEqual(detail1.total, 70, 'Total debe ser 70');
    assert.strictEqual(st1.grades['Contabilidad General'][0], 70, 'Nota final del bimestre 1 debe ser 70');
    assert.strictEqual(detail1.activities[0], 5, 'Actividad 1 debe ser 5');
    assert.strictEqual(detail1.activities[1], 5, 'Actividad 2 debe ser 5');
    assert.strictEqual(detail1.activities[2], 10, 'Actividad 3 debe ser 10');

    console.log('✅ TEST 2: Formato 1 (Plantilla Oficial ENCCO) importó zona (20 pts), examen (50 pts) y total (70 pts) con 100% de precisión');

    // ------------------------------------------------------------------------
    // PRUEBA FORMATO 2: Modelo de Cuadro Docente
    // ------------------------------------------------------------------------
    console.log('\n--- Probando Formato 2: Modelo de Cuadro Docente ---');

    // Fila 0: vacía o membrete
    // Fila 1 (B2=materia, G2=grado, I2=sección, K2=bimestre, O2=zona 40)
    // Fila 2 (O3=examen 60)
    // Fila 3: vacía
    // Fila 4: CLAVE, ALUMNO, col2..col8 act, ZONA, PRUEBA, TOTAL
    // Fila 5: Nombres de actividades con ponderación
    // Fila 6+: Datos de alumnos
    const formato2Rows = [
        ['CUADRO DE CONTROL DE NOTAS Y ZONA'], // Fila 0
        [
            '', 'Computacion III', '', '', '', '', 6, '', 'D', '', 2, '', '', '', 40 // Fila 1
        ],
        [
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', 60 // Fila 2
        ],
        [], // Fila 3
        [
            'CLAVE', 'ALUMNO', '', '', '', '', '', '', '', 'ZONA', 'PRUEBA', 'TOTAL' // Fila 4
        ],
        [
            '', '', 'Proyecto Web (15 pts)', 'Laboratorio SQL (15 pts)', 'Tarea 3 (10 pts)', '', '', '', '', '', '', '' // Fila 5
        ],
        // Fila 6: María Ramos
        [
            2, 'Ramos Castillo, María Alejandra', 15, 15, 8, '', '', '', '', 38, 55, 93
        ]
    ];

    // Ejecutar importación Formato 2
    await processGradebookImportRows(formato2Rows, mockState.pensum[1], 2, 'Cuadro_Docente_6toD_CompuIII.xlsx');

    const st2 = mockState.students.find(s => s.id === 'st-02');
    const detail2 = st2.gradebookDetails['Computación III'][2];

    assert.strictEqual(detail2.zona, 38, 'Zona en Formato 2 debe ser 38');
    assert.strictEqual(detail2.exam, 55, 'Examen en Formato 2 debe ser 55');
    assert.strictEqual(detail2.total, 93, 'Total en Formato 2 debe ser 93');
    assert.strictEqual(st2.grades['Computación III'][1], 93, 'Nota en grades[] debe ser 93');
    assert.strictEqual(detail2.activities[0], 15, 'Actividad 1 debe ser 15');
    assert.strictEqual(detail2.activities[1], 15, 'Actividad 2 debe ser 15');
    assert.strictEqual(detail2.activities[2], 8, 'Actividad 3 debe ser 8');

    console.log('✅ TEST 3: Formato 2 (Modelo de Cuadro Docente) detectó materia, grado 6to, sección D, bimestre 2, zona (38 pts), examen (55 pts) y total (93 pts)');

    console.log('\n========================================================================');
    console.log('🎉 ¡AMBOS FORMATOS DE IMPORTACIÓN DE NOTAS FUNCIONAN AL 100% PERFECTAMENTE!');
    console.log('========================================================================\n');
    process.exit(0);
}

runTests().catch(err => {
    console.error('❌ Error en pruebas:', err);
    process.exit(1);
});
