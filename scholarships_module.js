/**
 * ============================================================================
 * ENCCO JUTIAPA 1970 — MÓDULO DE BECAS Y BOLSAS DE ESTUDIO (MULTICICLO)
 * ============================================================================
 * Gestión integral, 100% responsiva (escritorio, tablet y móvil) y multiciclo
 * (2026 / 2027 / 2028+) para estudiantes becados o con Bolsa de Estudio.
 * Se integra con % de Asistencia a la Fecha, Ficha del Estudiante, Ficha
 * Integral impresa (incluyendo documentos faltantes), Impresión Oficial Azul
 * Institucional (Oficio 8.5"x13") y Exportación Excel (.xlsx).
 */
(function (window, document) {
    'use strict';

    const SCHOLARSHIP_TYPES = [
        'Bolsa de Estudio MINEDUC',
        'Beca Institucional ENCCO',
        'Beca Municipal / Gubernamental',
        'Beca Privada / ONG / Fundación',
        'Otra Beca / Apoyo Estudiantil'
    ];

    const SCHOLARSHIP_STATUSES = ['Activa', 'En Trámite', 'Suspendida'];

    const VIEW_STATE = {
        quickFilter: 'all', // 'all' | 'bolsa' | 'beca' | 'risk' | 'ok' | 'tramite'
        gradeFilter: 'ALL',
        search: ''
    };

    function _esc(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getScholarshipActiveCycle() {
        const st = window.STATE || {};
        return String(st.historicalViewingCycle || st.viewingHistoricalCycle || st.activeCycle || '2026').trim();
    }

    function canViewScholarships(roleOverride) {
        const st = window.STATE || {};
        const role = String(roleOverride || st.currentRole || '').toLowerCase().trim();
        if (!role || role === 'guest') return false;
        if (typeof window.isSuperUserRole === 'function' && window.isSuperUserRole(role)) return true;
        if (typeof window.isDirectorRole === 'function' && window.isDirectorRole(role)) return true;
        if (typeof window.hasRolePermission === 'function') {
            return !!window.hasRolePermission('scholarships', role);
        }
        return ['admin', 'super_usuario', 'superadmin', 'director', 'direccion', 'directora', 'secretaria', 'secretario', 'secretaria_auxiliar', 'profesor_auxiliar', 'auxiliar', 'auxiliatura', 'docente', 'catedratico'].includes(role);
    }

    function canManageScholarships(roleOverride) {
        const st = window.STATE || {};
        if (st.isHistoricalReadOnlyMode) return false;
        const role = String(roleOverride || st.currentRole || '').toLowerCase().trim();
        if (!role || role === 'guest') return false;
        if (typeof window.isSuperUserRole === 'function' && window.isSuperUserRole(role)) return true;
        if (typeof window.isDirectorRole === 'function' && window.isDirectorRole(role)) return true;
        if (typeof window.canRoleModify === 'function') {
            return !!window.canRoleModify('scholarships', role);
        }
        if (typeof window.getModulePermissionLevel === 'function') {
            return window.getModulePermissionLevel('scholarships', role) === 'edit';
        }
        return ['admin', 'super_usuario', 'superadmin', 'director', 'direccion', 'directora', 'secretaria', 'secretario', 'secretaria_auxiliar', 'profesor_auxiliar', 'auxiliar', 'auxiliatura'].includes(role);
    }

    /**
     * Obtiene el registro de beca/bolsa de un estudiante para un ciclo específico (aislamiento multiciclo).
     */
    function getStudentScholarshipForCycle(student, cycleOverride) {
        if (!student || typeof student !== 'object') return null;
        const cycle = String(cycleOverride || getScholarshipActiveCycle()).trim();
        const byCycle = student.scholarshipsByCycle;
        if (byCycle && typeof byCycle === 'object' && byCycle[cycle] && byCycle[cycle].active) {
            return byCycle[cycle];
        }
        // Compatibilidad si existiera un campo plano del mismo ciclo
        if (student.scholarship && student.scholarship.active && String(student.scholarship.cycle || cycle) === cycle) {
            return student.scholarship;
        }
        return null;
    }

    function _getActiveCycleStudents() {
        const cycle = getScholarshipActiveCycle();
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
        return list.filter(s => s && String(s.status || '') !== 'Egresado' && String(s.gradeCode || '').toUpperCase() !== 'EGRESADO');
    }

    function getStudentAverageForScholarship(student) {
        if (!student || !student.grades || typeof student.grades !== 'object') return null;
        let sum = 0;
        let count = 0;
        Object.values(student.grades).forEach(subjObj => {
            if (!subjObj || typeof subjObj !== 'object') return;
            let sSum = 0;
            let sCnt = 0;
            ['b1', 'b2', 'b3', 'b4'].forEach(bk => {
                const v = subjObj[bk];
                if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v)) && Number(v) > 0) {
                    sSum += Number(v);
                    sCnt++;
                }
            });
            if (sCnt > 0) {
                sum += (sSum / sCnt);
                count++;
            }
        });
        return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
    }

    function getStudentMissingDocsSummary(student) {
        const catalog = (Array.isArray(window.OFFICIAL_EXPEDIENTE_DOCS) && window.OFFICIAL_EXPEDIENTE_DOCS.length > 0)
            ? window.OFFICIAL_EXPEDIENTE_DOCS
            : [
                { key: 'certificados_primaria', title: 'Certificados de 1ero a 6to Primaria' },
                { key: 'diploma_primaria', title: 'Diploma Oficial de 6to Primaria' },
                { key: 'certificados_basico', title: 'Certificados de 1ero a 3ero Básico' },
                { key: 'diploma_basico', title: 'Diploma Oficial de 3ero Básico' },
                { key: 'partida_nacimiento', title: 'Certificación de Nacimiento / Pasaporte' },
                { key: 'dpi_encargado', title: 'Copia de DPI Encargado / Pasaporte' }
            ];
        const exp = (typeof window.getStudentExpedienteSafe === 'function')
            ? window.getStudentExpedienteSafe(student)
            : { docs: (student && student.expediente && student.expediente.docs) ? student.expediente.docs : {} };
        const metrics = (typeof window.calculateStudentExpedienteMetrics === 'function')
            ? window.calculateStudentExpedienteMetrics(student)
            : { deliveredCount: 0, totalRequired: catalog.length, status: 'incompleto', percent: 0 };

        const missing = [];
        const inProgress = [];
        catalog.forEach(d => {
            const raw = (exp.docs && exp.docs[d.key]) ? exp.docs[d.key] : { status: 'pendiente' };
            const st = String(raw.status || 'pendiente').toLowerCase();
            if (st === 'pendiente') missing.push(d.title);
            else if (st === 'en_tramite') inProgress.push(d.title);
        });

        const cuiInfo = (typeof window.validateStudentCuiForAudit === 'function')
            ? window.validateStudentCuiForAudit(student ? student.cui : '')
            : { status: (student && /^\d{13}$/.test(String(student.cui || '').replace(/[\s-]/g, ''))) ? 'valid' : 'missing', label: 'CUI' };

        return {
            deliveredCount: metrics.deliveredCount,
            totalRequired: metrics.totalRequired,
            isComplete: metrics.status === 'completo',
            missing,
            inProgress,
            cuiInfo
        };
    }

    /**
     * Guarda o actualiza la beca/bolsa de estudio de un estudiante en el ciclo dado sin perder datos.
     */
    function saveStudentScholarshipForCycle(studentId, payload, cycleOverride) {
        if (!canManageScholarships()) {
            if (typeof window.showToast === 'function') window.showToast('Solo Dirección, Secretaría, Auxiliatura o Administración pueden gestionar becas.', 'warning');
            return false;
        }
        const cycle = String(cycleOverride || getScholarshipActiveCycle()).trim();
        const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
        const student = students.find(s => s && String(s.id) === String(studentId));
        if (!student) return false;

        if (!student.scholarshipsByCycle || typeof student.scholarshipsByCycle !== 'object') {
            student.scholarshipsByCycle = {};
        }

        const user = window.STATE && window.STATE.currentUser;
        const record = {
            active: payload.active !== false,
            cycle,
            type: String(payload.type || SCHOLARSHIP_TYPES[0]).trim(),
            program: String(payload.program || '').trim(),
            agreementRef: String(payload.agreementRef || '').trim(),
            status: SCHOLARSHIP_STATUSES.includes(payload.status) ? payload.status : 'Activa',
            notes: String(payload.notes || '').trim(),
            updatedAt: new Date().toISOString(),
            updatedBy: user ? (user.name || user.username || 'Administración') : 'Administración'
        };

        student.scholarshipsByCycle[cycle] = record;

        if (typeof window.saveStateToLocalStorage === 'function') window.saveStateToLocalStorage();
        if (typeof window.EnccoCloudSync !== 'undefined' && typeof window.EnccoCloudSync.syncNode === 'function') {
            window.EnccoCloudSync.syncNode('students', window.STATE.students);
        }
        if (typeof window.saveStateToFirestore === 'function') {
            try { window.saveStateToFirestore(); } catch (e) {}
        }

        // Refrescar vistas reactivas
        if (window.STATE && window.STATE.activeView === 'scholarships') renderScholarshipsView();
        if (window.STATE && String(window.STATE.selectedStudentId) === String(student.id)) {
            renderStudentProfileScholarshipAndDocsSummary(student);
        }
        if (typeof window.renderStudentsTable === 'function' && window.STATE && window.STATE.activeView === 'students') {
            window.renderStudentsTable();
        }
        return true;
    }

    function removeStudentScholarshipForCycle(studentId, cycleOverride) {
        if (!canManageScholarships()) return false;
        const cycle = String(cycleOverride || getScholarshipActiveCycle()).trim();
        const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
        const student = students.find(s => s && String(s.id) === String(studentId));
        if (!student) return false;
        if (student.scholarshipsByCycle && student.scholarshipsByCycle[cycle]) {
            student.scholarshipsByCycle[cycle].active = false;
            student.scholarshipsByCycle[cycle].updatedAt = new Date().toISOString();
        }
        if (typeof window.saveStateToLocalStorage === 'function') window.saveStateToLocalStorage();
        if (typeof window.EnccoCloudSync !== 'undefined' && typeof window.EnccoCloudSync.syncNode === 'function') {
            window.EnccoCloudSync.syncNode('students', window.STATE.students);
        }
        if (window.STATE && window.STATE.activeView === 'scholarships') renderScholarshipsView();
        if (window.STATE && String(window.STATE.selectedStudentId) === String(student.id)) {
            renderStudentProfileScholarshipAndDocsSummary(student);
        }
        return true;
    }

    function injectScholarshipsStyles() {
        if (typeof document === 'undefined' || !document.head) return;
        if (document.getElementById('encco-scholarships-responsive-styles')) return;
        const style = document.createElement('style');
        style.id = 'encco-scholarships-responsive-styles';
        style.textContent = `
            .sch-shell {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                background: #ffffff;
                border: 1.5px solid #bae6fd;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 14px rgba(3, 105, 161, 0.08);
            }
            .sch-header {
                background: linear-gradient(135deg, #0f2b5c 0%, #0369a1 65%, #0284c7 100%);
                color: #ffffff;
                padding: 14px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .sch-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }
            .sch-actions button { min-height: 36px; white-space: nowrap; }
            .sch-kpis {
                display: grid;
                grid-template-columns: repeat(5, minmax(0, 1fr));
                gap: 10px;
                padding: 12px 16px;
                background: #f0f9ff;
                border-bottom: 1px solid #bae6fd;
            }
            .sch-kpi-card {
                background: #ffffff;
                border-radius: 8px;
                padding: 8px 12px;
                min-width: 0;
            }
            .sch-toolbar {
                padding: 10px 16px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .sch-chips {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                align-items: center;
                flex: 1 1 340px;
            }
            .sch-controls {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }
            .sch-controls input,
            .sch-controls select {
                height: 34px;
                padding: 0 10px;
                border-radius: 7px;
                border: 1px solid #cbd5e1;
                font-size: 0.78rem;
                font-weight: 600;
                color: #0f2b5c;
                background: #ffffff;
            }
            .sch-table-wrap {
                width: 100%;
                max-height: 62vh;
                overflow-y: auto;
                overflow-x: hidden;
            }
            .sch-table {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: 0.78rem;
            }
            .sch-table thead { position: sticky; top: 0; z-index: 3; }
            .sch-table thead th {
                background: #0369a1 !important;
                color: #ffffff !important;
                font-size: 0.7rem !important;
                font-weight: 800 !important;
                padding: 7px 4px !important;
                border-bottom: 2px solid #0f2b5c !important;
                white-space: normal !important;
            }
            .sch-table tbody td {
                padding: 6px 5px !important;
                vertical-align: middle !important;
                word-break: break-word;
                overflow-wrap: anywhere;
            }
            .sch-col-no { width: 34px; text-align: center; }
            .sch-col-stu { width: 23%; text-align: left; }
            .sch-col-id { width: 15%; text-align: center; }
            .sch-col-type { width: 19%; text-align: left; }
            .sch-col-att { width: 11%; text-align: center; }
            .sch-col-avg { width: 8%; text-align: center; }
            .sch-col-st { width: 9%; text-align: center; }
            .sch-col-act { width: 115px; text-align: center; }

            .sch-cards {
                display: none;
                padding: 10px 12px;
                gap: 10px;
                flex-direction: column;
                max-height: 65vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            .sch-card {
                border: 1px solid #cbd5e1;
                border-left: 4px solid #0369a1;
                border-radius: 10px;
                padding: 10px 12px;
                background: #ffffff;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
            }
            .prof-exec-kpi-strip {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
            }
            .prof-exec-kpi-item {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 9px;
                padding: 8px 10px;
                min-width: 0;
            }
            .prof-sch-docs-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
                margin-bottom: 14px;
            }
            @media (max-width: 900px) {
                .prof-exec-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (max-width: 1150px) {
                .sch-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 10px 12px; }
                .sch-controls { width: 100%; }
                .sch-controls input, .sch-controls select { flex: 1 1 170px; min-height: 36px; }
                .sch-col-avg { display: none; }
            }
            @media (max-width: 900px) {
                .sch-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
                .sch-actions { width: 100%; }
                .sch-actions button { flex: 1 1 auto; justify-content: center; font-size: 0.78rem; }
                .sch-chips { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; width: 100%; }
                .sch-chips button { flex: 0 0 auto; min-height: 34px; }
                .sch-table-wrap { display: none; }
                .sch-cards { display: flex; }
                .prof-sch-docs-grid { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    }

    function buildScholarshipsDataset() {
        const activeCycle = getScholarshipActiveCycle();
        const students = _getActiveCycleStudents();

        const allBecados = [];
        students.forEach(s => {
            const sch = getStudentScholarshipForCycle(s, activeCycle);
            if (!sch) return;
            const attObj = (typeof window.getStudentAttendancePercentageToDate === 'function')
                ? window.getStudentAttendancePercentageToDate(s.id, activeCycle)
                : null;
            const hasAtt = attObj && attObj.percentage !== null && typeof attObj.percentage !== 'undefined';
            const attPct = hasAtt ? Number(attObj.percentage) : null;
            const avg = getStudentAverageForScholarship(s);
            const displayName = (typeof window.formatStudentDisplayName === 'function')
                ? window.formatStudentDisplayName(s, 'lastFirst').toUpperCase()
                : String(s.name || `${s.lastName || ''} ${s.firstName || ''}`).trim().toUpperCase();
            const cleanSec = String(s.section || 'A').replace(/Sección\s*/i, '').trim() || 'A';
            const gradeLabel = s.grade ? `${s.grade} (${cleanSec})` : (s.gradeCode || 'Sin Grado');
            const isBolsa = /bolsa/i.test(sch.type || '');
            const isAttRisk = hasAtt && attPct < 85;
            const isAttOk = hasAtt && attPct >= 85;

            allBecados.push({
                student: s,
                id: s.id,
                displayName,
                gradeLabel,
                gradeCode: s.gradeCode || '',
                cui: String(s.cui || '').trim(),
                personalCode: String(s.personalCode || s.codigoPersonal || '').trim(),
                scholarship: sch,
                isBolsa,
                attObj,
                hasAtt,
                attPct,
                isAttRisk,
                isAttOk,
                avg
            });
        });

        allBecados.sort((a, b) => a.gradeLabel.localeCompare(b.gradeLabel, 'es', { numeric: true }) || a.displayName.localeCompare(b.displayName, 'es'));

        const kpis = {
            total: allBecados.length,
            bolsas: allBecados.filter(r => r.isBolsa).length,
            otrasBecas: allBecados.filter(r => !r.isBolsa).length,
            attOk: allBecados.filter(r => r.isAttOk).length,
            attRisk: allBecados.filter(r => r.isAttRisk).length
        };

        let rows = allBecados;
        if (VIEW_STATE.quickFilter === 'bolsa') rows = rows.filter(r => r.isBolsa);
        else if (VIEW_STATE.quickFilter === 'beca') rows = rows.filter(r => !r.isBolsa);
        else if (VIEW_STATE.quickFilter === 'risk') rows = rows.filter(r => r.isAttRisk);
        else if (VIEW_STATE.quickFilter === 'ok') rows = rows.filter(r => r.isAttOk);
        else if (VIEW_STATE.quickFilter === 'tramite') rows = rows.filter(r => r.scholarship.status === 'En Trámite');

        if (VIEW_STATE.gradeFilter && VIEW_STATE.gradeFilter !== 'ALL') {
            rows = rows.filter(r => r.gradeCode === VIEW_STATE.gradeFilter || r.gradeLabel === VIEW_STATE.gradeFilter);
        }

        const q = String(VIEW_STATE.search || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (q) {
            rows = rows.filter(r => {
                const hay = `${r.displayName} ${r.cui} ${r.personalCode} ${r.gradeLabel} ${r.scholarship.type} ${r.scholarship.program} ${r.scholarship.agreementRef}`
                    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return hay.includes(q);
            });
        }

        return { activeCycle, allBecados, rows, kpis };
    }

    function _renderAttBadge(r) {
        if (!r.hasAtt) return '<span style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:8px; font-weight:700; font-size:0.72rem;">S/R</span>';
        const bg = r.attPct >= 85 ? '#dcfce7' : (r.attPct >= 75 ? '#fef3c7' : '#fee2e2');
        const clr = r.attPct >= 85 ? '#15803d' : (r.attPct >= 75 ? '#b45309' : '#b91c1c');
        return `<span style="background:${bg}; color:${clr}; border:1px solid ${clr}44; padding:2px 7px; border-radius:10px; font-weight:800; font-size:0.74rem;" title="${r.attObj.attendedDays}/${r.attObj.totalRecordedDays} días">${r.attPct}%</span>`;
    }

    function _renderStatusBadge(st) {
        const bg = st === 'Activa' ? '#dcfce7' : (st === 'En Trámite' ? '#e0f2fe' : '#fee2e2');
        const clr = st === 'Activa' ? '#15803d' : (st === 'En Trámite' ? '#0369a1' : '#b91c1c');
        return `<span style="background:${bg}; color:${clr}; padding:2px 7px; border-radius:10px; font-weight:800; font-size:0.72rem;">${_esc(st)}</span>`;
    }

    function renderScholarshipsView() {
        const container = document.getElementById('view-scholarships');
        if (!container) return;
        injectScholarshipsStyles();

        if (!canViewScholarships()) {
            container.innerHTML = `
                <div class="sch-shell" style="padding:28px 20px; text-align:center;">
                    <div style="font-size:2rem; color:#dc2626; margin-bottom:8px;"><i class="fa-solid fa-lock"></i></div>
                    <h3 style="margin:0 0 6px; color:#0f2b5c; font-weight:800;">Acceso Restringido</h3>
                    <p style="margin:0; color:#64748b; font-size:0.86rem;">Su rol actual no tiene permiso habilitado para consultar <strong>Becas y Bolsas de Estudio</strong>. Solicite autorización en <em>Roles y Permisos</em>.</p>
                </div>
            `;
            return;
        }

        // 🔗 [v308] Carga automática bajo demanda de attendanceRecords si aún no están en memoria
        if (!window._enccoAttLoadedForScholarships && (!window.STATE || !STATE.attendanceRecords || Object.keys(STATE.attendanceRecords).length === 0)) {
            const fbUrl = (typeof window.getFirebaseDatabaseUrl === 'function') ? window.getFirebaseDatabaseUrl() : null;
            if (fbUrl && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
                window._enccoAttLoadedForScholarships = true;
                fetch(`${fbUrl}/encc_school_state/attendanceRecords.json?t=${Date.now()}`)
                    .then(r => (r && r.ok ? r.json() : null))
                    .then(attData => {
                        if (attData && typeof attData === 'object' && window.STATE) {
                            STATE.attendanceRecords = { ...(STATE.attendanceRecords || {}), ...attData };
                            renderScholarshipsView();
                        }
                    })
                    .catch(() => { window._enccoAttLoadedForScholarships = false; });
            }
        }

        const { activeCycle, allBecados, rows, kpis } = buildScholarshipsDataset();
        const canEdit = canManageScholarships();
        const uniqueGrades = [...new Set(allBecados.map(r => r.gradeLabel))];

        const chipStyle = (active) => active
            ? 'background:#0369a1; color:#ffffff; border:1.5px solid #0f2b5c; font-weight:800;'
            : 'background:#ffffff; color:#334155; border:1px solid #cbd5e1; font-weight:700;';

        const cardsHtml = rows.length === 0 ? `
            <div style="text-align:center; padding:32px 16px; color:#64748b;">
                <i class="fa-solid fa-hand-holding-heart" style="font-size:2.2rem; color:#0284c7; opacity:0.6; margin-bottom:8px; display:block;"></i>
                <strong>No hay estudiantes becados registrados con este filtro en el Ciclo ${_esc(activeCycle)}.</strong>
                ${canEdit ? '<div style="margin-top:10px;"><button type="button" class="btn btn-sm btn-primary" onclick="openScholarshipAssignModal()" style="font-weight:800;"><i class="fa-solid fa-plus"></i> Asignar Primer Becado</button></div>' : ''}
            </div>
        ` : rows.map((r, idx) => `
            <div class="sch-card" style="border-left-color:${r.isAttRisk ? '#dc2626' : '#0369a1'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="min-width:0;">
                        <strong style="color:#0f2b5c; font-size:0.86rem; cursor:pointer; display:block;" onclick="if(typeof openStudentProfileModal==='function') openStudentProfileModal('${_esc(r.id)}')">${idx + 1}. ${_esc(r.displayName)}</strong>
                        <div style="font-size:0.74rem; color:#64748b;">${_esc(r.gradeLabel)}</div>
                    </div>
                    ${_renderStatusBadge(r.scholarship.status)}
                </div>
                <div style="margin:6px 0; font-size:0.76rem; color:#0f2b5c;">
                    <strong>🎓 ${_esc(r.scholarship.type)}</strong>${r.scholarship.program ? ` — ${_esc(r.scholarship.program)}` : ''}
                    ${r.scholarship.agreementRef ? `<div style="font-size:0.71rem; color:#64748b;">Ref/Acuerdo: ${_esc(r.scholarship.agreementRef)}</div>` : ''}
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:8px; font-size:0.74rem;">
                    <span>Asistencia: ${_renderAttBadge(r)}</span>
                    <span>Promedio: <strong>${r.avg !== null ? r.avg : '—'}</strong></span>
                    <span style="font-family:monospace; color:#475569;">CUI: ${_esc(r.cui || '—')}</span>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="if(typeof openStudentProfileModal==='function') openStudentProfileModal('${_esc(r.id)}')" style="flex:1; min-height:34px; font-weight:700; font-size:0.76rem;"><i class="fa-solid fa-id-card"></i> Ficha</button>
                    ${canEdit ? `<button type="button" class="btn btn-sm btn-outline-secondary" onclick="openScholarshipAssignModal('${_esc(r.id)}')" style="min-height:34px; font-weight:700; font-size:0.76rem;"><i class="fa-solid fa-pen"></i> Editar</button>` : ''}
                    <button type="button" class="btn btn-sm btn-outline-success" onclick="printStudentScholarshipCertificate('${_esc(r.id)}')" style="min-height:34px; font-weight:700; font-size:0.76rem;"><i class="fa-solid fa-file-signature"></i> Constancia</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="sch-shell">
                <div class="sch-header">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <strong style="font-size:1.08rem;"><i class="fa-solid fa-hand-holding-heart"></i> Becas y Bolsas de Estudio</strong>
                            <span style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.35); padding:2px 8px; border-radius:12px; font-size:0.74rem; font-weight:800;">Ciclo ${_esc(activeCycle)}</span>
                        </div>
                        <div style="font-size:0.78rem; color:#e0f2fe; margin-top:2px;">
                            Control multiciclo de alumnos becados y con bolsa de estudio, seguimiento de asistencia a la fecha (≥ 85%) y emisión de constancias.
                        </div>
                    </div>
                    <div class="sch-actions">
                        ${canEdit ? `
                        <button type="button" class="btn btn-sm" onclick="openScholarshipAssignModal()" style="background:#f59e0b; color:#0f172a; border:1px solid #fcd34d; font-weight:800; padding:6px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-plus"></i> Asignar Beca / Bolsa
                        </button>` : ''}
                        <button type="button" class="btn btn-sm" onclick="printScholarshipsOfficialRoster()" style="background:#ffffff; color:#0f2b5c; border:1px solid #bae6fd; font-weight:800; padding:6px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-print"></i> Imprimir Nómina
                        </button>
                        <button type="button" class="btn btn-sm" onclick="exportScholarshipsExcel()" style="background:#15803d; color:#ffffff; border:1px solid #86efac; font-weight:800; padding:6px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-file-excel"></i> Excel (.xlsx)
                        </button>
                    </div>
                </div>

                <!-- KPIs -->
                <div class="sch-kpis">
                    <div class="sch-kpi-card" style="border:1px solid #cbd5e1;">
                        <div style="font-size:0.71rem; color:#64748b; font-weight:700;">🎓 Total Becados</div>
                        <div style="font-size:1.3rem; font-weight:900; color:#0f2b5c;">${kpis.total}</div>
                    </div>
                    <div class="sch-kpi-card" style="border:1px solid #bae6fd;">
                        <div style="font-size:0.71rem; color:#0369a1; font-weight:700;">🎒 Bolsas de Estudio</div>
                        <div style="font-size:1.3rem; font-weight:900; color:#0284c7;">${kpis.bolsas}</div>
                    </div>
                    <div class="sch-kpi-card" style="border:1px solid #ddd6fe;">
                        <div style="font-size:0.71rem; color:#6b21a8; font-weight:700;">🏅 Becas / Otros</div>
                        <div style="font-size:1.3rem; font-weight:900; color:#7c3aed;">${kpis.otrasBecas}</div>
                    </div>
                    <div class="sch-kpi-card" style="border:1px solid #bbf7d0;">
                        <div style="font-size:0.71rem; color:#166534; font-weight:700;">🟢 Asistencia ≥ 85%</div>
                        <div style="font-size:1.3rem; font-weight:900; color:#15803d;">${kpis.attOk}</div>
                    </div>
                    <div class="sch-kpi-card" style="border:1px solid #fecaca;">
                        <div style="font-size:0.71rem; color:#991b1b; font-weight:700;">🔴 En Riesgo (&lt; 85%)</div>
                        <div style="font-size:1.3rem; font-weight:900; color:#dc2626;">${kpis.attRisk}</div>
                    </div>
                </div>

                <!-- TOOLBAR -->
                <div class="sch-toolbar">
                    <div class="sch-chips">
                        <button type="button" onclick="setScholarshipsQuickFilter('all')" style="${chipStyle(VIEW_STATE.quickFilter === 'all')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">Todos (${kpis.total})</button>
                        <button type="button" onclick="setScholarshipsQuickFilter('bolsa')" style="${chipStyle(VIEW_STATE.quickFilter === 'bolsa')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🎒 Bolsas (${kpis.bolsas})</button>
                        <button type="button" onclick="setScholarshipsQuickFilter('beca')" style="${chipStyle(VIEW_STATE.quickFilter === 'beca')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🏅 Becas (${kpis.otrasBecas})</button>
                        <button type="button" onclick="setScholarshipsQuickFilter('ok')" style="${chipStyle(VIEW_STATE.quickFilter === 'ok')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🟢 Cumplen ≥ 85%</button>
                        <button type="button" onclick="setScholarshipsQuickFilter('risk')" style="${chipStyle(VIEW_STATE.quickFilter === 'risk')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🔴 Riesgo &lt; 85% (${kpis.attRisk})</button>
                        <button type="button" onclick="setScholarshipsQuickFilter('tramite')" style="${chipStyle(VIEW_STATE.quickFilter === 'tramite')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">⏳ En Trámite</button>
                    </div>
                    <div class="sch-controls">
                        <input type="text" placeholder="Buscar alumno, CUI o programa..." value="${_esc(VIEW_STATE.search)}" oninput="setScholarshipsSearch(this.value)">
                        <select onchange="setScholarshipsGradeFilter(this.value)">
                            <option value="ALL">Todas las Secciones</option>
                            ${uniqueGrades.map(g => `<option value="${_esc(g)}" ${VIEW_STATE.gradeFilter === g ? 'selected' : ''}>${_esc(g)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- TABLA RESPONSIVA 100% AJUSTADA -->
                <div class="sch-table-wrap">
                    <table class="custom-table sch-table">
                        <thead>
                            <tr>
                                <th class="sch-col-no">No.</th>
                                <th class="sch-col-stu">Estudiante y Sección</th>
                                <th class="sch-col-id">CUI / Cód. Personal</th>
                                <th class="sch-col-type">Tipo de Beca / Programa</th>
                                <th class="sch-col-att">Asistencia a la Fecha</th>
                                <th class="sch-col-avg">Prom.</th>
                                <th class="sch-col-st">Estado</th>
                                <th class="sch-col-act">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.length === 0 ? `
                                <tr>
                                    <td colspan="8" style="text-align:center; padding:34px; color:#64748b;">
                                        <i class="fa-solid fa-hand-holding-heart" style="font-size:2rem; color:#0284c7; opacity:0.6; margin-bottom:8px; display:block;"></i>
                                        <strong>No hay alumnos becados registrados en el Ciclo ${_esc(activeCycle)} con este filtro.</strong>
                                    </td>
                                </tr>
                            ` : rows.map((r, idx) => `
                                <tr style="background:${r.isAttRisk ? '#fff5f5' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; border-bottom:1px solid #e2e8f0;">
                                    <td class="sch-col-no" style="font-weight:700; color:#475569;">${idx + 1}</td>
                                    <td class="sch-col-stu">
                                        <strong style="color:#0f2b5c; cursor:pointer; display:block;" onclick="if(typeof openStudentProfileModal==='function') openStudentProfileModal('${_esc(r.id)}')">${_esc(r.displayName)}</strong>
                                        <div style="font-size:0.71rem; color:#64748b;">${_esc(r.gradeLabel)}</div>
                                    </td>
                                    <td class="sch-col-id" style="font-family:monospace; font-size:0.72rem;">
                                        <div style="font-weight:700; color:#0f2b5c;">${_esc(r.cui || 'Sin CUI')}</div>
                                        <div style="color:#64748b;">${_esc(r.personalCode || '—')}</div>
                                    </td>
                                    <td class="sch-col-type">
                                        <span style="display:inline-block; background:#e0f2fe; color:#0369a1; font-weight:800; font-size:0.71rem; padding:2px 6px; border-radius:5px;">🎓 ${_esc(r.scholarship.type)}</span>
                                        ${r.scholarship.program ? `<div style="font-size:0.71rem; color:#334155; margin-top:2px;">${_esc(r.scholarship.program)}</div>` : ''}
                                        ${r.scholarship.agreementRef ? `<div style="font-size:0.68rem; color:#64748b;">Ref: ${_esc(r.scholarship.agreementRef)}</div>` : ''}
                                    </td>
                                    <td class="sch-col-att">${_renderAttBadge(r)}</td>
                                    <td class="sch-col-avg" style="font-weight:800; color:${r.avg !== null && r.avg < 60 ? '#dc2626' : '#0f2b5c'};">${r.avg !== null ? r.avg : '—'}</td>
                                    <td class="sch-col-st">${_renderStatusBadge(r.scholarship.status)}</td>
                                    <td class="sch-col-act">
                                        <div style="display:inline-flex; gap:4px; align-items:center; justify-content:center;">
                                            <button type="button" class="btn btn-xs btn-outline-primary" onclick="if(typeof openStudentProfileModal==='function') openStudentProfileModal('${_esc(r.id)}')" title="Abrir Ficha del Estudiante" style="padding:3px 6px;"><i class="fa-solid fa-id-card"></i></button>
                                            ${canEdit ? `<button type="button" class="btn btn-xs btn-outline-secondary" onclick="openScholarshipAssignModal('${_esc(r.id)}')" title="Editar Beca" style="padding:3px 6px;"><i class="fa-solid fa-pen"></i></button>` : ''}
                                            <button type="button" class="btn btn-xs btn-outline-success" onclick="printStudentScholarshipCertificate('${_esc(r.id)}')" title="Imprimir Constancia de Beca y Asistencia" style="padding:3px 6px;"><i class="fa-solid fa-file-signature"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- TARJETAS RESPONSIVAS (TABLET VERTICAL Y MÓVIL <= 900px) -->
                <div class="sch-cards">${cardsHtml}</div>
            </div>
        `;
    }

    function setScholarshipsQuickFilter(f) { VIEW_STATE.quickFilter = f || 'all'; renderScholarshipsView(); }
    function setScholarshipsGradeFilter(g) { VIEW_STATE.gradeFilter = g || 'ALL'; renderScholarshipsView(); }
    function setScholarshipsSearch(s) { VIEW_STATE.search = s || ''; renderScholarshipsView(); }

    /**
     * Modal responsivo para asignar o editar Beca / Bolsa de Estudio a un estudiante.
     */
    function openScholarshipAssignModal(preselectedStudentId) {
        if (!canManageScholarships()) {
            if (typeof window.showToast === 'function') window.showToast('No tiene permisos para editar becas en este ciclo.', 'warning');
            return;
        }
        const existing = document.getElementById('enccoScholarshipModal');
        if (existing) existing.remove();

        const activeCycle = getScholarshipActiveCycle();
        const students = _getActiveCycleStudents().sort((a, b) => {
            const nA = typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(a, 'lastFirst') : (a.name || '');
            const nB = typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(b, 'lastFirst') : (b.name || '');
            return nA.localeCompare(nB, 'es');
        });

        const preStudent = preselectedStudentId ? students.find(s => String(s.id) === String(preselectedStudentId)) : null;
        const curSch = preStudent ? getStudentScholarshipForCycle(preStudent, activeCycle) : null;

        const overlay = document.createElement('div');
        overlay.id = 'enccoScholarshipModal';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.62); backdrop-filter:blur(3px); z-index:100050; display:flex; align-items:center; justify-content:center; padding:14px;';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div style="background:#ffffff; width:100%; max-width:540px; max-height:92vh; overflow-y:auto; border-radius:12px; box-shadow:0 20px 35px rgba(0,0,0,0.28); border:1.5px solid #bae6fd;">
                <div style="background:linear-gradient(135deg, #0f2b5c 0%, #0369a1 100%); color:#ffffff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-size:1rem;"><i class="fa-solid fa-hand-holding-heart"></i> ${curSch ? 'Editar Beca / Bolsa de Estudio' : 'Asignar Beca / Bolsa de Estudio'}</strong>
                        <div style="font-size:0.75rem; color:#bae6fd;">Ciclo Escolar ${_esc(activeCycle)}</div>
                    </div>
                    <button type="button" onclick="document.getElementById('enccoScholarshipModal').remove()" style="background:none; border:none; color:#ffffff; font-size:1.3rem; cursor:pointer;">&times;</button>
                </div>
                <form onsubmit="submitScholarshipAssignForm(event)" style="padding:16px 18px; display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <label style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:block; margin-bottom:4px;">Estudiante (Ciclo ${_esc(activeCycle)}):</label>
                        <select id="schModalStudentSelect" required style="width:100%; height:38px; border-radius:7px; border:1.5px solid #cbd5e1; padding:0 10px; font-weight:700; font-size:0.84rem;" ${preStudent ? 'disabled' : ''}>
                            <option value="">-- Seleccione Estudiante --</option>
                            ${students.map(s => {
                                const nm = typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(s, 'lastFirst').toUpperCase() : (s.name || '');
                                const sec = String(s.section || 'A').replace(/Sección\s*/i, '').trim();
                                return `<option value="${_esc(s.id)}" ${preStudent && String(preStudent.id) === String(s.id) ? 'selected' : ''}>${_esc(nm)} — ${_esc(s.grade || s.gradeCode)} (${_esc(sec)})</option>`;
                            }).join('')}
                        </select>
                        ${preStudent ? `<input type="hidden" id="schModalStudentHidden" value="${_esc(preStudent.id)}">` : ''}
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                        <div>
                            <label style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:block; margin-bottom:4px;">Tipo de Beneficio:</label>
                            <select id="schModalType" required style="width:100%; height:36px; border-radius:7px; border:1px solid #cbd5e1; padding:0 8px; font-weight:600; font-size:0.82rem;">
                                ${SCHOLARSHIP_TYPES.map(t => `<option value="${_esc(t)}" ${curSch && curSch.type === t ? 'selected' : ''}>${_esc(t)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:block; margin-bottom:4px;">Estado:</label>
                            <select id="schModalStatus" required style="width:100%; height:36px; border-radius:7px; border:1px solid #cbd5e1; padding:0 8px; font-weight:600; font-size:0.82rem;">
                                ${SCHOLARSHIP_STATUSES.map(st => `<option value="${_esc(st)}" ${curSch && curSch.status === st ? 'selected' : ''}>${_esc(st)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                        <div>
                            <label style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:block; margin-bottom:4px;">Programa / Patrocinador:</label>
                            <input type="text" id="schModalProgram" value="${_esc(curSch ? curSch.program : '')}" placeholder="Ej: MINEDUC / Municipalidad / Fundación..." style="width:100%; height:36px; border-radius:7px; border:1px solid #cbd5e1; padding:0 10px; font-size:0.82rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:block; margin-bottom:4px;">No. Acuerdo / Referencia:</label>
                            <input type="text" id="schModalAgreement" value="${_esc(curSch ? curSch.agreementRef : '')}" placeholder="Ej: AC-2027-045" style="width:100%; height:36px; border-radius:7px; border:1px solid #cbd5e1; padding:0 10px; font-size:0.82rem; box-sizing:border-box;">
                        </div>
                    </div>
                    <div>
                        <label style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:block; margin-bottom:4px;">Observaciones:</label>
                        <textarea id="schModalNotes" rows="2" placeholder="Detalles de cobertura, requisitos o seguimiento..." style="width:100%; border-radius:7px; border:1px solid #cbd5e1; padding:8px 10px; font-size:0.82rem; box-sizing:border-box;">${_esc(curSch ? curSch.notes : '')}</textarea>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:4px; border-top:1px solid #e2e8f0; padding-top:12px;">
                        ${curSch ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="confirmRemoveStudentScholarship('${_esc(preStudent.id)}')" style="font-weight:700;"><i class="fa-solid fa-trash"></i> Quitar Beca</button>` : '<span></span>'}
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('enccoScholarshipModal').remove()" style="font-weight:700;">Cancelar</button>
                            <button type="submit" class="btn btn-sm btn-primary" style="background:#0369a1; border-color:#0f2b5c; font-weight:800; padding:6px 16px;"><i class="fa-solid fa-floppy-disk"></i> Guardar Beca</button>
                        </div>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function submitScholarshipAssignForm(e) {
        if (e) e.preventDefault();
        const hiddenEl = document.getElementById('schModalStudentHidden');
        const selEl = document.getElementById('schModalStudentSelect');
        const studentId = (hiddenEl && hiddenEl.value) || (selEl && selEl.value);
        if (!studentId) return;

        const ok = saveStudentScholarshipForCycle(studentId, {
            active: true,
            type: document.getElementById('schModalType')?.value || SCHOLARSHIP_TYPES[0],
            status: document.getElementById('schModalStatus')?.value || 'Activa',
            program: document.getElementById('schModalProgram')?.value || '',
            agreementRef: document.getElementById('schModalAgreement')?.value || '',
            notes: document.getElementById('schModalNotes')?.value || ''
        });
        if (ok) {
            const modal = document.getElementById('enccoScholarshipModal');
            if (modal) modal.remove();
            if (typeof window.showToast === 'function') window.showToast('Beca / Bolsa de Estudio guardada correctamente.', 'success');
        }
    }

    function confirmRemoveStudentScholarship(studentId) {
        if (removeStudentScholarshipForCycle(studentId)) {
            const modal = document.getElementById('enccoScholarshipModal');
            if (modal) modal.remove();
            if (typeof window.showToast === 'function') window.showToast('Beca desactivada para el ciclo actual.', 'info');
        }
    }

    /**
     * Actualiza la insignia de Beca y el bloque responsivo de "Beca + Documentos Faltantes"
     * dentro de la Ficha del Estudiante (#studentProfileModal).
     */
    function renderStudentProfileScholarshipAndDocsSummary(student) {
        if (!student) return;
        injectScholarshipsStyles();
        const cycle = getScholarshipActiveCycle();
        const sch = getStudentScholarshipForCycle(student, cycle);
        const canEdit = canManageScholarships();

        // 1. Insignia fija en el encabezado de la Ficha del Estudiante (visible en todas las pestañas)
        const headerBadge = document.getElementById('profScholarshipHeaderBadge');
        if (headerBadge) {
            if (sch) {
                const isBolsa = String(sch.type || '').toLowerCase().includes('bolsa');
                headerBadge.style.display = 'inline-flex';
                headerBadge.style.background = isBolsa ? '#fef3c7' : '#e0e7ff';
                headerBadge.style.color = isBolsa ? '#92400e' : '#3730a3';
                headerBadge.style.borderColor = isBolsa ? '#f59e0b' : '#818cf8';
                headerBadge.innerHTML = `${isBolsa ? '💼' : '🎓'} ${_esc(sch.type)} (${_esc(cycle)})`;
            } else if (canEdit) {
                headerBadge.style.display = 'inline-flex';
                headerBadge.style.background = '#f8fafc';
                headerBadge.style.color = '#475569';
                headerBadge.style.borderColor = '#cbd5e1';
                headerBadge.innerHTML = '<i class="fa-solid fa-plus"></i> Asignar Beca / Bolsa';
            } else {
                headerBadge.style.display = 'none';
            }
        }

        const attObj = (typeof window.getStudentAttendancePercentageToDate === 'function')
            ? window.getStudentAttendancePercentageToDate(student.id, cycle)
            : null;
        const hasAtt = attObj && attObj.percentage !== null && typeof attObj.percentage !== 'undefined';
        const attColor = hasAtt ? (attObj.percentage >= 85 ? '#15803d' : (attObj.percentage >= 75 ? '#b45309' : '#dc2626')) : '#64748b';
        const attLabel = hasAtt ? `${attObj.percentage}% (${attObj.attendedDays}/${attObj.totalRecordedDays} días)` : 'Sin registros a la fecha';

        // Calcular promedio general y cursos aprobados
        const avgVal = getStudentAverageForScholarship(student);
        let passedCourses = 0, totalCoursesWithGrade = 0;
        if (student.grades && typeof student.grades === 'object') {
            Object.values(student.grades).forEach(arr => {
                if (!Array.isArray(arr)) return;
                const nums = arr.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
                if (nums.length > 0) {
                    totalCoursesWithGrade++;
                    const cAvg = nums.reduce((a, b) => a + b, 0) / nums.length;
                    if (cAvg >= 60) passedCourses++;
                }
            });
        }

        // Resolver datos del encargado + teléfono WhatsApp
        const gName = String(student.guardianName || student.tutor || student.motherName || student.fatherName || 'No registrado').trim();
        const gDpi = String(student.guardianDpi || student.motherDpi || student.fatherDpi || '').trim();
        const gPhone = String(student.guardianPhone1 || student.motherPhone1 || student.fatherPhone1 || student.phone || '').trim();
        const canWa = gPhone && (typeof window.canRoleUseWhatsApp !== 'function' || window.canRoleUseWhatsApp());

        // 1B. Barra Ejecutiva de 4 Indicadores Rápidos (De un vistazo, siempre visible sobre las pestañas)
        const kpiStrip = document.getElementById('profExecutiveKpiStrip');
        if (kpiStrip) {
            const avgColor = avgVal === null ? '#64748b' : (avgVal >= 75 ? '#15803d' : (avgVal >= 60 ? '#b45309' : '#dc2626'));
            const schRisk = sch && hasAtt && attObj.percentage < 85;
            kpiStrip.innerHTML = `
                <div class="prof-exec-kpi-item">
                    <div style="font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Promedio Actual</div>
                    <div style="font-size:0.92rem; font-weight:900; color:${avgColor};">${avgVal !== null ? avgVal + ' pts' : 'Sin notas'} ${totalCoursesWithGrade > 0 ? `<span style="font-size:0.70rem; font-weight:700; color:#475569;">(${passedCourses}/${totalCoursesWithGrade} aprob.)</span>` : ''}</div>
                </div>
                <div class="prof-exec-kpi-item">
                    <div style="font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Asistencia (${_esc(cycle)})</div>
                    <div style="font-size:0.92rem; font-weight:900; color:${attColor};">${hasAtt ? attObj.percentage + '%' : 'S/R'} ${hasAtt ? `<span style="font-size:0.70rem; font-weight:700; color:#475569;">(${attObj.absent || 0} faltas)</span>` : ''}</div>
                </div>
                <div class="prof-exec-kpi-item" style="cursor:${canEdit ? 'pointer' : 'default'};" ${canEdit ? `onclick="openScholarshipAssignModal('${_esc(student.id)}')"` : ''}>
                    <div style="font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Beneficio / Beca</div>
                    <div style="font-size:0.84rem; font-weight:800; color:${sch ? (schRisk ? '#dc2626' : '#0369a1') : '#64748b'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sch ? (schRisk ? '⚠️ Riesgo < 85%' : '🎓 ' + _esc(sch.type)) : 'Sin asignar'}</div>
                </div>
                <div class="prof-exec-kpi-item">
                    <div style="font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Contacto Encargado</div>
                    <div style="font-size:0.78rem; font-weight:800; color:#0f2b5c; display:flex; align-items:center; justify-content:space-between; gap:4px;">
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${_esc(gName)}">${_esc(gPhone || gName)}</span>
                        ${canWa ? `<button type="button" onclick="if(typeof openStudentWhatsAppChat==='function') openStudentWhatsAppChat('${_esc(student.id)}')" style="background:#16a34a; color:#fff; border:none; border-radius:5px; padding:2px 6px; font-size:0.68rem; font-weight:800; cursor:pointer; flex-shrink:0;" title="Enviar WhatsApp a ${_esc(gName)}"><i class="fa-brands fa-whatsapp"></i></button>` : ''}
                    </div>
                </div>
            `;
        }

        // 2. Bloque responsivo en Pestaña 1 de la Ficha (3 Tarjetas: Beca + Encargado/WhatsApp + Documentos Faltantes)
        const box = document.getElementById('profScholarshipAndDocsSummaryBox');
        if (!box) return;

        const docsSummary = getStudentMissingDocsSummary(student);

        box.innerHTML = `
            <div class="prof-sch-docs-grid">
                <!-- TARJETA 1: BECA / BOLSA DE ESTUDIO -->
                <div style="background:#f0f9ff; border:1.5px solid #bae6fd; border-left:4px solid #0369a1; border-radius:9px; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:5px; flex-wrap:wrap;">
                            <strong style="font-size:0.76rem; color:#0f2b5c; text-transform:uppercase;"><i class="fa-solid fa-hand-holding-heart" style="color:#0284c7;"></i> Beca / Bolsa (${_esc(cycle)})</strong>
                            ${sch ? _renderStatusBadge(sch.status) : '<span style="font-size:0.70rem; color:#64748b; font-weight:700;">Sin asignar</span>'}
                        </div>
                        ${sch ? `
                            <div style="font-size:0.80rem; color:#0f2b5c; font-weight:800;">🎓 ${_esc(sch.type)}</div>
                            ${sch.program ? `<div style="font-size:0.74rem; color:#334155;">Programa: <strong>${_esc(sch.program)}</strong></div>` : ''}
                            ${sch.agreementRef ? `<div style="font-size:0.72rem; color:#475569;">Ref: ${_esc(sch.agreementRef)}</div>` : ''}
                        ` : `
                            <div style="font-size:0.75rem; color:#475569;">Sin beca ni bolsa de estudio registrada en ${_esc(cycle)}.</div>
                        `}
                        <div style="margin-top:5px; font-size:0.74rem; color:#334155;">
                            <strong>Asistencia:</strong> <span style="font-weight:800; color:${attColor};">${_esc(attLabel)}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:8px;">
                        ${canEdit ? `<button type="button" class="btn btn-xs btn-outline-primary" onclick="openScholarshipAssignModal('${_esc(student.id)}')" style="font-weight:700; font-size:0.72rem; padding:3px 8px;"><i class="fa-solid fa-pen"></i> ${sch ? 'Editar Beca' : 'Asignar Beca'}</button>` : ''}
                        ${sch ? `<button type="button" class="btn btn-xs btn-outline-success" onclick="printStudentScholarshipCertificate('${_esc(student.id)}')" style="font-weight:700; font-size:0.72rem; padding:3px 8px;"><i class="fa-solid fa-file-signature"></i> Constancia</button>` : ''}
                    </div>
                </div>

                <!-- TARJETA 2: ENCARGADO Y CONTACTO DIRECTO -->
                <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-left:4px solid #0284c7; border-radius:9px; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="font-size:0.76rem; font-weight:800; color:#0f2b5c; text-transform:uppercase; margin-bottom:5px;">
                            <i class="fa-solid fa-people-roof" style="color:#0284c7;"></i> Encargado y Contacto
                        </div>
                        <div style="font-size:0.79rem; color:#0f172a; font-weight:800; line-height:1.25;">${_esc(gName)}</div>
                        ${gDpi ? `<div style="font-size:0.72rem; color:#475569; font-family:monospace; margin-top:2px;">DPI: ${_esc(gDpi)}</div>` : ''}
                        <div style="font-size:0.75rem; color:#334155; margin-top:3px;">
                            <i class="fa-solid fa-phone" style="color:#0284c7;"></i> <strong>${_esc(gPhone || 'Sin teléfono')}</strong>
                        </div>
                    </div>
                    <div style="margin-top:8px;">
                        ${canWa ? `<button type="button" class="btn btn-xs" onclick="if(typeof openStudentWhatsAppChat==='function') openStudentWhatsAppChat('${_esc(student.id)}')" style="width:100%; background:#16a34a; color:#ffffff; border:none; border-radius:6px; font-weight:800; font-size:0.73rem; padding:4px 8px; cursor:pointer;"><i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp</button>` : '<span style="font-size:0.71rem; color:#94a3b8;">WhatsApp no disponible</span>'}
                    </div>
                </div>

                <!-- TARJETA 3: DOCUMENTOS FALTANTES EN EXPEDIENTE -->
                <div style="background:${docsSummary.isComplete ? '#f0fdf4' : '#fffbeb'}; border:1.5px solid ${docsSummary.isComplete ? '#86efac' : '#fde68a'}; border-left:4px solid ${docsSummary.isComplete ? '#15803d' : '#d97706'}; border-radius:9px; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:5px; flex-wrap:wrap;">
                            <strong style="font-size:0.76rem; color:#0f2b5c; text-transform:uppercase;"><i class="fa-solid fa-folder-open" style="color:${docsSummary.isComplete ? '#15803d' : '#d97706'};"></i> Expediente</strong>
                            <span style="font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:10px; background:${docsSummary.isComplete ? '#dcfce7' : '#fef3c7'}; color:${docsSummary.isComplete ? '#15803d' : '#b45309'};">${docsSummary.deliveredCount}/${docsSummary.totalRequired}</span>
                        </div>
                        ${docsSummary.isComplete ? `
                            <div style="font-size:0.76rem; color:#15803d; font-weight:700;">✅ Expediente completo (6/6).</div>
                        ` : `
                            <div style="font-size:0.73rem; color:#92400e; font-weight:700; margin-bottom:2px;">Documentos Faltantes (${docsSummary.missing.length}):</div>
                            <div style="font-size:0.72rem; color:#334155; line-height:1.3;">${docsSummary.missing.length > 0 ? docsSummary.missing.map(m => `• ${_esc(m)}`).join('<br>') : 'Ninguno pendiente.'}</div>
                        `}
                        ${docsSummary.cuiInfo && docsSummary.cuiInfo.status !== 'valid' ? `<div style="margin-top:4px; font-size:0.72rem; color:#b91c1c; font-weight:800;">🔴 CUI: ${_esc(docsSummary.cuiInfo.label)}</div>` : ''}
                    </div>
                    <div style="margin-top:8px;">
                        <button type="button" class="btn btn-xs btn-outline-secondary" onclick="if(typeof switchStudentProfileTab==='function') switchStudentProfileTab('expediente')" style="width:100%; font-weight:700; font-size:0.72rem; padding:3px 8px;"><i class="fa-solid fa-folder-check"></i> Gestionar Documentos</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Impresión Oficial de Nómina de Becados (Azul Institucional, Hoja Oficio Horizontal 8.5"x13").
     */
    function printScholarshipsOfficialRoster() {
        const { activeCycle, rows, kpis } = buildScholarshipsDataset();
        const todayStr = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const rowsHtml = rows.map((r, idx) => `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="text-align:center; font-weight:bold; padding:3px;">${idx + 1}</td>
                <td style="font-weight:700; padding:3px 5px; white-space:nowrap;">${_esc(r.displayName)}</td>
                <td style="text-align:center; padding:3px; font-size:7.4pt;">${_esc(r.gradeLabel)}</td>
                <td style="text-align:center; padding:3px; font-family:monospace; font-size:7.4pt;">${_esc(r.cui || '—')}</td>
                <td style="text-align:center; padding:3px; font-family:monospace; font-size:7.4pt;">${_esc(r.personalCode || '—')}</td>
                <td style="padding:3px 5px; font-size:7.4pt;"><strong>${_esc(r.scholarship.type)}</strong>${r.scholarship.program ? `<br>${_esc(r.scholarship.program)}` : ''}</td>
                <td style="text-align:center; padding:3px; font-weight:800; color:${r.isAttRisk ? '#b91c1c' : '#15803d'};">${r.hasAtt ? `${r.attPct}%` : 'S/R'}</td>
                <td style="text-align:center; padding:3px; font-weight:800;">${r.avg !== null ? r.avg : '—'}</td>
                <td style="text-align:center; padding:3px; font-weight:700;">${_esc(r.scholarship.status)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <style>
                @page { size: 8.5in 13in landscape; margin: 5mm; }
                .sch-print-table th { background-color: #0369a1 !important; color: #ffffff !important; border: 1px solid #0f2b5c; padding: 4px; font-size: 7.4pt; }
                .sch-print-table td { border: 1px solid #334155; font-size: 7.6pt; }
            </style>
            <div style="font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
                <div style="border:2px solid #0369a1; border-radius:6px; overflow:hidden; margin-bottom:8px;">
                    <div style="background:linear-gradient(135deg, #0f2b5c 0%, #0369a1 60%, #0284c7 100%); color:#ffffff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="logo.png" alt="Logo" onerror="this.src='portada-comercio-principal.webp'" style="height:38px; width:auto; object-fit:contain;">
                            <div>
                                <h2 style="margin:0; font-size:1rem; font-weight:900; text-transform:uppercase;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</h2>
                                <div style="font-size:0.72rem; color:#bae6fd; font-weight:600;">JUTIAPA — JORNADA MATUTINA | CICLO ESCOLAR ${_esc(activeCycle)}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="background:#0c4a6e; border:1px solid #7dd3fc; padding:3px 10px; border-radius:6px; font-size:0.74rem; font-weight:800;">NÓMINA OFICIAL DE ESTUDIANTES BECADOS Y BOLSAS DE ESTUDIO</div>
                            <div style="font-size:0.68rem; color:#e0f2fe; margin-top:2px;">Emisión: ${_esc(todayStr)}</div>
                        </div>
                    </div>
                    <div style="background:#f0f9ff; border-top:1.5px solid #0284c7; padding:5px 10px; display:flex; justify-content:space-between; font-size:7.8pt;">
                        <span><strong>Total Becados:</strong> ${kpis.total} (Bolsas: ${kpis.bolsas} | Becas/Otros: ${kpis.otrasBecas})</span>
                        <span><strong>Asistencia ≥ 85%:</strong> ${kpis.attOk} &bull; <strong>En Riesgo (&lt; 85%):</strong> ${kpis.attRisk}</span>
                    </div>
                </div>
                <table class="sch-print-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th style="text-align:left;">Apellidos y Nombres</th>
                            <th>Grado y Sección</th>
                            <th>CUI (RENAP)</th>
                            <th>Cód. Personal</th>
                            <th style="text-align:left;">Tipo de Beca / Programa</th>
                            <th>% Asist.</th>
                            <th>Prom.</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; margin-top:30px; text-align:center; font-size:7.8pt;">
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Comisión de Becas / Auxiliatura</strong></div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Secretaría Académica</strong></div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Vo. Bo. Dirección General</strong></div>
                </div>
            </div>
        `;

        if (typeof window.renderAndShowPrintDocument === 'function') {
            window.renderAndShowPrintDocument(`Nómina de Becas y Bolsas de Estudio — Ciclo ${activeCycle}`, htmlContent, 'landscape');
        } else if (typeof window.enccoSafePrintHtml === 'function') {
            window.enccoSafePrintHtml(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`, 'width=1100,height=800', true);
        }
    }

    /**
     * Constancia Individual Oficial de Asistencia y Beca (para renovación ante MINEDUC / patrocinadores).
     */
    function printStudentScholarshipCertificate(studentId) {
        const cycle = getScholarshipActiveCycle();
        const student = (window.STATE && Array.isArray(window.STATE.students))
            ? window.STATE.students.find(s => s && String(s.id) === String(studentId))
            : null;
        if (!student) return;

        const sch = getStudentScholarshipForCycle(student, cycle);
        const attObj = (typeof window.getStudentAttendancePercentageToDate === 'function')
            ? window.getStudentAttendancePercentageToDate(student.id, cycle)
            : null;
        const attPct = (attObj && attObj.percentage !== null && typeof attObj.percentage !== 'undefined') ? `${attObj.percentage}% (${attObj.attendedDays} de ${attObj.totalRecordedDays} días registrados)` : 'Sin inasistencias registradas a la fecha';
        const avg = getStudentAverageForScholarship(student);
        const fullName = typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(student, 'lastFirst').toUpperCase() : (student.name || '');
        const cleanSec = String(student.section || 'A').replace(/Sección\s*/i, '').trim() || 'A';
        const todayStr = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });

        const htmlContent = `
            <style>
                @page { size: letter portrait; margin: 18mm 20mm; }
            </style>
            <div style="font-family:'Segoe UI', Arial, sans-serif; color:#0f172a; line-height:1.6; font-size:11pt;">
                <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0369a1; padding-bottom:10px; margin-bottom:20px;">
                    <img src="logo.png" onerror="this.style.display='none'" style="height:64px; width:auto;">
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:13pt; font-weight:900; color:#0f2b5c;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</div>
                        <div style="font-size:9.5pt; color:#475569; font-weight:700;">JUTIAPA, JUTIAPA &bull; CÓDIGO MINEDUC: 22-01-0014-46</div>
                        <div style="font-size:10.5pt; color:#0369a1; font-weight:800; margin-top:4px;">CONSTANCIA DE ASISTENCIA Y RENDIMIENTO PARA BECA / BOLSA DE ESTUDIO</div>
                    </div>
                </div>

                <p style="text-align:right; font-size:10pt; color:#334155;">Jutiapa, ${_esc(todayStr)}</p>
                <p><strong>A QUIEN INTERESE:</strong></p>
                <p style="text-align:justify;">
                    La Dirección y Secretaría de la <strong>Escuela Nacional de Ciencias Comerciales de Jutiapa (ENCCO)</strong> hacen constar que el/la estudiante
                    <strong>${_esc(fullName)}</strong>, identificado(a) con CUI <strong>${_esc(student.cui || 'N/A')}</strong> y Código Personal MINEDUC
                    <strong>${_esc(student.personalCode || student.codigoPersonal || 'N/A')}</strong>, se encuentra legalmente inscrito(a) en el Ciclo Escolar
                    <strong>${_esc(cycle)}</strong> en <strong>${_esc(student.grade || student.gradeCode)} — Sección "${_esc(cleanSec)}"</strong>
                    (${_esc(student.career || 'Perito Contador')}).
                </p>

                <div style="background:#f0f9ff; border:1.5px solid #bae6fd; border-left:4px solid #0369a1; border-radius:6px; padding:12px 16px; margin:16px 0; font-size:10pt;">
                    <div><strong>Beneficio Registrado:</strong> ${_esc(sch ? sch.type : 'Beca / Bolsa de Estudio')}${sch && sch.program ? ` — ${_esc(sch.program)}` : ''}</div>
                    ${sch && sch.agreementRef ? `<div><strong>Acuerdo / Referencia:</strong> ${_esc(sch.agreementRef)}</div>` : ''}
                    <div><strong>Porcentaje de Asistencia a la Fecha (${_esc(cycle)}):</strong> <strong style="color:#0369a1;">${_esc(attPct)}</strong></div>
                    <div><strong>Promedio Académico Acumulado:</strong> <strong>${avg !== null ? `${avg} puntos` : 'En curso'}</strong></div>
                    <div><strong>Estado de Matrícula:</strong> ${_esc(student.status || 'Activo')}</div>
                </div>

                <p style="text-align:justify;">
                    Y para los usos legales y trámites de gestión o renovación de beca / bolsa de estudio que al interesado(a) convengan, se extiende la presente constancia en la ciudad de Jutiapa.
                </p>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:64px; text-align:center; font-size:10pt;">
                    <div style="border-top:1.5px solid #0f172a; padding-top:6px;"><strong>Secretaría Académica</strong><br><span style="color:#475569; font-size:9pt;">ENCCO Jutiapa</span></div>
                    <div style="border-top:1.5px solid #0f172a; padding-top:6px;"><strong>Vo. Bo. Dirección General</strong><br><span style="color:#475569; font-size:9pt;">Sello y Firma Oficial</span></div>
                </div>
            </div>
        `;

        if (typeof window.renderAndShowPrintDocument === 'function') {
            window.renderAndShowPrintDocument(`Constancia de Beca y Asistencia — ${fullName}`, htmlContent, 'portrait');
        } else if (typeof window.enccoSafePrintHtml === 'function') {
            window.enccoSafePrintHtml(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`, 'width=850,height=900', true);
        }
    }

    async function exportScholarshipsExcel() {
        const { activeCycle, rows } = buildScholarshipsDataset();
        const filenameBase = `Becas_Bolsas_Estudio_ENCCO_${activeCycle}`;

        if (typeof window.ExcelJS !== 'undefined') {
            try {
                const wb = new window.ExcelJS.Workbook();
                const ws = wb.addWorksheet(`Becas_${activeCycle}`, { views: [{ state: 'frozen', ySplit: 4 }] });
                const headers = ['No.', 'Apellidos y Nombres', 'Grado y Sección', 'CUI (RENAP)', 'Código Personal', 'Tipo de Beca', 'Programa / Patrocinador', 'Acuerdo / Ref.', '% Asistencia', 'Promedio', 'Estado', 'Observaciones'];

                ws.mergeCells(1, 1, 1, headers.length);
                ws.getCell(1, 1).value = `ESCUELA NACIONAL DE CIENCIAS COMERCIALES — BECAS Y BOLSAS DE ESTUDIO (CICLO ${activeCycle})`;
                ws.getCell(1, 1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
                ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2B5C' } };
                ws.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
                ws.getRow(1).height = 24;

                const hdrRow = ws.getRow(4);
                headers.forEach((h, i) => {
                    const c = hdrRow.getCell(i + 1);
                    c.value = h;
                    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                });

                rows.forEach((r, idx) => {
                    const row = ws.addRow([
                        idx + 1, r.displayName, r.gradeLabel, r.cui || '—', r.personalCode || '—',
                        r.scholarship.type, r.scholarship.program || '', r.scholarship.agreementRef || '',
                        r.hasAtt ? `${r.attPct}%` : 'S/R', r.avg !== null ? r.avg : '—',
                        r.scholarship.status, r.scholarship.notes || ''
                    ]);
                    row.getCell(4).numFmt = '@';
                    row.getCell(5).numFmt = '@';
                });

                ws.columns.forEach((col, i) => {
                    col.width = i === 0 ? 6 : (i === 1 ? 34 : (i === 2 ? 22 : (i === 3 ? 18 : 18)));
                });

                const buffer = await wb.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filenameBase}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1500);
                if (typeof window.showToast === 'function') window.showToast(`Excel descargado: ${filenameBase}.xlsx`, 'success');
                return;
            } catch (e) {}
        }

        const csvEscape = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
        const lines = [['No.', 'Apellidos y Nombres', 'Grado y Sección', 'CUI', 'Código Personal', 'Tipo', 'Programa', 'Referencia', '% Asistencia', 'Promedio', 'Estado'].map(csvEscape).join(',')];
        rows.forEach((r, idx) => {
            lines.push([idx + 1, r.displayName, r.gradeLabel, r.cui ? `="${r.cui}"` : '—', r.personalCode || '—', r.scholarship.type, r.scholarship.program || '', r.scholarship.agreementRef || '', r.hasAtt ? `${r.attPct}%` : 'S/R', r.avg !== null ? r.avg : '—', r.scholarship.status].map(csvEscape).join(','));
        });
        const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenameBase}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    // Hook automático en openStudentProfileModal para actualizar siempre Beca + Documentos Faltantes en la Ficha
    const _origOpenStudentProfileModal = window.openStudentProfileModal;
    if (typeof _origOpenStudentProfileModal === 'function') {
        window.openStudentProfileModal = function (studentId, ...rest) {
            const res = _origOpenStudentProfileModal.apply(this, [studentId, ...rest]);
            try {
                const st = (window.STATE && Array.isArray(window.STATE.students))
                    ? window.STATE.students.find(s => s && String(s.id) === String(studentId))
                    : null;
                if (st) renderStudentProfileScholarshipAndDocsSummary(st);
            } catch (e) {}
            return res;
        };
    }

    window.SCHOLARSHIP_TYPES = SCHOLARSHIP_TYPES;
    window.getScholarshipActiveCycle = getScholarshipActiveCycle;
    window.canViewScholarships = canViewScholarships;
    window.canManageScholarships = canManageScholarships;
    window.getStudentScholarshipForCycle = getStudentScholarshipForCycle;
    window.getStudentMissingDocsSummary = getStudentMissingDocsSummary;
    window.saveStudentScholarshipForCycle = saveStudentScholarshipForCycle;
    window.removeStudentScholarshipForCycle = removeStudentScholarshipForCycle;
    window.buildScholarshipsDataset = buildScholarshipsDataset;
    window.renderScholarshipsView = renderScholarshipsView;
    window.setScholarshipsQuickFilter = setScholarshipsQuickFilter;
    window.setScholarshipsGradeFilter = setScholarshipsGradeFilter;
    window.setScholarshipsSearch = setScholarshipsSearch;
    window.openScholarshipAssignModal = openScholarshipAssignModal;
    window.submitScholarshipAssignForm = submitScholarshipAssignForm;
    window.confirmRemoveStudentScholarship = confirmRemoveStudentScholarship;
    window.renderStudentProfileScholarshipAndDocsSummary = renderStudentProfileScholarshipAndDocsSummary;
    window.printScholarshipsOfficialRoster = printScholarshipsOfficialRoster;
    window.printStudentScholarshipCertificate = printStudentScholarshipCertificate;
    window.exportScholarshipsExcel = exportScholarshipsExcel;
})(window, document);
