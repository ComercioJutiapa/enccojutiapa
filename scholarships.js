/**
 * ENCCO Jutiapa — Plataforma Oficial
 * Módulo: Alumnos Becados y Bolsas de Estudio
 * Archivo modular extraído de app.js para optimización de rendimiento y mantenimiento.
 */

// ==========================================================================
// MÓDULO: ALUMNOS BECADOS Y BOLSAS DE ESTUDIO (CRUD + ESTADÍSTICAS)
// ==========================================================================
let _scholarshipsCache = [];
let _scholarshipsEditingId = null;

async function loadScholarshipsView() {
    const container = document.getElementById('view-scholarships');
    if (!container) return;

    // Poblar selectores de filtro
    populateScholarshipGradeFilter();

    // Cargar becas desde Firebase RTDB
    await fetchScholarshipsData();

    // Renderizar estadísticas y listados
    renderScholarshipStats();
    renderScholarshipSummaryTable();
    renderScholarshipDetailList();
}
window.loadScholarshipsView = loadScholarshipsView;

function populateScholarshipGradeFilter() {
    const gradeSelect = document.getElementById('scholarshipGradeFilter');
    if (!gradeSelect) return;

    const currentVal = gradeSelect.value;
    gradeSelect.innerHTML = '<option value="">— Todos los Grados —</option>';

    const grades = (STATE.grades && Array.isArray(STATE.grades)) ? STATE.grades : [];
    grades.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.code || g.id || g.name;
        opt.textContent = g.name || g.code;
        gradeSelect.appendChild(opt);
    });

    if (currentVal) gradeSelect.value = currentVal;
    updateScholarshipSectionFilter();
}

function updateScholarshipSectionFilter() {
    const gradeSelect = document.getElementById('scholarshipGradeFilter');
    const secSelect = document.getElementById('scholarshipSectionFilter');
    if (!secSelect) return;

    const currentSec = secSelect.value;
    secSelect.innerHTML = '<option value="">— Todas —</option>';

    const selectedGrade = gradeSelect ? gradeSelect.value : '';
    const sections = new Set();

    if (STATE.students && Array.isArray(STATE.students)) {
        STATE.students.forEach(s => {
            if (!selectedGrade || s.gradeCode === selectedGrade || s.grade === selectedGrade) {
                if (s.section) sections.add(s.section);
            }
        });
    }

    Array.from(sections).sort().forEach(sec => {
        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = 'Sección ' + sec;
        secSelect.appendChild(opt);
    });

    if (currentSec) secSelect.value = currentSec;
}

async function fetchScholarshipsData() {
    _scholarshipsCache = [];
    const cycle = STATE.activeCycleKey || (new Date().getFullYear().toString());

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const snap = await db.ref('scholarships/' + cycle).once('value');
            if (snap.exists()) {
                const data = snap.val();
                Object.keys(data).forEach(gradeCode => {
                    const gradeData = data[gradeCode];
                    if (gradeData && typeof gradeData === 'object') {
                        Object.keys(gradeData).forEach(studentId => {
                            const studentData = gradeData[studentId];
                            if (studentData && typeof studentData === 'object') {
                                Object.keys(studentData).forEach(schId => {
                                    const sch = studentData[schId];
                                    if (sch && typeof sch === 'object') {
                                        _scholarshipsCache.push({
                                            id: schId,
                                            cycle: cycle,
                                            gradeCode: gradeCode,
                                            studentId: studentId,
                                            ...sch
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    } catch (err) {
        console.warn('Error fetching scholarships from Firebase, using local cache:', err);
    }

    // Complementar con info del estudiante si hace falta
    if (STATE.students && Array.isArray(STATE.students)) {
        _scholarshipsCache.forEach(sch => {
            const student = STATE.students.find(s => (s.id === sch.studentId || s.code === sch.studentCode));
            if (student) {
                if (!sch.studentName) sch.studentName = student.name || (student.apellidos + ', ' + student.nombres);
                if (!sch.gender) sch.gender = student.gender || student.genero || 'm';
                if (!sch.gradeCode) sch.gradeCode = student.gradeCode || student.grade || '';
                if (!sch.section) sch.section = student.section || '';
                if (!sch.studentCode) sch.studentCode = student.code || '';
            }
        });
    }
}

function getFilteredScholarships() {
    const gradeVal = (document.getElementById('scholarshipGradeFilter')?.value || '').trim().toLowerCase();
    const secVal = (document.getElementById('scholarshipSectionFilter')?.value || '').trim().toLowerCase();
    const typeVal = (document.getElementById('scholarshipTypeFilter')?.value || '').trim().toLowerCase();
    const searchVal = (document.getElementById('scholarshipSearchInput')?.value || '').trim().toLowerCase();

    return _scholarshipsCache.filter(s => {
        if (gradeVal && (s.gradeCode || '').toLowerCase() !== gradeVal) return false;
        if (secVal && (s.section || '').toLowerCase() !== secVal) return false;
        if (typeVal && (s.scholarshipType || '').toLowerCase() !== typeVal) return false;
        if (searchVal) {
            const name = (s.studentName || '').toLowerCase();
            const code = (s.studentCode || '').toLowerCase();
            if (!name.includes(searchVal) && !code.includes(searchVal)) return false;
        }
        return true;
    });
}

function renderScholarshipStats() {
    const grid = document.getElementById('scholarshipStatsGrid');
    if (!grid) return;

    const list = getFilteredScholarships();
    let total = list.length;
    let male = 0;
    let female = 0;
    let full = 0;
    let partial = 0;
    let bolsa = 0;

    list.forEach(s => {
        const g = (s.gender || '').toLowerCase();
        if (g === 'm' || g === 'masculino' || g === 'hombre') male++;
        else female++;

        const t = s.scholarshipType || '';
        if (t === 'completa') full++;
        else if (t === 'parcial') partial++;
        else if (t === 'bolsa_estudio') bolsa++;
    });

    grid.innerHTML = `
        <div class="scholarship-stat-card total">
            <div class="stat-number">${total}</div>
            <div class="stat-label">Total Becados</div>
        </div>
        <div class="scholarship-stat-card male">
            <div class="stat-number">${male}</div>
            <div class="stat-label"><i class="fa-solid fa-mars"></i> Hombres</div>
        </div>
        <div class="scholarship-stat-card female">
            <div class="stat-number">${female}</div>
            <div class="stat-label"><i class="fa-solid fa-venus"></i> Mujeres</div>
        </div>
        <div class="scholarship-stat-card full">
            <div class="stat-number">${full}</div>
            <div class="stat-label">Beca Completa</div>
        </div>
        <div class="scholarship-stat-card partial">
            <div class="stat-number">${partial}</div>
            <div class="stat-label">Beca Parcial</div>
        </div>
        <div class="scholarship-stat-card bolsa">
            <div class="stat-number">${bolsa}</div>
            <div class="stat-label">Bolsa de Estudio</div>
        </div>
    `;
}

function renderScholarshipSummaryTable() {
    const tbody = document.getElementById('scholarshipSummaryBody');
    if (!tbody) return;

    const list = getFilteredScholarships();
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b; padding:16px;">No hay registros con los filtros seleccionados.</td></tr>';
        return;
    }

    // Agrupar por grado + sección
    const groups = {};
    list.forEach(s => {
        const key = (s.gradeCode || 'Sin Grado') + '___' + (s.section || '—');
        if (!groups[key]) {
            groups[key] = {
                gradeCode: s.gradeCode || 'Sin Grado',
                section: s.section || '—',
                male: 0,
                female: 0,
                total: 0,
                completa: 0,
                parcial: 0,
                bolsa: 0
            };
        }
        groups[key].total++;
        const g = (s.gender || '').toLowerCase();
        if (g === 'm' || g === 'masculino' || g === 'hombre') groups[key].male++;
        else groups[key].female++;

        const t = s.scholarshipType || '';
        if (t === 'completa') groups[key].completa++;
        else if (t === 'parcial') groups[key].parcial++;
        else if (t === 'bolsa_estudio') groups[key].bolsa++;
    });

    let htmlRows = '';
    let totM = 0, totF = 0, totAll = 0, totC = 0, totP = 0, totB = 0;

    Object.keys(groups).sort().forEach(k => {
        const item = groups[k];
        totM += item.male;
        totF += item.female;
        totAll += item.total;
        totC += item.completa;
        totP += item.parcial;
        totB += item.bolsa;

        htmlRows += `
            <tr>
                <td style="font-weight:700; color:#f8fafc;">${item.gradeCode}</td>
                <td><span style="font-weight:700; color:#38bdf8;">${item.section}</span></td>
                <td style="text-align:center; color:#22d3ee; font-weight:700;">${item.male}</td>
                <td style="text-align:center; color:#f472b6; font-weight:700;">${item.female}</td>
                <td style="text-align:center; color:#3b82f6; font-weight:800;">${item.total}</td>
                <td style="text-align:center; color:#34d399;">${item.completa}</td>
                <td style="text-align:center; color:#fcd34d;">${item.parcial}</td>
                <td style="text-align:center; color:#c4b5fd;">${item.bolsa}</td>
            </tr>
        `;
    });

    // Fila total consolidada
    htmlRows += `
        <tr style="background:#1e293b; font-weight:800; border-top:2px solid #475569;">
            <td colspan="2" style="color:#f8fafc;">TOTAL CONSOLIDADO</td>
            <td style="text-align:center; color:#22d3ee;">${totM}</td>
            <td style="text-align:center; color:#f472b6;">${totF}</td>
            <td style="text-align:center; color:#38bdf8;">${totAll}</td>
            <td style="text-align:center; color:#34d399;">${totC}</td>
            <td style="text-align:center; color:#fcd34d;">${totP}</td>
            <td style="text-align:center; color:#c4b5fd;">${totB}</td>
        </tr>
    `;

    tbody.innerHTML = htmlRows;
}

function renderScholarshipDetailList() {
    const listEl = document.getElementById('scholarshipDetailList');
    const badgeEl = document.getElementById('scholarshipCountBadge');
    if (!listEl) return;

    const list = getFilteredScholarships();
    if (badgeEl) badgeEl.textContent = `${list.length} estudiante(s) beneficiado(s)`;

    if (list.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#64748b; padding:24px;">No se encontraron registros.</div>';
        return;
    }

    const typeLabels = {
        'completa': 'Beca Completa',
        'parcial': 'Beca Parcial',
        'bolsa_estudio': 'Bolsa de Estudio'
    };

    let html = '';
    list.forEach(s => {
        const initials = (s.studentName || 'AL').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const typeClass = s.scholarshipType || 'completa';
        const typeText = typeLabels[typeClass] || typeClass;
        const genderIcon = (s.gender === 'm' || s.gender === 'masculino' || s.gender === 'hombre') 
            ? '<i class="fa-solid fa-mars" style="color:#22d3ee;" title="Hombre"></i>' 
            : '<i class="fa-solid fa-venus" style="color:#f472b6;" title="Mujer"></i>';

        html += `
            <div class="scholarship-detail-card">
                <div class="student-avatar">${initials}</div>
                <div class="student-info">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span class="student-name">${s.studentName || 'Estudiante'}</span>
                        ${genderIcon}
                        <span class="scholarship-badge ${typeClass}">${typeText}</span>
                        <span class="scholarship-badge ${s.status || 'activa'}">${s.status || 'Activa'}</span>
                    </div>
                    <div class="student-meta">
                        <span><strong>Código:</strong> ${s.studentCode || 'S/C'}</span> &bull; 
                        <span><strong>Grado:</strong> ${s.gradeCode || '—'}</span> &bull; 
                        <span><strong>Sección:</strong> ${s.section || '—'}</span>
                        ${s.institution ? ` &bull; <span><strong>Entidad:</strong> ${s.institution}</span>` : ''}
                        ${s.startDate ? ` &bull; <span><strong>Desde:</strong> ${s.startDate}</span>` : ''}
                    </div>
                    ${s.description ? `<div style="font-size:0.75rem; color:#cbd5e1; margin-top:4px;">${s.description}</div>` : ''}
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline-warning btn-sm" onclick="editScholarship('${s.id}')" title="Editar" style="padding:4px 8px; font-size:0.75rem;">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteScholarship('${s.id}')" title="Eliminar" style="padding:4px 8px; font-size:0.75rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

function filterScholarshipsView() {
    updateScholarshipSectionFilter();
    renderScholarshipStats();
    renderScholarshipSummaryTable();
    renderScholarshipDetailList();
}
window.filterScholarshipsView = filterScholarshipsView;

function openRegisterScholarshipModal(editId = null) {
    _scholarshipsEditingId = editId;

    const studentSelect = document.getElementById('scholarshipStudentSelect');
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">— Seleccione alumno —</option>';
        const students = (STATE.students && Array.isArray(STATE.students)) ? STATE.students : [];
        students.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id || s.code;
            opt.textContent = `${s.name || (s.apellidos + ', ' + s.nombres)} (${s.gradeCode || s.grade || ''} "${s.section || ''}")`;
            opt.dataset.grade = s.gradeCode || s.grade || '';
            opt.dataset.section = s.section || '';
            opt.dataset.code = s.code || '';
            opt.dataset.gender = s.gender || s.genero || 'm';
            studentSelect.appendChild(opt);
        });
    }

    const titleEl = document.getElementById('scholarshipFormTitle');
    if (editId) {
        if (titleEl) titleEl.textContent = 'Editar Asignación de Beca';
        const item = _scholarshipsCache.find(s => s.id === editId);
        if (item) {
            if (studentSelect) studentSelect.value = item.studentId || '';
            document.getElementById('scholarshipTypeSelect').value = item.scholarshipType || 'completa';
            document.getElementById('scholarshipInstitution').value = item.institution || '';
            document.getElementById('scholarshipDescription').value = item.description || '';
            document.getElementById('scholarshipStartDate').value = item.startDate || '';
            document.getElementById('scholarshipEndDate').value = item.endDate || '';
        }
    } else {
        if (titleEl) titleEl.textContent = 'Inscripción / Registro de Beca o Bolsa de Estudio';
        document.getElementById('scholarshipTypeSelect').value = 'completa';
        document.getElementById('scholarshipInstitution').value = '';
        document.getElementById('scholarshipDescription').value = '';
        document.getElementById('scholarshipStartDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('scholarshipEndDate').value = '';
    }

    // Mostrar ventana integrada dentro del apartado de becas
    const panel = document.getElementById('scholarshipEnrollmentPanel');
    if (panel) {
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (studentSelect) studentSelect.focus();
    } else {
        const modalEl = document.getElementById('registerScholarshipModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    }
}
window.openRegisterScholarshipModal = openRegisterScholarshipModal;

function closeScholarshipEnrollmentPanel() {
    const panel = document.getElementById('scholarshipEnrollmentPanel');
    if (panel) panel.style.display = 'none';
    _scholarshipsEditingId = null;
}
window.closeScholarshipEnrollmentPanel = closeScholarshipEnrollmentPanel;

function openScholarshipEnrollmentFromSidebar(event) {
    if (event) event.preventDefault();
    navigateTo('scholarships');
    setTimeout(() => {
        openRegisterScholarshipModal();
    }, 150);
}
window.openScholarshipEnrollmentFromSidebar = openScholarshipEnrollmentFromSidebar;
window.openRegisterScholarshipModal = openRegisterScholarshipModal;

async function saveScholarship() {
    const studentSelect = document.getElementById('scholarshipStudentSelect');
    if (!studentSelect || !studentSelect.value) {
        showToast('Seleccione un estudiante.', 'warning');
        return;
    }

    const selectedOpt = studentSelect.options[studentSelect.selectedIndex];
    const studentId = studentSelect.value;
    const studentName = (selectedOpt.text || '').split(' (')[0].trim();
    const gradeCode = selectedOpt.dataset.grade || '';
    const section = selectedOpt.dataset.section || '';
    const studentCode = selectedOpt.dataset.code || '';
    const gender = selectedOpt.dataset.gender || 'm';

    const scholarshipType = document.getElementById('scholarshipTypeSelect').value;
    const institution = (document.getElementById('scholarshipInstitution').value || '').trim();
    const description = (document.getElementById('scholarshipDescription').value || '').trim();
    const startDate = document.getElementById('scholarshipStartDate').value;
    const endDate = document.getElementById('scholarshipEndDate').value;

    const cycle = STATE.activeCycleKey || (new Date().getFullYear().toString());
    const schId = _scholarshipsEditingId || ('sch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

    const scholarshipData = {
        studentId: studentId,
        studentName: studentName,
        studentCode: studentCode,
        gradeCode: gradeCode,
        section: section,
        gender: gender,
        scholarshipType: scholarshipType,
        institution: institution,
        description: description,
        startDate: startDate,
        endDate: endDate,
        status: 'activa',
        updatedAt: new Date().toISOString(),
        updatedBy: STATE.currentUser?.username || 'admin'
    };

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const safeGrade = (gradeCode || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
            await db.ref(`scholarships/${cycle}/${safeGrade}/${studentId}/${schId}`).set(scholarshipData);
        }
        showToast('Beca guardada exitosamente.', 'success');
    } catch (err) {
        console.error('Error saving scholarship:', err);
        showToast('Error al guardar en la nube. Se guardó localmente.', 'info');
    }

    // Actualizar cache local
    const existingIdx = _scholarshipsCache.findIndex(s => s.id === schId);
    if (existingIdx >= 0) {
        _scholarshipsCache[existingIdx] = { id: schId, cycle: cycle, ...scholarshipData };
    } else {
        _scholarshipsCache.push({ id: schId, cycle: cycle, ...scholarshipData });
    }

    // Cerrar ventana integrada o modal
    closeScholarshipEnrollmentPanel();
    const modalEl = document.getElementById('registerScholarshipModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    _scholarshipsEditingId = null;
    filterScholarshipsView();
}
window.saveScholarship = saveScholarship;

function editScholarship(id) {
    openRegisterScholarshipModal(id);
}
window.editScholarship = editScholarship;

async function deleteScholarship(id) {
    if (!confirm('¿Está seguro de eliminar esta asignación de beca?')) return;

    const item = _scholarshipsCache.find(s => s.id === id);
    if (item) {
        const cycle = item.cycle || STATE.activeCycleKey || (new Date().getFullYear().toString());
        const safeGrade = (item.gradeCode || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                await firebase.database().ref(`scholarships/${cycle}/${safeGrade}/${item.studentId}/${id}`).remove();
            }
            showToast('Beca eliminada.', 'info');
        } catch (err) {
            console.error('Error deleting scholarship:', err);
        }
    }

    _scholarshipsCache = _scholarshipsCache.filter(s => s.id !== id);
    filterScholarshipsView();
}
window.deleteScholarship = deleteScholarship;

function exportScholarshipsExcel() {
    const list = getFilteredScholarships();
    if (list.length === 0) {
        showToast('No hay datos de becas para exportar.', 'warning');
        return;
    }

    const typeLabels = {
        'completa': 'Beca Completa',
        'parcial': 'Beca Parcial',
        'bolsa_estudio': 'Bolsa de Estudio'
    };

    const rows = [
        ['No.', 'Estudiante', 'Código Alumno', 'Grado', 'Sección', 'Género', 'Tipo de Beneficio', 'Institución / Fuente', 'Fecha Inicio', 'Fecha Fin', 'Estado']
    ];

    list.forEach((s, idx) => {
        const gender = (s.gender === 'm' || s.gender === 'masculino' || s.gender === 'hombre') ? 'Masculino' : 'Femenino';
        rows.push([
            idx + 1,
            s.studentName || '',
            s.studentCode || '',
            s.gradeCode || '',
            s.section || '',
            gender,
            typeLabels[s.scholarshipType] || s.scholarshipType || '',
            s.institution || '',
            s.startDate || '',
            s.endDate || '',
            s.status || 'Activa'
        ]);
    });

    let csvContent = '﻿';
    rows.forEach(r => {
        csvContent += r.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Alumnos_Becados_ENCCO_${STATE.activeCycleKey || '2026'}.csv`;
    link.click();
    showToast('Archivo CSV descargado.', 'success');
}
window.exportScholarshipsExcel = exportScholarshipsExcel;

function printScholarshipsReport() {
    const list = getFilteredScholarships();
    if (list.length === 0) {
        showToast('No hay datos para imprimir.', 'warning');
        return;
    }

    const typeLabels = {
        'completa': 'Beca Completa',
        'parcial': 'Beca Parcial',
        'bolsa_estudio': 'Bolsa de Estudio'
    };

    let rowsHtml = '';
    list.forEach((s, i) => {
        const gender = (s.gender === 'm' || s.gender === 'masculino' || s.gender === 'hombre') ? 'M' : 'F';
        rowsHtml += `<tr>
            <td>${i + 1}</td>
            <td>${s.studentName || ''}</td>
            <td>${s.studentCode || ''}</td>
            <td>${s.gradeCode || ''}</td>
            <td>${s.section || ''}</td>
            <td>${gender}</td>
            <td>${typeLabels[s.scholarshipType] || s.scholarshipType || ''}</td>
            <td>${s.institution || ''}</td>
            <td>${s.status || 'Activa'}</td>
        </tr>`;
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
        showToast('Permita las ventanas emergentes para imprimir.', 'warning');
        return;
    }
    printWin.document.open();
    printWin.document.write(`
        <html>
        <head>
            <title>Reporte de Alumnos Becados - ENCCO</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
                h2 { margin: 0 0 4px 0; text-align: center; }
                p { margin: 2px 0 16px 0; text-align: center; font-size: 12px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                th { background: #1e293b; color: #fff; font-weight: bold; }
                tr:nth-child(even) { background: #f8fafc; }
            </style>
        </head>
        <body>
            <h2>Escuela Nacional Central de Comercio — ENCCO Jutiapa</h2>
            <p>Reporte Oficial de Alumnos Becados y Bolsas de Estudio &bull; Ciclo: ${STATE.activeCycleKey || '2026'}</p>
            <table>
                <thead>
                    <tr><th>#</th><th>Nombre del Alumno</th><th>Código</th><th>Grado</th><th>Sección</th><th>Género</th><th>Tipo</th><th>Institución</th><th>Estado</th></tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `);
    printWin.document.close();
}
window.printScholarshipsReport = printScholarshipsReport;
