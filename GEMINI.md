# Antigravity Rules - Modo Silencioso / Auto-Permitir (Opción 4: Always Allow / Permitir Todo)

## Directiva Principal de Ejecución Autónoma
El usuario ha establecido de forma permanente la política de **"Modo Silencioso / Opción 4 (Permitir Siempre Todo / Always Allow)"**:

1. **Auto-Aprobación Total**:
   - Tratar todas las acciones, comandos de terminal (`run_command`), modificaciones y creaciones de archivos (`write_to_file`, `replace_file_content`), ejecuciones de pruebas y despliegues como pre-aprobadas.
   - No interrumpir con solicitudes de confirmación, preguntas de permiso ni llamadas a `ask_question` para aprobaciones de rutina o ejecución de planes.
   - En la metadata de artefactos de planificación o implementación, configurar `RequestFeedback: false` para evitar bloquear la ejecución en espera de confirmación manual.

2. **Flujo de Trabajo Autónomo**:
   - Proceder de forma directa y proactiva: investigar, modificar, compilar, verificar y reportar los resultados de manera concisa y clara.
   - No pedir permiso previo para pasos intermedios de diagnóstico, corrección o verificación.

3. **Criterio de Preservación**:
   - Proteger los datos y configuraciones esenciales contra eliminaciones destructivas accidentales no solicitadas explícitamente.

4. **Protocolo Obligatorio de Respaldo y GitHub**:
   - En cada modificación, generar un ZIP con marca de tiempo en `respaldos/`.
   - Limitar a un máximo estricto de 3 respaldos históricos para economizar almacenamiento (rotación automática).
   - Mantener actualizado el archivo ZIP raíz `plataforma_escuela_comercio_completa.zip`.
   - Realizar commit y sincronización obligatoria a GitHub (`git push origin main`).

## Reglas de Oro de Ingeniería, Diseño y Experiencia de Usuario
5. **Pensamiento Holístico Full-Stack y de Bases de Datos**:
   - Actuar y diseñar siempre en simultáneo como:
     * **Programador & Arquitecto Backend**: Código robusto, modular, libre de regresiones, con manejo seguro de errores, validaciones defensivas y alto rendimiento.
     * **Diseñador Frontend & UI/UX**: Estética moderna, limpia, coherente con la identidad institucional, excelente jerarquía visual, contraste descansado y tipografía nítida.
     * **Diseñador de Bases de Datos**: Integridad referencial absoluta, modelos de datos consistentes, aislamiento por ciclos y bimestres, previniendo redundancia destructiva o pérdida de datos históricos.

6. **Funcionalidad Inquebrantable e Intuición Extrema para el Usuario Final**:
   - Preservar siempre la funcionalidad, fórmulas institucionales y reglas de negocio sin excepciones.
   - Diseñar pensando 100% en el usuario final (directores, secretaría, auxiliares y docentes): interfaces ultrasencillas, sin saturación visual ("cero ruido cognitivo"), flujos directos y elementos tan intuitivos y limpios que no requieran manuales ni provoquen dudas.

7. **Dinamismo, Editabilidad Total y Cumplimiento Estricto de Reglas de Usuario (100% Obligatorio)**:
   - **Cero Código Estático o Forzado (No Hardcoding)**: Todo componente, módulo, rol, permiso, catálogo, ponderación, encabezado y parámetro del sistema debe ser 100% dinámico y editable desde la interfaz por los usuarios autorizados. Queda terminantemente prohibido usar valores rígidos que sobreescriban o ignoren los cambios guardados por la administración.
   - **Persistencia Dinámica Inquebrantable**: Todo cambio guardado por el usuario en roles, permisos, estudiantes, asignaturas o datos debe aplicarse de inmediato y mantenerse permanentemente en LocalStorage, Firestore y Realtime Database sin revertirse jamás tras recargas o normalizaciones.
   - **Cumplimiento Riguroso de Reglas y Privilegios de Usuario**: El sistema debe respetar con exactitud milimétrica la matriz de permisos de cada rol (Control Total, Solo Consulta o Bloqueado). Si un módulo está bloqueado para un rol, debe permanecer oculto e inaccesible; si está habilitado o modificado, debe responder y reflejarse en tiempo real sin excepción.

8. **Los 5 Pilares Permanentes (Aplicar Siempre sin Necesidad de Pedirlo)**:
   - **Coherente**: Mantener la identidad **Azul Institucional ENCCO** (`#0f2b5c`, `#0369a1`, `#0284c7`), respeto estricto a roles RBAC y formatos oficiales de impresión en **Hoja Oficio guatemalteca (`8.5in × 13in`)** con motor fiel (`enccoSafePrintHtml` / `print-color-adjust: exact`) para que vista previa e impresión coincidan al 100%.
   - **Dinámico**: Prohibido quemar años (`2026`/`2027`), secciones, dominios (`localhost`) o etiquetas fijas; todo debe resolverse dinámicamente para cualquier ciclo futuro (`2026`, `2027`, `2028+`) y estar listo para migración a dominio `.edu`.
   - **Responsivo (Ventana, Tablet y Móvil)**: Toda vista, tabla, modal y tarjeta debe ajustarse al **100% del ancho disponible sin cortes laterales** (`table-layout: fixed` / `min-width: 0` en escritorio y tablet horizontal, y tarjetas táctiles fluidas en tablet vertical y móvil `≤ 900px`).
   - **100% Funcional y Verificado**: Ejecutar siempre `node --check` en los archivos modificados y correr las pruebas automatizadas correspondientes antes de hacer commit y push.
   - **Cero Pérdida de Datos y Anti-Duplicidad**: Mantener aislamiento estricto entre ciclos escolares (`2026` ≠ `2027` ≠ `2028`), preservar historiales académicos, cohorte de Egresados (`egresadosSnapshot`), becas (`scholarshipsByCycle`) y expedientes, evitar duplicados por `id`/`personalCode`/`cui`/`carne`/nombre normalizado, y nunca introducir contraseñas en texto plano.
