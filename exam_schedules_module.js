/**
 * exam_schedules_module.js
 * ==============================================================================
 * MÓDULO OFICIAL: AUXILIATURAS DE EXÁMENES (AUXILIATURA GENERAL)
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
                background: #ffffff;
                color: #0f172a;
                border: 1px solid #e2e8f0;
                border-left: 5px solid #16a34a;
                padding: 10px 16px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 12px;
                cursor: pointer;
                user-select: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, margin-bottom 0.2s ease;
            }
            .exam-day-banner:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
                border-color: #cbd5e1;
                border-left-color: #15803d;
            }
            .exam-day-banner.is-collapsed {
                margin-bottom: 10px;
                background: #f8fafc;
            }
            .exam-day-banner.is-collapsed:hover {
                background: #ffffff;
            }
            .exam-day-banner.is-practica-banner {
                border-left-color: #2563eb !important;
            }
            .exam-day-banner.is-practica-banner:hover {
                border-left-color: #1d4ed8 !important;
            }
            .exam-day-body {
                transition: opacity 0.2s ease;
            }
            .exam-item-box {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 9px;
                padding: 12px 14px;
                margin-bottom: 12px;
                position: relative;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .exam-item-box:hover {
                border-color: #94a3b8;
                box-shadow: 0 3px 10px rgba(0,0,0,0.05);
            }
            .exam-item-practica {
                background: #f8fafc;
                border-color: #bfdbfe;
                border-left: 4px solid #2563eb;
            }
            .exam-item-practica:hover {
                border-color: #60a5fa;
            }
            .exam-badge-time {
                background: #0f172a;
                color: #f8fafc;
                padding: 3px 8px;
                border-radius: 5px;
                font-size: 0.78rem;
                font-weight: 800;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .exam-badge-time.limit-warn {
                background: #dc2626 !important;
                color: #ffffff !important;
            }
            .exam-group-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 10px;
                margin-top: 8px;
            }
            .exam-teacher-chip {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 2.5px 8px;
                border-radius: 6px;
                font-size: 0.76rem;
                font-weight: 700;
                margin: 2px 2px;
                transition: transform 0.1s ease, box-shadow 0.1s ease;
                white-space: nowrap;
            }
            .exam-teacher-chip:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
            }
            .chip-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
            .chip-yellow { background: #fefce8; color: #a16207; border: 1px solid #fef08a; }
            .chip-orange { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
            .chip-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

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

            /* GRILLA ADAPTATIVA DE EVALUACIONES POR GRADO Y HORA */
            .exam-grades-grid {
                display: grid;
                gap: 16px;
                align-items: start;
                margin-bottom: 24px;
            }
            .exam-grades-grid.cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .exam-grades-grid.cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .exam-grades-grid.cols-1 {
                grid-template-columns: 1fr;
            }
            @media (max-width: 992px) {
                .exam-grades-grid.cols-2,
                .exam-grades-grid.cols-3 {
                    grid-template-columns: 1fr !important;
                }
            }
            .exam-grade-col-card {
                background: #f8fafc;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .exam-grade-col-header {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                color: #ffffff;
                padding: 10px 14px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.06);
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

    // Sincronización en tiempo real desde la nube (Firestore / RTDB)
    async function syncExamSchedulesFromCloud(forceRender = false) {
        try {
            let cloudData = null;
            // 1. Intentar desde Firestore
            if (window.FirebaseModular && window.FirebaseModular.db) {
                const { db, doc, getDoc } = window.FirebaseModular;
                const snap = await getDoc(doc(db, 'config', 'examSchedules')).catch(() => null);
                if (snap && snap.exists()) {
                    const val = snap.data();
                    if (val && val.schedules && typeof val.schedules === 'object' && Object.keys(val.schedules).length > 0) {
                        cloudData = val.schedules;
                    }
                }
            }
            // 2. Si no, intentar desde RTDB
            if (!cloudData && typeof EnccoCloudSync !== 'undefined' && EnccoCloudSync.getUrl) {
                const fbUrl = EnccoCloudSync.getUrl();
                if (fbUrl) {
                    const res = await fetch(`${fbUrl}/encc_school_state/examSchedules.json?t=${Date.now()}`).catch(() => null);
                    if (res && res.ok) {
                        const json = await res.json().catch(() => null);
                        if (json && typeof json === 'object' && Object.keys(json).length > 0) cloudData = json;
                    }
                }
            }
            // 3. Aplicar si se obtuvieron datos válidos
            if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
                STATE.examSchedules = cloudData;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
                }
                if (forceRender) {
                    const v = document.getElementById('view-exam-schedules');
                    if (v && v.style.display !== 'none') {
                        renderExamSchedulesView();
                    }
                }
                return true;
            }
        } catch (err) {
            console.warn("Aviso al sincronizar examSchedules desde la nube:", err);
        }
        return false;
    }
    window.syncExamSchedulesFromCloud = syncExamSchedulesFromCloud;

    // Escuchar sincronizaciones entre pestañas y roles mediante BroadcastChannel
    if (typeof _enccBroadcastChannel !== 'undefined' && _enccBroadcastChannel) {
        try {
            _enccBroadcastChannel.addEventListener('message', (ev) => {
                if (ev && ev.data && ev.data.type === 'EXAM_SCHEDULES_SYNCED' && ev.data.data) {
                    STATE.examSchedules = ev.data.data;
                    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ev.data.data)); } catch(e) {}
                    const v = document.getElementById('view-exam-schedules');
                    if (v && v.style.display !== 'none') {
                        renderExamSchedulesView();
                    }
                }
            });
        } catch(e) {}
    }

    // Guardar cambios en LocalStorage y sincronizar a Firebase
    function saveExamSchedulesData(showNotification = true) {
        try {
            const data = getExamSchedulesData();
            if (typeof localStorage !== 'undefined' && localStorage.setItem) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }

            // Notificar a otras pestañas en tiempo real
            if (typeof _enccBroadcastChannel !== 'undefined' && _enccBroadcastChannel) {
                try {
                    _enccBroadcastChannel.postMessage({
                        type: 'EXAM_SCHEDULES_SYNCED',
                        data: data,
                        timestamp: Date.now()
                    });
                } catch(bcErr) {}
            }

            // Sincronización en segundo plano con Firebase Firestore
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
            // Sincronización con Firebase RTDB
            if (typeof EnccoCloudSync !== 'undefined' && EnccoCloudSync.syncNode) {
                EnccoCloudSync.syncNode('examSchedules', data).catch(err => {
                    console.warn("Aviso al guardar examSchedules en RTDB:", err);
                });
            } else if (typeof EnccoCloudSync !== 'undefined' && EnccoCloudSync.patchNode) {
                EnccoCloudSync.patchNode('examSchedules', data).catch(err => {
                    console.warn("Aviso al guardar examSchedules en RTDB:", err);
                });
            }

            if (showNotification && typeof showToast === 'function') {
                showToast("Roles y horarios de exámenes guardados y sincronizados exitosamente.", "success");
            }
        } catch (e) {
            console.error("Error al persistir examSchedules:", e);
        }
    }

    // Comprobar si el usuario actual tiene acceso al módulo (Dirección, Secretaría, Auxiliatura, Admin)
    function hasExamScheduleAccess(overrideRole) {
        const role = (overrideRole || (window.EnccoAuthStore ? window.EnccoAuthStore.getRole() : (window.STATE ? STATE.currentRole : '')) || '').toLowerCase().trim();
        const allowed = ['director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar', 'auxiliatura', 'admin', 'super_usuario'];
        return allowed.includes(role);
    }

    // Comprobar si un usuario es un docente elegible para cuidar (Auxiliar, Director y Secretaría NO se incluyen)
    function isTeacherEligibleForProctoring(u) {
        if (!u) return false;
        if (u.active === false || u.status === 'Inactivo') return false;
        const role = (u.role || '').toLowerCase().trim();
        const userRoles = Array.isArray(u.roles) ? u.roles.map(r => String(r).toLowerCase().trim()) : [];
        const allRoles = [role, ...userRoles].filter(Boolean);
        const forbiddenRoles = ['auxiliar', 'profesor_auxiliar', 'auxiliatura', 'director', 'direccion', 'secretaria', 'admin', 'administrador', 'super_usuario'];
        if (allRoles.some(r => forbiddenRoles.includes(r))) return false;
        return allRoles.some(r => r === 'docente' || r === 'profesor');
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

    // Obtener dinámicamente el bimestre activo del sistema (ej. "BIM1", "BIM2", "BIM3", "BIM4")
    function getInstitutionalActiveBimester() {
        const stateConfig = (window.STATE && window.STATE.config) || {};
        const rawBim = stateConfig.bimestreActivoOficial || stateConfig.activeBimestre || (window.STATE && window.STATE.activeBimester);
        if (rawBim) {
            const num = parseInt(rawBim, 10);
            if (!isNaN(num) && num >= 1 && num <= 4) return `BIM${num}`;
            if (typeof rawBim === 'string' && rawBim.startsWith('BIM')) return rawBim;
        }
        // Fallback a localStorage si existe
        try {
            const savedBim = localStorage.getItem('activeBimestre') || localStorage.getItem('encco_active_bimestre');
            if (savedBim) {
                const n = parseInt(savedBim, 10);
                if (!isNaN(n) && n >= 1 && n <= 4) return `BIM${n}`;
            }
        } catch (e) {}
        return 'BIM3'; // Default seguro
    }

    // Obtener la clave actual del bloque (ej. "2026_BIM3")
    function getCurrentScheduleKey(bim = null) {
        const cycle = (window.STATE && window.STATE.activeCycle) || '2026';
        const bimester = bim || window._currentSelectedExamBim || getInstitutionalActiveBimester();
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
        } else {
            // Sincronizar y reconciliar titulares en memoria con el pensum oficial
            try {
                reconcileScheduleBlockTitulars(all[key]);
            } catch (e) {
                console.warn("Aviso en reconcileScheduleBlockTitulars:", e);
            }
        }
        return all[key];
    }

    // Helper universal para ubicar un día programado y su bloque correspondiente sin fallos por desalineación de bimestre
    function findDayAndScheduleBlock(dayId, preferredBim = null) {
        if (!dayId) return { dayObj: null, day: null, scheduleBlock: null, scheduleKey: null };
        const bimesterSelectVal = preferredBim || (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        let scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        let dayObj = (scheduleBlock.days || []).find(d => String(d.id) === String(dayId));
        if (dayObj) return { dayObj, day: dayObj, scheduleBlock, scheduleKey };

        // Búsqueda exhaustiva en todos los bloques del sistema si no se encontró en el bimestre preferido
        const all = getExamSchedulesData();
        for (const key in all) {
            const blk = all[key];
            if (blk && Array.isArray(blk.days)) {
                const foundDay = blk.days.find(d => String(d.id) === String(dayId));
                if (foundDay) {
                    return { dayObj: foundDay, day: foundDay, scheduleBlock: blk, scheduleKey: key };
                }
            }
        }
        return { dayObj: null, day: null, scheduleBlock: scheduleBlock, scheduleKey: scheduleKey };
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
                // Evaluaciones en proceso no generan carga de cuido
                if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') return;

                const dur = parseInt(ev.durationMinutes, 10) || 60;

                if (ev.isPractica) {
                    // Práctica Supervisada: Relevo a mitad de tiempo (dur / 2 para cada turno)
                    const halfDur = Math.round(dur / 2);
                    if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                        ev.sections.forEach(sec => {
                            if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') return;
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
                } else if ((ev.isComputacion || ev.isMecanografia) && ev.computacionMode === 'single') {
                    // Computación o Mecanografía salón/taller único: los titulares evalúan y cuidan
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
                    const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
                    if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                        ev.sections.forEach(sec => {
                            if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') return;
                            const secDur = parseInt(sec.durationMinutes, 10) || dur;
                            const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';

                            if (secIsFull) {
                                const sRoom = sec.singleRoom || sec.groupA;
                                if (sRoom && sRoom.caretakerTeacherId && workload[sRoom.caretakerTeacherId]) {
                                    workload[sRoom.caretakerTeacherId].minutes += secDur;
                                    workload[sRoom.caretakerTeacherId].salonesCount += 1;
                                }
                            } else {
                                ['groupA', 'groupB'].forEach(grpKey => {
                                    const grp = sec[grpKey];
                                    if (grp && grp.caretakerTeacherId && workload[grp.caretakerTeacherId]) {
                                        workload[grp.caretakerTeacherId].minutes += secDur;
                                        workload[grp.caretakerTeacherId].salonesCount += 1;
                                    }
                                });
                            }
                        });
                    } else {
                        if (isFull) {
                            const sRoom = ev.singleRoom || ev.groupA;
                            if (sRoom && sRoom.caretakerTeacherId && workload[sRoom.caretakerTeacherId]) {
                                workload[sRoom.caretakerTeacherId].minutes += dur;
                                workload[sRoom.caretakerTeacherId].salonesCount += 1;
                            }
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
            allStudents: students,
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

    // Comparación estricta y canónica de nombres de materias evitando colisiones de sufijos (I vs II vs III, 1 vs 2 vs 3)
    function isSameSubject(nameA, nameB) {
        if (!nameA || !nameB) return false;
        const normSub = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        const normA = normSub(nameA);
        const normB = normSub(nameB);
        if (normA === normB) return true;

        const getLevelSuffix = (str) => {
            const m = str.match(/\b(I{1,3}|IV|V|VI|[1-6])\b\s*$/i);
            if (!m) return null;
            const val = m[1].toUpperCase();
            if (val === '1') return 'I';
            if (val === '2') return 'II';
            if (val === '3') return 'III';
            if (val === '4') return 'IV';
            if (val === '5') return 'V';
            if (val === '6') return 'VI';
            return val;
        };

        const suffA = getLevelSuffix(normA);
        const suffB = getLevelSuffix(normB);

        // Si difieren en sufijo numérico/romano (ej. Inglés Comercial I vs II), NUNCA coinciden
        if (suffA && suffB && suffA !== suffB) return false;
        // Si uno tiene sufijo y el otro no (ej. Inglés Comercial vs Inglés Comercial II), no coinciden
        if ((suffA && !suffB) || (!suffA && suffB)) return false;

        // Si ambos tienen el mismo sufijo, comparar la raíz
        if (suffA && suffB && suffA === suffB) {
            const baseA = normA.replace(/\b(I{1,3}|IV|V|VI|[1-6])\b\s*$/i, '').trim();
            const baseB = normB.replace(/\b(I{1,3}|IV|V|VI|[1-6])\b\s*$/i, '').trim();
            return (baseA === baseB) || (baseA.includes(baseB) && baseB.length > 4) || (baseB.includes(baseA) && baseA.length > 4);
        }

        return (normA.includes(normB) && normB.length > 4) || (normB.includes(normA) && normA.length > 4);
    }

    // Obtener las materias únicas para un Grado Académico consolidado
    function getCoursesForAcademicGrade(academicGradeName) {
        if (!academicGradeName) return [];
        const term = academicGradeName.toUpperCase().trim();
        const normSub = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        const termNorm = normSub(term);

        let targetGradeNum = 0;
        if (termNorm.includes('6') || termNorm.includes('SEXTO') || termNorm.includes('6TO')) targetGradeNum = 6;
        else if (termNorm.includes('5') || termNorm.includes('QUINTO') || termNorm.includes('5TO')) targetGradeNum = 5;
        else if (termNorm.includes('4') || termNorm.includes('CUARTO') || termNorm.includes('4TO')) targetGradeNum = 4;

        const seen = new Set();
        const courses = [];

        (STATE.pensum || []).forEach(p => {
            const rawP = normSub((p.grade || '') + ' ' + (p.gradeCode || ''));
            if (targetGradeNum > 0) {
                if (targetGradeNum === 5 && (rawP.includes('4TO') || rawP.includes('CUARTO') || rawP.includes('6TO') || rawP.includes('SEXTO'))) return;
                if (targetGradeNum === 4 && (rawP.includes('5TO') || rawP.includes('QUINTO') || rawP.includes('6TO') || rawP.includes('SEXTO'))) return;
                if (targetGradeNum === 6 && (rawP.includes('4TO') || rawP.includes('CUARTO') || rawP.includes('5TO') || rawP.includes('QUINTO'))) return;
                if (!rawP.includes(String(targetGradeNum))) return;
            } else {
                const matchesGrade = rawP.includes(termNorm) || (p.grade && normSub(p.grade) === termNorm);
                if (!matchesGrade) return;
            }

            const sub = (p.subject || p.name || p.subjectName || '').trim();
            if (sub && !seen.has(sub.toUpperCase())) {
                seen.add(sub.toUpperCase());
                courses.push(sub);
            }
        });

        courses.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        return courses;
    }

    // Obtener todas las secciones y sus catedráticos titulares para una materia y grado
    function getSectionsAndTitularsForCourse(academicGradeName, subjectName) {
        if (!academicGradeName || !subjectName) return [];
        const term = academicGradeName.toUpperCase().trim();
        const normSub = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        const subNorm = normSub(subjectName);
        const termNorm = normSub(term);

        let targetGradeNum = 0;
        if (termNorm.includes('6') || termNorm.includes('SEXTO') || termNorm.includes('6TO')) targetGradeNum = 6;
        else if (termNorm.includes('5') || termNorm.includes('QUINTO') || termNorm.includes('5TO')) targetGradeNum = 5;
        else if (termNorm.includes('4') || termNorm.includes('CUARTO') || termNorm.includes('4TO')) targetGradeNum = 4;

        // Si targetGradeNum aún es 0, inferir del sufijo del curso si es un curso numerado
        if (targetGradeNum === 0) {
            if (subNorm.endsWith(' III') || subNorm.endsWith(' 3')) targetGradeNum = 6;
            else if (subNorm.endsWith(' II') || subNorm.endsWith(' 2')) targetGradeNum = 5;
            else if (subNorm.endsWith(' I') || subNorm.endsWith(' 1')) targetGradeNum = 4;
        }

        // 1. Identificar grados/secciones coincidentes en gradesList
        let matchingGrades = (STATE.gradesList || []).filter(g => {
            let base = (g.name || g.code || '').replace(/\s+Secci[oó]n\s+[A-D]/i, '').replace(/\s+[A-D]$/i, '').trim().toUpperCase();
            const gRaw = normSub((g.name || '') + ' ' + (g.code || ''));
            if (targetGradeNum > 0) {
                if (targetGradeNum === 5 && (gRaw.includes('4TO') || gRaw.includes('CUARTO') || gRaw.includes('6TO') || gRaw.includes('SEXTO'))) return false;
                if (targetGradeNum === 4 && (gRaw.includes('5TO') || gRaw.includes('QUINTO') || gRaw.includes('6TO') || gRaw.includes('SEXTO'))) return false;
                if (targetGradeNum === 6 && (gRaw.includes('4TO') || gRaw.includes('CUARTO') || gRaw.includes('5TO') || gRaw.includes('QUINTO'))) return false;
                if (gRaw.includes(String(targetGradeNum))) return true;
            }
            return base === term || ((g.name || '').toUpperCase().includes(term));
        });

        // Si no hay en gradesList, deducir secciones desde pensum
        if (matchingGrades.length === 0) {
            const seenSecs = new Set();
            (STATE.pensum || []).forEach(p => {
                const rawP = normSub((p.grade || '') + ' ' + (p.gradeCode || ''));
                if (targetGradeNum > 0) {
                    if (targetGradeNum === 5 && (rawP.includes('4TO') || rawP.includes('CUARTO') || rawP.includes('6TO') || rawP.includes('SEXTO'))) return;
                    if (targetGradeNum === 4 && (rawP.includes('5TO') || rawP.includes('QUINTO') || rawP.includes('6TO') || rawP.includes('SEXTO'))) return;
                    if (targetGradeNum === 6 && (rawP.includes('4TO') || rawP.includes('CUARTO') || rawP.includes('5TO') || rawP.includes('QUINTO'))) return;
                    if (!rawP.includes(String(targetGradeNum))) return;
                } else if (!rawP.includes(termNorm)) {
                    return;
                }
                const sec = (p.section || 'Sección A').trim();
                const secNorm = normSub(sec);
                if (!seenSecs.has(secNorm)) {
                    seenSecs.add(secNorm);
                    matchingGrades.push({
                        code: p.gradeCode || `${academicGradeName} ${sec}`,
                        name: academicGradeName,
                        section: sec
                    });
                }
            });
        }

        // Ordenar secciones alfabéticamente (Sección A, Sección B...)
        matchingGrades.sort((a, b) => (a.section || '').localeCompare(b.section || '', 'es'));

        const sectionsInfo = [];

        matchingGrades.forEach(g => {
            const secLetter = (g.section || '').replace(/Secci[oó]n\s*/i, '').trim() || 'A';

            const pMatch = (STATE.pensum || []).find(p => {
                // Verificar estrictamente el grado para evitar colisiones con cursos de otros grados
                const rawP = normSub((p.grade || '') + ' ' + (p.gradeCode || ''));
                if (targetGradeNum > 0) {
                    if (targetGradeNum === 5 && (rawP.includes('4TO') || rawP.includes('CUARTO') || rawP.includes('6TO') || rawP.includes('SEXTO'))) return false;
                    if (targetGradeNum === 4 && (rawP.includes('5TO') || rawP.includes('QUINTO') || rawP.includes('6TO') || rawP.includes('SEXTO'))) return false;
                    if (targetGradeNum === 6 && (rawP.includes('4TO') || rawP.includes('CUARTO') || rawP.includes('5TO') || rawP.includes('QUINTO'))) return false;
                    if (!rawP.includes(String(targetGradeNum))) return false;
                } else {
                    const matchesGrade = rawP.includes(termNorm) || (p.grade && normSub(p.grade) === termNorm);
                    if (!matchesGrade) return false;
                }

                // Verificar materia con isSameSubject
                const pSub = p.subject || p.name || p.subjectName;
                if (!isSameSubject(pSub, subjectName)) return false;

                // Verificar sección
                const pSec = (p.section || '').replace(/Secci[oó]n\s*/i, '').trim().toUpperCase();
                if (pSec && pSec === secLetter.toUpperCase()) return true;

                const secMatch = rawP.includes(`SECCION ${secLetter}`) || 
                                 rawP.includes(`SECCIÓN ${secLetter}`) || 
                                 rawP.endsWith(` ${secLetter}`) || 
                                 rawP.includes(`(${secLetter})`) ||
                                 rawP.includes(`-${secLetter}`) ||
                                 (p.gradeCode === g.code);
                return secMatch;
            });

            // Si se encontró profesor pero no ID, o viceversa, buscar en STATE.users
            let teacherId = pMatch ? (pMatch.teacherId || '') : '';
            let teacherName = pMatch ? (pMatch.teacher || pMatch.teacherName || '') : '';
            
            // Sincronización bidireccional y robusta con STATE.users
            if (teacherId && Array.isArray(STATE.users)) {
                const u = STATE.users.find(x => x.id === teacherId);
                if (u) teacherName = u.name;
            } else if (!teacherId && teacherName && Array.isArray(STATE.users)) {
                const normTarget = normSub(teacherName);
                const u = STATE.users.find(x => {
                    const normU = normSub(x.name);
                    return normU === normTarget || normU.includes(normTarget) || normTarget.includes(normU);
                });
                if (u) {
                    teacherId = u.id;
                    teacherName = u.name;
                }
            }

            sectionsInfo.push({
                gradeCode: g.code || g.id,
                gradeName: g.name || academicGradeName,
                section: g.section || ('Sección ' + secLetter),
                sectionLetter: secLetter,
                courseId: pMatch ? pMatch.id : '',
                teacherId: teacherId,
                teacherName: teacherName || 'Sin docente asignado'
            });
        });

        return sectionsInfo;
    }

    // Reconciliar y asegurar que los titulares de cada evaluación en el bloque de exámenes
    // coincidan estrictamente con la fuente oficial del pensum institucional
    function reconcileScheduleBlockTitulars(scheduleBlock) {
        if (!scheduleBlock || !Array.isArray(scheduleBlock.days)) return false;
        let modified = false;

        scheduleBlock.days.forEach(day => {
            (day.evaluations || []).forEach(ev => {
                const gradeName = ev.academicGradeName || ev.gradeName;
                const courseName = ev.courseName;
                if (!gradeName || !courseName) return;

                const freshTitulars = getSectionsAndTitularsForCourse(gradeName, courseName);
                if (!freshTitulars || freshTitulars.length === 0) return;

                const freshConsolidated = Array.from(new Set(freshTitulars.map(t => t.teacherName).filter(Boolean))).join(', ');
                if (freshConsolidated && ev.courseTeacherName !== freshConsolidated) {
                    ev.courseTeacherName = freshConsolidated;
                    modified = true;
                }
                if (freshTitulars[0] && freshTitulars[0].teacherId && ev.courseTeacherId !== freshTitulars[0].teacherId) {
                    ev.courseTeacherId = freshTitulars[0].teacherId;
                    modified = true;
                }

                // Sincronizar titularTeachers
                const newTitularTeachers = freshTitulars.map(t => ({
                    section: t.section,
                    teacherId: t.teacherId,
                    teacherName: t.teacherName
                }));
                ev.titularTeachers = newTitularTeachers;

                // Sincronizar cada sección individual
                if (Array.isArray(ev.sections)) {
                    ev.sections.forEach(sec => {
                        const secLetter = (sec.sectionLetter || (sec.section || '').replace(/Secci[oó]n\s*/i, '').trim()).toUpperCase();
                        const matchingTitular = freshTitulars.find(t => t.sectionLetter.toUpperCase() === secLetter || t.section === sec.section);
                        if (matchingTitular) {
                            if (sec.teacherName !== matchingTitular.teacherName) {
                                sec.teacherName = matchingTitular.teacherName;
                                modified = true;
                            }
                            if (sec.teacherId !== matchingTitular.teacherId) {
                                sec.teacherId = matchingTitular.teacherId;
                                modified = true;
                            }
                            if (matchingTitular.courseId && sec.courseId !== matchingTitular.courseId) {
                                sec.courseId = matchingTitular.courseId;
                                modified = true;
                            }
                        }
                    });
                }
            });
        });

        return modified;
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
                    <p>El Módulo de Auxiliaturas de Exámenes es exclusivo para Auxiliatura, Dirección y Secretaría.</p>
                </div>
            `;
            return;
        }

        const officialActiveBim = getInstitutionalActiveBimester();
        // Si el usuario no ha seleccionado explícitamente otro bimestre en esta sesión, usar siempre el bimestre activo oficial
        const bimesterSelectVal = window._currentSelectedExamBim || officialActiveBim;
        window._currentSelectedExamBim = bimesterSelectVal;

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
                                Auxiliaturas de Exámenes
                            </h2>
                            <p style="margin:2px 0 0 0; color:#64748b; font-size:0.82rem;">
                                Auxiliatura General ─ Cuido equitativo, salones automáticos y medias listas oficiales.
                            </p>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:6px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:4px 8px;">
                            <label style="font-weight:700; font-size:0.82rem; color:#475569; margin:0;">Bimestre:</label>
                            <select id="examBimesterSelect" class="form-control form-control-sm" style="width:175px; font-weight:800; border:none; background:transparent; padding:2px 4px;" onchange="window.changeExamBimester(this.value)">
                                <option value="BIM1" ${bimesterSelectVal === 'BIM1' ? 'selected' : ''}>I Bimestre ${officialActiveBim === 'BIM1' ? '⭐ (Activo)' : ''}</option>
                                <option value="BIM2" ${bimesterSelectVal === 'BIM2' ? 'selected' : ''}>II Bimestre ${officialActiveBim === 'BIM2' ? '⭐ (Activo)' : ''}</option>
                                <option value="BIM3" ${bimesterSelectVal === 'BIM3' ? 'selected' : ''}>III Bimestre ${officialActiveBim === 'BIM3' ? '⭐ (Activo)' : ''}</option>
                                <option value="BIM4" ${bimesterSelectVal === 'BIM4' ? 'selected' : ''}>IV Bimestre ${officialActiveBim === 'BIM4' ? '⭐ (Activo)' : ''}</option>
                            </select>
                            <span class="badge" style="background:#15803d; color:#ffffff; font-size:0.7rem; font-weight:800; padding:3px 6px;" title="Bimestre fijado activamente en la plataforma">
                                Activo: ${bimesterLabels[officialActiveBim] || officialActiveBim}
                            </span>
                        </div>

                        <!-- CONTROLES DE VISTA: EXPANDIR / CONTRAER TODOS -->
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary" onclick="window.toggleAllExamDays(true)" style="font-weight:700; font-size:0.84rem; background:#ffffff; color:#334155;" title="Desplegar el detalle de todos los días para edición">
                                <i class="fa-solid fa-angles-down"></i> Desplegar Todos
                            </button>
                            <button type="button" class="btn btn-outline-secondary" onclick="window.toggleAllExamDays(false)" style="font-weight:700; font-size:0.84rem; background:#ffffff; color:#334155;" title="Contraer todos los días para vista panorámica limpia">
                                <i class="fa-solid fa-angles-up"></i> Contraer Todos
                            </button>
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

    // Clasificar grado académico de una evaluación (4to, 5to, 6to u otro)
    function classifyGradeForDay(ev) {
        const s = (ev.academicGradeName || ev.gradeName || ev.gradeCode || '').toLowerCase();
        if (s.includes('4') || /cuarto/i.test(s)) return { key: '4to', title: '4to Perito Contador', shortTitle: '4to Perito', order: 1 };
        if (s.includes('5') || /quinto/i.test(s)) return { key: '5to', title: '5to Perito Contador', shortTitle: '5to Perito', order: 2 };
        if (s.includes('6') || /sexto/i.test(s)) return { key: '6to', title: '6to Perito Contador', shortTitle: '6to Perito', order: 3 };
        return { key: 'otro', title: ev.academicGradeName || ev.gradeName || 'Otros Grados', shortTitle: 'Otros', order: 4 };
    }

    // Obtener columnas de grados para una jornada (2 columnas para 4to y 5to; 3 columnas si hay 6to)
    function getActiveGradeColumnsForDay(dayObj) {
        // Excluir asignaturas evaluadas en proceso para el cálculo de columnas de examen
        const evs = (dayObj.evaluations || []).filter(e => !e.isEnProceso && e.evaluationStatus !== 'EN_PROCESO');
        const has6to = evs.some(e => classifyGradeForDay(e).key === '6to');
        const has5to = evs.some(e => classifyGradeForDay(e).key === '5to');
        const has4to = evs.some(e => classifyGradeForDay(e).key === '4to');

        const cols = [];
        if (has4to || (!has6to && !has5to)) {
            cols.push({ key: '4to', title: '4to Perito Contador', shortTitle: '4to Perito', order: 1 });
        }
        if (has5to || (!has6to && !has4to)) {
            cols.push({ key: '5to', title: '5to Perito Contador', shortTitle: '5to Perito', order: 2 });
        }
        if (has6to) {
            cols.push({ key: '6to', title: '6to Perito Contador', shortTitle: '6to Perito', order: 3 });
        }
        evs.forEach(e => {
            const cg = classifyGradeForDay(e);
            if (cg.key === 'otro' && !cols.find(c => c.key === 'otro')) {
                cols.push(cg);
            }
        });
        return cols;
    }

    // Tabla de distribución de cuidos por grado y hora de evaluación
    function renderCuidoDistributionTableHtml(dayObj, activeGradeCols) {
        // Excluir materias en proceso de la tabla de cuidadores
        const evs = (dayObj.evaluations || []).filter(e => !e.isEnProceso && e.evaluationStatus !== 'EN_PROCESO');
        if (evs.length === 0) return '';

        const timeIntervals = [];
        evs.forEach(ev => {
            const slot = `${ev.startTime} a ${ev.endTime}`;
            if (!timeIntervals.includes(slot)) timeIntervals.push(slot);
        });
        timeIntervals.sort((a, b) => timeStringToMinutes(a.split(' a ')[0]) - timeStringToMinutes(b.split(' a ')[0]));

        let rowsHtml = '';
        timeIntervals.forEach(slot => {
            const [slotStart, slotEnd] = slot.split(' a ');
            rowsHtml += `
                <tr>
                    <td style="padding:8px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-weight:800; font-size:0.84rem; white-space:nowrap; vertical-align:top;">
                        ⏰ ${slot} hrs
                    </td>
            `;

            activeGradeCols.forEach(col => {
                const matchEvals = evs.filter(e => {
                    const cg = classifyGradeForDay(e);
                    return cg.key === col.key && e.startTime === slotStart && e.endTime === slotEnd;
                });

                if (matchEvals.length === 0) {
                    rowsHtml += `
                        <td style="padding:8px 10px; border:1px solid #cbd5e1; vertical-align:middle; text-align:center; color:#94a3b8; font-style:italic; font-size:0.8rem;">
                            Sin examen
                        </td>
                    `;
                } else {
                    let cellContent = matchEvals.map(ev => {
                        const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
                        let cuidadoresList = '';
                        if (ev.isPractica) {
                            const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
                            cuidadoresList = `
                                <div style="font-size:0.76rem; color:#1e40af; line-height:1.3; margin-top:3px;">
                                    <strong>Salón ${ev.groupA.classroom} (A):</strong> ${ev.groupA.caretakerTeacherName || 'N/A'} / Relevo: ${ev.groupA.caretakerTurn2Name || 'N/A'}<br>
                                    <strong>Salón ${ev.groupB.classroom} (B):</strong> ${ev.groupB.caretakerTeacherName || 'N/A'} / Relevo: ${ev.groupB.caretakerTurn2Name || 'N/A'}
                                </div>
                            `;
                        } else if ((ev.isComputacion || ev.isMecanografia) && ev.computacionMode === 'single') {
                            cuidadoresList = `
                                <div style="font-size:0.76rem; color:#92400e; margin-top:3px;">
                                    <strong>${ev.isMecanografia ? '⌨️ Taller Meca' : '💻 Lab. Computación'}:</strong> ${ev.courseTeacherName} (Titulares)
                                </div>
                            `;
                        } else if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                            cuidadoresList = ev.sections.map(sec => {
                                if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') {
                                    return `<div style="font-size:0.76rem; color:#92400e; line-height:1.3; margin-top:2px;">
                                        <strong>${sec.section}:</strong> <span class="badge" style="background:#fef3c7; color:#92400e; font-size:0.7rem;">📁 En Proceso</span>
                                    </div>`;
                                }
                                const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                                if (secIsFull) {
                                    const sRoom = sec.singleRoom || sec.groupA || {};
                                    return `<div style="font-size:0.76rem; color:#0f172a; line-height:1.3; margin-top:2px;">
                                        <strong>${sec.section} (${sRoom.classroom || 'Salón'}):</strong> ${sRoom.caretakerTeacherName || 'Sin asignar'}
                                    </div>`;
                                } else {
                                    return `<div style="font-size:0.76rem; color:#0f172a; line-height:1.3; margin-top:2px;">
                                        <strong>${sec.section}:</strong> Salón ${sec.groupA.classroom} (A): ${sec.groupA.caretakerTeacherName || 'N/A'} | Salón ${sec.groupB.classroom} (B): ${sec.groupB.caretakerTeacherName || 'N/A'}
                                    </div>`;
                                }
                            }).join('');
                        } else {
                            if (isFull) {
                                const sRoom = ev.singleRoom || ev.groupA || {};
                                cuidadoresList = `<div style="font-size:0.76rem; color:#0f172a; line-height:1.3; margin-top:2px;">
                                    <strong>Salón ${sRoom.classroom || 'Salón'}:</strong> ${sRoom.caretakerTeacherName || 'N/A'}
                                </div>`;
                            } else {
                                cuidadoresList = `<div style="font-size:0.76rem; color:#0f172a; line-height:1.3; margin-top:2px;">
                                    Salón ${ev.groupA.classroom} (A): ${ev.groupA.caretakerTeacherName || 'N/A'} | Salón ${ev.groupB.classroom} (B): ${ev.groupB.caretakerTeacherName || 'N/A'}
                                </div>`;
                            }
                        }

                        return `
                            <div style="margin-bottom:6px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;">
                                <div style="font-weight:800; font-size:0.86rem; color:#0f172a;">📘 ${ev.courseName}</div>
                                <div style="font-size:0.75rem; color:#475569;">Titular: <strong>${ev.courseTeacherName || 'Sin asignar'}</strong></div>
                                ${cuidadoresList}
                            </div>
                        `;
                    }).join('');

                    rowsHtml += `
                        <td style="padding:8px 10px; border:1px solid #cbd5e1; vertical-align:top;">
                            ${cellContent}
                        </td>
                    `;
                }
            });

            rowsHtml += `</tr>`;
        });

        return `
            <div style="margin-top:12px; background:#ffffff; border-radius:8px; border:1px solid #cbd5e1; padding:12px; overflow-x:auto;">
                <div style="font-weight:800; font-size:0.84rem; color:#1e293b; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <span style="display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-table-columns" style="color:#0284c7;"></i>
                        <strong>Distribución de Cuido por Grado y Hora (${activeGradeCols.length} Columnas):</strong>
                    </span>
                    <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:0.75rem;">
                        ${activeGradeCols.map(c => c.shortTitle).join(' | ')}
                    </span>
                </div>
                <table class="exam-compact-table" style="width:100%; border:1px solid #cbd5e1; border-collapse:collapse; margin:0;">
                    <thead>
                        <tr style="background:#0f172a; color:#ffffff;">
                            <th style="width:18%; padding:8px 10px; border:1px solid #0f172a; text-align:left; font-size:0.8rem; font-weight:800;">
                                ⏰ HORA
                            </th>
                            ${activeGradeCols.map(col => `
                                <th style="padding:8px 10px; border:1px solid #0f172a; text-align:left; font-size:0.8rem; font-weight:800;">
                                    🎓 ${col.title.toUpperCase()}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Calcular estadísticas en tiempo real de cobertura de cuidadores en un día de examen
    function getDayProctorCoverageStats(dayObj) {
        if (!dayObj || !Array.isArray(dayObj.evaluations)) return { totalSlots: 0, coveredSlots: 0, missingSlots: 0 };
        let totalSlots = 0;
        let coveredSlots = 0;

        dayObj.evaluations.forEach(ev => {
            if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') return;
            const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
            const isPractica = !!(ev.isPractica || ev.isPracticaDay || dayObj.isPracticaDay);
            const secs = (Array.isArray(ev.sections) && ev.sections.length > 0) ? ev.sections : [ev];

            secs.forEach(sec => {
                if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') return;
                const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';

                if (secIsFull) {
                    const room = sec.singleRoom || sec.groupA || ev.singleRoom || ev.groupA || {};
                    if (isPractica) {
                        totalSlots += 2;
                        if (room.caretakerTeacherName) coveredSlots++;
                        if (room.caretakerTurn2Name) coveredSlots++;
                    } else {
                        totalSlots += 1;
                        if (room.caretakerTeacherName) coveredSlots++;
                    }
                } else {
                    const grpA = sec.groupA || ev.groupA || {};
                    const grpB = sec.groupB || ev.groupB || {};
                    if (isPractica) {
                        totalSlots += 4;
                        if (grpA.caretakerTeacherName) coveredSlots++;
                        if (grpA.caretakerTurn2Name) coveredSlots++;
                        if (grpB.caretakerTeacherName) coveredSlots++;
                        if (grpB.caretakerTurn2Name) coveredSlots++;
                    } else {
                        totalSlots += 2;
                        if (grpA.caretakerTeacherName) coveredSlots++;
                        if (grpB.caretakerTeacherName) coveredSlots++;
                    }
                }
            });
        });

        return {
            totalSlots,
            coveredSlots,
            missingSlots: Math.max(0, totalSlots - coveredSlots)
        };
    }
    window.getDayProctorCoverageStats = getDayProctorCoverageStats;

    // Renderizar tarjeta individual de un día
    function renderSingleDayCardHtml(scheduleBlock, dayObj, dayIdx) {
        const workload = calculateTeacherWorkloadForDate(scheduleBlock, dayObj.date);
        const activeTeachersToday = Object.values(workload).filter(t => t.minutes > 0);
        const sortedTeachers = activeTeachersToday.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const normalCount = sortedTeachers.filter(t => t.minutes <= 120).length;
        const moderateCount = sortedTeachers.filter(t => t.minutes > 120 && t.minutes <= 180).length;
        const heavyCount = sortedTeachers.filter(t => t.minutes > 180).length;

        const dayDateFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const evs = (dayObj.evaluations || []).slice();
        evs.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

        const activeGradeCols = getActiveGradeColumnsForDay(dayObj);
        const colCount = activeGradeCols.length >= 3 ? 3 : (activeGradeCols.length === 2 ? 2 : 1);

        // Indicador en vivo de cobertura de cuidadores en salones
        const coverageStats = getDayProctorCoverageStats(dayObj);
        const coverageBadgeHtml = coverageStats.totalSlots === 0 ? '' : (
            coverageStats.missingSlots === 0
                ? `<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-size:0.72rem; font-weight:800; padding:2px 7px;" title="Todos los salones y turnos cuentan con cuidadores asignados"><i class="fa-solid fa-circle-check"></i> Salones: 100% cubiertos</span>`
                : `<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; font-size:0.72rem; font-weight:800; padding:2px 7px;" title="Existen salones o turnos pendientes de cuidador"><i class="fa-solid fa-triangle-exclamation"></i> ${coverageStats.missingSlots} puesto(s) sin asignar</span>`
        );

        window._examDaysExpandedState = window._examDaysExpandedState || {};
        const isExpanded = (window._examDaysExpandedState[dayObj.id] !== false);

        let html = `
            <div class="exam-day-banner ${isExpanded ? '' : 'is-collapsed'} ${dayObj.isPracticaDay ? 'is-practica-banner' : ''}" id="examDayBanner_${dayObj.id}" onclick="window.toggleExamDayCollapse('${dayObj.id}')" title="Haga clic para ${isExpanded ? 'contraer' : 'desplegar'} el detalle de este día">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:8px; background:#f1f5f9; color:#475569; display:flex; align-items:center; justify-content:center; font-size:0.95rem; border:1px solid #e2e8f0; flex-shrink:0;">
                        <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}" id="examDayChevron_${dayObj.id}"></i>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <span style="font-size:0.71rem; letter-spacing:0.4px; font-weight:800; background:${dayObj.isPracticaDay ? '#eff6ff' : '#f0fdf4'}; color:${dayObj.isPracticaDay ? '#1d4ed8' : '#15803d'}; border:1px solid ${dayObj.isPracticaDay ? '#bfdbfe' : '#bbf7d0'}; padding:2px 7px; border-radius:4px; text-transform:uppercase;">
                                ${dayObj.isPracticaDay ? '⭐ Práctica Supervisada' : '🗓️ Jornada de Evaluaciones'}
                            </span>
                            <span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:0.72rem; font-weight:800; padding:2px 7px;">
                                ${evs.length} ${evs.length === 1 ? 'materia' : 'materias'}
                            </span>
                            <span class="badge" style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; font-size:0.72rem; font-weight:800; padding:2px 7px;">
                                ${colCount} ${colCount === 1 ? 'grado' : 'grados'}
                            </span>
                            <span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:0.72rem; font-weight:800; padding:2px 7px;">
                                ${activeTeachersToday.length} cuidadores
                            </span>
                            ${coverageBadgeHtml}
                        </div>
                        <h3 style="margin:3px 0 0 0; font-size:1.08rem; font-weight:800; color:#0f172a; text-transform:capitalize;">
                            ${dayDateFormatted}
                        </h3>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;" onclick="event.stopPropagation()">
                    <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.toggleExamDayCollapse('${dayObj.id}')" style="background:#f8fafc; color:#475569; font-weight:700; border:1px solid #cbd5e1; font-size:0.78rem; padding:4px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;" title="Alternar vista desplegada / contraída">
                        <span id="examDayToggleText_${dayObj.id}">${isExpanded ? 'Contraer' : 'Desplegar'}</span>
                    </button>
                    <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.printDailyScheduleOficio('${dayObj.id}')" style="background:#eff6ff; color:#1d4ed8; font-weight:700; border:1px solid #bfdbfe; font-size:0.78rem; padding:4px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;" title="Imprimir Horario Oficial en Hoja Oficio (${colCount} Columnas)">
                        <i class="fa-solid fa-print"></i> Horario Hoja Oficio (${colCount} Col.)
                    </button>
                    <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.printAllMediasListasOfDay('${dayObj.id}')" style="background:#f8fafc; color:#334155; font-weight:700; border:1px solid #cbd5e1; font-size:0.78rem; padding:4px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;" title="Imprimir todas las nóminas (medias listas) de esta jornada">
                        <i class="fa-solid fa-file-signature"></i> Imprimir Nóminas del Día
                    </button>
                    <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.exportExamDayToExcel('${dayObj.id}')" style="background:#f0fdf4; color:#15803d; font-weight:700; border:1px solid #bbf7d0; font-size:0.78rem; padding:4px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;" title="Descargar distribución de salones y cuidadores de este día en formato Excel (CSV)">
                        <i class="fa-solid fa-file-excel"></i> Exportar a Excel
                    </button>
                    <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.addEvaluationToDay('${dayObj.id}')" style="background:#15803d; color:#ffffff; font-weight:700; border:1px solid #166534; font-size:0.78rem; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;" title="Agregar otra evaluación a este día">
                        <i class="fa-solid fa-plus"></i> Asignar Clase
                    </button>
                    <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.deleteExamDay('${dayObj.id}')" style="background:#fff1f2; color:#be123c; font-weight:700; border:1px solid #fecdd3; padding:4px 8px; border-radius:6px;" title="Eliminar este día">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <!-- CONTENEDOR DESPLEGABLE DEL CUERPO DEL DÍA -->
            <div id="examDayBody_${dayObj.id}" class="exam-day-body" style="display:${isExpanded ? 'block' : 'none'}; margin-bottom:24px;">
                <!-- BARRA DE EQUIDAD DOCENTE (ANTIFATIGA) PARA ESTE DÍA -->
                <div style="background:#ffffff; border-radius:10px; padding:12px 16px; margin-bottom:14px; font-size:0.82rem; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="background:#e0f2fe; color:#0369a1; width:26px; height:26px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font-size:0.85rem;">
                                    <i class="fa-solid fa-scale-balanced"></i>
                                </span>
                                <strong style="color:#0f172a; font-size:0.88rem;">Cuidadores Asignados Hoy:</strong>
                                <span class="badge" style="background:#f1f5f9; color:#475569; font-size:0.75rem; font-weight:800; border:1px solid #e2e8f0;">
                                    ${activeTeachersToday.length}
                                </span>
                            </div>
                            ${activeTeachersToday.length > 0 ? `
                            <div style="display:flex; align-items:center; gap:8px; font-size:0.74rem; color:#64748b; font-weight:700;">
                                <span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:2px 6px; border-radius:4px;">
                                    ● ${normalCount} Balanceados (≤120m)
                                </span>
                                ${moderateCount > 0 ? `
                                <span style="background:#fefce8; color:#a16207; border:1px solid #fef08a; padding:2px 6px; border-radius:4px;">
                                    ● ${moderateCount} Moderados (121-180m)
                                </span>` : ''}
                                ${heavyCount > 0 ? `
                                <span style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:2px 6px; border-radius:4px;">
                                    ● ${heavyCount} Alta carga (>180m)
                                </span>` : ''}
                            </div>
                            ` : ''}
                        </div>
                        ${activeTeachersToday.length > 0 ? `
                        <div style="position:relative; width:190px;">
                            <input type="text" id="teacherSearch_${dayObj.id}" onkeyup="window.filterTeachersInDay('${dayObj.id}', this.value)" placeholder="🔍 Filtrar docente..." class="form-control form-control-sm" style="font-size:0.76rem; padding:3px 8px; border-radius:6px; border:1px solid #cbd5e1; background:#f8fafc; height:28px;">
                        </div>
                        ` : ''}
                    </div>
                    <div id="teacherChipsContainer_${dayObj.id}" style="display:flex; flex-wrap:wrap; gap:4px; max-height:140px; overflow-y:auto; padding:2px 0;">
        `;

        if (sortedTeachers.length === 0) {
            html += `<span style="color:#64748b; font-style:italic;">Aún no hay cuidadores asignados para esta fecha.</span>`;
        } else {
            sortedTeachers.forEach(t => {
                let chipClass = 'chip-green';
                if (t.minutes > 180) chipClass = 'chip-red';
                else if (t.minutes > 120) chipClass = 'chip-orange';
                else if (t.minutes > 60) chipClass = 'chip-yellow';

                html += `
                    <span class="exam-teacher-chip ${chipClass}" data-teacher-name="${(t.name || '').toLowerCase()}" title="${t.name}: ${t.minutes} minutos (${t.salonesCount} salones)">
                        <i class="fa-solid fa-user-check"></i> ${t.name}: <strong>${t.minutes} min</strong> (${t.salonesCount} sal.)
                    </span>
                `;
            });
        }

        html += `
                    </div>
                    <!-- DISTRIBUCIÓN ESTRUCTURADA DE CUIDO POR GRADO Y HORA -->
                    ${renderCuidoDistributionTableHtml(dayObj, activeGradeCols)}
                </div>

                <!-- LISTADO DE EVALUACIONES EN COLUMNAS POR GRADO Y HORA -->
                <div style="margin-bottom:16px;">
        `;

        if (!dayObj.evaluations || dayObj.evaluations.length === 0) {
            html += `
                <div style="padding:20px; text-align:center; color:#64748b; font-size:0.88rem; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
                    No hay asignaturas programadas en este día. Haga clic en <strong>"Asignar Clase"</strong>.
                </div>
            `;
        } else {
            html += `
                <div class="exam-grades-grid cols-${colCount}">
            `;

            activeGradeCols.forEach(col => {
                const colEvals = evs.filter(e => classifyGradeForDay(e).key === col.key);
                colEvals.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

                html += `
                    <div class="exam-grade-col-card">
                        <div class="exam-grade-col-header">
                            <span style="font-weight:900; font-size:0.95rem; letter-spacing:0.3px; display:flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-graduation-cap" style="color:#38bdf8;"></i> ${col.title}
                            </span>
                            <span class="badge" style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:0.75rem; font-weight:800;">
                                ${colEvals.length} ${colEvals.length === 1 ? 'materia' : 'materias'}
                            </span>
                        </div>
                `;

                if (colEvals.length === 0) {
                    html += `
                        <div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.82rem; background:#ffffff; border-radius:8px; border:1px dashed #cbd5e1; font-style:italic;">
                            Sin evaluaciones asignadas para este grado hoy.
                        </div>
                    `;
                } else {
                    colEvals.forEach((ev, evIdx) => {
                        html += renderEvaluationItemHtml(dayObj, ev, evIdx);
                    });
                }

                html += `
                    </div>
                `;
            });

            html += `
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
        return html;
    }

    // Renderizar una evaluación específica dentro de un día
    function renderEvaluationItemHtml(dayObj, ev, evIdx) {
        // Sincronizar en caliente los titulares oficiales de la materia desde pensum institucional
        const freshTitulars = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
        if (freshTitulars && freshTitulars.length > 0) {
            ev.courseTeacherName = Array.from(new Set(freshTitulars.map(t => t.teacherName).filter(Boolean))).join(', ');
            (ev.sections || []).forEach(sec => {
                const secLetter = (sec.sectionLetter || (sec.section || '').replace(/Secci[oó]n\s*/i, '').trim()).toUpperCase();
                const matched = freshTitulars.find(t => t.sectionLetter.toUpperCase() === secLetter || t.section === sec.section);
                if (matched) {
                    sec.teacherName = matched.teacherName;
                    sec.teacherId = matched.teacherId;
                }
            });
        }

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
                            ${(ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') ? '<span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:0.75rem; font-weight:800; margin-left:6px;"><i class="fa-solid fa-folder-open"></i> En Proceso</span>' : ''}
                        </h4>
                        <div style="font-size:0.84rem; color:#475569;">
                            👤 <strong>Catedrático Titular:</strong> ${ev.courseTeacherName || 'Sin asignar'}
                            ${isPractica ? '<span style="color:#1d4ed8; font-weight:800; margin-left:8px;">(⭐ Práctica Supervisada - Relevo a los ' + Math.round(ev.durationMinutes / 2) + ' min)</span>' : ''}
                            ${ev.isComputacion ? '<span style="color:#0284c7; font-weight:800; margin-left:8px;">(💻 Laboratorio de Computación)</span>' : ''}
                            ${ev.isMecanografia ? '<span style="color:#b45309; font-weight:800; margin-left:8px;">(⌨️ Taller de Mecanografía ─ Titulares Evalúan)</span>' : ''}
                            ${(ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') ? '<span style="color:#b45309; font-weight:800; margin-left:8px;">(📁 Acumulativo Continuo ─ No aplica examen en salón)</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button type="button" class="btn btn-sm btn-outline-info" onclick="window.previewMediasListasModal('${dayObj.id}', '${ev.id}')" title="Previsualizar nóminas de examen en pantalla sin abrir diálogo de impresión" style="font-weight:700;">
                            <i class="fa-solid fa-eye"></i> Vista Previa
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.printMediasListasModal('${dayObj.id}', '${ev.id}')" title="${(ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') ? 'Materia en proceso (sin examen en salón)' : 'Imprimir Medias Listas de este examen'}">
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

        if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') {
            html += `
                <div class="p-3 rounded" style="background:#fffbeb; border:1.5px dashed #f59e0b; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong style="color:#92400e; font-size:0.95rem; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-folder-open"></i> Evaluación en Proceso (Acumulativo Continuo)
                        </strong>
                        <div style="font-size:0.83rem; color:#78350f; margin-top:2px;">
                            Esta asignatura evalúa formativa y sumativamente a lo largo del bimestre en el aula regular. No utiliza salones de examen ni cuidadores ajenos, y se omite del horario impreso de evaluaciones.
                        </div>
                    </div>
                    <span class="badge" style="background:#fef3c7; color:#92400e; font-size:0.82rem; font-weight:800; padding:6px 12px; border:1px solid #fcd34d;">
                        📁 Acumulativo de Clase
                    </span>
                </div>
            `;
        } else if (isPractica) {
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
        } else if ((ev.isComputacion || ev.isMecanografia) && ev.computacionMode === 'single') {
            const isMeca = ev.isMecanografia;
            html += `
                <div class="p-3 rounded" style="background:${isMeca ? '#fffbeb' : '#f0f9ff'}; border:1.5px solid ${isMeca ? '#fde68a' : '#bae6fd'}; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong style="color:${isMeca ? '#92400e' : '#0369a1'}; font-size:0.95rem; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid ${isMeca ? 'fa-keyboard' : 'fa-laptop-code'}"></i> ${isMeca ? 'Taller de Mecanografía ─ Evaluación Directa por Catedráticos Titulares' : 'Laboratorio de Computación ─ Grupo Único (Todas las Secciones)'}
                        </strong>
                        <div style="font-size:0.83rem; color:#334155; margin-top:2px;">
                            Catedráticos evaluadores y responsables: <strong>${ev.courseTeacherName}</strong> (Docentes Titulares Autorizados)
                        </div>
                    </div>
                    <span class="badge" style="background:${isMeca ? '#fef3c7' : '#e0f2fe'}; color:${isMeca ? '#92400e' : '#0369a1'}; font-size:0.82rem; font-weight:800; padding:6px 12px; border:1px solid ${isMeca ? '#fcd34d' : '#7dd3fc'};">
                        ⏱️ ${ev.startTime} a ${ev.endTime} (${ev.durationMinutes} min)
                    </span>
                </div>
            `;
        } else if (Array.isArray(ev.sections) && ev.sections.length > 0) {
            const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
            // Renderizar tabla unificada y compacta para todas las secciones
            html += `
                <table class="exam-compact-table">
                    <thead>
                        <tr>
                            <th style="width:18%;">Sección y Titular</th>
                            <th style="width:16%;">Horario / Tiempo</th>
                            ${isFull ? `
                                <th style="width:66%;">Salón Único y Cuidador (Sección Completa)</th>
                            ` : `
                                <th style="width:33%;">Salón Grupo A (1 a Mitad)</th>
                                <th style="width:33%;">Salón Grupo B (Mitad a Fin)</th>
                            `}
                        </tr>
                    </thead>
                    <tbody>
            `;
            ev.sections.forEach(sec => {
                const secDur = sec.durationMinutes || ev.durationMinutes;
                const secStart = ev.startTime;
                const secEnd = minutesToTimeString(timeStringToMinutes(secStart) + secDur);
                const isSecFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';

                if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') {
                    html += `
                        <tr>
                            <td>
                                <strong style="color:#15803d; font-size:0.95rem;">${sec.section}</strong>
                                <div style="font-size:0.75rem; color:#334155; margin-top:2px;">Titular: <strong>${sec.teacherName || 'Sin asignar'}</strong></div>
                            </td>
                            <td>
                                <span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800; font-size:0.75rem;">📁 En Proceso</span>
                            </td>
                            <td colspan="${isSecFull ? 1 : 2}" style="background:#fffbeb; color:#92400e; font-size:0.82rem; font-weight:700;">
                                <i class="fa-solid fa-folder-open"></i> Esta sección evalúa en proceso (acumulativo continuo). Sin salón ni docente cuidador asignado.
                            </td>
                        </tr>
                    `;
                    return;
                }

                if (isSecFull) {
                    const sRoom = sec.singleRoom || sec.groupA || {};
                    html += `
                        <tr>
                            <td>
                                <strong style="color:#15803d; font-size:0.95rem;">${sec.section}</strong>
                                <div style="font-size:0.75rem; color:#334155; margin-top:2px;">Titular: <strong>${sec.teacherName || 'Sin asignar'}</strong></div>
                            </td>
                            <td>
                                <span style="font-weight:800; color:#0f172a;">${secStart} - ${secEnd}</span>
                                <div style="font-size:0.75rem; color:#64748b; font-weight:700;">⏱️ ${secDur} min</div>
                            </td>
                            <td>
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                                    <span class="badge" style="background:#f1f5f9; color:#0f172a; font-size:0.84rem; font-weight:800; border:1px solid #cbd5e1;">
                                        🏫 ${sRoom.classroom || 'Salón Único'}
                                    </span>
                                    <span class="badge" style="background:#dbeafe; color:#1e40af; font-size:0.72rem; font-weight:800;">
                                        👥 Sección Completa (${sRoom.range || 'Nómina'})
                                    </span>
                                </div>
                                <div style="margin-top:4px; font-size:0.84rem; color:#334155;">
                                    👤 <strong>Cuida:</strong> ${sRoom.caretakerTeacherName || 'Sin asignar'}
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr>
                            <td>
                                <strong style="color:#15803d; font-size:0.95rem;">${sec.section}</strong>
                                <div style="font-size:0.75rem; color:#334155; margin-top:2px;">Titular: <strong>${sec.teacherName || 'Sin asignar'}</strong></div>
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
                }
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
        try {
            const dateInput = document.getElementById('newExamDayDate');
            const isPractica = document.getElementById('newExamDayIsPractica') ? document.getElementById('newExamDayIsPractica').checked : false;
            if (!dateInput || !dateInput.value) {
                alert("Por favor seleccione una fecha válida.");
                return;
            }

            const dateVal = dateInput.value;
            const bimesterSelectVal = (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
            const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
            const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

            // Evitar fechas duplicadas
            if (scheduleBlock.days && scheduleBlock.days.some(d => d.date === dateVal)) {
                alert("Esta fecha ya se encuentra programada en este bimestre.");
                return;
            }

            const dayId = 'day_' + Date.now();
            scheduleBlock.days = scheduleBlock.days || [];
            scheduleBlock.days.push({
                id: dayId,
                date: dateVal,
                isPracticaDay: isPractica,
                evaluations: []
            });

            // Ordenar días por fecha cronológicamente
            scheduleBlock.days.sort((a, b) => a.date.localeCompare(b.date));

            saveExamSchedulesData(true);
            window._examDaysExpandedState = window._examDaysExpandedState || {};
            window._examDaysExpandedState[dayId] = true;
            const m = document.getElementById('modalAddNewExamDay');
            if (m) m.remove();
            renderExamSchedulesView();
        } catch (err) {
            console.error("Error al programar nuevo día:", err);
            alert("Error al guardar la nueva fecha: " + (err.message || err));
        }
    };

    window.deleteExamDay = function (dayId) {
        if (!confirm("¿Está seguro de eliminar esta fecha completa de evaluaciones y todas sus asignaciones?")) return;
        const { scheduleBlock } = findDayAndScheduleBlock(dayId);
        if (!scheduleBlock || !Array.isArray(scheduleBlock.days)) {
            alert("No se pudo localizar el bloque del día a eliminar.");
            return;
        }

        scheduleBlock.days = scheduleBlock.days.filter(d => String(d.id) !== String(dayId));
        saveExamSchedulesData(true);
        renderExamSchedulesView();
    };

    window.toggleExamDayCollapse = function (dayId) {
        window._examDaysExpandedState = window._examDaysExpandedState || {};
        const cur = window._examDaysExpandedState[dayId] !== false;
        const next = !cur;
        window._examDaysExpandedState[dayId] = next;

        const bodyEl = document.getElementById('examDayBody_' + dayId);
        const iconEl = document.getElementById('examDayChevron_' + dayId);
        const textEl = document.getElementById('examDayToggleText_' + dayId);
        const bannerEl = document.getElementById('examDayBanner_' + dayId);

        if (bodyEl) {
            bodyEl.style.display = next ? 'block' : 'none';
        }
        if (iconEl) {
            iconEl.className = 'fa-solid ' + (next ? 'fa-chevron-up' : 'fa-chevron-down');
        }
        if (textEl) {
            textEl.textContent = next ? 'Contraer' : 'Desplegar';
        }
        if (bannerEl) {
            if (next) bannerEl.classList.remove('is-collapsed');
            else bannerEl.classList.add('is-collapsed');
        }
    };

    window.toggleAllExamDays = function (expandAll) {
        window._examDaysExpandedState = window._examDaysExpandedState || {};
        const bimesterSelectVal = (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);
        (scheduleBlock.days || []).forEach(d => {
            window._examDaysExpandedState[d.id] = expandAll;
        });
        renderExamSchedulesView();
    };

    window.filterTeachersInDay = function (dayId, query) {
        const container = document.getElementById('teacherChipsContainer_' + dayId);
        if (!container) return;
        const q = (query || '').toLowerCase().trim();
        const chips = container.querySelectorAll('.exam-teacher-chip');
        chips.forEach(chip => {
            const name = chip.getAttribute('data-teacher-name') || '';
            if (!q || name.includes(q)) {
                chip.style.display = 'inline-flex';
            } else {
                chip.style.display = 'none';
            }
        });
    };

    /**
     * Seleccionar automáticamente y de manera equitativa/aleatoria cuidadores para un curso en el modal.
     * Excluye a todos los titulares de la asignatura en todas las secciones.
     * Evita colisiones de horario en la misma jornada y balancea la carga según los minutos trabajados hoy.
     */
    function autoPickProctorsForModal(sectionsInfo, titularIds, isPrac, startTimeStr, dayId, editEvalId = '', isFullSection = false) {
        const allCandidates = (STATE.users || []).filter(isTeacherEligibleForProctoring);
        if (allCandidates.length === 0) return {};

        const titularExclusionSet = new Set(Array.isArray(titularIds) ? titularIds : []);
        (sectionsInfo || []).forEach(s => {
            if (s.teacherId) titularExclusionSet.add(s.teacherId);
        });
        const titularNamesSet = new Set((sectionsInfo || []).map(s => (s.teacherName || '').toLowerCase().trim()).filter(Boolean));

        const { dayObj } = findDayAndScheduleBlock(dayId);

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
                        ['singleRoom', 'groupA', 'groupB'].forEach(grpKey => {
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
                    ['singleRoom', 'groupA', 'groupB'].forEach(grpKey => {
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

        function pickCaretaker(slotStart, slotEnd, assignedSet, allowTitulars = false) {
            const slotDur = slotEnd - slotStart;
            const eligible = allCandidates.filter(c => {
                if (!allowTitulars) {
                    if (titularExclusionSet.has(c.id)) return false;
                    if (titularNamesSet.has((c.name || '').toLowerCase().trim())) return false;
                }
                if (assignedSet.has(c.id)) return false;
                const intervals = busyIntervals[c.id] || [];
                return !intervals.some(([bStart, bEnd]) => Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd));
            });

            const candidatePool = (eligible.length > 0)
                ? eligible
                : allCandidates.filter(c => (allowTitulars || (!titularExclusionSet.has(c.id) && !titularNamesSet.has((c.name || '').toLowerCase().trim()))) && !assignedSet.has(c.id));

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
                    caretakerSingle: t1A || '',
                    turn2A: t2A || '',
                    turn2B: t2B || ''
                };
            } else if (isFullSection) {
                // Cuando se seleccione un solo salón a cuidar (Sección Completa), puede cuidar el maestro titular de la sección
                let cSingle = sInfo.teacherId;
                const isTitEligible = cSingle && allCandidates.some(c => c.id === cSingle);
                const intervals = (cSingle && busyIntervals[cSingle]) || [];
                const hasCollision = intervals.some(([bStart, bEnd]) => Math.max(startMin, bStart) < Math.min(secEnd, bEnd));

                if (isTitEligible && !assignedInSlot.has(cSingle) && !hasCollision) {
                    assignedInSlot.add(cSingle);
                    dayWorkload[cSingle] = (dayWorkload[cSingle] || 0) + secDur;
                    if (!busyIntervals[cSingle]) busyIntervals[cSingle] = [];
                    busyIntervals[cSingle].push([startMin, secEnd]);
                } else {
                    cSingle = pickCaretaker(startMin, secEnd, assignedInSlot, true);
                }

                assignments[secCode] = {
                    caretakerA: cSingle || '',
                    caretakerB: cSingle || '',
                    caretakerSingle: cSingle || '',
                    turn2A: '',
                    turn2B: ''
                };
            } else {
                const cA = pickCaretaker(startMin, secEnd, assignedInSlot);
                const cB = pickCaretaker(startMin, secEnd, assignedInSlot);
                assignments[secCode] = {
                    caretakerA: cA || '',
                    caretakerB: cB || '',
                    caretakerSingle: cA || '',
                    turn2A: '',
                    turn2B: ''
                };
            }
        });

        return assignments;
    }

    // Modal para asignar una clase a un día (A nivel de Grado Académico completo con todas sus secciones)
    window.addEvaluationToDay = function (dayId, evalToEdit = null) {
        const { dayObj, scheduleBlock } = findDayAndScheduleBlock(dayId);
        if (!dayObj) {
            alert("No se pudo localizar el día seleccionado para asignar la evaluación.");
            return;
        }

        const modalId = 'modalAddEvaluation';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const academicGrades = getDistinctAcademicGrades();
        const workload = calculateTeacherWorkloadForDate(scheduleBlock, dayObj.date);

        // Guardar contexto en window para interactividad dinámica en el modal
        window._currentDayWorkload = workload;
        window._currentEditingDayId = dayId;
        window._currentEditingEvalId = evalToEdit ? evalToEdit.id : '';

        // Función segura para cerrar el modal
        window.closeAddEvaluationModal = function () {
            const m = document.getElementById('modalAddEvaluation');
            if (m) m.remove();
        };

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
        window._currentEditPayload = evalToEdit;
        window.reAutoAssignProctorsModal = function () {
            const courseSelect = document.getElementById('evalCourseSelect');
            if (courseSelect && courseSelect.value) {
                window.onEvalCourseChanged(courseSelect.value, null);
            }
        };

        window.onSectionModeChanged = function (newMode) {
            const courseSelect = document.getElementById('evalCourseSelect');
            if (courseSelect && courseSelect.value) {
                window.onEvalCourseChanged(courseSelect.value, window._currentEditPayload || null);
            }
        };

        window.onSectionProcessStatusChanged = function (sIdx, newStatus) {
            const salonsBox = document.getElementById(`evalSectionSalonsBox_${sIdx}`);
            const noticeBox = document.getElementById(`evalSectionEnProcesoNotice_${sIdx}`);
            const selElem = document.getElementById(`evalSectionProcessStatus_${sIdx}`);
            const isEnProceso = (newStatus === 'EN_PROCESO');

            if (salonsBox) salonsBox.style.display = isEnProceso ? 'none' : 'block';
            if (noticeBox) noticeBox.style.display = isEnProceso ? 'block' : 'none';
            if (selElem) {
                selElem.style.background = isEnProceso ? '#fef3c7' : '#f0fdf4';
                selElem.style.borderColor = isEnProceso ? '#f59e0b' : '#86efac';
                selElem.style.color = isEnProceso ? '#92400e' : '#15803d';
            }

            const reqInputs = [
                document.getElementById(`evalCaretakerSingle_${sIdx}`),
                document.getElementById(`evalCaretakerA_${sIdx}`),
                document.getElementById(`evalCaretakerB_${sIdx}`)
            ];
            reqInputs.forEach(inp => {
                if (inp) {
                    if (isEnProceso) {
                        inp.removeAttribute('required');
                    } else {
                        inp.setAttribute('required', 'required');
                    }
                }
            });
        };

        window.setAllSectionsProcessStatus = function (targetStatus) {
            const selects = document.querySelectorAll('[id^="evalSectionProcessStatus_"]');
            if (!selects || selects.length === 0) {
                alert("Primero seleccione grado y asignatura para cargar las secciones correspondientes.");
                return;
            }
            selects.forEach((sel) => {
                sel.value = targetStatus;
                const idx = sel.id.replace('evalSectionProcessStatus_', '');
                window.onSectionProcessStatusChanged(idx, targetStatus);
            });
            window.recalcEvalTimes();
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
            if (selectedId && !opts.includes(`value="${selectedId}"`)) {
                const prevUser = (STATE.users || []).find(u => u.id === selectedId);
                if (prevUser) {
                    opts += `<option value="${prevUser.id}" selected>${prevUser.name} (Asignado)</option>`;
                }
            }
            return opts;
        };

        const isInitFull = evalToEdit && evalToEdit.evaluationMode === 'SECCION_COMPLETA';

        const modalHtml = `
            <div class="exam-modal-overlay" id="${modalId}" onclick="if(event.target===this) window.closeAddEvaluationModal()">
                <div class="exam-modal-box modal-lg-box" style="max-height:92vh; display:flex; flex-direction:column;">
                    <div style="background:#0f172a; color:white; padding:16px 22px; display:flex; align-items:center; justify-content:space-between; border-radius:14px 14px 0 0; flex-shrink:0;">
                        <h4 style="margin:0; font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px; color:#ffffff;">
                            <i class="fa-solid fa-file-pen" style="color:#22c55e;"></i> ${evalToEdit ? 'Editar Evaluación a Nivel de Grado' : 'Asignar Asignatura y Cuidadores (Todas las Secciones)'}
                        </h4>
                        <button type="button" onclick="window.closeAddEvaluationModal()" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer; line-height:1; padding:0 4px;" title="Cerrar ventana">&times;</button>
                    </div>
                    <div style="padding:22px; overflow-y:auto; flex:1; min-height:0; -webkit-overflow-scrolling:touch;">
                        <form id="formAddEval" onsubmit="event.preventDefault(); return false;">
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
                                    <label class="form-label" style="font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
                                        <i class="fa-solid fa-layer-group" style="color:#15803d;"></i> Modalidad de Nómina y Salón por Sección:
                                    </label>
                                    <select id="evalSectionModeSelect" class="form-control" onchange="window.onSectionModeChanged(this.value)" style="font-weight:800; font-size:0.9rem; background:#f0fdf4; border-color:#86efac; color:#166534;">
                                        <option value="MEDIAS_SECCIONES" ${isInitFull ? '' : 'selected'}>🌓 Medias Secciones (Grupo A y Grupo B ─ 2 Salones y 2 Cuidadores por sección)</option>
                                        <option value="SECCION_COMPLETA" ${isInitFull ? 'selected' : ''}>👥 Sección Completa (Salón Único ─ 1 Salón y 1 Cuidador por sección)</option>
                                    </select>
                                    <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">
                                        Seleccione si los estudiantes se dividen en mitades de sección (A y B) o si se evalúa la sección entera en un único salón.
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:8px; background:#f8fafc; padding:6px 10px; border-radius:6px; border:1px solid #e2e8f0;">
                                        <span style="font-size:0.8rem; font-weight:700; color:#334155;">
                                            ⚡ Estado de Evaluación por Defecto (Todas las Secciones):
                                        </span>
                                        <div style="display:flex; gap:6px;">
                                            <button type="button" class="btn btn-sm btn-outline-success" onclick="event.preventDefault(); event.stopPropagation(); window.setAllSectionsProcessStatus('EVALUA')" style="font-size:0.75rem; font-weight:800; padding:3px 8px;">
                                                📝 Marcar Todas: Evalúan (Examen)
                                            </button>
                                            <button type="button" class="btn btn-sm btn-outline-warning" onclick="event.preventDefault(); event.stopPropagation(); window.setAllSectionsProcessStatus('EN_PROCESO')" style="font-size:0.75rem; font-weight:800; padding:3px 8px;">
                                                📁 Marcar Todas: En Proceso
                                            </button>
                                        </div>
                                    </div>
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
                        <button type="button" class="btn btn-secondary" onclick="window.closeAddEvaluationModal()" style="font-weight:700;">Cancelar</button>
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

        const modeSelect = document.getElementById('evalSectionModeSelect');
        const isFullSection = modeSelect ? (modeSelect.value === 'SECCION_COMPLETA') : (editPayload && editPayload.evaluationMode === 'SECCION_COMPLETA');

        // Mostrar titulares detectados por sección
        if (titularsDiv) {
            if (sectionsInfo.length === 0) {
                titularsDiv.innerHTML = `<span style="color:#b91c1c;">⚠️ No se encontraron secciones asignadas para esta materia.</span>`;
            } else {
                const ruleNotice = isFullSection
                    ? `<div style="font-size:0.78rem; color:#15803d; font-weight:700; margin-top:4px;">
                        ℹ️ Modalidad Sección Completa (Salón Único): El maestro titular de la sección está habilitado para cuidar su propio salón.
                       </div>`
                    : `<div style="font-size:0.78rem; color:#dc2626; margin-top:4px;">
                        🔒 Regla de Oro: En modalidad de 2 grupos (medias secciones), ninguno de estos catedráticos titulares podrá ser asignado como cuidador en este horario.
                       </div>`;
                titularsDiv.innerHTML = sectionsInfo.map(s => `
                    <div style="display:inline-block; margin-right:16px; margin-bottom:4px;">
                        <span class="badge" style="background:#0f172a; color:#fff; font-size:0.8rem; margin-right:4px;">${s.section}</span>
                        <strong>${s.teacherName}</strong>
                    </div>
                `).join('') + ruleNotice;
            }
        }

        const sUpper = (courseName || '').toUpperCase();
        const normSub = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
        const sNorm = normSub(courseName);

        const isComp = sNorm.includes('COMPUT') || sNorm.includes('INFORM') || sNorm.includes('LABORAT') || sNorm.includes('TIC');
        const isMeca = sNorm.includes('MECANOGRAF') || sNorm.includes('MECA');
        const isPrac = sNorm.includes('PRACTICA SUPERVISADA');

        if (isPrac) {
            if (durationSelect && (!editPayload)) durationSelect.value = '300'; // 5 horas
            if (specialSec) {
                specialSec.innerHTML = `
                    <div class="alert alert-primary p-2" style="font-size:0.85rem;">
                        <i class="fa-solid fa-star"></i> <strong>Modo Práctica Supervisada Detectado:</strong>
                        Se asignarán 2 docentes por salón con relevo exacto a mitad de tiempo para todas las secciones. Los docentes titulares quedan excluidos del cuido.
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
        } else if (isMeca) {
            if (specialSec) {
                specialSec.innerHTML = `
                    <div class="alert alert-warning p-2" style="font-size:0.85rem; background:#fffbeb; border-color:#fde68a; color:#92400e;">
                        <i class="fa-solid fa-keyboard"></i> <strong>Modo Taller de Mecanografía:</strong>
                        La prueba es aplicada y evaluada directamente por su Catedrático Titular en el taller/salón asignado.
                        <div class="mt-1">
                            <label><input type="radio" name="compMode" value="single" checked onchange="window.toggleCompMode(this.value)"> Salón/Taller de Mecanografía (Evalúa Catedrático Titular)</label>
                            <label class="ms-3"><input type="radio" name="compMode" value="two_turns" onchange="window.toggleCompMode(this.value)"> 2 Turnos por Secciones (Grupo A y B)</label>
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
            window._currentEditingEvalId,
            isFullSection
        ) : {};

        // Construir tarjetas de salones para CADA sección (Grupo A y Grupo B o Sección Completa)
        let salonsHtml = `
            <div style="border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-bottom:10px;">
                <h6 style="font-weight:800; color:#15803d; margin:0; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-school"></i> Salones, Cuidadores y Tiempos por Sección
                </h6>
                <div style="font-size:0.8rem; color:#64748b; font-weight:700;">
                    ${isFullSection 
                        ? 'Modalidad Sección Completa: Cada sección se evalúa en un único salón con 1 docente cuidador asignado.' 
                        : 'Modalidad Medias Secciones: Cada grupo (A y B) contiene exactamente la mitad de los estudiantes de su respectiva sección. Los cuidadores se asignan automáticamente de forma equitativa y pueden modificarse en cualquier momento.'}
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
            let curSingle = { classroom: defaultSalonA, caretaker: '', turn2: '' };
            let curA = { classroom: defaultSalonA, caretaker: '', turn2: '' };
            let curB = { classroom: defaultSalonB, caretaker: '', turn2: '' };
            const masterDur = durationSelect ? (parseInt(durationSelect.value, 10) || 60) : 60;
            let secDuration = isPrac ? 300 : masterDur;

            if (editPayload) {
                if (Array.isArray(editPayload.sections)) {
                    const foundSec = editPayload.sections.find(sc => sc.gradeCode === secCode || sc.section === secName);
                    if (foundSec) {
                        secDuration = foundSec.durationMinutes || editPayload.durationMinutes || secDuration;
                        if (foundSec.singleRoom) {
                            curSingle.classroom = foundSec.singleRoom.classroom || curSingle.classroom;
                            curSingle.caretaker = foundSec.singleRoom.caretakerTeacherId || '';
                        }
                        if (foundSec.groupA) {
                            curA.classroom = foundSec.groupA.classroom || curA.classroom;
                            curA.caretaker = foundSec.groupA.caretakerTeacherId || '';
                            curA.turn2 = foundSec.groupA.caretakerTurn2Id || '';
                            if (!foundSec.singleRoom) {
                                curSingle.classroom = foundSec.groupA.classroom || curSingle.classroom;
                                curSingle.caretaker = foundSec.groupA.caretakerTeacherId || '';
                            }
                        }
                        if (foundSec.groupB) {
                            curB.classroom = foundSec.groupB.classroom || curB.classroom;
                            curB.caretaker = foundSec.groupB.caretakerTeacherId || '';
                            curB.turn2 = foundSec.groupB.caretakerTurn2Id || '';
                        }
                    }
                } else if (sIdx === 0) {
                    secDuration = editPayload.durationMinutes || secDuration;
                    if (editPayload.singleRoom) {
                        curSingle.classroom = editPayload.singleRoom.classroom || curSingle.classroom;
                        curSingle.caretaker = editPayload.singleRoom.caretakerTeacherId || '';
                    }
                    if (editPayload.groupA) {
                        curA.classroom = editPayload.groupA.classroom || curA.classroom;
                        curA.caretaker = editPayload.groupA.caretakerTeacherId || '';
                        curA.turn2 = editPayload.groupA.caretakerTurn2Id || '';
                        if (!editPayload.singleRoom) {
                            curSingle.classroom = editPayload.groupA.classroom || curSingle.classroom;
                            curSingle.caretaker = editPayload.groupA.caretakerTeacherId || '';
                        }
                    }
                    if (editPayload.groupB) {
                        curB.classroom = editPayload.groupB.classroom || curB.classroom;
                        curB.caretaker = editPayload.groupB.caretakerTeacherId || '';
                        curB.turn2 = editPayload.groupB.caretakerTurn2Id || '';
                    }
                }
            } else {
                // Autoasignación automática: Docentes asignados de inmediato, pero 100% editables en el selector
                const isSingleTitularMode = (isComp || isMeca) && compMode === 'single';
                if (isSingleTitularMode) {
                    curSingle.caretaker = sInfo.teacherId || '';
                    curSingle.classroom = isComp ? 'Laboratorio de Computación' : 'Taller de Mecanografía';
                    curA.caretaker = sInfo.teacherId || '';
                    curB.caretaker = sInfo.teacherId || '';
                } else if (isFullSection) {
                    // Sección Completa (un solo salón): el maestro titular de la sección puede cuidar
                    const autoForSec = autoAssignments[secCode] || autoAssignments[secName];
                    curSingle.caretaker = (autoForSec && autoForSec.caretakerSingle) ? autoForSec.caretakerSingle : (sInfo.teacherId || '');
                    curA.caretaker = curSingle.caretaker;
                    curB.caretaker = curSingle.caretaker;
                } else {
                    const autoForSec = autoAssignments[secCode] || autoAssignments[secName];
                    if (autoForSec) {
                        curSingle.caretaker = autoForSec.caretakerSingle || autoForSec.caretakerA || '';
                        curA.caretaker = autoForSec.caretakerA || '';
                        curB.caretaker = autoForSec.caretakerB || '';
                        curA.turn2 = autoForSec.turn2A || '';
                        curB.turn2 = autoForSec.turn2B || '';
                    }
                }
            }

            const isSingleTitularMode = ((isComp || isMeca) && compMode === 'single') || isFullSection;
            const excludeForSelect = isSingleTitularMode ? [] : titularIds;

            let isSecEnProceso = false;
            if (editPayload) {
                if (editPayload.isEnProceso || editPayload.evaluationStatus === 'EN_PROCESO') {
                    isSecEnProceso = true;
                } else if (Array.isArray(editPayload.sections)) {
                    const foundSec = editPayload.sections.find(sc => sc.gradeCode === secCode || sc.section === secName);
                    if (foundSec && (foundSec.isEnProceso || foundSec.evaluationStatus === 'EN_PROCESO')) {
                        isSecEnProceso = true;
                    }
                }
            }

            salonsHtml += `
                <div class="p-2 mb-2 rounded" style="background:#ffffff; border:1px solid #cbd5e1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; background:#f8fafc; padding:6px 10px; border-radius:6px; margin-bottom:8px; border:1px solid #e2e8f0;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <strong style="color:#0f172a; font-size:0.9rem;">
                                📌 ${sInfo.gradeName} ─ <span style="color:#15803d; font-weight:800;">${secName}</span>
                            </strong>
                            <span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.78rem; font-weight:800; padding:3px 7px;">
                                <i class="fa-solid fa-chalkboard-user"></i> Titular: ${sInfo.teacherName}
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:4px;">
                                <label style="font-size:0.78rem; font-weight:700; color:#475569; margin:0;">
                                    Modalidad:
                                </label>
                                <select id="evalSectionProcessStatus_${sIdx}" class="form-control form-control-sm" style="width:150px; font-weight:800; font-size:0.8rem; padding:2px 6px; height:28px; background:${isSecEnProceso ? '#fef3c7' : '#f0fdf4'}; border-color:${isSecEnProceso ? '#f59e0b' : '#86efac'}; color:${isSecEnProceso ? '#92400e' : '#15803d'};" onchange="window.onSectionProcessStatusChanged(${sIdx}, this.value)">
                                    <option value="EVALUA" ${isSecEnProceso ? '' : 'selected'}>📝 Evalúa (Examen)</option>
                                    <option value="EN_PROCESO" ${isSecEnProceso ? 'selected' : ''}>📁 En Proceso</option>
                                </select>
                            </div>
                            <div style="display:flex; align-items:center; gap:4px;">
                                <label style="font-size:0.78rem; font-weight:700; color:#475569; margin:0;">
                                    ⏱️ Tiempo:
                                </label>
                                <select id="evalSectionDuration_${sIdx}" class="form-control form-control-sm" style="width:125px; font-weight:700; font-size:0.8rem; padding:2px 6px; height:28px;" onchange="window.recalcEvalTimes()">
                                    <option value="45" ${secDuration === 45 ? 'selected' : ''}>45 minutos</option>
                                    <option value="50" ${secDuration === 50 ? 'selected' : ''}>50 minutos</option>
                                    <option value="60" ${secDuration === 60 ? 'selected' : ''}>60 minutos (1h)</option>
                                    <option value="75" ${secDuration === 75 ? 'selected' : ''}>75 min (1h 15m)</option>
                                    <option value="90" ${secDuration === 90 ? 'selected' : ''}>90 min (1h 30m)</option>
                                    <option value="120" ${secDuration === 120 ? 'selected' : ''}>120 minutos (2h)</option>
                                    <option value="300" ${secDuration === 300 ? 'selected' : ''}>300 min (Práctica)</option>
                                    ${![45, 50, 60, 75, 90, 120, 300].includes(secDuration) ? `<option value="${secDuration}" selected>${secDuration} min (Personalizado)</option>` : ''}
                                </select>
                                <input type="number" id="evalSectionDurationCustom_${sIdx}" class="form-control form-control-sm" style="width:54px; font-weight:700; text-align:center; font-size:0.8rem; padding:2px 4px; height:28px;" min="15" max="300" placeholder="Min" title="Editar minutos manualmente" value="${secDuration}" oninput="const sel = document.getElementById('evalSectionDuration_${sIdx}'); if(sel && this.value){ sel.value = this.value; } window.recalcEvalTimes();">
                                <span id="evalSectionTimeBadge_${sIdx}" style="font-size:0.75rem; font-weight:800; background:#ffffff; color:#0f172a; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1;">
                                    --:-- a --:--
                                </span>
                            </div>
                        </div>
                    </div>

                    <div id="evalSectionEnProcesoNotice_${sIdx}" class="p-2 rounded mb-2" style="display:${isSecEnProceso ? 'block' : 'none'}; background:#fffbeb; border:1px dashed #f59e0b; color:#92400e; font-size:0.82rem; font-weight:700;">
                        📁 Esta sección evalúa en proceso (acumulativo continuo). No ocupa salón físico ni requiere docente cuidador, y no aparecerá en el calendario de exámenes.
                    </div>

                    <div id="evalSectionSalonsBox_${sIdx}" style="display:${isSecEnProceso ? 'none' : 'block'};">
                    ${isFullSection ? `
                        <div class="row g-2">
                            <div class="col-12">
                                <div style="background:#fcfcfd; border:1px solid #e2e8f0; border-radius:6px; padding:10px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                        <strong style="color:#15803d; font-size:0.86rem;">
                                            👥 Salón para Sección Completa (${splitData.total} estudiantes en total)
                                        </strong>
                                        <span class="badge" style="background:#dbeafe; color:#1e40af; font-size:0.72rem; font-weight:800;">1 Salón Único / 1 Cuidador</span>
                                    </div>
                                    <div style="display:grid; grid-template-columns: 140px 1fr; gap:8px; align-items:center;">
                                        <input type="text" id="evalClassroomSingle_${sIdx}" list="institutionalSalonsList" class="form-control form-control-sm" style="font-size:0.82rem; height:30px;" value="${curSingle.classroom}" placeholder="Salón 6A">
                                        <select id="evalCaretakerSingle_${sIdx}" class="form-control form-control-sm" style="font-size:0.82rem; height:30px;" ${isSecEnProceso ? '' : 'required'}>
                                            ${window._generateTeacherSelectOptions(curSingle.caretaker, excludeForSelect)}
                                        </select>
                                    </div>
                                    <input type="hidden" id="evalClassroomA_${sIdx}" value="${curSingle.classroom}">
                                    <input type="hidden" id="evalCaretakerA_${sIdx}" value="${curSingle.caretaker}">
                                    <input type="hidden" id="evalClassroomB_${sIdx}" value="${curSingle.classroom}">
                                    <input type="hidden" id="evalCaretakerB_${sIdx}" value="${curSingle.caretaker}">
                                </div>
                            </div>
                        </div>
                    ` : `
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
                                        <select id="evalCaretakerA_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" ${isSecEnProceso ? '' : 'required'}>
                                            ${window._generateTeacherSelectOptions(curA.caretaker, excludeForSelect)}
                                        </select>
                                    </div>
                                    <div id="evalTurn2AContainer_${sIdx}" style="display:${isPrac ? 'block' : 'none'}; margin-top:4px;">
                                        <div style="font-size:0.72rem; color:#1d4ed8; font-weight:700; margin-bottom:2px;">Relevo 2do Turno:</div>
                                        <select id="evalCaretakerTurn2A_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;">
                                            ${window._generateTeacherSelectOptions(curA.turn2, excludeForSelect)}
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
                                        <input type="text" id="evalClassroomB_${sIdx}" list="institutionalSalonsList" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" value="${curB.classroom}" placeholder="Salón 6A">
                                        <select id="evalCaretakerB_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;" ${isSecEnProceso ? '' : 'required'}>
                                            ${window._generateTeacherSelectOptions(curB.caretaker, excludeForSelect)}
                                        </select>
                                    </div>
                                    <div id="evalTurn2BContainer_${sIdx}" style="display:${isPrac ? 'block' : 'none'}; margin-top:4px;">
                                        <div style="font-size:0.72rem; color:#1d4ed8; font-weight:700; margin-bottom:2px;">Relevo 2do Turno:</div>
                                        <select id="evalCaretakerTurn2B_${sIdx}" class="form-control form-control-sm" style="font-size:0.8rem; height:28px;">
                                            ${window._generateTeacherSelectOptions(curB.turn2, excludeForSelect)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}
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
        try {
            const gradeSelect = document.getElementById('evalGradeSelect');
            const courseSelect = document.getElementById('evalCourseSelect');
            const academicGradeName = gradeSelect ? gradeSelect.value : '';
            const courseName = courseSelect ? courseSelect.value : '';
            const startTimeInput = document.getElementById('evalStartTime');
            const endTimeInput = document.getElementById('evalEndTime');
            const startTime = startTimeInput ? startTimeInput.value : '07:30';
            const endTime = endTimeInput ? endTimeInput.value : '08:30';
            const recessInput = document.getElementById('evalRecessMinutes');
            const recess = recessInput ? (parseInt(recessInput.value, 10) || 15) : 15;

            if (!academicGradeName || !courseName) {
                alert("Por favor seleccione grado y asignatura.");
                return;
            }

            // Validación infranqueable de horario: NUNCA pasar de 12:30 PM
            if (timeStringToMinutes(endTime) > 750) {
                alert("🔒 RESTRICCIÓN OFICIAL DE JORNADA:\n\nLa evaluación finalizaría a las " + endTime + " hrs, sobrepasando el límite estricto de las 12:30 PM. Por favor reduzca la duración o inicie más temprano.");
                return;
            }

            const { dayObj, scheduleBlock } = findDayAndScheduleBlock(dayId);
            if (!dayObj) {
                alert("No se pudo localizar el día seleccionado (" + dayId + ") para guardar los cambios.");
                return;
            }

            const sectionsInfo = getSectionsAndTitularsForCourse(academicGradeName, courseName);
            const sUpper = courseName.toUpperCase();
            const normSub = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
            const sNorm = normSub(courseName);

            const isPrac = sNorm.includes('PRACTICA SUPERVISADA');
            const isComp = sNorm.includes('COMPUT') || sNorm.includes('INFORM') || sNorm.includes('LABORAT') || sNorm.includes('TIC');
            const isMeca = sNorm.includes('MECANOGRAF') || sNorm.includes('MECA');

            let compMode = 'single';
            const compRadio = document.querySelector('input[name="compMode"]:checked');
            if (compRadio) compMode = compRadio.value;

            const evalMode = (document.getElementById('evalSectionModeSelect') && document.getElementById('evalSectionModeSelect').value) || 'MEDIAS_SECCIONES';
            const isFullSection = evalMode === 'SECCION_COMPLETA';

            let maxDurationFound = 60;

            // Construir la matriz de secciones configuradas con su propia duración
            const sectionsPayload = sectionsInfo.map((sInfo, sIdx) => {
                const splitData = splitStudentsInTwoGroups(sInfo.gradeCode, sInfo.section, sInfo.gradeName);

                const processStatusSelect = document.getElementById(`evalSectionProcessStatus_${sIdx}`);
                const secProcessStatus = processStatusSelect ? processStatusSelect.value : (sInfo.evaluationStatus || 'EVALUA');
                const isSecEnProceso = secProcessStatus === 'EN_PROCESO';

                const secDurSelect = document.getElementById(`evalSectionDuration_${sIdx}`);
                const secDuration = secDurSelect ? (parseInt(secDurSelect.value, 10) || 60) : 60;
                if (secDuration > maxDurationFound) maxDurationFound = secDuration;

                const startMin = timeStringToMinutes(startTime);
                const secEndMin = startMin + secDuration;
                const secEndTime = minutesToTimeString(secEndMin);

                let classroomA = '', caretakerA = '', turn2AId = '';
                let classroomB = '', caretakerB = '', turn2BId = '';
                let classroomSingle = '', caretakerSingle = '';

                if (isSecEnProceso) {
                    // Modalidad En Proceso: no requiere cuidadores ajenos ni salones físicos de examen
                    classroomSingle = 'En Proceso';
                    caretakerSingle = '';
                    classroomA = 'En Proceso';
                    caretakerA = '';
                    classroomB = 'En Proceso';
                    caretakerB = '';
                } else if (isFullSection) {
                    classroomSingle = (document.getElementById(`evalClassroomSingle_${sIdx}`) && document.getElementById(`evalClassroomSingle_${sIdx}`).value) || (document.getElementById(`evalClassroomA_${sIdx}`) && document.getElementById(`evalClassroomA_${sIdx}`).value) || `Salón ${sIdx + 1}`;
                    caretakerSingle = (document.getElementById(`evalCaretakerSingle_${sIdx}`) && document.getElementById(`evalCaretakerSingle_${sIdx}`).value) || (document.getElementById(`evalCaretakerA_${sIdx}`) && document.getElementById(`evalCaretakerA_${sIdx}`).value) || '';
                    classroomA = classroomSingle;
                    caretakerA = caretakerSingle;
                    classroomB = classroomSingle;
                    caretakerB = caretakerSingle;
                } else {
                    classroomA = (document.getElementById(`evalClassroomA_${sIdx}`) && document.getElementById(`evalClassroomA_${sIdx}`).value) || `Salón ${(sIdx * 2) + 1}`;
                    caretakerA = (document.getElementById(`evalCaretakerA_${sIdx}`) && document.getElementById(`evalCaretakerA_${sIdx}`).value) || '';
                    turn2AId = (document.getElementById(`evalCaretakerTurn2A_${sIdx}`) && document.getElementById(`evalCaretakerTurn2A_${sIdx}`).value) || '';

                    classroomB = (document.getElementById(`evalClassroomB_${sIdx}`) && document.getElementById(`evalClassroomB_${sIdx}`).value) || `Salón ${(sIdx * 2) + 2}`;
                    caretakerB = (document.getElementById(`evalCaretakerB_${sIdx}`) && document.getElementById(`evalCaretakerB_${sIdx}`).value) || '';
                    turn2BId = (document.getElementById(`evalCaretakerTurn2B_${sIdx}`) && document.getElementById(`evalCaretakerTurn2B_${sIdx}`).value) || '';
                }

                const uA = (STATE.users || []).find(u => u.id === caretakerA);
                const uB = (STATE.users || []).find(u => u.id === caretakerB);
                const uSingle = (STATE.users || []).find(u => u.id === caretakerSingle);
                const uTurn2A = (STATE.users || []).find(u => u.id === turn2AId);
                const uTurn2B = (STATE.users || []).find(u => u.id === turn2BId);

                return {
                    gradeCode: sInfo.gradeCode,
                    gradeName: sInfo.gradeName,
                    section: sInfo.section,
                    sectionLetter: sInfo.sectionLetter,
                    teacherId: sInfo.teacherId,
                    teacherName: sInfo.teacherName,
                    evaluationStatus: secProcessStatus,
                    isEnProceso: isSecEnProceso,
                    durationMinutes: secDuration,
                    startTime: startTime,
                    endTime: secEndTime,
                    evaluationMode: evalMode,
                    singleRoom: isFullSection ? {
                        classroom: classroomSingle,
                        range: isSecEnProceso ? '' : `01 al ${String(splitData.total).padStart(2, '0')}`,
                        caretakerTeacherId: caretakerSingle,
                        caretakerTeacherName: uSingle ? uSingle.name : (uA ? uA.name : ''),
                        totalStudents: splitData.total
                    } : null,
                    groupA: {
                        classroom: classroomA,
                        range: isSecEnProceso ? '' : (isFullSection ? `01 al ${String(splitData.total).padStart(2, '0')}` : splitData.rangeA),
                        caretakerTeacherId: caretakerA,
                        caretakerTeacherName: uA ? uA.name : '',
                        caretakerTurn2Id: turn2AId,
                        caretakerTurn2Name: uTurn2A ? uTurn2A.name : ''
                    },
                    groupB: {
                        classroom: classroomB,
                        range: isSecEnProceso ? '' : (isFullSection ? `01 al ${String(splitData.total).padStart(2, '0')}` : splitData.rangeB),
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

            const allSectionsInProcess = sectionsPayload.length > 0 && sectionsPayload.every(s => s.isEnProceso);
            const anySectionInProcess = sectionsPayload.some(s => s.isEnProceso);
            const evalProcessStatus = allSectionsInProcess ? 'EN_PROCESO' : (anySectionInProcess ? 'MIXTO' : 'EVALUA');

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
                evaluationStatus: evalProcessStatus,
                isEnProceso: allSectionsInProcess,
                evaluationMode: evalMode,
                durationMinutes: maxDurationFound,
                startTime: startTime,
                endTime: endTime,
                recessMinutes: recess,
                isPractica: isPrac,
                isComputacion: isComp,
                isMecanografia: isMeca,
                computacionMode: compMode,
                // Fallback de retrocompatibilidad
                groupA: firstSec.groupA || { classroom: 'Salón 1', range: '', caretakerTeacherId: '', caretakerTeacherName: '' },
                groupB: firstSec.groupB || { classroom: 'Salón 2', range: '', caretakerTeacherId: '', caretakerTeacherName: '' }
            };

            dayObj.evaluations = dayObj.evaluations || [];
            if (evalIdToUpdate) {
                const idx = dayObj.evaluations.findIndex(e => String(e.id) === String(evalIdToUpdate));
                if (idx !== -1) dayObj.evaluations[idx] = evalPayload;
                else dayObj.evaluations.push(evalPayload);
            } else {
                dayObj.evaluations.push(evalPayload);
            }

            // Ordenar evaluaciones por hora de inicio
            dayObj.evaluations.sort((a, b) => a.startTime.localeCompare(b.startTime));

            // Asegurar que el día editado se mantenga siempre desplegado para inspección inmediata
            window._examDaysExpandedState = window._examDaysExpandedState || {};
            window._examDaysExpandedState[dayObj.id] = true;

            saveExamSchedulesData(true);
            const modalEl = document.getElementById('modalAddEvaluation');
            if (modalEl) modalEl.remove();
            renderExamSchedulesView();
        } catch (err) {
            console.error("Error al guardar evaluación:", err);
            alert("Ocurrió un error al guardar la asignación: " + (err.message || err));
        }
    };

    window.editEvaluationModal = function (dayId, evalId) {
        const { dayObj } = findDayAndScheduleBlock(dayId);
        if (!dayObj) {
            alert("No se pudo localizar el día del examen a editar.");
            return;
        }
        const ev = (dayObj.evaluations || []).find(e => String(e.id) === String(evalId));
        if (!ev) {
            alert("No se encontró la evaluación seleccionada.");
            return;
        }
        window.addEvaluationToDay(dayId, ev);
    };

    window.deleteEvaluation = function (dayId, evalId) {
        if (!confirm("¿Desea quitar esta evaluación de la programación de este día?")) return;
        const { dayObj } = findDayAndScheduleBlock(dayId);
        if (!dayObj || !Array.isArray(dayObj.evaluations)) return;

        dayObj.evaluations = dayObj.evaluations.filter(e => String(e.id) !== String(evalId));
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
                // Si la evaluación es en proceso (acumulativo), no requiere salones ni cuidadores
                if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') return;

                const isPractica = ev.isPractica === true;
                const isSingleTitularEvaluation = (ev.isComputacion || ev.isMecanografia) && ev.computacionMode === 'single';

                // Si es computación o mecanografía en salón único/taller, los titulares son quienes cuidan y evalúan
                if (isSingleTitularEvaluation) {
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
                const titularNamesSet = new Set();
                // Sincronizar dinámicamente desde pensum los titulares de todas las secciones
                const liveTitulars = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
                liveTitulars.forEach(t => {
                    if (t.teacherId) titularExclusionSet.add(t.teacherId);
                    if (t.teacherName) titularNamesSet.add(t.teacherName.toLowerCase().trim());
                });
                if (Array.isArray(ev.titularTeachers)) {
                    ev.titularTeachers.forEach(t => {
                        if (t.teacherId) titularExclusionSet.add(t.teacherId);
                        if (t.teacherName) titularNamesSet.add(t.teacherName.toLowerCase().trim());
                    });
                }
                if (ev.courseTeacherId) titularExclusionSet.add(ev.courseTeacherId);
                if (Array.isArray(ev.sections)) {
                    ev.sections.forEach(s => {
                        if (s.teacherId) titularExclusionSet.add(s.teacherId);
                        if (s.teacherName) titularNamesSet.add(s.teacherName.toLowerCase().trim());
                    });
                }

                const evStartMin = timeStringToMinutes(ev.startTime);

                // Función auxiliar para seleccionar un cuidador idóneo aleatorio y balanceado
                function pickBestCaretaker(slotStartMin, slotEndMin, currentlyAssignedInThisSlotSet = new Set(), allowTitular = false) {
                    const slotDuration = slotEndMin - slotStartMin;

                    // Candidatos que no sean titulares (salvo permitido), no tengan colisión de horario y no estén ya en este mismo bloque
                    const eligible = allCandidates.filter(c => {
                        if (!allowTitular) {
                            if (titularExclusionSet.has(c.id)) return false;
                            if (titularNamesSet.has((c.name || '').toLowerCase().trim())) return false;
                        }
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
                        // Fallback de emergencia si no hay candidatos sin colisión
                        const fallbackEligible = allCandidates.filter(c => (allowTitular || (!titularExclusionSet.has(c.id) && !titularNamesSet.has((c.name || '').toLowerCase().trim()))) && !currentlyAssignedInThisSlotSet.has(c.id));
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
                        // Si la sección evalúa en proceso, no requiere asignación de cuidadores
                        if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') return;

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
                        } else if (sec.evaluationMode === 'SECCION_COMPLETA' || ev.evaluationMode === 'SECCION_COMPLETA') {
                            // Cuando se seleccione un solo salón a cuidar (SECCION_COMPLETA), puede cuidar el maestro titular de la sección
                            let assignedSingle = null;
                            const titId = sec.teacherId;
                            const titCandidate = titId ? allCandidates.find(c => c.id === titId) : null;
                            const intervals = titCandidate ? (busyIntervals[titCandidate.id] || []) : [];
                            const hasCollision = intervals.some(([bStart, bEnd]) => Math.max(secStartMin, bStart) < Math.min(secEndMin, bEnd));

                            if (titCandidate && !assignedInThisSlot.has(titCandidate.id) && !hasCollision) {
                                assignedSingle = titCandidate;
                                if (!busyIntervals[titCandidate.id]) busyIntervals[titCandidate.id] = [];
                                busyIntervals[titCandidate.id].push([secStartMin, secEndMin]);
                                dayWorkload[titCandidate.id] = (dayWorkload[titCandidate.id] || 0) + secDur;
                                assignedInThisSlot.add(titCandidate.id);
                                assignedCount++;
                            } else {
                                assignedSingle = pickBestCaretaker(secStartMin, secEndMin, assignedInThisSlot, true);
                            }

                            if (assignedSingle) {
                                if (sec.singleRoom) {
                                    sec.singleRoom.caretakerTeacherId = assignedSingle.id;
                                    sec.singleRoom.caretakerTeacherName = assignedSingle.name;
                                }
                                sec.groupA.caretakerTeacherId = assignedSingle.id;
                                sec.groupA.caretakerTeacherName = assignedSingle.name;
                                sec.groupB.caretakerTeacherId = assignedSingle.id;
                                sec.groupB.caretakerTeacherName = assignedSingle.name;
                            }
                        } else {
                            // Examen regular (MEDIAS_SECCIONES): 1 cuidador para Grupo A y 1 cuidador para Grupo B (titulares estrictamente excluidos)
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
                        if (ev.sections[0].singleRoom) ev.singleRoom = ev.sections[0].singleRoom;
                        ev.groupA = ev.sections[0].groupA;
                        ev.groupB = ev.sections[0].groupB;
                    }
                } else if (ev.evaluationMode === 'SECCION_COMPLETA') {
                    // Fallback para evaluación individual en Sección Completa (un solo salón)
                    const evDur = parseInt(ev.durationMinutes, 10) || 60;
                    const evEndMin = evStartMin + evDur;
                    const assignedInThisSlot = new Set();
                    let assignedSingle = null;
                    const titId = ev.courseTeacherId;
                    const titCandidate = titId ? allCandidates.find(c => c.id === titId) : null;
                    const intervals = titCandidate ? (busyIntervals[titCandidate.id] || []) : [];
                    const hasCollision = intervals.some(([bStart, bEnd]) => Math.max(evStartMin, bStart) < Math.min(evEndMin, bEnd));

                    if (titCandidate && !assignedInThisSlot.has(titCandidate.id) && !hasCollision) {
                        assignedSingle = titCandidate;
                        if (!busyIntervals[titCandidate.id]) busyIntervals[titCandidate.id] = [];
                        busyIntervals[titCandidate.id].push([evStartMin, evEndMin]);
                        dayWorkload[titCandidate.id] = (dayWorkload[titCandidate.id] || 0) + evDur;
                        assignedInThisSlot.add(titCandidate.id);
                        assignedCount++;
                    } else {
                        assignedSingle = pickBestCaretaker(evStartMin, evEndMin, assignedInThisSlot, true);
                    }

                    if (assignedSingle) {
                        if (ev.singleRoom) {
                            ev.singleRoom.caretakerTeacherId = assignedSingle.id;
                            ev.singleRoom.caretakerTeacherName = assignedSingle.name;
                        }
                        ev.groupA.caretakerTeacherId = assignedSingle.id;
                        ev.groupA.caretakerTeacherName = assignedSingle.name;
                        ev.groupB.caretakerTeacherId = assignedSingle.id;
                        ev.groupB.caretakerTeacherName = assignedSingle.name;
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
        const bimesterSelectVal = (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
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
        const bimesterSelectVal = (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
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
        const found = findDayAndScheduleBlock(dayId, window._currentSelectedExamBim);
        const dayObj = found ? (found.dayObj || found.day) : null;
        if (!found || !dayObj) {
            alert('⚠️ No se encontró la jornada de examen solicitada para imprimir.');
            return;
        }

        const dayFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).toUpperCase();

        const evs = (dayObj.evaluations || []).filter(e => !e.isEnProceso && e.evaluationStatus !== 'EN_PROCESO');
        evs.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

        const activeCols = getActiveGradeColumnsForDay(dayObj);
        const colCount = activeCols.length >= 3 ? 3 : (activeCols.length === 2 ? 2 : 1);

        // Recolectar intervalos únicos de horarios de evaluación
        const timeIntervals = [];
        evs.forEach(ev => {
            const slot = `${ev.startTime} a ${ev.endTime}`;
            if (!timeIntervals.includes(slot)) timeIntervals.push(slot);
        });
        timeIntervals.sort((a, b) => timeStringToMinutes(a.split(' a ')[0]) - timeStringToMinutes(b.split(' a ')[0]));

        let rowsHtml = '';
        timeIntervals.forEach((slot, sIdx) => {
            const [slotStart, slotEnd] = slot.split(' a ');
            const timeColWidth = colCount === 3 ? '13%' : '15%';
            const gradeColWidth = colCount === 3 ? '29%' : '42.5%';

            rowsHtml += `
                <tr>
                    <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; background:#f8fafc; width:${timeColWidth};">
                        <div style="font-weight:900; font-size:1rem; color:#0f172a;">${slot} hrs</div>
                        <div style="font-size:0.75rem; color:#64748b; font-weight:700; margin-top:3px;">BLOQUE DE EVALUACIÓN</div>
                    </td>
            `;

            activeCols.forEach(col => {
                const matchEvals = evs.filter(e => {
                    const cg = classifyGradeForDay(e);
                    return cg.key === col.key && e.startTime === slotStart && e.endTime === slotEnd;
                });

                if (matchEvals.length === 0) {
                    rowsHtml += `
                        <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:middle; text-align:center; color:#94a3b8; font-style:italic; font-size:0.84rem; width:${gradeColWidth};">
                            Sin evaluación a este horario
                        </td>
                    `;
                } else {
                    let cellHtml = matchEvals.map(ev => {
                        const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
                        let salonesHtml = '';

                        if (ev.isPractica) {
                            const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
                            salonesHtml = `
                                <div style="margin-top:6px; font-size:0.82rem; background:#eff6ff; padding:6px; border-radius:4px; border:1px solid #bfdbfe;">
                                    <strong>Salón ${ev.groupA.classroom} (A):</strong> ${ev.groupA.caretakerTeacherName || 'N/A'} / Relevo: ${ev.groupA.caretakerTurn2Name || 'N/A'}<br>
                                    <strong>Salón ${ev.groupB.classroom} (B):</strong> ${ev.groupB.caretakerTeacherName || 'N/A'} / Relevo: ${ev.groupB.caretakerTurn2Name || 'N/A'}
                                </div>
                            `;
                        } else if ((ev.isComputacion || ev.isMecanografia) && ev.computacionMode === 'single') {
                            const isMeca = ev.isMecanografia;
                            salonesHtml = `
                                <div style="margin-top:6px; font-size:0.82rem; background:${isMeca ? '#fffbeb' : '#f0f9ff'}; padding:6px; border-radius:4px; border:1px solid ${isMeca ? '#fde68a' : '#bae6fd'};">
                                    <strong>${isMeca ? 'Taller de Mecanografía' : 'Lab. Computación'}:</strong><br>
                                    • Evaluadores y Cuidadores: <strong>${ev.courseTeacherName}</strong> (Docentes Titulares)
                                </div>
                            `;
                        } else if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                            salonesHtml = ev.sections.map(sec => {
                                if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') {
                                    return `
                                        <div style="margin-top:4px; font-size:0.82rem; border-bottom:1px dashed #e2e8f0; padding-bottom:3px; color:#92400e;">
                                            <strong style="color:#15803d;">${sec.section}:</strong> Evaluación en Proceso (acumulativo continuo)
                                        </div>
                                    `;
                                }
                                const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                                if (secIsFull) {
                                    const sRoom = sec.singleRoom || sec.groupA || {};
                                    return `
                                        <div style="margin-top:4px; font-size:0.82rem; border-bottom:1px dashed #e2e8f0; padding-bottom:3px;">
                                            <strong style="color:#15803d;">${sec.section}:</strong> Salón ${sRoom.classroom || 'Salón'} (Sección Completa ─ ${sRoom.range || 'Nómina'})<br>
                                            • Cuidador: <strong>${sRoom.caretakerTeacherName || 'Sin asignar'}</strong>
                                        </div>
                                    `;
                                } else {
                                    return `
                                        <div style="margin-top:4px; font-size:0.82rem; border-bottom:1px dashed #e2e8f0; padding-bottom:3px;">
                                            <strong style="color:#15803d;">${sec.section}:</strong><br>
                                            • Salón ${sec.groupA.classroom} (A): <strong>${sec.groupA.caretakerTeacherName || 'Sin asignar'}</strong><br>
                                            • Salón ${sec.groupB.classroom} (B): <strong>${sec.groupB.caretakerTeacherName || 'Sin asignar'}</strong>
                                        </div>
                                    `;
                                }
                            }).join('');
                        } else {
                            if (isFull) {
                                const sRoom = ev.singleRoom || ev.groupA || {};
                                salonesHtml = `
                                    <div style="margin-top:4px; font-size:0.82rem;">
                                        <strong>Salón ${sRoom.classroom || 'Salón'} (Sección Completa):</strong> <strong>${sRoom.caretakerTeacherName || 'Sin asignar'}</strong>
                                    </div>
                                `;
                            } else {
                                const gA = ev.groupA || {};
                                const gB = ev.groupB || {};
                                salonesHtml = `
                                    <div style="margin-top:4px; font-size:0.82rem;">
                                        • Salón ${gA.classroom || 'Salón'} (A): <strong>${gA.caretakerTeacherName || 'Sin asignar'}</strong><br>
                                        • Salón ${gB.classroom || 'Salón'} (B): <strong>${gB.caretakerTeacherName || 'Sin asignar'}</strong>
                                    </div>
                                `;
                            }
                        }

                        // Titulares con insignias legibles y sincronización dinámica desde pensum
                        let titularesHtml = '';
                        if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                            titularesHtml = ev.sections.map(s => {
                                const fresh = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
                                const foundSec = fresh.find(f => f.sectionLetter === (s.sectionLetter || (s.section || '').replace(/Secci[oó]n\s*/i, '').trim()) || f.section === s.section);
                                const tName = (foundSec && foundSec.teacherName) ? foundSec.teacherName : s.teacherName;
                                return `<span style="display:inline-block; margin-right:4px; background:#f1f5f9; padding:1px 5px; border-radius:4px; border:1px solid #e2e8f0; font-size:0.75rem;"><strong>${s.section.replace('Sección ', '')}:</strong> ${tName || 'Sin asignar'}</span>`;
                            }).join(' ');
                        } else {
                            const fresh = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
                            if (fresh.length > 0) {
                                titularesHtml = fresh.map(f => `<span style="display:inline-block; margin-right:4px; background:#f1f5f9; padding:1px 5px; border-radius:4px; border:1px solid #e2e8f0; font-size:0.75rem;"><strong>${f.section.replace('Sección ', '')}:</strong> ${f.teacherName}</span>`).join(' ');
                            } else {
                                titularesHtml = ev.courseTeacherName || 'Sin asignar';
                            }
                        }

                        return `
                            <div style="margin-bottom:8px; border-bottom:1px solid #cbd5e1; padding-bottom:6px;">
                                <div style="font-weight:900; font-size:0.95rem; color:#0f172a;">${ev.courseName}</div>
                                <div style="font-size:0.8rem; color:#334155; margin-top:2px;"><strong>Titular(es):</strong> ${titularesHtml}</div>
                                <div style="font-size:0.78rem; color:#b45309; font-weight:700;">Tiempo: ${ev.durationMinutes} min ${isFull ? '• [SECCIÓN COMPLETA]' : '• [MEDIAS SECCIONES A/B]'}</div>
                                <div style="margin-top:4px;">${salonesHtml}</div>
                            </div>
                        `;
                    }).join('');

                    rowsHtml += `
                        <td style="padding:10px 12px; border:1px solid #cbd5e1; vertical-align:top; width:${gradeColWidth};">
                            ${cellHtml}
                        </td>
                    `;
                }
            });

            rowsHtml += `</tr>`;
        });

        const printContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <base href="${(typeof window !== 'undefined' && window.location) ? window.location.href : ''}">
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
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print-bar {
                        position: sticky;
                        top: 0;
                        background: #0f172a;
                        color: #ffffff;
                        padding: 8px 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        z-index: 9999;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    @media print {
                        .no-print-bar {
                            display: none !important;
                        }
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
                <div class="no-print-bar">
                    <div style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
                        <span>Vista de Impresión Oficial ─ Horario Hoja Oficio</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" onclick="window.print()" style="background:#2563eb; color:#ffffff; border:none; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">
                            Imprimir Documento
                        </button>
                        <button type="button" onclick="window.close()" style="background:#475569; color:#ffffff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">
                            ✕ Cerrar
                        </button>
                    </div>
                </div>
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
                                HORARIO OFICIAL DE EVALUACIONES (${colCount} COLUMNAS): ${dayFormatted}
                            </div>
                        </td>
                    </tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th style="width:${colCount === 3 ? '13%' : '15%'};">HORARIO</th>
                            ${activeCols.map(col => `
                                <th style="width:${colCount === 3 ? '29%' : '42.5%'};">${col.title.toUpperCase()}</th>
                            `).join('')}
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
        const found = findDayAndScheduleBlock(dayId, window._currentSelectedExamBim);
        const dayObj = found ? (found.dayObj || found.day) : null;
        if (!found || !dayObj) {
            alert('⚠️ No se encontró la jornada de examen solicitada.');
            return;
        }
        const ev = (dayObj.evaluations || []).find(e => e.id === evalId);
        if (!ev) {
            alert('⚠️ No se encontró la evaluación seleccionada.');
            return;
        }

        if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') {
            alert("Esta asignatura evalúa en proceso (acumulativo continuo). No requiere listas de cuido de examen en salón.");
            return;
        }

        printEvaluationSheets(dayObj, ev, 'BOTH');
    };

    window.printAllMediasListasOfDay = function (dayId) {
        const found = findDayAndScheduleBlock(dayId, window._currentSelectedExamBim);
        const dayObj = found ? (found.dayObj || found.day) : null;
        if (!found || !dayObj) {
            alert('⚠️ No se encontró la jornada de examen solicitada.');
            return;
        }
        if (!dayObj || !dayObj.evaluations || dayObj.evaluations.length === 0) {
            alert("No hay evaluaciones asignadas en este día.");
            return;
        }

        const printableEvals = dayObj.evaluations.filter(e => !e.isEnProceso && e.evaluationStatus !== 'EN_PROCESO');
        if (printableEvals.length === 0) {
            alert("No hay evaluaciones con examen presencial en esta fecha (las programadas evalúan en proceso).");
            return;
        }

        let combinedHtml = '';
        printableEvals.forEach(ev => {
            const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
            if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                const printableSecs = ev.sections.filter(s => !s.isEnProceso && s.evaluationStatus !== 'EN_PROCESO');
                printableSecs.forEach(sec => {
                    const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                    if (combinedHtml) combinedHtml += '<div style="page-break-after:always;"></div>';
                    if (secIsFull) {
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA', sec);
                    } else {
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                        combinedHtml += '<div style="page-break-after:always;"></div>';
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                    }
                });
            } else {
                if (combinedHtml) combinedHtml += '<div style="page-break-after:always;"></div>';
                if (isFull) {
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA');
                } else {
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A');
                    combinedHtml += '<div style="page-break-after:always;"></div>';
                    combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B');
                }
            }
        });

        if (!combinedHtml) {
            alert("No se encontraron secciones con examen presencial para imprimir en este día.");
            return;
        }

        wrapAndPrintSheets(combinedHtml, `Medias_Listas_${dayObj.date}`);
    };

    window.printAllNominasOfBimester = function () {
        const bimesterSelectVal = (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
        const scheduleKey = getCurrentScheduleKey(bimesterSelectVal);
        const scheduleBlock = getOrCreateScheduleBlock(scheduleKey);

        if (!scheduleBlock || !scheduleBlock.days || scheduleBlock.days.length === 0) {
            alert("No hay días de evaluación configurados para este bimestre.");
            return;
        }

        let totalEvalsCount = 0;
        let combinedHtml = '';

        scheduleBlock.days.forEach(dayObj => {
            const printableEvals = (dayObj.evaluations || []).filter(e => !e.isEnProceso && e.evaluationStatus !== 'EN_PROCESO');
            printableEvals.forEach(ev => {
                totalEvalsCount++;
                const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
                if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                    const printableSecs = ev.sections.filter(s => !s.isEnProceso && s.evaluationStatus !== 'EN_PROCESO');
                    printableSecs.forEach(sec => {
                        const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                        if (combinedHtml) combinedHtml += '<div style="page-break-after:always;"></div>';
                        if (secIsFull) {
                            combinedHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA', sec);
                        } else {
                            combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                            combinedHtml += '<div style="page-break-after:always;"></div>';
                            combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                        }
                    });
                } else {
                    if (combinedHtml) combinedHtml += '<div style="page-break-after:always;"></div>';
                    if (isFull) {
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA');
                    } else {
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'A');
                        combinedHtml += '<div style="page-break-after:always;"></div>';
                        combinedHtml += generateSingleGroupHtml(dayObj, ev, 'B');
                    }
                }
            });
        });

        if (totalEvalsCount === 0 || !combinedHtml) {
            alert("No se encontraron evaluaciones con examen presencial en este bimestre para imprimir.");
            return;
        }

        wrapAndPrintSheets(combinedHtml, `Todas_Las_Nominas_${bimesterSelectVal}`);
    };

    function printEvaluationSheets(dayObj, ev, mode = 'BOTH') {
        if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') {
            alert("Esta asignatura evalúa en proceso (acumulativo continuo). No requiere listas de cuido de examen.");
            return;
        }

        let contentHtml = '';
        const isFull = ev.evaluationMode === 'SECCION_COMPLETA';

        if (Array.isArray(ev.sections) && ev.sections.length > 0) {
            const printableSecs = ev.sections.filter(s => !s.isEnProceso && s.evaluationStatus !== 'EN_PROCESO');
            if (printableSecs.length === 0) {
                alert("Todas las secciones de esta asignatura evalúan en proceso.");
                return;
            }
            printableSecs.forEach(sec => {
                const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                if (contentHtml) contentHtml += '<div style="page-break-after:always;"></div>';
                if (secIsFull) {
                    contentHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA', sec);
                } else {
                    if (mode === 'A' || mode === 'BOTH') {
                        contentHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                    }
                    if (mode === 'BOTH') {
                        contentHtml += '<div style="page-break-after:always;"></div>';
                    }
                    if (mode === 'B' || mode === 'BOTH') {
                        contentHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                    }
                }
            });
        } else {
            if (isFull) {
                contentHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA');
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
        }

        wrapAndPrintSheets(contentHtml, `Evaluacion_${ev.courseName}_${ev.gradeName}`);
    }

    // Generar el HTML de una hoja de salón individual (Grupo A, Grupo B o Sección Completa)
    function generateSingleGroupHtml(dayObj, ev, groupLetter, targetSection = null) {
        const isFullGroup = groupLetter === 'COMPLETA';
        const isGroupA = groupLetter === 'A';
        const secObj = targetSection || (Array.isArray(ev.sections) && ev.sections[0]) || null;
        const grp = (isFullGroup
            ? (secObj ? (secObj.singleRoom || secObj.groupA) : (ev.singleRoom || ev.groupA))
            : (secObj ? (isGroupA ? secObj.groupA : secObj.groupB) : (isGroupA ? ev.groupA : ev.groupB))) || {};
        const gradeCodeToUse = secObj ? secObj.gradeCode : ev.gradeCode;
        const secNameToUse = secObj ? secObj.section : '';
        const gradeNameToUse = secObj ? secObj.gradeName : ev.gradeName;
        const sectionNameToUse = (secNameToUse ? `${gradeNameToUse} ─ ${secNameToUse}` : (gradeNameToUse || '')).trim();
        const fresh = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
        const foundSec = fresh.find(f => (secObj && (f.sectionLetter === (secObj.sectionLetter || (secObj.section || '').replace(/Secci[oó]n\s*/i, '').trim()) || f.section === secObj.section)));
        let titularNameToUse = (foundSec && foundSec.teacherName) ? foundSec.teacherName : ((secObj && secObj.teacherName && secObj.teacherName !== 'Sin docente asignado') ? secObj.teacherName : ev.courseTeacherName);

        const splitData = splitStudentsInTwoGroups(gradeCodeToUse, secNameToUse, gradeNameToUse);
        const studentList = isFullGroup
            ? (splitData.allStudents || splitData.groupA.concat(splitData.groupB))
            : (isGroupA ? splitData.groupA : splitData.groupB);
        const isPractica = ev.isPractica === true;

        const dayFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        let rowsHtml = '';
        studentList.forEach((s, idx) => {
            const num = isFullGroup ? (idx + 1) : (isGroupA ? (idx + 1) : (splitData.groupA.length + idx + 1));
            const fullName = ((s.lastName || '') + ', ' + (s.firstName || '')).trim();
            const codigoPersonal = s.personalCode || s.codigoPersonal || s.personal_code || s.carne || s.id || '';
            const isExonerado = (typeof isStudentExonerated === 'function') ? isStudentExonerated(s) : false;
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

            if (isFullGroup) {
                // Diseño ultra-compacto y limpio para que hasta 42+ estudiantes quepan con firmas en UNA SOLA HOJA tamaño oficio (8.5in x 13in)
                rowsHtml += `
                    <tr style="height:19px; background:${rowBg};">
                        <td style="text-align:center; font-weight:800; font-size:0.75rem; border:1px solid #cbd5e1; padding:1px 3px; line-height:1; color:#0f172a;">
                            ${String(num).padStart(2, '0')}
                        </td>
                        <td style="text-align:center; font-size:0.73rem; font-weight:700; border:1px solid #cbd5e1; padding:1px 4px; font-family:'Roboto Mono', Consolas, monospace; line-height:1; color:#334155; letter-spacing:0.3px;">
                            ${codigoPersonal}
                        </td>
                        <td style="font-size:0.76rem; font-weight:700; border:1px solid #cbd5e1; padding:1px 6px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:270px; color:#0f172a;">
                            ${fullName} ${isExonerado ? '<span style="color:#0284c7; font-size:0.65rem; font-weight:800;">[EXONERADO]</span>' : ''}
                        </td>
                        <td style="border:1px solid #cbd5e1; width:160px; text-align:center; padding:0; background:#ffffff;">
                            <!-- Espacio de firma -->
                        </td>
                    </tr>
                `;
            } else {
                rowsHtml += `
                    <tr style="height:22px; background:${rowBg};">
                        <td style="text-align:center; font-weight:800; font-size:0.78rem; border:1px solid #cbd5e1; padding:2px 3px; line-height:1; color:#0f172a;">
                            ${String(num).padStart(2, '0')}
                        </td>
                        <td style="text-align:center; font-size:0.75rem; font-weight:700; border:1px solid #cbd5e1; padding:2px 4px; font-family:'Roboto Mono', Consolas, monospace; line-height:1; color:#334155; letter-spacing:0.3px;">
                            ${codigoPersonal}
                        </td>
                        <td style="font-size:0.8rem; font-weight:700; border:1px solid #cbd5e1; padding:2px 6px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px; color:#0f172a;">
                            ${fullName} ${isExonerado ? '<span style="color:#0284c7; font-size:0.68rem; font-weight:800;">[EXONERADO]</span>' : ''}
                        </td>
                        <td style="border:1px solid #cbd5e1; width:160px; text-align:center; padding:0; background:#ffffff;">
                            <!-- Espacio de firma -->
                        </td>
                    </tr>
                `;
            }
        });

        // Completar hasta un mínimo de 16 filas solo si la lista es muy pequeña, asegurando que jamás desborde una página
        if (!isFullGroup) {
            const minRows = 16;
            if (studentList.length < minRows) {
                for (let i = studentList.length + 1; i <= minRows; i++) {
                    const emptyBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                    rowsHtml += `
                        <tr style="height:21px; background:${emptyBg};">
                            <td style="border:1px solid #cbd5e1; text-align:center; color:#94a3b8; font-size:0.74rem; line-height:1;">${String(i).padStart(2, '0')}</td>
                            <td style="border:1px solid #cbd5e1;"></td>
                            <td style="border:1px solid #cbd5e1;"></td>
                            <td style="border:1px solid #cbd5e1; background:#ffffff;"></td>
                        </tr>
                    `;
                }
            }
        }

        let caretakerHeaderHtml = '';
        let actaRelevoHtml = '';

        if (isPractica) {
            const relevoTime = minutesToTimeString(timeStringToMinutes(ev.startTime) + Math.round(ev.durationMinutes / 2));
            caretakerHeaderHtml = `
                <tr>
                    <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">1er Turno Cuido:</td>
                    <td style="padding:2.5px 5px; border-bottom:1px solid #f1f5f9;"><strong style="color:#0f172a;">${grp.caretakerTeacherName || 'Sin asignar'}</strong> (${ev.startTime} a ${relevoTime} hrs)</td>
                    <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">2do Turno Cuido:</td>
                    <td style="padding:2.5px 5px; border-bottom:1px solid #f1f5f9;"><strong style="color:#0f172a;">${grp.caretakerTurn2Name || 'Sin asignar'}</strong> (${relevoTime} a ${ev.endTime} hrs)</td>
                </tr>
            `;

            actaRelevoHtml = `
                <div style="margin-top:6px; padding:5px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; font-size:0.74rem; line-height:1.3;">
                    <strong>ACTA DE RELEVO Y RECEPCIÓN:</strong><br>
                    • Relevo (${relevoTime} hrs): _________________________ (1er Turno) entregó salón a _________________________ (2do Turno).<br>
                    • Total de pruebas recibidas al cierre (${ev.endTime} hrs): [ _____ ] de ${studentList.length} estudiantes.
                </div>
            `;
        } else {
            caretakerHeaderHtml = `
                <tr>
                    <td style="font-weight:700; color:#475569; padding:2.5px 5px;">Docente Cuidador:</td>
                    <td colspan="3" style="padding:2.5px 5px;"><strong style="font-size:0.86rem; color:#0f172a;">${grp.caretakerTeacherName || 'Sin asignar'}</strong></td>
                </tr>
            `;
        }

        if (isFullGroup) {
            return `
            <div class="sheet-container" style="page-break-inside:avoid;">
                <!-- ENCABEZADO CON LOGO Y MEMBRETE COMPACTO -->
                <table style="width:100%; border-collapse:collapse; margin-bottom:4px; border-bottom:1.5px solid #0f172a; padding-bottom:3px;">
                    <tr>
                        <td style="width:52px; vertical-align:middle;">
                            <img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:42px; width:auto;">
                        </td>
                        <td style="vertical-align:middle; padding-left:8px;">
                            <div style="font-size:0.96rem; font-weight:900; color:#0f172a; text-transform:uppercase; line-height:1.15; letter-spacing:0.3px;">
                                ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                            </div>
                            <div style="font-size:0.72rem; color:#475569; font-weight:700; line-height:1.15;">
                                Jornada Matutina — Jutiapa, Guatemala — Ciclo Escolar ${(STATE && STATE.activeCycle) || '2026'}
                            </div>
                            <div style="font-size:0.78rem; font-weight:900; color:#15803d; margin-top:1px; line-height:1.15; letter-spacing:0.3px;">
                                CONTROL OFICIAL DE EVALUACIONES BIMESTRALES — AUXILIATURA GENERAL
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- TARJETA DE DATOS DEL EXAMEN (SECCIÓN COMPLETA) -->
                <table style="width:100%; border-collapse:collapse; font-size:0.74rem; margin-bottom:4px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;">
                    <tr>
                        <td style="width:17%; font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Grado y Sección:</td>
                        <td style="width:35%; font-weight:800; color:#0f172a; padding:2px 5px; border-bottom:1px solid #f1f5f9;">${sectionNameToUse}</td>
                        <td style="width:16%; font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Fecha:</td>
                        <td style="width:32%; font-weight:800; color:#0f172a; padding:2px 5px; border-bottom:1px solid #f1f5f9; text-transform:capitalize;">${dayFormatted}</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Asignatura:</td>
                        <td style="font-weight:800; color:#0f172a; padding:2px 5px; border-bottom:1px solid #f1f5f9;">${ev.courseName}</td>
                        <td style="font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Horario Oficial:</td>
                        <td style="font-weight:800; color:#0f172a; padding:2px 5px; border-bottom:1px solid #f1f5f9;">${ev.startTime} a ${ev.endTime} hrs (${ev.durationMinutes} min)</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Catedrático Titular:</td>
                        <td style="padding:2px 5px; border-bottom:1px solid #f1f5f9;"><strong style="color:#0f172a;">${titularNameToUse}</strong></td>
                        <td style="font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Salón Asignado:</td>
                        <td style="font-weight:900; color:#15803d; padding:2px 5px; border-bottom:1px solid #f1f5f9;">${grp.classroom || 'Salón Único'}</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Modalidad / Salón:</td>
                        <td style="font-weight:800; color:#15803d; padding:2px 5px; border-bottom:1px solid #f1f5f9;">
                            SECCIÓN COMPLETA (Salón Único ─ 01 al ${String(studentList.length).padStart(2, '0')})
                        </td>
                        <td style="font-weight:700; color:#475569; padding:2px 5px; border-bottom:1px solid #f1f5f9;">Total Alumnos:</td>
                        <td style="padding:2px 5px; border-bottom:1px solid #f1f5f9;"><strong style="color:#0f172a;">${studentList.length} estudiantes</strong></td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2px 5px;">Docente Cuidador:</td>
                        <td colspan="3" style="padding:2px 5px;"><strong style="font-size:0.84rem; color:#0f172a;">${grp.caretakerTeacherName || 'Sin asignar'}</strong></td>
                    </tr>
                </table>

                <!-- TABLA DE ALUMNOS CON FIRMA (COMPACTA) -->
                <table style="width:100%; border-collapse:collapse; margin-top:2px;">
                    <thead>
                        <tr style="background:#0f172a; color:#ffffff; font-size:0.74rem; font-weight:800; height:20px;">
                            <th style="width:34px; border:1px solid #0f172a; text-align:center;">No.</th>
                            <th style="width:105px; border:1px solid #0f172a; text-align:center; letter-spacing:0.3px;">CÓDIGO PERSONAL</th>
                            <th style="border:1px solid #0f172a; text-align:left; padding-left:8px;">APELLIDOS Y NOMBRES</th>
                            <th style="width:160px; border:1px solid #0f172a; text-align:center;">FIRMA DEL ESTUDIANTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <!-- OBSERVACIONES COMPACTAS -->
                <div style="margin-top:4px; font-size:0.72rem; font-weight:700; color:#1e293b;">
                    OBSERVACIONES:
                    <div style="border-bottom:1px dotted #64748b; height:14px; margin-top:1px;">1. </div>
                    <div style="border-bottom:1px dotted #64748b; height:14px;">2. </div>
                </div>

                <div style="margin-top:3px; font-size:0.72rem; font-weight:700;">
                    Total de pruebas entregadas a Auxiliatura: [ _______ ] de ${studentList.length} estudiantes evaluados.
                </div>

                <!-- FIRMAS INFERIORES -->
                <table style="width:100%; border-collapse:collapse; margin-top:10px; page-break-inside:avoid;">
                    <tr>
                        <td style="width:50%; text-align:center; vertical-align:bottom;">
                            <div style="width:200px; margin:0 auto; border-top:1.5px solid #0f172a; padding-top:2px; font-size:0.74rem;">
                                <strong>${grp.caretakerTeacherName || 'Docente Cuidador'}</strong><br>
                                Docente Cuidador Responsable
                            </div>
                        </td>
                        <td style="width:50%; text-align:center; vertical-align:bottom;">
                            <div style="width:200px; margin:0 auto; border-top:1.5px solid #0f172a; padding-top:2px; font-size:0.74rem;">
                                <strong>Auxiliatura General</strong><br>
                                Sello y Recepción Oficial
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
            `;
        }

        return `
            <div class="sheet-container" style="page-break-inside:avoid;">
                <!-- ENCABEZADO CON LOGO Y MEMBRETE -->
                <table style="width:100%; border-collapse:collapse; margin-bottom:5px; border-bottom:1.5px solid #0f172a; padding-bottom:3px;">
                    <tr>
                        <td style="width:55px; vertical-align:middle;">
                            <img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:44px; width:auto;">
                        </td>
                        <td style="vertical-align:middle; padding-left:8px;">
                            <div style="font-size:0.98rem; font-weight:900; color:#0f172a; text-transform:uppercase; line-height:1.15; letter-spacing:0.3px;">
                                ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                            </div>
                            <div style="font-size:0.74rem; color:#475569; font-weight:700; line-height:1.15;">
                                Jornada Matutina — Jutiapa, Guatemala — Ciclo Escolar ${(STATE && STATE.activeCycle) || '2026'}
                            </div>
                            <div style="font-size:0.8rem; font-weight:900; color:#15803d; margin-top:1px; line-height:1.15; letter-spacing:0.3px;">
                                CONTROL OFICIAL DE EVALUACIONES BIMESTRALES — AUXILIATURA GENERAL
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- TARJETA DE DATOS DEL EXAMEN (MEDIA LISTA) -->
                <table style="width:100%; border-collapse:collapse; font-size:0.76rem; margin-bottom:5px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;">
                    <tr>
                        <td style="width:17%; font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Grado y Sección:</td>
                        <td style="width:35%; font-weight:800; color:#0f172a; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">${sectionNameToUse}</td>
                        <td style="width:16%; font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Fecha:</td>
                        <td style="width:32%; font-weight:800; color:#0f172a; padding:2.5px 5px; border-bottom:1px solid #f1f5f9; text-transform:capitalize;">${dayFormatted}</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Asignatura:</td>
                        <td style="font-weight:800; color:#0f172a; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">${ev.courseName}</td>
                        <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Horario Oficial:</td>
                        <td style="font-weight:800; color:#0f172a; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">${ev.startTime} a ${ev.endTime} hrs (${ev.durationMinutes} min)</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Catedrático Titular:</td>
                        <td style="padding:2.5px 5px; border-bottom:1px solid #f1f5f9;"><strong style="color:#0f172a;">${titularNameToUse}</strong></td>
                        <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Salón Asignado:</td>
                        <td style="font-weight:900; color:#15803d; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">${grp.classroom || 'Salón'}</td>
                    </tr>
                    <tr>
                        <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Grupo Asignado:</td>
                        <td style="font-weight:800; color:#15803d; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">
                            GRUPO "${groupLetter}" (Nómina ${grp.range || (groupLetter === 'A' ? 'Grupo A' : (groupLetter === 'B' ? 'Grupo B' : 'Oficial'))})
                        </td>
                        <td style="font-weight:700; color:#475569; padding:2.5px 5px; border-bottom:1px solid #f1f5f9;">Total Alumnos:</td>
                        <td style="padding:2.5px 5px; border-bottom:1px solid #f1f5f9;"><strong style="color:#0f172a;">${studentList.length} estudiantes</strong></td>
                    </tr>
                    ${caretakerHeaderHtml}
                </table>

                <!-- TABLA DE ALUMNOS CON FIRMA -->
                <table style="width:100%; border-collapse:collapse; margin-top:2px;">
                    <thead>
                        <tr style="background:#0f172a; color:#ffffff; font-size:0.75rem; font-weight:800; height:22px;">
                            <th style="width:34px; border:1px solid #0f172a; text-align:center;">No.</th>
                            <th style="width:105px; border:1px solid #0f172a; text-align:center; letter-spacing:0.3px;">CÓDIGO PERSONAL</th>
                            <th style="border:1px solid #0f172a; text-align:left; padding-left:8px;">APELLIDOS Y NOMBRES</th>
                            <th style="width:160px; border:1px solid #0f172a; text-align:center;">FIRMA DEL ESTUDIANTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <!-- OBSERVACIONES NUMERADAS A EXACTAMENTE 3 LÍNEAS -->
                <div style="margin-top:5px; font-size:0.73rem; font-weight:700; color:#1e293b;">
                    OBSERVACIONES:
                    <div style="border-bottom:1px dotted #64748b; height:14px; margin-top:1px;">1. </div>
                    <div style="border-bottom:1px dotted #64748b; height:14px;">2. </div>
                    <div style="border-bottom:1px dotted #64748b; height:14px;">3. </div>
                </div>

                ${actaRelevoHtml}

                <div style="margin-top:3px; font-size:0.73rem; font-weight:700;">
                    Total de pruebas entregadas a Auxiliatura: [ _______ ] de ${studentList.length} estudiantes evaluados.
                </div>

                <!-- FIRMAS INFERIORES -->
                <table style="width:100%; border-collapse:collapse; margin-top:12px; page-break-inside:avoid;">
                    <tr>
                        <td style="width:50%; text-align:center; vertical-align:bottom;">
                            <div style="width:210px; margin:0 auto; border-top:1.5px solid #0f172a; padding-top:2px; font-size:0.75rem;">
                                <strong>${isPractica ? (grp.caretakerTurn2Name || 'Docente Cuidador Cierre') : (grp.caretakerTeacherName || 'Docente Cuidador')}</strong><br>
                                Docente Cuidador Responsable
                            </div>
                        </td>
                        <td style="width:50%; text-align:center; vertical-align:bottom;">
                            <div style="width:210px; margin:0 auto; border-top:1.5px solid #0f172a; padding-top:2px; font-size:0.75rem;">
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
                <base href="${(typeof window !== 'undefined' && window.location) ? window.location.href : ''}">
                <title>${title}</title>
                <style>
                    @page {
                        size: 8.5in 13in portrait; /* HOJA OFICIO GUATEMALTECO 8.5in x 13in VERTICAL */
                        margin: 5mm 8mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .sheet-container {
                        width: 100%;
                        max-height: 12.2in;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        box-sizing: border-box;
                        overflow: hidden;
                    }
                    .page-break {
                        page-break-after: always;
                        break-after: page;
                    }
                    .no-print-bar {
                        position: sticky;
                        top: 0;
                        background: #0f172a;
                        color: #ffffff;
                        padding: 8px 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        z-index: 9999;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    @media print {
                        .no-print-bar {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="no-print-bar">
                    <div style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
                        <span>Vista de Impresión Oficial ─ Medias Listas ENCCO</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" onclick="window.print()" style="background:#2563eb; color:#ffffff; border:none; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">
                            Imprimir Documento
                        </button>
                        <button type="button" onclick="window.close()" style="background:#475569; color:#ffffff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">
                            ✕ Cerrar
                        </button>
                    </div>
                </div>
                ${bodyHtml}
            </body>
            </html>
        `;
        openPrintWindow(fullHtml, title, 'portrait', bodyHtml);
    }

    // Modal de vista previa en pantalla de Medias Listas (sin forzar impresión del sistema)
    window.previewMediasListasModal = function (dayId, evalId) {
        const found = findDayAndScheduleBlock(dayId, window._currentSelectedExamBim);
        const dayObj = found ? (found.dayObj || found.day) : null;
        if (!found || !dayObj) {
            alert('⚠️ No se encontró la jornada de examen solicitada.');
            return;
        }
        const ev = (dayObj.evaluations || []).find(e => e.id === evalId);
        if (!ev) {
            alert('⚠️ No se encontró la evaluación seleccionada.');
            return;
        }
        if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') {
            alert("Esta asignatura evalúa en proceso (acumulativo continuo). No requiere listas de cuido de examen.");
            return;
        }

        let contentHtml = '';
        const isFull = ev.evaluationMode === 'SECCION_COMPLETA';

        if (Array.isArray(ev.sections) && ev.sections.length > 0) {
            const printableSecs = ev.sections.filter(s => !s.isEnProceso && s.evaluationStatus !== 'EN_PROCESO');
            if (printableSecs.length === 0) {
                alert("Todas las secciones de esta asignatura evalúan en proceso.");
                return;
            }
            printableSecs.forEach((sec, idx) => {
                const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                if (idx > 0) contentHtml += '<div style="margin:24px 0; border-top:2px dashed #94a3b8;"></div>';
                if (secIsFull) {
                    contentHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA', sec);
                } else {
                    contentHtml += generateSingleGroupHtml(dayObj, ev, 'A', sec);
                    contentHtml += '<div style="margin:24px 0; border-top:2px dashed #94a3b8;"></div>';
                    contentHtml += generateSingleGroupHtml(dayObj, ev, 'B', sec);
                }
            });
        } else {
            if (isFull) {
                contentHtml += generateSingleGroupHtml(dayObj, ev, 'COMPLETA');
            } else {
                contentHtml += generateSingleGroupHtml(dayObj, ev, 'A');
                contentHtml += '<div style="margin:24px 0; border-top:2px dashed #94a3b8;"></div>';
                contentHtml += generateSingleGroupHtml(dayObj, ev, 'B');
            }
        }

        // Crear o actualizar modal flotante en la pantalla
        let modalEl = document.getElementById('examMediasPreviewModal');
        if (modalEl) modalEl.remove();

        modalEl = document.createElement('div');
        modalEl.id = 'examMediasPreviewModal';
        modalEl.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.75); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; backdrop-filter:blur(3px);';
        modalEl.onclick = function(e) { if (e.target === modalEl) modalEl.remove(); };

        modalEl.innerHTML = `
            <div style="background:#ffffff; width:100%; max-width:960px; max-height:92vh; border-radius:12px; display:flex; flex-direction:column; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); overflow:hidden;" onclick="event.stopPropagation()">
                <div style="background:#0f172a; color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-eye" style="color:#38bdf8;"></i>
                        <strong style="font-size:0.95rem;">Vista Previa de Nómina de Salón: ${ev.courseName} (${ev.gradeName || ev.gradeCode})</strong>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="window.printMediasListasModal('${dayId}', '${evalId}'); document.getElementById('examMediasPreviewModal')?.remove();" style="font-weight:700; font-size:0.8rem; padding:4px 10px;">
                            <i class="fa-solid fa-print"></i> Mandar a Imprimir
                        </button>
                        <button type="button" onclick="document.getElementById('examMediasPreviewModal')?.remove();" style="background:transparent; border:none; color:#cbd5e1; font-size:1.2rem; cursor:pointer;" title="Cerrar vista previa">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div style="overflow-y:auto; padding:20px; background:#f8fafc; flex:1;">
                    <div style="background:#ffffff; padding:20px; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 2px 4px rgba(0,0,0,0.04);">
                        ${contentHtml}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    };

    // Exportar la distribución oficial del día a Excel (CSV con BOM UTF-8)
    window.exportExamDayToExcel = function (dayId) {
        const found = findDayAndScheduleBlock(dayId, window._currentSelectedExamBim);
        const dayObj = found ? (found.dayObj || found.day) : null;
        if (!found || !dayObj) {
            alert('⚠️ No se encontró la jornada de examen solicitada.');
            return;
        }

        const evs = (dayObj.evaluations || []).slice();
        if (evs.length === 0) {
            alert('No hay evaluaciones asignadas en esta fecha para exportar.');
            return;
        }

        const dayFormatted = new Date(dayObj.date + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Encabezados en formato CSV con punto y coma (estándar para Excel en español)
        const headers = ['Fecha', 'Horario', 'Grado', 'Seccion', 'Asignatura', 'Catedratico Titular', 'Modalidad', 'Grupo/Salon', 'Salon Fisico', 'Cuidador Turno 1', 'Cuidador Turno 2 (Relevo)', 'Alumnos Estimados'];
        const rows = [];

        evs.forEach(ev => {
            if (ev.isEnProceso || ev.evaluationStatus === 'EN_PROCESO') {
                rows.push([
                    dayObj.date,
                    `${ev.startTime || ''} - ${ev.endTime || ''}`,
                    ev.academicGradeName || ev.gradeName || ev.gradeCode || '',
                    'Todas',
                    ev.courseName || '',
                    ev.courseTeacherName || '',
                    'EN PROCESO (ACUMULATIVO)',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A'
                ]);
                return;
            }

            const isPractica = !!(ev.isPractica || ev.isPracticaDay || dayObj.isPracticaDay);
            const isFull = ev.evaluationMode === 'SECCION_COMPLETA';
            const secs = (Array.isArray(ev.sections) && ev.sections.length > 0) ? ev.sections : [ev];

            secs.forEach(sec => {
                const secIsFull = isFull || sec.evaluationMode === 'SECCION_COMPLETA';
                const secLabel = sec.sectionLetter || sec.section || 'A';
                const gradeLabel = sec.gradeName || ev.gradeName || ev.gradeCode || '';
                const titular = sec.teacherName || ev.courseTeacherName || '';

                if (secIsFull) {
                    const room = sec.singleRoom || sec.groupA || ev.singleRoom || ev.groupA || {};
                    rows.push([
                        dayObj.date,
                        `${ev.startTime || ''} - ${ev.endTime || ''}`,
                        gradeLabel,
                        secLabel,
                        ev.courseName || '',
                        titular,
                        'SECCIÓN COMPLETA',
                        'Salón Único',
                        room.classroom || 'Salón Único',
                        room.caretakerTeacherName || 'Sin asignar',
                        isPractica ? (room.caretakerTurn2Name || 'Sin asignar') : 'N/A',
                        room.studentCount || ''
                    ]);
                } else {
                    const grpA = sec.groupA || ev.groupA || {};
                    const grpB = sec.groupB || ev.groupB || {};

                    rows.push([
                        dayObj.date,
                        `${ev.startTime || ''} - ${ev.endTime || ''}`,
                        gradeLabel,
                        secLabel,
                        ev.courseName || '',
                        titular,
                        'MEDIAS SECCIONES',
                        'Grupo A',
                        grpA.classroom || 'Salón A',
                        grpA.caretakerTeacherName || 'Sin asignar',
                        isPractica ? (grpA.caretakerTurn2Name || 'Sin asignar') : 'N/A',
                        grpA.studentCount || ''
                    ]);

                    rows.push([
                        dayObj.date,
                        `${ev.startTime || ''} - ${ev.endTime || ''}`,
                        gradeLabel,
                        secLabel,
                        ev.courseName || '',
                        titular,
                        'MEDIAS SECCIONES',
                        'Grupo B',
                        grpB.classroom || 'Salón B',
                        grpB.caretakerTeacherName || 'Sin asignar',
                        isPractica ? (grpB.caretakerTurn2Name || 'Sin asignar') : 'N/A',
                        grpB.studentCount || ''
                    ]);
                }
            });
        });

        // Construir contenido CSV con BOM UTF-8 (\uFEFF)
        const escapeCsv = (val) => {
            const str = String(val === undefined || val === null ? '' : val);
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        let csvContent = '\uFEFF' + headers.map(escapeCsv).join(';') + '\r\n';
        rows.forEach(r => {
            csvContent += r.map(escapeCsv).join(';') + '\r\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Distribucion_Examenes_${dayObj.date}_ENCCO.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // =========================================================================
    // IMPRESIÓN 3: CALENDARIO GENERAL CONSOLIDADO EN PDF
    // =========================================================================
    window.printConsolidatedCalendarPdf = function () {
        const bimesterSelectVal = (window._currentSelectedExamBim) || getInstitutionalActiveBimester();
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

            // Excluir evaluaciones en proceso del calendario general consolidado impreso
            const evs = (d.evaluations || []).filter(e => !e.isEnProceso && e.evaluationStatus !== 'EN_PROCESO');
            if (evs.length === 0) {
                daysTablesHtml += `
                    <div class="calendar-day-block">
                        <div class="calendar-day-header">
                            ${dFormatted} ${d.isPracticaDay ? '─ (JORNADA EXCLUSIVA DE PRÁCTICA SUPERVISADA)' : ''}
                        </div>
                        <div style="border:1px solid #cbd5e1; padding:8px; text-align:center; color:#64748b; font-size:0.8rem;">
                            Sin evaluaciones programadas para este día.
                        </div>
                    </div>
                `;
                return;
            }

            // Agrupar evaluaciones por grado académico para separar las tablas por grado aunque compartan el mismo horario
            const gradeMap = new Map();
            evs.forEach(ev => {
                const gKey = (ev.academicGradeName || ev.gradeName || ev.gradeCode || 'Grado General').trim();
                if (!gradeMap.has(gKey)) gradeMap.set(gKey, []);
                gradeMap.get(gKey).push(ev);
            });

            // Ordenar los grados académicamente: 4to -> 5to -> 6to
            const sortedGradeKeys = Array.from(gradeMap.keys()).sort((a, b) => {
                const getOrder = (str) => {
                    if (str.includes('4') || /cuarto/i.test(str)) return 1;
                    if (str.includes('5') || /quinto/i.test(str)) return 2;
                    if (str.includes('6') || /sexto/i.test(str)) return 3;
                    return 4;
                };
                return getOrder(a) - getOrder(b) || a.localeCompare(b, 'es');
            });

            let dayGradesTablesHtml = '';
            sortedGradeKeys.forEach(gradeName => {
                const gradeEvals = gradeMap.get(gradeName);
                let evRows = '';

                gradeEvals.forEach(ev => {
                    let cuidadoresStr = '';
                    const isFull = ev.evaluationMode === 'SECCION_COMPLETA';

                    if (ev.isPractica) {
                        const gA = ev.groupA || {};
                        const gB = ev.groupB || {};
                        cuidadoresStr = `Salón ${gA.classroom || 'Salón'} (A): ${gA.caretakerTeacherName || 'N/A'} / ${gA.caretakerTurn2Name || 'N/A'}<br>Salón ${gB.classroom || 'Salón'} (B): ${gB.caretakerTeacherName || 'N/A'} / ${gB.caretakerTurn2Name || 'N/A'}`;
                    } else if ((ev.isComputacion || ev.isMecanografia) && ev.computacionMode === 'single') {
                        cuidadoresStr = `${ev.isMecanografia ? 'Taller Meca' : 'Lab. Computación'}: ${ev.courseTeacherName} (Titular)`;
                    } else if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                        cuidadoresStr = ev.sections.map(sec => {
                            if (sec.isEnProceso || sec.evaluationStatus === 'EN_PROCESO') {
                                return `<strong>${sec.section}:</strong> <span style="color:#92400e;">En Proceso</span>`;
                            }
                            if (isFull || sec.evaluationMode === 'SECCION_COMPLETA') {
                                const sRoom = sec.singleRoom || sec.groupA || {};
                                return `<strong>${sec.section}:</strong> Salón ${sRoom.classroom || 'Salón'} ─ ${sRoom.caretakerTeacherName || 'Sin asignar'}`;
                            } else {
                                const sgA = sec.groupA || {};
                                const sgB = sec.groupB || {};
                                return `<strong>${sec.section}:</strong> Salón ${sgA.classroom || 'Salón'} (A): ${sgA.caretakerTeacherName || 'N/A'} | Salón ${sgB.classroom || 'Salón'} (B): ${sgB.caretakerTeacherName || 'N/A'}`;
                            }
                        }).join('<br>');
                    } else {
                        if (isFull) {
                            const sRoom = ev.singleRoom || ev.groupA || {};
                            cuidadoresStr = `Salón ${sRoom.classroom || 'Salón'} (Sección Completa): ${sRoom.caretakerTeacherName || 'N/A'}`;
                        } else {
                            const gA = ev.groupA || {};
                            const gB = ev.groupB || {};
                            cuidadoresStr = `Salón ${gA.classroom || 'Salón'} (A): ${gA.caretakerTeacherName || 'N/A'}<br>Salón ${gB.classroom || 'Salón'} (B): ${gB.caretakerTeacherName || 'N/A'}`;
                        }
                    }

                    // Detalle de titulares de cada sección con respaldo dinámico desde pensum
                    let titularesStr = '';
                    if (Array.isArray(ev.sections) && ev.sections.length > 0) {
                        titularesStr = ev.sections.map(sec => {
                            const fresh = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
                            const foundSec = fresh.find(f => f.sectionLetter === (sec.sectionLetter || (sec.section || '').replace(/Secci[oó]n\s*/i, '').trim()) || f.section === sec.section);
                            const tName = (foundSec && foundSec.teacherName) ? foundSec.teacherName : sec.teacherName;
                            return `${sec.section}: ${tName || 'Sin asignar'}`;
                        }).join(' | ');
                    } else {
                        const fresh = getSectionsAndTitularsForCourse(ev.academicGradeName || ev.gradeName, ev.courseName);
                        if (fresh.length > 0) {
                            titularesStr = fresh.map(f => `${f.section}: ${f.teacherName}`).join(' | ');
                        } else {
                            titularesStr = ev.courseTeacherName || 'Sin asignar';
                        }
                    }

                    const modoBadge = isFull
                        ? '<span style="display:inline-block; font-size:0.68rem; font-weight:800; background:#dbeafe; color:#1e40af; padding:1px 5px; border-radius:3px; margin-top:2px;">SECCIÓN COMPLETA</span>'
                        : '<span style="display:inline-block; font-size:0.68rem; font-weight:800; background:#dcfce7; color:#15803d; padding:1px 5px; border-radius:3px; margin-top:2px;">MEDIAS SECCIONES (A / B)</span>';

                    evRows += `
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:4px 6px; font-weight:800; font-size:0.8rem; vertical-align:top; white-space:nowrap;">
                                ${ev.startTime} - ${ev.endTime}
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:0.8rem; vertical-align:top;">
                                <strong style="color:#0f172a;">${ev.courseName}</strong><br>
                                <small style="color:#475569; font-weight:700;">Titular(es): ${titularesStr}</small><br>
                                ${modoBadge}
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:4px 6px; text-align:center; font-weight:700; font-size:0.8rem; vertical-align:top;">
                                ${ev.durationMinutes} min
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:0.78rem; line-height:1.3; vertical-align:top;">
                                ${cuidadoresStr}
                            </td>
                        </tr>
                    `;
                });

                dayGradesTablesHtml += `
                    <div class="calendar-grade-box">
                        <div class="calendar-grade-header">
                            <span>${gradeName.toUpperCase()}</span>
                            <span style="font-size:0.75rem; color:#cbd5e1; font-weight:600;">(${gradeEvals.length} evaluación/es)</span>
                        </div>
                        <table class="calendar-table">
                            <thead>
                                <tr style="background:#f8fafc; font-size:0.74rem; font-weight:800; color:#334155;">
                                    <th style="width:14%; text-align:left;">HORARIO</th>
                                    <th style="width:44%; text-align:left;">ASIGNATURA Y CATEDRÁTICOS TITULARES</th>
                                    <th style="width:10%; text-align:center;">DURACIÓN</th>
                                    <th style="width:32%; text-align:left;">SALONES Y CUIDADORES ASIGNADOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${evRows}
                            </tbody>
                        </table>
                    </div>
                `;
            });

            daysTablesHtml += `
                <div class="calendar-day-block">
                    <div class="calendar-day-header">
                        ${dFormatted} ${d.isPracticaDay ? '─ (JORNADA EXCLUSIVA DE PRÁCTICA SUPERVISADA)' : ''}
                    </div>
                    <div style="padding:0;">
                        ${dayGradesTablesHtml}
                    </div>
                </div>
            `;
        });

        const calendarHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <base href="${(typeof window !== 'undefined' && window.location) ? window.location.href : ''}">
                <title>Calendario General de Evaluaciones - Bimestre ${bimesterSelectVal}</title>
                <style>
                    @page {
                        size: 8.5in 13in portrait; /* HOJA OFICIO GUATEMALTECO 8.5in x 13in VERTICAL */
                        margin: 8mm 10mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print-bar {
                        position: sticky;
                        top: 0;
                        background: #0f172a;
                        color: #ffffff;
                        padding: 8px 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        z-index: 9999;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    @media print {
                        .no-print-bar {
                            display: none !important;
                        }
                    }
                    .calendar-header-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 8px;
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 4px;
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .calendar-day-block {
                        margin-bottom: 12px;
                        page-break-inside: auto;
                        break-inside: auto;
                    }
                    .calendar-day-header {
                        background: #0f172a !important;
                        color: #ffffff !important;
                        padding: 5px 10px;
                        font-size: 0.86rem;
                        font-weight: 900;
                        border-radius: 4px 4px 0 0;
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .calendar-grade-box {
                        margin-top: 5px;
                        margin-bottom: 8px;
                        border: 1px solid #cbd5e1;
                        border-radius: 4px;
                        page-break-inside: auto;
                        break-inside: auto;
                    }
                    .calendar-grade-header {
                        background: #1e293b !important;
                        color: #ffffff !important;
                        padding: 4px 8px;
                        font-size: 0.78rem;
                        font-weight: 800;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .calendar-table {
                        width: 100%;
                        border-collapse: collapse;
                        page-break-inside: auto;
                    }
                    .calendar-table thead {
                        display: table-header-group;
                    }
                    .calendar-table tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .calendar-table th, .calendar-table td {
                        border: 1px solid #cbd5e1;
                        padding: 4px 6px;
                        font-size: 0.76rem;
                        vertical-align: top;
                    }
                </style>
            </head>
            <body>
                <div class="no-print-bar">
                    <div style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
                        <span>Vista de Impresión Oficial ─ Calendario General</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" onclick="window.print()" style="background:#2563eb; color:#ffffff; border:none; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">
                            Imprimir Documento
                        </button>
                        <button type="button" onclick="window.close()" style="background:#475569; color:#ffffff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">
                            ✕ Cerrar
                        </button>
                    </div>
                </div>
                <table class="calendar-header-table">
                    <tr>
                        <td style="width:65px;"><img src="logo.png" onerror="this.src='portada-comercio-principal.webp'" style="height:50px;"></td>
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
        openPrintWindow(calendarHtml, 'Calendario_General', 'portrait');
    };

    // Helper unificado para abrir ventana de impresión (protegido contra doble clic accidental y bloqueos de pop-up)
    let isPrintWindowOpening = false;
    function openPrintWindow(htmlContent, title = 'Impresion_Oficial', orientation = 'portrait') {
        if (isPrintWindowOpening) return;
        isPrintWindowOpening = true;
        setTimeout(() => { isPrintWindowOpening = false; }, 1200);

        // 1. Intentar abrir en pestaña/ventana nueva sin flags restrictivos que detonen bloqueos
        let printWin = null;
        try {
            printWin = window.open('', '_blank');
        } catch (e) {
            printWin = null;
        }

        // 2. Si el navegador bloqueó la ventana emergente, fallback transparente con iframe oculto
        if (!printWin) {
            printViaHiddenIframe(htmlContent);
            return;
        }

        try {
            printWin.document.open();
            printWin.document.write(htmlContent);
            printWin.document.close();

            let hasTriggered = false;
            const trigger = () => {
                if (hasTriggered) return;
                hasTriggered = true;
                try {
                    printWin.focus();
                    printWin.print();
                } catch (e) {
                    console.error("Error al disparar impresión:", e);
                }
            };

            const img = printWin.document.querySelector('img');
            if (img) {
                if (img.complete) {
                    setTimeout(trigger, 300);
                } else {
                    img.onload = () => setTimeout(trigger, 250);
                    img.onerror = () => setTimeout(trigger, 250);
                    setTimeout(trigger, 1200);
                }
            } else {
                setTimeout(trigger, 300);
            }
        } catch (err) {
            console.warn("Fallo al escribir en ventana emergente, recurriendo a iframe:", err);
            printViaHiddenIframe(htmlContent);
        }
    }

    // Mecanismo de respaldo que imprime directamente en segundo plano sin requerir pop-ups
    function printViaHiddenIframe(htmlContent) {
        let iframe = document.getElementById('examPrintIframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'examPrintIframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.zIndex = '-9999';
            document.body.appendChild(iframe);
        }

        try {
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(htmlContent);
            doc.close();

            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }, 450);
        } catch (e) {
            console.error("Error al imprimir via iframe:", e);
            alert("No se pudo iniciar la impresión automática. Por favor verifique los permisos de su navegador.");
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
    window.filterTeachersInDay = filterTeachersInDay;

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
        reconcileScheduleBlockTitulars,
        isSameSubject,
        getInstitutionalSalonsList,
        autoAssignRandomProctors,
        autoPickProctorsForModal,
        randomizeProctorsForBimester,
        randomizeProctorsForDay,
        printDailyScheduleOficio,
        printMediasListasModal,
        printAllMediasListasOfDay,
        printAllNominasOfBimester,
        printConsolidatedCalendarPdf,
        getInstitutionalActiveBimester,
        getCurrentScheduleKey,
        getActiveGradeColumnsForDay,
        classifyGradeForDay,
        filterTeachersInDay
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.EXAM_SCHEDULES_MODULE;
    }

})(typeof window !== 'undefined' ? window : global, typeof document !== 'undefined' ? document : { getElementById: () => null });
