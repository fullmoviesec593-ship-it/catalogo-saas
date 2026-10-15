const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Limpiamos cualquier intento anterior de conexión que esté causando el choque
code = code.replace(/const dbFirestore = process\.env\.FIREBASE_KEYS \? new Firestore\(\{.*?\}\) : null;/g, '');
code = code.replace(/const dbFirestore = new Firestore\(\{.*?\}\);/g, '');

// 2. Insertamos la conexión blindada a prueba de caídas
const safeConnection = `
let dbFirestore = null;
try {
    if (process.env.FIREBASE_KEYS) {
        let rawKeys = process.env.FIREBASE_KEYS;
        const creds = JSON.parse(rawKeys);
        if (creds.private_key) {
            creds.private_key = creds.private_key.replace(/\\\\n/g, '\\n');
        }
        dbFirestore = new Firestore({ projectId: creds.project_id || 'catalogofullmovies', credentials: creds });
        console.log('✅ Bóveda de Firebase abierta con éxito');
    } else {
        console.log('⚠️ No se detectó la variable FIREBASE_KEYS en Render');
    }
} catch (error) {
    console.error('❌ Error de formato en la llave de Firebase:', error.message);
}
`;

if (!code.includes('Bóveda de Firebase abierta con éxito')) {
    code = code.replace(/(const { Firestore } = require\('@google-cloud\/firestore'\);)/, "$1\n" + safeConnection);
    fs.writeFileSync('server.js', code);
    console.log('✅ Blindaje de servidor aplicado');
}
