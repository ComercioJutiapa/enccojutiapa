/**
 * ============================================================================
 * ENCCO JUTIAPA 1970 — AUDITORÍA DINÁMICA DE DOCUMENTOS DE EXPEDIENTE Y CUI
 * ============================================================================
 * Reporte interactivo, imprimible (Azul Institucional Oficio 8.5"x13") y
 * exportable a Excel (.xlsx) integrado en "Nómina y Expedientes de Alumnos".
 * Reutiliza OFFICIAL_EXPEDIENTE_DOCS y calculateStudentExpedienteMetrics
 * con aislamiento estricto multiciclo (2026 / 2027 / 2028+) y cero pérdida de datos.
 */
(function (window, document) {
    'use strict';

    const DOC_HEADER_TWO_LINE = {
        certificados_primaria: 'Cert.<br>Prim.',
        diploma_primaria: 'Dip.<br>Prim.',
        certificados_basico: 'Cert.<br>Bás.',
        diploma_basico: 'Dip.<br>Bás.',
        partida_nacimiento: 'Nac./<br>Pas.',
        dpi_encargado: 'DPI<br>Enc.'
    };

    const DOC_SHORT_LABELS = {
        certificados_primaria: 'Cert. Prim.',
        diploma_primaria: 'Dip. Prim.',
        certificados_basico: 'Cert. Bás.',
        diploma_basico: 'Dip. Bás.',
        partida_nacimiento: 'Nac./Pas.',
        dpi_encargado: 'DPI Enc.'
    };

    const AUDIT_STATE = {
        isOpen: false,
        scope: 'filtered',        // 'filtered' (grado/sección actuales) | 'all' (toda la escuela en ciclo activo)
        quickFilter: 'all',       // 'all' | 'incomplete' | 'cui_bad' | 'cui_dup' | 'no_code' | 'complete'
        missingDocKey: 'ALL'      // 'ALL' o key de OFFICIAL_EXPEDIENTE_DOCS
    };

    function _esc(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function injectDocsAuditResponsiveStyles() {
        if (typeof document === 'undefined' || !document.head) return;
        if (document.getElementById('student-docs-audit-responsive-styles')) return;
        const style = document.createElement('style');
        style.id = 'student-docs-audit-responsive-styles';
        style.textContent = `
            .docs-audit-shell {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                background: #ffffff;
                border: 1.5px solid #bae6fd;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 14px rgba(3, 105, 161, 0.08);
            }
            .docs-audit-header {
                background: linear-gradient(135deg, #0f2b5c 0%, #0369a1 65%, #0284c7 100%);
                color: #ffffff;
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .docs-audit-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }
            .docs-audit-actions button {
                min-height: 36px;
                white-space: nowrap;
            }
            .docs-audit-kpis {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 10px;
                padding: 12px 16px;
                background: #f0f9ff;
                border-bottom: 1px solid #bae6fd;
            }
            .docs-audit-kpi-card {
                background: #ffffff;
                border-radius: 8px;
                padding: 8px 10px;
                min-width: 0;
            }
            .docs-audit-toolbar {
                padding: 10px 16px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .docs-audit-chips {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                align-items: center;
                flex: 1 1 380px;
            }
            .docs-audit-chips button {
                min-height: 30px;
                transition: transform 0.12s ease, box-shadow 0.12s ease;
            }
            .docs-audit-selects {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }
            .docs-audit-selects select {
                height: 34px;
                padding: 0 10px;
                border-radius: 7px;
                border: 1px solid #cbd5e1;
                font-size: 0.78rem;
                font-weight: 700;
                color: #0f2b5c;
                background: #ffffff;
            }
            .docs-audit-table-wrap {
                width: 100%;
                max-width: 100%;
                max-height: 62vh;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
            }
            .docs-audit-table {
                font-size: 0.76rem;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                table-layout: fixed;
                border-collapse: collapse;
            }
            .docs-audit-table thead {
                position: sticky;
                top: 0;
                z-index: 3;
            }
            .docs-audit-table thead th {
                background: #0369a1 !important;
                color: #ffffff !important;
                font-size: 0.67rem !important;
                font-weight: 800 !important;
                padding: 6px 3px !important;
                line-height: 1.15 !important;
                vertical-align: middle !important;
                border-bottom: 2px solid #0f2b5c !important;
                white-space: normal !important;
                word-break: break-word;
            }
            .docs-audit-table tbody td {
                padding: 5px 4px !important;
                vertical-align: middle !important;
                word-break: break-word;
                overflow-wrap: anywhere;
            }
            .docs-audit-table .col-no { width: 32px; text-align: center; }
            .docs-audit-table .col-student { width: 23%; text-align: left; }
            .docs-audit-table .col-id { width: 17%; text-align: center; }
            .docs-audit-table .col-doc { width: 4.8%; text-align: center; padding: 4px 1px !important; }
            .docs-audit-table .col-avance { width: 52px; text-align: center; }
            .docs-audit-table .col-obs { width: 17%; text-align: left; }
            .docs-audit-table .col-act { width: 82px; text-align: center; }
            .docs-audit-cards {
                display: none;
                padding: 10px 12px;
                gap: 10px;
                flex-direction: column;
                max-height: 65vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            .docs-audit-card {
                border: 1px solid #cbd5e1;
                border-left: 4px solid #0369a1;
                border-radius: 10px;
                padding: 10px 12px;
                background: #ffffff;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
            }
            .docs-audit-card-docs {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 6px;
                margin: 8px 0;
            }
            .docs-audit-card-doc-pill {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 4px 6px;
                font-size: 0.72rem;
                font-weight: 700;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 4px;
            }
            .docs-audit-footer {
                padding: 8px 16px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 0.74rem;
                color: #475569;
            }

            /* TABLET HORIZONTAL Y VENTANA MEDIANA (901px - 1150px): 3 KPIs por fila, tabla 100% ajustada sin desbordes */
            @media (max-width: 1150px) {
                .docs-audit-kpis {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    padding: 10px 12px;
                }
                .docs-audit-header {
                    padding: 10px 12px;
                }
                .docs-audit-toolbar {
                    padding: 10px 12px;
                }
                .docs-audit-selects {
                    width: 100%;
                }
                .docs-audit-selects select {
                    flex: 1 1 180px;
                    min-height: 36px;
                }
                .docs-audit-table .col-obs {
                    display: none;
                }
                .docs-audit-table .col-student { width: 32%; }
                .docs-audit-table .col-id { width: 22%; }
                .docs-audit-table .col-doc { width: 5.5%; }
            }

            /* TABLET VERTICAL Y MÓVIL (<= 900px): 2 KPIs por fila + tarjetas táctiles sin corte ni scroll horizontal */
            @media (max-width: 900px) {
                .docs-audit-kpis {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }
                .docs-audit-actions {
                    width: 100%;
                }
                .docs-audit-actions button {
                    flex: 1 1 auto;
                    justify-content: center;
                    font-size: 0.78rem;
                }
                .docs-audit-chips {
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 4px;
                    width: 100%;
                }
                .docs-audit-chips button {
                    flex: 0 0 auto;
                    min-height: 34px;
                }
                .docs-audit-table-wrap {
                    display: none;
                }
                .docs-audit-cards {
                    display: flex;
                }
                .docs-audit-card-docs {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }

            @media (max-width: 520px) {
                .docs-audit-card-docs {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
        `;
        document.head.appendChild(style);
    }

    function getDocsAuditActiveCycle() {
        const st = window.STATE || {};
        return String(st.historicalViewingCycle || st.viewingHistoricalCycle || st.activeCycle || '2026').trim();
    }

    function getDocsCatalog() {
        if (Array.isArray(window.OFFICIAL_EXPEDIENTE_DOCS) && window.OFFICIAL_EXPEDIENTE_DOCS.length > 0) {
            return window.OFFICIAL_EXPEDIENTE_DOCS;
        }
        return [
            { key: 'certificados_primaria', title: 'Certificados de 1ero a 6to Primaria' },
            { key: 'diploma_primaria', title: 'Diploma Oficial de 6to Primaria' },
            { key: 'certificados_basico', title: 'Certificados de 1ero a 3ero Básico' },
            { key: 'diploma_basico', title: 'Diploma Oficial de 3ero Básico' },
            { key: 'partida_nacimiento', title: 'Certificación de Nacimiento / Pasaporte' },
            { key: 'dpi_encargado', title: 'Copia de DPI Encargado / Pasaporte' }
        ];
    }

    /**
     * Valida CUI guatemalteco (RENAP: 13 dígitos numéricos exactos, no todos iguales).
     */
    function validateStudentCuiForAudit(rawCui, dupCuiSet) {
        const raw = String(rawCui == null ? '' : rawCui).trim();
        const upper = raw.toUpperCase();
        if (!raw || upper === 'N/A' || upper === 'NA' || raw === '-' || raw === '---' || raw === '—') {
            return { status: 'missing', clean: '', label: 'Falta CUI', detail: 'Sin CUI registrado' };
        }
        const compact = raw.replace(/[\s-]/g, '');
        if (!/^\d+$/.test(compact)) {
            return { status: 'invalid', clean: compact, label: 'CUI Inválido', detail: 'Contiene letras o símbolos' };
        }
        if (compact.length !== 13) {
            return { status: 'invalid', clean: compact, label: 'CUI Incompleto', detail: `${compact.length} dígitos (requiere 13)` };
        }
        if (/^(\d)\1{12}$/.test(compact)) {
            return { status: 'invalid', clean: compact, label: 'CUI Inválido', detail: 'Dígitos repetidos' };
        }
        if (dupCuiSet && dupCuiSet.has(compact)) {
            return { status: 'duplicate', clean: compact, label: 'CUI Duplicado', detail: 'Repetido en otro alumno' };
        }
        return { status: 'valid', clean: compact, label: 'CUI Válido', detail: '13 dígitos RENAP' };
    }

    function _getBaseStudentsForAudit() {
        const activeCycle = getDocsAuditActiveCycle();
        let list = [];
        if (typeof window.getStudentsForCycle === 'function') {
            try {
                const res = window.getStudentsForCycle(activeCycle);
                if (Array.isArray(res)) list = res.slice();
            } catch (e) {}
        }
        if (list.length === 0) {
            const all = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            list = all.filter(s => s && String(s.cycle || s.academicCycle || '2026').trim() === activeCycle);
        }
        // Excluir egresados de listados activos
        list = list.filter(s => s && String(s.status || '') !== 'Egresado' && String(s.gradeCode || '').toUpperCase() !== 'EGRESADO');

        // Detectar CUIs duplicados en todo el ciclo activo ANTES de filtrar por sección
        const cuiCounter = new Map();
        list.forEach(s => {
            const compact = String(s.cui || '').replace(/[\s-]/g, '');
            if (/^\d{13}$/.test(compact) && !/^(\d)\1{12}$/.test(compact)) {
                cuiCounter.set(compact, (cuiCounter.get(compact) || 0) + 1);
            }
        });
        const dupCuiSet = new Set();
        cuiCounter.forEach((cnt, key) => { if (cnt > 1) dupCuiSet.add(key); });

        // Aplicar filtros actuales de view-students si scope === 'filtered'
        let scoped = list;
        if (AUDIT_STATE.scope === 'filtered') {
            const gradeCodeVal = document.getElementById('gradeFilterSelect')?.value || '';
            const gradeOnlyVal = document.getElementById('studentGradeOnlyFilterSelect')?.value || '';
            const sectionVal = document.getElementById('studentSectionFilterSelect')?.value || '';
            const statusVal = document.getElementById('statusFilterSelect')?.value || 'ALL';
            const searchVal = String(document.getElementById('studentSearchInput')?.value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            if (gradeCodeVal) {
                const gradesList = (window.STATE && window.STATE.gradesList) || [];
                const gObj = gradesList.find(g => g.code === gradeCodeVal || g.id === gradeCodeVal);
                scoped = scoped.filter(s => {
                    if (s.gradeCode === gradeCodeVal) return true;
                    if (gObj) {
                        const sSec = String(s.section || '').replace(/Sección\s*/i, '').trim().toUpperCase();
                        const gSec = String(gObj.section || '').replace(/Sección\s*/i, '').trim().toUpperCase();
                        return String(s.grade || '').trim().toLowerCase() === String(gObj.name || '').trim().toLowerCase() && sSec === gSec;
                    }
                    return false;
                });
            } else if (gradeOnlyVal) {
                scoped = scoped.filter(s => String(s.grade || '').trim().toLowerCase() === gradeOnlyVal.trim().toLowerCase());
                if (sectionVal) {
                    const cleanTargetSec = sectionVal.replace(/Sección\s*/i, '').trim().toUpperCase();
                    scoped = scoped.filter(s => String(s.section || '').replace(/Sección\s*/i, '').trim().toUpperCase() === cleanTargetSec);
                }
            }

            if (statusVal && statusVal !== 'ALL') {
                scoped = scoped.filter(s => String(s.status || 'Activo').toLowerCase() === statusVal.toLowerCase());
            }

            if (searchVal) {
                scoped = scoped.filter(s => {
                    const hay = `${s.name || ''} ${s.lastName || ''} ${s.firstName || ''} ${s.cui || ''} ${s.carne || ''} ${s.personalCode || ''} ${s.codigoPersonal || ''}`
                        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return hay.includes(searchVal);
                });
            }
        }

        // Ordenar por Grado -> Sección -> Apellidos y Nombres
        scoped.sort((a, b) => {
            const gA = `${a.gradeCode || a.grade || ''} ${a.section || ''}`;
            const gB = `${b.gradeCode || b.grade || ''} ${b.section || ''}`;
            const cmpG = gA.localeCompare(gB, 'es', { numeric: true, sensitivity: 'base' });
            if (cmpG !== 0) return cmpG;
            const nA = typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(a, 'lastFirst') : (a.name || '');
            const nB = typeof window.formatStudentDisplayName === 'function' ? window.formatStudentDisplayName(b, 'lastFirst') : (b.name || '');
            return nA.localeCompare(nB, 'es', { sensitivity: 'base' });
        });

        return { students: scoped, dupCuiSet, activeCycle };
    }

    /**
     * Evalúa cada estudiante: CUI, Código Personal, 6 documentos y lista legible de faltantes.
     */
    function buildStudentDocsAuditDataset() {
        const { students, dupCuiSet, activeCycle } = _getBaseStudentsForAudit();
        const docsCatalog = getDocsCatalog();

        const rows = students.map(s => {
            const exp = (typeof window.getStudentExpedienteSafe === 'function')
                ? window.getStudentExpedienteSafe(s)
                : { docs: (s.expediente && s.expediente.docs) ? s.expediente.docs : {} };
            const metrics = (typeof window.calculateStudentExpedienteMetrics === 'function')
                ? window.calculateStudentExpedienteMetrics(s)
                : { deliveredCount: 0, totalRequired: docsCatalog.length, status: 'incompleto', percent: 0 };

            const cuiInfo = validateStudentCuiForAudit(s.cui, dupCuiSet);
            const personalCode = String(s.personalCode || s.codigoPersonal || '').trim();
            const hasPersonalCode = Boolean(personalCode && personalCode !== '-' && personalCode.toUpperCase() !== 'N/A');

            const docStates = {};
            const missingDocsList = [];
            const inProgressDocsList = [];

            docsCatalog.forEach(d => {
                const rawDoc = (exp.docs && exp.docs[d.key]) ? exp.docs[d.key] : { status: 'pendiente' };
                const st = String(rawDoc.status || 'pendiente').toLowerCase();
                docStates[d.key] = st;
                const shortName = DOC_SHORT_LABELS[d.key] || d.title;
                if (st === 'pendiente') missingDocsList.push(shortName);
                else if (st === 'en_tramite') inProgressDocsList.push(shortName);
            });

            const isDocsComplete = metrics.status === 'completo';
            const isFullyCompliant = isDocsComplete && cuiInfo.status === 'valid' && hasPersonalCode;

            const observations = [];
            if (cuiInfo.status === 'missing') observations.push('Falta CUI');
            else if (cuiInfo.status === 'invalid') observations.push(`CUI inválido (${cuiInfo.detail})`);
            else if (cuiInfo.status === 'duplicate') observations.push('CUI duplicado');
            if (!hasPersonalCode) observations.push('Falta Cód. Personal');
            if (missingDocsList.length > 0) observations.push(`Faltan: ${missingDocsList.join(', ')}`);
            if (inProgressDocsList.length > 0) observations.push(`En trámite: ${inProgressDocsList.join(', ')}`);

            const displayName = (typeof window.formatStudentDisplayName === 'function')
                ? window.formatStudentDisplayName(s, 'lastFirst').toUpperCase()
                : String(s.name || `${s.lastName || ''} ${s.firstName || ''}`).trim().toUpperCase();

            const cleanSection = String(s.section || 'A').replace(/Sección\s*/i, '').trim() || 'A';
            const gradeLabel = s.grade ? `${s.grade} (${cleanSection})` : (s.gradeCode || 'Sin Grado');

            const gInfo = (typeof window.getStudentAssignedGuardianInfo === 'function')
                ? window.getStudentAssignedGuardianInfo(s)
                : null;
            const guardianPhone = (gInfo && gInfo.phone) ? gInfo.phone : (s.guardianPhone || s.tutorPhone || s.phone || '');

            return {
                student: s,
                id: s.id,
                displayName,
                gradeLabel,
                gradeCode: s.gradeCode || '',
                section: cleanSection,
                status: s.status || 'Activo',
                personalCode: hasPersonalCode ? personalCode : '',
                hasPersonalCode,
                cuiRaw: String(s.cui || '').trim(),
                cuiInfo,
                docStates,
                deliveredCount: metrics.deliveredCount,
                totalRequired: metrics.totalRequired,
                percent: metrics.percent,
                isDocsComplete,
                isFullyCompliant,
                missingDocsList,
                observationsText: observations.length > 0 ? observations.join(' • ') : 'Expediente y CUI completos',
                guardianPhone
            };
        });

        // KPIs globales del conjunto actual (antes de quickFilter)
        const total = rows.length;
        const completeDocsCount = rows.filter(r => r.isDocsComplete).length;
        const incompleteDocsCount = total - completeDocsCount;
        const cuiBadCount = rows.filter(r => r.cuiInfo.status === 'missing' || r.cuiInfo.status === 'invalid').length;
        const cuiDupCount = rows.filter(r => r.cuiInfo.status === 'duplicate').length;
        const noCodeCount = rows.filter(r => !r.hasPersonalCode).length;
        const compliancePct = total > 0 ? Math.round((completeDocsCount / total) * 100) : 0;

        // Aplicar quickFilter + missingDocKey
        let filteredRows = rows;
        if (AUDIT_STATE.quickFilter === 'incomplete') {
            filteredRows = filteredRows.filter(r => !r.isDocsComplete || r.cuiInfo.status !== 'valid');
        } else if (AUDIT_STATE.quickFilter === 'cui_bad') {
            filteredRows = filteredRows.filter(r => r.cuiInfo.status === 'missing' || r.cuiInfo.status === 'invalid');
        } else if (AUDIT_STATE.quickFilter === 'cui_dup') {
            filteredRows = filteredRows.filter(r => r.cuiInfo.status === 'duplicate');
        } else if (AUDIT_STATE.quickFilter === 'no_code') {
            filteredRows = filteredRows.filter(r => !r.hasPersonalCode);
        } else if (AUDIT_STATE.quickFilter === 'complete') {
            filteredRows = filteredRows.filter(r => r.isDocsComplete && r.cuiInfo.status === 'valid');
        }

        if (AUDIT_STATE.missingDocKey && AUDIT_STATE.missingDocKey !== 'ALL') {
            filteredRows = filteredRows.filter(r => r.docStates[AUDIT_STATE.missingDocKey] === 'pendiente' || r.docStates[AUDIT_STATE.missingDocKey] === 'en_tramite');
        }

        return {
            activeCycle,
            docsCatalog,
            allRows: rows,
            rows: filteredRows,
            kpis: { total, completeDocsCount, incompleteDocsCount, cuiBadCount, cuiDupCount, noCodeCount, compliancePct }
        };
    }

    function _renderDocStatusIcon(st) {
        if (st === 'entregado') return '<span title="Entregado" style="color:#15803d; font-weight:800; font-size:0.9rem;">✅</span>';
        if (st === 'en_tramite') return '<span title="En Trámite" style="color:#0284c7; font-weight:800; font-size:0.85rem;">🔄</span>';
        if (st === 'no_aplica') return '<span title="No Aplica" style="color:#94a3b8; font-weight:700; font-size:0.8rem;">⚪</span>';
        return '<span title="Pendiente / Faltante" style="color:#dc2626; font-weight:800; font-size:0.85rem;">⏳</span>';
    }

    function _renderDocStatusText(st) {
        if (st === 'entregado') return 'OK';
        if (st === 'en_tramite') return 'TRÁM.';
        if (st === 'no_aplica') return 'N/A';
        return 'FALTA';
    }

    function _renderCuiBadge(cuiInfo, rawCui) {
        if (cuiInfo.status === 'valid') {
            return `<span style="display:inline-flex; align-items:center; gap:4px; background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:2px 6px; border-radius:4px; font-family:monospace; font-weight:700; font-size:0.75rem;" title="CUI RENAP válido (13 dígitos)">✅ ${_esc(cuiInfo.clean)}</span>`;
        }
        if (cuiInfo.status === 'duplicate') {
            return `<span style="display:inline-flex; align-items:center; gap:4px; background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:2px 6px; border-radius:4px; font-family:monospace; font-weight:800; font-size:0.74rem;" title="CUI duplicado en otro estudiante del mismo ciclo">🟠 ${_esc(cuiInfo.clean)} (DUP)</span>`;
        }
        if (cuiInfo.status === 'invalid') {
            return `<span style="display:inline-flex; align-items:center; gap:4px; background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:2px 6px; border-radius:4px; font-weight:800; font-size:0.73rem;" title="${_esc(cuiInfo.detail)}">⚠️ ${_esc(rawCui)} <small>(${_esc(cuiInfo.detail)})</small></span>`;
        }
        return `<span style="display:inline-flex; align-items:center; gap:4px; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:2px 6px; border-radius:4px; font-weight:800; font-size:0.73rem;">🔴 Falta CUI</span>`;
    }

    function renderStudentDocsAuditPanel() {
        const panel = document.getElementById('studentDocsAuditPanel');
        if (!panel || !AUDIT_STATE.isOpen) return;
        injectDocsAuditResponsiveStyles();

        const data = buildStudentDocsAuditDataset();
        const { activeCycle, docsCatalog, rows, kpis } = data;
        const canWA = typeof window.canRoleUseWhatsApp === 'function' ? window.canRoleUseWhatsApp() : false;

        const chipStyle = (active) => active
            ? 'background:#0369a1; color:#ffffff; border:1.5px solid #0f2b5c; font-weight:800;'
            : 'background:#ffffff; color:#334155; border:1px solid #cbd5e1; font-weight:700;';

        const cardsHtml = rows.length === 0 ? `
            <div style="text-align:center; padding:28px; color:#64748b;">
                <i class="fa-solid fa-circle-check" style="font-size:2rem; color:#15803d; margin-bottom:8px; display:block;"></i>
                <strong>No hay estudiantes que coincidan con este filtro de auditoría.</strong>
            </div>
        ` : rows.map((r, idx) => {
            const borderAccent = r.isFullyCompliant ? '#15803d' : (r.cuiInfo.status === 'missing' || r.cuiInfo.status === 'duplicate' ? '#dc2626' : '#0369a1');
            const cleanPhone = String(r.guardianPhone || '').replace(/\D/g, '');
            const waMsg = encodeURIComponent(`Estimado encargado de ${r.displayName} (${r.gradeLabel}), le saludamos de Secretaría ENCCO Jutiapa. Para completar su expediente escolar ${activeCycle}, le solicitamos entregar a la brevedad: ${r.observationsText}. ¡Muchas gracias!`);
            const waBtnMobile = (canWA && cleanPhone && !r.isFullyCompliant)
                ? `<a href="https://wa.me/502${cleanPhone}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:6px 12px; border-radius:7px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:5px;" title="Enviar recordatorio por WhatsApp"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`
                : '';

            return `
            <div class="docs-audit-card" style="border-left-color:${borderAccent};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="min-width:0;">
                        <strong style="color:#0f2b5c; font-size:0.86rem; cursor:pointer; display:block;" onclick="openStudentExpedienteFromAudit('${_esc(r.id)}')">${idx + 1}. ${_esc(r.displayName)}</strong>
                        <div style="font-size:0.74rem; color:#64748b;">${_esc(r.gradeLabel)} &bull; ${_esc(r.status)}</div>
                    </div>
                    <span style="flex-shrink:0; padding:3px 8px; border-radius:10px; font-weight:800; font-size:0.75rem; background:${r.isDocsComplete ? '#dcfce7' : '#fef3c7'}; color:${r.isDocsComplete ? '#15803d' : '#b45309'}; border:1px solid ${r.isDocsComplete ? '#86efac' : '#fde68a'};">
                        ${r.deliveredCount}/${r.totalRequired}
                    </span>
                </div>

                <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:8px;">
                    ${_renderCuiBadge(r.cuiInfo, r.cuiRaw)}
                    <span style="font-family:monospace; font-size:0.74rem; font-weight:700; padding:2px 6px; border-radius:4px; background:${r.hasPersonalCode ? '#f1f5f9' : '#fee2e2'}; color:${r.hasPersonalCode ? '#0f2b5c' : '#dc2626'};">
                        Cód: ${r.hasPersonalCode ? _esc(r.personalCode) : 'FALTA'}
                    </span>
                </div>

                <div class="docs-audit-card-docs">
                    ${docsCatalog.map(d => `
                        <div class="docs-audit-card-doc-pill">
                            <span style="color:#334155;">${_esc(DOC_SHORT_LABELS[d.key] || d.title)}</span>
                            ${_renderDocStatusIcon(r.docStates[d.key])}
                        </div>
                    `).join('')}
                </div>

                <div style="font-size:0.74rem; color:${r.isFullyCompliant ? '#15803d' : '#334155'}; font-weight:600; margin-bottom:8px;">
                    ${_esc(r.observationsText)}
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="openStudentExpedienteFromAudit('${_esc(r.id)}')" style="flex:1; min-height:34px; font-weight:800; font-size:0.78rem;">
                        <i class="fa-solid fa-folder-open"></i> Revisar Expediente
                    </button>
                    ${waBtnMobile}
                </div>
            </div>`;
        }).join('');

        panel.innerHTML = `
            <div class="docs-audit-shell">
                <!-- ENCABEZADO AZUL INSTITUCIONAL -->
                <div class="docs-audit-header">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <strong style="font-size:1.02rem; letter-spacing:0.2px;"><i class="fa-solid fa-folder-check"></i> Auditoría de Documentos de Expediente y CUI</strong>
                            <span style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.35); padding:2px 8px; border-radius:12px; font-size:0.74rem; font-weight:800;">Ciclo ${_esc(activeCycle)}</span>
                        </div>
                        <div style="font-size:0.77rem; color:#e0f2fe; margin-top:2px;">
                            Verificación en vivo de CUI (13 dígitos RENAP), Código Personal MINEDUC y los 6 documentos oficiales del expediente.
                        </div>
                    </div>
                    <div class="docs-audit-actions">
                        <button type="button" class="btn btn-sm" onclick="printStudentDocsAuditReport()" style="background:#ffffff; color:#0f2b5c; border:1px solid #bae6fd; font-weight:800; padding:6px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-print"></i> Imprimir Reporte
                        </button>
                        <button type="button" class="btn btn-sm" onclick="exportStudentDocsAuditExcel()" style="background:#15803d; color:#ffffff; border:1px solid #86efac; font-weight:800; padding:6px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-file-excel"></i> Exportar Excel
                        </button>
                        <button type="button" class="btn btn-sm" onclick="toggleStudentDocsAuditPanel(false)" style="background:rgba(15,23,42,0.4); color:#ffffff; border:1px solid rgba(255,255,255,0.35); font-weight:700; padding:6px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-arrow-left"></i> Volver a Nómina
                        </button>
                    </div>
                </div>

                <!-- KPIs DINÁMICOS -->
                <div class="docs-audit-kpis">
                    <div class="docs-audit-kpi-card" style="border:1px solid #cbd5e1;">
                        <div style="font-size:0.71rem; color:#64748b; font-weight:700;">Total Evaluados</div>
                        <div style="font-size:1.25rem; font-weight:900; color:#0f2b5c;">${kpis.total}</div>
                    </div>
                    <div class="docs-audit-kpi-card" style="border:1px solid #bbf7d0;">
                        <div style="font-size:0.71rem; color:#166534; font-weight:700;">✅ Completos (6/6)</div>
                        <div style="font-size:1.25rem; font-weight:900; color:#15803d;">${kpis.completeDocsCount} <span style="font-size:0.76rem; font-weight:700;">(${kpis.compliancePct}%)</span></div>
                    </div>
                    <div class="docs-audit-kpi-card" style="border:1px solid #fde68a;">
                        <div style="font-size:0.71rem; color:#92400e; font-weight:700;">⚠️ Incompletos</div>
                        <div style="font-size:1.25rem; font-weight:900; color:#d97706;">${kpis.incompleteDocsCount}</div>
                    </div>
                    <div class="docs-audit-kpi-card" style="border:1px solid #fecaca;">
                        <div style="font-size:0.71rem; color:#991b1b; font-weight:700;">🔴 CUI Falt./Inv.</div>
                        <div style="font-size:1.25rem; font-weight:900; color:#dc2626;">${kpis.cuiBadCount}</div>
                    </div>
                    <div class="docs-audit-kpi-card" style="border:1px solid #fed7aa;">
                        <div style="font-size:0.71rem; color:#9a3412; font-weight:700;">🟠 CUI Duplicados</div>
                        <div style="font-size:1.25rem; font-weight:900; color:#ea580c;">${kpis.cuiDupCount}</div>
                    </div>
                    <div class="docs-audit-kpi-card" style="border:1px solid #e2e8f0;">
                        <div style="font-size:0.71rem; color:#475569; font-weight:700;">🆔 Sin Cód. Pers.</div>
                        <div style="font-size:1.25rem; font-weight:900; color:#334155;">${kpis.noCodeCount}</div>
                    </div>
                </div>

                <!-- BARRA DE FILTROS RÁPIDOS -->
                <div class="docs-audit-toolbar">
                    <div class="docs-audit-chips">
                        <button type="button" onclick="setStudentDocsAuditFilter('all')" style="${chipStyle(AUDIT_STATE.quickFilter === 'all')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">Todos (${kpis.total})</button>
                        <button type="button" onclick="setStudentDocsAuditFilter('incomplete')" style="${chipStyle(AUDIT_STATE.quickFilter === 'incomplete')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">⚠️ Incompletos / Sin CUI</button>
                        <button type="button" onclick="setStudentDocsAuditFilter('cui_bad')" style="${chipStyle(AUDIT_STATE.quickFilter === 'cui_bad')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🔴 CUI Faltante / Inválido (${kpis.cuiBadCount})</button>
                        <button type="button" onclick="setStudentDocsAuditFilter('cui_dup')" style="${chipStyle(AUDIT_STATE.quickFilter === 'cui_dup')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🟠 CUI Duplicados (${kpis.cuiDupCount})</button>
                        <button type="button" onclick="setStudentDocsAuditFilter('no_code')" style="${chipStyle(AUDIT_STATE.quickFilter === 'no_code')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">🆔 Sin Cód. Personal (${kpis.noCodeCount})</button>
                        <button type="button" onclick="setStudentDocsAuditFilter('complete')" style="${chipStyle(AUDIT_STATE.quickFilter === 'complete')} padding:4px 10px; border-radius:16px; font-size:0.76rem; cursor:pointer;">✅ Completos (${kpis.completeDocsCount})</button>
                    </div>

                    <div class="docs-audit-selects">
                        <select onchange="setStudentDocsAuditScope(this.value)" aria-label="Alcance de auditoría">
                            <option value="filtered" ${AUDIT_STATE.scope === 'filtered' ? 'selected' : ''}>📌 Alcance: Filtros de Sección</option>
                            <option value="all" ${AUDIT_STATE.scope === 'all' ? 'selected' : ''}>🏫 Alcance: Toda la Escuela (${_esc(activeCycle)})</option>
                        </select>
                        <select onchange="setStudentDocsAuditMissingDoc(this.value)" aria-label="Filtrar por documento faltante">
                            <option value="ALL" ${AUDIT_STATE.missingDocKey === 'ALL' ? 'selected' : ''}>📄 Cualquier documento</option>
                            ${docsCatalog.map(d => `<option value="${_esc(d.key)}" ${AUDIT_STATE.missingDocKey === d.key ? 'selected' : ''}>⏳ Falta: ${_esc(DOC_SHORT_LABELS[d.key] || d.title)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- VISTA TABLA 100% AJUSTADA A LA VENTANA (SIN CORTE DERECHO NI SCROLL HORIZONTAL) -->
                <div class="docs-audit-table-wrap">
                    <table class="custom-table docs-audit-table">
                        <thead>
                            <tr>
                                <th class="col-no">No.</th>
                                <th class="col-student">Estudiante y Sección</th>
                                <th class="col-id">CUI (RENAP) / Cód. Personal</th>
                                ${docsCatalog.map(d => `<th class="col-doc" title="${_esc(d.title)}">${DOC_HEADER_TWO_LINE[d.key] || _esc(DOC_SHORT_LABELS[d.key] || d.title)}</th>`).join('')}
                                <th class="col-avance">Avance</th>
                                <th class="col-obs">Faltantes / Observaciones</th>
                                <th class="col-act">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.length === 0 ? `
                                <tr>
                                    <td colspan="${6 + docsCatalog.length}" style="text-align:center; padding:32px; color:#64748b;">
                                        <i class="fa-solid fa-circle-check" style="font-size:2rem; color:#15803d; margin-bottom:8px; display:block;"></i>
                                        <strong>No hay estudiantes que coincidan con este filtro de auditoría.</strong>
                                    </td>
                                </tr>
                            ` : rows.map((r, idx) => {
                                const rowBg = r.isFullyCompliant ? '#f0fdf4' : (r.cuiInfo.status === 'missing' || r.cuiInfo.status === 'duplicate' ? '#fff5f5' : '#ffffff');
                                const cleanPhone = String(r.guardianPhone || '').replace(/\D/g, '');
                                const waMsg = encodeURIComponent(`Estimado encargado de ${r.displayName} (${r.gradeLabel}), le saludamos de Secretaría ENCCO Jutiapa. Para completar su expediente escolar ${activeCycle}, le solicitamos entregar a la brevedad: ${r.observationsText}. ¡Muchas gracias!`);
                                const waBtn = (canWA && cleanPhone && !r.isFullyCompliant)
                                    ? `<a href="https://wa.me/502${cleanPhone}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="btn btn-xs" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:3px 5px; border-radius:5px; text-decoration:none; font-weight:700;" title="Enviar recordatorio de faltantes por WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`
                                    : '';

                                return `
                                <tr style="background:${rowBg}; border-bottom:1px solid #e2e8f0;">
                                    <td class="col-no" style="font-weight:700; color:#475569;">${idx + 1}</td>
                                    <td class="col-student" style="background:${rowBg};">
                                        <strong style="color:#0f2b5c; cursor:pointer; font-size:0.76rem; line-height:1.2; display:block;" onclick="openStudentExpedienteFromAudit('${_esc(r.id)}')" title="Abrir expediente del estudiante">${_esc(r.displayName)}</strong>
                                        <div style="font-size:0.69rem; color:#64748b; margin-top:1px;">${_esc(r.gradeLabel)} &bull; ${_esc(r.status)}</div>
                                    </td>
                                    <td class="col-id">
                                        <div style="margin-bottom:3px;">${_renderCuiBadge(r.cuiInfo, r.cuiRaw)}</div>
                                        <div style="font-family:monospace; font-weight:700; font-size:0.71rem;">
                                            ${r.hasPersonalCode ? `<span style="color:#0f2b5c;">Cód: ${_esc(r.personalCode)}</span>` : '<span style="color:#dc2626; background:#fee2e2; padding:1px 5px; border-radius:4px;">Sin Cód.</span>'}
                                        </div>
                                    </td>
                                    ${docsCatalog.map(d => `<td class="col-doc">${_renderDocStatusIcon(r.docStates[d.key])}</td>`).join('')}
                                    <td class="col-avance">
                                        <span style="display:inline-block; padding:2px 6px; border-radius:10px; font-weight:800; font-size:0.72rem; background:${r.isDocsComplete ? '#dcfce7' : '#fef3c7'}; color:${r.isDocsComplete ? '#15803d' : '#b45309'}; border:1px solid ${r.isDocsComplete ? '#86efac' : '#fde68a'};">
                                            ${r.deliveredCount}/${r.totalRequired}
                                        </span>
                                    </td>
                                    <td class="col-obs" style="font-size:0.71rem; color:${r.isFullyCompliant ? '#15803d' : '#334155'}; font-weight:${r.isFullyCompliant ? '700' : '600'}; line-height:1.25;">
                                        ${_esc(r.observationsText)}
                                    </td>
                                    <td class="col-act">
                                        <div style="display:inline-flex; gap:4px; align-items:center; justify-content:center; flex-wrap:wrap;">
                                            <button type="button" class="btn btn-xs btn-outline-primary" onclick="openStudentExpedienteFromAudit('${_esc(r.id)}')" style="padding:3px 6px; font-size:0.71rem; font-weight:700;" title="Revisar o actualizar documentos">
                                                <i class="fa-solid fa-folder-open"></i> Revisar
                                            </button>
                                            ${waBtn}
                                        </div>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- VISTA TARJETAS TÁCTILES (TABLET VERTICAL Y MÓVIL <= 768px) -->
                <div class="docs-audit-cards">
                    ${cardsHtml}
                </div>

                <!-- LEYENDA -->
                <div class="docs-audit-footer">
                    <div><strong>Leyenda Documentos:</strong> ✅ Entregado &nbsp;|&nbsp; ⏳ Pendiente / Falta &nbsp;|&nbsp; 🔄 En Trámite &nbsp;|&nbsp; ⚪ No Aplica</div>
                    <div>Mostrando <strong>${rows.length}</strong> de <strong>${kpis.total}</strong> estudiantes del Ciclo ${_esc(activeCycle)}</div>
                </div>
            </div>
        `;
    }

    function canAccessStudentDocsAudit(roleOverride) {
        const st = window.STATE || {};
        const role = String(roleOverride || st.currentRole || '').toLowerCase().trim();
        if (!role || role === 'guest' || role === 'docente' || role === 'catedratico' || role === 'estudiante') {
            return false;
        }
        if (typeof window.isSuperUserRole === 'function' && window.isSuperUserRole(role)) return true;
        if (typeof window.isDirectorRole === 'function' && window.isDirectorRole(role)) return true;
        if (['admin', 'super_usuario', 'superadmin', 'director', 'direccion', 'directora', 'secretaria', 'secretario', 'secretaria_auxiliar', 'profesor_auxiliar', 'auxiliar', 'auxiliatura'].includes(role)) {
            return true;
        }
        if (typeof window.canRoleModify === 'function') {
            return !!window.canRoleModify('students', role);
        }
        return false;
    }

    function toggleStudentDocsAuditPanel(forceState) {
        const panel = document.getElementById('studentDocsAuditPanel');
        const tableCard = document.querySelector('#view-students .table-card');
        const btn = document.getElementById('btnToggleDocsAuditPanel');
        if (!panel) return;

        if (!canAccessStudentDocsAudit()) {
            AUDIT_STATE.isOpen = false;
            panel.style.display = 'none';
            if (tableCard) tableCard.style.display = '';
            if (btn) btn.style.display = 'none';
            if (typeof window.showToast === 'function') {
                window.showToast('Acceso restringido: Auditoría Docs y CUI es exclusiva de Dirección, Secretaría y Auxiliatura.', 'warning');
            }
            return;
        }

        AUDIT_STATE.isOpen = (typeof forceState === 'boolean') ? forceState : !AUDIT_STATE.isOpen;

        if (AUDIT_STATE.isOpen) {
            panel.style.display = 'block';
            if (tableCard) tableCard.style.display = 'none';
            if (btn) {
                btn.style.background = '#0f2b5c';
                btn.style.color = '#ffffff';
                btn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver a Nómina';
            }
            renderStudentDocsAuditPanel();
        } else {
            panel.style.display = 'none';
            if (tableCard) tableCard.style.display = '';
            if (btn) {
                btn.style.background = '#0369a1';
                btn.style.color = '#ffffff';
                btn.innerHTML = '<i class="fa-solid fa-folder-check"></i> Auditoría Docs y CUI';
            }
        }
    }

    function setStudentDocsAuditFilter(filterKey) {
        AUDIT_STATE.quickFilter = filterKey || 'all';
        renderStudentDocsAuditPanel();
    }

    function setStudentDocsAuditScope(scopeKey) {
        AUDIT_STATE.scope = scopeKey === 'all' ? 'all' : 'filtered';
        renderStudentDocsAuditPanel();
    }

    function setStudentDocsAuditMissingDoc(docKey) {
        AUDIT_STATE.missingDocKey = docKey || 'ALL';
        renderStudentDocsAuditPanel();
    }

    function openStudentExpedienteFromAudit(studentId) {
        if (typeof window.openStudentProfileModal === 'function') {
            window.openStudentProfileModal(studentId);
            setTimeout(() => {
                if (typeof window.switchStudentProfileTab === 'function') {
                    window.switchStudentProfileTab('expediente');
                }
            }, 80);
        } else if (typeof window.openStudentModal === 'function') {
            window.openStudentModal(studentId);
        }
    }

    /**
     * Impresión Oficial en Azul Institucional ENCCO (Hoja Oficio Horizontal 8.5" x 13").
     */
    function printStudentDocsAuditReport() {
        const data = buildStudentDocsAuditDataset();
        const { activeCycle, docsCatalog, rows, kpis } = data;
        const todayStr = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const scopeLabel = AUDIT_STATE.scope === 'all' ? `Toda la Escuela (Ciclo ${activeCycle})` : 'Sección / Filtro Seleccionado';

        const rowsHtml = rows.map((r, idx) => `
            <tr style="background:${r.isFullyCompliant ? '#f0fdf4' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')};">
                <td style="text-align:center; font-weight:bold; width:24px; padding:2px 3px;">${idx + 1}</td>
                <td style="font-weight:700; padding:2px 4px; white-space:nowrap;">${_esc(r.displayName)}</td>
                <td style="text-align:center; padding:2px 3px; white-space:nowrap; font-size:7pt;">${_esc(r.gradeCode || r.gradeLabel)}</td>
                <td style="text-align:center; padding:2px 3px; font-family:monospace; font-size:7.2pt; color:${r.cuiInfo.status === 'valid' ? '#15803d' : '#b91c1c'}; font-weight:700;">
                    ${r.cuiInfo.status === 'valid' ? _esc(r.cuiInfo.clean) : _esc(r.cuiRaw ? `${r.cuiRaw} (${r.cuiInfo.label})` : 'FALTA CUI')}
                </td>
                <td style="text-align:center; padding:2px 3px; font-family:monospace; font-size:7.2pt;">${r.hasPersonalCode ? _esc(r.personalCode) : '<strong style="color:#b91c1c;">FALTA</strong>'}</td>
                ${docsCatalog.map(d => {
                    const st = r.docStates[d.key];
                    const clr = st === 'entregado' ? '#15803d' : (st === 'en_tramite' ? '#0284c7' : (st === 'no_aplica' ? '#64748b' : '#b91c1c'));
                    return `<td style="text-align:center; padding:2px 2px; font-weight:800; font-size:6.8pt; color:${clr};">${_renderDocStatusText(st)}</td>`;
                }).join('')}
                <td style="text-align:center; font-weight:800; padding:2px 3px; color:${r.isDocsComplete ? '#15803d' : '#b45309'};">${r.deliveredCount}/${r.totalRequired}</td>
                <td style="padding:2px 4px; font-size:7pt;">${_esc(r.observationsText)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <style>
                @page { size: 8.5in 13in landscape; margin: 5mm; }
                .audit-print-table th { background-color: #0369a1 !important; color: #ffffff !important; border: 1px solid #0f2b5c; padding: 4px 3px; font-size: 7pt; }
                .audit-print-table td { border: 1px solid #334155; font-size: 7.4pt; }
            </style>
            <div style="font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
                <div style="border:2px solid #0369a1; border-radius:6px; overflow:hidden; margin-bottom:8px;">
                    <div style="background:linear-gradient(135deg, #0f2b5c 0%, #0369a1 60%, #0284c7 100%); color:#ffffff; padding:7px 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="logo.png" alt="Logo" onerror="this.src='portada-comercio-principal.webp'" style="height:36px; width:auto; object-fit:contain;">
                            <div>
                                <h2 style="margin:0; font-size:1rem; font-weight:900; text-transform:uppercase;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</h2>
                                <div style="font-size:0.72rem; color:#bae6fd; font-weight:600;">JUTIAPA — JORNADA MATUTINA | CICLO ESCOLAR ${_esc(activeCycle)}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="background:#0c4a6e; border:1px solid #7dd3fc; padding:3px 10px; border-radius:6px; font-size:0.74rem; font-weight:800;">REPORTE DE AUDITORÍA DE DOCUMENTOS Y CUI</div>
                            <div style="font-size:0.68rem; color:#e0f2fe; margin-top:2px;">Emisión: ${_esc(todayStr)}</div>
                        </div>
                    </div>
                    <div style="background:#f0f9ff; border-top:1.5px solid #0284c7; padding:5px 10px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:7.6pt;">
                        <span><strong>Alcance:</strong> ${_esc(scopeLabel)} &bull; <strong>Listados:</strong> ${rows.length} alumnos</span>
                        <span><strong>Completos (6/6):</strong> <span style="color:#15803d; font-weight:800;">${kpis.completeDocsCount} (${kpis.compliancePct}%)</span> &bull; <strong>Incompletos:</strong> <span style="color:#b45309; font-weight:800;">${kpis.incompleteDocsCount}</span> &bull; <strong>CUI Faltante/Inválido:</strong> <span style="color:#b91c1c; font-weight:800;">${kpis.cuiBadCount}</span></span>
                    </div>
                </div>

                <table class="audit-print-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th style="text-align:left;">Apellidos y Nombres</th>
                            <th>Secc.</th>
                            <th>CUI (RENAP)</th>
                            <th>Cód. Personal</th>
                            ${docsCatalog.map(d => `<th>${_esc(DOC_SHORT_LABELS[d.key] || d.title)}</th>`).join('')}
                            <th>Avance</th>
                            <th style="text-align:left;">Faltantes / Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>

                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; margin-top:28px; text-align:center; font-size:7.6pt;">
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Secretaría Académica</strong><br><span style="color:#475569;">Revisión Documental</span></div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Comisión de Inscripción / Guía</strong><br><span style="color:#475569;">Seguimiento de Expedientes</span></div>
                    <div style="border-top:1px solid #0f172a; padding-top:4px;"><strong>Vo. Bo. Dirección General</strong><br><span style="color:#475569;">ENCCO Jutiapa</span></div>
                </div>
            </div>
        `;

        if (typeof window.renderAndShowPrintDocument === 'function') {
            window.renderAndShowPrintDocument(`Auditoría de Documentos y CUI — Ciclo ${activeCycle}`, htmlContent, 'landscape');
        } else if (typeof window.enccoSafePrintHtml === 'function') {
            window.enccoSafePrintHtml(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`, 'width=1100,height=800', true);
        }
    }

    /**
     * Exporta la auditoría a Excel (.xlsx vía ExcelJS si disponible, o CSV UTF-8 con CUI protegido como texto).
     */
    async function exportStudentDocsAuditExcel() {
        const data = buildStudentDocsAuditDataset();
        const { activeCycle, docsCatalog, rows } = data;
        const filenameBase = `Auditoria_Documentos_CUI_ENCCO_${activeCycle}`;

        if (typeof window.ExcelJS !== 'undefined') {
            try {
                const wb = new window.ExcelJS.Workbook();
                const ws = wb.addWorksheet(`Auditoria_${activeCycle}`, { views: [{ state: 'frozen', ySplit: 4 }] });

                const headers = ['No.', 'Apellidos y Nombres', 'Grado y Sección', 'Estado', 'CUI (RENAP)', 'Estado CUI', 'Código Personal', ...docsCatalog.map(d => DOC_SHORT_LABELS[d.key] || d.title), 'Avance', 'Faltantes / Observaciones'];
                ws.mergeCells(1, 1, 1, headers.length);
                ws.getCell(1, 1).value = `ESCUELA NACIONAL DE CIENCIAS COMERCIALES — AUDITORÍA DE DOCUMENTOS Y CUI (CICLO ${activeCycle})`;
                ws.getCell(1, 1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
                ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2B5C' } };
                ws.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
                ws.getRow(1).height = 24;

                ws.mergeCells(2, 1, 2, headers.length);
                ws.getCell(2, 1).value = `Generado: ${new Date().toLocaleDateString('es-GT')} | Total: ${rows.length} estudiantes`;
                ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF334155' } };

                const hdrRow = ws.getRow(4);
                headers.forEach((h, i) => {
                    const cell = hdrRow.getCell(i + 1);
                    cell.value = h;
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                });
                hdrRow.height = 22;

                rows.forEach((r, idx) => {
                    const rowVals = [
                        idx + 1,
                        r.displayName,
                        r.gradeLabel,
                        r.status,
                        r.cuiInfo.clean || r.cuiRaw || 'FALTA CUI',
                        r.cuiInfo.label,
                        r.personalCode || 'FALTA',
                        ...docsCatalog.map(d => _renderDocStatusText(r.docStates[d.key])),
                        `${r.deliveredCount}/${r.totalRequired}`,
                        r.observationsText
                    ];
                    const excelRow = ws.addRow(rowVals);
                    // Proteger CUI como texto puro para evitar notación científica
                    excelRow.getCell(5).numFmt = '@';
                    excelRow.getCell(7).numFmt = '@';
                });

                ws.columns.forEach((col, i) => {
                    col.width = i === 0 ? 6 : (i === 1 ? 34 : (i === 2 ? 22 : (i === 4 ? 18 : (i === headers.length - 1 ? 42 : 12))));
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
            } catch (e) {
                console.warn('Fallback CSV en exportStudentDocsAuditExcel:', e);
            }
        }

        // Fallback CSV UTF-8 con BOM y CUI protegido
        const csvHeaders = ['No.', 'Apellidos y Nombres', 'Grado y Sección', 'Estado', 'CUI', 'Estado CUI', 'Código Personal', ...docsCatalog.map(d => DOC_SHORT_LABELS[d.key] || d.title), 'Avance', 'Faltantes / Observaciones'];
        const csvEscape = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
        const lines = [csvHeaders.map(csvEscape).join(',')];
        rows.forEach((r, idx) => {
            lines.push([
                idx + 1,
                r.displayName,
                r.gradeLabel,
                r.status,
                r.cuiInfo.clean ? `="${r.cuiInfo.clean}"` : (r.cuiRaw || 'FALTA CUI'),
                r.cuiInfo.label,
                r.personalCode || 'FALTA',
                ...docsCatalog.map(d => _renderDocStatusText(r.docStates[d.key])),
                `${r.deliveredCount}/${r.totalRequired}`,
                r.observationsText
            ].map(csvEscape).join(','));
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

    // Sincronizar automáticamente la auditoría cuando cambian los filtros de view-students
    const _origFilterStudentsTable = window.filterStudentsTable;
    if (typeof _origFilterStudentsTable === 'function') {
        window.filterStudentsTable = function (...args) {
            const res = _origFilterStudentsTable.apply(this, args);
            if (AUDIT_STATE.isOpen) renderStudentDocsAuditPanel();
            return res;
        };
    }

    window.canAccessStudentDocsAudit = canAccessStudentDocsAudit;
    window.validateStudentCuiForAudit = validateStudentCuiForAudit;
    window.buildStudentDocsAuditDataset = buildStudentDocsAuditDataset;
    window.renderStudentDocsAuditPanel = renderStudentDocsAuditPanel;
    window.toggleStudentDocsAuditPanel = toggleStudentDocsAuditPanel;
    window.setStudentDocsAuditFilter = setStudentDocsAuditFilter;
    window.setStudentDocsAuditScope = setStudentDocsAuditScope;
    window.setStudentDocsAuditMissingDoc = setStudentDocsAuditMissingDoc;
    window.openStudentExpedienteFromAudit = openStudentExpedienteFromAudit;
    window.printStudentDocsAuditReport = printStudentDocsAuditReport;
    window.exportStudentDocsAuditExcel = exportStudentDocsAuditExcel;
})(window, document);
