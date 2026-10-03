/**
 * sidebar_manager.js - Gestor de Barra Lateral de Navegación
 * Escuela Nacional de Ciencias Comerciales Jutiapa 1970
 * 
 * Funcionalidades activas:
 * 1. Secciones Acordeón Plegables / Desplegables (Grupos de Navegación).
 * 2. Auto-expansión inteligente de la sección de la ruta activa.
 * 3. Micro-animaciones para Badges institucionales.
 */

(function(window) {
    'use strict';

    const SidebarManager = {
        /**
         * Inicializa el estado del Sidebar
         */
        init() {
            // Asegurar que no quede ningún estado colapsado previo en layout o localStorage
            try {
                localStorage.removeItem('ENCCO_SIDEBAR_COLLAPSED');
                const layout = document.querySelector('.app-layout');
                if (layout) {
                    layout.classList.remove('sidebar-collapsed');
                }
            } catch(e) {}

            // Auto-expandir la sección que contiene la vista activa
            this.ensureActiveSectionExpanded();

            // Restaurar estado guardado de grupos de acordeón si existe
            this.restoreSectionStates();
        },

        /**
         * Alterna una sección plegable (Acordeón)
         * @param {string} groupId ID del grupo (ej: 'admin', 'academic', 'teachers', 'reports')
         */
        toggleSection(groupId) {
            const groupEl = document.getElementById(`navGroup-${groupId}`);
            const labelEl = document.getElementById(`navLabel-${groupId}`);
            if (!groupEl) return;

            const isCurrentlyCollapsed = groupEl.classList.contains('collapsed');
            if (isCurrentlyCollapsed) {
                groupEl.classList.remove('collapsed');
                if (labelEl) labelEl.classList.remove('collapsed');
            } else {
                groupEl.classList.add('collapsed');
                if (labelEl) labelEl.classList.add('collapsed');
            }

            try {
                localStorage.setItem(`ENCCO_NAV_SECTION_${groupId}`, isCurrentlyCollapsed ? 'expanded' : 'collapsed');
            } catch(e) {}
        },

        /**
         * Restaura el estado guardado de los acordeones
         */
        restoreSectionStates() {
            ['admin', 'academic', 'teachers', 'reports'].forEach(id => {
                try {
                    const state = localStorage.getItem(`ENCCO_NAV_SECTION_${id}`);
                    const groupEl = document.getElementById(`navGroup-${id}`);
                    const labelEl = document.getElementById(`navLabel-${id}`);
                    if (state === 'collapsed' && groupEl) {
                        groupEl.classList.add('collapsed');
                        if (labelEl) labelEl.classList.add('collapsed');
                    }
                } catch(e) {}
            });
        },

        /**
         * Garantiza que la sección que contiene la vista actual esté abierta
         */
        ensureActiveSectionExpanded() {
            const activeItem = document.querySelector('.nav-item.active');
            if (activeItem) {
                const parentGroup = activeItem.closest('.nav-section-group');
                if (parentGroup && parentGroup.classList.contains('collapsed')) {
                    parentGroup.classList.remove('collapsed');
                    const label = document.querySelector(`[data-target-group="${parentGroup.id}"]`);
                    if (label) label.classList.remove('collapsed');
                }
            }
        },

        // Métodos de compatibilidad retrocompatible seguros (No-op)
        toggleCollapse() {
            // Removido por requerimiento del usuario
        },
        filterNav() {
            // Removido por requerimiento del usuario
        },
        clearFilter() {
            // Removido por requerimiento del usuario
        }
    };

    window.SidebarManager = SidebarManager;
    window.toggleSidebarCollapse = () => SidebarManager.toggleCollapse();
    window.filterSidebarNav = () => SidebarManager.filterNav();
    window.clearSidebarNavFilter = () => SidebarManager.clearFilter();
    window.toggleNavSection = (id) => SidebarManager.toggleSection(id);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SidebarManager.init());
    } else {
        SidebarManager.init();
    }

})(typeof window !== 'undefined' ? window : this);
