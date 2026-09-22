/**
 * ======================================================================
 * 📊 ENCCO PREDICTIVE ANALYTICS & DROPOUT DETECTION MODULE (analytics.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ======================================================================
 * - Semáforo inteligente de riesgo escolar (Rojo / Amarillo / Verde).
 * - Identificación temprana de estudiantes en riesgo de reprobación.
 * - Detección de materias críticas y análisis comparativo por carrera.
 * - Generador de citaciones a padres de familia y exportación a Excel.
 */

(function(window) {
    'use strict';

    // 1. MOTOR DE CÁLCULO DE RIESGO ACADÉMICO
    const EnccoAnalytics = {
        
        /**
         * Evalúa el riesgo de un estudiante en base a sus notas y materias asignadas
         */
        evaluateStudentRisk(student) {
            if (!student) return null;

            const stGrade = (student.grade || '').trim();
            const stSection = (student.section || '').trim();
            const stCareer = (student.career || '').trim();
            const stCycle = (student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026').toString();

            // Obtener pensum del estudiante
            const pensumList = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
            const studentCourses = pensumList.filter(p => {
                if (!p) return false;
                const pGrade = (p.grade || '').trim();
                const pSec = (p.section || '').trim();
                const pCar = (p.career || '').trim();

                const gradeMatch = !pGrade || !stGrade || pGrade.toLowerCase() === stGrade.toLowerCase();
                const secMatch = !pSec || !stSection || pSec.toLowerCase() === stSection.toLowerCase();
                const carMatch = !pCar || !stCareer || pCar.toLowerCase() === stCareer.toLowerCase();
                return gradeMatch && secMatch && carMatch;
            });

            // Evaluar calificaciones
            const gradesObj = student.grades || {};
            const gradebookDetails = student.gradebookDetails || {};
            let totalEvaluatedSubjects = 0;
            let totalScoreSum = 0;
            let failedSubjectsCount = 0;
            const failedSubjectsList = [];
            const coursePerformances = [];

            // Si hay cursos en pensum para este grado, iterar sobre ellos
            const subjectsToEvaluate = studentCourses.length > 0 
                ? studentCourses.map(c => c.subject) 
                : Object.keys(gradesObj);

            // Eliminar duplicados
            const uniqueSubjects = [...new Set(subjectsToEvaluate)].filter(Boolean);

            uniqueSubjects.forEach(subjectName => {
                let uArr = gradesObj[subjectName];
                if (!uArr) {
                    // Búsqueda insensible a mayúsculas/minúsculas
                    const sLower = subjectName.toLowerCase();
                    const foundKey = Object.keys(gradesObj).find(k => k.toLowerCase() === sLower);
                    if (foundKey) uArr = gradesObj[foundKey];
                }

                let evaluatedUnits = [];
                if (Array.isArray(uArr)) {
                    evaluatedUnits = uArr.filter(n => typeof n === 'number' && !isNaN(n) && n > 0);
                } else if (typeof uArr === 'number' && !isNaN(uArr) && uArr > 0) {
                    evaluatedUnits = [uArr];
                } else if (uArr && typeof uArr === 'object') {
                    evaluatedUnits = Object.values(uArr).filter(n => typeof n === 'number' && !isNaN(n) && n > 0);
                }

                if (evaluatedUnits.length > 0) {
                    const sum = evaluatedUnits.reduce((a, b) => a + b, 0);
                    const avg = Math.round(sum / evaluatedUnits.length);
                    totalEvaluatedSubjects++;
                    totalScoreSum += avg;

                    coursePerformances.push({
                        subject: subjectName,
                        average: avg,
                        units: Array.isArray(uArr) ? uArr : evaluatedUnits,
                        evaluatedCount: evaluatedUnits.length,
                        isFailed: avg < 60
                    });

                    if (avg < 60) {
                        failedSubjectsCount++;
                        failedSubjectsList.push({
                            subject: subjectName,
                            average: avg
                        });
                    }
                }
            });

            const overallAverage = totalEvaluatedSubjects > 0 
                ? Math.round(totalScoreSum / totalEvaluatedSubjects) 
                : 0;

            // Inasistencias acumuladas
            const attendanceList = (window.STATE && Array.isArray(window.STATE.attendance)) ? window.STATE.attendance : [];
            let unexcusedAbsences = 0;
            attendanceList.forEach(att => {
                if (att && att.records && Array.isArray(att.records)) {
                    const r = att.records.find(rec => rec && (rec.studentId === student.id || rec.studentCarne === student.carne));
                    if (r && (r.status === 'ausente' || r.status === 'injustificada' || r.status === 'falta')) {
                        unexcusedAbsences++;
                    }
                }
            });

            // Determinar nivel de riesgo: CRITICO (Rojo), MODERADO (Amarillo), SATISFACTORIO (Verde)
            let riskLevel = 'SATISFACTORIO';
            let riskReason = 'Rendimiento académico satisfactorio.';

            if (totalEvaluatedSubjects > 0) {
                if (failedSubjectsCount >= 3 || overallAverage < 50 || unexcusedAbsences >= 5) {
                    riskLevel = 'CRITICO';
                    riskReason = failedSubjectsCount >= 3 
                        ? `Alerta Roja: Tiene ${failedSubjectsCount} materias con promedio menor a 60 puntos.`
                        : (overallAverage < 50 
                            ? `Alerta Roja: Promedio general crítico (${overallAverage} pts).` 
                            : `Alerta Roja: Acumula ${unexcusedAbsences} inasistencias injustificadas.`);
                } else if (failedSubjectsCount >= 1 || (overallAverage >= 50 && overallAverage < 60)) {
                    riskLevel = 'MODERADO';
                    riskReason = failedSubjectsCount >= 1 
                        ? `Alerta Amarilla: Tiene ${failedSubjectsCount} materia(s) en zona de riesgo (< 60 pts).`
                        : `Alerta Amarilla: Promedio global vulnerable (${overallAverage} pts).`;
                }
            } else {
                riskLevel = 'SIN_DATOS';
                riskReason = 'Aún no se han asentado calificaciones para este estudiante en el ciclo actual.';
            }

            return {
                studentId: student.id,
                studentName: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                carne: student.carne || student.personalCode || 'S/C',
                personalCode: student.personalCode || '',
                grade: stGrade,
                section: stSection,
                career: stCareer,
                academicCycle: stCycle,
                overallAverage,
                totalEvaluatedSubjects,
                failedSubjectsCount,
                failedSubjectsList,
                coursePerformances,
                unexcusedAbsences,
                riskLevel,
                riskReason
            };
        },

        /**
         * Obtiene estadísticas agregadas y ranking de riesgo para la institución
         */
        getAggregatedAnalytics(filterCareer = 'ALL', filterGrade = 'ALL', filterSection = 'ALL') {
            const allStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            const activeCycle = (window.STATE && window.STATE.activeCycle) || '2026';

            // Filtrar estudiantes
            const filtered = allStudents.filter(st => {
                if (!st) return false;
                const stCar = (st.career || '').trim();
                const stGrd = (st.grade || '').trim();
                const stSec = (st.section || '').trim();

                const carMatch = (filterCareer === 'ALL' || !filterCareer || stCar.toLowerCase() === filterCareer.toLowerCase());
                const grdMatch = (filterGrade === 'ALL' || !filterGrade || stGrd.toLowerCase() === filterGrade.toLowerCase());
                const secMatch = (filterSection === 'ALL' || !filterSection || stSec.toLowerCase() === filterSection.toLowerCase());
                return carMatch && grdMatch && secMatch;
            });

            const evaluatedStudents = filtered.map(st => this.evaluateStudentRisk(st)).filter(Boolean);

            let countCritico = 0;
            let countModerado = 0;
            let countSatisfactorio = 0;
            let countSinDatos = 0;
            let totalScores = 0;
            let evaluatedCount = 0;

            const courseFailStats = {};

            evaluatedStudents.forEach(item => {
                if (item.riskLevel === 'CRITICO') countCritico++;
                else if (item.riskLevel === 'MODERADO') countModerado++;
                else if (item.riskLevel === 'SATISFACTORIO') countSatisfactorio++;
                else countSinDatos++;

                if (item.totalEvaluatedSubjects > 0) {
                    totalScores += item.overallAverage;
                    evaluatedCount++;
                }

                item.coursePerformances.forEach(cp => {
                    if (!courseFailStats[cp.subject]) {
                        courseFailStats[cp.subject] = { subject: cp.subject, totalStudents: 0, failedStudents: 0, sumAvg: 0 };
                    }
                    courseFailStats[cp.subject].totalStudents++;
                    courseFailStats[cp.subject].sumAvg += cp.average;
                    if (cp.isFailed) {
                        courseFailStats[cp.subject].failedStudents++;
                    }
                });
            });

            // Ranking de asignaturas con mayor índice de reprobación
            const courseRanking = Object.values(courseFailStats).map(c => {
                const failRate = c.totalStudents > 0 ? Math.round((c.failedStudents / c.totalStudents) * 100) : 0;
                const avgScore = c.totalStudents > 0 ? Math.round(c.sumAvg / c.totalStudents) : 0;
                return {
                    subject: c.subject,
                    totalStudents: c.totalStudents,
                    failedStudents: c.failedStudents,
                    failRate,
                    avgScore
                };
            }).sort((a, b) => b.failRate - a.failRate);

            const globalAverage = evaluatedCount > 0 ? Math.round(totalScores / evaluatedCount) : 0;
            const totalStudentsCount = filtered.length;
            const approvalRate = evaluatedCount > 0 
                ? Math.round((countSatisfactorio / evaluatedCount) * 100) 
                : 0;

            return {
                totalStudentsCount,
                evaluatedCount,
                countCritico,
                countModerado,
                countSatisfactorio,
                countSinDatos,
                globalAverage,
                approvalRate,
                courseRanking,
                studentsList: evaluatedStudents.sort((a, b) => {
                    const weight = { 'CRITICO': 3, 'MODERADO': 2, 'SATISFACTORIO': 1, 'SIN_DATOS': 0 };
                    return (weight[b.riskLevel] - weight[a.riskLevel]) || (b.failedSubjectsCount - a.failedSubjectsCount);
                })
            };
        }
    };

    // 2. RENDERIZADO DE LA INTERFAZ DE ANALÍTICA PREDICTIVA
    function renderPredictiveAnalyticsView() {
        const container = document.getElementById('view-predictive-analytics');
        if (!container) return;

        // Leer filtros actuales
        const carFilter = document.getElementById('analyticsCareerFilter')?.value || 'ALL';
        const grdFilter = document.getElementById('analyticsGradeFilter')?.value || 'ALL';
        const secFilter = document.getElementById('analyticsSectionFilter')?.value || 'ALL';
        const riskTab = document.getElementById('analyticsRiskTabFilter')?.value || 'ALL';
        const searchText = (document.getElementById('analyticsSearchInput')?.value || '').trim().toLowerCase();

        const data = EnccoAnalytics.getAggregatedAnalytics(carFilter, grdFilter, secFilter);

        // Filtrar lista según pestaña y búsqueda
        const displayedStudents = data.studentsList.filter(s => {
            if (riskTab !== 'ALL' && s.riskLevel !== riskTab) return false;
            if (searchText) {
                const matchName = s.studentName.toLowerCase().includes(searchText);
                const matchCarne = s.carne.toLowerCase().includes(searchText);
                const matchCode = s.personalCode.toLowerCase().includes(searchText);
                if (!matchName && !matchCarne && !matchCode) return false;
            }
            return true;
        });

        // Obtener listas de opciones para los filtros
        const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
        const careers = [...new Set(pensum.map(p => p.career).filter(Boolean))];
        const grades = [...new Set(pensum.map(p => p.grade).filter(Boolean))];

        container.innerHTML = `
            <div class="analytics-container" style="padding: 10px 0;">
                
                <!-- ENCABEZADO Y ACCIONES PRINCIPALES -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
                    <div>
                        <h2 style="margin:0; font-size:1.45rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-chart-line" style="color:var(--brand-green);"></i>
                            Tablero de Analítica Predictiva y Detección Temprana
                        </h2>
                        <p style="margin:4px 0 0 0; font-size:0.85rem; color:#64748b;">
                            Monitoreo preventivo del rendimiento académico y semáforo de riesgo escolar para Dirección y Secretaría.
                        </p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="EnccoAnalytics.exportRiskListToExcel()" style="background:#15803d; font-weight:700;">
                            <i class="fa-solid fa-file-excel"></i> Exportar Alumnos en Riesgo (Excel)
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="EnccoAnalytics.printExecutiveRiskReport()" style="font-weight:700;">
                            <i class="fa-solid fa-print"></i> Imprimir Informe Ejecutivo
                        </button>
                    </div>
                </div>

                <!-- TARJETAS KPI DE IMPACTO RÁPIDO -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px; margin-bottom:22px;">
                    <!-- Total Estudiantes -->
                    <div style="background:#ffffff; border-radius:14px; padding:16px 20px; border:1.5px solid #e2e8f0; box-shadow:0 4px 10px rgba(0,0,0,0.03); display:flex; align-items:center; gap:14px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Nómina Evaluada</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.6rem; font-weight:900; color:#0f172a;">${data.evaluatedCount} <small style="font-size:0.8rem; font-weight:600; color:#64748b;">/ ${data.totalStudentsCount}</small></h3>
                        </div>
                    </div>

                    <!-- Alerta Crítica (Rojo) -->
                    <div style="background:#ffffff; border-radius:14px; padding:16px 20px; border:1.5px solid #fecaca; box-shadow:0 4px 10px rgba(220,38,38,0.06); display:flex; align-items:center; gap:14px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#fee2e2; color:#dc2626; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; font-weight:700; color:#dc2626; text-transform:uppercase;">Riesgo Crítico (3+ Rep.)</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.6rem; font-weight:900; color:#dc2626;">${data.countCritico} <small style="font-size:0.78rem; font-weight:700; color:#ef4444;">(${data.evaluatedCount ? Math.round((data.countCritico / data.evaluatedCount) * 100) : 0}%)</small></h3>
                        </div>
                    </div>

                    <!-- Alerta Moderada (Amarillo) -->
                    <div style="background:#ffffff; border-radius:14px; padding:16px 20px; border:1.5px solid #fed7aa; box-shadow:0 4px 10px rgba(217,119,6,0.06); display:flex; align-items:center; gap:14px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#ffedd5; color:#d97706; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; font-weight:700; color:#d97706; text-transform:uppercase;">Riesgo Moderado (1-2 Rep.)</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.6rem; font-weight:900; color:#d97706;">${data.countModerado} <small style="font-size:0.78rem; font-weight:700; color:#f59e0b;">(${data.evaluatedCount ? Math.round((data.countModerado / data.evaluatedCount) * 100) : 0}%)</small></h3>
                        </div>
                    </div>

                    <!-- Rendimiento Satisfactorio (Verde) -->
                    <div style="background:#ffffff; border-radius:14px; padding:16px 20px; border:1.5px solid #bbf7d0; box-shadow:0 4px 10px rgba(22,163,74,0.06); display:flex; align-items:center; gap:14px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; font-weight:700; color:#16a34a; text-transform:uppercase;">Tasa de Aprobación</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.6rem; font-weight:900; color:#16a34a;">${data.approvalRate}% <small style="font-size:0.78rem; font-weight:700; color:#22c55e;">(${data.countSatisfactorio} alumnos)</small></h3>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN GRÁFICA: TOP 5 ASIGNATURAS CON MAYOR DIFICULTAD -->
                <div style="background:#ffffff; border-radius:14px; padding:18px 22px; border:1.5px solid #e2e8f0; margin-bottom:22px; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                        <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-chart-column" style="color:#d97706;"></i>
                            Cursos de Mayor Dificultad Institucional (Índice de Reprobación)
                        </h3>
                        <span style="font-size:0.75rem; color:#64748b; font-weight:600;">
                            Cursos que requieren reforzamiento académico inmediato
                        </span>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
                        ${data.courseRanking.slice(0, 4).map(c => `
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <strong style="font-size:0.85rem; color:#1e293b; max-width:70%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.subject}">${c.subject}</strong>
                                    <span class="badge ${c.failRate >= 30 ? 'badge-danger' : (c.failRate >= 15 ? 'badge-warning' : 'badge-success')}" style="font-size:0.75rem; font-weight:800;">
                                        ${c.failRate}% Reprobados
                                    </span>
                                </div>
                                <div style="background:#e2e8f0; border-radius:6px; height:8px; overflow:hidden; margin-bottom:6px;">
                                    <div style="background:${c.failRate >= 30 ? '#dc2626' : (c.failRate >= 15 ? '#d97706' : '#16a34a')}; width:${Math.min(100, c.failRate)}%; height:100%; border-radius:6px;"></div>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:#64748b;">
                                    <span>${c.failedStudents} de ${c.totalStudents} alumnos pierden</span>
                                    <span>Promedio general: <strong>${c.avgScore} pts</strong></span>
                                </div>
                            </div>
                        `).join('') || '<div style="color:#64748b; font-size:0.82rem; padding:10px;">No hay notas asentadas suficientes para calcular el ranking de materias.</div>'}
                    </div>
                </div>

                <!-- BARRA DE FILTROS Y BÚSQUEDA DINÁMICA -->
                <div style="background:#ffffff; border-radius:12px; padding:14px 18px; border:1.5px solid #e2e8f0; margin-bottom:16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
                    <div style="flex:1; min-width:200px;">
                        <input type="text" id="analyticsSearchInput" class="form-control" placeholder="Buscar por nombre, carné o código personal..." value="${searchText}" oninput="EnccoAnalytics.triggerRefresh()" style="font-size:0.85rem;">
                    </div>
                    <div style="min-width:140px;">
                        <select id="analyticsCareerFilter" class="form-control" onchange="EnccoAnalytics.triggerRefresh()" style="font-size:0.85rem; font-weight:600;">
                            <option value="ALL">-- Todas las Carreras --</option>
                            ${careers.map(c => `<option value="${c}" ${carFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div style="min-width:130px;">
                        <select id="analyticsGradeFilter" class="form-control" onchange="EnccoAnalytics.triggerRefresh()" style="font-size:0.85rem; font-weight:600;">
                            <option value="ALL">-- Todos los Grados --</option>
                            ${grades.map(g => `<option value="${g}" ${grdFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
                        </select>
                    </div>
                    <div style="min-width:130px;">
                        <select id="analyticsRiskTabFilter" class="form-control" onchange="EnccoAnalytics.triggerRefresh()" style="font-size:0.85rem; font-weight:700; color:#0f172a;">
                            <option value="ALL" ${riskTab === 'ALL' ? 'selected' : ''}>Todos los Niveles</option>
                            <option value="CRITICO" ${riskTab === 'CRITICO' ? 'selected' : ''}>🔴 Solo Riesgo Crítico (${data.countCritico})</option>
                            <option value="MODERADO" ${riskTab === 'MODERADO' ? 'selected' : ''}>🟡 Solo Riesgo Moderado (${data.countModerado})</option>
                            <option value="SATISFACTORIO" ${riskTab === 'SATISFACTORIO' ? 'selected' : ''}>🟢 Rendimiento Satisfactorio (${data.countSatisfactorio})</option>
                        </select>
                    </div>
                </div>

                <!-- TABLA NOMINAL DETALLADA DE ESTUDIANTES -->
                <div class="table-responsive" style="background:#ffffff; border-radius:12px; border:1.5px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
                    <table class="custom-table" style="margin:0; font-size:0.82rem;">
                        <thead>
                            <tr style="background:#0f172a; color:#ffffff;">
                                <th style="width:45px; text-align:center;">No.</th>
                                <th style="width:90px;">Carné</th>
                                <th style="text-align:left;">Estudiante</th>
                                <th style="text-align:left;">Grado & Sección</th>
                                <th style="width:75px; text-align:center;">Promedio</th>
                                <th style="text-align:left;">Materias Reprobadas (&lt; 60)</th>
                                <th style="width:130px; text-align:center;">Nivel de Riesgo</th>
                                <th style="width:110px; text-align:center;">Acción Preventiva</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayedStudents.length === 0 ? `
                                <tr>
                                    <td colspan="8" style="text-align:center; padding:30px; color:#64748b;">
                                        <i class="fa-solid fa-user-check" style="font-size:2rem; color:#16a34a; display:block; margin-bottom:8px;"></i>
                                        No se encontraron estudiantes que coincidan con los filtros seleccionados.
                                    </td>
                                </tr>
                            ` : displayedStudents.map((st, idx) => {
                                const badgeClass = st.riskLevel === 'CRITICO' 
                                    ? 'background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;' 
                                    : (st.riskLevel === 'MODERADO' 
                                        ? 'background:#ffedd5; color:#d97706; border:1px solid #fdba74;' 
                                        : 'background:#dcfce7; color:#16a34a; border:1px solid #86efac;');
                                
                                const badgeLabel = st.riskLevel === 'CRITICO' 
                                    ? '🔴 CRÍTICO' 
                                    : (st.riskLevel === 'MODERADO' ? '🟡 MODERADO' : '🟢 SATISFACTORIO');

                                return `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="text-align:center; font-weight:700; color:#64748b;">${idx + 1}</td>
                                        <td style="font-weight:700; color:#1e293b;">${st.carne}</td>
                                        <td>
                                            <strong style="color:#0f172a; display:block;">${st.studentName}</strong>
                                            <small style="color:#64748b;">Código: ${st.personalCode || 'S/N'}</small>
                                        </td>
                                        <td>
                                            <span style="font-weight:600; color:#334155;">${st.grade} "${st.section}"</span>
                                            <small style="display:block; color:#64748b;">${st.career || ''}</small>
                                        </td>
                                        <td style="text-align:center;">
                                            <strong style="font-size:0.95rem; color:${st.overallAverage >= 60 ? '#16a34a' : '#dc2626'};">
                                                ${st.overallAverage}
                                            </strong>
                                        </td>
                                        <td>
                                            ${st.failedSubjectsList.length === 0 ? `
                                                <span style="color:#16a34a; font-weight:600;"><i class="fa-solid fa-check"></i> Ninguna reprobada</span>
                                            ` : `
                                                <div style="display:flex; flex-wrap:wrap; gap:4px;">
                                                    ${st.failedSubjectsList.map(f => `
                                                        <span style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.72rem; font-weight:700;">
                                                            ${f.subject}: ${f.average} pts
                                                        </span>
                                                    `).join('')}
                                                </div>
                                            `}
                                        </td>
                                        <td style="text-align:center;">
                                            <span style="display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:800; ${badgeClass}">
                                                ${badgeLabel}
                                            </span>
                                        </td>
                                        <td style="text-align:center;">
                                            <button type="button" class="btn btn-xs btn-outline-danger" onclick="EnccoAnalytics.openParentCitationModal('${st.studentId}')" title="Generar Citación a Padres de Familia" style="padding:4px 8px; font-weight:700;">
                                                <i class="fa-solid fa-envelope-open-text"></i> Citación
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

            </div>
        `;
    }

    // 3. GENERADOR DE CITACIONES A PADRES DE FAMILIA
    EnccoAnalytics.openParentCitationModal = function(studentId) {
        const student = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === studentId) : null;
        if (!student) {
            alert('Estudiante no encontrado.');
            return;
        }

        const risk = EnccoAnalytics.evaluateStudentRisk(student);
        const modalHtml = `
            <div id="parentCitationModalOverlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
                <div style="background:#ffffff; width:92%; max-width:680px; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.4); animation:popIn 0.25s ease;">
                    <div style="background:linear-gradient(135deg, #1e293b, #0f172a); color:#ffffff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:1.1rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-envelope-open-text" style="color:#f59e0b;"></i>
                            Citación Oficial a Padres de Familia
                        </h3>
                        <button type="button" onclick="document.getElementById('parentCitationModalOverlay').remove()" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:20px; max-height:75vh; overflow-y:auto;" id="citationPrintableArea">
                        <div style="text-align:center; margin-bottom:16px; border-bottom:2px solid #e2e8f0; padding-bottom:12px;">
                            <h4 style="margin:0; font-size:0.95rem; text-transform:uppercase; color:#0f172a; font-weight:800;">Escuela Nacional de Ciencias Comerciales</h4>
                            <p style="margin:2px 0; font-size:0.8rem; color:#64748b;">Jutiapa, Guatemala | Ciclo Lectivo ${risk.academicCycle}</p>
                            <span style="display:inline-block; margin-top:4px; font-size:0.75rem; background:#fee2e2; color:#dc2626; padding:2px 10px; border-radius:12px; font-weight:800;">
                                NOTIFICACIÓN DE RENDIMIENTO ACADÉMICO Y ALERTA PREVENTIVA
                            </span>
                        </div>

                        <p style="font-size:0.86rem; line-height:1.6; color:#334155;">
                            Por medio de la presente, la Dirección y Claustro de Catedráticos de la <strong>ENCCO Jutiapa</strong> se dirigen a los padres de familia o encargados del estudiante:
                        </p>

                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; margin-bottom:14px; font-size:0.85rem;">
                            <strong>Alumno(a):</strong> ${risk.studentName}<br>
                            <strong>Carné / Código:</strong> ${risk.carne} | ${risk.personalCode}<br>
                            <strong>Grado y Sección:</strong> ${risk.grade} "${risk.section}" - ${risk.career}<br>
                            <strong>Promedio General Ponderado:</strong> <span style="color:${risk.overallAverage >= 60 ? '#16a34a' : '#dc2626'}; font-weight:800;">${risk.overallAverage} pts</span><br>
                            <strong>Materias en Riesgo:</strong> ${risk.failedSubjectsList.length > 0 ? risk.failedSubjectsList.map(f => `${f.subject} (${f.average} pts)`).join(', ') : 'Ninguna'}<br>
                            <strong>Inasistencias Registradas:</strong> ${risk.unexcusedAbsences}
                        </div>

                        <p style="font-size:0.86rem; line-height:1.6; color:#334155;">
                            Se solicita su presencia de carácter <strong>Urgente e Indispensable</strong> en las instalaciones del plantel para coordinar acciones conjuntas de reforzamiento académico y evitar la pérdida del ciclo escolar.
                        </p>

                        <div style="display:flex; justify-content:space-around; margin-top:40px; text-align:center;">
                            <div style="border-top:1px solid #0f172a; width:220px; padding-top:4px; font-size:0.78rem; font-weight:700;">
                                Catedrático / Maestro Guía
                            </div>
                            <div style="border-top:1px solid #0f172a; width:220px; padding-top:4px; font-size:0.78rem; font-weight:700;">
                                Dirección ENCCO Jutiapa
                            </div>
                        </div>
                    </div>
                    <div style="background:#f8fafc; padding:14px 20px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('parentCitationModalOverlay').remove()">Cerrar</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="EnccoAnalytics.printCitationElement()" style="background:#2563eb; font-weight:700;">
                            <i class="fa-solid fa-print"></i> Imprimir Citación Oficial
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    EnccoAnalytics.printCitationElement = function() {
        const area = document.getElementById('citationPrintableArea');
        if (!area) return;
        const printWin = window.open('', '_blank', 'width=800,height=600');
        printWin.document.write(`
            <html>
                <head>
                    <title>Citación Oficial ENCCO Jutiapa</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; }
                        strong { color: #000; }
                    </style>
                </head>
                <body>
                    ${area.innerHTML}
                    <script>
                        window.onload = function() { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    };

    EnccoAnalytics.exportRiskListToExcel = function() {
        if (typeof XLSX === 'undefined') {
            alert('Librería de exportación no cargada.');
            return;
        }
        const data = EnccoAnalytics.getAggregatedAnalytics();
        const exportRows = data.studentsList.map((st, i) => ({
            'No.': i + 1,
            'Carné': st.carne,
            'Código Personal': st.personalCode,
            'Estudiante': st.studentName,
            'Grado': st.grade,
            'Sección': st.section,
            'Carrera': st.career,
            'Promedio Ponderado': st.overallAverage,
            'Cantidad Materias Reprobadas': st.failedSubjectsCount,
            'Materias Reprobadas': st.failedSubjectsList.map(f => `${f.subject} (${f.average})`).join(', '),
            'Inasistencias': st.unexcusedAbsences,
            'Nivel de Riesgo': st.riskLevel,
            'Dictamen Preventivo': st.riskReason
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Riesgo Escolar ENCCO');
        XLSX.writeFile(wb, `Alerta_Riesgo_Escolar_ENCCO_${Date.now()}.xlsx`);
    };

    EnccoAnalytics.printExecutiveRiskReport = function() {
        const data = EnccoAnalytics.getAggregatedAnalytics();
        const printWin = window.open('', '_blank', 'width=950,height=750');
        printWin.document.write(`
            <html>
                <head>
                    <title>Informe Ejecutivo de Riesgo y Deserción - ENCCO</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
                        h2, h3, h4 { margin: 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                        th { background: #0f172a; color: #fff; }
                        .badge-crit { color: #dc2626; font-weight: bold; }
                        .badge-mod { color: #d97706; font-weight: bold; }
                        .badge-sat { color: #16a34a; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div style="text-align:center; border-bottom: 2px solid #15803d; padding-bottom: 10px; margin-bottom: 15px;">
                        <h2 style="color: #15803d;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</h2>
                        <h4>ENCCO JUTIAPA - FUNDADA EN 1970</h4>
                        <p style="font-size: 12px; margin: 4px 0;">INFORME EJECUTIVO DE DETECCIÓN TEMPRANA Y RIESGO DE DESERCIÓN ESCOLAR</p>
                        <small>Generado: ${new Date().toLocaleDateString('es-GT')} | Ciclo Lectivo: ${(window.STATE && window.STATE.activeCycle) || '2026'}</small>
                    </div>

                    <div style="display:flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px;">
                        <div><strong>Total Estudiantes Evaluados:</strong> ${data.evaluatedCount}</div>
                        <div><strong style="color:#dc2626;">Alumnos en Riesgo Crítico:</strong> ${data.countCritico}</div>
                        <div><strong style="color:#d97706;">Alumnos en Riesgo Moderado:</strong> ${data.countModerado}</div>
                        <div><strong style="color:#16a34a;">Tasa de Aprobación:</strong> ${data.approvalRate}%</div>
                    </div>

                    <h3>Listado Prioritario de Estudiantes en Alerta</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Carné</th>
                                <th>Estudiante</th>
                                <th>Grado & Sección</th>
                                <th>Promedio</th>
                                <th>Materias Reprobadas (&lt; 60 pts)</th>
                                <th>Riesgo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.studentsList.slice(0, 100).map((s, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${s.carne}</td>
                                    <td><strong>${s.studentName}</strong></td>
                                    <td>${s.grade} "${s.section}"</td>
                                    <td><strong>${s.overallAverage}</strong></td>
                                    <td>${s.failedSubjectsList.map(f => `${f.subject}: ${f.average}`).join(', ') || 'Ninguna'}</td>
                                    <td class="${s.riskLevel === 'CRITICO' ? 'badge-crit' : (s.riskLevel === 'MODERADO' ? 'badge-mod' : 'badge-sat')}">${s.riskLevel}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    };

    EnccoAnalytics.triggerRefresh = function() {
        renderPredictiveAnalyticsView();
    };

    window.EnccoAnalytics = EnccoAnalytics;
    window.renderPredictiveAnalyticsView = renderPredictiveAnalyticsView;

})(typeof window !== 'undefined' ? window : global);
