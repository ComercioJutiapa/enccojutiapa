const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

const EXPECTED_4C_SOCIEDADES_B4 = [
    { id: 'stu-sire-F526YJG', acts: [4, 9, 5, 4, 10, 5, 4, 0, 0, 0], zona: 41, exam: 5, total: 46 },
    { id: 'stu-sire-H998XKG', acts: [4, 12, 4, 3, 8, 5, 0, 0, 0, 0], zona: 36, exam: 5, total: 41 },
    { id: 'stu-sire-H536IPM', acts: [5, 12, 4, 5, 7, 4, 8, 0, 0, 0], zona: 45, exam: 55, total: 100 },
    { id: 'stu-sire-H255RQA', acts: [0, 8, 6, 4, 10, 0, 4, 0, 0, 0], zona: 32, exam: 21, total: 53 },
    { id: 'stu-sire-F736XQC', acts: [4, 5, 2, 2, 2, 0, 0, 0, 0, 0], zona: 15, exam: 5, total: 20 },
    { id: 'stu-sire-G972LBX', acts: [5, 12, 3, 3, 7, 5, 0, 0, 0, 0], zona: 35, exam: 15, total: 50 },
    { id: 'stu-sire-G445EMD', acts: [0, 4, 3, 0, 4, 5, 0, 0, 0, 0], zona: 16, exam: 15, total: 31 },
    { id: 'stu-sire-F094MFJ', acts: [5, 9, 4, 4, 9, 0, 4, 0, 0, 0], zona: 35, exam: 20, total: 55 },
    { id: 'stu-sire-H392LPZ', acts: [5, 14, 5, 4, 9, 5, 4, 0, 0, 0], zona: 46, exam: 40, total: 86 },
    { id: 'stu-sire-H248NLT', acts: [3, 9, 4, 4, 8, 5, 8, 0, 0, 0], zona: 41, exam: 15, total: 56 },
    { id: 'stu-sire-H751INM', acts: [5, 10, 5, 3, 10, 0, 5, 0, 0, 0], zona: 38, exam: 37, total: 75 },
    { id: 'stu-sire-J844CWF', acts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], zona: 0, exam: 0, total: 0 },
    { id: 'stu-sire-I029BCK', acts: [5, 8, 4, 4, 8, 0, 0, 0, 0, 0], zona: 29, exam: 2, total: 31 },
    { id: 'stu-sire-H266WPW', acts: [5, 15, 5, 4, 10, 5, 10, 0, 0, 0], zona: 54, exam: 58, total: 100 },
    { id: 'stu-sire-G292TJS', acts: [3, 11, 4, 3, 8, 5, 0, 0, 0, 0], zona: 34, exam: 15, total: 49 },
    { id: 'stu-sire-G632RUW', acts: [4, 10, 5, 3, 9, 5, 12, 0, 0, 0], zona: 48, exam: 40, total: 88 },
    { id: 'stu-sire-G981QUX', acts: [5, 12, 4, 4, 7, 3, 16, 0, 0, 0], zona: 51, exam: 30, total: 81 },
    { id: 'stu-sire-F138MCZ', acts: [5, 15, 5, 4, 10, 5, 4, 0, 0, 0], zona: 48, exam: 38, total: 86 },
    { id: 'stu-sire-I128FKG', acts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], zona: 0, exam: 0, total: 0 },
    { id: 'stu-sire-G379WGQ', acts: [5, 10, 5, 3, 8, 5, 0, 0, 0, 0], zona: 36, exam: 50, total: 86 },
    { id: 'stu-sire-F892QPB', acts: [5, 14, 5, 4, 10, 5, 5, 0, 0, 0], zona: 48, exam: 25, total: 73 },
    { id: 'stu-sire-G747MJQ', acts: [5, 14, 4, 4, 8, 4, 21, 0, 0, 0], zona: 60, exam: 15, total: 75 },
    { id: 'stu-sire-G991ABC', acts: [4, 10, 3, 0, 4, 2, 0, 0, 0, 0], zona: 23, exam: 5, total: 28 },
    { id: 'stu-sire-G830FWP', acts: [5, 8, 4, 4, 6, 4, 4, 0, 0, 0], zona: 35, exam: 7, total: 42 },
    { id: 'stu-sire-F573DBF', acts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], zona: 0, exam: 3, total: 3 },
    { id: 'stu-sire-H784EIL', acts: [3, 7, 0, 0, 0, 0, 0, 0, 0, 0], zona: 10, exam: 5, total: 15 },
    { id: 'stu-sire-E942ZSL', acts: [5, 14, 5, 4, 10, 5, 0, 0, 0, 0], zona: 43, exam: 48, total: 91 },
    { id: 'stu-sire-E089LKU', acts: [5, 14, 5, 2, 10, 5, 3, 0, 0, 0], zona: 44, exam: 45, total: 89 },
    { id: 'stu-sire-I648BXA', acts: [4, 14, 5, 3, 9, 2, 2, 0, 0, 0], zona: 39, exam: 25, total: 64 },
    { id: 'stu-sire-G459MWK', acts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], zona: 0, exam: 5, total: 5 },
    { id: 'stu-sire-H776MCT', acts: [5, 11, 4, 4, 8, 5, 0, 0, 0, 0], zona: 37, exam: 18, total: 55 },
    { id: 'stu-sire-I030ZWN', acts: [5, 10, 4, 0, 10, 0, 0, 0, 0, 0], zona: 29, exam: 10, total: 39 },
    { id: 'stu-sire-F167IVG', acts: [4, 14, 5, 3, 10, 3, 5, 0, 0, 0], zona: 44, exam: 35, total: 79 }
];

async function verifySociedades4CIntegrity() {
    console.log('=== VERIFICACIÓN DE INTEGRIDAD: CONTABILIDAD DE SOCIEDADES 4TO SECCIÓN C (4TO BIMESTRE) ===\n');

    // 1. Verificar en app.js que la columna "estados" nunca sea excluida cuando está antes de Zona
    const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    assert(
        appJs.includes('const isBoundedBeforeSummary = (colIdxZona !== -1 && c < colIdxZona)'),
        'app.js debe permitir actividades llamadas "estados" o "estado de resultados" antes de la columna Zona'
    );

    const baseUrl = 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';
    let [pensum, students, calificaciones] = await Promise.all([
        fetchJson(`${baseUrl}/encc_school_state/pensum.json`),
        fetchJson(`${baseUrl}/encc_school_state/students.json`),
        fetchJson(`${baseUrl}/encc_school_state/calificaciones.json`)
    ]);

    if (students && (students.length !== 412 || students[0]?.cycle === '2027')) {
        pensum = await fetchJson(`${baseUrl}/encc_school_state/historico/2026/pensumSnapshot.json`);
        students = await fetchJson(`${baseUrl}/encc_school_state/historico/2026/studentsSnapshot.json`);
        calificaciones = await fetchJson(`${baseUrl}/encc_school_state/historico/2026/calificacionesSnapshot.json`);
    }

    // 2. Verificar las 7 columnas de actividades en pen-cnb-075
    const course = pensum.find(p => p && p.id === 'pen-cnb-075');
    assert(course, 'El curso pen-cnb-075 (Contabilidad de Sociedades 4to C) debe existir');
    assert.strictEqual(course.teacherId, 'usr-doc-11', 'El docente debe ser Wilder Porfirio Pérez López (usr-doc-11)');
    const b4Acts = course.gradingConfig?.b4?.activities || [];
    const expectedNames = ['Evalusción', 'cuaderno', 'hojas de trabajo', 'Balnces', 'estados', 'hoja', 'otros'];
    expectedNames.forEach((name, idx) => {
        assert.strictEqual(b4Acts[idx]?.name, name, `Columna de actividad ${idx + 1} debe ser "${name}"`);
    });

    // 3. Verificar los 33 estudiantes de 4to Perito Contador Sección C
    const sec4C = students.filter(s => s && s.grade === '4to Perito Contador' && s.section === 'Sección C');
    assert.strictEqual(sec4C.length, 33, 'Deben existir exactamente 33 estudiantes en 4to Perito Contador Sección C');

    for (const exp of EXPECTED_4C_SOCIEDADES_B4) {
        const stu = sec4C.find(s => s.id === exp.id);
        assert(stu, `Estudiante ${exp.id} debe estar en 4to C`);

        const b4Grade = stu.grades?.['Contabilidad de Sociedades']?.[3];
        const b4Det = stu.gradebookDetails?.['Contabilidad de Sociedades']?.['4'];
        const calif = calificaciones[`${exp.id}_contabilidaddesociedades_b4`];

        assert.strictEqual(b4Grade, exp.total, `grades[3] de ${stu.lastName} debe ser ${exp.total}`);
        assert(b4Det, `gradebookDetails['4'] debe existir para ${stu.lastName}`);
        assert.deepStrictEqual(b4Det.activities, exp.acts, `Actividades de ${stu.lastName} deben coincidir exactamente`);
        assert.strictEqual(b4Det.zona, exp.zona, `Zona de ${stu.lastName} debe ser ${exp.zona}`);
        assert.strictEqual(b4Det.exam, exp.exam, `Examen de ${stu.lastName} debe ser ${exp.exam}`);
        assert.strictEqual(b4Det.total, exp.total, `Total en detalle de ${stu.lastName} debe ser ${exp.total}`);

        assert(calif, `Nodo calificaciones debe existir para ${exp.id}`);
        assert.deepStrictEqual(calif.activities, exp.acts, `Actividades en calificaciones de ${stu.lastName} deben coincidir`);
        assert.strictEqual(calif.zona, exp.zona, `Zona en calificaciones de ${stu.lastName} debe ser ${exp.zona}`);
        assert.strictEqual(calif.exam, exp.exam, `Examen en calificaciones de ${stu.lastName} debe ser ${exp.exam}`);
        assert.strictEqual(calif.total, exp.total, `Total en calificaciones de ${stu.lastName} debe ser ${exp.total}`);
    }

    console.log('✅ 33/33 alumnos y las 7 columnas de actividades de Contabilidad de Sociedades (4to C, B4) verificados al 100%.');
}

verifySociedades4CIntegrity().catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
});
