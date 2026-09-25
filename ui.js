/**
 * ======================================================================
 * 🎨 ENCCO REACTIVE UI & BUSINESS LOGIC MODULE (ui.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Nehemias Salguero. Jutiapa, Guatemala.
 * Todos los derechos reservados. All Rights Reserved.
 *
 * Desarrollado por: Nehemias Salguero
 * Ubicación: Jutiapa, Guatemala
 * ======================================================================
 * - Actualizaciones reactivas y fluidas sin parpadeos ni recargas de página.
 * - Bloqueo dinámico de bimestres en interfaz para docentes.
 * - Regla lógica de exoneraciones académicas en promedios y cuadro de honor.
 * - Control universal de modales con tecla ESC y cierre exterior.
 * - Sistema de notificaciones Toast no bloqueante.
 */

(function(window) {
    'use strict';

    // 1. SISTEMA UNIVERSAL DE NOTIFICACIONES TOAST
    function showToast(message, type = 'info', duration = 3200) {
        if (typeof document === 'undefined') return;

        let container = document.getElementById('enccoToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'enccoToastContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                max-width: 420px;
                width: calc(100% - 40px);
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `encco-toast encco-toast-${type}`;
        
        let bg = '#0284c7';
        let icon = 'fa-info-circle';
        if (type === 'success') { bg = '#15803d'; icon = 'fa-circle-check'; }
        else if (type === 'warning') { bg = '#d97706'; icon = 'fa-triangle-exclamation'; }
        else if (type === 'error' || type === 'danger') { bg = '#dc2626'; icon = 'fa-circle-exclamation'; }

        toast.style.cssText = `
            background: ${bg};
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.22);
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: auto;
            opacity: 0;
            transform: translateY(-15px);
            transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        toast.innerHTML = `<i class="fa-solid ${icon}" style="font-size:1.15rem;"></i> <span style="flex:1;">${message}</span>`;
        container.appendChild(toast);

        // Entrada
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Salida automática
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, duration);
    }

    // 2. CONTROL UNIVERSAL DE VENTANAS MODALES
    function showModalById(modalId) {
        if (!modalId || typeof document === 'undefined') return;
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`[EnccoUI] Modal no encontrado: ${modalId}`);
            return;
        }

        modal.style.setProperty('display', 'flex', 'important');
        modal.classList.add('modal-active');
        document.body.style.overflow = 'hidden';

        // Event listener para cerrar al hacer clic en el fondo
        if (!modal._hasBackdropListener) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                    forceCloseModal(modalId);
                }
            });
            modal._hasBackdropListener = true;
        }

        // Buscar primer input para enfocar
        const input = modal.querySelector('input:not([type=hidden]), select, textarea');
        if (input) {
            setTimeout(() => { try { input.focus(); } catch(e){} }, 80);
        }
    }

    function forceCloseModal(modalId) {
        if (!modalId || typeof document === 'undefined') return;
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.classList.remove('modal-active');
        }

        // Si ya no hay modales abiertos, restaurar scroll de página
        const anyOpen = document.querySelectorAll('.modal-overlay[style*="display: flex"], .modal-overlay[style*="display:flex"]');
        if (anyOpen.length === 0) {
            document.body.style.overflow = '';
        }
    }

    // Listener global de tecla ESC para cerrar modales
    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.keyCode === 27) {
                const openModals = document.querySelectorAll('.modal-overlay[style*="display: flex"], .modal-overlay[style*="display:flex"]');
                openModals.forEach(m => {
                    if (m.id) forceCloseModal(m.id);
                });
            }
        });
    }

    // 3. BLOQUEO DINÁMICO DE BIMESTRES PARA INGRESO DE NOTAS
    function isGradebookEditableForUser(student, subjectName, unit) {
        const uRole = (window.STATE && window.STATE.currentRole ? window.STATE.currentRole : (
            (window.STATE && window.STATE.currentUser && window.STATE.currentUser.role) ? window.STATE.currentUser.role : 'docente'
        )).toLowerCase().trim();

        // 1. Administración y Dirección siempre tienen permisos plenos de edición
        if (uRole === 'admin' || uRole === 'super_usuario' || uRole === 'director' || uRole === 'secretaria') {
            return true;
        }

        // 2. Si el sistema tiene bloqueo global activado
        const cfg = (window.STATE && window.STATE.config) ? window.STATE.config : {};
        if (cfg.globalLocked === true) {
            return false;
        }

        // 3. Validar si la unidad consultada está habilitada
        const targetUnit = parseInt(unit) || 1;
        const activeUnits = Array.isArray(cfg.activeUnits) ? cfg.activeUnits.map(Number) : [parseInt(cfg.activeBimestre) || 1];

        if (!activeUnits.includes(targetUnit)) {
            return false;
        }

        // 4. Si el docente tiene la clase asignada
        if (uRole === 'docente' || uRole === 'catedratico') {
            const curUser = (window.STATE && window.STATE.currentUser) ? window.STATE.currentUser : null;
            if (curUser && curUser.id) {
                const pensumList = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
                const cleanStr = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanSubj = cleanStr(subjectName);
                
                // Si la materia está explícitamente asignada a otro docente
                const courseRecord = pensumList.find(p => {
                    if (!p) return false;
                    const pSubj = cleanStr(p.subject || p.subjectName || p.name);
                    return pSubj === cleanSubj;
                });

                if (courseRecord && courseRecord.teacherId && courseRecord.teacherId !== curUser.id) {
                    return false;
                }
            }
        }

        return true;
    }

    function applyBimestreLockToGradeInputs(container = document) {
        if (!container || typeof container.querySelectorAll !== 'function') return;

        const gradeInputs = container.querySelectorAll('input.grade-input, input[data-unit]');
        gradeInputs.forEach(input => {
            const unit = input.getAttribute('data-unit') || (window.STATE && window.STATE.currentUnit ? window.STATE.currentUnit : 1);
            const subject = input.getAttribute('data-subject') || '';
            const editable = isGradebookEditableForUser(null, subject, unit);

            input.disabled = !editable;
            if (!editable) {
                input.classList.add('cell-locked');
                input.title = "🔒 Calificaciones bloqueadas para este bimestre.";
            } else {
                input.classList.remove('cell-locked');
                input.title = "";
            }
        });
    }

    // 4. MÓDULO Y REGLA LÓGICA DE EXONERACIONES
    function isStudentSubjectExonerated(student, subjectName, unit) {
        if (!student) return false;
        const cleanStr = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetSubj = cleanStr(subjectName);
        const targetUnit = unit ? String(unit) : null;

        // 1. Revisar en array de exoneraciones del estudiante
        if (Array.isArray(student.exoneraciones) && student.exoneraciones.length > 0) {
            const match = student.exoneraciones.find(e => {
                if (!e || e.active === false) return false;
                const eSubj = cleanStr(e.subject);
                const subjMatch = eSubj === 'all' || eSubj === targetSubj;
                const bMatch = !targetUnit || String(e.bimestre).toUpperCase() === 'ALL' || String(e.bimestre) === targetUnit;
                return subjMatch && bMatch;
            });
            if (match) return true;
        }

        // 2. Revisar en el almacén global STATE.exoneraciones
        if (window.STATE && window.STATE.exoneraciones) {
            for (const key of Object.keys(window.STATE.exoneraciones)) {
                const ex = window.STATE.exoneraciones[key];
                if (ex && ex.studentId === student.id && ex.active !== false) {
                    const eSubj = cleanStr(ex.subject);
                    const subjMatch = eSubj === 'all' || eSubj === targetSubj;
                    const bMatch = !targetUnit || String(ex.bimestre).toUpperCase() === 'ALL' || String(ex.bimestre) === targetUnit;
                    if (subjMatch && bMatch) return true;
                }
            }
        }

        // 3. Revisar flag en gradebookDetails
        if (student.gradebookDetails && student.gradebookDetails[subjectName] && unit) {
            const bDet = student.gradebookDetails[subjectName][unit];
            if (bDet && bDet.exonerado === true) return true;
        }

        return false;
    }

    // Cálculo del promedio académico con omisión de notas exoneradas (Regla Oficial)
    function calculateStudentAcademicSummary(student) {
        if (!student) {
            return {
                average: 0,
                averageFormatted: '0.000',
                totalPoints: 0,
                classCount: 9,
                gradedClasses: 0,
                isExonerated: false,
                eligibleForHonorRoll: false,
                failedSubjectsList: []
            };
        }

        const rawGrade = (student.grade || student.gradeLabel || student.gradeCode || '').toUpperCase();
        const is6to = rawGrade.includes('6') || rawGrade.includes('SEXTO') || rawGrade.includes('6TO');
        const is5to = !is6to && (rawGrade.includes('5') || rawGrade.includes('QUINTO') || rawGrade.includes('5TO'));
        const activeBimestre = parseInt(window.STATE?.config?.activeBimestre) || 1;

        let dynamicDivisor = is6to ? ((activeBimestre >= 3) ? 10 : 8) : 9;

        const gradesMap = student.grades || {};
        let sumCourseAverages = 0;
        let evaluatedCoursesCount = 0;
        let hasFailedGrade = false;
        let hasAnyExoneration = false;
        let failedSubjectsList = [];

        // Obtener listado de asignaturas
        const subjects = Object.keys(gradesMap);

        subjects.forEach(subj => {
            const bGrades = gradesMap[subj];
            let validScores = [];

            for (let b = 1; b <= activeBimestre; b++) {
                const isExonerated = isStudentSubjectExonerated(student, subj, b);
                if (isExonerated) {
                    hasAnyExoneration = true;
                    // REGLA OFICIAL: Se omite del cálculo la nota exonerada
                    continue;
                }

                let score = 0;
                if (Array.isArray(bGrades)) {
                    score = parseInt(bGrades[b - 1]) || 0;
                } else if (typeof bGrades === 'object' && bGrades !== null) {
                    score = parseInt(bGrades[`b${b}`] || bGrades[b]) || 0;
                }

                if (score > 0) {
                    if (score < 60) {
                        hasFailedGrade = true;
                        failedSubjectsList.push(`${subj} (B${b}: ${score} pts)`);
                    }
                    validScores.push(score);
                }
            }

            // Promedio del curso basado únicamente en bimestres evaluados no exonerados
            if (validScores.length > 0) {
                const courseAvg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
                sumCourseAverages += courseAvg;
                evaluatedCoursesCount++;
            }
        });

        // Promedio equitativo
        const effectiveDivisor = evaluatedCoursesCount > 0 ? evaluatedCoursesCount : dynamicDivisor;
        const rawAvg = evaluatedCoursesCount > 0 ? (sumCourseAverages / effectiveDivisor) : 0;
        const boundedAvg = Math.min(100.0, Math.max(0.0, rawAvg));
        const finalAvg = Math.round(boundedAvg * 1000) / 1000;

        // Elegibilidad para cuadro de honor: al menos una clase calificada, cero reprobadas
        const eligible = (evaluatedCoursesCount > 0) && (!hasFailedGrade);

        return {
            average: finalAvg,
            averageFormatted: finalAvg.toFixed(3),
            totalPoints: Math.round(sumCourseAverages * 10) / 10,
            classCount: dynamicDivisor,
            gradedClasses: evaluatedCoursesCount,
            isExonerated: hasAnyExoneration,
            eligibleForHonorRoll: eligible,
            hasFailedGrade: hasFailedGrade,
            failedSubjectsList: failedSubjectsList
        };
    }

    // Modal de Exoneración Académica
    function openAcademicExonerationModal(studentId) {
        const allowedRoles = ['admin', 'super_usuario', 'director', 'direccion', 'secretaria', 'secretaria_general', 'secretaria_contador', 'secretaria_auxiliar', 'profesor_auxiliar', 'auxiliar', 'auxiliatura'];
        const curRole = (window.STATE && window.STATE.currentRole ? window.STATE.currentRole : '').toLowerCase();
        if (!allowedRoles.includes(curRole)) {
            showToast("Acceso Restringido: La exoneración de estudiantes es facultad única y exclusiva de Dirección, Secretaría o Auxiliatura.", "warning");
            return;
        }

        const studentsList = (window.STATE && window.STATE.students) ? window.STATE.students : [];
        const student = studentsList.find(s => s.id === studentId || s.personalCode === studentId);
        if (!student) {
            showToast("Estudiante no encontrado.", "warning");
            return;
        }

        window._activeExonStudent = student;

        const nameEl = document.getElementById('exonModalStudentName');
        const metaEl = document.getElementById('exonModalStudentMeta');
        const badgeEl = document.getElementById('exonModalStatusBadge');
        if (nameEl) nameEl.textContent = `Estudiante: ${(typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(student, 'lastFirst') : `${student.lastName || ''}, ${student.firstName || student.name || ''}`.trim())}`;
        if (metaEl) metaEl.textContent = `Carné: ${student.carne || student.personalCode || 'S/C'} | Grado: ${student.grade || ''} "${student.section || ''}"`;
        if (badgeEl) {
            badgeEl.textContent = student.exoneraciones && student.exoneraciones.length > 0 ? `Exoneraciones: ${student.exoneraciones.length}` : 'Expediente Regular';
        }

        // Poblar materias en el selector
        const subjSelect = document.getElementById('exonFormSubject');
        if (subjSelect) {
            subjSelect.innerHTML = '<option value="ALL">🌟 Todas las Asignaturas (Bimestre Completo)</option>';
            const pensumList = (window.STATE && window.STATE.pensum) ? window.STATE.pensum : [];
            const studentGrade = (student.grade || '').toUpperCase();
            
            const relevantPensum = pensumList.filter(p => {
                if (!p) return false;
                const pGrade = (p.grade || '').toUpperCase();
                return studentGrade.includes(pGrade) || pGrade.includes(studentGrade);
            });

            relevantPensum.forEach(p => {
                const subName = p.subject || p.subjectName || p.name;
                if (subName) {
                    subjSelect.innerHTML += `<option value="${subName}">${subName}</option>`;
                }
            });
        }

        renderExonerationsList(student);
        showModalById('academicExonerationModal');
    }

    function renderExonerationsList(student) {
        const container = document.getElementById('exonListContainer');
        if (!container) return;

        const exList = (student && Array.isArray(student.exoneraciones)) ? student.exoneraciones : [];
        if (exList.length === 0) {
            container.innerHTML = '<div style="color:#64748b; font-size:0.88rem; font-style:italic; padding:8px 0;">No hay exoneraciones registradas para este estudiante.</div>';
            return;
        }

        let html = '';
        exList.forEach((item, idx) => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px;">
                    <div>
                        <strong style="color:#0f766e;">${item.subject === 'ALL' ? 'Todas las Materias' : item.subject}</strong>
                        <span class="badge" style="background:#ccfbf1; color:#0f766e; margin-left:8px; font-weight:700;">Bimestre: ${item.bimestre}</span>
                        <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">Motivo: ${item.reason || 'Sin motivo especificado'}</div>
                    </div>
                    <span class="badge badge-success" style="font-size:0.75rem;"><i class="fa-solid fa-check"></i> Activa</span>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async function handleAcademicExonerationSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        const allowedRoles = ['admin', 'super_usuario', 'director', 'direccion', 'secretaria', 'secretaria_general', 'secretaria_contador', 'secretaria_auxiliar', 'profesor_auxiliar', 'auxiliar', 'auxiliatura'];
        const curRole = (window.STATE && window.STATE.currentRole ? window.STATE.currentRole : '').toLowerCase();
        if (!allowedRoles.includes(curRole)) {
            showToast("Acceso Denegado: La exoneración de estudiantes es facultad única y exclusiva de Dirección, Secretaría o Auxiliatura.", "danger");
            return;
        }

        const student = window._activeExonStudent;
        if (!student) return;

        const subject = document.getElementById('exonFormSubject')?.value || 'ALL';
        const bimestre = document.getElementById('exonFormBimestre')?.value || '1';
        const type = document.getElementById('exonFormType')?.value || 'EXONERADO';
        const reason = document.getElementById('exonFormReason')?.value || '';

        const submitBtn = document.getElementById('academicExonerationSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        }

        try {
            if (typeof window.saveAcademicExoneration === 'function') {
                await window.saveAcademicExoneration({
                    studentId: student.id,
                    personalCode: student.personalCode || '',
                    subject: subject,
                    bimestre: bimestre,
                    type: type,
                    reason: reason
                });
            }

            showToast("✅ Exoneración registrada exitosamente y aplicada al cálculo.", "success");
            renderExonerationsList(student);

            // Limpiar campo motivo
            const rInput = document.getElementById('exonFormReason');
            if (rInput) rInput.value = '';

            // Notificar a la UI para recalcular cuadro de honor y calificaciones
            if (typeof window.renderHonorRoll === 'function') window.renderHonorRoll();
            if (typeof window.renderDashboard === 'function') window.renderDashboard();

        } catch (err) {
            showToast("Error al guardar exoneración: " + err.message, "danger");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Aplicar Consideración';
            }
        }
    }

    function closeAcademicExonerationModal() {
        forceCloseModal('academicExonerationModal');
        window._activeExonStudent = null;
    }

    // Exportación Global
    const EnccoUI = {
        showToast,
        showModalById,
        forceCloseModal,
        isGradebookEditableForUser,
        applyBimestreLockToGradeInputs,
        isStudentSubjectExonerated,
        calculateStudentAcademicSummary,
        openAcademicExonerationModal,
        closeAcademicExonerationModal,
        handleAcademicExonerationSubmit,
        renderExonerationsList
    };

    window.EnccoUI = EnccoUI;
    window.showToast = showToast;
    window.showModalById = showModalById;
    window.forceCloseModal = forceCloseModal;
    window.isGradebookEditableForUser = isGradebookEditableForUser;
    window.applyBimestreLockToGradeInputs = applyBimestreLockToGradeInputs;
    window.isStudentSubjectExonerated = isStudentSubjectExonerated;
    window.calculateStudentAcademicSummary = calculateStudentAcademicSummary;
    window.openAcademicExonerationModal = openAcademicExonerationModal;
    window.closeAcademicExonerationModal = closeAcademicExonerationModal;
    window.saveAcademicExonerationForm = handleAcademicExonerationSubmit;

})(typeof window !== 'undefined' ? window : global);
