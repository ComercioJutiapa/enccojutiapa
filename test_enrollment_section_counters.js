// test_enrollment_section_counters.js
// Verificación del contador de estudiantes por sección en el módulo de inscripción

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log("================================================================================");
console.log("🧪 VERIFICACIÓN: CONTEO DE ESTUDIANTES POR SECCIÓN EN INSCRIPCIÓN");
console.log("================================================================================");

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');

// TEST 1: Elementos en plataforma.html
console.log("\n▶ [TEST 1] Verificando elementos visuales en plataforma.html...");
assert(html.includes('id="enrollmentSectionLiveBadge"'), "Falta el badge de conteo en vivo de la sección");
assert(html.includes('id="enrollmentAllSectionsSummaryCard"'), "Falta el panel de resumen de todas las secciones");
assert(html.includes('id="enrollmentSectionsDistributionGrid"'), "Falta la cuadrícula de distribución de secciones");
assert(html.includes('toggleEnrollmentSectionsSummary()'), "Falta la función toggle para ver cupos");
assert(html.includes('updateEnrollmentSectionLiveBadge()'), "Falta el onchange para actualizar el badge en vivo");
console.log("  ✅ Test 1 Superado: Controles de conteo y monitoreo presentes en el formulario.");

// TEST 2: Lógica de conteo en app.js
console.log("\n▶ [TEST 2] Verificando funciones en app.js...");
assert(appJs.includes("function getStudentsCountByGradeAndSection"), "Falta getStudentsCountByGradeAndSection");
assert(appJs.includes("function updateEnrollmentSectionLiveBadge"), "Falta updateEnrollmentSectionLiveBadge");
assert(appJs.includes("function renderEnrollmentSectionsDistribution"), "Falta renderEnrollmentSectionsDistribution");
assert(appJs.includes("function toggleEnrollmentSectionsSummary"), "Falta toggleEnrollmentSectionsSummary");
console.log("  ✅ Test 2 Superado: Funciones de conteo y distribución integradas en app.js.");

// TEST 3: Evaluación de conteos reales con 412 estudiantes
console.log("\n▶ [TEST 3] Evaluando distribución exacta de estudiantes...");

// Extraer funciones
function extractFunction(source, funcName) {
    const start = source.indexOf(`function ${funcName}`);
    if (start === -1) throw new Error(`Function ${funcName} not found`);
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

const sandbox = {
    window: {},
    STATE: {
        students: [],
        gradesList: [
            { code: '4to A', name: '4to Perito Contador', section: 'Sección A' },
            { code: '4to B', name: '4to Perito Contador', section: 'Sección B' },
            { code: '4to C', name: '4to Perito Contador', section: 'Sección C' },
            { code: '4to D', name: '4to Perito Contador', section: 'Sección D' },
            { code: '5to A', name: '5to Perito Contador', section: 'Sección A' },
            { code: '5to B', name: '5to Perito Contador', section: 'Sección B' },
            { code: '5to C', name: '5to Perito Contador', section: 'Sección C' },
            { code: '5to D', name: '5to Perito Contador', section: 'Sección D' },
            { code: '6to A', name: '6to Perito Contador', section: 'Sección A' },
            { code: '6to B', name: '6to Perito Contador', section: 'Sección B' },
            { code: '6to C', name: '6to Perito Contador', section: 'Sección C' },
            { code: '6to D', name: '6to Perito Contador', section: 'Sección D' }
        ]
    }
};
sandbox.window = sandbox;

const fnGetClean = extractFunction(appJs, 'getCleanSectionLetter');
const fnGetAssign = extractFunction(appJs, 'getStudentAssignment');
const fnCount = extractFunction(appJs, 'getStudentsCountByGradeAndSection');

vm.createContext(sandbox);
vm.runInContext(`${fnGetClean}\nwindow.getCleanSectionLetter = getCleanSectionLetter;\n${fnGetAssign}\nwindow.getStudentAssignment = getStudentAssignment;\n${fnCount}\nwindow.getStudentsCountByGradeAndSection = getStudentsCountByGradeAndSection;`, sandbox);

// Descargar los 412 estudiantes de Firebase para verificar conteos exactos
const https = require('https');
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

(async () => {
    sandbox.STATE.students = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
    assert.strictEqual(sandbox.STATE.students.length, 412, "Deben existir 412 alumnos");

    const expectedDistribution = {
        '4to A': 34,
        '4to B': 36,
        '4to C': 33,
        '4to D': 35,
        '5to A': 36,
        '5to B': 36,
        '5to C': 37,
        '5to D': 35,
        '6to A': 32,
        '6to B': 35,
        '6to C': 33,
        '6to D': 28
    };

    let totalActivos = 0;
    sandbox.STATE.gradesList.forEach(g => {
        const count = sandbox.getStudentsCountByGradeAndSection(g.name, g.section, g.code);
        totalActivos += count;
        const expected = expectedDistribution[g.code];
        console.log(`  - ${g.name} (${g.section}): ${count} inscritos (esperado: ${expected})`);
        assert.strictEqual(count, expected, `Conteo incorrecto en ${g.code}`);
    });

    assert.strictEqual(totalActivos, 410, "El total de alumnos activos debe ser 410 (+2 retirados = 412)");
    console.log(`  ✓ Total activo verificado: ${totalActivos} estudiantes (+2 retirados = 412).`);

    console.log("\n================================================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE CONTEO POR SECCIÓN PASARON EXITOSAMENTE (100%)");
    console.log("================================================================================");
})();
