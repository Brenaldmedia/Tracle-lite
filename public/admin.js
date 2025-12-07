// ===== ADMIN DASHBOARD JAVASCRIPT =====
class AdminDashboard {
    constructor() {
        this.adminEmail = 'brenaldmedia@gmail.com';
        this.adminPassword = 'isiboremmanuel0911'; // Hardcoded password
        this.isAuthenticated = false;
        this.currentTab = 'dashboard';
        this.charts = {};
        this.themes = [
            { primary: '#4f46e5', secondary: '#8b5cf6', name: 'Purple', class: 'theme-purple' },
            { primary: '#3b82f6', secondary: '#60a5fa', name: 'Blue', class: 'theme-blue' },
            { primary: '#10b981', secondary: '#34d399', name: 'Green', class: 'theme-green' },
            { primary: '#f59e0b', secondary: '#fbbf24', name: 'Orange', class: 'theme-orange' },
            { primary: '#ef4444', secondary: '#f87171', name: 'Red', class: 'theme-red' },
            { primary: '#8b5cf6', secondary: '#a78bfa', name: 'Violet', class: 'theme-violet' },
            { primary: '#ec4899', secondary: '#f472b6', name: 'Pink', class: 'theme-pink' },
            { primary: '#14b8a6', secondary: '#2dd4bf', name: 'Teal', class: 'theme-teal' },
            { primary: '#f97316', secondary: '#fb923c', name: 'Amber', class: 'theme-amber' },
            { primary: '#6366f1', secondary: '#818cf8', name: 'Indigo', class: 'theme-indigo' }
        ];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
        this.initCustomModal();
        this.loadSavedTheme(); // Load saved theme on init
    }

    loadSavedTheme() {
        let currentTheme = parseInt(localStorage.getItem('admin_theme_index') || '0');
        const theme = this.themes[currentTheme];
        
        if (theme) {
            // Remove all theme classes from body
            this.themes.forEach(t => {
                document.body.classList.remove(t.class);
            });
            
            // Add the saved theme class
            document.body.classList.add(theme.class);
            
            // Update CSS custom properties for consistency
            document.documentElement.style.setProperty('--primary-color', theme.primary);
            document.documentElement.style.setProperty('--primary-dark', this.darkenColor(theme.primary, 20));
            document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        }
    }

    initCustomModal() {
        // Create custom modal element if it doesn't exist
        if (!document.getElementById('customAdminModal')) {
            const modalHTML = `
                <div class="custom-modal hidden" id="customAdminModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="adminModalTitle">Confirmation</h3>
                            <button class="modal-close" onclick="admin.closeCustomModal()">&times;</button>
                        </div>
                        <div class="modal-body" id="adminModalBody">
                            <p>Are you sure you want to proceed?</p>
                        </div>
                        <div class="modal-footer">
                            <button class="modal-btn secondary" onclick="admin.closeCustomModal()">Cancel</button>
                            <button class="modal-btn primary" id="adminModalConfirm">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    showCustomModal(title, message, confirmCallback = null, confirmText = 'Confirm') {
        const modal = document.getElementById('customAdminModal');
        const titleEl = document.getElementById('adminModalTitle');
        const bodyEl = document.getElementById('adminModalBody');
        const confirmBtn = document.getElementById('adminModalConfirm');
        
        titleEl.textContent = title;
        bodyEl.innerHTML = message;
        confirmBtn.textContent = confirmText;
        
        // Clear previous click handlers
        confirmBtn.onclick = null;
        
        // Set new click handler
        confirmBtn.onclick = () => {
            if (confirmCallback) {
                confirmCallback();
            }
            this.closeCustomModal();
        };
        
        modal.classList.remove('hidden');
    }

    closeCustomModal() {
        const modal = document.getElementById('customAdminModal');
        modal.classList.add('hidden');
    }

    bindEvents() {
        // Login events
        document.getElementById('remindMeBtn')?.addEventListener('click', () => this.remindPassword());
        document.getElementById('loginBtn')?.addEventListener('click', () => this.login());
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('mobileLogout')?.addEventListener('click', () => this.logout());
        
        // Hamburger menu
        document.getElementById('hamburgerMenu')?.addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarClose')?.addEventListener('click', () => this.closeSidebar());
        
        // Navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });
        
        // Refresh stats
        document.getElementById('refreshStats')?.addEventListener('click', () => this.loadStats());
        
        // Search
        document.getElementById('userSearch')?.addEventListener('input', (e) => this.searchUsers(e.target.value));
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterUsers(e.currentTarget.dataset.filter));
        });
        
        // Quick actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e.currentTarget.dataset.action));
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.closest('.modal')));
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // Generate token
        document.getElementById('generateTokenBtn')?.addEventListener('click', () => this.showGenerateTokenModal());
        document.getElementById('generateTokenConfirm')?.addEventListener('click', () => this.generateToken());
        
        // Backup buttons
        document.getElementById('backupNowBtn')?.addEventListener('click', () => this.backupData());
        document.getElementById('restoreBackupBtn')?.addEventListener('click', () => this.restoreBackup());
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                const sidebar = document.getElementById('sidebar');
                const hamburger = document.getElementById('hamburgerMenu');
                if (sidebar.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    hamburger && !hamburger.contains(e.target)) {
                    this.closeSidebar();
                }
            }
        });

        // Theme toggle button in admin panel
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (!themeToggleBtn) {
            // Add theme toggle button to sidebar footer if it doesn't exist
            const sidebarFooter = document.querySelector('.sidebar-footer');
            if (sidebarFooter) {
                const themeBtn = document.createElement('div');
                themeBtn.className = 'server-status theme-toggle';
                themeBtn.style.cursor = 'pointer';
                themeBtn.style.marginTop = '10px';
                themeBtn.innerHTML = `
                    <i class="fas fa-palette"></i>
                    <span>Change Theme</span>
                `;
                themeBtn.addEventListener('click', () => this.cycleTheme());
                sidebarFooter.appendChild(themeBtn);
            }
        } else {
            themeToggleBtn.addEventListener('click', () => this.cycleTheme());
        }
    }

    async remindPassword() {
        try {
            const btn = document.getElementById('remindMeBtn');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            // Send password reminder email
            const adminEmail = document.getElementById('adminEmail').value || this.adminEmail;
            
            const reminderHtml = `
                <h2>🔐 Admin Password Reminder</h2>
                <p>Your admin credentials for Tracle-Lite:</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p><strong>Email:</strong> ${adminEmail}</p>
                    <p><strong>Password:</strong> ${this.adminPassword}</p>
                </div>
                <p><strong>Login URL:</strong> <a href="${window.location.origin}/admin.html">${window.location.origin}/admin.html</a></p>
                <p><i>If you didn't request this reminder, please ignore this email.</i></p>
            `;
            
            // Use token manager to send email
            const response = await fetch('/api/admin/send-reminder', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    email: adminEmail,
                    password: this.adminPassword
                })
            });
            
            if (response.ok) {
                this.showMessage('✅ Password reminder sent to your email!', 'success');
            } else {
                this.showMessage('Failed to send reminder', 'error');
            }
        } catch (error) {
            this.showMessage('Network error: Failed to send reminder', 'error');
            console.error('Remind password error:', error);
        } finally {
            const btn = document.getElementById('remindMeBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> Remind Me';
        }
    }

    async login() {
        const emailInput = document.getElementById('adminEmail');
        const passwordInput = document.getElementById('adminPassword');
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            this.showMessage('Please enter both email and password', 'error');
            emailInput.focus();
            return;
        }
        
        // Check credentials
        if (email !== this.adminEmail) {
            this.showMessage('Invalid admin email', 'error');
            return;
        }
        
        if (password !== this.adminPassword) {
            this.showMessage('Invalid password', 'error');
            passwordInput.focus();
            return;
        }
        
        try {
            const btn = document.getElementById('loginBtn');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            // Verify with backend
            const response = await fetch('/api/admin/verify-login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Save token with timestamp
                if (data.token) {
                    localStorage.setItem('admin_token', data.token);
                    localStorage.setItem('admin_token_time', Date.now().toString());
                }
                this.isAuthenticated = true;
                
                this.showDashboard();
                this.loadStats();
                
                this.showMessage('✅ Login successful!', 'success');
            } else {
                this.showMessage(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            this.showMessage('Network error: Login failed', 'error');
            console.error('Login error:', error);
        } finally {
            const btn = document.getElementById('loginBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
        }
    }

    cycleTheme() {
        let currentTheme = parseInt(localStorage.getItem('admin_theme_index') || '0');
        currentTheme = (currentTheme + 1) % this.themes.length;
        
        const theme = this.themes[currentTheme];
        
        // Remove all theme classes from body
        this.themes.forEach(t => {
            document.body.classList.remove(t.class);
        });
        
        // Add the current theme class
        document.body.classList.add(theme.class);
        
        // Update CSS custom properties for consistency
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.documentElement.style.setProperty('--primary-dark', this.darkenColor(theme.primary, 20));
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        
        localStorage.setItem('admin_theme_index', currentTheme.toString());
        
        this.showNotification(`Theme changed to ${theme.name}`, 'success');
    }

    darkenColor(color, percent) {
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);

        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
    }

    checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (token) {
            this.verifyToken(token);
        } else {
            this.showLogin();
        }
    }

    async verifyToken(token) {
        try {
            // Check if token exists in localStorage and is valid
            if (token && token.startsWith('admin_')) {
                const savedTime = localStorage.getItem('admin_token_time');
                const currentTime = Date.now();
                
                // Check if token is within 24 hours (86400000 milliseconds)
                if (savedTime && (currentTime - parseInt(savedTime)) < 24 * 60 * 60 * 1000) {
                    // Verify with backend
                    const response = await fetch('/api/admin/verify-token', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        this.isAuthenticated = true;
                        this.showDashboard();
                        this.loadStats();
                        return true;
                    }
                } else {
                    // Token expired, remove it
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_token_time');
                    this.showMessage('Session expired. Please login again.', 'error');
                }
            }
            
            this.showLogin();
            return false;
        } catch (error) {
            console.error('Token verification error:', error);
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
            this.showLogin();
            return false;
        }
    }

    logout() {
        this.showCustomModal(
            'Logout Confirmation',
            'Are you sure you want to logout?',
            () => {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_token_time');
                this.isAuthenticated = false;
                this.showLogin();
                this.closeSidebar();
                this.showNotification('Logged out successfully', 'success');
            },
            'Logout'
        );
    }

    showLogin() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('adminDashboard').classList.add('hidden');
        // Clear inputs
        document.getElementById('adminPassword').value = '';
        // Pre-fill the email field with admin email
        const emailInput = document.getElementById('adminEmail');
        if (emailInput) {
            emailInput.value = this.adminEmail;
        }
    }

    showDashboard() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminDashboard').classList.remove('hidden');
        this.closeSidebar(); // Close sidebar on mobile
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('loginMessage');
        messageDiv.textContent = message;
        messageDiv.className = `login-message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabName) {
                item.classList.add('active');
            }
        });
        
        // Show active tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === `${tabName}Tab`) {
                tab.classList.add('active');
            }
        });
        
        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            tokens: 'Token Management',
            requests: 'Token Requests',
            reports: 'Reports & Analytics',
            settings: 'Settings'
        };
        
        document.getElementById('pageTitle').textContent = titles[tabName];
        document.getElementById('pageSubtitle').textContent = 'Admin Control Panel';
        
        // Close sidebar on mobile
        if (window.innerWidth <= 992) {
            this.closeSidebar();
        }
        
        // Load tab data
        switch(tabName) {
            case 'dashboard':
                this.loadStats();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'tokens':
                this.loadTokens();
                break;
            case 'requests':
                this.loadRequests();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to fetch stats`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.updateStats(data.stats);
                this.updateDashboard(data.stats);
            } else {
                this.showNotification(data.message || 'Failed to load statistics', 'error');
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showNotification('Network error: Failed to load statistics', 'error');
        }
    }

    updateStats(stats) {
        if (!stats) return;
        
        // Update header stats
        if (document.getElementById('pendingApprovals')) {
            document.getElementById('pendingApprovals').textContent = stats.summary?.pendingApprovals || 0;
        }
        if (document.getElementById('totalRevenue')) {
            document.getElementById('totalRevenue').textContent = `₦${(stats.summary?.revenue || 0).toLocaleString()}`;
        }
        if (document.getElementById('totalUsers')) {
            document.getElementById('totalUsers').textContent = stats.users?.total || 0;
        }
        
        // Update pending count badge
        if (document.getElementById('pendingCount')) {
            document.getElementById('pendingCount').textContent = stats.users?.pending || 0;
        }
        
        // Update dashboard stats
        if (document.getElementById('approvedCount')) {
            document.getElementById('approvedCount').textContent = stats.users?.approved || 0;
        }
        if (document.getElementById('pendingUsersCount')) {
            document.getElementById('pendingUsersCount').textContent = stats.users?.pending || 0;
        }
        if (document.getElementById('terminatedCount')) {
            const terminated = (stats.users?.total || 0) - (stats.users?.approved || 0) - (stats.users?.pending || 0);
            document.getElementById('terminatedCount').textContent = terminated > 0 ? terminated : 0;
        }
        if (document.getElementById('activeTokens')) {
            document.getElementById('activeTokens').textContent = stats.tokens?.unused || 0;
        }
        
        // Update revenue reports
        if (document.getElementById('revenueToday')) {
            document.getElementById('revenueToday').textContent = `₦${(stats.summary?.revenue || 0).toLocaleString()}`;
        }
        if (document.getElementById('revenueWeek')) {
            document.getElementById('revenueWeek').textContent = `₦${((stats.summary?.revenue || 0) * 7).toLocaleString()}`;
        }
        if (document.getElementById('revenueMonth')) {
            document.getElementById('revenueMonth').textContent = `₦${((stats.summary?.revenue || 0) * 30).toLocaleString()}`;
        }
        if (document.getElementById('revenueTotal')) {
            document.getElementById('revenueTotal').textContent = `₦${((stats.summary?.revenue || 0) * 100).toLocaleString()}`;
        }
    }

    updateDashboard(stats) {
        // Update recent requests table
        const tableBody = document.querySelector('#recentRequestsTable tbody');
        if (!tableBody || !stats.requests?.recent) return;
        
        tableBody.innerHTML = '';
        
        if (stats.requests.recent.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center; padding: 20px;">No recent requests</td>';
            tableBody.appendChild(row);
            return;
        }
        
        stats.requests.recent.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" style="max-width: 150px;" title="${request.email}">${request.email}</td>
                <td>${request.lastRequest ? new Date(request.lastRequest).toLocaleString() : 'N/A'}</td>
                <td><span class="status-badge status-${request.status || 'pending'}">${request.status || 'pending'}</span></td>
                <td>
                    <button class="btn-secondary small" onclick="admin.viewUserDetails('${request.email}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to load users`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderUsersTable(data.users);
            } else {
                this.showNotification(data.message || 'Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Network error: Failed to load users', 'error');
        }
    }

    renderUsersTable(users) {
        const tableBody = document.querySelector('#usersTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!users || Object.keys(users).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">No users found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(users).forEach(([email, user]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" style="max-width: 150px;" title="${email}">${email}</td>
                <td><span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span></td>
                <td><span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">${user.paid ? 'Paid' : 'Pending'}</span></td>
                <td>${user.totalRequests || 0}</td>
                <td>${user.lastRequest ? new Date(user.lastRequest).toLocaleString() : 'Never'}</td>
                <td>
                    <div class="action-buttons d-flex gap-10 flex-wrap">
                        <button class="btn-secondary small" onclick="admin.viewUserDetails('${email}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-secondary small ${user.paid ? 'danger' : 'success'}" 
                                onclick="admin.togglePaymentStatus('${email}', ${!user.paid})" title="${user.paid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                            <i class="fas ${user.paid ? 'fa-times' : 'fa-check'}"></i>
                        </button>
                        <button class="btn-secondary small danger" onclick="admin.deleteUser('${email}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async loadTokens() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/tokens', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to load tokens`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderTokensTable(data.tokens);
            } else {
                this.showNotification(data.message || 'Failed to load tokens', 'error');
            }
        } catch (error) {
            console.error('Error loading tokens:', error);
            this.showNotification('Network error: Failed to load tokens', 'error');
        }
    }

    renderTokensTable(tokens) {
        const tableBody = document.querySelector('#tokensTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!tokens || Object.keys(tokens).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">No tokens found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(tokens).forEach(([token, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code class="text-truncate" style="max-width: 200px;" title="${token}">${token}</code></td>
                <td class="text-truncate" style="max-width: 150px;" title="${data.email}">${data.email}</td>
                <td>${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Unknown'}</td>
                <td>${data.used ? 'Yes' : 'No'}</td>
                <td><span class="status-badge ${data.paid ? 'status-paid' : 'status-pending'}">${data.paid ? 'Paid' : 'Free'}</span></td>
                <td>
                    <button class="btn-secondary small" onclick="admin.copyToken('${token}')" title="Copy Token">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async loadRequests() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/requests', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to load requests`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderRequestsTable(data.requests);
            } else {
                this.showNotification(data.message || 'Failed to load requests', 'error');
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            this.showNotification('Network error: Failed to load requests', 'error');
        }
    }

    renderRequestsTable(requests) {
        const tableBody = document.querySelector('#requestsTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!requests || Object.keys(requests).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">No requests found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(requests).forEach(([email, requestList]) => {
            if (requestList && requestList.length > 0) {
                const lastRequest = requestList[requestList.length - 1];
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-truncate" style="max-width: 150px;" title="${email}">${email}</td>
                    <td><code>${lastRequest.ip || 'Unknown'}</code></td>
                    <td>${lastRequest.city || 'Unknown'}, ${lastRequest.country || 'Unknown'}</td>
                    <td class="text-truncate" style="max-width: 200px;" title="${lastRequest.userAgent || 'Unknown'}">${this.truncateString(lastRequest.userAgent || 'Unknown', 50)}</td>
                    <td>${lastRequest.timestamp ? new Date(lastRequest.timestamp).toLocaleString() : 'Unknown'}</td>
                    <td><span class="status-badge status-${lastRequest.status || 'pending'}">${lastRequest.status || 'pending'}</span></td>
                `;
                tableBody.appendChild(row);
            }
        });
    }

    async loadReports() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to load reports`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderCharts(data.stats);
            } else {
                this.showNotification(data.message || 'Failed to load reports', 'error');
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showNotification('Network error: Failed to load reports', 'error');
        }
    }

    renderCharts(stats) {
        if (!stats) return;
        
        // User Distribution Chart
        const userCtx = document.getElementById('userDistributionChart')?.getContext('2d');
        if (userCtx) {
            // Destroy existing chart if it exists
            if (this.charts.userDistribution) {
                this.charts.userDistribution.destroy();
            }
            
            const approved = stats.users?.approved || 0;
            const pending = stats.users?.pending || 0;
            const terminated = (stats.users?.total || 0) - approved - pending;
            
            this.charts.userDistribution = new Chart(userCtx, {
                type: 'pie',
                data: {
                    labels: ['Approved', 'Pending', 'Terminated'],
                    datasets: [{
                        data: [approved, pending, terminated > 0 ? terminated : 0],
                        backgroundColor: [
                            '#10b981',
                            '#f59e0b',
                            '#ef4444'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }
        
        // Daily Activity Chart
        const activityCtx = document.getElementById('dailyActivityChart')?.getContext('2d');
        if (activityCtx) {
            // Destroy existing chart if it exists
            if (this.charts.dailyActivity) {
                this.charts.dailyActivity.destroy();
            }
            
            // Generate sample data for daily activity
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const activityData = days.map(() => Math.floor(Math.random() * 50) + 10);
            
            this.charts.dailyActivity = new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Requests',
                        data: activityData,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        }
    }

    async viewUserDetails(email) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch(`/api/admin/user/${encodeURIComponent(email)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to load user details`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showUserDetailsModal(data.userDetails);
            } else {
                this.showNotification(data.message || 'Failed to load user details', 'error');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showNotification('Network error: Failed to load user details', 'error');
        }
    }

    showUserDetailsModal(userDetails) {
        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('userDetailsContent');
        
        if (!userDetails || !userDetails.user) {
            content.innerHTML = '<p>Error loading user details</p>';
            modal.classList.add('active');
            return;
        }
        
        const user = userDetails.user;
        content.innerHTML = `
            <div class="user-details">
                <div class="detail-item">
                    <label>Email:</label>
                    <span class="text-truncate" title="${user.email}">${user.email}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span>
                </div>
                <div class="detail-item">
                    <label>Payment Status:</label>
                    <span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">${user.paid ? 'Paid' : 'Pending'}</span>
                </div>
                <div class="detail-item">
                    <label>First Request:</label>
                    <span>${user.firstRequest ? new Date(user.firstRequest).toLocaleString() : 'Never'}</span>
                </div>
                <div class="detail-item">
                    <label>Total Requests:</label>
                    <span>${userDetails.totalRequests || 0}</span>
                </div>
                <div class="detail-item">
                    <label>Location:</label>
                    <span>${user.location || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <label>IP Addresses:</label>
                    <div class="ip-list">
                        ${user.ipAddresses?.map(ip => `<code>${ip}</code>`).join(', ') || 'None'}
                    </div>
                </div>
                <div class="detail-item">
                    <label>Token:</label>
                    <code class="text-truncate" style="display: block; max-width: 100%;" title="${user.token || 'No token'}">${user.token || 'No token'}</code>
                </div>
                
                <div class="action-buttons d-flex gap-10 flex-wrap" style="margin-top: 20px;">
                    <button class="btn-primary" onclick="admin.togglePaymentStatus('${user.email}', ${!user.paid})">
                        <i class="fas ${user.paid ? 'fa-times' : 'fa-check'}"></i>
                        ${user.paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                    </button>
                    ${user.token ? `
                        <button class="btn-secondary" onclick="admin.copyToken('${user.token}')">
                            <i class="fas fa-copy"></i> Copy Token
                        </button>
                    ` : ''}
                    <button class="btn-secondary danger" onclick="admin.deleteUser('${user.email}')">
                        <i class="fas fa-trash"></i> Delete User
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    async togglePaymentStatus(email, paid) {
        this.showCustomModal(
            'Update Payment Status',
            `Are you sure you want to mark user <strong>${email}</strong> as <strong>${paid ? 'paid' : 'not paid'}</strong>?`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch('/api/admin/user/payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ email, paid })
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.showNotification('Session expired, please login again', 'error');
                            this.showLogin();
                            return;
                        }
                        throw new Error(`HTTP ${response.status}: Failed to update payment`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(`User marked as ${paid ? 'paid' : 'not paid'} successfully!`, 'success');
                        this.loadStats();
                        this.loadUsers();
                        this.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error updating payment:', error);
                    this.showNotification('Network error: Failed to update payment status', 'error');
                }
            },
            paid ? 'Mark as Paid' : 'Mark as Unpaid'
        );
    }

    async deleteUser(email) {
        this.showCustomModal(
            'Delete User',
            `Are you sure you want to delete user <strong>${email}</strong>?<br><br>
             <span style="color: var(--danger-color); font-weight: 600;">
                <i class="fas fa-exclamation-triangle"></i> This action cannot be undone!
             </span>`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch(`/api/admin/user/${encodeURIComponent(email)}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.showNotification('Session expired, please login again', 'error');
                            this.showLogin();
                            return;
                        }
                        throw new Error(`HTTP ${response.status}: Failed to delete user`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification('User deleted successfully!', 'success');
                        this.loadStats();
                        this.loadUsers();
                        this.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    this.showNotification('Network error: Failed to delete user', 'error');
                }
            },
            'Delete User'
        );
    }

    showGenerateTokenModal() {
        const modal = document.getElementById('generateTokenModal');
        const emailInput = document.getElementById('tokenEmail');
        emailInput.value = '';
        modal.classList.add('active');
    }

    async generateToken() {
        const emailInput = document.getElementById('tokenEmail');
        const email = emailInput.value.trim();
        const paid = document.getElementById('tokenPaymentStatus').value === 'true';
        
        if (!email || !this.validateEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            emailInput.focus();
            return;
        }
        
        this.showCustomModal(
            'Generate Token',
            `Generate a token for user <strong>${email}</strong>?<br>
             Payment status: <strong>${paid ? 'Paid' : 'Free'}</strong>`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch('/api/admin/token/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ email, paid })
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.showNotification('Session expired, please login again', 'error');
                            this.showLogin();
                            return;
                        }
                        throw new Error(`HTTP ${response.status}: Failed to generate token`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(`Token generated successfully! ${data.existing ? '(Already existed)' : ''}`, 'success');
                        emailInput.value = '';
                        this.closeModal(document.getElementById('generateTokenModal'));
                        this.loadStats();
                        this.loadTokens();
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error generating token:', error);
                    this.showNotification('Network error: Failed to generate token', 'error');
                }
            },
            'Generate Token'
        );
    }

    copyToken(token) {
        navigator.clipboard.writeText(token)
            .then(() => {
                this.showNotification('Token copied to clipboard!', 'success');
            })
            .catch(() => {
                this.showNotification('Failed to copy token', 'error');
            });
    }

    async backupData() {
        this.showCustomModal(
            'Backup Data',
            'Are you sure you want to backup all data to cloud?<br><br>This will create a secure backup of all user data, tokens, and requests.',
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch('/api/admin/backup', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.showNotification('Session expired, please login again', 'error');
                            this.showLogin();
                            return;
                        }
                        throw new Error(`HTTP ${response.status}: Failed to backup`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification('Backup completed successfully!', 'success');
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error backing up:', error);
                    this.showNotification('Network error: Backup failed', 'error');
                }
            },
            'Backup Now'
        );
    }

    async restoreBackup() {
        this.showCustomModal(
            'Restore Backup',
            '⚠️ <strong>WARNING:</strong> Are you sure you want to restore from backup?<br><br><span style="color: var(--danger-color);">This will overwrite current data!<br>All existing users, tokens, and requests will be replaced with backup data.</span>',
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch('/api/admin/restore', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.showNotification('Session expired, please login again', 'error');
                            this.showLogin();
                            return;
                        }
                        throw new Error(`HTTP ${response.status}: Failed to restore`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification('Restore completed successfully!', 'success');
                        this.loadStats();
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error restoring:', error);
                    this.showNotification('Network error: Restore failed', 'error');
                }
            },
            'Restore Backup'
        );
    }

    searchUsers(query) {
        const rows = document.querySelectorAll('#usersTable tbody tr');
        rows.forEach(row => {
            const email = row.cells[0]?.textContent?.toLowerCase() || '';
            if (email.includes(query.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterUsers(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        const rows = document.querySelectorAll('#usersTable tbody tr');
        rows.forEach(row => {
            const status = row.cells[1]?.textContent?.toLowerCase() || '';
            const paid = row.cells[2]?.textContent?.toLowerCase() || '';
            
            let show = false;
            switch(filter) {
                case 'all':
                    show = true;
                    break;
                case 'pending':
                    show = status === 'pending';
                    break;
                case 'approved':
                    show = status === 'approved';
                    break;
                case 'paid':
                    show = paid === 'paid';
                    break;
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

    handleQuickAction(action) {
        switch(action) {
            case 'generateToken':
                this.showGenerateTokenModal();
                break;
            case 'sendBulkEmail':
                this.showCustomModal(
                    'Coming Soon',
                    'The bulk email feature is currently under development.<br><br>Check back soon for updates!',
                    null,
                    'Got it'
                );
                break;
            case 'backupData':
                this.backupData();
                break;
            case 'viewReports':
                this.switchTab('reports');
                break;
        }
    }

    closeModal(modal) {
        modal.classList.remove('active');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container or create one
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    truncateString(str, maxLength) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }
}

// Add notification styles and custom modal styles
const style = document.createElement('style');
style.textContent = `
/* Custom Modal Styles */
.custom-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
}

.custom-modal.hidden {
    display: none;
}

.custom-modal .modal-content {
    background: white;
    border-radius: var(--border-radius);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--shadow-lg);
    animation: modalSlideIn 0.3s ease;
    border: 1px solid var(--border-color);
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.custom-modal .modal-header {
    padding: 20px 25px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.custom-modal .modal-header h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--dark-color);
}

.custom-modal .modal-close {
    background: none;
    border: none;
    color: var(--gray-color);
    font-size: 24px;
    cursor: pointer;
    transition: var(--transition);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.custom-modal .modal-close:hover {
    background: var(--gray-light);
    color: var(--danger-color);
}

.custom-modal .modal-body {
    padding: 25px;
    color: var(--gray-color);
    line-height: 1.6;
}

.custom-modal .modal-footer {
    padding: 20px 25px;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 15px;
    justify-content: flex-end;
}

.custom-modal .modal-btn {
    padding: 10px 20px;
    border-radius: var(--border-radius);
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    font-size: 14px;
    min-width: 100px;
}

.custom-modal .modal-btn.primary {
    background: var(--primary-color);
    color: white;
}

.custom-modal .modal-btn.primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

.custom-modal .modal-btn.secondary {
    background: var(--gray-light);
    color: var(--dark-color);
    border: 1px solid var(--border-color);
}

.custom-modal .modal-btn.secondary:hover {
    background: white;
    border-color: var(--primary-color);
}

.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.notification {
    background: white;
    padding: 15px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 300px;
    max-width: 400px;
    animation: slideInRight 0.3s ease;
    border-left: 4px solid #4f46e5;
}

.notification.success {
    border-left-color: #10b981;
}

.notification.error {
    border-left-color: #ef4444;
}

.notification.warning {
    border-left-color: #f59e0b;
}

.notification.info {
    border-left-color: #3b82f6;
}

.notification i {
    font-size: 20px;
}

.notification.success i {
    color: #10b981;
}

.notification.error i {
    color: #ef4444;
}

.notification.warning i {
    color: #f59e0b;
}

.notification.info i {
    color: #3b82f6;
}

.notification span {
    flex: 1;
    font-size: 14px;
}

.notification-close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
}

.notification-close:hover {
    color: #1f2937;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Theme Cycling Styles */
.theme-toggle {
    cursor: pointer;
    transition: var(--transition);
}

.theme-toggle:hover {
    color: var(--primary-color);
    transform: scale(1.05);
}

.theme-toggle i {
    transition: transform 0.3s ease;
}

.theme-toggle:hover i {
    transform: rotate(15deg);
}

/* Ensure theme classes work properly */
body.theme-purple {
    --primary-color: #4f46e5;
    --primary-dark: #3730a3;
    --secondary-color: #8b5cf6;
}

body.theme-blue {
    --primary-color: #3b82f6;
    --primary-dark: #1e40af;
    --secondary-color: #60a5fa;
}

body.theme-green {
    --primary-color: #10b981;
    --primary-dark: #047857;
    --secondary-color: #34d399;
}

body.theme-orange {
    --primary-color: #f59e0b;
    --primary-dark: #d97706;
    --secondary-color: #fbbf24;
}

body.theme-red {
    --primary-color: #ef4444;
    --primary-dark: #dc2626;
    --secondary-color: #f87171;
}

body.theme-violet {
    --primary-color: #8b5cf6;
    --primary-dark: #7c3aed;
    --secondary-color: #a78bfa;
}

body.theme-pink {
    --primary-color: #ec4899;
    --primary-dark: #db2777;
    --secondary-color: #f472b6;
}

body.theme-teal {
    --primary-color: #14b8a6;
    --primary-dark: #0d9488;
    --secondary-color: #2dd4bf;
}

body.theme-amber {
    --primary-color: #f97316;
    --primary-dark: #ea580c;
    --secondary-color: #fb923c;
}

body.theme-indigo {
    --primary-color: #6366f1;
    --primary-dark: #4f46e5;
    --secondary-color: #818cf8;
}
`;
document.head.appendChild(style);

// ===== ADMIN ACCESS CHECK =====
function checkAdminAccess() {
    const adminToken = localStorage.getItem('admin_token');
    const adminTokenTime = localStorage.getItem('admin_token_time');
    
    if (adminToken && adminTokenTime) {
        const currentTime = Date.now();
        const tokenAge = currentTime - parseInt(adminTokenTime);
        const hours24 = 24 * 60 * 60 * 1000;
        
        if (tokenAge < hours24) {
            // Token is valid for 24 hours, show admin link
            const adminNavItem = document.querySelector('.nav-item[onclick*="admin.html"]');
            if (adminNavItem) {
                adminNavItem.innerHTML = `
                    <i class="fas fa-lock"></i>
                    <span>Admin Dashboard</span>
                    <span style="margin-left: auto; font-size: 10px; background: var(--accent-success); color: white; padding: 2px 6px; border-radius: 10px;">Active</span>
                `;
                adminNavItem.style.color = 'var(--accent-success)';
            }
            console.log('Admin access active (valid for next', Math.round((hours24 - tokenAge) / (60 * 60 * 1000)), 'hours)');
        } else {
            // Token expired, clear it
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
            console.log('Admin token expired');
        }
    }
}

// Initialize admin dashboard
const admin = new AdminDashboard();

// Call this function to check admin access on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
});

// Also add this function to refresh admin status periodically
setInterval(checkAdminAccess, 5 * 60 * 1000); // Check every 5 minutes