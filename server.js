/**
 * ======================================================================
 * SERVIDOR WEB SEGURO EN NODE.JS - ENCCO JUTIAPA 1970
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Nehemias Salguero. Jutiapa, Guatemala.
 * Todos los derechos reservados. All Rights Reserved.
 *
 * Desarrollado por: Nehemias Salguero
 * Ubicación: Jutiapa, Guatemala
 * ======================================================================
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { verifySireRoleMiddleware, handleSireAuth, handleSireDisconnect, handleSireSync, calculateSireAverages } = require('./sire-middleware');

const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.csv': 'text/csv; charset=utf-8',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    req.query = parsedUrl.query || {};
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Rutas de API SIRE
    if (pathname === '/api/sire/auth' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { req.body = JSON.parse(body); } catch(e) { req.body = {}; }
            handleSireAuth(req, res);
        });
        return;
    }

    if (pathname === '/api/sire/disconnect' && req.method === 'POST') {
        return handleSireDisconnect(req, res);
    }

    if (pathname === '/api/sire/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { req.body = JSON.parse(body); } catch(e) { req.body = {}; }
            verifySireRoleMiddleware(req, res, () => {
                handleSireSync(req, res);
            });
        });
        return;
    }

    // Protección de datos-sire.html mediante middleware RBAC
    if (pathname === '/datos-sire.html') {
        // Ejecutar middleware RBAC
        verifySireRoleMiddleware(req, res, () => {
            serveStaticFile(pathname, res);
        });
        return;
    }

    // Servir archivos estáticos generales
    serveStaticFile(pathname, res);
});

function serveStaticFile(pathname, res) {
    const filePath = path.join(PUBLIC_DIR, pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
        });
        res.end(data);
    });
}

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🚀 Servidor ENCCO ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = server;
