// FILE: token.js (COMPLETE UPDATED VERSION WITH BACKBLAZE B2 INTEGRATION)
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const geoip = require('geoip-lite');

class TokenManager {
    constructor() {
        this.tokensFile = path.join(__dirname, 'tokens.json');
        this.usersFile = path.join(__dirname, 'users.json');
        this.requestsFile = path.join(__dirname, 'requests.json');
        this.adminEmail = 'brenaldmedia@gmail.com';
        this.initializeFiles();
        
        // Email transporter configuration
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'brenaldmedia@gmail.com',
                pass: process.env.EMAIL_PASS // Your Gmail App Password
            }
        });
        
        // Store admin login codes
        this.adminLoginCodes = new Map();
        
        // Auto cleanup interval for expired tokens (every 6 hours)
        setInterval(() => {
            this.cleanupExpiredTokens().catch(console.error);
        }, 6 * 60 * 60 * 1000);
    }

    initializeFiles() {
        // Initialize tokens file
        if (!fs.existsSync(this.tokensFile)) {
            fs.writeFileSync(this.tokensFile, JSON.stringify({}, null, 2));
        }
        
        // Initialize users file (track user data)
        if (!fs.existsSync(this.usersFile)) {
            fs.writeFileSync(this.usersFile, JSON.stringify({}, null, 2));
        }
        
        // Initialize requests file (track pairing code requests)
        if (!fs.existsSync(this.requestsFile)) {
            fs.writeFileSync(this.requestsFile, JSON.stringify({}, null, 2));
        }
    }

    generateToken() {
        const prefix = "Tracle_";
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let randomPart = "";
        
        for (let i = 0; i < 11; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return prefix + randomPart;
    }

    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com)$/;
        return emailRegex.test(email);
    }

    async sendEmail(to, subject, html) {
        try {
            const mailOptions = {
                from: `"Tracle-Lite Admin" <${process.env.EMAIL_USER || 'brenaldmedia@gmail.com'}>`,
                to: to,
                subject: subject,
                html: html,
                text: html.replace(/<[^>]*>/g, '') // Plain text fallback
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${to}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return false;
        }
    }

    async requestToken(email, ip, userAgent) {
        try {
            if (!this.validateEmail(email)) {
                return { 
                    success: false, 
                    message: 'Invalid email. Only @gmail.com or @outlook.com domains are allowed.' 
                };
            }

            // Check if email already requested
            const requests = await this.getAllRequests();
            const userRequests = requests[email] || [];
            
            // Get user location
            const geo = geoip.lookup(ip) || {};
            
            // Store request
            const requestData = {
                email: email,
                ip: ip,
                userAgent: userAgent,
                country: geo.country || 'Unknown',
                city: geo.city || 'Unknown',
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            requests[email] = [...userRequests, requestData];
            await this.saveRequests(requests);
            
            // Update user data
            const users = await this.getAllUsers();
            if (!users[email]) {
                users[email] = {
                    email: email,
                    firstRequest: new Date().toISOString(),
                    lastRequest: new Date().toISOString(),
                    totalRequests: 1,
                    ipAddresses: [ip],
                    userAgents: [userAgent],
                    location: `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}`,
                    status: 'pending',
                    paid: false,
                    token: null,
                    tokenGenerated: null,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
            } else {
                users[email].lastRequest = new Date().toISOString();
                users[email].totalRequests += 1;
                if (!users[email].ipAddresses.includes(ip)) {
                    users[email].ipAddresses.push(ip);
                }
                if (!users[email].userAgents.includes(userAgent)) {
                    users[email].userAgents.push(userAgent);
                }
                users[email].lastUpdated = new Date().toISOString();
            }
            await this.saveUsers(users);
            
            // Send email to admin
            const adminEmailHtml = `
                <h2>📋 New Token Request</h2>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>IP Address:</strong> ${ip}</p>
                <p><strong>Location:</strong> ${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}</p>
                <p><strong>User Agent:</strong> ${userAgent}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Total Requests:</strong> ${userRequests.length + 1}</p>
                <br>
                <p>Login to admin dashboard to approve or reject this request.</p>
                <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/admin.html">Admin Dashboard</a></p>
            `;
            
            await this.sendEmail(this.adminEmail, '📋 New Token Request - Tracle-Lite', adminEmailHtml);
            
            // Auto backup data after new request
            this.autoBackupAfterUpdate('new_token_request');
            
            return { 
                success: true, 
                message: 'Token request submitted successfully. Contact admin to get your token.',
                contacts: {
                    email: this.adminEmail,
                    whatsapp: ['https://wa.me/2349025303930', 'https://wa.me/2348150221529'],
                    telegram: 'https://t.me/Brenaldmedia'
                }
            };
            
        } catch (error) {
            console.error('Error requesting token:', error);
            return { 
                success: false, 
                message: 'Failed to request token' 
            };
        }
    }

    async generateTokenForEmail(email, adminApproved = false) {
        try {
            const users = await this.getAllUsers();
            const tokens = await this.getAllTokens();
            
            if (!users[email]) {
                return { 
                    success: false, 
                    message: 'User not found. Please request token first.' 
                };
            }
            
            // Check if user has paid (admin must approve)
            if (!adminApproved && !users[email].paid) {
                return { 
                    success: false, 
                    message: 'Payment not verified. Contact admin for approval.' 
                };
            }
            
            // Check if email already has a token
            for (const [token, data] of Object.entries(tokens)) {
                if (data.email === email) {
                    return { 
                        success: true, 
                        token: token,
                        message: 'Email already has a token',
                        existing: true 
                    };
                }
            }
            
            // Generate new token
            let token;
            let attempts = 0;
            const maxAttempts = 10;
            
            do {
                token = this.generateToken();
                attempts++;
                if (attempts > maxAttempts) {
                    throw new Error('Failed to generate unique token');
                }
            } while (tokens[token]);

            // Save token
            tokens[token] = {
                email: email,
                createdAt: new Date().toISOString(),
                used: false,
                lastUsed: null,
                generatedBy: adminApproved ? 'admin' : 'system',
                paid: users[email].paid,
                expires: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
                lastUpdated: new Date().toISOString()
            };

            // Update user data
            users[email].token = token;
            users[email].status = 'approved';
            users[email].tokenGenerated = new Date().toISOString();
            users[email].lastTokenActivity = new Date().toISOString();
            users[email].lastUpdated = new Date().toISOString();
            
            await this.saveTokens(tokens);
            await this.saveUsers(users);
            
            // Send token to user email
            if (adminApproved) {
                const userEmailHtml = `
                    <h2>🎉 Your Tracle-Lite Token is Approved!</h2>
                    <p>Congratulations! Your token has been approved by admin.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #6366f1; font-family: monospace;">${token}</h3>
                    </div>
                    <p><strong>Instructions:</strong></p>
                    <ol>
                        <li>Go to Tracle-Lite website</li>
                        <li>Enter this token in the login section</li>
                        <li>Access all premium features</li>
                    </ol>
                    <p><strong>Website:</strong> <a href="${process.env.APP_URL || 'https://tracle-57a788202c97.herokuapp.com/'}">${process.env.APP_URL || 'https://tracle-57a788202c97.herokuapp.com/'}</a></p>
                    <br>
                    <p><strong>Token Details:</strong></p>
                    <ul>
                        <li>Created: ${new Date().toLocaleString()}</li>
                        <li>Expires: ${new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toLocaleString()}</li>
                        <li>Status: Active ✅</li>
                    </ul>
                    <br>
                    <p>Need help? Contact us:</p>
                    <p>📧 Email: brenaldmedia@gmail.com</p>
                    <p>📱 WhatsApp: +2349025303930</p>
                `;
                
                await this.sendEmail(email, '🎉 Your Tracle-Lite Token is Ready!', userEmailHtml);
            }
            
            // Auto backup data after token generation
            this.autoBackupAfterUpdate('token_generated');
            
            return { 
                success: true, 
                token: token,
                message: 'Token generated successfully'
            };
            
        } catch (error) {
            console.error('Error generating token:', error);
            return { 
                success: false, 
                message: 'Failed to generate token' 
            };
        }
    }

    async validateToken(token) {
        try {
            console.log(`🔐 Validating token: ${token.substring(0, 12)}...`);
            
            const tokens = await this.getAllTokens();
            
            if (!tokens[token]) {
                console.log(`❌ Token not found in database`);
                return { 
                    valid: false, 
                    message: 'Invalid token' 
                };
            }

            if (tokens[token].used) {
                console.log(`❌ Token already used`);
                return { 
                    valid: false, 
                    message: 'Token already used' 
                };
            }

            // Check if token has expired (30 days)
            if (tokens[token].expires && tokens[token].expires < Date.now()) {
                console.log(`❌ Token expired`);
                return {
                    valid: false,
                    message: 'Token has expired. Please request a new one.'
                };
            }

            console.log(`✅ Token validation successful`);
            return { 
                valid: true, 
                data: tokens[token] 
            };
            
        } catch (error) {
            console.error('Error validating token:', error);
            return { 
                valid: false, 
                message: 'Error validating token' 
            };
        }
    }

    async validateTokenWithEmail(email, token) {
        try {
            console.log(`🔐 Validating token ${token.substring(0, 12)}... for email: ${email}`);
            
            // First validate the token exists
            const tokens = await this.getAllTokens();
            
            if (!tokens[token]) {
                console.log(`❌ Token not found in database`);
                return { 
                    valid: false, 
                    message: 'Invalid token' 
                };
            }

            if (tokens[token].used) {
                console.log(`❌ Token already used`);
                return { 
                    valid: false, 
                    message: 'Token already used' 
                };
            }

            // Check if token has expired (30 days)
            if (tokens[token].expires && tokens[token].expires < Date.now()) {
                console.log(`❌ Token expired`);
                return {
                    valid: false,
                    message: 'Token has expired. Please request a new one.'
                };
            }

            // Check if token belongs to the provided email
            if (tokens[token].email !== email) {
                console.log(`❌ Token email mismatch: ${tokens[token].email} != ${email}`);
                return { 
                    valid: false, 
                    message: 'Token does not belong to this email address' 
                };
            }

            // Check if user exists and is approved
            const users = await this.getAllUsers();
            const user = users[email];
            
            if (!user) {
                console.log(`❌ User not found: ${email}`);
                return { 
                    valid: false, 
                    message: 'User not found. Please request a token first.' 
                };
            }

            if (user.status !== 'approved') {
                console.log(`❌ User not approved: ${email} - status: ${user.status}`);
                return { 
                    valid: false, 
                    message: 'User account not approved. Please contact admin.' 
                };
            }

            // Update last token activity
            user.lastTokenActivity = new Date().toISOString();
            user.lastUpdated = new Date().toISOString();
            await this.saveUsers(users);
            
            // Update token last used time
            tokens[token].lastUsed = new Date().toISOString();
            tokens[token].lastUpdated = new Date().toISOString();
            await this.saveTokens(tokens);

            console.log(`✅ Token validation successful for ${email}`);
            return { 
                valid: true, 
                data: tokens[token],
                message: 'Token is valid for this email'
            };
            
        } catch (error) {
            console.error('Error validating token with email:', error);
            return { 
                valid: false, 
                message: 'Error validating token' 
            };
        }
    }

    async markTokenAsUsed(token) {
        try {
            const tokens = await this.getAllTokens();
            
            if (tokens[token]) {
                tokens[token].used = true;
                tokens[token].lastUsed = new Date().toISOString();
                tokens[token].lastUpdated = new Date().toISOString();
                await this.saveTokens(tokens);
                
                // Auto backup data after token usage
                this.autoBackupAfterUpdate('token_used');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error marking token as used:', error);
            return false;
        }
    }

    async updateUserPaymentStatus(email, paid) {
        try {
            const users = await this.getAllUsers();
            
            if (users[email]) {
                users[email].paid = paid;
                users[email].status = paid ? 'approved' : 'pending';
                users[email].paymentUpdated = new Date().toISOString();
                users[email].lastUpdated = new Date().toISOString();
                
                await this.saveUsers(users);
                
                // If paid, generate token automatically
                if (paid) {
                    const tokenResult = await this.generateTokenForEmail(email, true);
                    return {
                        success: true,
                        paid: paid,
                        tokenGenerated: tokenResult.success,
                        token: tokenResult.token,
                        message: `User ${paid ? 'marked as paid' : 'marked as not paid'}`
                    };
                }
                
                // Auto backup data after payment status update
                this.autoBackupAfterUpdate('payment_status_updated');
                
                return { success: true, paid: paid };
            }
            
            return { success: false, message: 'User not found' };
        } catch (error) {
            console.error('Error updating payment status:', error);
            return { success: false, message: error.message };
        }
    }

    async terminateUserToken(email) {
        try {
            const users = await this.getAllUsers();
            const tokens = await this.getAllTokens();
            
            if (users[email] && users[email].token) {
                const token = users[email].token;
                
                // Remove token
                if (tokens[token]) {
                    delete tokens[token];
                }
                
                // Update user
                users[email].token = null;
                users[email].status = 'terminated';
                users[email].terminatedAt = new Date().toISOString();
                users[email].lastUpdated = new Date().toISOString();
                
                await this.saveTokens(tokens);
                await this.saveUsers(users);
                
                // Auto backup data after token termination
                this.autoBackupAfterUpdate('token_terminated');
                
                return { 
                    success: true, 
                    message: 'Token terminated successfully' 
                };
            }
            
            return { success: false, message: 'User or token not found' };
        } catch (error) {
            console.error('Error terminating token:', error);
            return { success: false, message: error.message };
        }
    }

    // Admin functions
    async getAllUsers() {
        try {
            const data = await fs.readFile(this.usersFile, 'utf8');
            const users = JSON.parse(data);
            
            // Ensure all users have tokenBalance field
            let needsUpdate = false;
            for (const email in users) {
                if (users[email].tokenBalance === undefined) {
                    users[email].tokenBalance = 0;
                    needsUpdate = true;
                }
                if (users[email].freeTokensGranted === undefined) {
                    users[email].freeTokensGranted = 0;
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                await this.saveUsers(users);
            }
            
            return users;
        } catch (error) {
            return {};
        }
    }

    async getAllTokens() {
        try {
            const data = await fs.readFile(this.tokensFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    async getAllRequests() {
        try {
            const data = await fs.readFile(this.requestsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    async saveUsers(users) {
        try {
            await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    }

    async saveTokens(tokens) {
        try {
            await fs.writeFile(this.tokensFile, JSON.stringify(tokens, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving tokens:', error);
            return false;
        }
    }

    async saveRequests(requests) {
        try {
            await fs.writeFile(this.requestsFile, JSON.stringify(requests, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving requests:', error);
            return false;
        }
    }

    async getStats() {
        try {
            const users = await this.getAllUsers();
            const tokens = await this.getAllTokens();
            const requests = await this.getAllRequests();
            
            // Ensure we have valid objects
            const usersObj = users || {};
            const tokensObj = tokens || {};
            const requestsObj = requests || {};
            
            const userKeys = Object.keys(usersObj);
            const tokenKeys = Object.keys(tokensObj);
            
            const totalUsers = userKeys.length;
            const totalTokens = tokenKeys.length;
            
            // Calculate user statistics
            let paidUsers = 0;
            let pendingUsers = 0;
            let approvedUsers = 0;
            let terminatedUsers = 0;
            let activeUsers = 0;
            let recentUsers = 0;
            
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            for (const email in usersObj) {
                const user = usersObj[email];
                
                if (user.paid === true) {
                    paidUsers++;
                }
                
                if (user.status === 'pending') {
                    pendingUsers++;
                } else if (user.status === 'approved') {
                    approvedUsers++;
                } else if (user.status === 'terminated') {
                    terminatedUsers++;
                }
                
                // Check if user was active in last 24 hours
                if (user.lastTokenActivity) {
                    const lastActivity = new Date(user.lastTokenActivity).getTime();
                    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
                    if (lastActivity > twentyFourHoursAgo) {
                        activeUsers++;
                    }
                }
                
                // Check if user was created in last 7 days
                if (user.createdAt) {
                    const createdAt = new Date(user.createdAt).getTime();
                    if (createdAt > sevenDaysAgo) {
                        recentUsers++;
                    }
                }
            }
            
            // Calculate token statistics
            let usedTokens = 0;
            let validTokens = 0;
            let expiredTokens = 0;
            let expiringSoon = 0;
            
            const threeDaysFromNow = Date.now() + (3 * 24 * 60 * 60 * 1000);
            
            for (const token in tokensObj) {
                const tokenData = tokensObj[token];
                if (tokenData.used === true) {
                    usedTokens++;
                } else {
                    validTokens++;
                    
                    // Check if token is expired
                    if (tokenData.expires && tokenData.expires < Date.now()) {
                        expiredTokens++;
                    }
                    
                    // Check if token expires in next 3 days
                    if (tokenData.expires && tokenData.expires > Date.now() && tokenData.expires < threeDaysFromNow) {
                        expiringSoon++;
                    }
                }
            }
            
            const unusedTokens = totalTokens - usedTokens;
            
            // Get recent requests (last 10)
            const recentRequests = [];
            for (const email in requestsObj) {
                const reqList = requestsObj[email];
                if (Array.isArray(reqList) && reqList.length > 0) {
                    const lastRequest = reqList[reqList.length - 1];
                    recentRequests.push({
                        email: email,
                        lastRequest: lastRequest.timestamp,
                        totalRequests: reqList.length,
                        status: usersObj[email]?.status || 'pending',
                        paid: usersObj[email]?.paid || false
                    });
                }
            }
            
            // Sort by most recent
            recentRequests.sort((a, b) => new Date(b.lastRequest) - new Date(a.lastRequest));
            
            // Get today's date for filtering
            const today = new Date().toDateString();
            const activeToday = recentRequests.filter(r => {
                if (!r.lastRequest) return false;
                const requestDate = new Date(r.lastRequest).toDateString();
                return requestDate === today;
            }).length;
            
            // Calculate revenue
            const revenue = paidUsers * 1000; // ₦1000 per token
            
            return {
                users: {
                    total: totalUsers,
                    paid: paidUsers,
                    pending: pendingUsers,
                    approved: approvedUsers,
                    terminated: terminatedUsers,
                    active24h: activeUsers,
                    recent7d: recentUsers
                },
                tokens: {
                    total: totalTokens,
                    used: usedTokens,
                    unused: unusedTokens,
                    valid: validTokens,
                    expired: expiredTokens,
                    expiringSoon: expiringSoon
                },
                requests: {
                    total: Object.keys(requestsObj).length,
                    recent: recentRequests.slice(0, 10),
                    activeToday: activeToday
                },
                summary: {
                    pendingApprovals: pendingUsers,
                    revenue: revenue,
                    revenueFormatted: `₦${revenue.toLocaleString()}`,
                    activeToday: activeToday,
                    backupStatus: await this.getBackupStatus()
                }
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                users: { total: 0, paid: 0, pending: 0, approved: 0, terminated: 0, active24h: 0, recent7d: 0 },
                tokens: { total: 0, used: 0, unused: 0, valid: 0, expired: 0, expiringSoon: 0 },
                requests: { total: 0, recent: [], activeToday: 0 },
                summary: { pendingApprovals: 0, revenue: 0, revenueFormatted: '₦0', activeToday: 0, backupStatus: 'unknown' }
            };
        }
    }

    async getUserDetails(email) {
        try {
            const users = await this.getAllUsers();
            const requests = await this.getAllRequests();
            const tokens = await this.getAllTokens();
            
            const user = users[email];
            if (!user) {
                return { found: false };
            }
            
            const userTokens = Object.entries(tokens)
                .filter(([token, data]) => data.email === email)
                .map(([token, data]) => ({ token, ...data }));
            
            const userRequests = requests[email] || [];
            
            return {
                found: true,
                user: {
                    email: user.email,
                    status: user.status || 'pending',
                    paid: user.paid || false,
                    tokenBalance: user.tokenBalance || 0,
                    freeTokensGranted: user.freeTokensGranted || 0,
                    token: user.token,
                    firstRequest: user.firstRequest,
                    lastRequest: user.lastRequest,
                    totalRequests: user.totalRequests || 0,
                    location: user.location,
                    ipAddresses: user.ipAddresses || [],
                    userAgents: user.userAgents || [],
                    createdAt: user.createdAt,
                    lastUpdated: user.lastUpdated
                },
                tokens: userTokens,
                requests: userRequests,
                totalRequests: userRequests.length,
                hasToken: user.token !== null,
                isPaid: user.paid || false
            };
        } catch (error) {
            console.error('Error getting user details:', error);
            return { found: false };
        }
    }

    async deleteUser(email) {
        try {
            const users = await this.getAllUsers();
            const tokens = await this.getAllTokens();
            const requests = await this.getAllRequests();
            
            if (users[email]) {
                // Remove user token
                const token = users[email].token;
                if (token && tokens[token]) {
                    delete tokens[token];
                }
                
                // Remove user data
                delete users[email];
                delete requests[email];
                
                await this.saveUsers(users);
                await this.saveTokens(tokens);
                await this.saveRequests(requests);
                
                // Auto backup data after user deletion
                this.autoBackupAfterUpdate('user_deleted');
                
                return { success: true, message: 'User deleted successfully' };
            }
            
            return { success: false, message: 'User not found' };
        } catch (error) {
            console.error('Error deleting user:', error);
            return { success: false, message: error.message };
        }
    }

    async backupToB2() {
        try {
            const backupManager = require('./backup');
            if (backupManager.isConfigured()) {
                console.log('🔄 Backing up token data to Backblaze B2...');
                
                // Backup tokens
                const tokens = await this.getAllTokens();
                const tokensData = JSON.stringify(tokens, null, 2);
                const tokensResult = await backupManager.uploadToB2('tokens.json', tokensData);
                
                // Backup users
                const users = await this.getAllUsers();
                const usersData = JSON.stringify(users, null, 2);
                const usersResult = await backupManager.uploadToB2('users.json', usersData);
                
                // Backup requests
                const requests = await this.getAllRequests();
                const requestsData = JSON.stringify(requests, null, 2);
                const requestsResult = await backupManager.uploadToB2('requests.json', requestsData);
                
                // Send email notification
                if (tokensResult.success && usersResult.success && requestsResult.success) {
                    await this.sendEmail(
                        this.adminEmail,
                        '✅ Tracle-Lite Backup Completed',
                        `<h2>✅ Backup Successful</h2>
                        <p>All Tracle-Lite data has been backed up to Backblaze B2.</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Backup Location:</strong> ${process.env.B2_BUCKET_NAME || 'tracle-new-backup'}</p>
                        <p><strong>Items backed up:</strong></p>
                        <ul>
                            <li>Users: ${Object.keys(users).length}</li>
                            <li>Tokens: ${Object.keys(tokens).length}</li>
                            <li>Requests: ${Object.keys(requests).length}</li>
                        </ul>
                        <p><strong>Total Size:</strong> ${Buffer.byteLength(tokensData + usersData + requestsData, 'utf8').toLocaleString()} bytes</p>
                        <br>
                        <p>You can restore this backup anytime from the admin dashboard.</p>`
                    );
                    
                    console.log('✅ Token data backup completed successfully');
                    return { 
                        success: true, 
                        message: 'Backup completed and email sent',
                        usersCount: Object.keys(users).length,
                        tokensCount: Object.keys(tokens).length,
                        requestsCount: Object.keys(requests).length,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    console.log('❌ Token data backup partially failed');
                    return { 
                        success: false, 
                        message: 'Partial backup failure',
                        tokensSuccess: tokensResult.success,
                        usersSuccess: usersResult.success,
                        requestsSuccess: requestsResult.success
                    };
                }
            }
            console.log('❌ Backblaze B2 not configured');
            return { success: false, message: 'Backblaze B2 not configured' };
        } catch (error) {
            console.error('Error backing up to B2:', error);
            return { success: false, message: error.message };
        }
    }

    async restoreFromB2() {
        try {
            const backupManager = require('./backup');
            if (backupManager.isConfigured()) {
                console.log('🔄 Restoring token data from Backblaze B2...');
                
                let restoredCount = 0;
                let restoreDetails = [];
                
                // Restore tokens
                const tokensData = await backupManager.downloadFromB2('tokens.json');
                if (tokensData) {
                    await fs.writeFile(this.tokensFile, tokensData);
                    const tokens = JSON.parse(tokensData);
                    console.log(`✅ Restored tokens.json from Backblaze B2 (${Object.keys(tokens).length} tokens)`);
                    restoredCount++;
                    restoreDetails.push(`Tokens: ${Object.keys(tokens).length}`);
                } else {
                    console.log('⚠️ No tokens.json found on Backblaze B2');
                }
                
                // Restore users
                const usersData = await backupManager.downloadFromB2('users.json');
                if (usersData) {
                    await fs.writeFile(this.usersFile, usersData);
                    const users = JSON.parse(usersData);
                    console.log(`✅ Restored users.json from Backblaze B2 (${Object.keys(users).length} users)`);
                    restoredCount++;
                    restoreDetails.push(`Users: ${Object.keys(users).length}`);
                } else {
                    console.log('⚠️ No users.json found on Backblaze B2');
                }
                
                // Restore requests
                const requestsData = await backupManager.downloadFromB2('requests.json');
                if (requestsData) {
                    await fs.writeFile(this.requestsFile, requestsData);
                    const requests = JSON.parse(requestsData);
                    console.log(`✅ Restored requests.json from Backblaze B2 (${Object.keys(requests).length} requests)`);
                    restoredCount++;
                    restoreDetails.push(`Requests: ${Object.keys(requests).length}`);
                } else {
                    console.log('⚠️ No requests.json found on Backblaze B2');
                }
                
                // Send email notification
                await this.sendEmail(
                    this.adminEmail,
                    '🔄 Tracle-Lite Restore Completed',
                    `<h2>🔄 Restore Successful</h2>
                    <p>Tracle-Lite data has been restored from Backblaze B2 backup.</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Restore Source:</strong> ${process.env.B2_BUCKET_NAME || 'tracle-new-backup'}</p>
                    <p><strong>Items restored:</strong></p>
                    <ul>
                        ${restoreDetails.map(detail => `<li>${detail}</li>`).join('')}
                    </ul>
                    <p><strong>Total Items:</strong> ${restoredCount}/3 data files</p>
                    <br>
                    <p>All restored data is now active and available in the system.</p>`
                );
                
                console.log(`✅ Token data restore completed successfully (${restoredCount}/3 files)`);
                return { 
                    success: true, 
                    message: 'Restore completed and email sent',
                    restoredCount: restoredCount,
                    restoreDetails: restoreDetails,
                    timestamp: new Date().toISOString()
                };
            }
            console.log('❌ Backblaze B2 not configured');
            return { success: false, message: 'Backblaze B2 not configured' };
        } catch (error) {
            console.error('Error restoring from B2:', error);
            return { success: false, message: error.message };
        }
    }

    async getBackupStatus() {
        try {
            const backupManager = require('./backup');
            if (!backupManager.isConfigured()) {
                return 'not_configured';
            }
            
            // Check if backup files exist on B2
            const tokensData = await backupManager.downloadFromB2('tokens.json');
            const usersData = await backupManager.downloadFromB2('users.json');
            const requestsData = await backupManager.downloadFromB2('requests.json');
            
            if (tokensData && usersData && requestsData) {
                return 'available';
            } else if (tokensData || usersData || requestsData) {
                return 'partial';
            } else {
                return 'none';
            }
        } catch (error) {
            console.error('Error checking backup status:', error);
            return 'error';
        }
    }

    async autoBackupAfterUpdate(action) {
        try {
            const backupManager = require('./backup');
            if (backupManager.isConfigured()) {
                console.log(`🔄 Auto-backup triggered by: ${action}`);
                
                // Use setTimeout to avoid blocking the main thread
                setTimeout(async () => {
                    try {
                        const result = await this.backupToB2();
                        if (result.success) {
                            console.log(`✅ Auto-backup completed after ${action}`);
                        } else {
                            console.log(`⚠️ Auto-backup failed after ${action}: ${result.message}`);
                        }
                    } catch (error) {
                        console.error(`❌ Auto-backup error after ${action}:`, error.message);
                    }
                }, 1000); // 1 second delay
            }
        } catch (error) {
            console.error('Error in auto-backup:', error);
        }
    }

    // Get token by email
    async getTokenByEmail(email) {
        try {
            const tokens = await this.getAllTokens();
            
            for (const [token, data] of Object.entries(tokens)) {
                if (data.email === email) {
                    return { token, ...data };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting token by email:', error);
            return null;
        }
    }

    // Revoke token
    async revokeToken(token) {
        try {
            const tokens = await this.getAllTokens();
            const users = await this.getAllUsers();
            
            if (tokens[token]) {
                const email = tokens[token].email;
                
                // Mark token as used/revoked
                tokens[token].used = true;
                tokens[token].revokedAt = new Date().toISOString();
                tokens[token].revoked = true;
                tokens[token].lastUpdated = new Date().toISOString();
                
                // Update user status
                if (users[email]) {
                    users[email].token = null;
                    users[email].status = 'revoked';
                    users[email].tokenRevoked = new Date().toISOString();
                    users[email].lastUpdated = new Date().toISOString();
                }
                
                await this.saveTokens(tokens);
                await this.saveUsers(users);
                
                // Auto backup data after token revocation
                this.autoBackupAfterUpdate('token_revoked');
                
                return { success: true, message: 'Token revoked successfully' };
            }
            
            return { success: false, message: 'Token not found' };
        } catch (error) {
            console.error('Error revoking token:', error);
            return { success: false, message: error.message };
        }
    }

    // Renew token (extend expiry)
    async renewToken(token, days = 30) {
        try {
            const tokens = await this.getAllTokens();
            
            if (tokens[token]) {
                const oldExpiry = tokens[token].expires;
                tokens[token].expires = Date.now() + (days * 24 * 60 * 60 * 1000);
                tokens[token].renewedAt = new Date().toISOString();
                tokens[token].renewed = true;
                tokens[token].lastUpdated = new Date().toISOString();
                
                await this.saveTokens(tokens);
                
                // Send renewal email
                const userEmail = tokens[token].email;
                await this.sendEmail(
                    userEmail,
                    '🔄 Your Tracle-Lite Token Has Been Renewed',
                    `<h2>🔄 Token Renewed</h2>
                    <p>Your Tracle-Lite token has been renewed for ${days} days.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #6366f1; font-family: monospace;">${token}</h3>
                    </div>
                    <p><strong>Renewal Details:</strong></p>
                    <ul>
                        <li>Previous Expiry: ${oldExpiry ? new Date(oldExpiry).toLocaleString() : 'Not set'}</li>
                        <li>New Expiry: ${new Date(tokens[token].expires).toLocaleString()}</li>
                        <li>Renewed On: ${new Date().toLocaleString()}</li>
                        <li>Days Added: ${days} days</li>
                    </ul>
                    <p>You can continue using all features with your existing token.</p>
                    <br>
                    <p>Need help? Contact us:</p>
                    <p>📧 Email: brenaldmedia@gmail.com</p>
                    <p>📱 WhatsApp: +2349025303930</p>`
                );
                
                // Auto backup data after token renewal
                this.autoBackupAfterUpdate('token_renewed');
                
                return { success: true, message: `Token renewed for ${days} days` };
            }
            
            return { success: false, message: 'Token not found' };
        } catch (error) {
            console.error('Error renewing token:', error);
            return { success: false, message: error.message };
        }
    }

    // Clean up expired tokens
    async cleanupExpiredTokens() {
        try {
            const tokens = await this.getAllTokens();
            const users = await this.getAllUsers();
            
            let cleanedCount = 0;
            const now = Date.now();
            
            for (const [token, data] of Object.entries(tokens)) {
                // Check if token is expired and not used
                if (!data.used && data.expires && data.expires < now) {
                    const email = data.email;
                    
                    // Mark token as expired
                    data.used = true;
                    data.expired = true;
                    data.expiredAt = new Date().toISOString();
                    data.lastUpdated = new Date().toISOString();
                    
                    // Update user status if they only have this token
                    if (users[email] && users[email].token === token) {
                        users[email].token = null;
                        users[email].status = 'expired';
                        users[email].tokenExpired = new Date().toISOString();
                        users[email].lastUpdated = new Date().toISOString();
                    }
                    
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                await this.saveTokens(tokens);
                await this.saveUsers(users);
                console.log(`🧹 Cleaned up ${cleanedCount} expired tokens`);
                
                // Auto backup data after cleanup
                this.autoBackupAfterUpdate('tokens_cleaned');
            }
            
            return { success: true, cleaned: cleanedCount };
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            return { success: false, message: error.message };
        }
    }

    // Export all data for backup
    async exportAllData() {
        try {
            const users = await this.getAllUsers();
            const tokens = await this.getAllTokens();
            const requests = await this.getAllRequests();
            
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    appName: 'Tracle-Lite',
                    version: '1.0.0',
                    dataCount: {
                        users: Object.keys(users).length,
                        tokens: Object.keys(tokens).length,
                        requests: Object.keys(requests).length
                    }
                },
                users: users,
                tokens: tokens,
                requests: requests
            };
            
            return {
                success: true,
                data: exportData,
                size: JSON.stringify(exportData).length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return { success: false, message: error.message };
        }
    }

    // Import data from backup
    async importData(importData) {
        try {
            if (!importData || !importData.users || !importData.tokens || !importData.requests) {
                return { success: false, message: 'Invalid import data format' };
            }
            
            // Save imported data
            await fs.writeFile(this.usersFile, JSON.stringify(importData.users, null, 2));
            await fs.writeFile(this.tokensFile, JSON.stringify(importData.tokens, null, 2));
            await fs.writeFile(this.requestsFile, JSON.stringify(importData.requests, null, 2));
            
            console.log(`✅ Data imported successfully: ${Object.keys(importData.users).length} users, ${Object.keys(importData.tokens).length} tokens, ${Object.keys(importData.requests).length} requests`);
            
            // Auto backup after import
            this.autoBackupAfterUpdate('data_imported');
            
            return { 
                success: true, 
                message: 'Data imported successfully',
                counts: {
                    users: Object.keys(importData.users).length,
                    tokens: Object.keys(importData.tokens).length,
                    requests: Object.keys(importData.requests).length
                }
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return { success: false, message: error.message };
        }
    }

    // Add to TokenManager class: Get user sessions
    async getUserSessions(email, token) {
        try {
            // First validate token
            const validation = await this.validateTokenWithEmail(email, token);
            if (!validation.valid) {
                return { success: false, message: 'Invalid token for this email' };
            }

            const sessionsPath = path.join(__dirname, '..', 'sessions');
            if (!fs.existsSync(sessionsPath)) {
                return { success: true, sessions: [] };
            }

            const userSessions = [];
            const folders = fs.readdirSync(sessionsPath);
            
            for (const userNumber of folders) {
                const userInfoPath = path.join(sessionsPath, userNumber, 'user_info.json');
                if (fs.existsSync(userInfoPath)) {
                    try {
                        const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                        if (userInfo.email === email && userInfo.token === token) {
                            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                            if (fs.existsSync(credsPath)) {
                                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                                userSessions.push({
                                    userNumber,
                                    registered: creds.registered || false,
                                    lastActivity: userInfo.lastActivity || null,
                                    createdAt: userInfo.createdAt || null
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error reading session ${userNumber}:`, error);
                    }
                }
            }

            return { success: true, sessions: userSessions };
        } catch (error) {
            console.error('Error getting user sessions:', error);
            return { success: false, message: error.message };
        }
    }
}

// Create singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;