/**
 * auxiliatura_center.js
 * CENTRO DE CONTROL INTEGRAL DE AUXILIATURA Y SECRETARÍA
 * ENCCO Jornada Diurna - Jutiapa (1970)
 * 
 * Módulo unificado para Auxiliares, Secretaría y Dirección:
 * - Ficha 360° del Estudiante
 * - Acciones rápidas (Anotación, Justificación, Permiso, Citación)
 * - Bandeja de pendientes y alertas en tiempo real
 * - Monitoreo por sección
 * - Transparencia para docentes (quién autoriza permisos y quién resuelve casos)
 */

(function (window, document) {
    'use strict';

    // 1. Inyección de estilos dedicados
    function injectAuxiliaturaStyles() {
        if (document.getElementById('auxiliatura-center-styles')) return;
        const style = document.createElement('style');
        style.id = 'auxiliatura-center-styles';
        style.textContent = `
            .aux-kpi-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.03);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .aux-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.06);
            }
            .aux-kpi-icon {
                width: 48px;
                height: 48px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
                flex-shrink: 0;
            }
            .aux-kpi-red { background: #fee2e2; color: #dc2626; }
            .aux-kpi-orange { background: #ffedd5; color: #ea580c; }
            .aux-kpi-blue { background: #e0f2fe; color: #0284c7; }
            .aux-kpi-green { background: #dcfce7; color: #16a34a; }

            .aux-search-input {
                width: 100%;
                padding: 12px 16px 12px 42px;
                font-size: 0.95rem;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
                background: #ffffff;
            }
            .aux-search-input:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 3px rgba(2,132,199,0.15);
            }

            .aux-drawer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15,23,42,0.65);
                backdrop-filter: blur(3px);
                z-index: 100000;
                display: flex;
                justify-content: flex-end;
                animation: auxFadeIn 0.2s ease-out;
            }
            .aux-drawer-content {
                background: #ffffff;
                width: 100%;
                max-width: 680px;
                height: 100%;
                overflow-y: auto;
                box-shadow: -10px 0 25px rgba(0,0,0,0.25);
                display: flex;
                flex-direction: column;
                animation: auxSlideIn 0.25s ease-out;
            }
            @keyframes auxSlideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            @keyframes auxFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .aux-chip {
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .aux-chip-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .aux-chip-orange { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
            .aux-chip-green { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .aux-chip-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
            .aux-chip-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }

            .aux-tab-btn {
                padding: 10px 16px;
                border: none;
                background: transparent;
                font-weight: 700;
                font-size: 0.88rem;
                color: #64748b;
                border-bottom: 2.5px solid transparent;
                cursor: pointer;
                transition: color 0.2s, border-color 0.2s;
                white-space: nowrap;
            }
            .aux-tab-btn.active {
                color: #0284c7;
                border-bottom-color: #0284c7;
            }
            .aux-tab-btn:hover:not(.active) {
                color: #0f172a;
            }

            .aux-action-btn-circle {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #cbd5e1;
                background: #ffffff;
                color: #334155;
                cursor: pointer;
                transition: all 0.15s;
            }
            .aux-action-btn-circle:hover {
                background: #f1f5f9;
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
    }

    // Helper: Consolidar y listar ausencias al aula del día actual
    function getTodayAbsencesList() {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMonth = new Date().getMonth() + 1;
        const todayDay = new Date().getDate();

        const results = [];
        const seenStudentSubjectKeys = new Set();

        // 1. Alertas en tiempo real enviadas desde el aula ('attendanceAlerts')
        const allAlerts = (window.STATE && window.STATE.attendanceAlerts) || [];
        allAlerts.forEach(alert => {
            if (!alert) return;
            const aDate = alert.date || (alert.timestamp ? new Date(alert.timestamp).toISOString().split('T')[0] : '');
            const aDay = alert.day || (alert.timestamp ? new Date(alert.timestamp).getDate() : null);
            const aMonth = alert.month || (alert.timestamp ? (new Date(alert.timestamp).getMonth() + 1) : null);

            const isToday = (aDate === todayStr) || (aDay === todayDay && aMonth === todayMonth);
            if (isToday && alert.status !== 'corregida') {
                const key = `${alert.studentId || alert.studentName}_${alert.courseId || alert.courseName || 'GEN'}`;
                seenStudentSubjectKeys.add(key);
                results.push({
                    source: 'alert',
                    id: alert.id,
                    alertId: alert.id,
                    studentId: alert.studentId,
                    studentName: alert.studentName || 'Estudiante',
                    carne: alert.carne || '---',
                    gradeCode: alert.gradeCode || '',
                    gradeLabel: alert.gradeLabel || 'Sección',
                    courseId: alert.courseId || '',
                    courseName: alert.courseName || 'Cátedra',
                    teacherName: alert.teacherName || 'Catedrático',
                    time: alert.time || (alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'),
                    timestamp: alert.timestamp || Date.now(),
                    date: alert.date || todayStr,
                    status: alert.status || 'pendiente',
                    guardianName: alert.guardianName || 'No registrado',
                    guardianPhone: alert.guardianPhone || '',
                    notes: alert.notes || ''
                });
            }
        });

        // 2. Ausencias asentadas en planilla escolar ('attendanceRecords')
        if (window.STATE && window.STATE.attendanceRecords) {
            const students = window.STATE.students || [];
            const courses = window.STATE.courses || [];
            const grades = window.STATE.gradesList || [];

            Object.entries(window.STATE.attendanceRecords).forEach(([recordKey, gradeMap]) => {
                if (!gradeMap || typeof gradeMap !== 'object') return;
                const parts = recordKey.split('_');
                const recGrade = parts[0] || '';
                const recMonth = parseInt(parts[1]) || todayMonth;
                const recCourse = parts[2] || '';

                if (parts.length >= 2 && !isNaN(recMonth) && recMonth !== todayMonth) return;

                Object.entries(gradeMap).forEach(([studentId, daysObj]) => {
                    if (daysObj && (daysObj[todayDay] === 'A' || daysObj[String(todayDay)] === 'A')) {
                        const key = `${studentId}_${recCourse || 'GEN'}`;
                        if (!seenStudentSubjectKeys.has(key)) {
                            seenStudentSubjectKeys.add(key);
                            const student = students.find(s => s.id === studentId || s.id === String(studentId) || s.personalCode === studentId);
                            const course = courses.find(c => c.id === recCourse || c.code === recCourse);
                            const gradeObj = grades.find(g => g.code === recGrade);

                            const gLabel = gradeObj ? `${gradeObj.name} ${gradeObj.section ? ('- ' + gradeObj.section) : ''}` : (student ? (student.grade || student.section || recGrade) : recGrade);
                            const cName = course ? course.name : (recCourse ? recCourse : 'Asistencia en Aula');
                            const tName = course ? (course.teacherName || course.teacher || 'Catedrático') : 'Docente Titular';
                            const tutor = student ? (student.tutorName || student.tutor || 'No registrado') : 'No registrado';
                            const phone = student ? (student.tutorPhone || student.phone || '') : '';
                            const studentName = student ? (student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()) : 'Estudiante';
                            const carne = student ? (student.carne || student.personalCode || '---') : '---';

                            const synthAlertId = 'rec_alert_' + todayDay + '_' + todayMonth + '_' + studentId + '_' + (recCourse || 'GEN');
                            let existingAlert = (window.STATE.attendanceAlerts || []).find(a => a.id === synthAlertId);
                            if (!existingAlert) {
                                existingAlert = {
                                    id: synthAlertId,
                                    studentId: studentId,
                                    studentName: studentName,
                                    carne: carne,
                                    gradeCode: recGrade,
                                    gradeLabel: gLabel,
                                    courseId: recCourse,
                                    courseName: cName,
                                    teacherName: tName,
                                    day: todayDay,
                                    month: todayMonth,
                                    date: todayStr,
                                    time: 'Planilla Diaria',
                                    timestamp: Date.now(),
                                    status: 'pendiente',
                                    guardianName: tutor,
                                    guardianPhone: phone,
                                    notes: ''
                                };
                                if (!window.STATE.attendanceAlerts) window.STATE.attendanceAlerts = [];
                                window.STATE.attendanceAlerts.push(existingAlert);
                            }

                            results.push({
                                source: 'record',
                                id: synthAlertId,
                                alertId: synthAlertId,
                                studentId: studentId,
                                studentName: studentName,
                                carne: carne,
                                gradeCode: recGrade,
                                gradeLabel: gLabel,
                                courseId: recCourse,
                                courseName: cName,
                                teacherName: tName,
                                time: 'Planilla Diaria',
                                timestamp: Date.now(),
                                date: todayStr,
                                status: existingAlert.status || 'pendiente',
                                guardianName: tutor,
                                guardianPhone: phone,
                                notes: existingAlert.notes || ''
                            });
                        }
                    }
                });
            });
        }

        return results;
    }
    window.getTodayAbsencesList = getTodayAbsencesList;

    // 2. Renderizado de la Vista Principal del Centro de Control
    function renderAuxiliaturaCenterView() {
        injectAuxiliaturaStyles();
        const container = document.getElementById('view-auxiliatura-center');
        if (!container) return;

        const students = window.STATE ? (window.STATE.students || []) : [];
        const disciplineReports = window.STATE ? (window.STATE.disciplineReports || window.STATE.discipline || []) : [];
        const studentPermissions = window.STATE ? (window.STATE.studentPermissions || []) : [];

        // Conteo de métricas en tiempo real
        const pendingDiscipline = disciplineReports.filter(d => d.status !== 'Resuelto');
        const nowIsoDate = new Date().toISOString().split('T')[0];
        const activePermissions = studentPermissions.filter(p => {
            const start = p.startDate || p.date || '';
            const end = p.endDate || start;
            return (!start || start <= nowIsoDate) && (!end || end >= nowIsoDate);
        });

        // Ausencias detectadas en la fecha actual (alertas en vivo + registros de planilla)
        const todayAbsencesList = getTodayAbsencesList();
        const todayAbsencesCount = todayAbsencesList.length;

        // Usuario actual y rol
        const user = window.STATE ? window.STATE.currentUser : null;
        const userName = user ? (user.name || user.username) : 'Funcionario';
        const roleLabel = (window.STATE && window.STATE.currentRole === 'secretaria') ? 'Secretaría Académica' : 'Auxiliatura General';

        container.innerHTML = `
            <div style="padding: 4px 0 24px 0;">
                <!-- ENCABEZADO Y ACCIONES RÁPIDAS -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:18px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="badge" style="background:#0284c7; color:#fff; font-size:0.75rem; font-weight:800; padding:3px 8px;">
                                <i class="fa-solid fa-shield-halved"></i> ${roleLabel}
                            </span>
                            <span style="font-size:0.8rem; color:#64748b;">Sesión activa: <strong>${userName}</strong></span>
                        </div>
                        <h2 style="margin:6px 0 2px 0; color:#0f172a; font-weight:800; font-size:1.45rem;">
                            Centro de Control Estudiantil y Disciplinario
                        </h2>
                        <p style="margin:0; color:#64748b; font-size:0.85rem;">
                            Ficha 360°, monitoreo activo de inasistencias, emisión de permisos y resolución de incidencias.
                        </p>
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <button type="button" class="btn btn-primary" onclick="openQuickAuxiliaturaActionModal()" style="font-weight:700; display:flex; align-items:center; gap:7px; box-shadow:0 2px 8px rgba(2,132,199,0.35);">
                            <i class="fa-solid fa-bolt"></i> Acción Rápida
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="printAuxiliaturaDailyConsolidated()" style="font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-print"></i> Reporte Diario
                        </button>
                    </div>
                </div>

                <!-- KPI CARDS EN TIEMPO REAL -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px; margin-bottom:20px;">
                    <div class="aux-kpi-card" onclick="filterAuxStudentQuickList('absent')" style="cursor:pointer;" title="Clic para ver lista completa de ausencias reportadas hoy">
                        <div class="aux-kpi-icon aux-kpi-red"><i class="fa-solid fa-user-xmark"></i></div>
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Ausencias Reportadas Hoy</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.45rem; font-weight:800; color:#dc2626;">${todayAbsencesCount}</h3>
                        </div>
                    </div>
                    <div class="aux-kpi-card" onclick="switchAuxCenterTab('discipline')" style="cursor:pointer;" title="Clic para ir a casos pendientes">
                        <div class="aux-kpi-icon aux-kpi-orange"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Casos Disciplinarios Activos</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.45rem; font-weight:800; color:#ea580c;">${pendingDiscipline.length}</h3>
                        </div>
                    </div>
                    <div class="aux-kpi-card" onclick="switchAuxCenterTab('permissions')" style="cursor:pointer;" title="Clic para ver permisos vigentes">
                        <div class="aux-kpi-icon aux-kpi-blue"><i class="fa-solid fa-clipboard-check"></i></div>
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Permisos Oficiales Vigentes</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.45rem; font-weight:800; color:#0284c7;">${activePermissions.length}</h3>
                        </div>
                    </div>
                    <div class="aux-kpi-card" onclick="filterAuxStudentQuickList('all')" style="cursor:pointer;" title="Clic para ver la nómina completa por secciones">
                        <div class="aux-kpi-icon aux-kpi-green"><i class="fa-solid fa-users"></i></div>
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Población Estudiantil Activa</span>
                            <h3 style="margin:2px 0 0 0; font-size:1.45rem; font-weight:800; color:#16a34a;">${students.filter(s => s.status !== 'Retirado').length}</h3>
                        </div>
                    </div>
                </div>

                <!-- BARRA DE BÚSQUEDA 360° -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:18px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                    <div style="position:relative; margin-bottom:10px;">
                        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:15px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:1.1rem;"></i>
                        <input type="text" id="auxSearchStudentInput" class="aux-search-input" 
                            placeholder="Buscar estudiante por nombre, código personal, carné o sección para abrir su Ficha 360°..." 
                            oninput="handleAuxStudentSearch(this.value)" autocomplete="off">
                        <button type="button" onclick="document.getElementById('auxSearchStudentInput').value=''; handleAuxStudentSearch('');" 
                            style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer;" title="Limpiar búsqueda">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <!-- RESULTADOS DE BÚSQUEDA RÁPIDA 360° -->
                    <div id="auxSearchResultsBox" style="display:none; max-height:280px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc; padding:8px;"></div>
                </div>

                <!-- NAVEGACIÓN POR PESTAÑAS DEL CENTRO DE CONTROL -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                    <div style="display:flex; border-bottom:1px solid #e2e8f0; background:#f8fafc; overflow-x:auto;">
                        <button type="button" class="aux-tab-btn" id="auxTabBtn-absences" onclick="switchAuxCenterTab('absences')">
                            <i class="fa-solid fa-user-xmark" style="margin-right:5px; color:#dc2626;"></i> Ausencias al Aula (${todayAbsencesCount})
                        </button>
                        <button type="button" class="aux-tab-btn active" id="auxTabBtn-pending" onclick="switchAuxCenterTab('pending')">
                            <i class="fa-solid fa-inbox" style="margin-right:5px;"></i> Bandeja de Pendientes (${pendingDiscipline.length})
                        </button>
                        <button type="button" class="aux-tab-btn" id="auxTabBtn-sections" onclick="switchAuxCenterTab('sections')">
                            <i class="fa-solid fa-chalkboard" style="margin-right:5px;"></i> Monitoreo por Secciones
                        </button>
                        <button type="button" class="aux-tab-btn" id="auxTabBtn-discipline" onclick="switchAuxCenterTab('discipline')">
                            <i class="fa-solid fa-scale-balanced" style="margin-right:5px;"></i> Disciplina y Actas
                        </button>
                        <button type="button" class="aux-tab-btn" id="auxTabBtn-permissions" onclick="switchAuxCenterTab('permissions')">
                            <i class="fa-solid fa-clipboard-list" style="margin-right:5px;"></i> Historial de Permisos
                        </button>
                    </div>

                    <!-- CONTENIDO DE LAS PESTAÑAS -->
                    <div id="auxCenterTabContent" style="padding:16px;">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>
            </div>
        `;

        // Renderizar pestaña por defecto: Ausencias si hay ausencias hoy y no hay pendientes de disciplina, sino Pendientes
        if (todayAbsencesCount > 0 && pendingDiscipline.length === 0) {
            switchAuxCenterTab('absences');
        } else {
            switchAuxCenterTab('pending');
        }
    }
    window.renderAuxiliaturaCenterView = renderAuxiliaturaCenterView;

    // 3. Cambio de pestañas en el centro de control
    function switchAuxCenterTab(tabKey) {
        document.querySelectorAll('.aux-tab-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`auxTabBtn-${tabKey}`);
        if (btn) btn.classList.add('active');

        const content = document.getElementById('auxCenterTabContent');
        if (!content) return;

        if (tabKey === 'absences') {
            renderAuxAbsencesTab(content);
        } else if (tabKey === 'pending') {
            renderAuxPendingTab(content);
        } else if (tabKey === 'sections') {
            renderAuxSectionsTab(content);
        } else if (tabKey === 'discipline') {
            renderAuxDisciplineTab(content);
        } else if (tabKey === 'permissions') {
            renderAuxPermissionsTab(content);
        }
    }
    window.switchAuxCenterTab = switchAuxCenterTab;

    // Enrutador rápido desde KPI Cards
    function filterAuxStudentQuickList(type) {
        if (type === 'absent') {
            switchAuxCenterTab('absences');
        } else if (type === 'discipline') {
            switchAuxCenterTab('discipline');
        } else if (type === 'permissions') {
            switchAuxCenterTab('permissions');
        } else if (type === 'all') {
            switchAuxCenterTab('sections');
        } else {
            switchAuxCenterTab('pending');
        }
    }
    window.filterAuxStudentQuickList = filterAuxStudentQuickList;

    // Pestaña: Ausencias al Aula del Día
    function renderAuxAbsencesTab(container) {
        const absences = getTodayAbsencesList();
        const todayStr = new Date().toISOString().split('T')[0];
        const grades = window.STATE ? (window.STATE.gradesList || []) : [];

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                <div>
                    <strong style="color:#0f172a; font-size:1.02rem; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-user-xmark" style="color:#dc2626;"></i> 
                        Ausencias Reportadas al Aula Hoy (<span id="auxAbsencesCountBadge">${absences.length}</span>)
                    </strong>
                    <span style="font-size:0.8rem; color:#64748b;">
                        Reportes de inasistencias en tiempo real desde el aula y registros de la planilla escolar (${todayStr}).
                    </span>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <input type="text" id="auxAbsenceFilterInput" placeholder="Buscar por estudiante, carné o docente..." 
                        oninput="filterAuxAbsencesTable()"
                        style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; min-width:230px;">
                    <select id="auxAbsenceGradeFilter" onchange="filterAuxAbsencesTable()"
                        style="padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem;">
                        <option value="ALL">-- Todas las Secciones --</option>
                        ${grades.map(g => `<option value="${(g.code || '')}">${(g.name || '')} - Sección ${(g.section || '')}</option>`).join('')}
                    </select>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="if(typeof navigateToView === 'function') navigateToView('auxiliatura-log'); else if(typeof showView === 'function') showView('auxiliatura-log');" style="font-size:0.8rem; font-weight:700;">
                        <i class="fa-solid fa-book-bookmark"></i> Bitácora Oficial
                    </button>
                </div>
            </div>

            ${absences.length === 0 ? `
                <div style="text-align:center; padding:40px 20px; color:#64748b; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:#16a34a; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1.05rem;">¡Sin ausencias registradas hoy!</strong>
                    <p style="margin:4px 0 0 0; font-size:0.85rem;">Todos los estudiantes reportados se encuentran presentes o con justificación autorizada.</p>
                </div>
            ` : `
                <div class="table-responsive" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                    <table class="custom-table" id="auxAbsencesMainTable" style="font-size:0.85rem; width:100%; margin:0;">
                        <thead style="background:#f1f5f9; color:#334155;">
                            <tr>
                                <th style="padding:10px 12px;">Estudiante</th>
                                <th style="padding:10px 12px;">Grado / Sección</th>
                                <th style="padding:10px 12px;">Cátedra y Docente</th>
                                <th style="padding:10px 12px;">Contacto Encargado</th>
                                <th style="padding:10px 12px; text-align:center;">Estado</th>
                                <th style="padding:10px 12px; text-align:center;">Acciones Inmediatas</th>
                            </tr>
                        </thead>
                        <tbody id="auxAbsencesTableBody">
                            ${renderAuxAbsenceRowsHtml(absences)}
                        </tbody>
                    </table>
                </div>
            `}
        `;
    }
    window.renderAuxAbsencesTab = renderAuxAbsencesTab;

    function renderAuxAbsenceRowsHtml(absences) {
        if (!absences || absences.length === 0) {
            return `<tr><td colspan="6" style="text-align:center; padding:22px; color:#64748b;">No hay registros de inasistencias que coincidan con la búsqueda.</td></tr>`;
        }

        return absences.map(item => {
            const studentId = item.studentId;
            const studentName = item.studentName || 'Estudiante';
            const carne = item.carne || '---';
            const gradeLabel = item.gradeLabel || item.gradeCode || 'Sección';
            const courseName = item.courseName || 'Cátedra';
            const teacherName = item.teacherName || 'Docente';
            const time = item.time || '--:--';
            const guardianName = item.guardianName || 'No registrado';
            const guardianPhone = item.guardianPhone || '';
            const cleanPhone = (guardianPhone || '').replace(/\D/g, '');
            const status = item.status || 'pendiente';
            const alertId = item.alertId || item.id;

            let statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700; padding:4px 8px;"><i class="fa-solid fa-clock" style="margin-right:3px;"></i> Pendiente</span>';
            if (status === 'justificada') {
                statusBadge = '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-weight:700; padding:4px 8px;"><i class="fa-solid fa-check" style="margin-right:3px;"></i> Justificada</span>';
            } else if (status === 'citacion') {
                statusBadge = '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; font-weight:700; padding:4px 8px;"><i class="fa-solid fa-triangle-exclamation" style="margin-right:3px;"></i> Citación</span>';
            } else if (status === 'verificada') {
                statusBadge = '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:700; padding:4px 8px;"><i class="fa-solid fa-eye" style="margin-right:3px;"></i> Verificada</span>';
            }

            const monthAbsences = (typeof getStudentMonthAbsenceDays === 'function') 
                ? getStudentMonthAbsenceDays(studentId, new Date().getMonth() + 1) 
                : 1;

            // Semáforo preventivo de ausencias de 3 niveles:
            // 1 falta = Verde (caso aislado), 2 faltas = Ámbar (preventivo), 3+ faltas = Rojo (alerta temprana / citación recomendada)
            let absenceTrafficLightBadge = '';
            if (monthAbsences >= 3) {
                absenceTrafficLightBadge = `<div style="font-size:0.72rem; color:#b91c1c; font-weight:800; margin-top:3px; background:#fee2e2; border:1px solid #fecaca; border-radius:4px; padding:2px 6px; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-circle-exclamation"></i> ${monthAbsences} faltas este mes (Alerta)</div>`;
            } else if (monthAbsences === 2) {
                absenceTrafficLightBadge = `<div style="font-size:0.72rem; color:#b45309; font-weight:800; margin-top:3px; background:#fef3c7; border:1px solid #fde68a; border-radius:4px; padding:2px 6px; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-triangle-exclamation"></i> 2 faltas este mes (Preventivo)</div>`;
            } else {
                absenceTrafficLightBadge = `<div style="font-size:0.72rem; color:#15803d; font-weight:700; margin-top:3px; background:#dcfce7; border:1px solid #bbf7d0; border-radius:4px; padding:2px 6px; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-check"></i> 1 falta este mes (Normal)</div>`;
            }

            const safeNameJs = String(studentName).replace(/'/g, "\\'");
            const safeGradeJs = String(gradeLabel).replace(/'/g, "\\'");

            return `
            <tr class="aux-absence-row" data-grade="${item.gradeCode || ''}" data-text="${(studentName + ' ' + carne + ' ' + teacherName + ' ' + courseName).toLowerCase()}">
                <td style="padding:10px 12px; vertical-align:middle;">
                    <div style="display:flex; align-items:center; gap:9px;">
                        <div style="width:34px; height:34px; border-radius:50%; background:#fee2e2; color:#dc2626; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; flex-shrink:0;">
                            ${studentName.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <strong style="color:#0f172a; cursor:pointer;" onclick="openStudent360Drawer('${studentId}')" title="Abrir Ficha 360°">
                                ${studentName} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem; color:#0284c7; margin-left:2px;"></i>
                            </strong>
                            <div style="font-size:0.75rem; color:#64748b;">Carné: <strong>${carne}</strong></div>
                        </div>
                    </div>
                </td>
                <td style="padding:10px 12px; vertical-align:middle;">
                    <span class="badge" style="background:#f1f5f9; color:#334155; font-weight:700; border:1px solid #cbd5e1;">${gradeLabel}</span>
                    ${absenceTrafficLightBadge}
                </td>
                <td style="padding:10px 12px; vertical-align:middle;">
                    <div style="font-weight:700; color:#1e293b;">${courseName}</div>
                    <div style="font-size:0.75rem; color:#64748b;">
                        <i class="fa-solid fa-chalkboard-user"></i> ${teacherName} &bull; 
                        <i class="fa-regular fa-clock"></i> ${time}
                    </div>
                </td>
                <td style="padding:10px 12px; vertical-align:middle;">
                    <div style="font-size:0.82rem; color:#1e293b; font-weight:600;">${guardianName}</div>
                    ${cleanPhone ? `
                        <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                            <a href="tel:${cleanPhone}" class="btn btn-xs btn-outline-secondary" style="font-size:0.75rem; padding:2px 6px; text-decoration:none;" title="Llamar a Encargado">
                                <i class="fa-solid fa-phone" style="color:#0284c7;"></i> ${cleanPhone}
                            </a>
                            <button type="button" class="btn btn-xs btn-outline-success" onclick="if(typeof openWhatsAppPrompt==='function') openWhatsAppPrompt('${safeNameJs}', '${cleanPhone}', '${safeGradeJs}', ${monthAbsences}); else window.open('https://wa.me/502${cleanPhone}', '_blank');" style="font-size:0.75rem; padding:2px 6px; color:#16a34a; border-color:#86efac; font-weight:600;" title="Enviar WhatsApp a Encargado">
                                <i class="fa-brands fa-whatsapp"></i> WhatsApp
                            </button>
                        </div>
                    ` : `<span style="font-size:0.75rem; color:#94a3b8; font-style:italic;">Sin teléfono registrado</span>`}
                </td>
                <td style="padding:10px 12px; text-align:center; vertical-align:middle;">
                    ${statusBadge}
                    ${item.notes ? `<div style="font-size:0.72rem; color:#64748b; margin-top:3px; max-width:140px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${item.notes}">${item.notes}</div>` : ''}
                </td>
                <td style="padding:10px 12px; text-align:center; vertical-align:middle; white-space:nowrap;">
                    <div style="display:inline-flex; gap:4px; align-items:center;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="if(typeof openAuxiliaturaJustifyModal==='function') openAuxiliaturaJustifyModal('${alertId}'); else openCreatePermissionModal('${studentId}');" style="font-size:0.78rem; font-weight:700; padding:4px 8px; background:#0284c7; border-color:#0284c7;" title="Justificar o Dictaminar Ausencia">
                            <i class="fa-solid fa-shield-check"></i> Atender
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="if(typeof openStudentAnnotationModalForAlert==='function') openStudentAnnotationModalForAlert('${alertId}'); else if(typeof openStudentAnnotationModal==='function') openStudentAnnotationModal('${studentId}');" style="font-size:0.78rem; padding:4px 8px;" title="Registrar Anotación en Bitácora">
                            <i class="fa-solid fa-pen-clip"></i> Anotar
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-info" onclick="openStudent360Drawer('${studentId}')" style="font-size:0.78rem; padding:4px 8px;" title="Ver Ficha 360°">
                            <i class="fa-solid fa-folder-open"></i> Ficha
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
    window.renderAuxAbsenceRowsHtml = renderAuxAbsenceRowsHtml;

    function filterAuxAbsencesTable() {
        const q = (document.getElementById('auxAbsenceFilterInput')?.value || '').toLowerCase().trim();
        const g = document.getElementById('auxAbsenceGradeFilter')?.value || 'ALL';
        const rows = document.querySelectorAll('.aux-absence-row');

        rows.forEach(r => {
            const text = r.getAttribute('data-text') || '';
            const grade = r.getAttribute('data-grade') || '';
            const matchText = !q || text.includes(q);
            const matchGrade = (g === 'ALL') || (grade === g);
            if (matchText && matchGrade) {
                r.style.display = '';
            } else {
                r.style.display = 'none';
            }
        });
    }
    window.filterAuxAbsencesTable = filterAuxAbsencesTable;

    // Pestaña: Bandeja de Casos y Pendientes
    function renderAuxPendingTab(container) {
        const disciplineReports = window.STATE ? (window.STATE.disciplineReports || window.STATE.discipline || []) : [];
        const pending = disciplineReports.filter(d => d.status !== 'Resuelto');

        if (pending.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:35px; color:#64748b;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.4rem; color:#16a34a; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1.05rem;">¡Bandeja al día! No hay incidencias disciplinarias pendientes.</strong>
                    <p style="margin:4px 0 0 0; font-size:0.85rem;">Todas las llamadas de atención han sido dictaminadas y resueltas.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <strong style="color:#0f172a; font-size:0.95rem;">
                    <i class="fa-solid fa-clock" style="color:#ea580c; margin-right:6px;"></i> Casos en Espera de Resolución (${pending.length})
                </strong>
                <span style="font-size:0.75rem; color:#64748b;">Auxiliares y Secretaría pueden dictaminar y cerrar casos</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${pending.map(d => {
                    const student = (window.STATE?.students || []).find(s => s.id === d.studentId);
                    return `
                    <div style="border:1px solid #fed7aa; background:#fffaf0; border-radius:10px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div style="flex:1; min-width:240px;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                                <span class="aux-chip aux-chip-red">${d.severity || 'Leve'}</span>
                                <strong style="color:#0f172a; font-size:0.92rem; cursor:pointer;" onclick="openStudent360Drawer('${d.studentId}')" title="Abrir Ficha 360°">
                                    ${d.studentName || 'Estudiante'} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem; color:#0284c7;"></i>
                                </strong>
                                <span style="font-size:0.8rem; color:#64748b;">(${d.grade || 'Sección'})</span>
                            </div>
                            <div style="font-size:0.85rem; color:#334155; margin-bottom:4px;">
                                <strong>Motivo:</strong> ${d.reason || 'Sin motivo detallado'}
                            </div>
                            <div style="font-size:0.75rem; color:#64748b;">
                                <span><i class="fa-solid fa-user-tie"></i> Reportó: <strong>${d.teacher || 'Catedrático'}</strong></span> &bull; 
                                <span><i class="fa-regular fa-clock"></i> Fecha: ${d.date || 'Reciente'}</span>
                            </div>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button type="button" class="btn btn-sm btn-primary" onclick="openDisciplineResolutionModal('${d.id}')" style="font-weight:700; font-size:0.8rem; padding:6px 12px; background:#0284c7; border-color:#0284c7;">
                                <i class="fa-solid fa-gavel"></i> Dictaminar / Resolver
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openStudent360Drawer('${d.studentId}')" style="font-size:0.8rem; padding:6px 10px;" title="Ver expediente">
                                <i class="fa-solid fa-folder-open"></i> Ficha 360°
                            </button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Pestaña: Monitoreo en Vivo por Secciones
    function renderAuxSectionsTab(container) {
        const grades = window.STATE ? (window.STATE.gradesList || []) : [];
        const students = window.STATE ? (window.STATE.students || []) : [];
        const disciplineReports = window.STATE ? (window.STATE.disciplineReports || window.STATE.discipline || []) : [];

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
                ${grades.map(g => {
                    const secStudents = students.filter(s => (s.gradeCode === g.code || s.gradeCode === g.name || `${s.grade} (${s.section})` === `${g.name} (${g.section})`) && s.status !== 'Retirado');
                    const secIssues = disciplineReports.filter(d => (d.grade && d.grade.includes(g.section) && d.grade.includes(g.name.substring(0,3))) && d.status !== 'Resuelto');

                    return `
                    <div style="border:1px solid #e2e8f0; border-radius:10px; padding:14px; background:#ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong style="color:#0f172a; font-size:0.95rem;">${g.name} (${g.section})</strong>
                            <span class="badge" style="background:#0284c7; color:#fff; font-weight:800; font-size:0.75rem;">${g.code}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:#64748b; margin-bottom:10px;">
                            <span><i class="fa-solid fa-users"></i> ${secStudents.length} alumnos</span>
                            <span style="${secIssues.length > 0 ? 'color:#ea580c; font-weight:700;' : 'color:#16a34a;'}">
                                <i class="fa-solid fa-triangle-exclamation"></i> ${secIssues.length} casos pendientes
                            </span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="filterAuxByGradeCode('${g.code}')" style="flex:1; font-size:0.78rem; font-weight:700;">
                                <i class="fa-solid fa-list-check"></i> Ver Alumnos
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printSectionAttendanceSheet('${g.code}')" style="font-size:0.78rem;" title="Imprimir lista">
                                <i class="fa-solid fa-print"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Pestaña: Disciplina y Actas
    function renderAuxDisciplineTab(container) {
        const disciplineReports = window.STATE ? (window.STATE.disciplineReports || window.STATE.discipline || []) : [];
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <strong style="color:#0f172a;">Registro General de Incidencias Disciplinarias (${disciplineReports.length})</strong>
                <button type="button" class="btn btn-sm btn-primary" onclick="openDisciplineModal()" style="font-weight:700;">
                    <i class="fa-solid fa-plus"></i> Nueva Llamada de Atención
                </button>
            </div>
            <div class="table-responsive">
                <table class="custom-table" style="font-size:0.85rem;">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estudiante y Grado</th>
                            <th>Docente</th>
                            <th>Gravedad</th>
                            <th>Motivo y Resolución</th>
                            <th style="text-align:center;">Estado</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${disciplineReports.map(d => {
                            const isResolved = d.status === 'Resuelto';
                            return `
                            <tr>
                                <td>${d.date || '—'}</td>
                                <td>
                                    <strong style="cursor:pointer; color:#0284c7;" onclick="openStudent360Drawer('${d.studentId}')">
                                        ${d.studentName || 'Estudiante'}
                                    </strong><br>
                                    <small style="color:#64748b;">${d.grade || ''}</small>
                                </td>
                                <td>${d.teacher || 'Docente'}</td>
                                <td><span class="aux-chip ${d.severity === 'Grave' ? 'aux-chip-orange' : (d.severity === 'Muy Grave' ? 'aux-chip-red' : 'aux-chip-blue')}">${d.severity || 'Leve'}</span></td>
                                <td>
                                    <div>${d.reason || ''}</div>
                                    ${d.resolution ? `
                                        <div style="font-size:0.78rem; color:#166534; background:#dcfce7; border-left:3px solid #16a34a; padding:3px 6px; margin-top:4px; border-radius:2px;">
                                            <strong>Resuelto por:</strong> ${d.resolvedBy || 'Auxiliatura'}: "${d.resolution}"
                                        </div>
                                    ` : ''}
                                </td>
                                <td style="text-align:center;">
                                    <span class="badge ${isResolved ? 'badge-success' : 'badge-warning'}">${d.status || 'Pendiente'}</span>
                                </td>
                                <td style="text-align:center; white-space:nowrap;">
                                    <button type="button" class="btn btn-sm btn-outline-info" onclick="openDisciplineResolutionModal('${d.id}')" title="Ver / Dictaminar">
                                        <i class="fa-solid ${isResolved ? 'fa-eye' : 'fa-gavel'}"></i>
                                    </button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Pestaña: Permisos e Inasistencias
    function renderAuxPermissionsTab(container) {
        const studentPermissions = window.STATE ? (window.STATE.studentPermissions || []) : [];
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <strong style="color:#0f172a;">Historial Oficial de Permisos y Justificaciones (${studentPermissions.length})</strong>
                <button type="button" class="btn btn-sm btn-primary" onclick="openCreatePermissionModal()" style="font-weight:700;">
                    <i class="fa-solid fa-plus"></i> Emitir Nuevo Permiso
                </button>
            </div>
            <div class="table-responsive">
                <table class="custom-table" style="font-size:0.85rem;">
                    <thead>
                        <tr>
                            <th>Estudiante y Grado</th>
                            <th>Vigencia</th>
                            <th>Categoría</th>
                            <th>Motivo Detallado</th>
                            <th>Autorizado Por</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentPermissions.map(p => `
                        <tr>
                            <td>
                                <strong style="cursor:pointer; color:#0284c7;" onclick="openStudent360Drawer('${p.studentId}')">
                                    ${p.studentName || 'Estudiante'}
                                </strong><br>
                                <small style="color:#64748b;">${p.grade || p.gradeCode || ''}</small>
                            </td>
                            <td><strong>${p.startDate || '—'}</strong> al <strong>${p.endDate || p.startDate || '—'}</strong></td>
                            <td><span class="aux-chip aux-chip-blue">${p.reasonCategory || 'Permiso'}</span></td>
                            <td style="max-width:240px; word-break:break-word;">${p.reasonDetail || '—'}</td>
                            <td>
                                <strong style="color:#0369a1;"><i class="fa-solid fa-user-check"></i> ${p.authorizedBy || 'Auxiliatura / Secretaría'}</strong>
                                ${p.docRef ? `<br><small style="color:#64748b;">Ref: ${p.docRef}</small>` : ''}
                            </td>
                            <td style="text-align:center;">
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="openEditStudentPermissionModal('${p.id}')" title="Editar / Ver">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 4. Búsqueda instantánea de estudiantes
    function handleAuxStudentSearch(query) {
        const box = document.getElementById('auxSearchResultsBox');
        if (!box) return;
        const q = String(query || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (!q) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }

        const students = window.STATE ? (window.STATE.students || []) : [];
        const matches = students.filter(s => {
            const raw = `${s.name || ''} ${s.carne || ''} ${s.personalCode || ''} ${s.grade || ''} ${s.section || ''} ${s.gradeCode || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return raw.includes(q);
        }).slice(0, 15);

        if (matches.length === 0) {
            box.style.display = 'block';
            box.innerHTML = `<div style="text-align:center; padding:12px; color:#64748b; font-size:0.85rem;">No se encontraron estudiantes que coincidan con "${escapeHtml(query)}".</div>`;
            return;
        }

        box.style.display = 'block';
        box.innerHTML = `
            <div style="font-size:0.75rem; color:#64748b; font-weight:700; margin-bottom:6px; padding:0 4px;">
                Resultados encontrados (${matches.length}) — Haga clic en un estudiante para abrir su Ficha 360°:
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
                ${matches.map(s => `
                    <div onclick="openStudent360Drawer('${s.id}')" 
                        style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.15s;"
                        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#ffffff'">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#e0f2fe; color:#0369a1; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem;">
                                ${(s.firstName || s.name || 'E').substring(0,1)}
                            </div>
                            <div>
                                <strong style="color:#0f172a; font-size:0.88rem;">${s.name || 'Estudiante'}</strong>
                                <div style="font-size:0.75rem; color:#64748b;">
                                    <span>Carné: <strong>${s.carne || s.personalCode || '—'}</strong></span> &bull; 
                                    <span>${s.grade || s.gradeCode || ''} (${s.section || 'A'})</span>
                                </div>
                            </div>
                        </div>
                        <span class="badge ${s.status === 'Retirado' ? 'badge-danger' : 'badge-success'}" style="font-size:0.72rem;">
                            ${s.status || 'Activo'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    window.handleAuxStudentSearch = handleAuxStudentSearch;

    // 5. FICHA 360° DEL ESTUDIANTE (MODAL / DRAWER LATERAL)
    function openStudent360Drawer(studentId) {
        injectAuxiliaturaStyles();
        const students = window.STATE ? (window.STATE.students || []) : [];
        const student = students.find(s => s.id === studentId || s.personalCode === studentId);
        if (!student) {
            if (window.showToast) window.showToast('Estudiante no encontrado.', 'warning');
            return;
        }

        // Remover drawer previo si existiera
        const existing = document.getElementById('auxStudent360Drawer');
        if (existing) existing.remove();

        const discipline = (window.STATE?.disciplineReports || window.STATE?.discipline || []).filter(d => d.studentId === student.id);
        const permissions = (window.STATE?.studentPermissions || []).filter(p => p.studentId === student.id || p.personalCode === student.personalCode);
        const academicExceptions = student.academicExceptions || [];

        // Teléfono del tutor / encargado para WhatsApp
        const tutorPhone = student.tutorPhone || student.guardianPhone || student.encargadoPhone || student.phone || '';
        const cleanPhone = String(tutorPhone).replace(/\D/g, '');
        const waLink = cleanPhone ? `https://wa.me/502${cleanPhone}?text=Estimado(a)%20padre/madre%20de%20familia%20de%20${encodeURIComponent(student.name)}:%20Le%20saludamos%20de%20Auxiliatura/Secretar%C3%ADa%20ENCCO%20Jutiapa.` : '';

        const monthAbsences = (typeof getStudentMonthAbsenceDays === 'function') 
            ? getStudentMonthAbsenceDays(student.id, new Date().getMonth() + 1) 
            : 0;

        let stu360AbsenceBadge = '';
        if (monthAbsences >= 3) {
            stu360AbsenceBadge = `<span style="font-size:0.75rem; background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:4px; padding:2px 7px; font-weight:800; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-circle-exclamation"></i> ${monthAbsences} faltas (Alerta Temprana)</span>`;
        } else if (monthAbsences === 2) {
            stu360AbsenceBadge = `<span style="font-size:0.75rem; background:#fef3c7; color:#b45309; border:1px solid #fde68a; border-radius:4px; padding:2px 7px; font-weight:800; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-triangle-exclamation"></i> 2 faltas (Preventivo)</span>`;
        } else if (monthAbsences === 1) {
            stu360AbsenceBadge = `<span style="font-size:0.75rem; background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; border-radius:4px; padding:2px 7px; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-check"></i> 1 falta este mes</span>`;
        } else {
            stu360AbsenceBadge = `<span style="font-size:0.75rem; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; border-radius:4px; padding:2px 7px; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-circle-check"></i> Asistencia Perfecta</span>`;
        }

        const drawer = document.createElement('div');
        drawer.id = 'auxStudent360Drawer';
        drawer.className = 'aux-drawer-overlay';
        drawer.onclick = function (e) {
            if (e.target === drawer) closeStudent360Drawer();
        };

        drawer.innerHTML = `
            <div class="aux-drawer-content" onclick="event.stopPropagation()">
                <!-- HEADER DE LA FICHA -->
                <div style="background:#0f172a; color:#ffffff; padding:18px 20px; display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:48px; height:48px; border-radius:50%; background:#0284c7; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:800; border:2px solid #38bdf8;">
                            ${(student.firstName || student.name || 'E').substring(0,1)}
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#f8fafc;">${student.name}</h3>
                            <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                <span>Carné: <strong style="color:#38bdf8;">${student.carne || '—'}</strong></span> &bull; 
                                <span>Código: <strong>${student.personalCode || '—'}</strong></span> &bull; 
                                <span>${student.grade || student.gradeCode} (${student.section || 'A'})</span>
                                ${stu360AbsenceBadge}
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="closeStudent360Drawer()" style="background:none; border:none; color:#cbd5e1; font-size:1.4rem; cursor:pointer;" title="Cerrar Ficha 360°">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- SUB-BARRA DE CONTACTO RÁPIDO CON PADRES -->
                <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                    <div>
                        <span style="color:#64748b;">Encargado(a):</span> <strong>${student.tutorName || student.guardianName || 'Padre de Familia'}</strong>
                        ${tutorPhone ? `<span style="color:#0284c7; margin-left:6px;"><i class="fa-solid fa-phone"></i> ${tutorPhone}</span>` : '<span style="color:#94a3b8; margin-left:6px;">(Sin teléfono)</span>'}
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${waLink ? `
                            <a href="${waLink}" target="_blank" class="btn btn-sm btn-success" style="font-weight:700; padding:3px 10px; font-size:0.78rem; display:flex; align-items:center; gap:5px; text-decoration:none;">
                                <i class="fa-brands fa-whatsapp"></i> WhatsApp
                            </a>
                        ` : ''}
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printStudentFullFile('${student.id}')" style="font-weight:700; padding:3px 10px; font-size:0.78rem;">
                            <i class="fa-solid fa-print"></i> Expediente
                        </button>
                    </div>
                </div>

                <!-- PESTAÑAS DE LA FICHA 360° -->
                <div style="display:flex; border-bottom:1px solid #e2e8f0; background:#ffffff; overflow-x:auto; padding:0 10px;">
                    <button type="button" class="aux-tab-btn active" id="stu360TabBtn-summary" onclick="switchStudent360Tab('summary', '${student.id}')">
                        <i class="fa-solid fa-chart-pie"></i> Resumen
                    </button>
                    <button type="button" class="aux-tab-btn" id="stu360TabBtn-discipline" onclick="switchStudent360Tab('discipline', '${student.id}')">
                        <i class="fa-solid fa-scale-balanced"></i> Disciplina (${discipline.length})
                    </button>
                    <button type="button" class="aux-tab-btn" id="stu360TabBtn-permissions" onclick="switchStudent360Tab('permissions', '${student.id}')">
                        <i class="fa-solid fa-clipboard-list"></i> Permisos (${permissions.length})
                    </button>
                    <button type="button" class="aux-tab-btn" id="stu360TabBtn-exceptions" onclick="switchStudent360Tab('exceptions', '${student.id}')">
                        <i class="fa-solid fa-file-shield"></i> Exoneraciones (${academicExceptions.length})
                    </button>
                </div>

                <!-- CONTENEDOR DINÁMICO DE PESTAÑAS 360° -->
                <div id="stu360TabContent" style="padding:20px; flex:1; overflow-y:auto;">
                    <!-- Se inyecta abajo -->
                </div>

                <!-- FOOTER DE ACCIONES RÁPIDAS PARA ESTE ESTUDIANTE -->
                <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0;">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="openDisciplineModalForStudent('${student.id}')" style="font-weight:700;">
                        <i class="fa-solid fa-triangle-exclamation"></i> + Anotación
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="openCreatePermissionModal('${student.id}')" style="font-weight:700;">
                        <i class="fa-solid fa-clipboard-check"></i> + Justificar / Permiso
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-warning" onclick="openParentCitationModal('${student.id}')" style="font-weight:700; color:#b45309; border-color:#f59e0b;">
                        <i class="fa-solid fa-envelope-open-text"></i> Citar Encargado
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);
        switchStudent360Tab('summary', student.id);
    }
    window.openStudent360Drawer = openStudent360Drawer;

    function closeStudent360Drawer() {
        const drawer = document.getElementById('auxStudent360Drawer');
        if (drawer) drawer.remove();
    }
    window.closeStudent360Drawer = closeStudent360Drawer;

    // Pestañas internas de la Ficha 360°
    function switchStudent360Tab(tabKey, studentId) {
        document.querySelectorAll('.aux-drawer-content .aux-tab-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`stu360TabBtn-${tabKey}`);
        if (btn) btn.classList.add('active');

        const content = document.getElementById('stu360TabContent');
        if (!content) return;

        const student = (window.STATE?.students || []).find(s => s.id === studentId);
        if (!student) return;

        if (tabKey === 'summary') {
            const discipline = (window.STATE?.disciplineReports || window.STATE?.discipline || []).filter(d => d.studentId === student.id);
            const permissions = (window.STATE?.studentPermissions || []).filter(p => p.studentId === student.id);
            const pendingDisc = discipline.filter(d => d.status !== 'Resuelto');

            content.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:18px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
                        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Anotaciones</span>
                        <h4 style="margin:4px 0 0 0; color:#dc2626; font-size:1.3rem;">${discipline.length}</h4>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
                        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Casos Pendientes</span>
                        <h4 style="margin:4px 0 0 0; color:#ea580c; font-size:1.3rem;">${pendingDisc.length}</h4>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
                        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">Permisos Oficiales</span>
                        <h4 style="margin:4px 0 0 0; color:#0284c7; font-size:1.3rem;">${permissions.length}</h4>
                    </div>
                </div>

                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:14px;">
                    <strong style="font-size:0.9rem; color:#0f172a; display:block; margin-bottom:8px;">
                        <i class="fa-solid fa-address-card" style="color:#0284c7;"></i> Datos Generales de Matrícula
                    </strong>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.83rem;">
                        <div><span style="color:#64748b;">CUI:</span> <strong>${student.cui || '—'}</strong></div>
                        <div><span style="color:#64748b;">Código Personal:</span> <strong>${student.personalCode || '—'}</strong></div>
                        <div><span style="color:#64748b;">No. de Carné:</span> <strong>${student.carne || '—'}</strong></div>
                        <div><span style="color:#64748b;">Carrera:</span> <strong>${student.career || 'Perito Contador'}</strong></div>
                        <div><span style="color:#64748b;">Grado y Sección:</span> <strong>${student.grade || student.gradeCode} (${student.section || 'A'})</strong></div>
                        <div><span style="color:#64748b;">Estado:</span> <span class="badge ${student.status === 'Retirado' ? 'badge-danger' : 'badge-success'}">${student.status || 'Activo'}</span></div>
                    </div>
                </div>
            `;
        } else if (tabKey === 'discipline') {
            const discipline = (window.STATE?.disciplineReports || window.STATE?.discipline || []).filter(d => d.studentId === student.id);
            if (discipline.length === 0) {
                content.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">El estudiante no tiene ninguna anotación disciplinaria registrada.</div>`;
                return;
            }
            content.innerHTML = discipline.map(d => `
                <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px; background:#fcfcfd;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span class="aux-chip ${d.severity === 'Grave' ? 'aux-chip-orange' : (d.severity === 'Muy Grave' ? 'aux-chip-red' : 'aux-chip-blue')}">${d.severity || 'Leve'}</span>
                        <span style="font-size:0.75rem; color:#64748b;">${d.date || '—'}</span>
                    </div>
                    <div style="font-weight:700; color:#1e293b; font-size:0.88rem; margin-bottom:4px;">${d.reason}</div>
                    ${d.resolution ? `
                        <div style="font-size:0.8rem; color:#166534; background:#dcfce7; border-left:3px solid #16a34a; padding:4px 8px; border-radius:3px; margin-top:4px;">
                            <strong>Resolución por ${d.resolvedBy || 'Auxiliatura'}:</strong> ${d.resolution}
                        </div>
                    ` : `<div style="font-size:0.78rem; color:#ea580c; font-style:italic;">En espera de dictamen</div>`}
                    <div style="font-size:0.75rem; color:#64748b; margin-top:6px; border-top:1px dashed #e2e8f0; padding-top:4px;">
                        Reportado por: <strong>${d.teacher || 'Docente'}</strong>
                    </div>
                </div>
            `).join('');
        } else if (tabKey === 'permissions') {
            const permissions = (window.STATE?.studentPermissions || []).filter(p => p.studentId === student.id || p.personalCode === student.personalCode);
            if (permissions.length === 0) {
                content.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">No hay permisos de ausencia emitidos para este estudiante.</div>`;
                return;
            }
            content.innerHTML = permissions.map(p => `
                <div style="border:1px solid #bfdbfe; background:#eff6ff; border-radius:8px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span class="aux-chip aux-chip-blue">${p.reasonCategory || 'Permiso'}</span>
                        <span style="font-size:0.75rem; font-weight:700; color:#1d4ed8;">${p.startDate} al ${p.endDate || p.startDate}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#1e293b; margin-bottom:4px;">${p.reasonDetail}</div>
                    <div style="font-size:0.75rem; color:#0369a1; border-top:1px dashed #bfdbfe; padding-top:4px; margin-top:4px;">
                        <strong>Autorizado por:</strong> ${p.authorizedBy || 'Auxiliatura / Secretaría'} ${p.docRef ? `&bull; Ref: ${p.docRef}` : ''}
                    </div>
                </div>
            `).join('');
        } else if (tabKey === 'exceptions') {
            const exceptions = student.academicExceptions || [];
            if (exceptions.length === 0) {
                content.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">No hay exoneraciones académicas registradas.</div>`;
                return;
            }
            content.innerHTML = exceptions.map(e => `
                <div style="border:1px solid #e9d5ff; background:#faf5ff; border-radius:8px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <strong style="color:#7e22ce;">Exoneración: ${e.subject || 'Todas las materias'}</strong>
                        <span style="font-size:0.75rem; color:#64748b;">Bimestre ${e.bimestre || 'Todos'}</span>
                    </div>
                    <div style="font-size:0.83rem; color:#334155;">Motivo: ${e.reason || 'Consideración especial'}</div>
                    <div style="font-size:0.75rem; color:#7e22ce; margin-top:4px;">Autorizado por: ${e.authorizedBy || 'Secretaría / Dirección'}</div>
                </div>
            `).join('');
        }
    }
    window.switchStudent360Tab = switchStudent360Tab;

    // 6. ACCIÓN RÁPIDA (MODAL MULTIUSO EN 3 CLICS)
    function openQuickAuxiliaturaActionModal(preselectedStudentId = null) {
        injectAuxiliaturaStyles();
        const existing = document.getElementById('auxQuickActionModal');
        if (existing) existing.remove();

        const students = window.STATE ? (window.STATE.students || []) : [];
        const role = (window.STATE && window.STATE.currentRole) || 'profesor_auxiliar';
        const defaultAuthor = window.STATE?.currentUser?.name || (role === 'secretaria' ? 'Secretaría Académica' : 'Profesor Auxiliar');

        const modal = document.createElement('div');
        modal.id = 'auxQuickActionModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(3px); z-index:100000; display:flex; justify-content:center; align-items:center; padding:15px;';
        modal.onclick = function (e) {
            if (e.target === modal) closeQuickAuxiliaturaActionModal();
        };

        modal.innerHTML = `
            <div style="background:#ffffff; border-radius:12px; width:100%; max-width:540px; box-shadow:0 20px 40px rgba(0,0,0,0.3); overflow:hidden; border:1px solid #cbd5e1;">
                <div style="background:linear-gradient(135deg, #0f172a, #0284c7); color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.05rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-bolt" style="color:#38bdf8;"></i> Registro de Acción Rápida
                    </h3>
                    <button type="button" onclick="closeQuickAuxiliaturaActionModal()" style="background:none; border:none; color:#fff; font-size:1.3rem; cursor:pointer;">&times;</button>
                </div>
                <form id="auxQuickActionForm" onsubmit="submitQuickAuxAction(event)" style="padding:18px;">
                    <!-- 1. Tipo de Acción -->
                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">1. ¿Qué desea registrar?</label>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <label style="border:1.5px solid #cbd5e1; border-radius:8px; padding:8px 10px; display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem; font-weight:700;">
                                <input type="radio" name="quickActionType" value="anotacion" checked onchange="onQuickActionTypeChanged(this.value)">
                                <span><i class="fa-solid fa-triangle-exclamation" style="color:#ea580c;"></i> Anotación</span>
                            </label>
                            <label style="border:1.5px solid #cbd5e1; border-radius:8px; padding:8px 10px; display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem; font-weight:700;">
                                <input type="radio" name="quickActionType" value="permiso" onchange="onQuickActionTypeChanged(this.value)">
                                <span><i class="fa-solid fa-clipboard-check" style="color:#0284c7;"></i> Permiso / Justif.</span>
                            </label>
                        </div>
                    </div>

                    <!-- 2. Selección de Estudiante -->
                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">2. Estudiante:</label>
                        <select id="quickActionStudentSelect" required style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; background:#fff;">
                            <option value="">-- Seleccionar Estudiante --</option>
                            ${students.map(s => `
                                <option value="${s.id}" ${s.id === preselectedStudentId ? 'selected' : ''}>
                                    ${s.name} (${s.gradeCode || s.grade} ${s.section || ''})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- 3. Plantillas Predefinidas / Motivos -->
                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">3. Motivo o Plantilla Rápida:</label>
                        <div id="quickReasonChipsContainer" style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px;">
                            <!-- Inyectado dinámicamente -->
                        </div>
                        <input type="text" id="quickActionReasonDetail" required placeholder="Detalle específico del motivo..." style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; box-sizing:border-box;">
                    </div>

                    <!-- 4. Autorizado / Registrado Por -->
                    <div style="margin-bottom:16px;">
                        <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">4. Autorizado / Registrado Por:</label>
                        <input type="text" id="quickActionAuthorizedBy" value="${defaultAuthor}" required style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; box-sizing:border-box; background:#f8fafc;">
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button type="button" class="btn btn-secondary" onclick="closeQuickAuxiliaturaActionModal()" style="font-weight:700;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="font-weight:700; padding:8px 18px; background:#0284c7; border-color:#0284c7;">
                            <i class="fa-solid fa-floppy-disk"></i> Guardar Registro
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        onQuickActionTypeChanged('anotacion');
    }
    window.openQuickAuxiliaturaActionModal = openQuickAuxiliaturaActionModal;

    function closeQuickAuxiliaturaActionModal() {
        const modal = document.getElementById('auxQuickActionModal');
        if (modal) modal.remove();
    }
    window.closeQuickAuxiliaturaActionModal = closeQuickAuxiliaturaActionModal;

    function onQuickActionTypeChanged(type) {
        const container = document.getElementById('quickReasonChipsContainer');
        const input = document.getElementById('quickActionReasonDetail');
        if (!container) return;

        let chips = [];
        if (type === 'anotacion') {
            chips = [
                'Uniforme incompleto',
                'Uso indebido de celular en clase',
                'Falta de respeto en el aula',
                'Inasistencia injustificada',
                'Tardanza al aula',
                'Excelente conducta y colaboración'
            ];
        } else {
            chips = [
                'Cita médica / Tratamiento de salud',
                'Asunto familiar justificado',
                'Trámite de DPI / RENAP',
                'Actividad oficial escolar',
                'Pase de salida por quebranto de salud'
            ];
        }

        container.innerHTML = chips.map(c => `
            <button type="button" onclick="document.getElementById('quickActionReasonDetail').value='${c}';" 
                style="padding:3px 8px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:6px; font-size:0.75rem; cursor:pointer;">
                ${c}
            </button>
        `).join('');

        if (input) input.value = chips[0] || '';
    }
    window.onQuickActionTypeChanged = onQuickActionTypeChanged;

    async function submitQuickAuxAction(e) {
        if (e) e.preventDefault();
        const typeEl = document.querySelector('input[name="quickActionType"]:checked');
        const type = typeEl ? typeEl.value : 'anotacion';
        const studentId = document.getElementById('quickActionStudentSelect')?.value;
        const reason = document.getElementById('quickActionReasonDetail')?.value?.trim();
        const author = document.getElementById('quickActionAuthorizedBy')?.value?.trim() || 'Auxiliatura / Secretaría';

        if (!studentId || !reason) {
            if (window.showToast) window.showToast('Complete el estudiante y motivo.', 'warning');
            return;
        }

        const student = (window.STATE?.students || []).find(s => s.id === studentId);
        if (!student) return;

        const todayIso = new Date().toISOString().split('T')[0];

        if (type === 'anotacion') {
            if (!Array.isArray(window.STATE.disciplineReports)) window.STATE.disciplineReports = [];
            const newRep = {
                id: 'rep-disc-' + Date.now(),
                studentId: student.id,
                studentName: student.name,
                grade: `${student.grade || student.gradeCode} (${student.section || 'A'})`,
                teacher: author,
                date: todayIso,
                severity: reason.toLowerCase().includes('respeto') ? 'Grave' : 'Leve',
                reason: reason,
                status: 'Pendiente',
                actionType: 'Registrado desde Centro de Control',
                resolution: '',
                resolvedBy: '',
                resolutionDate: ''
            };
            window.STATE.disciplineReports.unshift(newRep);

            if (typeof window.EnccoCloudSync !== 'undefined' && window.EnccoCloudSync.syncNode) {
                window.EnccoCloudSync.syncNode('disciplineReports', window.STATE.disciplineReports);
            }
            if (window.saveStateToLocalStorage) window.saveStateToLocalStorage();
            if (window.showToast) window.showToast(`Anotación registrada a ${student.name}.`, 'success');
        } else {
            // Permiso / Justificación
            if (!Array.isArray(window.STATE.studentPermissions)) window.STATE.studentPermissions = [];
            const newPerm = {
                id: 'perm-' + Date.now(),
                studentId: student.id,
                studentName: student.name,
                personalCode: student.personalCode || '',
                carne: student.carne || '',
                grade: student.grade || student.gradeCode,
                gradeCode: student.gradeCode,
                section: student.section || 'Sección A',
                startDate: todayIso,
                endDate: todayIso,
                reasonCategory: 'Permiso Oficial Autorizado',
                reasonDetail: reason,
                docRef: 'ENCCO-AUX-' + new Date().getFullYear(),
                authorizedBy: author,
                createdAt: new Date().toISOString(),
                status: 'autorizado'
            };
            window.STATE.studentPermissions.push(newPerm);

            if (typeof window.applyStudentPermission === 'function') {
                window.applyStudentPermission(newPerm);
            }
            if (typeof window.EnccoCloudSync !== 'undefined' && window.EnccoCloudSync.syncNode) {
                window.EnccoCloudSync.syncNode('studentPermissions', window.STATE.studentPermissions);
            }
            if (window.saveStateToLocalStorage) window.saveStateToLocalStorage();
            if (window.showToast) window.showToast(`Permiso autorizado y registrado a ${student.name}.`, 'success');
        }

        closeQuickAuxiliaturaActionModal();
        renderAuxiliaturaCenterView();
    }
    window.submitQuickAuxAction = submitQuickAuxAction;

    // 7. MODAL TRANSPARENTE DE JUSTIFICACIÓN PARA DOCENTES
    function showJustificationDetailModal(studentId, day, month) {
        const student = (window.STATE?.students || []).find(s => s.id === studentId);
        const stuName = student ? student.name : 'Estudiante';
        const gradeSec = student ? `${student.grade || student.gradeCode} (${student.section || 'A'})` : '';

        // Buscar en la metadata de permisos
        const perms = window.STATE?.studentPermissions || [];
        const found = perms.find(p => (p.studentId === studentId || p.personalCode === student?.personalCode));

        const author = found ? (found.authorizedBy || 'Auxiliatura General') : 'Auxiliatura General / Secretaría';
        const reason = found ? (found.reasonDetail || found.reasonCategory || 'Justificación oficial autorizada') : 'Inasistencia justificada por autoridad del establecimiento';
        const ref = found ? (found.docRef || 'Constancia en archivo') : 'Registro Institucional';

        const existing = document.getElementById('justificationDetailModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'justificationDetailModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(3px); z-index:100000; display:flex; justify-content:center; align-items:center; padding:15px;';
        modal.onclick = function (e) {
            if (e.target === modal) modal.remove();
        };

        modal.innerHTML = `
            <div style="background:#ffffff; border-radius:12px; width:100%; max-width:440px; box-shadow:0 20px 30px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #cbd5e1;">
                <div style="background:#0f172a; color:#fff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-lock" style="color:#f59e0b;"></i> Registro Oficial de Inasistencia Justificada
                    </strong>
                    <button type="button" onclick="document.getElementById('justificationDetailModal').remove()" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:16px; font-size:0.88rem;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:12px;">
                        <strong style="color:#0f172a; display:block;">${stuName}</strong>
                        <span style="font-size:0.78rem; color:#64748b;">${gradeSec} &bull; Día ${day} de asistencia</span>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700; display:block;">AUTORIZADO POR:</span>
                            <strong style="color:#0369a1; font-size:0.92rem;"><i class="fa-solid fa-user-check"></i> ${author}</strong>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700; display:block;">MOTIVO OFICIAL:</span>
                            <div style="color:#334155; background:#fff7ed; border-left:3px solid #ea580c; padding:6px 10px; border-radius:3px; font-size:0.83rem;">
                                ${reason}
                            </div>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700; display:block;">DOCUMENTO DE RESPALDO:</span>
                            <span style="color:#475569; font-family:monospace; font-size:0.8rem;">${ref}</span>
                        </div>
                    </div>

                    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:8px 10px; font-size:0.78rem; color:#047857;">
                        <i class="fa-solid fa-shield-halved"></i> <strong>Aviso para Catedráticos:</strong> Esta inasistencia fue revisada y autorizada por la autoridad del establecimiento. La celda se encuentra protegida contra alteraciones accidentales.
                    </div>
                </div>
                <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:10px 16px; text-align:right;">
                    <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('justificationDetailModal').remove()" style="font-weight:700;">
                        Entendido
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
    window.showJustificationDetailModal = showJustificationDetailModal;

    // 8. CITACIÓN OFICIAL A PADRES DE FAMILIA
    function openParentCitationModal(studentId) {
        const student = (window.STATE?.students || []).find(s => s.id === studentId);
        if (!student) return;

        const reason = prompt(`Ingrese el motivo de la citación para el encargado de ${student.name}:`, 'Seguimiento disciplinario y rendimiento académico');
        if (!reason) return;

        const dateStr = prompt('Fecha y hora de la cita (ej. Mañana a las 09:00 hrs):', 'Lunes próximo a las 08:30 hrs');
        if (!dateStr) return;

        printOfficialParentCitation(student, reason, dateStr);
    }
    window.openParentCitationModal = openParentCitationModal;

    function printOfficialParentCitation(student, reason, citaDate) {
        const todayStr = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const parentName = student.tutorName || student.guardianName || 'Padre, Madre o Encargado';

        const printHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Citación Oficial - ENCCO Jutiapa</title>
                <style>
                    @page { size: letter portrait; margin: 20mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #0f2b5c; padding-bottom: 12px; margin-bottom: 25px; }
                    .header h1 { font-size: 14pt; margin: 0; color: #0f2b5c; text-transform: uppercase; }
                    .header h2 { font-size: 11pt; margin: 4px 0; color: #059669; font-weight: 700; }
                    .citation-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 25px 0; }
                    .signatures { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; }
                    .sig-line { width: 40%; border-top: 1px solid #000; padding-top: 6px; font-size: 9.5pt; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Escuela Nacional de Ciencias Comerciales</h1>
                    <h2>Jornada Diurna — Jutiapa, Guatemala (Fundada en 1970)</h2>
                    <div style="font-size:10pt; font-weight:700; color:#475569; margin-top:6px;">CITACIÓN OFICIAL DE PADRES DE FAMILIA</div>
                </div>

                <div style="text-align:right; font-size:10pt; margin-bottom:20px;">
                    Jutiapa, ${todayStr}
                </div>

                <p>Señor(a): <strong>${parentName}</strong><br>
                Encargado(a) del alumno(a): <strong>${student.name}</strong><br>
                Grado y Sección: <strong>${student.grade || student.gradeCode} (${student.section || 'A'})</strong></p>

                <p>Por este medio se le solicita presentarse a las instalaciones de la Escuela Nacional de Ciencias Comerciales (Jornada Diurna) para tratar asuntos de suma importancia relacionados con su representado(a).</p>

                <div class="citation-box">
                    <strong>FECHA Y HORA DE PRESENTACIÓN:</strong> ${citaDate}<br>
                    <strong>MOTIVO DE LA CITACIÓN:</strong> ${reason}<br>
                    <strong>LUGAR:</strong> Oficina de Auxiliatura General / Secretaría Académica
                </div>

                <p>Agradeciendo de antemano su puntual asistencia y compromiso con la educación y formación de su hijo(a).</p>

                <div class="signatures">
                    <div class="sig-line">
                        Profesor Auxiliar / Secretaría<br>
                        <strong>ENCCO Jutiapa</strong>
                    </div>
                    <div class="sig-line">
                        Firma de Enterado(a)<br>
                        <strong>Padre de Familia o Encargado</strong>
                    </div>
                </div>
            </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(printHtml);
        doc.close();

        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 2000);
        }, 400);
    }
    window.printOfficialParentCitation = printOfficialParentCitation;

})(window, document);
