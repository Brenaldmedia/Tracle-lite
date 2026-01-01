// FILE: backup.js - CLEAN VERSION WITH MINIMAL LOGGING
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { delay } = require('@whiskeysockets/baileys');

class BackupManager {
    constructor() {
        this.supabase = null;
        this.authorized = false;
        this.initialized = false;
        
        // Supabase configuration
        this.SUPABASE_URL = process.env.SUPABASE_URL || '';
        this.SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
        this.BUCKET_NAME = process.env.SUPABASE_BUCKET || 'tracle-backups';
        
        // Minimal logging on startup
        if (this.isConfigured()) {
            console.log('📦 Backup Manager: Supabase configured');
        } else {
            console.log('⚠️ Backup Manager: Supabase not configured, sessions stored locally');
        }
        
        this.IP_API_URL = 'http://ip-api.com/json/';
    }

    // Simple backup logging to Supabase Database
    async logBackupToDB(sessionId, operation, status, filesCount = 0, errorMessage = null) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false };
            }

            const logData = {
                session_id: sessionId,
                operation: operation,
                status: status,
                files_count: filesCount,
                error_message: errorMessage
            };

            const { error } = await this.supabase
                .from('backup_logs')
                .insert([logData]);

            if (error) return { success: false };

            return { success: true };

        } catch (error) {
            return { success: false };
        }
    }

    // Initialize Supabase
    async initializeSupabase() {
        if (this.initialized && this.authorized) {
            return true;
        }
        
        try {
            if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
                this.authorized = false;
                this.initialized = true;
                return false;
            }

            // Validate URL format
            if (!this.SUPABASE_URL.startsWith('https://')) {
                this.authorized = false;
                this.initialized = true;
                return false;
            }

            // Create Supabase client
            this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: false,
                    detectSessionInUrl: false
                },
                global: {
                    headers: { 
                        'x-client-info': 'tracle-backup/1.0',
                        'apikey': this.SUPABASE_KEY
                    }
                }
            });
            
            // Test the connection
            const { data: buckets, error: listError } = await this.supabase
                .storage
                .listBuckets();

            if (listError) {
                this.authorized = false;
                this.initialized = true;
                return false;
            } else {
                this.authorized = true;
            }
            
            // Ensure bucket exists if authorized
            if (this.authorized) {
                await this.ensureBucketExists();
            }
            
            this.initialized = true;
            return this.authorized;
            
        } catch (error) {
            this.authorized = false;
            this.initialized = true;
            return false;
        }
    }

    // Check if Supabase is configured
    isConfigured() {
        const hasUrl = this.SUPABASE_URL && this.SUPABASE_URL.length > 10;
        const hasKey = this.SUPABASE_KEY && this.SUPABASE_KEY.length > 10;
        return hasUrl && hasKey;
    }

    // Ensure bucket exists
    async ensureBucketExists() {
        try {
            if (!this.authorized || !this.supabase) {
                return false;
            }
            
            // Check if bucket exists
            const { data: buckets, error: listError } = await this.supabase
                .storage
                .listBuckets();
                
            if (listError) {
                return false;
            }
            
            const bucketExists = buckets.some(bucket => bucket.name === this.BUCKET_NAME);
            
            if (!bucketExists) {
                try {
                    const { error } = await this.supabase
                        .storage
                        .createBucket(this.BUCKET_NAME, {
                            public: false,
                            fileSizeLimit: 104857600, // 100MB
                            allowedMimeTypes: ['application/json', 'image/*', 'video/*', 'audio/*', 'text/*']
                        });
                        
                    if (error) {
                        return false;
                    }
                    
                    return true;
                    
                } catch (createError) {
                    return false;
                }
            } else {
                return true;
            }
            
        } catch (error) {
            return false;
        }
    }

    // 🔄 Restore all sessions from Supabase (on startup) - SILENT VERSION
    async restoreAllSessionsFromDrive() {
        try {
            if (!this.isConfigured()) {
                return { success: false, error: 'Supabase not configured' };
            }

            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }

            // List all session folders
            const { data: folders, error: folderError } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list('sessions');

            if (folderError) {
                return { success: false, error: folderError.message };
            }

            if (!folders || folders.length === 0) {
                return { success: true, restoredCount: 0 };
            }

            let restoredCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            const restoredSessions = [];

            // Restore each session
            for (let i = 0; i < folders.length; i++) {
                const folder = folders[i];
                const sessionId = folder.name;
                
                try {
                    // List files in this session folder
                    const { data: files, error: fileError } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .list(`sessions/${sessionId}`);
                    
                    if (fileError) {
                        failedCount++;
                        continue;
                    }
                    
                    if (!files || files.length === 0) {
                        skippedCount++;
                        continue;
                    }
                    
                    // Restore the session
                    const result = await this.restoreSessionFromDrive(sessionId);
                    
                    if (result.success) {
                        restoredCount++;
                        restoredSessions.push({
                            sessionId,
                            files: result.restoredFiles || 0,
                            filesList: files.map(f => f.name)
                        });
                    } else {
                        failedCount++;
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (error) {
                    failedCount++;
                }
            }
            
            return { 
                success: restoredCount > 0, 
                restoredCount: restoredCount, 
                failedCount: failedCount,
                skippedCount: skippedCount,
                totalFolders: folders.length,
                restoredSessions: restoredSessions
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore full session from Supabase (SILENT)
    async restoreSessionFromDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            // Create session directory if it doesn't exist
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            let restoredFiles = 0;
            let errors = [];

            // List of files to restore
            const filesToRestore = ['creds.json', 'settings.json', 'user_info.json', 'last_timestamp.json'];
            
            for (const fileName of filesToRestore) {
                try {
                    const filePath = `sessions/${sessionId}/${fileName}`;
                    
                    const { data, error } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .download(filePath);
                        
                    if (error) {
                        if (error.message.includes('Not Found')) {
                            continue;
                        }
                        throw error;
                    }
                    
                    // Convert blob to buffer and save
                    const arrayBuffer = await data.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const filePathLocal = path.join(sessionDir, fileName);
                    
                    fs.writeFileSync(filePathLocal, buffer);
                    
                    // Verify the file was saved
                    if (fs.existsSync(filePathLocal)) {
                        restoredFiles++;
                    } else {
                        errors.push(`${fileName}: File not saved`);
                    }
                    
                } catch (error) {
                    errors.push(`${fileName}: ${error.message}`);
                }
            }

            if (restoredFiles > 0) {
                return { 
                    success: true, 
                    restoredFiles, 
                    errors: errors.length > 0 ? errors : null 
                };
            } else {
                return { 
                    success: false, 
                    error: 'No files restored', 
                    errors 
                };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ✅ Backup when new user connects - SILENT VERSION
    async backupNewUserSession(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }

            // Wait a bit to ensure files are written
            await delay(2000);
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            if (!fs.existsSync(sessionDir)) {
                return { success: false, error: 'Session directory not found' };
            }

            // Check all files in session directory
            const files = fs.readdirSync(sessionDir);
            
            const credsPath = path.join(sessionDir, "creds.json");
            if (!fs.existsSync(credsPath)) {
                return { success: false, error: 'No creds.json found' };
            }
            
            // Read and check creds
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            
            if (!creds.registered) {
                // Schedule a retry for 30 seconds later
                setTimeout(async () => {
                    await this.backupNewUserSession(sessionId);
                }, 30000);
                
                return { success: false, error: 'Session not registered yet' };
            }
            
            // Perform full session backup
            const result = await this.backupSessionToDrive(sessionId);
            
            if (!result.success) {
                // Retry backup once after 10 seconds
                setTimeout(async () => {
                    await this.backupSessionToDrive(sessionId);
                }, 10000);
            }
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔄 Auto restore ALL data on startup - SILENT VERSION
    async restoreAllData() {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            let restoredItems = 0;
            let results = {
                sessions: { restored: 0, total: 0, error: null },
                users: { success: false, error: null },
                tokens: { success: false, error: null },
                requests: { success: false, error: null },
                grants: { success: false, error: null },
                loginHistory: { success: false, error: null },
                adminSettings: { success: false, error: null },
                premium: { success: false, error: null }
            };
            
            // 1. Restore sessions FIRST
            const sessionsResult = await this.restoreAllSessionsFromDrive();
            if (sessionsResult.success) {
                results.sessions = { 
                    restored: sessionsResult.restoredCount || 0, 
                    total: sessionsResult.totalFolders || 0,
                    error: sessionsResult.error
                };
                restoredItems += sessionsResult.restoredCount || 0;
            }
            
            // 2. Restore users.json (includes grants)
            const usersData = await this.downloadFromDrive('users.json');
            if (usersData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'users.json'), usersData);
                    results.users = { success: true };
                    restoredItems++;
                    
                    // Restore grants from users data
                    await this.restoreGrants(usersData);
                    results.grants = { success: true };
                } catch (error) {
                    results.users = { success: false, error: error.message };
                    results.grants = { success: false, error: error.message };
                }
            }
            
            // 3. Restore tokens.json
            const tokensData = await this.downloadFromDrive('tokens.json');
            if (tokensData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'tokens.json'), tokensData);
                    results.tokens = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.tokens = { success: false, error: error.message };
                }
            }
            
            // 4. Restore requests.json
            const requestsData = await this.downloadFromDrive('requests.json');
            if (requestsData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'requests.json'), requestsData);
                    results.requests = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.requests = { success: false, error: error.message };
                }
            }
            
            // 5. Restore login history
            const loginHistoryData = await this.downloadFromDrive('login_history.json');
            if (loginHistoryData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'login_history.json'), loginHistoryData);
                    results.loginHistory = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.loginHistory = { success: false, error: error.message };
                }
            }
            
            // 6. Restore admin settings
            const adminSettingsData = await this.downloadFromDrive('admin_settings.json');
            if (adminSettingsData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'admin_settings.json'), adminSettingsData);
                    results.adminSettings = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.adminSettings = { success: false, error: error.message };
                }
            }
            
            // 7. Restore premium data
            const premiumData = await this.downloadFromDrive('premium.json');
            if (premiumData) {
                try {
                    const dataDir = path.join(__dirname, 'data');
                    if (!fs.existsSync(dataDir)) {
                        fs.mkdirSync(dataDir, { recursive: true });
                    }
                    fs.writeFileSync(path.join(__dirname, 'data', 'premium.json'), premiumData);
                    results.premium = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.premium = { success: false, error: error.message };
                }
            }
            
            return { 
                success: restoredItems > 0, 
                restoredItems: restoredItems,
                results: results
            };
            
        } catch (error) {
            return { 
                success: false, 
                message: error.message
            };
        }
    }

    // 🔧 Ensure authorization before any operation
    async ensureAuthorization() {
        if (this.authorized && this.supabase) {
            return true;
        }
        
        if (!this.isConfigured()) {
            return false;
        }
        
        if (!this.initialized) {
            return await this.initializeSupabase();
        }
        
        return this.authorized;
    }

    // 📥 Download JSON data from Supabase
    async downloadFromDrive(fileName) {
        try {
            if (!await this.ensureAuthorization()) {
                return null;
            }
            
            const filePath = `data/${fileName}`;
            
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .download(filePath);

            if (error) {
                if (error.message.includes('Not Found')) {
                    return null;
                }
                return null;
            }

            // Convert blob to string
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('utf8');

        } catch (error) {
            return null;
        }
    }

    // 📤 Upload JSON data to Supabase
    async uploadToDrive(fileName, content) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const filePath = `data/${fileName}`;
            const buffer = Buffer.from(content, 'utf8');
            
            const { error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .upload(filePath, buffer, {
                    contentType: 'application/json',
                    upsert: true
                });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, filePath };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔄 Restore grants from backup
    async restoreGrants(usersData) {
        try {
            const grantsData = await this.downloadFromDrive('grants_backup.json');
            if (grantsData) {
                const grants = JSON.parse(grantsData);
                const users = JSON.parse(usersData);
                
                // Apply grant settings to users
                Object.keys(grants).forEach(email => {
                    if (users[email]) {
                        users[email].maxSessions = grants[email].maxSessions;
                        users[email].grantType = grants[email].grantType;
                        users[email].grantUpdated = grants[email].grantUpdated;
                        users[email].tokenBalance = grants[email].tokenBalance || users[email].tokenBalance;
                        users[email].freeTokensGranted = grants[email].freeTokensGranted || users[email].freeTokensGranted;
                    }
                });
                
                // Save updated users
                fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
                return { success: true };
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 💾 Backup full session to Supabase
    async backupSessionToDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            if (!fs.existsSync(sessionDir)) {
                return { success: false, error: 'No session folder found' };
            }

            let backedUpFiles = 0;
            let errors = [];

            // List of files to backup
            const filesToBackup = [
                { name: 'creds.json', type: 'application/json' },
                { name: 'settings.json', type: 'application/json' },
                { name: 'user_info.json', type: 'application/json' },
                { name: 'last_timestamp.json', type: 'application/json' }
            ];
            
            for (const fileInfo of filesToBackup) {
                const filePath = path.join(sessionDir, fileInfo.name);
                if (fs.existsSync(filePath)) {
                    try {
                        const fileContent = fs.readFileSync(filePath);
                        const supabasePath = `sessions/${sessionId}/${fileInfo.name}`;
                        
                        const { error } = await this.supabase
                            .storage
                            .from(this.BUCKET_NAME)
                            .upload(supabasePath, fileContent, {
                                contentType: fileInfo.type,
                                upsert: true
                            });
                        
                        if (error) {
                            errors.push(`${fileInfo.name}: ${error.message}`);
                        } else {
                            backedUpFiles++;
                        }
                    } catch (error) {
                        errors.push(`${fileInfo.name}: ${error.message}`);
                    }
                }
            }

            if (backedUpFiles > 0) {
                // Log to database (optional, won't break if fails)
                await this.logBackupToDB(sessionId, 'backup', 'success', backedUpFiles);
                
                return { 
                    success: true, 
                    backedUpFiles, 
                    errors: errors.length > 0 ? errors : null 
                };
            } else {
                // Log failure to database
                await this.logBackupToDB(sessionId, 'backup', 'failed', 0, errors.join(', '));
                
                return { 
                    success: false, 
                    error: 'No files backed up', 
                    errors 
                };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 💾 Backup creds.json to Supabase
    async backupCredsToDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            const credsPath = path.join(sessionDir, "creds.json");

            if (!fs.existsSync(credsPath)) {
                return { success: false, error: 'No creds.json found' };
            }

            const fileContent = fs.readFileSync(credsPath);
            const fileName = `creds.json`;
            const filePath = `sessions/${sessionId}/${fileName}`;
            
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .upload(filePath, fileContent, {
                    contentType: 'application/json',
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, fileId: data.path };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore creds.json from Supabase
    async restoreCredsFromDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const fileName = `creds.json`;
            const filePath = `sessions/${sessionId}/${fileName}`;
            
            // Download the file
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .download(filePath);

            if (error) {
                if (error.message.includes('Not Found') || error.message.includes('404')) {
                    return { success: false, error: 'File not found on Supabase' };
                }
                return { success: false, error: error.message };
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
                    return { 
                        success: true, 
                        registered: restoredCreds.registered || false 
                    };
                } catch (error) {
                    return { success: false, error: 'Invalid JSON file' };
                }
            } else {
                return { success: false, error: 'File write failed' };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔍 Check if session exists in Supabase Storage
    async checkSessionOnDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { sessionExists: false, error: 'Supabase not authorized' };
            }
            
            try {
                const { data, error } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .list(`sessions/${sessionId}`);
                    
                if (error) {
                    if (error.message.includes('Not Found') || error.message.includes('not found')) {
                        return { sessionExists: false };
                    }
                    return { sessionExists: false, error: error.message };
                }
                
                const sessionExists = data && data.length > 0;
                return { sessionExists, fileCount: data?.length || 0 };
                
            } catch (error) {
                return { sessionExists: false, error: error.message };
            }
        } catch (error) {
            return { sessionExists: false, error: error.message };
        }
    }

    // ❌ Delete session from Supabase + local folder
    async deleteSessionFromDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            // Delete all files for this session
            const { data: files, error: listError } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list(`sessions/${sessionId}`);
                
            if (listError && listError.message !== 'Not Found') {
                return { success: false, error: listError.message };
            }
            
            if (files && files.length > 0) {
                const filePaths = files.map(file => `sessions/${sessionId}/${file.name}`);
                
                const { error: deleteError } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .remove(filePaths);
                    
                if (deleteError) {
                    return { success: false, error: deleteError.message };
                }
            }

            // Delete local session directory
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }

            return { success: true, filesDeleted: files?.length || 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔄 Auto backup all sessions
    async backupAllSessions() {
        try {
            const sessionsDir = path.join(__dirname, "sessions");
            if (!fs.existsSync(sessionsDir)) {
                return { success: false, error: 'No sessions directory found' };
            }

            const sessions = fs.readdirSync(sessionsDir);
            if (sessions.length === 0) {
                return { success: false, error: 'No sessions found' };
            }
            
            let backedUpCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            
            for (const sessionId of sessions) {
                try {
                    const sessionPath = path.join(sessionsDir, sessionId);
                    if (!fs.statSync(sessionPath).isDirectory()) {
                        skippedCount++;
                        continue;
                    }
                    
                    const credsPath = path.join(sessionPath, "creds.json");
                    if (fs.existsSync(credsPath)) {
                        const result = await this.backupCredsToDrive(sessionId);
                        if (result && result.success) {
                            backedUpCount++;
                        } else {
                            failedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                } catch (error) {
                    failedCount++;
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            return { 
                success: backedUpCount > 0, 
                backedUp: backedUpCount, 
                failed: failedCount,
                skipped: skippedCount,
                total: sessions.length
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    // 🔄 Auto backup ALL data including grants and login history
    async backupAllData() {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            let results = {
                sessions: { success: false, count: 0, error: null },
                users: { success: false, error: null },
                tokens: { success: false, error: null },
                requests: { success: false, error: null },
                grants: { success: false, error: null },
                loginHistory: { success: false, error: null },
                adminSettings: { success: false, error: null },
                premium: { success: false, error: null }
            };
            
            // 1. Backup sessions
            const sessionsResult = await this.backupAllSessions();
            results.sessions = { 
                success: sessionsResult.success, 
                count: sessionsResult.backedUp || 0,
                error: sessionsResult.error
            };
            
            // 2. Backup users.json (includes grants)
            const usersPath = path.join(__dirname, 'users.json');
            if (fs.existsSync(usersPath)) {
                try {
                    const usersContent = fs.readFileSync(usersPath, 'utf8');
                    await this.uploadToDrive('users.json', usersContent);
                    results.users = { success: true };
                    
                    // Extract and backup grants separately
                    await this.backupGrants(usersContent);
                    results.grants = { success: true };
                } catch (error) {
                    results.users = { success: false, error: error.message };
                    results.grants = { success: false, error: error.message };
                }
            }
            
            // 3. Backup tokens.json
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
            
            // 4. Backup requests.json
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
            
            // 5. Backup login history
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            if (fs.existsSync(loginHistoryPath)) {
                try {
                    const loginHistoryContent = fs.readFileSync(loginHistoryPath, 'utf8');
                    await this.uploadToDrive('login_history.json', loginHistoryContent);
                    results.loginHistory = { success: true };
                } catch (error) {
                    results.loginHistory = { success: false, error: error.message };
                }
            }
            
            // 6. Backup admin settings
            const adminSettingsPath = path.join(__dirname, 'admin_settings.json');
            if (fs.existsSync(adminSettingsPath)) {
                try {
                    const adminSettingsContent = fs.readFileSync(adminSettingsPath, 'utf8');
                    await this.uploadToDrive('admin_settings.json', adminSettingsContent);
                    results.adminSettings = { success: true };
                } catch (error) {
                    results.adminSettings = { success: false, error: error.message };
                }
            }
            
            // 7. Backup premium data
            const premiumPath = path.join(__dirname, 'data', 'premium.json');
            if (fs.existsSync(premiumPath)) {
                try {
                    const premiumContent = fs.readFileSync(premiumPath, 'utf8');
                    await this.uploadToDrive('premium.json', premiumContent);
                    results.premium = { success: true };
                } catch (error) {
                    results.premium = { success: false, error: error.message };
                }
            }
            
            // Summary
            const successful = Object.values(results).filter(r => r.success).length;
            const total = Object.values(results).length;
            
            return { 
                success: successful > 0, 
                message: `Backup completed: ${successful}/${total} items`,
                timestamp: new Date().toISOString(),
                results: results,
                summary: {
                    successful: successful,
                    total: total,
                    percentage: Math.round((successful / total) * 100)
                }
            };
            
        } catch (error) {
            return { 
                success: false, 
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 📊 Extract and backup grants from users data
    async backupGrants(usersData) {
        try {
            const users = JSON.parse(usersData);
            const grants = {};
            
            // Extract grant information from each user
            Object.keys(users).forEach(email => {
                const user = users[email];
                grants[email] = {
                    maxSessions: user.maxSessions || 1,
                    currentSessions: user.currentSessions || 0,
                    grantType: user.grantType || (user.freeToken ? 'free' : 'paid'),
                    grantUpdated: user.grantUpdated || user.lastUpdated,
                    status: user.status || 'pending',
                    paid: user.paid || false,
                    tokenBalance: user.tokenBalance || 0,
                    freeTokensGranted: user.freeTokensGranted || 0
                };
            });
            
            // Save grants to separate file locally
            const grantsPath = path.join(__dirname, 'grants_backup.json');
            fs.writeFileSync(grantsPath, JSON.stringify(grants, null, 2));
            
            // Upload to Supabase
            await this.uploadToDrive('grants_backup.json', JSON.stringify(grants, null, 2));
            
            return { success: true, count: Object.keys(grants).length };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🌍 Get location from IP address
    async getLocationFromIP(ip) {
        try {
            // Skip local IPs
            if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
                return {
                    country: 'Local',
                    region: 'Local Network',
                    city: 'Local',
                    isp: 'Local Network'
                };
            }
            
            const response = await axios.get(`${this.IP_API_URL}${ip}`);
            if (response.data && response.data.status === 'success') {
                return {
                    country: response.data.country,
                    region: response.data.regionName,
                    city: response.data.city,
                    isp: response.data.isp,
                    lat: response.data.lat,
                    lon: response.data.lon
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // 📝 Record admin login
    async recordAdminLogin(email, ip, userAgent) {
        try {
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            let loginHistory;
            
            if (fs.existsSync(loginHistoryPath)) {
                loginHistory = JSON.parse(fs.readFileSync(loginHistoryPath, 'utf8'));
            } else {
                loginHistory = {
                    admin_logins: [],
                    user_logins: []
                };
            }
            
            // Get location from IP
            const location = await this.getLocationFromIP(ip);
            
            const loginRecord = {
                email: email,
                ip: ip,
                userAgent: userAgent,
                timestamp: new Date().toISOString(),
                location: location || {
                    country: 'Unknown',
                    region: 'Unknown',
                    city: 'Unknown'
                }
            };
            
            // Add to admin logins
            loginHistory.admin_logins.unshift(loginRecord);
            loginHistory.admin_logins = loginHistory.admin_logins.slice(0, 100);
            
            // Save locally
            fs.writeFileSync(loginHistoryPath, JSON.stringify(loginHistory, null, 2));
            
            // Backup to Supabase
            if (await this.ensureAuthorization()) {
                await this.uploadToDrive('login_history.json', JSON.stringify(loginHistory, null, 2));
            }
            
            return { success: true, location };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 📝 Record user login
    async recordUserLogin(email, ip, userAgent, token) {
        try {
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            let loginHistory;
            
            if (fs.existsSync(loginHistoryPath)) {
                loginHistory = JSON.parse(fs.readFileSync(loginHistoryPath, 'utf8'));
            } else {
                loginHistory = {
                    admin_logins: [],
                    user_logins: []
                };
            }
            
            // Get location from IP
            const location = await this.getLocationFromIP(ip);
            
            const loginRecord = {
                email: email,
                ip: ip,
                userAgent: userAgent,
                token: token ? (token.length > 10 ? token.substring(0, 10) + '...' : token) : 'No token',
                timestamp: new Date().toISOString(),
                location: location || {
                    country: 'Unknown',
                    region: 'Unknown',
                    city: 'Unknown'
                }
            };
            
            // Add to user logins
            loginHistory.user_logins.unshift(loginRecord);
            loginHistory.user_logins = loginHistory.user_logins.slice(0, 500);
            
            // Save locally
            fs.writeFileSync(loginHistoryPath, JSON.stringify(loginHistory, null, 2));
            
            // Backup to Supabase
            if (await this.ensureAuthorization()) {
                await this.uploadToDrive('login_history.json', JSON.stringify(loginHistory, null, 2));
            }
            
            return { success: true, location };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 📋 Get admin login history
    async getAdminLoginHistory(limit = 50) {
        try {
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            
            if (!fs.existsSync(loginHistoryPath)) {
                return { success: true, logins: [] };
            }
            
            const loginHistory = JSON.parse(fs.readFileSync(loginHistoryPath, 'utf8'));
            const adminLogins = loginHistory.admin_logins || [];
            
            return { 
                success: true, 
                logins: adminLogins.slice(0, limit),
                total: adminLogins.length
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 📋 Get user login history
    async getUserLoginHistory(limit = 100) {
        try {
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            
            if (!fs.existsSync(loginHistoryPath)) {
                return { success: true, logins: [] };
            }
            
            const loginHistory = JSON.parse(fs.readFileSync(loginHistoryPath, 'utf8'));
            const userLogins = loginHistory.user_logins || [];
            
            return { 
                success: true, 
                logins: userLogins.slice(0, limit),
                total: userLogins.length
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 📊 Get login statistics
    async getLoginStats() {
        try {
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            
            if (!fs.existsSync(loginHistoryPath)) {
                return { 
                    success: true, 
                    stats: {
                        adminLogins: 0,
                        userLogins: 0,
                        uniqueCountries: 0,
                        recentActivity: []
                    }
                };
            }
            
            const loginHistory = JSON.parse(fs.readFileSync(loginHistoryPath, 'utf8'));
            const adminLogins = loginHistory.admin_logins || [];
            const userLogins = loginHistory.user_logins || [];
            
            // Get unique countries
            const allLogins = [...adminLogins, ...userLogins];
            const uniqueCountries = new Set();
            allLogins.forEach(login => {
                if (login.location && login.location.country) {
                    uniqueCountries.add(login.location.country);
                }
            });
            
            // Get recent activity (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentActivity = allLogins.filter(login => 
                new Date(login.timestamp) > oneDayAgo
            ).length;
            
            return {
                success: true,
                stats: {
                    adminLogins: adminLogins.length,
                    userLogins: userLogins.length,
                    totalLogins: adminLogins.length + userLogins.length,
                    uniqueCountries: uniqueCountries.size,
                    recentActivity: recentActivity
                }
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🗑️ Clear old login history (keep last N days)
    async cleanupLoginHistory(daysToKeep = 30) {
        try {
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            
            if (!fs.existsSync(loginHistoryPath)) {
                return { success: true, deleted: 0 };
            }
            
            const loginHistory = JSON.parse(fs.readFileSync(loginHistoryPath, 'utf8'));
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            
            let deletedCount = 0;
            
            // Clean admin logins
            if (loginHistory.admin_logins) {
                const originalCount = loginHistory.admin_logins.length;
                loginHistory.admin_logins = loginHistory.admin_logins.filter(login => 
                    new Date(login.timestamp) > cutoffDate
                );
                deletedCount += (originalCount - loginHistory.admin_logins.length);
            }
            
            // Clean user logins
            if (loginHistory.user_logins) {
                const originalCount = loginHistory.user_logins.length;
                loginHistory.user_logins = loginHistory.user_logins.filter(login => 
                    new Date(login.timestamp) > cutoffDate
                );
                deletedCount += (originalCount - loginHistory.user_logins.length);
            }
            
            // Save cleaned history
            fs.writeFileSync(loginHistoryPath, JSON.stringify(loginHistory, null, 2));
            
            // Backup to Supabase
            if (await this.ensureAuthorization()) {
                await this.uploadToDrive('login_history.json', JSON.stringify(loginHistory, null, 2));
            }
            
            return { success: true, deleted: deletedCount };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 📊 Get Supabase storage stats
    async getStorageStats() {
        try {
            if (!await this.ensureAuthorization()) {
                return { error: 'Supabase not authorized' };
            }
            
            const { data: folders, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list();
            
            if (error) {
                return { error: error.message };
            }
            
            let totalFiles = 0;
            let sessionFiles = 0;
            let dataFiles = 0;
            
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
                sessions: Math.floor(sessionFiles / 4),
                bucket: this.BUCKET_NAME
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    // 🆕 Function to restore and check if session exists on Supabase
    async restoreAndCheckSession(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { exists: false, restored: false, error: 'Supabase not authorized' };
            }

            // Check if session exists on Supabase
            const checkResult = await this.checkSessionOnDrive(sessionId);
            
            if (checkResult.sessionExists) {
                // Try to restore the session
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
            return {
                exists: false,
                restored: false,
                error: error.message
            };
        }
    }

    // 🧹 Cleanup old backups (keep last N backups per session)
    async cleanupOldBackups(daysToKeep = 7) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }

            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            let deletedCount = 0;
            
            // Get all sessions
            const { data: sessions } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list('sessions');
            
            if (!sessions) {
                return { success: true, deleted: 0 };
            }
            
            for (const session of sessions) {
                try {
                    // Get files for this session
                    const { data: files } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .list(`sessions/${session.name}`);
                    
                    if (!files || files.length === 0) continue;
                    
                    // Filter old backup files
                    const oldBackups = files.filter(file => {
                        return file.name.includes('backup_') || 
                               file.name.includes('old_') ||
                               (file.created_at && new Date(file.created_at) < cutoffDate);
                    });
                    
                    if (oldBackups.length > 0) {
                        const filePaths = oldBackups.map(file => `sessions/${session.name}/${file.name}`);
                        const { error } = await this.supabase
                            .storage
                            .from(this.BUCKET_NAME)
                            .remove(filePaths);
                        
                        if (!error) {
                            deletedCount += oldBackups.length;
                        }
                    }
                    
                } catch (error) {}
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return { success: true, deleted: deletedCount };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔄 Manual sync: Upload all local data to Supabase
    async manualSyncToCloud() {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const result = await this.backupAllData();
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 🔄 Manual restore: Download all data from Supabase
    async manualRestoreFromCloud() {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const result = await this.restoreAllData();
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const backupManager = new BackupManager();

// If this file is run directly, test the connection and show options
if (require.main === module) {
    console.log('🔄 Backup Manager - Test Mode');
    
    if (!backupManager.isConfigured()) {
        console.log('❌ Supabase not configured properly.');
        console.log('\nPlease set these environment variables:');
        console.log('   SUPABASE_URL');
        console.log('   SUPABASE_KEY or SUPABASE_SERVICE_KEY');
        console.log('   SUPABASE_BUCKET (optional, defaults to "tracle-backups")');
        console.log('\nExample:');
        console.log('   SUPABASE_URL=https://your-project.supabase.co');
        console.log('   SUPABASE_SERVICE_KEY=your-service-role-key');
        console.log('   SUPABASE_BUCKET=your-bucket-name');
        process.exit(1);
    }
    
    console.log('🔧 Testing Supabase connection...');
    
    // Test connection
    backupManager.initializeSupabase()
        .then(async (authorized) => {
            if (authorized) {
                console.log('✅ Supabase is properly configured and connected!');
            } else {
                console.log('⚠️ Supabase configuration issue detected.');
            }
            process.exit(0);
        })
        .catch(error => {
            console.log('❌ Connection test failed:', error.message);
            process.exit(1);
        });
}

module.exports = backupManager;