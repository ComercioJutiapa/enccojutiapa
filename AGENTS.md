# Antigravity Rules - Modo Silencioso / Opción 4 (Always Allow)

1. **Auto-Aprobación**: Todos los comandos, ediciones y herramientas se consideran aprobados por defecto (Opción 4 / Always Allow).
2. **No Bloquear**: No solicitar confirmaciones interactivas ni pausar el trabajo para pedir permiso.
3. **Flujo Directo**: Investigar, codificar, probar y entregar el resultado final de manera autónoma.
4. **Respaldos Obligatorios**: En cada modificación relevante, ejecutar el protocolo de seguridad para:
   - Crear copia de seguridad ZIP con marca de tiempo en `respaldos/`.
   - Mantener un máximo estricto de 3 respaldos históricos (rotación automática para ahorrar espacio en disco).
   - Actualizar el ZIP principal `plataforma_escuela_comercio_completa.zip`.
   - Confirmar en Git y subir inmediatamente a GitHub (`git push origin main`).
5. **Integridad Absoluta de Datos**: Proteger siempre los datos ingresados y editados por el usuario (usuarios, notas, cursos y asignaciones).
