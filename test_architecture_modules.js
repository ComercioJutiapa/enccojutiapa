/**
 * test_architecture_modules.js
 * Verificación automatizada de nuevos módulos estructurales:
 * - db_repository.js (DataRepository & AppEvents)
 * - modal_manager.js (ModalManager)
 * - plataforma.html (importación de scripts)
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN DE MÓDULOS DE ARQUITECTURA (DataRepository, AppEvents, ModalManager)');
console.log('================================================================================');

let passed = 0;
let total = 0;

function assert(cond, msg) {
    total++;
    if (!cond) {
        console.error(`❌ FALLÓ: ${msg}`);
        process.exit(1);
    } else {
        console.log(`  ✅ ${msg}`);
        passed++;
    }
}

// 1. Archivos físicos
const repoPath = path.join(__dirname, 'db_repository.js');
const modalPath = path.join(__dirname, 'modal_manager.js');
const htmlPath = path.join(__dirname, 'plataforma.html');

assert(fs.existsSync(repoPath), 'db_repository.js existe en el proyecto');
assert(fs.existsSync(modalPath), 'modal_manager.js existe en el proyecto');

// 2. Scripts en HTML
const html = fs.readFileSync(htmlPath, 'utf8');
assert(html.includes('src="db_repository.js'), 'db_repository.js está referenciado en plataforma.html');
assert(html.includes('src="modal_manager.js'), 'modal_manager.js está referenciado en plataforma.html');

// 3. Ejecutar y validar AppEvents y DataRepository
global.STATE = { students: [{ id: '2026-CB-022', name: 'JULIO ELIAS', status: 'ACTIVO' }] };
const { DataRepository, AppEvents } = require('./db_repository.js');

assert(typeof AppEvents === 'object', 'AppEvents instanciado correctamente');
assert(typeof AppEvents.on === 'function', 'AppEvents.on disponible');
assert(typeof AppEvents.emit === 'function', 'AppEvents.emit disponible');

// Probar evento Pub/Sub
let eventTriggered = false;
let eventData = null;
AppEvents.on('student:updated', (data) => {
    eventTriggered = true;
    eventData = data;
});
AppEvents.emit('student:updated', { id: '2026-CB-022', note: 'Prueba' });

assert(eventTriggered === true, 'Evento emitido y recibido con éxito por AppEvents');
assert(eventData && eventData.id === '2026-CB-022', 'Payload de evento transmitido con precisión');

// Probar DataRepository
assert(typeof DataRepository === 'object', 'DataRepository instanciado correctamente');
assert(typeof DataRepository.students.getAll === 'function', 'DataRepository.students.getAll disponible');
const students = DataRepository.students.getAll();
assert(students.length === 1 && students[0].name === 'JULIO ELIAS', 'DataRepository.students.getAll consulta STATE correctamente');

console.log(`\n🎉 TODAS LAS ${passed}/${total} PRUEBAS ESTRUCTURALES PASARON CON ÉXITO (100%)\n`);
