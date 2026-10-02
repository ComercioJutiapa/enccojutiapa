/**
 * ======================================================================
 * ⚡ SERVICE WORKER OFICIAL ENCCO JUTIAPA 1970 (sw.js)
 * Modo PWA y Resiliencia Offline para Escáner y Vistas Locales
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Escuela Nacional de Ciencias Comerciales - ENCCO
 * ======================================================================
 */
const CACHE_NAME = 'encco-cache-v2026-10-perf';
const STATIC_ASSETS = [
    './',
    'index.html',
    'login.html',
    'plataforma.html',
    'bloqueo-notas.html',
    'styles.css',
    'logo.png',
    'firma_director_sello.png',
    'manifest.json',
    'qrcode.min.js',
    'xlsx.full.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Aviso de precarga de recursos estáticos:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 🔒 REGLA ESTRICTA DE SEGURIDAD: NUNCA interceptar Firebase, APIs dinámicas ni métodos que no sean GET
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.pathname.includes('/stream') ||
        event.request.method !== 'GET') {
        return;
    }

    // ⚡ 2. Fuentes y CDN externas (FontAwesome, Google Fonts): Cache-First para evitar parpadeos y acelerar carga
    const isFontOrCdn = url.hostname.includes('fonts.googleapis.com') || 
                        url.hostname.includes('fonts.gstatic.com') || 
                        url.hostname.includes('cdnjs.cloudflare.com');

    if (isFontOrCdn) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(networkResponse => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);
            })
        );
        return;
    }

    // 🚀 3. Recursos de la plataforma: Network-First con respaldo inmediato en caché
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
