/**
 * ============================================================================
 * ENCCO JUTIAPA 1970 — MÓDULO: CONTROL DE PERMISOS DOCENTES
 * ============================================================================
 * - Encargado principal: Auxiliatura (`profesor_auxiliar`).
 * - Acceso exclusivo: Auxiliatura, Secretaría, Dirección y Super Admin.
 * - Oculto y bloqueado 100% para Maestros (`docente`) y Estudiantes.
 * - Diseño Azul Institucional, 100% responsivo automático (PC, Tablet, Celular).
 * - Impresión oficial en Hoja Oficio (8.5" × 13"):
 *     • Constancia Individual: Docente, Auxiliatura (Encargado), Vo.Bo. Dirección.
 *     • Expediente por Docente: Auxiliatura (Encargado), Vo.Bo. Dirección.
 *     • Reporte General: Auxiliatura (Encargado), Vo.Bo. Dirección.
 *   (Secretaría NO firma en ninguno de los formatos.)
 * - Persistencia dual granular: Firebase RTDB + Firestore + respaldo local.
 */
(function (window, document) {
    'use strict';

    const LOCAL_STORAGE_KEY = 'ENCCO_TEACHER_PERMISSIONS_V1';
    const ALLOWED_ROLES = [
        'admin', 'super_usuario', 'superadmin',
        'director', 'direccion', 'directora',
        'secretaria', 'secretario', 'secretaria_auxiliar',
        'profesor_auxiliar', 'auxiliar', 'auxiliatura'
    ];
    const BLOCKED_ROLES = ['docente', 'catedratico', 'maestro', 'estudiante', 'alumno', 'guest', 'invitado'];

    const REASON_TYPES = [
        'IGSS / Médico',
        'Comisión Oficial / MINEDUC',
        'Asunto Personal',
        'Capacitación / Estudio',
        'Duelo / Fuerza Mayor',
        'Otro'
    ];

    const DURATION_OPTIONS = [
        'Día completo',
        'Media jornada',
        'Permiso por horas'
    ];

    const SUPPORT_DOC_OPTIONS = [
        'Con constancia / oficio',
        'Pendiente de constancia',
        'Autorización verbal Dirección'
    ];

    const MONTH_NAMES_ES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const VIEW_STATE = {
        mode: 'general', // 'general' | 'byTeacher'
        teacherFilter: 'ALL',
        typeFilter: 'ALL',
        monthFilter: 'ALL',
        search: '',
        cloudLoaded: false,
        cloudLoading: false,
        editingId: null
    };

    function _esc(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _notify(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type || 'info');
            return;
        }
        if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
            window.EnccoDialog.alert({ title: 'Permisos Docentes', message, type: type === 'error' ? 'danger' : (type || 'info') });
            return;
        }
        console.log('[Permisos Docentes]', message);
    }

    function getActiveCycleStr() {
        const st = window.STATE || {};
        return String(st.historicalViewingCycle || st.viewingHistoricalCycle || st.activeCycle || new Date().getFullYear()).trim();
    }

    function getCurrentRoleKey() {
        const st = window.STATE || {};
        return String(st.currentRole || (st.currentUser && st.currentUser.role) || '').toLowerCase().trim();
    }

    function canViewTeacherPermissions(roleOverride) {
        const role = String(roleOverride || getCurrentRoleKey()).toLowerCase().trim();
        if (!role || BLOCKED_ROLES.includes(role)) return false;
        if (typeof window.isSuperUserRole === 'function' && window.isSuperUserRole(role)) return true;
        if (typeof window.isDirectorRole === 'function' && window.isDirectorRole(role)) return true;
        if (typeof window.hasRolePermission === 'function') {
            return !!window.hasRolePermission('teacher-permissions', role);
        }
        return ALLOWED_ROLES.includes(role);
    }

    function canManageTeacherPermissions(roleOverride) {
        const st = window.STATE || {};
        if (st.isHistoricalReadOnlyMode) return false;
        const role = String(roleOverride || getCurrentRoleKey()).toLowerCase().trim();
        if (!role || BLOCKED_ROLES.includes(role)) return false;
        if (typeof window.isSuperUserRole === 'function' && window.isSuperUserRole(role)) return true;
        if (typeof window.isDirectorRole === 'function' && window.isDirectorRole(role)) return true;
        if (typeof window.canRoleModify === 'function') {
            return !!window.canRoleModify('teacher-permissions', role);
        }
        if (typeof window.getModulePermissionLevel === 'function') {
            return window.getModulePermissionLevel('teacher-permissions', role) === 'edit';
        }
        return ALLOWED_ROLES.includes(role);
    }

    function _todayISO() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function _calcInclusiveDays(startDate, endDate) {
        if (!startDate) return 1;
        const s = new Date(startDate + 'T00:00:00');
        const e = new Date((endDate || startDate) + 'T00:00:00');
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
        const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
        return Math.max(1, diff);
    }

    function _formatDateShort(iso) {
        if (!iso || typeof iso !== 'string') return '—';
        const parts = iso.split('-');
        if (parts.length !== 3) return iso;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function _getTeacherCatalog() {
        const st = window.STATE || {};
        const users = Array.isArray(st.users) ? st.users : [];
        const list = [];
        const seen = new Set();

        users.forEach(u => {
            if (!u || typeof u !== 'object') return;
            if (typeof window.isAdminOrSystemUser === 'function' && window.isAdminOrSystemUser(u)) return;
            if (u.isSystemOnly) return;
            const role = String(u.role || '').toLowerCase().trim();
            if (['admin', 'super_usuario', 'superadmin', 'super_admin', 'administrador', 'estudiante', 'alumno', 'guest'].includes(role)) return;
            if (u.id === 'usr-aux-01' || u.id === 'usr-admin-01' || u.id === 'usr-admin-ennco') return;
            if (u.active === false || String(u.status || '').toLowerCase() === 'inactivo') return;
            const name = String(u.name || u.fullName || '').trim();
            if (!name) return;
            const id = String(u.id || u.username || name).trim();
            if (seen.has(id)) return;
            seen.add(id);

            const renglonRaw = String(u.renglon || u.budgetLine || u.contractType || '').trim();
            list.push({
                id,
                name,
                renglon: renglonRaw || 'Personal Docente',
                role
            });
        });

        list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        return list;
    }

    function _getPermissionsArray() {
        const st = window.STATE || (window.STATE = {});
        if (!Array.isArray(st.teacherPermissions)) {
            st.teacherPermissions = [];
            try {
                const raw = window.localStorage && window.localStorage.getItem(LOCAL_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) st.teacherPermissions = parsed;
                }
            } catch (e) {}
        }
        return st.teacherPermissions;
    }

    function _saveLocalCache(list) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list || []));
            }
        } catch (e) {}
    }

    function _getRtdbBaseUrl() {
        if (typeof window.getFirebaseDatabaseUrl === 'function') {
            const url = window.getFirebaseDatabaseUrl();
            if (url) return url.replace(/\/+$/, '');
        }
        if (typeof window.ENCCO_OFFICIAL_FIREBASE_URL === 'string' && window.ENCCO_OFFICIAL_FIREBASE_URL) {
            return window.ENCCO_OFFICIAL_FIREBASE_URL.replace(/\/+$/, '');
        }
        return '';
    }

    function _normalizeRecord(rec, fallbackId) {
        if (!rec || typeof rec !== 'object') return null;
        const id = String(rec.id || fallbackId || ('TP_' + Date.now())).trim();
        const startDate = String(rec.startDate || rec.date || _todayISO()).trim();
        const endDate = String(rec.endDate || startDate).trim();
        const type = String(rec.type || 'Asunto Personal').trim();
        const customType = type === 'Otro' ? String(rec.customType || '').trim() : '';
        const supportDoc = String(rec.supportDoc || rec.status || 'Con constancia / oficio').trim();
        return {
            id,
            cycle: String(rec.cycle || getActiveCycleStr()).trim(),
            teacherId: String(rec.teacherId || rec.teacherName || '').trim(),
            teacherName: String(rec.teacherName || 'Docente sin nombre').trim(),
            renglon: String(rec.renglon || 'Personal Docente').trim(),
            startDate,
            endDate: endDate < startDate ? startDate : endDate,
            days: _calcInclusiveDays(startDate, endDate < startDate ? startDate : endDate),
            duration: String(rec.duration || 'Día completo').trim(),
            type,
            customType,
            reason: String(rec.reason || '').trim(),
            supportDoc,
            createdBy: String(rec.createdBy || 'Auxiliatura ENCCO').trim(),
            createdByRole: String(rec.createdByRole || 'profesor_auxiliar').trim(),
            createdAt: rec.createdAt || new Date().toISOString(),
            updatedAt: rec.updatedAt || new Date().toISOString()
        };
    }

    async function ensureTeacherPermissionsLoadedOnDemand(forceReload) {
        if (!canViewTeacherPermissions()) return false;
        if (VIEW_STATE.cloudLoading) return false;
        if (VIEW_STATE.cloudLoaded && !forceReload) return false;

        VIEW_STATE.cloudLoading = true;
        let loadedAny = false;
        try {
            const baseUrl = _getRtdbBaseUrl();
            const mergedMap = new Map();
            _getPermissionsArray().forEach(r => {
                const norm = _normalizeRecord(r);
                if (norm) mergedMap.set(norm.id, norm);
            });

            if (baseUrl) {
                try {
                    const resp = await fetch(`${baseUrl}/encc_school_state/teacherPermissions.json`);
                    if (resp && resp.ok) {
                        const data = await resp.json();
                        if (data && typeof data === 'object') {
                            const entries = Array.isArray(data)
                                ? data.map((v, i) => [v && v.id ? v.id : ('TP_' + i), v])
                                : Object.entries(data);
                            entries.forEach(([k, v]) => {
                                const norm = _normalizeRecord(v, k);
                                if (norm) {
                                    mergedMap.set(norm.id, norm);
                                    loadedAny = true;
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.warn('[Permisos Docentes] RTDB pull omitido:', err && err.message ? err.message : err);
                }
            }

            // Respaldo complementario desde Firestore si está disponible
            if (window.firebase && typeof window.firebase.firestore === 'function') {
                try {
                    const snap = await window.firebase.firestore().collection('teacherPermissions').get();
                    if (snap && !snap.empty) {
                        snap.forEach(doc => {
                            const norm = _normalizeRecord(doc.data(), doc.id);
                            if (norm && !mergedMap.has(norm.id)) {
                                mergedMap.set(norm.id, norm);
                                loadedAny = true;
                            }
                        });
                    }
                } catch (fsErr) {
                    // Silencioso si no hay sesión Firestore activa todavía
                }
            }

            const sorted = Array.from(mergedMap.values()).sort((a, b) => {
                const cmp = String(b.startDate || '').localeCompare(String(a.startDate || ''));
                if (cmp !== 0) return cmp;
                return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
            });
            window.STATE.teacherPermissions = sorted;
            _saveLocalCache(sorted);
            VIEW_STATE.cloudLoaded = true;
        } finally {
            VIEW_STATE.cloudLoading = false;
        }
        return loadedAny;
    }

    async function _persistRecordToCloud(record) {
        const baseUrl = _getRtdbBaseUrl();
        const tasks = [];

        if (baseUrl) {
            tasks.push(
                fetch(`${baseUrl}/encc_school_state/teacherPermissions/${encodeURIComponent(record.id)}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                }).catch(e => console.warn('[Permisos Docentes] Error guardando en RTDB:', e))
            );
        }

        if (window.firebase && typeof window.firebase.firestore === 'function') {
            tasks.push(
                window.firebase.firestore()
                    .collection('teacherPermissions')
                    .doc(record.id)
                    .set(record, { merge: true })
                    .catch(e => console.warn('[Permisos Docentes] Error guardando en Firestore:', e))
            );
        }

        await Promise.all(tasks);
    }

    async function _deleteRecordFromCloud(id) {
        const baseUrl = _getRtdbBaseUrl();
        const tasks = [];

        if (baseUrl) {
            tasks.push(
                fetch(`${baseUrl}/encc_school_state/teacherPermissions/${encodeURIComponent(id)}.json`, {
                    method: 'DELETE'
                }).catch(e => console.warn('[Permisos Docentes] Error eliminando en RTDB:', e))
            );
        }

        if (window.firebase && typeof window.firebase.firestore === 'function') {
            tasks.push(
                window.firebase.firestore()
                    .collection('teacherPermissions')
                    .doc(id)
                    .delete()
                    .catch(e => console.warn('[Permisos Docentes] Error eliminando en Firestore:', e))
            );
        }

        await Promise.all(tasks);
    }

    function _getCycleRecords() {
        const cycle = getActiveCycleStr();
        return _getPermissionsArray().filter(r => r && String(r.cycle || cycle).trim() === cycle);
    }

    function _getFilteredRecords() {
        const cycleRecords = _getCycleRecords();
        const q = String(VIEW_STATE.search || '').toLowerCase().trim();

        return cycleRecords.filter(r => {
            if (VIEW_STATE.teacherFilter !== 'ALL' && r.teacherId !== VIEW_STATE.teacherFilter && r.teacherName !== VIEW_STATE.teacherFilter) {
                return false;
            }
            if (VIEW_STATE.typeFilter !== 'ALL' && r.type !== VIEW_STATE.typeFilter) {
                return false;
            }
            if (VIEW_STATE.monthFilter !== 'ALL') {
                const m = String(r.startDate || '').slice(5, 7);
                if (m !== VIEW_STATE.monthFilter) return false;
            }
            if (q) {
                const hay = `${r.teacherName} ${r.renglon} ${r.type} ${r.customType} ${r.reason} ${r.supportDoc} ${r.startDate}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }

    function _typeBadgeClass(type) {
        const t = String(type || '');
        if (t.includes('IGSS')) return 'tp-b-igss';
        if (t.includes('Comisión')) return 'tp-b-mineduc';
        if (t.includes('Capacitación')) return 'tp-b-cap';
        if (t.includes('Duelo')) return 'tp-b-duelo';
        if (t === 'Otro') return 'tp-b-otro';
        return 'tp-b-pers';
    }

    function _supportBadgeClass(doc) {
        const s = String(doc || '').toLowerCase();
        if (s.includes('pendiente')) return 'tp-b-pend';
        if (s.includes('verbal')) return 'tp-b-verbal';
        return 'tp-b-ok';
    }

    function _displayTypeLabel(r) {
        if (r.type === 'Otro' && r.customType) return `Otro: ${r.customType}`;
        return r.type || 'Sin especificar';
    }

    function renderTeacherPermissionsView() {
        const container = document.getElementById('view-teacher-permissions');
        if (!container) return;

        // Bloqueo estricto RBAC (oculta y protege contra acceso directo de docentes)
        if (!canViewTeacherPermissions()) {
            container.innerHTML = `
                <div class="tp-blocked-card">
                    <i class="fa-solid fa-shield-halved"></i>
                    <h3>Acceso Restringido</h3>
                    <p>El módulo <strong>Control de Permisos Docentes</strong> es exclusivo para <strong>Auxiliatura (Encargado)</strong>, <strong>Secretaría</strong> y <strong>Dirección</strong>.</p>
                </div>`;
            return;
        }

        const cycle = getActiveCycleStr();
        const canEdit = canManageTeacherPermissions();
        const allCycle = _getCycleRecords();
        const filtered = _getFilteredRecords();
        const teachersCatalog = _getTeacherCatalog();

        // KPIs del ciclo activo
        const totalPerms = allCycle.length;
        const totalDays = allCycle.reduce((s, r) => s + (Number(r.days) || 1), 0);
        const withConstancia = allCycle.filter(r => !String(r.supportDoc || '').toLowerCase().includes('pendiente')).length;
        const pendingConstancia = totalPerms - withConstancia;

        // Lista de docentes para el filtro (catálogo + cualquier docente con registro histórico)
        const teacherOptionsMap = new Map();
        teachersCatalog.forEach(t => teacherOptionsMap.set(t.id, t.name));
        allCycle.forEach(r => {
            if (r.teacherId && !teacherOptionsMap.has(r.teacherId)) {
                teacherOptionsMap.set(r.teacherId, r.teacherName);
            }
        });
        const teacherFilterOptions = Array.from(teacherOptionsMap.entries())
            .sort((a, b) => a[1].localeCompare(b[1], 'es'))
            .map(([id, name]) => `<option value="${_esc(id)}" ${VIEW_STATE.teacherFilter === id ? 'selected' : ''}>${_esc(name)}</option>`)
            .join('');

        const typeFilterOptions = REASON_TYPES
            .map(t => `<option value="${_esc(t)}" ${VIEW_STATE.typeFilter === t ? 'selected' : ''}>${_esc(t)}</option>`)
            .join('');

        const monthFilterOptions = MONTH_NAMES_ES
            .map((mName, idx) => {
                const mVal = String(idx + 1).padStart(2, '0');
                return `<option value="${mVal}" ${VIEW_STATE.monthFilter === mVal ? 'selected' : ''}>${mName}</option>`;
            }).join('');

        // Vista 1: Tabla General (auto-responsiva a tarjetas en celular via CSS @media)
        const rowsHtml = filtered.length === 0
            ? `<tr><td colspan="6" class="tp-empty-cell"><i class="fa-solid fa-folder-open"></i> No hay permisos docentes registrados con los filtros actuales para el ciclo ${_esc(cycle)}.</td></tr>`
            : filtered.map(r => {
                const fechaTxt = r.startDate === r.endDate
                    ? _formatDateShort(r.startDate)
                    : `${_formatDateShort(r.startDate)} al ${_formatDateShort(r.endDate)} (${r.days}d)`;
                const typeLabel = _displayTypeLabel(r);
                return `
                    <tr>
                        <td data-label="Fecha">
                            <div class="tp-cell-stack">
                                <strong>${_esc(fechaTxt)}</strong>
                                <span class="tp-sub-accent">${_esc(r.duration)}</span>
                            </div>
                        </td>
                        <td data-label="Docente">
                            <div class="tp-cell-stack">
                                <strong class="tp-teacher-name">${_esc(r.teacherName)}</strong>
                                <span class="tp-sub-muted">${_esc(r.renglon)}</span>
                            </div>
                        </td>
                        <td data-label="Motivo">
                            <span class="tp-badge ${_typeBadgeClass(r.type)}">${_esc(typeLabel)}</span>
                        </td>
                        <td data-label="Justificación" class="tp-reason-cell">
                            ${_esc(r.reason)}
                        </td>
                        <td data-label="Estado" class="tp-center-cell">
                            <span class="tp-badge ${_supportBadgeClass(r.supportDoc)}">${_esc(r.supportDoc)}</span>
                        </td>
                        <td data-label="Acciones" class="tp-center-cell">
                            <div class="tp-row-actions">
                                <button type="button" class="tp-ibtn" title="Imprimir constancia individual" onclick="printSingleTeacherPermission('${_esc(r.id)}')">
                                    <i class="fa-solid fa-file-lines"></i>
                                </button>
                                <button type="button" class="tp-ibtn" title="Imprimir expediente del docente" onclick="printTeacherPermissionsByTeacher('${_esc(r.teacherId)}')">
                                    <i class="fa-solid fa-user-check"></i>
                                </button>
                                ${canEdit ? `
                                    <button type="button" class="tp-ibtn" title="Editar permiso" onclick="openTeacherPermissionModal('${_esc(r.id)}')">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button type="button" class="tp-ibtn tp-ibtn-danger" title="Eliminar permiso" onclick="deleteTeacherPermission('${_esc(r.id)}')">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>`;
            }).join('');

        // Vista 2: Agrupado por Docente
        const groupedMap = new Map();
        filtered.forEach(r => {
            const key = r.teacherId || r.teacherName;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    teacherId: key,
                    teacherName: r.teacherName,
                    renglon: r.renglon,
                    items: []
                });
            }
            groupedMap.get(key).items.push(r);
        });
        const groupedList = Array.from(groupedMap.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'es'));

        const teacherCardsHtml = groupedList.length === 0
            ? `<div class="tp-empty-box"><i class="fa-solid fa-user-tie"></i> No hay expedientes de permisos docentes para mostrar con los filtros actuales.</div>`
            : groupedList.map(g => {
                const days = g.items.reduce((s, x) => s + (Number(x.days) || 1), 0);
                const pend = g.items.filter(x => String(x.supportDoc || '').toLowerCase().includes('pendiente')).length;
                const itemsHtml = g.items.map(i => `
                    <div class="tp-t-item">
                        <div class="tp-t-item-top">
                            <strong>${_esc(_formatDateShort(i.startDate))}${i.endDate !== i.startDate ? ' – ' + _esc(_formatDateShort(i.endDate)) : ''}</strong>
                            <span class="tp-badge ${_typeBadgeClass(i.type)}">${_esc(_displayTypeLabel(i))}</span>
                        </div>
                        <div class="tp-t-item-reason">${_esc(i.reason)}</div>
                    </div>`).join('');
                return `
                    <div class="tp-t-card">
                        <div class="tp-t-head">
                            <div>
                                <strong class="tp-teacher-name">${_esc(g.teacherName)}</strong>
                                <div class="tp-sub-accent">${_esc(g.renglon)}</div>
                            </div>
                            <button type="button" class="tp-btn tp-btn-main tp-btn-sm" onclick="printTeacherPermissionsByTeacher('${_esc(g.teacherId)}')">
                                <i class="fa-solid fa-print"></i> Imprimir
                            </button>
                        </div>
                        <div class="tp-t-body">
                            <div class="tp-t-stats">
                                <div class="tp-t-stat"><strong>${g.items.length}</strong><span>Permisos</span></div>
                                <div class="tp-t-stat"><strong>${days}</strong><span>Días</span></div>
                                <div class="tp-t-stat"><strong style="color:${pend ? '#ea580c' : '#16a34a'};">${pend}</strong><span>Pendientes</span></div>
                            </div>
                            <div class="tp-t-list">${itemsHtml}</div>
                        </div>
                    </div>`;
            }).join('');

        container.innerHTML = `
            <div class="tp-shell">
                <div class="tp-rbac-strip">
                    <div class="tp-rbac-left">
                        <span class="tp-rbac-badge"><i class="fa-solid fa-user-shield"></i> Encargado: Auxiliatura</span>
                        <span>Control de Permisos Docentes — Ciclo ${_esc(cycle)} (Auxiliatura, Secretaría y Dirección)</span>
                    </div>
                    <span class="tp-rbac-note"><i class="fa-solid fa-eye-slash"></i> Oculto para Maestros</span>
                </div>

                <div class="tp-ctrl-card">
                    <div class="tp-row-1">
                        <div class="tp-kpi-pills">
                            <span class="tp-kp"><i class="fa-solid fa-clipboard-list"></i> ${totalPerms} Permisos</span>
                            <span class="tp-kp"><i class="fa-solid fa-calendar-day"></i> ${totalDays} Días</span>
                            <span class="tp-kp tp-kp-ok"><i class="fa-solid fa-file-circle-check"></i> ${withConstancia} Respaldados</span>
                            <span class="tp-kp tp-kp-warn"><i class="fa-solid fa-clock"></i> ${pendingConstancia} Pendientes</span>
                        </div>
                        <div class="tp-actions">
                            <button type="button" class="tp-btn tp-btn-ghost" onclick="exportTeacherPermissionsExcel()">
                                <i class="fa-solid fa-file-excel" style="color:#16a34a;"></i> Excel
                            </button>
                            <button type="button" class="tp-btn tp-btn-soft" onclick="printGeneralTeacherPermissionsReport()">
                                <i class="fa-solid fa-print" style="color:#0369a1;"></i> Reporte General
                            </button>
                            ${canEdit ? `
                                <button type="button" class="tp-btn tp-btn-main" onclick="openTeacherPermissionModal()">
                                    <i class="fa-solid fa-plus"></i> Registrar Permiso
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="tp-row-2">
                        <div class="tp-seg-group" role="tablist" aria-label="Vista de permisos docentes">
                            <button type="button" class="tp-seg-btn ${VIEW_STATE.mode === 'general' ? 'active' : ''}" onclick="setTeacherPermissionsMode('general')">
                                <i class="fa-solid fa-table-list"></i> General
                            </button>
                            <button type="button" class="tp-seg-btn ${VIEW_STATE.mode === 'byTeacher' ? 'active' : ''}" onclick="setTeacherPermissionsMode('byTeacher')">
                                <i class="fa-solid fa-user-tie"></i> Por Docente
                            </button>
                        </div>

                        <div class="tp-filters">
                            <select class="tp-sel" aria-label="Filtrar por docente" onchange="updateTeacherPermissionsFilter('teacherFilter', this.value)">
                                <option value="ALL">Todos los Docentes</option>
                                ${teacherFilterOptions}
                            </select>
                            <select class="tp-sel" aria-label="Filtrar por motivo" onchange="updateTeacherPermissionsFilter('typeFilter', this.value)">
                                <option value="ALL">Todos los Motivos</option>
                                ${typeFilterOptions}
                            </select>
                            <select class="tp-sel" aria-label="Filtrar por mes" onchange="updateTeacherPermissionsFilter('monthFilter', this.value)">
                                <option value="ALL">Todos los Meses</option>
                                ${monthFilterOptions}
                            </select>
                            <div class="tp-search-wrap">
                                <i class="fa-solid fa-magnifying-glass"></i>
                                <input type="text" class="tp-inp" placeholder="Buscar docente o motivo..." value="${_esc(VIEW_STATE.search)}" oninput="updateTeacherPermissionsFilter('search', this.value)">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tp-table-card" style="display:${VIEW_STATE.mode === 'general' ? 'block' : 'none'};">
                    <table class="tp-table">
                        <thead>
                            <tr>
                                <th style="width:135px;">Fecha(s)</th>
                                <th style="width:225px;">Docente / Renglón</th>
                                <th style="width:175px;">Motivo</th>
                                <th>Justificación</th>
                                <th style="width:155px; text-align:center;">Respaldo</th>
                                <th style="width:140px; text-align:center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>

                <div class="tp-teachers-grid" style="display:${VIEW_STATE.mode === 'byTeacher' ? 'grid' : 'none'};">
                    ${teacherCardsHtml}
                </div>
            </div>
        `;
    }

    function setTeacherPermissionsMode(mode) {
        VIEW_STATE.mode = mode === 'byTeacher' ? 'byTeacher' : 'general';
        renderTeacherPermissionsView();
    }

    function updateTeacherPermissionsFilter(key, value) {
        if (key in VIEW_STATE) {
            VIEW_STATE[key] = value;
            renderTeacherPermissionsView();
        }
    }

    function _ensureModalHost() {
        let host = document.getElementById('tpModalOverlay');
        if (!host) {
            host = document.createElement('div');
            host.id = 'tpModalOverlay';
            host.className = 'tp-modal-bg';
            host.addEventListener('click', function (ev) {
                if (ev.target === host) closeTeacherPermissionModal();
            });
            document.body.appendChild(host);
        }
        return host;
    }

    function openTeacherPermissionModal(editId) {
        if (!canManageTeacherPermissions()) {
            _notify('No tienes permisos para registrar o editar permisos docentes.', 'error');
            return;
        }
        const existing = editId ? _getPermissionsArray().find(r => r && r.id === editId) : null;
        VIEW_STATE.editingId = existing ? existing.id : null;

        const teachers = _getTeacherCatalog();
        const st = window.STATE || {};
        const currentUserName = (st.currentUser && (st.currentUser.name || st.currentUser.username)) || 'Auxiliatura ENCCO';

        let teacherOpts = teachers.map(t => {
            const sel = existing && (existing.teacherId === t.id || existing.teacherName === t.name) ? 'selected' : '';
            return `<option value="${_esc(t.id)}" data-name="${_esc(t.name)}" data-renglon="${_esc(t.renglon)}" ${sel}>${_esc(t.name)}${t.renglon ? ' (' + _esc(t.renglon) + ')' : ''}</option>`;
        }).join('');

        if (existing && !teachers.some(t => t.id === existing.teacherId || t.name === existing.teacherName)) {
            teacherOpts = `<option value="${_esc(existing.teacherId)}" data-name="${_esc(existing.teacherName)}" data-renglon="${_esc(existing.renglon)}" selected>${_esc(existing.teacherName)}</option>` + teacherOpts;
        }

        const today = _todayISO();
        const startVal = existing ? existing.startDate : today;
        const endVal = existing ? existing.endDate : today;
        const typeVal = existing ? existing.type : REASON_TYPES[0];
        const customTypeVal = existing ? (existing.customType || '') : '';
        const durationVal = existing ? existing.duration : DURATION_OPTIONS[0];
        const reasonVal = existing ? existing.reason : '';
        const docVal = existing ? existing.supportDoc : SUPPORT_DOC_OPTIONS[0];

        const host = _ensureModalHost();
        host.innerHTML = `
            <div class="tp-modal" role="dialog" aria-modal="true" aria-labelledby="tpModalTitle">
                <div class="tp-modal-head">
                    <h3 id="tpModalTitle">
                        <i class="fa-solid ${existing ? 'fa-pen-to-square' : 'fa-file-circle-plus'}"></i>
                        ${existing ? 'Editar Permiso Docente' : 'Registrar Permiso Docente'}
                    </h3>
                    <button type="button" class="tp-modal-close" onclick="closeTeacherPermissionModal()" aria-label="Cerrar">&times;</button>
                </div>
                <form id="tpPermForm" onsubmit="saveTeacherPermissionForm(event)">
                    <div class="tp-modal-body">
                        <div>
                            <label for="tpTeacherSel">Catedrático / Docente *</label>
                            <select id="tpTeacherSel" required>
                                ${teacherOpts || '<option value="">No hay docentes registrados</option>'}
                            </select>
                        </div>

                        <div class="tp-fgrid-2">
                            <div>
                                <label for="tpStartDate">Fecha Inicio *</label>
                                <input type="date" id="tpStartDate" value="${_esc(startVal)}" required onchange="syncTeacherPermEndDate()">
                            </div>
                            <div>
                                <label for="tpEndDate">Fecha Fin *</label>
                                <input type="date" id="tpEndDate" value="${_esc(endVal)}" required>
                            </div>
                        </div>

                        <div class="tp-fgrid-2">
                            <div>
                                <label for="tpReasonType">Motivo / Tipo de Permiso *</label>
                                <select id="tpReasonType" required onchange="toggleTeacherPermOtherReason()">
                                    ${REASON_TYPES.map(t => `<option value="${_esc(t)}" ${typeVal === t ? 'selected' : ''}>${_esc(t === 'Otro' ? 'Otro (especificar)' : t)}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="tpDuration">Jornada / Duración</label>
                                <select id="tpDuration">
                                    ${DURATION_OPTIONS.map(d => `<option value="${_esc(d)}" ${durationVal === d ? 'selected' : ''}>${_esc(d)}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div id="tpOtherReasonWrap" class="tp-other-box" style="display:${typeVal === 'Otro' ? 'block' : 'none'};">
                            <label for="tpCustomType"><i class="fa-solid fa-pen"></i> Especifique el motivo del permiso *</label>
                            <input type="text" id="tpCustomType" value="${_esc(customTypeVal)}" placeholder="Ej. Diligencia judicial, examen universitario, actividad sindical..." ${typeVal === 'Otro' ? 'required' : ''}>
                        </div>

                        <div>
                            <label for="tpReasonText">Justificación / Observaciones *</label>
                            <textarea id="tpReasonText" rows="3" required placeholder="Detalle de la justificación, número de constancia u oficio...">${_esc(reasonVal)}</textarea>
                        </div>

                        <div class="tp-fgrid-2">
                            <div>
                                <label for="tpSupportDoc">Documento de Respaldo</label>
                                <select id="tpSupportDoc">
                                    ${SUPPORT_DOC_OPTIONS.map(o => `<option value="${_esc(o)}" ${docVal === o ? 'selected' : ''}>${_esc(o)}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label>Registrado por (Encargado)</label>
                                <input type="text" value="${_esc(existing ? existing.createdBy : currentUserName)}" readonly class="tp-readonly">
                            </div>
                        </div>
                    </div>
                    <div class="tp-modal-foot">
                        <button type="button" class="tp-btn tp-btn-ghost" onclick="closeTeacherPermissionModal()">Cancelar</button>
                        <button type="submit" class="tp-btn tp-btn-main">
                            <i class="fa-solid fa-floppy-disk"></i> ${existing ? 'Guardar Cambios' : 'Guardar Permiso'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        host.classList.add('open');
    }

    function closeTeacherPermissionModal() {
        const host = document.getElementById('tpModalOverlay');
        if (host) host.classList.remove('open');
        VIEW_STATE.editingId = null;
    }

    function syncTeacherPermEndDate() {
        const startEl = document.getElementById('tpStartDate');
        const endEl = document.getElementById('tpEndDate');
        if (startEl && endEl && (!endEl.value || endEl.value < startEl.value)) {
            endEl.value = startEl.value;
        }
    }

    function toggleTeacherPermOtherReason() {
        const typeEl = document.getElementById('tpReasonType');
        const wrap = document.getElementById('tpOtherReasonWrap');
        const input = document.getElementById('tpCustomType');
        if (!typeEl || !wrap || !input) return;
        const isOther = typeEl.value === 'Otro';
        wrap.style.display = isOther ? 'block' : 'none';
        input.required = isOther;
        if (isOther) input.focus();
    }

    async function saveTeacherPermissionForm(ev) {
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        if (!canManageTeacherPermissions()) return;

        const sel = document.getElementById('tpTeacherSel');
        const opt = sel && sel.options[sel.selectedIndex];
        const teacherId = sel ? String(sel.value || '').trim() : '';
        const teacherName = opt ? String(opt.getAttribute('data-name') || opt.textContent || '').trim() : '';
        const renglon = opt ? String(opt.getAttribute('data-renglon') || 'Personal Docente').trim() : 'Personal Docente';

        const startDate = String(document.getElementById('tpStartDate').value || '').trim();
        let endDate = String(document.getElementById('tpEndDate').value || startDate).trim();
        if (endDate < startDate) endDate = startDate;

        const type = String(document.getElementById('tpReasonType').value || '').trim();
        const customType = type === 'Otro' ? String(document.getElementById('tpCustomType').value || '').trim() : '';
        const duration = String(document.getElementById('tpDuration').value || 'Día completo').trim();
        const reason = String(document.getElementById('tpReasonText').value || '').trim();
        const supportDoc = String(document.getElementById('tpSupportDoc').value || SUPPORT_DOC_OPTIONS[0]).trim();

        if (!teacherId || !teacherName) {
            _notify('Seleccione un catedrático válido.', 'warning');
            return;
        }
        if (type === 'Otro' && !customType) {
            _notify('Por favor especifique el motivo del permiso.', 'warning');
            return;
        }
        if (!reason) {
            _notify('Ingrese la justificación del permiso.', 'warning');
            return;
        }

        const list = _getPermissionsArray();
        const st = window.STATE || {};
        const currentUserName = (st.currentUser && (st.currentUser.name || st.currentUser.username)) || 'Auxiliatura ENCCO';
        const nowIso = new Date().toISOString();
        const isEdit = !!VIEW_STATE.editingId;
        const existingIdx = isEdit ? list.findIndex(r => r && r.id === VIEW_STATE.editingId) : -1;
        const prev = existingIdx >= 0 ? list[existingIdx] : null;

        const record = _normalizeRecord({
            id: prev ? prev.id : ('TP_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6).toUpperCase()),
            cycle: prev ? prev.cycle : getActiveCycleStr(),
            teacherId,
            teacherName,
            renglon,
            startDate,
            endDate,
            duration,
            type,
            customType,
            reason,
            supportDoc,
            createdBy: prev ? prev.createdBy : currentUserName,
            createdByRole: prev ? prev.createdByRole : getCurrentRoleKey(),
            createdAt: prev ? prev.createdAt : nowIso,
            updatedAt: nowIso
        });

        if (existingIdx >= 0) {
            list[existingIdx] = record;
        } else {
            list.unshift(record);
        }

        list.sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
        _saveLocalCache(list);
        closeTeacherPermissionModal();
        renderTeacherPermissionsView();

        await _persistRecordToCloud(record);

        if (typeof window.logAuditAction === 'function') {
            try {
                window.logAuditAction(
                    isEdit ? 'EDIT_TEACHER_PERMISSION' : 'CREATE_TEACHER_PERMISSION',
                    `Permiso docente (${record.teacherName} • ${_displayTypeLabel(record)} • ${record.startDate})`
                );
            } catch (e) {}
        }
        _notify(isEdit ? 'Permiso docente actualizado correctamente.' : 'Permiso docente registrado correctamente.', 'success');
    }

    async function deleteTeacherPermission(id) {
        if (!canManageTeacherPermissions()) return;
        const list = _getPermissionsArray();
        const rec = list.find(r => r && r.id === id);
        if (!rec) return;

        let confirmed = false;
        if (window.EnccoDialog && typeof window.EnccoDialog.confirm === 'function') {
            confirmed = await window.EnccoDialog.confirm({
                title: 'Eliminar Permiso Docente',
                message: `¿Deseas eliminar el permiso de ${rec.teacherName} (${_formatDateShort(rec.startDate)})? Esta acción no se puede deshacer.`,
                confirmText: 'Sí, eliminar',
                type: 'danger'
            });
        } else {
            confirmed = window.confirm(`¿Eliminar el permiso de ${rec.teacherName} (${_formatDateShort(rec.startDate)})?`);
        }
        if (!confirmed) return;

        window.STATE.teacherPermissions = list.filter(r => r && r.id !== id);
        _saveLocalCache(window.STATE.teacherPermissions);
        renderTeacherPermissionsView();

        await _deleteRecordFromCloud(id);

        if (typeof window.logAuditAction === 'function') {
            try {
                window.logAuditAction('DELETE_TEACHER_PERMISSION', `Eliminado permiso docente (${rec.teacherName} • ${rec.startDate})`);
            } catch (e) {}
        }
        _notify('Permiso docente eliminado.', 'info');
    }

    // =========================================================================
    // IMPRESIÓN OFICIAL EN HOJA OFICIO (8.5" × 13") — SIN FIRMA DE SECRETARÍA
    // =========================================================================
    function _openOfficialPrintWindow(docTitle, bodyHtml) {
        const w = window.open('', '_blank', 'width=960,height=780');
        if (!w) {
            _notify('Habilite las ventanas emergentes para imprimir el documento oficial.', 'warning');
            return;
        }
        const cycle = getActiveCycleStr();
        const todayText = new Date().toLocaleDateString('es-GT', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        w.document.open();
        w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${_esc(docTitle)} — ENCCO Jutiapa</title>
<style>
  @page { size: 8.5in 13in; margin: 14mm 15mm; }
  * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
  body { margin: 0; color: #0f172a; font-size: 10.5pt; line-height: 1.45; }
  .doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0f2b5c; padding-bottom: 10px; margin-bottom: 14px; gap: 12px; }
  .doc-header img { width: 58px; height: 58px; object-fit: contain; }
  .doc-header-text { flex: 1; text-align: center; }
  .doc-header-text .inst { font-size: 9pt; font-weight: 800; color: #0369a1; letter-spacing: 0.04em; text-transform: uppercase; }
  .doc-header-text .title { font-size: 13pt; font-weight: 900; color: #0f2b5c; margin: 2px 0; text-transform: uppercase; }
  .doc-header-text .sub { font-size: 9pt; color: #475569; font-weight: 600; }
  .meta-bar { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 7px 12px; font-size: 9pt; color: #0f2b5c; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.2pt; margin-top: 8px; }
  th { background: #0f2b5c; color: #fff; padding: 7px 8px; text-align: left; font-size: 8.4pt; text-transform: uppercase; }
  td { padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .detail-grid { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .detail-grid th { width: 28%; background: #f0f9ff; color: #0f2b5c; border: 1px solid #cbd5e1; text-transform: none; font-size: 9.5pt; }
  .detail-grid td { background: #fff !important; font-size: 9.8pt; }
  .sigs { display: flex; justify-content: space-around; gap: 24px; margin-top: 56px; text-align: center; page-break-inside: avoid; }
  .sig-box { flex: 1; max-width: 240px; }
  .sig-line { border-top: 1.5px solid #0f2b5c; padding-top: 6px; font-size: 9.2pt; font-weight: 800; color: #0f2b5c; }
  .sig-sub { font-size: 8.2pt; color: #475569; }
  .print-toolbar { position: fixed; top: 10px; right: 10px; display: flex; gap: 8px; }
  .print-toolbar button { background: #0369a1; color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-weight: 700; cursor: pointer; }
  @media print { .print-toolbar { display: none; } }
</style>
</head>
<body>
  <div class="print-toolbar">
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
    <button style="background:#475569;" onclick="window.close()">Cerrar</button>
  </div>
  <div class="doc-header">
    <img src="logo_encco.png" alt="ENCCO" onerror="this.style.display='none'">
    <div class="doc-header-text">
      <div class="inst">Escuela Nacional de Ciencias Comerciales — ENCCO Jutiapa</div>
      <div class="title">${_esc(docTitle)}</div>
      <div class="sub">Control de Permisos Docentes • Ciclo Escolar ${_esc(cycle)} • Fecha de emisión: ${_esc(todayText)}</div>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`);
        w.document.close();
    }

    function printSingleTeacherPermission(id) {
        if (!canViewTeacherPermissions()) return;
        const r = _getPermissionsArray().find(x => x && x.id === id);
        if (!r) {
            _notify('No se encontró el registro del permiso.', 'warning');
            return;
        }
        const fechaTxt = r.startDate === r.endDate
            ? `${_formatDateShort(r.startDate)} (1 día)`
            : `Del ${_formatDateShort(r.startDate)} al ${_formatDateShort(r.endDate)} (${r.days} días)`;

        const bodyHtml = `
            <p style="margin:0 0 12px; text-align:justify;">
                Por medio de la presente se deja constancia oficial en el libro de <strong>Control de Permisos Docentes</strong> de la Escuela Nacional de Ciencias Comerciales de Jutiapa, del permiso registrado con los siguientes datos:
            </p>
            <table class="detail-grid">
                <tr><th>Correlativo de Registro</th><td><strong>${_esc(r.id)}</strong></td></tr>
                <tr><th>Catedrático / Docente</th><td><strong>${_esc(r.teacherName)}</strong> (${_esc(r.renglon)})</td></tr>
                <tr><th>Fecha(s) del Permiso</th><td>${_esc(fechaTxt)}</td></tr>
                <tr><th>Jornada / Duración</th><td>${_esc(r.duration)}</td></tr>
                <tr><th>Motivo / Clasificación</th><td><strong>${_esc(_displayTypeLabel(r))}</strong></td></tr>
                <tr><th>Justificación Detallada</th><td>${_esc(r.reason)}</td></tr>
                <tr><th>Documento de Respaldo</th><td>${_esc(r.supportDoc)}</td></tr>
                <tr><th>Registrado por</th><td>${_esc(r.createdBy)}</td></tr>
            </table>
            <div class="sigs">
                <div class="sig-box">
                    <div class="sig-line">Firma del Docente</div>
                    <div class="sig-sub">${_esc(r.teacherName)}</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">Auxiliatura</div>
                    <div class="sig-sub">Encargado de Control</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">Vo.Bo. Dirección General</div>
                    <div class="sig-sub">ENCCO Jutiapa</div>
                </div>
            </div>`;
        _openOfficialPrintWindow('Constancia Individual de Permiso Docente', bodyHtml);
    }

    function printTeacherPermissionsByTeacher(teacherId) {
        if (!canViewTeacherPermissions()) return;
        const items = _getCycleRecords().filter(r => r.teacherId === teacherId || r.teacherName === teacherId);
        if (items.length === 0) {
            _notify('Este docente no tiene permisos registrados en el ciclo activo.', 'info');
            return;
        }
        const teacherName = items[0].teacherName;
        const renglon = items[0].renglon;
        const totalDays = items.reduce((s, x) => s + (Number(x.days) || 1), 0);
        const pending = items.filter(x => String(x.supportDoc || '').toLowerCase().includes('pendiente')).length;

        const rowsHtml = items.map((r, idx) => `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${_esc(_formatDateShort(r.startDate))}${r.endDate !== r.startDate ? '<br>al ' + _esc(_formatDateShort(r.endDate)) : ''}<br><small>(${r.days}d • ${_esc(r.duration)})</small></td>
                <td><strong>${_esc(_displayTypeLabel(r))}</strong></td>
                <td>${_esc(r.reason)}</td>
                <td>${_esc(r.supportDoc)}</td>
            </tr>`).join('');

        const bodyHtml = `
            <div class="meta-bar">
                <span><strong>Docente:</strong> ${_esc(teacherName)} (${_esc(renglon)})</span>
                <span><strong>Total Permisos:</strong> ${items.length}</span>
                <span><strong>Días Acumulados:</strong> ${totalDays}</span>
                <span><strong>Pendientes de Constancia:</strong> ${pending}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:36px; text-align:center;">No.</th>
                        <th style="width:135px;">Fecha(s) / Jornada</th>
                        <th style="width:155px;">Motivo</th>
                        <th>Justificación</th>
                        <th style="width:135px;">Respaldo</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="sigs">
                <div class="sig-box">
                    <div class="sig-line">Auxiliatura</div>
                    <div class="sig-sub">Encargado de Control</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">Vo.Bo. Dirección General</div>
                    <div class="sig-sub">ENCCO Jutiapa</div>
                </div>
            </div>`;
        _openOfficialPrintWindow(`Expediente de Permisos Docentes — ${teacherName}`, bodyHtml);
    }

    function printGeneralTeacherPermissionsReport() {
        if (!canViewTeacherPermissions()) return;
        const list = _getFilteredRecords();
        if (list.length === 0) {
            _notify('No hay registros para imprimir con los filtros actuales.', 'info');
            return;
        }
        const totalDays = list.reduce((s, x) => s + (Number(x.days) || 1), 0);
        const pending = list.filter(x => String(x.supportDoc || '').toLowerCase().includes('pendiente')).length;
        const filterSummary = [
            VIEW_STATE.teacherFilter !== 'ALL' ? `Docente filtrado` : 'Todos los docentes',
            VIEW_STATE.typeFilter !== 'ALL' ? `Motivo: ${VIEW_STATE.typeFilter}` : 'Todos los motivos',
            VIEW_STATE.monthFilter !== 'ALL' ? `Mes: ${MONTH_NAMES_ES[Number(VIEW_STATE.monthFilter) - 1] || VIEW_STATE.monthFilter}` : 'Todo el ciclo'
        ].join(' • ');

        const rowsHtml = list.map((r, idx) => `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${_esc(_formatDateShort(r.startDate))}${r.endDate !== r.startDate ? '<br>al ' + _esc(_formatDateShort(r.endDate)) : ''}<br><small>(${r.days}d • ${_esc(r.duration)})</small></td>
                <td><strong>${_esc(r.teacherName)}</strong><br><small>${_esc(r.renglon)}</small></td>
                <td>${_esc(_displayTypeLabel(r))}</td>
                <td>${_esc(r.reason)}</td>
                <td>${_esc(r.supportDoc)}</td>
            </tr>`).join('');

        const bodyHtml = `
            <div class="meta-bar">
                <span><strong>Filtro:</strong> ${_esc(filterSummary)}</span>
                <span><strong>Registros:</strong> ${list.length}</span>
                <span><strong>Días Totales:</strong> ${totalDays}</span>
                <span><strong>Pendientes:</strong> ${pending}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:34px; text-align:center;">No.</th>
                        <th style="width:125px;">Fecha(s)</th>
                        <th style="width:185px;">Docente / Renglón</th>
                        <th style="width:140px;">Motivo</th>
                        <th>Justificación</th>
                        <th style="width:125px;">Respaldo</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="sigs">
                <div class="sig-box">
                    <div class="sig-line">Auxiliatura</div>
                    <div class="sig-sub">Encargado de Control</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">Vo.Bo. Dirección General</div>
                    <div class="sig-sub">ENCCO Jutiapa</div>
                </div>
            </div>`;
        _openOfficialPrintWindow('Reporte General de Permisos Docentes', bodyHtml);
    }

    function exportTeacherPermissionsExcel() {
        if (!canViewTeacherPermissions()) return;
        const list = _getFilteredRecords();
        if (list.length === 0) {
            _notify('No hay registros para exportar.', 'info');
            return;
        }
        const cycle = getActiveCycleStr();
        const rows = list.map((r, idx) => ({
            'No.': idx + 1,
            'Ciclo': r.cycle,
            'Fecha Inicio': _formatDateShort(r.startDate),
            'Fecha Fin': _formatDateShort(r.endDate),
            'Días': r.days,
            'Jornada': r.duration,
            'Docente': r.teacherName,
            'Renglón': r.renglon,
            'Motivo': _displayTypeLabel(r),
            'Justificación': r.reason,
            'Documento de Respaldo': r.supportDoc,
            'Registrado por': r.createdBy
        }));

        if (window.XLSX && window.XLSX.utils) {
            const ws = window.XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [
                { wch: 5 }, { wch: 8 }, { wch: 13 }, { wch: 13 }, { wch: 6 },
                { wch: 16 }, { wch: 32 }, { wch: 16 }, { wch: 24 }, { wch: 42 },
                { wch: 24 }, { wch: 24 }
            ];
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Permisos Docentes');
            window.XLSX.writeFile(wb, `Permisos_Docentes_ENCCO_${cycle}.xlsx`);
            _notify('Archivo Excel generado correctamente.', 'success');
            return;
        }

        // Respaldo CSV UTF-8 con BOM
        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map(obj => headers.map(h => `"${String(obj[h] == null ? '' : obj[h]).replace(/"/g, '""')}"`).join(','))
        ];
        const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Permisos_Docentes_ENCCO_${cycle}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        _notify('Archivo CSV exportado correctamente.', 'success');
    }

    // Exportar API global
    window.canViewTeacherPermissions = canViewTeacherPermissions;
    window.canManageTeacherPermissions = canManageTeacherPermissions;
    window.ensureTeacherPermissionsLoadedOnDemand = ensureTeacherPermissionsLoadedOnDemand;
    window.renderTeacherPermissionsView = renderTeacherPermissionsView;
    window.setTeacherPermissionsMode = setTeacherPermissionsMode;
    window.updateTeacherPermissionsFilter = updateTeacherPermissionsFilter;
    window.openTeacherPermissionModal = openTeacherPermissionModal;
    window.closeTeacherPermissionModal = closeTeacherPermissionModal;
    window.syncTeacherPermEndDate = syncTeacherPermEndDate;
    window.toggleTeacherPermOtherReason = toggleTeacherPermOtherReason;
    window.saveTeacherPermissionForm = saveTeacherPermissionForm;
    window.deleteTeacherPermission = deleteTeacherPermission;
    window.printSingleTeacherPermission = printSingleTeacherPermission;
    window.printTeacherPermissionsByTeacher = printTeacherPermissionsByTeacher;
    window.printGeneralTeacherPermissionsReport = printGeneralTeacherPermissionsReport;
    window.exportTeacherPermissionsExcel = exportTeacherPermissionsExcel;
})(window, document);
