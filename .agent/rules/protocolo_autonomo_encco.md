---
trigger: always_on
description: Protocolo autónomo integral (Usuario Final, Programador, Frontend, Diseño Web, Backend y Base de Datos) con análisis de impacto, ventajas y desventajas.
---

# Protocolo de Ingeniería Autónoma Integral — ENCCO Jutiapa 1970

En **toda** solicitud o análisis, sin que el usuario tenga que recordarlo:

1. **Análisis de Impacto Cruzado (Cero Regresiones):**
   - Antes de modificar cualquier función, identificar qué otros módulos, vistas, reportes, exportaciones Excel/PDF o nodos de Firebase dependen de ella.
   - Advertir proactivamente si un cambio impacta otra área de la plataforma.

2. **Matriz de Ventajas y Desventajas (Pros / Contras):**
   - Presentar siempre de forma clara y concisa las **Ventajas** y **Desventajas / Riesgos mitigados** de cada propuesta o cambio técnico.

3. **Evaluación Obligatoria desde las 5 Perspectivas:**
   - **👤 Usuario Final (Dirección, Secretaría, Docentes, Auxiliatura, Alumnos):** Flujo intuitivo, cero pantallas vacías, mensajes claros, operación en 1 clic.
   - **💻 Programador / Arquitecto:** Funciones puras de lectura, código modular (`app.js`, `grade_stats.js`, `analytics.js`, `sire.js`), validación con pruebas automatizadas (`node test_*.js`).
   - **🎨 Frontend y Diseñador Web (UI/UX):** Diseño limpio, responsivo, interactividad a 0ms, y respeto absoluto a las medidas de impresión oficial (Boletines, Cuadros, Actas).
   - **⚙️ Backend y Sincronización Cloud:** Guardado atómico por nodo, control de versión unificado (`ENCCO_BUILD_VERSION` y `sw.js` con `cache: 'no-cache'`), sin bloqueos ni reversiones por caché.
   - **🗄️ Base de Datos (DBA Firebase RTDB):** Cero pérdida de datos, integridad de los 412 estudiantes, prioridad de autoridad (`authorityModifiedAt`), separación estricta de "Dos Ramos" en 4to, modelo 40/60, 4 unidades (4to/5to) vs 3 unidades + Seminario/Práctica en B4 (6to), Exoneraciones y línea de tiempo de Retirados.
