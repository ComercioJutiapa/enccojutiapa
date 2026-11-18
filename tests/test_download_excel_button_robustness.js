const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function extractFunction(source, funcName) {
    const start = source.indexOf('function ' + funcName);
    if (start === -1) throw new Error('Function ' + funcName + ' not found');
    let braceCount = 0;
    let started = false;
    let end = start;
    for (let i = start; i < source.length; i++) {
        if (source[i] === '{') {
            braceCount++;
            started = true;
        } else if (source[i] === '}') {
            braceCount--;
            if (started && braceCount === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return source.substring(start, end);
}

const elements = {
    'printModelCareerSelect': { value: 'Perito Contador' },
    'printModelGradeSelect': { value: '4_perito_contador_a' },
    'printModelTypeSelect': { value: 'CUADRO_CALIFICACIONES_EXCEL' },
    'printModelFillModeSelect': { value: 'lleno' },
    'printModelSubjectSelect': { value: 'Introducción a la Economía', options: [{ value: 'Introducción a la Economía', dataset: { teacher: 'Williams Esmely Gudiel Paredes' } }], selectedIndex: 0 },
    'printModelSubjectName': { value: 'Introducción a la Economía' },
    'printModelTeacherName': { value: 'Williams Esmely Gudiel Paredes' },
    'printModelBimestreSelect': { value: '1' },
    'printModelStatsGuide': { textContent: '' },
    'printDocumentModal': { classList: { add: () => {}, remove: () => {} } },
    'printDocumentContent': { innerHTML: '<table><tr><td>Test</td></tr></table>' }
};

const XLSX = require(path.join(__dirname, '..', 'xlsx.full.min.js'));

let downloadedFiles = [];

// Mock XLSX.writeFile to capture output
XLSX.writeFile = (wb, filename) => {
    downloadedFiles.push(filename);
};

const sandbox = {
    window: { XLSX },
    XLSX,
    document: {
        getElementById: (id) => elements[id] || null,
        createElement: (tag) => ({
            style: {},
            click: () => {},
            appendChild: () => {},
            removeChild: () => {}
        }),
        body: { appendChild: () => {}, removeChild: () => {} }
    },
    URL: {
        createObjectURL: (blob) => 'blob:test',
        revokeObjectURL: (url) => {}
    },
    Blob: class Blob {
        constructor(parts, options) {
            this.parts = parts;
            this.options = options;
        }
    },
    STATE: {
        activeCycle: '2026',
        currentRole: 'admin',
        schoolHeader: { schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES' },
        gradesList: [
            { code: '4_perito_contador_a', name: '4to Perito Contador', section: 'A', career: 'Perito Contador', guideTeacher: 'Williams Esmely Gudiel Paredes' }
        ],
        pensum: [
            { id: 'p1', grade: '4to Perito Contador', gradeCode: '4_perito_contador_a', section: 'A', subject: 'Introducción a la Economía', teacher: 'Williams Esmely Gudiel Paredes' }
        ],
        students: [
            { id: 's1', carne: 'ENCCO-2026-001', personalCode: 'A123BCD', cui: '1234567890101', name: 'Alvarez, Juan', grade: '4_perito_contador_a', section: 'A', status: 'Activo', gradebookDetails: {} }
        ]
    },
    console,
    showToast: (msg, type) => {},
    parseInt,
    parseFloat,
    String,
    Array,
    Math,
    Date
};

sandbox.getEffectiveActiveBimestre = () => 1;
sandbox.getCleanSectionLetter = (s) => (s && s.includes('A')) ? 'A' : 'A';
sandbox.getFullOfficialSubjectName = (s) => s || 'Introducción a la Economía';
sandbox.isCourseAssignedToTeacher = () => true;
sandbox.getGradingConfig = () => ({ zonaMax: 40, examMax: 60, activities: [] });
sandbox.getSortedGradebookStudents = () => sandbox.STATE.students;
sandbox.formatStudentDisplayName = (s) => s.name;
sandbox.isStudentRetiredInBimestre = () => false;
sandbox.isSubjectBimestreExonerated = () => false;
sandbox.isStudentExonerated = () => false;
sandbox.getStudentAssignedGuardianInfo = () => ({ isAssigned: false, name: '', dpi: '' });
sandbox.getGradeGuideTeacher = () => ({ name: 'Williams Esmely Gudiel Paredes' });
sandbox.applyInstitutionalStylesToWorksheet = () => {};

const code = extractFunction(appJs, 'generateOfficialExcelList');

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const formats = ['CUADRO_CALIFICACIONES_EXCEL', 'NOMINA_OFICIAL', 'ASISTENCIA_MENSUAL', 'LISTA_COTEJO'];
for (const fmt of formats) {
    elements['printModelTypeSelect'].value = fmt;
    vm.runInContext(`generateOfficialExcelList({ modelType: '${fmt}' })`, sandbox);
}

assert.strictEqual(downloadedFiles.length, 4, 'Deben haberse generado los 4 formatos de Excel exitosamente');
assert(downloadedFiles[0].includes('Cuadro_Calificaciones'), 'Formato 1 debe ser Cuadro de Calificaciones');
assert(downloadedFiles[1].includes('Nomina_Oficial'), 'Formato 2 debe ser Nomina Oficial');
assert(downloadedFiles[2].includes('Control_Asistencia'), 'Formato 3 debe ser Control Asistencia');
assert(downloadedFiles[3].includes('Lista_Cotejo'), 'Formato 4 debe ser Lista de Cotejo');

console.log('✅ Test superado: generateOfficialExcelList genera y descarga los 4 formatos institucionales sin ReferenceError.');
