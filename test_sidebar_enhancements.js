/**
 * test_sidebar_enhancements.js
 * Suite de pruebas automatizada para las mejoras de la barra lateral ergonómica
 * Escuela Nacional de Ciencias Comerciales Jutiapa 1970
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Iniciando pruebas: Barra lateral ergonómica (verificación de ajustes)...');

const rootDir = path.resolve(__dirname);
const sidebarJsPath = path.join(rootDir, 'sidebar_manager.js');
const plataformaHtmlPath = path.join(rootDir, 'plataforma.html');
const stylesCssPath = path.join(rootDir, 'styles.css');

// 1. Verificar existencia y contenido de sidebar_manager.js
assert(fs.existsSync(sidebarJsPath), 'sidebar_manager.js debe existir en la raíz');
const sidebarJsContent = fs.readFileSync(sidebarJsPath, 'utf8');

assert(sidebarJsContent.includes('class SidebarManager') || sidebarJsContent.includes('SidebarManager ='), 'Debe definir SidebarManager');
assert(sidebarJsContent.includes('toggleSection'), 'Debe incluir método toggleSection');
console.log('  ✔ sidebar_manager.js estructurado y métodos requeridos validados.');

// 2. Verificar inclusión de scripts y elementos en plataforma.html
assert(fs.existsSync(plataformaHtmlPath), 'plataforma.html debe existir');
const plataformaHtml = fs.readFileSync(plataformaHtmlPath, 'utf8');

assert(plataformaHtml.includes('sidebar_manager.js'), 'plataforma.html debe cargar sidebar_manager.js');
assert(plataformaHtml.includes('id="navGroup-admin"'), 'plataforma.html debe contener el grupo navGroup-admin');
assert(plataformaHtml.includes('id="navGroup-academic"'), 'plataforma.html debe contener el grupo navGroup-academic');
assert(plataformaHtml.includes('id="navGroup-teachers"'), 'plataforma.html debe contener el grupo navGroup-teachers');
assert(plataformaHtml.includes('id="navGroup-reports"'), 'plataforma.html debe contener el grupo navGroup-reports');

// Verificar que se removió la opción de colapsar/expandir lateral por solicitud del usuario:
assert(!plataformaHtml.includes('id="sidebarCollapseBtn"'), 'plataforma.html NO debe incluir #sidebarCollapseBtn (removido)');

// Verificar que se removió la opción de búsqueda de módulos por solicitud del usuario:
assert(!plataformaHtml.includes('id="sidebarNavSearchInput"'), 'plataforma.html NO debe incluir #sidebarNavSearchInput (removido)');
assert(!plataformaHtml.includes('sidebar-search-box'), 'plataforma.html NO debe incluir .sidebar-search-box (removido)');

// Verificar que se respetó la exclusión del estado de conexión:
const sidebarSectionMatch = plataformaHtml.match(/<aside class="sidebar[\s\S]*?<\/aside>/);
assert(sidebarSectionMatch, 'Debe existir <aside class="sidebar">');
const sidebarHtml = sidebarSectionMatch[0];
assert(!sidebarHtml.toLowerCase().includes('estado de conexión') && !sidebarHtml.toLowerCase().includes('estado de conexion'), 'La barra lateral NO debe incluir indicador de estado de conexión');
console.log('  ✔ plataforma.html integra acordeones institucionales y confirma la remoción limpia de botones y buscadores no deseados.');

// 3. Verificar reglas CSS en styles.css
assert(fs.existsSync(stylesCssPath), 'styles.css debe existir');
const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

assert(!stylesCss.includes('.sidebar-collapse-toggle-btn {'), 'styles.css NO debe incluir .sidebar-collapse-toggle-btn');
assert(!stylesCss.includes('.app-layout.sidebar-collapsed'), 'styles.css NO debe incluir regla .app-layout.sidebar-collapsed');
assert(stylesCss.includes('.nav-section-group.collapsed'), 'styles.css debe manejar acordeones colapsados');
assert(stylesCss.includes('.badge-pulse'), 'styles.css debe definir animación .badge-pulse');
assert(!stylesCss.includes('.sidebar-search-box {'), 'styles.css no debe contener estilos del buscador de módulos');
console.log('  ✔ styles.css validado sin reglas residuales de colapso mini o búsqueda.');

console.log('✅ TODAS LAS PRUEBAS DE LA BARRA LATERAL APROBADAS SATISFACTORIAMENTE (100%).\n');
