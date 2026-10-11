/**
 * test_no_duplicate_functions.js
 * 
 * Verificación automatizada de cero duplicados de funciones en app.js.
 * Garantiza que ante cualquier versión o actualización futura, NUNCA
 * se introduzcan funciones duplicadas que causen colisiones o inconsistencias.
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN ARQUITECTÓNICA: CERO FUNCIONES DUPLICADAS EN APP.JS');
console.log('================================================================================\n');

const appPath = path.join(__dirname, 'app.js');
if (!fs.existsSync(appPath)) {
    console.error('❌ Error: No se encontró el archivo app.js');
    process.exit(1);
}

const content = fs.readFileSync(appPath, 'utf8');

// Extraer todas las declaraciones de funciones ignorando código dentro de scripts en templates HTML
// Excluir cadenas de texto de plantillas que contengan <script>...</script>
const cleanedContent = content.replace(/<script[\s\S]*?<\/script>/gi, '');

const functionRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const functionOccurrences = {};
let match;

while ((match = functionRegex.exec(cleanedContent)) !== null) {
    const fnName = match[1];
    functionOccurrences[fnName] = (functionOccurrences[fnName] || 0) + 1;
}

const duplicates = Object.keys(functionOccurrences).filter(fn => functionOccurrences[fn] > 1);

console.log(`📊 Total de funciones declaradas analizadas: ${Object.keys(functionOccurrences).length}`);
console.log(`🔍 Total de funciones duplicadas detectadas: ${duplicates.length}\n`);

if (duplicates.length > 0) {
    console.error('❌ SE DETECTARON FUNCIONES DUPLICADAS:');
    duplicates.forEach(fn => {
        console.error(`   - ${fn}: ${functionOccurrences[fn]} declaraciones`);
    });
    console.error('\n⚠️ Regla de Arquitectura violada: Cada función debe declararse una sola vez.');
    process.exit(1);
}

console.log('✅ ÉXITO TOTAL: Ninguna función duplicada encontrada en app.js.');
console.log('🛡️ Salvaguarda anti-duplicados superada al 100%.\n');
console.log('================================================================================');
