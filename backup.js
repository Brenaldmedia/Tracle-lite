// FILE: backup.js - COMPLETELY UPDATED WITH PROPER CREDS.JSON RESTORATION
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
                return { success: false, error: 'No creds.json found' };
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

    // 🔁 Restore creds.json from Backblaze B2 - FIXED VERSION
    async restoreCredsFromB2(sessionId) {
        try {
            await this.initializeB2();
            
            const fileName = `sessions/${sessionId}/creds.json`;
            
            console.log(`🔄 Attempting to restore ${fileName} from Backblaze B2...`);
            
            const { data } = await this.b2.downloadFileByName({
                bucketName: this.bucketName,
                fileName: fileName,
                responseType: 'arraybuffer'
            });

            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            const credsPath = path.join(sessionDir, "creds.json");
            fs.writeFileSync(credsPath, Buffer.from(data));
            
            // Verify the restored file
            if (fs.existsSync(credsPath)) {
                const restoredCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                if (restoredCreds && restoredCreds.registered === true) {
                    console.log(`✅ Successfully restored creds.json for ${sessionId} from Backblaze B2 (registered: ${restoredCreds.registered})`);
                    return { success: true, registered: true };
                } else {
                    console.log(`⚠️ Restored creds.json for ${sessionId} but not registered`);
                    return { success: true, registered: false };
                }
            } else {
                console.log(`❌ Failed to write creds.json for ${sessionId}`);
                return { success: false, error: 'File write failed' };
            }

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

    // 🔄 Restore all sessions from Backblaze B2 (on startup) - FIXED
    async restoreAllSessionsFromB2() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ Backblaze B2 not configured, skipping restore');
                return { success: false, error: 'B2 not configured' };
            }

            await this.initializeB2();
            console.log("🔄 Fetching sessions list from Backblaze B2...");

            let sessions = [];
            let nextFileName = null;
            let hasMore = true;

            while (hasMore) {
                try {
                    const { data } = await this.b2.listFileNames({
                        bucketId: await this.getBucketId(),
                        prefix: 'sessions/',
                        startFileName: nextFileName,
                        maxFileCount: 1000
                    });

                    sessions.push(...data.files);
                    hasMore = data.nextFileName !== null;
                    nextFileName = data.nextFileName;
                } catch (error) {
                    console.error('❌ Error listing files from B2:', error.message);
                    break;
                }
            }

            if (sessions.length === 0) {
                console.log('📭 No sessions found on Backblaze B2');
                return { success: true, restoredCount: 0 };
            }

            console.log(`📦 Found ${sessions.length} files on Backblaze B2`);

            let restoredCount = 0;
            let failedCount = 0;
            const processedSessions = new Set();

            // Process creds.json files first
            for (const file of sessions) {
                if (file.fileName.includes('/creds.json')) {
                    const sessionId = file.fileName.split('/')[1];
                    
                    if (!processedSessions.has(sessionId)) {
                        processedSessions.add(sessionId);
                        
                        try {
                            console.log(`🔄 Restoring session ${sessionId}...`);
                            const result = await this.restoreSessionFromB2(sessionId);
                            
                            if (result.success) {
                                restoredCount++;
                                console.log(`✅ Session ${sessionId} restored successfully`);
                                
                                // Also restore settings.json if exists
                                await this.restoreSettingsFromB2(sessionId);
                            } else {
                                failedCount++;
                                console.log(`❌ Failed to restore session ${sessionId}: ${result.error}`);
                            }
                        } catch (error) {
                            failedCount++;
                            console.error(`❌ Error restoring session ${sessionId}:`, error.message);
                        }
                        
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }
            
            console.log(`✅ ${restoredCount} sessions restored from Backblaze B2 (${failedCount} failed)`);
            return { success: true, restoredCount: restoredCount, failedCount: failedCount };
            
        } catch (error) {
            console.error("❌ Failed to restore sessions from Backblaze B2:", error.message);
            return { success: false, error: error.message };
        }
    }

    // Helper to restore settings.json
    async restoreSettingsFromB2(sessionId) {
        try {
            await this.initializeB2();
            
            const fileName = `sessions/${sessionId}/settings.json`;
            
            const { data } = await this.b2.downloadFileByName({
                bucketName: this.bucketName,
                fileName: fileName,
                responseType: 'arraybuffer'
            });

            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            fs.writeFileSync(path.join(sessionDir, "settings.json"), Buffer.from(data));
            console.log(`✅ Restored settings.json for ${sessionId} from Backblaze B2`);
            return { success: true };

        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 404) {
                // settings.json is optional, so this is not an error
                return { success: false, error: 'File not found on B2' };
            } else {
                console.error(`❌ Restore failed for settings.json ${sessionId}:`, error.message);
                return { success: false, error: error.message };
            }
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
            if (!fs.existsSync(sessionsDir)) {
                console.log("⚠️ No sessions directory found");
                return { success: false, error: 'No sessions directory found' };
            }

            const sessions = fs.readdirSync(sessionsDir);
            if (sessions.length === 0) {
                console.log("📭 No sessions found to back up");
                return { success: false, error: 'No sessions found' };
            }

            console.log(`🔄 Backing up ${sessions.length} sessions to Backblaze B2...`);
            
            let backedUpCount = 0;
            let failedCount = 0;
            
            for (const sessionId of sessions) {
                try {
                    const credsPath = path.join(sessionsDir, sessionId, "creds.json");
                    if (fs.existsSync(credsPath)) {
                        const result = await this.backupCredsToB2(sessionId);
                        if (result && result.success) {
                            backedUpCount++;
                            console.log(`✅ Backed up session ${sessionId}`);
                        } else {
                            failedCount++;
                            console.log(`❌ Failed to backup session ${sessionId}`);
                        }
                    } else {
                        console.log(`⚠️ No creds.json for session ${sessionId}, skipping`);
                    }
                } catch (error) {
                    failedCount++;
                    console.error(`❌ Error backing up session ${sessionId}:`, error.message);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`✅ ${backedUpCount} sessions backed up to Backblaze B2 successfully (${failedCount} failed)`);
            return { success: true, backedUp: backedUpCount, failed: failedCount };
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
            let errors = [];

            // Backup creds.json
            const credsPath = path.join(sessionDir, "creds.json");
            if (fs.existsSync(credsPath)) {
                try {
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
                } catch (error) {
                    errors.push(`creds.json: ${error.message}`);
                    console.error(`❌ Failed to backup creds.json for ${sessionId}:`, error.message);
                }
            }

            // Backup settings.json (if exists)
            const settingsPath = path.join(sessionDir, "settings.json");
            if (fs.existsSync(settingsPath)) {
                try {
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
                } catch (error) {
                    errors.push(`settings.json: ${error.message}`);
                    console.error(`❌ Failed to backup settings.json for ${sessionId}:`, error.message);
                }
            }

            // Backup user_info.json (if exists)
            const userInfoPath = path.join(sessionDir, "user_info.json");
            if (fs.existsSync(userInfoPath)) {
                try {
                    const fileContent = fs.readFileSync(userInfoPath);
                    const fileName = `sessions/${sessionId}/user_info.json`;

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
                    console.log(`✅ Backed up user_info.json for ${sessionId}`);
                    backedUpFiles++;
                } catch (error) {
                    errors.push(`user_info.json: ${error.message}`);
                    console.error(`❌ Failed to backup user_info.json for ${sessionId}:`, error.message);
                }
            }

            if (backedUpFiles > 0) {
                console.log(`✅ Complete backup successful for ${sessionId} to Backblaze B2 (${backedUpFiles} files)`);
                return { success: true, backedUpFiles, errors: errors.length > 0 ? errors : null };
            } else {
                console.log(`❌ No files backed up for ${sessionId}`);
                return { success: false, error: 'No files backed up', errors };
            }

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId} to Backblaze B2:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore full session from Backblaze B2 (creds.json + settings.json + user_info.json) - FIXED
    async restoreSessionFromB2(sessionId) {
        try {
            if (!this.isConfigured()) {
                console.log(`⚠️ Backblaze B2 not configured, cannot restore ${sessionId}`);
                return { success: false, error: 'B2 not configured' };
            }

            await this.initializeB2();
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            // Create session directory if it doesn't exist
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
                console.log(`📁 Created session directory for ${sessionId}`);
            }

            let restoredFiles = 0;
            let errors = [];

            // Restore creds.json (MOST IMPORTANT)
            const credsFileName = `sessions/${sessionId}/creds.json`;
            try {
                console.log(`🔄 Restoring ${credsFileName}...`);
                const { data } = await this.b2.downloadFileByName({
                    bucketName: this.bucketName,
                    fileName: credsFileName,
                    responseType: 'arraybuffer'
                });

                const credsContent = Buffer.from(data).toString('utf8');
                const credsData = JSON.parse(credsContent);
                
                // Save the creds.json
                fs.writeFileSync(path.join(sessionDir, "creds.json"), credsContent);
                
                // Verify it was saved
                if (fs.existsSync(path.join(sessionDir, "creds.json"))) {
                    console.log(`✅ Restored creds.json for ${sessionId} from Backblaze B2 (registered: ${credsData.registered || false})`);
                    restoredFiles++;
                } else {
                    errors.push('Failed to write creds.json');
                }
            } catch (error) {
                if (error.response?.status !== 400 && error.response?.status !== 404) {
                    errors.push(`creds.json: ${error.message}`);
                    console.log(`⚠️ No creds.json found on Backblaze B2 for ${sessionId}`);
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
                    errors.push(`settings.json: ${error.message}`);
                    console.log(`⚠️ No settings.json found on Backblaze B2 for ${sessionId}`);
                }
            }

            // Restore user_info.json
            const userInfoFileName = `sessions/${sessionId}/user_info.json`;
            try {
                const { data } = await this.b2.downloadFileByName({
                    bucketName: this.bucketName,
                    fileName: userInfoFileName,
                    responseType: 'arraybuffer'
                });

                fs.writeFileSync(path.join(sessionDir, "user_info.json"), Buffer.from(data));
                console.log(`✅ Restored user_info.json for ${sessionId} from Backblaze B2`);
                restoredFiles++;
            } catch (error) {
                if (error.response?.status !== 400 && error.response?.status !== 404) {
                    errors.push(`user_info.json: ${error.message}`);
                    console.log(`⚠️ No user_info.json found on Backblaze B2 for ${sessionId}`);
                }
            }

            if (restoredFiles > 0) {
                console.log(`✅ Complete restore successful for ${sessionId} from Backblaze B2 (${restoredFiles} files)`);
                return { success: true, restoredFiles, errors: errors.length > 0 ? errors : null };
            } else {
                console.log(`❌ No files restored for ${sessionId}`);
                return { success: false, error: 'No files restored', errors };
            }

        } catch (error) {
            console.error(`❌ Restore failed for ${sessionId}:`, error.message);
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
            if (!this.isConfigured()) {
                console.log('⚠️ Backblaze B2 not configured, skipping backup');
                return { success: false, error: 'B2 not configured' };
            }

            console.log('🔄 Starting complete data backup...');
            
            let results = {
                sessions: { success: false, count: 0 },
                users: { success: false },
                tokens: { success: false },
                requests: { success: false }
            };
            
            // Backup sessions
            const sessionsResult = await this.backupAllSessions();
            results.sessions = { 
                success: sessionsResult.success, 
                count: sessionsResult.backedUp || 0 
            };
            
            // Backup users.json
            const usersPath = path.join(__dirname, 'users.json');
            if (fs.existsSync(usersPath)) {
                try {
                    const usersContent = fs.readFileSync(usersPath, 'utf8');
                    await this.uploadToB2('users.json', usersContent);
                    results.users = { success: true };
                } catch (error) {
                    results.users = { success: false, error: error.message };
                }
            }
            
            // Backup tokens.json
            const tokensPath = path.join(__dirname, 'tokens.json');
            if (fs.existsSync(tokensPath)) {
                try {
                    const tokensContent = fs.readFileSync(tokensPath, 'utf8');
                    await this.uploadToB2('tokens.json', tokensContent);
                    results.tokens = { success: true };
                } catch (error) {
                    results.tokens = { success: false, error: error.message };
                }
            }
            
            // Backup requests.json
            const requestsPath = path.join(__dirname, 'requests.json');
            if (fs.existsSync(requestsPath)) {
                try {
                    const requestsContent = fs.readFileSync(requestsPath, 'utf8');
                    await this.uploadToB2('requests.json', requestsContent);
                    results.requests = { success: true };
                } catch (error) {
                    results.requests = { success: false, error: error.message };
                }
            }
            
            console.log('✅ Complete data backup attempt finished');
            console.log('📊 Results:', results);
            
            return { 
                success: true, 
                message: 'Backup attempt completed',
                results: results
            };
            
        } catch (error) {
            console.error('❌ Complete backup failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    // 🔄 Auto restore all data on startup - FIXED
    async restoreAllData() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ Backblaze B2 not configured, skipping restore');
                return { success: false, error: 'B2 not configured' };
            }

            console.log('🔄 Restoring all data from backup...');
            
            let restoredItems = 0;
            let results = {
                sessions: { restored: 0, total: 0 },
                users: { success: false },
                tokens: { success: false },
                requests: { success: false }
            };
            
            // Restore sessions FIRST
            const sessionsResult = await this.restoreAllSessionsFromB2();
            if (sessionsResult.success) {
                results.sessions = { 
                    restored: sessionsResult.restoredCount || 0, 
                    total: sessionsResult.failedCount ? sessionsResult.restoredCount + sessionsResult.failedCount : sessionsResult.restoredCount 
                };
                restoredItems += sessionsResult.restoredCount || 0;
            }
            
            // Restore users.json
            const usersData = await this.downloadFromB2('users.json');
            if (usersData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'users.json'), usersData);
                    console.log('✅ Restored users.json from Backblaze B2');
                    results.users = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.users = { success: false, error: error.message };
                }
            }
            
            // Restore tokens.json
            const tokensData = await this.downloadFromB2('tokens.json');
            if (tokensData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'tokens.json'), tokensData);
                    console.log('✅ Restored tokens.json from Backblaze B2');
                    results.tokens = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.tokens = { success: false, error: error.message };
                }
            }
            
            // Restore requests.json
            const requestsData = await this.downloadFromB2('requests.json');
            if (requestsData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'requests.json'), requestsData);
                    console.log('✅ Restored requests.json from Backblaze B2');
                    results.requests = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.requests = { success: false, error: error.message };
                }
            }
            
            console.log(`✅ ${restoredItems} data items restored successfully`);
            console.log('📊 Results:', results);
            
            return { 
                success: true, 
                restoredItems: restoredItems, 
                message: 'Restore completed',
                results: results
            };
            
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
                sessions: Math.floor(sessionFiles / 3) // Each session has 3 files (creds.json + settings.json + user_info.json)
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
            let failedCount = 0;
            
            for (const sessionId of b2SessionIds) {
                try {
                    const result = await this.syncSessionFromB2(sessionId);
                    if (result.success) {
                        syncedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    failedCount++;
                    console.error(`❌ Error syncing session ${sessionId}:`, error.message);
                }
            }

            console.log(`✅ Synced ${syncedCount}/${b2SessionIds.size} sessions from Backblaze B2 (${failedCount} failed)`);
            return { success: true, syncedCount, failedCount };

        } catch (error) {
            console.error("❌ Failed to sync sessions:", error.message);
            return { success: false, error: error.message };
        }
    }

    // ✅ Backup when new user connects
    async backupNewUserSession(sessionId) {
        try {
            if (!this.isConfigured()) {
                console.log(`⚠️ Backblaze B2 not configured, skipping backup for ${sessionId}`);
                return { success: false, error: 'B2 not configured' };
            }

            console.log(`🔄 Backing up new user session: ${sessionId}`);
            
            // Check if creds.json exists and is registered
            const credsPath = path.join(__dirname, "sessions", sessionId, "creds.json");
            if (!fs.existsSync(credsPath)) {
                console.log(`❌ No creds.json found for ${sessionId}, cannot backup`);
                return { success: false, error: 'No creds.json found' };
            }
            
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            if (!creds.registered) {
                console.log(`⚠️ Session ${sessionId} is not registered yet, skipping backup`);
                return { success: false, error: 'Session not registered' };
            }
            
            const result = await this.backupSessionToB2(sessionId);
            
            if (result.success) {
                console.log(`✅ New user session ${sessionId} backed up to Backblaze B2 (${result.backedUpFiles} files)`);
            } else {
                console.log(`⚠️ Failed to backup new user session ${sessionId}: ${result.error}`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Error backing up new user session ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🆕 Function to restore and check if session exists on B2
    async restoreAndCheckSession(sessionId) {
        try {
            if (!this.isConfigured()) {
                return { exists: false, restored: false, error: 'B2 not configured' };
            }

            await this.initializeB2();
            
            // Check if session exists on B2
            const checkResult = await this.checkSessionOnB2(sessionId);
            
            if (checkResult.sessionExists) {
                // Try to restore the session
                console.log(`🔄 Session ${sessionId} exists on B2, attempting restore...`);
                const restoreResult = await this.restoreSessionFromB2(sessionId);
                
                if (restoreResult.success) {
                    // Verify the restored creds.json
                    const credsPath = path.join(__dirname, "sessions", sessionId, "creds.json");
                    if (fs.existsSync(credsPath)) {
                        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                        return {
                            exists: true,
                            restored: true,
                            registered: creds.registered || false,
                            filesRestored: restoreResult.restoredFiles || 0
                        };
                    }
                }
                
                return {
                    exists: true,
                    restored: false,
                    error: restoreResult.error || 'Restore failed'
                };
            }
            
            return {
                exists: false,
                restored: false,
                error: checkResult.error || 'Session not found on B2'
            };
            
        } catch (error) {
            console.error(`❌ Error restoring/checking session ${sessionId}:`, error.message);
            return {
                exists: false,
                restored: false,
                error: error.message
            };
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
    
    console.log('='.repeat(50));
    console.log('🔄 TRACLE - LITE BACKBLAZE B2 RESTORE TOOL');
    console.log('='.repeat(50));
    
    // Directly restore all data
    backupManager.restoreAllData()
        .then(result => {
            console.log('\n✅ Restore process completed');
            console.log('📊 Result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Restore failed:', error);
            process.exit(1);
        });
}

module.exports = backupManager;