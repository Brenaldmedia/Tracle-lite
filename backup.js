// FILE: backup.js - UPDATED with Complete Data Backup/Restore
const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');

class BackupManager {
    constructor() {
        this.b2 = new B2({
            applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
            applicationKey: process.env.B2_APPLICATION_KEY
        });
        this.b2Authorized = false;
        this.bucketName = process.env.B2_BUCKET_NAME;
    }

    // Initialize B2 connection
    async initializeB2() {
        try {
            if (!this.b2Authorized) {
                await this.b2.authorize();
                this.b2Authorized = true;
                console.log('✅ Backblaze B2 authorized successfully');
            }
        } catch (error) {
            console.error('❌ Failed to authorize Backblaze B2:', error.message);
            throw error;
        }
    }

    // Check if B2 credentials are configured
    isConfigured() {
        return !!(process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET_NAME);
    }

    // 🔄 Check if session exists in Backblaze B2
    async checkSessionOnB2(sessionId) {
        try {
            await this.initializeB2();
            
            const fileName = `sessions/${sessionId}/creds.json`;
            
            try {
                const { data } = await this.b2.getFileInfo({
                    bucketName: this.bucketName,
                    fileName: fileName
                });
                
                const sessionExists = !!data;
                console.log(`📊 Session ${sessionId} exists on Backblaze B2: ${sessionExists}`);
                return { sessionExists };
            } catch (error) {
                if (error.response?.status === 400 || error.response?.status === 404) {
                    return { sessionExists: false };
                }
                throw error;
            }
        } catch (error) {
            console.error(`❌ Error checking session ${sessionId} on Backblaze B2:`, error.message);
            return { sessionExists: false, error: error.message };
        }
    }

    // 💾 Backup creds.json to Backblaze B2
    async backupCredsToB2(sessionId) {
        try {
            await this.initializeB2();
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            const credsPath = path.join(sessionDir, "creds.json");

            if (!fs.existsSync(credsPath)) {
                console.log(`⚠️ No creds.json found for session ${sessionId}, skipping backup`);
                return;
            }

            const fileContent = fs.readFileSync(credsPath);
            const fileName = `sessions/${sessionId}/creds.json`;

            // Get upload URL
            const { data: uploadUrlData } = await this.b2.getUploadUrl({
                bucketId: await this.getBucketId()
            });

            // Upload file
            const { data } = await this.b2.uploadFile({
                uploadUrl: uploadUrlData.uploadUrl,
                uploadAuthToken: uploadUrlData.authorizationToken,
                fileName: fileName,
                data: fileContent,
                contentLength: fileContent.length,
                mime: 'application/json'
            });

            console.log(`✅ Backup successful for ${sessionId} to Backblaze B2`);
            return { success: true, fileId: data.fileId };

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId} to Backblaze B2:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore creds.json from Backblaze B2
    async restoreCredsFromB2(sessionId) {
        try {
            await this.initializeB2();
            
            const fileName = `sessions/${sessionId}/creds.json`;
            
            const { data } = await this.b2.downloadFileByName({
                bucketName: this.bucketName,
                fileName: fileName,
                responseType: 'arraybuffer'
            });

            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            fs.writeFileSync(path.join(sessionDir, "creds.json"), Buffer.from(data));
            
            console.log(`✅ Restored creds.json for ${sessionId} from Backblaze B2`);
            return { success: true };

        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 404) {
                console.log(`⚠️ No creds.json found on Backblaze B2 for ${sessionId}`);
                return { success: false, error: 'File not found on B2' };
            } else {
                console.error(`❌ Restore failed for ${sessionId}:`, error.message);
                return { success: false, error: error.message };
            }
        }
    }

    // 🔄 Restore all sessions from Backblaze B2 (on startup)
    async restoreAllSessionsFromB2() {
        try {
            await this.initializeB2();
            console.log("🔄 Fetching sessions list from Backblaze B2...");

            let nextFileName = null;
            let hasMore = true;
            const sessions = [];

            while (hasMore) {
                const { data } = await this.b2.listFileNames({
                    bucketId: await this.getBucketId(),
                    prefix: 'sessions/',
                    startFileName: nextFileName,
                    maxFileCount: 1000
                });

                sessions.push(...data.files);
                hasMore = data.nextFileName !== null;
                nextFileName = data.nextFileName;
            }

            let restoredCount = 0;
            for (const file of sessions) {
                if (file.fileName.includes('/creds.json')) {
                    const sessionId = file.fileName.split('/')[1];
                    const result = await this.restoreCredsFromB2(sessionId);
                    if (result.success) {
                        restoredCount++;
                    }
                }
            }
            
            console.log(`✅ ${restoredCount} sessions restored from Backblaze B2`);
            return { success: true, restoredCount: restoredCount };
            
        } catch (error) {
            console.error("❌ Failed to restore sessions from Backblaze B2:", error.message);
            return { success: false, error: error.message };
        }
    }

    // ❌ Delete session from Backblaze B2 + local folder
    async deleteSessionFromB2(sessionId) {
        try {
            await this.initializeB2();
            
            const fileName = `sessions/${sessionId}/creds.json`;
            
            // Delete from Backblaze B2
            try {
                await this.b2.deleteFileVersion({
                    fileName: fileName,
                    fileId: await this.getFileId(fileName)
                });
                console.log(`✅ Successfully deleted session ${sessionId} from Backblaze B2`);
            } catch (error) {
                if (error.response?.status !== 400 && error.response?.status !== 404) {
                    console.log(`⚠️ No creds.json found on Backblaze B2 for ${sessionId}:`, error.message);
                }
            }

            // Delete local session directory
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`🧹 Deleted local session folder for ${sessionId}`);
            }

            return { success: true };
        } catch (error) {
            console.error(`❌ Error deleting session ${sessionId} from Backblaze B2:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Helper function to get bucket ID
    async getBucketId() {
        try {
            const { data } = await this.b2.listBuckets();
            const bucket = data.buckets.find(b => b.bucketName === this.bucketName);
            if (!bucket) {
                throw new Error(`Bucket ${this.bucketName} not found`);
            }
            return bucket.bucketId;
        } catch (error) {
            console.error('Error getting bucket ID:', error);
            throw error;
        }
    }

    // Helper function to get file ID
    async getFileId(fileName) {
        try {
            const { data } = await this.b2.listFileNames({
                bucketId: await this.getBucketId(),
                prefix: fileName,
                maxFileCount: 1
            });
            
            if (data.files.length > 0) {
                return data.files[0].fileId;
            }
            throw new Error('File not found');
        } catch (error) {
            console.error('Error getting file ID:', error);
            throw error;
        }
    }

    // 🔄 Auto backup all sessions
    async backupAllSessions() {
        try {
            const sessionsDir = path.join(__dirname, "sessions");
            if (fs.existsSync(sessionsDir)) {
                const sessions = fs.readdirSync(sessionsDir);
                console.log(`🔄 Backing up ${sessions.length} sessions to Backblaze B2...`);
                
                let backedUpCount = 0;
                for (const sessionId of sessions) {
                    const result = await this.backupCredsToB2(sessionId);
                    if (result && result.success) {
                        backedUpCount++;
                    }
                }
                console.log(`✅ ${backedUpCount} sessions backed up to Backblaze B2 successfully`);
                return { success: true, backedUp: backedUpCount };
            } else {
                console.log("⚠️ No sessions found to back up");
                return { success: false, error: 'No sessions directory found' };
            }
        } catch (err) {
            console.error("❌ Auto-backup error:", err.message);
            return { success: false, error: err.message };
        }
    }

    // 💾 Backup full session to Backblaze B2 (creds.json + settings.json)
    async backupSessionToB2(sessionId) {
        try {
            await this.initializeB2();
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            if (!fs.existsSync(sessionDir)) {
                console.log(`⚠️ No session folder found for ${sessionId}, skipping backup`);
                return { success: false, error: 'No session folder found' };
            }

            let backedUpFiles = 0;

            // Backup creds.json
            const credsPath = path.join(sessionDir, "creds.json");
            if (fs.existsSync(credsPath)) {
                const fileContent = fs.readFileSync(credsPath);
                const fileName = `sessions/${sessionId}/creds.json`;

                const { data: uploadUrlData } = await this.b2.getUploadUrl({
                    bucketId: await this.getBucketId()
                });

                await this.b2.uploadFile({
                    uploadUrl: uploadUrlData.uploadUrl,
                    uploadAuthToken: uploadUrlData.authorizationToken,
                    fileName: fileName,
                    data: fileContent,
                    contentLength: fileContent.length,
                    mime: 'application/json'
                });
                console.log(`✅ Backed up creds.json for ${sessionId}`);
                backedUpFiles++;
            }

            // Backup settings.json (if exists)
            const settingsPath = path.join(sessionDir, "settings.json");
            if (fs.existsSync(settingsPath)) {
                const fileContent = fs.readFileSync(settingsPath);
                const fileName = `sessions/${sessionId}/settings.json`;

                const { data: uploadUrlData } = await this.b2.getUploadUrl({
                    bucketId: await this.getBucketId()
                });

                await this.b2.uploadFile({
                    uploadUrl: uploadUrlData.uploadUrl,
                    uploadAuthToken: uploadUrlData.authorizationToken,
                    fileName: fileName,
                    data: fileContent,
                    contentLength: fileContent.length,
                    mime: 'application/json'
                });
                console.log(`✅ Backed up settings.json for ${sessionId}`);
                backedUpFiles++;
            }

            console.log(`✅ Complete backup successful for ${sessionId} to Backblaze B2 (${backedUpFiles} files)`);
            return { success: true, backedUpFiles };

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId} to Backblaze B2:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore full session from Backblaze B2 (creds.json + settings.json)
    async restoreSessionFromB2(sessionId) {
        try {
            await this.initializeB2();
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            // Create session directory if it doesn't exist
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            let restoredFiles = 0;

            // Restore creds.json
            const credsFileName = `sessions/${sessionId}/creds.json`;
            try {
                const { data } = await this.b2.downloadFileByName({
                    bucketName: this.bucketName,
                    fileName: credsFileName,
                    responseType: 'arraybuffer'
                });

                fs.writeFileSync(path.join(sessionDir, "creds.json"), Buffer.from(data));
                console.log(`✅ Restored creds.json for ${sessionId} from Backblaze B2`);
                restoredFiles++;
            } catch (error) {
                if (error.response?.status !== 400 && error.response?.status !== 404) {
                    console.log(`⚠️ No creds.json found on Backblaze B2 for ${sessionId}:`, error.message);
                }
            }

            // Restore settings.json
            const settingsFileName = `sessions/${sessionId}/settings.json`;
            try {
                const { data } = await this.b2.downloadFileByName({
                    bucketName: this.bucketName,
                    fileName: settingsFileName,
                    responseType: 'arraybuffer'
                });

                fs.writeFileSync(path.join(sessionDir, "settings.json"), Buffer.from(data));
                console.log(`✅ Restored settings.json for ${sessionId} from Backblaze B2`);
                restoredFiles++;
            } catch (error) {
                if (error.response?.status !== 400 && error.response?.status !== 404) {
                    console.log(`⚠️ No settings.json found on Backblaze B2 for ${sessionId}:`, error.message);
                }
            }

            console.log(`✅ Complete restore successful for ${sessionId} from Backblaze B2 (${restoredFiles} files)`);
            return { success: true, restoredFiles };

        } catch (error) {
            console.error(`❌ Restore failed for ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔄 Sync session from B2 (check and restore if newer)
    async syncSessionFromB2(sessionId) {
        try {
            await this.initializeB2();
            
            const localSessionDir = path.join(__dirname, "sessions", sessionId);
            const localCredsPath = path.join(localSessionDir, "creds.json");
            const b2FileName = `sessions/${sessionId}/creds.json`;
            
            // Check if file exists on B2
            let b2FileInfo;
            try {
                const { data } = await this.b2.getFileInfo({
                    bucketName: this.bucketName,
                    fileName: b2FileName
                });
                b2FileInfo = data;
            } catch (error) {
                // File doesn't exist on B2
                return { success: false, error: 'File not found on B2' };
            }
            
            // Check local file modification time
            let localFileExists = fs.existsSync(localCredsPath);
            let shouldRestore = false;
            
            if (!localFileExists) {
                // Local file doesn't exist, restore from B2
                shouldRestore = true;
            } else {
                // Compare modification times
                const localStats = fs.statSync(localCredsPath);
                const b2ModifiedTime = new Date(b2FileInfo.uploadTimestamp);
                const localModifiedTime = new Date(localStats.mtime);
                
                if (b2ModifiedTime > localModifiedTime) {
                    // B2 version is newer, restore it
                    shouldRestore = true;
                    console.log(`🔄 B2 version is newer for ${sessionId}, restoring...`);
                }
            }
            
            if (shouldRestore) {
                return await this.restoreSessionFromB2(sessionId);
            }
            
            return { success: true, message: 'Local version is up to date' };
            
        } catch (error) {
            console.error(`❌ Error syncing session ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 📤 Upload JSON data to B2
    async uploadToB2(fileName, content) {
        try {
            await this.initializeB2();
            
            const { data: uploadUrlData } = await this.b2.getUploadUrl({
                bucketId: await this.getBucketId()
            });

            await this.b2.uploadFile({
                uploadUrl: uploadUrlData.uploadUrl,
                uploadAuthToken: uploadUrlData.authorizationToken,
                fileName: `data/${fileName}`,
                data: Buffer.from(content),
                contentLength: Buffer.from(content).length,
                mime: 'application/json'
            });

            console.log(`✅ Uploaded ${fileName} to Backblaze B2`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Error uploading ${fileName}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 📥 Download JSON data from B2
    async downloadFromB2(fileName) {
        try {
            await this.initializeB2();
            
            const { data } = await this.b2.downloadFileByName({
                bucketName: this.bucketName,
                fileName: `data/${fileName}`,
                responseType: 'arraybuffer'
            });

            return Buffer.from(data).toString('utf8');

        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 404) {
                console.log(`⚠️ No ${fileName} found on Backblaze B2`);
                return null;
            }
            console.error(`❌ Error downloading ${fileName}:`, error.message);
            return null;
        }
    }

    // 🔄 Auto backup all data (sessions + tokens + users + requests)
    async backupAllData() {
        try {
            console.log('🔄 Starting complete data backup...');
            
            // Backup sessions
            const sessionsResult = await this.backupAllSessions();
            
            // Backup token data files
            const tokenManager = require('./token');
            
            // Backup users.json
            const usersPath = path.join(__dirname, 'users.json');
            if (fs.existsSync(usersPath)) {
                const usersContent = fs.readFileSync(usersPath, 'utf8');
                await this.uploadToB2('users.json', usersContent);
            }
            
            // Backup tokens.json
            const tokensPath = path.join(__dirname, 'tokens.json');
            if (fs.existsSync(tokensPath)) {
                const tokensContent = fs.readFileSync(tokensPath, 'utf8');
                await this.uploadToB2('tokens.json', tokensContent);
            }
            
            // Backup requests.json
            const requestsPath = path.join(__dirname, 'requests.json');
            if (fs.existsSync(requestsPath)) {
                const requestsContent = fs.readFileSync(requestsPath, 'utf8');
                await this.uploadToB2('requests.json', requestsContent);
            }
            
            console.log('✅ Complete data backup successful');
            return { 
                success: true, 
                message: 'Backup completed',
                sessions: sessionsResult.backedUp || 0
            };
            
        } catch (error) {
            console.error('❌ Complete backup failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 🔄 Auto restore all data on startup
    async restoreAllData() {
        try {
            console.log('🔄 Restoring all data from backup...');
            
            let restoredItems = 0;
            
            // Restore sessions
            const sessionsResult = await this.restoreAllSessionsFromB2();
            if (sessionsResult.success) {
                restoredItems += sessionsResult.restoredCount;
            }
            
            // Restore users.json
            const usersData = await this.downloadFromB2('users.json');
            if (usersData) {
                fs.writeFileSync(path.join(__dirname, 'users.json'), usersData);
                console.log('✅ Restored users.json from Backblaze B2');
                restoredItems++;
            }
            
            // Restore tokens.json
            const tokensData = await this.downloadFromB2('tokens.json');
            if (tokensData) {
                fs.writeFileSync(path.join(__dirname, 'tokens.json'), tokensData);
                console.log('✅ Restored tokens.json from Backblaze B2');
                restoredItems++;
            }
            
            // Restore requests.json
            const requestsData = await this.downloadFromB2('requests.json');
            if (requestsData) {
                fs.writeFileSync(path.join(__dirname, 'requests.json'), requestsData);
                console.log('✅ Restored requests.json from Backblaze B2');
                restoredItems++;
            }
            
            console.log(`✅ ${restoredItems} data items restored successfully`);
            return { success: true, restoredItems: restoredItems, message: 'Restore completed' };
            
        } catch (error) {
            console.error('❌ Data restore failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 📊 Get B2 storage stats
    async getStorageStats() {
        try {
            await this.initializeB2();
            
            const bucketId = await this.getBucketId();
            const { data } = await this.b2.listFileNames({
                bucketId: bucketId,
                prefix: '',
                maxFileCount: 10000
            });
            
            const totalFiles = data.files.length;
            let totalSize = 0;
            let sessionFiles = 0;
            let dataFiles = 0;
            
            data.files.forEach(file => {
                totalSize += file.contentLength;
                if (file.fileName.startsWith('sessions/')) {
                    sessionFiles++;
                } else if (file.fileName.startsWith('data/')) {
                    dataFiles++;
                }
            });
            
            return {
                totalFiles,
                sessionFiles,
                dataFiles,
                totalSize: this.formatBytes(totalSize),
                sessions: Math.floor(sessionFiles / 2) // Each session has 2 files (creds.json + settings.json)
            };
        } catch (error) {
            console.error('❌ Error getting storage stats:', error.message);
            return { error: error.message };
        }
    }

    // Helper to format bytes
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // 🚀 Interactive restore CLI
    async interactiveRestore() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('='.repeat(50));
        console.log('🔄 TRACLE - LITE BACKBLAZE B2 RESTORE TOOL');
        console.log('='.repeat(50));
        
        console.log('\nOptions:');
        console.log('1. Restore ALL sessions from Backblaze B2');
        console.log('2. Restore specific session');
        console.log('3. Check if session exists on Backblaze B2');
        console.log('4. Backup all local sessions to Backblaze B2');
        console.log('5. View storage statistics');
        console.log('6. Sync all sessions (restore if newer on B2)');
        console.log('7. Backup ALL data (sessions + tokens + users + requests)');
        console.log('8. Restore ALL data from backup');
        console.log('9. Exit');
        
        rl.question('\nSelect option (1-9): ', async (choice) => {
            switch (choice) {
                case '1':
                    await this.restoreAllSessionsFromB2();
                    break;
                case '2':
                    rl.question('Enter session ID (phone number): ', async (sessionId) => {
                        await this.restoreSessionFromB2(sessionId);
                        rl.close();
                    });
                    return;
                case '3':
                    rl.question('Enter session ID (phone number): ', async (sessionId) => {
                        const result = await this.checkSessionOnB2(sessionId);
                        console.log('Result:', result);
                        rl.close();
                    });
                    return;
                case '4':
                    await this.backupAllSessions();
                    break;
                case '5':
                    const stats = await this.getStorageStats();
                    console.log('\n📊 BACKBLAZE B2 STORAGE STATISTICS:');
                    console.log('='.repeat(40));
                    console.log(`Total Files: ${stats.totalFiles || 0}`);
                    console.log(`Session Files: ${stats.sessionFiles || 0}`);
                    console.log(`Data Files: ${stats.dataFiles || 0}`);
                    console.log(`Estimated Sessions: ${stats.sessions || 0}`);
                    console.log(`Total Size: ${stats.totalSize || '0 Bytes'}`);
                    console.log('='.repeat(40));
                    break;
                case '6':
                    await this.syncAllSessions();
                    break;
                case '7':
                    const backupResult = await this.backupAllData();
                    console.log('Backup Result:', backupResult);
                    break;
                case '8':
                    const restoreResult = await this.restoreAllData();
                    console.log('Restore Result:', restoreResult);
                    break;
                case '9':
                    console.log('👋 Exiting...');
                    rl.close();
                    return;
                default:
                    console.log('❌ Invalid option');
            }
            
            rl.question('\nPress Enter to continue or type "exit" to quit: ', (answer) => {
                if (answer.toLowerCase() === 'exit') {
                    console.log('👋 Goodbye!');
                    rl.close();
                } else {
                    this.interactiveRestore();
                }
            });
        });
    }

    // 🔄 Sync all sessions
    async syncAllSessions() {
        try {
            await this.initializeB2();
            console.log("🔄 Syncing all sessions with Backblaze B2...");

            // Get all sessions from B2
            let nextFileName = null;
            let hasMore = true;
            const b2Sessions = [];

            while (hasMore) {
                const { data } = await this.b2.listFileNames({
                    bucketId: await this.getBucketId(),
                    prefix: 'sessions/',
                    startFileName: nextFileName,
                    maxFileCount: 1000
                });

                b2Sessions.push(...data.files);
                hasMore = data.nextFileName !== null;
                nextFileName = data.nextFileName;
            }

            // Extract unique session IDs from B2
            const b2SessionIds = new Set();
            for (const file of b2Sessions) {
                if (file.fileName.includes('/creds.json')) {
                    const sessionId = file.fileName.split('/')[1];
                    b2SessionIds.add(sessionId);
                }
            }

            console.log(`📦 Found ${b2SessionIds.size} sessions on Backblaze B2`);
            
            let syncedCount = 0;
            for (const sessionId of b2SessionIds) {
                const result = await this.syncSessionFromB2(sessionId);
                if (result.success) {
                    syncedCount++;
                }
            }

            console.log(`✅ Synced ${syncedCount}/${b2SessionIds.size} sessions from Backblaze B2`);
            return { success: true, syncedCount };

        } catch (error) {
            console.error("❌ Failed to sync sessions:", error.message);
            return { success: false, error: error.message };
        }
    }

    // ✅ Backup when new user connects
    async backupNewUserSession(sessionId) {
        try {
            console.log(`🔄 Backing up new user session: ${sessionId}`);
            const result = await this.backupSessionToB2(sessionId);
            
            if (result.success) {
                console.log(`✅ New user session ${sessionId} backed up to Backblaze B2`);
            } else {
                console.log(`⚠️ Failed to backup new user session ${sessionId}: ${result.error}`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Error backing up new user session ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}


// Create and export singleton instance
const backupManager = new BackupManager();

// If this file is run directly, start the interactive restore
if (require.main === module) {
    if (!backupManager.isConfigured()) {
        console.log('❌ Backblaze B2 not configured. Please set these environment variables:');
        console.log('   B2_APPLICATION_KEY_ID');
        console.log('   B2_APPLICATION_KEY');
        console.log('   B2_BUCKET_NAME');
        process.exit(1);
    }
    
    backupManager.interactiveRestore().catch(console.error);
}

module.exports = backupManager;