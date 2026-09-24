/**
 * ======================================================================
 * ⚡ SERVICE WORKER OFICIAL ENCCO JUTIAPA 1970 (sw.js)
 * Modo PWA y Resiliencia Offline para Escáner y Vistas Locales
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Escuela Nacional de Ciencias Comerciales - ENCCO
 * ======================================================================
 */
const CACHE_NAME = 'encco-cache-v2026-09';
const STATIC_ASSETS = [
    './',
    'index.html',
    'plataforma.html',
    'styles.css',
    'logo.png',
    'manifest.json',
    'qrcode.min.js'
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

    // 🔒 REGLA ESTRICTA: NUNCA cachear peticiones de Firebase, APIs o transacciones dinámicas
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('firebaseapp.com') ||
        url.pathname.includes('/stream') ||
        event.request.method !== 'GET') {
        return;
    }

    // Estrategia Network-First con recuperación en Cache para disponibilidad sin conexión
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
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
