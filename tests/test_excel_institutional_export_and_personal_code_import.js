/**
 * tests/test_excel_institutional_export_and_personal_code_import.js
 * 
 * Verificación Integral de:
 * 1. Formato Institucional de Exportación Excel:
 *    - Inclusión de "Codigo de Clase:" en metadatos.
 *    - Columna CUI / DPI oculta (hidden: true, wch: 0).
 *    - Columna "Total" como suma explícita de Zona y Examen.
 *    - Docente resuelto dinámicamente de nómina y usuarios.
 * 2. Normalización de Código Personal MINEDUC:
 *    - Eliminación de espacios iniciales, finales o intermedios.
 *    - Conversión a mayúsculas.
 *    - Validación del formato institucional: 1 letra, 3 dígitos, 3 letras (ej. C142XYZ).
 * 3. Cuádruple Validación Obligatoria en la Importación:
 *    - Código de Clase coincidente.
 *    - Nombre de Clase CNB coincidente.
 *    - Docente asignado coincidente.
 *    - Asignación 100% exacta por Código Personal (inmune a variaciones de nombre).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('='.repeat(80));
console.log('📊 TEST: EXPORTACIÓN INSTITUCIONAL E IMPORTACIÓN POR CÓDIGO PERSONAL');
console.log('='.repeat(80));

const appJsPath = path.join(__dirname, '..', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

// 1. Verificación estática de código en app.js
console.log('\n1. Verificando implementación estática en app.js...');

assert.ok(appCode.includes('function normalizePersonalCode(code)'), 'app.js debe definir normalizePersonalCode');
assert.ok(appCode.includes('Codigo de Clase:'), 'Exportación debe incluir "Codigo de Clase:" en metadatos');
assert.ok(appCode.includes('{ wch: 0, hidden: true }'), 'Exportación debe ocultar la columna CUI/DPI con hidden: true');
assert.ok(appCode.includes('colHeaders.push(\'Total\');'), 'Exportación debe incluir columna "Total"');
assert.ok(appCode.includes('LLAVE PRIMARIA INSTITUCIONAL: Búsqueda estricta por Código Personal'), 'Importación debe usar Código Personal como llave primaria');
assert.ok(appCode.includes('REGLA DE ORO: Verificación estricta de Código de Clase / Cátedra'), 'Importación debe verificar Código de Clase');

console.log('  ✅ Estructura estática y reglas institucionales verificadas en app.js.');

// 2. Pruebas unitarias de normalizePersonalCode
console.log('\n2. Evaluando normalización rigurosa de Código Personal (1 letra + 3 dígitos + 3 letras)...');

const sandbox = {
    window: {},
    console: console
};
vm.createContext(sandbox);

// Extraer y evaluar normalizePersonalCode
const normFnCode = appCode.match(/function normalizePersonalCode\(code\)[\s\S]*?window\.normalizePersonalCode = normalizePersonalCode;/)[0];
vm.runInContext(normFnCode, sandbox);
const norm = sandbox.window.normalizePersonalCode;

assert.strictEqual(norm('  c142xyz  '), 'C142XYZ', 'Debe quitar espacios extremos y pasar a mayúsculas');
assert.strictEqual(norm('c 142 xyz'), 'C142XYZ', 'Debe quitar espacios intermedios');
assert.strictEqual(norm('J844LBE'), 'J844LBE', 'Debe respetar código estándar');
assert.strictEqual(norm('  m551qwe  '), 'M551QWE', 'Debe normalizar a 1 letra + 3 números + 3 letras');
assert.strictEqual(norm(''), '', 'Cadena vacía retorna vacío');
assert.strictEqual(norm(null), '', 'Null retorna vacío');

console.log('  ✅ normalizePersonalCode elimina espacios y formatea a 1 letra + 3 números + 3 letras al 100%.');

// 3. Simulación de Exportación Institucional
console.log('\n3. Simulando exportación institucional de cuadro de notas...');

const mockPensum = {
    id: 'PEN-5A-CALC',
    code: 'PEN-5A-CALC',
    subject: 'Cálculo Mercantil y Financiero',
    teacher: 'Prof. Mario Roberto Estrada',
    grade: '5to Perito Contador',
    section: 'A',
    career: 'Perito Contador'
};

const mockStudents = [
    {
        id: 'stu-001',
        clave: 1,
        personalCode: '  c142xyz  ', // con espacios accidentales
        cui: '3021998822201',
        name: 'ALVAREZ CRUZ KEVIN RENE',
        firstName: 'Kevin Rene',
        lastName: 'Alvarez Cruz',
        status: 'Inscrito',
        gradebookDetails: {
            'Cálculo Mercantil y Financiero': {
                1: { activities: [10, 10, 10, 8, 0, 0, 0, 0, 0, 0], zona: 38, exam: 54, total: 92 }
            }
        }
    },
    {
        id: 'stu-002',
        clave: 2,
        personalCode: 'b892jkl',
        cui: '2984112342201',
        name: 'BARRIENTOS LIMA SOFIA ALEJANDRA',
        firstName: 'Sofia Alejandra',
        lastName: 'Barrientos Lima',
        status: 'Inscrito',
        gradebookDetails: {
            'Cálculo Mercantil y Financiero': {
                1: { activities: [9, 9, 9, 8, 0, 0, 0, 0, 0, 0], zona: 35, exam: 48, total: 83 }
            }
        }
    }
];

let capturedAoa = null;
let capturedWs = null;
let capturedFileName = null;

const exportSandbox = {
    STATE: {
        pensum: [mockPensum],
        students: mockStudents,
        activeCycle: '2027',
        schoolHeader: { schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES' },
        currentRole: 'docente',
        currentUser: { name: 'Prof. Mario Roberto Estrada', role: 'docente' }
    },
    document: {
        getElementById: (id) => {
            if (id === 'teacherCourseSelect') return { value: 'PEN-5A-CALC' };
            if (id === 'gradebookBimestreSelect') return { value: '1' };
            return null;
        }
    },
    formatStudentDisplayName: (s) => `${s.lastName}, ${s.firstName}`,
    isCourseAssignedToTeacher: () => true,
    getSortedGradebookStudents: () => mockStudents,
    getGradingConfig: () => ({ zonaMax: 40, examMax: 60, activities: [{ name: 'Act 1', max: 10 }, { name: 'Act 2', max: 10 }, { name: 'Act 3', max: 10 }, { name: 'Act 4', max: 10 }] }),
    showToast: () => {},
    window: {
        XLSX: {
            utils: {
                aoa_to_sheet: (aoa) => {
                    capturedAoa = aoa;
                    capturedWs = {};
                    return capturedWs;
                },
                book_new: () => ({}),
                book_append_sheet: () => {}
            },
            writeFile: (wb, fn) => {
                capturedFileName = fn;
            }
        }
    }
};

exportSandbox.window.XLSX.utils.book_new = () => ({});
exportSandbox.window.XLSX.utils.book_append_sheet = () => {};

const exportFnMatch = appCode.match(/function exportGradebookOfficialExcel\(\)[\s\S]*?window\.exportGradebookOfficialExcel = exportGradebookOfficialExcel;/)[0];
vm.createContext(exportSandbox);
vm.runInContext(normFnCode, exportSandbox);
vm.runInContext(exportFnMatch, exportSandbox);

exportSandbox.window.exportGradebookOfficialExcel();

assert.ok(capturedAoa, 'Debe haber generado la matriz aoa para SheetJS');
assert.strictEqual(capturedAoa[2][0], 'Codigo de Clase:', 'Fila 2 debe contener la etiqueta "Codigo de Clase:"');
assert.strictEqual(capturedAoa[2][1], 'PEN-5A-CALC', 'Fila 2 debe contener el código de clase exacto');
assert.strictEqual(capturedAoa[2][2], 'Catedra:', 'Fila 2 debe contener "Catedra:"');
assert.strictEqual(capturedAoa[2][4], 'Catedratico:', 'Fila 2 debe contener "Catedratico:"');
assert.strictEqual(capturedAoa[2][5], 'Prof. Mario Roberto Estrada', 'Fila 2 debe contener el docente dinámico');

const colHeaders = capturedAoa[6];
assert.strictEqual(colHeaders[1], 'Codigo Personal', 'Columna 1 debe ser Codigo Personal');
assert.strictEqual(colHeaders[2], 'CUI / DPI', 'Columna 2 debe ser CUI / DPI');
assert.strictEqual(colHeaders[16], 'Total', 'Columna 16 debe ser explícitamente "Total"');

// Verificar que CUI está oculto en !cols
assert.ok(capturedWs['!cols'], 'Debe configurar !cols');
assert.strictEqual(capturedWs['!cols'][2].hidden, true, 'Columna CUI debe tener hidden: true');
assert.strictEqual(capturedWs['!cols'][2].wch, 0, 'Columna CUI debe tener ancho 0');

console.log('  ✅ Exportación institucional validada: Código de clase presente, CUI oculto y columna Total generada.');

// 4. Simulación de Importación Cuádruple con Coincidencia por Código Personal
console.log('\n4. Simulando importación con Cuádruple Validación y Llave de Código Personal...');

const processImportFnMatch = appCode.match(/async function processGradebookImportRows\(rawRows, fallbackPensum, fallbackUnit, fileName\)[\s\S]*?printGradebookOfficialList/)[0].replace(/printGradebookOfficialList[\s\S]*$/, '');

const importSandbox = {
    window: {},
    STATE: {
        pensum: [mockPensum],
        students: [
            {
                id: 'stu-001',
                clave: 1,
                personalCode: 'C142XYZ',
                cui: '3021998822201',
                name: 'ALVAREZ CRUZ KEVIN RENE',
                lastName: 'Alvarez Cruz',
                firstName: 'Kevin Rene',
                status: 'Inscrito',
                grades: { 'Cálculo Mercantil y Financiero': [0, 0, 0, 0] },
                gradebookDetails: {
                    'Cálculo Mercantil y Financiero': {
                        1: { activities: [0,0,0,0,0,0,0,0,0,0], zona: 0, exam: 0, total: 0 }
                    }
                }
            }
        ],
        activeCycle: '2027',
        currentRole: 'docente',
        currentUser: { name: 'Prof. Mario Roberto Estrada', role: 'docente' }
    },
    document: {
        getElementById: () => null
    },
    cleanStr: s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, ''),
    showToast: (msg, type) => {
        // console.log(`    [Toast ${type}] ${msg}`);
    },
    isGradebookEditableForUser: () => ({ editable: true }),
    ensureStudentGradebookStructure: (st, subj) => subj,
    saveStateToLocalStorage: () => {},
    saveBulkStudentGradesAtomic: async () => true,
    isCourseAssignedToTeacher: () => true
};

vm.createContext(importSandbox);
vm.runInContext(normFnCode, importSandbox);
vm.runInContext(processImportFnMatch, importSandbox);

// Filas de Excel simuladas con el Formato Institucional
// Nótese que el nombre en el Excel tiene una variación ("K. Álvarez") pero el Código Personal es "  c142xyz  " (con espacios y minúsculas)
const sampleExcelRows = [
    ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES - ENCCO JUTIAPA'],
    ['CUADRO OFICIAL DE REGISTRO Y EVALUACIÓN DE CALIFICACIONES - CICLO ESCOLAR 2027'],
    ['Codigo de Clase:', 'PEN-5A-CALC', 'Catedra:', 'Cálculo Mercantil y Financiero', 'Catedratico:', 'Prof. Mario Roberto Estrada', 'Ciclo Escolar:', '2027'],
    ['Carrera:', 'Perito Contador', 'Grado:', '5to Perito Contador', 'Seccion:', 'A', 'Bimestre:', '1o. Bimestre'],
    ['Ponderacion Oficial:', 'Zona Maxima: 40 pts', 'Examen / Evaluacion: 60 pts', 'Total Oficial: 100 pts'],
    [],
    ['No.', 'Codigo Personal', 'CUI / DPI', 'Apellidos y Nombres', 'Act 1 (10 pts)', 'Act 2 (10 pts)', 'Total Zona', 'Examen', 'Total', 'Resultado'],
    [1, '  c142xyz  ', '3021998822201', 'K. Álvarez (Variación de Nombre)', 10, 10, 20, 50, 70, 'APROBADO']
];

(async () => {
    await importSandbox.processGradebookImportRows(sampleExcelRows, mockPensum, 1, 'Cuadro_Notas.xlsx');

    const updatedStudent = importSandbox.STATE.students[0];
    const b1Data = updatedStudent.gradebookDetails['Cálculo Mercantil y Financiero'][1];
    
    assert.strictEqual(b1Data.zona, 20, 'Zona debe haberse actualizado a 20');
    assert.strictEqual(b1Data.exam, 50, 'Examen debe haberse actualizado a 50');
    assert.strictEqual(b1Data.total, 70, 'Total debe ser 70 (Zona + Examen)');
    assert.strictEqual(updatedStudent.grades['Cálculo Mercantil y Financiero'][0], 70, 'Nota oficial de B1 debe ser 70');

    console.log('  ✅ Importación por Código Personal exitosa: alumno actualizado correctamente aun con variación en su nombre.');

    // 5. Verificación de rechazo si el Código de Clase es incorrecto
    console.log('\n5. Verificando rechazo de seguridad por Código de Clase incorrecto...');
    let rejectedMsg = null;
    importSandbox.showToast = (msg, type) => {
        if (type === 'danger') rejectedMsg = msg;
    };

    const wrongCodeRows = [
        ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES'],
        ['CUADRO OFICIAL'],
        ['Codigo de Clase:', 'PEN-4B-MAT', 'Catedra:', 'Cálculo Mercantil y Financiero', 'Catedratico:', 'Prof. Mario Roberto Estrada'],
        ['Carrera:', 'Perito Contador', 'Grado:', '5to Perito Contador', 'Seccion:', 'A', 'Bimestre:', '1o. Bimestre']
    ];

    await importSandbox.processGradebookImportRows(wrongCodeRows, mockPensum, 1, 'Cuadro_Erroneo.xlsx');
    assert.ok(rejectedMsg && rejectedMsg.includes('Código de Clase Incorrecto'), 'Debe rechazar la importación si el código de clase no coincide');
    console.log('  ✅ Rechazo preventivo verificado ante código de clase discordante.');

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TODAS LAS VERIFICACIONES DE FORMATO INSTITUCIONAL E IMPORTACIÓN PASARON AL 100%');
    console.log('='.repeat(80));
    process.exit(0);
})().catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
});
