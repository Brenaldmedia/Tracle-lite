// ===== ADMIN DASHBOARD JAVASCRIPT =====
class AdminDashboard {
    constructor() {
        this.adminEmail = 'brenaldmedia@gmail.com';
        this.adminPassword = 'isiboremmanuel0911'; 
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
        
        // Chart animation interval
        this.chartAnimationInterval = null;
        this.revenueUpdateInterval = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
        this.initCustomModal();
        this.loadSavedTheme();
        this.addLocationStyles();
        this.ensureThemeCSS();
        this.updateLoginModal();
        this.initChartAnimations();
        this.initRevenueAutoUpdate();
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

    ensureThemeCSS() {
        // Check if theme CSS is already added
        if (!document.getElementById('theme-css-overrides')) {
            const style = document.createElement('style');
            style.id = 'theme-css-overrides';
            style.textContent = `
                /* Theme variable overrides - Higher specificity */
                body.theme-light {
                    --primary-color: #7c3aed !important;
                    --secondary-color: #4f46e5 !important;
                    --gradient-start: #7c3aed !important;
                    --gradient-end: #4f46e5 !important;
                    --dark-color: #1f2937 !important;
                    --light-color: #ffffff !important;
                    --gray-color: #6b7280 !important;
                    --gray-light: #f3f4f6 !important;
                    --border-color: #e5e7eb !important;
                    --card-bg: #ffffff !important;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
                    color: #1f2937 !important;
                }
                
                body.theme-dark {
                    --primary-color: #8b5cf6 !important;
                    --secondary-color: #6366f1 !important;
                    --gradient-start: #8b5cf6 !important;
                    --gradient-end: #6366f1 !important;
                    --dark-color: #f9fafb !important;
                    --light-color: #111827 !important;
                    --gray-color: #9ca3af !important;
                    --gray-light: #1f2937 !important;
                    --border-color: #374151 !important;
                    --card-bg: #1f2937 !important;
                    background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important;
                    color: #f9fafb !important;
                }
                
                /* Theme toggle button */
                .theme-toggle {
                    cursor: pointer;
                    transition: all 0.3s ease;
                    padding: 14px 20px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 15px 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    width: 100%;
                    border: none;
                    text-align: left;
                    font-size: 15px;
                    color: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                }
                
                .theme-toggle:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }
                
                .theme-toggle i {
                    font-size: 20px;
                    color: white;
                    transition: transform 0.3s ease;
                }
                
                .theme-toggle:hover i {
                    transform: rotate(30deg);
                }
                
                .theme-toggle span {
                    font-weight: 600;
                    font-size: 15px;
                }
                
                /* Status color overrides */
                .status-paid { 
                    background: linear-gradient(135deg, #10b981, #059669) !important;
                    color: white !important;
                    border: 2px solid #10b981 !important;
                }
                .status-pending { 
                    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
                    color: white !important;
                    border: 2px solid #f59e0b !important;
                }
                .status-free { 
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
                    color: white !important;
                    border: 2px solid #8b5cf6 !important;
                }
                .status-approved { 
                    background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
                    color: white !important;
                    border: 2px solid #3b82f6 !important;
                }
                .status-terminated { 
                    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                    color: white !important;
                    border: 2px solid #ef4444 !important;
                }
                .status-active { 
                    background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
                    color: white !important;
                    border: 2px solid #06b6d4 !important;
                }
                .status-expired { 
                    background: linear-gradient(135deg, #6b7280, #4b5563) !important;
                    color: white !important;
                    border: 2px solid #6b7280 !important;
                }
                .status-revoked { 
                    background: linear-gradient(135deg, #991b1b, #7f1d1d) !important;
                    color: white !important;
                    border: 2px solid #991b1b !important;
                }
                
                /* Premium Template Styles */
                .premium-template-option {
                    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
                    color: white;
                    padding: 15px;
                    border-radius: var(--border-radius);
                    margin: 10px 0;
                    cursor: pointer;
                    transition: var(--transition);
                    border: 2px solid transparent;
                }
                
                .premium-template-option:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-lg);
                }
                
                .premium-template-option.selected {
                    border-color: white;
                    background: linear-gradient(135deg, var(--gradient-end), var(--gradient-start));
                }
                
                /* Terminate button */
                .btn-terminate {
                    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                    color: white !important;
                    border: 2px solid #ef4444 !important;
                }
                
                .btn-terminate:hover {
                    background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
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

    // ===== FIXED: Update Premium Template Settings =====
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

    // ===== FIXED: Edit Revenue with Auto Update =====
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

    // ===== NEW: Terminate Token Function =====
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
        titleEl.style.background = 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))';
        titleEl.style.webkitBackgroundClip = 'text';
        titleEl.style.webkitTextFillColor = 'transparent';
        titleEl.style.backgroundClip = 'text';
        
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
                themeBtn.className = 'theme-toggle';
                themeBtn.id = 'themeToggleBtn';
                themeBtn.style.cursor = 'pointer';
                themeBtn.style.marginTop = '10px';
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

        // ===== NEW: Premium Template Update Event =====
        const emailTemplateSelect = document.querySelector('#emailTemplate');
        if (emailTemplateSelect) {
            emailTemplateSelect.addEventListener('change', () => this.updatePremiumTemplate());
        }

        // ===== NEW: Save Settings Button Event =====
        const saveSettingsBtn = document.querySelector('#settingsTab .btn-primary');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveAdminSettings());
        }
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
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

    // ===== FIXED: Grant Free Tokens - No More Pending Status =====
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

    // ===== FIXED: Show User Details Modal with Terminate Button =====
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
        
        // Get token status - FIXED: Free tokens should not show as pending
        let tokenStatus = 'No Token';
        let tokenStatusClass = 'status-pending';
        let tokenType = 'No Token';
        let tokenIcon = 'fa-key';
        
        if (user.token) {
            const isFreeToken = user.freeToken || !user.paid;
            
            // FIX: Free tokens should show as "Free" not "Pending"
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
        
        // Parse location
        const location = this.parseLocation(user.location);
        const city = location.city || 'Unknown';
        const country = location.country || 'Unknown';
        const region = location.region || 'Unknown';
        const ip = user.ip || 'Unknown';
        const timezone = user.timezone || 'Unknown';
        
        content.innerHTML = `
            <div class="user-details">
                <div class="detail-item">
                    <label><i class="fas fa-envelope" style="color: var(--primary-color);"></i> Email:</label>
                    <span class="text-truncate" title="${user.email}" style="font-weight: 600; color: var(--dark-color);">${user.email}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-info-circle" style="color: var(--primary-color);"></i> Status:</label>
                    <span class="status-badge status-${user.status || 'pending'}">
                        <i class="fas fa-${user.status === 'approved' ? 'check-circle' : user.status === 'pending' ? 'clock' : 'ban'}" style="margin-right: 6px;"></i>
                        ${user.status || 'pending'}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-money-bill" style="color: var(--primary-color);"></i> Payment Status:</label>
                    <span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">
                        <i class="fas ${user.paid ? 'fa-check-circle' : 'fa-clock'}" style="margin-right: 6px;"></i>
                        ${user.paid ? 'Paid' : 'Not Paid'}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-key" style="color: var(--primary-color);"></i> Token Status:</label>
                    <span class="status-badge ${tokenStatusClass}">
                        <i class="fas ${tokenIcon}" style="margin-right: 6px;"></i>
                        ${tokenType}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-coins" style="color: var(--status-paid);"></i> Revenue Generated:</label>
                    <span style="color: var(--status-paid); font-weight: 800; font-size: 20px;">₦${(user.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-database" style="color: var(--primary-color);"></i> Token Balance:</label>
                    <span style="color: var(--dark-color); font-weight: 700; font-size: 18px;">${user.tokenBalance || 0} tokens</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i> Location:</label>
                    <div class="location-details">
                        <div><strong>City:</strong> <span style="color: var(--dark-color); font-weight: 500;">${city}</span></div>
                        <div><strong>Region:</strong> <span style="color: var(--dark-color); font-weight: 500;">${region}</span></div>
                        <div><strong>Country:</strong> <span style="color: var(--dark-color); font-weight: 500;">${country}</span></div>
                        <div><strong>IP:</strong> <code style="background: var(--gray-light); padding: 4px 10px; border-radius: 8px; color: var(--dark-color); font-family: monospace; border: 1px solid var(--border-color);">${ip}</code></div>
                        <div><strong>Timezone:</strong> <span style="color: var(--dark-color); font-weight: 500;">${timezone}</span></div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-history" style="color: var(--primary-color);"></i> First Request:</label>
                    <span style="color: var(--dark-color); font-weight: 500; background: var(--gray-light); padding: 4px 10px; border-radius: 6px;">${user.firstRequest ? new Date(user.firstRequest).toLocaleString() : 'Never'}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-chart-line" style="color: var(--primary-color);"></i> Total Requests:</label>
                    <span style="color: var(--dark-color); font-weight: 800; font-size: 20px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1)); padding: 6px 14px; border-radius: 8px; display: inline-block;">${userDetails.totalRequests || 0}</span>
                </div>
                
                <div class="token-controls">
                    <h4><i class="fas fa-gift"></i> Token Management</h4>
                    <div style="display: flex; gap: 12px; margin-bottom: 15px;">
                        <input type="number" id="grantTokenAmount" placeholder="Amount" 
                               style="flex: 1; padding: 12px 16px; border: 2px solid var(--border-color); 
                                      border-radius: 12px; background: var(--card-bg); color: var(--dark-color);" 
                               min="1" value="1">
                        <button class="btn-primary" onclick="admin.grantFreeTokens('${user.email}', document.getElementById('grantTokenAmount').value)">
                            <i class="fas fa-gift"></i> Grant Free Tokens
                        </button>
                    </div>
                    <small style="color: var(--gray-color); display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-info-circle"></i> Free tokens work immediately without payment
                    </small>
                </div>
                
                <!-- ===== NEW: TERMINATE TOKEN SECTION ===== -->
                <div class="terminate-section">
                    <h4><i class="fas fa-ban" style="color: var(--status-terminated);"></i> Token Termination</h4>
                    <div class="terminate-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Warning:</strong> Terminating a token will immediately revoke access and notify the user.
                    </div>
                    <button class="btn-terminate" onclick="admin.terminateToken('${user.email}')">
                        <i class="fas fa-ban"></i> Terminate Token
                    </button>
                </div>
                
                <div class="action-buttons d-flex gap-10 flex-wrap" style="margin-top: 25px; padding-top: 20px; border-top: 2px solid var(--border-color);">
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

    // ===== FIXED: Render Users Table with Correct Token Status =====
    renderUsersTable(users) {
        const tableBody = document.querySelector('#usersTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!users || Object.keys(users).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div style="color: var(--gray-color);">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 20px; display: block; opacity: 0.5; color: var(--primary-color);"></i>
                        <h4 style="margin-bottom: 10px; color: var(--dark-color);">No users found</h4>
                        <p>Start by adding your first user</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(users).forEach(([email, user]) => {
            // Get location information
            const location = this.parseLocation(user.location);
            const city = location.city;
            const country = location.country;
            
            // Get revenue amount
            const revenue = user.amountPaid || 0;
            
            // FIXED: Get token status - Free tokens should not show as pending
            let tokenStatus = 'No Token';
            let tokenStatusClass = 'status-pending';
            let tokenIcon = 'fa-key';
            
            if (user.token) {
                // FIX: Check if it's a free token
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
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" style="max-width: 200px;" title="${email}">
                    <i class="fas fa-envelope" style="margin-right: 8px; color: var(--primary-color);"></i>
                    ${email}
                </td>
                <td>
                    <span class="status-badge status-${user.status || 'pending'}">
                        <i class="fas ${userStatusIcon}" style="margin-right: 6px;"></i>
                        ${user.status || 'pending'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">
                        <i class="fas ${user.paid ? 'fa-check-circle' : 'fa-clock'}" style="margin-right: 6px;"></i>
                        ${user.paid ? 'Paid' : 'Pending'}
                    </span>
                </td>
                <td class="revenue-cell ${revenue === 0 ? 'zero' : ''}" style="font-weight: 800; color: ${revenue > 0 ? 'var(--status-paid)' : 'var(--gray-color)'}; font-size: 16px;">
                    <i class="fas fa-coins" style="margin-right: 8px; color: ${revenue > 0 ? 'var(--status-paid)' : 'var(--gray-color)'};"></i>
                    ₦${revenue.toLocaleString()}
                </td>
                <td>
                    <span class="status-badge ${tokenStatusClass}">
                        <i class="fas ${tokenIcon}" style="margin-right: 6px;"></i>
                        ${tokenStatus}
                    </span>
                </td>
                <td>
                    <div class="location-display">
                        <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                        ${city || 'Unknown'}, ${country || 'Unknown'}
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--gray-color);">
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

    // ===== FIXED: Generate Token Function =====
    async generateToken() {
        const emailInput = document.getElementById('tokenEmail');
        const email = emailInput.value.trim();
        const paid = document.getElementById('tokenPaymentStatus').value === 'true';
        const freeTokensAmount = document.getElementById('freeTokensAmount').value;
        const sendEmail = document.getElementById('sendEmailNotification').value === 'true';
        
        if (!email || !this.validateEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            emailInput.focus();
            return;
        }
        
        this.showCustomModal(
            'Generate Token',
            `Generate a token for user <strong style="color: var(--primary-color);">${email}</strong>?<br>
             <strong>Token Type:</strong> <span style="color: ${paid ? 'var(--status-paid)' : 'var(--status-free)'};">${paid ? 'Paid Token' : 'Free Token'}</span><br>
             ${freeTokensAmount > 0 ? `<strong>Free tokens to add:</strong> <span style="color: var(--status-free);">${freeTokensAmount}</span><br>` : ''}
             <strong>Email Notification:</strong> ${sendEmail ? '✅ Yes' : '❌ No'}<br><br>
             ${paid ? '<span style="color: var(--status-paid);">⚠️ Note: Paid tokens require payment verification</span>' : '<span style="color: var(--status-free);">🎁 Free tokens work immediately</span>'}`,
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
                            free: !paid, // Mark as free if not paid
                            sendEmail: sendEmail
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
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

    async remindPassword() {
        try {
            const btn = document.getElementById('remindMeBtn');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            // Send password reminder email
            const adminEmail = document.getElementById('adminEmail').value || this.adminEmail;
            
            const reminderHtml = `
                <h2 style="color: var(--primary-color);">🔐 Admin Password Reminder</h2>
                <p>Your admin credentials for Tracle-Lite:</p>
                <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1)); padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid var(--border-color);">
                    <p><strong style="color: var(--dark-color);">Email:</strong> ${adminEmail}</p>
                    <p><strong style="color: var(--dark-color);">Password:</strong> ${this.adminPassword}</p>
                </div>
                <p><strong>Login URL:</strong> <a href="${window.location.origin}/admin.html" style="color: var(--primary-color);">${window.location.origin}/admin.html</a></p>
                <p><i style="color: var(--gray-color);">If you didn't request this reminder, please ignore this email.</i></p>
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
            this.showMessage('Invalid email or password', 'error');
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
                localStorage.removeItem('admin_theme_index'); // Remove theme preference
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
        document.getElementById('pageTitle').style.background = 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))';
        document.getElementById('pageTitle').style.webkitBackgroundClip = 'text';
        document.getElementById('pageTitle').style.webkitTextFillColor = 'transparent';
        document.getElementById('pageTitle').style.backgroundClip = 'text';
        
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
                this.startChartAnimations(); // Start animations when reports tab is opened
                break;
            case 'settings':
                this.loadSettings();
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

    // Update the updateStats function to properly show revenue
    updateStats(stats) {
        if (!stats) return;
        
        // Update header stats
        if (document.getElementById('pendingApprovals')) {
            document.getElementById('pendingApprovals').textContent = stats.summary?.pendingApprovals || 0;
        }
        if (document.getElementById('totalRevenue')) {
            // Calculate total revenue from paid users
            const totalRevenue = stats.summary?.revenue || 0;
            document.getElementById('totalRevenue').textContent = `₦${totalRevenue.toLocaleString()}`;
            document.getElementById('totalRevenue').style.color = 'var(--status-paid)';
            document.getElementById('totalRevenue').style.fontWeight = '800';
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
            document.getElementById('approvedCount').style.color = 'var(--status-approved)';
        }
        if (document.getElementById('pendingUsersCount')) {
            document.getElementById('pendingUsersCount').textContent = stats.users?.pending || 0;
            document.getElementById('pendingUsersCount').style.color = 'var(--status-pending)';
        }
        if (document.getElementById('terminatedCount')) {
            const terminated = (stats.users?.total || 0) - (stats.users?.approved || 0) - (stats.users?.pending || 0);
            document.getElementById('terminatedCount').textContent = terminated > 0 ? terminated : 0;
            document.getElementById('terminatedCount').style.color = 'var(--status-terminated)';
        }
        if (document.getElementById('activeTokens')) {
            document.getElementById('activeTokens').textContent = stats.tokens?.unused || 0;
            document.getElementById('activeTokens').style.color = 'var(--primary-color)';
        }
        
        // Update revenue reports with accurate data
        if (document.getElementById('revenueToday')) {
            const todayRevenue = Math.floor((stats.summary?.revenue || 0) / 30);
            document.getElementById('revenueToday').textContent = `₦${todayRevenue.toLocaleString()}`;
            document.getElementById('revenueToday').style.color = 'var(--status-paid)';
            // Add auto-update animation
            document.getElementById('revenueToday').classList.add('revenue-auto-update');
        }
        if (document.getElementById('revenueWeek')) {
            const weekRevenue = (stats.summary?.revenue || 0) * 7 / 30;
            document.getElementById('revenueWeek').textContent = `₦${Math.floor(weekRevenue).toLocaleString()}`;
            document.getElementById('revenueWeek').style.color = 'var(--status-paid)';
        }
        if (document.getElementById('revenueMonth')) {
            document.getElementById('revenueMonth').textContent = `₦${(stats.summary?.revenue || 0).toLocaleString()}`;
            document.getElementById('revenueMonth').style.color = 'var(--status-paid)';
        }
        if (document.getElementById('revenueTotal')) {
            const totalRevenue = (stats.summary?.revenue || 0) * 3;
            document.getElementById('revenueTotal').textContent = `₦${totalRevenue.toLocaleString()}`;
            document.getElementById('revenueTotal').style.color = 'var(--status-paid)';
        }
    }

    updateDashboard(stats) {
        // Update recent requests table
        const tableBody = document.querySelector('#recentRequestsTable tbody');
        if (!tableBody || !stats.requests?.recent) return;
        
        tableBody.innerHTML = '';
        
        if (stats.requests.recent.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center; padding: 20px; color: var(--gray-color);">No recent requests</td>';
            tableBody.appendChild(row);
            return;
        }
        
        stats.requests.recent.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" style="max-width: 150px;" title="${request.email}">
                    <i class="fas fa-envelope" style="margin-right: 8px; color: var(--primary-color);"></i>
                    ${request.email}
                </td>
                <td style="color: var(--gray-color);">
                    <i class="fas fa-calendar" style="margin-right: 8px;"></i>
                    ${request.lastRequest ? new Date(request.lastRequest).toLocaleString() : 'N/A'}
                </td>
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

    // Update the renderTokensTable to show better token status with vibrant colors
    renderTokensTable(tokens) {
        const tableBody = document.querySelector('#tokensTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!tokens || Object.keys(tokens).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div style="color: var(--gray-color);">
                        <i class="fas fa-key" style="font-size: 48px; margin-bottom: 20px; display: block; opacity: 0.5; color: var(--primary-color);"></i>
                        <h4 style="margin-bottom: 10px; color: var(--dark-color);">No tokens found</h4>
                        <p>Generate your first token</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(tokens).forEach(([token, data]) => {
            // Determine token status with vibrant colors
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
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <code class="text-truncate" style="max-width: 250px; display: block; padding: 10px 14px; 
                           background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1)); 
                           border-radius: 10px; color: var(--dark-color); border: 2px solid var(--border-color);" 
                           title="${token}">${token}</code>
                </td>
                <td class="text-truncate" style="max-width: 180px;" title="${data.email}">
                    <i class="fas fa-envelope" style="margin-right: 8px; color: var(--primary-color);"></i>
                    ${data.email}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--dark-color); background: var(--gray-light); padding: 6px 12px; border-radius: 8px;">
                        <i class="fas fa-calendar-alt" style="color: var(--primary-color);"></i>
                        ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${data.used ? 'status-terminated' : 'status-active'}">
                        <i class="fas ${data.used ? 'fa-check' : 'fa-circle'}" style="margin-right: 6px;"></i>
                        ${data.used ? 'Yes' : 'No'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${tokenTypeClass}">
                        <i class="fas ${tokenTypeIcon}" style="margin-right: 6px;"></i>
                        ${tokenTypeText}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}" style="margin-right: 6px;"></i>
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

    // Update the renderRequestsTable to show better location with vibrant colors
    renderRequestsTable(requests) {
        const tableBody = document.querySelector('#requestsTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!requests || Object.keys(requests).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-color);">
                    <i class="fas fa-network-wired" style="font-size: 48px; margin-bottom: 20px; display: block; opacity: 0.5; color: var(--primary-color);"></i>
                    <h4 style="color: var(--dark-color);">No requests found</h4>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(requests).forEach(([email, requestList]) => {
            if (requestList && requestList.length > 0) {
                const lastRequest = requestList[requestList.length - 1];
                const city = lastRequest.city || 'Unknown';
                const country = lastRequest.country || 'Unknown';
                const countryName = lastRequest.countryName || country;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-truncate" style="max-width: 150px;" title="${email}">
                        <i class="fas fa-user" style="margin-right: 8px; color: var(--primary-color);"></i>
                        ${email}
                    </td>
                    <td>
                        <code style="background: var(--gray-light); padding: 6px 10px; border-radius: 6px; color: var(--dark-color); border: 1px solid var(--border-color);">${lastRequest.ip || 'Unknown'}</code>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                            ${city}, ${countryName}
                        </div>
                    </td>
                    <td style="color: var(--gray-color);">${lastRequest.region || 'Unknown'}</td>
                    <td class="text-truncate" style="max-width: 200px; color: var(--dark-color);" title="${lastRequest.userAgent || 'Unknown'}">
                        <i class="fas fa-desktop" style="margin-right: 8px; color: var(--primary-color);"></i>
                        ${this.truncateString(lastRequest.userAgent || 'Unknown', 50)}
                    </td>
                    <td style="color: var(--gray-color);">
                        <i class="fas fa-clock" style="margin-right: 8px;"></i>
                        ${lastRequest.timestamp ? new Date(lastRequest.timestamp).toLocaleString() : 'Unknown'}
                    </td>
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

    // ===== FIXED: Render Charts with Automatic Animation =====
    renderCharts(stats) {
        if (!stats) return;
        
        // User Distribution Chart with vibrant colors
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
                            'rgba(59, 130, 246, 0.8)',  // Blue for approved
                            'rgba(245, 158, 11, 0.8)',  // Orange for pending
                            'rgba(239, 68, 68, 0.8)'    // Red for terminated
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
            
            // Add animation class to chart container
            const chartContainer = document.querySelector('#userDistributionChart').parentElement;
            chartContainer.classList.add('user-distribution-animation');
        }
        
        // Daily Activity Chart with gradient and automatic animation
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
            
            // Add animation class to chart container
            const activityContainer = document.querySelector('#dailyActivityChart').parentElement;
            activityContainer.classList.add('daily-activity-animation');
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
            `Are you sure you want to mark user <strong style="color: var(--primary-color);">${email}</strong> as <strong style="color: ${paid ? 'var(--status-paid)' : 'var(--status-pending)'};">${paid ? 'paid' : 'not paid'}</strong>?`,
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
            `Are you sure you want to delete user <strong style="color: var(--primary-color);">${email}</strong>?<br><br>
             <span style="color: var(--status-terminated); font-weight: 600;">
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
            '⚠️ <strong style="color: var(--status-terminated);">WARNING:</strong> Are you sure you want to restore from backup?<br><br><span style="color: var(--dark-color);">This will overwrite current data!<br>All existing users, tokens, and requests will be replaced with backup data.</span>',
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

    // ===== NEW: Load Admin Settings =====
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
    }

    // ===== NEW: Save Admin Settings =====
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

    // Add a new method to update the users table header
    updateUsersTableHeader() {
        const usersTable = document.querySelector('#usersTable thead tr');
        if (usersTable) {
            usersTable.innerHTML = `
                <tr>
                    <th><i class="fas fa-envelope"></i> Email</th>
                    <th><i class="fas fa-info-circle"></i> Status</th>
                    <th><i class="fas fa-money-bill"></i> Payment</th>
                    <th><i class="fas fa-coins"></i> Revenue</th>
                    <th><i class="fas fa-key"></i> Token Status</th>
                    <th><i class="fas fa-map-marker-alt"></i> Location</th>
                    <th><i class="fas fa-history"></i> Last Active</th>
                    <th><i class="fas fa-cogs"></i> Actions</th>
                </tr>
            `;
        }
    }

    // Add CSS for location details
    addLocationStyles() {
        const locationStyle = document.createElement('style');
        locationStyle.textContent = `
            /* Enhanced Status Badges */
            .status-badge {
                padding: 8px 18px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                white-space: nowrap;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: inline-flex;
                align-items: center;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }
            
            .status-badge:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            }
            
            /* Button enhancements */
            .btn-primary {
                position: relative;
                overflow: hidden;
            }
            
            .btn-primary::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: 0.5s;
            }
            
            .btn-primary:hover::before {
                left: 100%;
            }
            
            /* Card animations */
            .card {
                transition: all 0.3s ease;
            }
            
            .card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            }
            
            /* Table row hover effect */
            tr {
                transition: all 0.2s ease;
            }
            
            tr:hover {
                background: linear-gradient(90deg, rgba(124, 58, 237, 0.05), transparent) !important;
            }
            
            /* Animated status indicators */
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .status-indicator {
                animation: pulse 2s infinite;
            }
            
            /* Location display */
            .location-display {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--dark-color);
                background: var(--gray-light);
                padding: 6px 12px;
                border-radius: 8px;
                border: 1px solid var(--border-color);
            }
            
            /* Revenue cell styling */
            .revenue-cell {
                font-weight: 700 !important;
                font-size: 16px !important;
            }
            
            .revenue-cell.zero {
                color: var(--gray-color) !important;
            }
            
            /* Action buttons spacing */
            .action-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .action-buttons button {
                min-width: 36px;
                height: 36px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                transition: all 0.3s ease;
            }
            
            .action-buttons button:hover {
                transform: translateY(-2px);
            }
            
            .action-buttons button i {
                font-size: 14px;
            }
            
            /* Terminate button in action buttons */
            .action-buttons .terminate {
                background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                color: white !important;
                border: 2px solid #ef4444 !important;
            }
            
            .action-buttons .terminate:hover {
                background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
            }
            
            /* Filter buttons */
            .filter-buttons {
                display: flex;
                gap: 10px;
                margin: 15px 0;
            }
            
            .filter-btn {
                padding: 10px 20px;
                border: 2px solid var(--border-color);
                background: var(--card-bg);
                border-radius: 12px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                color: var(--gray-color);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }
            
            .filter-btn.active {
                background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
                border-color: var(--primary-color);
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
            }
            
            .filter-btn:hover:not(.active) {
                border-color: var(--primary-color);
                color: var(--primary-color);
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(locationStyle);
    }

    // Add this helper method to parse location
    parseLocation(location) {
        if (!location) return { city: 'Unknown', country: 'Unknown' };
        
        if (typeof location === 'object') {
            return {
                city: location.city || 'Unknown',
                country: location.country || 'Unknown',
                region: location.region || 'Unknown'
            };
        }
        
        if (typeof location === 'string') {
            if (location.includes(',')) {
                const parts = location.split(',');
                return {
                    city: parts[0]?.trim() || 'Unknown',
                    country: parts[1]?.trim() || 'Unknown',
                    region: parts[2]?.trim() || 'Unknown'
                };
            }
            return { city: location, country: location, region: 'Unknown' };
        }
        
        return { city: 'Unknown', country: 'Unknown', region: 'Unknown' };
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
    background: var(--card-bg);
    border-radius: var(--border-radius);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--shadow-lg);
    animation: modalSlideIn 0.3s ease;
    border: 2px solid var(--border-color);
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
    border-bottom: 2px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to right, rgba(124, 58, 237, 0.05), transparent);
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
    color: var(--dark-color);
}

.custom-modal .modal-body {
    padding: 25px;
    color: var(--gray-color);
    line-height: 1.6;
}

.custom-modal .modal-footer {
    padding: 20px 25px;
    border-top: 2px solid var(--border-color);
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
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)) !important;
    color: white !important;
}

.custom-modal .modal-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
}

.custom-modal .modal-btn.secondary {
    background: var(--gray-light);
    color: var(--dark-color);
    border: 2px solid var(--border-color);
}

.custom-modal .modal-btn.secondary:hover {
    background: var(--light-color);
    border-color: var(--primary-color);
}

.notification-container {
    position: fixed;
    top: 25px;
    right: 25px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-width: 450px;
}

.notification {
    background: var(--card-bg);
    padding: 20px 25px;
    border-radius: var(--border-radius);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 20px;
    min-width: 350px;
    animation: slideInRight 0.3s ease;
    border-left: 6px solid;
    border: 2px solid var(--border-color);
    backdrop-filter: blur(10px);
}

.notification.success {
    border-left-color: var(--status-paid);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
}

.notification.error {
    border-left-color: var(--status-terminated);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
}

.notification.warning {
    border-left-color: var(--status-pending);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
}

.notification.info {
    border-left-color: var(--status-approved);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
}

.notification i {
    font-size: 24px;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.notification.success i {
    background: var(--status-paid);
    color: white;
}

.notification.error i {
    background: var(--status-terminated);
    color: white;
}

.notification.warning i {
    background: var(--status-pending);
    color: white;
}

.notification.info i {
    background: var(--status-approved);
    color: white;
}

.notification span {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: var(--dark-color);
}

.notification-close {
    background: none;
    border: none;
    color: var(--gray-color);
    cursor: pointer;
    font-size: 16px;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: var(--transition);
}

.notification-close:hover {
    color: var(--dark-color);
    background: var(--gray-light);
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

/* Theme transitions */
body {
    transition: background-color 0.3s ease;
}

/* Ensure buttons use theme colors */
.btn-primary {
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)) !important;
    border-color: var(--primary-color) !important;
}

.btn-primary:hover {
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)) !important;
    border-color: var(--primary-color) !important;
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(124, 58, 237, 0.4);
}

/* Theme-specific stat item icons */
.stat-item i {
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Theme-specific action button icons */
.action-btn i {
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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
                    <span style="margin-left: auto; font-size: 10px; background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); color: white; padding: 2px 8px; border-radius: 10px;">Active</span>
                `;
                adminNavItem.style.color = 'var(--primary-color)';
            }
        } else {
            // Token expired, clear it
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
            this.showMessage('Session expired. Please login again.', 'error');
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