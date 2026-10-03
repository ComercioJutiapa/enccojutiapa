/**
 * sidebar_manager.js - Gestor de Barra Lateral de Navegación Ergonomica
 * Escuela Nacional de Ciencias Comerciales Jutiapa 1970
 * 
 * Funcionalidades:
 * 1. Modo Mini-Sidebar Colapsable (64px) con persistencia en localStorage.
 * 2. Secciones Acordeón Plegables / Desplegables.
 * 3. Buscador Predictivo Rápido de Módulos (Quick Nav Filter).
 * 4. Micro-animaciones para Badges con alertas pendientes.
 */

(function(window) {
    'use strict';

    const SidebarManager = {
        isCollapsed: false,

        /**
         * Inicializa el estado del Sidebar desde localStorage
         */
        init() {
            try {
                const savedState = localStorage.getItem('ENCCO_SIDEBAR_COLLAPSED');
                if (savedState === 'true' && window.innerWidth > 992) {
                    this.setCollapsed(true);
                }
            } catch(e) {}

            // Escuchar cambios de tamaño de pantalla
            window.addEventListener('resize', () => {
                if (window.innerWidth <= 992 && this.isCollapsed) {
                    this.setCollapsed(false);
                }
            });

            // Auto-expandir la sección que contiene la vista activa
            this.ensureActiveSectionExpanded();

            // Configurar tooltips nativos en modo colapsado
            this.setupItemTooltips();
        },

        /**
         * Alterna el modo colapsado (64px) en computadoras
         */
        toggleCollapse() {
            this.setCollapsed(!this.isCollapsed);
        },

        /**
         * Establece el estado colapsado o expandido
         * @param {boolean} collapse 
         */
        setCollapsed(collapse) {
            this.isCollapsed = !!collapse;
            const layout = document.querySelector('.app-layout');
            const toggleIcon = document.getElementById('sidebarCollapseIcon');
            const toggleBtn = document.getElementById('sidebarCollapseBtn');

            if (layout) {
                if (this.isCollapsed) {
                    layout.classList.add('sidebar-collapsed');
                } else {
                    layout.classList.remove('sidebar-collapsed');
                }
            }

            if (toggleIcon) {
                toggleIcon.className = this.isCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left';
            }
            if (toggleBtn) {
                toggleBtn.setAttribute('title', this.isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral (más espacio)');
            }

            try {
                localStorage.setItem('ENCCO_SIDEBAR_COLLAPSED', this.isCollapsed ? 'true' : 'false');
            } catch(e) {}

            if (window.AppEvents) {
                window.AppEvents.emit('sidebar:collapseToggled', { isCollapsed: this.isCollapsed });
            }
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

        /**
         * Configura títulos y tooltips en los enlaces de navegación
         */
        setupItemTooltips() {
            document.querySelectorAll('.nav-item').forEach(item => {
                const span = item.querySelector('span');
                if (span && !item.hasAttribute('title')) {
                    item.setAttribute('title', span.textContent.trim());
                }
            });
        },

        /**
         * Filtrado predictivo de módulos en tiempo real
         * @param {string} query Texto a buscar
         */
        filterNav(query) {
            const q = (query || '').toLowerCase().trim();
            const items = document.querySelectorAll('.nav-item');
            const groups = document.querySelectorAll('.nav-section-group');
            const labels = document.querySelectorAll('.nav-section-label');
            const clearBtn = document.getElementById('sidebarNavSearchClear');

            if (clearBtn) {
                clearBtn.style.display = q ? 'block' : 'none';
            }

            if (!q) {
                // Restaurar visibilidad normal
                items.forEach(item => item.style.display = '');
                groups.forEach(g => {
                    g.style.display = '';
                });
                labels.forEach(l => l.style.display = '');
                return;
            }

            // Si hay búsqueda, expandir temporalmente todos los grupos
            groups.forEach(g => {
                g.classList.remove('collapsed');
                g.style.display = '';
            });
            labels.forEach(l => {
                l.classList.remove('collapsed');
                l.style.display = '';
            });

            // Filtrar ítems
            items.forEach(item => {
                const text = (item.textContent || '').toLowerCase();
                const view = (item.getAttribute('data-view') || '').toLowerCase();
                const match = text.includes(q) || view.includes(q);
                item.style.display = match ? 'flex' : 'none';
            });

            // Ocultar cabeceras de grupos que no tengan ningún ítem visible
            groups.forEach(g => {
                const visibleItems = g.querySelectorAll('.nav-item:not([style*="display: none"])');
                const label = document.querySelector(`[data-target-group="${g.id}"]`);
                if (visibleItems.length === 0) {
                    g.style.display = 'none';
                    if (label) label.style.display = 'none';
                } else {
                    g.style.display = '';
                    if (label) label.style.display = '';
                }
            });
        },

        /**
         * Limpia el buscador y restaura la lista de módulos
         */
        clearFilter() {
            const input = document.getElementById('sidebarNavSearchInput');
            if (input) {
                input.value = '';
                this.filterNav('');
                input.focus();
            }
        }
    };

    window.SidebarManager = SidebarManager;
    window.toggleSidebarCollapse = () => SidebarManager.toggleCollapse();
    window.filterSidebarNav = (val) => SidebarManager.filterNav(val);
    window.clearSidebarNavFilter = () => SidebarManager.clearFilter();
    window.toggleNavSection = (id) => SidebarManager.toggleSection(id);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SidebarManager.init());
    } else {
        SidebarManager.init();
    }

})(typeof window !== 'undefined' ? window : this);
