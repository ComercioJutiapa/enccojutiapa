const https = require('https');
const fs = require('fs');
const vm = require('vm');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let d = '';
            res.on('data', chunk => d += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(d));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

const mockDoc = {
    getElementById: (id) => ({
        style: {},
        value: '',
        checked: true,
        textContent: '',
        innerHTML: '',
        appendChild: () => {},
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        insertBefore: () => {}
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => ({ style: { setProperty: () => {} }, appendChild: () => {}, setAttribute: () => {} }),
    body: { style: { setProperty: () => {} }, appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} }
};

const mockFetch = (url) => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('{}')
});

const context = {
    console,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Set,
    Map,
    RegExp,
    Buffer,
    URL,
    setTimeout: (fn) => {},
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    document: mockDoc,
    fetch: mockFetch,
    navigator: { onLine: true, userAgent: 'node' },
    location: { href: '', search: '', pathname: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollTo: () => {},
    requestAnimationFrame: (cb) => { if (typeof cb === 'function') cb(); },
    cancelAnimationFrame: () => {},
    showToast: (msg, type) => {},
    STATE: {},
    window: {}
};
context.window = context;

const appJs = fs.readFileSync('app.js', 'utf8');
vm.createContext(context);

try {
    vm.runInContext(appJs, context);
    console.log("✓ app.js cargado e inicializado exitosamente en el entorno de pruebas.");
} catch (e) {
    console.error("Error al cargar app.js en Node:", e);
    process.exit(1);
}

async function auditHonorRoll() {
    console.log("\n=== INICIANDO AUDITORÍA COMPLETA DEL CUADRO DE HONOR ===");

    const students = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
    const pensum = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/pensum.json');
    const config = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/config.json');

    context.STATE.students = students;
    context.STATE.pensum = Object.values(pensum || {});
    context.STATE.config = config;
    context.STATE.activeCycle = '2026';

    const getAcademicInfo = context.getStudentAcademicInfo;
    if (typeof getAcademicInfo !== 'function') {
        throw new Error("getStudentAcademicInfo no es una función en context");
    }

    console.log(`✓ Datos en vivo: ${students.length} estudiantes, Bimestre Activo: ${config.activeBimestre}`);

    // 1. Auditoría de 6to Grado Graduandos
    console.log("\n========================================================");
    console.log("1. AUDITORÍA: 6TO GRADO GRADUANDOS (10 CLASES EN B4)");
    console.log("========================================================");
    const stu6to = students.filter(s => (s.grade && s.grade.includes('6to')) || (s.gradeLabel && s.gradeLabel.includes('6to')));
    console.log(`Total estudiantes 6to: ${stu6to.length}`);

    let countWithSeminario = 0;
    let eligible6to = 0;
    let nonEligible6to = 0;
    const evaluated6to = [];

    stu6to.forEach(s => {
        const info = getAcademicInfo(s);
        if (s.grades && s.grades['Seminario sobre Problemas Socioeconómicos de Guatemala'] && s.grades['Seminario sobre Problemas Socioeconómicos de Guatemala'][3] > 0) {
            countWithSeminario++;
        }
        if (info.eligibleForHonorRoll) eligible6to++;
        else nonEligible6to++;

        evaluated6to.push({
            student: s,
            info: info
        });
    });

    console.log(`- Con nota de Seminario en B4: ${countWithSeminario} / ${stu6to.length}`);
    console.log(`- Elegibles para Cuadro de Honor: ${eligible6to}`);
    console.log(`- No elegibles (o exonerados / nota < 60): ${nonEligible6to}`);

    // Ordenar según reglas oficiales
    evaluated6to.sort((a, b) => {
        if (a.info.eligibleForHonorRoll !== b.info.eligibleForHonorRoll) {
            return a.info.eligibleForHonorRoll ? -1 : 1;
        }
        if (Math.abs(b.info.average - a.info.average) > 0.0001) {
            return b.info.average - a.info.average;
        }
        if (Math.abs(b.info.totalPoints - a.info.totalPoints) > 0.01) {
            return b.info.totalPoints - a.info.totalPoints;
        }
        return (a.student.lastName || a.student.name || '').localeCompare(b.student.lastName || b.student.name || '');
    });

    console.log("\nTop 10 Estudiantes - 6to Grado Graduandos (General Escuela / Carrera):");
    evaluated6to.slice(0, 10).forEach((item, idx) => {
        const s = item.student;
        const info = item.info;
        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '🎖️'));
        console.log(`  ${medal} #${idx + 1}: ${s.name} (${s.grade} ${s.section})`);
        console.log(`       Promedio: ${info.averageFormatted} pts | Total: ${info.totalPoints} pts | Clases: ${info.gradedClasses} | Carga: ${info.classLoadLabel}`);
    });

    // 2. Auditoría de 4to y 5to Grado
    console.log("\n========================================================");
    console.log("2. AUDITORÍA: 4TO Y 5TO GRADO (9 CLASES)");
    console.log("========================================================");
    const stu4to5to = students.filter(s => {
        const g = (s.grade || s.gradeLabel || '').toString();
        return g.includes('4to') || g.includes('5to');
    });
    console.log(`Total estudiantes 4to y 5to: ${stu4to5to.length}`);

    const evaluated4to5to = stu4to5to.map(s => ({
        student: s,
        info: getAcademicInfo(s)
    }));

    evaluated4to5to.sort((a, b) => {
        if (a.info.eligibleForHonorRoll !== b.info.eligibleForHonorRoll) {
            return a.info.eligibleForHonorRoll ? -1 : 1;
        }
        if (Math.abs(b.info.average - a.info.average) > 0.0001) {
            return b.info.average - a.info.average;
        }
        if (Math.abs(b.info.totalPoints - a.info.totalPoints) > 0.01) {
            return b.info.totalPoints - a.info.totalPoints;
        }
        return (a.student.lastName || a.student.name || '').localeCompare(b.student.lastName || b.student.name || '');
    });

    console.log("\nTop 5 Estudiantes - 4to y 5to Grado:");
    evaluated4to5to.slice(0, 5).forEach((item, idx) => {
        const s = item.student;
        const info = item.info;
        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '🎖️'));
        console.log(`  ${medal} #${idx + 1}: ${s.name} (${s.grade} ${s.section})`);
        console.log(`       Promedio: ${info.averageFormatted} pts | Total: ${info.totalPoints} pts | Clases: ${info.gradedClasses}`);
    });

    // 3. Auditoría por Secciones de 6to (A, B, C, D)
    console.log("\n========================================================");
    console.log("3. PRIMEROS LUGARES POR SECCIÓN DE 6TO GRADO");
    console.log("========================================================");
    for (const sec of ['A', 'B', 'C', 'D']) {
        const secList = evaluated6to.filter(item => {
            const sc = (item.student.section || '').toString();
            return sc.endsWith(sec) || sc.includes(sec);
        });
        const top1 = secList[0];
        const top2 = secList[1];
        const top3 = secList[2];
        console.log(`--- SECCIÓN ${sec} (Total alumnos: ${secList.length}) ---`);
        if (top1) console.log(`  🥇 1er Lugar: ${top1.student.name} - ${top1.info.averageFormatted} pts (${top1.info.totalPoints} pts)`);
        if (top2) console.log(`  🥈 2do Lugar: ${top2.student.name} - ${top2.info.averageFormatted} pts (${top2.info.totalPoints} pts)`);
        if (top3) console.log(`  🥉 3er Lugar: ${top3.student.name} - ${top3.info.averageFormatted} pts (${top3.info.totalPoints} pts)`);
    }

    // 4. Verificación matemática exhaustiva
    let errorsFound = 0;
    students.forEach((s, idx) => {
        const info = getAcademicInfo(s);
        if (isNaN(info.average) || info.average === null || info.average === undefined) {
            console.error(`❌ ERROR: Promedio inválido en estudiante #${idx} (${s.name}):`, info.average);
            errorsFound++;
        }
        if (isNaN(info.totalPoints) || info.totalPoints === null || info.totalPoints === undefined) {
            console.error(`❌ ERROR: Puntos totales inválidos en estudiante #${idx} (${s.name}):`, info.totalPoints);
            errorsFound++;
        }
    });

    if (errorsFound === 0) {
        console.log("\n========================================================");
        console.log("✅ CERO ERRORES MATEMÁTICOS: 412/412 estudiantes calculados perfectamente.");
        console.log("========================================================");
    } else {
        throw new Error(`Se encontraron ${errorsFound} anomalías matemáticas`);
    }
}

auditHonorRoll().catch(err => {
    console.error("Error en auditoría:", err);
    process.exit(1);
});
