// supabase-session.js - For Main Bot (using public folder method)
const fs = require('fs-extra');
const path = require('path');

const SESSION_GENERATOR_URL = process.env.SESSION_GENERATOR_URL || "https://tracle-sessions.onrender.com/";
// Download session from public folder
async function downloadSessionFromGenerator(sessionId) {
    try {
        console.log(`📥 Downloading session ${sessionId} from public folder...`);
        
       const publicUrl = `${SESSION_GENERATOR_URL}/sessions/${sessionId}/creds.json`;
        console.log(`🔗 Trying URL: ${publicUrl}`);
        
        const response = await fetch(publicUrl);
        
        if (!response.ok) {
            console.log(`❌ Not found in public folder (HTTP ${response.status})`);
            return false;
        }
        
       const arrayBuffer = await response.arrayBuffer();
const credsBuffer = Buffer.from(arrayBuffer);
        
        const sessionPath = path.join(__dirname, 'sessions', sessionId);
        await fs.ensureDir(sessionPath);
        const credsPath = path.join(sessionPath, 'creds.json');
        
        await fs.writeFile(credsPath, credsBuffer);
        
        console.log(`✅ Session ${sessionId} downloaded and saved locally!`);
        return true;
        
    } catch (error) {
        console.error(`❌ Download failed:`, error.message);
        return false;
    }
}

// Check if session exists (by trying to download it)
async function checkSessionInGenerator(sessionId) {
    try {
        const publicUrl = `${SESSION_GENERATOR_URL}/sessions/${sessionId}/creds.json`;
        const response = await fetch(publicUrl, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

module.exports = {
    downloadSessionFromGenerator,
    checkSessionInGenerator
};