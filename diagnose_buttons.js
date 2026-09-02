
const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf-8');
const html = fs.readFileSync('plataforma.html', 'utf-8');

// Mock browser environment
const storage = {};
global.localStorage = { getItem: (k) => storage[k] || null, setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } };
global.sessionStorage = { getItem: (k) => storage[k] || null, setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } };
global.window = {
    location: { pathname: '/plataforma.html', href: 'http://localhost:8000/plataforma.html', search: '', replace: () => {} },
    addEventListener: () => {},
    dispatchEvent: () => true,
    scrollTo: () => {}
};

const dom = {};
global.document = {
    addEventListener: () => {},
    getElementById: (id) => dom[id] || { innerHTML: '', textContent: '', value: 'ALL', style: {}, classList: { add: () => {}, remove: () => {} }, querySelectorAll: () => [] },
    querySelector: (sel) => null,
    querySelectorAll: (sel) => []
};

try {
    eval(js);
    console.log("[OK] app.js evaluated without syntax or parse errors.");
} catch (e) {
    console.error("[ERROR EVALUATING app.js]:", e);
    process.exit(1);
}

// Check initApp()
try {
    sessionStorage.setItem('ENCCO_AUTH_USER', JSON.stringify({ id: 'usr-admin-01', name: 'PEM. Nehemias Yalil Salguero', role: 'admin' }));
    sessionStorage.setItem('ENCCO_AUTH_ROLE', 'admin');
    initApp();
    console.log("[OK] initApp() executed successfully.");
} catch (e) {
    console.error("[ERROR IN initApp()]:", e);
}

// Find all onclick attributes in plataforma.html and check if their functions are defined
const onclickRegex = /onclick="([^"]+)"/g;
let match;
const testedHandlers = new Set();
let errorCount = 0;

while ((match = onclickRegex.exec(html)) !== null) {
    const rawAction = match[1];
    const fnName = rawAction.split('(')[0].trim();
    if (!fnName || fnName.startsWith('event') || fnName.startsWith('this') || fnName.includes('.') || testedHandlers.has(fnName)) continue;
    testedHandlers.add(fnName);

    if (typeof global[fnName] === 'function') {
        // Function exists
    } else {
        console.error(`[MISSING GLOBAL FUNCTION]: ${fnName} (from onclick="${rawAction}")`);
        errorCount++;
    }
}

console.log(`Total unique onclick functions tested: ${testedHandlers.size}`);
console.log(`Total missing functions: ${errorCount}`);
