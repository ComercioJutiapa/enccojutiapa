
window.setCuadroZoom = function(scale) {
    const el = document.querySelector('.cuadro-estadistico-view');
    if (!el) return;
    el.style.transformOrigin = 'top center';
    el.style.transform = (scale === 1) ? 'none' : ('scale(' + scale + ')');
    el.style.marginBottom = (scale > 1) ? (Math.round((scale - 1) * 350) + 'px') : '24px';
    const btns = document.querySelectorAll('.cuadro-zoom-btn');
    btns.forEach(b => {
        const bScale = parseFloat(b.getAttribute('data-scale') || '1');
        if (Math.abs(bScale - scale) < 0.05) {
            b.style.background = '#0284c7';
            b.style.color = '#ffffff';
        } else {
            b.style.background = '#ffffff';
            b.style.color = '#475569';
        }
    });
};
/**
 * ENCCO Jutiapa — Plataforma Oficial
 * Módulo: Promedios Finales y Estadísticas Oficiales ENCCO
 * Archivo modular extraído de app.js para optimización de rendimiento y mantenimiento.
 */
// ==========================================================================
// MÓDULO: PROMEDIOS FINALES Y ESTADÍSTICAS OFICIALES ENCCO (v211)
// Recreación exacta del Acta Oficial "Promedios Finales Sexto.pdf"
// ==========================================================================
window._lastGradeStatsReportData = null;

function populateGradeStatsSectionsForGrade(gVal, preferredSec = 'ALL') {
    const secSelect = document.getElementById('gradeStatsSectionFilter');
    if (!secSelect) return 'ALL';

    const students = STATE.students || [];
    const gStudents = students.filter(s => {
        const g = String(s.grade || s.gradeLevel || '').toLowerCase();
        return g.includes(`${gVal}to`) || (gVal === '6' && (g.includes('6to') || g.includes('sexto'))) ||
               (gVal === '5' && (g.includes('5to') || g.includes('quinto'))) ||
               (gVal === '4' && (g.includes('4to') || g.includes('cuarto')));
    });

    const uniqueSecs = new Set();
    if (typeof STATE !== 'undefined' && Array.isArray(STATE.gradesList)) {
        STATE.gradesList.forEach(g => {
            if (!g) return;
            const gw = (g.name || g.grade || '').toLowerCase();
            if (gw.includes(`${gVal}to`) || (gVal === '4' && gw.includes('4to')) || (gVal === '5' && gw.includes('5to')) || (gVal === '6' && gw.includes('6to'))) {
                const s = (typeof getCleanSectionLetter === 'function') 
                    ? getCleanSectionLetter(g.section || g.code || '') 
                    : (g.section || '').replace(/^secci[oó]n\s*/i, '').trim().toUpperCase();
                if (s) uniqueSecs.add(s);
            }
        });
    }
    gStudents.forEach(s => {
        const rawSec = (s.section || s.sectionId || '').replace(/^secci[oó]n\s*/i, '').trim().toUpperCase();
        if (rawSec) uniqueSecs.add(rawSec);
    });

    if (uniqueSecs.size === 0) {
        ['A', 'B', 'C', 'D'].forEach(s => uniqueSecs.add(s));
    }

    const sortedSecs = Array.from(uniqueSecs).sort();
    const targetSec = (preferredSec && (preferredSec === 'ALL' || sortedSecs.includes(preferredSec))) ? preferredSec : 'ALL';

    let optHtml = `<option value="ALL" ${targetSec === 'ALL' ? 'selected' : ''}>Todas las Secciones (Consolidado)</option>`;
    sortedSecs.forEach(sec => {
        optHtml += `<option value="${sec}" ${targetSec === sec ? 'selected' : ''}>Sección ${sec}</option>`;
    });
    secSelect.innerHTML = optHtml;
    secSelect.value = targetSec;
    return targetSec;
}

function onGradeStatsGradeChange() {
    const gradeSelect = document.getElementById('gradeStatsGradeFilter');
    const secSelect = document.getElementById('gradeStatsSectionFilter');
    if (!gradeSelect || !secSelect) return;

    const gVal = gradeSelect.value;
    if (!gVal) {
        gradeSelect.value = '4';
    }
    const prevSec = secSelect.value || 'ALL';
    populateGradeStatsSectionsForGrade(gradeSelect.value || '4', prevSec);
    renderGradeStatsView();
}
window.onGradeStatsGradeChange = onGradeStatsGradeChange;

function renderGradeStatsView() {
    if (!hasRolePermission('grade-stats', STATE.currentRole)) return;

    const container = document.getElementById('gradeStatsDocumentContainer');
    if (!container) return;

    const bimSelect = document.getElementById('gradeStatsBimestreSelect');
    const gradeSelect = document.getElementById('gradeStatsGradeFilter');
    const secSelect = document.getElementById('gradeStatsSectionFilter');

    const period = bimSelect ? (bimSelect.value || 'FINAL') : 'FINAL';
    let gradeVal = gradeSelect ? gradeSelect.value : '';
    let selectedSection = secSelect ? secSelect.value : '';

    // 🌟 A.1: Carga inmediata al entrar — Si no hay grado o sección seleccionada, preseleccionar automáticamente
    if (!gradeVal && gradeSelect) {
        gradeVal = '4';
        gradeSelect.value = '4';
    }
    if (!selectedSection && secSelect && gradeVal) {
        selectedSection = populateGradeStatsSectionsForGrade(gradeVal, 'ALL');
    } else if (secSelect && secSelect.options.length <= 1 && gradeVal) {
        selectedSection = populateGradeStatsSectionsForGrade(gradeVal, selectedSection || 'ALL');
    }

    const gradeLabelMap = { '6': '6to Perito Contador', '5': '5to Perito Contador', '4': '4to Perito Contador' };
    const gradeTitle = gradeLabelMap[gradeVal] || `${gradeVal}to Grado`;

    const periodTitles = {
        'FINAL': 'Promedios Finales',
        '3': 'Promedios 3er Bimestre',
        '2': 'Promedios 2do Bimestre',
        '1': 'Promedios 1er Bimestre',
        '4': 'Promedios 4to Bimestre'
    };
    const periodTitle = periodTitles[period] || 'Promedios Finales';

    const students = STATE.students || [];
    const pensum = STATE.pensum || [];

    function cleanStr(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }

    // 1. Obtener lista oficial de asignaturas directamente desde el PENSUM
    function getOfficialSubjectsForGrade(gVal) {
        const dummyStudent = { grade: `${gVal}to`, gradeLabel: `${gVal}to Perito Contador`, gradeCode: `${gVal}to` };
        let subs = [];

        // Prioridad 1: Obtener usando getReportCardSubjects (que lee STATE.pensumCatalog ordenado oficialmente)
        if (typeof getReportCardSubjects === 'function') {
            try {
                const res = getReportCardSubjects(dummyStudent);
                if (Array.isArray(res) && res.length > 0) {
                    subs = res;
                }
            } catch (err) {
                console.warn("[GradeStats] Error al consultar getReportCardSubjects:", err);
            }
        }

        // Prioridad 2: Si no vino de getReportCardSubjects, buscar en STATE.pensumCatalog
        if (!subs || subs.length === 0) {
            const cleanTarget = cleanStr(`${gVal}to`);
            const catalog = (STATE.pensumCatalog || []).filter(p => {
                const pG = cleanStr(p.grade || p.gradeCode || '');
                return pG && (pG.includes(cleanTarget) || cleanTarget.includes(pG) || pG.includes(gVal));
            });
            const unique = [];
            catalog.forEach(c => {
                const name = (c.name || c.subject || '').trim();
                if (name && !unique.includes(name)) unique.push(name);
            });
            if (unique.length > 0) {
                if (typeof getPensumCatalogOrder === 'function') {
                    unique.sort((a, b) => getPensumCatalogOrder(a, `${gVal}to`) - getPensumCatalogOrder(b, `${gVal}to`));
                }
                subs = unique;
            }
        }

        // Prioridad 3: Buscar en STATE.pensum (asignaciones activas)
        if (!subs || subs.length === 0) {
            const cleanTarget = cleanStr(`${gVal}to`);
            const pList = (STATE.pensum || []).filter(p => {
                const pG = cleanStr(p.grade || p.gradeCode || '');
                return pG && (pG.includes(cleanTarget) || cleanTarget.includes(pG) || pG.includes(gVal));
            });
            const unique = [];
            pList.forEach(p => {
                const name = (p.subject || p.name || '').trim();
                if (name && !unique.includes(name)) unique.push(name);
            });
            if (unique.length > 0) {
                if (typeof getPensumCatalogOrder === 'function') {
                    unique.sort((a, b) => getPensumCatalogOrder(a, `${gVal}to`) - getPensumCatalogOrder(b, `${gVal}to`));
                }
                subs = unique;
            }
        }

        // Prioridad 4: Respaldo canónico oficial de 28 materias del CNB
        if (!subs || subs.length === 0) {
            if (typeof CANONICAL_CNB_28_DICTIONARY !== 'undefined') {
                const gNum = parseInt(gVal) || 6;
                subs = CANONICAL_CNB_28_DICTIONARY.filter(c => c.grade === gNum).map(c => c.full);
            }
        }

        return (subs && subs.length > 0) ? subs : [];
    }

    const officialSubjects = getOfficialSubjectsForGrade(gradeVal);

    // 2. Resolver secciones del grado
    let sectionCols = ['A', 'B', 'C', 'D', 'E'];
    const foundSecs = new Set();
    students.filter(s => {
        const g = String(s.grade || s.gradeLevel || '').toLowerCase();
        return g.includes(`${gradeVal}to`) || (gradeVal === '6' && (g.includes('6to') || g.includes('sexto'))) ||
               (gradeVal === '5' && (g.includes('5to') || g.includes('quinto'))) ||
               (gradeVal === '4' && (g.includes('4to') || g.includes('cuarto')));
    }).forEach(s => {
        const rawSec = (s.section || s.sectionId || '').replace(/^secci[oó]n\s*/i, '').trim().toUpperCase();
        if (rawSec) foundSecs.add(rawSec);
    });
    if (foundSecs.size > 0) sectionCols = Array.from(foundSecs).sort();

    // 3. Resolución flexible de nota de una asignatura para un estudiante
    function getStudentSubjectScore(student, targetSubject, per) {
        if (!student) return { score: null, evaluated: false };
        const cleanTarget = cleanStr(targetSubject);

        function matchKey(dict) {
            if (!dict || typeof dict !== 'object') return null;
            const keys = Object.keys(dict);
            for (const k of keys) {
                if (cleanStr(k) === cleanTarget) return k;
            }
            for (const k of keys) {
                const cK = cleanStr(k);
                if (!cK) continue;
                const numT = (cleanTarget.match(/\d+|[ivx]+$/) || [''])[0];
                const numK = (cK.match(/\d+|[ivx]+$/) || [''])[0];
                const sameNum = (!numT && !numK) || (numT === numK);
                if ((sameNum && (cK.includes(cleanTarget) || cleanTarget.includes(cK))) ||
                    (cleanTarget.includes('gubernamental') && cK.includes('gubernamental')) ||
                    (cleanTarget.includes('organizacion') && cK.includes('organizacion')) ||
                    (cleanTarget.includes('derecho') && cK.includes('derecho')) ||
                    (cleanTarget.includes('seminario') && cK.includes('seminario')) ||
                    (cleanTarget.includes('practica') && cK.includes('practica')) ||
                    (cleanTarget.includes('auditoria') && cK.includes('auditoria')) ||
                    (cleanTarget.includes('etica') && cK.includes('etica')) ||
                    (cleanTarget.includes('estadistica') && cK.includes('estadistica')) ||
                    (cleanTarget.includes('bancaria') && cK.includes('bancaria')) ||
                    (cleanTarget.includes('costos') && cK.includes('costos')) ||
                    (cleanTarget.includes('sociedades') && cK.includes('sociedades')) ||
                    (cleanTarget.includes('mecanografia') && cK.includes('mecanografia')) ||
                    (cleanTarget.includes('archivo') && cK.includes('archivo')) ||
                    (cleanTarget.includes('fiscal') && cK.includes('fiscal')) ||
                    (cleanTarget.includes('finanzas') && cK.includes('finanzas')) ||
                    (cleanTarget.includes('geografia') && cK.includes('geografia')) ||
                    (cleanTarget.includes('redaccion') && cK.includes('redaccion')) ||
                    (cleanTarget.includes('caligrafia') && (cK.includes('caligrafia') || cK.includes('ortografia'))) ||
                    (cleanTarget.includes('ortografia') && (cK.includes('ortografia') || cK.includes('caligrafia'))) ||
                    (cleanTarget.includes('administracion') && (cK.includes('administracion') || cK.includes('organizacion') || cK.includes('oficina'))) ||
                    (cleanTarget.includes('oficina') && (cK.includes('oficina') || cK.includes('administracion') || cK.includes('organizacion'))) ||
                    (cleanTarget.includes('economia') && cK.includes('economia')) ||
                    (cleanTarget.includes('matematica') && cK.includes('matematica'))) {
                    return k;
                }
            }
            return null;
        }

        const matchedKey = matchKey(student.gradebookDetails) || matchKey(student.grades);

        function getUnitVal(u) {
            if (matchedKey && student.gradebookDetails && student.gradebookDetails[matchedKey]) {
                const uData = student.gradebookDetails[matchedKey][u];
                if (uData && (uData.total > 0 || uData.zona > 0 || uData.exam > 0 || (Array.isArray(uData.activities) && uData.activities.some(a => a > 0)))) {
                    const rawVal = uData.total !== undefined ? Number(uData.total) : (Number(uData.zona || 0) + Number(uData.exam || 0));
                    return Math.min(100, Math.max(0, rawVal));
                }
            }
            if (matchedKey && student.grades && student.grades[matchedKey]) {
                const arr = student.grades[matchedKey];
                const val = Array.isArray(arr) ? Number(arr[u - 1] ?? 0) : 0;
                if (val > 0) return Math.min(100, Math.max(0, val));
            }
            return null;
        }

        // 🌟 REGLA INSTITUCIONAL: Promedios oficiales para 4to/5to (4 unidades), 6to (3 unidades),
        // y materias especiales de graduación (Seminario y Práctica: nota única en B4, sin promedio).
        const rawGradeStr = String(student.grade || student.gradeLevel || gradeVal || '').toUpperCase();
        const is6to = rawGradeStr.includes('6') || rawGradeStr.includes('SEXTO') || rawGradeStr.includes('6TO');

        if (typeof window !== 'undefined' && typeof window.getReportCardSubjectGrades === 'function') {
            const r = window.getReportCardSubjectGrades(student, matchedKey || targetSubject);
            if (per === 'FINAL') {
                if (r.isSpecialUnique) {
                    const sc = r.b4 > 0 ? r.b4 : null;
                    return { score: sc, evaluated: sc !== null };
                }
                if (r.isFullyExon) {
                    return { score: null, evaluated: false, isExonerated: true };
                }
                if (r.avg > 0) {
                    return { score: r.avg, evaluated: true };
                }
                return { score: null, evaluated: false };
            } else {
                const u = parseInt(per) || 1;
                if (r.isSpecialUnique) {
                    if (u < 4) return { score: null, evaluated: false };
                    const sc = r.b4 > 0 ? r.b4 : null;
                    return { score: sc, evaluated: sc !== null };
                }
                if (r[`isExon${u}`]) {
                    return { score: null, evaluated: false, isExonerated: true };
                }
                let sc = r[`b${u}`];
                // 🌟 REGLA INSTITUCIONAL DE 6TO: En 6to grado, las 8 materias ordinarias solo se cursan en B1, B2 y B3.
                // En el 4to Bimestre (cierre y sábanas de notas), deben mostrar su PROMEDIO acumulado (r.avg)
                if (is6to && u === 4 && (!sc || sc <= 0) && r.avg > 0) {
                    sc = r.avg;
                }
                return { score: sc > 0 ? sc : null, evaluated: sc > 0 };
            }
        }

        const cleanSub = (targetSubject || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        const isSpecialGrad = cleanSub.includes('seminario') || cleanSub.includes('practica');

        if (per === 'FINAL') {
            if (isSpecialGrad) {
                const s4 = getUnitVal(4) ?? getUnitVal(3) ?? getUnitVal(2) ?? getUnitVal(1);
                if (s4 !== null && s4 > 0) return { score: s4, evaluated: true };
                return { score: null, evaluated: false };
            }
            const unitsTotal = is6to ? 3 : 4;
            const scores = [];
            let exonCount = 0;
            for (let u = 1; u <= unitsTotal; u++) {
                const isEx = (typeof isSubjectBimestreExonerated === 'function' && isSubjectBimestreExonerated(student, targetSubject, u)) ||
                             (typeof window !== 'undefined' && window.isSubjectBimestreExonerated && window.isSubjectBimestreExonerated(student, targetSubject, u));
                if (isEx) {
                    exonCount++;
                    continue;
                }
                const sVal = getUnitVal(u);
                if (sVal !== null && sVal > 0) scores.push(sVal);
            }
            if (exonCount === unitsTotal) return { score: null, evaluated: false, isExonerated: true };
            if (!scores.length) return { score: null, evaluated: false };
            const divisor = Math.max(1, unitsTotal - exonCount);
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / divisor);
            return { score: avg, evaluated: true };
        } else {
            const u = parseInt(per) || 1;
            if (isSpecialGrad) {
                if (u < 4) return { score: null, evaluated: false };
                const s4 = getUnitVal(4) ?? getUnitVal(3) ?? getUnitVal(2) ?? getUnitVal(1);
                if (s4 !== null && s4 > 0) return { score: s4, evaluated: true };
                return { score: null, evaluated: false };
            }
            const isEx = (typeof isSubjectBimestreExonerated === 'function' && isSubjectBimestreExonerated(student, targetSubject, u)) ||
                         (typeof window !== 'undefined' && window.isSubjectBimestreExonerated && window.isSubjectBimestreExonerated(student, targetSubject, u));
            if (isEx) return { score: null, evaluated: false, isExonerated: true };
            let sVal = getUnitVal(u);
            if (is6to && u === 4 && (sVal === null || sVal <= 0)) {
                const uScores = [];
                for (let b = 1; b <= 3; b++) {
                    const v = getUnitVal(b);
                    if (v !== null && v > 0) uScores.push(v);
                }
                if (uScores.length > 0) {
                    sVal = Math.round(uScores.reduce((a, b) => a + b, 0) / uScores.length);
                }
            }
            if (sVal !== null) return { score: sVal, evaluated: true };
            return { score: null, evaluated: false };
        }
    }

    // 4. Procesar alumnos por sección
    const sectionData = {};
    const failedByClass = {};
    officialSubjects.forEach(s => {
        failedByClass[s] = { Total: 0 };
        sectionCols.forEach(sec => failedByClass[s][sec] = 0);
    });

    const bNum = (period === 'FINAL' || !parseInt(period)) ? 4 : parseInt(period);

    sectionCols.forEach(sec => {
        const secStudents = students.filter(s => {
            const g = String(s.grade || s.gradeLevel || '').toLowerCase();
            const matchesGrade = g.includes(`${gradeVal}to`) || (gradeVal === '6' && (g.includes('6to') || g.includes('sexto'))) ||
                                 (gradeVal === '5' && (g.includes('5to') || g.includes('quinto'))) ||
                                 (gradeVal === '4' && (g.includes('4to') || g.includes('cuarto')));
            if (!matchesGrade) return false;
            const sSec = (s.section || s.sectionId || '').replace(/^secci[oó]n\s*/i, '').trim().toUpperCase();
            return sSec === sec;
        }).sort((a, b) => {
            const nameA = formatStudentDisplayName(a, 'lastFirst').toUpperCase();
            const nameB = formatStudentDisplayName(b, 'lastFirst').toUpperCase();
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        let aprobados = 0, recuperacion = 0, reprobados = 0, retirados = 0;
        const processedStudents = [];

        secStudents.forEach((st, idx) => {
            const isBimRetired = (st.status === 'Retirado' || st.status === 'Inactivo') && ((typeof isStudentRetiredInBimestre === 'function') ? isStudentRetiredInBimestre(st, bNum) : true);
            const isBimAusente = (st.status === 'Ausente') && ((typeof isStudentRetiredInBimestre === 'function') ? isStudentRetiredInBimestre(st, bNum) : true);
            const isRetirado = isBimRetired || isBimAusente;
            const isExonStudent = !isRetirado && ((typeof isStudentExonerated === 'function') ? isStudentExonerated(st, bNum) : false);

            if (isRetirado) {
                retirados++;
            }

            const subjectScores = [];
            let lostCount = 0;

            officialSubjects.forEach(subj => {
                const res = getStudentSubjectScore(st, subj, period);
                subjectScores.push(res);
                if (!isRetirado && res.evaluated && res.score !== null) {
                    if (res.score < 60) {
                        lostCount++;
                        failedByClass[subj][sec]++;
                        failedByClass[subj].Total++;
                    }
                }
            });

            const evalList = subjectScores.filter(s => s.evaluated && s.score !== null);
            const genAvg = evalList.length ? (evalList.reduce((acc, x) => acc + x.score, 0) / evalList.length) : 0;

            if (!isRetirado) {
                if (lostCount === 0 && genAvg >= 60) {
                    aprobados++;
                } else if (lostCount >= 1 && lostCount <= 3) {
                    recuperacion++;
                } else if (lostCount > 3 || (evalList.length > 0 && genAvg < 60)) {
                    reprobados++;
                }
            }

            let statusTag = '';
            if (isBimRetired) {
                statusTag = ` <span style="font-size:0.68rem; color:#b91c1c; font-weight:bold;">[RETIRADO]</span>`;
            } else if (isBimAusente) {
                statusTag = ` <span style="font-size:0.68rem; color:#b45309; font-weight:bold;">[AUSENTE]</span>`;
            } else if (isExonStudent) {
                statusTag = ` <span style="font-size:0.68rem; color:#0369a1; font-weight:bold;">[EXONERADO B${bNum}]</span>`;
            }

            processedStudents.push({
                clave: idx + 1,
                student: st,
                name: formatStudentDisplayName(st, 'lastFirst').toUpperCase(),
                scores: subjectScores,
                average: genAvg,
                lostCount: lostCount,
                isRetirado: isRetirado,
                statusTag: statusTag
            });
        });

        sectionData[sec] = {
            total: secStudents.length,
            aprobados,
            recuperacion,
            reprobados,
            retirados,
            students: processedStudents
        };
    });

    // Totales globales
    let totAprobados = 0, totRecup = 0, totReprob = 0, totRetir = 0, totTotal = 0;
    sectionCols.forEach(sec => {
        totAprobados += sectionData[sec].aprobados;
        totRecup += sectionData[sec].recuperacion;
        totReprob += sectionData[sec].reprobados;
        totRetir += sectionData[sec].retirados;
        totTotal += sectionData[sec].total;
    });

    const now = new Date();
    const dateFormattedLong = now.toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const footerTimestamp = `${now.toLocaleDateString('es-GT')} ${timeFormatted}`;

    let html = '';

    // =========================================================================
    // PÁGINA 1: RESUMEN GENERAL INSTITUCIONAL (TABLA 1 Y TABLA 2)
    // =========================================================================
    const isFilteredSection = (selectedSection !== 'ALL');
    const colsForSummary = isFilteredSection ? [selectedSection] : sectionCols;

    // Paleta de colores pastel distintivos para separar visualmente cada columna de clase en la sábana
    const CLASS_COLUMN_PALETTE = [
        { headerBg: '#dbeafe', cellBg: '#f8fafc', border: '#93c5fd' }, // Azul cielo
        { headerBg: '#fef3c7', cellBg: '#fffdf5', border: '#fcd34d' }, // Ámbar / Crema
        { headerBg: '#dcfce7', cellBg: '#f6fef9', border: '#86efac' }, // Verde menta
        { headerBg: '#f3e8ff', cellBg: '#fbf7ff', border: '#d8b4fe' }, // Púrpura lavanda
        { headerBg: '#ffedd5', cellBg: '#fffaf5', border: '#fdba74' }, // Melocotón / Naranja
        { headerBg: '#cffafe', cellBg: '#f2feff', border: '#67e8f9' }, // Cian / Aqua
        { headerBg: '#fce7f3', cellBg: '#fdf4f8', border: '#f9a8d4' }, // Rosa pastel
        { headerBg: '#e0e7ff', cellBg: '#f5f7ff', border: '#a5b4fc' }, // Índigo / Celeste
        { headerBg: '#ccfbf1', cellBg: '#f3fdfb', border: '#5eead4' }, // Menta suave
        { headerBg: '#ede9fe', cellBg: '#f8f6ff', border: '#c4b5fd' }, // Violeta suave
        { headerBg: '#fef9c3', cellBg: '#fffef0', border: '#fde047' }, // Amarillo pastel
        { headerBg: '#e2e8f0', cellBg: '#f8fafc', border: '#cbd5e1' }  // Pizarra claro
    ];

    html += `
    <div class="encco-doc-page encco-doc-summary-page">
        <!-- ENCABEZADO INSTITUCIONAL CON ESCUDO -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="width:65px; text-align:left;">
                <img src="logo.png" alt="Escudo ENCCO" style="height:55px; width:auto; object-fit:contain;" onerror="this.style.display='none'">
            </div>
            <div style="flex:1; text-align:center; padding:0 8px;">
                <div style="display:inline-block; border:1.5px solid #000; padding:3px 16px; border-radius:4px; background:#fef3c7; margin-bottom:4px;">
                    <h2 style="margin:0; font-size:1.05rem; font-weight:900; color:#000; letter-spacing:0.3px; font-family:'Arial', sans-serif;">
                        Escuela Nacional de Ciencias Comerciales
                    </h2>
                </div>
                <div style="border-bottom:1.5px solid #000; padding-bottom:3px; margin-top:2px;">
                    <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#000; font-family:'Arial', sans-serif;">
                        Resumen de ${periodTitle} ${gradeVal}to Grado ${isFilteredSection ? `(Sección ${selectedSection})` : ''}
                    </h3>
                </div>
            </div>
            <div style="width:140px; text-align:right; font-size:0.75rem; font-weight:600; color:#334155; padding-top:2px;">
                ${dateFormattedLong}
            </div>
        </div>

        <!-- TABLA 1: RESUMEN ESTADÍSTICO POR SECCIÓN -->
        <div style="overflow-x:auto; width:100%; margin-top:6px; margin-bottom:12px;">
        <table class="encco-official-table">
            <thead>
                <tr>
                    <th style="width:38%; background:#ffffff !important; border-top:1px solid #000; border-left:1px solid #000; font-size:0.82rem;"></th>
                    ${colsForSummary.map(s => `<th style="font-size:0.82rem;">${gradeVal}to ${s}</th>`).join('')}
                    ${!isFilteredSection ? '<th style="width:14%; background:#e0f2fe !important; font-size:0.82rem;">Total</th>' : ''}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-weight:bold; font-size:0.82rem; padding-left:8px;">Aprobados</td>
                    ${colsForSummary.map(s => `<td style="text-align:center; font-weight:bold; font-size:0.82rem;">${sectionData[s] ? sectionData[s].aprobados : 0}</td>`).join('')}
                    ${!isFilteredSection ? `<td style="text-align:center; font-weight:bold; font-size:0.82rem; background:#f8fafc;">${totAprobados}</td>` : ''}
                </tr>
                <tr>
                    <td style="font-weight:bold; font-size:0.82rem; padding-left:8px;">Derecho a Recuperación</td>
                    ${colsForSummary.map(s => `<td style="text-align:center; font-weight:bold; font-size:0.82rem;">${sectionData[s] ? sectionData[s].recuperacion : 0}</td>`).join('')}
                    ${!isFilteredSection ? `<td style="text-align:center; font-weight:bold; font-size:0.82rem; background:#f8fafc;">${totRecup}</td>` : ''}
                </tr>
                <tr style="${totReprob > 0 ? 'background:#fff1f2;' : ''}">
                    <td style="font-weight:bold; font-size:0.82rem; padding-left:8px; color:${totReprob > 0 ? '#b91c1c' : '#000'};">Reprobados</td>
                    ${colsForSummary.map(s => {
                        const rCount = sectionData[s] ? sectionData[s].reprobados : 0;
                        const hasFails = rCount > 0;
                        return `<td style="text-align:center; font-weight:bold; font-size:0.82rem; ${hasFails ? 'background:#fee2e2; color:#b91c1c; border:1.5px solid #ef4444;' : 'color:#000;'}">${rCount}</td>`;
                    }).join('')}
                    ${!isFilteredSection ? `<td style="text-align:center; font-weight:bold; font-size:0.82rem; ${totReprob > 0 ? 'background:#fecdd3; color:#9f1239; border:1.5px solid #f43f5e;' : 'background:#f8fafc; color:#000;'}">${totReprob}</td>` : ''}
                </tr>
                <tr style="${totRetir > 0 ? 'background:#fff7ed;' : ''}">
                    <td style="font-weight:bold; font-size:0.82rem; padding-left:8px; color:${totRetir > 0 ? '#c2410c' : '#000'};">Retirados</td>
                    ${colsForSummary.map(s => {
                        const retCount = sectionData[s] ? sectionData[s].retirados : 0;
                        return `<td style="text-align:center; font-weight:bold; font-size:0.82rem; color:${retCount > 0 ? '#c2410c' : '#000'};">${retCount}</td>`;
                    }).join('')}
                    ${!isFilteredSection ? `<td style="text-align:center; font-weight:bold; font-size:0.82rem; background:#f8fafc; color:${totRetir > 0 ? '#c2410c' : '#000'};">${totRetir}</td>` : ''}
                </tr>
                <tr style="background:#f1f5f9; border-top:1.5px solid #000;">
                    <td style="font-weight:900; font-size:0.82rem; padding-left:8px;">Total de Estudiantes</td>
                    ${colsForSummary.map(s => `<td style="text-align:center; font-weight:900; font-size:0.82rem;">${sectionData[s] ? sectionData[s].total : 0}</td>`).join('')}
                    ${!isFilteredSection ? `<td style="text-align:center; font-weight:900; font-size:0.82rem; background:#e2e8f0;">${totTotal}</td>` : ''}
                </tr>
            </tbody>
        </table>
        </div>

        <!-- TABLA 2: CONTEO DE REPROBADOS POR CLASE (RESALTADO VISUAL CLARO) -->
        <div style="overflow-x:auto; width:100%; margin-bottom:8px;">
        <table class="encco-official-table">
            <thead>
                <tr>
                    <th style="width:38%; text-align:left; padding-left:8px; font-size:0.80rem;">Reprobados por Clase</th>
                    ${colsForSummary.map(s => `<th style="font-size:0.80rem;">${gradeVal}to ${s}</th>`).join('')}
                    ${!isFilteredSection ? '<th style="width:14%; background:#e0f2fe !important; font-size:0.80rem;">Total</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${officialSubjects.map(subj => {
                    const rowTot = failedByClass[subj].Total;
                    return `
                    <tr>
                        <td style="padding-left:8px; font-weight:600; font-size:0.80rem;">${escapeHtml(subj)}</td>
                        ${colsForSummary.map(s => {
                            const cVal = failedByClass[subj][s] || 0;
                            const isFail = cVal > 0;
                            return `<td style="text-align:center; font-weight:${isFail ? 'bold' : 'normal'}; font-size:0.80rem; ${isFail ? 'background-color:#fee2e2; color:#b91c1c; border:1.2px solid #ef4444;' : 'color:#000;'}">${cVal}</td>`;
                        }).join('')}
                        ${!isFilteredSection ? `<td style="text-align:center; font-weight:bold; font-size:0.80rem; ${rowTot > 0 ? 'background-color:#fecdd3; color:#9f1239; border:1.2px solid #f43f5e;' : 'background-color:#f8fafc; color:#000;'}">${rowTot}</td>` : ''}
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        </div>
    </div>`;

    // =========================================================================
    // PÁGINA 2 EN ADELANTE: SÁBANA DE NOTAS INDIVIDUALES POR ALUMNO (TABLA 3)
    // EXACTA A LA IMAGEN ADJUNTA POR EL USUARIO (media_1789739932280.png)
    // =========================================================================
    const sectionsToRender = (selectedSection === 'ALL') ? sectionCols : [selectedSection];

    sectionsToRender.forEach((sec, sIdx) => {
        const secInfo = sectionData[sec] || { students: [] };
        const stList = secInfo.students || [];

        // Generar filas para alumnos reales
        let rowsHtml = '';
        stList.forEach(item => {
            const hasLost = item.lostCount > 0;
            const lostCellClass = hasLost ? 'encco-lost-highlight' : '';
            const rowStyle = hasLost ? 'background-color:#fff9f9;' : '';

            rowsHtml += `
                <tr style="${rowStyle}">
                    <td style="text-align:center; font-weight:bold; font-size:0.72rem;">${item.clave}</td>
                    <td style="font-weight:bold; font-size:0.72rem; padding-left:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#000;">
                        ${escapeHtml(item.name)}${item.statusTag || ''}
                    </td>
                    ${item.scores.map((sObj, cIdx) => {
                        const colTheme = CLASS_COLUMN_PALETTE[cIdx % CLASS_COLUMN_PALETTE.length];
                        if (!sObj.evaluated || sObj.score === null) {
                            return `<td style="text-align:center; font-size:0.72rem; background-color:${colTheme.cellBg}; border-left:1px solid ${colTheme.border}; border-right:1px solid ${colTheme.border};"></td>`;
                        }
                        const isFail = sObj.score < 60;
                        if (isFail) {
                            return `<td style="text-align:center; font-weight:900; font-size:0.72rem; background-color:#fee2e2 !important; color:#b91c1c !important; border:1.5px solid #ef4444 !important;">${Math.round(sObj.score)}</td>`;
                        }
                        return `<td style="text-align:center; font-weight:bold; font-size:0.72rem; background-color:${colTheme.cellBg}; color:#000; border-left:1px solid ${colTheme.border}; border-right:1px solid ${colTheme.border};">${Math.round(sObj.score)}</td>`;
                    }).join('')}
                    <td class="encco-td-pink" style="font-weight:bold; font-size:0.72rem; color:${item.average < 60 && item.average > 0 ? '#b91c1c' : '#000'}; ${item.average < 60 && item.average > 0 ? 'background-color:#fee2e2 !important; font-weight:900;' : ''}">
                        ${item.average > 0 ? Number(item.average).toFixed(2) : '0.00'}
                    </td>
                    <td class="encco-td-pink ${lostCellClass}" style="font-weight:bold; font-size:0.72rem; ${hasLost ? 'background-color:#fecdd3 !important; color:#9f1239 !important; font-weight:900 !important; border:1.5px solid #f43f5e !important;' : ''}">
                        ${item.lostCount}
                    </td>
                </tr>`;
        });

        // Completar visualmente filas si la sección tiene pocos alumnos (mínimo 25 para no saturar hoja)
        const targetRowCount = Math.max(stList.length, 25);
        for (let i = stList.length + 1; i <= targetRowCount; i++) {
            rowsHtml += `
                <tr style="height:18px;">
                    <td style="text-align:center; color:#cbd5e1; font-size:0.72rem;">${i}</td>
                    <td style="text-align:left; color:#cbd5e1; padding-left:4px; font-size:0.72rem;"></td>
                    ${officialSubjects.map((_, cIdx) => {
                        const colTheme = CLASS_COLUMN_PALETTE[cIdx % CLASS_COLUMN_PALETTE.length];
                        return `<td style="text-align:center; font-size:0.72rem; background-color:${colTheme.cellBg}; border-left:1px solid ${colTheme.border}; border-right:1px solid ${colTheme.border};"></td>`;
                    }).join('')}
                    <td class="encco-td-pink" style="font-size:0.72rem;"></td>
                    <td class="encco-td-pink" style="font-size:0.72rem;"></td>
                </tr>`;
        }

        html += `
        <div class="encco-doc-page encco-doc-sabana-page">
            <!-- ENCABEZADO OFICIAL DE LA SÁBANA (EXACTO A LA FOTO OFICIAL) -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div style="flex:1; text-align:center; padding-left:70px;">
                    <div style="margin:0; font-size:12px; font-weight:900; text-transform:uppercase; font-family:Arial, sans-serif; letter-spacing:0.3px; color:#000;">
                        ESCUELA NACIONAL EN CIENCIAS COMERCIALES, JUTIAPA
                    </div>
                    <div style="margin:2px 0 0 0; font-size:12px; font-weight:900; font-family:Arial, sans-serif; color:#000;">
                        ${periodTitle}
                    </div>
                </div>
                <div style="flex-shrink:0;">
                    <table style="border-collapse:collapse; border:1.5px solid #000; font-size:11px; font-weight:bold;">
                        <tr>
                            <td style="border:1.5px solid #000; padding:2px 7px; text-transform:none;">Grado</td>
                            <td style="border:1.5px solid #000; padding:2px 7px; text-align:center;">${gradeVal}</td>
                            <td style="border:1.5px solid #000; padding:2px 7px; text-transform:none;">Seccion</td>
                            <td style="border:1.5px solid #000; padding:2px 7px; text-align:center;">${sec}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- TABLA 3: SÁBANA DE NOTAS INDIVIDUALES POR ALUMNO CON COLORES DE SEPARACIÓN POR COLUMNA DE CLASE -->
            <div style="overflow-x:auto; width:100%;">
            <table class="encco-official-table encco-sabana-table" style="margin-bottom:4px;">
                <thead>
                    <tr style="min-height:48px;">
                        <th style="width:34px; vertical-align:middle; text-align:center; font-size:0.72rem; background:#f1f5f9 !important;">Clave</th>
                        <th style="min-width:170px; vertical-align:middle; text-align:center; font-size:0.72rem; background:#f1f5f9 !important;">Alumno</th>
                        ${officialSubjects.map((s, cIdx) => {
                            const colTheme = CLASS_COLUMN_PALETTE[cIdx % CLASS_COLUMN_PALETTE.length];
                            return `<th style="vertical-align:middle; text-align:center; line-height:1.15; padding:3px 2px; word-break:break-word; font-size:0.72rem; background-color:${colTheme.headerBg} !important; border-left:1.5px solid ${colTheme.border} !important; border-right:1.5px solid ${colTheme.border} !important;">${escapeHtml(s)}</th>`;
                        }).join('')}
                        <th class="encco-th-pink" style="min-width:60px; vertical-align:middle; line-height:1.12; font-size:0.72rem;">
                            Promedios<br>Generales
                        </th>
                        <th class="encco-th-pink" style="min-width:55px; vertical-align:middle; line-height:1.12; font-size:0.72rem;">
                            Cátedras<br>Perdidas
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="background:#f1f5f9; font-weight:900; border-top:2px solid #0f172a;">
                        <td colspan="2" style="text-align:right; padding-right:8px; font-weight:900; font-size:0.74rem; background:#f8fafc;">
                            PROMEDIO DE LA CLASE:
                        </td>
                        ${officialSubjects.map((s, cIdx) => {
                            const colTheme = CLASS_COLUMN_PALETTE[cIdx % CLASS_COLUMN_PALETTE.length];
                            const colScores = stList.map(item => item.scores[cIdx]).filter(sc => sc && sc.evaluated && sc.score !== null);
                            const cAvg = colScores.length > 0 ? (colScores.reduce((a, b) => a + b.score, 0) / colScores.length) : null;
                            const isFailAvg = cAvg !== null && cAvg < 60;
                            return `<td style="text-align:center; font-weight:900; font-size:0.74rem; background-color:${colTheme.headerBg}; border-left:1px solid ${colTheme.border}; border-right:1px solid ${colTheme.border}; color:${isFailAvg ? '#b91c1c' : '#0f172a'};">${cAvg !== null ? cAvg.toFixed(2) : '—'}</td>`;
                        }).join('')}
                        <td class="encco-td-pink" style="text-align:center; font-weight:900; font-size:0.74rem;">
                            ${(() => {
                                const activeSt = stList.filter(item => !item.isRetirado && item.average > 0);
                                return activeSt.length > 0 ? (activeSt.reduce((a, b) => a + b.average, 0) / activeSt.length).toFixed(2) : '0.00';
                            })()}
                        </td>
                        <td class="encco-td-pink" style="text-align:center; font-weight:900; font-size:0.74rem;">
                            ${stList.reduce((acc, item) => acc + (item.lostCount || 0), 0)}
                        </td>
                    </tr>
                </tfoot>
            </table>
            </div>

            <!-- PIE DE PÁGINA OFICIAL -->
            <div style="display:flex; justify-content:flex-end; font-size:8px; font-weight:bold; color:#475569; margin-top:4px;">
                ${gradeVal}${sec} &bull; ${footerTimestamp}
            </div>
        </div>`;
    });

    container.innerHTML = html;

    // Construir filas de resumen para compatibilidad con printGradeStatsReport
    const sectionRows = [];
    let sumAllAvgs = 0;
    let countAllAvgs = 0;
    sectionCols.forEach(sec => {
        const sInf = sectionData[sec] || { total: 0, aprobados: 0, recuperacion: 0, reprobados: 0, retirados: 0, students: [] };
        const activeList = (sInf.students || []).filter(x => !x.isRetirado && x.average > 0);
        const secAvg = activeList.length > 0
            ? Number((activeList.reduce((a, b) => a + b.average, 0) / activeList.length).toFixed(2))
            : 0;
        activeList.forEach(x => { sumAllAvgs += x.average; countAllAvgs++; });
        const evalTotal = Math.max(1, sInf.total - sInf.retirados);
        const failedTotalSec = sInf.recuperacion + sInf.reprobados;
        sectionRows.push({
            grade: gradeTitle,
            section: sec,
            total: sInf.total,
            avg: secAvg.toFixed(2),
            approved: sInf.aprobados,
            pctApproved: sInf.total > 0 ? Math.round((sInf.aprobados / evalTotal) * 100) : 0,
            failed: failedTotalSec,
            pctFailed: sInf.total > 0 ? Math.round((failedTotalSec / evalTotal) * 100) : 0
        });
    });

    const schoolAvgNum = countAllAvgs > 0 ? Number((sumAllAvgs / countAllAvgs).toFixed(2)) : 0;
    const evalGrandTotal = Math.max(1, totTotal - totRetir);
    const totalFailedCombined = totRecup + totReprob;
    const totalPctApproved = totTotal > 0 ? Math.round((totAprobados / evalGrandTotal) * 100) : 0;
    const totalPctFailed = totTotal > 0 ? Math.round((totalFailedCombined / evalGrandTotal) * 100) : 0;

    const gradeRows = [{
        grade: gradeTitle,
        sections: sectionCols.join(', '),
        total: totTotal,
        avg: schoolAvgNum.toFixed(2),
        approved: totAprobados,
        pctApproved: totalPctApproved,
        failed: totalFailedCombined,
        pctFailed: totalPctFailed
    }];

    // Guardar referencia en memoria para exportar a Excel e Imprimir
    window._lastGradeStatsReportData = {
        gradeVal,
        gradeTitle,
        period,
        bimLabel: periodTitle,
        gradeFilterLabel: selectedSection === 'ALL' ? `${gradeTitle} (Todas las Secciones)` : `${gradeTitle} - Sección ${selectedSection}`,
        selectedSection,
        sectionCols,
        officialSubjects,
        sectionData,
        failedByClass,
        totAprobados,
        totRecup,
        totReprob,
        totRetir,
        totTotal,
        totalStudents: totTotal,
        schoolAvg: schoolAvgNum.toFixed(2),
        totalApproved: totAprobados,
        totalPctApproved,
        totalFailed: totalFailedCombined,
        totalPctFailed,
        sectionRows,
        gradeRows,
        dateFormattedLong
    };
}
window.renderGradeStatsView = renderGradeStatsView;

// ==========================================================================
// EXPORTACIÓN OFICIAL DE PROMEDIOS FINALES A EXCEL (.XLSX)
// ==========================================================================
function exportGradeStatsOfficialExcel() {
    if (!window._lastGradeStatsReportData) {
        renderGradeStatsView();
    }
    const d = window._lastGradeStatsReportData;
    if (!d) {
        showToast("No hay datos cargados para exportar.", "warning");
        return;
    }

    let excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Promedios Finales ENCCO</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
            <style>
                body { font-family: Arial, sans-serif; font-size: 10pt; }
                .title { font-size: 14pt; font-weight: bold; text-align: center; }
                .subtitle { font-size: 12pt; font-weight: bold; text-align: center; }
                th { background-color: #dbeafe; border: 1pt solid #000; font-weight: bold; text-align: center; }
                td { border: 0.5pt solid #000; vertical-align: middle; }
                .pink { background-color: #ffe4e6; font-weight: bold; text-align: center; }
                .red { color: #dc2626; font-weight: bold; }
                .total-row { background-color: #f1f5f9; font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <tr><td colspan="${d.officialSubjects.length + 4}" class="title">ESCUELA NACIONAL EN CIENCIAS COMERCIALES, JUTIAPA</td></tr>
                <tr><td colspan="${d.officialSubjects.length + 4}" class="subtitle">Resumen de Promedios Finales - ${escapeHtml(d.gradeTitle)}</td></tr>
                <tr><td colspan="${d.officialSubjects.length + 4}" style="text-align:right;">Emisión: ${escapeHtml(d.dateFormattedLong)}</td></tr>
                <tr></tr>
                <!-- TABLA 1 -->
                <tr><th colspan="${d.sectionCols.length + 2}" style="text-align:left; background:#cbe2f8;">1. RESUMEN ESTADÍSTICO POR SECCIÓN</th></tr>
                <tr>
                    <th style="text-align:left;">Concepto</th>
                    ${d.sectionCols.map(s => `<th>${d.gradeVal}to ${s}</th>`).join('')}
                    <th>Total</th>
                </tr>
                <tr>
                    <td><strong>Aprobados</strong></td>
                    ${d.sectionCols.map(s => `<td style="text-align:center;">${d.sectionData[s].aprobados}</td>`).join('')}
                    <td style="text-align:center; font-weight:bold;">${d.totAprobados}</td>
                </tr>
                <tr>
                    <td><strong>Derecho a Recuperación</strong></td>
                    ${d.sectionCols.map(s => `<td style="text-align:center;">${d.sectionData[s].recuperacion}</td>`).join('')}
                    <td style="text-align:center; font-weight:bold;">${d.totRecup}</td>
                </tr>
                <tr>
                    <td><strong>Reprobados</strong></td>
                    ${d.sectionCols.map(s => `<td style="text-align:center; ${d.sectionData[s].reprobados > 0 ? 'color:#dc2626; font-weight:bold;' : ''}">${d.sectionData[s].reprobados}</td>`).join('')}
                    <td style="text-align:center; font-weight:bold; ${d.totReprob > 0 ? 'color:#dc2626;' : ''}">${d.totReprob}</td>
                </tr>
                <tr>
                    <td><strong>Retirados</strong></td>
                    ${d.sectionCols.map(s => `<td style="text-align:center; ${d.sectionData[s].retirados > 0 ? 'color:#b91c1c;' : ''}">${d.sectionData[s].retirados}</td>`).join('')}
                    <td style="text-align:center; font-weight:bold; ${d.totRetir > 0 ? 'color:#b91c1c;' : ''}">${d.totRetir}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total de Estudiantes</strong></td>
                    ${d.sectionCols.map(s => `<td style="text-align:center; font-weight:bold;">${d.sectionData[s].total}</td>`).join('')}
                    <td style="text-align:center; font-weight:bold;">${d.totTotal}</td>
                </tr>
                <tr></tr>
                <!-- TABLA 2 -->
                <tr><th colspan="${d.sectionCols.length + 2}" style="text-align:left; background:#cbe2f8;">2. CONTEO DE REPROBADOS POR CLASE</th></tr>
                <tr>
                    <th style="text-align:left;">Asignatura</th>
                    ${d.sectionCols.map(s => `<th>${d.gradeVal}to ${s}</th>`).join('')}
                    <th>Total</th>
                </tr>
                ${d.officialSubjects.map(subj => `
                    <tr>
                        <td>${escapeHtml(subj)}</td>
                        ${d.sectionCols.map(s => `<td style="text-align:center; ${d.failedByClass[subj][s] > 0 ? 'color:#dc2626; font-weight:bold;' : ''}">${d.failedByClass[subj][s]}</td>`).join('')}
                        <td style="text-align:center; font-weight:bold; ${d.failedByClass[subj].Total > 0 ? 'color:#dc2626;' : ''}">${d.failedByClass[subj].Total}</td>
                    </tr>
                `).join('')}
                <tr></tr>
                <!-- TABLA 3 -->
                <tr><th colspan="${d.officialSubjects.length + 4}" style="text-align:left; background:#cbe2f8;">3. SÁBANA DE NOTAS INDIVIDUALES POR ALUMNO</th></tr>
            `;

    d.sectionCols.forEach(sec => {
        const sInfo = d.sectionData[sec];
        if (!sInfo || !sInfo.students || !sInfo.students.length) return;

        excelContent += `
            <tr><td colspan="${d.officialSubjects.length + 4}" style="background:#e0f2fe; font-weight:bold; font-size:11pt;">GRADO: ${d.gradeVal}to &nbsp;&nbsp; SECCIÓN: ${sec}</td></tr>
            <tr>
                <th style="width:40px;">Clave</th>
                <th style="width:250px; text-align:left;">Alumno</th>
                ${d.officialSubjects.map(s => `<th>${escapeHtml(s)}</th>`).join('')}
                <th class="pink">Promedio General</th>
                <th class="pink">Cátedras Perdidas</th>
            </tr>
        `;

        sInfo.students.forEach(item => {
            excelContent += `
                <tr>
                    <td style="text-align:center;">${item.clave}</td>
                    <td>${escapeHtml(item.name)}${item.statusTag ? ' ' + item.statusTag.replace(/<[^>]+>/g, '') : ''}</td>
                    ${item.scores.map(sc => `<td style="text-align:center; ${sc.evaluated && sc.score < 60 ? 'color:#dc2626; font-weight:bold;' : ''}">${sc.evaluated && sc.score !== null ? sc.score : ''}</td>`).join('')}
                    <td class="pink">${item.average.toFixed(2)}</td>
                    <td class="pink ${item.lostCount > 0 ? 'red' : ''}">${item.lostCount}</td>
                </tr>
            `;
        });

        // Fila de promedios de la clase por cátedra en Excel
        excelContent += `
            <tr style="background:#f1f5f9; font-weight:bold;">
                <td colspan="2" style="text-align:right; font-weight:bold;">PROMEDIO DE LA CLASE:</td>
                ${d.officialSubjects.map((s, cIdx) => {
                    const cScores = sInfo.students.map(item => item.scores[cIdx]).filter(sc => sc && sc.evaluated && sc.score !== null);
                    const cAvg = cScores.length > 0 ? (cScores.reduce((a, b) => a + b.score, 0) / cScores.length).toFixed(2) : '—';
                    return `<td style="text-align:center; font-weight:bold;">${cAvg}</td>`;
                }).join('')}
                <td class="pink">${(() => {
                    const activeSt = sInfo.students.filter(item => !item.isRetirado && item.average > 0);
                    return activeSt.length > 0 ? (activeSt.reduce((a, b) => a + b.average, 0) / activeSt.length).toFixed(2) : '0.00';
                })()}</td>
                <td class="pink">${sInfo.students.reduce((acc, item) => acc + (item.lostCount || 0), 0)}</td>
            </tr>
            <tr></tr>
        `;
    });

    excelContent += `
            </table>
        </body>
        </html>
    `;

    downloadFormattedExcelWorkbook(excelContent, `promedios_finales_${d.gradeVal}to_encc.xlsx`);
    showToast("Acta Oficial de Promedios Finales exportada en Microsoft Excel (.xlsx).", "info");
}
window.exportGradeStatsOfficialExcel = exportGradeStatsOfficialExcel;

function printGradeStatsReport(reportType = 'section') {
    if (!hasRolePermission('grade-stats', STATE.currentRole)) {
        if (typeof showToast === 'function') showToast('No tiene permisos para imprimir este informe.', 'warning');
        return;
    }

    if (!window._lastGradeStatsReportData) {
        renderGradeStatsView();
    }

    const data = window._lastGradeStatsReportData;
    if (!data) {
        if (typeof showToast === 'function') showToast('No hay datos estadísticos para generar el documento.', 'warning');
        return;
    }

    const h = STATE.schoolHeaderConfig || {};
    const schoolName = h.schoolName || 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES';
    const schoolCode = h.mineducCode || h.schoolCode || '22-01-0014-46';
    const logoUrl = h.logoUrl || 'logo.png';
    const cycle = STATE.currentAcademicCycle || h.schoolCycle || '2026';
    const capDate = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });

    const isByGrades = reportType === 'grades';
    const reportTitle = isByGrades ? 'CUADRO CONSOLIDADO DE PROMEDIOS POR GRADO' : 'INFORME ESTADÍSTICO DE PROMEDIOS POR SECCIÓN';

    let tableHeaders = '';
    let tableBodyRows = '';

    if (isByGrades) {
        tableHeaders = `
            <tr>
                <th style="width:40px;">No.</th>
                <th>Grado y Carrera</th>
                <th style="width:120px; text-align:center;">Secciones</th>
                <th style="width:90px; text-align:center;">Total Alumnos</th>
                <th style="width:100px; text-align:center;">Promedio Gral.</th>
                <th style="width:90px; text-align:center;">Aprobados</th>
                <th style="width:90px; text-align:center;">% Aprobados</th>
                <th style="width:90px; text-align:center;">Reprobados</th>
                <th style="width:90px; text-align:center;">% Reprobados</th>
            </tr>`;

        data.gradeRows.forEach((r, idx) => {
            tableBodyRows += `
                <tr>
                    <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
                    <td style="font-weight:bold;">${escapeHtml(r.grade)}</td>
                    <td style="text-align:center;">${escapeHtml(r.sections)}</td>
                    <td style="text-align:center; font-weight:bold;">${r.total}</td>
                    <td style="text-align:center; font-weight:bold; font-size:11px;">${r.avg}</td>
                    <td style="text-align:center; color:#166534; font-weight:bold;">${r.approved}</td>
                    <td style="text-align:center;">${r.pctApproved}%</td>
                    <td style="text-align:center; color:#991b1b; font-weight:bold;">${r.failed}</td>
                    <td style="text-align:center;">${r.pctFailed}%</td>
                </tr>`;
        });

        tableBodyRows += `
            <tr style="background-color:#f1f5f9; font-weight:bold;">
                <td colspan="3" style="text-align:right; text-transform:uppercase; padding-right:12px; font-weight:bold;">TOTAL INSTITUCIONAL:</td>
                <td style="text-align:center; font-weight:bold;">${data.totalStudents}</td>
                <td style="text-align:center; font-weight:bold; font-size:11px;">${data.schoolAvg}</td>
                <td style="text-align:center; color:#166534; font-weight:bold;">${data.totalApproved}</td>
                <td style="text-align:center; font-weight:bold;">${data.totalPctApproved}%</td>
                <td style="text-align:center; color:#991b1b; font-weight:bold;">${data.totalFailed}</td>
                <td style="text-align:center; font-weight:bold;">${data.totalPctFailed}%</td>
            </tr>`;
    } else {
        tableHeaders = `
            <tr>
                <th style="width:40px;">No.</th>
                <th>Grado y Carrera</th>
                <th style="width:80px; text-align:center;">Sección</th>
                <th style="width:90px; text-align:center;">Total Alumnos</th>
                <th style="width:100px; text-align:center;">Promedio Gral.</th>
                <th style="width:90px; text-align:center;">Aprobados</th>
                <th style="width:90px; text-align:center;">% Aprobados</th>
                <th style="width:90px; text-align:center;">Reprobados</th>
                <th style="width:90px; text-align:center;">% Reprobados</th>
            </tr>`;

        data.sectionRows.forEach((r, idx) => {
            tableBodyRows += `
                <tr>
                    <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
                    <td style="font-weight:bold;">${escapeHtml(r.grade)}</td>
                    <td style="text-align:center; font-weight:bold;">${escapeHtml(r.section)}</td>
                    <td style="text-align:center;">${r.total}</td>
                    <td style="text-align:center; font-weight:bold;">${r.avg}</td>
                    <td style="text-align:center; color:#166534;">${r.approved}</td>
                    <td style="text-align:center;">${r.pctApproved}%</td>
                    <td style="text-align:center; color:#991b1b;">${r.failed}</td>
                    <td style="text-align:center;">${r.pctFailed}%</td>
                </tr>`;
        });

        tableBodyRows += `
            <tr style="background-color:#f1f5f9; font-weight:bold;">
                <td colspan="3" style="text-align:right; text-transform:uppercase; padding-right:12px; font-weight:bold;">TOTAL EVALUADOS:</td>
                <td style="text-align:center; font-weight:bold;">${data.totalStudents}</td>
                <td style="text-align:center; font-weight:bold; font-size:11px;">${data.schoolAvg}</td>
                <td style="text-align:center; color:#166534; font-weight:bold;">${data.totalApproved}</td>
                <td style="text-align:center; font-weight:bold;">${data.totalPctApproved}%</td>
                <td style="text-align:center; color:#991b1b; font-weight:bold;">${data.totalFailed}</td>
                <td style="text-align:center; font-weight:bold;">${data.totalPctFailed}%</td>
            </tr>`;
    }

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) {
        if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
            window.EnccoDialog.alert({ title: 'Ventana Emergente Bloqueada', message: 'Por favor permita las ventanas emergentes (pop-ups) en su navegador para imprimir el reporte.', type: 'warning' });
        } else if (typeof showToast === 'function') {
            showToast('Por favor permita las ventanas emergentes (pop-ups) en su navegador para imprimir el reporte.', 'warning');
        } else {
            console.warn('Por favor permita las ventanas emergentes (pop-ups) en su navegador para imprimir el reporte.');
        }
        return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(reportTitle)} - ENCCO Jutiapa</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 24px;
            color: #000;
            background: #fff;
            font-size: 11px;
        }
        .print-btn-bar {
            text-align: right;
            margin-bottom: 16px;
        }
        .btn-print-now {
            background: #0284c7;
            color: #fff;
            padding: 8px 16px;
            border: none;
            font-size: 11px;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-close-now {
            background: #64748b;
            color: #fff;
            padding: 8px 14px;
            border: none;
            font-size: 11px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 6px;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }
        .header-logo {
            width: 70px;
            vertical-align: middle;
            text-align: center;
        }
        .header-logo img {
            max-width: 60px;
            max-height: 60px;
            object-fit: contain;
        }
        .header-text {
            vertical-align: middle;
            text-align: center;
            padding-left: 10px;
        }
        .line-mineduc {
            font-size: 9.5px;
            font-weight: bold;
            color: #333;
            letter-spacing: 0.5px;
        }
        .line-school {
            font-size: 13px;
            font-weight: 900;
            color: #000;
            margin: 2px 0;
        }
        .line-title {
            font-size: 11.5px;
            font-weight: 800;
            color: #000;
            text-decoration: underline;
            margin: 3px 0;
        }
        .line-meta {
            font-size: 9px;
            color: #444;
            font-weight: bold;
        }
        .simple-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10.5px;
        }
        .simple-table th {
            background-color: #f1f5f9;
            border: 1px solid #000;
            padding: 6px 4px;
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
        }
        .simple-table td {
            border: 1px solid #000;
            padding: 5px 6px;
            vertical-align: middle;
        }
        .summary-box {
            margin-top: 14px;
            display: flex;
            gap: 12px;
            justify-content: space-between;
        }
        .summary-item {
            flex: 1;
            border: 1px solid #000;
            padding: 6px 10px;
            text-align: center;
            background: #fafafa;
        }
        .summary-item .num {
            font-size: 14px;
            font-weight: bold;
        }
        .summary-item .lbl {
            font-size: 8.5px;
            font-weight: bold;
            color: #444;
            text-transform: uppercase;
        }
        .footer-note {
            margin-top: 24px;
            font-size: 8.5px;
            color: #555;
            text-align: right;
            border-top: 1px dashed #999;
            padding-top: 6px;
        }
        @media print {
            .print-btn-bar { display: none !important; }
            body { padding: 0 !important; margin: 10mm !important; }
            @page { margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="print-btn-bar">
        <button class="btn-print-now" onclick="window.print()">🖨️ Imprimir Documento</button>
        <button class="btn-close-now" onclick="window.close()">✖ Cerrar</button>
    </div>

    <table class="header-table">
        <tr>
            <td class="header-logo">
                <img src="${escapeHtml(logoUrl)}" alt="Escudo Institucional" onerror="this.style.display='none'">
            </td>
            <td class="header-text">
                <div class="line-mineduc">MINISTERIO DE EDUCACIÓN &bull; DIRECCIÓN DEPARTAMENTAL DE EDUCACIÓN DE JUTIAPA</div>
                <div class="line-school">${escapeHtml(schoolName)}</div>
                <div class="line-title">${escapeHtml(reportTitle)}</div>
                <div class="line-meta">
                    ${escapeHtml(data.bimLabel.toUpperCase())} &bull; ${escapeHtml(data.gradeFilterLabel.toUpperCase())} &bull; CICLO ESCOLAR ${escapeHtml(cycle)} &bull; JORNADA VESPERTINA &bull; CÓDIGO: ${escapeHtml(schoolCode)}
                </div>
            </td>
        </tr>
    </table>

    <table class="simple-table">
        <thead>
            ${tableHeaders}
        </thead>
        <tbody>
            ${tableBodyRows}
        </tbody>
    </table>

    <div class="summary-box">
        <div class="summary-item">
            <div class="num">${data.schoolAvg}</div>
            <div class="lbl">Promedio General</div>
        </div>
        <div class="summary-item">
            <div class="num" style="color:#166534;">${data.totalApproved} (${data.totalPctApproved}%)</div>
            <div class="lbl">Total Aprobados</div>
        </div>
        <div class="summary-item">
            <div class="num" style="color:#991b1b;">${data.totalFailed} (${data.totalPctFailed}%)</div>
            <div class="lbl">Total Reprobados</div>
        </div>
        <div class="summary-item">
            <div class="num">${data.totalStudents}</div>
            <div class="lbl">Total Alumnos Evaluados</div>
        </div>
    </div>

    <div class="footer-note">
        Documento Estadístico e Informativo Institucional &bull; Fecha de emisión: ${escapeHtml(capDate)} &bull; ENCCO Jutiapa
    </div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();

    const triggerPrint = () => {
        try {
            printWin.focus();
            printWin.print();
        } catch (e) {
            console.error("Error al imprimir reporte:", e);
        }
    };

    const imgEl = printWin.document.querySelector('img');
    if (imgEl) {
        if (imgEl.complete) {
            setTimeout(triggerPrint, 250);
        } else {
            imgEl.onload = () => setTimeout(triggerPrint, 200);
            imgEl.onerror = () => setTimeout(triggerPrint, 200);
            setTimeout(triggerPrint, 1000);
        }
    } else {
        setTimeout(triggerPrint, 300);
    }
}
window.printGradeStatsReport = printGradeStatsReport;


// ==========================================================================
// MÓDULO OFICIAL: CUADRO DE RESUMEN ESTADÍSTICO INSTITUCIONAL ENCCO
// Compatible con Ciclo Histórico 2026 y Ciclo Activo 2027 (Firebase RTDB)
// ==========================================================================
window._currentGradeStatsActiveTab = 'actas';
window._lastCuadroEstadisticoData = null;

function switchGradeStatsTab(tab) {
    window._currentGradeStatsActiveTab = tab;
    const btnActas = document.getElementById('tabGradeStatsActas');
    const btnCuadro = document.getElementById('tabGradeStatsCuadro');
    const btnReprobados = document.getElementById('tabGradeStatsReprobados');
    const filterControls = document.querySelectorAll('#view-grade-stats .toolbar-filters > div');

    const updateBtn = (btn, isActive, activeBg = '#0284c7') => {
        if (!btn) return;
        if (isActive) {
            btn.style.background = activeBg;
            btn.style.color = '#ffffff';
            btn.style.border = 'none';
            btn.style.boxShadow = '0 1px 3px rgba(2,132,199,0.3)';
        } else {
            btn.style.background = '#f1f5f9';
            btn.style.color = '#475569';
            btn.style.border = '1px solid #cbd5e1';
            btn.style.boxShadow = 'none';
        }
    };

    updateBtn(btnActas, tab === 'actas');
    updateBtn(btnCuadro, tab === 'cuadro');
    updateBtn(btnReprobados, tab === 'reprobados');

    if (tab === 'cuadro') {
        filterControls.forEach(el => el.style.display = 'none');
        renderCuadroEstadisticoOficial();
    } else if (tab === 'reprobados') {
        filterControls.forEach(el => el.style.display = 'none');
        renderReprobadosRecuperacionView();
    } else {
        filterControls.forEach(el => el.style.display = '');
        renderGradeStatsView();
    }
}
window.switchGradeStatsTab = switchGradeStatsTab;

function renderCuadroEstadisticoOficial() {
    const container = document.getElementById('gradeStatsDocumentContainer');
    if (!container) return;

    const STATE = window.STATE || {};
    const viewingCycle = String(
        STATE.viewingHistoricalCycle || 
        STATE.historicalViewingCycle || 
        (STATE.isHistoricalReadOnlyMode ? '2026' : (STATE.activeCycle || '2027'))
    ).trim();

    const is2026Official = (viewingCycle === '2026' || (STATE.isHistoricalReadOnlyMode && (STATE.historicalViewingCycle === '2026' || STATE.viewingHistoricalCycle === '2026')));

    let statData;

    if (is2026Official) {
        // DATOS OFICIALES AUDITADOS DEL CICLO 2026 (MINEDUC SIRE)
        statData = {
            cycle: '2026',
            isOfficialHistorical: true,
            establecimiento: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES',
            codigo: '22-01-0014-46',
            carrera: 'PERITO CONTADOR',
            direccion: 'Complejo Educativo, Barrio el Cóndor, Jutiapa',
            jornadaSector: 'Vespertina / Oficial',
            municipioDepto: 'Jutiapa, Jutiapa',
            grados: [
                { nombre: 'CUARTO', hi: 78, hp: 41, hcd: 26, hsd: 11, mi: 60, mp: 34, mcd: 20, msd: 6, tot: 138 },
                { nombre: 'QUINTO', hi: 60, hp: 47, hcd: 12, hsd: 1,  mi: 86, mp: 78, mcd: 7,  msd: 1, tot: 146 },
                { nombre: 'SEXTO',  hi: 45, hp: 43, hcd: 2,  hsd: 0,  mi: 83, mp: 77, mcd: 6,  msd: 0, tot: 128 }
            ],
            totales: { hi: 183, hp: 131, hcd: 40, hsd: 12, mi: 229, mp: 189, mcd: 33, msd: 7, tot: 412 },
            docentes: {
                h011: 8, h021: 3, hReub: 0, hTot: 11,
                m011: 4, m021: 5, mTot: 9,
                total: 20, tot011: 12, tot021: 8
            },
            directora: 'Licda. Mirza Elizabeth Aragón Polanco de Hernández'
        };
    } else {
        // CÁLCULO DINÁMICO EN TIEMPO REAL DESDE FIREBASE RTDB PARA 2027+
        const students = Array.isArray(STATE.students) ? STATE.students : [];
        const byGrade = {
            'CUARTO': { hi: 0, hp: 0, hcd: 0, hsd: 0, mi: 0, mp: 0, mcd: 0, msd: 0, tot: 0 },
            'QUINTO': { hi: 0, hp: 0, hcd: 0, hsd: 0, mi: 0, mp: 0, mcd: 0, msd: 0, tot: 0 },
            'SEXTO':  { hi: 0, hp: 0, hcd: 0, hsd: 0, mi: 0, mp: 0, mcd: 0, msd: 0, tot: 0 }
        };

        students.forEach(s => {
            const gStr = String(s.grade || s.gradeCode || s.gradeLevel || '').toUpperCase();
            let gKey = 'CUARTO';
            if (gStr.includes('6TO') || gStr.includes('SEXTO')) gKey = 'SEXTO';
            else if (gStr.includes('5TO') || gStr.includes('QUINTO')) gKey = 'QUINTO';

            const rawGen = String(s.gender || s.genero || s.sex || '').toUpperCase();
            const isH = rawGen.startsWith('MASC') || rawGen.startsWith('H') || rawGen === 'M';

            // REGLA 1: TRATAMIENTO DE ALUMNOS RETIRADOS
            if (s.status === 'Retirado') {
                // Si el expediente físico permanece en la escuela, se toma como no promovido sin derecho a recuperación
                if (s.hasExpediente !== false) {
                    if (isH) { byGrade[gKey].hi++; byGrade[gKey].hsd++; }
                    else { byGrade[gKey].mi++; byGrade[gKey].msd++; }
                    byGrade[gKey].tot++;
                }
                // Si no tiene expediente en la escuela (traslado/anulación), no se computa en la estadística
                return;
            }

            // REGLA 2: PENSUM Y PROMEDIO (10 materias en 6to con cierre de 3 bimestres académicos)
            const gradesObj = s.grades || {};
            let reprobadas = 0;
            let totalCursos = 0;

            Object.keys(gradesObj).forEach(cName => {
                const b = gradesObj[cName];
                if (!Array.isArray(b) || b.length === 0) return;
                totalCursos++;

                let promedioCurso = 0;
                if (gKey === 'SEXTO') {
                    if (cName.toLowerCase().includes('práctica') || cName.toLowerCase().includes('practica')) {
                        promedioCurso = Number(b[3] || b[0] || 0); // Bloque de Práctica
                    } else if (cName.toLowerCase().includes('seminario')) {
                        promedioCurso = Number(b[2] || b[3] || b[0] || 0);
                    } else {
                        // 8 Materias académicas regulares de Sexto promediadas sobre los 3 bimestres cursados
                        const validScores = b.slice(0, 3).map(Number);
                        const sum = validScores.reduce((acc, v) => acc + v, 0);
                        promedioCurso = Math.round(sum / (validScores.length || 1));
                    }
                } else {
                    // Cuarto y Quinto: Promedio estándar de 4 bimestres
                    const validScores = b.map(Number);
                    const sum = validScores.reduce((acc, v) => acc + v, 0);
                    promedioCurso = Math.round(sum / (validScores.length || 1));
                }

                if (promedioCurso < 60) {
                    reprobadas++;
                }
            });

            // REGLA 3: UMBRAL DE PROMOCIÓN MINEDUC (Art. 26 Acuerdo 1171-2010 y 1770-2020)
            // 4to y 5to: Hasta 3 materias reprobadas = Con Derecho a Recuperación; 4 o más = Sin Derecho.
            // 6to: Hasta 4 materias reprobadas = Con Derecho a Recuperación; más de 4 (>=5) = Sin Derecho.
            const maxRecup = (gKey === 'SEXTO') ? 4 : 3;
            const isPromovido = (reprobadas === 0);
            const isConDerecho = (reprobadas > 0 && reprobadas <= maxRecup);
            const isSinDerecho = (reprobadas > maxRecup);

            if (isH) {
                byGrade[gKey].hi++;
                if (isPromovido) byGrade[gKey].hp++;
                else if (isConDerecho) byGrade[gKey].hcd++;
                else if (isSinDerecho) byGrade[gKey].hsd++;
            } else {
                byGrade[gKey].mi++;
                if (isPromovido) byGrade[gKey].mp++;
                else if (isConDerecho) byGrade[gKey].mcd++;
                else if (isSinDerecho) byGrade[gKey].msd++;
            }
            byGrade[gKey].tot++;
        });

        // Totales dinámicos
        const totales = { hi: 0, hp: 0, hcd: 0, hsd: 0, mi: 0, mp: 0, mcd: 0, msd: 0, tot: 0 };
        ['CUARTO', 'QUINTO', 'SEXTO'].forEach(g => {
            totales.hi += byGrade[g].hi; totales.hp += byGrade[g].hp;
            totales.hcd += byGrade[g].hcd; totales.hsd += byGrade[g].hsd;
            totales.mi += byGrade[g].mi; totales.mp += byGrade[g].mp;
            totales.mcd += byGrade[g].mcd; totales.msd += byGrade[g].msd;
            totales.tot += byGrade[g].tot;
        });

        // Conteo dinámico de docentes desde STATE.users
        const users = Array.isArray(STATE.users) ? STATE.users : [];
        const docentesList = users.filter(u => u && (u.role === 'docente' || String(u.role).includes('docente')));
        let dh011 = 0, dh021 = 0, dm011 = 0, dm021 = 0;
        docentesList.forEach(d => {
            const gen = String(d.genero || d.gender || '').toUpperCase();
            const isMasc = gen.startsWith('MASC') || gen.startsWith('H') || gen === 'M';
            const reng = String(d.renglon || d.budgetLine || '011');
            if (isMasc) {
                if (reng.includes('021')) dh021++; else dh011++;
            } else {
                if (reng.includes('021')) dm021++; else dm011++;
            }
        });

        statData = {
            cycle: viewingCycle,
            isOfficialHistorical: false,
            establecimiento: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES',
            codigo: '22-01-0014-46',
            carrera: 'PERITO CONTADOR',
            direccion: 'Complejo Educativo, Barrio el Cóndor, Jutiapa',
            jornadaSector: 'Vespertina / Oficial',
            municipioDepto: 'Jutiapa, Jutiapa',
            grados: [
                { nombre: 'CUARTO', ...byGrade['CUARTO'] },
                { nombre: 'QUINTO', ...byGrade['QUINTO'] },
                { nombre: 'SEXTO',  ...byGrade['SEXTO']  }
            ],
            totales: totales,
            docentes: {
                h011: dh011 || 8, h021: dh021 || 3, hReub: 0, hTot: (dh011 || 8) + (dh021 || 3),
                m011: dm011 || 4, m021: dm021 || 5, mTot: (dm011 || 4) + (dm021 || 5),
                total: docentesList.length || 20,
                tot011: (dh011 || 8) + (dm011 || 4),
                tot021: (dh021 || 3) + (dm021 || 5)
            },
            directora: 'Licda. Mirza Elizabeth Aragón Polanco de Hernández'
        };
    }

    window._lastCuadroEstadisticoData = statData;

    // RENDERIZADO DEL CUADRO ESTADÍSTICO EN EL CONTENEDOR (Optimizado para Tablet Blackview Zeno 10 5G y Desktop)
    const html = `
    <div class="no-print" style="max-width:1240px; margin:0 auto 14px auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; padding:10px 16px;">
        <div style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-file-circle-check" style="color:#16a34a; font-size:1.15rem;"></i>
            <div>
                <span style="font-weight:800; font-size:0.92rem; color:#14532d; display:block;">Cuadro Oficial MINEDUC - Vista Ampliada y Centrada</span>
                <span style="font-size:0.75rem; color:#15803d;">Ajustado para visualizar con total nitidez y centrado en pantalla, y para imprimirse en 1 sola hoja carta horizontal.</span>
            </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:inline-flex; border-radius:6px; overflow:hidden; border:1px solid #cbd5e1; background:#ffffff;">
                <button type="button" class="cuadro-zoom-btn" data-scale="1.0" onclick="setCuadroZoom(1.0)" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border:none; background:#ffffff; color:#475569; cursor:pointer;" title="Escala Normal 100%">100%</button>
                <button type="button" class="cuadro-zoom-btn" data-scale="1.1" onclick="setCuadroZoom(1.1)" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border:none; background:#0284c7; color:#ffffff; border-left:1px solid #cbd5e1; cursor:pointer;" title="Escala Ampliada Recomendada">110% Ampliado</button>
                <button type="button" class="cuadro-zoom-btn" data-scale="1.2" onclick="setCuadroZoom(1.2)" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border:none; background:#ffffff; color:#475569; border-left:1px solid #cbd5e1; cursor:pointer;" title="Gran Formato / Tablet">120% Máximo</button>
            </div>
            <button type="button" class="btn btn-primary" onclick="printCuadroEstadisticoOficial()" style="background:#0284c7; border:none; color:#ffffff; font-weight:800; font-size:0.85rem; padding:8px 16px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(2,132,199,0.25);">
                <i class="fa-solid fa-print"></i> Imprimir en 1 Hoja Carta Horizontal
            </button>
        </div>
    </div>
    <div class="cuadro-estadistico-view encco-doc-page" style="transform-origin:top center; transform:scale(1.1); margin-bottom:50px;">
        <!-- ENCABEZADO INSTITUCIONAL -->
        <div class="cuadro-header">
            <div style="width:75px; text-align:center;">
                <img src="logo.png" alt="Escudo Institucional" style="max-width:70px; max-height:70px; object-fit:contain;" onerror="this.style.display='none'">
            </div>
            <div style="flex:1; text-align:center; padding:0 15px;">
                <div style="font-size:16px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px;">CUADRO DE RESUMEN ESTADÍSTICO FINAL</div>
                <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px;">SOBRE EL RENDIMIENTO ESCOLAR DEL CICLO ${statData.cycle}</div>
                <div style="font-size:11px; font-weight:600; color:#64748b; letter-spacing:1px; margin-top:1px;">NIVEL DE EDUCACIÓN MEDIA - CICLO DIVERSIFICADO</div>
            </div>
            <div style="width:75px; text-align:right;">
                ${statData.isOfficialHistorical ? '<span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; border:1px solid #86efac;">OFICIAL SIRE</span>' : '<span style="background:#e0f2fe; color:#0369a1; font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; border:1px solid #7dd3fc;">ACTIVO EN VIVO</span>'}
            </div>
        </div>

        <!-- INFORMACIÓN GENERAL (RESPONSIVO EN 10.1") -->
        <div class="cuadro-info-grid">
            <div><strong style="color:#1e3a8a;">ESTABLECIMIENTO:</strong> ${statData.establecimiento}</div>
            <div><strong style="color:#1e3a8a;">CÓDIGO:</strong> ${statData.codigo}</div>
            <div><strong style="color:#1e3a8a;">CARRERA:</strong> ${statData.carrera}</div>
            <div><strong style="color:#1e3a8a;">DIRECCIÓN:</strong> ${statData.direccion}</div>
            <div><strong style="color:#1e3a8a;">JORNADA / SECTOR:</strong> ${statData.jornadaSector}</div>
            <div><strong style="color:#1e3a8a;">MUNICIPIO / DEPTO:</strong> ${statData.municipioDepto}</div>
        </div>

        <!-- TABLA PRINCIPAL DE RENDIMIENTO ESCOLAR (CON DESPLAZAMIENTO TÁCTIL Y COLUMNA FIJA) -->
        <div class="cuadro-table-container">
            <table class="cuadro-table">
                <thead>
                    <tr class="cuadro-hdr-row">
                        <th rowspan="2" class="grade-col" style="width:14%;">GRADO</th>
                        <th colspan="4" style="border:1px solid #94a3b8; padding:6px; width:39%;">HOMBRES</th>
                        <th colspan="4" style="border:1px solid #94a3b8; padding:6px; width:39%;">MUJERES</th>
                        <th rowspan="2" style="border:1px solid #94a3b8; padding:6px; width:8%;">TOTAL<br>EVALUADOS</th>
                    </tr>
                    <tr style="background:#e2e8f0; color:#1e3a8a; font-size:9.5px; font-weight:700;">
                        <th style="border:1px solid #94a3b8; padding:4px;">INSCRITOS</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">PROMOVIDOS</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">NO PROM.<br>C/DERECHO</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">NO PROM.<br>S/DERECHO</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">INSCRITAS</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">PROMOVIDAS</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">NO PROM.<br>C/DERECHO</th>
                        <th style="border:1px solid #94a3b8; padding:4px;">NO PROM.<br>S/DERECHO</th>
                    </tr>
                </thead>
                <tbody>
                    ${statData.grados.map((g, idx) => `
                        <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                            <td class="grade-col">${g.nombre}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px;">${g.hi}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; font-weight:700; color:#166534;">${g.hp}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; color:#b45309;">${g.hcd}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; color:#b91c1c;">${g.hsd}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px;">${g.mi}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; font-weight:700; color:#166534;">${g.mp}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; color:#b45309;">${g.mcd}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; color:#b91c1c;">${g.msd}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; font-weight:800; background:#f1f5f9;">${g.tot}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="cuadro-totales-row">
                        <td class="grade-col">TOTALES</td>
                        <td style="border:1px solid #94a3b8; padding:7px;">${statData.totales.hi}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#166534;">${statData.totales.hp}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#b45309;">${statData.totales.hcd}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#b91c1c;">${statData.totales.hsd}</td>
                        <td style="border:1px solid #94a3b8; padding:7px;">${statData.totales.mi}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#166534;">${statData.totales.mp}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#b45309;">${statData.totales.mcd}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#b91c1c;">${statData.totales.msd}</td>
                        <td style="border:1px solid #94a3b8; padding:7px; color:#1e3a8a; font-size:12px;">${statData.totales.tot}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- SECCIÓN DOCENTES -->
        <div class="cuadro-docentes-wrapper">
            <div class="cuadro-docentes-title">
                Personal Docente en Servicio (${statData.isOfficialHistorical ? 'Nómina Oficial SIRE 2026' : 'Nómina Activa'})
            </div>
            <div class="cuadro-docentes-grid">
                <div style="padding:8px 10px; border-right:1px solid #cbd5e1;">
                    <strong style="color:#1e3a8a;">HOMBRES:</strong> 
                    011 = <strong>${statData.docentes.h011}</strong> &nbsp;|&nbsp; 
                    021 = <strong>${statData.docentes.h021}</strong> &nbsp;|&nbsp; 
                    REUBICADOS = <strong>${statData.docentes.hReub}</strong> &nbsp;
                    <span style="color:#64748b;">(Subtotal: ${statData.docentes.hTot})</span>
                </div>
                <div style="padding:8px 10px; border-right:1px solid #cbd5e1;">
                    <strong style="color:#1e3a8a;">MUJERES:</strong> 
                    011 = <strong>${statData.docentes.m011}</strong> &nbsp;|&nbsp; 
                    021 = <strong>${statData.docentes.m021}</strong> &nbsp;
                    <span style="color:#64748b;">(Subtotal: ${statData.docentes.mTot})</span>
                </div>
                <div style="padding:8px 10px; background:#f8fafc;">
                    <strong style="color:#1e3a8a;">TOTAL DOCENTES:</strong> 
                    <strong>${statData.docentes.total}</strong> &nbsp;
                    <span style="color:#1e3a8a;">[011 = <strong>${statData.docentes.tot011}</strong> &nbsp;|&nbsp; 021 = <strong>${statData.docentes.tot021}</strong>]</span>
                </div>
            </div>
        </div>

        <!-- FIRMAS Y SELLO (Espacio amplio para firma y sello oficial; nombre de la Directora debajo de la línea) -->
        <div class="cuadro-signatures" style="margin-top:26px; padding-top:12px;">
            <div style="width:30%; font-size:11.5px; color:#334155; line-height:1.5; padding-bottom:4px;">
                <strong style="color:#1e3a8a;">Lugar y fecha:</strong><br>
                Jutiapa, 31 de octubre de ${statData.cycle}
            </div>
            <div style="width:30%; text-align:center; font-size:11.5px; font-weight:700; color:#94a3b8; letter-spacing:3px; padding-bottom:18px;">
                ( S E L L O )
            </div>
            <div style="width:38%; text-align:center;">
                <!-- Espacio libre vertical generoso para firma manuscrita / rúbrica -->
                <div style="height:52px;"></div>
                <!-- Línea de firma -->
                <div style="border-bottom:2px solid #0f172a; width:85%; margin:0 auto 6px auto;"></div>
                <!-- Nombre de la Directora ABAJO DE LA LÍNEA -->
                <div style="font-size:11.5px; font-weight:700; color:#0f172a; margin-bottom:2px;">${statData.directora}</div>
                <div style="font-size:10.5px; font-weight:600; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">Directora</div>
            </div>
        </div>
    </div>
    `;

    container.innerHTML = html;
}
window.renderCuadroEstadisticoOficial = renderCuadroEstadisticoOficial;

// Sobrescribir exportGradeStatsOfficialExcel para dar soporte dual a Cuadro Estadístico y Actas
const _origExportGradeStatsOfficialExcel = window.exportGradeStatsOfficialExcel;
window.exportGradeStatsOfficialExcel = function() {
    if (window._currentGradeStatsActiveTab === 'cuadro' && window._lastCuadroEstadisticoData) {
        const d = window._lastCuadroEstadisticoData;
        const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
                .title { font-size: 14pt; font-weight: bold; text-align: center; color: #1e3a8a; }
                .subtitle { font-size: 11pt; font-weight: bold; text-align: center; }
                th { background-color: #1e3a8a; color: #ffffff; border: 1pt solid #000; font-weight: bold; text-align: center; }
                .sub-th { background-color: #e2e8f0; color: #1e3a8a; border: 1pt solid #000; font-weight: bold; text-align: center; }
                td { border: 0.5pt solid #000; vertical-align: middle; text-align: center; }
                .grade-lbl { font-weight: bold; background-color: #f1f5f9; }
                .tot-row { background-color: #dbeafe; font-weight: bold; font-size: 11pt; }
            </style>
        </head>
        <body>
            <table>
                <tr><td colspan="10" class="title">CUADRO DE RESUMEN ESTADÍSTICO FINAL</td></tr>
                <tr><td colspan="10" class="subtitle">SOBRE EL RENDIMIENTO ESCOLAR DEL CICLO ${d.cycle} - DIVERSIFICADO</td></tr>
                <tr><td colspan="10"></td></tr>
                <tr>
                    <td colspan="5" style="text-align:left;"><b>ESTABLECIMIENTO:</b> ${d.establecimiento}</td>
                    <td colspan="5" style="text-align:left;"><b>CÓDIGO:</b> ${d.codigo}</td>
                </tr>
                <tr>
                    <td colspan="5" style="text-align:left;"><b>CARRERA:</b> ${d.carrera}</td>
                    <td colspan="5" style="text-align:left;"><b>DIRECCIÓN:</b> ${d.direccion}</td>
                </tr>
                <tr><td colspan="10"></td></tr>
                <tr>
                    <th rowspan="2">GRADO</th>
                    <th colspan="4">HOMBRES</th>
                    <th colspan="4">MUJERES</th>
                    <th rowspan="2">TOTAL<br>EVALUADOS</th>
                </tr>
                <tr>
                    <th class="sub-th">INSCRITOS</th>
                    <th class="sub-th">PROMOVIDOS</th>
                    <th class="sub-th">NO PROM. C/D</th>
                    <th class="sub-th">NO PROM. S/D</th>
                    <th class="sub-th">INSCRITAS</th>
                    <th class="sub-th">PROMOVIDAS</th>
                    <th class="sub-th">NO PROM. C/D</th>
                    <th class="sub-th">NO PROM. S/D</th>
                </tr>
                ${d.grados.map(g => `
                    <tr>
                        <td class="grade-lbl">${g.nombre}</td>
                        <td>${g.hi}</td>
                        <td>${g.hp}</td>
                        <td>${g.hcd}</td>
                        <td>${g.hsd}</td>
                        <td>${g.mi}</td>
                        <td>${g.mp}</td>
                        <td>${g.mcd}</td>
                        <td>${g.msd}</td>
                        <td><b>${g.tot}</b></td>
                    </tr>
                `).join('')}
                <tr class="tot-row">
                    <td>TOTALES</td>
                    <td>${d.totales.hi}</td>
                    <td>${d.totales.hp}</td>
                    <td>${d.totales.hcd}</td>
                    <td>${d.totales.hsd}</td>
                    <td>${d.totales.mi}</td>
                    <td>${d.totales.mp}</td>
                    <td>${d.totales.mcd}</td>
                    <td>${d.totales.msd}</td>
                    <td>${d.totales.tot}</td>
                </tr>
                <tr><td colspan="10"></td></tr>
                <tr>
                    <td colspan="10" style="text-align:left; background-color:#f8fafc; font-weight:bold;">
                        DOCENTES: &nbsp; HOMBRES: 011= ${d.docentes.h011} &nbsp; 021= ${d.docentes.h021} &nbsp; REUBICADOS= ${d.docentes.hReub} &nbsp;&nbsp;|&nbsp;&nbsp; 
                        MUJERES: 011= ${d.docentes.m011} &nbsp; 021= ${d.docentes.m021} &nbsp;&nbsp;|&nbsp;&nbsp; 
                        TOTAL: ${d.docentes.total} &nbsp; (011= ${d.docentes.tot011} &nbsp; 021= ${d.docentes.tot021})
                    </td>
                </tr>
                <tr><td colspan="10"></td></tr>
                <tr>
                    <td colspan="4" style="text-align:left; border:none;">Lugar y fecha: Jutiapa, 31 de octubre de ${d.cycle}</td>
                    <td colspan="2" style="border:none;">( S E L L O )</td>
                    <td colspan="4" style="text-align:center; border:none;">
                        ____________________________________________<br>
                        <b>${d.directora}</b><br>
                        Directora
                    </td>
                </tr>
            </table>
        </body>
        </html>`;

        const blob = new Blob(["﻿", excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cuadro_Resumen_Estadistico_Oficial_${d.cycle}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    if (typeof _origExportGradeStatsOfficialExcel === 'function') {
        _origExportGradeStatsOfficialExcel();
    }
};

// ==========================================================================
// IMPRESIÓN OFICIAL DEL CUADRO ESTADÍSTICO MINEDUC (TAMAÑO CARTA HORIZONTAL EN 1 HOJA)
// ==========================================================================
function printCuadroEstadisticoOficial() {
    if (!window._lastCuadroEstadisticoData) {
        renderCuadroEstadisticoOficial();
    }
    const d = window._lastCuadroEstadisticoData;
    if (!d) {
        showToast("No se encontraron datos del Cuadro Estadístico para imprimir.", "warning");
        return;
    }

    const printWin = window.open('', '_blank', 'width=1150,height=850');
    if (!printWin) {
        // En caso de bloqueo de ventanas emergentes, imprimir en la misma ventana con clase dedicada
        document.body.classList.add('print-cuadro-mode');
        window.print();
        setTimeout(() => document.body.classList.remove('print-cuadro-mode'), 2000);
        return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cuadro de Resumen Estadístico Final ${d.cycle} - Escuela Nacional de Ciencias Comerciales</title>
<style>
    @page {
        size: letter landscape;
        margin: 4mm 6mm;
    }
    *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Calibri, Arial, Helvetica, sans-serif;
    }
    html, body {
        width: 100%;
        height: 100%;
        min-height: 100vh;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .print-sheet {
        width: 100%;
        max-width: 268mm;
        margin: auto;
        padding: 4mm 6mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
    }
    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2.5px solid #1e3a8a;
        padding-bottom: 6px;
        margin-bottom: 8px;
    }
    .logo-container {
        width: 75px;
        text-align: center;
    }
    .logo-container img {
        max-width: 70px;
        max-height: 70px;
        object-fit: contain;
    }
    .title-container {
        flex: 1;
        text-align: center;
        padding: 0 12px;
    }
    .title-main {
        font-size: 19px;
        font-weight: 900;
        color: #1e3a8a;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-bottom: 2px;
        line-height: 1.2;
    }
    .title-sub {
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .title-level {
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        letter-spacing: 1px;
    }
    .info-grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 5px 20px;
        background: #f8fafc;
        border: 1.5px solid #94a3b8;
        border-radius: 6px;
        padding: 8px 16px;
        margin-bottom: 10px;
        font-size: 11.5px;
        line-height: 1.35;
    }
    .info-row {
        display: flex;
        align-items: center;
    }
    .info-label {
        font-weight: 800;
        color: #1e3a8a;
        width: 140px;
        flex-shrink: 0;
        font-size: 11px;
    }
    .info-val {
        color: #0f172a;
        font-weight: 700;
        font-size: 11.5px;
    }
    table.stats-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        text-align: center;
        border: 1.5px solid #475569;
    }
    table.stats-table th, table.stats-table td {
        border: 1px solid #64748b;
        padding: 6px 4px;
        vertical-align: middle;
    }
    table.stats-table thead tr th {
        background: #1e3a8a;
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.3px;
        border: 1px solid #475569;
    }
    table.stats-table thead tr.sub-hdr th {
        background: #e2e8f0;
        color: #1e3a8a;
        font-size: 10.5px;
        font-weight: 800;
        line-height: 1.2;
        border: 1px solid #94a3b8;
    }
    table.stats-table tbody tr:nth-child(even) {
        background: #f8fafc;
    }
    table.stats-table tbody td {
        font-size: 13.5px;
        font-weight: 600;
        color: #0f172a;
    }
    table.stats-table tbody td.grade-col {
        font-weight: 800;
        color: #0f172a;
        background: #f1f5f9;
        font-size: 13px;
        text-align: center;
    }
    table.stats-table tfoot tr td {
        background: #dbeafe;
        color: #0f172a;
        font-weight: 800;
        font-size: 14.5px;
        border-top: 2.5px solid #1e3a8a;
        border-bottom: 2.5px double #1e3a8a;
        padding: 7px 4px;
    }
    .docentes-section {
        border: 1.5px solid #94a3b8;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 12px;
        background: #ffffff;
    }
    .docentes-header {
        background: #1e293b;
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding: 4px 10px;
        text-align: center;
    }
    .docentes-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1.15fr;
        background: #ffffff;
        font-size: 11.5px;
        text-align: center;
    }
    .docentes-box {
        padding: 6px 10px;
        border-right: 1px solid #cbd5e1;
    }
    .docentes-box:last-child {
        border-right: none;
        background: #f8fafc;
    }
    .doc-highlight {
        font-weight: 800;
        color: #1e3a8a;
    }
    .signatures-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-top: 10px;
        margin-top: 16px;
    }
    .sig-date {
        width: 30%;
        font-size: 11.5px;
        color: #1e293b;
        line-height: 1.4;
        padding-bottom: 4px;
    }
    .sig-stamp {
        width: 30%;
        text-align: center;
        font-size: 12px;
        font-weight: 800;
        color: #94a3b8;
        letter-spacing: 3px;
        padding-bottom: 20px;
    }
    .sig-director {
        width: 38%;
        text-align: center;
    }
    .sig-space {
        height: 52px; /* Espacio vertical generoso para la firma física manual de la Directora */
    }
    .sig-line {
        border-bottom: 2px solid #0f172a;
        width: 85%;
        margin: 0 auto 6px auto;
    }
    .sig-name {
        font-size: 12.5px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .sig-role {
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.8px;
    }
</style>
</head>
<body>
<div class="print-sheet">
    <div class="header">
        <div class="logo-container">
            <img src="logo.png" alt="Logo" onerror="this.style.display='none'">
        </div>
        <div class="title-container">
            <div class="title-main">Cuadro de Resumen Estadístico Final</div>
            <div class="title-sub">Sobre el Rendimiento Escolar del Ciclo ${d.cycle}</div>
            <div class="title-level">NIVEL DE EDUCACIÓN MEDIA - CICLO DIVERSIFICADO</div>
        </div>
        <div class="logo-container" style="visibility:hidden;">
            <img src="logo.png" alt="Logo">
        </div>
    </div>

    <div class="info-grid">
        <div class="info-row">
            <span class="info-label">ESTABLECIMIENTO:</span>
            <span class="info-val">${d.establecimiento}</span>
        </div>
        <div class="info-row">
            <span class="info-label">CÓDIGO:</span>
            <span class="info-val">${d.codigo}</span>
        </div>
        <div class="info-row">
            <span class="info-label">CARRERA:</span>
            <span class="info-val">${d.carrera}</span>
        </div>
        <div class="info-row">
            <span class="info-label">DIRECCIÓN:</span>
            <span class="info-val">${d.direccion}</span>
        </div>
        <div class="info-row">
            <span class="info-label">JORNADA / SECTOR:</span>
            <span class="info-val">${d.jornadaSector}</span>
        </div>
        <div class="info-row">
            <span class="info-label">MUNICIPIO / DEPTO:</span>
            <span class="info-val">${d.municipioDepto}</span>
        </div>
    </div>

    <table class="stats-table">
        <thead>
            <tr>
                <th rowspan="2" style="width: 14%;">GRADO</th>
                <th colspan="4" style="width: 39%;">HOMBRES</th>
                <th colspan="4" style="width: 39%;">MUJERES</th>
                <th rowspan="2" style="width: 8%;">TOTAL<br>EVALUADOS</th>
            </tr>
            <tr class="sub-hdr">
                <th style="width: 9.5%;">INSCRITOS</th>
                <th style="width: 10%;">PROMOVIDOS</th>
                <th style="width: 10%;">NO PROM.<br>C/DERECHO</th>
                <th style="width: 9.5%;">NO PROM.<br>S/DERECHO</th>
                <th style="width: 9.5%;">INSCRITAS</th>
                <th style="width: 10%;">PROMOVIDAS</th>
                <th style="width: 10%;">NO PROM.<br>C/DERECHO</th>
                <th style="width: 9.5%;">NO PROM.<br>S/DERECHO</th>
            </tr>
        </thead>
        <tbody>
            ${d.grados.map((g, idx) => `
                <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td class="grade-col">${g.nombre}</td>
                    <td>${g.hi}</td>
                    <td style="font-weight:700; color:#166534;">${g.hp}</td>
                    <td style="color:#b45309;">${g.hcd}</td>
                    <td style="color:#b91c1c;">${g.hsd}</td>
                    <td>${g.mi}</td>
                    <td style="font-weight:700; color:#166534;">${g.mp}</td>
                    <td style="color:#b45309;">${g.mcd}</td>
                    <td style="color:#b91c1c;">${g.msd}</td>
                    <td style="font-weight:700; background:#f1f5f9;">${g.tot}</td>
                </tr>
            `).join('')}
        </tbody>
        <tfoot>
            <tr>
                <td>TOTALES</td>
                <td>${d.totales.hi}</td>
                <td style="color:#166534;">${d.totales.hp}</td>
                <td style="color:#b45309;">${d.totales.hcd}</td>
                <td style="color:#b91c1c;">${d.totales.hsd}</td>
                <td>${d.totales.mi}</td>
                <td style="color:#166534;">${d.totales.mp}</td>
                <td style="color:#b45309;">${d.totales.mcd}</td>
                <td style="color:#b91c1c;">${d.totales.msd}</td>
                <td style="font-weight:800; color:#1e3a8a;">${d.totales.tot}</td>
            </tr>
        </tfoot>
    </table>

    <div class="docentes-section">
        <div class="docentes-header">Personal Docente en Servicio (${d.isOfficialHistorical ? 'Nómina Oficial SIRE 2026' : 'Nómina Activa'})</div>
        <div class="docentes-grid">
            <div class="docentes-box">
                <span class="doc-highlight">HOMBRES:</span> 
                011 = <strong>${d.docentes.h011}</strong> &nbsp;|&nbsp; 
                021 = <strong>${d.docentes.h021}</strong> &nbsp;|&nbsp; 
                REUBICADOS = <strong>${d.docentes.hReub}</strong> &nbsp;
                <span style="color:#64748b;">(Subtotal: ${d.docentes.hTot})</span>
            </div>
            <div class="docentes-box">
                <span class="doc-highlight">MUJERES:</span> 
                011 = <strong>${d.docentes.m011}</strong> &nbsp;|&nbsp; 
                021 = <strong>${d.docentes.m021}</strong> &nbsp;
                <span style="color:#64748b;">(Subtotal: ${d.docentes.mTot})</span>
            </div>
            <div class="docentes-box">
                <span class="doc-highlight">TOTAL DOCENTES:</span> 
                <strong>${d.docentes.total}</strong> &nbsp;
                <span style="color:#1e3a8a;">[011 = <strong>${d.docentes.tot011}</strong> &nbsp;|&nbsp; 021 = <strong>${d.docentes.tot021}</strong>]</span>
            </div>
        </div>
    </div>

    <div class="signatures-container">
        <div class="sig-date">
            <strong style="color:#1e3a8a;">Lugar y fecha:</strong><br>
            Jutiapa, 31 de octubre de ${d.cycle}
        </div>
        <div class="sig-stamp">
            ( S E L L O )
        </div>
        <div class="sig-director">
            <div class="sig-space"></div>
            <div class="sig-line"></div>
            <div class="sig-name">${d.directora}</div>
            <div class="sig-role">Directora</div>
        </div>
    </div>
</div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();

    const triggerPrint = () => {
        try {
            printWin.focus();
            printWin.print();
        } catch (e) {
            console.error("Error al imprimir:", e);
        }
    };

    const imgEl = printWin.document.querySelector('img');
    if (imgEl) {
        if (imgEl.complete) {
            setTimeout(triggerPrint, 250);
        } else {
            imgEl.onload = () => setTimeout(triggerPrint, 200);
            imgEl.onerror = () => setTimeout(triggerPrint, 200);
            setTimeout(triggerPrint, 1000);
        }
    } else {
        setTimeout(triggerPrint, 300);
    }
}
window.printCuadroEstadisticoOficial = printCuadroEstadisticoOficial;

function printGradeStatsCurrentView() {
    if (window._currentGradeStatsActiveTab === 'cuadro') {
        printCuadroEstadisticoOficial();
    } else if (window._currentGradeStatsActiveTab === 'reprobados') {
        printReprobadosRecuperacionView();
    } else {
        if (typeof printGradeStatsReport === 'function') {
            printGradeStatsReport('section');
        } else {
            window.print();
        }
    }
}
window.printGradeStatsCurrentView = printGradeStatsCurrentView;


// ==========================================================================
// MÓDULO OFICIAL: ALUMNOS REPROBADOS, MATERIAS, CATEDRÁTICOS Y RECUPERACIÓN
// Institución: ESCUELA NACIONAL DE CIENCIAS COMERCIALES, JUTIAPA
// Aislamiento estricto de Ciclos: 2026 (Auditoría Histórica SIRE) y 2027+ (Firebase RTDB en Vivo)
// ==========================================================================

if (typeof escapeHtml !== 'function') {
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }
    window.escapeHtml = escapeHtml;
}
window._reprobadosSubView = 'materias'; // 'materias' | 'con_derecho' | 'sin_derecho'
window._reprobadosConDerechoLayout = window._reprobadosConDerechoLayout || 'horizontal'; // 'horizontal' | 'vertical'
window._reprobadosGradeFilter = 'ALL';
window._reprobadosSectionFilter = 'ALL';
window._reprobadosTeacherFilter = 'ALL';
window._reprobadosSearchQuery = '';
window._lastReprobadosReportData = null;
window._enccoHist2026StudentsCache = window._enccoHist2026StudentsCache || null;
window._enccoHist2026Fetching = false;

const REPROBADOS_PENSUM_CATALOG = {
    CUARTO: [
        { full: 'Matemática Comercial', short: 'Mat. Com.' },
        { full: 'Introducción a la Economía', short: 'Intro. Econ.' },
        { full: 'Administración y Organización de Empresas', short: 'Admón. Emp.' },
        { full: 'Redacción y Correspondencia Mercantil', short: 'Redacción' },
        { full: 'Contabilidad de Sociedades', short: 'Cont. Soc.' },
        { full: 'Inglés Comercial I', short: 'Inglés I' },
        { full: 'Fundamentos de Derecho', short: 'Fund. Der.' },
        { full: 'Computación I', short: 'Comp. I' },
        { full: 'Caligrafía y Ortografía', short: 'Caligrafía' }
    ],
    QUINTO: [
        { full: 'Cálculo Mercantil y Financiero', short: 'Cálc. Merc.' },
        { full: 'Mecanografía', short: 'Mecanog.' },
        { full: 'Contabilidad de Costos', short: 'Cont. Cost.' },
        { full: 'Geografía Económica', short: 'Geog. Econ.' },
        { full: 'Catalogación y Archivo', short: 'Cat. Arch.' },
        { full: 'Legislación Fiscal y Aduanera', short: 'Leg. Fiscal' },
        { full: 'Finanzas Públicas', short: 'Fin. Públ.' },
        { full: 'Computación II', short: 'Comp. II' },
        { full: 'Inglés Comercial II', short: 'Inglés II' }
    ],
    SEXTO: [
        { full: 'Auditoría', short: 'Auditoría' },
        { full: 'Computación III', short: 'Comp. III' },
        { full: 'Contabilidad Bancaria', short: 'Cont. Banc.' },
        { full: 'Contabilidad Gubernamental e Integrada', short: 'Cont. Gub.' },
        { full: 'Derecho Mercantil y Laboral', short: 'Der. Merc.' },
        { full: 'Estadística Comercial', short: 'Estadíst.' },
        { full: 'Organización de Empresas y Técnicas de Oficina', short: 'Org. Emp.' },
        { full: 'Práctica Supervisada', short: 'Práctica' },
        { full: 'Seminario sobre Problemas Socioeconómicos de Guatemala', short: 'Seminario' },
        { full: 'Ética Profesional y Relaciones Humanas', short: 'Ética Prof.' }
    ]
};

function normalizeReprobadosSubjectKey(name) {
    return String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function findMatchingGradeEntry(gradesMap, targetFullName) {
    if (!gradesMap || typeof gradesMap !== 'object') return null;
    const normTarget = normalizeReprobadosSubjectKey(targetFullName);
    if (!normTarget) return null;
    const keys = Object.keys(gradesMap);
    for (const k of keys) {
        if (normalizeReprobadosSubjectKey(k) === normTarget) return { key: k, val: gradesMap[k] };
    }
    const numT = (normTarget.match(/\d+|[ivx]+$/) || [''])[0];
    for (const k of keys) {
        const normK = normalizeReprobadosSubjectKey(k);
        if (!normK) continue;
        const numK = (normK.match(/\d+|[ivx]+$/) || [''])[0];
        const sameNum = (!numT && !numK) || (numT === numK);
        if (sameNum && (normK.includes(normTarget) || normTarget.includes(normK))) {
            return { key: k, val: gradesMap[k] };
        }
    }
    return null;
}

function computeCourseAnnualAverage(scoresArray, courseName, gradeKey) {
    if (!Array.isArray(scoresArray) || scoresArray.length === 0) return null;
    const lowerC = String(courseName || '').toLowerCase();
    if (gradeKey === 'SEXTO') {
        if (lowerC.includes('práctica') || lowerC.includes('practica')) {
            const v = Number(scoresArray[3] || scoresArray[0] || 0);
            return v > 0 ? Math.round(v) : 0;
        }
        if (lowerC.includes('seminario')) {
            const v = Number(scoresArray[2] || scoresArray[3] || scoresArray[0] || 0);
            return v > 0 ? Math.round(v) : 0;
        }
        const validScores = scoresArray.slice(0, 3).map(Number);
        const sum = validScores.reduce((acc, v) => acc + (isNaN(v) ? 0 : v), 0);
        return Math.round(sum / (validScores.length || 1));
    }
    const validScores = scoresArray.map(Number);
    const sum = validScores.reduce((acc, v) => acc + (isNaN(v) ? 0 : v), 0);
    return Math.round(sum / (validScores.length || 1));
}

function resolveFullSubjectsForStudent(studentObj, gradeKey, auditReprobadas = null, cycleLabel = '2027') {
    const baseCatalog = REPROBADOS_PENSUM_CATALOG[gradeKey] || REPROBADOS_PENSUM_CATALOG.CUARTO;
    const gradesObj = (studentObj && studentObj.grades && typeof studentObj.grades === 'object') ? studentObj.grades : {};
    const repMap = new Map();
    if (Array.isArray(auditReprobadas)) {
        auditReprobadas.forEach(r => {
            if (r && r.materia) repMap.set(normalizeReprobadosSubjectKey(r.materia), r);
        });
    }

    const usedKeys = new Set();
    const list = baseCatalog.map(item => {
        const normFull = normalizeReprobadosSubjectKey(item.full);
        // 1. Verificar si está explícitamente en las reprobadas (prioridad de auditoría 2026)
        let matchedRep = repMap.get(normFull);
        if (!matchedRep && repMap.size > 0) {
            for (const [rk, rv] of repMap.entries()) {
                if (rk.includes(normFull) || normFull.includes(rk)) {
                    matchedRep = rv;
                    break;
                }
            }
        }
        if (matchedRep) {
            usedKeys.add(normalizeReprobadosSubjectKey(matchedRep.materia));
            return {
                materia: item.full,
                shortLabel: item.short,
                nota: Number(matchedRep.nota || 0),
                aprobada: false,
                evaluada: true,
                maestro: matchedRep.maestro || resolveActiveTeacherForCourse(item.full, gradeKey, studentObj?.section || '')
            };
        }

        // 2. Buscar nota real en studentObj.grades / getReportCardSubjectGrades
        const found = findMatchingGradeEntry(gradesObj, item.full);
        let notaVal = null;
        if (studentObj && typeof window !== 'undefined' && typeof window.getReportCardSubjectGrades === 'function') {
            const rc = window.getReportCardSubjectGrades(studentObj, found ? found.key : item.full);
            if (rc) {
                if (rc.isSpecialUnique && rc.b4 > 0) notaVal = Math.round(rc.b4);
                else if (rc.avg > 0) notaVal = Math.round(rc.avg);
            }
        }
        if (notaVal === null && found && Array.isArray(found.val)) {
            notaVal = computeCourseAnnualAverage(found.val, item.full, gradeKey);
        }
        if (found) usedKeys.add(normalizeReprobadosSubjectKey(found.key));

        const isEvaluada = (notaVal !== null && notaVal > 0);
        const isAprobada = isEvaluada ? (notaVal >= 60) : (Array.isArray(auditReprobadas) ? true : false);
        return {
            materia: item.full,
            shortLabel: item.short,
            nota: notaVal,
            aprobada: isAprobada,
            evaluada: isEvaluada,
            maestro: resolveActiveTeacherForCourse(item.full, gradeKey, studentObj?.section || '')
        };
    });

    // Agregar materias adicionales personalizadas fuera del catálogo base si existieran en s.grades
    Object.keys(gradesObj).forEach(extraKey => {
        const nk = normalizeReprobadosSubjectKey(extraKey);
        if (!nk || usedKeys.has(nk)) return;
        const alreadyInCatalog = list.some(x => {
            const nx = normalizeReprobadosSubjectKey(x.materia);
            return nx === nk || nx.includes(nk) || nk.includes(nx);
        });
        if (alreadyInCatalog) return;
        const arr = gradesObj[extraKey];
        const avg = Array.isArray(arr) ? computeCourseAnnualAverage(arr, extraKey, gradeKey) : null;
        if (avg === null) return;
        const shortWord = extraKey.trim().split(/\s+/).slice(0, 2).map(w => w.slice(0, 6)).join(' ');
        list.push({
            materia: extraKey,
            shortLabel: shortWord || extraKey.slice(0, 10),
            nota: avg,
            aprobada: avg >= 60,
            evaluada: true,
            maestro: resolveActiveTeacherForCourse(extraKey, gradeKey, studentObj?.section || '')
        });
    });

    return list;
}

function getAbbreviatedCourseNameForSheet(courseName) {
    const norm = normalizeReprobadosSubjectKey(courseName);
    for (const gKey of ['CUARTO', 'QUINTO', 'SEXTO']) {
        const hit = (REPROBADOS_PENSUM_CATALOG[gKey] || []).find(item => {
            const ni = normalizeReprobadosSubjectKey(item.full);
            return ni === norm || ni.includes(norm) || norm.includes(ni);
        });
        if (hit) return hit.short;
    }
    return String(courseName || '').trim().slice(0, 14);
}

/**
 * Resolver de Catedrático Titular para el ciclo activo (2027+)
 * Función pura de SOLO LECTURA: NO muta STATE.users ni escribe a Firebase.
 */
function resolveActiveTeacherForCourse(courseName, gradeKey, section) {
    if (!courseName) return 'Catedrático Titular';
    const cNorm = String(courseName).trim().toLowerCase();
    const gNorm = String(gradeKey || '').trim().toLowerCase();
    const sNorm = String(section || '').trim().toUpperCase();

    // 1. Buscar en STATE.pensum (Solo lectura)
    if (typeof STATE !== 'undefined' && Array.isArray(STATE.pensum)) {
        const match = STATE.pensum.find(p => {
            if (!p) return false;
            const pName = String(p.subject || p.name || '').trim().toLowerCase();
            const pGrade = String(p.grade || p.gradeCode || '').trim().toLowerCase();
            const pSec = String(p.section || '').trim().toUpperCase();
            
            const matchName = (pName === cNorm || pName.includes(cNorm) || cNorm.includes(pName));
            let matchGrade = true;
            if (gNorm) {
                if (gNorm.includes('cuarto') || gNorm.includes('4')) matchGrade = (pGrade.includes('4') || pGrade.includes('cuarto'));
                else if (gNorm.includes('quinto') || gNorm.includes('5')) matchGrade = (pGrade.includes('5') || pGrade.includes('quinto'));
                else if (gNorm.includes('sexto') || gNorm.includes('6')) matchGrade = (pGrade.includes('6') || pGrade.includes('sexto'));
            }
            const matchSec = (!pSec || !sNorm || pSec === sNorm || pSec === 'ALL');
            return matchName && matchGrade && matchSec;
        }) || STATE.pensum.find(p => {
            if (!p) return false;
            const pName = String(p.subject || p.name || '').trim().toLowerCase();
            return pName === cNorm || pName.includes(cNorm) || cNorm.includes(pName);
        });

        if (match) {
            if (match.teacherName && String(match.teacherName).trim() && !String(match.teacherName).toLowerCase().includes('por asignar')) {
                return String(match.teacherName).trim();
            }
            if (match.teacherId && Array.isArray(STATE.users)) {
                const u = STATE.users.find(usr => usr && usr.id === match.teacherId);
                if (u && (u.name || u.fullName)) return (u.name || u.fullName).trim();
            }
        }
    }

    // 2. Buscar en asignaciones de usuarios en STATE.users (Solo lectura)
    if (typeof STATE !== 'undefined' && Array.isArray(STATE.users)) {
        const uMatch = STATE.users.find(u => {
            if (!u || (u.role !== 'docente' && u.role !== 'catedratico')) return false;
            const courses = Array.isArray(u.assignedCourses) ? u.assignedCourses : (Array.isArray(u.courses) ? u.courses : []);
            return courses.some(c => {
                const cStr = typeof c === 'string' ? c.toLowerCase() : String(c.name || c.subject || '').toLowerCase();
                return cStr === cNorm || cStr.includes(cNorm) || cNorm.includes(cStr);
            });
        });
        if (uMatch && (uMatch.name || uMatch.fullName)) {
            return (uMatch.name || uMatch.fullName).trim();
        }
    }

    return 'Catedrático Titular';
}
window.resolveActiveTeacherForCourse = resolveActiveTeacherForCourse;

/**
 * Renderiza el módulo analítico de Alumnos Reprobados y Recuperación Académica
 */
function renderReprobadosRecuperacionView() {
    const container = document.getElementById('gradeStatsDocumentContainer');
    if (!container) return;

    const STATE = window.STATE || {};
    const viewingCycle = String(
        STATE.viewingHistoricalCycle || 
        STATE.historicalViewingCycle || 
        (STATE.isHistoricalReadOnlyMode ? '2026' : (STATE.activeCycle || '2027'))
    ).trim();

    const is2026Official = (viewingCycle === '2026' || (STATE.isHistoricalReadOnlyMode && (STATE.historicalViewingCycle === '2026' || STATE.viewingHistoricalCycle === '2026')));

    let rawStudentsList = [];

    if (is2026Official) {
        // CICLO 2026: DATOS OFICIALES AUDITADOS DEL SIRE MINEDUC (412 estudiantes)
        const auditSource = (typeof AUDIT_2026_STUDENTS !== 'undefined' && Array.isArray(AUDIT_2026_STUDENTS))
            ? AUDIT_2026_STUDENTS
            : (Array.isArray(window.AUDIT_2026_STUDENTS) ? window.AUDIT_2026_STUDENTS : []);

        // Índice rápido de estudiantes 2026 con todas sus notas (desde STATE.students o caché histórico)
        const stateStudents2026 = [];
        if (Array.isArray(STATE.students)) stateStudents2026.push(...STATE.students);
        if (Array.isArray(window._enccoHist2026StudentsCache)) stateStudents2026.push(...window._enccoHist2026StudentsCache);
        const byCode2026 = new Map();
        stateStudents2026.forEach(st => {
            if (!st) return;
            const c = String(st.personalCode || st.code || st.studentCode || '').trim().toUpperCase();
            if (c && !byCode2026.has(c) && st.grades && Object.keys(st.grades).length > 0) {
                byCode2026.set(c, st);
            }
        });

        // Si entramos a Con Derecho a Recuperación en 2026 sin tener aún notas completas cargadas en memoria,
        // cargar bajo demanda una sola vez /encc_school_state/historico/2026/studentsSnapshot.json (solo lectura)
        if (byCode2026.size === 0 && !window._enccoHist2026Fetching && typeof fetch === 'function') {
            window._enccoHist2026Fetching = true;
            const fbUrl = (typeof getFirebaseDatabaseUrl === 'function')
                ? getFirebaseDatabaseUrl()
                : 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';
            fetch(`${fbUrl}/encc_school_state/historico/2026/studentsSnapshot.json?t=${Date.now()}`)
                .then(r => (r && r.ok ? r.json() : null))
                .then(snap => {
                    if (Array.isArray(snap) && snap.length > 0) {
                        window._enccoHist2026StudentsCache = snap;
                        if (window._reprobadosSubView === 'con_derecho' && typeof window.renderReprobadosRecuperacionView === 'function') {
                            window.renderReprobadosRecuperacionView();
                        }
                    }
                })
                .catch(() => {})
                .finally(() => { window._enccoHist2026Fetching = false; });
        }

        rawStudentsList = auditSource.map((s, idx) => {
            const gradeStr = String(s.grade || '').toUpperCase();
            const maxRecup = (gradeStr === 'SEXTO') ? 4 : 3;
            const numRep = Number(s.num_rep || (Array.isArray(s.reprobadas) ? s.reprobadas.length : 0));
            const isProm = (numRep === 0);
            const isCd = (numRep > 0 && numRep <= maxRecup);
            const isSd = (numRep > maxRecup);
            const repArr = Array.isArray(s.reprobadas) ? s.reprobadas.map(r => ({
                materia: r.materia,
                materiaNum: r.materiaNum,
                nota: Number(r.nota || 0),
                maestro: r.maestro || 'Catedrático Titular'
            })) : [];
            const fullHistObj = byCode2026.get(String(s.code || '').trim().toUpperCase()) || null;
            const materiasCompletas = resolveFullSubjectsForStudent(fullHistObj, gradeStr, repArr, '2026');

            return {
                num: s.num || (idx + 1),
                code: s.code || 'S/C',
                name: String(s.name || '').toUpperCase().trim(),
                sex: String(s.sex || 'H').toUpperCase(),
                genderLabel: (s.sex === 'H') ? 'Hombre' : 'Mujer',
                grade: gradeStr,
                section: String(s.section || 'A').toUpperCase(),
                num_rep: numRep,
                maxRecup: maxRecup,
                reprobadas: repArr,
                materiasCompletas: materiasCompletas,
                condicion: isProm ? 'PROMOVIDO' : (isCd ? 'CON DERECHO A RECUPERACIÓN' : 'REPROBADO DEFINITIVO (SIN DERECHO)'),
                isPromovido: isProm,
                isConDerecho: isCd,
                isSinDerecho: isSd
            };
        });
    } else {
        // CICLO 2027+: CÁLCULO DINÁMICO EN TIEMPO REAL DESDE FIREBASE RTDB
        const allStudents = Array.isArray(STATE.students) ? STATE.students : [];
        const cycleNum = parseInt(viewingCycle, 10);
        const isHistView = !!(STATE.isHistoricalReadOnlyMode || STATE.historicalViewingCycle || STATE.viewingHistoricalCycle);
        const cycleStudents = allStudents.filter(s => {
            if (!s) return false;
            if (!isHistView) {
                const stLower = String(s.status || '').toLowerCase().trim();
                const grLower = String(s.grade || s.gradeCode || s.gradeLabel || '').toLowerCase();
                if (stLower === 'egresado' || grLower.includes('egresad') || grLower.includes('graduand')) return false;
                if (s.graduationCycle && !isNaN(cycleNum) && cycleNum > parseInt(String(s.graduationCycle), 10)) return false;
            }
            const sCycle = String(s.academicCycle || s.cycle || s.ciclo || '').trim();
            if (sCycle) return sCycle === viewingCycle;
            return viewingCycle === (STATE.activeCycle || '2027');
        });

        cycleStudents.forEach((s, idx) => {
            const gStr = String(s.grade || s.gradeCode || s.gradeLevel || '').toUpperCase();
            let gKey = 'CUARTO';
            if (gStr.includes('6TO') || gStr.includes('SEXTO')) gKey = 'SEXTO';
            else if (gStr.includes('5TO') || gStr.includes('QUINTO')) gKey = 'QUINTO';

            const rawGen = String(s.gender || s.genero || s.sex || '').toUpperCase();
            const isH = rawGen.startsWith('MASC') || rawGen.startsWith('H') || rawGen === 'M';
            const sexLetter = isH ? 'H' : 'M';
            const cleanSec = (typeof getCleanSectionLetter === 'function')
                ? getCleanSectionLetter(s.section || s.sectionId || 'A')
                : String(s.section || 'A').replace(/^sección\s*/i, '').trim().toUpperCase() || 'A';

            // REGLA RETIRADOS
            if (s.status === 'Retirado') {
                if (s.hasExpediente !== false) {
                    rawStudentsList.push({
                        num: idx + 1,
                        code: s.code || s.studentCode || s.personalCode || s.cui || 'S/C',
                        name: String(s.name || '').toUpperCase().trim(),
                        sex: sexLetter,
                        genderLabel: isH ? 'Hombre' : 'Mujer',
                        grade: gKey,
                        section: cleanSec,
                        num_rep: 9,
                        maxRecup: (gKey === 'SEXTO') ? 4 : 3,
                        reprobadas: [{ materia: 'EXPEDIENTE RETIRADO CON CARPETILLA EN ESCUELA', nota: 0, maestro: 'Dirección' }],
                        materiasCompletas: [],
                        condicion: 'REPROBADO DEFINITIVO (SIN DERECHO)',
                        isPromovido: false,
                        isConDerecho: false,
                        isSinDerecho: true
                    });
                }
                return;
            }

            // PROCESAMIENTO DE CURSOS Y PROMEDIOS
            const gradesObj = s.grades || {};
            const reprobadas = [];
            const courseKeys = Object.keys(gradesObj);

            courseKeys.forEach(cName => {
                const b = gradesObj[cName];
                if (!Array.isArray(b) || b.length === 0) return;

                const promedioCurso = computeCourseAnnualAverage(b, cName, gKey);
                if (promedioCurso !== null && promedioCurso < 60) {
                    const teacher = resolveActiveTeacherForCourse(cName, gKey, cleanSec);
                    reprobadas.push({
                        materia: cName,
                        materiaNum: reprobadas.length + 1,
                        nota: promedioCurso,
                        maestro: teacher
                    });
                }
            });

            const maxRecup = (gKey === 'SEXTO') ? 4 : 3;
            const numRep = reprobadas.length;
            const isProm = (numRep === 0);
            const isCd = (numRep > 0 && numRep <= maxRecup);
            const isSd = (numRep > maxRecup);
            const materiasCompletas = resolveFullSubjectsForStudent(s, gKey, reprobadas, viewingCycle);

            rawStudentsList.push({
                num: idx + 1,
                code: s.code || s.studentCode || s.personalCode || s.cui || 'S/C',
                name: String(s.name || '').toUpperCase().trim(),
                sex: sexLetter,
                genderLabel: isH ? 'Hombre' : 'Mujer',
                grade: gKey,
                section: cleanSec,
                num_rep: numRep,
                maxRecup: maxRecup,
                reprobadas: reprobadas,
                materiasCompletas: materiasCompletas,
                condicion: isProm ? 'PROMOVIDO' : (isCd ? 'CON DERECHO A RECUPERACIÓN' : 'REPROBADO DEFINITIVO (SIN DERECHO)'),
                isPromovido: isProm,
                isConDerecho: isCd,
                isSinDerecho: isSd
            });
        });
    }

    // Guardar para impresión y exportación Excel
    window._lastReprobadosReportData = {
        cycle: viewingCycle,
        is2026Official: is2026Official,
        students: rawStudentsList
    };

    // KPIs Globales (Sin filtros aplicados aún)
    const totalEvaluados = rawStudentsList.length;
    const totalPromovidos = rawStudentsList.filter(s => s.isPromovido).length;
    const totalConDerecho = rawStudentsList.filter(s => s.isConDerecho).length;
    const totalSinDerecho = rawStudentsList.filter(s => s.isSinDerecho).length;

    // Extraer lista única de Catedráticos que tienen alumnos reprobados
    const uniqueTeachersSet = new Set();
    rawStudentsList.forEach(s => {
        s.reprobadas.forEach(r => {
            if (r.maestro && r.maestro !== 'Catedrático Titular') {
                uniqueTeachersSet.add(r.maestro.trim());
            }
        });
    });
    const teachersList = Array.from(uniqueTeachersSet).sort();

    // APLICAR FILTROS REACTIVOS
    const currentGrade = window._reprobadosGradeFilter || 'ALL';
    const currentSec = window._reprobadosSectionFilter || 'ALL';
    const currentTeacher = window._reprobadosTeacherFilter || 'ALL';
    const currentQuery = (window._reprobadosSearchQuery || '').toLowerCase().trim();

    const filteredStudents = rawStudentsList.filter(s => {
        if (currentGrade !== 'ALL' && s.grade !== currentGrade) return false;
        if (currentSec !== 'ALL' && s.section !== currentSec) return false;
        if (currentTeacher !== 'ALL') {
            const hasTeacher = s.reprobadas.some(r => r.maestro && r.maestro.trim() === currentTeacher);
            if (!hasTeacher) return false;
        }
        if (currentQuery) {
            const matchName = s.name.toLowerCase().includes(currentQuery);
            const matchCode = s.code.toLowerCase().includes(currentQuery);
            const matchSubject = s.reprobadas.some(r => r.materia.toLowerCase().includes(currentQuery));
            if (!matchName && !matchCode && !matchSubject) return false;
        }
        return true;
    });

    // Agrupación por Materia y Catedrático
    const courseStatsMap = {};
    rawStudentsList.forEach(s => {
        // Respetar filtros de grado y sección para la tabla de materias
        if (currentGrade !== 'ALL' && s.grade !== currentGrade) return;
        if (currentSec !== 'ALL' && s.section !== currentSec) return;
        if (currentTeacher !== 'ALL') {
            const hasT = s.reprobadas.some(r => r.maestro && r.maestro.trim() === currentTeacher);
            if (!hasT) return;
        }

        s.reprobadas.forEach(r => {
            if (currentTeacher !== 'ALL' && r.maestro.trim() !== currentTeacher) return;
            if (currentQuery && !r.materia.toLowerCase().includes(currentQuery) && !s.name.toLowerCase().includes(currentQuery)) return;

            const key = `${s.grade}|${s.section}|${r.materia}|${r.maestro}`;
            if (!courseStatsMap[key]) {
                courseStatsMap[key] = {
                    key: key,
                    grade: s.grade,
                    section: s.section,
                    materia: r.materia,
                    maestro: r.maestro,
                    totalRep: 0,
                    hombres: 0,
                    mujeres: 0,
                    sumNotas: 0,
                    students: []
                };
            }
            courseStatsMap[key].totalRep++;
            if (s.sex === 'H') courseStatsMap[key].hombres++;
            else courseStatsMap[key].mujeres++;
            courseStatsMap[key].sumNotas += Number(r.nota || 0);
            courseStatsMap[key].students.push({
                num: s.num,
                code: s.code,
                name: s.name,
                sex: s.sex,
                nota: r.nota,
                condicion: s.condicion,
                num_rep: s.num_rep
            });
        });
    });

    const courseStatsList = Object.values(courseStatsMap).sort((a, b) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        if (a.section !== b.section) return a.section.localeCompare(b.section);
        return b.totalRep - a.totalRep;
    });

    const totalMateriasAfectadas = courseStatsList.length;

    // Sub-vistas disponibles
    const activeSubView = window._reprobadosSubView || 'materias';

    // RENDERIZADO HTML
    let html = `
    <div class="reprobados-dashboard-container" style="background:#ffffff; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 4px 16px rgba(0,0,0,0.06); padding:24px; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <!-- ENCABEZADO INSTITUCIONAL OFICIAL (SIN LA PALABRA ENCCO) -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; border-bottom:2px solid #e2e8f0; padding-bottom:18px; margin-bottom:22px;">
            <div>
                <div style="font-size:0.75rem; font-weight:800; color:#0284c7; letter-spacing:1px; text-transform:uppercase;">
                    REPÚBLICA DE GUATEMALA • MINISTERIO DE EDUCACIÓN
                </div>
                <h2 style="font-size:1.45rem; font-weight:900; color:#0f172a; margin:4px 0 2px 0;">
                    ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                </h2>
                <div style="font-size:0.88rem; color:#475569; font-weight:600;">
                    Jornada Vespertina • Código MINEDUC: 22-01-0014-46 • Jutiapa, Jutiapa
                </div>
                <div style="font-size:0.92rem; font-weight:700; color:#0369a1; margin-top:6px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-graduation-cap"></i> Panel Analítico: Alumnos Reprobados, Asignaturas, Catedráticos y Recuperación
                </div>
            </div>
            <div style="text-align:right;">
                <span style="display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; background:${is2026Official ? '#e0f2fe' : '#ecfdf5'}; color:${is2026Official ? '#0369a1' : '#047857'}; border:1px solid ${is2026Official ? '#bae6fd' : '#a7f3d0'};">
                    <i class="fa-solid fa-${is2026Official ? 'lock' : 'bolt'}"></i> Ciclo Escolar ${viewingCycle} ${is2026Official ? '(Auditoría Oficial SIRE)' : '(Firebase RTDB Activo)'}
                </span>
                <div style="font-size:0.75rem; color:#64748b; margin-top:6px;">
                    Normativa de Evaluación: Art. 26 Acuerdo Ministerial 1171-2010
                </div>
            </div>
        </div>

        <!-- TARJETAS DE KPIS PRINCIPALES -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:24px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:8px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Alumnos Evaluados</div>
                <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-top:2px;">${totalEvaluados}</div>
                <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">100% Matrícula Final Registrada</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #16a34a; border-radius:8px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#15803d; text-transform:uppercase;">Promovidos Limpios</div>
                <div style="font-size:1.6rem; font-weight:900; color:#166534; margin-top:2px;">${totalPromovidos}</div>
                <div style="font-size:0.72rem; color:#15803d; margin-top:2px;">${Math.round((totalPromovidos / (totalEvaluados || 1)) * 100)}% Sin Materias Reprobadas</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #d97706; border-radius:8px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#b45309; text-transform:uppercase;">Con Derecho a Recuperación</div>
                <div style="font-size:1.6rem; font-weight:900; color:#92400e; margin-top:2px;">${totalConDerecho}</div>
                <div style="font-size:0.72rem; color:#b45309; margin-top:2px;">4to/5to: 1-3 Mat. | 6to: 1-4 Mat. (${Math.round((totalConDerecho / (totalEvaluados || 1)) * 100)}%)</div>
            </div>
            <div style="background:#fef2f2; border:1px solid #fecaca; border-left:4px solid #dc2626; border-radius:8px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#b91c1c; text-transform:uppercase;">Reprobados Definitivos</div>
                <div style="font-size:1.6rem; font-weight:900; color:#991b1b; margin-top:2px;">${totalSinDerecho}</div>
                <div style="font-size:0.72rem; color:#b91c1c; margin-top:2px;">Sin Derecho: 4to/5to: ≥4 | 6to: ≥5 (${Math.round((totalSinDerecho / (totalEvaluados || 1)) * 100)}%)</div>
            </div>
            <div style="background:#faf5ff; border:1px solid #e9d5ff; border-left:4px solid #9333ea; border-radius:8px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#7e22ce; text-transform:uppercase;">Clases con Reprobación</div>
                <div style="font-size:1.6rem; font-weight:900; color:#6b21a8; margin-top:2px;">${totalMateriasAfectadas}</div>
                <div style="font-size:0.72rem; color:#7e22ce; margin-top:2px;">Catedráticos Evaluadores Asignados</div>
            </div>
        </div>

        <!-- BARRA DE SUB-PESTAÑAS Y ACCIONES DE EXPORTACIÓN / IMPRESIÓN -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
            <div style="display:inline-flex; background:#f1f5f9; padding:4px; border-radius:8px; border:1px solid #cbd5e1; gap:4px; flex-wrap:wrap;">
                <button type="button" onclick="switchReprobadosSubView('materias')" style="padding:8px 14px; border-radius:6px; font-weight:700; font-size:0.83rem; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; ${activeSubView === 'materias' ? 'background:#0284c7; color:#fff; box-shadow:0 1px 3px rgba(2,132,199,0.3);' : 'background:transparent; color:#475569;'}">
                    <i class="fa-solid fa-chalkboard-user"></i> 1. Por Asignatura y Catedrático (${courseStatsList.length})
                </button>
                <button type="button" onclick="switchReprobadosSubView('con_derecho')" style="padding:8px 14px; border-radius:6px; font-weight:700; font-size:0.83rem; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; ${activeSubView === 'con_derecho' ? 'background:#d97706; color:#fff; box-shadow:0 1px 3px rgba(217,119,6,0.3);' : 'background:transparent; color:#475569;'}">
                    <i class="fa-solid fa-user-check"></i> 2. Con Derecho a Recuperación (${totalConDerecho})
                </button>
                <button type="button" onclick="switchReprobadosSubView('sin_derecho')" style="padding:8px 14px; border-radius:6px; font-weight:700; font-size:0.83rem; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; ${activeSubView === 'sin_derecho' ? 'background:#dc2626; color:#fff; box-shadow:0 1px 3px rgba(220,38,38,0.3);' : 'background:transparent; color:#475569;'}">
                    <i class="fa-solid fa-user-xmark"></i> 3. Reprobados Definitivos - Sin Derecho (${totalSinDerecho})
                </button>
            </div>
            <div style="display:flex; gap:8px;">
                <button type="button" onclick="exportReprobadosRecuperacionExcel()" class="btn btn-sm" style="background:#16a34a; color:#ffffff; font-weight:700; border-radius:6px; padding:7px 14px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 3px rgba(22,163,74,0.3);">
                    <i class="fa-solid fa-file-excel"></i> Exportar a Excel
                </button>
                <button type="button" onclick="printReprobadosRecuperacionView()" class="btn btn-sm" style="background:#0284c7; color:#ffffff; font-weight:700; border-radius:6px; padding:7px 14px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 3px rgba(2,132,199,0.3);">
                    <i class="fa-solid fa-print"></i> Imprimir Informe Oficial
                </button>
            </div>
        </div>

        <!-- FILTROS DINÁMICOS Y BUSCADOR EN VIVO -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:2px; display:block;">Grado:</label>
                    <select onchange="onReprobadosGradeChange(this.value)" style="padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700; font-size:0.8rem; background:#fff; min-width:130px;">
                        <option value="ALL" ${currentGrade === 'ALL' ? 'selected' : ''}>Todos los Grados</option>
                        <option value="CUARTO" ${currentGrade === 'CUARTO' ? 'selected' : ''}>Cuarto Perito</option>
                        <option value="QUINTO" ${currentGrade === 'QUINTO' ? 'selected' : ''}>Quinto Perito</option>
                        <option value="SEXTO" ${currentGrade === 'SEXTO' ? 'selected' : ''}>Sexto Perito</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:2px; display:block;">Sección:</label>
                    <select onchange="onReprobadosSectionChange(this.value)" style="padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700; font-size:0.8rem; background:#fff; min-width:110px;">
                        <option value="ALL" ${currentSec === 'ALL' ? 'selected' : ''}>Todas (A-D)</option>
                        <option value="A" ${currentSec === 'A' ? 'selected' : ''}>Sección A</option>
                        <option value="B" ${currentSec === 'B' ? 'selected' : ''}>Sección B</option>
                        <option value="C" ${currentSec === 'C' ? 'selected' : ''}>Sección C</option>
                        <option value="D" ${currentSec === 'D' ? 'selected' : ''}>Sección D</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:2px; display:block;">Catedrático Evaluador:</label>
                    <select onchange="onReprobadosTeacherChange(this.value)" style="padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700; font-size:0.8rem; background:#fff; min-width:210px; max-width:280px;">
                        <option value="ALL" ${currentTeacher === 'ALL' ? 'selected' : ''}>Todos los Catedráticos</option>
                        ${teachersList.map(t => `<option value="${escapeHtml(t)}" ${currentTeacher === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="flex:1; min-width:240px; max-width:360px;">
                <label style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:2px; display:block;">Búsqueda Rápida:</label>
                <div style="position:relative;">
                    <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:0.85rem;"></i>
                    <input type="text" placeholder="Buscar por alumno, código o materia..." value="${escapeHtml(currentQuery)}" oninput="onReprobadosSearchInput(this.value)" style="width:100%; padding:5px 10px 5px 30px; border-radius:6px; border:1px solid #cbd5e1; font-size:0.82rem; background:#fff;">
                </div>
            </div>
        </div>
    `;

    // SUB-VISTA 1: POR ASIGNATURA Y CATEDRÁTICO
    if (activeSubView === 'materias') {
        html += `
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.83rem; text-align:left;">
                <thead>
                    <tr style="background:#0369a1; color:#ffffff;">
                        <th style="padding:10px 12px; border:1px solid #0284c7; width:110px;">Grado / Secc.</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7;">Asignatura</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7;">Catedrático Titular</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7; text-align:center; width:90px;">Total Rep.</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7; text-align:center; width:80px;">Hombres</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7; text-align:center; width:80px;">Mujeres</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7; text-align:center; width:100px;">Prom. Nota</th>
                        <th style="padding:10px 12px; border:1px solid #0284c7; text-align:center; width:130px;">Acción</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (courseStatsList.length === 0) {
            html += `<tr><td colspan="8" style="padding:24px; text-align:center; color:#64748b; font-weight:600;">No se encontraron asignaturas con reprobados para los filtros seleccionados.</td></tr>`;
        } else {
            courseStatsList.forEach((cItem, cIdx) => {
                const rowBg = (cIdx % 2 === 0) ? '#ffffff' : '#f8fafc';
                const promNota = (cItem.sumNotas / (cItem.totalRep || 1)).toFixed(1);
                const safeKey = `row_detail_${cIdx}`;

                html += `
                <tr style="background:${rowBg}; border-bottom:1px solid #e2e8f0;">
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; font-weight:800; color:#0369a1;">
                        ${cItem.grade.substring(0, 4)} "${cItem.section}"
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; font-weight:700; color:#0f172a;">
                        <i class="fa-solid fa-book" style="color:#0284c7; margin-right:6px;"></i> ${escapeHtml(cItem.materia)}
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; color:#334155; font-weight:600;">
                        <i class="fa-solid fa-user-tie" style="color:#64748b; margin-right:6px;"></i> ${escapeHtml(cItem.maestro)}
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; text-align:center; font-weight:900;">
                        <span style="display:inline-block; padding:2px 8px; border-radius:12px; background:#fee2e2; color:#b91c1c; font-size:0.85rem;">
                            ${cItem.totalRep}
                        </span>
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; text-align:center; font-weight:700; color:#1e3a8a;">
                        ${cItem.hombres}
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; text-align:center; font-weight:700; color:#831843;">
                        ${cItem.mujeres}
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; text-align:center; font-weight:800; color:#b91c1c;">
                        ${promNota} pts
                    </td>
                    <td style="padding:9px 12px; border:1px solid #e2e8f0; text-align:center;">
                        <button type="button" onclick="toggleReprobadosDetail('${safeKey}')" style="background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd; border-radius:5px; padding:4px 9px; font-size:0.75rem; font-weight:700; cursor:pointer;">
                            <i class="fa-solid fa-list-ul"></i> Alumnos (${cItem.totalRep})
                        </button>
                    </td>
                </tr>
                <tr id="${safeKey}" style="display:none; background:#f1f5f9;">
                    <td colspan="8" style="padding:14px 20px; border:1px solid #cbd5e1;">
                        <div style="font-weight:800; color:#0369a1; font-size:0.83rem; margin-bottom:8px;">
                            Alumnos reprobados en <em>${escapeHtml(cItem.materia)}</em> - Catedrático: ${escapeHtml(cItem.maestro)}:
                        </div>
                        <table style="width:100%; border-collapse:collapse; background:#ffffff; font-size:0.78rem;">
                            <thead>
                                <tr style="background:#e2e8f0; color:#334155;">
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1; width:40px; text-align:center;">No.</th>
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1; width:90px;">Código</th>
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1;">Nombre del Estudiante</th>
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1; width:60px; text-align:center;">Sexo</th>
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1; width:75px; text-align:center;">Calificación</th>
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1; width:100px; text-align:center;">Total Reprobadas</th>
                                    <th style="padding:6px 8px; border:1px solid #cbd5e1;">Situación Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cItem.students.map((st, sIndex) => `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; text-align:center; font-weight:700;">${sIndex + 1}</td>
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; font-family:monospace; font-weight:700; color:#0369a1;">${st.code}</td>
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; font-weight:700; color:#0f172a;">${escapeHtml(st.name)}</td>
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; text-align:center; font-weight:700;">${st.sex}</td>
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; text-align:center; font-weight:900; color:#b91c1c; background:#fef2f2;">${st.nota} pts</td>
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; text-align:center; font-weight:800;">${st.num_rep} materias</td>
                                        <td style="padding:5px 8px; border:1px solid #e2e8f0; font-weight:700; color:${st.condicion.includes('CON DERECHO') ? '#b45309' : '#b91c1c'};">
                                            ${st.condicion}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </td>
                </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
        </div>
        `;
    }

    // SUB-VISTA 2: CON DERECHO A RECUPERACIÓN
    else if (activeSubView === 'con_derecho') {
        const conDerechoList = filteredStudents.filter(s => s.isConDerecho);
        const activeLayout = (window._reprobadosConDerechoLayout === 'vertical') ? 'vertical' : 'horizontal';

        html += `
        <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <div style="font-size:0.9rem; font-weight:800; color:#92400e;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Listado de Alumnos Con Derecho a Exámenes de Recuperación (${conDerechoList.length} alumnos)
                </div>
                <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                    Criterio: 4to y 5to (1 a 3 materias reprobadas) • 6to (1 a 4 materias reprobadas) • Formato de hoja oficial con todas las asignaturas y espacio para recuperación en papel
                </div>
            </div>
            <div style="display:inline-flex; align-items:center; gap:4px; background:#fffbeb; border:1px solid #fcd34d; padding:4px; border-radius:8px;">
                <span style="font-size:0.74rem; font-weight:800; color:#92400e; padding:0 6px;">Disposición:</span>
                <button type="button" onclick="switchReprobadosConDerechoLayout('horizontal')" style="padding:5px 10px; border-radius:6px; border:none; cursor:pointer; font-size:0.77rem; font-weight:700; display:inline-flex; align-items:center; gap:5px; ${activeLayout === 'horizontal' ? 'background:#d97706; color:#ffffff;' : 'background:transparent; color:#78350f;'}">
                    <i class="fa-solid fa-arrows-left-right"></i> Horizontal (Sábana)
                </button>
                <button type="button" onclick="switchReprobadosConDerechoLayout('vertical')" style="padding:5px 10px; border-radius:6px; border:none; cursor:pointer; font-size:0.77rem; font-weight:700; display:inline-flex; align-items:center; gap:5px; ${activeLayout === 'vertical' ? 'background:#d97706; color:#ffffff;' : 'background:transparent; color:#78350f;'}">
                    <i class="fa-solid fa-arrows-up-down"></i> Vertical (Detalle)
                </button>
            </div>
        </div>
        ${buildConDerechoLayoutContent(conDerechoList, activeLayout, 'screen')}
        `;
    }

    // SUB-VISTA 3: REPROBADOS DEFINITIVOS (SIN DERECHO)
    else if (activeSubView === 'sin_derecho') {
        const sinDerechoList = filteredStudents.filter(s => s.isSinDerecho);

        html += `
        <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.9rem; font-weight:800; color:#991b1b;">
                <i class="fa-solid fa-ban"></i> Listado de Alumnos Reprobados Definitivos - Sin Derecho a Recuperación (${sinDerechoList.length} alumnos)
            </div>
            <div style="font-size:0.75rem; color:#64748b;">
                Criterio Ministerial: 4to y 5to (≥4 materias reprobadas) • 6to (≥5 materias reprobadas)
            </div>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                <thead>
                    <tr style="background:#dc2626; color:#ffffff;">
                        <th style="padding:9px 10px; border:1px solid #b91c1c; width:35px; text-align:center;">No.</th>
                        <th style="padding:9px 10px; border:1px solid #b91c1c; width:90px;">Código</th>
                        <th style="padding:9px 10px; border:1px solid #b91c1c;">Estudiante</th>
                        <th style="padding:9px 10px; border:1px solid #b91c1c; width:45px; text-align:center;">Sexo</th>
                        <th style="padding:9px 10px; border:1px solid #b91c1c; width:90px; text-align:center;">Grado / Secc.</th>
                        <th style="padding:9px 10px; border:1px solid #b91c1c; width:75px; text-align:center;">Reprobadas</th>
                        <th style="padding:9px 10px; border:1px solid #b91c1c;">Detalle de Materias Perdidas y Catedráticos</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (sinDerechoList.length === 0) {
            html += `<tr><td colspan="7" style="padding:24px; text-align:center; color:#64748b; font-weight:600;">No hay alumnos reprobados definitivos según los filtros aplicados.</td></tr>`;
        } else {
            sinDerechoList.forEach((st, idx) => {
                const rowBg = (idx % 2 === 0) ? '#ffffff' : '#fef2f2';
                html += `
                <tr style="background:${rowBg}; border-bottom:1px solid #fecaca;">
                    <td style="padding:8px 10px; border:1px solid #e2e8f0; text-align:center; font-weight:700;">${idx + 1}</td>
                    <td style="padding:8px 10px; border:1px solid #e2e8f0; font-family:monospace; font-weight:800; color:#0369a1;">${st.code}</td>
                    <td style="padding:8px 10px; border:1px solid #e2e8f0; font-weight:800; color:#0f172a;">${escapeHtml(st.name)}</td>
                    <td style="padding:8px 10px; border:1px solid #e2e8f0; text-align:center; font-weight:700;">${st.sex}</td>
                    <td style="padding:8px 10px; border:1px solid #e2e8f0; text-align:center; font-weight:800; color:#0369a1;">${st.grade.substring(0, 4)} "${st.section}"</td>
                    <td style="padding:8px 10px; border:1px solid #e2e8f0; text-align:center;">
                        <span style="display:inline-block; padding:2px 8px; border-radius:12px; background:#fee2e2; color:#b91c1c; font-weight:900;">
                            ${st.num_rep} mat.
                        </span>
                    </td>
                    <td style="padding:8px 10px; border:1px solid #e2e8f0;">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            ${st.reprobadas.map(r => `
                                <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; border:1px solid #fca5a5; border-radius:4px; padding:3px 8px; font-size:0.77rem;">
                                    <span style="font-weight:700; color:#0f172a;">${escapeHtml(r.materia)}</span>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="color:#475569; font-weight:600;"><i class="fa-solid fa-user-tie" style="color:#94a3b8;"></i> ${escapeHtml(r.maestro)}</span>
                                        <span style="font-weight:900; color:#b91c1c; background:#fee2e2; padding:1px 6px; border-radius:4px;">${r.nota} pts</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
        </div>
        `;
    }

    html += `
    </div>
    `;

    container.innerHTML = html;
}
window.renderReprobadosRecuperacionView = renderReprobadosRecuperacionView;

function switchReprobadosConDerechoLayout(layout) {
    window._reprobadosConDerechoLayout = (layout === 'vertical') ? 'vertical' : 'horizontal';
    renderReprobadosRecuperacionView();
}
window.switchReprobadosConDerechoLayout = switchReprobadosConDerechoLayout;

function buildConDerechoHorizontalHtml(conDerechoList, mode = 'screen') {
    if (!Array.isArray(conDerechoList) || conDerechoList.length === 0) {
        return `<div style="padding:24px; text-align:center; color:#64748b; font-weight:600; border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc;">No hay alumnos con derecho a recuperación según los filtros aplicados.</div>`;
    }

    const gradeOrder = ['CUARTO', 'QUINTO', 'SEXTO'];
    const gradeLabels = {
        CUARTO: 'CUARTO PERITO CONTADOR',
        QUINTO: 'QUINTO PERITO CONTADOR',
        SEXTO: 'SEXTO PERITO CONTADOR'
    };

    const isPrint = (mode === 'print');
    const isExcel = (mode === 'excel');
    const headerBg = isPrint ? '#e2e8f0' : (isExcel ? '#dbeafe' : '#b45309');
    const headerFg = (isPrint || isExcel) ? '#0f172a' : '#ffffff';
    const borderCss = isPrint || isExcel ? '1px solid #000000' : '1px solid #cbd5e1';

    let out = '';
    gradeOrder.forEach(gKey => {
        const groupStudents = conDerechoList.filter(s => s.grade === gKey);
        if (groupStudents.length === 0) return;

        // Columnas dinámicas del pensum del grado
        const colDefs = [];
        const seenCol = new Set();
        const baseCat = REPROBADOS_PENSUM_CATALOG[gKey] || [];
        baseCat.forEach(c => {
            const nk = normalizeReprobadosSubjectKey(c.full);
            if (!seenCol.has(nk)) {
                seenCol.add(nk);
                colDefs.push({ full: c.full, short: c.short, norm: nk });
            }
        });
        groupStudents.forEach(st => {
            (st.materiasCompletas || []).forEach(m => {
                const nm = normalizeReprobadosSubjectKey(m.materia);
                if (nm && !seenCol.has(nm)) {
                    seenCol.add(nm);
                    colDefs.push({ full: m.materia, short: m.shortLabel || getAbbreviatedCourseNameForSheet(m.materia), norm: nm });
                }
            });
        });

        const numCols = colDefs.length || 9;
        const perCoursePct = (40 / numCols).toFixed(2);

        const groupTitleBlock = isExcel
            ? `<tr style="background:#cbe2f8;"><td colspan="${numCols + 6}" style="font-weight:bold; font-size:11pt; text-align:left; border:${borderCss}; padding:6px;">${gradeLabels[gKey] || gKey} — ${groupStudents.length} Alumno(s) Con Derecho a Recuperación</td></tr>`
            : `<div style="margin:${out ? '14px' : '4px'} 0 6px 0; padding:5px 10px; background:${isPrint ? '#f1f5f9' : '#fef3c7'}; border:${isPrint ? '1px solid #000' : '1px solid #fcd34d'}; border-left:4px solid ${isPrint ? '#000' : '#d97706'}; font-weight:800; font-size:${isPrint ? '8.5pt' : '0.86rem'}; color:${isPrint ? '#000' : '#92400e'}; display:flex; justify-content:space-between; align-items:center;">
                <span>${gradeLabels[gKey] || gKey} (${numCols} Asignaturas Oficiales)</span>
                <span>${groupStudents.length} Alumno(s)</span>
               </div>`;

        const tableStyle = isExcel
            ? 'width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:14px;'
            : `width:100%; table-layout:fixed; border-collapse:collapse; font-size:${isPrint ? '7pt' : '0.75rem'};`;

        let tHtml = isExcel ? `<table>${groupTitleBlock}` : `${groupTitleBlock}<table style="${tableStyle}">`;
        tHtml += `
            <thead>
                <tr style="background:${headerBg}; color:${headerFg};">
                    <th style="width:3%; border:${borderCss}; padding:${isPrint ? '3px 2px' : '6px 3px'}; text-align:center;">No.</th>
                    <th style="width:7.5%; border:${borderCss}; padding:${isPrint ? '3px 2px' : '6px 3px'}; text-align:center;">Código</th>
                    <th style="width:19%; border:${borderCss}; padding:${isPrint ? '3px 4px' : '6px 5px'}; text-align:left;">Estudiante</th>
                    <th style="width:3.5%; border:${borderCss}; padding:${isPrint ? '3px 1px' : '6px 2px'}; text-align:center;">Sec</th>
                    ${colDefs.map(c => `<th title="${escapeHtml(c.full)}" style="width:${perCoursePct}%; border:${borderCss}; padding:${isPrint ? '2px 1px' : '4px 2px'}; text-align:center; font-size:${isPrint ? '6.2pt' : '0.67rem'}; line-height:1.1; word-wrap:break-word;">${escapeHtml(c.short)}</th>`).join('')}
                    <th style="width:4%; border:${borderCss}; padding:${isPrint ? '3px 1px' : '6px 2px'}; text-align:center;">Rep.</th>
                    <th style="width:23%; border:${borderCss}; padding:${isPrint ? '3px 4px' : '6px 5px'}; text-align:left;">Nota(s) de Recuperación (Papel)</th>
                </tr>
            </thead>
            <tbody>
        `;

        groupStudents.forEach((st, idx) => {
            const rowBg = (idx % 2 === 0) ? '#ffffff' : (isPrint ? '#f8fafc' : '#fffdf5');
            const mList = Array.isArray(st.materiasCompletas) ? st.materiasCompletas : [];
            const repItems = Array.isArray(st.reprobadas) ? st.reprobadas : [];

            const courseCells = colDefs.map(col => {
                const matchM = mList.find(m => normalizeReprobadosSubjectKey(m.materia) === col.norm ||
                    normalizeReprobadosSubjectKey(m.materia).includes(col.norm) || col.norm.includes(normalizeReprobadosSubjectKey(m.materia)));
                if (!matchM) {
                    return `<td style="border:${borderCss}; text-align:center; padding:3px 1px; color:#94a3b8;">--</td>`;
                }
                const notaTxt = (matchM.nota !== null && matchM.nota !== undefined) ? String(matchM.nota) : '--';
                if (!matchM.aprobada && matchM.evaluada) {
                    return `<td title="${escapeHtml(matchM.materia)} — Reprobada (${escapeHtml(matchM.maestro || '')})" style="border:${borderCss}; text-align:center; padding:${isPrint ? '2px 1px' : '4px 2px'}; background:#ffe4e6 !important; color:#b91c1c; font-weight:900;">${notaTxt}</td>`;
                }
                return `<td title="${escapeHtml(matchM.materia)}" style="border:${borderCss}; text-align:center; padding:${isPrint ? '2px 1px' : '4px 2px'}; color:${matchM.evaluada ? '#0f172a' : '#64748b'}; font-weight:${matchM.evaluada ? '600' : '400'};">${notaTxt}</td>`;
            }).join('');

            const recupBoxes = isExcel
                ? repItems.map(r => `${escapeHtml(getAbbreviatedCourseNameForSheet(r.materia))} (${r.nota}): [ _____ ]`).join(' | ')
                : `<div style="display:flex; flex-direction:column; gap:2px;">
                    ${repItems.map(r => `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:4px; font-size:${isPrint ? '6.5pt' : '0.7rem'}; line-height:1.15;">
                            <span style="font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(getAbbreviatedCourseNameForSheet(r.materia))} <span style="color:#b91c1c;">(${r.nota})</span></span>
                            <span style="display:inline-block; width:${isPrint ? '34px' : '38px'}; height:${isPrint ? '13px' : '15px'}; border:1px solid #0f172a; background:#ffffff; flex-shrink:0;"></span>
                        </div>
                    `).join('')}
                   </div>`;

            tHtml += `
                <tr style="background:${rowBg}; page-break-inside:avoid;">
                    <td style="border:${borderCss}; text-align:center; font-weight:700; padding:3px 2px;">${idx + 1}</td>
                    <td style="border:${borderCss}; text-align:center; font-family:monospace; font-weight:800; color:${isPrint ? '#000' : '#0369a1'}; padding:3px 2px; word-break:break-all;">${escapeHtml(st.code)}</td>
                    <td style="border:${borderCss}; text-align:left; font-weight:700; color:#0f172a; padding:3px 4px; word-wrap:break-word;">${escapeHtml(st.name)}</td>
                    <td style="border:${borderCss}; text-align:center; font-weight:800; padding:3px 1px;">${escapeHtml(st.section)}</td>
                    ${courseCells}
                    <td style="border:${borderCss}; text-align:center; font-weight:900; color:#92400e; background:#fef3c7 !important; padding:3px 1px;">${st.num_rep}</td>
                    <td style="border:${borderCss}; text-align:left; padding:3px 4px; vertical-align:middle;">${recupBoxes}</td>
                </tr>
            `;
        });

        tHtml += `</tbody></table>`;
        out += isExcel ? tHtml : `<div style="${isPrint ? '' : 'overflow-x:auto;'}">${tHtml}</div>`;
    });

    return out;
}

function buildConDerechoVerticalHtml(conDerechoList, mode = 'screen') {
    if (!Array.isArray(conDerechoList) || conDerechoList.length === 0) {
        return `<div style="padding:24px; text-align:center; color:#64748b; font-weight:600; border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc;">No hay alumnos con derecho a recuperación según los filtros aplicados.</div>`;
    }

    const isPrint = (mode === 'print');
    const isExcel = (mode === 'excel');
    const headerBg = isPrint ? '#e2e8f0' : (isExcel ? '#dbeafe' : '#d97706');
    const headerFg = (isPrint || isExcel) ? '#0f172a' : '#ffffff';
    const borderCss = isPrint || isExcel ? '1px solid #000000' : '1px solid #cbd5e1';

    let html = `
        <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:${isPrint ? '7.5pt' : (isExcel ? '9pt' : '0.8rem')}; text-align:left;">
            <thead>
                <tr style="background:${headerBg}; color:${headerFg};">
                    <th style="width:4%; border:${borderCss}; padding:${isPrint ? '4px 2px' : '7px 4px'}; text-align:center;">No.</th>
                    <th style="width:10%; border:${borderCss}; padding:${isPrint ? '4px 3px' : '7px 5px'}; text-align:center;">Código</th>
                    <th style="width:22%; border:${borderCss}; padding:${isPrint ? '4px 5px' : '7px 6px'};">Estudiante</th>
                    <th style="width:8%; border:${borderCss}; padding:${isPrint ? '4px 2px' : '7px 4px'}; text-align:center;">Grado / Rep.</th>
                    <th style="width:32%; border:${borderCss}; padding:${isPrint ? '4px 5px' : '7px 6px'};">Asignaturas del Pensum y Catedrático</th>
                    <th style="width:7%; border:${borderCss}; padding:${isPrint ? '4px 2px' : '7px 4px'}; text-align:center;">Prom.</th>
                    <th style="width:9%; border:${borderCss}; padding:${isPrint ? '4px 2px' : '7px 4px'}; text-align:center;">Estado</th>
                    <th style="width:8%; border:${borderCss}; padding:${isPrint ? '4px 3px' : '7px 4px'}; text-align:center;">Recup. (Papel)</th>
                </tr>
            </thead>
    `;

    conDerechoList.forEach((st, idx) => {
        const mList = (Array.isArray(st.materiasCompletas) && st.materiasCompletas.length > 0)
            ? st.materiasCompletas
            : (st.reprobadas || []).map(r => ({ materia: r.materia, nota: r.nota, aprobada: false, evaluada: true, maestro: r.maestro }));
        const rowSpan = mList.length || 1;
        const baseBg = (idx % 2 === 0) ? '#ffffff' : (isPrint ? '#f8fafc' : '#fffdf7');

        html += `<tbody style="page-break-inside:avoid; break-inside:avoid;">`;
        mList.forEach((m, mIdx) => {
            const isRep = (!m.aprobada && m.evaluada);
            const rowHighlight = isRep ? 'background:#ffe4e6 !important;' : `background:${baseBg};`;
            const notaStr = (m.nota !== null && m.nota !== undefined) ? `${m.nota}` : '--';
            const estadoLabel = isRep ? 'PERDIDA' : (m.evaluada ? 'Aprobada' : 'Sin nota');
            const recupCell = isRep
                ? (isExcel ? '' : `<span style="display:inline-block; width:44px; height:15px; border:1px solid #0f172a; background:#ffffff;"></span>`)
                : `<span style="color:#94a3b8;">---</span>`;

            html += `<tr style="${rowHighlight}">`;
            if (mIdx === 0) {
                html += `
                    <td rowspan="${rowSpan}" style="border:${borderCss}; text-align:center; font-weight:700; vertical-align:top; padding:4px 2px; background:${baseBg};">${idx + 1}</td>
                    <td rowspan="${rowSpan}" style="border:${borderCss}; text-align:center; font-family:monospace; font-weight:800; color:${isPrint ? '#000' : '#0369a1'}; vertical-align:top; padding:4px 3px; background:${baseBg}; word-break:break-all;">${escapeHtml(st.code)}</td>
                    <td rowspan="${rowSpan}" style="border:${borderCss}; font-weight:800; color:#0f172a; vertical-align:top; padding:4px 5px; background:${baseBg}; word-wrap:break-word;">${escapeHtml(st.name)}</td>
                    <td rowspan="${rowSpan}" style="border:${borderCss}; text-align:center; vertical-align:top; padding:4px 2px; background:${baseBg};">
                        <div style="font-weight:800; color:${isPrint ? '#000' : '#0369a1'};">${st.grade.substring(0, 4)} "${escapeHtml(st.section)}"</div>
                        <div style="margin-top:3px; font-size:${isPrint ? '6.5pt' : '0.72rem'}; font-weight:900; color:#92400e;">(${st.num_rep} rep.)</div>
                    </td>
                `;
            }
            html += `
                <td style="border:${borderCss}; padding:${isPrint ? '2px 5px' : '4px 6px'};">
                    <span style="font-weight:${isRep ? '800' : '600'}; color:${isRep ? '#991b1b' : '#0f172a'};">${mIdx + 1}. ${escapeHtml(m.materia)}</span>
                    ${isRep && m.maestro ? `<div style="font-size:${isPrint ? '6.2pt' : '0.7rem'}; color:#475569;">Catedrático: ${escapeHtml(m.maestro)}</div>` : ''}
                </td>
                <td style="border:${borderCss}; text-align:center; font-weight:${isRep ? '900' : '700'}; color:${isRep ? '#b91c1c' : '#166534'}; padding:2px 3px;">${notaStr}</td>
                <td style="border:${borderCss}; text-align:center; font-weight:800; font-size:${isPrint ? '6.5pt' : '0.72rem'}; color:${isRep ? '#b91c1c' : '#15803d'}; padding:2px 2px;">${estadoLabel}</td>
                <td style="border:${borderCss}; text-align:center; padding:2px 3px; background:${isRep ? '#ffffff' : baseBg};">${recupCell}</td>
            </tr>`;
        });
        html += `</tbody>`;
    });

    html += `</table>`;
    return isExcel ? html : `<div style="${isPrint ? '' : 'overflow-x:auto;'}">${html}</div>`;
}

function buildConDerechoLayoutContent(conDerechoList, layout = 'horizontal', mode = 'screen') {
    if (layout === 'vertical') return buildConDerechoVerticalHtml(conDerechoList, mode);
    return buildConDerechoHorizontalHtml(conDerechoList, mode);
}

// CONTROLADORES DE EVENTOS DE SUB-VISTAS Y FILTROS
function switchReprobadosSubView(subView) {
    window._reprobadosSubView = subView;
    renderReprobadosRecuperacionView();
}
window.switchReprobadosSubView = switchReprobadosSubView;

function onReprobadosGradeChange(val) {
    window._reprobadosGradeFilter = val;
    renderReprobadosRecuperacionView();
}
window.onReprobadosGradeChange = onReprobadosGradeChange;

function onReprobadosSectionChange(val) {
    window._reprobadosSectionFilter = val;
    renderReprobadosRecuperacionView();
}
window.onReprobadosSectionChange = onReprobadosSectionChange;

function onReprobadosTeacherChange(val) {
    window._reprobadosTeacherFilter = val;
    renderReprobadosRecuperacionView();
}
window.onReprobadosTeacherChange = onReprobadosTeacherChange;

function onReprobadosSearchInput(val) {
    window._reprobadosSearchQuery = val;
    renderReprobadosRecuperacionView();
}
window.onReprobadosSearchInput = onReprobadosSearchInput;

function toggleReprobadosDetail(detailId) {
    const el = document.getElementById(detailId);
    if (!el) return;
    el.style.display = (el.style.display === 'none' || !el.style.display) ? 'table-row' : 'none';
}
window.toggleReprobadosDetail = toggleReprobadosDetail;

/**
 * Impresión Oficial (Hoja Carta Horizontal o Vertical según sub-vista y disposición seleccionada)
 * Membrete Institucional exacto sin la palabra ENCCO
 */
function printReprobadosRecuperacionView() {
    if (!window._lastReprobadosReportData) {
        renderReprobadosRecuperacionView();
    }
    const d = window._lastReprobadosReportData;
    if (!d || !Array.isArray(d.students)) {
        if (typeof showToast === 'function') showToast('No hay datos disponibles para imprimir.', 'warning');
        return;
    }

    const currentGrade = window._reprobadosGradeFilter || 'ALL';
    const currentSec = window._reprobadosSectionFilter || 'ALL';
    const currentTeacher = window._reprobadosTeacherFilter || 'ALL';
    const subView = window._reprobadosSubView || 'materias';
    const layout = (window._reprobadosConDerechoLayout === 'vertical') ? 'vertical' : 'horizontal';

    const filtered = d.students.filter(s => {
        if (currentGrade !== 'ALL' && s.grade !== currentGrade) return false;
        if (currentSec !== 'ALL' && s.section !== currentSec) return false;
        if (currentTeacher !== 'ALL') {
            const hasT = s.reprobadas.some(r => r.maestro && r.maestro.trim() === currentTeacher);
            if (!hasT) return false;
        }
        return true;
    });

    const isConDerechoPrint = (subView === 'con_derecho');
    const isPortrait = (isConDerechoPrint && layout === 'vertical');
    const pageSizeCss = isPortrait ? 'letter portrait' : 'letter landscape';
    const pageMarginCss = isConDerechoPrint ? '7mm' : '10mm';

    let bodyTableHtml = '';
    let docSubtitle = 'INFORME OFICIAL DE ALUMNOS REPROBADOS, MATERIAS, CATEDRÁTICOS Y DERECHO A RECUPERACIÓN';

    if (isConDerechoPrint) {
        const conDerechoList = filtered.filter(s => s.isConDerecho);
        docSubtitle = `LISTADO OFICIAL DE ALUMNOS CON DERECHO A EXÁMENES DE RECUPERACIÓN (${layout === 'vertical' ? 'FORMATO VERTICAL' : 'SÁBANA HORIZONTAL'})`;
        bodyTableHtml = buildConDerechoLayoutContent(conDerechoList, layout, 'print');
    } else {
        const targetList = (subView === 'sin_derecho') ? filtered.filter(s => s.isSinDerecho) : filtered;
        if (subView === 'sin_derecho') {
            docSubtitle = 'LISTADO OFICIAL DE ALUMNOS REPROBADOS DEFINITIVOS (SIN DERECHO A RECUPERACIÓN)';
        }
        bodyTableHtml = `
        <table>
            <thead>
                <tr>
                    <th style="width:30px;">No.</th>
                    <th style="width:75px;">Código</th>
                    <th>Nombre del Estudiante</th>
                    <th style="width:40px;">Sexo</th>
                    <th style="width:80px;">Grado/Secc</th>
                    <th style="width:60px;">Total Rep.</th>
                    <th>Materias Reprobadas, Calificación y Catedrático Titular</th>
                    <th style="width:140px;">Situación de Promoción</th>
                </tr>
            </thead>
            <tbody>
                ${targetList.map((st, idx) => `
                    <tr>
                        <td style="text-align:center;">${idx + 1}</td>
                        <td style="text-align:center; font-family:monospace; font-weight:bold;">${st.code}</td>
                        <td style="font-weight:bold;">${escapeHtml(st.name)}</td>
                        <td style="text-align:center;">${st.sex}</td>
                        <td style="text-align:center; font-weight:bold;">${st.grade.substring(0, 4)} "${st.section}"</td>
                        <td style="text-align:center; font-weight:bold;">${st.num_rep}</td>
                        <td>
                            ${st.reprobadas.map(r => `<div><strong>${escapeHtml(r.materia)}</strong>: ${r.nota} pts (Catedrático: ${escapeHtml(r.maestro)})</div>`).join('')}
                        </td>
                        <td style="font-weight:bold; text-align:center;">
                            ${st.condicion}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${docSubtitle} - Ciclo ${d.cycle}</title>
<style>
    @page {
        size: ${pageSizeCss};
        margin: ${pageMarginCss};
    }
    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    body {
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #000;
        margin: 0;
        padding: 0;
        width: 100%;
    }
    .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 6px;
        margin-bottom: 10px;
    }
    .header h1 {
        font-size: 13pt;
        margin: 0;
        font-weight: 900;
        text-transform: uppercase;
    }
    .header h2 {
        font-size: 10pt;
        margin: 2px 0;
        font-weight: 700;
    }
    .header p {
        font-size: 8.5pt;
        margin: 2px 0;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
    }
    th, td {
        border: 1px solid #000;
        padding: 3px 4px;
        vertical-align: middle;
    }
    th {
        background-color: #f1f5f9;
        font-weight: bold;
        text-align: center;
    }
    .signatures {
        margin-top: 28px;
        display: flex;
        justify-content: space-around;
        text-align: center;
        page-break-inside: avoid;
    }
    .signature-box {
        width: 40%;
        border-top: 1px solid #000;
        padding-top: 6px;
        font-size: 8.5pt;
        font-weight: bold;
    }
</style>
</head>
<body>
    <div class="header">
        <p style="font-size:7.5pt; font-weight:bold; letter-spacing:1px; margin-bottom:2px;">REPÚBLICA DE GUATEMALA - MINISTERIO DE EDUCACIÓN</p>
        <h1>ESCUELA NACIONAL DE CIENCIAS COMERCIALES</h1>
        <h2>JORNADA VESPERTINA - CÓDIGO MINEDUC: 22-01-0014-46 - JUTIAPA, JUTIAPA</h2>
        <p><strong>${docSubtitle}</strong></p>
        <p>Ciclo Escolar: <strong>${d.cycle}</strong> ${d.is2026Official ? '(Datos Oficiales Auditoría SIRE)' : '(Registro Dinámico RTDB)'} | Fecha de Emisión: ${new Date().toLocaleDateString('es-GT')}</p>
    </div>

    ${bodyTableHtml}

    <div class="signatures">
        <div class="signature-box">
            Licda. Mirza Elizabeth Aragón Polanco de Hernández<br>
            Directora
        </div>
        <div class="signature-box">
            Comisión de Evaluación del Rendimiento Escolar<br>
            Claustro de Catedráticos
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        };
    </script>
</body>
</html>`;

    window._lastReprobadosPrintHtml = htmlContent;
    const printWin = window.open('', '_blank', 'width=1150,height=850');
    if (!printWin) {
        if (typeof window.print === 'function') window.print();
        return;
    }

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
}
window.printReprobadosRecuperacionView = printReprobadosRecuperacionView;

/**
 * Exportación Oficial a Excel Institucional
 */
function exportReprobadosRecuperacionExcel() {
    if (!window._lastReprobadosReportData) {
        renderReprobadosRecuperacionView();
    }
    const d = window._lastReprobadosReportData;
    if (!d || !Array.isArray(d.students)) {
        if (typeof showToast === 'function') showToast('No hay datos cargados para exportar.', 'warning');
        return;
    }

    const currentGrade = window._reprobadosGradeFilter || 'ALL';
    const currentSec = window._reprobadosSectionFilter || 'ALL';
    const currentTeacher = window._reprobadosTeacherFilter || 'ALL';
    const subView = window._reprobadosSubView || 'materias';
    const layout = (window._reprobadosConDerechoLayout === 'vertical') ? 'vertical' : 'horizontal';

    const filtered = d.students.filter(s => {
        if (currentGrade !== 'ALL' && s.grade !== currentGrade) return false;
        if (currentSec !== 'ALL' && s.section !== currentSec) return false;
        if (currentTeacher !== 'ALL') {
            const hasT = s.reprobadas.some(r => r.maestro && r.maestro.trim() === currentTeacher);
            if (!hasT) return false;
        }
        return true;
    });

    const isConDerechoExcel = (subView === 'con_derecho');
    const isPortraitExcel = (isConDerechoExcel && layout === 'vertical');
    const orientationXml = isPortraitExcel ? 'Portrait' : 'Landscape';
    const headerColspan = isConDerechoExcel ? (layout === 'vertical' ? 8 : 15) : 10;

    let bodyExcelHtml = '';
    let docSubtitle = `NÓMINA DE ALUMNOS REPROBADOS Y SITUACIÓN DE RECUPERACIÓN - CICLO ${d.cycle}`;

    if (isConDerechoExcel) {
        const conDerechoList = filtered.filter(s => s.isConDerecho);
        docSubtitle = `LISTADO OFICIAL CON DERECHO A RECUPERACIÓN (${layout === 'vertical' ? 'FORMATO VERTICAL' : 'SÁBANA HORIZONTAL'}) - CICLO ${d.cycle}`;
        bodyExcelHtml = buildConDerechoLayoutContent(conDerechoList, layout, 'excel');
    } else {
        const targetList = (subView === 'sin_derecho') ? filtered.filter(s => s.isSinDerecho) : filtered;
        let rowsHtml = '';
        let counter = 1;
        targetList.forEach(st => {
            if (st.reprobadas.length === 0) {
                rowsHtml += `
                    <tr>
                        <td>${counter++}</td>
                        <td>${st.code}</td>
                        <td>${st.name}</td>
                        <td>${st.genderLabel}</td>
                        <td>${st.grade}</td>
                        <td>${st.section}</td>
                        <td>NINGUNA</td>
                        <td>--</td>
                        <td>--</td>
                        <td>${st.condicion}</td>
                    </tr>
                `;
            } else {
                st.reprobadas.forEach(r => {
                    const condClass = st.isConDerecho ? 'cd' : (st.isSinDerecho ? 'sd' : '');
                    rowsHtml += `
                        <tr>
                            <td>${counter++}</td>
                            <td>${st.code}</td>
                            <td>${st.name}</td>
                            <td>${st.genderLabel}</td>
                            <td>${st.grade}</td>
                            <td>${st.section}</td>
                            <td>${r.materia}</td>
                            <td style="text-align:center; color:#b91c1c; font-weight:bold;">${r.nota}</td>
                            <td>${r.maestro}</td>
                            <td class="${condClass}">${st.condicion}</td>
                        </tr>
                    `;
                });
            }
        });
        bodyExcelHtml = `
        <table>
            <thead>
                <tr>
                    <th>No.</th>
                    <th>Código Personal</th>
                    <th>Nombre Completo del Estudiante</th>
                    <th>Género</th>
                    <th>Grado</th>
                    <th>Sección</th>
                    <th>Asignatura Reprobada</th>
                    <th>Calificación</th>
                    <th>Catedrático Titular</th>
                    <th>Situación Final</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>`;
    }

    const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Recuperación Oficial</x:Name><x:WorksheetOptions><x:DisplayGridlines/><x:FitToPage/><x:Print><x:ValidPrinterInfo/><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight></x:Print><x:PageSetup><x:Layout x:Orientation="${orientationXml}"/></x:PageSetup></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
            body { font-family: Arial, sans-serif; font-size: 9.5pt; }
            th { background-color: #dbeafe; color: #0f172a; font-weight: bold; border: 1pt solid #000; text-align: center; }
            td { border: 0.5pt solid #000; vertical-align: middle; }
            .cd { background-color: #fef3c7; color: #92400e; font-weight: bold; }
            .sd { background-color: #fee2e2; color: #b91c1c; font-weight: bold; }
        </style>
    </head>
    <body>
        <table style="border-collapse:collapse; width:100%; margin-bottom:10px;">
            <tr><td colspan="${headerColspan}" style="font-size:9pt; font-weight:bold; text-align:center; border:none;">REPÚBLICA DE GUATEMALA - MINISTERIO DE EDUCACIÓN</td></tr>
            <tr><td colspan="${headerColspan}" style="font-size:14pt; font-weight:bold; text-align:center; border:none;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</td></tr>
            <tr><td colspan="${headerColspan}" style="font-size:10pt; font-weight:bold; text-align:center; border:none;">JORNADA VESPERTINA - CÓDIGO MINEDUC: 22-01-0014-46 - JUTIAPA, JUTIAPA</td></tr>
            <tr><td colspan="${headerColspan}" style="font-size:11pt; font-weight:bold; text-align:center; border:none;">${docSubtitle}</td></tr>
            <tr><td colspan="${headerColspan}" style="font-size:9pt; text-align:right; border:none;">Emisión: ${new Date().toLocaleDateString('es-GT')}</td></tr>
        </table>
        ${bodyExcelHtml}
        <table style="border-collapse:collapse; width:100%; margin-top:24px;">
            <tr><td colspan="${headerColspan}" style="border:none; height:24px;"></td></tr>
            <tr>
                <td colspan="${Math.floor(headerColspan / 2)}" style="border:none; text-align:center; font-weight:bold;">____________________________________________________<br>Licda. Mirza Elizabeth Aragón Polanco de Hernández<br>Directora</td>
                <td colspan="${Math.ceil(headerColspan / 2)}" style="border:none; text-align:center; font-weight:bold;">____________________________________________________<br>Comisión de Evaluación del Rendimiento Escolar<br>Claustro de Catedráticos</td>
            </tr>
        </table>
    </body>
    </html>
    `;

    window._lastReprobadosExcelHtml = excelContent;
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isConDerechoExcel
        ? `Con_Derecho_Recuperacion_${layout}_${d.cycle}.xls`
        : `Alumnos_Reprobados_Recuperacion_${d.cycle}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.exportReprobadosRecuperacionExcel = exportReprobadosRecuperacionExcel;

