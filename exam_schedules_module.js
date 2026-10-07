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
        `;
        document.head.appendChild(style);
    }

    // Inicializar o recuperar datos de STATE
    function getExamSchedulesData() {
        if (!window.STATE) window.STATE = {};
        if (!STATE.examSchedules || typeof STATE.examSchedules !== 'object') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

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

        // Inicializar con todos los usuarios registrados
        (STATE.users || []).forEach(u => {
            if (u.role === 'docente' || u.role === 'profesor_auxiliar') {
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
                } else if (ev.isComputacion && ev.computacionMode === 'single') {
                    // Computación salón único
                    if (ev.courseTeacherId && workload[ev.courseTeacherId]) {
                        workload[ev.courseTeacherId].minutes += dur;
                        workload[ev.courseTeacherId].salonesCount += 1;
                    }
                } else {
                    // Regular o Computación dividida
                    ['groupA', 'groupB'].forEach(grpKey => {
                        const grp = ev[grpKey];
                        if (grp && grp.caretakerTeacherId && workload[grp.caretakerTeacherId]) {
                            workload[grp.caretakerTeacherId].minutes += dur;
                            workload[grp.caretakerTeacherId].salonesCount += 1;
                        }
                    });
                }
            });
        }
        return workload;
    }

    // Dividir la nómina de estudiantes en Grupo A y Grupo B
    function splitStudentsInTwoGroups(gradeCode) {
        const students = (STATE.students || []).filter(s => {
            const matchesGrade = s.gradeCode === gradeCode || s.grade === gradeCode;
            const isActive = s.status === 'Activo' || s.status === 'activo' || !s.status;
            return matchesGrade && isActive;
        });

        // Ordenar alfabéticamente por apellido
        students.sort((a, b) => {
            const nameA = ((a.lastName || '') + ' ' + (a.firstName || '')).trim().toLowerCase();
            const nameB = ((b.lastName || '') + ' ' + (b.firstName || '')).trim().toLowerCase();
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
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
                    <div>
                        <h2 style="margin:0; font-size:1.35rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-calendar-days" style="color:#15803d;"></i>
                            Roles de Evaluaciones y Cuido de Exámenes
                        </h2>
                        <p style="margin:4px 0 0 0; color:#64748b; font-size:0.88rem;">
                            Auxiliatura General ─ Planificación por fechas, salones, grupos A/B y asignación equitativa de cuidadores.
                        </p>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <label style="font-weight:700; font-size:0.88rem; color:#334155; margin:0;">Bimestre:</label>
                        <select id="examBimesterSelect" class="form-control" style="width:160px; font-weight:700;" onchange="window.changeExamBimester(this.value)">
                            <option value="BIM1" ${bimesterSelectVal === 'BIM1' ? 'selected' : ''}>I Bimestre</option>
                            <option value="BIM2" ${bimesterSelectVal === 'BIM2' ? 'selected' : ''}>II Bimestre</option>
                            <option value="BIM3" ${bimesterSelectVal === 'BIM3' ? 'selected' : ''}>III Bimestre</option>
                            <option value="BIM4" ${bimesterSelectVal === 'BIM4' ? 'selected' : ''}>IV Bimestre</option>
                        </select>
                        <button type="button" class="btn btn-primary" onclick="window.addNewExamDayModal()" style="background:#15803d; border-color:#166534; font-weight:700;">
                            <i class="fa-solid fa-plus"></i> Agregar Día de Examen
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="window.printConsolidatedCalendarPdf()" style="font-weight:700;">
                            <i class="fa-solid fa-file-pdf"></i> Calendario General (PDF)
                        </button>
                    </div>
                </div>

                <!-- AVISO INSTITUCIONAL DE LÍMITE HORARIO -->
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; font-size:0.85rem; color:#166534; display:flex; align-items:center; gap:10px; margin-bottom:18px;">
                    <i class="fa-solid fa-circle-info" style="font-size:1.1rem; color:#15803d;"></i>
                    <span><strong>Regla Oficial de Jornada:</strong> Las evaluaciones inician a las <strong>07:30 AM</strong> y <strong>bajo ninguna circunstancia pueden sobrepasar las 12:30 PM</strong>. La duración de cada prueba la estipula el docente titular y ningún docente cuida su propia clase (salvo Computación).</span>
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
                    <button type="button" class="btn btn-sm btn-light" onclick="window.printDailyScheduleOficio('${dayObj.id}')" style="font-weight:700; color:#0f172a;" title="Imprimir Horario en Hoja Oficio (3 Columnas)">
                        <i class="fa-solid fa-print"></i> Horario Hoja Oficio (3 Col.)
                    </button>
                    <button type="button" class="btn btn-sm btn-light" onclick="window.printAllMediasListasOfDay('${dayObj.id}')" style="font-weight:700; color:#0f172a;" title="Imprimir todas las medias listas de este día">
                        <i class="fa-solid fa-users-rectangle"></i> Medias Listas (A y B)
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

                <!-- DETALLE DE DISTRIBUCIÓN DE SALONES Y CUIDADORES -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-top:12px;">
        `;

        if (isPractica) {
            // Práctica Supervisada: Relevo en ambos salones
            const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
            html += `
                <div class="exam-group-card" style="border-left:4px solid #2563eb;">
                    <strong style="color:#1e40af; display:block; margin-bottom:4px;">
                        🏫 Salón ${ev.groupA.classroom || '1'} ─ GRUPO A (Alumnos ${ev.groupA.range || '1 a N/2'})
                    </strong>
                    <div style="font-size:0.82rem; color:#334155; line-height:1.4;">
                        <div>• <strong>1er Turno (${ev.startTime} a ${relevoTime}):</strong> ${ev.groupA.caretakerTeacherName || 'Sin asignar'}</div>
                        <div>• <strong>2do Turno (${relevoTime} a ${ev.endTime}):</strong> ${ev.groupA.caretakerTurn2Name || 'Sin asignar'}</div>
                    </div>
                </div>
                <div class="exam-group-card" style="border-left:4px solid #2563eb;">
                    <strong style="color:#1e40af; display:block; margin-bottom:4px;">
                        🏫 Salón ${ev.groupB.classroom || '2'} ─ GRUPO B (Alumnos ${ev.groupB.range || 'N/2+1 a N'})
                    </strong>
                    <div style="font-size:0.82rem; color:#334155; line-height:1.4;">
                        <div>• <strong>1er Turno (${ev.startTime} a ${relevoTime}):</strong> ${ev.groupB.caretakerTeacherName || 'Sin asignar'}</div>
                        <div>• <strong>2do Turno (${relevoTime} a ${ev.endTime}):</strong> ${ev.groupB.caretakerTurn2Name || 'Sin asignar'}</div>
                    </div>
                </div>
            `;
        } else if (ev.isComputacion && ev.computacionMode === 'single') {
            html += `
                <div class="exam-group-card" style="border-left:4px solid #0284c7; grid-column:1 / -1;">
                    <strong style="color:#0369a1; display:block; margin-bottom:4px;">
                        💻 Laboratorio de Computación ─ GRUPO ÚNICO (Nómina Completa)
                    </strong>
                    <div style="font-size:0.82rem; color:#334155;">
                        • <strong>Catedrático Evaluador y Cuidador:</strong> ${ev.courseTeacherName} (Docente Titular Autorizado)
                    </div>
                </div>
            `;
        } else {
            // Regular: Grupo A y Grupo B
            html += `
                <div class="exam-group-card" style="border-left:4px solid #15803d;">
                    <strong style="color:#166534; display:block; margin-bottom:4px;">
                        🏫 Salón ${ev.groupA.classroom || '1'} ─ GRUPO A (Alumnos ${ev.groupA.range || '1 a N/2'})
                    </strong>
                    <div style="font-size:0.82rem; color:#334155;">
                        • <strong>Docente Cuidador:</strong> ${ev.groupA.caretakerTeacherName || 'Sin asignar'}
                    </div>
                </div>
                <div class="exam-group-card" style="border-left:4px solid #15803d;">
                    <strong style="color:#166534; display:block; margin-bottom:4px;">
                        🏫 Salón ${ev.groupB.classroom || '2'} ─ GRUPO B (Alumnos ${ev.groupB.range || 'N/2+1 a N'})
                    </strong>
                    <div style="font-size:0.82rem; color:#334155;">
                        • <strong>Docente Cuidador:</strong> ${ev.groupB.caretakerTeacherName || 'Sin asignar'}
                    </div>
                </div>
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
            <div class="modal fade show" id="${modalId}" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5); z-index:9999;">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius:12px;">
                        <div class="modal-header" style="background:#15803d; color:white; border-radius:12px 12px 0 0;">
                            <h5 class="modal-title"><i class="fa-solid fa-calendar-plus"></i> Programar Nuevo Día de Examen</h5>
                            <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group mb-3">
                                <label class="form-label" style="font-weight:700;">Fecha de Evaluación:</label>
                                <input type="date" id="newExamDayDate" class="form-control" value="${today}" required>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="newExamDayIsPractica">
                                <label class="form-check-label" for="newExamDayIsPractica" style="font-weight:700; color:#1d4ed8;">
                                    ⭐ Es Jornada Exclusiva de Práctica Supervisada (Graduandos)
                                </label>
                                <small class="text-muted d-block">
                                    En este día solo se evaluará Práctica Supervisada en horario continuo de 07:30 a 12:30 con relevo a mitad de tiempo.
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="window.confirmAddNewExamDay()" style="background:#15803d; border-color:#166534; font-weight:700;">
                                Crear Día
                            </button>
                        </div>
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

    // Modal para asignar una clase a un día
    window.addEvaluationToDay = function (dayId, evalToEdit = null) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;

        const modalId = 'modalAddEvaluation';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const grades = STATE.gradesList || [];
        const workload = calculateTeacherWorkloadForDate(scheduleBlock, dayObj.date);

        // Calcular hora de inicio automática según evaluaciones previas
        let autoStartMinutes = 450; // 07:30 AM
        if (dayObj.evaluations && dayObj.evaluations.length > 0 && !evalToEdit) {
            const lastEval = dayObj.evaluations[dayObj.evaluations.length - 1];
            const lastEndMin = timeStringToMinutes(lastEval.endTime);
            autoStartMinutes = Math.min(lastEndMin + (lastEval.recessMinutes || 15), 750); // máx 12:30
        }
        const autoStartTime = minutesToTimeString(autoStartMinutes);

        // Opciones de profesores cuidadores excluyendo colisiones
        function generateTeacherSelectOptions(selectedId = '', excludeTeacherId = '') {
            let opts = `<option value="">-- Seleccionar Cuidador --</option>`;
            (STATE.users || []).forEach(u => {
                if (u.role === 'docente' || u.role === 'profesor_auxiliar') {
                    if (u.id === excludeTeacherId) return; // Regla de Oro: Titular excluido
                    const wl = workload[u.id] || { minutes: 0, salonesCount: 0 };
                    const isSel = u.id === selectedId ? 'selected' : '';
                    opts += `<option value="${u.id}" ${isSel}>${u.name} (Hoy: ${wl.minutes} min | ${wl.salonesCount} sal.)</option>`;
                }
            });
            return opts;
        }

        const modalHtml = `
            <div class="modal fade show" id="${modalId}" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5); z-index:9999;">
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content" style="border-radius:12px;">
                        <div class="modal-header" style="background:#0f172a; color:white; border-radius:12px 12px 0 0;">
                            <h5 class="modal-title">
                                <i class="fa-solid fa-file-pen"></i> ${evalToEdit ? 'Editar Evaluación' : 'Asignar Asignatura y Cuidadores'}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
                        </div>
                        <div class="modal-body" style="padding:20px;">
                            <form id="formAddEval">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label" style="font-weight:700;">Grado y Sección:</label>
                                        <select id="evalGradeSelect" class="form-control" onchange="window.onEvalGradeChanged(this.value)" required>
                                            <option value="">-- Seleccione Grado --</option>
                                            ${grades.map(g => `<option value="${g.code || g.id}">${g.name} ${g.section}</option>`).join('')}
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
                                    <div class="col-md-6">
                                        <label class="form-label" style="font-weight:700;">Catedrático Titular de la Cátedra:</label>
                                        <input type="text" id="evalTeacherName" class="form-control" readonly style="background:#f1f5f9; font-weight:700;">
                                        <input type="hidden" id="evalTeacherId">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label" style="font-weight:700;">⏱️ Tiempo Fijado por el Titular (Minutos):</label>
                                        <select id="evalDurationSelect" class="form-control" onchange="window.recalcEvalTimes()" style="font-weight:700;">
                                            <option value="45">45 minutos</option>
                                            <option value="50">50 minutos</option>
                                            <option value="60" selected>60 minutos (1 hora estándar)</option>
                                            <option value="75">75 minutos (1 hora 15 min)</option>
                                            <option value="90">90 minutos (1 hora y media)</option>
                                            <option value="120">120 minutos (2 horas)</option>
                                            <option value="300">300 minutos (5 horas - Práctica Supervisada)</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row g-3 mt-1 p-2 rounded" style="background:#f8fafc; border:1px solid #e2e8f0;">
                                    <div class="col-md-4">
                                        <label class="form-label" style="font-weight:700;">Hora Inicio:</label>
                                        <input type="time" id="evalStartTime" class="form-control" value="${autoStartTime}" onchange="window.recalcEvalTimes()" required>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label" style="font-weight:700;">Hora Fin (Calculada):</label>
                                        <input type="time" id="evalEndTime" class="form-control" readonly style="background:#e2e8f0; font-weight:800;">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label" style="font-weight:700;">Receso Posterior:</label>
                                        <select id="evalRecessMinutes" class="form-control">
                                            <option value="0">Sin receso</option>
                                            <option value="10">10 minutos</option>
                                            <option value="15" selected>15 minutos</option>
                                            <option value="20">20 minutos</option>
                                        </select>
                                    </div>
                                    <div id="evalTimeLimitWarning" class="col-12 text-danger font-weight-bold" style="display:none; font-size:0.85rem;">
                                        ⚠️ Advertencia: El horario calculado sobrepasa las 12:30 PM. Ajuste la hora de inicio o la duración.
                                    </div>
                                </div>

                                <!-- SECCIÓN MODALIDAD ESPECIAL (COMPUTACIÓN O PRÁCTICA) -->
                                <div id="specialModeSection" class="mt-3"></div>

                                <!-- SECCIÓN CUIDADORES GRUPO A Y B -->
                                <div id="careTakersSection" class="mt-3">
                                    <h6 style="font-weight:800; color:#15803d; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
                                        👥 Salones y Docentes Cuidadores (División en 2 Grupos)
                                    </h6>
                                    <div class="row g-3 mt-1">
                                        <div class="col-md-6 p-2 rounded" style="background:#ffffff; border:1px solid #cbd5e1;">
                                            <strong style="color:#166534; font-size:0.9rem;">🏫 Salón Grupo A (1 a N/2)</strong>
                                            <div class="mt-2">
                                                <label class="form-label" style="font-size:0.82rem; font-weight:700;">No. de Salón:</label>
                                                <input type="text" id="evalClassroomA" class="form-control form-control-sm" value="Salón 1" placeholder="Ej. Salón 1">
                                            </div>
                                            <div class="mt-2">
                                                <label class="form-label" style="font-size:0.82rem; font-weight:700;">Docente Cuidador Grupo A:</label>
                                                <select id="evalCaretakerA" class="form-control form-control-sm" required>
                                                    ${generateTeacherSelectOptions()}
                                                </select>
                                            </div>
                                            <div id="evalTurn2AContainer" style="display:none;" class="mt-2">
                                                <label class="form-label" style="font-size:0.82rem; font-weight:700; color:#1d4ed8;">Docente 2do Turno Grupo A (Relevo):</label>
                                                <select id="evalCaretakerTurn2A" class="form-control form-control-sm">
                                                    ${generateTeacherSelectOptions()}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6 p-2 rounded" style="background:#ffffff; border:1px solid #cbd5e1;">
                                            <strong style="color:#166534; font-size:0.9rem;">🏫 Salón Grupo B (N/2+1 a N)</strong>
                                            <div class="mt-2">
                                                <label class="form-label" style="font-size:0.82rem; font-weight:700;">No. de Salón:</label>
                                                <input type="text" id="evalClassroomB" class="form-control form-control-sm" value="Salón 2" placeholder="Ej. Salón 2">
                                            </div>
                                            <div class="mt-2">
                                                <label class="form-label" style="font-size:0.82rem; font-weight:700;">Docente Cuidador Grupo B:</label>
                                                <select id="evalCaretakerB" class="form-control form-control-sm" required>
                                                    ${generateTeacherSelectOptions()}
                                                </select>
                                            </div>
                                            <div id="evalTurn2BContainer" style="display:none;" class="mt-2">
                                                <label class="form-label" style="font-size:0.82rem; font-weight:700; color:#1d4ed8;">Docente 2do Turno Grupo B (Relevo):</label>
                                                <select id="evalCaretakerTurn2B" class="form-control form-control-sm">
                                                    ${generateTeacherSelectOptions()}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="window.confirmSaveEvaluation('${dayId}', '${evalToEdit ? evalToEdit.id : ''}')" style="background:#15803d; border-color:#166534; font-weight:700;">
                                Guardar Asignación
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Inicializar recálculo de horario
        window.recalcEvalTimes();

        // Si se está editando, cargar valores previos
        if (evalToEdit) {
            document.getElementById('evalGradeSelect').value = evalToEdit.gradeCode;
            window.onEvalGradeChanged(evalToEdit.gradeCode, evalToEdit.courseId);
            document.getElementById('evalDurationSelect').value = evalToEdit.durationMinutes;
            document.getElementById('evalStartTime').value = evalToEdit.startTime;
            document.getElementById('evalRecessMinutes').value = evalToEdit.recessMinutes || 15;
            window.recalcEvalTimes();
            if (evalToEdit.groupA) {
                document.getElementById('evalClassroomA').value = evalToEdit.groupA.classroom || 'Salón 1';
                document.getElementById('evalCaretakerA').value = evalToEdit.groupA.caretakerTeacherId || '';
                if (document.getElementById('evalCaretakerTurn2A')) {
                    document.getElementById('evalCaretakerTurn2A').value = evalToEdit.groupA.caretakerTurn2Id || '';
                }
            }
            if (evalToEdit.groupB) {
                document.getElementById('evalClassroomB').value = evalToEdit.groupB.classroom || 'Salón 2';
                document.getElementById('evalCaretakerB').value = evalToEdit.groupB.caretakerTeacherId || '';
                if (document.getElementById('evalCaretakerTurn2B')) {
                    document.getElementById('evalCaretakerTurn2B').value = evalToEdit.groupB.caretakerTurn2Id || '';
                }
            }
        }
    };

    // Al cambiar de grado, llenar las materias asignadas
    window.onEvalGradeChanged = function (gradeCode, preselectedCourseId = '') {
        const courseSelect = document.getElementById('evalCourseSelect');
        if (!courseSelect) return;

        const pensum = (STATE.pensum || []).filter(p => {
            const raw = `${p.grade || ''} ${p.gradeCode || ''}`.toUpperCase();
            return p.gradeCode === gradeCode || p.grade === gradeCode || raw.includes(gradeCode.toUpperCase());
        });

        let opts = `<option value="">-- Seleccionar Asignatura --</option>`;
        pensum.forEach(p => {
            const isSel = p.id === preselectedCourseId ? 'selected' : '';
            opts += `<option value="${p.id}" ${isSel}>${p.subject} (Titular: ${p.teacher || 'Sin docente'})</option>`;
        });
        courseSelect.innerHTML = opts;

        if (preselectedCourseId) {
            window.onEvalCourseChanged(preselectedCourseId);
        }
    };

    // Al cambiar de materia, determinar docente titular y si es computación o práctica
    window.onEvalCourseChanged = function (courseId) {
        const course = (STATE.pensum || []).find(p => p.id === courseId);
        const teacherNameInput = document.getElementById('evalTeacherName');
        const teacherIdInput = document.getElementById('evalTeacherId');
        const durationSelect = document.getElementById('evalDurationSelect');
        const specialSec = document.getElementById('specialModeSection');
        const turn2A = document.getElementById('evalTurn2AContainer');
        const turn2B = document.getElementById('evalTurn2BContainer');

        if (!course) {
            if (teacherNameInput) teacherNameInput.value = '';
            if (teacherIdInput) teacherIdInput.value = '';
            return;
        }

        const tName = course.teacher || 'Docente Titular';
        const tId = course.teacherId || '';
        if (teacherNameInput) teacherNameInput.value = tName;
        if (teacherIdInput) teacherIdInput.value = tId;

        const sUpper = (course.subject || '').toUpperCase();
        const isComp = sUpper.includes('COMPUT') || sUpper.includes('INFORM') || sUpper.includes('LABORAT') || sUpper.includes('TIC');
        const isPrac = sUpper.includes('PRÁCTICA SUPERVISADA') || sUpper.includes('PRACTICA SUPERVISADA');

        if (isPrac) {
            if (durationSelect) durationSelect.value = '300'; // 5 horas
            if (specialSec) {
                specialSec.innerHTML = `
                    <div class="alert alert-primary p-2" style="font-size:0.85rem;">
                        <i class="fa-solid fa-star"></i> <strong>Modo Práctica Supervisada Detectado:</strong>
                        Se asignarán 2 docentes por salón con relevo exacto a mitad de tiempo. El docente titular no cuida.
                    </div>
                `;
            }
            if (turn2A) turn2A.style.display = 'block';
            if (turn2B) turn2B.style.display = 'block';
        } else if (isComp) {
            if (specialSec) {
                specialSec.innerHTML = `
                    <div class="alert alert-info p-2" style="font-size:0.85rem;">
                        <i class="fa-solid fa-laptop-code"></i> <strong>Modo Laboratorio de Computación:</strong>
                        El catedrático titular <strong>(${tName})</strong> evalúa y cuida su propia prueba.
                        <div class="mt-1">
                            <label><input type="radio" name="compMode" value="single" checked onchange="window.toggleCompMode(this.value)"> Grupo Único en Laboratorio</label>
                            <label class="ms-3"><input type="radio" name="compMode" value="two_turns" onchange="window.toggleCompMode(this.value)"> 2 Turnos de Lab (Grupo A y B)</label>
                        </div>
                    </div>
                `;
            }
            if (turn2A) turn2A.style.display = 'none';
            if (turn2B) turn2B.style.display = 'none';
        } else {
            if (specialSec) specialSec.innerHTML = '';
            if (turn2A) turn2A.style.display = 'none';
            if (turn2B) turn2B.style.display = 'none';
        }

        window.recalcEvalTimes();
    };

    window.toggleCompMode = function (val) {
        const careSec = document.getElementById('careTakersSection');
        if (careSec) {
            careSec.style.display = (val === 'single') ? 'none' : 'block';
        }
    };

    // Recalcular horas de inicio y fin automáticamente
    window.recalcEvalTimes = function () {
        const startTimeInput = document.getElementById('evalStartTime');
        const durationSelect = document.getElementById('evalDurationSelect');
        const endTimeInput = document.getElementById('evalEndTime');
        const warnDiv = document.getElementById('evalTimeLimitWarning');

        if (!startTimeInput || !durationSelect || !endTimeInput) return;

        const startMin = timeStringToMinutes(startTimeInput.value);
        const dur = parseInt(durationSelect.value, 10) || 60;
        const endMin = startMin + dur;

        endTimeInput.value = minutesToTimeString(endMin);

        // Validar límite de las 12:30 PM (750 minutos)
        if (endMin > 750) {
            if (warnDiv) warnDiv.style.display = 'block';
        } else {
            if (warnDiv) warnDiv.style.display = 'none';
        }
    };

    // Guardar evaluación confirmada
    window.confirmSaveEvaluation = function (dayId, evalIdToUpdate = '') {
        const gradeSelect = document.getElementById('evalGradeSelect');
        const courseSelect = document.getElementById('evalCourseSelect');
        const teacherName = document.getElementById('evalTeacherName').value;
        const teacherId = document.getElementById('evalTeacherId').value;
        const duration = parseInt(document.getElementById('evalDurationSelect').value, 10) || 60;
        const startTime = document.getElementById('evalStartTime').value;
        const endTime = document.getElementById('evalEndTime').value;
        const recess = parseInt(document.getElementById('evalRecessMinutes').value, 10) || 15;

        if (!gradeSelect.value || !courseSelect.value) {
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

        const gradeObj = (STATE.gradesList || []).find(g => g.code === gradeSelect.value || g.id === gradeSelect.value);
        const courseObj = (STATE.pensum || []).find(p => p.id === courseSelect.value);
        const sUpper = (courseObj ? courseObj.subject : '').toUpperCase();
        const isPrac = sUpper.includes('PRÁCTICA SUPERVISADA') || sUpper.includes('PRACTICA SUPERVISADA');
        const isComp = sUpper.includes('COMPUT') || sUpper.includes('INFORM') || sUpper.includes('LABORAT') || sUpper.includes('TIC');

        const splitData = splitStudentsInTwoGroups(gradeSelect.value);

        // Cuidadores
        const caretakerA = document.getElementById('evalCaretakerA') ? document.getElementById('evalCaretakerA').value : '';
        const caretakerB = document.getElementById('evalCaretakerB') ? document.getElementById('evalCaretakerB').value : '';
        const classroomA = document.getElementById('evalClassroomA') ? document.getElementById('evalClassroomA').value : 'Salón 1';
        const classroomB = document.getElementById('evalClassroomB') ? document.getElementById('evalClassroomB').value : 'Salón 2';

        const uA = (STATE.users || []).find(u => u.id === caretakerA);
        const uB = (STATE.users || []).find(u => u.id === caretakerB);

        // Turno 2 (en práctica supervisada)
        const turn2AId = document.getElementById('evalCaretakerTurn2A') ? document.getElementById('evalCaretakerTurn2A').value : '';
        const turn2BId = document.getElementById('evalCaretakerTurn2B') ? document.getElementById('evalCaretakerTurn2B').value : '';
        const uTurn2A = (STATE.users || []).find(u => u.id === turn2AId);
        const uTurn2B = (STATE.users || []).find(u => u.id === turn2BId);

        let compMode = 'single';
        const compRadio = document.querySelector('input[name="compMode"]:checked');
        if (compRadio) compMode = compRadio.value;

        const evalPayload = {
            id: evalIdToUpdate || ('eval_' + Date.now()),
            gradeCode: gradeSelect.value,
            gradeName: gradeObj ? `${gradeObj.name} ${gradeObj.section}` : gradeSelect.value,
            courseId: courseSelect.value,
            courseName: courseObj ? courseObj.subject : 'Asignatura',
            courseTeacherId: teacherId,
            courseTeacherName: teacherName,
            durationMinutes: duration,
            startTime: startTime,
            endTime: endTime,
            recessMinutes: recess,
            isPractica: isPrac,
            isComputacion: isComp,
            computacionMode: compMode,
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
            } else if (ev.isComputacion && ev.computacionMode === 'single') {
                col3SalonesHtml = `
                    <div>
                        <strong>💻 Laboratorio de Computación (Grupo Único):</strong><br>
                        • Docente Evaluador y Cuidador: ${ev.courseTeacherName} (Titular)
                    </div>
                `;
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

            rowsHtml += `
                <tr>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:33%;">
                        <div style="font-weight:900; font-size:1.02rem; color:#0f172a;">⏰ ${ev.startTime} a ${ev.endTime} hrs</div>
                        <div style="font-weight:800; font-size:0.95rem; color:#15803d; margin-top:2px;">${ev.gradeName}</div>
                        <div style="font-weight:700; font-size:0.92rem; color:#1e293b;">📘 ${ev.courseName}</div>
                        ${ev.isPractica ? '<span style="font-size:0.75rem; background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:3px; font-weight:800; display:inline-block; margin-top:4px;">GRADUANDOS - PRÁCTICA SUPERVISADA</span>' : ''}
                    </td>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:33%;">
                        <div style="font-weight:800; font-size:0.95rem; color:#0f172a;">👤 ${ev.courseTeacherName}</div>
                        <div style="font-size:0.85rem; color:#475569; margin-top:2px;">Catedrático Titular de la Cátedra</div>
                        <div style="font-weight:800; font-size:0.88rem; color:#b45309; margin-top:6px;">
                            ⏱️ Tiempo Oficial Asignado: <strong>${ev.durationMinutes} minutos</strong>
                        </div>
                    </td>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:34%; font-size:0.88rem; color:#0f172a;">
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
                        size: legal portrait; /* HOJA OFICIO VERTICAL */
                        margin: 12mm 15mm;
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
    // IMPRESIÓN 2: MEDIAS LISTAS OFICIALES (GRUPO A Y GRUPO B CON LOGO Y 3 LÍNEAS)
    // =========================================================================
    window.printMediasListasModal = function (dayId, evalId) {
        const bimesterSelectVal = (window._currentSelectedExamBim) || 'BIM3';
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        const dayObj = scheduleBlock.days.find(d => d.id === dayId);
        if (!dayObj) return;
        const ev = dayObj.evaluations.find(e => e.id === evalId);
        if (!ev) return;

        // Imprimir ambas listas consecutivas (Grupo A y Grupo B)
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
            combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A');
            combinedHtml += '<div style="page-break-after:always;"></div>';
            combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B');
            if (idx < dayObj.evaluations.length - 1) {
                combinedHtml += '<div style="page-break-after:always;"></div>';
            }
        });

        wrapAndPrintSheets(combinedHtml, `Medias_Listas_${dayObj.date}`);
    };

    function printEvaluationSheets(dayObj, ev, mode = 'BOTH') {
        let contentHtml = '';
        if (mode === 'A' || mode === 'BOTH') {
            contentHtml += generateSingleGroupHtml(dayObj, ev, 'A');
        }
        if (mode === 'BOTH') {
            contentHtml += '<div style="page-break-after:always;"></div>';
        }
        if (mode === 'B' || mode === 'BOTH') {
            contentHtml += generateSingleGroupHtml(dayObj, ev, 'B');
        }

        wrapAndPrintSheets(contentHtml, `Evaluacion_${ev.courseName}_${ev.gradeName}`);
    }

    // Generar el HTML de una hoja de salón individual (Grupo A o Grupo B)
    function generateSingleGroupHtml(dayObj, ev, groupLetter) {
        const isGroupA = groupLetter === 'A';
        const grp = isGroupA ? ev.groupA : ev.groupB;
        const splitData = splitStudentsInTwoGroups(ev.gradeCode);
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
                        <td style="width:34%; font-weight:800; color:#0f172a;">${ev.gradeName}</td>
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
                        <td>${ev.courseTeacherName} (Titular - No cuida)</td>
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
                        size: letter portrait; /* HOJA CARTA O LEGAL VERTICAL */
                        margin: 10mm 12mm;
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
    window.printDailyScheduleOficio = printDailyScheduleOficio;
    window.printMediasListasModal = printMediasListasModal;
    window.printAllMediasListasOfDay = printAllMediasListasOfDay;
    window.printConsolidatedCalendarPdf = printConsolidatedCalendarPdf;

    window.EXAM_SCHEDULES_MODULE = {
        renderExamSchedulesView,
        getExamSchedulesData,
        saveExamSchedulesData,
        splitStudentsInTwoGroups,
        calculateTeacherWorkloadForDate,
        hasExamScheduleAccess,
        minutesToTimeString,
        timeStringToMinutes,
        printDailyScheduleOficio,
        printMediasListasModal,
        printAllMediasListasOfDay,
        printConsolidatedCalendarPdf
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.EXAM_SCHEDULES_MODULE;
    }

})(typeof window !== 'undefined' ? window : global, typeof document !== 'undefined' ? document : { getElementById: () => null });
