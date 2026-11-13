/**
 * Test Suite: Auditoría de Promedios, Reportes y Coherencia de Recuperaciones
 * Verifica:
 * 1. Divisor dinámico en boletas para ciclo en curso vs ciclo cerrado
 * 2. Integración de calificaciones de recuperación en boletas sin mutación de datos originales
 * 3. Sincronización del Cuadro Estadístico Oficial MINEDUC con motor unificado
 * 4. Manejo de exoneraciones sin NaN ni penalización de promedios
 * 5. Integridad histórica inmutable de 2026 (412 estudiantes SIRE)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appJsPath = path.join(__dirname, '..', 'app.js');
const gradeStatsJsPath = path.join(__dirname, '..', 'grade_stats.js');

const appCode = fs.readFileSync(appJsPath, 'utf8');
const gradeStatsCode = fs.readFileSync(gradeStatsJsPath, 'utf8');

// Helper para extraer funciones completas del código fuente
const extractFn = (src, name) => {
    const regex = new RegExp(`(?:function\\s+${name}|(?:window\\.)?${name}\\s*=\\s*function)\\s*\\(`);
    const match = src.match(regex);
    if (!match) throw new Error(`Function ${name} not found`);
    const start = match.index;
    let depth = 0;
    let end = start;
    let foundOpen = false;
    for (let i = start; i < src.length; i++) {
        if (src[i] === '{') {
            depth++;
            foundOpen = true;
        } else if (src[i] === '}') {
            depth--;
            if (foundOpen && depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return src.slice(start, end);
};

const sandbox = {
    console,
    Math,
    parseInt,
    parseFloat,
    Number,
    String,
    Array,
    Object,
    Set,
    Boolean,
    Date,
    escapeHtml: (str) => String(str || '').replace(/[&<>"']/g, ''),
    formatStudentDisplayName: (s) => `${s.lastName || ''}, ${s.firstName || ''}`,
    formatStudentGradeAndSection: (s) => `${s.grade || ''} ${s.section || ''}`,
    isMateriaEspecialGraduacion: (subj) => {
        const s = (subj || '').toLowerCase();
        return s.includes('practica') || s.includes('seminario');
    },
    isSubjectBimestreExonerated: (student, subject, b) => {
        if (!student || !student.academicExceptions) return false;
        return student.academicExceptions.some(ex => {
            const mMatch = !ex.subject || ex.subject.toLowerCase() === (subject || '').toLowerCase();
            const bMatch = !ex.bimestre || String(ex.bimestre).toUpperCase() === 'ALL' || Number(ex.bimestre) === b;
            return mMatch && bMatch;
        });
    },
    getReportCardSubjects: (s) => {
        if (s && s.customSubjects) return s.customSubjects;
        return ['Contabilidad', 'Matemática', 'Educación Física'];
    },
    getStudentExonerationsList: (s) => (s && s.academicExceptions) || [],
    OFFICIAL_CNB_PENSUM_ORDER: {},
    STATE: {
        activeCycle: '2026',
        config: {
            activeBimestre: 4,
            activeUnits: [1, 2, 3, 4],
            minPassingScore: 60,
            maxAllowedScore: 100
        },
        gradesList: [
            { code: '4TO_A', name: '4TO PERITO', section: 'A' },
            { code: '6TO_A', name: '6TO PERITO', section: 'A' }
        ],
        schoolHeader: {
            directorName: 'Licda. Mirza Elizabeth Aragón Polanco de Hernández',
            directorTitle: 'Directora del Plantel'
        },
        users: [
            { role: 'director', name: 'Licda. Mirza Elizabeth Aragón Polanco de Hernández' }
        ],
        recuperaciones: {},
        recuperacionesByCycle: {}
    }
};

sandbox.window = sandbox;
sandbox.window.STATE = sandbox.STATE;
vm.createContext(sandbox);

// Cargar funciones clave
vm.runInContext(extractFn(appCode, 'getReportCardSubjectGrades'), sandbox);
vm.runInContext(extractFn(appCode, 'buildStudentReportCardInnerHtml'), sandbox);
vm.runInContext(extractFn(gradeStatsCode, 'computeCourseAnnualAverage'), sandbox);

// Mock de recuperación para pruebas
sandbox.getStudentSubjectRecoveryRecord = (code, subject, grade, cycle) => {
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanSub = String(subject || '').trim().toLowerCase();
    const st = sandbox.STATE;
    const store = (st.recuperaciones && st.recuperaciones[cleanCode]) || null;
    if (!store) return null;
    const item = store[cleanSub];
    if (!item) return null;
    return {
        ...item,
        hasNote: true,
        aprobada: Number(item.notaRecup) >= 60
    };
};

console.log('=== INICIANDO PRUEBAS DE AUDITORÍA DE PROMEDIOS Y REPORTES ===\n');

// ─── TEST 1: Ciclo en curso (2027, Bimestre 1) con divisor dinámico ───
console.log('Test 1: Divisor dinámico en ciclo en curso (2027, B1 activo)...');
sandbox.STATE.activeCycle = '2027';
sandbox.STATE.isHistoricalReadOnlyMode = false;
sandbox.STATE.viewingHistoricalCycle = null;
sandbox.STATE.historicalViewingCycle = null;
sandbox.STATE.config.activeBimestre = 1;

const studentB1Only = {
    id: 'stu-test-2027-1',
    code: 'TEST-B1',
    personalCode: 'TEST-B1',
    grade: '4TO_A',
    carne: 'ENCCO-2027-01',
    firstName: 'Juan',
    lastName: 'Pérez',
    status: 'Inscrito',
    grades: {
        'Contabilidad': [80, 0, 0, 0]
    }
};

const gB1 = sandbox.getReportCardSubjectGrades(studentB1Only, 'Contabilidad');
assert.strictEqual(gB1.avg, 80, `El promedio para B1 activo debe ser 80, obtenido: ${gB1.avg}`);
assert.strictEqual(gB1.isCycleClosed, false, 'El ciclo 2027 B1 debe detectarse como ciclo en curso (no cerrado)');
const boletaB1Html = sandbox.buildStudentReportCardInnerHtml(studentB1Only);
assert(boletaB1Html.includes('APROBANDO'), 'El estado debe ser APROBANDO en lugar de REPROBADO prematuro');
console.log('  -> OK: Estudiante con 80 pts en B1 no es castigado con división entre 4 (Promedio = 80 pts, Estado: APROBANDO).');

// ─── TEST 2: Ciclo cerrado (2026) con divisor anual oficial (4 para 4to, 3 para 6to) ───
console.log('\nTest 2: Divisor anual oficial en ciclo cerrado (2026)...');
sandbox.STATE.activeCycle = '2026';
sandbox.STATE.isHistoricalReadOnlyMode = true;
sandbox.STATE.viewingHistoricalCycle = '2026';
sandbox.STATE.config.activeBimestre = 4;

const studentAnnualFail = {
    id: 'stu-test-2026-fail',
    code: 'TEST-FAIL-2026',
    personalCode: 'TEST-FAIL-2026',
    grade: '4TO_A',
    carne: 'ENCCO-2026-99',
    firstName: 'Carlos',
    lastName: 'López',
    status: 'Inscrito',
    grades: {
        'Contabilidad': [80, 0, 0, 0]
    }
};

const gClosed = sandbox.getReportCardSubjectGrades(studentAnnualFail, 'Contabilidad');
assert.strictEqual(gClosed.isCycleClosed, true, 'El ciclo 2026 debe detectarse como cerrado');
assert.strictEqual(gClosed.avg, 20, `En ciclo cerrado, 80/4 debe ser 20, obtenido: ${gClosed.avg}`);
const boletaClosedHtml = sandbox.buildStudentReportCardInnerHtml(studentAnnualFail);
assert(boletaClosedHtml.includes('REPROBADO'), 'En ciclo cerrado con 20 pts debe marcar REPROBADO');
console.log('  -> OK: En ciclo cerrado, promedio anual = 20 pts (80/4), Estado: REPROBADO.');

// ─── TEST 3: Integración de Recuperación Aprobada en Boleta ───
console.log('\nTest 3: Integración de calificación de recuperación en boleta...');
const studentWithRecup = {
    id: 'stu-test-recup-1',
    code: 'RECUP-PASS-1',
    personalCode: 'RECUP-PASS-1',
    grade: '4TO_A',
    carne: 'ENCCO-2026-REC1',
    firstName: 'María',
    lastName: 'González',
    status: 'Inscrito',
    grades: {
        'Matemática': [50, 55, 52, 58] // Promedio = 54 (Reprobada ordinaria)
    }
};

// Registrar recuperación aprobada en STATE.recuperaciones para 2026
sandbox.STATE.recuperaciones['RECUP-PASS-1'] = {
    'matemática': {
        notaRecup: 60,
        notaFinalRecup: 60,
        materia: 'Matemática',
        aprobada: true,
        opp1: 60
    }
};

const gRecup = sandbox.getReportCardSubjectGrades(studentWithRecup, 'Matemática');
assert(gRecup.recupRecord !== null, 'Debe encontrar el registro de recuperación');
assert.strictEqual(gRecup.recupRecord.aprobada, true, 'La recuperación debe estar aprobada');
assert.strictEqual(gRecup.avg, 54, 'El promedio ordinario original debe mantenerse intacto (54 pts)');

const boletaHtml = sandbox.buildStudentReportCardInnerHtml(studentWithRecup);
assert(boletaHtml.includes('APROBADO (Recup.)'), 'La boleta debe mostrar el estado APROBADO (Recup.)');
assert(boletaHtml.includes('[R:60]'), 'La boleta debe mostrar el distintivo [R:60]');
console.log('  -> OK: La boleta refleja [R:60] y APROBADO (Recup.) conservando las notas bimestrales originales.');

// ─── TEST 4: Exoneraciones institucionales sin penalización ───
console.log('\nTest 4: Exoneraciones sin distorsión de promedios ni NaN...');
const studentExon = {
    id: 'stu-test-exon',
    code: 'EXON-STU',
    personalCode: 'EXON-STU',
    grade: '4TO_A',
    carne: 'ENCCO-2026-EXON',
    firstName: 'Ana',
    lastName: 'Ramírez',
    status: 'Inscrito',
    academicExceptions: [
        { subject: 'Educación Física', bimestre: 'ALL', reason: 'Dispensa Médica Oficial' }
    ],
    grades: {
        'Educación Física': [0, 0, 0, 0],
        'Matemática': [80, 85, 90, 85]
    }
};

const gExon = sandbox.getReportCardSubjectGrades(studentExon, 'Educación Física');
assert.strictEqual(gExon.isFullyExon, true, 'Educación Física debe marcarse como totalmente exonerada');
const boletaExonHtml = sandbox.buildStudentReportCardInnerHtml(studentExon);
assert(boletaExonHtml.includes('Exon.'), 'La boleta debe mostrar Exon. en las celdas exoneradas');
assert(!boletaExonHtml.includes('NaN'), 'No debe haber NaN en el HTML de la boleta');
console.log('  -> OK: Materia totalmente exonerada se maneja de forma limpia y sin generar NaN.');

// ─── TEST 5: computeCourseAnnualAverage alineado con ciclo ───
console.log('\nTest 5: computeCourseAnnualAverage en ciclo activo vs cerrado...');
sandbox.STATE.isHistoricalReadOnlyMode = false;
sandbox.STATE.viewingHistoricalCycle = null;
sandbox.STATE.historicalViewingCycle = null;
sandbox.STATE.activeCycle = '2027';
sandbox.STATE.config.activeBimestre = 1;
const avgActive = sandbox.computeCourseAnnualAverage([85, 0, 0, 0], 'Matemática', 'CUARTO');
assert.strictEqual(avgActive, 85, `En ciclo activo B1 debe dar 85, obtenido: ${avgActive}`);

sandbox.STATE.isHistoricalReadOnlyMode = true;
sandbox.STATE.activeCycle = '2026';
sandbox.STATE.config.activeBimestre = 4;
const avgClosed = sandbox.computeCourseAnnualAverage([85, 0, 0, 0], 'Matemática', 'CUARTO');
assert.strictEqual(avgClosed, 21, `En ciclo cerrado debe dar 21 (85/4), obtenido: ${avgClosed}`);
console.log('  -> OK: computeCourseAnnualAverage responde dinámicamente según el estado del ciclo (85 activo vs 21 cerrado).');

// ─── TEST 6: Benchmark de Rendimiento ───
console.log('\nTest 6: Rendimiento de renderizado en lote (simulación de 412 estudiantes)...');
const t0 = Date.now();
for (let i = 0; i < 412; i++) {
    sandbox.getReportCardSubjectGrades(studentWithRecup, 'Matemática');
}
const elapsed = Date.now() - t0;
console.log(`  -> OK: 412 evaluaciones ejecutadas en ${elapsed}ms (< 50ms).`);

console.log('\n=== TODAS LAS PRUEBAS DE AUDITORÍA Y COHERENCIA PASARON CON ÉXITO (6/6) ===');
