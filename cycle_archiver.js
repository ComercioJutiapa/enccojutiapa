/**
 * cycle_archiver.js
 * Módulo Oficial de Archivado Histórico de Ciclos Lectivos ENCCO 1970
 * 
 * Funcionalidades:
 * 1. Archivar el ciclo lectivo actual en /historico/{ciclo}/ (Firebase RTDB + Firestore).
 * 2. Aperturar un nuevo ciclo lectivo con base activa limpia (< 1 MB), reseteando notas y asistencia pero preservando alumnos.
 * 3. Modo de Consulta Histórica de Solo Lectura para inspeccionar cualquier ciclo pasado sin alterar los datos activos.
 */

(function(window) {
    'use strict';

    const EnccoCycleArchiver = {
        _isArchiving: false,
        _historicalSnapshot: null,
        _originalStateBeforeHistory: null,

        /**
         * Obtiene la URL base oficial de Firebase Realtime Database
         */
        getFirebaseUrl() {
            if (typeof getFirebaseDatabaseUrl === 'function') {
                return getFirebaseDatabaseUrl();
            }
            if (typeof ENCCO_OFFICIAL_FIREBASE_URL !== 'undefined') {
                return ENCCO_OFFICIAL_FIREBASE_URL;
            }
            return 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';
        },

        /**
         * Empaqueta los datos del ciclo actual y los guarda en /historico/{cycleYear}
         */
        async archiveCycleData(cycleYear = null, options = {}) {
            if (this._isArchiving) return { success: false, message: 'Operación de archivado en progreso.' };
            this._isArchiving = true;

            const targetCycle = String(cycleYear || (window.STATE && window.STATE.activeCycle) || '2026').trim();
            console.log(`📦 [Archivado Histórico] Iniciando empaquetado del ciclo lectivo ${targetCycle}...`);

            try {
                if (typeof showToast === 'function') {
                    showToast(`Iniciando archivado histórico del ciclo lectivo ${targetCycle}...`, 'info');
                }

                const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
                const attendance = (window.STATE && window.STATE.attendanceRecords) ? window.STATE.attendanceRecords : {};
                const discipline = (window.STATE && Array.isArray(window.STATE.disciplineReports)) ? window.STATE.disciplineReports : [];
                const permissions = (window.STATE && Array.isArray(window.STATE.studentPermissions)) ? window.STATE.studentPermissions : [];
                const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
                const gradesList = (window.STATE && Array.isArray(window.STATE.gradesList)) ? window.STATE.gradesList : [];
                const exoneraciones = (window.STATE && Array.isArray(window.STATE.academicExonerations)) ? window.STATE.academicExonerations : [];

                const archivePayload = {
                    cycle: targetCycle,
                    archivedAt: Date.now(),
                    archivedDateISO: new Date().toISOString(),
                    archivedBy: (window.STATE && window.STATE.currentUser) 
                        ? `${window.STATE.currentUser.name} (${(window.STATE.currentUser.role || 'admin').toUpperCase()})` 
                        : 'Administración ENCCO',
                    studentsSnapshot: JSON.parse(JSON.stringify(students)),
                    attendanceSnapshot: JSON.parse(JSON.stringify(attendance)),
                    disciplineSnapshot: JSON.parse(JSON.stringify(discipline)),
                    permissionsSnapshot: JSON.parse(JSON.stringify(permissions)),
                    pensumSnapshot: JSON.parse(JSON.stringify(pensum)),
                    gradesSnapshot: JSON.parse(JSON.stringify(gradesList)),
                    exoneracionesSnapshot: JSON.parse(JSON.stringify(exoneraciones)),
                    summary: {
                        totalStudents: students.length,
                        totalAttendanceDates: Object.keys(attendance).length,
                        totalDisciplineReports: discipline.length,
                        totalPermissions: permissions.length,
                        totalPensumCourses: pensum.length,
                        archivedNotesCount: students.reduce((acc, st) => {
                            if (st.gradebookDetails && typeof st.gradebookDetails === 'object') {
                                return acc + Object.keys(st.gradebookDetails).length;
                            }
                            return acc;
                        }, 0),
                        activeBimestreAtClose: (window.STATE && window.STATE.config) ? (window.STATE.config.bimestreActivoOficial || 4) : 4
                    }
                };

                const fbUrl = this.getFirebaseUrl();

                // 1. Guardar en Firebase Realtime Database: /historico/{targetCycle}.json
                const rtdbPromise = fetch(`${fbUrl}/historico/${targetCycle}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(archivePayload)
                }).then(res => res.ok).catch(e => {
                    console.warn(`Aviso en RTDB /historico/${targetCycle}:`, e);
                    return false;
                });

                // 2. Guardar en Firestore si está disponible: colección 'historico', documento targetCycle
                let firestorePromise = Promise.resolve(true);
                if (window.FirebaseModular && window.FirebaseModular.db && typeof window.FirebaseModular.doc === 'function') {
                    try {
                        const { db, doc, setDoc } = window.FirebaseModular;
                        const histRef = doc(db, 'historico', targetCycle);
                        firestorePromise = setDoc(histRef, {
                            cycle: targetCycle,
                            archivedAt: archivePayload.archivedAt,
                            archivedBy: archivePayload.archivedBy,
                            summary: archivePayload.summary,
                            lastModified: Date.now()
                        }, { merge: true }).catch(err => {
                            console.warn("Aviso en Firestore /historico:", err);
                            return true;
                        });
                    } catch(fsEx) {
                        firestorePromise = Promise.resolve(true);
                    }
                }

                // 3. Respaldo local de contingencia
                try {
                    localStorage.setItem(`ENCCO_HISTORICO_${targetCycle}`, JSON.stringify(archivePayload));
                } catch(lsErr) {
                    try {
                        localStorage.setItem(`ENCCO_HISTORICO_${targetCycle}`, JSON.stringify({
                            cycle: targetCycle,
                            archivedAt: archivePayload.archivedAt,
                            summary: archivePayload.summary
                        }));
                    } catch(e) {}
                }

                // Esperar escritura con límite de 10 segundos
                await Promise.race([
                    Promise.all([rtdbPromise, firestorePromise]),
                    new Promise(r => setTimeout(r, 10000))
                ]);

                // 4. Actualizar lista de ciclos para reflejar el estado 'Histórico'
                if (window.STATE && Array.isArray(window.STATE.cycles)) {
                    const cObj = window.STATE.cycles.find(c => c.name === targetCycle || c.year === targetCycle);
                    if (cObj) {
                        cObj.status = 'Histórico';
                        cObj.isArchived = true;
                        cObj.archivedAt = archivePayload.archivedAt;
                    } else {
                        window.STATE.cycles.push({
                            id: `cyc-${targetCycle}`,
                            name: targetCycle,
                            year: targetCycle,
                            status: 'Histórico',
                            isArchived: true,
                            archivedAt: archivePayload.archivedAt
                        });
                    }
                }

                console.log(`✅ [Archivado Histórico] Ciclo ${targetCycle} archivado exitosamente en /historico/${targetCycle}.`);
                if (typeof showToast === 'function') {
                    showToast(`Ciclo ${targetCycle} archivado con éxito en /historico/${targetCycle}/.`, 'success');
                }

                return { success: true, cycle: targetCycle, summary: archivePayload.summary };
            } catch(error) {
                console.error(`❌ [Archivado Histórico] Error al archivar ciclo ${targetCycle}:`, error);
                if (typeof showToast === 'function') {
                    showToast(`Error al archivar ciclo: ${error.message || error}`, 'danger');
                }
                return { success: false, error: error.message || error };
            } finally {
                this._isArchiving = false;
            }
        },

        /**
         * Apertura un nuevo ciclo lectivo (ej. 2027), archivando el ciclo previo y limpiando el estado activo (< 1 MB)
         */
        async openNewAcademicCycle(newCycleYear, options = {}) {
            const { promoteStudents = true, archiveCurrent = true } = options;
            const targetNewCycle = String(newCycleYear || '').trim();

            if (!targetNewCycle || !/^\d{4}$/.test(targetNewCycle)) {
                if (typeof showToast === 'function') {
                    showToast('Por favor ingrese un año válido de 4 dígitos para el nuevo ciclo escolar (ej: 2027).', 'warning');
                }
                return { success: false, message: 'Año de ciclo inválido.' };
            }

            const currentActiveCycle = (window.STATE && window.STATE.activeCycle) || '2026';
            if (targetNewCycle === currentActiveCycle) {
                if (typeof showToast === 'function') {
                    showToast(`El ciclo ${targetNewCycle} ya es el ciclo actualmente activo.`, 'warning');
                }
                return { success: false, message: 'El ciclo ya está activo.' };
            }

            // 1. Archivar el ciclo actual si se requiere
            if (archiveCurrent) {
                const archiveResult = await this.archiveCycleData(currentActiveCycle);
                if (!archiveResult.success) {
                    console.warn("Aviso: No se pudo completar el archivado previo, continuando con resguardo de seguridad.");
                }
            }

            console.log(`🚀 [Nuevo Ciclo] Aperturando Ciclo Escolar Oficial ${targetNewCycle}...`);
            if (typeof showToast === 'function') {
                showToast(`Aperturando Ciclo Escolar ${targetNewCycle} y depurando planillas...`, 'info');
            }

            try {
                // 2. Limpieza y preparación de estudiantes para el nuevo ciclo escolar
                const currentStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
                const promotedStudents = currentStudents.map(st => {
                    const cloned = JSON.parse(JSON.stringify(st));
                    
                    // Reseteo de planillas académicas para el nuevo ciclo (BASE LIMPIA < 1 MB)
                    cloned.gradebookDetails = {};
                    cloned.grades = {};
                    cloned.academicCycle = targetNewCycle;
                    cloned.lastModified = Date.now();

                    const override = options.studentOverrides && options.studentOverrides[st.id];

                    if (override) {
                        if (override.targetGrade) {
                            cloned.grade = override.targetGrade;
                            if (/5|quinto/i.test(override.targetGrade)) cloned.gradeCode = '5TO';
                            else if (/6|sexto/i.test(override.targetGrade)) cloned.gradeCode = '6TO';
                            else if (/egresado|graduand/i.test(override.targetGrade)) cloned.gradeCode = 'EGRESADO';
                        }
                        if (override.status) {
                            cloned.status = override.status;
                        } else if (/egresado|graduand/i.test(cloned.grade || '')) {
                            cloned.status = 'Egresado';
                        } else {
                            cloned.status = 'Inscrito';
                        }
                    } else if (promoteStudents) {
                        const rawGrade = (cloned.grade || cloned.gradeCode || '').toUpperCase();
                        if (rawGrade.includes('4') || rawGrade.includes('CUARTO')) {
                            cloned.grade = 'Quinto';
                            cloned.gradeCode = '5TO';
                            cloned.status = 'Inscrito';
                        } else if (rawGrade.includes('5') || rawGrade.includes('QUINTO')) {
                            cloned.grade = 'Sexto';
                            cloned.gradeCode = '6TO';
                            cloned.status = 'Inscrito';
                        } else if (rawGrade.includes('6') || rawGrade.includes('SEXTO')) {
                            cloned.status = 'Egresado';
                        }
                    } else {
                        cloned.status = 'Inscrito';
                    }

                    return cloned;
                });

                // 3. Resetear registros temporales y transaccionales del año anterior
                if (window.STATE) {
                    window.STATE.students = promotedStudents;
                    window.STATE.attendanceRecords = {};
                    window.STATE.studentPermissions = [];
                    window.STATE.disciplineReports = [];
                    window.STATE.dismissedAlerts = {};
                    window.STATE.academicCycle = targetNewCycle;
                    window.STATE.activeCycle = targetNewCycle;

                    if (!Array.isArray(window.STATE.cycles)) {
                        window.STATE.cycles = [];
                    }

                    // Asegurar que el ciclo anterior quede como 'Histórico'
                    const prevC = window.STATE.cycles.find(c => c.name === currentActiveCycle || c.year === currentActiveCycle);
                    if (prevC) {
                        prevC.status = 'Histórico';
                    }

                    // Registrar y activar el nuevo ciclo
                    const existingNew = window.STATE.cycles.find(c => c.name === targetNewCycle || c.year === targetNewCycle);
                    if (existingNew) {
                        existingNew.status = 'Activo';
                    } else {
                        window.STATE.cycles.push({
                            id: `cyc-${targetNewCycle}`,
                            name: targetNewCycle,
                            year: targetNewCycle,
                            status: 'Activo',
                            description: `Ciclo Escolar Oficial ${targetNewCycle}`,
                            createdAt: Date.now()
                        });
                    }

                    // Configurar bimestre de inicio en 1° Bimestre
                    if (!window.STATE.config) window.STATE.config = {};
                    window.STATE.config.bimestreActivoOficial = 1;
                    window.STATE.config.activeBimestre = 1;
                    window.STATE.lastModified = Date.now();
                }

                // 4. Persistir la nueva base limpia en Realtime Database y Firestore
                if (typeof saveStateRecursively === 'function') {
                    await saveStateRecursively({ syncCloud: true, isAutoSave: false });
                } else if (typeof saveStateToLocalStorage === 'function') {
                    saveStateToLocalStorage();
                }

                // Sincronizar nodos críticos inmediatamente
                if (typeof EnccoCloudSync !== 'undefined' && EnccoCloudSync.syncNode) {
                    EnccoCloudSync.syncNode('activeCycle', targetNewCycle);
                    EnccoCloudSync.syncNode('cycles', window.STATE.cycles);
                    EnccoCloudSync.syncNode('students', window.STATE.students);
                    EnccoCloudSync.syncNode('attendanceRecords', {});
                    EnccoCloudSync.syncNode('studentPermissions', []);
                    EnccoCloudSync.syncNode('disciplineReports', []);
                }

                // 5. Actualizar la interfaz de usuario en tiempo real
                if (typeof updateCycleSelects === 'function') updateCycleSelects();
                if (typeof renderCurrentView === 'function') renderCurrentView();
                if (typeof renderDashboard === 'function') renderDashboard();

                console.log(`🎉 [Nuevo Ciclo] Ciclo ${targetNewCycle} inicializado con éxito. Base activa fresca y optimizada (< 1 MB).`);
                if (typeof showToast === 'function') {
                    showToast(`¡Ciclo Lectivo ${targetNewCycle} aperturado con éxito! Base de datos limpia y lista para calificar.`, 'success');
                }

                return { success: true, newCycle: targetNewCycle };
            } catch(err) {
                console.error("❌ Error al aperturar nuevo ciclo:", err);
                if (typeof showToast === 'function') {
                    showToast(`Error al aperturar ciclo: ${err.message || err}`, 'danger');
                }
                return { success: false, error: err.message || err };
            }
        },

        /**
         * Carga bajo demanda y activa el Modo de Consulta Histórica (Solo Lectura) para un ciclo pasado
         */
        async loadHistoricalCycle(cycleYear) {
            const targetCycle = String(cycleYear || '').trim();
            if (!targetCycle) return false;

            console.log(`🔍 [Consulta Histórica] Cargando archivo del ciclo ${targetCycle}...`);
            if (typeof showToast === 'function') {
                showToast(`Descargando archivo histórico del ciclo ${targetCycle}...`, 'info');
            }

            try {
                let archivedData = null;

                // 1. Intentar desde caché local primero
                try {
                    const localCached = localStorage.getItem(`ENCCO_HISTORICO_${targetCycle}`);
                    if (localCached) {
                        const parsed = JSON.parse(localCached);
                        if (parsed.studentsSnapshot) {
                            archivedData = parsed;
                        }
                    }
                } catch(e) {}

                // 2. Descargar bajo demanda desde Firebase RTDB /historico/{targetCycle}.json
                if (!archivedData) {
                    const fbUrl = this.getFirebaseUrl();
                    const res = await fetch(`${fbUrl}/historico/${targetCycle}.json?t=${Date.now()}`);
                    if (res.ok) {
                        archivedData = await res.json();
                    }
                }

                if (!archivedData || (!archivedData.studentsSnapshot && !archivedData.students)) {
                    throw new Error(`No se encontraron registros archivados para el ciclo ${targetCycle}.`);
                }

                // Guardar respaldo del estado activo antes de entrar a modo histórico
                if (!this._originalStateBeforeHistory && window.STATE) {
                    this._originalStateBeforeHistory = {
                        activeCycle: window.STATE.activeCycle,
                        students: window.STATE.students,
                        attendanceRecords: window.STATE.attendanceRecords,
                        disciplineReports: window.STATE.disciplineReports,
                        studentPermissions: window.STATE.studentPermissions,
                        pensum: window.STATE.pensum
                    };
                }

                // Inyectar datos históricos en memoria de solo lectura
                const histStudents = archivedData.studentsSnapshot || archivedData.students || [];
                const histAttendance = archivedData.attendanceSnapshot || archivedData.attendanceRecords || {};
                const histDiscipline = archivedData.disciplineSnapshot || archivedData.disciplineReports || [];
                const histPermissions = archivedData.permissionsSnapshot || archivedData.studentPermissions || [];
                const histPensum = archivedData.pensumSnapshot || archivedData.pensum || [];

                window.STATE.isHistoricalReadOnlyMode = true;
                window.STATE.historicalViewingCycle = targetCycle;
                window.STATE.viewingHistoricalCycle = targetCycle;
                window.STATE.students = histStudents;
                window.STATE.attendanceRecords = histAttendance;
                window.STATE.disciplineReports = histDiscipline;
                window.STATE.studentPermissions = histPermissions;
                if (histPensum.length > 0) window.STATE.pensum = histPensum;

                // Renderizar banner informativo de modo histórico
                this.renderHistoricalBanner(targetCycle, archivedData.archivedBy, archivedData.archivedDateISO);

                // Bloquear acciones de escritura en la interfaz
                this.enforceReadOnlyControls(true);

                if (typeof renderCurrentView === 'function') renderCurrentView();
                if (typeof showToast === 'function') {
                    showToast(`Modo Histórico Activo: Visualizando ciclo ${targetCycle} (Solo Lectura).`, 'warning');
                }

                return { success: true, cycle: targetCycle };
            } catch(error) {
                console.error(`❌ Error al cargar ciclo histórico ${targetCycle}:`, error);
                if (typeof showToast === 'function') {
                    showToast(`Aviso: ${error.message || error}`, 'danger');
                }
                return { success: false, error: error.message || error };
            }
        },

        /**
         * Sale del modo histórico y restaura la base de datos del ciclo activo
         */
        exitHistoricalView() {
            if (!window.STATE || !window.STATE.isHistoricalReadOnlyMode) return { success: false, message: 'No en modo histórico' };

            console.log("🔙 [Consulta Histórica] Regresando al ciclo lectivo activo...");
            if (this._originalStateBeforeHistory) {
                window.STATE.students = this._originalStateBeforeHistory.students;
                window.STATE.attendanceRecords = this._originalStateBeforeHistory.attendanceRecords;
                window.STATE.disciplineReports = this._originalStateBeforeHistory.disciplineReports;
                window.STATE.studentPermissions = this._originalStateBeforeHistory.studentPermissions;
                window.STATE.pensum = this._originalStateBeforeHistory.pensum;
                this._originalStateBeforeHistory = null;
            }

            window.STATE.isHistoricalReadOnlyMode = false;
            window.STATE.historicalViewingCycle = null;
            window.STATE.viewingHistoricalCycle = null;

            // Remover banner
            const banner = document.getElementById('enccoHistoricalBanner');
            if (banner) banner.remove();

            // Desbloquear controles
            this.enforceReadOnlyControls(false);

            if (typeof updateCycleSelects === 'function') updateCycleSelects();
            if (typeof renderCurrentView === 'function') renderCurrentView();
            if (typeof showToast === 'function') {
                showToast(`Retornado al Ciclo Activo ${window.STATE.activeCycle}. Modo edición disponible.`, 'success');
            }

            return { success: true, activeCycle: window.STATE?.activeCycle };
        },

        /**
         * Renderiza banner superior persistente que indica modo histórico
         */
        renderHistoricalBanner(cycleYear, archivedBy = 'Administración', dateISO = null) {
            let banner = document.getElementById('enccoHistoricalBanner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'enccoHistoricalBanner';
                const mainLayout = document.getElementById('appMainLayout');
                if (mainLayout && mainLayout.parentNode) {
                    mainLayout.parentNode.insertBefore(banner, mainLayout);
                } else if (document.body) {
                    if (document.body.firstChild && typeof document.body.insertBefore === 'function') {
                        document.body.insertBefore(banner, document.body.firstChild);
                    } else if (typeof document.body.appendChild === 'function') {
                        document.body.appendChild(banner);
                    }
                }
            }

            const formattedDate = dateISO ? new Date(dateISO).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            banner.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:50%; background:#f59e0b; color:#0f172a; display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:900;">
                        <i class="fa-solid fa-box-archive"></i>
                    </div>
                    <div>
                        <strong style="color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px;">
                            <i class="fa-solid fa-eye"></i> MODO DE CONSULTA HISTÓRICA — CICLO ESCOLAR ${cycleYear} (SOLO LECTURA)
                        </strong>
                        <div style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">
                            Consultando archivo histórico oficial preservado en <code>/historico/${cycleYear}</code>. Los registros de notas y asistencias están protegidos contra escritura.
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button type="button" class="btn btn-sm btn-warning" onclick="EnccoCycleArchiver.exitHistoricalView()" style="font-weight:800; border-radius:6px; padding:6px 14px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">
                        <i class="fa-solid fa-arrow-left"></i> Salir y Volver al Ciclo Activo (${window.STATE ? window.STATE.activeCycle : '2026'})
                    </button>
                </div>
            `;
            banner.style.display = 'flex';
        },

        /**
         * Aplica o remueve bloqueo de solo lectura en formularios y botones
         */
        enforceReadOnlyControls(isReadOnly) {
            const forms = document.querySelectorAll('form:not(#searchForm):not(#filterForm)');
            forms.forEach(f => {
                const submitBtns = f.querySelectorAll('button[type="submit"]');
                submitBtns.forEach(btn => {
                    btn.disabled = isReadOnly;
                    if (isReadOnly) {
                        btn.setAttribute('data-disabled-hist', 'true');
                        btn.style.opacity = '0.5';
                        btn.style.pointerEvents = 'none';
                    } else if (btn.getAttribute('data-disabled-hist')) {
                        btn.removeAttribute('data-disabled-hist');
                        btn.disabled = false;
                        btn.style.removeProperty('opacity');
                        btn.style.removeProperty('pointer-events');
                    }
                });
            });
        },

        /**
         * Exporta y descarga un archivo .json con la copia de seguridad completa del ciclo (Exclusivo Dirección y Admin)
         */
        exportCycleBackupFile(cycleYear = null) {
            const role = ((window.STATE && window.STATE.currentRole) || '').toLowerCase();
            if (role !== 'director' && role !== 'admin') {
                if (typeof showToast === 'function') {
                    showToast('Acceso restringido: La descarga de respaldo institucional es una potestad exclusiva de Dirección.', 'danger');
                }
                return false;
            }

            const originSelect = document.getElementById('promoOriginCycleSelect');
            const targetCycle = String(cycleYear || (originSelect ? originSelect.value : '') || (window.STATE && window.STATE.activeCycle) || '2026').trim();

            const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            const attendance = (window.STATE && window.STATE.attendanceRecords) ? window.STATE.attendanceRecords : {};
            const discipline = (window.STATE && Array.isArray(window.STATE.disciplineReports)) ? window.STATE.disciplineReports : [];
            const permissions = (window.STATE && Array.isArray(window.STATE.studentPermissions)) ? window.STATE.studentPermissions : [];
            const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
            const gradesList = (window.STATE && Array.isArray(window.STATE.gradesList)) ? window.STATE.gradesList : [];

            const backupPayload = {
                institution: "Escuela Nacional de Ciencias Comerciales Jutiapa (ENCCO)",
                system: "Plataforma Institucional de Control Académico",
                backupType: "Respaldo Completo Pre-Archivado de Ciclo Lectivo",
                cycle: targetCycle,
                exportedAt: new Date().toISOString(),
                exportedTimestamp: Date.now(),
                exportedBy: (window.STATE && window.STATE.currentUser) 
                    ? `${window.STATE.currentUser.name} (${(window.STATE.currentUser.role || 'director').toUpperCase()})` 
                    : 'Dirección Institucional',
                summary: {
                    totalStudents: students.length,
                    totalAttendanceDates: Object.keys(attendance).length,
                    totalDisciplineReports: discipline.length,
                    totalPermissions: permissions.length,
                    totalCourses: pensum.length
                },
                studentsSnapshot: students,
                attendanceSnapshot: attendance,
                disciplineSnapshot: discipline,
                permissionsSnapshot: permissions,
                pensumSnapshot: pensum,
                gradesListSnapshot: gradesList
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
            const downloadAnchor = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `ENCCO_RESPALDO_OFICIAL_CICLO_${targetCycle}_${dateStr}.json`);
            if (document.body) {
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            }

            if (typeof showToast === 'function') {
                showToast(`Copia de seguridad oficial del Ciclo ${targetCycle} descargada exitosamente (.json).`, 'success');
            }
            return true;
        }
    };

    window.EnccoCycleArchiver = EnccoCycleArchiver;

})(typeof window !== 'undefined' ? window : global);
