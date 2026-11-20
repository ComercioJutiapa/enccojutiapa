/**
 * ============================================================================
 * ENCCO JUTIAPA 1970 — ANALÍTICA VISUAL POR BIMESTRE Y REPORTES PARA DOCENTES
 * ============================================================================
 * Gráficas dinámicas por bimestre (B1-B4) y análisis claro por:
 *   1) Evolución por Bimestre y Acciones de Mejora Escolar
 *   2) Hombres y Mujeres (Género)
 *   3) Grado y Sección
 *   4) Docentes (con Reporte Individual imprimible para cada catedrático)
 *   5) Cátedras / Materias
 * Cumple los 5 pilares ENCCO: Coherente (Azul Institucional / Oficio 8.5"x13"),
 * Dinámico (multiciclo 2026/2027/2028+), Responsivo (escritorio/tablet/móvil),
 * 100% Funcional y Cero pérdida de datos.
 */
(function (window, document) {
    'use strict';

    const HUB_STATE = {
        bimestre: 'ALL', // 'ALL' | '1' | '2' | '3' | '4'
        activeTab: 'bimesters' // 'bimesters' | 'gender' | 'sections' | 'teachers' | 'subjects'
    };

    function _esc(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getAnalyticsActiveCycle() {
        const st = window.STATE || {};
        return String(st.historicalViewingCycle || st.viewingHistoricalCycle || st.activeCycle || '2026').trim();
    }

    function _getCycleStudents() {
        const cycle = getAnalyticsActiveCycle();
        let list = [];
        if (typeof window.getStudentsForCycle === 'function') {
            try {
                const res = window.getStudentsForCycle(cycle);
                if (Array.isArray(res)) list = res.slice();
            } catch (e) {}
        }
        if (list.length === 0) {
            const all = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            list = all.filter(s => s && String(s.cycle || s.academicCycle || '2026').trim() === cycle);
        }
        return list.filter(s => {
            if (!s) return false;
            const st = String(s.status || '').toLowerCase();
            if (st === 'egresado' || st === 'retirado' || st === 'inactivo') return false;
            if (String(s.gradeCode || '').toUpperCase() === 'EGRESADO') return false;
            return true;
        });
    }

    function _isFemale(student) {
        const g = String(student?.gender || student?.sex || student?.sexo || '').trim().toLowerCase();
        return g.startsWith('f') || g.includes('mujer') || g.includes('femen');
    }

    function _extractSubjectBimesterScores(val) {
        const out = [null, null, null, null];
        if (Array.isArray(val)) {
            for (let i = 0; i < 4; i++) {
                const n = Number(val[i]);
                if (val[i] !== null && val[i] !== undefined && val[i] !== '' && !isNaN(n) && n > 0) out[i] = n;
            }
        } else if (val && typeof val === 'object') {
            ['b1', 'b2', 'b3', 'b4'].forEach((k, i) => {
                const n = Number(val[k]);
                if (val[k] !== null && val[k] !== undefined && val[k] !== '' && !isNaN(n) && n > 0) out[i] = n;
            });
        }
        return out;
    }

    function _resolveTeacherForSubjectAndGrade(subjectName, gradeStr, sectionStr) {
        const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
        const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        const subjN = norm(subjectName);
        const grdNum = (String(gradeStr || '').match(/[456]/) || [''])[0];
        const secClean = String(sectionStr || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase().slice(0, 1);

        // 1. Coincidencia exacta por materia + grado + sección
        let match = pensum.find(p => {
            if (!p) return false;
            const pSubj = norm(p.subject || p.name);
            if (pSubj !== subjN) return false;
            const pGrd = String(p.grade || p.gradeCode || '');
            const pSec = String(p.section || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase().slice(0, 1);
            return (!grdNum || pGrd.includes(grdNum)) && (!secClean || !pSec || pSec === secClean);
        });
        // 2. Fallback por materia + grado
        if (!match) {
            match = pensum.find(p => p && norm(p.subject || p.name) === subjN && (!grdNum || String(p.grade || p.gradeCode || '').includes(grdNum)));
        }
        // 3. Fallback por materia
        if (!match) {
            match = pensum.find(p => p && norm(p.subject || p.name) === subjN);
        }
        if (match) {
            const tName = String(match.teacher || match.teacherName || '').trim();
            if (tName && !/sin asignar|por asignar/i.test(tName)) return tName;
            if (match.teacherId && window.STATE && Array.isArray(window.STATE.users)) {
                const u = window.STATE.users.find(x => x && String(x.id) === String(match.teacherId));
                if (u && u.name) return u.name;
            }
        }
        return 'Sin Docente Asignado';
    }

    /**
     * Calcula analítica completa por Bimestre, Género (H/M), Grado/Sección, Docentes y Cátedras.
     */
    function computeBimesterAnalytics(bimFilterOverride) {
        const cycle = getAnalyticsActiveCycle();
        const bimFilter = String(bimFilterOverride || HUB_STATE.bimestre || 'ALL');
        const bimIdxTarget = ['1', '2', '3', '4'].includes(bimFilter) ? (parseInt(bimFilter, 10) - 1) : -1;
        const students = _getCycleStudents();

        const bimesters = [1, 2, 3, 4].map(b => ({
            bNum: b, label: `${b}º Bimestre`, shortLabel: `B${b}`,
            sum: 0, count: 0, passed: 0, failed: 0,
            maleSum: 0, maleCount: 0, malePassed: 0,
            femaleSum: 0, femaleCount: 0, femalePassed: 0
        }));

        const gender = {
            male: { label: 'Hombres', totalStudents: 0, evaluatedStudents: 0, atRisk: 0, sum: 0, count: 0, passed: 0, failed: 0, attSum: 0, attCount: 0 },
            female: { label: 'Mujeres', totalStudents: 0, evaluatedStudents: 0, atRisk: 0, sum: 0, count: 0, passed: 0, failed: 0, attSum: 0, attCount: 0 }
        };

        const sectionsMap = new Map();
        const teachersMap = new Map();
        const subjectsMap = new Map();
        let becadosAtRisk = 0;

        students.forEach(s => {
            const isF = _isFemale(s);
            const gBucket = isF ? gender.female : gender.male;
            gBucket.totalStudents++;

            const cleanSec = String(s.section || 'A').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase() || 'A';
            const gradeBase = String(s.grade || s.gradeCode || 'Sin Grado').trim();
            const secKey = `${gradeBase} (${cleanSec})`;

            if (!sectionsMap.has(secKey)) {
                sectionsMap.set(secKey, {
                    key: secKey, grade: gradeBase, section: cleanSec,
                    total: 0, male: 0, female: 0,
                    sum: 0, count: 0, passed: 0, failed: 0,
                    atRisk: 0, maleSum: 0, maleCount: 0, femaleSum: 0, femaleCount: 0,
                    riskStudents: []
                });
            }
            const secObj = sectionsMap.get(secKey);
            secObj.total++;
            if (isF) secObj.female++; else secObj.male++;

            // Asistencia a la fecha (si existe)
            const attObj = (typeof window.getStudentAttendancePercentageToDate === 'function')
                ? window.getStudentAttendancePercentageToDate(s.id, cycle)
                : null;
            if (attObj && attObj.percentage !== null && typeof attObj.percentage !== 'undefined') {
                gBucket.attSum += Number(attObj.percentage);
                gBucket.attCount++;
                const hasSch = typeof window.getStudentScholarshipForCycle === 'function' && window.getStudentScholarshipForCycle(s, cycle);
                if (hasSch && Number(attObj.percentage) < 85) becadosAtRisk++;
            }

            const gradesObj = (s.grades && typeof s.grades === 'object') ? s.grades : {};
            let stuSum = 0;
            let stuSubjCount = 0;
            let stuFailedSubj = 0;

            Object.entries(gradesObj).forEach(([subjName, rawScores]) => {
                const scores = _extractSubjectBimesterScores(rawScores);

                // Acumular evolución de los 4 bimestres
                scores.forEach((sc, bIdx) => {
                    if (sc === null) return;
                    const bm = bimesters[bIdx];
                    bm.sum += sc; bm.count++;
                    if (sc >= 60) bm.passed++; else bm.failed++;
                    if (isF) {
                        bm.femaleSum += sc; bm.femaleCount++;
                        if (sc >= 60) bm.femalePassed++;
                    } else {
                        bm.maleSum += sc; bm.maleCount++;
                        if (sc >= 60) bm.malePassed++;
                    }
                });

                // Nota efectiva según filtro de bimestre (o promedio de bimestres disponibles)
                let effScore = null;
                if (bimIdxTarget >= 0) {
                    effScore = scores[bimIdxTarget];
                } else {
                    const valid = scores.filter(v => v !== null);
                    if (valid.length > 0) effScore = valid.reduce((a, b) => a + b, 0) / valid.length;
                }
                if (effScore === null) return;

                stuSum += effScore;
                stuSubjCount++;
                if (effScore < 60) stuFailedSubj++;

                // Acumular por género y sección
                gBucket.sum += effScore; gBucket.count++;
                if (effScore >= 60) gBucket.passed++; else gBucket.failed++;

                secObj.sum += effScore; secObj.count++;
                if (effScore >= 60) secObj.passed++; else secObj.failed++;
                if (isF) { secObj.femaleSum += effScore; secObj.femaleCount++; }
                else { secObj.maleSum += effScore; secObj.maleCount++; }

                // Acumular por Cátedra
                if (!subjectsMap.has(subjName)) {
                    subjectsMap.set(subjName, {
                        subject: subjName, teachers: new Set(),
                        sum: 0, count: 0, passed: 0, failed: 0,
                        maleSum: 0, maleCount: 0, femaleSum: 0, femaleCount: 0
                    });
                }
                const subObj = subjectsMap.get(subjName);
                const teacherName = _resolveTeacherForSubjectAndGrade(subjName, gradeBase, cleanSec);
                subObj.teachers.add(teacherName);
                subObj.sum += effScore; subObj.count++;
                if (effScore >= 60) subObj.passed++; else subObj.failed++;
                if (isF) { subObj.femaleSum += effScore; subObj.femaleCount++; }
                else { subObj.maleSum += effScore; subObj.maleCount++; }

                // Acumular por Docente
                if (!teachersMap.has(teacherName)) {
                    teachersMap.set(teacherName, {
                        teacher: teacherName, subjects: new Set(), sections: new Set(),
                        sum: 0, count: 0, passed: 0, failed: 0,
                        maleCount: 0, malePassed: 0, femaleCount: 0, femalePassed: 0,
                        failingStudents: []
                    });
                }
                const tObj = teachersMap.get(teacherName);
                tObj.subjects.add(subjName);
                tObj.sections.add(secKey);
                tObj.sum += effScore; tObj.count++;
                if (effScore >= 60) tObj.passed++; else {
                    tObj.failed++;
                    tObj.failingStudents.push({
                        name: typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(s, 'lastFirst').toUpperCase() : (s.name || ''),
                        section: secKey,
                        subject: subjName,
                        score: Math.round(effScore * 10) / 10
                    });
                }
                if (isF) { tObj.femaleCount++; if (effScore >= 60) tObj.femalePassed++; }
                else { tObj.maleCount++; if (effScore >= 60) tObj.malePassed++; }
            });

            if (stuSubjCount > 0) {
                gBucket.evaluatedStudents++;
                const stuAvg = Math.round((stuSum / stuSubjCount) * 10) / 10;
                if (stuFailedSubj >= 2 || stuAvg < 60) {
                    gBucket.atRisk++;
                    secObj.atRisk++;
                    const attPctVal = (attObj && attObj.percentage !== null && typeof attObj.percentage !== 'undefined') ? `${attObj.percentage}%` : 'S/R';
                    const hasSch = typeof window.getStudentScholarshipForCycle === 'function' && !!window.getStudentScholarshipForCycle(s, cycle);
                    secObj.riskStudents.push({
                        name: typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(s, 'lastFirst').toUpperCase() : (s.name || ''),
                        gender: isF ? 'F' : 'M',
                        avg: stuAvg,
                        failedCount: stuFailedSubj,
                        attPct: attPctVal,
                        isBecado: hasSch
                    });
                }
            }
        });

        const finalizeRate = (p, c) => c > 0 ? Math.round((p / c) * 100) : 0;
        const finalizeAvg = (s, c) => c > 0 ? Math.round((s / c) * 10) / 10 : 0;

        bimesters.forEach(b => {
            b.avg = finalizeAvg(b.sum, b.count);
            b.passRate = finalizeRate(b.passed, b.count);
            b.failRate = b.count > 0 ? (100 - b.passRate) : 0;
            b.maleAvg = finalizeAvg(b.maleSum, b.maleCount);
            b.femaleAvg = finalizeAvg(b.femaleSum, b.femaleCount);
            b.malePassRate = finalizeRate(b.malePassed, b.maleCount);
            b.femalePassRate = finalizeRate(b.femalePassed, b.femaleCount);
        });

        ['male', 'female'].forEach(k => {
            const g = gender[k];
            g.avg = finalizeAvg(g.sum, g.count);
            g.passRate = finalizeRate(g.passed, g.count);
            g.attAvg = g.attCount > 0 ? Math.round((g.attSum / g.attCount) * 10) / 10 : null;
        });

        const sections = Array.from(sectionsMap.values()).map(sec => ({
            ...sec,
            avg: finalizeAvg(sec.sum, sec.count),
            passRate: finalizeRate(sec.passed, sec.count),
            maleAvg: finalizeAvg(sec.maleSum, sec.maleCount),
            femaleAvg: finalizeAvg(sec.femaleSum, sec.femaleCount)
        })).sort((a, b) => a.key.localeCompare(b.key, 'es', { numeric: true }));

        const teachers = Array.from(teachersMap.values()).map(t => ({
            ...t,
            subjectsList: Array.from(t.subjects),
            sectionsList: Array.from(t.sections),
            avg: finalizeAvg(t.sum, t.count),
            passRate: finalizeRate(t.passed, t.count),
            malePassRate: finalizeRate(t.malePassed, t.maleCount),
            femalePassRate: finalizeRate(t.femalePassed, t.femaleCount)
        })).sort((a, b) => a.passRate - b.passRate || a.teacher.localeCompare(b.teacher, 'es'));

        const subjects = Array.from(subjectsMap.values()).map(sb => ({
            ...sb,
            teachersList: Array.from(sb.teachers),
            avg: finalizeAvg(sb.sum, sb.count),
            passRate: finalizeRate(sb.passed, sb.count),
            failRate: sb.count > 0 ? (100 - finalizeRate(sb.passed, sb.count)) : 0,
            maleAvg: finalizeAvg(sb.maleSum, sb.maleCount),
            femaleAvg: finalizeAvg(sb.femaleSum, sb.femaleCount)
        })).sort((a, b) => b.failRate - a.failRate || a.subject.localeCompare(b.subject, 'es'));

        // Generar recomendaciones automáticas accionables para mejora escolar
        const recommendations = [];
        const criticalSubjects = subjects.filter(s => s.count > 0 && s.failRate >= 25).slice(0, 3);
        if (criticalSubjects.length > 0) {
            recommendations.push(`📚 Reforzar metodologías y tutorías en las cátedras con mayor reprobación: ${criticalSubjects.map(s => `${s.subject} (${s.failRate}% reprob.)`).join(', ')}.`);
        }
        const criticalSections = sections.filter(s => s.count > 0 && s.atRisk > 0).sort((a, b) => b.atRisk - a.atRisk).slice(0, 2);
        if (criticalSections.length > 0) {
            recommendations.push(`🏫 Acompañamiento prioritario de Maestros Guía en ${criticalSections.map(s => `${s.key} (${s.atRisk} en riesgo)`).join(' y ')}.`);
        }
        if (gender.male.count > 0 && gender.female.count > 0) {
            const diff = Math.abs(gender.male.avg - gender.female.avg);
            if (diff >= 3) {
                const lower = gender.male.avg < gender.female.avg ? 'Hombres' : 'Mujeres';
                recommendations.push(`👦👧 Brecha de rendimiento detectada (${diff.toFixed(1)} pts): enfocar seguimiento motivacional en ${lower}.`);
            } else {
                recommendations.push(`👦👧 Equidad académica equilibrada entre Hombres (${gender.male.avg} pts) y Mujeres (${gender.female.avg} pts).`);
            }
        }
        if (becadosAtRisk > 0) {
            recommendations.push(`🎓 Atención urgente: ${becadosAtRisk} estudiante(s) con Beca/Bolsa de Estudio presentan asistencia menor al 85%.`);
        }
        if (recommendations.length === 0) {
            recommendations.push(`✅ Sin alertas críticas registradas para el periodo seleccionado. Continuar seguimiento preventivo bimestral.`);
        }

        const totalEvaluatedGrades = gender.male.count + gender.female.count;
        const overallAvg = finalizeAvg(gender.male.sum + gender.female.sum, totalEvaluatedGrades);
        const overallPassRate = finalizeRate(gender.male.passed + gender.female.passed, totalEvaluatedGrades);

        return {
            cycle,
            bimFilter,
            bimLabel: bimFilter === 'ALL' ? 'Consolidado Anual (B1–B4)' : `${bimFilter}º Bimestre`,
            totalStudents: students.length,
            overallAvg,
            overallPassRate,
            bimesters,
            gender,
            sections,
            teachers,
            subjects,
            recommendations
        };
    }

    function injectBimesterAnalyticsStyles() {
        if (typeof document === 'undefined' || !document.head) return;
        if (document.getElementById('encco-bimester-analytics-styles')) return;
        const style = document.createElement('style');
        style.id = 'encco-bimester-analytics-styles';
        style.textContent = `
            .ab-shell {
                width: 100%; max-width: 100%; box-sizing: border-box;
                background: #ffffff; border: 1.5px solid #bae6fd; border-radius: 14px;
                overflow: hidden; margin-bottom: 20px;
                box-shadow: 0 4px 14px rgba(3, 105, 161, 0.08);
            }
            .ab-header {
                background: linear-gradient(135deg, #0f2b5c 0%, #0369a1 65%, #0284c7 100%);
                color: #ffffff; padding: 14px 16px;
                display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
            }
            .ab-header-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
            .ab-header-controls select, .ab-header-controls button { min-height: 36px; border-radius: 7px; font-weight: 800; font-size: 0.79rem; }
            .ab-tabs {
                display: flex; gap: 6px; padding: 10px 14px; background: #f0f9ff;
                border-bottom: 1px solid #bae6fd; overflow-x: auto; -webkit-overflow-scrolling: touch;
            }
            .ab-tab-btn {
                flex: 0 0 auto; padding: 7px 13px; border-radius: 20px; font-size: 0.79rem; font-weight: 800;
                border: 1px solid #cbd5e1; background: #ffffff; color: #334155; cursor: pointer;
                display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
            }
            .ab-tab-btn.active { background: #0369a1; color: #ffffff; border-color: #0f2b5c; }
            .ab-body { padding: 14px 16px; }
            .ab-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .ab-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
            .ab-chart-box {
                background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;
            }
            .ab-table-wrap { width: 100%; overflow-x: hidden; max-height: 55vh; overflow-y: auto; }
            .ab-table { width: 100% !important; min-width: 0 !important; table-layout: fixed; border-collapse: collapse; font-size: 0.78rem; }
            .ab-table thead { position: sticky; top: 0; z-index: 2; }
            .ab-table thead th {
                background: #0369a1 !important; color: #ffffff !important; font-size: 0.7rem !important;
                font-weight: 800 !important; padding: 7px 5px !important; border-bottom: 2px solid #0f2b5c !important;
            }
            .ab-table tbody td { padding: 6px 5px !important; border-bottom: 1px solid #e2e8f0; word-break: break-word; overflow-wrap: anywhere; }
            .ab-bar-track { width: 100%; height: 10px; background: #e2e8f0; border-radius: 6px; overflow: hidden; }
            .ab-bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
            .ab-cards { display: none; flex-direction: column; gap: 10px; }
            .ab-card { border: 1px solid #cbd5e1; border-left: 4px solid #0369a1; border-radius: 10px; padding: 10px 12px; background: #ffffff; }

            @media (max-width: 1024px) {
                .ab-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .ab-grid-2 { grid-template-columns: 1fr; }
            }
            @media (max-width: 900px) {
                .ab-header-controls { width: 100%; }
                .ab-header-controls select, .ab-header-controls button { flex: 1 1 auto; justify-content: center; }
                .ab-table-wrap { display: none; }
                .ab-cards { display: flex; }
            }
        `;
        document.head.appendChild(style);
    }

    function _buildBimesterSvgChart(bimesters) {
        const w = 520, h = 190, padL = 36, padB = 28, padT = 18;
        const chartH = h - padT - padB;
        const groupW = (w - padL - 16) / 4;

        let barsSvg = '';
        [0, 25, 50, 75, 100].forEach(val => {
            const y = padT + chartH - (val / 100) * chartH;
            barsSvg += `<line x1="${padL}" y1="${y}" x2="${w - 10}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
            barsSvg += `<text x="${padL - 5}" y="${y + 3}" text-anchor="end" font-size="9" fill="#64748b">${val}</text>`;
        });

        bimesters.forEach((b, i) => {
            const gx = padL + i * groupW + 14;
            const avgH = (b.avg / 100) * chartH;
            const passH = (b.passRate / 100) * chartH;
            const avgY = padT + chartH - avgH;
            const passY = padT + chartH - passH;

            barsSvg += `
                <rect x="${gx}" y="${avgY}" width="26" height="${avgH}" rx="4" fill="#0369a1"/>
                <text x="${gx + 13}" y="${Math.max(12, avgY - 4)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0f2b5c">${b.count ? b.avg : '—'}</text>
                <rect x="${gx + 30}" y="${passY}" width="26" height="${passH}" rx="4" fill="#16a34a"/>
                <text x="${gx + 43}" y="${Math.max(12, passY - 4)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#15803d">${b.count ? b.passRate + '%' : '—'}</text>
                <text x="${gx + 28}" y="${h - 8}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f2b5c">${b.shortLabel}</text>
            `;
        });

        return `
            <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; max-height:220px; display:block;" role="img" aria-label="Gráfica de Evolución por Bimestre">
                ${barsSvg}
            </svg>
            <div style="display:flex; justify-content:center; gap:16px; font-size:0.75rem; font-weight:700; color:#334155; margin-top:4px;">
                <span><span style="display:inline-block; width:10px; height:10px; background:#0369a1; border-radius:2px; margin-right:4px;"></span>Promedio General (pts)</span>
                <span><span style="display:inline-block; width:10px; height:10px; background:#16a34a; border-radius:2px; margin-right:4px;"></span>% Aprobación (≥ 60 pts)</span>
            </div>
        `;
    }

    function _buildGenderBimesterSvgChart(bimesters) {
        const w = 520, h = 190, padL = 36, padB = 28, padT = 18;
        const chartH = h - padT - padB;
        const groupW = (w - padL - 16) / 4;
        let svg = '';
        [0, 25, 50, 75, 100].forEach(val => {
            const y = padT + chartH - (val / 100) * chartH;
            svg += `<line x1="${padL}" y1="${y}" x2="${w - 10}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
            svg += `<text x="${padL - 5}" y="${y + 3}" text-anchor="end" font-size="9" fill="#64748b">${val}</text>`;
        });
        bimesters.forEach((b, i) => {
            const gx = padL + i * groupW + 14;
            const mH = (b.maleAvg / 100) * chartH;
            const fH = (b.femaleAvg / 100) * chartH;
            svg += `
                <rect x="${gx}" y="${padT + chartH - mH}" width="26" height="${mH}" rx="4" fill="#0284c7"/>
                <text x="${gx + 13}" y="${Math.max(12, padT + chartH - mH - 4)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0369a1">${b.maleCount ? b.maleAvg : '—'}</text>
                <rect x="${gx + 30}" y="${padT + chartH - fH}" width="26" height="${fH}" rx="4" fill="#db2777"/>
                <text x="${gx + 43}" y="${Math.max(12, padT + chartH - fH - 4)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#be185d">${b.femaleCount ? b.femaleAvg : '—'}</text>
                <text x="${gx + 28}" y="${h - 8}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f2b5c">${b.shortLabel}</text>
            `;
        });
        return `
            <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; max-height:220px; display:block;" role="img" aria-label="Gráfica Comparativa Hombres vs Mujeres por Bimestre">
                ${svg}
            </svg>
            <div style="display:flex; justify-content:center; gap:16px; font-size:0.75rem; font-weight:700; color:#334155; margin-top:4px;">
                <span><span style="display:inline-block; width:10px; height:10px; background:#0284c7; border-radius:2px; margin-right:4px;"></span>Hombres (Promedio)</span>
                <span><span style="display:inline-block; width:10px; height:10px; background:#db2777; border-radius:2px; margin-right:4px;"></span>Mujeres (Promedio)</span>
            </div>
        `;
    }

    function renderAnalyticsBimesterHub() {
        const host = document.getElementById('enccoAnalyticsBimesterHub');
        if (!host) return;
        injectBimesterAnalyticsStyles();

        const data = computeBimesterAnalytics(HUB_STATE.bimestre);
        const { cycle, bimLabel, bimesters, gender, sections, teachers, subjects, recommendations } = data;

        let tabBodyHtml = '';

        if (HUB_STATE.activeTab === 'bimesters') {
            tabBodyHtml = `
                <div class="ab-grid-4" style="margin-bottom:14px;">
                    ${bimesters.map(b => `
                        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-top:3px solid #0369a1; border-radius:9px; padding:10px 12px;">
                            <div style="font-size:0.74rem; font-weight:800; color:#0f2b5c;">${b.label}</div>
                            <div style="font-size:1.3rem; font-weight:900; color:#0369a1; margin-top:2px;">${b.count ? b.avg + ' pts' : 'Sin notas'}</div>
                            <div style="font-size:0.73rem; color:#15803d; font-weight:700;">✅ Aprobación: ${b.count ? b.passRate + '%' : '—'}</div>
                            <div style="font-size:0.71rem; color:#64748b;">👦 ${b.maleCount ? b.maleAvg : '—'} | 👧 ${b.femaleCount ? b.femaleAvg : '—'}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="ab-grid-2">
                    <div class="ab-chart-box">
                        <strong style="font-size:0.86rem; color:#0f2b5c; display:block; margin-bottom:6px;"><i class="fa-solid fa-chart-column" style="color:#0369a1;"></i> Evolución Académica por Bimestre (B1 → B4)</strong>
                        ${_buildBimesterSvgChart(bimesters)}
                    </div>
                    <div class="ab-chart-box" style="background:#f0f9ff; border-color:#bae6fd;">
                        <strong style="font-size:0.86rem; color:#0f2b5c; display:block; margin-bottom:8px;"><i class="fa-solid fa-lightbulb" style="color:#d97706;"></i> Acciones Recomendadas para Mejora Escolar (${_esc(bimLabel)})</strong>
                        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.8rem; color:#1e293b;">
                            ${recommendations.map(rec => `<div style="background:#ffffff; border:1px solid #bae6fd; border-left:3px solid #0369a1; border-radius:7px; padding:8px 10px; font-weight:600;">${_esc(rec)}</div>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else if (HUB_STATE.activeTab === 'gender') {
            tabBodyHtml = `
                <div class="ab-grid-2" style="margin-bottom:14px;">
                    <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-left:5px solid #0284c7; border-radius:10px; padding:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:#0369a1; font-size:0.95rem;"><i class="fa-solid fa-mars"></i> HOMBRES</strong>
                            <span style="background:#0284c7; color:#fff; padding:2px 9px; border-radius:12px; font-weight:800; font-size:0.76rem;">${gender.male.totalStudents} alumnos</span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:10px; text-align:center;">
                            <div style="background:#fff; border-radius:7px; padding:7px;"><div style="font-size:0.68rem; color:#64748b; font-weight:700;">Promedio</div><div style="font-size:1.15rem; font-weight:900; color:#0369a1;">${gender.male.count ? gender.male.avg : '—'}</div></div>
                            <div style="background:#fff; border-radius:7px; padding:7px;"><div style="font-size:0.68rem; color:#64748b; font-weight:700;">% Aprobación</div><div style="font-size:1.15rem; font-weight:900; color:#15803d;">${gender.male.count ? gender.male.passRate + '%' : '—'}</div></div>
                            <div style="background:#fff; border-radius:7px; padding:7px;"><div style="font-size:0.68rem; color:#64748b; font-weight:700;">En Riesgo</div><div style="font-size:1.15rem; font-weight:900; color:#dc2626;">${gender.male.atRisk}</div></div>
                        </div>
                    </div>
                    <div style="background:#fdf2f8; border:1.5px solid #f9a8d4; border-left:5px solid #db2777; border-radius:10px; padding:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:#be185d; font-size:0.95rem;"><i class="fa-solid fa-venus"></i> MUJERES</strong>
                            <span style="background:#db2777; color:#fff; padding:2px 9px; border-radius:12px; font-weight:800; font-size:0.76rem;">${gender.female.totalStudents} alumnas</span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:10px; text-align:center;">
                            <div style="background:#fff; border-radius:7px; padding:7px;"><div style="font-size:0.68rem; color:#64748b; font-weight:700;">Promedio</div><div style="font-size:1.15rem; font-weight:900; color:#be185d;">${gender.female.count ? gender.female.avg : '—'}</div></div>
                            <div style="background:#fff; border-radius:7px; padding:7px;"><div style="font-size:0.68rem; color:#64748b; font-weight:700;">% Aprobación</div><div style="font-size:1.15rem; font-weight:900; color:#15803d;">${gender.female.count ? gender.female.passRate + '%' : '—'}</div></div>
                            <div style="background:#fff; border-radius:7px; padding:7px;"><div style="font-size:0.68rem; color:#64748b; font-weight:700;">En Riesgo</div><div style="font-size:1.15rem; font-weight:900; color:#dc2626;">${gender.female.atRisk}</div></div>
                        </div>
                    </div>
                </div>
                <div class="ab-chart-box">
                    <strong style="font-size:0.86rem; color:#0f2b5c; display:block; margin-bottom:6px;"><i class="fa-solid fa-venus-mars" style="color:#0369a1;"></i> Comparativa Hombres vs. Mujeres por Bimestre (B1 → B4)</strong>
                    ${_buildGenderBimesterSvgChart(bimesters)}
                </div>
            `;
        } else if (HUB_STATE.activeTab === 'sections') {
            tabBodyHtml = `
                <div class="ab-table-wrap">
                    <table class="ab-table">
                        <thead>
                            <tr>
                                <th style="width:24%; text-align:left;">Grado y Sección</th>
                                <th style="width:13%; text-align:center;">Matrícula (H/M)</th>
                                <th style="width:10%; text-align:center;">Prom.</th>
                                <th style="width:13%; text-align:center;">Prom. H/M</th>
                                <th style="width:19%; text-align:left;">% Aprobación</th>
                                <th style="width:9%; text-align:center;">Riesgo</th>
                                <th style="width:12%; text-align:center;">Maestro Guía</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sections.map(s => {
                                const clr = s.passRate >= 80 ? '#16a34a' : (s.passRate >= 60 ? '#d97706' : '#dc2626');
                                const safeKey = _esc(s.key).replace(/'/g, "\\'");
                                return `<tr>
                                    <td><strong style="color:#0f2b5c;">${_esc(s.key)}</strong></td>
                                    <td style="text-align:center;"><strong>${s.total}</strong> <small style="color:#64748b;">(👦${s.male}/👧${s.female})</small></td>
                                    <td style="text-align:center; font-weight:800; color:#0369a1;">${s.count ? s.avg : '—'}</td>
                                    <td style="text-align:center; font-size:0.74rem;"><span style="color:#0284c7; font-weight:700;">${s.maleCount ? s.maleAvg : '—'}</span> / <span style="color:#be185d; font-weight:700;">${s.femaleCount ? s.femaleAvg : '—'}</span></td>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <div class="ab-bar-track"><div class="ab-bar-fill" style="width:${s.count ? s.passRate : 0}%; background:${clr};"></div></div>
                                            <strong style="font-size:0.74rem; color:${clr}; min-width:34px;">${s.count ? s.passRate + '%' : '—'}</strong>
                                        </div>
                                    </td>
                                    <td style="text-align:center;"><span style="background:${s.atRisk > 0 ? '#fee2e2' : '#dcfce7'}; color:${s.atRisk > 0 ? '#b91c1c' : '#15803d'}; padding:2px 8px; border-radius:10px; font-weight:800; font-size:0.73rem;">${s.atRisk}</span></td>
                                    <td style="text-align:center;">
                                        <button type="button" class="btn btn-xs btn-outline-primary" onclick="printGuideTeacherSectionAnalyticsReport('${safeKey}')" style="padding:3px 7px; font-size:0.72rem; font-weight:700;" title="Imprimir reporte de tutoría para el Maestro Guía">
                                            <i class="fa-solid fa-compass"></i> Guía
                                        </button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="ab-cards">
                    ${sections.map(s => {
                        const safeKey = _esc(s.key).replace(/'/g, "\\'");
                        return `
                        <div class="ab-card">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color:#0f2b5c;">${_esc(s.key)}</strong>
                                <span style="font-weight:800; color:#0369a1;">Prom: ${s.count ? s.avg : '—'}</span>
                            </div>
                            <div style="font-size:0.75rem; color:#475569; margin:4px 0 8px 0;">Total: <strong>${s.total}</strong> (👦 ${s.male} | 👧 ${s.female}) &bull; Aprobación: <strong>${s.count ? s.passRate + '%' : '—'}</strong> &bull; Riesgo: <strong style="color:#dc2626;">${s.atRisk}</strong></div>
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="printGuideTeacherSectionAnalyticsReport('${safeKey}')" style="width:100%; font-weight:700; font-size:0.76rem;"><i class="fa-solid fa-compass"></i> Imprimir Reporte Maestro Guía</button>
                        </div>`;
                    }).join('')}
                </div>
            `;
        } else if (HUB_STATE.activeTab === 'teachers') {
            tabBodyHtml = `
                <div class="ab-table-wrap">
                    <table class="ab-table">
                        <thead>
                            <tr>
                                <th style="width:24%; text-align:left;">Docente / Catedrático</th>
                                <th style="width:24%; text-align:left;">Cátedras Evaluadas</th>
                                <th style="width:10%; text-align:center;">Prom.</th>
                                <th style="width:20%; text-align:left;">% Aprobación</th>
                                <th style="width:10%; text-align:center;">Reprob.</th>
                                <th style="width:12%; text-align:center;">Reporte</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${teachers.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">Sin notas registradas aún en ${_esc(bimLabel)}.</td></tr>` : teachers.map(t => {
                                const clr = t.passRate >= 80 ? '#16a34a' : (t.passRate >= 60 ? '#d97706' : '#dc2626');
                                const safeT = _esc(t.teacher).replace(/'/g, "\\'");
                                return `<tr>
                                    <td><strong style="color:#0f2b5c;">${_esc(t.teacher)}</strong><div style="font-size:0.69rem; color:#64748b;">${t.sectionsList.length} secc. &bull; ${t.count} eval.</div></td>
                                    <td style="font-size:0.73rem; color:#334155;">${_esc(t.subjectsList.slice(0, 3).join(', '))}${t.subjectsList.length > 3 ? ` (+${t.subjectsList.length - 3})` : ''}</td>
                                    <td style="text-align:center; font-weight:800; color:#0369a1;">${t.avg}</td>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <div class="ab-bar-track"><div class="ab-bar-fill" style="width:${t.passRate}%; background:${clr};"></div></div>
                                            <strong style="font-size:0.74rem; color:${clr}; min-width:34px;">${t.passRate}%</strong>
                                        </div>
                                    </td>
                                    <td style="text-align:center; font-weight:800; color:${t.failed > 0 ? '#dc2626' : '#15803d'};">${t.failed}</td>
                                    <td style="text-align:center;">
                                        <button type="button" class="btn btn-xs btn-outline-primary" onclick="printIndividualTeacherAnalyticsReport('${safeT}')" style="padding:3px 7px; font-size:0.72rem; font-weight:700;" title="Imprimir informe constructivo individual para este docente">
                                            <i class="fa-solid fa-print"></i> Informe
                                        </button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="ab-cards">
                    ${teachers.map(t => {
                        const safeT = _esc(t.teacher).replace(/'/g, "\\'");
                        return `
                        <div class="ab-card">
                            <strong style="color:#0f2b5c;">${_esc(t.teacher)}</strong>
                            <div style="font-size:0.73rem; color:#64748b; margin:2px 0;">${_esc(t.subjectsList.join(', '))}</div>
                            <div style="font-size:0.76rem; margin:6px 0;">Prom: <strong>${t.avg}</strong> &bull; Aprob: <strong>${t.passRate}%</strong> &bull; Reprob: <strong style="color:#dc2626;">${t.failed}</strong></div>
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="printIndividualTeacherAnalyticsReport('${safeT}')" style="width:100%; font-weight:700; font-size:0.76rem;"><i class="fa-solid fa-print"></i> Imprimir Informe para Docente</button>
                        </div>`;
                    }).join('')}
                </div>
            `;
        } else if (HUB_STATE.activeTab === 'subjects') {
            tabBodyHtml = `
                <div class="ab-table-wrap">
                    <table class="ab-table">
                        <thead>
                            <tr>
                                <th style="width:28%; text-align:left;">Cátedra / Asignatura</th>
                                <th style="width:22%; text-align:left;">Docente(s)</th>
                                <th style="width:10%; text-align:center;">Prom.</th>
                                <th style="width:14%; text-align:center;">H / M</th>
                                <th style="width:18%; text-align:left;">% Aprobación</th>
                                <th style="width:8%; text-align:center;">Reprob.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">Sin notas registradas aún en ${_esc(bimLabel)}.</td></tr>` : subjects.map(sb => {
                                const clr = sb.passRate >= 80 ? '#16a34a' : (sb.passRate >= 60 ? '#d97706' : '#dc2626');
                                return `<tr>
                                    <td><strong style="color:#0f2b5c;">${_esc(sb.subject)}</strong></td>
                                    <td style="font-size:0.72rem; color:#475569;">${_esc(sb.teachersList.slice(0, 2).join(', '))}</td>
                                    <td style="text-align:center; font-weight:800; color:#0369a1;">${sb.avg}</td>
                                    <td style="text-align:center; font-size:0.73rem;"><span style="color:#0284c7; font-weight:700;">${sb.maleCount ? sb.maleAvg : '—'}</span> / <span style="color:#be185d; font-weight:700;">${sb.femaleCount ? sb.femaleAvg : '—'}</span></td>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <div class="ab-bar-track"><div class="ab-bar-fill" style="width:${sb.passRate}%; background:${clr};"></div></div>
                                            <strong style="font-size:0.73rem; color:${clr}; min-width:34px;">${sb.passRate}%</strong>
                                        </div>
                                    </td>
                                    <td style="text-align:center; font-weight:800; color:${sb.failed > 0 ? '#dc2626' : '#15803d'};">${sb.failed}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="ab-cards">
                    ${subjects.map(sb => `
                        <div class="ab-card">
                            <strong style="color:#0f2b5c;">${_esc(sb.subject)}</strong>
                            <div style="font-size:0.72rem; color:#64748b;">${_esc(sb.teachersList.join(', '))}</div>
                            <div style="font-size:0.75rem; margin-top:4px;">Prom: <strong>${sb.avg}</strong> (👦 ${sb.maleCount ? sb.maleAvg : '—'} / 👧 ${sb.femaleCount ? sb.femaleAvg : '—'}) &bull; Aprob: <strong>${sb.passRate}%</strong> &bull; Reprob: <strong style="color:#dc2626;">${sb.failed}</strong></div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        host.innerHTML = `
            <div class="ab-shell">
                <div class="ab-header">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <strong style="font-size:1.05rem;"><i class="fa-solid fa-chart-pie"></i> Gráficas por Bimestre y Reportes para Claustro Docente</strong>
                            <span style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); padding:2px 8px; border-radius:12px; font-size:0.74rem; font-weight:800;">Ciclo ${_esc(cycle)}</span>
                        </div>
                        <div style="font-size:0.77rem; color:#e0f2fe; margin-top:2px;">
                            Desglose claro por Hombres y Mujeres, Grado/Sección, Docentes y Cátedras orientado a la mejora del servicio escolar.
                        </div>
                    </div>
                    <div class="ab-header-controls">
                        <select onchange="setAnalyticsHubBimestre(this.value)" aria-label="Seleccionar bimestre" style="background:#ffffff; color:#0f2b5c; border:1px solid #bae6fd; padding:0 10px;">
                            <option value="ALL" ${HUB_STATE.bimestre === 'ALL' ? 'selected' : ''}>📅 Consolidado (B1–B4)</option>
                            <option value="1" ${HUB_STATE.bimestre === '1' ? 'selected' : ''}>1º Bimestre</option>
                            <option value="2" ${HUB_STATE.bimestre === '2' ? 'selected' : ''}>2º Bimestre</option>
                            <option value="3" ${HUB_STATE.bimestre === '3' ? 'selected' : ''}>3º Bimestre</option>
                            <option value="4" ${HUB_STATE.bimestre === '4' ? 'selected' : ''}>4º Bimestre</option>
                        </select>
                        <button type="button" class="btn btn-sm" onclick="printClaustroDocentesAnalyticsReport()" style="background:#ffffff; color:#0f2b5c; border:1px solid #bae6fd; padding:6px 12px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-print"></i> Informe para Claustro
                        </button>
                        <button type="button" class="btn btn-sm" onclick="exportBimesterAnalyticsExcel()" style="background:#15803d; color:#ffffff; border:1px solid #86efac; padding:6px 12px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-file-excel"></i> Excel Multi-Hoja
                        </button>
                    </div>
                </div>

                <div class="ab-tabs">
                    <button type="button" class="ab-tab-btn ${HUB_STATE.activeTab === 'bimesters' ? 'active' : ''}" onclick="setAnalyticsHubTab('bimesters')"><i class="fa-solid fa-chart-column"></i> Evolución por Bimestre</button>
                    <button type="button" class="ab-tab-btn ${HUB_STATE.activeTab === 'gender' ? 'active' : ''}" onclick="setAnalyticsHubTab('gender')"><i class="fa-solid fa-venus-mars"></i> Hombres y Mujeres</button>
                    <button type="button" class="ab-tab-btn ${HUB_STATE.activeTab === 'sections' ? 'active' : ''}" onclick="setAnalyticsHubTab('sections')"><i class="fa-solid fa-school"></i> Grado y Sección (${sections.length})</button>
                    <button type="button" class="ab-tab-btn ${HUB_STATE.activeTab === 'teachers' ? 'active' : ''}" onclick="setAnalyticsHubTab('teachers')"><i class="fa-solid fa-chalkboard-user"></i> Por Docentes (${teachers.length})</button>
                    <button type="button" class="ab-tab-btn ${HUB_STATE.activeTab === 'subjects' ? 'active' : ''}" onclick="setAnalyticsHubTab('subjects')"><i class="fa-solid fa-book-open"></i> Por Cátedras (${subjects.length})</button>
                </div>

                <div class="ab-body">${tabBodyHtml}</div>
            </div>
        `;
    }

    function setAnalyticsHubBimestre(b) { HUB_STATE.bimestre = String(b || 'ALL'); renderAnalyticsBimesterHub(); }
    function setAnalyticsHubTab(t) { HUB_STATE.activeTab = t || 'bimesters'; renderAnalyticsBimesterHub(); }

    /**
     * Informe Ejecutivo para Claustro de Docentes (Azul Institucional, Hoja Oficio 8.5"x13").
     */
    function printClaustroDocentesAnalyticsReport() {
        const data = computeBimesterAnalytics(HUB_STATE.bimestre);
        const todayStr = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const htmlContent = `
            <style>
                @page { size: 8.5in 13in portrait; margin: 6mm; }
                .cl-tbl th { background-color: #0369a1 !important; color: #ffffff !important; border: 1px solid #0f2b5c; padding: 4px; font-size: 7.5pt; }
                .cl-tbl td { border: 1px solid #334155; padding: 3px 4px; font-size: 7.6pt; }
            </style>
            <div style="font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
                <div style="border:2px solid #0369a1; border-radius:6px; overflow:hidden; margin-bottom:10px;">
                    <div style="background:linear-gradient(135deg, #0f2b5c 0%, #0369a1 60%, #0284c7 100%); color:#ffffff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:38px; width:auto;">
                            <div>
                                <h2 style="margin:0; font-size:1rem; font-weight:900;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</h2>
                                <div style="font-size:0.72rem; color:#bae6fd;">JUTIAPA — CICLO ESCOLAR ${_esc(data.cycle)} | ${_esc(data.bimLabel)}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="background:#0c4a6e; border:1px solid #7dd3fc; padding:3px 9px; border-radius:6px; font-size:0.73rem; font-weight:800;">INFORME DE MEJORA ESCOLAR — CLAUSTRO DOCENTE</div>
                            <div style="font-size:0.68rem; color:#e0f2fe; margin-top:2px;">${_esc(todayStr)}</div>
                        </div>
                    </div>
                    <div style="background:#f0f9ff; padding:6px 10px; display:flex; justify-content:space-between; font-size:8pt;">
                        <span><strong>Matrícula Activa:</strong> ${data.totalStudents} (Hombres: ${data.gender.male.totalStudents} | Mujeres: ${data.gender.female.totalStudents})</span>
                        <span><strong>Promedio General:</strong> ${data.overallAvg} pts &bull; <strong>% Aprobación:</strong> ${data.overallPassRate}%</span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div style="border:1px solid #cbd5e1; border-radius:6px; padding:8px;">
                        <strong style="font-size:8pt; color:#0f2b5c;">1. Evolución por Bimestre (B1–B4)</strong>
                        ${_buildBimesterSvgChart(data.bimesters)}
                    </div>
                    <div style="border:1px solid #cbd5e1; border-radius:6px; padding:8px;">
                        <strong style="font-size:8pt; color:#0f2b5c;">2. Comparativa Hombres vs. Mujeres</strong>
                        ${_buildGenderBimesterSvgChart(data.bimesters)}
                    </div>
                </div>

                <h4 style="margin:8px 0 4px 0; color:#0f2b5c; font-size:8.5pt;">3. Rendimiento por Grado y Sección (Hombres / Mujeres)</h4>
                <table class="cl-tbl" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                    <thead><tr><th style="text-align:left;">Grado y Sección</th><th>Total</th><th>Hombres</th><th>Mujeres</th><th>Prom. Gral.</th><th>% Aprob.</th><th>En Riesgo</th></tr></thead>
                    <tbody>
                        ${data.sections.map(s => `<tr><td><strong>${_esc(s.key)}</strong></td><td style="text-align:center;">${s.total}</td><td style="text-align:center;">${s.male} (${s.maleCount ? s.maleAvg : '—'})</td><td style="text-align:center;">${s.female} (${s.femaleCount ? s.femaleAvg : '—'})</td><td style="text-align:center; font-weight:800;">${s.count ? s.avg : '—'}</td><td style="text-align:center; font-weight:800;">${s.count ? s.passRate + '%' : '—'}</td><td style="text-align:center; color:#b91c1c; font-weight:800;">${s.atRisk}</td></tr>`).join('')}
                    </tbody>
                </table>

                <h4 style="margin:8px 0 4px 0; color:#0f2b5c; font-size:8.5pt;">4. Cátedras Prioritarias para Plan de Mejoramiento</h4>
                <table class="cl-tbl" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                    <thead><tr><th style="text-align:left;">Cátedra</th><th style="text-align:left;">Docente(s)</th><th>Prom.</th><th>% Aprob.</th><th>Reprobados</th></tr></thead>
                    <tbody>
                        ${data.subjects.slice(0, 10).map(sb => `<tr><td><strong>${_esc(sb.subject)}</strong></td><td>${_esc(sb.teachersList.join(', '))}</td><td style="text-align:center; font-weight:800;">${sb.avg}</td><td style="text-align:center;">${sb.passRate}%</td><td style="text-align:center; color:#b91c1c; font-weight:800;">${sb.failed}</td></tr>`).join('')}
                    </tbody>
                </table>

                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-left:4px solid #0369a1; border-radius:6px; padding:8px 10px; font-size:8pt; margin-bottom:18px;">
                    <strong>5. Recomendaciones y Acuerdos para Mejora del Servicio Escolar:</strong>
                    <ul style="margin:4px 0 0 16px; padding:0;">
                        ${data.recommendations.map(r => `<li>${_esc(r)}</li>`).join('')}
                    </ul>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; margin-top:28px; text-align:center; font-size:8pt;">
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Dirección General</strong></div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Comisión de Evaluación</strong></div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Secretaría Académica</strong></div>
                </div>
            </div>
        `;

        if (typeof window.renderAndShowPrintDocument === 'function') {
            window.renderAndShowPrintDocument(`Informe Ejecutivo Claustro Docente — ${data.bimLabel} (${data.cycle})`, htmlContent, 'portrait');
        } else if (typeof window.enccoSafePrintHtml === 'function') {
            window.enccoSafePrintHtml(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`, 'width=950,height=850', true);
        }
    }

    /**
     * Reporte Individual Constructivo por Docente.
     */
    function printIndividualTeacherAnalyticsReport(teacherName) {
        const data = computeBimesterAnalytics(HUB_STATE.bimestre);
        const t = data.teachers.find(x => x.teacher === teacherName);
        if (!t) return;
        const todayStr = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });

        const htmlContent = `
            <style>
                @page { size: letter portrait; margin: 12mm; }
                .td-tbl th { background-color: #0369a1 !important; color: #ffffff !important; border: 1px solid #0f2b5c; padding: 5px; font-size: 8pt; }
                .td-tbl td { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 8.2pt; }
            </style>
            <div style="font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
                <div style="border-bottom:3px solid #0369a1; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h2 style="margin:0; font-size:1.05rem; color:#0f2b5c;">INFORME PEDAGÓGICO INDIVIDUAL POR DOCENTE</h2>
                        <div style="font-size:0.8rem; color:#475569;">ENCCO Jutiapa &bull; Ciclo ${_esc(data.cycle)} &bull; ${_esc(data.bimLabel)}</div>
                    </div>
                    <div style="font-size:0.76rem; color:#475569;">${_esc(todayStr)}</div>
                </div>

                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-left:4px solid #0369a1; border-radius:6px; padding:10px 14px; margin-bottom:12px; font-size:9pt;">
                    <div><strong>Catedrático(a):</strong> ${_esc(t.teacher)}</div>
                    <div><strong>Cátedras:</strong> ${_esc(t.subjectsList.join(', '))}</div>
                    <div><strong>Secciones:</strong> ${_esc(t.sectionsList.join(', '))}</div>
                    <div style="margin-top:6px;">
                        <strong>Promedio General:</strong> ${t.avg} pts &bull;
                        <strong>% Aprobación:</strong> ${t.passRate}% (👦 Hombres: ${t.malePassRate}% | 👧 Mujeres: ${t.femalePassRate}%) &bull;
                        <strong>Reprobados:</strong> ${t.failed}
                    </div>
                </div>

                <h4 style="margin:8px 0 4px 0; color:#0f2b5c; font-size:9pt;">Estudiantes que Requieren Plan de Mejoramiento (${t.failingStudents.length})</h4>
                <table class="td-tbl" style="width:100%; border-collapse:collapse; margin-bottom:14px;">
                    <thead><tr><th style="width:30px;">No.</th><th style="text-align:left;">Estudiante</th><th>Sección</th><th style="text-align:left;">Cátedra</th><th>Nota</th></tr></thead>
                    <tbody>
                        ${t.failingStudents.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:14px; color:#15803d; font-weight:700;">✅ Excelente desempeño: 0 estudiantes reprobados en este periodo.</td></tr>' : t.failingStudents.slice(0, 40).map((f, i) => `
                            <tr><td style="text-align:center;">${i + 1}</td><td><strong>${_esc(f.name)}</strong></td><td style="text-align:center;">${_esc(f.section)}</td><td>${_esc(f.subject)}</td><td style="text-align:center; color:#b91c1c; font-weight:800;">${f.score}</td></tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; min-height:70px; font-size:8.5pt;">
                    <strong>Estrategia de Mejoramiento / Observaciones del Docente:</strong>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; text-align:center; font-size:8.5pt;">
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>${_esc(t.teacher)}</strong><br>Firma del Docente</div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Dirección / Comisión de Evaluación</strong><br>ENCCO Jutiapa</div>
                </div>
            </div>
        `;

        if (typeof window.renderAndShowPrintDocument === 'function') {
            window.renderAndShowPrintDocument(`Informe Docente — ${t.teacher} (${data.bimLabel})`, htmlContent, 'portrait');
        } else if (typeof window.enccoSafePrintHtml === 'function') {
            window.enccoSafePrintHtml(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`, 'width=900,height=800', true);
        }
    }

    /**
     * Reporte para Maestro Guía por Sección (tutoría, alumnos en riesgo, H/M, % asistencia y becados).
     */
    function printGuideTeacherSectionAnalyticsReport(sectionKey) {
        const data = computeBimesterAnalytics(HUB_STATE.bimestre);
        const sec = data.sections.find(x => x.key === sectionKey);
        if (!sec) return;
        const todayStr = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
        const gradesList = (window.STATE && Array.isArray(window.STATE.gradesList)) ? window.STATE.gradesList : [];
        const gObj = gradesList.find(g => g && `${g.name} (${String(g.section || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase()})` === sec.key);
        const guideTeacher = (gObj && (gObj.guideTeacher || gObj.teacher)) || 'Maestro(a) Guía';

        const htmlContent = `
            <style>
                @page { size: letter portrait; margin: 12mm; }
                .gt-tbl th { background-color: #0369a1 !important; color: #ffffff !important; border: 1px solid #0f2b5c; padding: 5px; font-size: 8pt; }
                .gt-tbl td { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 8.2pt; }
            </style>
            <div style="font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
                <div style="border-bottom:3px solid #0369a1; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h2 style="margin:0; font-size:1.05rem; color:#0f2b5c;">REPORTE DE TUTORÍA PARA MAESTRO GUÍA</h2>
                        <div style="font-size:0.8rem; color:#475569;">ENCCO Jutiapa &bull; Ciclo ${_esc(data.cycle)} &bull; ${_esc(data.bimLabel)}</div>
                    </div>
                    <div style="font-size:0.76rem; color:#475569;">${_esc(todayStr)}</div>
                </div>
                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-left:4px solid #0369a1; border-radius:6px; padding:10px 14px; margin-bottom:12px; font-size:9pt;">
                    <div><strong>Sección:</strong> ${_esc(sec.key)} &bull; <strong>Maestro(a) Guía:</strong> ${_esc(guideTeacher)}</div>
                    <div style="margin-top:4px;"><strong>Matrícula:</strong> ${sec.total} (👦 Hombres: ${sec.male} / 👧 Mujeres: ${sec.female}) &bull; <strong>Promedio:</strong> ${sec.count ? sec.avg : '—'} pts &bull; <strong>% Aprobación:</strong> ${sec.count ? sec.passRate + '%' : '—'}</div>
                </div>
                <h4 style="margin:8px 0 4px 0; color:#0f2b5c; font-size:9pt;">Estudiantes en Seguimiento Prioritario / Riesgo (${sec.riskStudents.length})</h4>
                <table class="gt-tbl" style="width:100%; border-collapse:collapse; margin-bottom:14px;">
                    <thead><tr><th style="width:30px;">No.</th><th style="text-align:left;">Estudiante</th><th>Sexo</th><th>Prom.</th><th>Reprob.</th><th>% Asist.</th><th>Beca</th></tr></thead>
                    <tbody>
                        ${sec.riskStudents.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:14px; color:#15803d; font-weight:700;">✅ Sin estudiantes en riesgo académico en esta sección.</td></tr>' : sec.riskStudents.map((r, i) => `
                            <tr><td style="text-align:center;">${i + 1}</td><td><strong>${_esc(r.name)}</strong></td><td style="text-align:center;">${r.gender}</td><td style="text-align:center; font-weight:800;">${r.avg}</td><td style="text-align:center; color:#b91c1c; font-weight:800;">${r.failedCount}</td><td style="text-align:center;">${_esc(r.attPct)}</td><td style="text-align:center;">${r.isBecado ? '🎓 Sí' : '—'}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:44px; text-align:center; font-size:8.5pt;">
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>${_esc(guideTeacher)}</strong><br>Maestro(a) Guía</div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Dirección / Orientación</strong><br>ENCCO Jutiapa</div>
                </div>
            </div>
        `;

        if (typeof window.renderAndShowPrintDocument === 'function') {
            window.renderAndShowPrintDocument(`Reporte Maestro Guía — ${sec.key} (${data.bimLabel})`, htmlContent, 'portrait');
        } else if (typeof window.enccoSafePrintHtml === 'function') {
            window.enccoSafePrintHtml(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`, 'width=900,height=800', true);
        }
    }

    async function exportBimesterAnalyticsExcel() {
        const data = computeBimesterAnalytics(HUB_STATE.bimestre);
        const filenameBase = `Analitica_Escolar_ENCCO_${data.cycle}_B${data.bimFilter}`;
        if (typeof window.ExcelJS !== 'undefined') {
            try {
                const wb = new window.ExcelJS.Workbook();
                const addSheet = (name, headers, rows) => {
                    const ws = wb.addWorksheet(name);
                    const hr = ws.addRow(headers);
                    hr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } }; });
                    rows.forEach(r => ws.addRow(r));
                    ws.columns.forEach(col => { col.width = 20; });
                };
                addSheet('Bimestres_y_Genero', ['Bimestre', 'Promedio Gral.', '% Aprobación', 'Prom. Hombres', 'Prom. Mujeres'],
                    data.bimesters.map(b => [b.label, b.avg, `${b.passRate}%`, b.maleAvg, b.femaleAvg]));
                addSheet('Grado_y_Seccion', ['Grado y Sección', 'Total', 'Hombres', 'Mujeres', 'Promedio', '% Aprobación', 'En Riesgo'],
                    data.sections.map(s => [s.key, s.total, s.male, s.female, s.avg, `${s.passRate}%`, s.atRisk]));
                addSheet('Por_Docentes', ['Docente', 'Cátedras', 'Evaluaciones', 'Promedio', '% Aprobación', 'Reprobados'],
                    data.teachers.map(t => [t.teacher, t.subjectsList.join(', '), t.count, t.avg, `${t.passRate}%`, t.failed]));
                addSheet('Por_Catedras', ['Cátedra', 'Docentes', 'Promedio', 'Prom. Hombres', 'Prom. Mujeres', '% Aprobación', 'Reprobados'],
                    data.subjects.map(sb => [sb.subject, sb.teachersList.join(', '), sb.avg, sb.maleAvg, sb.femaleAvg, `${sb.passRate}%`, sb.failed]));

                const buf = await wb.xlsx.writeBuffer();
                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${filenameBase}.xlsx`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1500);
                return;
            } catch (e) {}
        }
        if (typeof window.showToast === 'function') window.showToast('ExcelJS no disponible; utilice Imprimir Informe para Claustro.', 'info');
    }

    // Hook automático en renderPredictiveAnalyticsView para inyectar el Hub de Gráficas sin perder nada de analytics.js
    const _origRenderPredictive = window.renderPredictiveAnalyticsView;
    if (typeof _origRenderPredictive === 'function') {
        window.renderPredictiveAnalyticsView = function (...args) {
            const res = _origRenderPredictive.apply(this, args);
            try {
                const container = document.getElementById('view-predictive-analytics');
                if (container) {
                    let hub = document.getElementById('enccoAnalyticsBimesterHub');
                    if (!hub) {
                        hub = document.createElement('div');
                        hub.id = 'enccoAnalyticsBimesterHub';
                        const inner = container.querySelector('.analytics-container') || container;
                        inner.insertBefore(hub, inner.firstChild);
                    }
                    renderAnalyticsBimesterHub();
                }
            } catch (e) {}
            return res;
        };
    }

    window.computeBimesterAnalytics = computeBimesterAnalytics;
    window.renderAnalyticsBimesterHub = renderAnalyticsBimesterHub;
    window.setAnalyticsHubBimestre = setAnalyticsHubBimestre;
    window.setAnalyticsHubTab = setAnalyticsHubTab;
    window.printClaustroDocentesAnalyticsReport = printClaustroDocentesAnalyticsReport;
    window.printIndividualTeacherAnalyticsReport = printIndividualTeacherAnalyticsReport;
    window.printGuideTeacherSectionAnalyticsReport = printGuideTeacherSectionAnalyticsReport;
    window.exportBimesterAnalyticsExcel = exportBimesterAnalyticsExcel;
})(window, document);
