// ===== ADMIN DASHBOARD JAVASCRIPT PUBLIC FOLDER - FIXED VERSION =====
class AdminDashboard {
    constructor() {
        // Admin credentials will be fetched from the server
        this.adminEmail = null;
        this.isAuthenticated = false;
        this.currentTab = 'dashboard';
        this.charts = {};
        this.themes = [
            { 
                primary: '#7c3aed', 
                secondary: '#4f46e5', 
                name: 'Light Mode', 
                class: 'theme-light',
                sidebarBg: 'linear-gradient(180deg, #7c3aed 0%, #4f46e5 100%)'
            },
            { 
                primary: '#8b5cf6', 
                secondary: '#6366f1', 
                name: 'Dark Mode', 
                class: 'theme-dark',
                sidebarBg: 'linear-gradient(180deg, #111827 0%, #000000 100%)'
            }
        ];
        
        // Status colors mapping
        this.statusColors = {
            'paid': '#10b981',
            'pending': '#f59e0b',
            'free': '#8b5cf6',
            'approved': '#3b82f6',
            'terminated': '#ef4444',
            'active': '#06b6d4',
            'expired': '#6b7280',
            'revoked': '#991b1b'
        };
        
        // Add login history tab
        this.loginHistory = [];
        
        // Chart animation interval
        this.chartAnimationInterval = null;
        this.revenueUpdateInterval = null;
        
        this.init();
    }

    async init() {
        await this.fetchAdminInfo();
        this.bindEvents();
        this.checkAuth();
        this.initCustomModal();
        this.loadSavedTheme();
        this.updateLoginModal();
        this.initChartAnimations();
        this.initRevenueAutoUpdate();
        this.initInlineEvents();
        
        // Test connection on startup
        await this.testConnection();
    }

    // Test backend connection
    async testConnection() {
        try {
            const response = await fetch('/api/admin/health');
            if (response.ok) {
                console.log('✅ Backend connection successful');
            } else {
                console.warn('⚠️ Backend connection may have issues');
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
        }
    }

    // Initialize inline event handlers
    initInlineEvents() {
        // Function to update admin email display
        const updateAdminEmailDisplay = (email) => {
            const emailDisplay = document.getElementById('adminEmailDisplay');
            const settingsEmail = document.getElementById('settingsAdminEmail');
            
            if (email) {
                if (emailDisplay) {
                    emailDisplay.innerHTML = `<i class="fas fa-envelope"></i> Admin: ${email}`;
                }
                if (settingsEmail) {
                    settingsEmail.textContent = email;
                }
                
                // Pre-fill login email field
                const loginEmailField = document.getElementById('adminEmail');
                if (loginEmailField && !loginEmailField.value) {
                    loginEmailField.value = email;
                }
            }
        };
        
        // Fetch admin info on page load
        const fetchAdminInfo = async () => {
            try {
                const response = await fetch('/api/admin/settings');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.settings) {
                        updateAdminEmailDisplay(data.settings.adminEmail);
                    }
                }
            } catch (error) {
                console.error('Error fetching admin info:', error);
                // Fallback to generic display
                updateAdminEmailDisplay('admin@example.com');
            }
        };
        
        // Call fetchAdminInfo when page loads
        fetchAdminInfo();
        
        // Load saved email template
        const savedTemplate = localStorage.getItem('admin_email_template') || 'premium';
        document.querySelectorAll('.template-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.template === savedTemplate) {
                option.classList.add('selected');
            }
        });
        
        // Add click handlers for template options
        document.querySelectorAll('.template-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.template-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                localStorage.setItem('admin_email_template', this.dataset.template);
                
                // Update select element
                const select = document.getElementById('emailTemplate');
                if (select) {
                    select.value = this.dataset.template;
                }
                
                // Show notification
                if (window.admin && window.admin.showNotification) {
                    window.admin.showNotification(
                        this.dataset.template === 'premium' 
                            ? '✅ Premium template selected!' 
                            : '✅ Default template selected!',
                        'info'
                    );
                }
            });
        });
        
        // Auto backup settings
        const savedBackup = localStorage.getItem('admin_auto_backup') || 'weekly';
        const backupSelect = document.getElementById('autoBackup');
        if (backupSelect) {
            backupSelect.value = savedBackup;
            backupSelect.addEventListener('change', function(e) {
                localStorage.setItem('admin_auto_backup', e.target.value);
                if (window.admin && window.admin.showNotification) {
                    window.admin.showNotification(`Auto backup set to ${e.target.value}`, 'info');
                }
            });
        }
        
        // Session timeout settings
        const savedTimeout = localStorage.getItem('admin_session_timeout') || '24';
        const timeoutSelect = document.getElementById('sessionTimeout');
        if (timeoutSelect) {
            timeoutSelect.value = savedTimeout;
            timeoutSelect.addEventListener('change', function(e) {
                localStorage.setItem('admin_session_timeout', e.target.value);
                if (window.admin && window.admin.showNotification) {
                    window.admin.showNotification(`Session timeout set to ${e.target.value} hours`, 'info');
                }
            });
        }
        
        // Initialize revenue glow effect
        setInterval(() => {
            const revenueElements = document.querySelectorAll('.revenue-glow');
            revenueElements.forEach(el => {
                el.classList.toggle('revenue-glow');
                setTimeout(() => el.classList.add('revenue-glow'), 100);
            });
        }, 3000);
        
        // Save email settings button
        const saveEmailSettingsBtn = document.getElementById('saveEmailSettings');
        if (saveEmailSettingsBtn) {
            saveEmailSettingsBtn.addEventListener('click', function() {
                const templateSelect = document.getElementById('emailTemplate');
                const selectedTemplate = templateSelect ? templateSelect.value : 'premium';
                
                if (window.admin && window.admin.showNotification) {
                    window.admin.showNotification(
                        selectedTemplate === 'premium' 
                            ? '✅ Premium email template saved!' 
                            : '✅ Default email template saved!',
                        'success'
                    );
                }
                
                // Save to localStorage
                localStorage.setItem('admin_email_template', selectedTemplate);
                
                // Update template options UI
                document.querySelectorAll('.template-option').forEach(option => {
                    option.classList.remove('selected');
                    if (option.dataset.template === selectedTemplate) {
                        option.classList.add('selected');
                    }
                });
            });
        }
        
        // Filter buttons functionality
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.dataset.filter;
                
                // Update active button
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Call admin filter function
                if (window.admin && window.admin.filterUsers) {
                    window.admin.filterUsers(filter);
                }
            });
        });
        
        // Search functionality
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', function(e) {
                if (window.admin && window.admin.searchUsers) {
                    window.admin.searchUsers(e.target.value);
                }
            });
        }
        
        // Session search functionality
        const sessionSearch = document.getElementById('sessionSearch');
        if (sessionSearch) {
            sessionSearch.addEventListener('input', function(e) {
                if (window.admin && window.admin.searchSessions) {
                    window.admin.searchSessions(e.target.value);
                }
            });
        }
        
        // Grant search functionality
        const grantSearch = document.getElementById('grantSearch');
        if (grantSearch) {
            grantSearch.addEventListener('input', function(e) {
                if (window.admin && window.admin.searchGrants) {
                    window.admin.searchGrants(e.target.value);
                }
            });
        }
    }

    // Fetch admin info from server
    async fetchAdminInfo() {
        try {
            const response = await fetch('/api/admin/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings) {
                    this.adminEmail = data.settings.adminEmail;
                    // Pre-fill email field if available
                    const emailInput = document.getElementById('adminEmail');
                    if (emailInput && this.adminEmail) {
                        emailInput.value = this.adminEmail;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching admin info:', error);
        }
    }

    // Initialize automatic chart animations
    initChartAnimations() {
        // Start chart animations when reports tab is active
        document.querySelector('.menu-item[data-tab="reports"]')?.addEventListener('click', () => {
            setTimeout(() => {
                this.startChartAnimations();
            }, 500);
        });
    }

    startChartAnimations() {
        // Clear any existing interval
        if (this.chartAnimationInterval) {
            clearInterval(this.chartAnimationInterval);
        }

        // Animate charts every 5 seconds
        this.chartAnimationInterval = setInterval(() => {
            this.animateCharts();
        }, 5000);
    }

    animateCharts() {
        // Animate user distribution chart
        if (this.charts.userDistribution) {
            this.charts.userDistribution.update();
        }

        // Animate daily activity chart
        if (this.charts.dailyActivity) {
            // Generate new random data for animation
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const activityData = days.map(() => Math.floor(Math.random() * 50) + 10);
            
            if (this.charts.dailyActivity.data.datasets[0]) {
                this.charts.dailyActivity.data.datasets[0].data = activityData;
                this.charts.dailyActivity.update();
            }
        }
    }

    // Initialize automatic revenue updates
    initRevenueAutoUpdate() {
        // Clear any existing interval
        if (this.revenueUpdateInterval) {
            clearInterval(this.revenueUpdateInterval);
        }

        // Update revenue every 10 seconds
        this.revenueUpdateInterval = setInterval(() => {
            if (this.currentTab === 'dashboard' || this.currentTab === 'reports') {
                this.loadStats();
            }
        }, 10000);
    }

    updateLoginModal() {
        // Update login modal with gradient styling
        const loginModal = document.querySelector('.login-modal');
        if (loginModal) {
            loginModal.style.background = 'linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)';
        }
        
        // Add logo to login header if not exists
        const loginHeader = document.querySelector('.login-header');
        if (loginHeader && !loginHeader.querySelector('.logo')) {
            loginHeader.innerHTML = `
                <div class="logo">
                    <i class="fas fa-lock"></i>
                </div>
                <h2>Admin Dashboard</h2>
                <p>Secure access to management console</p>
            `;
        }
    }

    // Update Premium Template Settings
    async updatePremiumTemplate() {
        try {
            const templateSelect = document.querySelector('#emailTemplate');
            if (!templateSelect) return;
            
            const selectedTemplate = templateSelect.value;
            
            this.showCustomModal(
                'Update Email Template',
                `<div class="form-group">
                    <label>Selected Template:</label>
                    <div class="premium-template-option ${selectedTemplate === 'premium' ? 'selected' : ''}">
                        <i class="fas ${selectedTemplate === 'premium' ? 'fa-star' : 'fa-envelope'}"></i>
                        <span>${selectedTemplate === 'premium' ? 'Premium Template' : 'Default Template'}</span>
                    </div>
                </div>
                <div class="form-group">
                    <label>Template Features:</label>
                    <ul>
                        <li>${selectedTemplate === 'premium' ? '✅ Gradient backgrounds' : 'Basic styling'}</li>
                        <li>${selectedTemplate === 'premium' ? '✅ Animated elements' : 'No animations'}</li>
                        <li>${selectedTemplate === 'premium' ? '✅ Interactive buttons' : 'Standard buttons'}</li>
                        <li>${selectedTemplate === 'premium' ? '✅ Enhanced mobile view' : 'Responsive design'}</li>
                    </ul>
                </div>
                <div class="warning-box" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05)); border: 2px solid var(--status-pending); padding: 12px; border-radius: 8px; margin: 15px 0;">
                    <i class="fas fa-exclamation-triangle" style="color: var(--status-pending);"></i>
                    <small style="color: var(--gray-color);">Changing template will affect all outgoing emails.</small>
                </div>`,
                async () => {
                    try {
                        const token = localStorage.getItem('admin_token');
                        if (!token) {
                            this.showNotification('Please login again', 'error');
                            this.showLogin();
                            return;
                        }
                        
                        const response = await fetch('/api/admin/settings/update-template', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ 
                                template: selectedTemplate
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            this.showNotification(`✅ Email template updated to ${selectedTemplate === 'premium' ? 'Premium' : 'Default'}`, 'success');
                        } else {
                            this.showNotification(data.message, 'error');
                        }
                    } catch (error) {
                        console.error('Error updating template:', error);
                        this.showNotification('Failed to update template', 'error');
                    }
                },
                'Update Template'
            );
        } catch (error) {
            console.error('Error in updatePremiumTemplate:', error);
        }
    }

    // Edit Revenue with Auto Update
    async editRevenue(email) {
        // First get user details to show current revenue
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
            
            if (!response.ok) return;
            
            const data = await response.json();
            if (!data.success || !data.userDetails) return;
            
            const user = data.userDetails.user;
            const currentRevenue = user.amountPaid || 0;
            
            this.showCustomModal(
                'Edit Revenue',
                `<div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="editRevenueEmail" value="${email}" readonly style="background: var(--gray-light);">
                </div>
                <div class="form-group">
                    <label>Current Revenue: <strong style="color: var(--status-paid);">₦${currentRevenue.toLocaleString()}</strong></label>
                </div>
                <div class="form-group">
                    <label>New Revenue Amount (₦):</label>
                    <input type="number" id="editRevenueAmount" value="${currentRevenue}" min="0" step="100">
                </div>
                <div class="form-group">
                    <label>Adjustment Reason:</label>
                    <input type="text" id="editRevenueNote" placeholder="e.g., Manual adjustment, payment correction">
                </div>
                <div class="warning-box" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05)); border: 2px solid var(--status-pending); padding: 12px; border-radius: 8px; margin: 15px 0;">
                    <i class="fas fa-exclamation-triangle" style="color: var(--status-pending);"></i>
                    <small style="color: var(--gray-color);">Note: This will override the current revenue amount. Use negative values to decrease revenue.</small>
                </div>`,
                async () => {
                    try {
                        const amount = document.getElementById('editRevenueAmount').value;
                        const note = document.getElementById('editRevenueNote').value;
                        
                        const response = await fetch('/api/admin/user/edit-revenue', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ 
                                email: email,
                                amount: parseInt(amount),
                                note: note
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            this.showNotification(`✅ Revenue updated for ${email}: ₦${parseInt(amount).toLocaleString()}`, 'success');
                            this.loadStats();
                            this.loadUsers();
                            this.closeModal(document.getElementById('userDetailsModal'));
                        } else {
                            this.showNotification(data.message, 'error');
                        }
                    } catch (error) {
                        console.error('Error updating revenue:', error);
                        this.showNotification('Failed to update revenue', 'error');
                    }
                },
                'Update Revenue'
            );
        } catch (error) {
            console.error('Error loading user for revenue edit:', error);
            this.showNotification('Failed to load user details', 'error');
        }
    }

    // Terminate Token Function
    async terminateToken(email) {
        this.showCustomModal(
            'Terminate Token',
            `Are you sure you want to terminate the token for user <strong style="color: var(--primary-color);">${email}</strong>?<br><br>
             <div class="terminate-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong style="color: var(--status-terminated);">WARNING:</strong> This action will:<br>
                1. Immediately invalidate the user's token<br>
                2. Change user status to "terminated"<br>
                3. Prevent further access to the bot<br>
                4. Notify the user via email<br><br>
                <span style="color: var(--dark-color);">This action cannot be undone!</span>
             </div>`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch('/api/admin/token/terminate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ email: email })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(`✅ Token terminated for ${email}. User has been notified.`, 'success');
                        this.loadStats();
                        this.loadUsers();
                        this.loadTokens();
                        this.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error terminating token:', error);
                    this.showNotification('Failed to terminate token', 'error');
                }
            },
            'Terminate Token'
        );
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
            this.applyThemeColors(theme);
        }
    }

    applyThemeColors(theme) {
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        document.documentElement.style.setProperty('--gradient-start', theme.primary);
        document.documentElement.style.setProperty('--gradient-end', theme.secondary);
        
        // Update sidebar background
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.background = theme.sidebarBg;
        }
        
        // Force a repaint to ensure changes take effect
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = '';
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
        // Login events - FIXED: Added proper event listeners
        document.getElementById('remindMeBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.remindPassword();
        });
        
        document.getElementById('loginBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Enter key for login
        document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.login();
            }
        });
        
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
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = btn.closest('.modal');
                if (modal) this.closeModal(modal);
            });
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
        document.getElementById('generateTokenConfirm')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.generateToken();
        });
        
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
                themeBtn.className = 'theme-toggle';
                themeBtn.id = 'themeToggleBtn';
                themeBtn.innerHTML = `
                    <i class="fas fa-moon"></i>
                    <span>Toggle Dark/Light</span>
                `;
                themeBtn.addEventListener('click', () => this.cycleTheme());
                sidebarFooter.insertBefore(themeBtn, sidebarFooter.querySelector('.version'));
            }
        } else {
            themeToggleBtn.addEventListener('click', () => this.cycleTheme());
        }

        // Update table headers when switching to users tab
        document.querySelector('.menu-item[data-tab="users"]')?.addEventListener('click', () => {
            setTimeout(() => {
                this.updateUsersTableHeader();
            }, 100);
        });

        // Premium Template Update Event
        const emailTemplateSelect = document.querySelector('#emailTemplate');
        if (emailTemplateSelect) {
            emailTemplateSelect.addEventListener('change', () => this.updatePremiumTemplate());
        }

        // Save Settings Button Event
        const saveSettingsBtn = document.querySelector('#settingsTab .btn-primary');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveAdminSettings());
        }

        // Search sessions event
        document.getElementById('sessionSearch')?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                this.searchSessions(query);
            } else {
                this.loadSessions();
                
                // Remove search info if exists
                const searchInfo = document.querySelector('.search-results-info');
                if (searchInfo) {
                    searchInfo.remove();
                }
            }
        });
    }

    async searchUsers(query) {
        const rows = document.querySelectorAll('#usersTable tbody tr');
        let foundCount = 0;
        
        rows.forEach(row => {
            const email = row.cells[0]?.textContent?.toLowerCase() || '';
            if (email.includes(query.toLowerCase())) {
                row.style.display = '';
                foundCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show message if no results
        const tableBody = document.querySelector('#usersTable tbody');
        if (foundCount === 0 && query.length > 0) {
            if (!tableBody.querySelector('.no-results-row')) {
                const noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-results-row';
                noResultsRow.innerHTML = `
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray-color);">
                        <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; display: block; color: var(--primary-color); opacity: 0.5;"></i>
                        <h4 style="color: var(--dark-color);">No users found</h4>
                        <p>No users match "${query}"</p>
                    </td>
                `;
                tableBody.appendChild(noResultsRow);
            }
        } else {
            const noResultsRow = tableBody.querySelector('.no-results-row');
            if (noResultsRow) {
                noResultsRow.remove();
            }
        }
    }

    async filterUsers(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.filter-btn[data-filter="${filter}"]`)?.classList.add('active');
        
        const rows = document.querySelectorAll('#usersTable tbody tr');
        rows.forEach(row => {
            if (row.classList.contains('no-results-row')) {
                row.style.display = 'none';
                return;
            }
            
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
                case 'free':
                    show = row.querySelector('.status-free') !== null;
                    break;
                case 'limited':
                    // You'll need to implement grant-based filtering
                    show = false; // Placeholder
                    break;
                case 'unlimited':
                    // You'll need to implement grant-based filtering
                    show = false; // Placeholder
                    break;
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

    async grantFreeTokens(email, amount) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            // First, ensure user has a free token (not pending)
            const response = await fetch('/api/admin/token/generate-free', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email,
                    free: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Now grant free token balance
                const balanceResponse = await fetch('/api/admin/user/grant-tokens', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        email: email,
                        amount: parseInt(amount),
                        free: true
                    })
                });
                
                const balanceData = await balanceResponse.json();
                
                if (balanceData.success) {
                    this.showNotification(`✅ Granted ${amount} free tokens to ${email}. Token has been sent to user's email.`, 'success');
                    this.loadStats();
                    this.loadUsers();
                } else {
                    this.showNotification(balanceData.message, 'error');
                }
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error granting tokens:', error);
            this.showNotification('Failed to grant tokens', 'error');
        }
    }

    async editUser(email) {
        this.showCustomModal(
            'Edit User',
            `<div class="form-group">
                <label>Email:</label>
                <input type="email" id="editUserEmail" value="${email}" readonly style="background: var(--gray-light);">
            </div>
            <div class="form-group">
                <label>Status:</label>
                <select id="editUserStatus">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="terminated">Terminated</option>
                </select>
            </div>
            <div class="form-group">
                <label>Payment Status:</label>
                <select id="editUserPaid">
                    <option value="false">Not Paid</option>
                    <option value="true">Paid</option>
                </select>
            </div>
            <div class="form-group">
                <label>Token Status:</label>
                <select id="editUserTokenStatus">
                    <option value="free">Free Token</option>
                    <option value="paid">Paid Token</option>
                    <option value="terminated">Terminated</option>
                </select>
            </div>`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const newStatus = document.getElementById('editUserStatus').value;
                    const newPaid = document.getElementById('editUserPaid').value === 'true';
                    const newTokenStatus = document.getElementById('editUserTokenStatus').value;
                    
                    const response = await fetch('/api/admin/user/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ 
                            email: email,
                            status: newStatus,
                            paid: newPaid,
                            tokenStatus: newTokenStatus
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification('User updated successfully!', 'success');
                        this.loadUsers();
                        this.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error updating user:', error);
                    this.showNotification('Failed to update user', 'error');
                }
            },
            'Save Changes'
        );
    }

    // Show User Details Modal with Terminate Button
    showUserDetailsModal(userDetails) {
        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('userDetailsContent');
        
        if (!userDetails || !userDetails.user) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--gray-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: var(--status-terminated);"></i>
                    <h4 style="color: var(--dark-color);">Error loading user details</h4>
                </div>
            `;
            modal.classList.add('active');
            return;
        }
        
        const user = userDetails.user;
        
        // Get token status - Fixed: Free tokens should not show as pending
        let tokenStatus = 'No Token';
        let tokenStatusClass = 'status-pending';
        let tokenType = 'No Token';
        let tokenIcon = 'fa-key';
        
        if (user.token) {
            const isFreeToken = user.freeToken || !user.paid;
            
            if (isFreeToken) {
                tokenStatus = 'Free';
                tokenStatusClass = 'status-free';
                tokenType = 'Free Token';
                tokenIcon = 'fa-gift';
            } else if (user.paid) {
                tokenStatus = 'Paid';
                tokenStatusClass = 'status-paid';
                tokenType = 'Paid Token';
                tokenIcon = 'fa-credit-card';
            } else {
                tokenStatus = 'Pending';
                tokenStatusClass = 'status-pending';
                tokenType = 'Pending Token';
                tokenIcon = 'fa-clock';
            }
        }
        
        content.innerHTML = `
            <div class="user-details">
                <div class="detail-item">
                    <label><i class="fas fa-envelope"></i> Email:</label>
                    <span class="text-truncate" title="${user.email}">${user.email}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-info-circle"></i> Status:</label>
                    <span class="status-badge status-${user.status || 'pending'}">
                        <i class="fas fa-${user.status === 'approved' ? 'check-circle' : user.status === 'pending' ? 'clock' : 'ban'}"></i>
                        ${user.status || 'pending'}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-money-bill"></i> Payment Status:</label>
                    <span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">
                        <i class="fas ${user.paid ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${user.paid ? 'Paid' : 'Not Paid'}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-key"></i> Token Status:</label>
                    <span class="status-badge ${tokenStatusClass}">
                        <i class="fas ${tokenIcon}"></i>
                        ${tokenType}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-coins"></i> Revenue Generated:</label>
                    <span>₦${(user.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-database"></i> Token Balance:</label>
                    <span>${user.tokenBalance || 0} tokens</span>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-history"></i> First Request:</label>
                    <span>${user.firstRequest ? new Date(user.firstRequest).toLocaleString() : 'Never'}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-chart-line"></i> Total Requests:</label>
                    <span>${userDetails.totalRequests || 0}</span>
                </div>
                
                <div class="token-controls">
                    <h4><i class="fas fa-gift"></i> Token Management</h4>
                    <div class="d-flex gap-10 mb-10">
                        <input type="number" id="grantTokenAmount" placeholder="Amount" min="1" value="1">
                        <button class="btn-primary" onclick="admin.grantFreeTokens('${user.email}', document.getElementById('grantTokenAmount').value)">
                            <i class="fas fa-gift"></i> Grant Free Tokens
                        </button>
                    </div>
                    <small><i class="fas fa-info-circle"></i> Free tokens work immediately without payment</small>
                </div>
                
                <!-- TERMINATE TOKEN SECTION -->
                <div class="terminate-section">
                    <h4><i class="fas fa-ban"></i> Token Termination</h4>
                    <div class="terminate-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Warning:</strong> Terminating a token will immediately revoke access and notify the user.
                    </div>
                    <button class="btn-terminate" onclick="admin.terminateToken('${user.email}')">
                        <i class="fas fa-ban"></i> Terminate Token
                    </button>
                </div>
                
                <div class="action-buttons d-flex gap-10 flex-wrap">
                    <button class="btn-primary" onclick="admin.togglePaymentStatus('${user.email}', ${!user.paid})">
                        <i class="fas ${user.paid ? 'fa-times' : 'fa-check'}"></i>
                        ${user.paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                    </button>
                    ${user.token ? `
                        <button class="btn-secondary" onclick="admin.copyToken('${user.token}')">
                            <i class="fas fa-copy"></i> Copy Token
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="admin.editUser('${user.email}')">
                        <i class="fas fa-edit"></i> Edit User
                    </button>
                    <button class="btn-secondary warning" onclick="admin.editRevenue('${user.email}')">
                        <i class="fas fa-pencil-alt"></i> Edit Revenue
                    </button>
                    <button class="btn-secondary danger" onclick="admin.deleteUser('${user.email}')">
                        <i class="fas fa-trash"></i> Delete User
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    // Render Users Table with Correct Token Status
    renderUsersTable(users) {
        const tableBody = document.querySelector('#usersTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!users || Object.keys(users).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div>
                        <i class="fas fa-users"></i>
                        <h4>No users found</h4>
                        <p>Start by adding your first user</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(users).forEach(([email, user]) => {
            // Get revenue amount
            const revenue = user.amountPaid || 0;
            
            // Get token status - Free tokens should not show as pending
            let tokenStatus = 'No Token';
            let tokenStatusClass = 'status-pending';
            let tokenIcon = 'fa-key';
            
            if (user.token) {
                // Check if it's a free token
                if (user.freeToken) {
                    tokenStatus = 'Free';
                    tokenStatusClass = 'status-free';
                    tokenIcon = 'fa-gift';
                } else if (user.paid) {
                    tokenStatus = 'Paid';
                    tokenStatusClass = 'status-paid';
                    tokenIcon = 'fa-credit-card';
                } else {
                    tokenStatus = 'Pending';
                    tokenStatusClass = 'status-pending';
                    tokenIcon = 'fa-clock';
                }
            }
            
            // User status with icon
            let userStatusIcon = 'fa-user';
            switch(user.status) {
                case 'approved': userStatusIcon = 'fa-check-circle'; break;
                case 'pending': userStatusIcon = 'fa-clock'; break;
                case 'terminated': userStatusIcon = 'fa-ban'; break;
            }
            
            // Get grant info
            const currentSessions = user.currentSessions || 0;
            const maxSessions = user.maxSessions || 1;
            const grantUsage = maxSessions > 0 ? Math.round((currentSessions / maxSessions) * 100) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" title="${email}">
                    <i class="fas fa-envelope"></i>
                    ${email}
                </td>
                <td>
                    <span class="status-badge status-${user.status || 'pending'}">
                        <i class="fas ${userStatusIcon}"></i>
                        ${user.status || 'pending'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">
                        <i class="fas ${user.paid ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${user.paid ? 'Paid' : 'Pending'}
                    </span>
                </td>
                <td>
                    <span class="session-count ${currentSessions >= maxSessions ? 'limit-reached' : ''}">
                        ${currentSessions}/${maxSessions}
                    </span>
                </td>
                <td>
                    <div class="grant-indicator">
                        <div class="grant-bar">
                            <div class="grant-fill" style="width: ${grantUsage}%;"></div>
                        </div>
                        <span class="grant-percentage">${grantUsage}%</span>
                    </div>
                </td>
                <td class="revenue-cell ${revenue === 0 ? 'zero' : ''}">
                    <i class="fas fa-coins"></i>
                    ₦${revenue.toLocaleString()}
                </td>
                <td>
                    <div>
                        <i class="fas fa-history"></i>
                        ${user.lastRequest ? new Date(user.lastRequest).toLocaleDateString() : 'Never'}
                    </div>
                </td>
                <td>
                    <div class="action-buttons d-flex gap-10 flex-wrap">
                        <button class="btn-secondary small success" onclick="admin.viewUserDetails('${email}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-secondary small ${user.paid ? 'danger' : 'success'}" 
                                onclick="admin.togglePaymentStatus('${email}', ${!user.paid})" 
                                title="${user.paid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                            <i class="fas ${user.paid ? 'fa-times' : 'fa-check'}"></i>
                        </button>
                        <button class="btn-secondary small warning" onclick="admin.editRevenue('${email}')" title="Edit Revenue">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-secondary small terminate" onclick="admin.terminateToken('${email}')" title="Terminate Token">
                            <i class="fas fa-ban"></i>
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

    // Generate Token Function
    async generateToken() {
        const emailInput = document.getElementById('tokenEmail');
        const email = emailInput.value.trim();
        const paid = document.getElementById('tokenPaymentStatus').value === 'true';
        const sessionLimit = document.getElementById('tokenSessionLimit').value;
        const freeTokensAmount = document.getElementById('freeTokensAmount').value;
        const sendEmail = document.getElementById('sendEmailNotification').value === 'true';
        
        if (!email || !this.validateEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            emailInput.focus();
            return;
        }
        
        this.showCustomModal(
            'Generate Token',
            `Generate a token for user <strong>${email}</strong>?<br>
             <strong>Token Type:</strong> <span>${paid ? 'Paid Token' : 'Free Token'}</span><br>
             <strong>Session Limit:</strong> ${sessionLimit} sessions<br>
             ${freeTokensAmount > 0 ? `<strong>Free tokens to add:</strong> <span>${freeTokensAmount}</span><br>` : ''}
             <strong>Email Notification:</strong> ${sendEmail ? '✅ Yes' : '❌ No'}<br><br>
             ${paid ? '<span>⚠️ Note: Paid tokens require payment verification</span>' : '<span>🎁 Free tokens work immediately</span>'}`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    // Generate the token (paid or free)
                    const response = await fetch('/api/admin/token/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ 
                            email, 
                            paid,
                            free: !paid,
                            sendEmail: sendEmail
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update session limit
                        await this.updateUserGrant(email, parseInt(sessionLimit), paid);
                        
                        // Add free tokens if specified
                        if (freeTokensAmount > 0) {
                            const freeResponse = await fetch('/api/admin/user/grant-tokens', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({ 
                                    email: email,
                                    amount: parseInt(freeTokensAmount),
                                    free: true
                                })
                            });
                            
                            const freeData = await freeResponse.json();
                            
                            if (!freeData.success) {
                                this.showNotification(`Token generated but failed to add free tokens: ${freeData.message}`, 'warning');
                            }
                        }
                        
                        this.showNotification(`✅ ${paid ? 'Paid' : 'Free'} token generated successfully! ${data.existing ? '(Already existed)' : ''}`, 'success');
                        emailInput.value = '';
                        document.getElementById('freeTokensAmount').value = '';
                        this.closeModal(document.getElementById('generateTokenModal'));
                        this.loadStats();
                        this.loadTokens();
                        this.loadUsers();
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error generating token:', error);
                    this.showNotification('Network error: Failed to generate token', 'error');
                }
            },
            paid ? 'Generate Paid Token' : 'Generate Free Token'
        );
    }

    // ===== FIXED: Update User Grant and Refresh Immediately =====
    async updateUserGrant(email, maxSessions, isPaid = false) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/user/update-grant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email,
                    maxSessions: parseInt(maxSessions),
                    grantType: isPaid ? 'paid' : 'free',
                    grantUpdated: new Date().toISOString()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`✅ Grant updated for ${email}`, 'success');
                
                // Immediately refresh all relevant data
                this.loadGrants();
                this.loadUsers();
                this.loadStats();
                
                // Update active connections for this user
                this.updateUserConnections(email, maxSessions);
                
                this.closeCustomModal();
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error updating grant:', error);
            this.showNotification('Failed to update grant', 'error');
        }
    }

    // Update user connections with new grant limits
    async updateUserConnections(email, maxSessions) {
        try {
            // Get all active sessions for this user
            const response = await fetch('/api/admin/sessions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.sessions[email]) {
                    console.log(`✅ Updated grant limits for ${email}: ${maxSessions} sessions`);
                    
                    // Notify the user about the grant update
                    await this.notifyUserAboutGrantUpdate(email, maxSessions);
                }
            }
        } catch (error) {
            console.error('Error updating user connections:', error);
        }
    }

    // Notify user about grant update
    async notifyUserAboutGrantUpdate(email, maxSessions) {
        try {
            const response = await fetch('/api/admin/notify-user-grant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    maxSessions: maxSessions,
                    message: `Your session limit has been updated to ${maxSessions} sessions`
                })
            });
            
            if (response.ok) {
                console.log(`✅ User ${email} notified about grant update`);
            }
        } catch (error) {
            console.error('Error notifying user:', error);
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
            
            if (!adminEmail) {
                this.showMessage('Please enter admin email', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-key"></i> Remind Me';
                return;
            }
            
            const reminderHtml = `
                <h2>🔐 Admin Password Reminder</h2>
                <p>Your admin credentials:</p>
                <div>
                    <p><strong>Email:</strong> ${adminEmail}</p>
                </div>
                <p><strong>Login URL:</strong> <a href="${window.location.origin}/admin.html">${window.location.origin}/admin.html</a></p>
                <p><i>If you didn't request this reminder, please ignore this email.</i></p>
                <p><strong>Note:</strong> Password cannot be sent via email for security reasons.</p>
            `;
            
            // Use token manager to send email
            const response = await fetch('/api/admin/send-reminder', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    email: adminEmail
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showMessage('✅ Password reminder sent to your email!', 'success');
                } else {
                    this.showMessage(data.message, 'error');
                }
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
        
        // Update CSS custom properties
        this.applyThemeColors(theme);
        
        localStorage.setItem('admin_theme_index', currentTheme.toString());
        
        this.showNotification(`Theme changed to ${theme.name}`, 'success');
        
        // Force a style recalculation
        this.forceStyleRecalc();
    }

    forceStyleRecalc() {
        // Force browser to recalculate styles
        const root = document.documentElement;
        const primaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim();
        
        // Update button colors immediately
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.style.background = `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`;
        });
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
                localStorage.removeItem('admin_theme_index');
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
        // Clear password input only
        document.getElementById('adminPassword').value = '';
        // Email field will be pre-filled by fetchAdminInfo
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
            settings: 'Settings',
            sessions: 'Active Sessions',
            grants: 'Grants Management',
            loginHistory: 'Login History'
        };
        
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[tabName] || 'Dashboard';
        }
        
        const pageSubtitle = document.getElementById('pageSubtitle');
        if (pageSubtitle) {
            pageSubtitle.textContent = 'Admin Control Panel';
        }
        
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
                this.updateUsersTableHeader();
                break;
            case 'tokens':
                this.loadTokens();
                break;
            case 'requests':
                this.loadRequests();
                break;
            case 'reports':
                this.loadReports();
                this.startChartAnimations();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'sessions':
                this.loadSessions();
                break;
            case 'grants':
                this.loadGrants();
                break;
            case 'loginHistory':
                this.loadLoginHistory();
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
            const totalRevenue = stats.summary?.revenue || 0;
            document.getElementById('totalRevenue').textContent = `₦${totalRevenue.toLocaleString()}`;
        }
        if (document.getElementById('totalUsers')) {
            document.getElementById('totalUsers').textContent = stats.users?.total || 0;
        }
        
        // Update pending count badge
        if (document.getElementById('pendingCount')) {
            document.getElementById('pendingCount').textContent = stats.users?.pending || 0;
        }
        
        // Update dashboard stats with vibrant colors
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
        
        // Update grant counts
        if (document.getElementById('totalGrants')) {
            document.getElementById('totalGrants').textContent = stats.grants?.total || 0;
        }
        if (document.getElementById('dashboardActiveSessions')) {
            document.getElementById('dashboardActiveSessions').textContent = stats.sessions?.active || 0;
        }
        
        // Update revenue reports
        if (document.getElementById('revenueToday')) {
            const todayRevenue = Math.floor((stats.summary?.revenue || 0) / 30);
            document.getElementById('revenueToday').textContent = `₦${todayRevenue.toLocaleString()}`;
        }
        if (document.getElementById('revenueWeek')) {
            const weekRevenue = (stats.summary?.revenue || 0) * 7 / 30;
            document.getElementById('revenueWeek').textContent = `₦${Math.floor(weekRevenue).toLocaleString()}`;
        }
        if (document.getElementById('revenueMonth')) {
            document.getElementById('revenueMonth').textContent = `₦${(stats.summary?.revenue || 0).toLocaleString()}`;
        }
        if (document.getElementById('revenueTotal')) {
            const totalRevenue = (stats.summary?.revenue || 0) * 3;
            document.getElementById('revenueTotal').textContent = `₦${totalRevenue.toLocaleString()}`;
        }
        
        // Update grant distribution
        if (document.getElementById('freeGrants')) {
            document.getElementById('freeGrants').textContent = stats.grants?.free || 0;
        }
        if (document.getElementById('mediumGrants')) {
            document.getElementById('mediumGrants').textContent = stats.grants?.medium || 0;
        }
        if (document.getElementById('largeGrants')) {
            document.getElementById('largeGrants').textContent = stats.grants?.large || 0;
        }
        if (document.getElementById('unlimitedGrants')) {
            document.getElementById('unlimitedGrants').textContent = stats.grants?.unlimited || 0;
        }
    }

    updateDashboard(stats) {
        // Update recent requests table
        const tableBody = document.querySelector('#recentRequestsTable tbody');
        if (!tableBody || !stats.requests?.recent) return;
        
        tableBody.innerHTML = '';
        
        if (stats.requests.recent.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center; padding: 20px; color: var(--gray-color);">No recent requests</td>';
            tableBody.appendChild(row);
            return;
        }
        
        stats.requests.recent.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" title="${request.email}">
                    <i class="fas fa-envelope"></i>
                    ${request.email}
                </td>
                <td>
                    <i class="fas fa-calendar"></i>
                    ${request.lastRequest ? new Date(request.lastRequest).toLocaleString() : 'N/A'}
                </td>
                <td><span class="status-badge status-${request.status || 'pending'}">${request.status || 'pending'}</span></td>
                <td>
                    <span class="grant-badge">${request.grant || '1 session'}</span>
                </td>
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
            row.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div>
                        <i class="fas fa-key"></i>
                        <h4>No tokens found</h4>
                        <p>Generate your first token</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(tokens).forEach(([token, data]) => {
            // Determine token status
            let status = 'Active';
            let statusClass = 'status-active';
            let statusIcon = 'fa-check-circle';
            
            if (data.used) {
                status = 'Used';
                statusClass = 'status-terminated';
                statusIcon = 'fa-check';
            } else if (data.expires && data.expires < Date.now()) {
                status = 'Expired';
                statusClass = 'status-expired';
                statusIcon = 'fa-clock';
            } else if (data.revoked) {
                status = 'Revoked';
                statusClass = 'status-revoked';
                statusIcon = 'fa-ban';
            }
            
            // Token type with color
            let tokenTypeClass = data.freeToken ? 'status-free' : (data.paid ? 'status-paid' : 'status-pending');
            let tokenTypeText = data.freeToken ? 'Free' : (data.paid ? 'Paid' : 'Pending');
            let tokenTypeIcon = data.freeToken ? 'fa-gift' : (data.paid ? 'fa-credit-card' : 'fa-clock');
            
            // Get grant info
            const currentSessions = data.currentSessions || 0;
            const maxSessions = data.maxSessions || 1;
            const grantText = maxSessions === 1 ? '1 session' : maxSessions >= 50 ? 'Unlimited' : `${maxSessions} sessions`;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <code class="text-truncate" title="${token}">${token}</code>
                </td>
                <td class="text-truncate" title="${data.email}">
                    <i class="fas fa-envelope"></i>
                    ${data.email}
                </td>
                <td>
                    <div>
                        <i class="fas fa-calendar-alt"></i>
                        ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                </td>
                <td>
                    <span class="session-count">
                        ${currentSessions}/${maxSessions}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${tokenTypeClass}">
                        <i class="fas ${tokenTypeIcon}"></i>
                        ${tokenTypeText}
                    </span>
                </td>
                <td>
                    <span class="grant-badge">${grantText}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${status}
                    </span>
                </td>
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
            row.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-color);">
                    <i class="fas fa-network-wired"></i>
                    <h4>No requests found</h4>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(requests).forEach(([email, requestList]) => {
            if (requestList && requestList.length > 0) {
                const lastRequest = requestList[requestList.length - 1];
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-truncate" title="${email}">
                        <i class="fas fa-user"></i>
                        ${email}
                    </td>
                    <td>
                        <code>${lastRequest.ip || 'Unknown'}</code>
                    </td>
                    <td class="text-truncate" title="${lastRequest.userAgent || 'Unknown'}">
                        <i class="fas fa-desktop"></i>
                        ${this.truncateString(lastRequest.userAgent || 'Unknown', 50)}
                    </td>
                    <td>
                        <i class="fas fa-clock"></i>
                        ${lastRequest.timestamp ? new Date(lastRequest.timestamp).toLocaleString() : 'Unknown'}
                    </td>
                    <td><span class="status-badge status-${lastRequest.status || 'pending'}">${lastRequest.status || 'pending'}</span></td>
                    <td>
                        <span class="grant-badge">${lastRequest.grant || '1 session'}</span>
                    </td>
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
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderColor: [
                            '#3b82f6',
                            '#f59e0b',
                            '#ef4444'
                        ],
                        borderWidth: 2
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
                                usePointStyle: true,
                                color: 'var(--dark-color)'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'var(--card-bg)',
                            titleColor: 'var(--dark-color)',
                            bodyColor: 'var(--dark-color)',
                            borderColor: 'var(--border-color)',
                            borderWidth: 1
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutQuart'
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
            
            // Create gradient
            const gradient = activityCtx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)');
            gradient.addColorStop(1, 'rgba(124, 58, 237, 0.1)');
            
            this.charts.dailyActivity = new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Requests',
                        data: activityData,
                        borderColor: 'var(--primary-color)',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: 'var(--primary-color)',
                        pointBorderColor: 'white',
                        pointBorderWidth: 2,
                        pointRadius: 6
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
                            },
                            ticks: {
                                color: 'var(--dark-color)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                color: 'var(--dark-color)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: 'var(--dark-color)'
                            }
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeOutQuart'
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
             <span>
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
            '⚠️ <strong>WARNING:</strong> Are you sure you want to restore from backup?<br><br><span>This will overwrite current data!<br>All existing users, tokens, and requests will be replaced with backup data.</span>',
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

    // Load Admin Settings
    async loadSettings() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.populateSettings(data.settings);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateSettings(settings) {
        // Populate email template select
        const emailTemplateSelect = document.querySelector('#emailTemplate');
        if (emailTemplateSelect && settings.emailTemplate) {
            emailTemplateSelect.value = settings.emailTemplate;
        }
        
        // Populate auto backup select
        const autoBackupSelect = document.querySelector('#autoBackup');
        if (autoBackupSelect && settings.autoBackup) {
            autoBackupSelect.value = settings.autoBackup;
        }
        
        // Update admin email display
        if (settings.adminEmail) {
            this.adminEmail = settings.adminEmail;
            const emailInput = document.getElementById('adminEmail');
            if (emailInput) {
                emailInput.value = settings.adminEmail;
            }
        }
    }

    // Save Admin Settings
    async saveAdminSettings() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const emailTemplate = document.querySelector('#emailTemplate')?.value;
            const autoBackup = document.querySelector('#autoBackup')?.value;
            
            const response = await fetch('/api/admin/settings/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    emailTemplate: emailTemplate,
                    autoBackup: autoBackup
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Settings saved successfully!', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
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
            case 'manageGrants':
                this.switchTab('grants');
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

    // Update the users table header
    updateUsersTableHeader() {
        const usersTable = document.querySelector('#usersTable thead tr');
        if (usersTable) {
            usersTable.innerHTML = `
                <tr>
                    <th><i class="fas fa-envelope"></i> Email</th>
                    <th><i class="fas fa-info-circle"></i> Status</th>
                    <th><i class="fas fa-money-bill"></i> Payment</th>
                    <th><i class="fas fa-plug"></i> Sessions</th>
                    <th><i class="fas fa-layer-group"></i> Grant</th>
                    <th><i class="fas fa-coins"></i> Revenue</th>
                    <th><i class="fas fa-history"></i> Last Active</th>
                    <th><i class="fas fa-cogs"></i> Actions</th>
                </tr>
            `;
        }
    }

    // ===== ACTIVE SESSIONS MANAGEMENT =====
    async loadSessions() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/sessions', {
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
                throw new Error(`HTTP ${response.status}: Failed to load sessions`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderSessionsTable(data.sessions);
                this.updateSessionStats(data.sessions);
            } else {
                this.showNotification(data.message || 'Failed to load sessions', 'error');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showNotification('Network error: Failed to load sessions', 'error');
        }
    }

    updateSessionStats(sessions) {
        if (!sessions) return;
        
        // Calculate stats
        const totalSessions = Object.values(sessions).reduce((sum, user) => sum + user.totalSessions, 0);
        const activeSessions = Object.values(sessions).reduce((sum, user) => sum + user.connectedSessions, 0);
        const disconnectedSessions = totalSessions - activeSessions;
        
        // Update stat cards
        const totalSessionsEl = document.getElementById('totalSessions');
        const activeSessionsEl = document.getElementById('activeSessions');
        const disconnectedSessionsEl = document.getElementById('disconnectedSessions');
        
        if (totalSessionsEl) totalSessionsEl.textContent = totalSessions;
        if (activeSessionsEl) activeSessionsEl.textContent = activeSessions;
        if (disconnectedSessionsEl) disconnectedSessionsEl.textContent = disconnectedSessions;
        
        // Update badge in sidebar
        const badge = document.getElementById('activeSessionsCount');
        if (badge) {
            badge.textContent = activeSessions;
        }
    }

    // ===== FIXED: Render Sessions Table with Delete Buttons =====
    renderSessionsTable(sessions) {
        const tableBody = document.querySelector('#sessionsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!sessions || Object.keys(sessions).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="session-no-results">
                    <i class="fas fa-plug"></i>
                    <h4>No active sessions found</h4>
                    <p>Start by creating your first session</p>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(sessions).forEach(([email, userData]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="session-email">
                        <i class="fas fa-envelope"></i>
                        ${email}
                    </div>
                </td>
                <td>
                    <div class="session-sessions-list">
                        ${userData.sessions.map(session => `
                            <div class="session-session-item">
                                <div class="session-item-header">
                                    <span class="session-item-number">${session.sessionNumber}</span>
                                    <div class="session-item-status">
                                        <span class="session-dot ${session.isConnected ? 'active' : 'disconnected'}"></span>
                                        <small>${session.isConnected ? 'Connected' : 'Disconnected'}</small>
                                    </div>
                                </div>
                                <div class="session-delete-buttons">
                                    <button class="delete-single-btn" onclick="admin.deleteSession('${session.sessionNumber}', '${email}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td>
                    <div class="session-status">
                        <span class="session-dot ${userData.connectedSessions > 0 ? 'active' : 'disconnected'}"></span>
                        <span>${userData.connectedSessions > 0 ? 'Active' : 'Inactive'}</span>
                    </div>
                </td>
                <td>
                    <span>
                        ${userData.connectedSessions}/${userData.totalSessions}
                    </span>
                </td>
                <td>
                    ${userData.lastActivity ? new Date(userData.lastActivity).toLocaleString() : 'Never'}
                </td>
                <td>
                    <div class="session-actions">
                        <button class="session-action-btn view" onclick="admin.viewSessionDetails('${email}')">
                            <i class="fas fa-eye"></i> View All
                        </button>
                        ${userData.totalSessions > 0 ? `
                            <button class="session-action-btn delete-all" onclick="admin.deleteAllUserSessions('${email}')">
                                <i class="fas fa-trash-alt"></i> Delete All
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async searchSessions(query) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch('/api/admin/sessions/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Session expired, please login again', 'error');
                    this.showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: Failed to search sessions`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderSessionsTable(data.sessions);
                this.updateSessionStats(data.sessions);
                
                // Show search results count
                if (query.length > 0) {
                    const searchInfo = document.createElement('div');
                    searchInfo.className = 'search-results-info';
                    searchInfo.innerHTML = `
                        <i class="fas fa-search"></i>
                        Found ${data.totalResults} result(s) for "${query}"
                    `;
                    
                    const tableContainer = document.querySelector('.session-table-container');
                    const existingInfo = tableContainer.querySelector('.search-results-info');
                    if (existingInfo) existingInfo.remove();
                    
                    tableContainer.insertBefore(searchInfo, tableContainer.querySelector('.table-container'));
                }
            } else {
                this.showNotification(data.message || 'Failed to search sessions', 'error');
            }
        } catch (error) {
            console.error('Error searching sessions:', error);
            this.showNotification('Network error: Failed to search sessions', 'error');
        }
    }

    async viewSessionDetails(email) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            // Get all sessions to find this user's sessions
            const response = await fetch('/api/admin/sessions', {
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
                throw new Error(`HTTP ${response.status}: Failed to load sessions`);
            }
            
            const data = await response.json();
            
            if (data.success && data.sessions[email]) {
                const userSessions = data.sessions[email];
                
                let sessionDetailsHtml = `
                    <div class="user-sessions-details">
                        <div class="detail-item">
                            <label><i class="fas fa-envelope"></i> Email:</label>
                            <span>${email}</span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-plug"></i> Session Status:</label>
                            <span class="status-badge ${userSessions.connectedSessions > 0 ? 'status-active' : 'status-terminated'}">
                                <i class="fas ${userSessions.connectedSessions > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                ${userSessions.connectedSessions > 0 ? 'Active' : 'Inactive'}
                            </span>
                            <small>
                                (${userSessions.connectedSessions} connected, ${userSessions.totalSessions} total)
                            </small>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-clock"></i> Last Activity:</label>
                            <span>
                                ${userSessions.lastActivity ? new Date(userSessions.lastActivity).toLocaleString() : 'Never'}
                            </span>
                        </div>
                        
                        <div class="sessions-list">
                            <h4>
                                <i class="fas fa-list"></i> Active Sessions
                            </h4>
                `;
                
                if (userSessions.sessions && userSessions.sessions.length > 0) {
                    userSessions.sessions.forEach((session, index) => {
                        sessionDetailsHtml += `
                            <div class="session-detail-card ${session.isConnected ? 'connected' : 'disconnected'}">
                                <div class="session-card-header">
                                    <div>
                                        <strong>Session ${index + 1}:</strong>
                                        <code>
                                            ${session.sessionNumber}
                                        </code>
                                    </div>
                                    <div class="session-status-indicator">
                                        <span class="session-dot ${session.isConnected ? 'active' : 'disconnected'}"></span>
                                        <span>${session.isConnected ? 'Connected' : 'Disconnected'}</span>
                                    </div>
                                </div>
                                
                                <div class="session-card-body">
                                    <div class="session-info">
                                        <div>
                                            <small>Created:</small>
                                            <div>${session.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown'}</div>
                                        </div>
                                        <div>
                                            <small>Last Active:</small>
                                            <div>${session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'Never'}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="session-actions">
                                        <button class="btn-secondary small" onclick="admin.viewIndividualSessionDetails('${session.sessionNumber}')">
                                            <i class="fas fa-info-circle"></i> Details
                                        </button>
                                        <button class="btn-secondary small danger" onclick="admin.deleteSession('${session.sessionNumber}', '${email}')">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    sessionDetailsHtml += `
                        <div>
                            <i class="fas fa-plug"></i>
                            <p>No sessions found for this user</p>
                        </div>
                    `;
                }
                
                sessionDetailsHtml += `
                        </div>
                        
                        <div class="action-buttons">
                            <button class="btn-primary" onclick="admin.refreshSessions()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                            ${userSessions.totalSessions > 0 ? `
                                <button class="btn-danger" onclick="admin.deleteAllUserSessions('${email}')">
                                    <i class="fas fa-trash"></i> Delete All Sessions
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                this.showCustomModal(
                    `Active Sessions: ${email}`,
                    sessionDetailsHtml,
                    null,
                    'Close'
                );
            } else {
                this.showNotification('No sessions found for this email', 'error');
            }
        } catch (error) {
            console.error('Error viewing session details:', error);
            this.showNotification('Failed to load session details', 'error');
        }
    }

    async viewIndividualSessionDetails(sessionNumber) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            const response = await fetch(`/api/admin/session/details/${sessionNumber}`, {
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
                throw new Error(`HTTP ${response.status}: Failed to load session details`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                const session = data.sessionDetails;
                
                let sessionDetailsHtml = `
                    <div class="individual-session-details">
                        <div class="detail-item">
                            <label><i class="fas fa-hashtag"></i> Session Number:</label>
                            <code>
                                ${session.sessionNumber}
                            </code>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-envelope"></i> Email:</label>
                            <span>${session.userInfo.email || 'Unknown'}</span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-plug"></i> Connection Status:</label>
                            <span class="status-badge ${session.connection.isConnected ? 'status-active' : 'status-terminated'}">
                                <i class="fas ${session.connection.isConnected ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                ${session.connection.isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-user-check"></i> WhatsApp Registered:</label>
                            <span class="status-badge ${session.creds.registered ? 'status-approved' : 'status-pending'}">
                                <i class="fas ${session.creds.registered ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${session.creds.registered ? 'Registered' : 'Not Registered'}
                            </span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-key"></i> Token Status:</label>
                            <span class="status-badge ${session.tokenInfo.paid ? 'status-paid' : session.tokenInfo.status === 'approved' ? 'status-approved' : 'status-pending'}">
                                <i class="fas ${session.tokenInfo.paid ? 'fa-credit-card' : session.tokenInfo.status === 'approved' ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${session.tokenInfo.paid ? 'Paid' : session.tokenInfo.status === 'approved' ? 'Approved' : 'Pending'}
                            </span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-coins"></i> Token Balance:</label>
                            <span>
                                ${session.tokenInfo.tokenBalance || 0} tokens
                            </span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-calendar"></i> Session Created:</label>
                            <span>
                                ${session.userInfo.createdAt ? new Date(session.userInfo.createdAt).toLocaleString() : 'Unknown'}
                            </span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-clock"></i> Last Activity:</label>
                            <span>
                                ${session.connection.lastActivity ? new Date(session.connection.lastActivity).toLocaleString() : 
                                  session.userInfo.lastActivity ? new Date(session.userInfo.lastActivity).toLocaleString() : 'Never'}
                            </span>
                        </div>
                        
                        <div class="detail-item">
                            <label><i class="fas fa-signal"></i> Connected Since:</label>
                            <span>
                                ${session.connection.connectedAt ? new Date(session.connection.connectedAt).toLocaleString() : 'Not connected'}
                            </span>
                        </div>
                        
                        <div class="action-buttons">
                            <button class="btn-primary" onclick="admin.refreshSessions()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                            <button class="btn-danger" onclick="admin.deleteSession('${session.sessionNumber}', '${session.userInfo.email || ''}')">
                                <i class="fas fa-trash"></i> Delete Session
                            </button>
                            ${session.tokenInfo.token ? `
                                <button class="btn-secondary" onclick="admin.copyToken('${session.tokenInfo.token}')">
                                    <i class="fas fa-copy"></i> Copy Token
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                this.showCustomModal(
                    `Session Details: ${session.sessionNumber}`,
                    sessionDetailsHtml,
                    null,
                    'Close'
                );
            } else {
                this.showNotification(data.message || 'Failed to load session details', 'error');
            }
        } catch (error) {
            console.error('Error viewing individual session details:', error);
            this.showNotification('Failed to load session details', 'error');
        }
    }

    async deleteSession(sessionNumber, email = '') {
        this.showCustomModal(
            'Delete Session',
            `Are you sure you want to delete session <strong>${sessionNumber}</strong>?<br><br>
             ${email ? `<strong>User:</strong> ${email}<br>` : ''}
             <div class="warning-box">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>WARNING:</strong> This will:<br>
                1. Immediately disconnect the bot<br>
                2. Delete all session data<br>
                3. Stop all bot activities for this session<br><br>
                <span>This action cannot be undone!</span>
             </div>`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch(`/api/admin/session/${sessionNumber}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(`✅ Session ${sessionNumber} deleted successfully`, 'success');
                        this.loadSessions();
                        this.closeCustomModal();
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error deleting session:', error);
                    this.showNotification('Failed to delete session', 'error');
                }
            },
            'Delete Session'
        );
    }

    async deleteAllUserSessions(email) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            // Get user sessions first
            const response = await fetch('/api/admin/sessions', {
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
                throw new Error(`HTTP ${response.status}: Failed to load sessions`);
            }
            
            const data = await response.json();
            
            if (data.success && data.sessions[email]) {
                const userSessions = data.sessions[email];
                const sessionCount = userSessions.totalSessions;
                
                this.showCustomModal(
                    'Delete All Sessions',
                    `Are you sure you want to delete ALL sessions for user <strong>${email}</strong>?<br><br>
                     <strong>Total Sessions:</strong> ${sessionCount}<br>
                     <strong>Connected Sessions:</strong> ${userSessions.connectedSessions}<br><br>
                     <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>WARNING:</strong> This will:<br>
                        1. Disconnect ALL bot instances for this user<br>
                        2. Delete ALL session data<br>
                        3. Completely stop all bot activities for this user<br><br>
                        <span>This action cannot be undone!</span>
                     </div>`,
                    async () => {
                        try {
                            // Delete each session individually
                            let deletedCount = 0;
                            let failedCount = 0;
                            
                            for (const session of userSessions.sessions) {
                                try {
                                    const deleteResponse = await fetch(`/api/admin/session/${session.sessionNumber}`, {
                                        method: 'DELETE',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Accept': 'application/json'
                                        }
                                    });
                                    
                                    if (deleteResponse.ok) {
                                        deletedCount++;
                                    } else {
                                        failedCount++;
                                    }
                                } catch (error) {
                                    failedCount++;
                                    console.error(`Error deleting session ${session.sessionNumber}:`, error);
                                }
                                
                                // Small delay between deletions
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            
                            if (failedCount === 0) {
                                this.showNotification(`✅ All ${deletedCount} sessions deleted for ${email}`, 'success');
                            } else {
                                this.showNotification(`✅ ${deletedCount} sessions deleted, ${failedCount} failed for ${email}`, 'warning');
                            }
                            
                            this.loadSessions();
                            this.closeCustomModal();
                        } catch (error) {
                            console.error('Error deleting all sessions:', error);
                            this.showNotification('Failed to delete sessions', 'error');
                        }
                    },
                    `Delete All (${sessionCount})`
                );
            } else {
                this.showNotification('No sessions found for this user', 'error');
            }
        } catch (error) {
            console.error('Error preparing to delete all sessions:', error);
            this.showNotification('Failed to load session information', 'error');
        }
    }

    async refreshSessions() {
        await this.loadSessions();
        this.showNotification('Sessions refreshed', 'success');
    }

    // ===== FIXED: Grants Management =====
    async loadGrants() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            // Get users data which contains grant information
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
                throw new Error(`HTTP ${response.status}: Failed to load grants`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderGrantsTable(data.users);
                this.updateGrantStats(data.users);
                this.setupGrantSearch();
                this.setupGrantFilters();
            } else {
                this.showNotification(data.message || 'Failed to load grants', 'error');
            }
        } catch (error) {
            console.error('Error loading grants:', error);
            this.showNotification('Network error: Failed to load grants', 'error');
        }
    }

    // Setup Grant Search
    setupGrantSearch() {
        const grantSearch = document.getElementById('grantSearch');
        if (grantSearch) {
            grantSearch.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.searchGrants(query);
                } else {
                    this.loadGrants();
                    
                    // Remove search info if exists
                    const searchInfo = document.querySelector('.grant-search-results-info');
                    if (searchInfo) {
                        searchInfo.remove();
                    }
                }
            });
        }
    }

    // Setup Grant Filters
    setupGrantFilters() {
        document.querySelectorAll('.grant-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                
                // Update active button
                document.querySelectorAll('.grant-filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Filter grants
                this.filterGrants(filter);
            });
        });
    }

    // Filter Grants
    async filterGrants(filter) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) return;
            
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            if (!data.success || !data.users) return;
            
            let filteredUsers = {};
            
            switch(filter) {
                case 'all':
                    filteredUsers = data.users;
                    break;
                case 'pending':
                    Object.entries(data.users).forEach(([email, user]) => {
                        if (user.status === 'pending') {
                            filteredUsers[email] = user;
                        }
                    });
                    break;
                case 'approved':
                    Object.entries(data.users).forEach(([email, user]) => {
                        if (user.status === 'approved') {
                            filteredUsers[email] = user;
                        }
                    });
                    break;
                case 'paid':
                    Object.entries(data.users).forEach(([email, user]) => {
                        if (user.paid) {
                            filteredUsers[email] = user;
                        }
                    });
                    break;
                case 'free':
                    Object.entries(data.users).forEach(([email, user]) => {
                        if (user.freeToken) {
                            filteredUsers[email] = user;
                        }
                    });
                    break;
                case 'limited':
                    Object.entries(data.users).forEach(([email, user]) => {
                        const maxSessions = user.maxSessions || 1;
                        if (maxSessions > 1 && maxSessions <= 5) {
                            filteredUsers[email] = user;
                        }
                    });
                    break;
                case 'unlimited':
                    Object.entries(data.users).forEach(([email, user]) => {
                        const maxSessions = user.maxSessions || 1;
                        if (maxSessions >= 50) {
                            filteredUsers[email] = user;
                        }
                    });
                    break;
            }
            
            this.renderGrantsTable(filteredUsers);
            
        } catch (error) {
            console.error('Error filtering grants:', error);
        }
    }

    // Search Grants
    async searchGrants(query) {
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
            
            if (!response.ok) return;
            
            const data = await response.json();
            if (!data.success || !data.users) return;
            
            const filteredUsers = {};
            
            Object.entries(data.users).forEach(([email, user]) => {
                if (email.toLowerCase().includes(query.toLowerCase()) || 
                    (user.token && user.token.toLowerCase().includes(query.toLowerCase()))) {
                    filteredUsers[email] = user;
                }
            });
            
            this.renderGrantsTable(filteredUsers);
            
            // Show search results info
            const tableContainer = document.querySelector('.grant-table-container');
            if (tableContainer) {
                const existingInfo = tableContainer.querySelector('.grant-search-results-info');
                if (existingInfo) existingInfo.remove();
                
                if (Object.keys(filteredUsers).length > 0) {
                    const searchInfo = document.createElement('div');
                    searchInfo.className = 'grant-search-results-info';
                    searchInfo.innerHTML = `
                        <i class="fas fa-search"></i>
                        Found ${Object.keys(filteredUsers).length} result(s) for "${query}"
                    `;
                    tableContainer.insertBefore(searchInfo, tableContainer.querySelector('.grant-table'));
                }
            }
            
        } catch (error) {
            console.error('Error searching grants:', error);
        }
    }

    updateGrantStats(users) {
        if (!users) return;
        
        // Calculate totals for percentages
        let totalUsers = Object.keys(users).length;
        let pendingCount = 0;
        let approvedCount = 0;
        let paidCount = 0;
        let freeCount = 0;
        let limitedCount = 0;
        let unlimitedCount = 0;
        
        Object.values(users).forEach(user => {
            if (user.status === 'pending') pendingCount++;
            if (user.status === 'approved') approvedCount++;
            if (user.paid) paidCount++;
            if (user.freeToken) freeCount++;
            
            const maxSessions = user.maxSessions || 1;
            if (maxSessions > 1 && maxSessions <= 5) limitedCount++;
            if (maxSessions >= 50) unlimitedCount++;
        });
        
        // Update filter counts
        this.updateFilterCounts({
            totalUsers,
            pending: pendingCount,
            approved: approvedCount,
            paid: paidCount,
            free: freeCount,
            limited: limitedCount,
            unlimited: unlimitedCount
        });
        
        // Update grant count badge
        const badge = document.getElementById('grantCount');
        if (badge) {
            badge.textContent = totalUsers;
        }
    }

    // ===== FIXED: Render Grants Table with Percentage and Filter Display =====
    renderGrantsTable(users) {
        const tableBody = document.querySelector('#grantsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!users || Object.keys(users).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" class="grants-no-results">
                    <i class="fas fa-layer-group"></i>
                    <h4>No grants found</h4>
                    <p>Token grants will appear here</p>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        // Calculate totals for percentages
        let totalUsers = Object.keys(users).length;
        let pendingCount = 0;
        let approvedCount = 0;
        let paidCount = 0;
        let freeCount = 0;
        let limitedCount = 0;
        let unlimitedCount = 0;
        
        Object.values(users).forEach(user => {
            if (user.status === 'pending') pendingCount++;
            if (user.status === 'approved') approvedCount++;
            if (user.paid) paidCount++;
            if (user.freeToken) freeCount++;
            
            const maxSessions = user.maxSessions || 1;
            if (maxSessions > 1 && maxSessions <= 5) limitedCount++;
            if (maxSessions >= 50) unlimitedCount++;
        });
        
        Object.entries(users).forEach(([email, user]) => {
            const currentSessions = user.currentSessions || 0;
            const maxSessions = user.maxSessions || 1;
            const grantUsage = maxSessions > 0 ? Math.round((currentSessions / maxSessions) * 100) : 0;
            const grantType = user.freeToken ? 'Free' : (user.paid ? 'Paid' : 'Pending');
            const grantTypeClass = user.freeToken ? 'status-free' : (user.paid ? 'status-paid' : 'status-pending');
            const token = user.token || 'No token';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="grant-email">
                        <i class="fas fa-envelope"></i>
                        ${email}
                    </div>
                </td>
                <td>
                    <code class="text-truncate" title="${token}">
                        ${token.length > 20 ? token.substring(0, 20) + '...' : token}
                    </code>
                </td>
                <td>
                    <span class="session-count ${currentSessions >= maxSessions ? 'limit-reached' : ''}">
                        ${currentSessions}
                    </span>
                </td>
                <td>
                    <span class="max-sessions">${maxSessions === 50 ? 'Unlimited' : maxSessions}</span>
                </td>
                <td>
                    <div class="grant-percentage-display">
                        <div class="grant-percentage-bar">
                            <div class="grant-percentage-fill" style="width: ${grantUsage}%;"></div>
                        </div>
                        <span class="grant-percentage-text">${grantUsage}%</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${grantTypeClass}">
                        ${grantType}
                    </span>
                </td>
                <td>
                    ${user.grantUpdated ? new Date(user.grantUpdated).toLocaleDateString() : 'Never'}
                </td>
                <td>
                    <div class="grant-actions">
                        <button class="btn-secondary small" onclick="admin.editGrant('${email}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-secondary small" onclick="admin.viewUserDetails('${email}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update filter counts
        this.updateFilterCounts({
            totalUsers,
            pending: pendingCount,
            approved: approvedCount,
            paid: paidCount,
            free: freeCount,
            limited: limitedCount,
            unlimited: unlimitedCount
        });
    }

    // Update filter counts display
    updateFilterCounts(counts) {
        document.querySelectorAll('.filter-count').forEach(el => {
            const filter = el.dataset.filter;
            if (counts[filter] !== undefined) {
                el.textContent = counts[filter];
            }
        });
    }

    async editGrant(email) {
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
            
            if (!response.ok) return;
            
            const data = await response.json();
            if (!data.success || !data.userDetails) return;
            
            const user = data.userDetails.user;
            const currentSessions = user.currentSessions || 0;
            const maxSessions = user.maxSessions || 1;
            const isFree = user.freeToken || !user.paid;
            
            this.showCustomModal(
                'Edit Grant',
                `<div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="editGrantEmail" value="${email}" readonly>
                </div>
                <div class="form-group">
                    <label>Current Sessions: <strong>${currentSessions}</strong></label>
                </div>
                <div class="form-group">
                    <label>Maximum Sessions Allowed:</label>
                    <select id="editMaxSessions">
                        <option value="1" ${maxSessions === 1 ? 'selected' : ''}>1 Session (Free)</option>
                        <option value="2" ${maxSessions === 2 ? 'selected' : ''}>2 Sessions</option>
                        <option value="3" ${maxSessions === 3 ? 'selected' : ''}>3 Sessions</option>
                        <option value="5" ${maxSessions === 5 ? 'selected' : ''}>5 Sessions</option>
                        <option value="10" ${maxSessions === 10 ? 'selected' : ''}>10 Sessions</option>
                        <option value="20" ${maxSessions === 20 ? 'selected' : ''}>20 Sessions</option>
                        <option value="50" ${maxSessions === 50 ? 'selected' : ''}>Unlimited (50+)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Grant Type:</label>
                    <select id="editGrantType">
                        <option value="free" ${isFree ? 'selected' : ''}>Free Grant</option>
                        <option value="paid" ${!isFree ? 'selected' : ''}>Paid Grant</option>
                    </select>
                </div>
                <div class="warning-box">
                    <i class="fas fa-exclamation-triangle"></i>
                    <small>Note: Changing grant settings will affect user's ability to create sessions.</small>
                </div>`,
                async () => {
                    try {
                        const maxSessions = document.getElementById('editMaxSessions').value;
                        const grantType = document.getElementById('editGrantType').value;
                        const isPaid = grantType === 'paid';
                        
                        // Use the new updateUserGrant function which immediately refreshes data
                        await this.updateUserGrant(email, parseInt(maxSessions), isPaid);
                    } catch (error) {
                        console.error('Error updating grant:', error);
                        this.showNotification('Failed to update grant', 'error');
                    }
                },
                'Update Grant'
            );
        } catch (error) {
            console.error('Error loading grant for edit:', error);
            this.showNotification('Failed to load grant details', 'error');
        }
    }

    async bulkUpdateGrants() {
        this.showCustomModal(
            'Bulk Update Grants',
            'This feature allows you to update grants for multiple users at once.<br><br>Select users and choose new grant settings.',
            null,
            'Continue'
        );
    }

    async exportGrants() {
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
            
            if (!response.ok) return;
            
            const data = await response.json();
            if (!data.success || !data.users) return;
            
            // Create CSV content
            let csvContent = 'Email,Token,Current Sessions,Max Sessions,Grant Type,Last Updated\n';
            
            Object.entries(data.users).forEach(([email, user]) => {
                const currentSessions = user.currentSessions || 0;
                const maxSessions = user.maxSessions || 1;
                const grantType = user.freeToken ? 'Free' : (user.paid ? 'Paid' : 'Pending');
                const token = user.token || '';
                const lastUpdated = user.grantUpdated || '';
                
                csvContent += `"${email}","${token}",${currentSessions},${maxSessions},"${grantType}","${lastUpdated}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `grants_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Grants exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting grants:', error);
            this.showNotification('Failed to export grants', 'error');
        }
    }

    // Helper methods for data management
    async getUsersData() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) return {};
            
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) return {};
            
            const data = await response.json();
            return data.success ? data.users : {};
        } catch (error) {
            console.error('Error getting users data:', error);
            return {};
        }
    }

    async saveUsersData(users) {
        // This would typically be done via API
        // For now, we'll just update the local display
        console.log('Users data would be saved here:', users);
    }

    // ===== LOGIN HISTORY METHODS =====
    
    // Add new method for loading login history:
    async loadLoginHistory() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            // Load admin login history
            const response = await fetch('/api/admin/login-history?type=admin&limit=100', {
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
                throw new Error(`HTTP ${response.status}: Failed to load login history`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.loginHistory = data.logins || [];
                this.renderLoginHistory(this.loginHistory);
                this.updateLoginHistoryStats();
            } else {
                this.showNotification(data.message || 'Failed to load login history', 'error');
            }
            
        } catch (error) {
            console.error('Error loading login history:', error);
            this.showNotification('Network error: Failed to load login history', 'error');
        }
    }
    
    // Render login history table
    renderLoginHistory(logins) {
        const tableBody = document.querySelector('#loginHistoryTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!logins || logins.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" class="no-results">
                    <i class="fas fa-history"></i>
                    <h4>No login history found</h4>
                    <p>Admin login history will appear here</p>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        logins.forEach((login, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="login-email">
                        <i class="fas fa-user-shield"></i>
                        ${login.email}
                    </div>
                </td>
                <td>
                    <code>${login.ip || 'Unknown'}</code>
                </td>
                <td>
                    <div class="location-info">
                        <span class="country-flag">${this.getCountryFlag(login.location?.country)}</span>
                        <div>
                            <strong>${login.location?.country || 'Unknown'}</strong>
                            <small>${login.location?.region || 'Unknown'}, ${login.location?.city || 'Unknown'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="device-info">
                        <i class="fas ${this.getDeviceIcon(login.userAgent)}"></i>
                        <span>${this.getDeviceName(login.userAgent)}</span>
                    </div>
                </td>
                <td>
                    <span class="timestamp">
                        <i class="fas fa-clock"></i>
                        ${new Date(login.timestamp).toLocaleString()}
                    </span>
                </td>
                <td>
                    <span class="time-ago">
                        ${this.getTimeAgo(login.timestamp)}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary small" onclick="admin.viewLoginDetails(${index})">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // Helper methods for login history
    getCountryFlag(country) {
        if (!country) return '🌐';
        const flags = {
            'USA': '🇺🇸', 'United States': '🇺🇸',
            'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
            'Canada': '🇨🇦',
            'Australia': '🇦🇺',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
            'Japan': '🇯🇵',
            'China': '🇨🇳',
            'India': '🇮🇳',
            'Brazil': '🇧🇷',
            'Russia': '🇷🇺',
            'Local': '🏠'
        };
        return flags[country] || '🌐';
    }
    
    getDeviceIcon(userAgent) {
        if (!userAgent) return 'fa-desktop';
        if (userAgent.includes('Mobile')) return 'fa-mobile-alt';
        if (userAgent.includes('Tablet')) return 'fa-tablet-alt';
        if (userAgent.includes('Android')) return 'fa-android';
        if (userAgent.includes('iPhone')) return 'fa-apple';
        if (userAgent.includes('Windows')) return 'fa-windows';
        if (userAgent.includes('Mac')) return 'fa-apple';
        if (userAgent.includes('Linux')) return 'fa-linux';
        return 'fa-desktop';
    }
    
    getDeviceName(userAgent) {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Browser';
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diff = now - past;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    }
    
    // Update login history statistics
    updateLoginHistoryStats() {
        if (!this.loginHistory || this.loginHistory.length === 0) {
            document.getElementById('totalAdminLogins').textContent = '0';
            document.getElementById('uniqueCountries').textContent = '0';
            document.getElementById('loginHistoryCount').textContent = '0';
            return;
        }
        
        // Count unique countries
        const countries = new Set();
        this.loginHistory.forEach(login => {
            if (login.location?.country) {
                countries.add(login.location.country);
            }
        });
        
        // Update stats
        document.getElementById('totalAdminLogins').textContent = this.loginHistory.length;
        document.getElementById('uniqueCountries').textContent = countries.size;
        document.getElementById('loginHistoryCount').textContent = this.loginHistory.length;
    }
    
    // View login details
    async viewLoginDetails(index) {
        const login = this.loginHistory[index];
        if (!login) return;
        
        let detailsHtml = `
            <div class="login-details">
                <div class="detail-item">
                    <label><i class="fas fa-user-shield"></i> Admin:</label>
                    <span>${login.email}</span>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-network-wired"></i> IP Address:</label>
                    <code>${login.ip || 'Unknown'}</code>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-globe"></i> Location:</label>
                    <div class="location-details">
                        <div>
                            <strong>Country:</strong> ${login.location?.country || 'Unknown'}
                        </div>
                        <div>
                            <strong>Region:</strong> ${login.location?.region || 'Unknown'}
                        </div>
                        <div>
                            <strong>City:</strong> ${login.location?.city || 'Unknown'}
                        </div>
                        ${login.location?.isp ? `
                        <div>
                            <strong>ISP:</strong> ${login.location?.isp}
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-desktop"></i> Device & Browser:</label>
                    <div class="device-details">
                        <pre style="background: var(--gray-light); padding: 10px; border-radius: 5px; font-size: 12px; max-height: 150px; overflow: auto;">${login.userAgent || 'Unknown'}</pre>
                    </div>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-clock"></i> Timestamp:</label>
                    <span>${new Date(login.timestamp).toLocaleString()}</span>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-history"></i> Time Ago:</label>
                    <span>${this.getTimeAgo(login.timestamp)}</span>
                </div>
            </div>
        `;
        
        this.showCustomModal(
            `Login Details - ${login.email}`,
            detailsHtml,
            null,
            'Close'
        );
    }
    
    // Refresh login history
    async refreshLoginHistory() {
        await this.loadLoginHistory();
        this.showNotification('Login history refreshed', 'success');
    }
    
    // Export login history
    async exportLoginHistory() {
        try {
            if (!this.loginHistory || this.loginHistory.length === 0) {
                this.showNotification('No login history to export', 'warning');
                return;
            }
            
            // Create CSV content
            let csvContent = 'Email,IP Address,Country,Region,City,Device,Browser,Timestamp\n';
            
            this.loginHistory.forEach(login => {
                const country = login.location?.country || 'Unknown';
                const region = login.location?.region || 'Unknown';
                const city = login.location?.city || 'Unknown';
                const device = this.getDeviceName(login.userAgent);
                const browser = this.getBrowserFromUserAgent(login.userAgent);
                const timestamp = new Date(login.timestamp).toLocaleString();
                
                csvContent += `"${login.email}","${login.ip || 'Unknown'}","${country}","${region}","${city}","${device}","${browser}","${timestamp}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `login_history_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Login history exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting login history:', error);
            this.showNotification('Failed to export login history', 'error');
        }
    }
    
    // Get browser from user agent
    getBrowserFromUserAgent(userAgent) {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
        return 'Other';
    }
    
    // Cleanup login history
    async cleanupLoginHistory() {
        this.showCustomModal(
            'Cleanup Login History',
            `Are you sure you want to cleanup login history?<br><br>
             <div class="warning-box">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>WARNING:</strong> This will:<br>
                1. Remove all login history records<br>
                2. Cannot be undone<br>
                3. Will reset all login statistics<br><br>
                <span>This action cannot be undone!</span>
             </div>`,
            async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                        this.showNotification('Please login again', 'error');
                        this.showLogin();
                        return;
                    }
                    
                    const response = await fetch('/api/admin/login-history/cleanup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ 
                            type: 'admin',
                            daysToKeep: 30 // Keep only last 30 days by default
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification('Login history cleaned up successfully', 'success');
                        this.loadLoginHistory();
                    } else {
                        this.showNotification(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error cleaning up login history:', error);
                    this.showNotification('Failed to cleanup login history', 'error');
                }
            },
            'Cleanup History'
        );
    }
}

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
                    <span style="margin-left: auto; font-size: 10px; background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); color: white; padding: 2px 8px; border-radius: 10px;">Active</span>
                `;
                adminNavItem.style.color = 'var(--primary-color)';
            }
        } else {
            // Token expired, clear it
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
            console.log('Session expired. Please login again.');
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