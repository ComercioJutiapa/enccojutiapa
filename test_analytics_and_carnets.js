const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS: ANALÍTICA PREDICTIVA, CARNÉS Y MODULARIZACIÓN');
console.log('========================================================================\n');

// 1. Cargar código de los módulos
const analyticsCode = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');
const carnetsCode = fs.readFileSync(path.join(__dirname, 'carnets.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Mock del entorno de navegador para evaluar los módulos
const mockWindow = {
    STATE: {
        activeCycle: '2026',
        currentRole: 'admin',
        rolesConfig: [],
        pensum: [
            { subject: 'Contabilidad General', grade: '4', section: 'A', career: 'Perito Contador' },
            { subject: 'Matemática Comercial', grade: '4', section: 'A', career: 'Perito Contador' },
            { subject: 'Inglés Comercial', grade: '4', section: 'A', career: 'Perito Contador' },
            { subject: 'Administración', grade: '4', section: 'A', career: 'Perito Contador' }
        ],
        students: []
    },
    document: {
        getElementById: () => null,
        querySelectorAll: () => []
    }
};

// Evaluar analytics.js dentro del contexto mock
const evalAnalytics = new Function('window', 'document', 'console', analyticsCode);
evalAnalytics(mockWindow, mockWindow.document, console);

const EnccoAnalytics = mockWindow.EnccoAnalytics;
assert(EnccoAnalytics, '❌ EnccoAnalytics debe estar definido en window');
console.log('✅ TEST 1: analytics.js se inicializa y expone EnccoAnalytics correctamente');

// Evaluar carnets.js dentro del contexto mock
const evalCarnets = new Function('window', 'document', 'console', carnetsCode);
evalCarnets(mockWindow, mockWindow.document, console);

const EnccoCarnets = mockWindow.EnccoCarnets;
assert(EnccoCarnets, '❌ EnccoCarnets debe estar definido en window');
console.log('✅ TEST 2: carnets.js se inicializa y expone EnccoCarnets correctamente');

// 2. Probar Algoritmo de Riesgo Predictivo
console.log('\n--- Pruebas de Algoritmo de Riesgo (analytics.js) ---');

// Estudiante A: Excelente promedio (Sin riesgo / SATISFACTORIO)
const studentA = {
    id: 'st_1',
    name: 'Carlos René Gómez Morales',
    grade: '4',
    section: 'A',
    career: 'Perito Contador',
    grades: {
        'Contabilidad General': 85,
        'Matemática Comercial': 90,
        'Inglés Comercial': 78,
        'Administración': 92
    }
};

const riskA = EnccoAnalytics.evaluateStudentRisk(studentA);
assert.strictEqual(riskA.riskLevel, 'SATISFACTORIO', 'Estudiante A debe tener nivel SATISFACTORIO');
assert.strictEqual(riskA.failedSubjectsCount, 0, 'Estudiante A no debe tener materias reprobadas');
console.log(`✅ TEST 3: Alumno con notas aprobatorias -> Riesgo SATISFACTORIO (Promedio: ${riskA.overallAverage} pts, Reprobadas: ${riskA.failedSubjectsCount})`);

// Estudiante B: 1 materia reprobada (<60 pts) -> MODERADO
const studentB = {
    id: 'st_2',
    name: 'Ana Lucía Morales Pinto',
    grade: '4',
    section: 'A',
    career: 'Perito Contador',
    grades: {
        'Contabilidad General': 52, // reprobada
        'Matemática Comercial': 75,
        'Inglés Comercial': 80,
        'Administración': 68
    }
};

const riskB = EnccoAnalytics.evaluateStudentRisk(studentB);
assert.strictEqual(riskB.riskLevel, 'MODERADO', 'Estudiante B debe tener riesgo MODERADO');
assert.strictEqual(riskB.failedSubjectsCount, 1, 'Estudiante B debe tener 1 materia reprobada');
assert.strictEqual(riskB.failedSubjectsList[0].subject, 'Contabilidad General');
console.log(`✅ TEST 4: Alumno con 1 materia reprobada (52 pts) -> Riesgo MODERADO (Reprobadas: ${riskB.failedSubjectsList.map(s => s.subject).join(', ')})`);

// Estudiante C: 3 materias reprobadas -> CRÍTICO
const studentC = {
    id: 'st_3',
    name: 'Juan José Pérez López',
    grade: '4',
    section: 'A',
    career: 'Perito Contador',
    grades: {
        'Contabilidad General': 45, // reprobada
        'Matemática Comercial': 40, // reprobada
        'Inglés Comercial': 50, // reprobada
        'Administración': 65
    }
};

const riskC = EnccoAnalytics.evaluateStudentRisk(studentC);
assert.strictEqual(riskC.riskLevel, 'CRITICO', 'Estudiante C debe tener riesgo CRITICO');
assert.strictEqual(riskC.failedSubjectsCount, 3, 'Estudiante C debe tener 3 materias reprobadas');
console.log(`✅ TEST 5: Alumno con 3 materias reprobadas -> Riesgo CRÍTICO (Reprobadas: ${riskC.failedSubjectsCount}, Promedio: ${riskC.overallAverage} pts)`);

// 3. Probar Métricas Agregadas y Detección de Materias Críticas
mockWindow.STATE.students = [studentA, studentB, studentC];
const aggregated = EnccoAnalytics.getAggregatedAnalytics();
assert.strictEqual(aggregated.totalStudentsCount, 3, 'Total de alumnos debe ser 3');
assert.strictEqual(aggregated.countCritico, 1, 'Debe haber 1 alumno crítico');
assert.strictEqual(aggregated.countModerado, 1, 'Debe haber 1 alumno moderado');
assert.strictEqual(aggregated.countSatisfactorio, 1, 'Debe haber 1 alumno satisfactorio');

// Ranking de materias críticas: Contabilidad General reprobada por B y C (2/3 = 67% reprobación)
assert(aggregated.courseRanking.length > 0, 'Debe existir ranking de materias');
assert.strictEqual(aggregated.courseRanking[0].subject, 'Contabilidad General');
assert.strictEqual(aggregated.courseRanking[0].failedStudents, 2);
console.log(`✅ TEST 6: Agregación de riesgos y ranking de materias críticas: Materia con mayor reprobación = "${aggregated.courseRanking[0].subject}" (${aggregated.courseRanking[0].failRate}% reprobados)`);

// 4. Probar Generador de Código de Barras SVG Code 39 y Carnés
console.log('\n--- Pruebas de Credenciales y Código de Barras (carnets.js) ---');

const barcodeSvg = EnccoCarnets.generateBarcodeSvg('2026-00412-PC', 260, 48);
assert(barcodeSvg.includes('<svg'), 'El código de barras debe ser un SVG');
assert(barcodeSvg.includes('rect'), 'El SVG debe contener barras rect');
assert(barcodeSvg.includes('viewBox'), 'El SVG debe tener viewBox responsivo');
console.log('✅ TEST 7: Generador nativo de Código de Barras Code 39 genera SVG válido sin librerías externas');

const cardTemplateFront = EnccoCarnets.renderCardFrontHtml(studentA);
assert(cardTemplateFront.includes(studentA.name), 'El carné frontal debe incluir el nombre del estudiante');
assert(cardTemplateFront.includes('CR80') || cardTemplateFront.includes('encco-carnet-card'), 'Debe contener la clase o especificación de carné');
assert(cardTemplateFront.includes('<svg'), 'Debe incluir el código de barras');
console.log('✅ TEST 8: Plantilla oficial de carné frontal CR80 generada exitosamente');

const cardTemplateBack = EnccoCarnets.renderCardBackHtml(studentA);
assert(cardTemplateBack.includes('Identificación Oficial'), 'El reverso debe incluir las normas institucionales');
assert(cardTemplateBack.includes('Dirección'), 'El reverso debe incluir la firma de Dirección');
console.log('✅ TEST 9: Plantilla oficial de carné reverso CR80 generada exitosamente');

// 5. Probar Permisos y RBAC en app.js
console.log('\n--- Pruebas de Blindaje de Seguridad y RBAC (app.js) ---');

// Extraer funciones normalizePermKey, getModulePermissionLevel, hasRolePermission de app.js
const mockAppScope = {
    STATE: { currentRole: 'docente', rolesConfig: [] },
    window: {}
};
const permFunctionsCode = appCode.substring(
    appCode.indexOf('function normalizePermKey('),
    appCode.indexOf('function canRoleModify(')
);

const evalPerms = new Function('STATE', 'window', permFunctionsCode + '\nreturn { normalizePermKey, getModulePermissionLevel, hasRolePermission };');
const perms = evalPerms(mockAppScope.STATE, mockAppScope.window);

// Test permisos para docente (debe ser denegado)
assert.strictEqual(perms.hasRolePermission('predictive-analytics', 'docente'), false, 'Docente NO debe tener acceso a analítica predictiva');
assert.strictEqual(perms.hasRolePermission('carnets', 'docente'), false, 'Docente NO debe tener acceso a emisión de carnés');
console.log('✅ TEST 10: Bloqueo RBAC a rol "docente" para Analítica Predictiva y Carnés verificado');

// Test permisos para director, secretaria y admin (debe ser concedido)
assert.strictEqual(perms.hasRolePermission('predictive-analytics', 'director'), true, 'Director debe tener acceso a analítica predictiva');
assert.strictEqual(perms.hasRolePermission('predictive-analytics', 'secretaria'), true, 'Secretaría debe tener acceso a analítica predictiva');
assert.strictEqual(perms.hasRolePermission('predictive-analytics', 'admin'), true, 'Admin debe tener acceso a analítica predictiva');

assert.strictEqual(perms.hasRolePermission('carnets', 'director'), true, 'Director debe tener acceso a carnés');
assert.strictEqual(perms.hasRolePermission('carnets', 'secretaria'), true, 'Secretaría debe tener acceso a carnés');
assert.strictEqual(perms.hasRolePermission('carnets', 'admin'), true, 'Admin debe tener acceso a carnés');
console.log('✅ TEST 11: Acceso RBAC verificado para Director, Secretaría y Administrador');

// 6. Verificar Registro en SYSTEM_MODULES_LIST y renderCurrentView en app.js
assert(appCode.includes(`'predictive-analytics'`), 'app.js debe registrar predictive-analytics');
assert(appCode.includes(`'carnets'`), 'app.js debe registrar carnets');
assert(appCode.includes(`case 'predictive-analytics':`), 'renderCurrentView debe incluir case predictive-analytics');
assert(appCode.includes(`case 'carnets':`), 'renderCurrentView debe incluir case carnets');
console.log('✅ TEST 12: Despacho de vistas y catálogo de módulos en app.js correctamente conectados');

// 7. Verificar plataforma.html
const htmlCode = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
assert(htmlCode.includes('id="view-predictive-analytics"'), 'plataforma.html debe contener el contenedor view-predictive-analytics');
assert(htmlCode.includes('id="view-carnets"'), 'plataforma.html debe contener el contenedor view-carnets');
assert(htmlCode.includes('analytics.js'), 'plataforma.html debe importar analytics.js');
assert(htmlCode.includes('carnets.js'), 'plataforma.html debe importar carnets.js');
assert(htmlCode.includes('data-view="carnets"'), 'plataforma.html debe contener el ítem de navegación para carnets');
assert(htmlCode.includes('data-view="predictive-analytics"'), 'plataforma.html debe contener el ítem de navegación para predictive-analytics');
console.log('✅ TEST 13: plataforma.html contiene todos los elementos DOM, menús y scripts necesarios');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS AUTOMATIZADAS (13/13) PASARON CON ÉXITO ROTUNDO!');
console.log('========================================================================\n');
