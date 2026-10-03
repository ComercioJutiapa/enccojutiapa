// background.js - Service Worker de ENCCO Conector SIRE
chrome.runtime.onInstalled.addListener(() => {
    console.log("🏛️ Extensión ENCCO - SIRE MINEDUC instalada con éxito.");
});

// Manejo de mensajes entre content_sire.js, popup.js y content_encco.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Guardar estudiante extraído en storage
    if (request.action === 'SAVE_SIRE_STUDENT') {
        chrome.storage.local.set({ lastSireStudent: request.data }, () => {
            sendResponse({ success: true, message: 'Estudiante guardado en buffer temporal' });
        });
        return true;
    }

    // 2. Enviar estudiante desde SIRE hacia la plataforma ENCCO
    if (request.action === 'SEND_TO_ENCCO') {
        const studentData = request.data;
        chrome.tabs.query({}, (tabs) => {
            const enccoTab = tabs.find(t => 
                (t.url && (t.url.includes('comerciojutiapa.github.io') || t.url.includes('localhost') || t.url.includes('127.0.0.1') || t.url.includes('plataforma.html')))
            );

            if (enccoTab) {
                chrome.tabs.update(enccoTab.id, { active: true });
                chrome.tabs.sendMessage(enccoTab.id, {
                    action: 'AUTOFILL_ENROLLMENT',
                    data: studentData
                }, (response) => {
                    sendResponse(response || { success: true, note: 'Datos enviados a pestaña existente' });
                });
            } else {
                chrome.storage.local.set({ pendingAutofill: studentData }, () => {
                    chrome.tabs.create({ url: 'https://comerciojutiapa.github.io/enccojutiapa/plataforma.html' }, (newTab) => {
                        sendResponse({ success: true, note: 'Abriendo plataforma ENCCO con los datos cargados' });
                    });
                });
            }
        });
        return true;
    }

    // 3. OPCIÓN 3: Enviar estudiante recién inscrito en ENCCO hacia el portal SIRE
    if (request.action === 'ENROLL_TO_SIRE') {
        const studentData = request.data;
        chrome.tabs.query({}, (tabs) => {
            const sireTab = tabs.find(t => 
                (t.url && (t.url.includes('sire.mineduc.gob.gt') || t.url.includes('simulador_inscripcion_asistida_sire')))
            );

            if (sireTab) {
                chrome.tabs.update(sireTab.id, { active: true });
                chrome.tabs.sendMessage(sireTab.id, {
                    action: 'AUTOFILL_SIRE_ENROLLMENT',
                    data: studentData
                }, (response) => {
                    sendResponse(response || { success: true, note: 'Datos transferidos al portal SIRE' });
                });
            } else {
                // Guardar como pendiente y abrir SIRE
                chrome.storage.local.set({ pendingSireEnrollment: studentData }, () => {
                    chrome.tabs.create({ url: 'https://sire.mineduc.gob.gt/' }, (newTab) => {
                        sendResponse({ success: true, note: 'Abriendo SIRE para completar matrícula asistida' });
                    });
                });
            }
        });
        return true;
    }
});
