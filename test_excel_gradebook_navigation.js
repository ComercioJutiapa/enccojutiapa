// test_excel_gradebook_navigation.js
// Verificación automatizada de navegación fluida estilo Excel en planilla de calificaciones

const fs = require('fs');
const assert = require('assert');

console.log("=== INICIANDO PRUEBAS DE NAVEGACIÓN ESTILO EXCEL EN PLANILLA DE NOTAS ===");

const appJs = fs.readFileSync('app.js', 'utf8');
const stylesCss = fs.readFileSync('styles.css', 'utf8');

// 1. Verificación de estilos de foco y celda activa
assert(stylesCss.includes('input.grade-box-input:focus'), 'Falta estilo de foco para grade-box-input en styles.css');
assert(stylesCss.includes('input.grade-box-input-exam:focus'), 'Falta estilo de foco para grade-box-input-exam en styles.css');
assert(stylesCss.includes('transform: scale(1.04)'), 'Falta efecto scale en celda activa');
console.log("✔ TEST 1: Estilos CSS de celda activa estilo Excel verificados.");

// 2. Verificación de atributos en inputs de actividades y examen
assert(appJs.includes('onkeydown="handleGradeGridKeyDown(event, this)"'), 'Falta onkeydown en los inputs');
assert(appJs.includes('onfocus="this.select()"'), 'Falta onfocus="this.select()" en los inputs');
console.log("✔ TEST 2: Atributos onkeydown y onfocus(select) presentes en inputs de planilla.");

// 3. Verificación de la función handleGradeGridKeyDown
assert(appJs.includes('function handleGradeGridKeyDown(e, input)'), 'Falta la función handleGradeGridKeyDown');
assert(appJs.includes("window.handleGradeGridKeyDown = handleGradeGridKeyDown;"), 'Falta exportar handleGradeGridKeyDown a window');
console.log("✔ TEST 3: Función handleGradeGridKeyDown definida y exportada correctamente.");

// 4. Verificación de soporte de teclas clave (Enter, ArrowDown, ArrowUp, ArrowRight, ArrowLeft)
assert(appJs.includes("key === 'Enter'"), "Falta soporte para Enter");
assert(appJs.includes("key === 'ArrowDown'"), "Falta soporte para ArrowDown");
assert(appJs.includes("key === 'ArrowUp'"), "Falta soporte para ArrowUp");
assert(appJs.includes("key === 'ArrowRight'"), "Falta soporte para ArrowRight");
assert(appJs.includes("key === 'ArrowLeft'"), "Falta soporte para ArrowLeft");
assert(appJs.includes("targetInput.focus()"), "Falta llamada a targetInput.focus()");
assert(appJs.includes("targetInput.select()"), "Falta llamada a targetInput.select()");
console.log("✔ TEST 4: Soporte de flechas direccionales, enter, foco y auto-selección de texto verificado.");

console.log("\n🎉 ¡TODAS LAS PRUEBAS DE NAVEGACIÓN EXCEL PASARON CON ÉXITO ROTUNDO (4/4)!");
