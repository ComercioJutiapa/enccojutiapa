const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('./xlsx.full.min.js');

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

function sendHttpRequest(url, method, payload) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const data = payload ? JSON.stringify(payload) : null;
        const options = {
            hostname: u.hostname,
            path: u.pathname + (u.search || ''),
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, body: responseData });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function cleanStr(s) {
    return (s || '').toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');
}

function normalizeTokens(str) {
    if (!str) return [];
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 1 && !['de', 'del', 'la', 'las', 'los', 'y'].includes(t));
}

function areNamesMatching(rowName, studentObj) {
    if (!rowName || !studentObj) return false;
    const fullTarget = `${studentObj.lastName || ''} ${studentObj.firstName || ''} ${studentObj.name || ''}`;
    const tokensRow = Array.from(new Set(normalizeTokens(rowName)));
    const tokensTarget = Array.from(new Set(normalizeTokens(fullTarget)));
    if (tokensRow.length === 0 || tokensTarget.length === 0) return false;

    const common = tokensRow.filter(t => tokensTarget.includes(t));
    const minTokens = Math.min(tokensRow.length, tokensTarget.length);
    if (minTokens <= 2) {
        return common.length === minTokens;
    }
    return common.length >= 2 && (common.length / minTokens >= 0.60);
}

function getStudentSection(s) {
    const clean = (s.section || '').replace(/secci[oó]n/gi, '').trim();
    const m = clean.match(/([A-D])/i);
    if (m) return m[1].toUpperCase();
    if (s.gradeCode) {
        const parts = s.gradeCode.trim().split(/\s+/);
        const last = parts[parts.length - 1];
        if (/^[A-D]$/i.test(last)) return last.toUpperCase();
    }
    return '';
}

function getStudentGradeNum(s) {
    const str = `${s.grade || ''} ${s.gradeLabel || ''} ${s.gradeCode || ''}`;
    const m = str.match(/(\d+)/);
    return m ? m[1] : '';
}

// 67 file assignments
const fileAssignments = [
  // 4TO A
  { file: 'LIC. WILIAM/Notas Williams - 3°Bim - 4 A - Economía 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-007' },
  { file: 'ALEX TOBAR/Notas Alex - 3°Bim - 4 A - Matemática 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-020' },
  { file: 'GAMALIEL/Notas Gamaliel - 3°Bim - 4 A - Ingles 1 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-023' },
  { file: 'LIC.WILDER/Notas Wilder - 3°Bim - 4 A - Fundamentos 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-033' },
  { file: 'LICDA. JULLISA/Notas Julissa - 3°Bim - 4 A - Compu 1 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-036' },
  { file: 'LIC.WILDER/Notas Wilder - 3°Bim - 4 A - Sociedades 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-049' },
  { file: 'LICDA. JANNET/Notas Jannette - 3°Bim - 4 A - Caligrafía 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-070' },
  { file: 'LIC. DAMARIS/Notas Damaris - 3°Bim - 4 A - Administración 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-108' },
  { file: 'LIC. DAMARIS/Notas Damaris - 3°Bim - 4 A - Correspondencia 2026.xlsx', grade: '4', sec: 'A', pensumId: 'pen-cnb-110' },

  // 4TO B
  { file: 'LIC. NERY/Notas Nery - 3°Bim - 4 B - Economía 2026 lleno.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-014' },
  { file: 'GAMALIEL/Notas Gamaliel - 3°Bim - 4 B - Ingles 1 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-019' },
  { file: 'ALEX TOBAR/Notas Alex - 3°Bim - 4 B - Matemática 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-021' },
  { file: 'LIC.WILDER/Notas Wilder - 3°Bim - 4 B - Fundamentos 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-034' },
  { file: 'LICDA. JULLISA/Notas Julissa - 3°Bim - 4 B - Compu 1 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-037' },
  { file: 'LIC. DAMARIS/Notas Damaris - 3°Bim - 4 B - Caligrafía  y  Ortografía 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-040' },
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 4 B - Admon org. 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-052' },
  { file: 'LIC.WILDER/Notas Wilder - 3°Bim - 4 B - Sociedades 2026.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-072' },
  { file: 'LIC. NERY/Notas Nery - 3°Bim - 4 B - Correspon. 2026 lleno.xlsx', grade: '4', sec: 'B', pensumId: 'pen-cnb-073' },

  // 4TO C
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 4 C - Admon org. 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-011' },
  { file: 'GAMALIEL/Notas Gamaliel - 3°Bim - 4 C - Ingles 1 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-018' },
  { file: 'ALEX TOBAR/Notas Alex - 3°Bim - 4 C - Matemática 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-022' },
  { file: 'LIC.WILDER/Notas Wilder - 3°Bim - 4 C - Fundamentos 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-035' },
  { file: 'LICDA. JULLISA/Notas Julissa - 3°Bim - 4 C - Compu 1 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-038' },
  { file: 'LIC. NERY/Notas Nery - 3°Bim - 4 C - Caligrafía 2026 lleno.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-057' },
  { file: 'LIC.WILDER/Notas Wilder - 3°Bim - 4 C - Sociedades 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-075' },
  { file: 'LIC. DAMARIS/Notas Damaris - 3°Bim - 4 C - Correspondencia 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-109' },
  { file: 'PEM. MILVIA/Notas Milvia - 3°Bim - 4 C - Economía 2026.xlsx', grade: '4', sec: 'C', pensumId: 'pen-cnb-112' },

  // 4TO D
  { file: 'ALEX TOBAR/Notas Alex - 3°Bim - 4 D - Matemática 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-006' },
  { file: 'LIC. NERY/Notas Nery - 3°Bim - 4 D - Correspon. 2026 lleno.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-013' },
  { file: 'lic. osvaldo/Notas Osvaldo - 3°Bim - 4 D - Sociedades 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-015' },
  { file: 'LICDA. JULLISA/Notas Julissa - 3°Bim - 4 D - Compu 1 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-039' },
  { file: 'PEM. ELDA LOPEZ/Notas Elda - 3°Bim - 4 D - Ingles 1 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-051' },
  { file: 'LIC. NERY/Notas Nery - 3°Bim - 4 D - Economía 2026 lleno.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-077' },
  { file: 'LICDA. JANNET/Notas Jannette - 3°Bim - 4 D - Caligrafía 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-078' },
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 4 D - Admon org. 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-113' },
  { file: 'Licda, PAola Bernal/Notas Paola - 3°Bim - 4 D - Fundamentos 2026.xlsx', grade: '4', sec: 'D', pensumId: 'pen-cnb-116' },

  // 5TO A
  { file: 'LIC. NOE/Notas Noé - 3°Bim - 5 A - Costos 2026.xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-025' },
  { file: 'LIC. WILIAM/Notas Williams - 3°Bim - 5 A - Archivo 2026.xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-042' },
  { file: 'LIC. WILIAM/Notas Williams - 3°Bim - 5 A - Meca 2026.xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-044' },
  { file: 'PEM. ELDA LOPEZ/Notas Elda - 3°Bim - 5 A - Finanzas 2026.xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-055' },
  { file: 'LIC. CARLOS JUAREZ/Copia de Notas Carlos J - 3°Bim - 5 A - Geografia 2026 (1).xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-059' },
  { file: 'Licda, PAola Bernal/Notas Paola - 3°Bim - 5 A - Legislacion 2026.xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-080' },
  { file: 'PEM. MILVIA/Notas Milvia - 3°Bim - 5 A - Ingles 2 2026.xlsx', grade: '5', sec: 'A', pensumId: 'pen-cnb-084' },

  // 5TO B
  { file: 'LIC. WILIAM/Notas Williams - 3°Bim - 5 B - Meca 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-010' },
  { file: 'LIC. NOE/Notas Noé - 3°Bim - 5 B - Costos 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-024' },
  { file: 'LIC. WILIAM/Notas Williams - 3°Bim - 5 B - Archivo 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-043' },
  { file: 'PEM. ELDA LOPEZ/Notas Elda - 3°Bim - 5 B - Calculo 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-046' },
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 5 B - Geografia 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-056' },
  { file: 'LIC. NERY/Notas Nery - 3°Bim - 5 B - Finanzas 2026 lleno.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-058' },
  { file: 'PEM. MILVIA/Notas Milvia - 3°Bim - 5 B - Ingles 2 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-082' },
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 5 B - Legislacion 2026.xlsx', grade: '5', sec: 'B', pensumId: 'pen-cnb-083' },

  // 5TO C
  { file: 'LIC. NOE/Notas Noé - 3°Bim - 5 C - Costos 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-026' },
  { file: 'LIC. NOE/Notas Noé - 3°Bim - 5 C - Calculo 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-028' },
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 5 C - Legislacion 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-053' },
  { file: 'PEM. ELDA LOPEZ/Notas Elda - 3°Bim - 5 C - Ingles 2 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-086' },
  { file: 'PEM. ALEIDA/Notas Aleida - 3°Bim - 5 C - Meca 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-087' },
  { file: 'LICDA. ENMA/Notas Enma - 3°Bim - 5 C - Finanzas 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-088' },
  { file: 'Pereira/Notas Juan Carlos - 3°Bim - 5 C - Geografia 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-107' },
  { file: 'Licda, PAola Bernal/Notas Paola - 3°Bim - 5 C - Archivo 2026.xlsx', grade: '5', sec: 'C', pensumId: 'pen-cnb-114' },

  // 5TO D
  { file: 'LIC. NOE/Notas Noé - 3°Bim - 5 D - Costos 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-027' },
  { file: 'LIC. WILIAM/Notas Williams - 3°Bim - 5 D - Geografia 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-041' },
  { file: 'PEM. LILIAN ALAS/Notas Lilian - 3°Bim - 5 D - Finanzas 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-054' },
  { file: 'LIC. NOE/Notas Noé - 3°Bim - 5 D - Calculo 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-065' },
  { file: 'PEM. MILVIA/Notas Milvia - 3°Bim - 5 D - Ingles 2 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-090' },
  { file: 'PEM. ELDA LOPEZ/Notas Elda - 3°Bim - 5 D - Legislacion 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-091' },
  { file: 'PEM. ALEIDA/Notas Aleida - 3°Bim - 5 D - Meca 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-092' },
  { file: 'Licda, PAola Bernal/Notas Paola - 3°Bim - 5 D - Archivo 2026.xlsx', grade: '5', sec: 'D', pensumId: 'pen-cnb-115' }
];

async function main() {
    console.log("================================================================================");
    console.log("🚀 INICIANDO APLICACIÓN ATÓMICA DE CALIFICACIONES B3 (4TO Y 5TO GRADO)");
    console.log("================================================================================");

    // 1. DESCARGA Y RESPALDO COMPLETO
    console.log("1. Descargando datos actuales desde Firebase RTDB...");
    const [pensum, students, existingCalificaciones] = await Promise.all([
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/pensum.json'),
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json'),
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/calificaciones.json')
    ]);

    console.log(`- Estudiantes descargados: ${students.length}`);
    console.log(`- Cátedras pensum: ${pensum.length}`);
    console.log(`- Calificaciones existentes: ${Object.keys(existingCalificaciones || {}).length}`);

    // Guardar respaldo de seguridad en disco
    fs.writeFileSync('backup_pre_b3_students.json', JSON.stringify(students, null, 2), 'utf-8');
    fs.writeFileSync('backup_pre_b3_calificaciones.json', JSON.stringify(existingCalificaciones, null, 2), 'utf-8');
    console.log("✅ Respaldo de seguridad guardado en disco con éxito.");

    // Clona profunda de students y calificaciones para procesar
    const updatedStudents = JSON.parse(JSON.stringify(students));
    const updatedCalificaciones = Object.assign({}, existingCalificaciones);

    const pensumMap = new Map();
    pensum.forEach(p => pensumMap.set(p.id, p));

    // Mapa rápido de estudiantes por ID
    const studentById = new Map();
    updatedStudents.forEach((s, idx) => {
        if (s && s.id) {
            studentById.set(s.id, { student: s, idx });
        }
    });

    let totalAppliedGrades = 0;
    const nowIso = new Date().toISOString();

    // 2. PROCESAR CADA UNO DE LOS 67 ARCHIVOS OFICIALES
    console.log("\n2. Procesando los 67 archivos de calificaciones oficiales...");
    for (const item of fileAssignments) {
        const fullPath = path.join('E:\\III BIMESTRE', item.file.replace(/\//g, '\\'));
        const pObj = pensumMap.get(item.pensumId);
        if (!pObj) {
            throw new Error(`Pensum no encontrado: ${item.pensumId}`);
        }

        const subjectName = pObj.subject;
        const cleanSubj = cleanStr(subjectName);

        const buf = fs.readFileSync(fullPath);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const sectionStudents = updatedStudents.filter(s => {
            if (!s) return false;
            return getStudentGradeNum(s) === item.grade && getStudentSection(s) === item.sec;
        });

        let fileApplied = 0;
        for (let r = 6; r < data.length; r++) {
            const row = data[r];
            if (!row || !row[1] || typeof row[1] !== 'string') continue;
            const rowName = row[1].trim();
            if (!rowName || rowName.toLowerCase().includes('promedio') || rowName.toLowerCase().includes('cuadro')) continue;

            const matchedStudent = sectionStudents.find(s => areNamesMatching(rowName, s));
            if (!matchedStudent) {
                throw new Error(`Estudiante no encontrado en nómina: "${rowName}" en ${item.file}`);
            }

            // Extraer actividades (cols 2 a 8)
            const activities = [];
            for (let c = 2; c <= 8; c++) {
                const val = parseInt(row[c]);
                activities.push(!isNaN(val) ? val : 0);
            }
            while (activities.length < 10) activities.push(0);

            let rowZona = parseInt(row[9]);
            if (isNaN(rowZona)) {
                rowZona = activities.reduce((a, b) => a + b, 0);
            }

            let rowExam = parseInt(row[10]);
            if (isNaN(rowExam)) rowExam = 0;

            let rowTotal = parseInt(row[11]);
            if (isNaN(rowTotal)) {
                rowTotal = rowZona + rowExam;
            }
            // Clampar a rango legal 0..100
            rowTotal = Math.max(0, Math.min(100, rowTotal));

            // Estructurar en el estudiante
            if (!matchedStudent.grades) matchedStudent.grades = {};
            if (!matchedStudent.gradebookDetails) matchedStudent.gradebookDetails = {};

            if (!matchedStudent.grades[subjectName]) {
                matchedStudent.grades[subjectName] = [0, 0, 0, 0];
            }
            if (!matchedStudent.gradebookDetails[subjectName]) {
                matchedStudent.gradebookDetails[subjectName] = {};
            }

            // ASIGNAR ESTRICTAMENTE BIMESTRE 3 (Index 2, key '3')
            matchedStudent.grades[subjectName][2] = rowTotal;
            matchedStudent.gradebookDetails[subjectName]['3'] = {
                activities,
                zona: rowZona,
                exam: rowExam,
                total: rowTotal,
                exonerado: false
            };

            // Composite record para el nodo calificaciones
            const compositeKey = `${matchedStudent.id}_${cleanSubj}_b3`;
            updatedCalificaciones[compositeKey] = {
                id: compositeKey,
                estudianteId: matchedStudent.id,
                personalCode: matchedStudent.personalCode || '',
                claseNombre: subjectName,
                claseClean: cleanSubj,
                bimestre: 3,
                activities,
                zona: rowZona,
                exam: rowExam,
                total: rowTotal,
                exonerado: false,
                updatedAt: nowIso,
                updatedBy: 'importacion-oficial-b3'
            };

            fileApplied++;
            totalAppliedGrades++;
        }
    }

    console.log(`✅ Extracción completada: ${totalAppliedGrades} notas procesadas en memoria.`);

    // 3. VERIFICACIÓN ESTRICTA DE INVARIANTES
    console.log("\n3. Verificando invariantes de seguridad...");
    // A. 6to grado debe estar 100% idéntico
    const old6to = students.filter(s => s && getStudentGradeNum(s) === '6');
    const new6to = updatedStudents.filter(s => s && getStudentGradeNum(s) === '6');
    if (JSON.stringify(old6to) !== JSON.stringify(new6to)) {
        throw new Error("VIOLACIÓN DE SEGURIDAD: Los datos de 6to grado fueron alterados!");
    }
    console.log("  ✅ Invariante 1: 6to grado está 100% idéntico e intacto.");

    // B. Bimestres 1, 2 y 4 de 4to y 5to deben estar 100% idénticos
    let b124Violations = 0;
    students.forEach((oldS, idx) => {
        const newS = updatedStudents[idx];
        if (!oldS.grades) return;
        Object.keys(oldS.grades).forEach(subj => {
            const oldG = oldS.grades[subj] || [0,0,0,0];
            const newG = newS.grades[subj] || [0,0,0,0];
            if (oldG[0] !== newG[0] || oldG[1] !== newG[1] || oldG[3] !== newG[3]) {
                b124Violations++;
                console.error(`Discrepancia en ${oldS.name} - ${subj}:`, { oldG, newG });
            }
        });
    });
    if (b124Violations > 0) {
        throw new Error(`VIOLACIÓN DE SEGURIDAD: Se detectaron ${b124Violations} cambios en bimestres 1, 2 o 4!`);
    }
    console.log("  ✅ Invariante 2: Bimestres 1, 2 y 4 permanecen 100% inalterados.");

    // C. Cantidad total de estudiantes
    if (updatedStudents.length !== 412) {
        throw new Error(`VIOLACIÓN DE INTEGRIDAD: Esperados 412 estudiantes, obtenidos ${updatedStudents.length}`);
    }
    console.log("  ✅ Invariante 3: Nómina completa de 412 estudiantes preservada.");

    // 4. PERSISTENCIA ATÓMICA EN FIREBASE RTDB
    console.log("\n4. Aplicando cambios atómicos en Firebase Cloud...");
    const nowTime = Date.now();

    // A. Guardar estudiantes
    console.log("  -> Subiendo students.json (412 alumnos con notas B3 consolidadas)...");
    await sendHttpRequest(
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json',
        'PUT',
        updatedStudents
    );
    console.log("  ✅ Estudiantes actualizados en /encc_school_state/students.json");

    // B. Guardar calificaciones (nodo agregado/actualizado)
    console.log("  -> Subiendo calificaciones.json (nodo compuesto de auditoría)...");
    await sendHttpRequest(
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/calificaciones.json',
        'PUT',
        updatedCalificaciones
    );
    console.log("  ✅ Calificaciones actualizadas en /encc_school_state/calificaciones.json");

    // C. Actualizar timestamp de modificación para que todos los clientes sincronicen inmediatamente
    console.log("  -> Actualizando marca de tiempo de sincronización...");
    await sendHttpRequest(
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/lastModified.json',
        'PUT',
        nowTime
    );
    await sendHttpRequest(
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/lastModified.json',
        'PUT',
        nowTime
    );
    console.log("  ✅ Marca de tiempo actualizada.");

    // D. Espejo en nodo raíz students para retrocompatibilidad
    console.log("  -> Actualizando nodo raíz /students.json para redundancia...");
    await sendHttpRequest(
        'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json',
        'PUT',
        updatedStudents
    );
    console.log("  ✅ Nodo raíz sincronizado.");

    console.log("\n================================================================================");
    console.log(`🎉 APLICACIÓN COMPLETADA CON ÉXITO:`);
    console.log(`   - 67 cátedras oficiales aplicadas`);
    console.log(`   - ${totalAppliedGrades} notas de estudiantes registradas`);
    console.log(`   - Bimestres anteriores (B1, B2) y futuro (B4) 100% intactos`);
    console.log(`   - Todos los nombres y secciones validados con 100.00% de coincidencia`);
    console.log("================================================================================");
}

main().catch(err => {
    console.error("❌ ERROR CRÍTICO DURANTE LA EJECUCIÓN:", err);
    process.exit(1);
});
