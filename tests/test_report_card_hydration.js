const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("================================================================================");
console.log("🧪 TEST SUITE: REPORTE DE BOLETÍN E INTEGRIDAD DE CARGA DE CALIFICACIONES (ENCCO)");
console.log("================================================================================");

// 1. Cargar contexto mínimo para evaluar app.js o funciones relevantes
const appJsPath = path.join(__dirname, '..', 'app.js');
const appCode = fs.readFileSync(appJsPath, 'utf8');

// Extraer getReportCardSubjectGrades
const extractFn = (name) => {
    const start = appCode.indexOf(`function ${name}`);
    if (start === -1) throw new Error(`Function ${name} not found`);
    let depth = 0;
    let end = start;
    let foundOpen = false;
    for (let i = start; i < appCode.length; i++) {
        if (appCode[i] === '{') {
            depth++;
            foundOpen = true;
        } else if (appCode[i] === '}') {
            depth--;
            if (foundOpen && depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return appCode.slice(start, end);
};

// Crear sandbox para ejecutar getReportCardSubjectGrades y dependencias
const sandbox = {
    window: { STATE: {} },
    STATE: {},
    console: console,
    Math: Math,
    parseInt: parseInt,
    Number: Number,
    Array: Array,
    Object: Object,
    Set: Set,
    isMateriaEspecialGraduacion: (subj) => {
        const s = (subj || '').toLowerCase();
        return s.includes('practica supervisada') || s.includes('práctica supervisada') || s.includes('seminario');
    },
    isSubjectBimestreExonerated: () => false,
    OFFICIAL_CNB_PENSUM_ORDER: {}
};
sandbox.window.STATE = sandbox.STATE;
vm.createContext(sandbox);

// Evaluar la función en el sandbox
const fnCode = extractFn('getReportCardSubjectGrades');
vm.runInContext(fnCode, sandbox);

// 2. Cargar estado de Firebase RTDB usando fetch
async function runTests() {
    console.log("1. Consultando Firebase RTDB en vivo...");
    const url = "https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json";
    const res = await fetch(url);
    assert.strictEqual(res.ok, true, "Respuesta de Firebase RTDB debe ser OK");
    const students = await res.json();
    assert(Array.isArray(students) && students.length >= 412, "Deben existir 412 estudiantes en RTDB");
    console.log(`   ✅ Cargados ${students.length} estudiantes desde RTDB.`);

    // 3. Verificar a Jenifer Alvarez (stu-sire-G790ASN)
    console.log("2. Verificando calificaciones de Jenifer Estefania Alvarez Cámbara...");
    const jenifer = students.find(s => s && s.id === 'stu-sire-G790ASN');
    assert(jenifer, "Jenifer Alvarez debe existir en la lista de estudiantes");

    const expectedSubjects = [
        'Catalogación y Archivo',
        'Computación II',
        'Contabilidad de Costos',
        'Cálculo Mercantil y Financiero',
        'Finanzas Públicas',
        'Geografía Económica',
        'Inglés Comercial II',
        'Legislación Fiscal y Aduanera',
        'Mecanografía'
    ];

    let totalAvgSum = 0;
    expectedSubjects.forEach(subj => {
        const result = sandbox.getReportCardSubjectGrades(jenifer, subj);
        console.log(`   📘 ${subj}: B1=${result.b1}, B2=${result.b2}, B3=${result.b3}, B4=${result.b4} | Promedio=${result.avg}`);
        assert(result.b1 > 0, `${subj} B1 debe ser mayor a 0, obtenido: ${result.b1}`);
        assert(result.b2 > 0, `${subj} B2 debe ser mayor a 0, obtenido: ${result.b2}`);
        assert(result.b3 > 0, `${subj} B3 debe ser mayor a 0, obtenido: ${result.b3}`);
        assert(result.b4 > 0, `${subj} B4 debe ser mayor a 0, obtenido: ${result.b4}`);
        assert(result.avg >= 60, `${subj} debe estar aprobada con promedio >= 60`);
        assert(result.b1 <= 100 && result.b2 <= 100 && result.b3 <= 100 && result.b4 <= 100, "Ninguna nota debe exceder 100");
        totalAvgSum += result.avg;
    });

    const overallAvg = Math.round(totalAvgSum / expectedSubjects.length);
    console.log(`   🌟 Promedio General de Jenifer Alvarez: ${overallAvg} puntos (APROBADO)`);
    assert(overallAvg >= 65, "Promedio general debe ser satisfactorio");

    // 4. Verificar Student 54 (Londri Chiquin)
    console.log("3. Verificando Student 54 (Londri Chiquin)...");
    const londri = students[54];
    assert.strictEqual(londri.id, 'stu-sire-F733HXY');
    const compuLondri = sandbox.getReportCardSubjectGrades(londri, 'Computación II');
    console.log(`   💻 Computación II Londri: B1=${compuLondri.b1}, B2=${compuLondri.b2}, B3=${compuLondri.b3}, B4=${compuLondri.b4}`);
    assert.strictEqual(compuLondri.b1, 96);
    assert.strictEqual(compuLondri.b2, 100);
    assert.strictEqual(compuLondri.b3, 90);
    assert.strictEqual(compuLondri.b4, 100);

    // 5. Verificar Seminario 6to PC en RTDB
    console.log("4. Verificando Seminario 6to PC...");
    const sextoPCStudents = students.filter(s => s && s.grade && (s.grade.includes('6to') || s.grade.includes('SEXTO')));
    assert(sextoPCStudents.length > 0, "Deben existir estudiantes de 6to");
    let countWithSemB4 = 0;
    sextoPCStudents.forEach(s => {
        const grades = s.grades || {};
        for (const [k, v] of Object.entries(grades)) {
            if (k.toLowerCase().includes('seminario') && Array.isArray(v) && v[3] > 0) {
                countWithSemB4++;
                break;
            }
        }
    });
    console.log(`   🎓 Estudiantes de 6to PC con Seminario B4 activo: ${countWithSemB4}/${sextoPCStudents.length}`);
    assert.strictEqual(countWithSemB4, sextoPCStudents.length, "Todos los estudiantes de 6to deben tener Seminario B4");

    console.log("================================================================================");
    console.log("🎉 ¡TODAS LAS PRUEBAS DE CARGA E INTEGRIDAD DE NOTAS PASARON EXITOSAMENTE!");
    console.log("================================================================================");
}

runTests().catch(err => {
    console.error("❌ ERROR EN TEST:", err);
    process.exit(1);
});
