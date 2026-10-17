---
trigger: always_on
description: Regla obligatoria de asistencia y permisos de ausencia - El bloqueo administrativo solo aplica estrictamente en las fechas estipuladas por Dirección o Auxiliatura; todo lo demás debe permanecer 100% desbloqueado.
---

# Regla Obligatoria Institucional: Permisos de Ausencia y Bloqueo de Asistencia

Esta es una **regla de cumplimiento estricto y mandatorio** para el sistema ENCCO Jutiapa en todos sus módulos y entornos:

---

### 1. Principio Fundamental: Bloqueo Restringido a Fechas Estipuladas
- El bloqueo de celdas de asistencia (indicador oficial `J` / `A`, candado visual, clase `att-cell-locked`, `data-readonly="true"`) **SOLO Y EXCLUSIVAMENTE** aplica dentro de las fechas oficiales de inicio (`startDate`) y finalización (`endDate`) autorizadas en `STATE.studentPermissions`.
- **Desbloqueo Mandatorio:** Cualquier día o mes fuera del rango estipulado (tanto antes de `startDate` como después de `endDate`) **DEBE PERMANECER 100% DESBLOQUEADO, LIBRE Y EDITABLE** para los catedráticos y docentes regulares.
- **Caso Arévalo Morán (Katerin Mishel):** Sus fechas estipuladas oficiales son única y exclusivamente el **25 y 26 de septiembre de 2026**. Octubre, noviembre y los días del 1 de enero al 24 de septiembre jamás deben bloquearse ni marcarse con justificaciones automáticas.

---

### 2. Prohibición Absoluta de Permisos Sintéticos Anuales
- Queda **estrictamente prohibido** que rutinas de inicialización, semillas (`seedDatabase`, `ensureSireOfficialStudents`) o recargas inyecten o fuercen rangos anuales completos (ej: `2026-01-01` al `2026-11-30`) sobre permisos específicos.
- Las fechas definidas por la Dirección General y registradas en Firebase Cloud son la **única fuente autoritativa de verdad**. Nunca deben sobreescribirse con valores por defecto extendidos.

---

### 3. Validación Requerida para Bloqueo Administrativo (`isOfficialJustified`)
- Ninguna celda de asistencia (ni en cursos individuales ni en el `Control General`) puede considerarse justificación oficial bloqueada (`isOfficialJustified`) sin la existencia comprobada de un objeto `permMeta` válido y activo en `STATE.studentPermissions` para ese estudiante y fecha específica (`targetDateStr >= startDate && targetDateStr <= endDate`).
- Una `'J'` colocada directamente por un docente o un registro huérfano en `GENERAL` sin permiso oficial asociado es **100% editable** y no debe presentar candado ni atributos de solo lectura.

---

### 4. Saneamiento Automático de Registros Huérfanos
- Siempre que se modifiquen, trasladen o reduzcan las fechas de un permiso en `saveStudentPermissionForm`, o se inicialice el sistema, se debe ejecutar un barrido universal (`cleanupOrphanStudentPermissionsFromAttendance` y `removeStudentPermissionDatesFromAttendance`) sobre todas las asignaturas y claves de `attendanceRecords` y `attendancePermissionsMeta`.
- Cualquier marca `'J'`, `'A'` o metadato que haya quedado fuera de las fechas estipuladas debe purgarse de inmediato sin esperar intervención manual.
