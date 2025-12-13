// FILE: admin.js BACKEND ADMIN ROUTES AND LOGIC (UPDATED)
const crypto = require('crypto');
const tokenManager = require('./token');

class AdminManager {
    constructor() {
        this.adminEmail = 'brenaldmedia@gmail.com';
        this.adminPassword = 'isiboremmanuel0911'; // Hardcoded password
        this.adminLoginCodes = new Map();
    }

    // Admin authentication middleware
    verifyAdminToken(req, res, next) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided'
                });
            }
            
            // Simple token check - in production use JWT
            if (token && token.startsWith('admin_')) {
                next();
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
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

    // Generate admin login token
    generateAdminToken() {
        return 'admin_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
    }

    // Setup admin routes
    setupRoutes(app) {
        // Admin login with email/password
        app.post('/api/admin/verify-login', async (req, res) => {
            try {
                const { email, password } = req.body;
                
                if (!email || !password) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email and password are required' 
                    });
                }

                // Check credentials
                if (email !== this.adminEmail || password !== this.adminPassword) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid email or password' 
                    });
                }

                // Generate admin token
                const token = this.generateAdminToken();
                
                res.json({ 
                    success: true, 
                    message: 'Login successful',
                    token: token,
                    admin: {
                        email: email,
                        name: 'Brenaldmedia Admin'
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

        // Send password reminder
        app.post('/api/admin/send-reminder', async (req, res) => {
            try {
                const { email, password } = req.body;
                
                if (!email || email !== this.adminEmail) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid admin email' 
                    });
                }

                // Send reminder email
                const emailHtml = `
                    <h2>🔐 Admin Password Reminder</h2>
                    <p>Your admin credentials for Tracle-Lite:</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Password:</strong> ${password || this.adminPassword}</p>
                    </div>
                    <p><strong>Login URL:</strong> <a href="${req.protocol}://${req.get('host')}/admin.html">${req.protocol}://${req.get('host')}/admin.html</a></p>
                    <p><i>If you didn't request this reminder, please ignore this email.</i></p>
                `;
                
                const emailSent = await tokenManager.sendEmail(
                    email,
                    '🔐 Admin Password Reminder - Tracle-Lite',
                    emailHtml
                );

                if (emailSent) {
                    res.json({ success: true, message: 'Password reminder sent to email' });
                } else {
                    res.json({ success: false, message: 'Failed to send email' });
                }
            } catch (error) {
                console.error('Error sending password reminder:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to send reminder' 
                });
            }
        });

        // Verify token route (for checking if token is still valid)
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

        // Test route - no authentication required
        app.get('/api/admin/test', async (req, res) => {
            try {
                // Test getting stats directly
                const stats = await tokenManager.getStats();
                
                res.json({
                    success: true,
                    message: 'Admin API is working',
                    stats: stats,
                    timestamp: new Date().toISOString()
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

        // ===== NEW ENDPOINTS =====
        
        // Update user details (status, paid, etc.)
        app.post('/api/admin/user/update', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const { email, status, paid } = req.body;
                
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

        // ===== NEW: FREE TOKEN GENERATION ENDPOINTS =====
        // Generate free token endpoint (FIXED - no pending status)
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
                        users[email].freeToken = true; // IMPORTANT: Mark as free token
                        users[email].lastUpdated = new Date().toISOString();
                        await tokenManager.saveUsers(users);
                    }
                    
                    // Send email if requested
                    if (sendEmail && result.token) {
                        const emailHtml = `
                            <h2>🎉 Your Free Tracle-Lite Token is Ready!</h2>
                            <p>You have been granted a free token by the administrator!</p>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: #8b5cf6; font-family: monospace;">${result.token}</h3>
                            </div>
                            <p><strong>Instructions:</strong></p>
                            <ol>
                                <li>Go to Tracle-Lite website</li>
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
                        
                        await tokenManager.sendEmail(email, '🎉 Your Free Tracle-Lite Token is Ready!', emailHtml);
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

        // Generate token with email option
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
                            '🎉 Your Free Tracle-Lite Token is Ready!' : 
                            '🎉 Your Tracle-Lite Token is Approved!';
                        
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

        // Terminate token endpoint
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
                        <p>Your Tracle-Lite token has been terminated by the administrator.</p>
                        <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #ef4444;">
                            <p><strong>Reason:</strong> Administrative action</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Status:</strong> Token revoked</p>
                        </div>
                        <p>If you believe this was done in error, please contact the administrator.</p>
                        <p><strong>Contact Admin:</strong> ${this.adminEmail}</p>
                    `;
                    
                    await tokenManager.sendEmail(email, '⚠️ Tracle-Lite Token Terminated', terminationHtml);
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

        // Update user with token status
        app.post('/api/admin/user/update-token-status', this.verifyAdminToken.bind(this), async (req, res) => {
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

        // Backup data
        app.post('/api/admin/backup', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const result = await tokenManager.backupToDrive();
                
                res.json(result);
                
            } catch (error) {
                console.error('Error backing up data:', error);
                res.status(500).json({
                    success: false,
                    message: 'Backup failed'
                });
            }
        });

        // Restore data
        app.post('/api/admin/restore', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                const result = await tokenManager.restoreFromDrive();
                
                res.json(result);
                
            } catch (error) {
                console.error('Error restoring data:', error);
                res.status(500).json({
                    success: false,
                    message: 'Restore failed'
                });
            }
        });

        // ===== ADDED: EDIT REVENUE ENDPOINT =====
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

        // Admin settings endpoints
        app.get('/api/admin/settings', this.verifyAdminToken.bind(this), async (req, res) => {
            try {
                // Return default settings
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
    }
}

module.exports = new AdminManager();