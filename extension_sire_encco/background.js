// background.js - Service Worker de ENCCO Conector SIRE
chrome.runtime.onInstalled.addListener(() => {
    console.log("🏛️ Extensión ENCCO - SIRE MINEDUC instalada con éxito.");
});

// Manejo de mensajes entre content_sire.js, popup.js y content_encco.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SAVE_SIRE_STUDENT') {
        // Guardar el estudiante extraído en storage local de la extensión
        chrome.storage.local.set({ lastSireStudent: request.data }, () => {
            sendResponse({ success: true, message: 'Estudiante guardado en buffer temporal' });
        });
        return true;
    }

    if (request.action === 'SEND_TO_ENCCO') {
        const studentData = request.data;
        // Buscar pestaña abierta de la plataforma ENCCO
        chrome.tabs.query({}, (tabs) => {
            const enccoTab = tabs.find(t => 
                (t.url && (t.url.includes('comerciojutiapa.github.io') || t.url.includes('localhost') || t.url.includes('127.0.0.1')))
            );

            if (enccoTab) {
                // Enfocar pestaña y enviar datos
                chrome.tabs.update(enccoTab.id, { active: true });
                chrome.tabs.sendMessage(enccoTab.id, {
                    action: 'AUTOFILL_ENROLLMENT',
                    data: studentData
                }, (response) => {
                    sendResponse(response || { success: true, note: 'Datos enviados a pestaña existente' });
                });
            } else {
                // Si no está abierta, abrir la plataforma y pasar datos por storage
                chrome.storage.local.set({ pendingAutofill: studentData }, () => {
                    chrome.tabs.create({ url: 'https://comerciojutiapa.github.io/enccojutiapa/plataforma.html' }, (newTab) => {
                        sendResponse({ success: true, note: 'Abriendo plataforma ENCCO con los datos cargados' });
                    });
                });
            }
        });
        return true;
    }
});
