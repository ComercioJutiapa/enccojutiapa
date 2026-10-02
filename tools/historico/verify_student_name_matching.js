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

// Map the 67 files to (grade, section, subject, teacher)
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

async function main() {
    console.log("=== INICIANDO VALIDACIÓN DE COINCIDENCIA DE NOMBRES ===");
    const [pensum, students] = await Promise.all([
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/pensum.json'),
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json')
    ]);

    const pensumMap = new Map();
    pensum.forEach(p => pensumMap.set(p.id, p));

    let totalFilesChecked = 0;
    let totalRowsChecked = 0;
    let totalMatches = 0;
    let unmatchedRows = [];

    fileAssignments.forEach(item => {
        const fullPath = path.join('E:\\III BIMESTRE', item.file.replace(/\//g, '\\'));
        const pObj = pensumMap.get(item.pensumId);
        if (!fs.existsSync(fullPath)) {
            console.error(`ERROR: Archivo no existe: ${fullPath}`);
            return;
        }

        totalFilesChecked++;
        const buf = fs.readFileSync(fullPath);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Filter students of this grade and section using accurate section logic
        const sectionStudents = students.filter(s => {
            if (!s) return false;
            return getStudentGradeNum(s) === item.grade && getStudentSection(s) === item.sec;
        });

        for (let r = 6; r < data.length; r++) {
            const row = data[r];
            if (!row || !row[1] || typeof row[1] !== 'string') continue;
            const rowName = row[1].trim();
            if (!rowName || rowName.toLowerCase().includes('promedio') || rowName.toLowerCase().includes('cuadro')) continue;

            totalRowsChecked++;
            const matchedStudent = sectionStudents.find(s => areNamesMatching(rowName, s));

            if (matchedStudent) {
                totalMatches++;
            } else {
                unmatchedRows.push({
                    file: item.file,
                    grade: item.grade,
                    sec: item.sec,
                    subject: pObj ? pObj.subject : '',
                    rowName,
                    rowIdx: r
                });
            }
        }
    });

    console.log(`\n======================================================`);
    console.log(`Archivos evaluados: ${totalFilesChecked} / ${fileAssignments.length}`);
    console.log(`Filas de alumnos evaluadas: ${totalRowsChecked}`);
    console.log(`Coincidencias exitosas de nombre: ${totalMatches} (${((totalMatches/totalRowsChecked)*100).toFixed(2)}%)`);
    console.log(`Filas sin coincidencia: ${unmatchedRows.length}`);
    if (unmatchedRows.length > 0) {
        console.log("\nDetalle de nombres no coincidentes:");
        unmatchedRows.forEach(u => {
            console.log(`[${u.grade}° ${u.sec}] "${u.rowName}" (Fila ${u.rowIdx} en ${u.file})`);
        });
    }
    console.log(`======================================================`);
}

main().catch(console.error);
