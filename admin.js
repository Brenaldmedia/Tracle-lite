// FILE: admin.js BACKEND ADMIN ROUTES AND LOGIC (UPDATED WITH LOGIN HISTORY)
const crypto = require('crypto');
const tokenManager = require('./token');
const path = require('path');
const fs = require('fs-extra');
const backupManager = require('./backup'); // Import backup manager

class AdminManager {
    constructor() {
        // Get admin credentials from environment variables
        this.adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        this.adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        this.adminLoginCodes = new Map();
        
        // Check if environment variables are set
        if (!this.adminEmail || !this.adminPassword) {
            console.error('❌ ERROR: Admin credentials not set in environment variables');
            console.error('   Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
            console.error('   Example:');
            console.error('   export ADMIN_EMAIL=your-email@gmail.com');
            console.error('   export ADMIN_PASSWORD=your-password');
        } else {
            console.log('✅ Admin credentials loaded from environment variables');
            console.log('📧 Admin email:', this.adminEmail);
        }
    }

    // Admin authentication middleware - FIXED: More flexible token verification
    verifyAdminToken(req, res, next) {
        try {
            // Try multiple ways to get the token
            let token = req.headers.authorization?.replace('Bearer ', '');
            
            // If no token in header, check query parameters or cookies
            if (!token) {
                token = req.query.token || req.cookies?.admin_token;
            }
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided. Please login again.'
                });
            }
            
            // Simple token check - in production use JWT
            if (token && token.startsWith('admin_')) {
                console.log('✅ Admin token verified');
                req.adminToken = token;
                next();
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid admin token'
                });
            }
            
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({
                success: false,
                message: 'Token verification failed'
            });
        }
    }

    // Generate admin login token - FIXED: More secure
    generateAdminToken() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        return `admin_${timestamp}_${random}`;
    }

    // ===== FIXED: Get Active Sessions Function =====
    async getActiveSessions() {
        try {
            const sessionsPath = path.join(__dirname, 'sessions');
            const activeSessions = {};
            
            if (!fs.existsSync(sessionsPath)) {
                return activeSessions;
            }
            
            const userFolders = fs.readdirSync(sessionsPath);
            
            // Group sessions by email
            const sessionsByEmail = {};
            
            for (const userNumber of userFolders) {
                const userInfoPath = path.join(sessionsPath, userNumber, 'user_info.json');
                const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                
                if (fs.existsSync(userInfoPath) && fs.existsSync(credsPath)) {
                    try {
                        const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                        
                        if (!userInfo.email) continue;
                        
                        // Get session status from active connections
                        const isActive = creds.registered || false;
                        
                        if (!sessionsByEmail[userInfo.email]) {
                            sessionsByEmail[userInfo.email] = {
                                email: userInfo.email,
                                sessions: [],
                                totalSessions: 0,
                                connectedSessions: 0,
                                lastActivity: null
                            };
                        }
                        
                        const sessionInfo = {
                            sessionNumber: userNumber,
                            token: userInfo.token,
                            createdAt: userInfo.createdAt,
                            lastActivity: userInfo.lastActivity,
                            isActive: isActive,
                            isConnected: false // Will be updated by server.js
                        };
                        
                        sessionsByEmail[userInfo.email].sessions.push(sessionInfo);
                        sessionsByEmail[userInfo.email].totalSessions++;
                        
                        if (isActive) {
                            sessionsByEmail[userInfo.email].connectedSessions++;
                        }
                        
                        // Update last activity
                        if (userInfo.lastActivity) {
                            const lastActivity = new Date(userInfo.lastActivity);
                            if (!sessionsByEmail[userInfo.email].lastActivity || 
                                lastActivity > new Date(sessionsByEmail[userInfo.email].lastActivity)) {
                                sessionsByEmail[userInfo.email].lastActivity = userInfo.lastActivity;
                            }
                        }
                        
                    } catch (error) {
                        console.error(`Error reading session ${userNumber}:`, error);
                    }
                }
            }
            
            return sessionsByEmail;
            
        } catch (error) {
            console.error('Error getting active sessions:', error);
            return {};
        }
    }

    // ===== FIXED: Delete Specific Session =====
    async deleteUserSession(userNumber) {
        try {
            const sessionPath = path.join(__dirname, 'sessions', userNumber);
            
            if (fs.existsSync(sessionPath)) {
                // Delete session folder
                await fs.remove(sessionPath);
                console.log(`✅ Session folder deleted: ${sessionPath}`);
                
                return {
                    success: true,
                    message: `Session ${userNumber} deleted successfully`
                };
            } else {
                return {
                    success: false,
                    message: `Session ${userNumber} not found`
                };
            }
            
        } catch (error) {
            console.error('Error deleting session:', error);
            return {
                success: false,
                message: `Failed to delete session: ${error.message}`
            };
        }
    }

    // ===== FIXED: Get Session Details Function =====
    async getSessionDetails(sessionNumber) {
        try {
            const sessionPath = path.join(__dirname, 'sessions', sessionNumber);
            
            if (!fs.existsSync(sessionPath)) {
                return {
                    success: false,
                    message: 'Session not found'
                };
            }
            
            const userInfoPath = path.join(sessionPath, 'user_info.json');
            const credsPath = path.join(sessionPath, 'creds.json');
            const settingsPath = path.join(sessionPath, 'settings.json');
            
            let userInfo = {};
            let creds = {};
            let settings = {};
            
            try {
                if (fs.existsSync(userInfoPath)) {
                    userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                }
                
                if (fs.existsSync(credsPath)) {
                    creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                }
                
                if (fs.existsSync(settingsPath)) {
                    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                }
            } catch (error) {
                console.error(`Error reading session files for ${sessionNumber}:`, error);
            }
            
            return {
                success: true,
                session: {
                    sessionNumber,
                    userInfo,
                    creds,
                    settings
                }
            };
            
        } catch (error) {
            console.error('Error getting session details:', error);
            return {
                success: false,
                message: 'Failed to get session details'
            };
        }
    }

    // Setup admin routes - FIXED: Added proper error handling
    setupRoutes(app) {
        // FIXED: Admin login with email/password - Improved validation
        app.post('/api/admin/verify-login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                const userAgent = req.headers['user-agent'] || 'Unknown';
                
                console.log('📧 Login attempt:', { email, passwordLength: password?.length });
                
                if (!email || !password) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email and password are required' 
                    });
                }

                // Check if environment variables are set
                if (!this.adminEmail || !this.adminPassword) {
                    console.error('❌ Admin credentials not configured');
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Admin system not configured. Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.' 
                    });
                }

                // Trim and normalize inputs
                const trimmedEmail = email.trim().toLowerCase();
                const trimmedPassword = password.trim();
                const expectedEmail = this.adminEmail.trim().toLowerCase();
                
                console.log('🔍 Checking credentials:', {
                    providedEmail: trimmedEmail,
                    expectedEmail: expectedEmail,
                    passwordMatch: trimmedPassword === this.adminPassword
                });
                
                // Check credentials with case-insensitive email comparison
                if (trimmedEmail !== expectedEmail) {
                    console.log('❌ Email mismatch');
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid email or password' 
                    });
                }

                if (trimmedPassword !== this.adminPassword) {
                    console.log('❌ Password mismatch');
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid email or password' 
                    });
                }

                // Generate admin token
                const token = this.generateAdminToken();
                
                console.log('✅ Login successful, token generated');
                
                // Record admin login with location
                await backupManager.recordAdminLogin(email, clientIP, userAgent);
                
                res.json({ 
                    success: true, 
                    message: 'Login successful',
                    token: token,
                    admin: {
                        email: email,
                        name: 'Admin'
                    }
                });
                
            } catch (error) {
                console.error('Error verifying admin login:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Login verification failed' 
                });
            }
        });

        // ===== NEW: Get Admin Login History =====
        app.get('/api/admin/login-history', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { limit = 50, type = 'admin' } = req.query;
                
                let history;
                if (type === 'admin') {
                    history = await backupManager.getAdminLoginHistory(parseInt(limit));
                } else {
                    history = await backupManager.getUserLoginHistory(parseInt(limit));
                }
                
                res.json(history);
                
            } catch (error) {
                console.error('Error getting login history:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get login history'
                });
            }
        });

        // ===== NEW: Get Login Statistics =====
        app.get('/api/admin/login-stats', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const stats = await backupManager.getLoginStats();
                res.json(stats);
            } catch (error) {
                console.error('Error getting login stats:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get login statistics'
                });
            }
        });

        // ===== NEW: Cleanup Login History =====
        app.post('/api/admin/cleanup-login-history', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { days = 30 } = req.body;
                const result = await backupManager.cleanupLoginHistory(parseInt(days));
                res.json(result);
            } catch (error) {
                console.error('Error cleaning up login history:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to cleanup login history'
                });
            }
        });

        // ===== FIXED: Get Active Sessions Endpoint =====
        app.get('/api/admin/sessions', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                // Get sessions grouped by email
                const sessions = await this.getActiveSessions();
                
                // Get active connections from server.js
                const activeConnections = req.app.locals?.activeConnections || new Map();
                
                // Update connection status for each session - FIXED: Don't include connectionData in response
                Object.keys(sessions).forEach(email => {
                    sessions[email].sessions.forEach(session => {
                        const connectionData = activeConnections.get(session.sessionNumber);
                        session.isConnected = connectionData ? connectionData.isConnected : false;
                        // DO NOT include connectionData in the response to avoid circular structure
                    });
                    
                    // Update counts
                    sessions[email].connectedSessions = sessions[email].sessions.filter(s => s.isConnected).length;
                });
                
                // Calculate totals
                const totalUsers = Object.keys(sessions).length;
                const totalSessions = Object.values(sessions).reduce((sum, user) => sum + user.totalSessions, 0);
                const totalConnected = Object.values(sessions).reduce((sum, user) => sum + user.connectedSessions, 0);
                
                console.log(`🔍 Checking ${totalConnected} active connections out of ${totalSessions} total sessions...`);
                
                res.json({
                    success: true,
                    sessions: sessions,
                    totalUsers: totalUsers,
                    totalSessions: totalSessions,
                    totalConnected: totalConnected
                });
                
            } catch (error) {
                console.error('Error getting active sessions:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get active sessions: ' + error.message
                });
            }
        });

        // ===== FIXED: Delete Session Endpoint =====
        app.delete('/api/admin/session/:sessionNumber', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { sessionNumber } = req.params;
                
                if (!sessionNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'Session number is required'
                    });
                }
                
                // Get active connections from server.js
                const activeConnections = req.app.locals?.activeConnections;
                if (activeConnections && activeConnections.has(sessionNumber)) {
                    // Clean up the active connection
                    const connectionData = activeConnections.get(sessionNumber);
                    if (connectionData.conn) {
                        try {
                            connectionData.conn.end(undefined);
                        } catch (error) {
                            console.error('Error closing socket:', error);
                        }
                    }
                    activeConnections.delete(sessionNumber);
                }
                
                // Delete the session
                const result = await this.deleteUserSession(sessionNumber);
                
                if (result.success) {
                    res.json({
                        success: true,
                        message: `Session ${sessionNumber} deleted successfully`
                    });
                } else {
                    res.status(404).json(result);
                }
                
            } catch (error) {
                console.error('Error deleting session:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete session'
                });
            }
        });

        // ===== FIXED: Search Sessions Endpoint =====
        app.post('/api/admin/sessions/search', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { query } = req.body;
                
                if (!query) {
                    return res.status(400).json({
                        success: false,
                        message: 'Search query is required'
                    });
                }
                
                const allSessions = await this.getActiveSessions();
                const activeConnections = req.app.locals?.activeConnections || new Map();
                const searchResults = {};
                
                // Filter sessions by email or session number
                Object.keys(allSessions).forEach(email => {
                    // Check if email matches query
                    const emailMatches = email.toLowerCase().includes(query.toLowerCase());
                    
                    // Check if any session number matches query
                    const sessionMatches = allSessions[email].sessions.some(session => 
                        session.sessionNumber.toLowerCase().includes(query.toLowerCase())
                    );
                    
                    if (emailMatches || sessionMatches) {
                        searchResults[email] = { ...allSessions[email] };
                        
                        // Update connection status
                        searchResults[email].sessions.forEach(session => {
                            const connectionData = activeConnections.get(session.sessionNumber);
                            session.isConnected = connectionData ? connectionData.isConnected : false;
                        });
                        
                        searchResults[email].connectedSessions = searchResults[email].sessions.filter(s => s.isConnected).length;
                    }
                });
                
                res.json({
                    success: true,
                    sessions: searchResults,
                    totalResults: Object.keys(searchResults).length
                });
                
            } catch (error) {
                console.error('Error searching sessions:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to search sessions'
                });
            }
        });

        // ===== FIXED: Get Session Details Endpoint =====
        app.get('/api/admin/session/details/:sessionNumber', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { sessionNumber } = req.params;
                
                if (!sessionNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'Session number is required'
                    });
                }
                
                const sessionPath = path.join(__dirname, 'sessions', sessionNumber);
                const userInfoPath = path.join(sessionPath, 'user_info.json');
                const credsPath = path.join(sessionPath, 'creds.json');
                const settingsPath = path.join(sessionPath, 'settings.json');
                
                if (!fs.existsSync(sessionPath)) {
                    return res.status(404).json({
                        success: false,
                        message: 'Session not found'
                    });
                }
                
                let userInfo = {};
                let creds = {};
                let settings = {};
                
                try {
                    if (fs.existsSync(userInfoPath)) {
                        userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                    }
                    
                    if (fs.existsSync(credsPath)) {
                        creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    }
                    
                    if (fs.existsSync(settingsPath)) {
                        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                    }
                } catch (error) {
                    console.error(`Error reading session files for ${sessionNumber}:`, error);
                }
                
                // Get connection status
                const activeConnections = req.app.locals?.activeConnections || new Map();
                const connectionData = activeConnections.get(sessionNumber);
                
                // Get user token info
                const users = await tokenManager.getAllUsers();
                const userTokenInfo = users[userInfo.email] || {};
                
                // FIXED: Create a clean object without circular references
                const sessionDetails = {
                    sessionNumber: sessionNumber,
                    userInfo: userInfo,
                    creds: {
                        registered: creds.registered || false,
                        me: creds.me || null
                    },
                    settings: settings,
                    connection: {
                        isConnected: connectionData ? connectionData.isConnected : false,
                        lastActivity: connectionData ? connectionData.lastActivity : null,
                        connectedAt: connectionData ? connectionData.connectedAt : null
                    },
                    tokenInfo: {
                        token: userTokenInfo.token || null,
                        tokenBalance: userTokenInfo.tokenBalance || 0,
                        status: userTokenInfo.status || 'unknown',
                        paid: userTokenInfo.paid || false,
                        lastRequest: userTokenInfo.lastRequest || null
                    }
                };
                
                res.json({
                    success: true,
                    sessionDetails: sessionDetails
                });
                
            } catch (error) {
                console.error('Error getting session details:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get session details'
                });
            }
        });

        // Send password reminder - FIXED: Better error handling
        app.post('/api/admin/send-reminder', async (req, res) => {
            try {
                const { email } = req.body;
                
                if (!email) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email is required' 
                    });
                }

                // Check if admin email is configured
                if (!this.adminEmail) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Admin email not configured' 
                    });
                }

                // Send reminder email
                const emailHtml = `
                    <h2>🔐 Admin Password Reminder</h2>
                    <p>Your admin credentials reminder:</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p><strong>Admin Email:</strong> ${this.adminEmail}</p>
                        <p><strong>Login URL:</strong> <a href="${req.protocol}://${req.get('host')}/admin.html">${req.protocol}://${req.get('host')}/admin.html</a></p>
                    </div>
                    <p><i>If you didn't request this reminder, please ignore this email.</i></p>
                    <p><strong>Note:</strong> For security reasons, the password cannot be sent via email. Contact the system administrator if you've forgotten your password.</p>
                `;
                
                const emailSent = await tokenManager.sendEmail(
                    this.adminEmail,
                    '🔐 Admin Password Reminder',
                    emailHtml
                );

                if (emailSent) {
                    res.json({ 
                        success: true, 
                        message: 'Password reminder sent to admin email' 
                    });
                } else {
                    res.json({ 
                        success: false, 
                        message: 'Failed to send email' 
                    });
                }
            } catch (error) {
                console.error('Error sending password reminder:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to send reminder' 
                });
            }
        });

        // Verify token route (for checking if token is still valid) - FIXED
        app.get('/api/admin/verify-token', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                res.json({
                    success: true,
                    message: 'Token is valid',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error verifying token:', error);
                res.status(401).json({
                    success: false,
                    message: 'Token verification failed'
                });
            }
        });

        // Test route - no authentication required - FIXED: Better error handling
        app.get('/api/admin/test', async (req, res) => {
            try {
                // Test getting stats directly
                const stats = await tokenManager.getStats();
                
                res.json({
                    success: true,
                    message: 'Admin API is working',
                    stats: stats,
                    timestamp: new Date().toISOString(),
                    adminConfigured: !!this.adminEmail
                });
                
            } catch (error) {
                console.error('Test route error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Test failed: ' + error.message
                });
            }
        });

        // Admin dashboard routes (protected)
        app.get('/api/admin/stats', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                console.log('📊 Fetching admin stats...');
                const stats = await tokenManager.getStats();
                
                console.log('✅ Stats fetched:', stats);
                
                res.json({
                    success: true,
                    stats: stats
                });
                
            } catch (error) {
                console.error('❌ Error getting admin stats:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get stats: ' + error.message
                });
            }
        });

        // Get all users
        app.get('/api/admin/users', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const users = await tokenManager.getAllUsers();
                
                res.json({
                    success: true,
                    users: users
                });
                
            } catch (error) {
                console.error('Error getting users:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get users'
                });
            }
        });

        // Get user details
        app.get('/api/admin/user/:email', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email } = req.params;
                const userDetails = await tokenManager.getUserDetails(email);
                
                if (userDetails.found) {
                    res.json({
                        success: true,
                        userDetails: userDetails
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
            } catch (error) {
                console.error('Error getting user details:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get user details'
                });
            }
        });

        // Update user payment status
        app.post('/api/admin/user/payment', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, paid } = req.body;
                
                const result = await tokenManager.updateUserPaymentStatus(email, paid);
                
                res.json(result);
                
            } catch (error) {
                console.error('Error updating payment status:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update payment status'
                });
            }
        });

        // Update user details (status, paid, etc.) - FIXED
        app.post('/api/admin/user/update', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, status, paid, tokenStatus } = req.body;
                
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is required'
                    });
                }

                const users = await tokenManager.getAllUsers();
                
                if (!users[email]) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Update user data
                if (status !== undefined) {
                    users[email].status = status;
                }
                
                if (paid !== undefined) {
                    users[email].paid = paid;
                    
                    // If marking as paid, ensure status is approved
                    if (paid && users[email].status === 'pending') {
                        users[email].status = 'approved';
                    }
                }
                
                // Update token status
                if (tokenStatus !== undefined) {
                    if (tokenStatus === 'free') {
                        users[email].freeToken = true;
                        users[email].paid = false;
                    } else if (tokenStatus === 'paid') {
                        users[email].freeToken = false;
                        users[email].paid = true;
                    } else if (tokenStatus === 'terminated') {
                        // Terminate the token
                        await tokenManager.terminateUserToken(email);
                    }
                }
                
                users[email].lastUpdated = new Date().toISOString();
                
                await tokenManager.saveUsers(users);
                
                res.json({
                    success: true,
                    message: 'User updated successfully',
                    user: users[email]
                });
                
            } catch (error) {
                console.error('Error updating user:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update user'
                });
            }
        });

        // ===== FIXED: Update User Grant Endpoint =====
        app.post('/api/admin/user/update-grant', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, maxSessions, grantType, grantUpdated } = req.body;
                
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is required'
                    });
                }

                const users = await tokenManager.getAllUsers();
                
                if (!users[email]) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Update user's grant information
                if (maxSessions !== undefined) {
                    users[email].maxSessions = parseInt(maxSessions);
                }
                
                if (grantType !== undefined) {
                    users[email].grantType = grantType;
                    if (grantType === 'free') {
                        users[email].freeToken = true;
                        users[email].paid = false;
                    } else if (grantType === 'paid') {
                        users[email].freeToken = false;
                        users[email].paid = true;
                    }
                }
                
                if (grantUpdated !== undefined) {
                    users[email].grantUpdated = grantUpdated;
                }
                
                users[email].lastUpdated = new Date().toISOString();
                
                await tokenManager.saveUsers(users);
                
                res.json({
                    success: true,
                    message: 'User grant updated successfully',
                    user: users[email]
                });
                
            } catch (error) {
                console.error('Error updating user grant:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update user grant'
                });
            }
        });

        // Grant free tokens to user
        app.post('/api/admin/user/grant-tokens', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, amount, free } = req.body;
                
                if (!email || !amount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email and amount are required'
                    });
                }

                const users = await tokenManager.getAllUsers();
                
                if (!users[email]) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Initialize token balance if not exists
                if (!users[email].tokenBalance) {
                    users[email].tokenBalance = 0;
                }
                
                if (!users[email].freeTokensGranted) {
                    users[email].freeTokensGranted = 0;
                }

                // Add tokens
                const tokenAmount = parseInt(amount);
                users[email].tokenBalance += tokenAmount;
                
                if (free) {
                    users[email].freeTokensGranted += tokenAmount;
                }
                
                users[email].lastUpdated = new Date().toISOString();
                
                await tokenManager.saveUsers(users);
                
                res.json({
                    success: true,
                    message: `Granted ${amount} ${free ? 'free ' : ''}tokens to ${email}`,
                    newBalance: users[email].tokenBalance,
                    free: free
                });
                
            } catch (error) {
                console.error('Error granting tokens:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to grant tokens'
                });
            }
        });

        // Delete user
        app.delete('/api/admin/user/:email', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email } = req.params;
                
                const result = await tokenManager.deleteUser(email);
                
                res.json(result);
                
            } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete user'
                });
            }
        });

        // Get all tokens
        app.get('/api/admin/tokens', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const tokens = await tokenManager.getAllTokens();
                
                res.json({
                    success: true,
                    tokens: tokens
                });
                
            } catch (error) {
                console.error('Error getting tokens:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get tokens'
                });
            }
        });

        // Generate free token endpoint - FIXED
        app.post('/api/admin/token/generate-free', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, free, sendEmail = true } = req.body;
                
                const result = await tokenManager.generateTokenForEmail(email, true, free || true);
                
                if (result.success) {
                    // Update user as approved but not paid for free tokens
                    const users = await tokenManager.getAllUsers();
                    if (users[email]) {
                        users[email].status = 'approved';
                        users[email].paid = false;
                        users[email].freeToken = true;
                        users[email].lastUpdated = new Date().toISOString();
                        await tokenManager.saveUsers(users);
                    }
                    
                    // Send email if requested
                    if (sendEmail && result.token) {
                        const emailHtml = `
                            <h2>🎉 Your Free Token is Ready!</h2>
                            <p>You have been granted a free token by the administrator!</p>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: #8b5cf6; font-family: monospace;">${result.token}</h3>
                            </div>
                            <p><strong>Instructions:</strong></p>
                            <ol>
                                <li>Go to the website</li>
                                <li>Enter this token in the login section</li>
                                <li>Access all premium features immediately</li>
                            </ol>
                            <p><strong>Token Details:</strong></p>
                            <ul>
                                <li>Created: ${new Date().toLocaleString()}</li>
                                <li>Status: Active ✅</li>
                                <li>Type: Free Token 🎁</li>
                            </ul>
                        `;
                        
                        await tokenManager.sendEmail(email, '🎉 Your Free Token is Ready!', emailHtml);
                    }
                    
                    res.json({
                        success: true,
                        message: 'Free token generated successfully',
                        token: result.token,
                        isFreeToken: true
                    });
                } else {
                    res.status(400).json(result);
                }
                
            } catch (error) {
                console.error('Error generating free token:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to generate free token'
                });
            }
        });

        // Generate token with email option - FIXED
        app.post('/api/admin/token/generate', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, paid, free, sendEmail = true } = req.body;
                
                const isFreeToken = free || !paid;
                
                const result = await tokenManager.generateTokenForEmail(email, true, isFreeToken);
                
                if (result.success) {
                    // Update payment status if specified
                    if (paid !== undefined) {
                        await tokenManager.updateUserPaymentStatus(email, paid && !isFreeToken);
                    }
                    
                    // Send email if requested
                    if (sendEmail && result.token) {
                        const tokenType = isFreeToken ? "Free Token" : "Paid Token";
                        const subject = isFreeToken ? 
                            '🎉 Your Free Token is Ready!' : 
                            '🎉 Your Token is Approved!';
                        
                        const emailHtml = `
                            <h2>${isFreeToken ? '🎉' : '✅'} ${subject}</h2>
                            <p>${isFreeToken ? 'You have been granted a free token!' : 'Your payment has been verified and token is approved!'}</p>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: #6366f1; font-family: monospace;">${result.token}</h3>
                            </div>
                            <p><strong>Token Details:</strong></p>
                            <ul>
                                <li>Type: ${tokenType}</li>
                                <li>Status: Active ✅</li>
                                <li>Created: ${new Date().toLocaleString()}</li>
                            </ul>
                        `;
                        
                        await tokenManager.sendEmail(email, subject, emailHtml);
                    }
                    
                    res.json(result);
                } else {
                    res.status(400).json(result);
                }
                
            } catch (error) {
                console.error('Error generating token:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to generate token'
                });
            }
        });

        // Terminate token endpoint - FIXED
        app.post('/api/admin/token/terminate', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email } = req.body;
                
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is required'
                    });
                }

                const result = await tokenManager.terminateUserToken(email);
                
                if (result.success) {
                    // Send termination email to user
                    const terminationHtml = `
                        <h2 style="color: #ef4444;">⚠️ Token Terminated</h2>
                        <p>Your token has been terminated by the administrator.</p>
                        <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #ef4444;">
                            <p><strong>Reason:</strong> Administrative action</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Status:</strong> Token revoked</p>
                        </div>
                        <p>If you believe this was done in error, please contact the administrator.</p>
                        <p><strong>Contact Admin:</strong> ${this.adminEmail}</p>
                    `;
                    
                    await tokenManager.sendEmail(email, '⚠️ Token Terminated', terminationHtml);
                }
                
                res.json(result);
                
            } catch (error) {
                console.error('Error terminating token:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to terminate token'
                });
            }
        });

        // Get all requests
        app.get('/api/admin/requests', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const requests = await tokenManager.getAllRequests();
                
                res.json({
                    success: true,
                    requests: requests
                });
                
            } catch (error) {
                console.error('Error getting requests:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get requests'
                });
            }
        });

        // ===== ENHANCED: Backup data with grants and login history =====
        app.post('/api/admin/backup', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                console.log('🔄 Starting comprehensive backup including grants and login history...');
                
                const result = await backupManager.backupAllData();
                
                res.json(result);
                
            } catch (error) {
                console.error('Error backing up data:', error);
                res.status(500).json({
                    success: false,
                    message: 'Backup failed: ' + error.message
                });
            }
        });

        // ===== ENHANCED: Restore data with grants and login history =====
        app.post('/api/admin/restore', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                console.log('🔄 Restoring all data including grants and login history...');
                
                const result = await backupManager.restoreAllData();
                
                res.json(result);
                
            } catch (error) {
                console.error('Error restoring data:', error);
                res.status(500).json({
                    success: false,
                    message: 'Restore failed: ' + error.message
                });
            }
        });

        // EDIT REVENUE ENDPOINT - FIXED
        app.post('/api/admin/user/edit-revenue', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, amount, note } = req.body;
                
                if (!email || amount === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email and amount are required'
                    });
                }

                const users = await tokenManager.getAllUsers();
                
                if (!users[email]) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Store revenue adjustment
                if (!users[email].revenueAdjustments) {
                    users[email].revenueAdjustments = [];
                }
                
                const previousAmount = users[email].amountPaid || 0;
                
                users[email].revenueAdjustments.push({
                    previousAmount: previousAmount,
                    newAmount: parseInt(amount),
                    note: note || 'Manual adjustment',
                    date: new Date().toISOString(),
                    previousPaid: users[email].paid || false
                });
                
                // Update amount paid
                users[email].amountPaid = parseInt(amount);
                
                // Update paid status based on revenue
                if (parseInt(amount) > 0) {
                    users[email].paid = true;
                    users[email].status = 'approved';
                } else {
                    users[email].paid = false;
                    users[email].status = 'pending';
                }
                
                users[email].lastUpdated = new Date().toISOString();
                
                await tokenManager.saveUsers(users);
                
                res.json({
                    success: true,
                    message: `Revenue updated for ${email}`,
                    previousAmount: previousAmount,
                    newAmount: users[email].amountPaid || 0,
                    paid: users[email].paid || false
                });
                
            } catch (error) {
                console.error('Error editing revenue:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to edit revenue'
                });
            }
        });

        // Admin settings endpoints - FIXED
        app.get('/api/admin/settings', async (req, res) => {
            try {
                // Return default settings - also accessible without token for login page
                res.json({
                    success: true,
                    settings: {
                        emailTemplate: 'default',
                        autoBackup: 'daily',
                        adminEmail: this.adminEmail
                    }
                });
                
            } catch (error) {
                console.error('Error loading settings:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to load settings'
                });
            }
        });

        app.post('/api/admin/settings/save', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { emailTemplate, autoBackup } = req.body;
                
                // Here you would save to database
                // For now, just return success
                
                res.json({
                    success: true,
                    message: 'Settings saved successfully',
                    settings: {
                        emailTemplate,
                        autoBackup
                    }
                });
                
            } catch (error) {
                console.error('Error saving settings:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to save settings'
                });
            }
        });

        app.post('/api/admin/settings/update-template', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { template } = req.body;
                
                // Validate template
                const validTemplates = ['default', 'premium'];
                if (!validTemplates.includes(template)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid template type'
                    });
                }
                
                // Here you would save to database
                // For now, just return success
                
                res.json({
                    success: true,
                    message: `Email template updated to ${template}`,
                    template: template
                });
                
            } catch (error) {
                console.error('Error updating template:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update template'
                });
            }
        });

        // ===== NEW: Notify User about Grant Update =====
        app.post('/api/admin/notify-user-grant', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, maxSessions, message } = req.body;
                
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is required'
                    });
                }

                const users = await tokenManager.getAllUsers();
                
                if (!users[email]) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Send email notification about grant update
                const emailHtml = `
                    <h2 style="color: #7c3aed;">🎉 Session Limit Updated!</h2>
                    <p>Your session limit has been updated by the administrator.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #7c3aed;">
                        <p><strong>New Session Limit:</strong> ${maxSessions} WhatsApp sessions</p>
                        <p><strong>Updated On:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Status:</strong> Active ✅</p>
                    </div>
                    <p>You can now create up to ${maxSessions} WhatsApp sessions with your token.</p>
                    <p>If you have any questions, please contact the administrator.</p>
                    <p><strong>Contact Admin:</strong> ${this.adminEmail}</p>
                `;
                
                const emailSent = await tokenManager.sendEmail(
                    email,
                    '🎉 Session Limit Updated!',
                    emailHtml
                );
                
                if (emailSent) {
                    res.json({
                        success: true,
                        message: 'User notified about grant update'
                    });
                } else {
                    res.json({
                        success: false,
                        message: 'Failed to send notification email'
                    });
                }
                
            } catch (error) {
                console.error('Error notifying user:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to notify user'
                });
            }
        });

        // ===== NEW: Health check endpoint =====
        app.get('/api/admin/health', async (req, res) => {
            try {
                // Check if backup is configured
                const backupConfigured = backupManager.isConfigured();
                
                res.json({
                    success: true,
                    message: 'Admin API is healthy',
                    timestamp: new Date().toISOString(),
                    adminConfigured: !!this.adminEmail,
                    tokenManager: 'connected',
                    backupManager: backupConfigured ? 'connected' : 'not configured'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Health check failed'
                });
            }
        });
    }
}

module.exports = new AdminManager();