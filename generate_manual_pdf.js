const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const assetsDir = 'C:\\Users\\yalil\\.gemini\\antigravity\\brain\\ce54a455-b902-49ad-86ec-4634c40407cc\\assets';
const outputHtml = 'C:\\Users\\yalil\\.gemini\\antigravity\\brain\\ce54a455-b902-49ad-86ec-4634c40407cc\\manual_imprimible.html';
const outputPdf = 'C:\\Users\\yalil\\.gemini\\antigravity\\brain\\ce54a455-b902-49ad-86ec-4634c40407cc\\Manual_Usuario_ENCCO_Docente_Secretaria_Auxiliatura.pdf';
const downloadsPdf = 'C:\\Users\\yalil\\Downloads\\Manual_Usuario_ENCCO_Docente_Secretaria_Auxiliatura.pdf';
const projectPdf = 'C:\\Users\\yalil\\.gemini\\antigravity\\scratch\\plataforma_escuela_comercio_completa\\Manual_Usuario_ENCCO_Docente_Secretaria_Auxiliatura.pdf';

function getBase64Image(filename) {
    const fullPath = path.join(assetsDir, filename);
    if (!fs.existsSync(fullPath)) {
        console.warn('Image not found:', fullPath);
        return '';
    }
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mime = ext === 'webp' ? 'image/webp' : (ext === 'png' ? 'image/png' : 'image/jpeg');
    const data = fs.readFileSync(fullPath).toString('base64');
    return `data:${mime};base64,${data}`;
}

console.log('Cargando imágenes en base64 para inclusión autónoma...');
const imgLogo = getBase64Image('logo.png');
const imgPortada = getBase64Image('portada-comercio-principal.webp');
const imgCampus = getBase64Image('campus-instalaciones.webp');
const imgEstudiantes = getBase64Image('estudiantes-uniformados.webp');
const imgActividades = getBase64Image('actividades-estudiantiles.webp');
const imgLogin = getBase64Image('screenshot_login.png');
const imgGradebook = getBase64Image('screenshot_cuadro_calificaciones.png');
const imgAsistencia = getBase64Image('screenshot_control_asistencia.png');
const imgDirectorio = getBase64Image('screenshot_directorio_estudiantes.png');
const imgMaestros = getBase64Image('screenshot_maestros_guias.png');
const imgBloqueo = getBase64Image('screenshot_bloqueo_notas.png');
const imgTarjeta = getBase64Image('screenshot_tarjeta_calificaciones.png');
const imgSire = getBase64Image('screenshot_datos_sire.png');
const imgFirma = getBase64Image('firma_director_sello.png');

console.log('Construyendo documento HTML optimizado para impresión...');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Manual de Usuario ENCCO - Docente, Secretaría y Auxiliatura</title>
    <style>
        @page {
            size: letter;
            margin: 15mm 14mm 15mm 14mm;
            @bottom-right {
                content: "Página " counter(page);
            }
        }

        *, *:before, *:after {
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }

        /* Saltos de página y control de flujo */
        .page-break {
            page-break-before: always;
            break-before: page;
        }

        .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        /* Portada Ejecutiva */
        .cover-page {
            height: 100vh;
            min-height: 250mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            padding: 20mm 10mm 15mm 10mm;
            page-break-after: always;
        }

        .cover-header {
            margin-bottom: 15px;
        }

        .cover-logo {
            width: 110px;
            height: auto;
            margin: 0 auto 15px auto;
            display: block;
        }

        .cover-school-name {
            font-size: 16pt;
            font-weight: 800;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
        }

        .cover-school-sub {
            font-size: 11pt;
            font-weight: 600;
            color: #0369a1;
            margin: 0 0 4px 0;
        }

        .cover-mineduc {
            font-size: 9pt;
            color: #64748b;
            font-weight: 500;
        }

        .cover-body {
            margin: 30px 0;
        }

        .cover-badge-pill {
            display: inline-block;
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
            font-size: 8.5pt;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 14px;
            border-radius: 9999px;
            margin-bottom: 15px;
            letter-spacing: 0.5px;
        }

        .cover-title {
            font-size: 22pt;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.2;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }

        .cover-subtitle {
            font-size: 12pt;
            color: #475569;
            font-weight: 600;
            margin: 0 0 25px 0;
        }

        .cover-roles-box {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 15px;
        }

        .role-pill {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #334155;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 9.5pt;
            font-weight: 700;
        }

        .cover-image-container {
            width: 100%;
            max-width: 520px;
            margin: 20px auto;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            border: 2px solid #e2e8f0;
        }

        .cover-image {
            width: 100%;
            height: auto;
            display: block;
        }

        .cover-footer {
            border-top: 2px solid #e2e8f0;
            padding-top: 12px;
            font-size: 8.5pt;
            color: #64748b;
        }

        /* Encabezados y títulos de secciones */
        h1.section-title {
            font-size: 15pt;
            font-weight: 800;
            color: #166534;
            border-bottom: 2px solid #166534;
            padding-bottom: 6px;
            margin: 25px 0 14px 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        h2.subsection-title {
            font-size: 12pt;
            font-weight: 700;
            color: #0369a1;
            margin: 18px 0 8px 0;
            border-left: 4px solid #0284c7;
            padding-left: 8px;
        }

        h3.subsubsection-title {
            font-size: 10.5pt;
            font-weight: 700;
            color: #334155;
            margin: 14px 0 6px 0;
        }

        p {
            margin: 0 0 10px 0;
            text-align: justify;
        }

        /* Cajas de alerta y notas */
        .callout {
            border-radius: 6px;
            padding: 10px 14px;
            margin: 12px 0;
            font-size: 9pt;
            break-inside: avoid;
        }

        .callout-info {
            background: #f0fdf4;
            border-left: 4px solid #16a34a;
            color: #166534;
        }

        .callout-warning {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            color: #92400e;
        }

        .callout-alert {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            color: #991b1b;
        }

        .callout-title {
            font-weight: 700;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Tablas */
        table.doc-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 8.5pt;
            break-inside: avoid;
        }

        table.doc-table th {
            background: #f8fafc;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 8pt;
        }

        table.doc-table td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }

        table.doc-table tr:nth-child(even) td {
            background: #f8fafc;
        }

        /* Figuras e imágenes */
        .doc-figure {
            margin: 14px 0;
            text-align: center;
            break-inside: avoid;
        }

        .doc-figure img {
            width: 100%;
            max-width: 620px;
            height: auto;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.06);
            display: block;
            margin: 0 auto;
        }

        .doc-figure-caption {
            font-size: 8pt;
            color: #64748b;
            font-style: italic;
            margin-top: 5px;
            text-align: center;
        }

        /* Pasos numerados */
        .step-list {
            margin: 10px 0 14px 0;
            padding-left: 18px;
        }

        .step-list li {
            margin-bottom: 6px;
            padding-left: 4px;
        }

        .step-number {
            font-weight: 700;
            color: #0369a1;
        }

        /* Diagrama de flujo visual */
        .workflow-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin: 12px 0;
            break-inside: avoid;
        }

        .workflow-step {
            flex: 1;
            text-align: center;
            padding: 8px 6px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 8.5pt;
        }

        .workflow-step strong {
            display: block;
            color: #166534;
            margin-bottom: 3px;
        }

        .workflow-arrow {
            font-size: 14pt;
            color: #94a3b8;
            padding: 0 6px;
            font-weight: bold;
        }

        /* Resumen de badges */
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: 700;
        }
        .badge-green { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }
        .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
        .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        /* Pie de página */
        .page-footer {
            font-size: 8pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>

    <!-- PORTADA OFICIAL -->
    <div class="cover-page">
        <div class="cover-header">
            <img src="${imgLogo}" class="cover-logo" alt="Escudo Oficial ENCCO">
            <div class="cover-school-name">Escuela Nacional de Ciencias Comerciales</div>
            <div class="cover-school-sub">Jutiapa, Guatemala — Fundada en 1970</div>
            <div class="cover-mineduc">Código de Establecimiento MINEDUC: 22-01-0014-46 | Sector Oficial</div>
        </div>

        <div class="cover-body">
            <div class="cover-badge-pill">Documento Técnico Institucional 2026</div>
            <div class="cover-title">Manual Oficial de Usuario<br>y Procedimientos Operativos</div>
            <div class="cover-subtitle">Plataforma Web de Control Académico, Asistencia y Gestión SIRE</div>

            <div class="cover-roles-box">
                <span class="role-pill">👨‍🏫 Módulo Docente</span>
                <span class="role-pill">👩‍💼 Módulo Secretaría</span>
                <span class="role-pill">👮 Módulo Auxiliatura</span>
            </div>

            <div class="cover-image-container">
                <img src="${imgPortada}" class="cover-image" alt="Portada Escuela de Comercio">
            </div>
        </div>

        <div class="cover-footer">
            Dirección del Plantel: Calzada 15 de Septiembre, Zona 3, Jutiapa, Guatemala<br>
            © 2026 Escuela Nacional de Ciencias Comerciales Jutiapa. Todos los derechos reservados.
        </div>
    </div>

    <!-- PÁGINA 1: INTRODUCCIÓN Y ARQUITECTURA GENERAL -->
    <div>
        <h1 class="section-title">1. Introducción y Arquitectura de la Plataforma</h1>
        <p>
            La <strong>Plataforma de Control Académico de la Escuela Nacional de Ciencias Comerciales de Jutiapa (ENCCO)</strong> es el sistema informático institucional diseñado para la administración en tiempo real de calificaciones, asistencias, expedientes estudiantiles y exportación ministerial hacia el <strong>Sistema de Registros Educativos (SIRE)</strong> del Ministerio de Educación de Guatemala.
        </p>

        <div class="workflow-box">
            <div class="workflow-step">
                <strong>1. Docente</strong>
                Ingreso de zonas, tareas y exámenes bimestrales.
            </div>
            <div class="workflow-arrow">➔</div>
            <div class="workflow-step">
                <strong>2. Auxiliatura</strong>
                Asistencia, retardos, permisos y disciplina.
            </div>
            <div class="workflow-arrow">➔</div>
            <div class="workflow-step">
                <strong>3. Secretaría</strong>
                Matrícula, actas, boletas y exportación SIRE.
            </div>
            <div class="workflow-arrow">➔</div>
            <div class="workflow-step">
                <strong>4. MINEDUC SIRE</strong>
                Carga en masa oficial sin errores XML.
            </div>
        </div>

        <h2 class="subsection-title">Estructura Académica Oficial (Ciclo Escolar 2026)</h2>
        <p>
            El sistema atiende un censo riguroso de <strong>412 estudiantes</strong> distribuidos en 12 secciones oficiales bajo el Currículo Nacional Base (CNB):
        </p>

        <table class="doc-table">
            <thead>
                <tr>
                    <th>Grado y Carrera</th>
                    <th>Sección A</th>
                    <th>Sección B</th>
                    <th>Sección C</th>
                    <th>Sección D</th>
                    <th>Total Alumnos</th>
                    <th>Materias Oficiales CNB</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>4to Perito Contador</strong></td>
                    <td style="text-align:center;">34</td>
                    <td style="text-align:center;">36</td>
                    <td style="text-align:center;">33</td>
                    <td style="text-align:center;">35</td>
                    <td style="text-align:center; font-weight:bold;">138</td>
                    <td>9 Asignaturas (Códigos SIRE 338 a 346)</td>
                </tr>
                <tr>
                    <td><strong>5to Perito Contador</strong></td>
                    <td style="text-align:center;">37</td>
                    <td style="text-align:center;">36</td>
                    <td style="text-align:center;">37</td>
                    <td style="text-align:center;">36</td>
                    <td style="text-align:center; font-weight:bold;">146</td>
                    <td>9 Asignaturas (Códigos SIRE 347 a 368)</td>
                </tr>
                <tr>
                    <td><strong>6to Perito Contador</strong></td>
                    <td style="text-align:center;">32</td>
                    <td style="text-align:center;">35</td>
                    <td style="text-align:center;">33</td>
                    <td style="text-align:center;">28</td>
                    <td style="text-align:center; font-weight:bold;">128</td>
                    <td>10 Asignaturas (Códigos SIRE 356 a 365)</td>
                </tr>
                <tr style="background:#f0fdf4; font-weight:bold;">
                    <td>TOTAL INSTITUCIONAL</td>
                    <td style="text-align:center;">103</td>
                    <td style="text-align:center;">107</td>
                    <td style="text-align:center;">103</td>
                    <td style="text-align:center;">99</td>
                    <td style="text-align:center; color:#166534;">412 Alumnos</td>
                    <td>Sincronizados en Memoria Segura</td>
                </tr>
            </tbody>
        </table>

        <h2 class="subsection-title">Acceso al Sistema y Seguridad de Credenciales</h2>
        <p>
            El personal docente y administrativo debe ingresar al portal mediante la dirección web oficial o el archivo <code>login.html</code> en su navegador preferido (Google Chrome o Microsoft Edge).
        </p>

        <div class="doc-figure">
            <img src="${imgLogin}" alt="Pantalla de Inicio de Sesión de la Plataforma">
            <div class="doc-figure-caption">Figura 1.1: Interfaz de Autenticación Criptográfica Unificada (login.html)</div>
        </div>

        <div class="callout callout-warning">
            <div class="callout-title">⚠️ Blindaje Institucional contra Ataques de Fuerza Bruta:</div>
            El sistema registrará y bloqueará temporalmente por 5 minutos cualquier estación de trabajo que ingrese 5 contraseñas incorrectas de manera consecutiva. Conserve su contraseña en estricta reserva.
        </div>
    </div>

    <!-- PÁGINA 2: MANUAL DEL DOCENTE -->
    <div class="page-break">
        <h1 class="section-title">2. Módulo de Operaciones para Docentes y Catedráticos</h1>
        <p>
            El docente de la ENCCO tiene bajo su responsabilidad directa el ingreso riguroso de notas por bimestre, la toma diaria de asistencia y la detección temprana de bajo rendimiento escolar.
        </p>

        <h2 class="subsection-title">2.1. Ingreso de Notas en el Libro de Calificaciones (*Gradebook*)</h2>
        <ol class="step-list">
            <li><span class="step-number">Paso 1:</span> En el menú lateral izquierdo, seleccione <strong>"DOCENTES Y CALIFICACIONES"</strong> > <strong>"Libro de Calificaciones"</strong>.</li>
            <li><span class="step-number">Paso 2:</span> Utilice la barra de selectores superior para definir el <strong>Grado</strong> (4to, 5to o 6to), la <strong>Sección</strong> (A, B, C o D) y su <strong>Asignatura</strong> asignada.</li>
            <li><span class="step-number">Paso 3:</span> Seleccione el periodo a calificar: <code>Bloque 1</code>, <code>Bloque 2</code>, <code>Bloque 3</code>, <code>Bloque 4</code> o <code>Promedio Final</code>.</li>
            <li><span class="step-number">Paso 4:</span> Ingrese el puntaje de cada estudiante sobre una escala estricta de <strong>100 Puntos</strong> (compuesta por Zona Acumulativa de 60 a 70 pts y Evaluación de 30 a 40 pts).</li>
            <li><span class="step-number">Paso 5:</span> Observe la retroalimentación visual en tiempo real:
                <br>• <span class="badge badge-green">APROBADO (≥ 60 pts)</span>: La casilla se destaca con borde y texto verde esmeralda.
                <br>• <span class="badge badge-red">REPROBADO (&lt; 60 pts)</span>: La casilla se resalta en tono carmesí de alerta para recuperación.
            </li>
            <li><span class="step-number">Paso 6:</span> Presione el botón flotante <strong>"Guardar Calificaciones"</strong> (icono de disquete). El sistema sincronizará los datos en menos de 1 segundo con la nube institucional.</li>
        </ol>

        <div class="doc-figure">
            <img src="${imgGradebook}" alt="Cuadro de Calificaciones del Docente">
            <div class="doc-figure-caption">Figura 2.1: Sábana interactiva del Libro de Calificaciones con cálculo automático de promedios</div>
        </div>

        <div class="callout callout-alert">
            <div class="callout-title">🔒 Bloqueo de Fechas Límite:</div>
            Al cumplirse el cronograma bimestral establecido por Dirección, el sistema bloqueará las casillas de notas para impresión de actas. Cualquier modificación posterior requerirá solicitud por escrito en Secretaría.
        </div>

        <h2 class="subsection-title">2.2. Registro Diario de Asistencia Escolar</h2>
        <p>
            Al iniciar el periodo de clases, el catedrático titular debe registrar la asistencia en el módulo <strong>"Control de Asistencia"</strong>:
        </p>

        <div class="doc-figure">
            <img src="${imgAsistencia}" alt="Módulo de Control de Asistencia">
            <div class="doc-figure-caption">Figura 2.2: Registro diario de asistencia con estados P (Presente), A (Ausente), T (Tardanza) y J (Justificado)</div>
        </div>
    </div>

    <!-- PÁGINA 3: MANUAL DE SECRETARÍA -->
    <div class="page-break">
        <h1 class="section-title">3. Módulo de Operaciones para Secretaría General</h1>
        <p>
            La Secretaría General es el órgano custodio de los registros académicos, encargada de la emisión de credenciales, boletas bimestrales, cierre de bimestres y enlace con el SIRE del Ministerio de Educación.
        </p>

        <h2 class="subsection-title">3.1. Directorio Estudiantil y Ficha del Alumno</h2>
        <p>
            Permite consultar la nómina completa de 412 estudiantes, verificar sus números de CUI/DPI y revisar el historial de sus encargados legales:
        </p>

        <div class="doc-figure">
            <img src="${imgDirectorio}" alt="Directorio de Estudiantes">
            <div class="doc-figure-caption">Figura 3.1: Directorio general de estudiantes con búsqueda rápida por CUI, Código Personal y Nombre</div>
        </div>

        <h2 class="subsection-title">3.2. Asignación de Maestros Guías y Secciones</h2>
        <p>
            A través del módulo <code>maestros-guias.html</code>, Secretaría designa formalmente a los catedráticos encargados del acompañamiento pedagógico y firma de boletas en cada una de las 12 secciones:
        </p>

        <div class="doc-figure">
            <img src="${imgMaestros}" alt="Módulo de Maestros Guías">
            <div class="doc-figure-caption">Figura 3.2: Panel de configuración de Maestros Guías por grado y sección (maestros-guias.html)</div>
        </div>

        <h2 class="subsection-title">3.3. Control de Bloqueo de Bimestres (*Grade Lock*)</h2>
        <p>
            Secretaría y Dirección administran la apertura y cierre de las fechas de ingreso de notas mediante el panel <code>bloqueo-notas.html</code>. Cuando un bimestre está cerrado, ningún docente puede alterar notas sin autorización:
        </p>

        <div class="doc-figure">
            <img src="${imgBloqueo}" alt="Panel de Bloqueo de Notas">
            <div class="doc-figure-caption">Figura 3.3: Panel administrativo de cierre y apertura de bimestres (bloqueo-notas.html)</div>
        </div>
    </div>

    <!-- PÁGINA 4: SECRETARÍA - BOLETAS Y SIRE -->
    <div class="page-break">
        <h2 class="subsection-title">3.4. Emisión de Boletas Oficiales de Calificaciones</h2>
        <p>
            El sistema genera boletas en formato carta listas para imprimir con firma digitalizada de Dirección, detalle por curso y cálculo del promedio general:
        </p>

        <div class="doc-figure">
            <img src="${imgTarjeta}" alt="Boleta de Calificaciones Oficial">
            <div class="doc-figure-caption">Figura 3.4: Formato oficial de Tarjeta de Calificaciones Bimestrales con sellos y cuadros de honor</div>
        </div>

        <h2 class="subsection-title">3.5. Carga en Masa al SIRE del MINEDUC (datos-sire.html)</h2>
        <p>
            El módulo <code>datos-sire.html</code> convierte instantáneamente las calificaciones en los archivos XML oficiales exigidos por el Ministerio de Educación bajo la estructura <code>&lt;tablaCargaMasiva&gt;</code>:
        </p>

        <div class="doc-figure">
            <img src="${imgSire}" alt="Módulo SIRE MINEDUC">
            <div class="doc-figure-caption">Figura 3.5: Matriz ministerial de notas con botones de descarga directa XML por sección (datos-sire.html)</div>
        </div>

        <div class="callout callout-info">
            <div class="callout-title">💡 Procedimiento de Carga Ministerial en 2 Pasos:</div>
            <strong>1. En la Plataforma ENCCO:</strong> Filtre el Grado y la Sección deseada (ej. 4to Perito Sec. A). Haga clic en el botón <strong>"Sec. A (34 al.)"</strong>. El archivo XML oficial se descargará de inmediato en su computadora.<br>
            <strong>2. En el Portal SIRE (sire.mineduc.gob.gt):</strong> Inicie sesión como Director/Secretaria, vaya a <em>Calificaciones</em> > <em>Carga en Masa</em>, seleccione el grado/sección y adjunte el archivo XML descargado. El sistema del MINEDUC validará las notas en segundos.
        </div>
    </div>

    <!-- PÁGINA 5: MANUAL DE AUXILIATURA Y FIRMAS -->
    <div class="page-break">
        <h1 class="section-title">4. Módulo de Operaciones para Auxiliatura y Disciplina</h1>
        <p>
            El personal de Auxiliatura es responsable del cumplimiento de las normas de convivencia, la puntualidad en los portones, el control de pases de salida y la citación oportuna a padres de familia.
        </p>

        <h2 class="subsection-title">4.1. Centro de Control de Auxiliatura y Tardanzas</h2>
        <ul class="step-list">
            <li><strong>Recepción Matutina:</strong> A las 07:30 horas se cierra el portón principal. Los alumnos que ingresen con retraso son registrados en el módulo <em>Centro de Auxiliatura</em>.</li>
            <li><strong>Regla de las 3 Tardanzas:</strong> Al acumular tres retardos en un mismo mes calendario, el sistema emite automáticamente una alerta para citación del padre o encargado.</li>
        </ul>

        <h2 class="subsection-title">4.2. Pases de Salida y Permisos Médicos</h2>
        <p>
            Ningún estudiante puede abandonar el campus antes de la hora oficial sin un <strong>Pase de Salida Digital</strong> emitido por Auxiliatura:
        </p>

        <table class="doc-table">
            <thead>
                <tr>
                    <th>Tipo de Permiso</th>
                    <th>Requisitos Obligatorios</th>
                    <th>Efecto en Asistencia</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Enfermedad / Malestar</strong></td>
                    <td>Evaluación en enfermería y comunicación telefónica con el encargado.</td>
                    <td>Se registra como <strong>Justificado (J)</strong> en las clases restantes.</td>
                </tr>
                <tr>
                    <td><strong>Cita Médica IGSS / Centro de Salud</strong></td>
                    <td>Carnet de citas o constancia médica física sellada.</td>
                    <td>Se registra como <strong>Justificado (J)</strong> sin pérdida de zona.</td>
                </tr>
                <tr>
                    <td><strong>Diligencia Familiar Grave</strong></td>
                    <td>Presencia física del padre de familia con DPI original en auxiliatura.</td>
                    <td>Se emite pase de salida firmado y sellado por Auxiliatura.</td>
                </tr>
            </tbody>
        </table>

        <h2 class="subsection-title">4.3. Bitácora de Incidencias Disciplinarias</h2>
        <p>
            El sistema clasifica las faltas según el Reglamento de Convivencia Pacífica de la ENCCO:
            <br>• <strong>Faltas Leves:</strong> Uniforme incompleto, uso de audífonos o celular durante explicaciones docentes.
            <br>• <strong>Faltas Graves:</strong> Evasión del aula, daño a computadoras del laboratorio o falta de respeto a docentes.
        </p>

        <div class="doc-figure" style="max-width: 500px; margin: 15px auto;">
            <img src="${imgActividades}" alt="Actividades Estudiantiles">
            <div class="doc-figure-caption">Figura 4.1: Estudiantes de la ENCCO en actividades cívicas y académicas</div>
        </div>

        <div class="avoid-break" style="margin-top: 30px; border-top: 2px solid #cbd5e1; padding-top: 15px;">
            <h2 class="subsection-title" style="border:none; padding:0; text-align:center;">Validación y Emisión Oficial</h2>
            <p style="text-align:center; font-size:9pt; color:#475569;">
                El presente manual entra en vigor a partir del inicio del Ciclo Escolar 2026 y es de observancia obligatoria para todo el personal docente, administrativo y de servicio de la institución.
            </p>

            <div style="text-align:center; margin-top: 15px;">
                <img src="${imgFirma}" style="max-width: 260px; height: auto; display: inline-block;" alt="Firma y Sello de Dirección">
                <div style="font-size: 8.5pt; font-weight: bold; color: #1e293b; margin-top: -15px;">
                    Licda. Mirza Elizabeth Aragón Polanco de Hernández<br>
                    <span style="font-weight: normal; color: #64748b;">Directora Titular | ENCCO Jutiapa</span>
                </div>
            </div>
        </div>
    </div>

</body>
</html>`;

fs.writeFileSync(outputHtml, htmlContent, 'utf8');
console.log('Documento HTML generado exitosamente en:', outputHtml);

console.log('Compilando PDF imprimible con Microsoft Edge headless...');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const cmd = `"${edgePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdf}" "${outputHtml}"`;
execSync(cmd);

if (fs.existsSync(outputPdf)) {
    const stats = fs.statSync(outputPdf);
    console.log(`✅ PDF generado exitosamente: ${outputPdf} (${Math.round(stats.size / 1024)} KB)`);
    
    // Copiar a Downloads y al proyecto
    try {
        fs.copyFileSync(outputPdf, downloadsPdf);
        console.log(`✅ Copia guardada en Descargas: ${downloadsPdf}`);
    } catch(e) {
        console.warn('No se pudo copiar a Descargas:', e.message);
    }

    try {
        fs.copyFileSync(outputPdf, projectPdf);
        console.log(`✅ Copia guardada en Proyecto: ${projectPdf}`);
    } catch(e) {
        console.warn('No se pudo copiar al proyecto:', e.message);
    }
} else {
    console.error('❌ Error: El archivo PDF no fue generado.');
}
