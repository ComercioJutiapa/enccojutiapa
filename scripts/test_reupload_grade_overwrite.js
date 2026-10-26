const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 VERIFICACIÓN COMPLETA: RE-SUBIDA DE EXCEL, SOBREESCRITURA DE EXAMEN Y PROMEDIO');
console.log('========================================================================\n');

// 1. Configurar entorno simulado (DOM y STATE)
const mockState = {
    currentRole: 'admin',
    activeCycle: '2026',
    config: { activeBimestre: 4, globalLocked: false },
    pensum: [
        {
            id: 'pensum-pc5-calculo',
            subject: 'Cálculo Mercantil y Financiero',
            grade: '5to Perito Contador',
            section: 'Sección A',
            teacher: 'PEM. Nehemias Yalil Salguero',
            career: 'Perito Contador',
            gradingConfig: {
                b4: { zonaMax: 40, examMax: 60 }
            }
        }
    ],
    students: [
        {
            id: 'stu-sire-G790ASN',
            no: 1,
            clave: 1,
            carne: '2026-QA-001',
            personalCode: 'G790ASN',
            cui: '3123456780101',
            firstName: 'Jenifer Estefania',
            lastName: 'Alvarez Cámbara',
            name: 'Jenifer Estefania Alvarez Cámbara',
            grade: '5to Perito Contador',
            section: 'Sección A',
            grades: {
                'Cálculo Mercantil y Financiero': [63, 63, 63, 40] // B4 estaba en 40 con Examen=0
            },
            gradebookDetails: {
                'Cálculo Mercantil y Financiero': {
                    1: { activities: [10,10,10,10,0,0,0,0,0,0], zona: 40, exam: 23, total: 63 },
                    2: { activities: [10,10,10,10,0,0,0,0,0,0], zona: 40, exam: 23, total: 63 },
                    3: { activities: [10,10,10,10,0,0,0,0,0,0], zona: 40, exam: 23, total: 63 },
                    4: { activities: [10,10,10,10,0,0,0,0,0,0], zona: 40, exam: 0, total: 40 } // Con examen en 0
                }
            }
        }
    ],
    users: []
};

// Cargar app.js en un contexto controlado
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const mockWindow = {
    STATE: mockState,
    location: { href: 'plataforma.html', search: '', hash: '', pathname: 'plataforma.html', replace: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    CustomEvent: function(name, opts) { this.name = name; this.detail = opts ? opts.detail : null; },
    document: {
        getElementById: function(id) {
            return { value: '4', innerHTML: '', innerText: '', textContent: '', style: {} };
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
    appCode + '\nreturn { processGradebookImportRows, getReportCardSubjectGrades };'
);

const { processGradebookImportRows, getReportCardSubjectGrades } = evalContext(
    mockWindow, mockWindow.document, mockWindow.localStorage, mockWindow.sessionStorage, mockWindow.location, console
);

// Archivo re-subido con Examen corregido a 35 (Total 75)
const reuploadRows = [
    ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES - ENCCO JUTIAPA'],
    ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES - CICLO ESCOLAR 2026'],
    ['Catedra:', 'Cálculo Mercantil y Financiero', 'Catedratico:', 'PEM. Nehemias Yalil Salguero', 'Ciclo Escolar:', '2026'],
    ['Carrera:', 'Perito Contador', 'Grado:', '5to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '4o. Bimestre'],
    ['Ponderacion Oficial:', 'Zona Maxima: 40 pts', 'Examen / Evaluacion: 60 pts', 'Total Oficial: 100 pts'],
    [],
    [
        'No.', 'Codigo Personal', 'CUI / DPI', 'Apellidos y Nombres',
        'Act 1: Lab 1 (10 pts)', 'Act 2: Lab 2 (10 pts)', 'Act 3: Tarea 1 (10 pts)', 'Act 4: Tarea 2 (10 pts)',
        'Total Zona', 'Examen', 'Total Bimestre', 'Resultado'
    ],
    // Fila de Jenifer Alvarez corregida con Examen = 35 y Total = 75
    [
        1, 'G790ASN', '3123456780101', 'ALVAREZ CÁMBARA, JENIFER ESTEFANIA',
        10, 10, 10, 10,
        40, 35, 75, 'Aprobado'
    ]
];

// Segundo caso: Archivo donde el docente sólo escribió la nota en el TOTAL (75) y dejó Examen en blanco o 0
const reuploadRowsTotalOnly = [
    ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES - ENCCO JUTIAPA'],
    ['CUADRO OFICIAL DE REGISTRO DE CALIFICACIONES - CICLO ESCOLAR 2026'],
    ['Catedra:', 'Cálculo Mercantil y Financiero', 'Catedratico:', 'PEM. Nehemias Yalil Salguero', 'Ciclo Escolar:', '2026'],
    ['Carrera:', 'Perito Contador', 'Grado:', '5to Perito Contador', 'Seccion:', 'Sección A', 'Bimestre:', '4o. Bimestre'],
    ['Ponderacion Oficial:', 'Zona Maxima: 40 pts', 'Examen / Evaluacion: 60 pts', 'Total Oficial: 100 pts'],
    [],
    [
        'No.', 'Codigo Personal', 'CUI / DPI', 'Apellidos y Nombres',
        'Act 1: Lab 1 (10 pts)', 'Act 2: Lab 2 (10 pts)', 'Act 3: Tarea 1 (10 pts)', 'Act 4: Tarea 2 (10 pts)',
        'Total Zona', 'Examen', 'Total Bimestre', 'Resultado'
    ],
    // Fila con Examen en 0 pero Total en 80
    [
        1, 'G790ASN', '3123456780101', 'ALVAREZ CÁMBARA, JENIFER ESTEFANIA',
        10, 10, 10, 10,
        40, 0, 80, 'Aprobado'
    ]
];

async function run() {
    console.log('--- TEST 1: Re-subida con Examen explícito = 35 (Total 75) ---');
    await processGradebookImportRows(reuploadRows, mockState.pensum[0], 4, 'Cuadro_Notas_5to_A_Calculo_B4.xlsx');

    const st = mockState.students[0];
    const d4 = st.gradebookDetails['Cálculo Mercantil y Financiero'][4];
    console.log('Resultado tras re-subir:');
    console.log('  Zona 4:', d4.zona);
    console.log('  Examen 4:', d4.exam);
    console.log('  Total B4:', d4.total);
    console.log('  grades[B4]:', st.grades['Cálculo Mercantil y Financiero'][3]);

    assert.strictEqual(d4.exam, 35, 'Examen 4 DEBE sobreescribirse a 35');
    assert.strictEqual(d4.total, 75, 'Total 4 DEBE ser 75');
    assert.strictEqual(st.grades['Cálculo Mercantil y Financiero'][3], 75, 'grades[3] DEBE ser 75');

    // Verificar promedio (Acumulado)
    const reportGrades = getReportCardSubjectGrades(st, 'Cálculo Mercantil y Financiero');
    console.log('  ReportCard Grades:', reportGrades);
    assert.strictEqual(reportGrades.b4, 75, 'b4 en reporte debe ser 75');
    assert.strictEqual(reportGrades.avg, 66, 'Promedio debe ser (63+63+63+75)/4 = 66');
    console.log('✅ TEST 1 SUPERADO: Examen sobreescrito y promedio recalculado correctamente.');

    console.log('\n--- TEST 2: Re-subida donde docente ingresó Total 80 con Examen en 0 (Derivación matemática) ---');
    await processGradebookImportRows(reuploadRowsTotalOnly, mockState.pensum[0], 4, 'Cuadro_Notas_5to_A_Calculo_B4.xlsx');
    console.log('Resultado Test 2:');
    console.log('  Zona 4:', d4.zona);
    console.log('  Examen 4:', d4.exam);
    console.log('  Total B4:', d4.total);
    assert.strictEqual(d4.exam, 40, 'Examen 4 DEBE derivarse como 80 - 40 = 40');
    assert.strictEqual(d4.total, 80, 'Total 4 DEBE ser 80');
    assert.strictEqual(st.grades['Cálculo Mercantil y Financiero'][3], 80, 'grades[3] DEBE ser 80');

    const reportGrades2 = getReportCardSubjectGrades(st, 'Cálculo Mercantil y Financiero');
    console.log('  ReportCard Grades Test 2:', reportGrades2);
    assert.strictEqual(reportGrades2.avg, 67, 'Promedio debe ser (63+63+63+80)/4 = 67.25 -> 67');
    console.log('✅ TEST 2 SUPERADO: Derivación matemática precisa.');
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Error en test:', err);
    process.exit(1);
});
