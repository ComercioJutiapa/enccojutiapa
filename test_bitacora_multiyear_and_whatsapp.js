/**
 * test_bitacora_multiyear_and_whatsapp.js
 * Verificación integral del sistema de bitácora multianual y notificaciones WhatsApp
 * para Escuela Nacional de Ciencias Comerciales (ENCCO).
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: BITÁCORA MULTIANUAL Y NOTIFICACIONES WHATSAPP');
console.log('================================================================================\n');

const htmlPath = path.join(__dirname, 'plataforma.html');
const jsPath = path.join(__dirname, 'app.js');
const archiverPath = path.join(__dirname, 'cycle_archiver.js');

const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const jsSrc = fs.readFileSync(jsPath, 'utf8');
const archiverSrc = fs.readFileSync(archiverPath, 'utf8');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

async function runAllTests() {
    // -----------------------------------------------------------------------------
    // TEST 1: Elementos estructurales de Bitácora y WhatsApp en plataforma.html
    // -----------------------------------------------------------------------------
    await test('TEST 1: Elementos estructurales de Bitácora y WhatsApp en plataforma.html', () => {
        // Pestaña de Bitácora en Modal Perfil del Estudiante
        assert(htmlSrc.includes('id="profTabBtn-annotations"'), 'Falta botón de pestaña Bitácora');
        assert(htmlSrc.includes('id="profAnnotationsTabCount"'), 'Falta badge de contador de anotaciones');
        assert(htmlSrc.includes('id="profTab-annotations"'), 'Falta panel contenedor de pestaña Bitácora');
        assert(htmlSrc.includes('id="profBitacoraCycleFilter"'), 'Falta selector de filtro por ciclo lectivo');
        assert(htmlSrc.includes('id="profBitacoraTypeFilter"'), 'Falta selector de filtro por tipo/categoría');
        assert(htmlSrc.includes('id="profBitacoraSummaryBar"'), 'Falta barra de KPIs de la bitácora');
        assert(htmlSrc.includes('id="profAnnotationsListContainer"'), 'Falta contenedor de lista/timeline de anotaciones');

        // Checkbox WhatsApp en modal de anotaciones
        assert(htmlSrc.includes('id="annotSendWhatsAppCheckbox"'), 'Falta checkbox de notificación WhatsApp en anotación');

        // Modal de Notificación de Incidencia por WhatsApp
        assert(htmlSrc.includes('id="whatsappIncidentModal"'), 'Falta modal whatsappIncidentModal');
        assert(htmlSrc.includes('id="waModalPhoneInput"'), 'Falta input de número telefónico waModalPhoneInput');
        assert(htmlSrc.includes('id="waModalMessagePreview"'), 'Falta textarea de mensaje waModalMessagePreview');
        assert(htmlSrc.includes('executeWhatsAppSend()'), 'Falta botón o llamada executeWhatsAppSend');
        assert(htmlSrc.includes('closeWhatsAppIncidentModal()'), 'Falta botón o llamada closeWhatsAppIncidentModal');
    });

    // -----------------------------------------------------------------------------
    // TEST 2: Registro de anotaciones con academicCycle y gradeAtEvent
    // -----------------------------------------------------------------------------
    await test('TEST 2: addStudentAnnotation registra academicCycle y gradeAtEvent automáticamente', () => {
        const sandbox = {
            window: {},
            STATE: {
                activeCycle: '2026',
                academicCycle: '2026',
                students: [
                    { id: 'st-001', carne: '2026-001', name: 'Juan Pérez', grade: '4to Perito Contador Sección A', gradeCode: '4TO-A' }
                ],
                studentAnnotations: [],
                currentUser: { id: 'usr-prof-1', name: 'Prof. Carlos García', role: 'docente' },
                currentRole: 'docente'
            },
            saveStateToLocalStorage: () => {},
            console: console
        };
        sandbox.window.STATE = sandbox.STATE;
        sandbox.window.saveStateToLocalStorage = sandbox.saveStateToLocalStorage;
        vm.createContext(sandbox);

        const extractFn = jsSrc.match(/function addStudentAnnotation[\s\S]*?window\.addStudentAnnotation\s*=\s*addStudentAnnotation;/);
        assert(extractFn, 'No se pudo extraer función addStudentAnnotation');
        vm.runInContext(extractFn[0], sandbox);

        const note = sandbox.addStudentAnnotation({
            studentId: 'st-001',
            category: 'academico',
            text: 'Excelente rendimiento en el laboratorio de contabilidad',
            authorId: 'usr-prof-1',
            authorName: 'Prof. Carlos García',
            parentNotified: true
        });

        assert(note, 'La función debe retornar la anotación creada');
        assert.strictEqual(note.studentId, 'st-001');
        assert.strictEqual(note.academicCycle, '2026', 'Debe estampar academicCycle = 2026');
        assert.strictEqual(note.gradeAtEvent, '4to Perito Contador Sección A', 'Debe estampar gradeAtEvent con el grado del estudiante');
        assert.strictEqual(note.parentNotified, true, 'Debe registrar parentNotified');
        assert.strictEqual(sandbox.STATE.studentAnnotations.length, 1, 'Debe almacenarse en STATE.studentAnnotations');
    });

    // -----------------------------------------------------------------------------
    // TEST 3: Persistencia de bitácora a través de la transición de ciclos en cycle_archiver.js
    // -----------------------------------------------------------------------------
    await test('TEST 3: cycle_archiver.js preserva studentAnnotations y archiva annotationsSnapshot', async () => {
        assert(archiverSrc.includes('annotationsSnapshot: JSON.parse(JSON.stringify(studentAnnotations))'), 'Falta annotationsSnapshot en archivePayload');
        assert(archiverSrc.includes('// Preservar la bitácora acumulativa de los estudiantes para los siguientes años'), 'Falta lógica de preservación en openNewAcademicCycle');

        const sandbox = {
            window: {},
            document: {
                getElementById: () => null,
                querySelectorAll: () => [],
                createElement: () => ({ style: {}, appendChild: () => {} }),
                body: { appendChild: () => {} }
            },
            STATE: {
                activeCycle: '2026',
                academicCycle: '2026',
                students: [
                    { id: 'st-001', name: 'Juan Pérez', grade: '4to Perito Contador Sección A', gradeCode: '4TO-A', status: 'Inscrito' }
                ],
                studentAnnotations: [
                    { id: 'ann-1', studentId: 'st-001', academicCycle: '2026', text: 'Nota de 4to año' }
                ],
                disciplineReports: [{ id: 'rep-1', studentId: 'st-001', fault: 'Falta 2026' }],
                attendanceRecords: { '2026-03-01': {} },
                studentPermissions: [{ id: 'perm-1' }],
                dismissedAlerts: {},
                cycles: [{ name: '2026', status: 'Activo' }]
            },
            console: console,
            showToast: () => {},
            fetch: async () => ({ ok: true, json: async () => ({}) })
        };
        sandbox.window = sandbox;
        sandbox.localStorage = { setItem: () => {}, getItem: () => null };
        vm.createContext(sandbox);

        vm.runInContext(archiverSrc, sandbox);

        const archiver = sandbox.EnccoCycleArchiver;
        assert(archiver, 'EnccoCycleArchiver debe estar definido');

        const result = await archiver.openNewAcademicCycle('2027', {
            promoteStudents: true,
            archiveCurrent: false
        });

        assert(result && result.success === true, 'Apertura de ciclo 2027 debe ser exitosa');
        assert.strictEqual(sandbox.STATE.activeCycle, '2027');
        // Las anotaciones persisten y no fueron borradas
        assert.strictEqual(sandbox.STATE.studentAnnotations.length, 1, 'Las anotaciones deben preservarse');
        assert.strictEqual(sandbox.STATE.studentAnnotations[0].academicCycle, '2026', 'La anotación previa debe seguir perteneciendo a 2026');

        // La base activa de reportes disciplinarios y asistencias del año anterior se resetea para ligereza
        assert.strictEqual(sandbox.STATE.disciplineReports.length, 0, 'disciplineReports activo debe resetearse a longitud 0');
        assert.strictEqual(Object.keys(sandbox.STATE.attendanceRecords).length, 0, 'attendanceRecords activo debe resetearse');
    });

    // -----------------------------------------------------------------------------
    // TEST 4: Generación y formateo de mensajes institucionales para WhatsApp
    // -----------------------------------------------------------------------------
    await test('TEST 4: Formateo de mensajes y sanitización telefónica para WhatsApp (+502 Guatemala)', () => {
        assert(jsSrc.includes('function promptIncidentWhatsAppNotification('), 'Falta promptIncidentWhatsAppNotification');
        assert(jsSrc.includes('function executeWhatsAppSend('), 'Falta executeWhatsAppSend');
        assert(jsSrc.includes('function closeWhatsAppIncidentModal('), 'Falta closeWhatsAppIncidentModal');
        assert(jsSrc.includes('https://wa.me/'), 'Falta URL base de WhatsApp con codificación wa.me');

        const sandbox = {
            window: {
                open: (url) => { sandbox._openedUrl = url; },
                _currentWhatsAppPayload: null
            },
            STATE: {
                students: [
                    {
                        id: 'st-001',
                        carne: '2026-001',
                        name: 'Juan',
                        lastName: 'Pérez',
                        grade: '4to Perito Contador Sección A',
                        phone: '55443322',
                        guardianPhone1: '44332211'
                    }
                ],
                currentUser: { name: 'Prof. Carlos García', role: 'docente' }
            },
            document: {
                getElementById: (id) => {
                    if (!sandbox._mockDom[id]) {
                        sandbox._mockDom[id] = {
                            value: '',
                            innerHTML: '',
                            style: { display: 'none', setProperty: () => {} },
                            classList: { add: () => {}, remove: () => {} }
                        };
                    }
                    return sandbox._mockDom[id];
                }
            },
            _mockDom: {},
            formatStudentDisplayName: (s) => `${s.lastName}, ${s.name}`,
            showToast: () => {}
        };
        sandbox.window.STATE = sandbox.STATE;
        sandbox.window.document = sandbox.document;
        vm.createContext(sandbox);

        // Extraer funciones de WhatsApp
        const waBlock = jsSrc.match(/function promptIncidentWhatsAppNotification[\s\S]*?window\.closeWhatsAppIncidentModal\s*=\s*closeWhatsAppIncidentModal;/);
        assert(waBlock, 'No se pudo extraer bloque de WhatsApp');
        vm.runInContext(waBlock[0], sandbox);

        sandbox.window.promptIncidentWhatsAppNotification({
            studentId: 'st-001',
            type: 'inasistencia',
            reason: 'Inasistencia no justificada a clase matutina',
            date: '2026-03-10',
            time: '07:30 AM',
            authorName: 'Prof. Carlos García'
        });

        const payload = sandbox.window._currentWhatsAppPayload;
        assert(payload, 'Debe crearse el payload de WhatsApp');
        assert.strictEqual(payload.cleanPhone, '50244332211', 'Debe tomar el teléfono del tutor registrado normalizado con prefijo 502');
        assert(payload.message.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), 'Debe tener membrete institucional de ENCCO');
        assert(payload.message.includes('Pérez, Juan'), 'Debe incluir el nombre del estudiante');
        assert(payload.message.includes('Inasistencia no justificada a clase matutina'), 'Debe incluir el motivo del aviso');
        assert(payload.message.includes('Prof. Carlos García'), 'Debe incluir el remitente');

        // Ejecutar envío
        sandbox.window.executeWhatsAppSend();
        assert(sandbox._openedUrl, 'Debe invocar window.open');
        assert(sandbox._openedUrl.includes('50244332211'), 'Debe anteponer el código de país de Guatemala 502 al número de 8 dígitos');
        assert(sandbox._openedUrl.includes('https://wa.me/'), 'Debe ser enlace oficial de WhatsApp wa.me');
    });

    // -----------------------------------------------------------------------------
    // TEST 5: Matriz de Privacidad y Visibilidad Holística en Ficha del Estudiante
    // -----------------------------------------------------------------------------
    await test('TEST 5: canUserViewAnnotation respeta privacidad individual pero permite lectura holística en perfil', () => {
        const sandbox = {
            window: { STATE: {} },
            STATE: {}
        };
        vm.createContext(sandbox);

        const canUserViewMatch = jsSrc.match(/function canUserViewAnnotation[\s\S]*?window\.canUserViewAnnotation\s*=\s*canUserViewAnnotation;/);
        assert(canUserViewMatch, 'No se pudo extraer canUserViewAnnotation');
        vm.runInContext(canUserViewMatch[0], sandbox);

        const canView = sandbox.canUserViewAnnotation;
        const teacherNote = {
            id: 'ANN_101',
            studentId: 'st-001',
            authorId: 'doc_carlos',
            authorName: 'Carlos García',
            authorRole: 'docente'
        };

        const docMario = { id: 'doc_mario', role: 'docente' };
        const auxAna = { id: 'aux_ana', role: 'profesor_auxiliar' };
        const dirRoberto = { id: 'dir_roberto', role: 'director' };

        // En vistas genéricas / aisladas:
        assert.strictEqual(canView(teacherNote, docMario, 'docente', false), false, 'Docente Mario NO debe ver nota de Carlos en lista aislada');
        assert.strictEqual(canView(teacherNote, auxAna, 'profesor_auxiliar', false), true, 'Auxiliar Ana SÍ debe ver en lista aislada');
        assert.strictEqual(canView(teacherNote, dirRoberto, 'director', false), true, 'Director Roberto SÍ debe ver en lista aislada');

        // En la Ficha / Perfil de Seguimiento del Estudiante (isProfileRecord = true):
        assert.strictEqual(canView(teacherNote, docMario, 'docente', true), true, 'Docente Mario SÍ puede ver el historial formativo en el perfil del alumno');
    });

    console.log('\n================================================================================');
    console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
    console.log('================================================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runAllTests();
