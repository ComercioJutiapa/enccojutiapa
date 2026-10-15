const https = require('https');
const assert = require('assert');

function fetch(url) {
    return new Promise(resolve => {
        https.get(url, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
    });
}

function getCleanSectionLetter(str) {
    if (!str) return '';
    const s = String(str).toUpperCase();
    if (s.includes('SECCIÓN D') || s.endsWith(' D') || s.endsWith('-D') || s.includes('PC D') || s.endsWith('D')) return 'D';
    if (s.includes('SECCIÓN C') || s.endsWith(' C') || s.endsWith('-C') || s.includes('PC C') || s.endsWith('C')) return 'C';
    if (s.includes('SECCIÓN B') || s.endsWith(' B') || s.endsWith('-B') || s.includes('PC B') || s.endsWith('B')) return 'B';
    if (s.includes('SECCIÓN A') || s.endsWith(' A') || s.endsWith('-A') || s.includes('PC A') || s.endsWith('A')) return 'A';
    return '';
}

function formatStudentDisplayName(s) {
    if (!s) return '';
    if (s.name) return s.name;
    return `${s.lastName || ''} ${s.firstName || ''}`.trim();
}

async function run() {
    console.log("=== INICIANDO PRUEBA DE SEPARACIÓN ESTRICTA DE AMBAS ESTUDIANTES ===");
    
    const students = await fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
    assert(Array.isArray(students), "students debe ser array");

    global.STATE = {
        students: students,
        gradesList: [
            { id: "grd-5a", code: "5to A", name: "5to Perito Contador", section: "Sección A" },
            { id: "grd-5d", code: "5to D", name: "5to Perito Contador", section: "Sección D" }
        ]
    };

    function getAttendanceStudents(gradeCode, currentCourseObj = null) {
        const qGradeObj = (STATE.gradesList || []).find(g => g.code === gradeCode || g.id === gradeCode || g.name === gradeCode);
        const rawQ = `${gradeCode || ''} ${qGradeObj ? (qGradeObj.name + ' ' + qGradeObj.section) : ''} ${currentCourseObj ? (currentCourseObj.grade + ' ' + currentCourseObj.section + ' ' + (currentCourseObj.gradeCode || '')) : ''}`.toUpperCase();

        let qGradeNum = 0;
        if (rawQ.includes('6') || rawQ.includes('SEXTO') || rawQ.includes('6TO')) qGradeNum = 6;
        else if (rawQ.includes('5') || rawQ.includes('QUINTO') || rawQ.includes('5TO')) qGradeNum = 5;
        else if (rawQ.includes('4') || rawQ.includes('CUARTO') || rawQ.includes('4TO')) qGradeNum = 4;

        const qSec = getCleanSectionLetter(qGradeObj ? qGradeObj.section : (currentCourseObj ? (currentCourseObj.section || currentCourseObj.gradeCode) : gradeCode));

        let list = (STATE.students || []).filter(s => {
            if (!s) return false;
            if (s.grade === gradeCode || s.gradeCode === gradeCode) return true;
            if (qGradeObj && (s.grade === qGradeObj.code || s.gradeCode === qGradeObj.code || s.grade === qGradeObj.id || s.gradeCode === qGradeObj.id)) return true;

            const rawS = `${s.grade || ''} ${s.gradeCode || ''} ${s.gradeLabel || ''}`.toUpperCase();
            let sGradeNum = 0;
            if (rawS.includes('6') || rawS.includes('SEXTO') || rawS.includes('6TO')) sGradeNum = 6;
            else if (rawS.includes('5') || rawS.includes('QUINTO') || rawS.includes('5TO')) sGradeNum = 5;
            else if (rawS.includes('4') || rawS.includes('CUARTO') || rawS.includes('4TO')) sGradeNum = 4;

            const sSec = getCleanSectionLetter(s.section || s.gradeCode || s.gradeLabel || rawS);

            if (qGradeNum > 0 && sGradeNum > 0 && qGradeNum !== sGradeNum) return false;
            if (qSec && sSec && qSec !== sSec) return false;

            return (qGradeNum === sGradeNum) && (!qSec || !sSec || qSec === sSec);
        });
        return list;
    }

    // 1. Verificar estudiantes de 5to A
    const list5toA = getAttendanceStudents('5to A');
    console.log(`1. Total estudiantes en 5to A: ${list5toA.length}`);
    assert.strictEqual(list5toA.length, 37, "5to A debe tener exactamente 37 estudiantes");

    const aliciaIn5toA = list5toA.find(s => s.personalCode === 'G482XGW');
    assert(aliciaIn5toA, "Alicia Carolina DEBE estar en 5to A");
    assert.strictEqual(aliciaIn5toA.name, "RAMOS FLORIÁN ALICIA CAROLINA");
    assert.strictEqual(aliciaIn5toA.carne, "2026-QA-035");
    console.log("  ✓ Alicia Carolina encontrada en 5to A:", aliciaIn5toA.name, aliciaIn5toA.carne);

    const dulceIn5toA = list5toA.find(s => s.personalCode === 'E195FVT');
    assert(!dulceIn5toA, "Dulce María NUNCA debe estar en 5to A");
    console.log("  ✓ Confirmado: Dulce María NO aparece en 5to A.");

    // 2. Verificar estudiantes de 5to D
    const list5toD = getAttendanceStudents('5to D');
    console.log(`2. Total estudiantes en 5to D: ${list5toD.length}`);
    assert.strictEqual(list5toD.length, 36, "5to D debe tener exactamente 36 estudiantes");

    const dulceIn5toD = list5toD.find(s => s.personalCode === 'E195FVT');
    assert(dulceIn5toD, "Dulce María DEBE estar en 5to D");
    assert.strictEqual(dulceIn5toD.name, "RAMOS FLORIÁN DULCE MARÍA");
    assert.strictEqual(dulceIn5toD.carne, "2026-QD-025");
    assert(dulceIn5toD.academicExceptions && dulceIn5toD.academicExceptions.length > 0, "Dulce María debe tener su excepción de exoneración");
    console.log("  ✓ Dulce María encontrada en 5to D:", dulceIn5toD.name, dulceIn5toD.carne, "con excepción médica.");

    const aliciaIn5toD = list5toD.find(s => s.personalCode === 'G482XGW');
    assert(!aliciaIn5toD, "Alicia Carolina NUNCA debe estar en 5to D");
    console.log("  ✓ Confirmado: Alicia Carolina NO aparece en 5to D.");

    // 3. Verificar asistencias de Dulce en 5to D
    const att5toD = await fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/attendanceRecords/2026_M10_5to%20D.json');
    assert(att5toD['E195FVT'] || att5toD['2026-QD-025'] || att5toD['stu-sire-E195FVT'], "Dulce debe tener registro de asistencia en 5to D");
    console.log("3. Registro de asistencia de Dulce en 5to D intacto:", att5toD['E195FVT']);

    console.log("\n========================================================");
    console.log("✅ TODAS LAS PRUEBAS DE SEPARACIÓN PASARON SATISFACTORIAMENTE AL 100%");
    console.log("========================================================");
}

run().catch(err => {
    console.error("❌ ERROR EN TEST:", err);
    process.exit(1);
});
