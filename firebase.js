const fs = require('fs');
const admin = require('firebase-admin');

// Cek apakah file sudah ada, kalau belum generate dari ENV
const filePath = './serviceAccountKey.json';

if (!fs.existsSync(filePath)) {
    const base64 = process.env.SERVICE_ACCOUNT_BASE64;

    if (!base64) {
        console.error('❌ SERVICE_ACCOUNT_BASE64 tidak tersedia di environment variable.');
        process.exit(1);
    }

    const jsonContent = Buffer.from(base64, 'base64').toString('utf-8');
    fs.writeFileSync(filePath, jsonContent);
}

const serviceAccount = require(filePath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = db;
