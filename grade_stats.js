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

function onGradeStatsGradeChange() {
    const gradeSelect = document.getElementById('gradeStatsGradeFilter');
    const secSelect = document.getElementById('gradeStatsSectionFilter');
    if (!gradeSelect || !secSelect) return;

    const gVal = gradeSelect.value;
    if (!gVal) {
        secSelect.innerHTML = '<option value="" disabled selected>-- Seleccione una Sección --</option>';
        renderGradeStatsView();
        return;
    }

    const students = STATE.students || [];

    // Buscar secciones existentes para este grado
    const gStudents = students.filter(s => {
        const g = String(s.grade || s.gradeLevel || '').toLowerCase();
        return g.includes(`${gVal}to`) || (gVal === '6' && (g.includes('6to') || g.includes('sexto'))) ||
               (gVal === '5' && (g.includes('5to') || g.includes('quinto'))) ||
               (gVal === '4' && (g.includes('4to') || g.includes('cuarto')));
    });

    const uniqueSecs = new Set();
    gStudents.forEach(s => {
        const rawSec = (s.section || s.sectionId || '').replace(/^secci[oó]n\s*/i, '').trim().toUpperCase();
        if (rawSec) uniqueSecs.add(rawSec);
    });

    // Si no se detectaron secciones específicas, proveer al menos A, B, C, D
    if (uniqueSecs.size === 0) {
        ['A', 'B', 'C', 'D'].forEach(s => uniqueSecs.add(s));
    }

    const sortedSecs = Array.from(uniqueSecs).sort();
    let optHtml = '<option value="" disabled selected>-- Seleccione una Sección --</option>';
    optHtml += '<option value="ALL">Todas las Secciones (Consolidado)</option>';
    sortedSecs.forEach(sec => {
        optHtml += `<option value="${sec}">Sección ${sec}</option>`;
    });
    secSelect.innerHTML = optHtml;

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

    const period = bimSelect ? bimSelect.value : 'FINAL';
    const gradeVal = gradeSelect ? gradeSelect.value : '';
    const selectedSection = secSelect ? secSelect.value : '';

    // REGLA CLAVE: No mostrar datos a menos que se seleccione Grado y Sección
    if (!gradeVal || !selectedSection) {
        let promptMsg = 'Por favor seleccione un <strong>Grado</strong> y una <strong>Sección</strong> en los filtros superiores para generar dinámicamente las actas oficiales de promedios.';
        if (gradeVal && !selectedSection) {
            promptMsg = `Grado <strong>${gradeVal}to Perito Contador</strong> seleccionado. Ahora elija una <strong>Sección</strong> para visualizar el documento.`;
        }
        container.innerHTML = `
            <div class="no-print" style="text-align:center; padding:55px 20px; background:#ffffff; border-radius:10px; border:2px dashed #cbd5e1; width:100%; max-width:100%; box-sizing:border-box; margin:16px 0; color:#64748b;">
                <i class="fa-solid fa-file-invoice" style="font-size:3.2rem; color:#0284c7; margin-bottom:14px; display:block;"></i>
                <h3 style="font-size:1.18rem; font-weight:800; color:#1e293b; margin-bottom:8px;">Seleccione los Parámetros del Reporte</h3>
                <p style="font-size:0.92rem; margin:0 auto; color:#64748b; max-width:440px; line-height:1.5;">
                    ${promptMsg}
                </p>
            </div>
        `;
        window._lastGradeStatsReportData = null;
        return;
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
            for (const k of Object.keys(dict)) {
                const cK = cleanStr(k);
                if (cK.includes(cleanTarget) || cleanTarget.includes(cK) ||
                    (cleanTarget.includes('gubernamental') && cK.includes('gubernamental')) ||
                    (cleanTarget.includes('organizacion') && cK.includes('organizacion')) ||
                    (cleanTarget.includes('derecho') && cK.includes('derecho')) ||
                    (cleanTarget.includes('seminario') && cK.includes('seminario')) ||
                    (cleanTarget.includes('practica') && cK.includes('practica')) ||
                    (cleanTarget.includes('auditoria') && cK.includes('auditoria')) ||
                    (cleanTarget.includes('etica') && cK.includes('etica')) ||
                    (cleanTarget.includes('estadistica') && cK.includes('estadistica')) ||
                    (cleanTarget.includes('bancaria') && cK.includes('bancaria')) ||
                    (cleanTarget.includes('computacion') && cK.includes('computacion')) ||
                    (cleanTarget.includes('costos') && cK.includes('costos')) ||
                    (cleanTarget.includes('sociedades') && cK.includes('sociedades')) ||
                    (cleanTarget.includes('mecanografia') && cK.includes('mecanografia')) ||
                    (cleanTarget.includes('archivo') && cK.includes('archivo')) ||
                    (cleanTarget.includes('fiscal') && cK.includes('fiscal')) ||
                    (cleanTarget.includes('finanzas') && cK.includes('finanzas')) ||
                    (cleanTarget.includes('geografia') && cK.includes('geografia')) ||
                    (cleanTarget.includes('ingles') && cK.includes('ingles')) ||
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
                    return uData.total !== undefined ? Number(uData.total) : (Number(uData.zona || 0) + Number(uData.exam || 0));
                }
            }
            if (matchedKey && student.grades && student.grades[matchedKey]) {
                const arr = student.grades[matchedKey];
                const val = Array.isArray(arr) ? Number(arr[u - 1] ?? 0) : 0;
                if (val > 0) return val;
            }
            return null;
        }

        if (per === 'FINAL') {
            const scores = [];
            const maxB = parseInt(STATE.config?.activeBimestre) || 3;
            for (let u = 1; u <= maxB; u++) {
                const sVal = getUnitVal(u);
                if (sVal !== null) scores.push(sVal);
            }
            if (!scores.length) return { score: null, evaluated: false };
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            return { score: avg, evaluated: true };
        } else {
            const u = parseInt(per) || 1;
            const sVal = getUnitVal(u);
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
            const isRetirado = (st.status === 'Retirado' || st.status === 'Inactivo' || st.status === 'Ausente');
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

            processedStudents.push({
                clave: idx + 1,
                student: st,
                name: formatStudentDisplayName(st, 'lastFirst').toUpperCase(),
                scores: subjectScores,
                average: genAvg,
                lostCount: lostCount,
                isRetirado: isRetirado
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
                        ${escapeHtml(item.name)}
                        ${item.isRetirado ? ' <span style="font-size:0.68rem; color:#b91c1c; font-weight:bold;">(RETIRADO)</span>' : ''}
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
            </table>
            </div>

            <!-- PIE DE PÁGINA OFICIAL -->
            <div style="display:flex; justify-content:flex-end; font-size:8px; font-weight:bold; color:#475569; margin-top:4px;">
                ${gradeVal}${sec} &bull; ${footerTimestamp}
            </div>
        </div>`;
    });

    container.innerHTML = html;

    // Guardar referencia en memoria para exportar a Excel
    window._lastGradeStatsReportData = {
        gradeVal,
        gradeTitle,
        period,
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
                    <td>${escapeHtml(item.name)}</td>
                    ${item.scores.map(sc => `<td style="text-align:center; ${sc.evaluated && sc.score < 60 ? 'color:#dc2626; font-weight:bold;' : ''}">${sc.evaluated && sc.score !== null ? sc.score : ''}</td>`).join('')}
                    <td class="pink">${item.average.toFixed(2)}</td>
                    <td class="pink ${item.lostCount > 0 ? 'red' : ''}">${item.lostCount}</td>
                </tr>
            `;
        });
        excelContent += `<tr></tr>`;
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
        alert("Por favor permita las ventanas emergentes (pop-ups) en su navegador para imprimir el reporte.");
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
                <img src="${escapeHtml(logoUrl)}" alt="Logo ENCCO" onerror="this.style.display='none'">
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
