/**
 * modal_manager.js - Gestor Centralizado de Ventanas Modales y Diálogos
 * Escuela Nacional de Ciencias Comerciales Jutiapa 1970
 * 
 * Estandariza la apertura, cierre, tecla ESC, clic fuera y transiciones
 * de los 30 modales del sistema sin duplicar código ni eventos de escucha.
 */

(function(window) {
    'use strict';

    const ModalManager = {
        activeModal: null,

        /**
         * Abre un modal por ID de forma estandarizada
         * @param {string} modalId ID del elemento modal
         */
        open(modalId) {
            const modalEl = document.getElementById(modalId);
            if (!modalEl) {
                console.warn(`[ModalManager] Modal con ID "${modalId}" no encontrado.`);
                return;
            }

            modalEl.classList.add('active');
            modalEl.style.display = 'flex';
            this.activeModal = modalEl;

            // Bloquear scroll del body
            document.body.style.overflow = 'hidden';

            // Disparar evento para componentes que requieran inicialización
            if (window.AppEvents) {
                window.AppEvents.emit('modal:opened', { modalId });
            }
        },

        /**
         * Cierra un modal por ID o el modal activo actual
         * @param {string} [modalId] ID opcional del modal
         */
        close(modalId) {
            const target = modalId ? document.getElementById(modalId) : this.activeModal;
            if (!target) return;

            target.classList.remove('active');
            target.style.display = 'none';

            if (this.activeModal === target) {
                this.activeModal = null;
            }

            // Restaurar scroll si no hay otros modales abiertos
            const anyOpen = document.querySelector('.modal.active, .modal-backdrop.active, .custom-modal-overlay.active');
            if (!anyOpen) {
                document.body.style.overflow = '';
            }

            if (window.AppEvents) {
                window.AppEvents.emit('modal:closed', { modalId: target.id });
            }
        },

        /**
         * Cierra todos los modales abiertos
         */
        closeAll() {
            document.querySelectorAll('.modal.active, .modal-backdrop.active, .custom-modal-overlay.active').forEach(m => {
                m.classList.remove('active');
                m.style.display = 'none';
            });
            document.body.style.overflow = '';
            this.activeModal = null;
        },

        /**
         * Inicializa escuchadores globales de accesibilidad (ESC y Clic fuera)
         */
        init() {
            // Tecla ESC para cerrar modal activo
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' || e.key === 'Esc') {
                    if (this.activeModal) {
                        this.close();
                    } else {
                        // Buscar cualquier modal que tenga clase active o display block
                        const openModal = document.querySelector('.modal.active, .modal-backdrop.active');
                        if (openModal) {
                            openModal.classList.remove('active');
                            openModal.style.display = 'none';
                            document.body.style.overflow = '';
                        }
                    }
                }
            });

            // Clic en el backdrop oscuro exterior para cerrar
            document.addEventListener('click', (e) => {
                if (e.target && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay') || e.target.classList.contains('custom-modal-overlay'))) {
                    e.target.classList.remove('active');
                    e.target.style.display = 'none';
                    document.body.style.overflow = '';
                    if (this.activeModal === e.target) this.activeModal = null;
                }
            });
        }
    };

    window.ModalManager = ModalManager;

    // Inicialización automática al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ModalManager.init());
    } else {
        ModalManager.init();
    }

})(typeof window !== 'undefined' ? window : this);
