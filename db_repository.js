/**
 * db_repository.js - Capa Centralizada de Acceso a Datos (Repository Pattern) & Event Bus
 * Escuela Nacional de Ciencias Comerciales Jutiapa 1970
 * 
 * Centraliza las consultas, validaciones, caché en memoria y operaciones CRUD
 * para Estudiantes, Asistencia, Calificaciones, Disciplina y Permisos.
 * Proporciona un Bus de Eventos reactivo (AppEvents) desacoplado.
 */

(function(window) {
    'use strict';

    // =========================================================================
    // 1. BUS DE EVENTOS REACTIVO (AppEvents - Pub/Sub)
    // =========================================================================
    const _listeners = {};

    const AppEvents = {
        /**
         * Suscribirse a un evento
         * @param {string} event Nombre del evento (ej: 'student:updated', 'attendance:saved')
         * @param {Function} callback Función receptora
         * @returns {Function} Función para desuscribirse
         */
        on(event, callback) {
            if (typeof callback !== 'function') return () => {};
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(callback);
            return () => this.off(event, callback);
        },

        /**
         * Cancelar suscripción a un evento
         */
        off(event, callback) {
            if (!_listeners[event]) return;
            _listeners[event] = _listeners[event].filter(cb => cb !== callback);
        },

        /**
         * Emitir un evento a todos los suscriptores
         * @param {string} event Nombre del evento
         * @param {any} payload Datos adjuntos
         */
        emit(event, payload) {
            if (!_listeners[event]) return;
            const handlers = _listeners[event].slice();
            handlers.forEach(fn => {
                try {
                    fn(payload);
                } catch (err) {
                    console.warn(`[AppEvents] Error en listener de '${event}':`, err);
                }
            });
        }
    };

    window.AppEvents = AppEvents;

    // =========================================================================
    // 2. CAPA DE REPOSITORIO DE DATOS (DataRepository)
    // =========================================================================
    const DataRepository = {
        /**
         * Repositorio de Estudiantes
         */
        students: {
            getAll() {
                return (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            },
            getActive() {
                return this.getAll().filter(s => s.status !== 'Retirado');
            },
            getRetired() {
                return this.getAll().filter(s => s.status === 'Retirado');
            },
            getById(id) {
                if (!id) return null;
                const normalizedId = String(id).trim();
                return this.getAll().find(s => String(s.id).trim() === normalizedId || String(s.carne).trim() === normalizedId) || null;
            },
            getBySection(grade, section) {
                const normGrade = (grade || '').toLowerCase().trim();
                const normSec = (section || '').toUpperCase().trim();
                return this.getActive().filter(s => {
                    const sGrade = (s.grade || s.gradeCode || '').toLowerCase();
                    const sSec = (s.section || '').toUpperCase();
                    return sGrade.includes(normGrade) && (!normSec || sSec === normSec);
                });
            },
            search(query) {
                if (!query || typeof query !== 'string') return this.getActive();
                const q = query.toLowerCase().trim();
                return this.getAll().filter(s => {
                    const name = (s.name || '').toLowerCase();
                    const id = (s.id || '').toLowerCase();
                    const carne = (s.carne || '').toLowerCase();
                    const grade = (s.grade || '').toLowerCase();
                    return name.includes(q) || id.includes(q) || carne.includes(q) || grade.includes(q);
                });
            }
        },

        /**
         * Repositorio de Asistencia Diaria
         */
        attendance: {
            getRecords() {
                return (window.STATE && window.STATE.attendanceRecords) ? window.STATE.attendanceRecords : {};
            },
            getByStudent(studentId, month) {
                const records = this.getRecords();
                const result = {};
                Object.keys(records).forEach(key => {
                    if (records[key] && records[key][studentId]) {
                        result[key] = records[key][studentId];
                    }
                });
                return result;
            },
            isJustified(studentId, day, month) {
                const justifications = (window.STATE && window.STATE.studentPermissions) ? window.STATE.studentPermissions : [];
                return justifications.some(j => j.studentId === studentId && (j.day === day || !j.day) && (!month || j.month === month));
            }
        },

        /**
         * Repositorio de Disciplina y Actas
         */
        discipline: {
            getAll() {
                return (window.STATE && Array.isArray(window.STATE.disciplineReports)) 
                    ? window.STATE.disciplineReports 
                    : (window.STATE && Array.isArray(window.STATE.discipline) ? window.STATE.discipline : []);
            },
            getPending() {
                return this.getAll().filter(d => d.status !== 'Resuelto');
            },
            getResolved() {
                return this.getAll().filter(d => d.status === 'Resuelto');
            },
            getById(reportId) {
                return this.getAll().find(d => String(d.id) === String(reportId)) || null;
            },
            getByStudent(studentId) {
                return this.getAll().filter(d => String(d.studentId).trim() === String(studentId).trim());
            }
        },

        /**
         * Repositorio de Permisos y Justificaciones Oficiales
         */
        permissions: {
            getAll() {
                return (window.STATE && Array.isArray(window.STATE.studentPermissions)) ? window.STATE.studentPermissions : [];
            },
            getActive() {
                const nowIso = new Date().toISOString().split('T')[0];
                return this.getAll().filter(p => {
                    const start = p.startDate || p.date || '';
                    const end = p.endDate || start;
                    return (!start || start <= nowIso) && (!end || end >= nowIso);
                });
            },
            getByStudent(studentId) {
                return this.getAll().filter(p => String(p.studentId).trim() === String(studentId).trim());
            }
        },

        /**
         * Repositorio de Calificaciones
         */
        grades: {
            getCourseGrades(courseId, gradeCode, bimestre) {
                if (!window.STATE || !window.STATE.grades) return [];
                const courseGrades = window.STATE.grades[courseId] || window.STATE.grades[gradeCode] || {};
                return courseGrades;
            },
            getStudentGrade(studentId, courseId, bimestre) {
                const courseGrades = this.getCourseGrades(courseId);
                return (courseGrades && courseGrades[studentId]) ? courseGrades[studentId] : null;
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.DataRepository = DataRepository;
        window.AppEvents = AppEvents;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { DataRepository, AppEvents };
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
