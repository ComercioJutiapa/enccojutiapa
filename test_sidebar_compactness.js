/**
 * ======================================================================
 * 🧪 PRUEBA AUTOMATIZADA: COMPACIDAD Y LEGIBILIDAD DE LA BARRA LATERAL (SIDEBAR)
 * ======================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS: COMPACIDAD Y LEGIBILIDAD DE LA BARRA LATERAL');
console.log('========================================================================\n');

const htmlContent = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

// 1. Verificar reducción de ancho a 236px en styles.css
assert(cssContent.includes('width: 236px'), 'styles.css debe definir ancho de 236px');
assert(cssContent.includes('margin-left: -236px'), 'styles.css debe permitir colapso a -236px');
console.log('✅ TEST 1: styles.css define el ancho compacto optimizado de 236px y colapso de -236px');

// 2. Verificar estilos críticos en plataforma.html
assert(htmlContent.includes('width: 236px !important;'), 'plataforma.html debe contener ancho crítico de 236px');
assert(htmlContent.includes('margin-left: -236px !important;'), 'plataforma.html debe contener colapso crítico de -236px');
assert(htmlContent.includes('width: 250px !important;'), 'plataforma.html debe contener ancho móvil cómodo de 250px');
console.log('✅ TEST 2: plataforma.html contiene las reglas críticas para escritorio (236px) y móvil (250px)');

// 3. Verificar que los elementos esenciales del sidebar siguen intactos
const requiredNavItems = [
    'Panel Principal',
    'Roles y Permisos',
    'Usuarios y Maestros',
    'Editor de Grados y Secciones',
    'Directorio de Maestros Guías',
    'Editor de Pensum (Materias)',
    'Asignación de Clases a Docentes',
    'Inscripción y Matrícula',
    'Nómina y Expedientes de Alumnos',
    'Carnés Estudiantiles',
    'Plantillas y Listas Excel',
    'Bloqueo de Bimestres',
    'Ciclos Escolares y Periodos',
    'Promoción y Nuevo Ciclo',
    'Libro de Calificaciones (Notas)',
    'Control de Asistencia Diaria',
    'Gestión de Disciplina y Actas',
    'Cuadros de Honor',
    'Boletín de Calificaciones',
    'Promedios y Estadísticas',
    'Analítica y Riesgo Escolar'
];

requiredNavItems.forEach(item => {
    assert(htmlContent.includes(item), `El menú debe contener "${item}"`);
});
console.log(`✅ TEST 3: Todos los ${requiredNavItems.length} módulos y enlaces de navegación están 100% presentes`);

// 4. Verificar badges especiales intactos
assert(htmlContent.includes('CR80'), 'Badge CR80 debe estar presente');
assert(htmlContent.includes('IA/Riesgo'), 'Badge IA/Riesgo debe estar presente');
assert(htmlContent.includes('pendingGradeRequestsBadge'), 'Badge de solicitudes pendientes debe estar presente');
console.log('✅ TEST 4: Todos los distintivos (CR80, IA/Riesgo, contador dinámico) están intactos');

// 5. Verificar elementos de identidad y perfil
assert(htmlContent.includes('school-brand'), 'school-brand presente');
assert(htmlContent.includes('user-profile-card'), 'user-profile-card presente');
assert(htmlContent.includes('sidebarCycleSelect'), 'sidebarCycleSelect presente');
assert(htmlContent.includes('performLogout'), 'Botón de cerrar sesión presente');
console.log('✅ TEST 5: Identidad institucional, perfil de usuario, selector de ciclo y botón de salida preservados');

console.log('\n========================================================================');
console.log('🎉 ¡BARRA LATERAL REDUCIDA Y OPTIMIZADA CON ÉXITO SIN PERDER NADA (5/5)!');
console.log('========================================================================\n');
