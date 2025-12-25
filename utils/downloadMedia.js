// utils/downloadMedia.js
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

async function downloadMedia(url, fileName) {
    try {
        const mediaFolder = path.join(__dirname, '../media');
        if (!fs.existsSync(mediaFolder)) {
            fs.mkdirSync(mediaFolder, { recursive: true });
        }
        
        const filePath = path.join(mediaFolder, fileName);
        
        // Check if file already exists
        if (fs.existsSync(filePath)) {
            return filePath;
        }
        
        console.log(`📥 Downloading media: ${url}`);
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        console.log(`✅ Media downloaded: ${filePath}`);
        return filePath;
        
    } catch (error) {
        console.error('Error downloading media:', error);
        return null;
    }
}

module.exports = { downloadMedia };