// FILE: backup.js - UPDATED TO USE SUPABASE
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

class BackupManager {
    constructor() {
        this.supabase = null;
        this.authorized = false;
        
        // Supabase configuration
        this.SUPABASE_URL = process.env.SUPABASE_URL;
        this.SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
        this.BUCKET_NAME = process.env.SUPABASE_BUCKET || 'tracle-backups';
        
        this.initializeSupabase();
    }

    // Initialize Supabase
    async initializeSupabase() {
        try {
            if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
                console.log('⚠️ Supabase credentials not configured');
                return;
            }

            this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
            this.authorized = true;
            
            console.log('✅ Supabase authorized successfully');
            
            // Ensure bucket exists
            await this.ensureBucketExists();
            
        } catch (error) {
            console.error('❌ Failed to authorize Supabase:', error.message);
            throw error;
        }
    }

    // Check if Supabase is configured
    isConfigured() {
        return !!(this.SUPABASE_URL && this.SUPABASE_KEY);
    }

    // Ensure bucket exists
    async ensureBucketExists() {
        try {
            // Check if bucket exists
            const { data: buckets, error: listError } = await this.supabase
                .storage
                .listBuckets();
                
            if (listError) throw listError;
            
            const bucketExists = buckets.some(bucket => bucket.name === this.BUCKET_NAME);
            
            if (!bucketExists) {
                console.log(`⚠️ Bucket "${this.BUCKET_NAME}" not found, creating...`);
                
                const { data, error } = await this.supabase
                    .storage
                    .createBucket(this.BUCKET_NAME, {
                        public: false,
                        fileSizeLimit: 104857600 // 100MB
                    });
                    
                if (error) throw error;
                console.log(`✅ Created new bucket: ${this.BUCKET_NAME}`);
            } else {
                console.log(`✅ Using existing bucket: ${this.BUCKET_NAME}`);
            }
            
        } catch (error) {
            console.error('❌ Error ensuring bucket exists:', error.message);
            throw error;
        }
    }

    // 🔄 Check if session exists in Supabase Storage
    async checkSessionOnDrive(sessionId) {
        try {
            await this.initializeSupabase();
            
            const fileName = `sessions/${sessionId}/creds.json`;
            
            try {
                const { data, error } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .list(`sessions/${sessionId}`);
                    
                if (error && error.message !== 'Not Found') {
                    throw error;
                }
                
                const sessionExists = data && data.length > 0;
                console.log(`📊 Session ${sessionId} exists on Supabase: ${sessionExists}`);
                return { sessionExists };
                
            } catch (error) {
                console.error(`❌ Error checking session ${sessionId} on Supabase:`, error.message);
                return { sessionExists: false, error: error.message };
            }
        } catch (error) {
            console.error(`❌ Error checking session ${sessionId} on Supabase:`, error.message);
            return { sessionExists: false, error: error.message };
        }
    }

    // 💾 Backup creds.json to Supabase
    async backupCredsToDrive(sessionId) {
        try {
            await this.initializeSupabase();
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            const credsPath = path.join(sessionDir, "creds.json");

            if (!fs.existsSync(credsPath)) {
                console.log(`⚠️ No creds.json found for session ${sessionId}, skipping backup`);
                return { success: false, error: 'No creds.json found' };
            }

            const fileContent = fs.readFileSync(credsPath);
            const fileName = `creds.json`;
            const filePath = `sessions/${sessionId}/${fileName}`;
            
            // Convert to base64 for Supabase upload
            const base64Content = fileContent.toString('base64');
            
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .upload(filePath, fileContent, {
                    contentType: 'application/json',
                    upsert: true
                });

            if (error) throw error;

            console.log(`✅ Backup successful for ${sessionId} to Supabase`);
            return { success: true, fileId: data.path };

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId} to Supabase:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore creds.json from Supabase
    async restoreCredsFromDrive(sessionId) {
        try {
            await this.initializeSupabase();
            
            const fileName = `creds.json`;
            const filePath = `sessions/${sessionId}/${fileName}`;
            
            // Download the file
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .download(filePath);

            if (error) {
                if (error.message === 'Not Found' || error.message.includes('404')) {
                    console.log(`⚠️ No creds.json found on Supabase for ${sessionId}`);
                    return { success: false, error: 'File not found on Supabase' };
                }
                throw error;
            }

            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            const credsPath = path.join(sessionDir, "creds.json");
            
            // Convert blob to buffer and save
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(credsPath, buffer);

            // Verify the restored file
            if (fs.existsSync(credsPath)) {
                try {
                    const restoredCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    console.log(`✅ Successfully restored creds.json for ${sessionId} from Supabase (registered: ${restoredCreds.registered || false})`);
                    return { 
                        success: true, 
                        registered: restoredCreds.registered || false 
                    };
                } catch (error) {
                    console.log(`❌ Error parsing restored creds.json for ${sessionId}`);
                    return { success: false, error: 'Invalid JSON file' };
                }
            } else {
                console.log(`❌ Failed to write creds.json for ${sessionId}`);
                return { success: false, error: 'File write failed' };
            }

        } catch (error) {
            console.error(`❌ Restore failed for ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔄 Restore all sessions from Supabase (on startup)
    async restoreAllSessionsFromDrive() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ Supabase not configured, skipping restore');
                return { success: false, error: 'Supabase not configured' };
            }

            await this.initializeSupabase();
            console.log("🔄 Fetching sessions list from Supabase...");

            // List all files in the backup folder
            const { data: folders, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list('sessions');

            if (error) {
                console.error('❌ Error listing sessions:', error.message);
                return { success: false, error: error.message };
            }

            if (!folders || folders.length === 0) {
                console.log('📭 No sessions found on Supabase');
                return { success: true, restoredCount: 0 };
            }

            console.log(`📦 Found ${folders.length} sessions on Supabase`);

            let restoredCount = 0;
            let failedCount = 0;

            // Restore each session
            for (const folder of folders) {
                try {
                    const sessionId = folder.name;
                    console.log(`🔄 Restoring session ${sessionId}...`);
                    
                    const result = await this.restoreSessionFromDrive(sessionId);
                    
                    if (result.success) {
                        restoredCount++;
                        console.log(`✅ Session ${sessionId} restored successfully`);
                    } else {
                        failedCount++;
                        console.log(`❌ Failed to restore session ${sessionId}: ${result.error}`);
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    failedCount++;
                    console.error(`❌ Error restoring session:`, error.message);
                }
            }
            
            console.log(`✅ ${restoredCount} sessions restored from Supabase (${failedCount} failed)`);
            return { success: true, restoredCount: restoredCount, failedCount: failedCount };
            
        } catch (error) {
            console.error("❌ Failed to restore sessions from Supabase:", error.message);
            return { success: false, error: error.message };
        }
    }

    // ❌ Delete session from Supabase + local folder
    async deleteSessionFromDrive(sessionId) {
        try {
            await this.initializeSupabase();
            
            // Delete all files for this session
            const { data: files, error: listError } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list(`sessions/${sessionId}`);
                
            if (listError && listError.message !== 'Not Found') {
                throw listError;
            }
            
            if (files && files.length > 0) {
                const filePaths = files.map(file => `sessions/${sessionId}/${file.name}`);
                
                const { error: deleteError } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .remove(filePaths);
                    
                if (deleteError) throw deleteError;
                
                console.log(`✅ Successfully deleted session ${sessionId} from Supabase`);
            } else {
                console.log(`⚠️ No files found on Supabase for ${sessionId}`);
            }

            // Delete local session directory
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`🧹 Deleted local session folder for ${sessionId}`);
            }

            return { success: true };
        } catch (error) {
            console.error(`❌ Error deleting session ${sessionId} from Supabase:`, error.message);
            return { success: false, error: error.message };
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

            console.log(`🔄 Backing up ${sessions.length} sessions to Supabase...`);
            
            let backedUpCount = 0;
            let failedCount = 0;
            
            for (const sessionId of sessions) {
                try {
                    const credsPath = path.join(sessionsDir, sessionId, "creds.json");
                    if (fs.existsSync(credsPath)) {
                        const result = await this.backupCredsToDrive(sessionId);
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
            
            console.log(`✅ ${backedUpCount} sessions backed up to Supabase successfully (${failedCount} failed)`);
            return { success: true, backedUp: backedUpCount, failed: failedCount };
        } catch (err) {
            console.error("❌ Auto-backup error:", err.message);
            return { success: false, error: err.message };
        }
    }

    // 💾 Backup full session to Supabase
    async backupSessionToDrive(sessionId) {
        try {
            await this.initializeSupabase();
            
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
                    const filePath = `sessions/${sessionId}/creds.json`;
                    
                    const { error } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .upload(filePath, fileContent, {
                            contentType: 'application/json',
                            upsert: true
                        });
                    
                    if (error) throw error;
                    
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
                    const filePath = `sessions/${sessionId}/settings.json`;
                    
                    const { error } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .upload(filePath, fileContent, {
                            contentType: 'application/json',
                            upsert: true
                        });
                    
                    if (error) throw error;
                    
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
                    const filePath = `sessions/${sessionId}/user_info.json`;
                    
                    const { error } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .upload(filePath, fileContent, {
                            contentType: 'application/json',
                            upsert: true
                        });
                    
                    if (error) throw error;
                    
                    console.log(`✅ Backed up user_info.json for ${sessionId}`);
                    backedUpFiles++;
                } catch (error) {
                    errors.push(`user_info.json: ${error.message}`);
                    console.error(`❌ Failed to backup user_info.json for ${sessionId}:`, error.message);
                }
            }

            if (backedUpFiles > 0) {
                console.log(`✅ Complete backup successful for ${sessionId} to Supabase (${backedUpFiles} files)`);
                return { success: true, backedUpFiles, errors: errors.length > 0 ? errors : null };
            } else {
                console.log(`❌ No files backed up for ${sessionId}`);
                return { success: false, error: 'No files backed up', errors };
            }

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId} to Supabase:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore full session from Supabase
    async restoreSessionFromDrive(sessionId) {
        try {
            if (!this.isConfigured()) {
                console.log(`⚠️ Supabase not configured, cannot restore ${sessionId}`);
                return { success: false, error: 'Supabase not configured' };
            }

            await this.initializeSupabase();
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            // Create session directory if it doesn't exist
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
                console.log(`📁 Created session directory for ${sessionId}`);
            }

            let restoredFiles = 0;
            let errors = [];

            // List of files to restore
            const filesToRestore = ['creds.json', 'settings.json', 'user_info.json'];
            
            for (const fileName of filesToRestore) {
                try {
                    console.log(`🔄 Restoring ${fileName} for ${sessionId}...`);
                    
                    const filePath = `sessions/${sessionId}/${fileName}`;
                    
                    const { data, error } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .download(filePath);
                        
                    if (error) {
                        if (error.message !== 'Not Found') {
                            throw error;
                        }
                        continue; // File doesn't exist, skip
                    }
                    
                    // Convert blob to buffer and save
                    const arrayBuffer = await data.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const filePathLocal = path.join(sessionDir, fileName);
                    
                    fs.writeFileSync(filePathLocal, buffer);
                    
                    // Verify the file was saved
                    if (fs.existsSync(filePathLocal)) {
                        console.log(`✅ Restored ${fileName} for ${sessionId} from Supabase`);
                        restoredFiles++;
                        
                        // If it's creds.json, check registration status
                        if (fileName === 'creds.json') {
                            try {
                                const creds = JSON.parse(buffer.toString('utf8'));
                                console.log(`📊 Creds registered status: ${creds.registered || false}`);
                            } catch (parseError) {
                                console.error(`❌ Error parsing restored ${fileName}:`, parseError.message);
                            }
                        }
                    }
                    
                } catch (error) {
                    errors.push(`${fileName}: ${error.message}`);
                    console.error(`❌ Error restoring ${fileName} for ${sessionId}:`, error.message);
                }
            }

            if (restoredFiles > 0) {
                console.log(`✅ Complete restore successful for ${sessionId} from Supabase (${restoredFiles} files)`);
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

    // 📤 Upload JSON data to Supabase
    async uploadToDrive(fileName, content) {
        try {
            await this.initializeSupabase();
            
            const filePath = `data/${fileName}`;
            const buffer = Buffer.from(content, 'utf8');
            
            const { error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .upload(filePath, buffer, {
                    contentType: 'application/json',
                    upsert: true
                });

            if (error) throw error;

            console.log(`✅ Uploaded ${fileName} to Supabase`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Error uploading ${fileName}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 📥 Download JSON data from Supabase
    async downloadFromDrive(fileName) {
        try {
            await this.initializeSupabase();
            
            const filePath = `data/${fileName}`;
            
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .download(filePath);

            if (error) {
                if (error.message === 'Not Found') {
                    console.log(`⚠️ No ${fileName} found on Supabase`);
                    return null;
                }
                throw error;
            }

            // Convert blob to string
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('utf8');

        } catch (error) {
            console.error(`❌ Error downloading ${fileName}:`, error.message);
            return null;
        }
    }

    // 🔄 Auto backup all data (sessions + tokens + users + requests)
    async backupAllData() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ Supabase not configured, skipping backup');
                return { success: false, error: 'Supabase not configured' };
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
                    await this.uploadToDrive('users.json', usersContent);
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
                    await this.uploadToDrive('tokens.json', tokensContent);
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
                    await this.uploadToDrive('requests.json', requestsContent);
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

    // 🔄 Auto restore all data on startup
    async restoreAllData() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ Supabase not configured, skipping restore');
                return { success: false, error: 'Supabase not configured' };
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
            const sessionsResult = await this.restoreAllSessionsFromDrive();
            if (sessionsResult.success) {
                results.sessions = { 
                    restored: sessionsResult.restoredCount || 0, 
                    total: sessionsResult.failedCount ? sessionsResult.restoredCount + sessionsResult.failedCount : sessionsResult.restoredCount 
                };
                restoredItems += sessionsResult.restoredCount || 0;
            }
            
            // Restore users.json
            const usersData = await this.downloadFromDrive('users.json');
            if (usersData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'users.json'), usersData);
                    console.log('✅ Restored users.json from Supabase');
                    results.users = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.users = { success: false, error: error.message };
                }
            }
            
            // Restore tokens.json
            const tokensData = await this.downloadFromDrive('tokens.json');
            if (tokensData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'tokens.json'), tokensData);
                    console.log('✅ Restored tokens.json from Supabase');
                    results.tokens = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.tokens = { success: false, error: error.message };
                }
            }
            
            // Restore requests.json
            const requestsData = await this.downloadFromDrive('requests.json');
            if (requestsData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'requests.json'), requestsData);
                    console.log('✅ Restored requests.json from Supabase');
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

    // 📊 Get Supabase storage stats
    async getStorageStats() {
        try {
            await this.initializeSupabase();
            
            const { data: folders, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list();
            
            if (error) {
                console.error('❌ Error getting storage stats:', error.message);
                return { error: error.message };
            }
            
            let totalFiles = 0;
            let sessionFiles = 0;
            let dataFiles = 0;
            let totalSize = 0;
            
            // Helper to count files in a folder
            const countFilesInFolder = async (folderPath) => {
                const { data: files } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .list(folderPath);
                return files ? files.length : 0;
            };
            
            // Count session files
            const sessionFolders = folders?.find(f => f.name === 'sessions');
            if (sessionFolders) {
                const { data: sessionSubfolders } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .list('sessions');
                    
                if (sessionSubfolders) {
                    for (const session of sessionSubfolders) {
                        const fileCount = await countFilesInFolder(`sessions/${session.name}`);
                        sessionFiles += fileCount;
                        totalFiles += fileCount;
                    }
                }
            }
            
            // Count data files
            const dataFolder = folders?.find(f => f.name === 'data');
            if (dataFolder) {
                const { data: dataFilesList } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .list('data');
                    
                dataFiles = dataFilesList ? dataFilesList.length : 0;
                totalFiles += dataFiles;
            }
            
            return {
                totalFiles,
                sessionFiles,
                dataFiles,
                totalSize: this.formatBytes(totalSize),
                sessions: Math.floor(sessionFiles / 3) // Each session has ~3 files
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

    // ✅ Backup when new user connects
    async backupNewUserSession(sessionId) {
        try {
            if (!this.isConfigured()) {
                console.log(`⚠️ Supabase not configured, skipping backup for ${sessionId}`);
                return { success: false, error: 'Supabase not configured' };
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
            
            const result = await this.backupSessionToDrive(sessionId);
            
            if (result.success) {
                console.log(`✅ New user session ${sessionId} backed up to Supabase (${result.backedUpFiles} files)`);
            } else {
                console.log(`⚠️ Failed to backup new user session ${sessionId}: ${result.error}`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Error backing up new user session ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🆕 Function to restore and check if session exists on Supabase
    async restoreAndCheckSession(sessionId) {
        try {
            if (!this.isConfigured()) {
                return { exists: false, restored: false, error: 'Supabase not configured' };
            }

            await this.initializeSupabase();
            
            // Check if session exists on Supabase
            const checkResult = await this.checkSessionOnDrive(sessionId);
            
            if (checkResult.sessionExists) {
                // Try to restore the session
                console.log(`🔄 Session ${sessionId} exists on Supabase, attempting restore...`);
                const restoreResult = await this.restoreSessionFromDrive(sessionId);
                
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
                error: checkResult.error || 'Session not found on Supabase'
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
        console.log('❌ Supabase not configured. Please set these environment variables:');
        console.log('   SUPABASE_URL');
        console.log('   SUPABASE_KEY or SUPABASE_SERVICE_KEY');
        console.log('   SUPABASE_BUCKET (optional, defaults to "tracle-backups")');
        process.exit(1);
    }
    
    console.log('='.repeat(50));
    console.log('🔄 TRACLE - LITE SUPABASE RESTORE TOOL');
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