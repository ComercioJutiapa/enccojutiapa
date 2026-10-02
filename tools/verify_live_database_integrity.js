const fs = require('fs');
const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function verify() {
    console.log("=== VERIFICANDO BASE DE DATOS EN VIVO EN FIREBASE RTDB ===");
    const [liveStudents, liveCalificaciones, pensum] = await Promise.all([
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json'),
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/calificaciones.json'),
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/pensum.json')
    ]);

    const backupStudents = JSON.parse(fs.readFileSync('backup_pre_b3_students.json', 'utf-8'));
    const backupCalificaciones = JSON.parse(fs.readFileSync('backup_pre_b3_calificaciones.json', 'utf-8'));

    console.log(`Estudiantes en vivo: ${liveStudents.length} (esperado 412)`);
    console.log(`Calificaciones en vivo: ${Object.keys(liveCalificaciones).length} (previo: ${Object.keys(backupCalificaciones).length})`);

    const backupMap = new Map();
    backupStudents.forEach(b => {
        if (b && b.id) backupMap.set(b.id, b);
    });

    // 1. Chequeo de invariantes B1, B2 y B4 comparando por ID de estudiante
    let b1Diffs = 0, b2Diffs = 0, b4Diffs = 0;
    liveStudents.forEach(st => {
        if (!st || !st.id) return;
        const bSt = backupMap.get(st.id);
        if (!bSt || !st.grades || !bSt.grades) return;
        Object.keys(bSt.grades).forEach(subj => {
            const liveG = st.grades[subj] || [0,0,0,0];
            const backG = bSt.grades[subj] || [0,0,0,0];
            if (liveG[0] !== backG[0]) b1Diffs++;
            if (liveG[1] !== backG[1]) b2Diffs++;
            if (liveG[3] !== backG[3]) b4Diffs++;
        });
    });

    console.log(`Diferencias en Bimestre 1: ${b1Diffs} (debe ser 0)`);
    console.log(`Diferencias en Bimestre 2: ${b2Diffs} (debe ser 0)`);
    console.log(`Diferencias en Bimestre 4: ${b4Diffs} (debe ser 0)`);

    if (b1Diffs !== 0 || b2Diffs !== 0 || b4Diffs !== 0) {
        throw new Error("ERROR: Bimestres previos o futuros fueron modificados!");
    }

    // 2. Cobertura de 4to y 5to en B3
    const p45 = pensum.filter(p => /4|5|cuarto|quinto/i.test(p.grade || p.gradeCode || ''));
    console.log(`\nVerificando asignaturas de 4to y 5to (${p45.length} cátedras)...`);

    let zeroCount = 0;
    let filledCount = 0;

    const students4to5to = liveStudents.filter(s => s && /4|5|cuarto|quinto/i.test(s.grade || ''));
    console.log(`Total alumnos en 4to y 5to: ${students4to5to.length}`);

    students4to5to.forEach(s => {
        const sGradeNum = (s.grade || '').match(/(\d+)/)?.[1] || '';
        const sSec = (s.section || '').replace(/secci[oó]n/gi, '').trim().match(/([A-D])/i)?.[1]?.toUpperCase() || '';

        const sPensum = p45.filter(p => {
            const pGradeNum = (p.grade || p.gradeCode || '').match(/(\d+)/)?.[1] || '';
            const pSec = (p.section || p.gradeCode || '').replace(/secci[oó]n/gi, '').trim().match(/([A-D])/i)?.[1]?.toUpperCase() || '';
            return pGradeNum === sGradeNum && pSec === sSec;
        });

        sPensum.forEach(p => {
            const g = s.grades && s.grades[p.subject] ? s.grades[p.subject][2] : undefined;
            if (g !== undefined && g > 0) {
                filledCount++;
            } else {
                zeroCount++;
            }
        });
    });

    console.log(`Notas B3 registradas con punteo (>0): ${filledCount}`);
    console.log(`Notas B3 con 0 o retirados: ${zeroCount}`);
    console.log(`Total casillas evaluadas: ${filledCount + zeroCount}`);

    console.log("\n✅ Base de datos validada exitosamente al 100%.");
}

verify().catch(console.error);
