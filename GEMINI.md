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
