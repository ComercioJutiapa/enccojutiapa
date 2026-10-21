/**
 * ============================================================================
 * MOTOR DINÁMICO DE PALETAS DE COLORES (THEME ENGINE) - SAAS MULTI-COLEGIO
 * ============================================================================
 * Permite a cada institución personalizar los colores primarios, degradados,
 * acentos y contrastes de su plataforma y reportes oficiales.
 */

const THEME_PALETTES = {
    'emerald': {
        id: 'emerald',
        name: 'Verde Esmeralda (Clásico Institucional)',
        primary: '#0f766e',
        primaryDark: '#115e59',
        primaryLight: '#14b8a6',
        primaryBg: '#f0fdfa',
        primaryBorder: '#99f6e4',
        accent: '#0d9488',
        gradient: 'linear-gradient(135deg, #0f766e, #0d9488)',
        headerBg: 'linear-gradient(135deg, #0f766e, #115e59)',
        textOnPrimary: '#ffffff'
    },
    'royal-blue': {
        id: 'royal-blue',
        name: 'Azul Real Académico',
        primary: '#1d4ed8',
        primaryDark: '#1e40af',
        primaryLight: '#3b82f6',
        primaryBg: '#eff6ff',
        primaryBorder: '#bfdbfe',
        accent: '#2563eb',
        gradient: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
        headerBg: 'linear-gradient(135deg, #1e40af, #1d4ed8)',
        textOnPrimary: '#ffffff'
    },
    'navy': {
        id: 'navy',
        name: 'Azul Marino & Oro (Colegio Tradicional)',
        primary: '#0f172a',
        primaryDark: '#020617',
        primaryLight: '#1e293b',
        primaryBg: '#f8fafc',
        primaryBorder: '#cbd5e1',
        accent: '#d97706',
        gradient: 'linear-gradient(135deg, #0f172a, #1e293b)',
        headerBg: 'linear-gradient(135deg, #020617, #0f172a)',
        textOnPrimary: '#ffffff'
    },
    'burgundy': {
        id: 'burgundy',
        name: 'Rojo Borgoña / Vino Escolar',
        primary: '#881337',
        primaryDark: '#4c0519',
        primaryLight: '#be123c',
        primaryBg: '#fff1f2',
        primaryBorder: '#fecdd3',
        accent: '#9f1239',
        gradient: 'linear-gradient(135deg, #881337, #9f1239)',
        headerBg: 'linear-gradient(135deg, #4c0519, #881337)',
        textOnPrimary: '#ffffff'
    },
    'purple': {
        id: 'purple',
        name: 'Morado / Púrpura Universitario',
        primary: '#6b21a8',
        primaryDark: '#581c87',
        primaryLight: '#9333ea',
        primaryBg: '#faf5ff',
        primaryBorder: '#e9d5ff',
        accent: '#7e22ce',
        gradient: 'linear-gradient(135deg, #6b21a8, #7e22ce)',
        headerBg: 'linear-gradient(135deg, #581c87, #6b21a8)',
        textOnPrimary: '#ffffff'
    },
    'amber': {
        id: 'amber',
        name: 'Ámbar & Café Ejecutivo',
        primary: '#b45309',
        primaryDark: '#78350f',
        primaryLight: '#d97706',
        primaryBg: '#fffbeb',
        primaryBorder: '#fde68a',
        accent: '#92400e',
        gradient: 'linear-gradient(135deg, #b45309, #d97706)',
        headerBg: 'linear-gradient(135deg, #78350f, #b45309)',
        textOnPrimary: '#ffffff'
    }
};

class ThemeManager {
    constructor() {
        this.currentThemeId = 'emerald';
        this.storageKey = 'saas_school_theme_config';
    }

    getThemes() {
        return Object.values(THEME_PALETTES);
    }

    getTheme(themeId) {
        return THEME_PALETTES[themeId] || THEME_PALETTES['emerald'];
    }

    applyTheme(themeId, save = true) {
        const theme = this.getTheme(themeId);
        this.currentThemeId = theme.id;

        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--primary-dark', theme.primaryDark);
        root.style.setProperty('--primary-light', theme.primaryLight);
        root.style.setProperty('--primary-bg', theme.primaryBg);
        root.style.setProperty('--primary-border', theme.primaryBorder);
        root.style.setProperty('--primary-accent', theme.accent);
        root.style.setProperty('--primary-gradient', theme.gradient);
        root.style.setProperty('--primary-header-bg', theme.headerBg);
        root.style.setProperty('--text-on-primary', theme.textOnPrimary);

        if (save) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(theme));
            } catch(e) {}
        }

        // Notificar cambio de tema para vistas y reportes reactivos
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
        return theme;
    }

    loadSavedTheme() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.id) {
                    return this.applyTheme(parsed.id, false);
                }
            }
        } catch(e) {}
        return this.applyTheme('emerald', false);
    }
}

if (typeof window !== 'undefined') {
    window.THEME_PALETTES = THEME_PALETTES;
    window.ThemeManager = ThemeManager;
    window.themeManager = new ThemeManager();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { THEME_PALETTES, ThemeManager };
}
