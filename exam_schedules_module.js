/**
 * exam_schedules_module.js
 * ==============================================================================
 * MÓDULO OFICIAL: ROLES DE EVALUACIONES Y CUIDO DE EXÁMENES (AUXILIATURA GENERAL)
 * ENCCO - Escuela Nacional de Ciencias Comerciales, Jutiapa (1970)
 * ==============================================================================
 * Características Principales:
 * 1. Exclusivo para Auxiliatura, Dirección y Secretaría (Bloqueado 100% para Docentes).
 * 2. Fechas de evaluación por día y selección de clases a evaluar por grado.
 * 3. Tiempo oficial asignado por el docente titular (ej. 45m, 60m, 90m, o 300m en Práctica).
 * 4. Cálculo matemático de horarios (inicia 07:30 AM, JAMÁS excede las 12:30 PM).
 * 5. División estricta de cada grado en 2 grupos: Grupo A (1 a N/2) y Grupo B (N/2 + 1 a N).
 * 6. Regla de Oro: El docente titular de la cátedra NO cuida su propia prueba.
 * 7. Excepción Computación: Docente titular evalúa y cuida (Grupo Único o 2 Turnos de Lab).
 * 8. Excepción Práctica Supervisada: Día exclusivo, 2 grupos en salones separados con
 *    2 docentes cuidadores por salón (Relevo exacto a mitad de tiempo: 10:00 AM).
 * 9. Matriz de Equidad Docente (Antifatiga): Contador visual de minutos y salones asignados.
 * 10. Impresión Oficial de Medias Listas (Grupo A y Grupo B) con logo y 3 líneas de observaciones.
 * 11. Impresión de Horario Diario en HOJA OFICIO (Legal, 3 columnas).
 * 12. Calendario General Semanal en PDF para compartir.
 */

(function (window, document) {
    'use strict';

    // Clave de almacenamiento local persistente
    const STORAGE_KEY = 'ENCCO_EXAM_SCHEDULES';

    // Inyección de estilos dedicados del módulo
    function injectExamScheduleStyles() {
        if (document.getElementById('exam-schedules-styles')) return;
        const style = document.createElement('style');
        style.id = 'exam-schedules-styles';
        style.textContent = `
            .exam-sched-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 18px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                margin-bottom: 20px;
            }
            .exam-day-banner {
                background: linear-gradient(135deg, #15803d 0%, #166534 100%);
                color: #ffffff;
                padding: 12px 18px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 16px;
            }
            .exam-item-box {
                background: #f8fafc;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                padding: 16px;
                margin-bottom: 14px;
                position: relative;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .exam-item-box:hover {
                border-color: #0284c7;
                box-shadow: 0 4px 12px rgba(2,132,199,0.08);
            }
            .exam-item-practica {
                background: #eff6ff;
                border-color: #93c5fd;
            }
            .exam-item-practica:hover {
                border-color: #2563eb;
            }
            .exam-badge-time {
                background: #0f172a;
                color: #f8fafc;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 0.82rem;
                font-weight: 800;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .exam-badge-time.limit-warn {
                background: #dc2626 !important;
                color: #ffffff !important;
            }
            .exam-group-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px;
                margin-top: 10px;
            }
            .exam-teacher-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.78rem;
                font-weight: 700;
                margin: 2px 4px 2px 0;
            }
            .chip-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
            .chip-yellow { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
            .chip-orange { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
            .chip-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

            /* ESTILOS DE TABLA COMPACTA Y MODERNA PARA SALONES Y EVALUACIONES */
            .exam-compact-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                font-size: 0.84rem;
            }
            .exam-compact-table th {
                background: #f8fafc;
                color: #334155;
                font-weight: 800;
                padding: 8px 12px;
                border-bottom: 1px solid #e2e8f0;
                text-align: left;
                font-size: 0.78rem;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .exam-compact-table td {
                padding: 8px 12px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .exam-compact-table tr:last-child td {
                border-bottom: none;
            }
            .exam-compact-table tr:hover td {
                background: #f8fafc;
            }

            /* BARRA DE ACCIÓN RÁPIDA SUPERIOR */
            .exam-quick-actions-bar {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 10px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }

            /* MODALES CENTRADOS PERFECTAMENTE EN VIEWPORT */
            .exam-modal-overlay {
                position: fixed !important;
                inset: 0 !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(15, 23, 42, 0.72) !important;
                backdrop-filter: blur(4px) !important;
                -webkit-backdrop-filter: blur(4px) !important;
                z-index: 99999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 16px !important;
                box-sizing: border-box !important;
                overflow-y: auto !important;
            }
            .exam-modal-box {
                background: #ffffff !important;
                border-radius: 14px !important;
                box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.45) !important;
                border: 1px solid #cbd5e1 !important;
                width: 100% !important;
                max-width: 580px !important;
                margin: auto !important;
                overflow: hidden !important;
                animation: examModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .exam-modal-box.modal-lg-box {
                max-width: 860px !important;
            }
            @keyframes examModalPop {
                from { opacity: 0; transform: scale(0.96) translateY(-10px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Inicializar o recuperar datos de STATE
    function getExamSchedulesData() {
        if (!window.STATE) window.STATE = {};
        if (!STATE.examSchedules || typeof STATE.examSchedules !== 'object') {
            try {
                const stored = (typeof localStorage !== 'undefined' && localStorage.getItem) ? localStorage.getItem(STORAGE_KEY) : null;
                STATE.examSchedules = stored ? JSON.parse(stored) : {};
            } catch (e) {
                STATE.examSchedules = {};
            }
        }
        return STATE.examSchedules;
    }

    // Guardar cambios en LocalStorage y sincronizar a Firebase
    function saveExamSchedulesData(showNotification = true) {
        try {
            const data = getExamSchedulesData();
            if (typeof localStorage !== 'undefined' && localStorage.setItem) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }

            // Sincronización en segundo plano con Firebase si está disponible
            if (window.FirebaseModular && window.FirebaseModular.db) {
                const modular = window.FirebaseModular;
                modular.setDoc(modular.doc(modular.db, 'config', 'examSchedules'), {
                    schedules: data,
                    lastModified: Date.now(),
                    modifiedBy: (STATE.currentUser && STATE.currentUser.name) || (STATE.currentRole || 'auxiliatura')
                }, { merge: true }).catch(err => {
                    console.warn("Aviso al guardar examSchedules en Firestore:", err);
                });
            }
            if (typeof EnccoCloudSync !== 'undefined' && EnccoCloudSync.patchNode) {
                EnccoCloudSync.patchNode('examSchedules', data).catch(err => {
                    console.warn("Aviso al guardar examSchedules en RTDB:", err);
                });
            }

            if (showNotification && typeof showToast === 'function') {
                showToast("Roles y horarios de exámenes guardados exitosamente.", "success");
            }
        } catch (e) {
            console.error("Error al persistir examSchedules:", e);
        }
    }

    // Comprobar si el usuario actual tiene acceso al módulo
    function hasExamScheduleAccess() {
        const role = ((window.EnccoAuthStore ? window.EnccoAuthStore.getRole() : (window.STATE ? STATE.currentRole : '')) || '').toLowerCase().trim();
        const allowed = ['director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar', 'auxiliatura', 'admin', 'super_usuario'];
        return allowed.includes(role);
    }

    // Comprobar si un usuario es un docente elegible para cuidar (Auxiliar, Director y Secretaría NO se incluyen)
    function isTeacherEligibleForProctoring(u) {
        if (!u) return false;
        const role = (u.role || '').toLowerCase().trim();
        const forbiddenRoles = ['auxiliar', 'profesor_auxiliar', 'auxiliatura', 'director', 'direccion', 'secretaria', 'admin', 'super_usuario'];
        if (forbiddenRoles.includes(role)) return false;
        return role === 'docente' || role === 'profesor';
    }

    // Formatear minutos a formato HH:MM
    function minutesToTimeString(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(hrs)}:${pad(mins)}`;
    }

    // Convertir HH:MM a minutos desde medianoche
    function timeStringToMinutes(timeStr) {
        if (!timeStr) return 450; // 07:30
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60) + (m || 0);
    }

    // Obtener la clave actual del bloque (ej. "2026_BIM3")
    function getCurrentScheduleKey(bim = null) {
        const cycle = (STATE && STATE.activeCycle) || '2026';
        const bimester = bim || (STATE && STATE.activeBimester) || 'BIM3';
        return `${cycle}_${bimester}`;
    }

    // Inicializar o crear un horario vacío para el bloque
    function getOrCreateScheduleBlock(key) {
        const all = getExamSchedulesData();
        if (!all[key]) {
            all[key] = {
                cycle: (STATE && STATE.activeCycle) || '2026',
                bimester: key.split('_')[1] || 'BIM3',
                days: []
            };
        }
        return all[key];
    }

    // Calcular la matriz de carga de trabajo (minutos cuidados por cada profesor en una fecha)
    function calculateTeacherWorkloadForDate(scheduleBlock, targetDate) {
        const workload = {}; // { teacherId: { teacherName, minutes, salonesCount } }

        // Inicializar únicamente con docentes frente a grupo (auxiliares, directores y secretaría excluidos)
        (STATE.users || []).forEach(u => {
            if (isTeacherEligibleForProctoring(u)) {
                workload[u.id] = {
                    id: u.id,
                    name: u.name,
                    minutes: 0,
                    salonesCount: 0
                };
            }
        });

        const dayObj = (scheduleBlock.days || []).find(d => d.date === targetDate);
        if (dayObj && Array.isArray(dayObj.evaluations)) {
            dayObj.evaluations.forEach(ev => {
                const dur = parseInt(ev.durationMinutes, 10) || 60;

                if (ev.isPractica) {
                    // Práctica Supervisada: Relevo a mitad de tiempo (dur / 2 para cada turno)
                    const halfDur = Math.round(dur / 2);
                    if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                        ev.sections.forEach(sec => {
                            ['groupA', 'groupB'].forEach(grpKey => {
                                const grp = sec[grpKey];
                                if (grp) {
                                    if (grp.caretakerTeacherId && workload[grp.caretakerTeacherId]) {
                                        workload[grp.caretakerTeacherId].minutes += halfDur;
                                        workload[grp.caretakerTeacherId].salonesCount += 1;
                                    }
                                    if (grp.caretakerTurn2Id && workload[grp.caretakerTurn2Id]) {
                                        workload[grp.caretakerTurn2Id].minutes += halfDur;
                                        workload[grp.caretakerTurn2Id].salonesCount += 1;
                                    }
                                }
                            });
                        });
                    } else {
                        ['groupA', 'groupB'].forEach(grpKey => {
                            const grp = ev[grpKey];
                            if (grp) {
                                if (grp.caretakerTeacherId && workload[grp.caretakerTeacherId]) {
                                    workload[grp.caretakerTeacherId].minutes += halfDur;
                                    workload[grp.caretakerTeacherId].salonesCount += 1;
                                }
                                if (grp.caretakerTurn2Id && workload[grp.caretakerTurn2Id]) {
                                    workload[grp.caretakerTurn2Id].minutes += halfDur;
                                    workload[grp.caretakerTurn2Id].salonesCount += 1;
                                }
                            }
                        });
                    }
                } else if (ev.isComputacion && ev.computacionMode === 'single') {
                    // Computación salón único: los titulares cuidan
                    if (Array.isArray(ev.titularTeachers) && ev.titularTeachers.length > 0) {
                        ev.titularTeachers.forEach(tit => {
                            if (tit.teacherId && workload[tit.teacherId]) {
                                workload[tit.teacherId].minutes += dur;
                                workload[tit.teacherId].salonesCount += 1;
                            }
                        });
                    } else if (ev.courseTeacherId && workload[ev.courseTeacherId]) {
                        workload[ev.courseTeacherId].minutes += dur;
                        workload[ev.courseTeacherId].salonesCount += 1;
                    }
                } else {
                    // Regular o Computación dividida
                    if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                        ev.sections.forEach(sec => {
                            const secDur = parseInt(sec.durationMinutes, 10) || dur;
                            ['groupA', 'groupB'].forEach(grpKey => {
                                const grp = sec[grpKey];
                                if (grp && grp.caretakerTeacherId && workload[grp.caretakerTeacherId]) {
                                    workload[grp.caretakerTeacherId].minutes += secDur;
                                    workload[grp.caretakerTeacherId].salonesCount += 1;
                                }
                            });
                        });
                    } else {
                        ['groupA', 'groupB'].forEach(grpKey => {
                            const grp = ev[grpKey];
                            if (grp && grp.caretakerTeacherId && workload[grp.caretakerTeacherId]) {
                                workload[grp.caretakerTeacherId].minutes += dur;
                                workload[grp.caretakerTeacherId].salonesCount += 1;
                            }
                        });
                    }
                }
            });
        }
        return workload;
    }

    // Dividir la nómina de estudiantes en Grupo A y Grupo B automáticamente (Estrictamente por Sección)
    function splitStudentsInTwoGroups(gradeCode, targetSection = null, targetGradeName = null) {
        const rawCode = (gradeCode || '').trim();
        let targetSec = (targetSection || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase();
        let targetGrade = (targetGradeName || '').trim().toUpperCase();
        const codeUpper = rawCode.toUpperCase();

        // 1. Resolver sección y grado mediante gradesList si existen
        const gradesList = (STATE && STATE.gradesList) || [];
        const foundG = gradesList.find(g => 
            (g.id && g.id.toUpperCase() === codeUpper) || 
            (g.code && g.code.toUpperCase() === codeUpper) ||
            ((g.name && g.name.toUpperCase() === codeUpper) && (!targetSec || (g.section && g.section.toUpperCase().includes(targetSec))))
        );

        if (foundG) {
            if (!targetSec && foundG.section) {
                targetSec = (foundG.section || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase();
            }
            if (!targetGrade && foundG.name) {
                targetGrade = (foundG.name || '').trim().toUpperCase();
            }
        }

        // 2. Extraer letra de sección (A, B, C, D) del código si aún no se tiene
        if (!targetSec) {
            const letterMatch = codeUpper.match(/\b([A-D])\b/) || codeUpper.match(/SECCI[OÓ]N\s*([A-D])/);
            if (letterMatch) targetSec = letterMatch[1];
        }

        // 3. Extraer número de grado (4, 5, 6)
        let targetNum = '';
        if (targetGrade.includes('4') || codeUpper.includes('4')) targetNum = '4';
        else if (targetGrade.includes('5') || codeUpper.includes('5')) targetNum = '5';
        else if (targetGrade.includes('6') || codeUpper.includes('6')) targetNum = '6';

        const students = (STATE.students || []).filter(s => {
            const isRetired = s.status === 'Retirado' || s.status === 'retirado';
            if (isRetired) return false;

            // Extraer y normalizar los datos del estudiante
            const stuSec = (s.section || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase();
            const stuCodeUpper = (s.gradeCode || '').trim().toUpperCase();
            const stuGradeUpper = (s.grade || '').trim().toUpperCase();

            // Identificar letra de sección del estudiante
            let stuSecLetter = stuSec;
            if (!stuSecLetter) {
                const sMatch = stuCodeUpper.match(/\b([A-D])\b/) || stuCodeUpper.match(/SECCI[OÓ]N\s*([A-D])/);
                if (sMatch) stuSecLetter = sMatch[1];
            }

            // Identificar número de grado del estudiante
            let stuNum = '';
            const fullStuGradeStr = stuGradeUpper + ' ' + stuCodeUpper;
            if (fullStuGradeStr.includes('4')) stuNum = '4';
            else if (fullStuGradeStr.includes('5')) stuNum = '5';
            else if (fullStuGradeStr.includes('6')) stuNum = '6';

            // Coincidencia exacta por ID de grado (ej. '4PC' cuando los estudiantes tienen s.gradeCode === '4PC')
            if (s.gradeCode === rawCode || s.grade === rawCode) return true;

            // REGLA FUNDAMENTAL: Si se conoce la sección objetivo, el estudiante DEBE pertenecer a esa sección
            if (targetSec && targetNum) {
                const secMatches = (stuSecLetter === targetSec);
                const gradeMatches = (stuNum === targetNum);
                return secMatches && gradeMatches;
            }

            // Si se conoce la sección pero no el grado
            if (targetSec) {
                return (stuSecLetter === targetSec);
            }

            return false;
        });

        // Ordenar alfabéticamente por apellido y nombres completos
        students.sort((a, b) => {
            const nameA = ((a.lastName || '') + ' ' + (a.firstName || '') + ' ' + (a.name || '')).trim().toLowerCase();
            const nameB = ((b.lastName || '') + ' ' + (b.firstName || '') + ' ' + (b.name || '')).trim().toLowerCase();
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        const total = students.length;
        const mid = Math.ceil(total / 2);
        const groupA = students.slice(0, mid);
        const groupB = students.slice(mid);

        return {
            total,
            groupA,
            groupB,
            rangeA: total > 0 ? `01 al ${String(mid).padStart(2, '0')}` : 'Sin alumnos',
            rangeB: total > mid ? `${String(mid + 1).padStart(2, '0')} al ${String(total).padStart(2, '0')}` : 'Sin alumnos'
        };
    }

    /**
     * Catálogo oficial de los 20 salones disponibles en el establecimiento:
     * Secuencia institucional por antigüedad académica:
     * 1. Salones de 6to Perito (Salón 6A, Salón 6B...)
     * 2. Salones de 5to Perito (Salón 5A, Salón 5B, Salón 5C, Salón 5D...)
     * 3. Salones de 4to Perito (Salón 4A, Salón 4B, Salón 4C, Salón 4D...)
     * 4. Salones adicionales disponibles hasta completar los 20 salones físicos.
     */
    function getInstitutionalSalonsList() {
        const salons = [];
        const seen = new Set();

        function addSalon(name) {
            const clean = name.trim();
            if (!seen.has(clean) && salons.length < 20) {
                seen.add(clean);
                salons.push(clean);
            }
        }

        // 1. Salones de 6to
        const grades6 = (STATE.gradesList || []).filter(g => (g.name || g.code || '').toUpperCase().includes('6'));
        grades6.sort((a, b) => (a.section || '').localeCompare(b.section || '', 'es'));
        if (grades6.length > 0) {
            grades6.forEach(g => {
                const sec = (g.section || 'A').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase() || 'A';
                addSalon(`Salón 6${sec}`);
            });
        } else {
            addSalon('Salón 6A');
            addSalon('Salón 6B');
        }

        // 2. Salones de 5to
        const grades5 = (STATE.gradesList || []).filter(g => (g.name || g.code || '').toUpperCase().includes('5'));
        grades5.sort((a, b) => (a.section || '').localeCompare(b.section || '', 'es'));
        if (grades5.length > 0) {
            grades5.forEach(g => {
                const sec = (g.section || 'A').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase() || 'A';
                addSalon(`Salón 5${sec}`);
            });
        } else {
            addSalon('Salón 5A');
            addSalon('Salón 5B');
            addSalon('Salón 5C');
            addSalon('Salón 5D');
        }

        // 3. Salones de 4to
        const grades4 = (STATE.gradesList || []).filter(g => (g.name || g.code || '').toUpperCase().includes('4'));
        grades4.sort((a, b) => (a.section || '').localeCompare(b.section || '', 'es'));
        if (grades4.length > 0) {
            grades4.forEach(g => {
                const sec = (g.section || 'A').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase() || 'A';
                addSalon(`Salón 4${sec}`);
            });
        } else {
            addSalon('Salón 4A');
            addSalon('Salón 4B');
            addSalon('Salón 4C');
            addSalon('Salón 4D');
        }

        // 4. Salones adicionales hasta totalizar 20 salones
        let extraNum = 11;
        while (salons.length < 20) {
            const extraName = `Salón ${extraNum}`;
            if (!seen.has(extraName)) {
                addSalon(extraName);
            }
            extraNum++;
        }

        return salons;
    }

    // Obtener los Grados Académicos Consolidados (sin separar por sección)
    function getDistinctAcademicGrades() {
        const map = new Map();
        (STATE.gradesList || []).forEach(g => {
            let baseName = (g.name || g.code || '').trim();
            baseName = baseName.replace(/\s+Secci[oó]n\s+[A-D]/i, '').replace(/\s+[A-D]$/i, '').trim();
            if (baseName && !map.has(baseName)) {
                map.set(baseName, {
                    baseName: baseName,
                    career: g.career || 'Ciclo Diversificado'
                });
            }
        });

        // Respaldo desde pensum si gradesList estuviera vacío
        if (map.size === 0) {
            (STATE.pensum || []).forEach(p => {
                let baseName = (p.grade || '').trim();
                baseName = baseName.replace(/\s+Secci[oó]n\s+[A-D]/i, '').replace(/\s+[A-D]$/i, '').trim();
                if (baseName && !map.has(baseName)) {
                    map.set(baseName, {
                        baseName: baseName,
                        career: 'Ciclo Diversificado'
                    });
                }
            });
        }

        return Array.from(map.values());
    }

    // Obtener las materias únicas para un Grado Académico consolidado
    function getCoursesForAcademicGrade(academicGradeName) {
        if (!academicGradeName) return [];
        const term = academicGradeName.toUpperCase().trim();
        const seen = new Set();
        const courses = [];

        (STATE.pensum || []).forEach(p => {
            const rawP = ((p.grade || '') + ' ' + (p.gradeCode || '')).toUpperCase();
            if (rawP.includes(term) || (p.grade && p.grade.toUpperCase().trim() === term)) {
                const sub = (p.subject || '').trim();
                if (sub && !seen.has(sub.toUpperCase())) {
                    seen.add(sub.toUpperCase());
                    courses.push(sub);
                }
            }
        });

        courses.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        return courses;
    }

    // Obtener todas las secciones y sus catedráticos titulares para una materia y grado
    function getSectionsAndTitularsForCourse(academicGradeName, subjectName) {
        if (!academicGradeName || !subjectName) return [];
        const term = academicGradeName.toUpperCase().trim();
        const subTerm = subjectName.trim().toUpperCase();

        // 1. Identificar grados/secciones coincidentes en gradesList
        let matchingGrades = (STATE.gradesList || []).filter(g => {
            let base = (g.name || g.code || '').replace(/\s+Secci[oó]n\s+[A-D]/i, '').replace(/\s+[A-D]$/i, '').trim().toUpperCase();
            return base === term || ((g.name || '').toUpperCase().includes(term));
        });

        // Si no hay en gradesList, deducir secciones desde pensum
        if (matchingGrades.length === 0) {
            const seenSecs = new Set();
            (STATE.pensum || []).forEach(p => {
                const rawP = ((p.grade || '') + ' ' + (p.gradeCode || '')).toUpperCase();
                if (rawP.includes(term)) {
                    const sec = (p.section || 'Sección A').trim();
                    if (!seenSecs.has(sec)) {
                        seenSecs.add(sec);
                        matchingGrades.push({
                            code: p.gradeCode || `${academicGradeName} ${sec}`,
                            name: academicGradeName,
                            section: sec
                        });
                    }
                }
            });
        }

        // Ordenar secciones alfabéticamente (Sección A, Sección B...)
        matchingGrades.sort((a, b) => (a.section || '').localeCompare(b.section || '', 'es'));

        const sectionsInfo = [];

        matchingGrades.forEach(g => {
            const secLetter = (g.section || '').replace(/Secci[oó]n\s*/i, '').trim() || 'A';
            const pMatch = (STATE.pensum || []).find(p => {
                const rawP = ((p.grade || '') + ' ' + (p.gradeCode || '') + ' ' + (p.section || '')).toUpperCase();
                const subMatch = (p.subject || '').trim().toUpperCase() === subTerm;
                const secMatch = rawP.includes(secLetter) || (p.gradeCode === g.code);
                return subMatch && secMatch;
            });

            sectionsInfo.push({
                gradeCode: g.code || g.id,
                gradeName: g.name || academicGradeName,
                section: g.section || ('Sección ' + secLetter),
                sectionLetter: secLetter,
                courseId: pMatch ? pMatch.id : '',
                teacherId: pMatch ? pMatch.teacherId : '',
                teacherName: pMatch ? pMatch.teacher : 'Sin docente asignado'
            });
        });

        return sectionsInfo;
    }

    // =========================================================================
    // VISTA PRINCIPAL DEL MÓDULO (PANEL DE AUXILIATURA)
    // =========================================================================
    function renderExamSchedulesView() {
        injectExamScheduleStyles();
        const container = document.getElementById('view-exam-schedules');
        if (!container) return;

        // Blindaje defensivo de acceso
        if (!hasExamScheduleAccess()) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px 20px; color:#64748b;">
                    <i class="fa-solid fa-lock" style="font-size:3rem; color:#dc2626; margin-bottom:15px; display:block;"></i>
                    <h3 style="color:#0f172a; margin-bottom:8px;">Acceso Restringido</h3>
                    <p>El Módulo de Roles de Exámenes y Cuido de Evaluaciones es exclusivo para Auxiliatura, Dirección y Secretaría.</p>
                </div>
            `;
            return;
        }

        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        const bimesterLabels = {
            'BIM1': 'I Bimestre',
            'BIM2': 'II Bimestre',
            'BIM3': 'III Bimestre',
            'BIM4': 'IV Bimestre'
        };

        let html = `
            <div class="exam-sched-card">
                <!-- BARRA SUPERIOR: TÍTULO Y CENTRO DE IMPRESIÓN Y ACCIÓN RÁPIDA -->
                <div class="exam-quick-actions-bar">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="background:#f0fdf4; color:#15803d; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; border:1px solid #bbf7d0;">
                            <i class="fa-solid fa-calendar-check"></i>
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:1.25rem; font-weight:800; color:#0f172a;">
                                Roles de Evaluaciones y Salones
                            </h2>
                            <p style="margin:2px 0 0 0; color:#64748b; font-size:0.82rem;">
                                Auxiliatura General ─ Cuido equitativo, salones automáticos y medias listas oficiales.
                            </p>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:6px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:4px 8px;">
                            <label style="font-weight:700; font-size:0.82rem; color:#475569; margin:0;">Bimestre:</label>
                            <select id="examBimesterSelect" class="form-control form-control-sm" style="width:130px; font-weight:800; border:none; background:transparent; padding:2px 4px;" onchange="window.changeExamBimester(this.value)">
                                <option value="BIM1" ${bimesterSelectVal === 'BIM1' ? 'selected' : ''}>I Bimestre</option>
                                <option value="BIM2" ${bimesterSelectVal === 'BIM2' ? 'selected' : ''}>II Bimestre</option>
                                <option value="BIM3" ${bimesterSelectVal === 'BIM3' ? 'selected' : ''}>III Bimestre</option>
                                <option value="BIM4" ${bimesterSelectVal === 'BIM4' ? 'selected' : ''}>IV Bimestre</option>
                            </select>
                        </div>

                        <!-- CENTRO DE IMPRESIÓN CONSOLIDADO -->
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-primary" onclick="window.printAllNominasOfBimester()" style="background:#1d4ed8; border-color:#1e40af; font-weight:700; font-size:0.86rem; padding:7px 14px;" title="Imprimir de una sola vez todas las nóminas (medias listas) de evaluaciones de este bimestre">
                                <i class="fa-solid fa-print"></i> Imprimir Todas las Nóminas
                            </button>
                            <button type="button" class="btn btn-outline-primary" onclick="window.printConsolidatedCalendarPdf()" style="font-weight:700; font-size:0.86rem; background:#eff6ff;" title="Descargar o imprimir calendario completo en PDF">
                                <i class="fa-solid fa-file-pdf"></i> Calendario General
                            </button>
                        </div>

                        <button type="button" class="btn btn-success" onclick="window.addNewExamDayModal()" style="background:#15803d; border-color:#166534; font-weight:700; font-size:0.86rem; padding:7px 14px;">
                            <i class="fa-solid fa-plus"></i> Nuevo Día
                        </button>
                    </div>
                </div>

                <!-- CONTENEDOR DE DÍAS CONFIGURADOS -->
                <div id="examDaysListContainer">
        `;

        if (!scheduleBlock.days || scheduleBlock.days.length === 0) {
            html += `
                <div style="text-align:center; padding:45px 20px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:12px;">
                    <i class="fa-solid fa-calendar-plus" style="font-size:2.5rem; color:#94a3b8; margin-bottom:12px; display:block;"></i>
                    <h4 style="color:#1e293b; margin-bottom:6px;">No hay fechas de evaluación configuradas para este bimestre</h4>
                    <p style="color:#64748b; font-size:0.9rem; max-width:500px; margin:0 auto 16px auto;">
                        Haga clic en <strong>"Agregar Día de Examen"</strong> para fijar las fechas de evaluación, seleccionar materias y asignar salones y cuidadores.
                    </p>
                    <button type="button" class="btn btn-primary" onclick="window.addNewExamDayModal()" style="background:#15803d; font-weight:700;">
                        <i class="fa-solid fa-plus"></i> Configurar Primer Día
                    </button>
                </div>
            `;
        } else {
            // Renderizar cada día programado
            scheduleBlock.days.forEach((dayObj, dayIdx) => {
                html += renderSingleDayCardHtml(scheduleBlock, dayObj, dayIdx);
            });
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Renderizar tarjeta individual de un día
    function renderSingleDayCardHtml(scheduleBlock, dayObj, dayIdx) {
        const workload = calculateTeacherWorkloadForDate(scheduleBlock, dayObj.date);
        const dayDateFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        let html = `
            <div class="exam-day-banner" style="${dayObj.isPracticaDay ? 'background:linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);' : ''}">
                <div>
                    <span style="text-transform:uppercase; font-size:0.75rem; letter-spacing:0.5px; opacity:0.9; font-weight:800;">
                        ${dayObj.isPracticaDay ? '⭐ JORNADA EXCLUSIVA DE PRÁCTICA SUPERVISADA' : '🗓️ JORNADA DE EVALUACIONES'}
                    </span>
                    <h3 style="margin:2px 0 0 0; font-size:1.15rem; font-weight:800; color:#ffffff; text-transform:capitalize;">
                        ${dayDateFormatted}
                    </h3>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-light" onclick="window.printDailyScheduleOficio('${dayObj.id}')" style="font-weight:700; color:#0f172a;" title="Imprimir Horario Oficial en Hoja Oficio (3 Columnas)">
                        <i class="fa-solid fa-print"></i> Horario Hoja Oficio (3 Col.)
                    </button>
                    <button type="button" class="btn btn-sm btn-light" onclick="window.printAllMediasListasOfDay('${dayObj.id}')" style="font-weight:700; color:#0f172a;" title="Imprimir todas las nóminas (medias listas) de esta jornada">
                        <i class="fa-solid fa-file-signature"></i> Imprimir Nóminas del Día
                    </button>
                    <button type="button" class="btn btn-sm btn-light" onclick="window.addEvaluationToDay('${dayObj.id}')" style="font-weight:700; color:#15803d;" title="Agregar otra evaluación a este día">
                        <i class="fa-solid fa-plus"></i> Asignar Clase
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteExamDay('${dayObj.id}')" style="font-weight:700; padding:4px 8px;" title="Eliminar este día">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <!-- BARRA DE EQUIDAD DOCENTE (ANTIFATIGA) PARA ESTE DÍA -->
            <div style="background:#f1f5f9; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:0.82rem; border:1px solid #e2e8f0;">
                <div style="font-weight:800; color:#334155; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-scale-balanced" style="color:#0284c7;"></i>
                    Matriz de Equidad y Cargas de Cuido (Docentes asignados hoy):
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:4px;">
        `;

        const activeTeachersToday = Object.values(workload).filter(t => t.minutes > 0);
        if (activeTeachersToday.length === 0) {
            html += `<span style="color:#64748b; font-style:italic;">Aún no hay cuidadores asignados para esta fecha.</span>`;
        } else {
            activeTeachersToday.forEach(t => {
                let chipClass = 'chip-green';
                if (t.minutes > 180) chipClass = 'chip-red';
                else if (t.minutes > 120) chipClass = 'chip-orange';
                else if (t.minutes > 60) chipClass = 'chip-yellow';

                html += `
                    <span class="exam-teacher-chip ${chipClass}" title="${t.name}: ${t.minutes} minutos (${t.salonesCount} salones)">
                        <i class="fa-solid fa-user-check"></i> ${t.name}: <strong>${t.minutes} min</strong> (${t.salonesCount} sal.)
                    </span>
                `;
            });
        }

        html += `
                </div>
            </div>

            <!-- LISTADO DE EVALUACIONES PROGRAMADAS EN ESTE DÍA -->
            <div style="margin-bottom:24px;">
        `;

        if (!dayObj.evaluations || dayObj.evaluations.length === 0) {
            html += `
                <div style="padding:20px; text-align:center; color:#64748b; font-size:0.88rem; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
                    No hay asignaturas programadas en este día. Haga clic en <strong>"Asignar Clase"</strong>.
                </div>
            `;
        } else {
            dayObj.evaluations.forEach((ev, evIdx) => {
                html += renderEvaluationItemHtml(dayObj, ev, evIdx);
            });
        }

        html += `
            </div>
        `;
        return html;
    }

    // Renderizar una evaluación específica dentro de un día
    function renderEvaluationItemHtml(dayObj, ev, evIdx) {
        const isLimitExceeded = timeStringToMinutes(ev.endTime) > 750; // > 12:30 PM (750 min)
        const isPractica = ev.isPractica === true;

        let html = `
            <div class="exam-item-box ${isPractica ? 'exam-item-practica' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span class="exam-badge-time ${isLimitExceeded ? 'limit-warn' : ''}">
                                <i class="fa-solid fa-clock"></i> ${ev.startTime} a ${ev.endTime} hrs
                            </span>
                            <span style="font-size:0.82rem; font-weight:800; background:#e2e8f0; color:#334155; padding:3px 8px; border-radius:4px;">
                                ⏱️ Duración: ${ev.durationMinutes} min
                            </span>
                            ${isLimitExceeded ? '<span style="color:#dc2626; font-size:0.8rem; font-weight:800;"><i class="fa-solid fa-triangle-exclamation"></i> ¡EXCEDE LAS 12:30 PM!</span>' : ''}
                        </div>
                        <h4 style="margin:2px 0; font-size:1.05rem; font-weight:800; color:#0f172a;">
                            ${ev.gradeName || ev.gradeCode} ─ ${ev.courseName}
                        </h4>
                        <div style="font-size:0.84rem; color:#475569;">
                            👤 <strong>Catedrático Titular:</strong> ${ev.courseTeacherName || 'Sin asignar'}
                            ${isPractica ? '<span style="color:#1d4ed8; font-weight:800; margin-left:8px;">(⭐ Práctica Supervisada - Relevo a los ' + Math.round(ev.durationMinutes / 2) + ' min)</span>' : ''}
                            ${ev.isComputacion ? '<span style="color:#0284c7; font-weight:800; margin-left:8px;">(💻 Laboratorio de Computación)</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.printMediasListasModal('${dayObj.id}', '${ev.id}')" title="Imprimir Medias Listas de este examen">
                            <i class="fa-solid fa-print"></i> Imprimir Medias Listas
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.editEvaluationModal('${dayObj.id}', '${ev.id}')" title="Editar asignación">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.deleteEvaluation('${dayObj.id}', '${ev.id}')" title="Quitar clase">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <!-- DETALLE DE DISTRIBUCIÓN DE SALONES Y CUIDADORES EN FORMATO COMPACTO -->
                <div style="margin-top:12px; overflow-x:auto;">
        `;

        if (isPractica) {
            // Práctica Supervisada: Relevo en ambos salones
            const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
            html += `
                <table class="exam-compact-table">
                    <thead>
                        <tr>
                            <th style="width:18%;">Distribución</th>
                            <th style="width:22%;">Horario y Relevo</th>
                            <th style="width:30%;">Salón y Cuidador Turno 1 (${ev.startTime} a ${relevoTime})</th>
                            <th style="width:30%;">Salón y Cuidador Turno 2 (${relevoTime} a ${ev.endTime})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong style="color:#1d4ed8;">Salón Grupo A</strong><br><span style="font-size:0.75rem; color:#64748b;">${ev.groupA.range || '1 a N/2'}</span></td>
                            <td><span class="badge" style="background:#dbeafe; color:#1e40af; font-weight:800;">${ev.startTime} - ${ev.endTime}</span> (${ev.durationMinutes} min)</td>
                            <td><strong>🏫 ${ev.groupA.classroom || 'Salón 1'}</strong><br><span style="color:#334155;">👤 ${ev.groupA.caretakerTeacherName || 'Sin asignar'}</span></td>
                            <td><strong>🏫 ${ev.groupA.classroom || 'Salón 1'}</strong><br><span style="color:#334155;">👤 ${ev.groupA.caretakerTurn2Name || 'Sin asignar'}</span></td>
                        </tr>
                        <tr>
                            <td><strong style="color:#1d4ed8;">Salón Grupo B</strong><br><span style="font-size:0.75rem; color:#64748b;">${ev.groupB.range || 'N/2+1 a N'}</span></td>
                            <td><span class="badge" style="background:#dbeafe; color:#1e40af; font-weight:800;">${ev.startTime} - ${ev.endTime}</span> (${ev.durationMinutes} min)</td>
                            <td><strong>🏫 ${ev.groupB.classroom || 'Salón 2'}</strong><br><span style="color:#334155;">👤 ${ev.groupB.caretakerTeacherName || 'Sin asignar'}</span></td>
                            <td><strong>🏫 ${ev.groupB.classroom || 'Salón 2'}</strong><br><span style="color:#334155;">👤 ${ev.groupB.caretakerTurn2Name || 'Sin asignar'}</span></td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else if (ev.isComputacion && ev.computacionMode === 'single') {
            html += `
                <div class="p-3 rounded" style="background:#f0f9ff; border:1.5px solid #bae6fd; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong style="color:#0369a1; font-size:0.95rem; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-laptop-code"></i> Laboratorio de Computación ─ Grupo Único (Todas las Secciones)
                        </strong>
                        <div style="font-size:0.83rem; color:#334155; margin-top:2px;">
                            Catedráticos evaluadores y cuidadores: <strong>${ev.courseTeacherName}</strong> (Docentes Titulares Autorizados)
                        </div>
                    </div>
                    <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.82rem; font-weight:800; padding:6px 12px; border:1px solid #7dd3fc;">
                        ⏱️ ${ev.startTime} a ${ev.endTime} (${ev.durationMinutes} min)
                    </span>
                </div>
            `;
        } else if (Array.isArray(ev.sections) && ev.sections.length > 0) {
            // Renderizar tabla unificada y compacta para todas las secciones
            html += `
                <table class="exam-compact-table">
                    <thead>
                        <tr>
                            <th style="width:12%;">Sección</th>
                            <th style="width:18%;">Horario / Tiempo</th>
                            <th style="width:35%;">Salón Grupo A (1 a Mitad)</th>
                            <th style="width:35%;">Salón Grupo B (Mitad a Fin)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            ev.sections.forEach(sec => {
                const secDur = sec.durationMinutes || ev.durationMinutes;
                const secStart = ev.startTime;
                const secEnd = minutesToTimeString(timeStringToMinutes(secStart) + secDur);
                html += `
                        <tr>
                            <td>
                                <strong style="color:#15803d; font-size:0.95rem;">${sec.section}</strong>
                            </td>
                            <td>
                                <span style="font-weight:800; color:#0f172a;">${secStart} - ${secEnd}</span>
                                <div style="font-size:0.75rem; color:#64748b; font-weight:700;">⏱️ ${secDur} min</div>
                            </td>
                            <td>
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                                    <span class="badge" style="background:#f1f5f9; color:#0f172a; font-size:0.8rem; font-weight:800; border:1px solid #cbd5e1;">
                                        🏫 ${sec.groupA.classroom || 'Salón 1'}
                                    </span>
                                    <span style="font-size:0.73rem; color:#64748b; font-weight:700;">${sec.groupA.range || 'Mitad A'}</span>
                                </div>
                                <div style="margin-top:4px; font-size:0.82rem; color:#334155;">
                                    👤 <strong>Cuida:</strong> ${sec.groupA.caretakerTeacherName || 'Sin asignar'}
                                </div>
                            </td>
                            <td>
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                                    <span class="badge" style="background:#f1f5f9; color:#0f172a; font-size:0.8rem; font-weight:800; border:1px solid #cbd5e1;">
                                        🏫 ${sec.groupB.classroom || 'Salón 2'}
                                    </span>
                                    <span style="font-size:0.73rem; color:#64748b; font-weight:700;">${sec.groupB.range || 'Mitad B'}</span>
                                </div>
                                <div style="margin-top:4px; font-size:0.82rem; color:#334155;">
                                    👤 <strong>Cuida:</strong> ${sec.groupB.caretakerTeacherName || 'Sin asignar'}
                                </div>
                            </td>
                        </tr>
                `;
            });
            html += `
                    </tbody>
                </table>
            `;
        } else {
            // Fallback de retrocompatibilidad
            html += `
                <table class="exam-compact-table">
                    <thead>
                        <tr>
                            <th style="width:20%;">Grupo</th>
                            <th style="width:20%;">Horario</th>
                            <th style="width:30%;">Salón Asignado</th>
                            <th style="width:30%;">Docente Cuidador</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Grupo A</strong> (${ev.groupA.range || '1 a N/2'})</td>
                            <td><span style="font-weight:800;">${ev.startTime} - ${ev.endTime}</span></td>
                            <td><strong>🏫 ${ev.groupA.classroom || 'Salón 1'}</strong></td>
                            <td>👤 ${ev.groupA.caretakerTeacherName || 'Sin asignar'}</td>
                        </tr>
                        <tr>
                            <td><strong>Grupo B</strong> (${ev.groupB.range || 'N/2+1 a N'})</td>
                            <td><span style="font-weight:800;">${ev.startTime} - ${ev.endTime}</span></td>
                            <td><strong>🏫 ${ev.groupB.classroom || 'Salón 2'}</strong></td>
                            <td>👤 ${ev.groupB.caretakerTeacherName || 'Sin asignar'}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        html += `
                </div>
            </div>
        `;
        return html;
    }

    // =========================================================================
    // MODALES Y ACCIONES DEL USUARIO
    // =========================================================================
    window.changeExamBimester = function (bim) {
        window._currentSelectedExamBim = bim;
        renderExamSchedulesView();
    };

    // Modal para agregar un nuevo día de examen
    window.addNewExamDayModal = function () {
        const today = new Date().toISOString().split('T')[0];
        const modalId = 'modalAddNewExamDay';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div class="exam-modal-overlay" id="${modalId}" onclick="if(event.target===this) document.getElementById('${modalId}').remove()">
                <div class="exam-modal-box">
                    <div style="background:#15803d; color:white; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; border-radius:14px 14px 0 0;">
                        <h4 style="margin:0; font-size:1.1rem; font-weight:800; display:flex; align-items:center; gap:8px; color:#ffffff;">
                            <i class="fa-solid fa-calendar-plus"></i> Programar Nuevo Día de Examen
                        </h4>
                        <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer; line-height:1; padding:0 4px;">&times;</button>
                    </div>
                    <div style="padding:22px;">
                        <div class="form-group mb-3">
                            <label class="form-label" style="font-weight:700; color:#1e293b; display:block; margin-bottom:6px;">Fecha de Evaluación:</label>
                            <input type="date" id="newExamDayDate" class="form-control" value="${today}" required style="height:42px; font-weight:700; font-size:0.95rem;">
                        </div>
                        <div class="form-check p-3 rounded" style="background:#eff6ff; border:1px solid #bfdbfe; margin-bottom:10px;">
                            <input class="form-check-input" type="checkbox" id="newExamDayIsPractica" style="margin-top:4px;">
                            <label class="form-check-label ms-2" for="newExamDayIsPractica" style="font-weight:700; color:#1d4ed8; cursor:pointer;">
                                ⭐ Es Jornada Exclusiva de Práctica Supervisada (Graduandos)
                            </label>
                            <small class="text-muted d-block ms-4 mt-1" style="font-size:0.8rem; line-height:1.4;">
                                En este día solo se evaluará Práctica Supervisada en horario continuo de 07:30 a 12:30 con relevo de catedráticos a mitad de jornada (10:00 AM).
                            </small>
                        </div>
                    </div>
                    <div style="padding:14px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px; border-radius:0 0 14px 14px;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()" style="font-weight:700;">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="window.confirmAddNewExamDay()" style="background:#15803d; border-color:#166534; font-weight:700; padding:8px 18px;">
                            <i class="fa-solid fa-check"></i> Crear Día
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.confirmAddNewExamDay = function () {
        const dateInput = document.getElementById('newExamDayDate');
        const isPractica = document.getElementById('newExamDayIsPractica').checked;
        if (!dateInput || !dateInput.value) {
            alert("Por favor seleccione una fecha válida.");
            return;
        }

        const dateVal = dateInput.value;
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        // Evitar fechas duplicadas
        if (scheduleBlock.days.some(d => d.date === dateVal)) {
            alert("Esta fecha ya se encuentra programada en este bimestre.");
            return;
        }

        const dayId = 'day_' + Date.now();
        scheduleBlock.days.push({
            id: dayId,
            date: dateVal,
            isPracticaDay: isPractica,
            evaluations: []
        });

        // Ordenar días por fecha cronológicamente
        scheduleBlock.days.sort((a, b) => a.date.localeCompare(b.date));

        saveExamSchedulesData(true);
        document.getElementById('modalAddNewExamDay').remove();
        renderExamSchedulesView();
    };

    window.deleteExamDay = function (dayId) {
        if (!confirm("¿Está seguro de eliminar esta fecha completa de evaluaciones y todas sus asignaciones?")) return;
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        scheduleBlock.days = scheduleBlock.days.filter(d => d.id !== dayId);
        saveExamSchedulesData(true);
        renderExamSchedulesView();
    };

    /**
     * Seleccionar automáticamente y de manera equitativa/aleatoria cuidadores para un curso en el modal.
     * Excluye a todos los titulares de la asignatura en todas las secciones.
     * Evita colisiones de horario en la misma jornada y balancea la carga según los minutos trabajados hoy.
     */
    function autoPickProctorsForModal(sectionsInfo, titularIds, isPrac, startTimeStr, dayId, editEvalId = '') {
        const allCandidates = (STATE.users || []).filter(isTeacherEligibleForProctoring);
        if (allCandidates.length === 0) return {};

        const titularExclusionSet = new Set(Array.isArray(titularIds) ? titularIds : []);

        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = (scheduleBlock.days || []).find(d => d.id === dayId);

        // Carga actual del día (antifatiga)
        const dayWorkload = {};
        allCandidates.forEach(u => {
            const wl = (window._currentDayWorkload && window._currentDayWorkload[u.id]);
            dayWorkload[u.id] = wl ? (wl.minutes || 0) : 0;
        });

        // Intervalos ocupados en otras evaluaciones del mismo día
        const busyIntervals = {};
        allCandidates.forEach(u => { busyIntervals[u.id] = []; });

        if (dayObj && Array.isArray(dayObj.evaluations)) {
            dayObj.evaluations.forEach(ev => {
                if (editEvalId && ev.id === editEvalId) return; // ignorar la misma si se edita
                const evStart = timeStringToMinutes(ev.startTime);

                if (Array.isArray(ev.sections)) {
                    ev.sections.forEach(sc => {
                        const sDur = sc.durationMinutes || ev.durationMinutes || 60;
                        const sEnd = evStart + sDur;
                        ['groupA', 'groupB'].forEach(grpKey => {
                            const grp = sc[grpKey];
                            if (grp) {
                                if (grp.caretakerTeacherId && busyIntervals[grp.caretakerTeacherId]) {
                                    busyIntervals[grp.caretakerTeacherId].push([evStart, sEnd]);
                                }
                                if (grp.caretakerTurn2Id && busyIntervals[grp.caretakerTurn2Id]) {
                                    busyIntervals[grp.caretakerTurn2Id].push([evStart + Math.round(sDur / 2), sEnd]);
                                }
                            }
                        });
                    });
                } else {
                    const evDur = ev.durationMinutes || 60;
                    const evEnd = evStart + evDur;
                    ['groupA', 'groupB'].forEach(grpKey => {
                        const grp = ev[grpKey];
                        if (grp && grp.caretakerTeacherId && busyIntervals[grp.caretakerTeacherId]) {
                            busyIntervals[grp.caretakerTeacherId].push([evStart, evEnd]);
                        }
                    });
                }
            });
        }

        const startMin = timeStringToMinutes(startTimeStr || '07:30');
        const assignedInSlot = new Set();
        const assignedInTurn2 = new Set();
        const assignments = {};

        function pickCaretaker(slotStart, slotEnd, assignedSet) {
            const slotDur = slotEnd - slotStart;
            const eligible = allCandidates.filter(c => {
                if (titularExclusionSet.has(c.id)) return false;
                if (assignedSet.has(c.id)) return false;
                const intervals = busyIntervals[c.id] || [];
                return !intervals.some(([bStart, bEnd]) => Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd));
            });

            const candidatePool = (eligible.length > 0)
                ? eligible
                : allCandidates.filter(c => !titularExclusionSet.has(c.id) && !assignedSet.has(c.id));

            if (candidatePool.length === 0) return null;

            let minMin = Infinity;
            candidatePool.forEach(c => {
                const m = dayWorkload[c.id] || 0;
                if (m < minMin) minMin = m;
            });

            const lowestGroup = candidatePool.filter(c => (dayWorkload[c.id] || 0) <= minMin + 15);
            // Sorteo aleatorio uniforme (Fisher-Yates)
            for (let i = lowestGroup.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [lowestGroup[i], lowestGroup[j]] = [lowestGroup[j], lowestGroup[i]];
            }

            const chosen = lowestGroup[0];
            assignedSet.add(chosen.id);
            dayWorkload[chosen.id] = (dayWorkload[chosen.id] || 0) + slotDur;
            if (!busyIntervals[chosen.id]) busyIntervals[chosen.id] = [];
            busyIntervals[chosen.id].push([slotStart, slotEnd]);
            return chosen.id;
        }

        sectionsInfo.forEach(sInfo => {
            const secCode = sInfo.gradeCode;
            const secDur = 60;
            const secEnd = startMin + secDur;

            if (isPrac) {
                const half = Math.round(300 / 2);
                const t1A = pickCaretaker(startMin, startMin + half, assignedInSlot);
                const t1B = pickCaretaker(startMin, startMin + half, assignedInSlot);
                const t2A = pickCaretaker(startMin + half, startMin + 300, assignedInTurn2);
                const t2B = pickCaretaker(startMin + half, startMin + 300, assignedInTurn2);
                assignments[secCode] = {
                    caretakerA: t1A || '',
                    caretakerB: t1B || '',
                    turn2A: t2A || '',
                    turn2B: t2B || ''
                };
            } else {
                const cA = pickCaretaker(startMin, secEnd, assignedInSlot);
                const cB = pickCaretaker(startMin, secEnd, assignedInSlot);
                assignments[secCode] = {
                    caretakerA: cA || '',
                    caretakerB: cB || '',
                    turn2A: '',
                    turn2B: ''
                };
            }
        });

        return assignments;
    }

    // Modal para asignar una clase a un día (A nivel de Grado Académico completo con todas sus secciones)
    window.addEvaluationToDay = function (dayId, evalToEdit = null) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;

        const modalId = 'modalAddEvaluation';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const academicGrades = getDistinctAcademicGrades();
        const workload = calculateTeacherWorkloadForDate(scheduleBlock, dayObj.date);

        // Guardar contexto en window para interactividad dinámica en el modal
        window._currentDayWorkload = workload;
        window._currentEditingDayId = dayId;
        window._currentEditingEvalId = evalToEdit ? evalToEdit.id : '';

        // Manejador del cambio de duración global / de cátedra
        window.onMasterDurationChanged = function (newDurVal) {
            const dVal = parseInt(newDurVal, 10) || 60;
            const gradeSelect = document.getElementById('evalGradeSelect');
            const courseSelect = document.getElementById('evalCourseSelect');
            const academicGradeName = gradeSelect ? gradeSelect.value : '';
            const courseName = courseSelect ? courseSelect.value : '';
            if (academicGradeName && courseName) {
                const sectionsInfo = getSectionsAndTitularsForCourse(academicGradeName, courseName);
                sectionsInfo.forEach((sInfo, sIdx) => {
                    const secDurSelect = document.getElementById(`evalSectionDuration_${sIdx}`);
                    if (secDurSelect) {
                        secDurSelect.value = String(dVal);
                    }
                });
            }
            window.recalcEvalTimes();
        };

        // Botón rápido para re-sortear y autoasignar cuidadores en caliente dentro del modal
        window.reAutoAssignProctorsModal = function () {
            const courseSelect = document.getElementById('evalCourseSelect');
            if (courseSelect && courseSelect.value) {
                window.onEvalCourseChanged(courseSelect.value, null);
            }
        };

        // Calcular hora de inicio automática según evaluaciones previas
        let autoStartMinutes = 450; // 07:30 AM
        if (dayObj.evaluations && dayObj.evaluations.length > 0 && !evalToEdit) {
            const lastEval = dayObj.evaluations[dayObj.evaluations.length - 1];
            const lastEndMin = timeStringToMinutes(lastEval.endTime);
            autoStartMinutes = Math.min(lastEndMin + (lastEval.recessMinutes || 15), 750); // máx 12:30
        }
        const autoStartTime = minutesToTimeString(autoStartMinutes);

        // Opciones de profesores cuidadores excluyendo a TODOS los titulares de la cátedra
        window._generateTeacherSelectOptions = function (selectedId = '', excludeTeacherIds = []) {
            let opts = `<option value="">-- Seleccionar Cuidador --</option>`;
            const excludeSet = new Set(Array.isArray(excludeTeacherIds) ? excludeTeacherIds : [excludeTeacherIds].filter(Boolean));
            (STATE.users || []).forEach(u => {
                if (isTeacherEligibleForProctoring(u)) {
                    if (excludeSet.has(u.id)) return; // Regla de Oro: Titular(es) excluidos
                    const wl = (window._currentDayWorkload && window._currentDayWorkload[u.id]) || { minutes: 0, salonesCount: 0 };
                    const isSel = u.id === selectedId ? 'selected' : '';
                    opts += `<option value="${u.id}" ${isSel}>${u.name} (Hoy: ${wl.minutes} min | ${wl.salonesCount} sal.)</option>`;
                }
            });
            return opts;
        };

        const modalHtml = `
            <div class="exam-modal-overlay" id="${modalId}" onclick="if(event.target===this) document.getElementById('${modalId}').remove()">
                <div class="exam-modal-box modal-lg-box" style="max-height:92vh; display:flex; flex-direction:column;">
                    <div style="background:#0f172a; color:white; padding:16px 22px; display:flex; align-items:center; justify-content:space-between; border-radius:14px 14px 0 0; flex-shrink:0;">
                        <h4 style="margin:0; font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px; color:#ffffff;">
                            <i class="fa-solid fa-file-pen" style="color:#22c55e;"></i> ${evalToEdit ? 'Editar Evaluación a Nivel de Grado' : 'Asignar Asignatura y Cuidadores (Todas las Secciones)'}
                        </h4>
                        <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer; line-height:1; padding:0 4px;">&times;</button>
                    </div>
                    <div style="padding:22px; overflow-y:auto; flex:1;">
                        <form id="formAddEval">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label" style="font-weight:700;">Grado Académico (Aplica a todas las secciones):</label>
                                    <select id="evalGradeSelect" class="form-control" onchange="window.onEvalGradeChanged(this.value)" required>
                                        <option value="">-- Seleccione Grado --</option>
                                        ${academicGrades.map(g => `<option value="${g.baseName}">${g.baseName}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label" style="font-weight:700;">Asignatura a Evaluar:</label>
                                    <select id="evalCourseSelect" class="form-control" onchange="window.onEvalCourseChanged(this.value)" required>
                                        <option value="">-- Seleccione primero un grado --</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row g-3 mt-1">
                                <div class="col-12">
                                    <label class="form-label" style="font-weight:700;">Catedráticos Titulares de la Cátedra (Identificados por Sección):</label>
                                    <div id="evalTitularsContainer" style="background:#f1f5f9; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; font-weight:700; color:#334155; font-size:0.9rem;">
                                        Seleccione una materia para listar los catedráticos titulares.
                                    </div>
                                    <input type="hidden" id="evalTitularIdsHidden" value="">
                                </div>
                            </div>

                            <div class="row g-3 mt-1">
                                <div class="col-md-6">
                                    <label class="form-label" style="font-weight:700;">⏱️ Tiempo Fijado por la Cátedra (Minutos):</label>
                                    <select id="evalDurationSelect" class="form-control" onchange="window.onMasterDurationChanged(this.value)" style="font-weight:700;">
                                        <option value="45">45 minutos</option>
                                        <option value="50">50 minutos</option>
                                        <option value="60" selected>60 minutos (1 hora estándar)</option>
                                        <option value="75">75 minutos (1 hora 15 min)</option>
                                        <option value="90">90 minutos (1 hora y media)</option>
                                        <option value="120">120 minutos (2 horas)</option>
                                        <option value="300">300 minutos (5 horas - Práctica Supervisada)</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label" style="font-weight:700;">Receso Posterior:</label>
                                    <select id="evalRecessMinutes" class="form-control">
                                        <option value="0">Sin receso</option>
                                        <option value="10">10 minutos</option>
                                        <option value="15" selected>15 minutos</option>
                                        <option value="20">20 minutos</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row g-3 mt-1 p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
                                <div class="col-md-6">
                                    <label class="form-label" style="font-weight:700;">Hora Inicio:</label>
                                    <input type="time" id="evalStartTime" class="form-control" value="${autoStartTime}" onchange="window.recalcEvalTimes()" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label" style="font-weight:700;">Hora Fin (Calculada):</label>
                                    <input type="time" id="evalEndTime" class="form-control" readonly style="background:#e2e8f0; font-weight:800;">
                                </div>
                                <div id="evalTimeLimitWarning" class="col-12 text-danger font-weight-bold" style="display:none; font-size:0.85rem;">
                                    ⚠️ Advertencia: El horario calculado sobrepasa las 12:30 PM. Ajuste la hora de inicio o la duración.
                                </div>
                            </div>

                            <!-- SECCIÓN MODALIDAD ESPECIAL (COMPUTACIÓN O PRÁCTICA) -->
                            <div id="specialModeSection" class="mt-3"></div>

                            <!-- CONTENEDOR DINÁMICO DE SALONES POR CADA SECCIÓN -->
                            <div id="sectionsSalonsContainer" class="mt-3">
                                <div class="alert alert-secondary p-3 text-center" style="font-size:0.88rem; color:#475569;">
                                    <i class="fa-solid fa-chalkboard-user"></i> Seleccione un grado y una asignatura para configurar los salones y cuidadores de todas las secciones.
                                </div>
                            </div>
                        </form>
                    </div>
                    <div style="padding:14px 22px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px; border-radius:0 0 14px 14px; flex-shrink:0;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()" style="font-weight:700;">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="window.confirmSaveEvaluation('${dayId}', '${evalToEdit ? evalToEdit.id : ''}')" style="background:#15803d; border-color:#166534; font-weight:700; padding:8px 18px;">
                            <i class="fa-solid fa-check"></i> Guardar Asignación
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Inicializar recálculo de horario
        window.recalcEvalTimes();

        // Si se está editando, cargar valores previos
        if (evalToEdit) {
            const gradeName = evalToEdit.academicGradeName || evalToEdit.gradeName || evalToEdit.gradeCode;
            document.getElementById('evalGradeSelect').value = gradeName;
            window.onEvalGradeChanged(gradeName, evalToEdit.courseName, evalToEdit);
            document.getElementById('evalDurationSelect').value = evalToEdit.durationMinutes;
            document.getElementById('evalStartTime').value = evalToEdit.startTime;
            document.getElementById('evalRecessMinutes').value = evalToEdit.recessMinutes || 15;
            window.recalcEvalTimes();
        }
    };

    // Al cambiar de grado, llenar las materias únicas de ese grado académico
    window.onEvalGradeChanged = function (academicGradeName, preselectedCourseName = '', editPayload = null) {
        const courseSelect = document.getElementById('evalCourseSelect');
        const titularsDiv = document.getElementById('evalTitularsContainer');
        const salonsContainer = document.getElementById('sectionsSalonsContainer');
        if (!courseSelect) return;

        if (!academicGradeName) {
            courseSelect.innerHTML = `<option value="">-- Seleccione primero un grado --</option>`;
            if (titularsDiv) titularsDiv.innerHTML = 'Seleccione una materia para listar los catedráticos titulares.';
            if (salonsContainer) salonsContainer.innerHTML = '';
            return;
        }

        const courses = getCoursesForAcademicGrade(academicGradeName);
        let opts = `<option value="">-- Seleccionar Asignatura --</option>`;
        courses.forEach(cName => {
            const isSel = cName === preselectedCourseName ? 'selected' : '';
            opts += `<option value="${cName}" ${isSel}>${cName}</option>`;
        });
        courseSelect.innerHTML = opts;

        if (preselectedCourseName) {
            window.onEvalCourseChanged(preselectedCourseName, editPayload);
        } else {
            if (titularsDiv) titularsDiv.innerHTML = 'Seleccione una materia para listar los catedráticos titulares de todas las secciones.';
            if (salonsContainer) salonsContainer.innerHTML = '';
        }
    };

    // Al cambiar de materia, identificar titulares de todas las secciones y generar salones
    window.onEvalCourseChanged = function (courseName, editPayload = null) {
        const gradeSelect = document.getElementById('evalGradeSelect');
        const academicGradeName = gradeSelect ? gradeSelect.value : '';
        const titularsDiv = document.getElementById('evalTitularsContainer');
        const hiddenTitularIds = document.getElementById('evalTitularIdsHidden');
        const salonsContainer = document.getElementById('sectionsSalonsContainer');
        const durationSelect = document.getElementById('evalDurationSelect');
        const specialSec = document.getElementById('specialModeSection');

        if (!academicGradeName || !courseName) {
            if (titularsDiv) titularsDiv.innerHTML = 'Seleccione una materia para listar los catedráticos titulares.';
            if (hiddenTitularIds) hiddenTitularIds.value = '';
            if (salonsContainer) salonsContainer.innerHTML = '';
            return;
        }

        const sectionsInfo = getSectionsAndTitularsForCourse(academicGradeName, courseName);
        const titularIds = sectionsInfo.map(s => s.teacherId).filter(Boolean);
        if (hiddenTitularIds) hiddenTitularIds.value = JSON.stringify(titularIds);

        // Mostrar titulares detectados por sección
        if (titularsDiv) {
            if (sectionsInfo.length === 0) {
                titularsDiv.innerHTML = `<span style="color:#b91c1c;">⚠️ No se encontraron secciones asignadas para esta materia.</span>`;
            } else {
                titularsDiv.innerHTML = sectionsInfo.map(s => `
                    <div style="display:inline-block; margin-right:16px; margin-bottom:4px;">
                        <span class="badge" style="background:#0f172a; color:#fff; font-size:0.8rem; margin-right:4px;">${s.section}</span>
                        <strong>${s.teacherName}</strong>
                    </div>
                `).join('') + `<div style="font-size:0.78rem; color:#dc2626; margin-top:4px;">
                    🔒 Regla de Oro: Ninguno de estos catedráticos titulares podrá ser asignado como cuidador en este horario.
                </div>`;
            }
        }

        const sUpper = (courseName || '').toUpperCase();
        const isComp = sUpper.includes('COMPUT') || sUpper.includes('INFORM') || sUpper.includes('LABORAT') || sUpper.includes('TIC');
        const isPrac = sUpper.includes('PRÁCTICA SUPERVISADA') || sUpper.includes('PRACTICA SUPERVISADA');

        if (isPrac) {
            if (durationSelect && (!editPayload)) durationSelect.value = '300'; // 5 horas
            if (specialSec) {
                specialSec.innerHTML = `
                    <div class="alert alert-primary p-2" style="font-size:0.85rem;">
                        <i class="fa-solid fa-star"></i> <strong>Modo Práctica Supervisada Detectado:</strong>
                        Se asignarán 2 docentes por salón con relevo exacto a mitad de tiempo para todas las secciones. Los docentes titulares quedan excluidos.
                    </div>
                `;
            }
        } else if (isComp) {
            if (specialSec) {
                specialSec.innerHTML = `
                    <div class="alert alert-info p-2" style="font-size:0.85rem;">
                        <i class="fa-solid fa-laptop-code"></i> <strong>Modo Laboratorio de Computación:</strong>
                        Los catedráticos titulares evalúan y cuidan sus respectivas pruebas en el laboratorio.
                        <div class="mt-1">
                            <label><input type="radio" name="compMode" value="single" checked onchange="window.toggleCompMode(this.value)"> Grupo Único en Laboratorio</label>
                            <label class="ms-3"><input type="radio" name="compMode" value="two_turns" onchange="window.toggleCompMode(this.value)"> 2 Turnos de Lab (Grupo A y B)</label>
                        </div>
                    </div>
                `;
            }
        } else {
            if (specialSec) specialSec.innerHTML = '';
        }

        // Autoasignación automática y equitativa de cuidadores para todas las secciones (100% editable)
        const autoAssignments = (!editPayload) ? autoPickProctorsForModal(
            sectionsInfo,
            titularIds,
            isPrac,
            document.getElementById('evalStartTime') ? document.getElementById('evalStartTime').value : '07:30',
            window._currentEditingDayId,
            window._currentEditingEvalId
        ) : {};

        // Construir tarjetas de salones para CADA sección (Grupo A y Grupo B) con selector de tiempo independiente
        let salonsHtml = `
            <div style="border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-bottom:10px;">
                <h6 style="font-weight:800; color:#15803d; margin:0; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-school"></i> Salones, Cuidadores y Tiempos por Sección
                </h6>
                <div style="font-size:0.8rem; color:#64748b; font-weight:700;">
                    Cada grupo (A y B) contiene exactamente la mitad de los estudiantes de su respectiva sección. Los cuidadores se asignan automáticamente de forma equitativa y pueden modificarse en cualquier momento.
                </div>
            </div>
        `;

        const officialSalons = getInstitutionalSalonsList();
        const salonOptionsDatalist = officialSalons.map(s => `<option value="${s}">`).join('');

        // Determinar índice inicial en los 20 salones según el grado a evaluar
        const gradeText = (academicGradeName || '').toUpperCase();
        let startSalonIdx = 0;
        if (gradeText.includes('6')) {
            startSalonIdx = officialSalons.findIndex(s => s.includes('6')) !== -1 ? officialSalons.findIndex(s => s.includes('6')) : 0;
        } else if (gradeText.includes('5')) {
            startSalonIdx = officialSalons.findIndex(s => s.includes('5')) !== -1 ? officialSalons.findIndex(s => s.includes('5')) : 2;
        } else if (gradeText.includes('4')) {
            startSalonIdx = officialSalons.findIndex(s => s.includes('4')) !== -1 ? officialSalons.findIndex(s => s.includes('4')) : 6;
        }
        let salonCursor = startSalonIdx;

        sectionsInfo.forEach((sInfo, sIdx) => {
            const secCode = sInfo.gradeCode;
            const secName = sInfo.section;
            const splitData = splitStudentsInTwoGroups(secCode, secName, sInfo.gradeName);

            // Valores de salón por defecto según secuencia oficial
            const defaultSalonA = officialSalons[salonCursor % officialSalons.length] || `Salón ${(sIdx * 2) + 1}`;
            salonCursor++;
            const defaultSalonB = officialSalons[salonCursor % officialSalons.length] || `Salón ${(sIdx * 2) + 2}`;
            salonCursor++;

            // Valores previos si estamos editando
            let curA = { classroom: defaultSalonA, caretaker: '', turn2: '' };
            let curB = { classroom: defaultSalonB, caretaker: '', turn2: '' };
            const masterDur = durationSelect ? (parseInt(durationSelect.value, 10) || 60) : 60;
            let secDuration = isPrac ? 300 : masterDur;

            if (editPayload) {
                if (Array.isArray(editPayload.sections)) {
                    const foundSec = editPayload.sections.find(sc => sc.gradeCode === secCode || sc.section === secName);
                    if (foundSec) {
                        secDuration = foundSec.durationMinutes || editPayload.durationMinutes || secDuration;
                        if (foundSec.groupA) {
                            curA.classroom = foundSec.groupA.classroom || curA.classroom;
                            curA.caretaker = foundSec.groupA.caretakerTeacherId || '';
                            curA.turn2 = foundSec.groupA.caretakerTurn2Id || '';
                        }
                        if (foundSec.groupB) {
                            curB.classroom = foundSec.groupB.classroom || curB.classroom;
                            curB.caretaker = foundSec.groupB.caretakerTeacherId || '';
                            curB.turn2 = foundSec.groupB.caretakerTurn2Id || '';
                        }
                    }
                } else if (sIdx === 0) {
                    secDuration = editPayload.durationMinutes || secDuration;
                    if (editPayload.groupA) {
                        curA.classroom = editPayload.groupA.classroom || curA.classroom;
                        curA.caretaker = editPayload.groupA.caretakerTeacherId || '';
                        curA.turn2 = editPayload.groupA.caretakerTurn2Id || '';
                    }
                    if (editPayload.groupB) {
                        curB.classroom = editPayload.groupB.classroom || curB.classroom;
                        curB.caretaker = editPayload.groupB.caretakerTeacherId || '';
                        curB.turn2 = editPayload.groupB.caretakerTurn2Id || '';
                    }
                }
            } else {
                // Autoasignación automática: Docentes asignados de inmediato, pero 100% editables en el selector
                const autoForSec = autoAssignments[secCode] || autoAssignments[secName];
                if (autoForSec) {
                    curA.caretaker = autoForSec.caretakerA || '';
                    curB.caretaker = autoForSec.caretakerB || '';
                    curA.turn2 = autoForSec.turn2A || '';
                    curB.turn2 = autoForSec.turn2B || '';
                }
            }

            salonsHtml += `
                <div class="p-2 mb-2 rounded" style="background:#ffffff; border:1px solid #cbd5e1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; background:#f8fafc; padding:6px 10px; border-radius:6px; margin-bottom:8px; border:1px solid #e2e8f0;">
                        <div>
                            <strong style="color:#0f172a; font-size:0.9rem;">
                                📌 ${sInfo.gradeName} ─ <span style="color:#15803d; font-weight:800;">${secName}</span>
                            </strong>
                            <span style="font-size:0.78rem; color:#64748b; margin-left:8px;">
                                Titular: <strong>${sInfo.teacherName}</strong>
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <label style="font-size:0.78rem; font-weight:700; color:#475569; margin:0;">
                                ⏱️ Tiempo:
                            </label>
                            <select id="evalSectionDuration_${sIdx}" class="form-control form-control-sm" style="width:130px; font-weight:700; font-size:0.8rem; padding:2px 6px; height:28px;" onchange="window.recalcEvalTimes()">
                                <option value="45" ${secDuration === 45 ? 'selected' : ''}>45 minutos</option>
                                <option value="50" ${secDuration === 50 ? 'selected' : ''}>50 minutos</option>
                                <option value="60" ${secDuration === 60 ? 'selected' : ''}>60 minutos (1h)</option>
                                <option value="75" ${secDuration === 75 ? 'selected' : ''}>75 min (1h 15m)</option>
                                <option value="90" ${secDuration === 90 ? 'selected' : ''}>90 min (1h 30m)</option>
                                <option value="120" ${secDuration === 120 ? 'selected' : ''}>120 minutos (2h)</option>
                                <option value="300" ${secDuration === 300 ? 'selected' : ''}>300 min (Práctica)</option>
                                ${![45, 50, 60, 75, 90, 120, 300].includes(secDuration) ? `<option value="${secDuration}" selected>${secDuration} min (Personalizado)</option>` : ''}
                            </select>
                            <input type="number" id="evalSectionDurationCustom_${sIdx}" class="form-control form-control-sm" style="width:58px; font-weight:700; text-align:center; font-size:0.8rem; padding:2px 4px; height:28px;" min="15" max="300" placeholder="Min" title="Editar minutos manualmente" value="${secDuration}" oninput="const sel = document.getElementById('evalSectionDuration_${sIdx}'); if(sel && this.value){ sel.value = this.value; } window.recalcEvalTimes();">
                            <span id="evalSectionTimeBadge_${sIdx}" style="font-size:0.75rem; font-weight:800; background:#ffffff; color:#0f172a; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1;">
                                --:-- a --:--
                            </span>
                        </div>
                    </div>

                    <div class="row g-2">
                        <!-- GRUPO A -->
                        <div class="col-md-6">
                            <div style="background:#fcfcfd; border:1px solid #e2e8f0; border-radius:6px; padding:8px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <strong style="color:#15803d; font-size:0.82rem;">
                                        Salón Grupo A (${splitData.rangeA} ─ ${splitData.groupA.length} alum.)
                                    </strong>
                                    <span class="badge" style="background:#dcfce7; color:#15803d; font-size:0.68rem; font-weight:700;">Editable</span>
                                </div>
                                <div style="display:grid; grid-template-columns: 100px 1fr; gap:6px; align-items:center; margin-bottom:4px;">
                                    <input type="text" id="evalClassroomA_${sIdx}" list="institutionalSalonsList" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" value="${curA.classroom}" placeholder="Salón 6A">
                                    <select id="evalCaretakerA_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" required>
                                        ${window._generateTeacherSelectOptions(curA.caretaker, titularIds)}
                                    </select>
                                </div>
                                <div id="evalTurn2AContainer_${sIdx}" style="display:${isPrac ? 'block' : 'none'}; margin-top:4px;">
                                    <div style="font-size:0.72rem; color:#1d4ed8; font-weight:700; margin-bottom:2px;">Relevo 2do Turno:</div>
                                    <select id="evalCaretakerTurn2A_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;">
                                        ${window._generateTeacherSelectOptions(curA.turn2, titularIds)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- GRUPO B -->
                        <div class="col-md-6">
                            <div style="background:#fcfcfd; border:1px solid #e2e8f0; border-radius:6px; padding:8px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <strong style="color:#15803d; font-size:0.82rem;">
                                        Salón Grupo B (${splitData.rangeB} ─ ${splitData.groupB.length} alum.)
                                    </strong>
                                    <span class="badge" style="background:#dcfce7; color:#15803d; font-size:0.68rem; font-weight:700;">Editable</span>
                                </div>
                                <div style="display:grid; grid-template-columns: 100px 1fr; gap:6px; align-items:center; margin-bottom:4px;">
                                    <input type="text" id="evalClassroomB_${sIdx}" list="institutionalSalonsList" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" value="${curB.classroom}" placeholder="Salón 6B">
                                    <select id="evalCaretakerB_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" required>
                                        ${window._generateTeacherSelectOptions(curB.caretaker, titularIds)}
                                    </select>
                                </div>
                                <div id="evalTurn2BContainer_${sIdx}" style="display:${isPrac ? 'block' : 'none'}; margin-top:4px;">
                                    <div style="font-size:0.72rem; color:#1d4ed8; font-weight:700; margin-bottom:2px;">Relevo 2do Turno:</div>
                                    <select id="evalCaretakerTurn2B_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;">
                                        ${window._generateTeacherSelectOptions(curB.turn2, titularIds)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        // Incluir datalist institucional de los 20 salones
        salonsHtml += `<datalist id="institutionalSalonsList">${salonOptionsDatalist}</datalist>`;

        if (salonsContainer) salonsContainer.innerHTML = salonsHtml;
        window.recalcEvalTimes();
    };

    window.toggleCompMode = function (val) {
        const salonsSec = document.getElementById('sectionsSalonsContainer');
        if (salonsSec) {
            salonsSec.style.display = (val === 'single') ? 'none' : 'block';
        }
    };

    // Recalcular horas de inicio y fin automáticamente considerando las duraciones de cada sección
    window.recalcEvalTimes = function () {
        const startTimeInput = document.getElementById('evalStartTime');
        const endTimeInput = document.getElementById('evalEndTime');
        const warnDiv = document.getElementById('evalTimeLimitWarning');
        const gradeSelect = document.getElementById('evalGradeSelect');
        const courseSelect = document.getElementById('evalCourseSelect');

        if (!startTimeInput || !endTimeInput) return;

        const startMin = timeStringToMinutes(startTimeInput.value);
        let maxDuration = 60;

        // Inspeccionar duraciones individuales por sección
        const academicGradeName = gradeSelect ? gradeSelect.value : '';
        const courseName = courseSelect ? courseSelect.value : '';
        if (academicGradeName && courseName) {
            const sectionsInfo = getSectionsAndTitularsForCourse(academicGradeName, courseName);
            sectionsInfo.forEach((sInfo, sIdx) => {
                const secDurSelect = document.getElementById(`evalSectionDuration_${sIdx}`);
                const secDur = secDurSelect ? (parseInt(secDurSelect.value, 10) || 60) : 60;
                if (secDur > maxDuration) maxDuration = secDur;

                const secBadge = document.getElementById(`evalSectionTimeBadge_${sIdx}`);
                if (secBadge) {
                    const secEndMin = startMin + secDur;
                    secBadge.textContent = `${minutesToTimeString(startMin)} a ${minutesToTimeString(secEndMin)} hrs (${secDur} min)`;
                }
            });
        }

        const endMin = startMin + maxDuration;
        endTimeInput.value = minutesToTimeString(endMin);

        // Validar límite de las 12:30 PM (750 minutos)
        if (endMin > 750) {
            if (warnDiv) warnDiv.style.display = 'block';
        } else {
            if (warnDiv) warnDiv.style.display = 'none';
        }
    };

    // Guardar evaluación confirmada a nivel de grado consolidado con todas sus secciones
    window.confirmSaveEvaluation = function (dayId, evalIdToUpdate = '') {
        const gradeSelect = document.getElementById('evalGradeSelect');
        const courseSelect = document.getElementById('evalCourseSelect');
        const academicGradeName = gradeSelect ? gradeSelect.value : '';
        const courseName = courseSelect ? courseSelect.value : '';
        const startTime = document.getElementById('evalStartTime').value;
        const endTime = document.getElementById('evalEndTime').value;
        const recess = parseInt(document.getElementById('evalRecessMinutes').value, 10) || 15;

        if (!academicGradeName || !courseName) {
            alert("Por favor seleccione grado y asignatura.");
            return;
        }

        // Validación infranqueable de horario: NUNCA pasar de 12:30 PM
        if (timeStringToMinutes(endTime) > 750) {
            alert("🔒 RESTRICCIÓN OFICIAL DE JORNADA:\n\nLa evaluación finalizaría a las " + endTime + " hrs, sobrepasando el límite estricto de las 12:30 PM. Por favor reduzca la duración o inicie más temprano.");
            return;
        }

        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;

        const sectionsInfo = getSectionsAndTitularsForCourse(academicGradeName, courseName);
        const sUpper = courseName.toUpperCase();
        const isPrac = sUpper.includes('PRÁCTICA SUPERVISADA') || sUpper.includes('PRACTICA SUPERVISADA');
        const isComp = sUpper.includes('COMPUT') || sUpper.includes('INFORM') || sUpper.includes('LABORAT') || sUpper.includes('TIC');

        let compMode = 'single';
        const compRadio = document.querySelector('input[name="compMode"]:checked');
        if (compRadio) compMode = compRadio.value;

        let maxDurationFound = 60;

        // Construir la matriz de secciones configuradas con su propia duración
        const sectionsPayload = sectionsInfo.map((sInfo, sIdx) => {
            const splitData = splitStudentsInTwoGroups(sInfo.gradeCode, sInfo.section, sInfo.gradeName);

            const secDurSelect = document.getElementById(`evalSectionDuration_${sIdx}`);
            const secDuration = secDurSelect ? (parseInt(secDurSelect.value, 10) || 60) : 60;
            if (secDuration > maxDurationFound) maxDurationFound = secDuration;

            const startMin = timeStringToMinutes(startTime);
            const secEndMin = startMin + secDuration;
            const secEndTime = minutesToTimeString(secEndMin);

            const classroomA = (document.getElementById(`evalClassroomA_${sIdx}`) && document.getElementById(`evalClassroomA_${sIdx}`).value) || `Salón ${(sIdx * 2) + 1}`;
            const caretakerA = (document.getElementById(`evalCaretakerA_${sIdx}`) && document.getElementById(`evalCaretakerA_${sIdx}`).value) || '';
            const turn2AId = (document.getElementById(`evalCaretakerTurn2A_${sIdx}`) && document.getElementById(`evalCaretakerTurn2A_${sIdx}`).value) || '';

            const classroomB = (document.getElementById(`evalClassroomB_${sIdx}`) && document.getElementById(`evalClassroomB_${sIdx}`).value) || `Salón ${(sIdx * 2) + 2}`;
            const caretakerB = (document.getElementById(`evalCaretakerB_${sIdx}`) && document.getElementById(`evalCaretakerB_${sIdx}`).value) || '';
            const turn2BId = (document.getElementById(`evalCaretakerTurn2B_${sIdx}`) && document.getElementById(`evalCaretakerTurn2B_${sIdx}`).value) || '';

            const uA = (STATE.users || []).find(u => u.id === caretakerA);
            const uB = (STATE.users || []).find(u => u.id === caretakerB);
            const uTurn2A = (STATE.users || []).find(u => u.id === turn2AId);
            const uTurn2B = (STATE.users || []).find(u => u.id === turn2BId);

            return {
                gradeCode: sInfo.gradeCode,
                gradeName: sInfo.gradeName,
                section: sInfo.section,
                sectionLetter: sInfo.sectionLetter,
                teacherId: sInfo.teacherId,
                teacherName: sInfo.teacherName,
                durationMinutes: secDuration,
                startTime: startTime,
                endTime: secEndTime,
                groupA: {
                    classroom: classroomA,
                    range: splitData.rangeA,
                    caretakerTeacherId: caretakerA,
                    caretakerTeacherName: uA ? uA.name : '',
                    caretakerTurn2Id: turn2AId,
                    caretakerTurn2Name: uTurn2A ? uTurn2A.name : ''
                },
                groupB: {
                    classroom: classroomB,
                    range: splitData.rangeB,
                    caretakerTeacherId: caretakerB,
                    caretakerTeacherName: uB ? uB.name : '',
                    caretakerTurn2Id: turn2BId,
                    caretakerTurn2Name: uTurn2B ? uTurn2B.name : ''
                }
            };
        });

        // Titulares consolidados para exhibición
        const titularNames = Array.from(new Set(sectionsInfo.map(s => s.teacherName).filter(Boolean)));
        const titularTeachers = sectionsInfo.map(s => ({
            section: s.section,
            teacherId: s.teacherId,
            teacherName: s.teacherName
        }));

        // Para retrocompatibilidad con vista legacy de 1 grado
        const firstSec = sectionsPayload[0] || {};

        const evalPayload = {
            id: evalIdToUpdate || ('eval_' + Date.now()),
            academicGradeName: academicGradeName,
            gradeCode: firstSec.gradeCode || academicGradeName,
            gradeName: academicGradeName,
            courseId: sectionsInfo[0] ? sectionsInfo[0].courseId : '',
            courseName: courseName,
            courseTeacherId: sectionsInfo[0] ? sectionsInfo[0].teacherId : '',
            courseTeacherName: titularNames.join(', ') || 'Catedráticos Titulares',
            titularTeachers: titularTeachers,
            sections: sectionsPayload,
            durationMinutes: maxDurationFound,
            startTime: startTime,
            endTime: endTime,
            recessMinutes: recess,
            isPractica: isPrac,
            isComputacion: isComp,
            computacionMode: compMode,
            // Fallback de retrocompatibilidad
            groupA: firstSec.groupA || { classroom: 'Salón 1', range: '', caretakerTeacherId: '', caretakerTeacherName: '' },
            groupB: firstSec.groupB || { classroom: 'Salón 2', range: '', caretakerTeacherId: '', caretakerTeacherName: '' }
        };

        if (evalIdToUpdate) {
            const idx = dayObj.evaluations.findIndex(e => e.id === evalIdToUpdate);
            if (idx !== -1) dayObj.evaluations[idx] = evalPayload;
        } else {
            dayObj.evaluations.push(evalPayload);
        }

        // Ordenar evaluaciones por hora de inicio
        dayObj.evaluations.sort((a, b) => a.startTime.localeCompare(b.startTime));

        saveExamSchedulesData(true);
        document.getElementById('modalAddEvaluation').remove();
        renderExamSchedulesView();
    };

    window.editEvaluationModal = function (dayId, evalId) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;
        const ev = dayObj.evaluations.find(e => e.id === evalId);
        if (!ev) return;
        window.addEvaluationToDay(dayId, ev);
    };

    window.deleteEvaluation = function (dayId, evalId) {
        if (!confirm("¿Desea quitar esta evaluación de la programación de este día?")) return;
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;

        dayObj.evaluations = dayObj.evaluations.filter(e => e.id !== evalId);
        saveExamSchedulesData(true);
        renderExamSchedulesView();
    };

    // =========================================================================
    // SORTEO EQUITATIVO Y ALEATORIO DE CUIDADORES POR BIMESTRE O DÍA
    // =========================================================================
    /**
     * Sorteo equitativo y aleatorio de cuidadores de exámenes.
     * Reglas aplicadas:
     * 1. Excluye a todos los catedráticos titulares de la materia asignada.
     * 2. Evita colisiones de horario: ningún docente cuida dos salones al mismo tiempo.
     * 3. Equilibrio de carga (antifatiga): prioriza a los docentes con menor tiempo acumulado en el día.
     * 4. En caso de empates en carga, selecciona de manera 100% aleatoria (Fisher-Yates shuffle).
     * 5. Guarda la configuración en Firebase/LocalStorage para poder ser editada manualmente en cualquier momento.
     */
    function autoAssignRandomProctors(scheduleBlock, targetDayId = null) {
        // Pool de docentes candidatos (Auxiliares, Director y Secretaría estrictamente excluidos)
        const allCandidates = (STATE.users || []).filter(isTeacherEligibleForProctoring);
        if (allCandidates.length === 0) {
            return { success: false, message: "No se encontraron usuarios con rol de docente para realizar la asignación de salones." };
        }

        const daysToProcess = targetDayId
            ? (scheduleBlock.days || []).filter(d => d.id === targetDayId)
            : (scheduleBlock.days || []);

        if (daysToProcess.length === 0) {
            return { success: false, message: "No hay jornadas o fechas configuradas para realizar el sorteo." };
        }

        let assignedCount = 0;

        daysToProcess.forEach(dayObj => {
            if (!Array.isArray(dayObj.evaluations) || dayObj.evaluations.length === 0) return;

            // Rastreador de carga en minutos para este día: { teacherId: totalMinutes }
            const dayWorkload = {};
            allCandidates.forEach(u => { dayWorkload[u.id] = 0; });

            // Rastreador de intervalos ocupados por cada docente: { teacherId: [ [startMin, endMin], ... ] }
            const busyIntervals = {};
            allCandidates.forEach(u => { busyIntervals[u.id] = []; });

            // Procesar cada evaluación del día cronológicamente
            dayObj.evaluations.forEach(ev => {
                const isPractica = ev.isPractica === true;
                const isComputacionSingle = ev.isComputacion && ev.computacionMode === 'single';

                // Si es computación en salón único, los titulares son quienes cuidan y evalúan
                if (isComputacionSingle) {
                    const compStartMin = timeStringToMinutes(ev.startTime);
                    const compEndMin = timeStringToMinutes(ev.endTime);
                    const compDur = compEndMin - compStartMin;
                    (ev.titularTeachers || []).forEach(tit => {
                        if (tit.teacherId) {
                            dayWorkload[tit.teacherId] = (dayWorkload[tit.teacherId] || 0) + compDur;
                            if (!busyIntervals[tit.teacherId]) busyIntervals[tit.teacherId] = [];
                            busyIntervals[tit.teacherId].push([compStartMin, compEndMin]);
                        }
                    });
                    return; // No requiere cuidadores ajenos
                }

                // Identificar conjunto de titulares a excluir
                const titularExclusionSet = new Set();
                if (Array.isArray(ev.titularTeachers)) {
                    ev.titularTeachers.forEach(t => { if (t.teacherId) titularExclusionSet.add(t.teacherId); });
                }
                if (ev.courseTeacherId) titularExclusionSet.add(ev.courseTeacherId);
                if (Array.isArray(ev.sections)) {
                    ev.sections.forEach(s => { if (s.teacherId) titularExclusionSet.add(s.teacherId); });
                }

                const evStartMin = timeStringToMinutes(ev.startTime);

                // Función auxiliar para seleccionar un cuidador idóneo aleatorio y balanceado
                function pickBestCaretaker(slotStartMin, slotEndMin, currentlyAssignedInThisSlotSet = new Set()) {
                    const slotDuration = slotEndMin - slotStartMin;

                    // Candidatos que no sean titulares, no tengan colisión de horario y no estén ya en este mismo bloque
                    const eligible = allCandidates.filter(c => {
                        if (titularExclusionSet.has(c.id)) return false;
                        if (currentlyAssignedInThisSlotSet.has(c.id)) return false;

                        // Verificar colisión de horario
                        const intervals = busyIntervals[c.id] || [];
                        const hasCollision = intervals.some(([bStart, bEnd]) => {
                            // Dos intervalos se solapan si max(start) < min(end)
                            return Math.max(slotStartMin, bStart) < Math.min(slotEndMin, bEnd);
                        });
                        return !hasCollision;
                    });

                    if (eligible.length === 0) {
                        // Fallback de emergencia si no hay candidatos sin colisión: elegir cualquiera que no sea titular
                        const fallbackEligible = allCandidates.filter(c => !titularExclusionSet.has(c.id) && !currentlyAssignedInThisSlotSet.has(c.id));
                        if (fallbackEligible.length === 0) return null;
                        // Mezclar aleatoriamente
                        for (let i = fallbackEligible.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [fallbackEligible[i], fallbackEligible[j]] = [fallbackEligible[j], fallbackEligible[i]];
                        }
                        const fallbackSelected = fallbackEligible[0];
                        if (!busyIntervals[fallbackSelected.id]) busyIntervals[fallbackSelected.id] = [];
                        busyIntervals[fallbackSelected.id].push([slotStartMin, slotEndMin]);
                        dayWorkload[fallbackSelected.id] = (dayWorkload[fallbackSelected.id] || 0) + slotDuration;
                        currentlyAssignedInThisSlotSet.add(fallbackSelected.id);
                        assignedCount++;
                        return fallbackSelected;
                    }

                    // Encontrar el mínimo de minutos trabajados hoy entre los candidatos
                    let minMinutes = Infinity;
                    eligible.forEach(c => {
                        const m = dayWorkload[c.id] || 0;
                        if (m < minMinutes) minMinutes = m;
                    });

                    // Filtrar los que tengan la menor carga actual
                    const lowestLoadGroup = eligible.filter(c => (dayWorkload[c.id] || 0) <= minMinutes + 15);

                    // Sorteo aleatorio uniforme (Fisher-Yates shuffle sobre el grupo empatado)
                    for (let i = lowestLoadGroup.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [lowestLoadGroup[i], lowestLoadGroup[j]] = [lowestLoadGroup[j], lowestLoadGroup[i]];
                    }

                    const selected = lowestLoadGroup[0];
                    // Registrar el horario ocupado y la carga
                    if (!busyIntervals[selected.id]) busyIntervals[selected.id] = [];
                    busyIntervals[selected.id].push([slotStartMin, slotEndMin]);
                    dayWorkload[selected.id] = (dayWorkload[selected.id] || 0) + slotDuration;
                    currentlyAssignedInThisSlotSet.add(selected.id);
                    assignedCount++;

                    return selected;
                }

                // Asignar cuidadores por sección o por evaluación directa
                if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                    const assignedInThisSlot = new Set();
                    const assignedInT1 = new Set();
                    const assignedInT2 = new Set();

                    ev.sections.forEach(sec => {
                        const secDur = parseInt(sec.durationMinutes, 10) || parseInt(ev.durationMinutes, 10) || 60;
                        const secStartMin = timeStringToMinutes(sec.startTime || ev.startTime);
                        const secEndMin = secStartMin + secDur;

                        if (isPractica) {
                            // Práctica supervisada: 2 turnos con relevo a mitad de tiempo
                            const halfMin = Math.round(secDur / 2);
                            const t1Start = secStartMin;
                            const t1End = secStartMin + halfMin;
                            const t2Start = t1End;
                            const t2End = secEndMin;

                            const cA1 = pickBestCaretaker(t1Start, t1End, assignedInT1);
                            if (cA1) {
                                sec.groupA.caretakerTeacherId = cA1.id;
                                sec.groupA.caretakerTeacherName = cA1.name;
                            }
                            const cB1 = pickBestCaretaker(t1Start, t1End, assignedInT1);
                            if (cB1) {
                                sec.groupB.caretakerTeacherId = cB1.id;
                                sec.groupB.caretakerTeacherName = cB1.name;
                            }

                            const cA2 = pickBestCaretaker(t2Start, t2End, assignedInT2);
                            if (cA2) {
                                sec.groupA.caretakerTurn2Id = cA2.id;
                                sec.groupA.caretakerTurn2Name = cA2.name;
                            }
                            const cB2 = pickBestCaretaker(t2Start, t2End, assignedInT2);
                            if (cB2) {
                                sec.groupB.caretakerTurn2Id = cB2.id;
                                sec.groupB.caretakerTurn2Name = cB2.name;
                            }
                        } else {
                            // Examen regular: 1 cuidador para Grupo A y 1 cuidador para Grupo B
                            const cA = pickBestCaretaker(secStartMin, secEndMin, assignedInThisSlot);
                            if (cA) {
                                sec.groupA.caretakerTeacherId = cA.id;
                                sec.groupA.caretakerTeacherName = cA.name;
                            }
                            const cB = pickBestCaretaker(secStartMin, secEndMin, assignedInThisSlot);
                            if (cB) {
                                sec.groupB.caretakerTeacherId = cB.id;
                                sec.groupB.caretakerTeacherName = cB.name;
                            }
                        }
                    });

                    // Actualizar retrocompatibilidad con primer grupo
                    if (ev.sections[0]) {
                        ev.groupA = ev.sections[0].groupA;
                        ev.groupB = ev.sections[0].groupB;
                    }
                } else {
                    // Fallback para evaluaciones con formato individual
                    const evDur = parseInt(ev.durationMinutes, 10) || 60;
                    const evEndMin = evStartMin + evDur;
                    const assignedInThisSlot = new Set();

                    const cA = pickBestCaretaker(evStartMin, evEndMin, assignedInThisSlot);
                    if (cA) {
                        ev.groupA.caretakerTeacherId = cA.id;
                        ev.groupA.caretakerTeacherName = cA.name;
                    }
                    const cB = pickBestCaretaker(evStartMin, evEndMin, assignedInThisSlot);
                    if (cB) {
                        ev.groupB.caretakerTeacherId = cB.id;
                        ev.groupB.caretakerTeacherName = cB.name;
                    }
                }
            });
        });

        // Persistir la configuración generada para que sea editable en cualquier momento futuro
        saveExamSchedulesData(false);

        return {
            success: true,
            assignedCount: assignedCount,
            message: `Sorteo aleatorio y equitativo completado con éxito. Se asignaron ${assignedCount} plazas de cuido sin colisiones ni titulares asignados a sus propias cátedras.`
        };
    }

    // Disparador del sorteo para todo el bimestre
    window.randomizeProctorsForBimester = function () {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        if (!scheduleBlock.days || scheduleBlock.days.length === 0) {
            alert("No hay días de evaluación configurados en este bimestre para realizar el sorteo.");
            return;
        }

        const totalEvals = scheduleBlock.days.reduce((acc, d) => acc + (d.evaluations ? d.evaluations.length : 0), 0);
        if (totalEvals === 0) {
            alert("Debe agregar al menos una asignatura en las jornadas de este bimestre antes de sortear cuidadores.");
            return;
        }

        const confirmMsg = `🎲 ¿Desea ejecutar el SORTEO ALEATORIO Y EQUITATIVO DE CUIDADORES para todo el ${bimesterSelectVal}?\n\n` +
            `• Los catedráticos titulares de cada asignatura quedarán automáticamente excluidos de cuidar su propia materia.\n` +
            `• Las cargas de minutos se balancearán equitativamente entre los docentes sin solapamiento de horarios.\n` +
            `• Toda la configuración quedará guardada y podrá modificar o afinar cualquier salón manualmente en cualquier momento.`;

        if (!confirm(confirmMsg)) return;

        const res = autoAssignRandomProctors(scheduleBlock, null);
        if (res.success) {
            saveExamSchedulesData(true);
            renderExamSchedulesView();
            alert(`🎉 ¡Sorteo Exitoso!\n\n${res.message}`);
        } else {
            alert(`⚠️ Aviso: ${res.message}`);
        }
    };

    // Disparador del sorteo exclusivo para un día específico
    window.randomizeProctorsForDay = function (dayId) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);

        if (!dayObj || !dayObj.evaluations || dayObj.evaluations.length === 0) {
            alert("No hay asignaturas configuradas en esta fecha para sortear cuidadores.");
            return;
        }

        const confirmMsg = `🎲 ¿Desea sortear aleatoriamente los cuidadores para esta fecha (${dayObj.date})?\n\n` +
            `• Se respetará la regla de no asignar titulares a sus propias asignaturas ni colisiones de horario.\n` +
            `• Podrá editar cualquier salón manualmente después del sorteo.`;

        if (!confirm(confirmMsg)) return;

        const res = autoAssignRandomProctors(scheduleBlock, dayId);
        if (res.success) {
            saveExamSchedulesData(true);
            renderExamSchedulesView();
            alert(`🎉 ¡Sorteo de fecha completado!\n\n${res.message}`);
        } else {
            alert(`⚠️ Aviso: ${res.message}`);
        }
    };
    // IMPRESIÓN 1: HORARIO DIARIO EN HOJA OFICIO (LEGAL - 3 COLUMNAS)
    // =========================================================================
    window.printDailyScheduleOficio = function (dayId) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;

        const dayFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).toUpperCase();

        let rowsHtml = '';
        dayObj.evaluations.forEach((ev, idx) => {
            let col3SalonesHtml = '';

            if (ev.isPractica) {
                const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
                if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                    col3SalonesHtml = ev.sections.map(sec => `
                        <div style="margin-bottom:6px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;">
                            <strong style="color:#1e40af;">${sec.section}:</strong><br>
                            • Salón ${sec.groupA.classroom} (A): ${sec.groupA.caretakerTeacherName || 'Sin asignar'} (${ev.startTime}-${relevoTime}) / Relevo: ${sec.groupA.caretakerTurn2Name || 'Sin asignar'}<br>
                            • Salón ${sec.groupB.classroom} (B): ${sec.groupB.caretakerTeacherName || 'Sin asignar'} (${ev.startTime}-${relevoTime}) / Relevo: ${sec.groupB.caretakerTurn2Name || 'Sin asignar'}
                        </div>
                    `).join('');
                } else {
                    col3SalonesHtml = `
                        <div style="margin-bottom:6px;">
                            <strong>🏫 Salón ${ev.groupA.classroom} (Grupo A):</strong><br>
                            • 1er Turno (${ev.startTime}-${relevoTime}): ${ev.groupA.caretakerTeacherName || 'Sin asignar'}<br>
                            • 2do Turno (${relevoTime}-${ev.endTime}): ${ev.groupA.caretakerTurn2Name || 'Sin asignar'}
                        </div>
                        <div>
                            <strong>🏫 Salón ${ev.groupB.classroom} (Grupo B):</strong><br>
                            • 1er Turno (${ev.startTime}-${relevoTime}): ${ev.groupB.caretakerTeacherName || 'Sin asignar'}<br>
                            • 2do Turno (${relevoTime}-${ev.endTime}): ${ev.groupB.caretakerTurn2Name || 'Sin asignar'}
                        </div>
                    `;
                }
            } else if (ev.isComputacion && ev.computacionMode === 'single') {
                col3SalonesHtml = `
                    <div>
                        <strong>💻 Laboratorio de Computación (Todas las Secciones):</strong><br>
                        • Catedráticos Evaluadores y Cuidadores: ${ev.courseTeacherName} (Docentes Titulares)
                    </div>
                `;
            } else if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                col3SalonesHtml = ev.sections.map(sec => `
                    <div style="margin-bottom:6px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;">
                        <strong style="color:#15803d; font-size:0.86rem;">📌 ${sec.section}:</strong><br>
                        • <strong>Salón ${sec.groupA.classroom} (Grupo A):</strong> ${sec.groupA.caretakerTeacherName || 'Sin asignar'}<br>
                        • <strong>Salón ${sec.groupB.classroom} (Grupo B):</strong> ${sec.groupB.caretakerTeacherName || 'Sin asignar'}
                    </div>
                `).join('');
            } else {
                col3SalonesHtml = `
                    <div style="margin-bottom:4px;">
                        <strong>🏫 Salón ${ev.groupA.classroom} (Grupo A):</strong> ${ev.groupA.caretakerTeacherName || 'Sin asignar'}
                    </div>
                    <div>
                        <strong>🏫 Salón ${ev.groupB.classroom} (Grupo B):</strong> ${ev.groupB.caretakerTeacherName || 'Sin asignar'}
                    </div>
                `;
            }

            // Sección 2: Titulares y Tiempos por Sección
            let col2TitularesHtml = '';
            if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                col2TitularesHtml = ev.sections.map(sec => {
                    const secDur = sec.durationMinutes || ev.durationMinutes;
                    const secStart = sec.startTime || ev.startTime;
                    const secEnd = sec.endTime || ev.endTime;
                    return `
                        <div style="margin-bottom:5px; border-bottom:1px dashed #e2e8f0; padding-bottom:3px;">
                            • <strong>${sec.section}:</strong> ${sec.teacherName}<br>
                            <span style="font-size:0.78rem; color:#b45309; font-weight:700;">⏱️ ${secDur} min (${secStart} a ${secEnd} hrs)</span>
                        </div>
                    `;
                }).join('');
            } else if (Array.isArray(ev.titularTeachers) && ev.titularTeachers.length > 0) {
                col2TitularesHtml = ev.titularTeachers.map(tit => `
                    <div style="margin-bottom:2px;">• <strong>${tit.section}:</strong> ${tit.teacherName}</div>
                `).join('');
            } else {
                col2TitularesHtml = `<div>• <strong>Titular:</strong> ${ev.courseTeacherName}</div>`;
            }

            rowsHtml += `
                <tr>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:33%;">
                        <div style="font-weight:900; font-size:1.02rem; color:#0f172a;">⏰ ${ev.startTime} a ${ev.endTime} hrs</div>
                        <div style="font-weight:800; font-size:0.95rem; color:#15803d; margin-top:2px;">${ev.academicGradeName || ev.gradeName}</div>
                        <div style="font-weight:700; font-size:0.92rem; color:#1e293b;">📘 ${ev.courseName}</div>
                        ${ev.isPractica ? '<span style="font-size:0.75rem; background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:3px; font-weight:800; display:inline-block; margin-top:4px;">GRADUANDOS - PRÁCTICA SUPERVISADA</span>' : ''}
                    </td>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:33%;">
                        <div style="font-weight:800; font-size:0.86rem; color:#0f172a; margin-bottom:4px;">👤 Catedráticos Titulares:</div>
                        <div style="font-size:0.82rem; color:#334155; line-height:1.3;">
                            ${col2TitularesHtml}
                        </div>
                        <div style="font-weight:800; font-size:0.86rem; color:#b45309; margin-top:8px;">
                            ⏱️ Bloque Máximo: <strong>${ev.durationMinutes} minutos</strong>
                        </div>
                    </td>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:34%; font-size:0.84rem; color:#0f172a;">
                        ${col3SalonesHtml}
                    </td>
                </tr>
            `;

            // Si hay receso posterior y no es la última evaluación
            if (ev.recessMinutes > 0 && idx < dayObj.evaluations.length - 1) {
                const recStart = ev.endTime;
                const recEnd = minutesToTimeString(timeStringToMinutes(ev.endTime) + ev.recessMinutes);
                rowsHtml += `
                    <tr style="background:#f1f5f9;">
                        <td colspan="3" style="padding:6px 12px; border:1px solid #cbd5e1; text-align:center; font-weight:800; font-size:0.84rem; color:#475569;">
                            ☕ RECESO INSTITUCIONAL Y CAMBIO DE SALONES: ${recStart} a ${recEnd} hrs (${ev.recessMinutes} MINUTOS)
                        </td>
                    </tr>
                `;
            }
        });

        const printContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Horario de Evaluaciones - ${dayFormatted}</title>
                <style>
                    @page {
                        size: 8.5in 13in portrait; /* HOJA OFICIO GUATEMALTECO 8.5in x 13in VERTICAL */
                        margin: 10mm 12mm;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                    }
                    .header-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 14px;
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 8px;
                    }
                    .main-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    .main-table th {
                        background: #0f172a;
                        color: #ffffff;
                        font-size: 0.88rem;
                        font-weight: 800;
                        padding: 8px 10px;
                        text-align: left;
                        border: 1px solid #0f172a;
                    }
                    .footer-signatures {
                        margin-top: 35px;
                        width: 100%;
                        display: flex;
                        justify-content: space-around;
                        page-break-inside: avoid;
                    }
                    .sig-line {
                        width: 250px;
                        border-top: 1.5px solid #0f172a;
                        text-align: center;
                        font-size: 0.85rem;
                        padding-top: 4px;
                    }
                </style>
            </head>
            <body>
                <table class="header-table">
                    <tr>
                        <td style="width:75px; vertical-align:middle;">
                            <img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:62px; width:auto;">
                        </td>
                        <td style="vertical-align:middle; padding-left:12px;">
                            <div style="font-size:1.15rem; font-weight:900; color:#0f172a; text-transform:uppercase;">
                                ESCUELA NACIONAL DE CIENCIAS COMERCIALES — JUTIAPA
                            </div>
                            <div style="font-size:0.85rem; color:#475569; font-weight:700;">
                                Jornada Matutina — Ciclo Escolar ${(STATE && STATE.activeCycle) || '2026'} — Auxiliatura General
                            </div>
                            <div style="font-size:0.95rem; font-weight:900; color:#15803d; margin-top:3px;">
                                📅 HORARIO OFICIAL DE EVALUACIONES: ${dayFormatted}
                            </div>
                        </td>
                    </tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th style="width:33%;">1. HORARIO Y ASIGNATURA</th>
                            <th style="width:33%;">2. TITULAR Y TIEMPO ASIGNADO</th>
                            <th style="width:34%;">3. SALONES Y DOCENTES CUIDADORES</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top:14px; font-size:0.78rem; color:#64748b; font-style:italic;">
                    * Norma Institucional: Ninguna evaluación podrá extenderse más allá de las 12:30 PM. Los docentes cuidadores deben presentarse al salón 5 minutos antes de la hora indicada y entregar las pruebas en Auxiliatura al finalizar.
                </div>

                <div class="footer-signatures">
                    <div class="sig-line">
                        <strong>Auxiliatura General</strong><br>
                        Control de Evaluaciones
                    </div>
                    <div class="sig-line">
                        <strong>Dirección del Plantel</strong><br>
                        Vo.Bo. Institucional
                    </div>
                </div>
            </body>
            </html>
        `;

        openPrintWindow(printContent);
    };

    // =========================================================================
    // IMPRESIÓN 2: MEDIAS LISTAS OFICIALES (TODAS LAS SECCIONES, GRUPO A Y B)
    // =========================================================================
    window.printMediasListasModal = function (dayId, evalId) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;
        const ev = dayObj.evaluations.find(e => e.id === evalId);
        if (!ev) return;

        printEvaluationSheets(dayObj, ev, 'BOTH');
    };

    window.printAllMediasListasOfDay = function (dayId) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj || !dayObj.evaluations || dayObj.evaluations.length === 0) {
            alert("No hay evaluaciones asignadas en este día.");
            return;
        }

        let combinedHtml = '';
        dayObj.evaluations.forEach((ev, idx) => {
            if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                ev.sections.forEach((sec, sIdx) => {
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                    combinedHtml += '<div style="page-break-after:always;"></div>';
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                    if (sIdx < ev.sections.length - 1 || idx < dayObj.evaluations.length - 1) {
                        combinedHtml += '<div style="page-break-after:always;"></div>';
                    }
                });
            } else {
                combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A');
                combinedHtml += '<div style="page-break-after:always;"></div>';
                combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B');
                if (idx < dayObj.evaluations.length - 1) {
                    combinedHtml += '<div style="page-break-after:always;"></div>';
                }
            }
        });

        wrapAndPrintSheets(combinedHtml, `Medias_Listas_${dayObj.date}`);
    };

    window.printAllNominasOfBimester = function () {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        if (!scheduleBlock || !scheduleBlock.days || scheduleBlock.days.length === 0) {
            alert("No hay días de evaluación configurados para este bimestre.");
            return;
        }

        let totalEvalsCount = 0;
        let combinedHtml = '';

        scheduleBlock.days.forEach(dayObj => {
            (dayObj.evaluations || []).forEach(ev => {
                totalEvalsCount++;
                if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                    ev.sections.forEach(sec => {
                        if (combinedHtml) combinedHtml += '<div style="page-break-after:always;"></div>';
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                        combinedHtml += '<div style="page-break-after:always;"></div>';
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                    });
                } else {
                    if (combinedHtml) combinedHtml += '<div style="page-break-after:always;"></div>';
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A');
                    combinedHtml += '<div style="page-break-after:always;"></div>';
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B');
                }
            });
        });

        if (totalEvalsCount === 0 || !combinedHtml) {
            alert("No se encontraron evaluaciones registradas en este bimestre para imprimir.");
            return;
        }

        wrapAndPrintSheets(combinedHtml, `Todas_Las_Nominas_${bimesterSelectVal}`);
    };

    function printEvaluationSheets(dayObj, ev, mode = 'BOTH') {
        let contentHtml = '';

        if (Array.isArray(ev.sections) && ev.sections.length > 0) {
            ev.sections.forEach((sec, sIdx) => {
                if (mode === 'A' || mode === 'BOTH') {
                    contentHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                }
                if (mode === 'BOTH') {
                    contentHtml += '<div style="page-break-after:always;"></div>';
                }
                if (mode === 'B' || mode === 'BOTH') {
                    contentHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                }
                if (sIdx < ev.sections.length - 1) {
                    contentHtml += '<div style="page-break-after:always;"></div>';
                }
            });
        } else {
            if (mode === 'A' || mode === 'BOTH') {
                contentHtml += generateSingleGroupHtml(dayObj, ev, 'A');
            }
            if (mode === 'BOTH') {
                contentHtml += '<div style="page-break-after:always;"></div>';
            }
            if (mode === 'B' || mode === 'BOTH') {
                contentHtml += generateSingleGroupHtml(dayObj, ev, 'B');
            }
        }

        wrapAndPrintSheets(contentHtml, `Evaluacion_${ev.courseName}_${ev.gradeName}`);
    }

    // Generar el HTML de una hoja de salón individual (Grupo A o Grupo B de una sección específica)
    function generateSingleGroupHtml(dayObj, ev, groupLetter, targetSection = null) {
        const isGroupA = groupLetter === 'A';
        const secObj = targetSection || (Array.isArray(ev.sections) && ev.sections[0]) || null;
        const grp = secObj ? (isGroupA ? secObj.groupA : secObj.groupB) : (isGroupA ? ev.groupA : ev.groupB);
        const gradeCodeToUse = secObj ? secObj.gradeCode : ev.gradeCode;
        const secNameToUse = secObj ? secObj.section : '';
        const gradeNameToUse = secObj ? secObj.gradeName : ev.gradeName;
        const sectionNameToUse = secObj ? `${secObj.gradeName} (${secObj.section})` : ev.gradeName;
        const titularNameToUse = secObj ? secObj.teacherName : ev.courseTeacherName;

        const splitData = splitStudentsInTwoGroups(gradeCodeToUse, secNameToUse, gradeNameToUse);
        const studentList = isGroupA ? splitData.groupA : splitData.groupB;
        const isPractica = ev.isPractica === true;

        const dayFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        let rowsHtml = '';
        studentList.forEach((s, idx) => {
            const num = isGroupA ? (idx + 1) : (splitData.groupA.length + idx + 1);
            const fullName = ((s.lastName || '') + ', ' + (s.firstName || '')).trim();
            const carne = s.carne || s.id || '';
            const isExonerado = (typeof isStudentExonerated === 'function') ? isStudentExonerated(s) : false;

            rowsHtml += `
                <tr style="height:27px;">
                    <td style="text-align:center; font-weight:800; font-size:0.82rem; border:1px solid #94a3b8; padding:3px 4px;">
                        ${String(num).padStart(2, '0')}
                    </td>
                    <td style="text-align:center; font-size:0.78rem; font-weight:700; border:1px solid #94a3b8; padding:3px 4px; font-family:monospace;">
                        ${carne}
                    </td>
                    <td style="font-size:0.85rem; font-weight:700; border:1px solid #94a3b8; padding:3px 6px;">
                        ${fullName} ${isExonerado ? '<span style="color:#0284c7; font-size:0.7rem; font-weight:800;">[EXONERADO]</span>' : ''}
                    </td>
                    <td style="border:1px solid #94a3b8; width:180px; text-align:center;">
                        <!-- Espacio de firma -->
                    </td>
                </tr>
            `;
        });

        // Completar hasta al menos 20 filas para consistencia visual si la lista es corta
        const minRows = 20;
        if (studentList.length < minRows) {
            for (let i = studentList.length + 1; i <= minRows; i++) {
                rowsHtml += `
                    <tr style="height:27px;">
                        <td style="border:1px solid #cbd5e1; text-align:center; color:#cbd5e1; font-size:0.75rem;">${i}</td>
                        <td style="border:1px solid #cbd5e1;"></td>
                        <td style="border:1px solid #cbd5e1;"></td>
                        <td style="border:1px solid #cbd5e1;"></td>
                    </tr>
                `;
            }
        }

        let caretakerHeaderHtml = '';
        let actaRelevoHtml = '';

        if (isPractica) {
            const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
            caretakerHeaderHtml = `
                <tr>
                    <td style="font-weight:700; padding:2px 0;">1er Turno Cuido:</td>
                    <td><strong>${grp.caretakerTeacherName || 'Sin asignar'}</strong> (${ev.startTime} a ${relevoTime} hrs)</td>
                    <td style="font-weight:700; padding:2px 0;">2do Turno Cuido:</td>
                    <td><strong>${grp.caretakerTurn2Name || 'Sin asignar'}</strong> (${relevoTime} a ${ev.endTime} hrs)</td>
                </tr>
            `;

            actaRelevoHtml = `
                <div style="margin-top:8px; padding:6px; background:#f8fafc; border:1px solid #cbd5e1; font-size:0.75rem; line-height:1.3;">
                    <strong>📋 ACTA DE RELEVO Y RECEPCIÓN:</strong><br>
                    • Relevo (${relevoTime} hrs): _________________________ (1er Turno) entregó salón a _________________________ (2do Turno).<br>
                    • Total de pruebas recibidas al cierre (${ev.endTime} hrs): [ _____ ] de ${studentList.length} estudiantes.
                </div>
            `;
        } else {
            caretakerHeaderHtml = `
                <tr>
                    <td style="font-weight:700; padding:2px 0;">Docente Cuidador:</td>
                    <td colspan="3"><strong style="font-size:0.92rem; color:#0f172a;">${grp.caretakerTeacherName || 'Sin asignar'}</strong></td>
                </tr>
            `;
        }

        return `
            <div class="sheet-container" style="page-break-inside:avoid;">
                <!-- ENCABEZADO CON LOGO Y MEMBRETE -->
                <table style="width:100%; border-collapse:collapse; margin-bottom:8px; border-bottom:2px solid #0f172a; padding-bottom:6px;">
                    <tr>
                        <td style="width:65px; vertical-align:middle;">
                            <img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:55px; width:auto;">
                        </td>
                        <td style="vertical-align:middle; padding-left:10px;">
                            <div style="font-size:1.05rem; font-weight:900; color:#0f172a; text-transform:uppercase;">
                                ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                            </div>
                            <div style="font-size:0.8rem; color:#475569; font-weight:700;">
                                Jornada Matutina — Jutiapa, Guatemala — Ciclo Escolar ${(STATE && STATE.activeCycle) || '2026'}
                            </div>
                            <div style="font-size:0.86rem; font-weight:900; color:#15803d; margin-top:2px;">
                                CONTROL OFICIAL DE EVALUACIONES BIMESTRALES — AUXILIATURA GENERAL
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- TARJETA DE DATOS DEL EXAMEN -->
                <table style="width:100%; border-collapse:collapse; font-size:0.84rem; margin-bottom:8px; background:#f8fafc; border:1px solid #cbd5e1; padding:6px;">
                    <tr>
                        <td style="width:18%; font-weight:700; padding:2px 6px;">Grado y Sección:</td>
                        <td style="width:34%; font-weight:800; color:#0f172a;">${sectionNameToUse}</td>
                        <td style="width:18%; font-weight:700; padding:2px 6px;">Fecha:</td>
                        <td style="width:30%; text-transform:capitalize;">${dayFormatted}</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; padding:2px 6px;">Asignatura:</td>
                        <td style="font-weight:800; color:#0f172a;">${ev.courseName}</td>
                        <td style="font-weight:700; padding:2px 6px;">Horario Oficial:</td>
                        <td style="font-weight:800;">${ev.startTime} a ${ev.endTime} hrs (${ev.durationMinutes} min)</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; padding:2px 6px;">Catedrático:</td>
                        <td><strong>${titularNameToUse}</strong> <span style="font-size:0.78rem; color:#475569;">(Docente Titular)</span></td>
                        <td style="font-weight:700; padding:2px 6px;">Salón Asignado:</td>
                        <td style="font-weight:800; color:#15803d;">${grp.classroom || 'Salón'}</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; padding:2px 6px;">Grupo Asignado:</td>
                        <td style="font-weight:900; color:#15803d; font-size:0.92rem;">
                            GRUPO "${groupLetter}" (Nómina ${grp.range})
                        </td>
                        <td style="font-weight:700; padding:2px 6px;">Total Alumnos:</td>
                        <td><strong>${studentList.length} estudiantes</strong></td>
                    </tr>
                    ${caretakerHeaderHtml}
                </table>

                <!-- TABLA DE ALUMNOS CON FIRMA -->
                <table style="width:100%; border-collapse:collapse; margin-top:4px;">
                    <thead>
                        <tr style="background:#0f172a; color:#ffffff; font-size:0.8rem; font-weight:800; height:24px;">
                            <th style="width:35px; border:1px solid #0f172a; text-align:center;">No.</th>
                            <th style="width:90px; border:1px solid #0f172a; text-align:center;">CÓDIGO</th>
                            <th style="border:1px solid #0f172a; text-align:left; padding-left:8px;">APELLIDOS Y NOMBRES</th>
                            <th style="width:180px; border:1px solid #0f172a; text-align:center;">FIRMA DEL ESTUDIANTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <!-- OBSERVACIONES NUMERADAS A EXACTAMENTE 3 LÍNEAS -->
                <div style="margin-top:8px; font-size:0.8rem; font-weight:700; color:#1e293b;">
                    OBSERVACIONES:
                    <div style="border-bottom:1px dotted #64748b; height:18px; margin-top:2px;">1. </div>
                    <div style="border-bottom:1px dotted #64748b; height:18px;">2. </div>
                    <div style="border-bottom:1px dotted #64748b; height:18px;">3. </div>
                </div>

                ${actaRelevoHtml}

                <div style="margin-top:6px; font-size:0.78rem; font-weight:700;">
                    Total de pruebas entregadas a Auxiliatura: [ _______ ] de ${studentList.length} estudiantes evaluados.
                </div>

                <!-- FIRMAS INFERIORES -->
                <table style="width:100%; border-collapse:collapse; margin-top:25px; page-break-inside:avoid;">
                    <tr>
                        <td style="width:50%; text-align:center; vertical-align:bottom;">
                            <div style="width:230px; margin:0 auto; border-top:1.5px solid #0f172a; padding-top:4px; font-size:0.8rem;">
                                <strong>${isPractica ? (grp.caretakerTurn2Name || 'Docente Cuidador Cierre') : (grp.caretakerTeacherName || 'Docente Cuidador')}</strong><br>
                                Docente Cuidador Responsable
                            </div>
                        </td>
                        <td style="width:50%; text-align:center; vertical-align:bottom;">
                            <div style="width:230px; margin:0 auto; border-top:1.5px solid #0f172a; padding-top:4px; font-size:0.8rem;">
                                <strong>Auxiliatura General</strong><br>
                                Sello y Recepción Oficial
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        `;
    }

    // Envolver y abrir la ventana de impresión
    function wrapAndPrintSheets(bodyHtml, title = 'Listas_Auxiliatura') {
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    @page {
                        size: 8.5in 13in portrait; /* HOJA OFICIO GUATEMALTECO 8.5in x 13in VERTICAL */
                        margin: 8mm 12mm;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                    }
                    .sheet-container {
                        width: 100%;
                    }
                </style>
            </head>
            <body>
                ${bodyHtml}
            </body>
            </html>
        `;
        openPrintWindow(fullHtml);
    }

    // =========================================================================
    // IMPRESIÓN 3: CALENDARIO GENERAL CONSOLIDADO EN PDF
    // =========================================================================
    window.printConsolidatedCalendarPdf = function () {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        if (!scheduleBlock.days || scheduleBlock.days.length === 0) {
            alert("No hay fechas de evaluación configuradas para este bimestre.");
            return;
        }

        let daysTablesHtml = '';
        scheduleBlock.days.forEach(d => {
            const dFormatted = new Date(d.date + 'T12:00:00').toLocaleDateString('es-GT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).toUpperCase();

            let evRows = '';
            (d.evaluations || []).forEach(ev => {
                let cuidadoresStr = '';
                if (ev.isPractica) {
                    cuidadoresStr = `Salón ${ev.groupA.classroom} (A): ${ev.groupA.caretakerTeacherName} / ${ev.groupA.caretakerTurn2Name}<br>Salón ${ev.groupB.classroom} (B): ${ev.groupB.caretakerTeacherName} / ${ev.groupB.caretakerTurn2Name}`;
                } else if (ev.isComputacion && ev.computacionMode === 'single') {
                    cuidadoresStr = `Laboratorio: ${ev.courseTeacherName} (Titular)`;
                } else {
                    cuidadoresStr = `Salón ${ev.groupA.classroom} (A): ${ev.groupA.caretakerTeacherName || 'N/A'}<br>Salón ${ev.groupB.classroom} (B): ${ev.groupB.caretakerTeacherName || 'N/A'}`;
                }

                evRows += `
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:6px 8px; font-weight:800; font-size:0.82rem;">${ev.startTime} - ${ev.endTime}</td>
                        <td style="border:1px solid #cbd5e1; padding:6px 8px; font-weight:700; font-size:0.82rem;">${ev.gradeName}</td>
                        <td style="border:1px solid #cbd5e1; padding:6px 8px; font-size:0.82rem;"><strong>${ev.courseName}</strong><br><small style="color:#64748b;">Titular: ${ev.courseTeacherName}</small></td>
                        <td style="border:1px solid #cbd5e1; padding:6px 8px; text-align:center; font-weight:700; font-size:0.82rem;">${ev.durationMinutes} min</td>
                        <td style="border:1px solid #cbd5e1; padding:6px 8px; font-size:0.8rem;">${cuidadoresStr}</td>
                    </tr>
                `;
            });

            daysTablesHtml += `
                <div style="margin-bottom:18px; page-break-inside:avoid;">
                    <div style="background:#0f172a; color:#ffffff; padding:6px 10px; font-size:0.88rem; font-weight:800;">
                        📅 ${dFormatted} ${d.isPracticaDay ? '─ (JORNADA EXCLUSIVA DE PRÁCTICA SUPERVISADA)' : ''}
                    </div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f1f5f9; font-size:0.78rem; font-weight:800;">
                                <th style="border:1px solid #cbd5e1; padding:5px; width:15%;">HORARIO</th>
                                <th style="border:1px solid #cbd5e1; padding:5px; width:22%;">GRADO</th>
                                <th style="border:1px solid #cbd5e1; padding:5px; width:28%;">ASIGNATURA</th>
                                <th style="border:1px solid #cbd5e1; padding:5px; width:10%;">DURACIÓN</th>
                                <th style="border:1px solid #cbd5e1; padding:5px; width:25%;">SALONES Y CUIDADORES</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${evRows || '<tr><td colspan="5" style="text-align:center; padding:10px; color:#64748b;">Sin evaluaciones programadas.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        });

        const calendarHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Calendario General de Evaluaciones - Bimestre ${bimesterSelectVal}</title>
                <style>
                    @page { size: letter landscape; margin: 12mm 15mm; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                </style>
            </head>
            <body>
                <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border-bottom:2px solid #0f172a; padding-bottom:6px;">
                    <tr>
                        <td style="width:65px;"><img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:55px;"></td>
                        <td style="padding-left:12px;">
                            <div style="font-size:1.15rem; font-weight:900;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES — JUTIAPA</div>
                            <div style="font-size:0.85rem; color:#475569; font-weight:700;">CALENDARIO GENERAL DE EVALUACIONES BIMESTRALES ─ CICLO LECTIVO ${(STATE && STATE.activeCycle) || '2026'}</div>
                        </td>
                    </tr>
                </table>
                ${daysTablesHtml}
            </body>
            </html>
        `;
        openPrintWindow(calendarHtml);
    };

    // Helper unificado para abrir ventana de impresión
    function openPrintWindow(htmlContent) {
        const printWin = window.open('', '_blank', 'width=980,height=720,menubar=no,toolbar=no,location=no,status=no');
        if (!printWin) {
            alert("El navegador bloqueó la ventana de impresión. Por favor habilite las ventanas emergentes (pop-ups).");
            return;
        }

        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();

        const trigger = () => {
            try {
                printWin.focus();
                printWin.print();
            } catch (e) {
                console.error("Error al disparar impresión:", e);
            }
        };

        const img = printWin.document.querySelector('img');
        if (img) {
            if (img.complete) setTimeout(trigger, 250);
            else {
                img.onload = () => setTimeout(trigger, 200);
                img.onerror = () => setTimeout(trigger, 200);
                setTimeout(trigger, 1200);
            }
        } else {
            setTimeout(trigger, 250);
        }
    }

    // =========================================================================
    // EXPORTACIÓN GLOBAL DEL MÓDULO
    // =========================================================================
    window.renderExamSchedulesView = renderExamSchedulesView;
    window.getExamSchedulesData = getExamSchedulesData;
    window.saveExamSchedulesData = saveExamSchedulesData;
    window.autoAssignRandomProctors = autoAssignRandomProctors;
    window.randomizeProctorsForBimester = randomizeProctorsForBimester;
    window.randomizeProctorsForDay = randomizeProctorsForDay;
    window.printDailyScheduleOficio = printDailyScheduleOficio;
    window.printMediasListasModal = printMediasListasModal;
    window.printAllMediasListasOfDay = printAllMediasListasOfDay;
    window.printAllNominasOfBimester = printAllNominasOfBimester;
    window.printConsolidatedCalendarPdf = printConsolidatedCalendarPdf;
    window.getInstitutionalSalonsList = getInstitutionalSalonsList;

    window.EXAM_SCHEDULES_MODULE = {
        renderExamSchedulesView,
        getExamSchedulesData,
        saveExamSchedulesData,
        splitStudentsInTwoGroups,
        calculateTeacherWorkloadForDate,
        hasExamScheduleAccess,
        minutesToTimeString,
        timeStringToMinutes,
        getDistinctAcademicGrades,
        getCoursesForAcademicGrade,
        getSectionsAndTitularsForCourse,
        getInstitutionalSalonsList,
        autoAssignRandomProctors,
        autoPickProctorsForModal,
        randomizeProctorsForBimester,
        randomizeProctorsForDay,
        printDailyScheduleOficio,
        printMediasListasModal,
        printAllMediasListasOfDay,
        printAllNominasOfBimester,
        printConsolidatedCalendarPdf
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.EXAM_SCHEDULES_MODULE;
    }

})(typeof window !== 'undefined' ? window : global, typeof document !== 'undefined' ? document : { getElementById: () => null });
