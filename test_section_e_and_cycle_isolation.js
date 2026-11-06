// test_section_e_and_cycle_isolation.js
// Automated verification:
// 1. Strict cycle count isolation (2026 vs 2027)
// 2. Official support for 4to Sección E in 2027
// 3. Dynamic alphabetical order for any newly added section (e.g., 4to F, 5to E)
// 4. Real-time reactivity without data loss

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log("================================================================================");
console.log("🧪 PRUEBA AUTOMATIZADA: AISLAMIENTO DE CICLOS Y SECCIÓN 4TO E (2027)");
console.log("================================================================================");

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const archiverJs = fs.readFileSync(path.join(__dirname, 'cycle_archiver.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');

// Helper to extract function
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

// 1. Test Regex & Section parsing past 'D'
console.log("\n▶ [TEST 1] Verificando soporte de letras de sección superiores a 'D' (Sección E, F, etc.)...");
assert(archiverJs.includes("([A-Z])\\b/i"), "cycle_archiver.js debe admitir secciones con letras [A-Z]");
assert(appJs.includes("([A-Z])/i"), "app.js debe admitir secciones [A-Z]");
console.log("  ✅ Test 1 Superado: Regexes universales [A-Z] validadas en cycle_archiver y app.js.");

// 2. Prepare Sandbox environment
const mockDOM = {
    elements: {},
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                id,
                value: '',
                innerHTML: '',
                style: {},
                options: [],
                selectedIndex: 0,
                setAttribute(k, v) { this[k] = v; },
                getAttribute(k) { return this[k]; }
            };
        }
        return this.elements[id];
    }
};

const sandbox = {
    window: {},
    document: mockDOM,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    STATE: {
        activeCycle: '2026',
        students: [],
        gradesList: [
            { id: "grd-4a", code: '4to A', name: '4to Perito Contador', section: 'Sección A', career: 'Perito Contador' },
            { id: "grd-4b", code: '4to B', name: '4to Perito Contador', section: 'Sección B', career: 'Perito Contador' },
            { id: "grd-4c", code: '4to C', name: '4to Perito Contador', section: 'Sección C', career: 'Perito Contador' },
            { id: "grd-4d", code: '4to D', name: '4to Perito Contador', section: 'Sección D', career: 'Perito Contador' },
            { id: "grd-4e", code: '4to E', name: '4to Perito Contador', section: 'Sección E', career: 'Perito Contador' },
            { id: "grd-5a", code: '5to A', name: '5to Perito Contador', section: 'Sección A', career: 'Perito Contador' },
            { id: "grd-5b", code: '5to B', name: '5to Perito Contador', section: 'Sección B', career: 'Perito Contador' },
            { id: "grd-5c", code: '5to C', name: '5to Perito Contador', section: 'Sección C', career: 'Perito Contador' },
            { id: "grd-5d", code: '5to D', name: '5to Perito Contador', section: 'Sección D', career: 'Perito Contador' },
            { id: "grd-6a", code: '6to A', name: '6to Perito Contador', section: 'Sección A', career: 'Perito Contador' },
            { id: "grd-6b", code: '6to B', name: '6to Perito Contador', section: 'Sección B', career: 'Perito Contador' },
            { id: "grd-6c", code: '6to C', name: '6to Perito Contador', section: 'Sección C', career: 'Perito Contador' },
            { id: "grd-6d", code: '6to D', name: '6to Perito Contador', section: 'Sección D', career: 'Perito Contador' }
        ]
    }
};
sandbox.window = sandbox;

const fnKey = extractFunction(appJs, 'getGradeSectionCanonicalKey');
const fnDedupGrades = extractFunction(appJs, 'deduplicateGradesCollection');
const fnWeight = extractFunction(appJs, 'getGradeWeight');
const fnSort = extractFunction(appJs, 'sortGrades');
const fnCleanSec = extractFunction(appJs, 'getCleanSectionLetter');
const fnAssign = extractFunction(appJs, 'getStudentAssignment');
const fnFilterCycle = extractFunction(appJs, 'getCycleFilteredStudents');
const fnCount = extractFunction(appJs, 'getStudentsCountByGradeAndSection');
const fnRenderDist = extractFunction(appJs, 'renderEnrollmentSectionsDistribution');

vm.createContext(sandbox);
vm.runInContext(`
    ${fnKey}
    ${fnDedupGrades}
    ${fnWeight}
    ${fnSort}
    ${fnCleanSec}
    ${fnAssign}
    ${fnFilterCycle}
    ${fnCount}
    ${fnRenderDist}
    window.getGradeSectionCanonicalKey = getGradeSectionCanonicalKey;
    window.deduplicateGradesCollection = deduplicateGradesCollection;
    window.getGradeWeight = getGradeWeight;
    window.sortGrades = sortGrades;
    window.getCleanSectionLetter = getCleanSectionLetter;
    window.getStudentAssignment = getStudentAssignment;
    window.getCycleFilteredStudents = getCycleFilteredStudents;
    window.getStudentsCountByGradeAndSection = getStudentsCountByGradeAndSection;
    window.renderEnrollmentSectionsDistribution = renderEnrollmentSectionsDistribution;
`, sandbox);

// Seed 2026 students (simulating base)
for (let i = 1; i <= 34; i++) {
    sandbox.STATE.students.push({
        id: `stu-2026-4a-${i}`,
        carne: `ENCCO-2026-${String(i).padStart(3, '0')}`,
        name: `Estudiante 4A #${i}`,
        grade: '4to Perito Contador',
        section: 'Sección A',
        gradeCode: '4to A',
        cycle: '2026',
        status: 'Activo'
    });
}
for (let i = 1; i <= 35; i++) {
    sandbox.STATE.students.push({
        id: `stu-2026-4d-${i}`,
        carne: `ENCCO-2026-${String(i+100).padStart(3, '0')}`,
        name: `Estudiante 4D #${i}`,
        grade: '4to Perito Contador',
        section: 'Sección D',
        gradeCode: '4to D',
        cycle: '2026',
        status: 'Activo'
    });
}

// TEST 2: Strict Isolation Test
console.log("\n▶ [TEST 2] Verificando aislamiento estricto de conteos entre 2026 y 2027...");

// En ciclo 2026
mockDOM.getElementById('studentFormCycle').value = '2026';
let count4A_2026 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección A', '4to A', '2026');
let count4D_2026 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección D', '4to D', '2026');
let count4E_2026 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección E', '4to E', '2026');

assert.strictEqual(count4A_2026, 34, "4to A en 2026 debe tener 34 estudiantes");
assert.strictEqual(count4D_2026, 35, "4to D en 2026 debe tener 35 estudiantes");
assert.strictEqual(count4E_2026, 0, "4to E en 2026 debe tener 0 estudiantes");
console.log(`  ✓ Conteo 2026 verificado: 4to A = ${count4A_2026}, 4to D = ${count4D_2026}, 4to E = ${count4E_2026}`);

// Ahora inscribimos estudiantes en 2027:
// 2 estudiantes en 4to A (2027)
// 5 estudiantes en 4to E (2027)
sandbox.STATE.students.push({
    id: 'stu-2027-4a-1',
    carne: 'ENCCO-2027-001',
    name: 'Nuevo 2027 4A 1',
    grade: '4to Perito Contador',
    section: 'Sección A',
    gradeCode: '4to A',
    cycle: '2027',
    status: 'Activo'
});
sandbox.STATE.students.push({
    id: 'stu-2027-4a-2',
    carne: 'ENCCO-2027-002',
    name: 'Nuevo 2027 4A 2',
    grade: '4to Perito Contador',
    section: 'Sección A',
    gradeCode: '4to A',
    cycle: '2027',
    status: 'Activo'
});
for (let i = 1; i <= 5; i++) {
    sandbox.STATE.students.push({
        id: `stu-2027-4e-${i}`,
        carne: `ENCCO-2027-${String(i+10).padStart(3, '0')}`,
        name: `Nuevo 2027 4E #${i}`,
        grade: '4to Perito Contador',
        section: 'Sección E',
        gradeCode: '4to E',
        cycle: '2027',
        status: 'Activo'
    });
}

// Comprobar que en 2026 NINGÚN dato de 2027 se mezcló:
count4A_2026 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección A', '4to A', '2026');
count4E_2026 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección E', '4to E', '2026');
assert.strictEqual(count4A_2026, 34, "4to A en 2026 debe seguir teniendo 34 (NO debe mezclarse con 2027)");
assert.strictEqual(count4E_2026, 0, "4to E en 2026 debe seguir teniendo 0");
console.log("  ✅ Test 2.1: Los datos de 2027 NO afectan ni se mezclan en el ciclo 2026.");

// Comprobar que en 2027 SOLO se cuentan los estudiantes de 2027:
mockDOM.getElementById('studentFormCycle').value = '2027';
let count4A_2027 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección A', '4to A', '2027');
let count4D_2027 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección D', '4to D', '2027');
let count4E_2027 = sandbox.getStudentsCountByGradeAndSection('4to Perito Contador', 'Sección E', '4to E', '2027');
assert.strictEqual(count4A_2027, 2, "4to A en 2027 debe tener exactamente 2 estudiantes");
assert.strictEqual(count4D_2027, 0, "4to D en 2027 debe tener 0 estudiantes");
assert.strictEqual(count4E_2027, 5, "4to E en 2027 debe tener exactamente 5 estudiantes");
console.log(`  ✓ Conteo 2027 aislado verificado: 4to A = ${count4A_2027}, 4to D = ${count4D_2027}, 4to E = ${count4E_2027}`);
console.log("  ✅ Test 2.2: Ciclo 2027 contabilizado estrictamente sin mezclar datos de 2026.");

// TEST 3: Renderizado de la distribución con Sección E
console.log("\n▶ [TEST 3] Verificando panel de distribución dinámica y orden correlativo...");
mockDOM.getElementById('studentFormCycle').value = '2027';
sandbox.renderEnrollmentSectionsDistribution();

const titleEl = mockDOM.getElementById('enrollmentAllSectionsSummaryTitle');
assert(titleEl.innerHTML.includes('Ciclo 2027'), "El título debe indicar explícitamente Ciclo 2027");
console.log(`  ✓ Título dinámico actualizado: ${titleEl.innerHTML}`);

const gridEl = mockDOM.getElementById('enrollmentSectionsDistributionGrid');
assert(gridEl.innerHTML.includes('Sección E'), "La Sección E debe renderizarse en el grid");
assert(gridEl.innerHTML.includes('5'), "La Sección E debe mostrar sus 5 inscritos");
console.log("  ✅ Test 3 Superado: Grid muestra 4to Sección E con su respectivo conteo en 2027.");

// TEST 4: Adición dinámica de una nueva sección (ej: 4to F y 5to E)
console.log("\n▶ [TEST 4] Simulando creación dinámica de una nueva sección (4to F)...");
sandbox.STATE.gradesList.push({
    id: "grd-4f",
    code: '4to F',
    name: '4to Perito Contador',
    section: 'Sección F',
    career: 'Perito Contador'
});
sandbox.STATE.gradesList = sandbox.sortGrades(sandbox.STATE.gradesList);

// Inscribir 3 estudiantes en 4to F
for (let i = 1; i <= 3; i++) {
    sandbox.STATE.students.push({
        id: `stu-2027-4f-${i}`,
        carne: `ENCCO-2027-${String(i+20).padStart(3, '0')}`,
        name: `Nuevo 2027 4F #${i}`,
        grade: '4to Perito Contador',
        section: 'Sección F',
        gradeCode: '4to F',
        cycle: '2027',
        status: 'Activo'
    });
}

sandbox.renderEnrollmentSectionsDistribution();
const updatedGrid = mockDOM.getElementById('enrollmentSectionsDistributionGrid').innerHTML;
assert(updatedGrid.includes('Sección F'), "La nueva Sección F debe mostrarse dinámicamente");
assert(updatedGrid.includes('3'), "La nueva Sección F debe mostrar sus 3 estudiantes inscritos");

// Verificar orden correlativo: A antes de B, B antes de C, C antes de D, D antes de E, E antes de F
const posA = updatedGrid.indexOf('Sección A');
const posB = updatedGrid.indexOf('Sección B');
const posC = updatedGrid.indexOf('Sección C');
const posD = updatedGrid.indexOf('Sección D');
const posE = updatedGrid.indexOf('Sección E');
const posF = updatedGrid.indexOf('Sección F');

assert(posA < posB && posB < posC && posC < posD && posD < posE && posE < posF, "El orden alfabético correlativo de secciones debe ser A -> B -> C -> D -> E -> F");
console.log("  ✅ Test 4 Superado: Nueva sección 4to F agregada dinámicamente y ordenada alfabéticamente (A->B->C->D->E->F).");

// TEST 5: Verificación estricta de NO duplicidad de Sección E
console.log("\n▶ [TEST 5] Verificando que 4to Sección E aparezca EXACTAMENTE UNA VEZ...");

// Simular caso donde Firebase ya contenía un ID personalizado para 4to E:
sandbox.STATE.gradesList.push({
    id: "grd-1793888165559-46",
    code: '4to E',
    name: '4to Perito Contador',
    section: 'Sección E',
    career: 'Perito Contador'
});

// Ejecutar deduplicación canónica
sandbox.STATE.gradesList = sandbox.deduplicateGradesCollection(sandbox.STATE.gradesList);

// Contar en gradesList cuántas secciones 4to E existen
const count4EInGrades = sandbox.STATE.gradesList.filter(g => {
    return (g.name || '').includes('4to') && (g.section || '').includes('E');
}).length;
assert.strictEqual(count4EInGrades, 1, `4to Sección E debe existir exactamente 1 vez en gradesList (obtenido: ${count4EInGrades})`);

// Renderizar panel de distribución
sandbox.renderEnrollmentSectionsDistribution();
const finalGrid = mockDOM.getElementById('enrollmentSectionsDistributionGrid').innerHTML;

// Contar cuántas tarjetas de selección aparecen para 4to Sección E en el panel
const cardMatches = finalGrid.match(/selectEnrollmentSectionFromSummary\('[^']*4to[^']*Secci[oó]n\s+E[^']*'\)/g);
assert(cardMatches && cardMatches.length === 1, `4to Sección E debe renderizarse exactamente en 1 tarjeta (obtenido: ${cardMatches ? cardMatches.length : 0})`);
console.log(`  ✓ Conteo de tarjetas en UI: 4to Sección E aparece exactamente 1 vez.`);
console.log("  ✅ Test 5 Superado: Cero duplicidad garantizada para 4to Sección E.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS VERIFICACIONES DE CICLO Y SECCIONES DINÁMICAS PASARON (100%)");
console.log("================================================================================");
