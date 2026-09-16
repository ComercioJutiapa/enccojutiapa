/**
 * ======================================================================
 * ⚡ ENCCO DATABASE & REALTIME PERSISTENCE MODULE (db.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ======================================================================
 * - Firestore inicializado exclusivamente con 'memoryLocalCache()' (RAM).
 * - Cero persistencia IndexedDB ni almacenamiento local en disco.
 * - Operaciones atómicas async/await con setDoc(..., { merge: true }) y updateDoc().
 * - Clave unívoca de calificaciones por (estudianteId + claseId + bimestre).
 * - Escuchadores onSnapshot reactivos y sincronización dual inmediata.
 */

(function(window) {
    'use strict';

    const ENCCO_OFFICIAL_FIREBASE_URL = "https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com";
    window.ENCCO_OFFICIAL_FIREBASE_URL = ENCCO_OFFICIAL_FIREBASE_URL;

    function getFirebaseDatabaseUrl() {
        return ENCCO_OFFICIAL_FIREBASE_URL;
    }

    // 1. INICIALIZACIÓN DE FIRESTORE MODULAR CON MEMORY LOCAL CACHE
    let _firestoreDb = null;
    let _firebaseApp = null;
    let _fsMod = null;

    async function initFirestoreMemoryEngine() {
        if (_firestoreDb && _fsMod) {
            return { app: _firebaseApp, db: _firestoreDb, fsMod: _fsMod };
        }

        if (window.FirebaseModular && window.FirebaseModular.db && window.FirebaseModular.fsMod) {
            _firebaseApp = window.FirebaseModular.app;
            _firestoreDb = window.FirebaseModular.db;
            _fsMod = window.FirebaseModular.fsMod;
            return { app: _firebaseApp, db: _firestoreDb, fsMod: _fsMod };
        }

        try {
            const appMod = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js");
            const fsMod = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");

            const firebaseConfig = {
                apiKey: "AIzaSyFakeKeyForEnccoModularCacheConfig",
                authDomain: "encco-jutiapa-live-2026-default-rtdb.firebaseapp.com",
                databaseURL: ENCCO_OFFICIAL_FIREBASE_URL,
                projectId: "encco-jutiapa-live-2026-default-rtdb",
                storageBucket: "encco-jutiapa-live-2026-default-rtdb.appspot.com"
            };

            const app = appMod.initializeApp(firebaseConfig, 'enccoDbEngine_' + Date.now());
            // REGLA ESTRICTA: Memoria RAM exclusiva con memoryLocalCache()
            const cacheConfig = fsMod.memoryLocalCache();
            const db = fsMod.initializeFirestore(app, {
                localCache: cacheConfig
            });

            _firebaseApp = app;
            _firestoreDb = db;
            _fsMod = fsMod;

            // 🔐 REGLA ESTRICTA DE PERSISTENCIA: browserSessionPersistence exclusiva en Firebase Auth
            let auth = null;
            let authMod = null;
            try {
                authMod = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
                auth = authMod.getAuth(app);
                if (authMod.browserSessionPersistence) {
                    await authMod.setPersistence(auth, authMod.browserSessionPersistence);
                    console.log("🔐 [EnccoDB] Firebase Auth configurado exclusivamente con browserSessionPersistence.");
                }
            } catch(authErr) {
                console.warn("Aviso Firebase Auth Modular en db.js:", authErr.message);
            }

            window.FirebaseModular = {
                app, db, fsMod, auth, authMod,
                initializeApp: appMod.initializeApp,
                initializeFirestore: fsMod.initializeFirestore,
                memoryLocalCache: fsMod.memoryLocalCache,
                getAuth: authMod ? authMod.getAuth : null,
                setPersistence: authMod ? authMod.setPersistence : null,
                browserSessionPersistence: authMod ? authMod.browserSessionPersistence : 'SESSION',
                signOut: authMod ? authMod.signOut : null,
                collection: fsMod.collection,
                doc: fsMod.doc,
                getDoc: fsMod.getDoc,
                getDocs: fsMod.getDocs,
                setDoc: fsMod.setDoc,
                updateDoc: fsMod.updateDoc,
                deleteDoc: fsMod.deleteDoc,
                writeBatch: fsMod.writeBatch,
                arrayUnion: fsMod.arrayUnion,
                arrayRemove: fsMod.arrayRemove,
                onSnapshot: fsMod.onSnapshot,
                query: fsMod.query,
                where: fsMod.where
            };

            console.log("⚡ [EnccoDB] Firestore memoryLocalCache() y Auth browserSessionPersistence inicializados.");
            return { app, db, fsMod, auth, authMod };
        } catch (e) {
            console.warn("⚠️ [EnccoDB] Firestore Modular SDK no disponible en entorno actual:", e.message);
            return null;
        }
    }

    // 2. COMUNICACIÓN HTTP ASÍNCRONA ATÓMICA CON RTDB
    async function rtdbRequest(path, method = 'GET', data = null) {
        const url = `${ENCCO_OFFICIAL_FIREBASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
        const options = {
            method: method,
            headers: {
                'Accept': 'application/json'
            }
        };

        if (data !== null) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
            }
            return await res.json();
        } catch (err) {
            // Manejo en entorno Node.js para testing
            if (typeof require !== 'undefined' && typeof process !== 'undefined') {
                return new Promise((resolve, reject) => {
                    const https = require('https');
                    const parsedUrl = new URL(url);
                    const reqOptions = {
                        hostname: parsedUrl.hostname,
                        path: parsedUrl.pathname + (parsedUrl.search || ''),
                        method: method,
                        headers: options.headers
                    };
                    const req = https.request(reqOptions, (resp) => {
                        let body = '';
                        resp.on('data', chunk => body += chunk);
                        resp.on('end', () => {
                            try { resolve(body ? JSON.parse(body) : null); }
                            catch (pe) { resolve(body); }
                        });
                    });
                    req.on('error', reject);
                    if (data !== null) {
                        req.write(JSON.stringify(data));
                    }
                    req.end();
                });
            }
            throw err;
        }
    }

    // Helper para obtener el índice real del estudiante en RTDB
    async function getRtdbStudentIndex(studentId) {
        if (!studentId) return -1;
        try {
            const shallow = await rtdbRequest('/encc_school_state/students.json?shallow=true');
            if (!shallow) return -1;
            
            // Buscar por id directo
            const localStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            const localIdx = localStudents.findIndex(s => s && s.id === studentId);
            if (localIdx !== -1) {
                return localIdx;
            }
        } catch (e) {}
        return -1;
    }

    // 3. SISTEMA DE NOTAS Y MATRIZ UNÍVOCA POR (estudianteId + claseId + bimestre)
    async function saveStudentSubjectGradeAtomic(studentIdentifier, subjectIdentifier, unit, gradeData) {
        if (window.STATE && window.STATE.isLocalReadOnlyMode) {
            if (typeof window.showToast === 'function') {
                window.showToast("⚠️ Acción Bloqueada: Modo Solo Lectura.", "warning");
            }
            return false;
        }

        const cleanStr = s => (s || '').toString().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');

        const targetStudentClean = cleanStr(studentIdentifier);
        const studentsList = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
        const student = studentsList.find(s => {
            if (!s) return false;
            if (s.id && s.id === studentIdentifier) return true;
            if (s.personalCode && s.personalCode === studentIdentifier) return true;
            if (s.carne && s.carne === studentIdentifier) return true;
            const fullName = cleanStr(`${s.lastName || ''} ${s.firstName || ''}`);
            const fullNameRev = cleanStr(`${s.firstName || ''} ${s.lastName || ''}`);
            const singleName = cleanStr(s.name || '');
            return targetStudentClean === fullName || targetStudentClean === fullNameRev || targetStudentClean === singleName;
        });

        if (!student) {
            console.error(`[EnccoDB] Estudiante no encontrado para persistencia: ${studentIdentifier}`);
            return false;
        }

        const effectiveUnit = parseInt(unit) || 1;
        const effectiveSubject = (subjectIdentifier || '').toString().trim();
        const cleanSubj = cleanStr(effectiveSubject);

        // Clave unívoca oficial por estudianteId + claseId + bimestre
        const compositeGradeKey = `${student.id}_${cleanSubj}_b${effectiveUnit}`;

        // Asegurar estructura de gradeData
        const currentData = (gradeData && typeof gradeData === 'object') ? gradeData : (
            student.gradebookDetails && student.gradebookDetails[effectiveSubject] && student.gradebookDetails[effectiveSubject][effectiveUnit] ? student.gradebookDetails[effectiveSubject][effectiveUnit] : {
                activities: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                zona: 0,
                exam: 0,
                total: 0
            }
        );

        const activitiesArr = Array.isArray(currentData.activities) ? currentData.activities.slice(0, 10) : [0,0,0,0,0,0,0,0,0,0];
        while (activitiesArr.length < 10) activitiesArr.push(0);

        const calculatedZona = activitiesArr.reduce((a, b) => a + (parseInt(b) || 0), 0);
        const examScore = parseInt(currentData.exam) || 0;
        const totalScore = calculatedZona + examScore;

        const gradePayload = {
            id: compositeGradeKey,
            estudianteId: student.id,
            personalCode: student.personalCode || '',
            claseNombre: effectiveSubject,
            claseClean: cleanSubj,
            bimestre: effectiveUnit,
            activities: activitiesArr,
            zona: calculatedZona,
            exam: examScore,
            total: totalScore,
            exonerado: currentData.exonerado || false,
            updatedAt: new Date().toISOString(),
            updatedBy: (window.STATE && window.STATE.currentUser) ? window.STATE.currentUser.id : 'sistema'
        };

        // 1. Sincronizar en memoria en el objeto student
        student.gradebookDetails = student.gradebookDetails || {};
        student.gradebookDetails[effectiveSubject] = student.gradebookDetails[effectiveSubject] || [null, null, null, null, null];
        student.gradebookDetails[effectiveSubject][effectiveUnit] = {
            activities: activitiesArr,
            zona: calculatedZona,
            exam: examScore,
            total: totalScore,
            exonerado: currentData.exonerado || false
        };

        student.grades = student.grades || {};
        student.grades[effectiveSubject] = student.grades[effectiveSubject] || [0, 0, 0, 0];
        student.grades[effectiveSubject][effectiveUnit - 1] = totalScore;

        // 2. Persistencia Atómica en Firestore con { merge: true }
        try {
            const fEngine = await initFirestoreMemoryEngine();
            if (fEngine && fEngine.db && fEngine.fsMod) {
                const { db, fsMod } = fEngine;
                // Registro en colección unívoca de calificaciones
                const gradeDocRef = fsMod.doc(db, "calificaciones", compositeGradeKey);
                await fsMod.setDoc(gradeDocRef, gradePayload, { merge: true });

                // Actualizar documento del estudiante con notación punto para evitar sobreescritura masiva
                const studentDocRef = fsMod.doc(db, "estudiantes", student.id);
                await fsMod.setDoc(studentDocRef, {
                    [`grades.${effectiveSubject}`]: student.grades[effectiveSubject],
                    [`gradebookDetails.${effectiveSubject}.${effectiveUnit}`]: student.gradebookDetails[effectiveSubject][effectiveUnit],
                    lastModified: Date.now()
                }, { merge: true });
            }
        } catch (fe) {
            console.warn("[EnccoDB] Advertencia al persistir en Firestore (continuando con RTDB):", fe.message);
        }

        // 3. Persistencia Atómica Dual en Firebase RTDB
        try {
            // Escritura unívoca en /calificaciones/${compositeGradeKey}.json
            await rtdbRequest(`/encc_school_state/calificaciones/${compositeGradeKey}.json`, 'PUT', gradePayload);
            await rtdbRequest(`/calificaciones/${compositeGradeKey}.json`, 'PUT', gradePayload);

            // Actualización de lastModified en config
            const now = Date.now();
            await rtdbRequest('/encc_school_state/config.json', 'PATCH', { lastModified: now });
            await rtdbRequest('/config.json', 'PATCH', { lastModified: now });

            // Actualizar el estudiante en RTDB usando getRtdbStudentIndex
            const rtdbIdx = await getRtdbStudentIndex(student.id);
            if (rtdbIdx !== -1) {
                const patchObj = {};
                patchObj[`gradebookDetails/${effectiveSubject}/${effectiveUnit}`] = student.gradebookDetails[effectiveSubject][effectiveUnit];
                patchObj[`grades/${effectiveSubject}/${effectiveUnit - 1}`] = totalScore;
                await rtdbRequest(`/encc_school_state/students/${rtdbIdx}.json`, 'PATCH', patchObj);
                await rtdbRequest(`/students/${rtdbIdx}.json`, 'PATCH', patchObj);
            }
        } catch (re) {
            console.warn("[EnccoDB] Advertencia al persistir en RTDB:", re.message);
        }

        window.dispatchEvent(new CustomEvent('EnccoGradeUpdated', {
            detail: { studentId: student.id, subject: effectiveSubject, unit: effectiveUnit, total: totalScore }
        }));

        return true;
    }

    // 4. ASIGNACIÓN DINÁMICA DE MAESTROS GUÍAS
    async function asignarMaestroGuia(seccionKey, docenteId, docenteNombre) {
        if (!seccionKey) return false;
        const normalizedKey = seccionKey.replace(/\s+/g, '_');

        const patchPayload = {
            maestroGuiaId: docenteId || '',
            maestroGuiaNombre: docenteNombre || '',
            ultimaActualizacion: new Date().toISOString()
        };

        // 1. Actualizar estado en memoria
        if (window.STATE) {
            if (window.STATE.secciones && window.STATE.secciones[normalizedKey]) {
                Object.assign(window.STATE.secciones[normalizedKey], patchPayload);
            }
            if (Array.isArray(window.STATE.gradesList)) {
                const gr = window.STATE.gradesList.find(g => (g.codigo && g.codigo.replace(/\s+/g, '_') === normalizedKey) || g.id === normalizedKey);
                if (gr) {
                    gr.guideTeacherId = docenteId;
                    gr.guideTeacher = docenteNombre;
                }
            }
        }

        // 2. Persistencia en Firestore
        try {
            const fEngine = await initFirestoreMemoryEngine();
            if (fEngine && fEngine.db && fEngine.fsMod) {
                const { db, fsMod } = fEngine;
                const docRef = fsMod.doc(db, "secciones", normalizedKey);
                await fsMod.setDoc(docRef, patchPayload, { merge: true });
            }
        } catch (fe) {
            console.warn("[EnccoDB] Aviso al guardar maestro guía en Firestore:", fe.message);
        }

        // 3. Persistencia Dual en RTDB
        try {
            await rtdbRequest(`/encc_school_state/secciones/${normalizedKey}.json`, 'PATCH', patchPayload);
            await rtdbRequest(`/secciones/${normalizedKey}.json`, 'PATCH', patchPayload);
        } catch (re) {
            console.warn("[EnccoDB] Aviso al guardar maestro guía en RTDB:", re.message);
        }

        window.dispatchEvent(new CustomEvent('EnccoGuideTeacherAssigned', {
            detail: { seccion: normalizedKey, teacherId: docenteId, teacherName: docenteNombre }
        }));

        return true;
    }

    // 5. CONTROL DINÁMICO DE BIMESTRES ACTIVOS Y BLOQUEO
    async function setOfficialActiveBimestre(bimestreNumber, activeUnitsArray) {
        const bNum = parseInt(bimestreNumber) || 1;
        const uArr = Array.isArray(activeUnitsArray) && activeUnitsArray.length > 0 ? activeUnitsArray.map(Number) : [bNum];

        const cfgUpdate = {
            activeBimestre: bNum,
            bimestreActivoOficial: bNum,
            activeUnits: uArr,
            ultimaActualizacion: new Date().toISOString(),
            lastModified: Date.now()
        };

        if (window.STATE) {
            window.STATE.config = window.STATE.config || {};
            Object.assign(window.STATE.config, cfgUpdate);
        }

        // Firestore
        try {
            const fEngine = await initFirestoreMemoryEngine();
            if (fEngine && fEngine.db && fEngine.fsMod) {
                const { db, fsMod } = fEngine;
                const cfgRef = fsMod.doc(db, "configuracion", "general");
                await fsMod.setDoc(cfgRef, cfgUpdate, { merge: true });
            }
        } catch (fe) {
            console.warn("[EnccoDB] Aviso configuracion Firestore:", fe.message);
        }

        // RTDB Dual
        try {
            await rtdbRequest('/encc_school_state/config.json', 'PATCH', cfgUpdate);
            await rtdbRequest('/config.json', 'PATCH', cfgUpdate);
        } catch (re) {
            console.warn("[EnccoDB] Aviso configuracion RTDB:", re.message);
        }

        window.dispatchEvent(new CustomEvent('EnccoConfigChanged', { detail: cfgUpdate }));
        return true;
    }

    // 6. PERSISTENCIA DE EXONERACIONES ACADÉMICAS
    async function saveAcademicExoneration(exonerationData) {
        if (!exonerationData || !exonerationData.studentId) return false;

        const cleanStr = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const exonId = `exon_${exonerationData.studentId}_${cleanStr(exonerationData.subject)}_${exonerationData.bimestre}`;

        const payload = {
            id: exonId,
            studentId: exonerationData.studentId,
            personalCode: exonerationData.personalCode || '',
            subject: exonerationData.subject || 'ALL',
            bimestre: exonerationData.bimestre || 'ALL',
            type: exonerationData.type || 'EXONERADO',
            reason: exonerationData.reason || '',
            createdAt: new Date().toISOString(),
            active: true
        };

        // Actualizar modelo en memoria
        if (window.STATE) {
            window.STATE.exoneraciones = window.STATE.exoneraciones || {};
            window.STATE.exoneraciones[exonId] = payload;

            // Marcar en el estudiante
            const studentsList = window.STATE.students || [];
            const st = studentsList.find(s => s.id === exonerationData.studentId);
            if (st) {
                st.exoneraciones = st.exoneraciones || [];
                const existIdx = st.exoneraciones.findIndex(e => e.id === exonId);
                if (existIdx !== -1) st.exoneraciones[existIdx] = payload;
                else st.exoneraciones.push(payload);
            }
        }

        // Firestore
        try {
            const fEngine = await initFirestoreMemoryEngine();
            if (fEngine && fEngine.db && fEngine.fsMod) {
                const { db, fsMod } = fEngine;
                const docRef = fsMod.doc(db, "exoneraciones", exonId);
                await fsMod.setDoc(docRef, payload, { merge: true });
            }
        } catch (fe) {
            console.warn("[EnccoDB] Aviso al guardar exoneración en Firestore:", fe.message);
        }

        // RTDB Dual
        try {
            await rtdbRequest(`/encc_school_state/exoneraciones/${exonId}.json`, 'PUT', payload);
            await rtdbRequest(`/exoneraciones/${exonId}.json`, 'PUT', payload);
        } catch (re) {
            console.warn("[EnccoDB] Aviso al guardar exoneración en RTDB:", re.message);
        }

        window.dispatchEvent(new CustomEvent('EnccoExonerationSaved', { detail: payload }));
        return true;
    }

    // 7. ESCUCHADORES REACTIVOS ON-SNAPSHOT EN TIEMPO REAL
    function listenRealtimeCollection(colName, callback) {
        initFirestoreMemoryEngine().then(fEngine => {
            if (fEngine && fEngine.db && fEngine.fsMod) {
                const { db, fsMod } = fEngine;
                const colRef = fsMod.collection(db, colName);
                return fsMod.onSnapshot(colRef, (snapshot) => {
                    const items = [];
                    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                    if (typeof callback === 'function') callback(items);
                }, (err) => {
                    console.warn(`[EnccoDB] onSnapshot listener en ${colName}:`, err.message);
                });
            }
        });
    }


    // 8. LIMPIEZA DE CACHÉ EN MEMORIA Y RESINCRONIZACIÓN
    async function cleanCacheAndResyncNow() {
        if (typeof window.showToast === 'function') {
            window.showToast("🧹 Purgando memoria volátil y resincronizando...", "info");
        }
        try {
            if (typeof window.forcePullFromFirebaseNow === 'function') {
                await window.forcePullFromFirebaseNow();
            } else if (typeof window.pullStateFromFirebaseCloud === 'function') {
                await window.pullStateFromFirebaseCloud(true);
            }
            if (typeof window.showToast === 'function') {
                window.showToast("✅ Memoria purgada y datos resincronizados desde Firebase.", "success");
            }
        } catch(e) {
            console.warn("Aviso al resincronizar:", e.message);
            if (typeof window.showToast === 'function') {
                window.showToast("Aviso al resincronizar: " + e.message, "warning");
            }
        }
    }


    // 9. AGREGAR ROL A USUARIO MEDIANTE ARRAYUNION (ATÓMICO Y SIN DUPLICADOS)
    async function agregarRolAUsuario(userId, nuevoRol) {
        if (!userId || !nuevoRol) return false;

        const fEngine = await initFirestoreMemoryEngine();
        if (fEngine && fEngine.db && fEngine.fsMod) {
            const { db, fsMod } = fEngine;
            const userRef = fsMod.doc(db, "usuarios", userId);
            const arrayUnion = fsMod.arrayUnion;

            try {
                if (typeof arrayUnion === 'function') {
                    // 'arrayUnion' añade el nuevo rol a la lista sin borrar los anteriores ni duplicar
                    await fsMod.updateDoc(userRef, {
                        roles: arrayUnion(nuevoRol)
                    });
                } else {
                    await fsMod.setDoc(userRef, {
                        roles: [nuevoRol]
                    }, { merge: true });
                }
            } catch (err) {
                // Si el documento aún no existe en Firestore, crearlo dinámicamente con merge: true
                await fsMod.setDoc(userRef, {
                    roles: (typeof arrayUnion === 'function') ? arrayUnion(nuevoRol) : [nuevoRol],
                    lastModified: Date.now()
                }, { merge: true });
            }
        }

        // Actualizar en el estado local STATE.users
        if (window.STATE && Array.isArray(window.STATE.users)) {
            const user = window.STATE.users.find(u => u && (u.id === userId || u.username === userId));
            if (user) {
                user.roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
                if (!user.roles.includes(nuevoRol)) {
                    user.roles.push(nuevoRol);
                }
                user.lastModified = Date.now();
            }
        }

        // Sincronizar en RTDB
        try {
            const usersList = (window.STATE && Array.isArray(window.STATE.users)) ? window.STATE.users : [];
            const uIdx = usersList.findIndex(u => u && (u.id === userId || u.username === userId));
            if (uIdx !== -1) {
                const user = usersList[uIdx];
                await rtdbRequest(`/encc_school_state/users/${uIdx}.json`, 'PATCH', { roles: user.roles });
                await rtdbRequest(`/users/${uIdx}.json`, 'PATCH', { roles: user.roles });
            }
        } catch (re) {
            console.warn("[EnccoDB] Aviso al sincronizar roles en RTDB:", re.message);
        }

        window.dispatchEvent(new CustomEvent('EnccoUserRoleUpdated', { detail: { userId, nuevoRol } }));
        return true;
    }

    /**
     * 🛑 REINICIO ATÓMICO TOTAL DE BASE DE DATOS EN LA NUBE (EXCLUSIVO ADMINISTRADOR)
     * Utiliza operaciones por lotes (writeBatch()) en Firestore y actualiza atómicamente RTDB.
     * Purgando: notas/calificaciones, clases/secciones, docentes, estudiantes, pensum, exoneraciones, bimestres.
     * Conserva la cuenta Super Administrador para garantizar acceso ininterrumpido.
     */
    async function reiniciarBaseDeDatosCloud(adminUserOverride = null) {
        const fbMod = (typeof window !== 'undefined' && window.FirebaseModular) || (typeof FirebaseModular !== 'undefined' ? FirebaseModular : null);
        const report = { collectionsPurged: {}, rtdbReset: false, success: true };

        const adminMaster = adminUserOverride || {
            id: 'usr-admin-01',
            username: 'admin',
            name: 'Prof. Nehemias Yalil Salguero',
            title: 'Super Administrador / Director',
            role: 'admin',
            roles: ['admin', 'director'],
            email: 'nehemias.salguero1982@gmail.com',
            secondaryEmail: '22-01-0014-14@mineduc.edu.gt',
            active: true
        };

        // 1. Purga por lotes en Firestore con writeBatch()
        if (fbMod && fbMod.db && typeof fbMod.writeBatch === 'function') {
            const collectionsToPurge = [
                'calificaciones', 'grades', 'gradesList', 'notas',
                'clases', 'secciones', 'grados_secciones', 'maestros_guias',
                'docentes', 'estudiantes', 'students',
                'pensum', 'pensumCatalog',
                'exoneraciones',
                'bimestres', 'bloqueos', 'gradeEditRequests'
            ];

            for (const colName of collectionsToPurge) {
                try {
                    const colRef = fbMod.collection(fbMod.db, colName);
                    const snap = await fbMod.getDocs(colRef);
                    if (snap && !snap.empty) {
                        let batch = fbMod.writeBatch(fbMod.db);
                        let opCount = 0;
                        let colDeleted = 0;

                        for (const docSnap of snap.docs) {
                            batch.delete(docSnap.ref);
                            opCount++;
                            colDeleted++;
                            if (opCount >= 400) {
                                await batch.commit();
                                batch = fbMod.writeBatch(fbMod.db);
                                opCount = 0;
                            }
                        }
                        if (opCount > 0) {
                            await batch.commit();
                        }
                        report.collectionsPurged[colName] = colDeleted;
                    } else {
                        report.collectionsPurged[colName] = 0;
                    }
                } catch (colErr) {
                    console.warn(`Aviso al purgar ${colName} con writeBatch:`, colErr);
                }
            }

            // Purgar users / usuarios preservando el Super Administrador
            const userCollections = ['users', 'usuarios'];
            for (const uCol of userCollections) {
                try {
                    const snap = await fbMod.getDocs(fbMod.collection(fbMod.db, uCol));
                    if (snap && !snap.empty) {
                        let batch = fbMod.writeBatch(fbMod.db);
                        let opCount = 0;
                        let uDeleted = 0;

                        for (const docSnap of snap.docs) {
                            const uData = (typeof docSnap.data === 'function') ? docSnap.data() : (docSnap.data || {});
                            const isSuper = docSnap.id === 'usr-admin-01' || uData.role === 'admin' || (uData.roles && uData.roles.includes('admin'));
                            if (isSuper) {
                                continue; // Preservar super admin
                            }
                            batch.delete(docSnap.ref);
                            opCount++;
                            uDeleted++;
                            if (opCount >= 400) {
                                await batch.commit();
                                batch = fbMod.writeBatch(fbMod.db);
                                opCount = 0;
                            }
                        }
                        if (opCount > 0) {
                            await batch.commit();
                        }
                        report.collectionsPurged[uCol] = uDeleted;
                    }
                } catch (uErr) {
                    console.warn(`Aviso al purgar ${uCol}:`, uErr);
                }
            }
        }

        // 2. Reseteo atómico en Realtime Database (/encc_school_state)
        try {
            const cleanStatePayload = {
                calificaciones: {},
                grades: {},
                gradesList: [],
                secciones: {},
                docentes: {},
                students: [],
                pensum: [],
                pensumCatalog: [],
                exoneraciones: {},
                gradeEditRequests: {},
                config: {
                    activeBimestre: 1,
                    activeUnits: [1],
                    globalLocked: false,
                    minPassingScore: 60,
                    teacherBypass: {},
                    lastModified: Date.now()
                },
                users: [adminMaster],
                lastModified: Date.now()
            };

            await rtdbRequest('/encc_school_state.json', 'PUT', cleanStatePayload);
            report.rtdbReset = true;
        } catch (rtdbErr) {
            console.warn("Aviso al resetear RTDB /encc_school_state:", rtdbErr);
            report.rtdbReset = false;
        }

        return report;
    }

    // Exportación Global
    const EnccoDB = {
        initFirestoreMemoryEngine,
        rtdbRequest,
        getRtdbStudentIndex,
        saveStudentSubjectGradeAtomic,
        asignarMaestroGuia,
        setOfficialActiveBimestre,
        saveAcademicExoneration,
        listenRealtimeCollection,
        cleanCacheAndResyncNow,
        agregarRolAUsuario,
        reiniciarBaseDeDatosCloud,
        getFirebaseDatabaseUrl
    };

    window.EnccoDB = EnccoDB;
    window.initFirestoreMemoryEngine = initFirestoreMemoryEngine;
    window.saveStudentSubjectGradeAtomic = saveStudentSubjectGradeAtomic;
    window.asignarMaestroGuia = asignarMaestroGuia;
    window.setOfficialActiveBimestre = setOfficialActiveBimestre;
    window.saveAcademicExoneration = saveAcademicExoneration;
    window.getRtdbStudentIndex = getRtdbStudentIndex;
    window.getFirebaseDatabaseUrl = getFirebaseDatabaseUrl;
    window.cleanCacheAndResyncNow = cleanCacheAndResyncNow;
    window.agregarRolAUsuario = agregarRolAUsuario;
    window.reiniciarBaseDeDatosCloud = reiniciarBaseDeDatosCloud;

})(typeof window !== 'undefined' ? window : global);
