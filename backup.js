// FILE: backup.js - COMPLETE FIXED VERSION WITH PROPER SESSION RESTORATION AND BACKUP LOGGING
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // For IP geolocation
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
        
        console.log('\n' + '='.repeat(60));
        console.log('📦 BACKUP MANAGER INITIALIZATION');
        console.log('='.repeat(60));
        console.log('🔧 Configuration Check:');
        console.log(`   SUPABASE_URL: ${this.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
        console.log(`   SUPABASE_KEY: ${this.SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`);
        console.log(`   BUCKET_NAME: ${this.BUCKET_NAME}`);
        
        if (!this.isConfigured()) {
            console.log('⚠️ Supabase not configured. Sessions will only be stored locally.');
        } else {
            console.log('✅ Supabase configuration detected');
        }
        console.log('='.repeat(60) + '\n');
        
        this.IP_API_URL = 'http://ip-api.com/json/';
    }

    // 📝 Simple backup logging to Supabase Database
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

            if (error) {
                console.log(`⚠️ Could not log to DB:`, error.message);
                return { success: false };
            }

            console.log(`📝 Logged ${operation} for ${sessionId} to database`);
            return { success: true };

        } catch (error) {
            console.error(`❌ DB logging error:`, error.message);
            return { success: false };
        }
    }

    // Initialize Supabase
    async initializeSupabase() {
        if (this.initialized && this.authorized) {
            return true;
        }
        
        try {
            console.log('🔄 Initializing Supabase connection...');
            
            if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
                console.log('❌ Supabase credentials incomplete');
                this.authorized = false;
                this.initialized = true;
                return false;
            }

            // Validate URL format
            if (!this.SUPABASE_URL.startsWith('https://')) {
                console.log('❌ Invalid SUPABASE_URL format - must start with https://');
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
            console.log('   Testing connection...');
            const { data: buckets, error: listError } = await this.supabase
                .storage
                .listBuckets();

            if (listError) {
                console.log('❌ Supabase connection failed:', listError.message);
                this.authorized = false;
                this.initialized = true;
                return false;
            } else {
                console.log('✅ Supabase connection successful!');
                console.log(`   Found ${buckets?.length || 0} bucket(s)`);
                this.authorized = true;
            }
            
            // Ensure bucket exists if authorized
            if (this.authorized) {
                await this.ensureBucketExists();
            }
            
            this.initialized = true;
            return this.authorized;
            
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error.message);
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
            console.log(`📦 Ensuring bucket "${this.BUCKET_NAME}" exists...`);
            
            if (!this.authorized || !this.supabase) {
                console.log('⚠️ Not authorized, skipping bucket check');
                return false;
            }
            
            // Check if bucket exists
            const { data: buckets, error: listError } = await this.supabase
                .storage
                .listBuckets();
                
            if (listError) {
                console.log('❌ Error listing buckets:', listError.message);
                return false;
            }
            
            const bucketExists = buckets.some(bucket => bucket.name === this.BUCKET_NAME);
            
            if (!bucketExists) {
                console.log(`   Creating bucket "${this.BUCKET_NAME}"...`);
                
                try {
                    const { data, error } = await this.supabase
                        .storage
                        .createBucket(this.BUCKET_NAME, {
                            public: false,
                            fileSizeLimit: 104857600, // 100MB
                            allowedMimeTypes: ['application/json', 'image/*', 'video/*', 'audio/*', 'text/*']
                        });
                        
                    if (error) {
                        console.log(`❌ Failed to create bucket:`, error.message);
                        return false;
                    }
                    
                    console.log(`✅ Created bucket: ${this.BUCKET_NAME}`);
                    return true;
                    
                } catch (createError) {
                    console.log(`❌ Bucket creation error:`, createError.message);
                    return false;
                }
            } else {
                console.log(`✅ Bucket exists: ${this.BUCKET_NAME}`);
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error ensuring bucket exists:', error.message);
            return false;
        }
    }

    // 🔄 Restore all sessions from Supabase (on startup) - FIXED VERSION
    async restoreAllSessionsFromDrive() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ Supabase not configured, skipping restore');
                return { success: false, error: 'Supabase not configured' };
            }

            if (!await this.ensureAuthorization()) {
                console.log('⚠️ Supabase not authorized, skipping restore');
                return { success: false, error: 'Supabase not authorized' };
            }
            
            console.log("\n" + "=".repeat(60));
            console.log("🔄 RESTORING ALL SESSIONS FROM SUPABASE");
            console.log("=".repeat(60));

            // List all session folders
            const { data: folders, error: folderError } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list('sessions');

            if (folderError) {
                console.error('❌ Error listing session folders:', folderError.message);
                return { success: false, error: folderError.message };
            }

            if (!folders || folders.length === 0) {
                console.log('📭 No session folders found on Supabase');
                return { success: true, restoredCount: 0 };
            }

            console.log(`📦 Found ${folders.length} session folder(s) on Supabase`);

            let restoredCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            const restoredSessions = [];

            // Restore each session
            for (let i = 0; i < folders.length; i++) {
                const folder = folders[i];
                const sessionId = folder.name;
                
                console.log(`\n[${i + 1}/${folders.length}] Processing session: ${sessionId}`);
                
                try {
                    // List files in this session folder
                    const { data: files, error: fileError } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .list(`sessions/${sessionId}`);
                    
                    if (fileError) {
                        console.log(`   ❌ Error listing files:`, fileError.message);
                        failedCount++;
                        continue;
                    }
                    
                    if (!files || files.length === 0) {
                        console.log(`   ⏭️ Empty session folder, skipping`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Check for essential files
                    const fileNames = files.map(f => f.name);
                    console.log(`   📁 Files found: ${fileNames.join(', ')}`);
                    
                    // Restore the session
                    const result = await this.restoreSessionFromDrive(sessionId);
                    
                    if (result.success) {
                        restoredCount++;
                        restoredSessions.push({
                            sessionId,
                            files: result.restoredFiles || 0,
                            filesList: fileNames
                        });
                        
                        console.log(`   ✅ Session restored successfully (${result.restoredFiles || 0} files)`);
                        
                        // Log what was restored
                        if (result.restoredFiles > 0) {
                            console.log(`   📋 Restored files:`);
                            if (fileNames.includes('creds.json')) {
                                try {
                                    const credsPath = path.join(__dirname, "sessions", sessionId, "creds.json");
                                    if (fs.existsSync(credsPath)) {
                                        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                                        console.log(`     • creds.json - registered: ${creds.registered || false}`);
                                    }
                                } catch (e) {}
                            }
                            if (fileNames.includes('settings.json')) console.log(`     • settings.json`);
                            if (fileNames.includes('user_info.json')) console.log(`     • user_info.json`);
                            if (fileNames.includes('last_timestamp.json')) console.log(`     • last_timestamp.json`);
                        }
                    } else {
                        failedCount++;
                        console.log(`   ❌ Failed to restore: ${result.error}`);
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    failedCount++;
                    console.log(`   ❌ Error:`, error.message);
                }
            }
            
            console.log("\n" + "=".repeat(60));
            console.log("📊 SESSION RESTORATION SUMMARY");
            console.log("=".repeat(60));
            console.log(`✅ Restored: ${restoredCount} session(s)`);
            console.log(`❌ Failed: ${failedCount} session(s)`);
            console.log(`⏭️ Skipped: ${skippedCount} session(s)`);
            console.log(`📁 Total folders: ${folders.length}`);
            
            if (restoredSessions.length > 0) {
                console.log("\n📋 RESTORED SESSIONS DETAILS:");
                console.log("-".repeat(40));
                restoredSessions.forEach(session => {
                    console.log(`• ${session.sessionId} (${session.files} files)`);
                });
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
            console.error("\n❌ Failed to restore sessions from Supabase:", error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔁 Restore full session from Supabase
    async restoreSessionFromDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            console.log(`   🔄 Restoring session: ${sessionId}`);
            
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            
            // Create session directory if it doesn't exist
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
                console.log(`   📁 Created session directory`);
            }

            let restoredFiles = 0;
            let errors = [];

            // List of files to restore
            const filesToRestore = ['creds.json', 'settings.json', 'user_info.json', 'last_timestamp.json'];
            
            for (const fileName of filesToRestore) {
                try {
                    console.log(`   🔍 Looking for ${fileName}...`);
                    
                    const filePath = `sessions/${sessionId}/${fileName}`;
                    
                    const { data, error } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .download(filePath);
                        
                    if (error) {
                        if (error.message.includes('Not Found')) {
                            // File doesn't exist, skip
                            console.log(`     ⏭️ ${fileName} not found, skipping`);
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
                        console.log(`     ✅ Restored ${fileName}`);
                        
                        // Parse and log content for key files
                        if (fileName === 'creds.json') {
                            try {
                                const creds = JSON.parse(buffer.toString('utf8'));
                                console.log(`       📊 Registration status: ${creds.registered || 'false'}`);
                            } catch (parseError) {
                                console.log(`       ⚠️ Could not parse creds.json: ${parseError.message}`);
                            }
                        } else if (fileName === 'user_info.json') {
                            try {
                                const userInfo = JSON.parse(buffer.toString('utf8'));
                                console.log(`       👤 User email: ${userInfo.email || 'Not set'}`);
                            } catch (parseError) {
                                console.log(`       ⚠️ Could not parse user_info.json: ${parseError.message}`);
                            }
                        } else if (fileName === 'settings.json') {
                            try {
                                const settings = JSON.parse(buffer.toString('utf8'));
                                console.log(`       ⚙️ Bot mode: ${settings.botMode || 'Not set'}`);
                            } catch (parseError) {
                                console.log(`       ⚠️ Could not parse settings.json: ${parseError.message}`);
                            }
                        }
                    } else {
                        errors.push(`${fileName}: File not saved`);
                        console.log(`     ❌ ${fileName} not saved`);
                    }
                    
                } catch (error) {
                    errors.push(`${fileName}: ${error.message}`);
                    console.log(`     ❌ ${fileName}: ${error.message}`);
                }
            }

            if (restoredFiles > 0) {
                console.log(`   ✅ Complete restore successful (${restoredFiles} files)`);
                return { 
                    success: true, 
                    restoredFiles, 
                    errors: errors.length > 0 ? errors : null 
                };
            } else {
                console.log(`   ❌ No files restored`);
                return { 
                    success: false, 
                    error: 'No files restored', 
                    errors 
                };
            }

        } catch (error) {
            console.error(`   ❌ Restore failed for ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }
     // ✅ Backup when new user connects - FIXED VERSION
async backupNewUserSession(sessionId) {
    try {
        console.log(`\n🔄 STARTING BACKUP FOR NEW USER SESSION: ${sessionId}`);
        
        if (!await this.ensureAuthorization()) {
            console.log(`⚠️ Supabase not authorized, skipping backup for ${sessionId}`);
            return { success: false, error: 'Supabase not authorized' };
        }

        // Wait a bit to ensure files are written
        await delay(2000);
        
        const sessionDir = path.join(__dirname, "sessions", sessionId);
        console.log(`📁 Checking session directory: ${sessionDir}`);
        
        if (!fs.existsSync(sessionDir)) {
            console.log(`❌ Session directory doesn't exist: ${sessionDir}`);
            return { success: false, error: 'Session directory not found' };
        }

        // Check all files in session directory
        const files = fs.readdirSync(sessionDir);
        console.log(`📄 Found ${files.length} files in session:`, files);
        
        const credsPath = path.join(sessionDir, "creds.json");
        if (!fs.existsSync(credsPath)) {
            console.log(`❌ No creds.json found for ${sessionId}, cannot backup`);
            return { success: false, error: 'No creds.json found' };
        }
        
        // Read and check creds
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        console.log(`🔍 Creds status - Registered: ${creds.registered || false}`);
        
        if (!creds.registered) {
            console.log(`⚠️ Session ${sessionId} is not registered yet, will retry in 30 seconds`);
            
            // Schedule a retry for 30 seconds later
            setTimeout(async () => {
                console.log(`🔄 Retrying backup for ${sessionId} after registration delay`);
                await this.backupNewUserSession(sessionId);
            }, 30000);
            
            return { success: false, error: 'Session not registered yet' };
        }
        
        console.log(`✅ Session ${sessionId} is registered, proceeding with backup...`);
        
        // Perform full session backup
        const result = await this.backupSessionToDrive(sessionId);
        
        if (result.success) {
            console.log(`🎉 SUCCESS: New user session ${sessionId} backed up to Supabase!`);
            console.log(`📊 Files backed up: ${result.backedUpFiles || 0}`);
            
            // Also backup user info if available
            const userInfoPath = path.join(sessionDir, "user_info.json");
            if (fs.existsSync(userInfoPath)) {
                try {
                    const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                    console.log(`👤 User info: ${userInfo.email || 'No email'} (Token: ${userInfo.token ? 'Yes' : 'No'})`);
                    
                    // Backup user info as separate file
                    const userInfoContent = fs.readFileSync(userInfoPath);
                    const userInfoBackupPath = `sessions/${sessionId}/user_info_backup.json`;
                    
                    const { error: userInfoError } = await this.supabase
                        .storage
                        .from(this.BUCKET_NAME)
                        .upload(userInfoBackupPath, userInfoContent, {
                            contentType: 'application/json',
                            upsert: true
                        });
                    
                    if (!userInfoError) {
                        console.log(`✅ User info also backed up to Supabase`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not backup user info:`, error.message);
                }
            }
        } else {
            console.log(`❌ Backup failed for ${sessionId}:`, result.error);
            
            // Retry backup once after 10 seconds
            setTimeout(async () => {
                console.log(`🔄 Retrying failed backup for ${sessionId}...`);
                await this.backupSessionToDrive(sessionId);
            }, 10000);
        }
        
        return result;
        
    } catch (error) {
        console.error(`💥 CRITICAL ERROR backing up new user session ${sessionId}:`, error);
        return { success: false, error: error.message };
    }
}
    // 🔄 Auto restore ALL data on startup - FIXED VERSION
    async restoreAllData() {
        try {
            if (!await this.ensureAuthorization()) {
                console.log('⚠️ Supabase not authorized, skipping restore');
                return { success: false, error: 'Supabase not authorized' };
            }

            console.log('\n' + '='.repeat(60));
            console.log('🔄 RESTORING ALL DATA FROM SUPABASE');
            console.log('='.repeat(60));
            
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
            console.log('\n📱 1. Restoring sessions...');
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
            console.log('\n👥 2. Restoring users.json...');
            const usersData = await this.downloadFromDrive('users.json');
            if (usersData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'users.json'), usersData);
                    console.log('   ✅ Restored users.json from Supabase');
                    results.users = { success: true };
                    restoredItems++;
                    
                    // Restore grants from users data
                    console.log('   Restoring grants from users data...');
                    await this.restoreGrants(usersData);
                    results.grants = { success: true };
                } catch (error) {
                    results.users = { success: false, error: error.message };
                    results.grants = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ users.json not found in backup');
                results.users = { success: false, error: 'Not found in backup' };
            }
            
            // 3. Restore tokens.json
            console.log('\n🔑 3. Restoring tokens.json...');
            const tokensData = await this.downloadFromDrive('tokens.json');
            if (tokensData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'tokens.json'), tokensData);
                    console.log('   ✅ Restored tokens.json from Supabase');
                    results.tokens = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.tokens = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ tokens.json not found in backup');
                results.tokens = { success: false, error: 'Not found in backup' };
            }
            
            // 4. Restore requests.json
            console.log('\n📋 4. Restoring requests.json...');
            const requestsData = await this.downloadFromDrive('requests.json');
            if (requestsData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'requests.json'), requestsData);
                    console.log('   ✅ Restored requests.json from Supabase');
                    results.requests = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.requests = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ requests.json not found in backup');
                results.requests = { success: false, error: 'Not found in backup' };
            }
            
            // 5. Restore login history
            console.log('\n📝 5. Restoring login history...');
            const loginHistoryData = await this.downloadFromDrive('login_history.json');
            if (loginHistoryData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'login_history.json'), loginHistoryData);
                    console.log('   ✅ Restored login_history.json from Supabase');
                    results.loginHistory = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.loginHistory = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ login_history.json not found in backup');
                results.loginHistory = { success: false, error: 'Not found in backup' };
            }
            
            // 6. Restore admin settings
            console.log('\n⚙️ 6. Restoring admin settings...');
            const adminSettingsData = await this.downloadFromDrive('admin_settings.json');
            if (adminSettingsData) {
                try {
                    fs.writeFileSync(path.join(__dirname, 'admin_settings.json'), adminSettingsData);
                    console.log('   ✅ Restored admin_settings.json from Supabase');
                    results.adminSettings = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.adminSettings = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ admin_settings.json not found in backup');
                results.adminSettings = { success: false, error: 'Not found in backup' };
            }
            
            // 7. Restore premium data
            console.log('\n🎖️ 7. Restoring premium data...');
            const premiumData = await this.downloadFromDrive('premium.json');
            if (premiumData) {
                try {
                    // Ensure data directory exists
                    const dataDir = path.join(__dirname, 'data');
                    if (!fs.existsSync(dataDir)) {
                        fs.mkdirSync(dataDir, { recursive: true });
                    }
                    fs.writeFileSync(path.join(__dirname, 'data', 'premium.json'), premiumData);
                    console.log('   ✅ Restored premium.json from Supabase');
                    results.premium = { success: true };
                    restoredItems++;
                } catch (error) {
                    results.premium = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ premium.json not found in backup');
                results.premium = { success: false, error: 'Not found in backup' };
            }
            
            console.log('\n' + '='.repeat(60));
            console.log('✅ DATA RESTORE COMPLETED');
            console.log('='.repeat(60));
            
            // Summary
            const successfulItems = Object.values(results).filter(r => r.success).length;
            const totalItems = Object.values(results).length;
            
            console.log(`\n📊 Restore Results: ${successfulItems}/${totalItems} items successful`);
            console.log(`📦 Total files restored: ${restoredItems}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            Object.entries(results).forEach(([key, value]) => {
                const status = value.success ? '✅' : '❌';
                const extra = key === 'sessions' ? ` (${value.restored || 0}/${value.total || 0})` : '';
                console.log(`${status} ${key.padEnd(15)} ${value.success ? 'Success' + extra : 'Failed: ' + (value.error || 'Unknown')}`);
            });
            
            return { 
                success: restoredItems > 0, 
                restoredItems: restoredItems, 
                message: `Restore completed: ${restoredItems} items restored`,
                timestamp: new Date().toISOString(),
                results: results,
                summary: {
                    restoredItems: restoredItems,
                    successfulItems: successfulItems,
                    totalItems: totalItems
                }
            };
            
        } catch (error) {
            console.error('❌ Data restore failed:', error.message);
            return { 
                success: false, 
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 🔧 Ensure authorization before any operation
    async ensureAuthorization() {
        if (this.authorized && this.supabase) {
            return true;
        }
        
        if (!this.isConfigured()) {
            console.log('⚠️ Supabase not configured');
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
                console.log(`⚠️ Supabase not authorized, cannot download ${fileName}`);
                return null;
            }
            
            console.log(`📥 Downloading ${fileName} from Supabase...`);
            
            const filePath = `data/${fileName}`;
            
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .download(filePath);

            if (error) {
                if (error.message.includes('Not Found')) {
                    console.log(`⚠️ No ${fileName} found on Supabase`);
                    return null;
                }
                console.log(`❌ Download error:`, error.message);
                return null;
            }

            // Convert blob to string
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const content = buffer.toString('utf8');
            
            console.log(`✅ Downloaded ${fileName} (${content.length} bytes)`);
            return content;

        } catch (error) {
            console.error(`❌ Error downloading ${fileName}:`, error.message);
            return null;
        }
    }

    // 📤 Upload JSON data to Supabase
    async uploadToDrive(fileName, content) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            console.log(`📤 Uploading ${fileName} to Supabase...`);
            
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
                console.log(`❌ Upload failed:`, error.message);
                return { success: false, error: error.message };
            }

            console.log(`✅ Uploaded ${fileName} to Supabase`);
            return { success: true, filePath };

        } catch (error) {
            console.error(`❌ Error uploading ${fileName}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔄 Restore grants from backup
    async restoreGrants(usersData) {
        try {
            console.log('   🔄 Restoring grants from backup...');
            // First try to restore from dedicated grants backup
            const grantsData = await this.downloadFromDrive('grants_backup.json');
            if (grantsData) {
                const grants = JSON.parse(grantsData);
                const users = JSON.parse(usersData);
                
                console.log(`   Found ${Object.keys(grants).length} grants in backup`);
                
                // Apply grant settings to users
                let updatedCount = 0;
                Object.keys(grants).forEach(email => {
                    if (users[email]) {
                        users[email].maxSessions = grants[email].maxSessions;
                        users[email].grantType = grants[email].grantType;
                        users[email].grantUpdated = grants[email].grantUpdated;
                        users[email].tokenBalance = grants[email].tokenBalance || users[email].tokenBalance;
                        users[email].freeTokensGranted = grants[email].freeTokensGranted || users[email].freeTokensGranted;
                        updatedCount++;
                    }
                });
                
                // Save updated users
                fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
                console.log(`   ✅ Restored ${updatedCount} grants from backup`);
                return { success: true, updatedCount };
            } else {
                console.log('   ⚠️ No grants_backup.json found in backup');
                return { success: true, updatedCount: 0, note: 'No grants backup found' };
            }
        } catch (error) {
            console.error('❌ Error restoring grants:', error.message);
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
                console.log(`⚠️ No session folder found for ${sessionId}, skipping backup`);
                return { success: false, error: 'No session folder found' };
            }

            console.log(`💾 Backing up complete session: ${sessionId}`);
            
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
                        
                        console.log(`   📄 Uploading ${fileInfo.name}...`);
                        
                        const { error } = await this.supabase
                            .storage
                            .from(this.BUCKET_NAME)
                            .upload(supabasePath, fileContent, {
                                contentType: fileInfo.type,
                                upsert: true
                            });
                        
                        if (error) {
                            errors.push(`${fileInfo.name}: ${error.message}`);
                            console.log(`   ❌ Failed: ${fileInfo.name} - ${error.message}`);
                        } else {
                            backedUpFiles++;
                            console.log(`   ✅ ${fileInfo.name} uploaded`);
                        }
                    } catch (error) {
                        errors.push(`${fileInfo.name}: ${error.message}`);
                        console.log(`   ❌ Error: ${fileInfo.name} - ${error.message}`);
                    }
                }
            }

            if (backedUpFiles > 0) {
                console.log(`✅ Complete backup successful for ${sessionId} (${backedUpFiles} files)`);
                
                // Log to database (optional, won't break if fails)
                await this.logBackupToDB(sessionId, 'backup', 'success', backedUpFiles);
                
                return { 
                    success: true, 
                    backedUpFiles, 
                    errors: errors.length > 0 ? errors : null 
                };
            } else {
                console.log(`❌ No files backed up for ${sessionId}`);
                
                // Log failure to database
                await this.logBackupToDB(sessionId, 'backup', 'failed', 0, errors.join(', '));
                
                return { 
                    success: false, 
                    error: 'No files backed up', 
                    errors 
                };
            }

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId}:`, error.message);
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
                console.log(`⚠️ No creds.json found for session ${sessionId}, skipping backup`);
                return { success: false, error: 'No creds.json found' };
            }

            const fileContent = fs.readFileSync(credsPath);
            const fileName = `creds.json`;
            const filePath = `sessions/${sessionId}/${fileName}`;
            
            console.log(`💾 Backing up ${sessionId} to Supabase...`);
            
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .upload(filePath, fileContent, {
                    contentType: 'application/json',
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error) {
                console.log(`❌ Backup upload failed:`, error.message);
                return { success: false, error: error.message };
            }

            console.log(`✅ Backup successful for ${sessionId}`);
            return { success: true, fileId: data.path };

        } catch (error) {
            console.error(`❌ Error backing up ${sessionId}:`, error.message);
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
            
            console.log(`🔄 Restoring ${sessionId} from Supabase...`);
            
            // Download the file
            const { data, error } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .download(filePath);

            if (error) {
                if (error.message.includes('Not Found') || error.message.includes('404')) {
                    console.log(`⚠️ No creds.json found on Supabase for ${sessionId}`);
                    return { success: false, error: 'File not found on Supabase' };
                }
                console.log(`❌ Download error:`, error.message);
                return { success: false, error: error.message };
            }

            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
                console.log(`📁 Created session directory: ${sessionDir}`);
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
                    console.log(`✅ Successfully restored creds.json for ${sessionId} (registered: ${restoredCreds.registered || false})`);
                    return { 
                        success: true, 
                        registered: restoredCreds.registered || false 
                    };
                } catch (error) {
                    console.log(`❌ Error parsing restored creds.json:`, error.message);
                    return { success: false, error: 'Invalid JSON file' };
                }
            } else {
                console.log(`❌ Failed to write creds.json`);
                return { success: false, error: 'File write failed' };
            }

        } catch (error) {
            console.error(`❌ Restore failed for ${sessionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔍 Check if session exists in Supabase Storage
    async checkSessionOnDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { sessionExists: false, error: 'Supabase not authorized' };
            }
            
            console.log(`🔍 Checking session ${sessionId} on Supabase...`);
            
            try {
                const { data, error } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .list(`sessions/${sessionId}`);
                    
                if (error) {
                    if (error.message.includes('Not Found') || error.message.includes('not found')) {
                        console.log(`📭 Session ${sessionId} not found on Supabase`);
                        return { sessionExists: false };
                    }
                    console.log(`❌ Error checking session:`, error.message);
                    return { sessionExists: false, error: error.message };
                }
                
                const sessionExists = data && data.length > 0;
                console.log(`📊 Session ${sessionId} exists on Supabase: ${sessionExists} (${data?.length || 0} files)`);
                return { sessionExists, fileCount: data?.length || 0 };
                
            } catch (error) {
                console.error(`❌ Error checking session ${sessionId}:`, error.message);
                return { sessionExists: false, error: error.message };
            }
        } catch (error) {
            console.error(`❌ Error in checkSessionOnDrive:`, error.message);
            return { sessionExists: false, error: error.message };
        }
    }

    // ❌ Delete session from Supabase + local folder
    async deleteSessionFromDrive(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { success: false, error: 'Supabase not authorized' };
            }
            
            console.log(`🗑️ Deleting session ${sessionId} from Supabase...`);
            
            // Delete all files for this session
            const { data: files, error: listError } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list(`sessions/${sessionId}`);
                
            if (listError && listError.message !== 'Not Found') {
                console.log(`❌ Error listing files:`, listError.message);
                return { success: false, error: listError.message };
            }
            
            if (files && files.length > 0) {
                const filePaths = files.map(file => `sessions/${sessionId}/${file.name}`);
                
                console.log(`   Deleting ${filePaths.length} files...`);
                const { error: deleteError } = await this.supabase
                    .storage
                    .from(this.BUCKET_NAME)
                    .remove(filePaths);
                    
                if (deleteError) {
                    console.log(`❌ Delete error:`, deleteError.message);
                    return { success: false, error: deleteError.message };
                }
                
                console.log(`✅ Successfully deleted ${filePaths.length} files for session ${sessionId}`);
            } else {
                console.log(`⚠️ No files found on Supabase for ${sessionId}`);
            }

            // Delete local session directory
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`🧹 Deleted local session folder for ${sessionId}`);
            }

            return { success: true, filesDeleted: files?.length || 0 };
        } catch (error) {
            console.error(`❌ Error deleting session ${sessionId}:`, error.message);
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
                            console.log(`   ✅ ${sessionId} backed up`);
                        } else {
                            failedCount++;
                            console.log(`   ❌ ${sessionId} failed: ${result?.error || 'Unknown error'}`);
                        }
                    } else {
                        skippedCount++;
                        console.log(`   ⏭️ ${sessionId} - no creds.json, skipping`);
                    }
                } catch (error) {
                    failedCount++;
                    console.error(`   ❌ ${sessionId} error:`, error.message);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`\n📊 Backup Summary:`);
            console.log(`✅ Backed up: ${backedUpCount} session(s)`);
            console.log(`❌ Failed: ${failedCount} session(s)`);
            console.log(`⏭️ Skipped: ${skippedCount} session(s)`);
            console.log(`📁 Total: ${sessions.length} session(s) checked`);
            
            return { 
                success: backedUpCount > 0, 
                backedUp: backedUpCount, 
                failed: failedCount,
                skipped: skippedCount,
                total: sessions.length
            };
        } catch (err) {
            console.error("❌ Auto-backup error:", err.message);
            return { success: false, error: err.message };
        }
    }

    // 🔄 Auto backup ALL data including grants and login history
    async backupAllData() {
        try {
            if (!await this.ensureAuthorization()) {
                console.log('⚠️ Supabase not authorized, skipping backup');
                return { success: false, error: 'Supabase not authorized' };
            }

            console.log('\n' + '='.repeat(60));
            console.log('🔄 STARTING COMPLETE DATA BACKUP');
            console.log('='.repeat(60));
            
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
            console.log('\n📱 1. Backing up sessions...');
            const sessionsResult = await this.backupAllSessions();
            results.sessions = { 
                success: sessionsResult.success, 
                count: sessionsResult.backedUp || 0,
                error: sessionsResult.error
            };
            
            // 2. Backup users.json (includes grants)
            console.log('\n👥 2. Backing up users.json...');
            const usersPath = path.join(__dirname, 'users.json');
            if (fs.existsSync(usersPath)) {
                try {
                    const usersContent = fs.readFileSync(usersPath, 'utf8');
                    await this.uploadToDrive('users.json', usersContent);
                    results.users = { success: true };
                    
                    // Extract and backup grants separately
                    console.log('   Extracting grants from users data...');
                    await this.backupGrants(usersContent);
                    results.grants = { success: true };
                } catch (error) {
                    results.users = { success: false, error: error.message };
                    results.grants = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ users.json not found locally');
                results.users = { success: false, error: 'File not found' };
            }
            
            // 3. Backup tokens.json
            console.log('\n🔑 3. Backing up tokens.json...');
            const tokensPath = path.join(__dirname, 'tokens.json');
            if (fs.existsSync(tokensPath)) {
                try {
                    const tokensContent = fs.readFileSync(tokensPath, 'utf8');
                    await this.uploadToDrive('tokens.json', tokensContent);
                    results.tokens = { success: true };
                } catch (error) {
                    results.tokens = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ tokens.json not found locally');
                results.tokens = { success: false, error: 'File not found' };
            }
            
            // 4. Backup requests.json
            console.log('\n📋 4. Backing up requests.json...');
            const requestsPath = path.join(__dirname, 'requests.json');
            if (fs.existsSync(requestsPath)) {
                try {
                    const requestsContent = fs.readFileSync(requestsPath, 'utf8');
                    await this.uploadToDrive('requests.json', requestsContent);
                    results.requests = { success: true };
                } catch (error) {
                    results.requests = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ requests.json not found locally');
                results.requests = { success: false, error: 'File not found' };
            }
            
            // 5. Backup login history
            console.log('\n📝 5. Backing up login history...');
            const loginHistoryPath = path.join(__dirname, 'login_history.json');
            if (fs.existsSync(loginHistoryPath)) {
                try {
                    const loginHistoryContent = fs.readFileSync(loginHistoryPath, 'utf8');
                    await this.uploadToDrive('login_history.json', loginHistoryContent);
                    results.loginHistory = { success: true };
                } catch (error) {
                    results.loginHistory = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ login_history.json not found locally, creating initial...');
                try {
                    const initialLoginHistory = {
                        admin_logins: [],
                        user_logins: []
                    };
                    fs.writeFileSync(loginHistoryPath, JSON.stringify(initialLoginHistory, null, 2));
                    await this.uploadToDrive('login_history.json', JSON.stringify(initialLoginHistory, null, 2));
                    results.loginHistory = { success: true, created: true };
                } catch (error) {
                    results.loginHistory = { success: false, error: error.message };
                }
            }
            
            // 6. Backup admin settings
            console.log('\n⚙️ 6. Backing up admin settings...');
            const adminSettingsPath = path.join(__dirname, 'admin_settings.json');
            if (fs.existsSync(adminSettingsPath)) {
                try {
                    const adminSettingsContent = fs.readFileSync(adminSettingsPath, 'utf8');
                    await this.uploadToDrive('admin_settings.json', adminSettingsContent);
                    results.adminSettings = { success: true };
                } catch (error) {
                    results.adminSettings = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ admin_settings.json not found locally');
                results.adminSettings = { success: false, error: 'File not found' };
            }
            
            // 7. Backup premium data
            console.log('\n🎖️ 7. Backing up premium data...');
            const premiumPath = path.join(__dirname, 'data', 'premium.json');
            if (fs.existsSync(premiumPath)) {
                try {
                    const premiumContent = fs.readFileSync(premiumPath, 'utf8');
                    await this.uploadToDrive('premium.json', premiumContent);
                    results.premium = { success: true };
                } catch (error) {
                    results.premium = { success: false, error: error.message };
                }
            } else {
                console.log('   ⚠️ premium.json not found locally');
                results.premium = { success: false, error: 'File not found' };
            }
            
            console.log('\n' + '='.repeat(60));
            console.log('✅ COMPLETE DATA BACKUP ATTEMPT FINISHED');
            console.log('='.repeat(60));
            
            // Summary
            const successful = Object.values(results).filter(r => r.success).length;
            const total = Object.values(results).length;
            
            console.log(`\n📊 Backup Results: ${successful}/${total} successful`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            Object.entries(results).forEach(([key, value]) => {
                const status = value.success ? '✅' : '❌';
                const extra = key === 'sessions' && value.count > 0 ? ` (${value.count} sessions)` : '';
                console.log(`${status} ${key.padEnd(15)} ${value.success ? 'Success' + extra : 'Failed: ' + (value.error || 'Unknown')}`);
            });
            
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
            console.error('❌ Complete backup failed:', error.message);
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
            console.log('   📊 Extracting grants information...');
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
            
            console.log(`   ✅ Extracted and backed up ${Object.keys(grants).length} grants`);
            return { success: true, count: Object.keys(grants).length };
            
        } catch (error) {
            console.error('❌ Error backing up grants:', error.message);
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
            console.error('❌ Error getting location from IP:', error.message);
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
            loginHistory.admin_logins.unshift(loginRecord); // Add to beginning
            loginHistory.admin_logins = loginHistory.admin_logins.slice(0, 100); // Keep only last 100
            
            // Save locally
            fs.writeFileSync(loginHistoryPath, JSON.stringify(loginHistory, null, 2));
            
            // Backup to Supabase
            if (await this.ensureAuthorization()) {
                await this.uploadToDrive('login_history.json', JSON.stringify(loginHistory, null, 2));
                console.log(`✅ Recorded admin login from ${ip} (${location ? location.country : 'Unknown'}) to cloud`);
            } else {
                console.log(`✅ Recorded admin login from ${ip} (${location ? location.country : 'Unknown'}) locally only`);
            }
            
            return { success: true, location };
            
        } catch (error) {
            console.error('❌ Error recording admin login:', error.message);
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
            loginHistory.user_logins = loginHistory.user_logins.slice(0, 500); // Keep only last 500
            
            // Save locally
            fs.writeFileSync(loginHistoryPath, JSON.stringify(loginHistory, null, 2));
            
            // Backup to Supabase
            if (await this.ensureAuthorization()) {
                await this.uploadToDrive('login_history.json', JSON.stringify(loginHistory, null, 2));
                console.log(`✅ Recorded user login from ${email} (${location ? location.country : 'Unknown'}) to cloud`);
            } else {
                console.log(`✅ Recorded user login from ${email} (${location ? location.country : 'Unknown'}) locally only`);
            }
            
            return { success: true, location };
            
        } catch (error) {
            console.error('❌ Error recording user login:', error.message);
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
            
            // Return limited number of logins
            return { 
                success: true, 
                logins: adminLogins.slice(0, limit),
                total: adminLogins.length
            };
            
        } catch (error) {
            console.error('❌ Error getting admin login history:', error.message);
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
            
            // Return limited number of logins
            return { 
                success: true, 
                logins: userLogins.slice(0, limit),
                total: userLogins.length
            };
            
        } catch (error) {
            console.error('❌ Error getting user login history:', error.message);
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
            console.error('❌ Error getting login stats:', error.message);
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
                console.log(`✅ Cleaned up ${deletedCount} old login records (cloud backup updated)`);
            } else {
                console.log(`✅ Cleaned up ${deletedCount} old login records (local only)`);
            }
            
            return { success: true, deleted: deletedCount };
            
        } catch (error) {
            console.error('❌ Error cleaning up login history:', error.message);
            return { success: false, error: error.message };
        }
    }

    // 📊 Get Supabase storage stats
    async getStorageStats() {
        try {
            if (!await this.ensureAuthorization()) {
                return { error: 'Supabase not authorized' };
            }
            
            console.log('📊 Getting Supabase storage statistics...');
            
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
                    console.log(`   Found ${sessionSubfolders.length} session folders`);
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
            
            console.log(`   Total files: ${totalFiles}`);
            console.log(`   Session files: ${sessionFiles}`);
            console.log(`   Data files: ${dataFiles}`);
            
            return {
                totalFiles,
                sessionFiles,
                dataFiles,
                sessions: Math.floor(sessionFiles / 4), // Each session has ~4 files
                bucket: this.BUCKET_NAME
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

    // 🆕 Function to restore and check if session exists on Supabase
    async restoreAndCheckSession(sessionId) {
        try {
            if (!await this.ensureAuthorization()) {
                return { exists: false, restored: false, error: 'Supabase not authorized' };
            }

            console.log(`🔍 Checking and restoring session: ${sessionId}`);
            
            // Check if session exists on Supabase
            const checkResult = await this.checkSessionOnDrive(sessionId);
            
            if (checkResult.sessionExists) {
                // Try to restore the session
                console.log(`   Session exists on Supabase, attempting restore...`);
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

    // 🧹 Cleanup old backups (keep last N backups per session)
    async cleanupOldBackups(daysToKeep = 7) {
        try {
            if (!await this.ensureAuthorization()) {
                console.log('⚠️ Supabase not authorized, skipping cleanup');
                return { success: false, error: 'Supabase not authorized' };
            }

            console.log(`🧹 Cleaning up backups older than ${daysToKeep} days...`);
            
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            let deletedCount = 0;
            
            // Get all sessions
            const { data: sessions } = await this.supabase
                .storage
                .from(this.BUCKET_NAME)
                .list('sessions');
            
            if (!sessions) {
                console.log('📭 No sessions found to cleanup');
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
                    
                    // Filter old backup files (not the main files)
                    const oldBackups = files.filter(file => {
                        // Check if it's a backup file (has timestamp in name or is old version)
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
                            console.log(`   Deleted ${oldBackups.length} old backups for session ${session.name}`);
                        }
                    }
                    
                } catch (error) {
                    console.log(`   ⚠️ Error cleaning session ${session.name}:`, error.message);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`✅ Cleanup completed: ${deletedCount} old backup files deleted`);
            return { success: true, deleted: deletedCount };
            
        } catch (error) {
            console.error('❌ Error cleaning up old backups:', error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔄 Manual sync: Upload all local data to Supabase
    async manualSyncToCloud() {
        try {
            console.log('\n' + '='.repeat(60));
            console.log('☁️ MANUAL SYNC TO CLOUD');
            console.log('='.repeat(60));
            
            if (!await this.ensureAuthorization()) {
                console.log('❌ Cannot sync: Supabase not authorized');
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const result = await this.backupAllData();
            
            if (result.success) {
                console.log('\n✅ Manual sync completed successfully!');
                console.log(`📊 ${result.summary.successful}/${result.summary.total} items synced`);
            } else {
                console.log('\n⚠️ Manual sync completed with some errors');
                console.log(`📊 ${result.summary?.successful || 0}/${result.summary?.total || 0} items synced`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Manual sync failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // 🔄 Manual restore: Download all data from Supabase
    async manualRestoreFromCloud() {
        try {
            console.log('\n' + '='.repeat(60));
            console.log('☁️ MANUAL RESTORE FROM CLOUD');
            console.log('='.repeat(60));
            
            if (!await this.ensureAuthorization()) {
                console.log('❌ Cannot restore: Supabase not authorized');
                return { success: false, error: 'Supabase not authorized' };
            }
            
            const result = await this.restoreAllData();
            
            if (result.success) {
                console.log('\n✅ Manual restore completed successfully!');
                console.log(`📊 ${result.restoredItems} items restored`);
            } else {
                console.log('\n⚠️ Manual restore completed with some errors');
                console.log(`📊 ${result.restoredItems || 0} items restored`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Manual restore failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const backupManager = new BackupManager();

// If this file is run directly, test the connection and show options
if (require.main === module) {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 TRACLE - LITE SUPABASE BACKUP TOOL');
    console.log('='.repeat(60));
    
    console.log('\n📋 Environment Check:');
    console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`SUPABASE_KEY: ${process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`SUPABASE_BUCKET: ${process.env.SUPABASE_BUCKET || 'tracle-backups (default)'}`);
    
    if (!backupManager.isConfigured()) {
        console.log('\n❌ Supabase not configured properly.');
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
    
    console.log('\n🔧 Testing Supabase connection...');
    
    // Test connection
    backupManager.initializeSupabase()
        .then(async (authorized) => {
            if (authorized) {
                console.log('\n✅ Supabase is properly configured and connected!');
                
                // Show available commands
                console.log('\n📚 Available Commands:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('1. Sync all data to cloud');
                console.log('2. Restore all data from cloud');
                console.log('3. Get storage statistics');
                console.log('4. Test session backup/restore');
                console.log('5. Cleanup old backups');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
            } else {
                console.log('\n⚠️ Supabase configuration issue detected.');
                console.log('Check your credentials and network connection.');
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Connection test failed:', error.message);
            process.exit(1);
        });
}

module.exports = backupManager;