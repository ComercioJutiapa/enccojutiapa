/**
 * cycle_archiver.js
 * Módulo Oficial de Archivado Histórico y Promoción de Ciclos Lectivos ENCCO 1970
 * 
 * Funcionalidades:
 * 1. Archivar el ciclo lectivo actual en /historico/{ciclo}/ y /encc_school_state/historico/{ciclo}/ (Firebase RTDB + Firestore).
 * 2. Aperturar un nuevo ciclo lectivo con base activa limpia (< 1 MB), promoviendo alumnos canónicamente, reseteando notas/asistencia/exoneraciones y preservando asignaciones docentes.
 * 3. Modo de Consulta Histórica de Solo Lectura reactivo y coherente para inspeccionar cualquier ciclo pasado sin alterar los datos activos.
 */

(function(window) {
    'use strict';

    // Catálogo oficial CNB de cursos por grado para Perito Contador
    const OFFICIAL_CNB_GRADE_COURSES = {
        '4': [
            'Matemática Comercial',
            'Introducción a la Economía',
            'Administración y Organización de Empresas',
            'Redacción y Correspondencia Mercantil',
            'Contabilidad de Sociedades',
            'Inglés Comercial I',
            'Fundamentos de Derecho',
            'Computación I',
            'Caligrafía y Ortografía'
        ],
        '5': [
            'Cálculo Mercantil y Financiero',
            'Mecanografía',
            'Contabilidad de Costos',
            'Geografía Económica',
            'Catalogación y Archivo',
            'Legislación Fiscal y Aduanera',
            'Finanzas Públicas',
            'Computación II',
            'Inglés Comercial II'
        ],
        '6': [
            'Auditoría',
            'Computación III',
            'Contabilidad Bancaria',
            'Contabilidad Gubernamental e Integrada',
            'Derecho Mercantil y Laboral',
            'Estadística Comercial',
            'Organización de Empresas y Técnicas de Oficina',
            'Práctica Supervisada',
            'Seminario sobre Problemas Socioeconómicos de Guatemala',
            'Ética Profesional y Relaciones Humanas'
        ]
    };
    if (typeof window !== 'undefined') {
        window.OFFICIAL_GRADE_SUBJECTS = OFFICIAL_CNB_GRADE_COURSES;
    }

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
         * Normaliza Grado, Sección, Código de Grado y Etiqueta Canónica ENCCO
         */
        normalizeCanonicalGradeAndSection(rawGrade, rawSection) {
            const secStr = String(rawSection || rawGrade || '').trim();
            const secMatch = secStr.match(/(?:Secci[oó]n\s*|\b)([A-Z])\b/i);
            const secLetter = secMatch ? secMatch[1].toUpperCase() : 'A';
            const canonicalSection = `Sección ${secLetter}`;

            const gStr = String(rawGrade || '').trim();
            const gUpper = gStr.toUpperCase();

            if (/EGRESAD|GRADUAND/i.test(gUpper)) {
                return {
                    grade: 'Graduando / Egresado',
                    section: canonicalSection,
                    sectionLetter: secLetter,
                    gradeCode: 'EGRESADO',
                    gradeLabel: `Graduando / Egresado (${canonicalSection})`,
                    gradeNum: null,
                    isEgresado: true
                };
            }

            if (gUpper.includes('6') || gUpper.includes('SEXTO')) {
                return {
                    grade: '6to Perito Contador',
                    section: canonicalSection,
                    sectionLetter: secLetter,
                    gradeCode: `6to ${secLetter}`,
                    gradeLabel: `6to Perito Contador (${canonicalSection})`,
                    gradeNum: '6',
                    isEgresado: false
                };
            }

            if (gUpper.includes('5') || gUpper.includes('QUINTO')) {
                return {
                    grade: '5to Perito Contador',
                    section: canonicalSection,
                    sectionLetter: secLetter,
                    gradeCode: `5to ${secLetter}`,
                    gradeLabel: `5to Perito Contador (${canonicalSection})`,
                    gradeNum: '5',
                    isEgresado: false
                };
            }

            return {
                grade: '4to Perito Contador',
                section: canonicalSection,
                sectionLetter: secLetter,
                gradeCode: `4to ${secLetter}`,
                gradeLabel: `4to Perito Contador (${canonicalSection})`,
                gradeNum: '4',
                isEgresado: false
            };
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

                if (typeof window !== 'undefined' && window.STATE && typeof window.normalizeSchoolAcademicData === 'function') {
                    window.normalizeSchoolAcademicData(window.STATE);
                }

                const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
                const attendance = (window.STATE && window.STATE.attendanceRecords) ? window.STATE.attendanceRecords : {};
                const discipline = (window.STATE && Array.isArray(window.STATE.disciplineReports)) ? window.STATE.disciplineReports : [];
                const permissions = (window.STATE && Array.isArray(window.STATE.studentPermissions)) ? window.STATE.studentPermissions : [];
                const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
                const gradesList = (window.STATE && Array.isArray(window.STATE.gradesList)) ? window.STATE.gradesList : [];
                const exoneraciones = (window.STATE && Array.isArray(window.STATE.academicExonerations)) ? window.STATE.academicExonerations : [];
                const exoneracionesMap = (window.STATE && window.STATE.exoneraciones && typeof window.STATE.exoneraciones === 'object') ? window.STATE.exoneraciones : {};
                const recuperaciones = (window.STATE && window.STATE.recuperaciones && typeof window.STATE.recuperaciones === 'object') ? window.STATE.recuperaciones : {};
                const studentAnnotations = (window.STATE && Array.isArray(window.STATE.studentAnnotations)) ? window.STATE.studentAnnotations : [];
                const calificaciones = (window.STATE && window.STATE.calificaciones && typeof window.STATE.calificaciones === 'object') ? window.STATE.calificaciones : {};
                const gradingConfigs = (window.STATE && window.STATE.gradingConfigs && typeof window.STATE.gradingConfigs === 'object') ? window.STATE.gradingConfigs : {};
                const configSnapshot = (window.STATE && window.STATE.config && typeof window.STATE.config === 'object') ? window.STATE.config : {};

                const archivedNotesCount = students.reduce((acc, st) => {
                    if (!st) return acc;
                    const detailsKeys = (st.gradebookDetails && typeof st.gradebookDetails === 'object') ? Object.keys(st.gradebookDetails) : [];
                    const gradesKeys = (st.grades && typeof st.grades === 'object') ? Object.keys(st.grades) : [];
                    const uniqueSubjs = new Set([...detailsKeys, ...gradesKeys]);
                    return acc + uniqueSubjs.size;
                }, 0);

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
                    exoneracionesMapSnapshot: JSON.parse(JSON.stringify(exoneracionesMap)),
                    recuperacionesSnapshot: JSON.parse(JSON.stringify(recuperaciones)),
                    annotationsSnapshot: JSON.parse(JSON.stringify(studentAnnotations)),
                    calificacionesSnapshot: JSON.parse(JSON.stringify(calificaciones)),
                    gradingConfigsSnapshot: JSON.parse(JSON.stringify(gradingConfigs)),
                    configSnapshot: JSON.parse(JSON.stringify(configSnapshot)),
                    summary: {
                        totalStudents: students.length,
                        totalAttendanceDates: Object.keys(attendance).length,
                        totalDisciplineReports: discipline.length,
                        totalPermissions: permissions.length,
                        totalPensumCourses: pensum.length,
                        archivedNotesCount: archivedNotesCount,
                        archivedAt: Date.now(),
                        activeBimestreAtClose: (window.STATE && window.STATE.config) ? (window.STATE.config.bimestreActivoOficial || 4) : 4
                    }
                };

                const fbUrl = this.getFirebaseUrl();

                // 1. Guardar en Firebase Realtime Database: /historico/{targetCycle}.json y /encc_school_state/historico/{targetCycle}.json
                const rtdbRootPromise = (typeof fetch === 'function')
                    ? fetch(`${fbUrl}/historico/${targetCycle}.json`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(archivePayload)
                    }).then(res => res.ok).catch(e => {
                        console.warn(`Aviso en RTDB /historico/${targetCycle}:`, e);
                        return false;
                    })
                    : Promise.resolve(true);

                const rtdbStatePromise = (typeof fetch === 'function')
                    ? fetch(`${fbUrl}/encc_school_state/historico/${targetCycle}.json`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(archivePayload)
                    }).then(res => res.ok).catch(() => false)
                    : Promise.resolve(true);

                // 2. Guardar en Firestore si está disponible: colección 'historico', documento targetCycle
                let firestorePromise = Promise.resolve(true);
                if (window.FirebaseModular && window.FirebaseModular.db && typeof window.FirebaseModular.doc === 'function') {
                    try {
                        const { db, doc, setDoc } = window.FirebaseModular;
                        const histRef = doc(db, 'historico', targetCycle);
                        firestorePromise = setDoc(histRef, {
                            cycle: targetCycle,
                            archivedAt: archivePayload.archivedAt,
                            archivedDateISO: archivePayload.archivedDateISO,
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

                // 3. Respaldo en memoria de sesión volátil (Cero persistencia en disco duro)
                if (!this._sessionCache) this._sessionCache = {};
                this._sessionCache[targetCycle] = archivePayload;
                if (typeof sessionStorage !== 'undefined') {
                    try {
                        sessionStorage.setItem(`ENCCO_HISTORICO_${targetCycle}`, JSON.stringify(archivePayload));
                    } catch(e) {}
                }
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.removeItem(`ENCCO_HISTORICO_${targetCycle}`);
                    } catch(e) {}
                }

                // Esperar escritura con límite de 10 segundos
                await Promise.race([
                    Promise.all([rtdbRootPromise, rtdbStatePromise, firestorePromise]),
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

                return { success: true, cycle: targetCycle, summary: archivePayload.summary, payload: archivePayload };
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
         * Evalúa automáticamente la promoción de un estudiante considerando materias reprobadas
         * y sus calificaciones en 1ª/2ª oportunidad de recuperación (umbral >= 60).
         */
        evaluateStudentPromotionWithRecuperaciones(st, prevGrade, cycle) {
            const gradesMap = (st && st.grades && typeof st.grades === 'object') ? st.grades : {};
            const failedCourses = [];
            Object.keys(gradesMap).forEach(subjName => {
                const raw = gradesMap[subjName];
                let nums = [];
                if (Array.isArray(raw)) {
                    nums = raw.map(v => Number(v)).filter(v => Number.isFinite(v));
                } else if (raw && typeof raw === 'object') {
                    nums = ['b1', 'b2', 'b3', 'b4'].map(k => Number(raw[k])).filter(v => Number.isFinite(v));
                }
                // Ignorar cursos sin ninguna nota > 0 (alumnos sin evaluar / estructura vacía)
                if (nums.length === 0 || nums.every(v => v === 0)) return;
                const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
                if (avg < 60) {
                    failedCourses.push({ materia: subjName, nota: avg });
                }
            });

            if (failedCourses.length === 0) {
                return { shouldPromote: true, statusLabel: 'Promovido' };
            }

            const grUpper = String(prevGrade || (st && (st.grade || st.gradeCode || st.gradeLabel)) || '').toUpperCase();
            const gKey = (grUpper.includes('6') || grUpper.includes('SEXTO'))
                ? 'SEXTO'
                : ((grUpper.includes('5') || grUpper.includes('QUINTO')) ? 'QUINTO' : 'CUARTO');
            const maxRecup = (gKey === 'SEXTO') ? 4 : 3;

            if (failedCourses.length > maxRecup) {
                return { shouldPromote: false, statusLabel: 'Reprobado Definitivo' };
            }

            const studentCode = String((st && (st.code || st.studentCode || st.personalCode || st.cui)) || '').trim().toUpperCase();
            if (typeof window !== 'undefined' && typeof window.evaluateStudentPostRecovery === 'function') {
                const post = window.evaluateStudentPostRecovery({
                    code: studentCode,
                    grade: gKey,
                    isConDerecho: true,
                    reprobadas: failedCourses
                }, cycle);
                if (post && post.isPromovidoRecup) {
                    return { shouldPromote: true, statusLabel: 'Promovido en Recuperación' };
                }
                if (post && post.isReprobadoRecup) {
                    return { shouldPromote: false, statusLabel: 'Reprobado Post-Recuperación' };
                }
                return { shouldPromote: false, statusLabel: 'Pendiente Recuperación' };
            }

            // Respaldo autónomo si grade_stats.js no está cargado en el entorno actual
            const stState = (typeof window !== 'undefined' && window.STATE) ? window.STATE : {};
            const recRoot = (stState.recuperaciones && typeof stState.recuperaciones === 'object') ? stState.recuperaciones : {};
            const stuRecs = recRoot[studentCode] || recRoot[studentCode.toLowerCase()] || null;
            if (!stuRecs || typeof stuRecs !== 'object') {
                return { shouldPromote: false, statusLabel: 'Pendiente Recuperación' };
            }

            let aprobadas = 0;
            let perdidasDef = 0;
            failedCourses.forEach(fc => {
                const normSlugLower = String(fc.materia || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                const entry = stuRecs[normSlugLower] || stuRecs[normSlugLower.toUpperCase()] || Object.values(stuRecs).find(e => e && String(e.materia || '').toUpperCase().trim() === String(fc.materia || '').toUpperCase().trim()) || null;
                if (entry) {
                    const o1 = (entry.opp1 !== null && entry.opp1 !== undefined && entry.opp1 !== '') ? Number(entry.opp1) : null;
                    const o2 = (entry.opp2 !== null && entry.opp2 !== undefined && entry.opp2 !== '') ? Number(entry.opp2) : null;
                    const fin = (o1 !== null && o1 >= 60) ? o1 : (o2 !== null ? Math.max(o1 || 0, o2) : o1);
                    if (fin !== null) {
                        if (fin >= 60) aprobadas++;
                        else if (o2 !== null || (o1 !== null && o1 < 60 && o2 !== null)) perdidasDef++;
                    }
                }
            });

            if (aprobadas === failedCourses.length) {
                return { shouldPromote: true, statusLabel: 'Promovido en Recuperación' };
            }
            if (perdidasDef > 0 && (aprobadas + perdidasDef === failedCourses.length)) {
                return { shouldPromote: false, statusLabel: 'Reprobado Post-Recuperación' };
            }
            return { shouldPromote: false, statusLabel: 'Pendiente Recuperación' };
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

            const currentActiveCycle = String((window.STATE && window.STATE.activeCycle) || '2026').trim();
            if (targetNewCycle === currentActiveCycle) {
                if (typeof showToast === 'function') {
                    showToast(`El ciclo ${targetNewCycle} ya es el ciclo actualmente activo.`, 'warning');
                }
                return { success: false, message: 'El ciclo ya está activo.' };
            }

            // Si estaba en modo de consulta histórica, salir primero al ciclo activo antes de archivar/promover
            if (window.STATE && window.STATE.isHistoricalReadOnlyMode) {
                this.exitHistoricalView();
            }

            // 1. Archivar el ciclo actual si se requiere
            if (archiveCurrent) {
                const archiveResult = await this.archiveCycleData(currentActiveCycle);
                if (!archiveResult.success) {
                    console.warn("Aviso: No se pudo completar el archivado previo en nube, continuando con resguardo local.");
                }
            }

            console.log(`🚀 [Nuevo Ciclo] Aperturando Ciclo Escolar Oficial ${targetNewCycle}...`);
            if (typeof showToast === 'function') {
                showToast(`Aperturando Ciclo Escolar ${targetNewCycle} y depurando planillas...`, 'info');
            }

            try {
                // 2. Limpieza y preparación canónica de estudiantes para el nuevo ciclo escolar
                const currentStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
                let promotedCount = 0;
                let graduatedCount = 0;
                let retainedCount = 0;

                const graduatedCohort = [];

                const promotedStudents = currentStudents.map(st => {
                    if (!st) return null;
                    const cloned = JSON.parse(JSON.stringify(st));
                    const prevGrade = st.grade || '4to Perito Contador';
                    const prevSection = st.section || '';

                    // Excluir de la nómina activa del nuevo ciclo a alumnos ya retirados o egresados en ciclos previos
                    const stStatusLower = String(st.status || '').toLowerCase().trim();
                    const grRawLower = String(st.grade || st.gradeCode || st.gradeLabel || '').toLowerCase();
                    if (stStatusLower === 'egresado' || grRawLower.includes('egresad') || grRawLower.includes('graduand')) {
                        return null;
                    }
                    if (stStatusLower === 'retirado') {
                        cloned.academicCycle = st.academicCycle || st.cycle || currentActiveCycle;
                        cloned.cycle = cloned.academicCycle;
                        cloned.active = false;
                        return null;
                    }

                    // Reseteo total de planillas académicas y exoneraciones para el nuevo ciclo (BASE LIMPIA < 1 MB)
                    cloned.gradebookDetails = {};
                    cloned.grades = {};
                    cloned.academicExceptions = [];
                    cloned.exoneraciones = [];
                    delete cloned.isExonerated;
                    delete cloned.exonerado;
                    delete cloned.exoneratedBimestre;

                    cloned.previousCycle = currentActiveCycle;
                    cloned.previousGrade = prevGrade;
                    cloned.previousSection = prevSection;
                    cloned.editedByAuthority = true;
                    cloned.lastModified = Date.now();

                    const override = options.studentOverrides && options.studentOverrides[st.id];
                    let targetGradeInput = prevGrade;
                    let targetSectionInput = prevSection;
                    let wasPromoted = false;
                    let computedPromoStatus = '';

                    if (override) {
                        wasPromoted = !!override.shouldPromote;
                        computedPromoStatus = override.academicPromotionStatus || '';
                        targetGradeInput = override.targetGrade || (wasPromoted && typeof window.getNextGradeLevel === 'function' ? window.getNextGradeLevel(prevGrade) : prevGrade);
                        targetSectionInput = override.targetSection || prevSection;
                    } else if (promoteStudents) {
                        const evalRecup = this.evaluateStudentPromotionWithRecuperaciones(st, prevGrade, currentActiveCycle);
                        wasPromoted = evalRecup.shouldPromote;
                        computedPromoStatus = evalRecup.statusLabel || '';
                        if (wasPromoted) {
                            const rawUpper = String(prevGrade || prevSection).toUpperCase();
                            if (rawUpper.includes('4') || rawUpper.includes('CUARTO')) {
                                targetGradeInput = '5to Perito Contador';
                            } else if (rawUpper.includes('5') || rawUpper.includes('QUINTO')) {
                                targetGradeInput = '6to Perito Contador';
                            } else if (rawUpper.includes('6') || rawUpper.includes('SEXTO')) {
                                targetGradeInput = 'Graduando / Egresado';
                            }
                        } else {
                            targetGradeInput = prevGrade;
                        }
                    }

                    const normalized = this.normalizeCanonicalGradeAndSection(targetGradeInput, targetSectionInput);

                    if (normalized.isEgresado || (override && override.status === 'Egresado')) {
                        // 🛡️ REGLA PERPETUA MULTI-CICLO (2027, 2028, 2029...):
                        // Los graduados permanecen en su ciclo de graduación (currentActiveCycle) y NO pasan a los listados del nuevo ciclo.
                        cloned.grade = 'Graduando / Egresado';
                        cloned.section = normalized.section;
                        cloned.gradeCode = 'EGRESADO';
                        cloned.gradeLabel = `Graduando / Egresado (${normalized.section})`;
                        cloned.status = 'Egresado';
                        cloned.statusSire = 'EGRESADO';
                        cloned.active = false;
                        cloned.graduationCycle = currentActiveCycle;
                        cloned.cycle = currentActiveCycle;
                        cloned.academicCycle = currentActiveCycle;
                        graduatedCohort.push(cloned);
                        graduatedCount++;
                        return null;
                    } else {
                        cloned.grade = normalized.grade;
                        cloned.section = normalized.section;
                        cloned.gradeCode = normalized.gradeCode;
                        cloned.gradeLabel = normalized.gradeLabel;
                        cloned.cycle = targetNewCycle;
                        cloned.academicCycle = targetNewCycle;
                        cloned.status = (override && override.status === 'Pendiente') ? 'Pendiente' : 'Activo';
                        cloned.statusSire = 'INSCRITO';
                        cloned.active = true;
                        if (wasPromoted) {
                            cloned.academicPromotionStatus = computedPromoStatus || 'Promovido';
                            promotedCount++;
                        } else {
                            cloned.academicPromotionStatus = computedPromoStatus || 'Pendiente Recuperación';
                            retainedCount++;
                        }

                        // Inicializar estructura limpia de cursos para el nuevo grado (todas las notas estrictamente en 0)
                        cloned.grades = {};
                        cloned.gradebookDetails = {};
                        const gradeNumKey = String(normalized.gradeNum || '');
                        const officialSubjs = (window.OFFICIAL_GRADE_SUBJECTS && window.OFFICIAL_GRADE_SUBJECTS[gradeNumKey]) ||
                                              OFFICIAL_CNB_GRADE_COURSES[gradeNumKey];
                        if (Array.isArray(officialSubjs)) {
                            officialSubjs.forEach(subjName => {
                                cloned.grades[subjName] = [0, 0, 0, 0];
                            });
                        }
                    }

                    return cloned;
                }).filter(Boolean);

                // Resguardar cohorte de egresados y recuperaciones del ciclo que cierra en memoria y en /encc_school_state/historico/{currentActiveCycle}/
                const closingRecuperaciones = (window.STATE && window.STATE.recuperaciones && typeof window.STATE.recuperaciones === 'object')
                    ? JSON.parse(JSON.stringify(window.STATE.recuperaciones))
                    : {};
                if (window.STATE) {
                    if (!window.STATE.graduatedStudentsByCycle) window.STATE.graduatedStudentsByCycle = {};
                    window.STATE.graduatedStudentsByCycle[currentActiveCycle] = graduatedCohort;
                    if (!window.STATE.recuperacionesByCycle || typeof window.STATE.recuperacionesByCycle !== 'object') {
                        window.STATE.recuperacionesByCycle = {};
                    }
                    window.STATE.recuperacionesByCycle[currentActiveCycle] = closingRecuperaciones;
                }
                if (typeof fetch === 'function') {
                    const fbUrl = this.getFirebaseUrl();
                    if (graduatedCohort.length > 0) {
                        fetch(`${fbUrl}/encc_school_state/historico/${currentActiveCycle}/egresadosSnapshot.json`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(graduatedCohort)
                        }).catch(() => {});
                    }
                    if (Object.keys(closingRecuperaciones).length > 0) {
                        fetch(`${fbUrl}/encc_school_state/historico/${currentActiveCycle}/recuperacionesSnapshot.json`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(closingRecuperaciones)
                        }).catch(() => {});
                    }
                }

                // 3. Resetear registros temporales y transaccionales del año anterior preservando la bitácora acumulativa y asignaciones docentes
                if (window.STATE) {
                    window.STATE.students = promotedStudents;
                    try {
                        if (window.STATE.attendanceRecords && Object.keys(window.STATE.attendanceRecords).length > 0) {
                            if (typeof sessionStorage !== 'undefined') {
                                sessionStorage.setItem('ENCCO_ATTENDANCE_MASTER_BACKUP', JSON.stringify(window.STATE.attendanceRecords));
                            }
                            if (typeof localStorage !== 'undefined') {
                                localStorage.removeItem('ENCCO_ATTENDANCE_MASTER_BACKUP');
                            }
                        }
                    } catch(e) {}

                    window.STATE.attendanceRecords = {};
                    window.STATE.attendanceAlerts = [];
                    window.STATE.studentPermissions = [];
                    window.STATE.disciplineReports = [];
                    window.STATE.gradeEditRequests = [];
                    window.STATE.announcements = [];
                    window.STATE.academicExonerations = [];
                    window.STATE.exoneraciones = {};
                    window.STATE.recuperaciones = {};
                    if (window._enccoRecupHydratedCycles) delete window._enccoRecupHydratedCycles[targetNewCycle];
                    if (window._enccoRecupFetchingCycles) delete window._enccoRecupFetchingCycles[targetNewCycle];
                    window.STATE.calificaciones = {};
                    window.STATE.gradingConfigs = {};
                    window.STATE.dismissedAlerts = {};
                    window.STATE.allAlertsCleared = {};
                    window.STATE.academicCycle = targetNewCycle;
                    window.STATE.activeCycle = targetNewCycle;

                    // Reiniciar cabeceras de actividades personalizadas del pensum a 40/60 limpio (Act. 1..10) preservando al 100% los docentes asignados
                    if (Array.isArray(window.STATE.pensum)) {
                        window.STATE.pensum.forEach(course => {
                            if (!course) return;
                            course.gradingConfig = {
                                zonaWeight: 60,
                                examWeight: 40,
                                activitiesCount: 6,
                                activities: Array.from({ length: 10 }, (_, idx) => ({
                                    name: `Act. ${idx + 1}`,
                                    maxScore: 10
                                })),
                                bimestres: {}
                            };
                        });
                    }

                    // Preservar la bitácora acumulativa de los estudiantes para los siguientes años
                    if (!Array.isArray(window.STATE.studentAnnotations)) {
                        window.STATE.studentAnnotations = [];
                    }
                    window.STATE.studentAnnotations.forEach(a => {
                        if (a && !a.academicCycle) a.academicCycle = currentActiveCycle;
                    });

                    if (!Array.isArray(window.STATE.cycles)) {
                        window.STATE.cycles = [];
                    }

                    // Asegurar que el ciclo anterior quede como 'Histórico'
                    const prevC = window.STATE.cycles.find(c => c.name === currentActiveCycle || c.year === currentActiveCycle);
                    if (prevC) {
                        prevC.status = 'Histórico';
                        prevC.isArchived = true;
                    }

                    // Registrar y activar el nuevo ciclo
                    const existingNew = window.STATE.cycles.find(c => c.name === targetNewCycle || c.year === targetNewCycle);
                    if (existingNew) {
                        existingNew.status = 'Activo';
                        existingNew.isArchived = false;
                    } else {
                        window.STATE.cycles.push({
                            id: `cyc-${targetNewCycle}`,
                            name: targetNewCycle,
                            year: targetNewCycle,
                            status: 'Activo',
                            isArchived: false,
                            description: `Ciclo Escolar Oficial ${targetNewCycle}`,
                            createdAt: Date.now()
                        });
                    }

                    // Configurar bimestre de inicio en 1° Bimestre con todos los bimestres desbloqueados
                    if (!window.STATE.config) window.STATE.config = {};
                    window.STATE.config.bimestreActivoOficial = 1;
                    window.STATE.config.activeBimestre = 1;
                    window.STATE.config.lockedBimestres = { 1: false, 2: false, 3: false, 4: false };
                    window.STATE.currentGradebookBimestre = '1';
                    window.STATE.lastModified = Date.now();
                }

                // 4. Persistir la nueva base limpia en Realtime Database y Firestore
                if (typeof saveStateRecursively === 'function') {
                    await saveStateRecursively({ syncCloud: true, isAutoSave: false });
                } else if (typeof saveStateToLocalStorage === 'function') {
                    saveStateToLocalStorage();
                }

                // Sincronizar nodos críticos inmediatamente (JAMÁS sincronizar asistencia vacía para no borrar historial)
                if (typeof EnccoCloudSync !== 'undefined' && EnccoCloudSync.syncNode) {
                    EnccoCloudSync.syncNode('activeCycle', targetNewCycle);
                    EnccoCloudSync.syncNode('cycles', window.STATE.cycles);
                    EnccoCloudSync.syncNode('students', window.STATE.students);
                    EnccoCloudSync.syncNode('pensum', window.STATE.pensum);
                    EnccoCloudSync.syncNode('calificaciones', {});
                    EnccoCloudSync.syncNode('recuperaciones', {});
                    EnccoCloudSync.syncNode('gradingConfigs', {});
                    EnccoCloudSync.syncNode('academicExonerations', []);
                    EnccoCloudSync.syncNode('studentPermissions', []);
                    EnccoCloudSync.syncNode('disciplineReports', []);
                    EnccoCloudSync.syncNode('config', window.STATE.config);
                }
                if (typeof fetch === 'function') {
                    const fbUrl = this.getFirebaseUrl();
                    fetch(`${fbUrl}/encc_school_state/recuperaciones.json`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    }).catch(() => {});
                }

                // 5. Actualizar la interfaz de usuario en tiempo real
                if (typeof updateCycleSelects === 'function') updateCycleSelects();
                if (typeof renderCycleList === 'function') renderCycleList();
                if (typeof renderStudentsTable === 'function') renderStudentsTable();
                if (typeof renderBoletasTable === 'function') renderBoletasTable();
                if (typeof renderTeacherCourseCards === 'function') renderTeacherCourseCards();
                if (typeof loadTeacherGradebook === 'function') loadTeacherGradebook();
                if (typeof renderCurrentView === 'function') renderCurrentView();
                if (typeof renderDashboard === 'function') renderDashboard();

                console.log(`🎉 [Nuevo Ciclo] Ciclo ${targetNewCycle} inicializado con éxito (Promovidos: ${promotedCount}, Graduados: ${graduatedCount}, Retenidos: ${retainedCount}).`);
                if (typeof showToast === 'function') {
                    showToast(`¡Ciclo Lectivo ${targetNewCycle} aperturado con éxito! Base de datos limpia y lista para calificar.`, 'success');
                }

                return {
                    success: true,
                    newCycle: targetNewCycle,
                    previousCycle: currentActiveCycle,
                    stats: { promotedCount, graduatedCount, retainedCount }
                };
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

                // 1. Intentar desde memoria de sesión volátil (RAM / sessionStorage) primero
                if (this._sessionCache && this._sessionCache[targetCycle]) {
                    const memData = this._sessionCache[targetCycle];
                    const stList = (memData && (memData.studentsSnapshot || memData.students));
                    if (Array.isArray(stList) && stList.length > 0) {
                        // Descartar dummy residual corrupto sin nombres válidos o de <= 3 registros en ciclo 2026
                        if (targetCycle === '2026' && stList.length <= 3 && (!stList[0] || (!stList[0].name && !stList[0].firstName))) {
                            delete this._sessionCache[targetCycle];
                        } else {
                            archivedData = memData;
                        }
                    }
                } else if (typeof sessionStorage !== 'undefined') {
                    try {
                        const sessCached = sessionStorage.getItem(`ENCCO_HISTORICO_${targetCycle}`);
                        if (sessCached) {
                            const parsed = JSON.parse(sessCached);
                            const stList = (parsed && (parsed.studentsSnapshot || parsed.students));
                            if (Array.isArray(stList) && stList.length > 0) {
                                if (targetCycle === '2026' && stList.length <= 3 && (!stList[0] || (!stList[0].name && !stList[0].firstName))) {
                                    sessionStorage.removeItem(`ENCCO_HISTORICO_${targetCycle}`);
                                } else {
                                    archivedData = parsed;
                                    if (!this._sessionCache) this._sessionCache = {};
                                    this._sessionCache[targetCycle] = parsed;
                                }
                            }
                        }
                    } catch(e) {}
                }
                // Limpiar cualquier residuo en localStorage para garantizar cero persistencia en disco
                if (typeof localStorage !== 'undefined') {
                    try { localStorage.removeItem(`ENCCO_HISTORICO_${targetCycle}`); } catch(e) {}
                }

                // 2. Descargar bajo demanda desde Firebase RTDB (/encc_school_state/historico/{targetCycle}.json como ruta canónica prioritaria)
                if (!archivedData && typeof fetch === 'function') {
                    const fbUrl = this.getFirebaseUrl();
                    // Prioridad 1: Nodo canónico oficial en encc_school_state
                    try {
                        const res1 = await fetch(`${fbUrl}/encc_school_state/historico/${targetCycle}.json?t=${Date.now()}`);
                        if (res1.ok) {
                            const data1 = await res1.json();
                            const stList1 = data1 && (data1.studentsSnapshot || data1.students);
                            if (Array.isArray(stList1) && stList1.length > 0) {
                                archivedData = data1;
                            }
                        }
                    } catch(e) {}

                    // Prioridad 2 (Fallback): Nodo secundario /historico/ solo si el archivo es íntegro y no el dummy
                    if (!archivedData) {
                        try {
                            const res2 = await fetch(`${fbUrl}/historico/${targetCycle}.json?t=${Date.now()}`);
                            if (res2.ok) {
                                const data2 = await res2.json();
                                const stList2 = data2 && (data2.studentsSnapshot || data2.students);
                                if (Array.isArray(stList2) && stList2.length > 3) {
                                    archivedData = data2;
                                }
                            }
                        } catch(e) {}
                    }
                }

                if (!archivedData || (!archivedData.studentsSnapshot && !archivedData.students)) {
                    throw new Error(`No se encontraron registros archivados oficiales para el ciclo ${targetCycle}.`);
                }

                // Guardar en RAM de sesión y sessionStorage (cero persistencia en disco duro)
                if (!this._sessionCache) this._sessionCache = {};
                this._sessionCache[targetCycle] = archivedData;
                if (typeof sessionStorage !== 'undefined') {
                    try {
                        sessionStorage.setItem(`ENCCO_HISTORICO_${targetCycle}`, JSON.stringify(archivedData));
                    } catch(e) {}
                }
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.removeItem(`ENCCO_HISTORICO_${targetCycle}`);
                    } catch(e) {}
                }

                // Guardar respaldo íntegro del estado activo antes de entrar a modo histórico (memoria + sessionStorage)
                if (!this._originalStateBeforeHistory && window.STATE && !window.STATE.isHistoricalReadOnlyMode) {
                    this._originalStateBeforeHistory = {
                        activeCycle: window.STATE.activeCycle,
                        academicCycle: window.STATE.academicCycle,
                        students: JSON.parse(JSON.stringify(window.STATE.students || [])),
                        attendanceRecords: JSON.parse(JSON.stringify(window.STATE.attendanceRecords || {})),
                        disciplineReports: JSON.parse(JSON.stringify(window.STATE.disciplineReports || [])),
                        studentPermissions: JSON.parse(JSON.stringify(window.STATE.studentPermissions || [])),
                        pensum: JSON.parse(JSON.stringify(window.STATE.pensum || [])),
                        calificaciones: JSON.parse(JSON.stringify(window.STATE.calificaciones || {})),
                        gradingConfigs: JSON.parse(JSON.stringify(window.STATE.gradingConfigs || {})),
                        academicExonerations: JSON.parse(JSON.stringify(window.STATE.academicExonerations || [])),
                        exoneraciones: JSON.parse(JSON.stringify(window.STATE.exoneraciones || {})),
                        recuperaciones: JSON.parse(JSON.stringify(window.STATE.recuperaciones || {})),
                        config: window.STATE.config ? JSON.parse(JSON.stringify(window.STATE.config)) : {}
                    };
                    try {
                        if (typeof sessionStorage !== 'undefined') {
                            sessionStorage.setItem('ENCCO_STATE_BEFORE_HISTORICAL', JSON.stringify(this._originalStateBeforeHistory));
                        }
                    } catch(e) {}
                }

                // Inyectar datos históricos en memoria de solo lectura
                const histStudents = archivedData.studentsSnapshot || archivedData.students || [];
                const histAttendance = archivedData.attendanceSnapshot || archivedData.attendanceRecords || {};
                const histDiscipline = archivedData.disciplineSnapshot || archivedData.disciplineReports || [];
                const histPermissions = archivedData.permissionsSnapshot || archivedData.studentPermissions || [];
                const histPensum = archivedData.pensumSnapshot || archivedData.pensum || [];
                const histCalificaciones = archivedData.calificacionesSnapshot || archivedData.calificaciones || {};
                const histGradingConfigs = archivedData.gradingConfigsSnapshot || archivedData.gradingConfigs || {};
                const histExoneraciones = archivedData.exoneracionesSnapshot || archivedData.academicExonerations || [];
                const histExoneracionesMap = archivedData.exoneracionesMapSnapshot || archivedData.exoneraciones || {};
                const histRecuperaciones = archivedData.recuperacionesSnapshot || archivedData.recuperaciones || {};

                window.STATE.isHistoricalReadOnlyMode = true;
                window.STATE.historicalViewingCycle = targetCycle;
                window.STATE.viewingHistoricalCycle = targetCycle;
                window.STATE.activeCycle = targetCycle;
                window.STATE.academicCycle = targetCycle;
                const cleanHistStudents = JSON.parse(JSON.stringify(histStudents)).map(s => {
                    if (s) {
                        s.cycle = targetCycle;
                        s.academicCycle = targetCycle;
                    }
                    return s;
                });
                window.STATE.students = cleanHistStudents;
                window.STATE.attendanceRecords = JSON.parse(JSON.stringify(histAttendance));
                window.STATE.disciplineReports = JSON.parse(JSON.stringify(histDiscipline));
                window.STATE.studentPermissions = JSON.parse(JSON.stringify(histPermissions));
                window.STATE.calificaciones = JSON.parse(JSON.stringify(histCalificaciones));
                window.STATE.gradingConfigs = JSON.parse(JSON.stringify(histGradingConfigs));
                window.STATE.academicExonerations = JSON.parse(JSON.stringify(histExoneraciones));
                window.STATE.exoneraciones = JSON.parse(JSON.stringify(histExoneracionesMap));
                window.STATE.recuperaciones = JSON.parse(JSON.stringify(histRecuperaciones));
                if (!window.STATE.recuperacionesByCycle || typeof window.STATE.recuperacionesByCycle !== 'object') {
                    window.STATE.recuperacionesByCycle = {};
                }
                window.STATE.recuperacionesByCycle[targetCycle] = JSON.parse(JSON.stringify(histRecuperaciones));
                if (histPensum.length > 0) window.STATE.pensum = JSON.parse(JSON.stringify(histPensum));
                if (typeof window.normalizeSchoolAcademicData === 'function') {
                    window.normalizeSchoolAcademicData(window.STATE);
                }

                // Renderizar banner informativo de modo histórico
                this.renderHistoricalBanner(targetCycle, archivedData.archivedBy, archivedData.archivedDateISO);

                // Bloquear acciones de escritura en la interfaz
                this.enforceReadOnlyControls(true);

                if (typeof updateCycleSelects === 'function') updateCycleSelects();
                if (typeof renderCycleList === 'function') renderCycleList();
                if (typeof renderStudentsTable === 'function') renderStudentsTable();
                if (typeof renderBoletasTable === 'function') renderBoletasTable();
                if (typeof renderTeacherCourseCards === 'function') renderTeacherCourseCards();
                if (typeof loadTeacherGradebook === 'function') loadTeacherGradebook();
                if (typeof renderCurrentView === 'function') renderCurrentView();
                if (typeof renderDashboard === 'function') renderDashboard();
                if (typeof enforceViewReadOnlyMode === 'function') enforceViewReadOnlyMode(window.STATE.activeView);

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
            let restoredState = this._originalStateBeforeHistory;
            if (!restoredState && typeof sessionStorage !== 'undefined') {
                try {
                    const sessionRaw = sessionStorage.getItem('ENCCO_STATE_BEFORE_HISTORICAL');
                    if (sessionRaw) restoredState = JSON.parse(sessionRaw);
                } catch(e) {}
            }

            if (restoredState && Array.isArray(restoredState.students) && restoredState.students.length > 0) {
                window.STATE.activeCycle = restoredState.activeCycle || '2027';
                window.STATE.academicCycle = restoredState.academicCycle || restoredState.activeCycle || '2027';
                window.STATE.students = restoredState.students;
                window.STATE.attendanceRecords = restoredState.attendanceRecords || {};
                window.STATE.disciplineReports = restoredState.disciplineReports || [];
                window.STATE.studentPermissions = restoredState.studentPermissions || [];
                window.STATE.pensum = restoredState.pensum || [];
                window.STATE.calificaciones = restoredState.calificaciones || {};
                window.STATE.gradingConfigs = restoredState.gradingConfigs || {};
                window.STATE.academicExonerations = restoredState.academicExonerations || [];
                window.STATE.exoneraciones = restoredState.exoneraciones || {};
                window.STATE.recuperaciones = restoredState.recuperaciones || {};
                if (restoredState.config) {
                    window.STATE.config = restoredState.config;
                }
                this._originalStateBeforeHistory = null;
                if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('ENCCO_STATE_BEFORE_HISTORICAL');
            } else {
                const fbUrl = this.getFirebaseUrl();
                Promise.all([
                    fetch(`${fbUrl}/encc_school_state/students.json`).then(r => r.json()).catch(() => null),
                    fetch(`${fbUrl}/encc_school_state/calificaciones.json`).then(r => r.json()).catch(() => null),
                    fetch(`${fbUrl}/encc_school_state/attendanceRecords.json`).then(r => r.json()).catch(() => null),
                    fetch(`${fbUrl}/encc_school_state/recuperaciones.json`).then(r => r.json()).catch(() => null)
                ]).then(([cloudStudents, cloudCalif, cloudAtt, cloudRecup]) => {
                    if (Array.isArray(cloudStudents) && cloudStudents.length > 0) {
                        window.STATE.students = cloudStudents;
                    }
                    window.STATE.calificaciones = cloudCalif || {};
                    window.STATE.attendanceRecords = cloudAtt || {};
                    window.STATE.recuperaciones = (cloudRecup && typeof cloudRecup === 'object') ? cloudRecup : {};
                    if (typeof renderStudentsTable === 'function') renderStudentsTable();
                    if (typeof renderBoletasTable === 'function') renderBoletasTable();
                    if (typeof loadTeacherGradebook === 'function') loadTeacherGradebook();
                    if (typeof renderDashboard === 'function') renderDashboard();
                }).catch(() => {});
                window.STATE.activeCycle = '2027';
                window.STATE.academicCycle = '2027';
            }

            window.STATE.isHistoricalReadOnlyMode = false;
            window.STATE.historicalViewingCycle = null;
            window.STATE.viewingHistoricalCycle = null;

            // Remover banner
            const banner = (typeof document !== 'undefined') ? document.getElementById('enccoHistoricalBanner') : null;
            if (banner) banner.remove();

            // Desbloquear controles
            this.enforceReadOnlyControls(false);

            if (typeof updateCycleSelects === 'function') updateCycleSelects();
            if (typeof renderCycleList === 'function') renderCycleList();
            if (typeof renderStudentsTable === 'function') renderStudentsTable();
            if (typeof renderBoletasTable === 'function') renderBoletasTable();
            if (typeof renderTeacherCourseCards === 'function') renderTeacherCourseCards();
            if (typeof loadTeacherGradebook === 'function') loadTeacherGradebook();
            if (typeof renderCurrentView === 'function') renderCurrentView();
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof enforceViewReadOnlyMode === 'function') enforceViewReadOnlyMode(window.STATE.activeView);

            if (typeof showToast === 'function') {
                showToast(`Retornado al Ciclo Activo ${window.STATE.activeCycle}. Modo edición disponible.`, 'success');
            }

            return { success: true, activeCycle: window.STATE?.activeCycle };
        },

        /**
         * Renderiza banner superior persistente que indica modo histórico
         */
        renderHistoricalBanner(cycleYear, archivedBy = 'Administración', dateISO = null) {
            if (typeof document === 'undefined') return;
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

            const origCycleLabel = (this._originalStateBeforeHistory && this._originalStateBeforeHistory.activeCycle)
                ? this._originalStateBeforeHistory.activeCycle
                : (window.STATE ? window.STATE.activeCycle : '2026');
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
                        <i class="fa-solid fa-arrow-left"></i> Salir y Volver al Ciclo Activo (${origCycleLabel})
                    </button>
                </div>
            `;
            banner.style.display = 'flex';
        },

        /**
         * Aplica o remueve bloqueo de solo lectura en formularios y botones
         */
        enforceReadOnlyControls(isReadOnly) {
            if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
            const forms = document.querySelectorAll('form:not(#searchForm):not(#filterForm)');
            forms.forEach(f => {
                if (!f || typeof f.querySelectorAll !== 'function') return;
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
            const isAllowed = (typeof canAccessBackup === 'function')
                ? canAccessBackup(role)
                : ((typeof isSuperUserRole === 'function' && isSuperUserRole(role)) ||
                   (typeof isDirectorRole === 'function' && isDirectorRole(role)) ||
                   ['director', 'direccion', 'admin'].includes(role));
            if (!isAllowed) {
                if (typeof showToast === 'function') {
                    showToast('Acceso restringido: La descarga de respaldo institucional es una potestad exclusiva de Dirección.', 'danger');
                }
                return false;
            }

            const originSelect = (typeof document !== 'undefined') ? document.getElementById('promoOriginCycleSelect') : null;
            const targetCycle = String(cycleYear || (originSelect ? originSelect.value : '') || (window.STATE && window.STATE.activeCycle) || '2026').trim();

            const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            const attendance = (window.STATE && window.STATE.attendanceRecords) ? window.STATE.attendanceRecords : {};
            const discipline = (window.STATE && Array.isArray(window.STATE.disciplineReports)) ? window.STATE.disciplineReports : [];
            const permissions = (window.STATE && Array.isArray(window.STATE.studentPermissions)) ? window.STATE.studentPermissions : [];
            const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
            const gradesList = (window.STATE && Array.isArray(window.STATE.gradesList)) ? window.STATE.gradesList : [];
            const calificaciones = (window.STATE && window.STATE.calificaciones) ? window.STATE.calificaciones : {};
            const gradingConfigs = (window.STATE && window.STATE.gradingConfigs) ? window.STATE.gradingConfigs : {};

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
                gradesListSnapshot: gradesList,
                calificacionesSnapshot: calificaciones,
                gradingConfigsSnapshot: gradingConfigs
            };

            if (typeof document !== 'undefined') {
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
            }

            if (typeof showToast === 'function') {
                showToast(`Copia de seguridad oficial del Ciclo ${targetCycle} descargada exitosamente (.json).`, 'success');
            }
            return true;
        },

        // ======================================================================
        // MEJORA 1: RÉCORD HISTÓRICO DE UN ALUMNO EN SU EXPEDIENTE
        // Consulta silenciosamente todos los ciclos archivados y filtra por alumno.
        // ======================================================================
        async loadStudentHistoricalRecord(studentId) {
            const loadingEl = (typeof document !== 'undefined') ? document.getElementById('profHistoricoLoading') : null;
            const contentEl = (typeof document !== 'undefined') ? document.getElementById('profHistoricoContent') : null;
            if (!studentId || !contentEl) return;

            if (loadingEl) loadingEl.style.display = 'block';
            contentEl.innerHTML = '';

            try {
                // 1. Obtener lista de ciclos históricos disponibles desde STATE, _sessionCache o sessionStorage
                const STATE = window.STATE || {};
                const cycles = (STATE.cycles || []).filter(c => c && (c.status === 'Histórico' || c.isArchived || c.isHistorico));
                
                const localCycles = new Set(cycles.map(c => String(c.year || c.name || c.id || '').replace(/^cyc-/, '')).filter(Boolean));
                if (this._sessionCache) {
                    Object.keys(this._sessionCache).forEach(yr => { if (yr) localCycles.add(yr); });
                }
                if (typeof sessionStorage !== 'undefined') {
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && key.startsWith('ENCCO_HISTORICO_')) {
                            const yr = key.replace('ENCCO_HISTORICO_', '');
                            if (yr) localCycles.add(yr);
                        }
                    }
                }
                // Si existe ciclo 2026 y aún no está registrado, agregarlo como histórico por defecto
                if (!localCycles.has('2026') && STATE.activeCycle !== '2026') {
                    localCycles.add('2026');
                }
                // Limpiar posibles residuos en localStorage
                if (typeof localStorage !== 'undefined') {
                    try {
                        for (let i = localStorage.length - 1; i >= 0; i--) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith('ENCCO_HISTORICO_')) {
                                localStorage.removeItem(key);
                            }
                        }
                    } catch(e) {}
                }

                const yearsToCheck = Array.from(localCycles).sort((a, b) => Number(b) - Number(a)); // más reciente primero

                if (yearsToCheck.length === 0) {
                    contentEl.innerHTML = `
                        <div style="text-align:center; padding:28px 20px; background:#f5f3ff; border:1.5px dashed #c4b5fd; border-radius:6px;">
                            <i class="fa-solid fa-box-archive" style="font-size:2rem; color:#7c3aed; margin-bottom:10px; display:block;"></i>
                            <p style="font-size:0.88rem; color:#6d28d9; font-weight:600; margin:0;">No hay ciclos históricos archivados aún.<br>
                            <span style="font-weight:400; color:#7c3aed;">Los registros aparecerán aquí una vez que se archive el primer ciclo escolar.</span></p>
                        </div>`;
                    return;
                }

                let foundAny = false;
                let resultHtml = '';

                for (const yr of yearsToCheck) {
                    let archiveData = null;

                    // Primero intentar desde memoria de sesión volátil (_sessionCache o sessionStorage)
                    if (this._sessionCache && this._sessionCache[yr]) {
                        archiveData = this._sessionCache[yr];
                    } else if (typeof sessionStorage !== 'undefined') {
                        const sessKey = `ENCCO_HISTORICO_${yr}`;
                        const sessRaw = sessionStorage.getItem(sessKey);
                        if (sessRaw) {
                            try {
                                const parsed = JSON.parse(sessRaw);
                                const stList = parsed && (parsed.studentsSnapshot || parsed.students);
                                if (Array.isArray(stList) && stList.length > 0) {
                                    archiveData = parsed;
                                    if (!this._sessionCache) this._sessionCache = {};
                                    this._sessionCache[yr] = parsed;
                                }
                            } catch(e) { /* continúa */ }
                        }
                    }

                    // Si no está en memoria de sesión, intentar Firebase (Prioridad: /encc_school_state/historico/{yr}.json)
                    if (!archiveData && typeof fetch === 'function') {
                        try {
                            const dbUrl = this.getFirebaseUrl();
                            const token = (typeof getFirebaseIdToken === 'function') ? await getFirebaseIdToken() : null;
                            const authSuffix = token ? `?auth=${token}` : '';
                            const resp1 = await fetch(`${dbUrl}/encc_school_state/historico/${yr}.json${authSuffix}`);
                            if (resp1.ok) {
                                const d1 = await resp1.json();
                                const c1 = d1 && (d1.studentsSnapshot || d1.students);
                                if (Array.isArray(c1) && c1.length > 0) {
                                    archiveData = d1;
                                }
                            }
                            if (!archiveData) {
                                const resp2 = await fetch(`${dbUrl}/historico/${yr}.json${authSuffix}`);
                                if (resp2.ok) {
                                    const d2 = await resp2.json();
                                    const c2 = d2 && (d2.studentsSnapshot || d2.students);
                                    if (Array.isArray(c2) && c2.length > 3) {
                                        archiveData = d2;
                                    }
                                }
                            }
                        } catch(fetchErr) {
                            // Firebase no disponible para este año, continúa
                        }
                    }

                    if (!archiveData) continue;

                    // Buscar registros del estudiante en el snapshot (soporta Array o Mapa de objetos)
                    const studentsSnap = archiveData.studentsSnapshot || archiveData.students || [];
                    let studentRecord = null;
                    if (Array.isArray(studentsSnap)) {
                        studentRecord = studentsSnap.find(s => s && (
                            s.id === studentId ||
                            s.personalCode === studentId ||
                            s.carne === studentId
                        )) || null;
                    } else if (studentsSnap && typeof studentsSnap === 'object') {
                        studentRecord = studentsSnap[studentId] || Object.values(studentsSnap).find(s => s && (
                            s.id === studentId ||
                            s.personalCode === studentId ||
                            s.carne === studentId
                        )) || null;
                    }

                    if (!studentRecord) continue;
                    foundAny = true;

                    // Combinar asignaturas tanto de grades (array [b1,b2,b3,b4]) como de gradebookDetails
                    const rawGradesObj = (studentRecord.grades && typeof studentRecord.grades === 'object') ? studentRecord.grades : {};
                    const rawDetailsObj = (studentRecord.gradebookDetails && typeof studentRecord.gradebookDetails === 'object') ? studentRecord.gradebookDetails : {};
                    const allSubjKeys = Array.from(new Set([...Object.keys(rawGradesObj), ...Object.keys(rawDetailsObj)]));

                    const status = studentRecord.status || 'N/D';
                    const grade = `${studentRecord.grade || 'N/D'}${studentRecord.section ? ' (' + studentRecord.section + ')' : ''}`;
                    const archivedAt = archiveData.summary ? archiveData.summary.archivedAt : (archiveData.archivedAt || '');
                    const archivedDate = archivedAt ? new Date(archivedAt).toLocaleDateString('es-GT') : 'Fecha N/D';

                    // Construir tabla de notas y promedio general del ciclo
                    let subjectRows = '';
                    let sumSubjAvgs = 0;
                    let countSubjAvgs = 0;

                    if (allSubjKeys.length > 0) {
                        allSubjKeys.forEach(subj => {
                            const gArr = rawGradesObj[subj];
                            const dObj = rawDetailsObj[subj];
                            let b1 = null, b2 = null, b3 = null, b4 = null;

                            const extractBimScore = (bimNum) => {
                                const bKey = String(bimNum);
                                if (dObj && typeof dObj === 'object' && dObj[bKey] && typeof dObj[bKey] === 'object') {
                                    const bData = dObj[bKey];
                                    if (typeof bData.total === 'number' && bData.total > 0) return bData.total;
                                    const z = parseFloat(bData.zona || 0) || 0;
                                    const e = parseFloat(bData.exam || 0) || 0;
                                    if ((z + e) > 0) return z + e;
                                }
                                if (Array.isArray(gArr)) {
                                    const v = parseFloat(gArr[bimNum - 1]);
                                    if (!isNaN(v) && v > 0) return v;
                                } else if (gArr && typeof gArr === 'object') {
                                    const v = parseFloat(gArr[`b${bimNum}`] || gArr[bKey] || 0);
                                    if (!isNaN(v) && v > 0) return v;
                                }
                                return null;
                            };

                            b1 = extractBimScore(1);
                            b2 = extractBimScore(2);
                            b3 = extractBimScore(3);
                            b4 = extractBimScore(4);

                            const validGrades = [b1, b2, b3, b4].filter(v => v !== null && v > 0);
                            let subjAvg = '-';
                            if (validGrades.length > 0) {
                                const numAvg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
                                subjAvg = numAvg.toFixed(1);
                                sumSubjAvgs += numAvg;
                                countSubjAvgs++;
                            }
                            const fmtGrade = (v) => v !== null && v > 0 ? v.toFixed(0) : '-';
                            const color = parseFloat(subjAvg) >= 60 ? '#166534' : (subjAvg === '-' ? '#64748b' : '#991b1b');
                            subjectRows += `<tr>
                                <td style="padding:4px 8px; font-weight:600;">${subj}</td>
                                <td style="text-align:center; padding:4px 8px;">${fmtGrade(b1)}</td>
                                <td style="text-align:center; padding:4px 8px;">${fmtGrade(b2)}</td>
                                <td style="text-align:center; padding:4px 8px;">${fmtGrade(b3)}</td>
                                <td style="text-align:center; padding:4px 8px;">${fmtGrade(b4)}</td>
                                <td style="text-align:center; padding:4px 8px; font-weight:800; color:${color};">${subjAvg}</td>
                            </tr>`;
                        });
                    } else {
                        subjectRows = `<tr><td colspan="6" style="text-align:center; padding:12px; color:#64748b;">Sin calificaciones registradas para este ciclo.</td></tr>`;
                    }

                    const avg = studentRecord.finalAverage || studentRecord.average || (countSubjAvgs > 0 ? (sumSubjAvgs / countSubjAvgs) : null);
                    const avgColor = avg !== null ? (parseFloat(avg) >= 60 ? '#16a34a' : '#dc2626') : '#64748b';

                    resultHtml += `
                        <div style="margin-bottom:20px; border:1.5px solid #ddd6fe; border-radius:8px; overflow:hidden;">
                            <div style="background:#4c1d95; color:#fff; padding:8px 14px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:800; font-size:0.9rem;"><i class="fa-solid fa-calendar-days"></i> Ciclo Escolar ${yr}</span>
                                <div style="font-size:0.78rem; display:flex; gap:14px; align-items:center;">
                                    <span>${grade}</span>
                                    <span>Estado: ${status}</span>
                                    ${avg !== null ? `<span style="font-weight:900; font-size:0.92rem; color:${avgColor === '#16a34a' ? '#86efac' : '#fca5a5'};">Prom. Final: ${parseFloat(avg).toFixed(2)}</span>` : ''}
                                    <span style="opacity:0.75;">Archivado: ${archivedDate}</span>
                                </div>
                            </div>
                            <div style="overflow-x:auto;">
                                <table style="width:100%; border-collapse:collapse; font-size:0.84rem;">
                                    <thead>
                                        <tr style="background:#ede9fe; color:#4c1d95; font-weight:700;">
                                            <th style="padding:5px 8px; text-align:left;">Asignatura</th>
                                            <th style="width:56px; text-align:center; padding:5px 8px;">B1</th>
                                            <th style="width:56px; text-align:center; padding:5px 8px;">B2</th>
                                            <th style="width:56px; text-align:center; padding:5px 8px;">B3</th>
                                            <th style="width:56px; text-align:center; padding:5px 8px;">B4</th>
                                            <th style="width:70px; text-align:center; padding:5px 8px;">Prom.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${subjectRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>`;
                }

                if (!foundAny) {
                    contentEl.innerHTML = `
                        <div style="text-align:center; padding:28px 20px; background:#f5f3ff; border:1.5px dashed #c4b5fd; border-radius:6px;">
                            <i class="fa-solid fa-user-clock" style="font-size:2rem; color:#7c3aed; margin-bottom:10px; display:block;"></i>
                            <p style="font-size:0.88rem; color:#6d28d9; font-weight:600; margin:0;">No se encontraron registros históricos para este estudiante.<br>
                            <span style="font-weight:400; color:#7c3aed;">Puede que el alumno no haya cursado en ciclos anteriores archivados.</span></p>
                        </div>`;
                } else {
                    contentEl.innerHTML = resultHtml;
                }

            } catch(err) {
                contentEl.innerHTML = `<div style="padding:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; color:#991b1b; font-size:0.88rem;"><i class="fa-solid fa-circle-exclamation"></i> Error al cargar historial: ${err.message || err}</div>`;
            } finally {
                if (loadingEl) loadingEl.style.display = 'none';
            }
        }
    };

    window.EnccoCycleArchiver = EnccoCycleArchiver;

    // Wrapper global para llamar desde el HTML directamente
    window.loadStudentHistoricalRecord = function(studentId) {
        if (window.EnccoCycleArchiver && typeof window.EnccoCycleArchiver.loadStudentHistoricalRecord === 'function') {
            return window.EnccoCycleArchiver.loadStudentHistoricalRecord(studentId);
        }
    };

})(typeof window !== 'undefined' ? window : global);
