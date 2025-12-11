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
        this.loadSavedTheme();
        this.addLocationStyles(); // Add location styles
        this.ensureThemeCSS(); // Ensure theme CSS is loaded
    }

    ensureThemeCSS() {
        // Check if theme CSS is already added
        if (!document.getElementById('theme-css-overrides')) {
            const style = document.createElement('style');
            style.id = 'theme-css-overrides';
            style.textContent = `
                /* Theme variable overrides - Higher specificity */
                body.theme-purple {
                    --primary-color: #4f46e5 !important;
                    --primary-dark: #3730a3 !important;
                    --secondary-color: #8b5cf6 !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-blue {
                    --primary-color: #3b82f6 !important;
                    --primary-dark: #1e40af !important;
                    --secondary-color: #60a5fa !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-green {
                    --primary-color: #10b981 !important;
                    --primary-dark: #047857 !important;
                    --secondary-color: #34d399 !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-orange {
                    --primary-color: #f59e0b !important;
                    --primary-dark: #d97706 !important;
                    --secondary-color: #fbbf24 !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-red {
                    --primary-color: #ef4444 !important;
                    --primary-dark: #dc2626 !important;
                    --secondary-color: #f87171 !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-violet {
                    --primary-color: #8b5cf6 !important;
                    --primary-dark: #7c3aed !important;
                    --secondary-color: #a78bfa !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-pink {
                    --primary-color: #ec4899 !important;
                    --primary-dark: #db2777 !important;
                    --secondary-color: #f472b6 !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-teal {
                    --primary-color: #14b8a6 !important;
                    --primary-dark: #0d9488 !important;
                    --secondary-color: #2dd4bf !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-amber {
                    --primary-color: #f97316 !important;
                    --primary-dark: #ea580c !important;
                    --secondary-color: #fb923c !important;
                    background-color: #f5f7fa !important;
                }
                
                body.theme-indigo {
                    --primary-color: #6366f1 !important;
                    --primary-dark: #4f46e5 !important;
                    --secondary-color: #818cf8 !important;
                    background-color: #f5f7fa !important;
                }
                
                /* Theme toggle button */
                .theme-toggle {
                    cursor: pointer;
                    transition: all 0.3s ease;
                    padding: 10px 15px;
                    border-radius: 8px;
                    background: rgba(79, 70, 229, 0.05);
                    margin: 10px 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .theme-toggle:hover {
                    background: rgba(79, 70, 229, 0.1);
                    color: var(--primary-color);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                }
                
                .theme-toggle i {
                    font-size: 18px;
                    color: var(--primary-color);
                    transition: transform 0.3s ease;
                }
                
                .theme-toggle:hover i {
                    transform: rotate(15deg);
                }
                
                .theme-toggle span {
                    font-weight: 500;
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Add this new method for editing revenue
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
                    <input type="email" id="editRevenueEmail" value="${email}" readonly style="background: #f5f5f5;">
                </div>
                <div class="form-group">
                    <label>Current Revenue: <strong>₦${currentRevenue.toLocaleString()}</strong></label>
                </div>
                <div class="form-group">
                    <label>New Revenue Amount (₦):</label>
                    <input type="number" id="editRevenueAmount" value="${currentRevenue}" min="0" step="100">
                </div>
                <div class="form-group">
                    <label>Adjustment Reason:</label>
                    <input type="text" id="editRevenueNote" placeholder="e.g., Manual adjustment, payment correction">
                </div>
                <div class="warning-box" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                    <small>Note: This will override the current revenue amount. Use negative values to decrease revenue.</small>
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
        document.documentElement.style.setProperty('--primary-dark', this.darkenColor(theme.primary, 20));
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        
        // Also update any theme-specific elements
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--primary-dark', this.darkenColor(theme.primary, 20));
        root.style.setProperty('--secondary-color', theme.secondary);
        
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

        // Update table headers when switching to users tab
        document.querySelector('.menu-item[data-tab="users"]')?.addEventListener('click', () => {
            setTimeout(() => {
                this.updateUsersTableHeader();
            }, 100);
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
                        <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; display: block; color: var(--gray-light);"></i>
                        <h4>No users found</h4>
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

    // ===== UPDATED GRANT FREE TOKENS FUNCTION =====
    async grantFreeTokens(email, amount) {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                this.showNotification('Please login again', 'error');
                this.showLogin();
                return;
            }
            
            // First generate a free token if user doesn't have one
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
                <input type="email" id="editUserEmail" value="${email}" readonly style="background: #f5f5f5;">
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
                            paid: newPaid
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

    // ===== UPDATED SHOW USER DETAILS MODAL =====
    showUserDetailsModal(userDetails) {
        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('userDetailsContent');
        
        if (!userDetails || !userDetails.user) {
            content.innerHTML = '<p>Error loading user details</p>';
            modal.classList.add('active');
            return;
        }
        
        const user = userDetails.user;
        
        // Get token status
        let tokenStatus = 'No Token';
        let tokenStatusClass = 'status-pending';
        let tokenType = 'No Token';
        
        if (user.token) {
            // Check if it's a free token
            const isFreeToken = userDetails.tokens && userDetails.tokens.length > 0 ? 
                userDetails.tokens[0].freeToken || !userDetails.tokens[0].paid : 
                user.freeToken || !user.paid;
            
            tokenStatus = isFreeToken ? 'Free' : (user.paid ? 'Paid' : 'Pending');
            tokenStatusClass = isFreeToken ? 'status-free' : (user.paid ? 'status-paid' : 'status-pending');
            tokenType = isFreeToken ? 'Free Token' : (user.paid ? 'Paid Token' : 'Pending Token');
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
                    <label><i class="fas fa-envelope"></i> Email:</label>
                    <span class="text-truncate" title="${user.email}">${user.email}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-info-circle"></i> Status:</label>
                    <span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-money-bill"></i> Payment Status:</label>
                    <span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">
                        ${user.paid ? 'Paid' : 'Not Paid'}
                    </span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-key"></i> Token Status:</label>
                    <span class="status-badge ${tokenStatusClass}">${tokenType}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-coins"></i> Revenue Generated:</label>
                    <span style="color: #10b981; font-weight: 600;">₦${(user.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-key"></i> Token Balance:</label>
                    <span>${user.tokenBalance || 0} tokens</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-map-marker-alt"></i> Location:</label>
                    <div class="location-details">
                        <div><strong>City:</strong> ${city}</div>
                        <div><strong>Region:</strong> ${region}</div>
                        <div><strong>Country:</strong> ${country}</div>
                        <div><strong>IP:</strong> <code>${ip}</code></div>
                        <div><strong>Timezone:</strong> ${timezone}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <label><i class="fas fa-history"></i> First Request:</label>
                    <span>${user.firstRequest ? new Date(user.firstRequest).toLocaleString() : 'Never'}</span>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-chart-line"></i> Total Requests:</label>
                    <span>${userDetails.totalRequests || 0}</span>
                </div>
                
                <div class="token-controls" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-gift"></i> Token Management</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="number" id="grantTokenAmount" placeholder="Amount" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" min="1" value="1">
                        <button class="btn-primary small" onclick="admin.grantFreeTokens('${user.email}', document.getElementById('grantTokenAmount').value)">
                            <i class="fas fa-gift"></i> Grant Free Tokens
                        </button>
                    </div>
                    <small style="color: #666;"><i class="fas fa-info-circle"></i> Free tokens work immediately without payment</small>
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

    // ===== UPDATED RENDER USERS TABLE =====
    renderUsersTable(users) {
        const tableBody = document.querySelector('#usersTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!users || Object.keys(users).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align: center; padding: 20px;">No users found</td>';
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
            
            // Get token status - check if it's a free token
            let tokenStatus = 'No Token';
            let tokenStatusClass = 'status-pending';
            if (user.token) {
                // Check if it's a free token
                tokenStatus = user.freeToken ? 'Free' : (user.paid ? 'Paid' : 'Pending');
                tokenStatusClass = user.freeToken ? 'status-free' : (user.paid ? 'status-paid' : 'status-pending');
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-truncate" style="max-width: 150px;" title="${email}">${email}</td>
                <td><span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span></td>
                <td><span class="status-badge ${user.paid ? 'status-paid' : 'status-pending'}">${user.paid ? 'Paid' : 'Pending'}</span></td>
                <td>${revenue > 0 ? `₦${revenue.toLocaleString()}` : '₦0'}</td>
                <td><span class="status-badge ${tokenStatusClass}">${tokenStatus}</span></td>
                <td>${city}, ${country}</td>
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
                        <button class="btn-secondary small warning" onclick="admin.editRevenue('${email}')" title="Edit Revenue">
                            <i class="fas fa-pencil-alt"></i>
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
        console.log('Current theme primary color:', primaryColor);
        
        // Update button colors immediately
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.style.backgroundColor = primaryColor;
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
        
        // Update revenue reports with accurate data
        if (document.getElementById('revenueToday')) {
            // For today's revenue, you might want to calculate differently
            const todayRevenue = Math.floor((stats.summary?.revenue || 0) / 30); // Example: monthly average
            document.getElementById('revenueToday').textContent = `₦${todayRevenue.toLocaleString()}`;
        }
        if (document.getElementById('revenueWeek')) {
            const weekRevenue = (stats.summary?.revenue || 0) * 7 / 30; // Example calculation
            document.getElementById('revenueWeek').textContent = `₦${Math.floor(weekRevenue).toLocaleString()}`;
        }
        if (document.getElementById('revenueMonth')) {
            document.getElementById('revenueMonth').textContent = `₦${(stats.summary?.revenue || 0).toLocaleString()}`;
        }
        if (document.getElementById('revenueTotal')) {
            const totalRevenue = (stats.summary?.revenue || 0) * 3; // Example: 3 months total
            document.getElementById('revenueTotal').textContent = `₦${totalRevenue.toLocaleString()}`;
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

    // Update the renderTokensTable to show better token status
    renderTokensTable(tokens) {
        const tableBody = document.querySelector('#tokensTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!tokens || Object.keys(tokens).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No tokens found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        Object.entries(tokens).forEach(([token, data]) => {
            // Determine token status
            let status = 'Active';
            let statusClass = 'status-active';
            
            if (data.used) {
                status = 'Used';
                statusClass = 'status-terminated';
            } else if (data.expires && data.expires < Date.now()) {
                status = 'Expired';
                statusClass = 'status-terminated';
            } else if (data.revoked) {
                status = 'Revoked';
                statusClass = 'status-terminated';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code class="text-truncate" style="max-width: 200px;" title="${token}">${token}</code></td>
                <td class="text-truncate" style="max-width: 150px;" title="${data.email}">${data.email}</td>
                <td>${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Unknown'}</td>
                <td>${data.used ? 'Yes' : 'No'}</td>
                <td><span class="status-badge ${data.freeToken ? 'status-free' : (data.paid ? 'status-paid' : 'status-pending')}">${data.freeToken ? 'Free' : (data.paid ? 'Paid' : 'Pending')}</span></td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
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

    // Update the renderRequestsTable to show better location
    renderRequestsTable(requests) {
        const tableBody = document.querySelector('#requestsTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!requests || Object.keys(requests).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No requests found</td>';
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
                    <td class="text-truncate" style="max-width: 150px;" title="${email}">${email}</td>
                    <td><code>${lastRequest.ip || 'Unknown'}</code></td>
                    <td>${city}, ${countryName}</td>
                    <td>${lastRequest.region || 'Unknown'}</td>
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

    // ===== UPDATED GENERATE TOKEN FUNCTION =====
    async generateToken() {
        const emailInput = document.getElementById('tokenEmail');
        const email = emailInput.value.trim();
        const paid = document.getElementById('tokenPaymentStatus').value === 'true';
        const freeTokensAmount = document.getElementById('freeTokensAmount').value;
        
        if (!email || !this.validateEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            emailInput.focus();
            return;
        }
        
        this.showCustomModal(
            'Generate Token',
            `Generate a token for user <strong>${email}</strong>?<br>
             Payment status: <strong>${paid ? 'Paid' : 'Free'}</strong><br>
             ${freeTokensAmount > 0 ? `Free tokens to add: <strong>${freeTokensAmount}</strong><br>` : ''}`,
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
                            free: !paid // Mark as free if not paid
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
                        
                        this.showNotification(`Token generated successfully! ${data.existing ? '(Already existed)' : ''}`, 'success');
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
                    <th>Email</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Revenue</th>
                    <th>Token Status</th>
                    <th>Location</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                </tr>
            `;
        }
    }

    // Add CSS for location details
    addLocationStyles() {
        const locationStyle = document.createElement('style');
        locationStyle.textContent = `
            /* Location details styling */
            .location-details {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 8px;
                margin-top: 5px;
                font-size: 13px;
            }
            
            .location-details div {
                margin-bottom: 3px;
                display: flex;
                justify-content: space-between;
            }
            
            .location-details div:last-child {
                margin-bottom: 0;
            }
            
            .location-details strong {
                color: #495057;
                min-width: 80px;
            }
            
            /* Status badge improvements */
            .status-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                display: inline-block;
                letter-spacing: 0.5px;
            }
            
            .status-active { background: #10b981; color: white; }
            .status-pending { background: #f59e0b; color: white; }
            .status-approved { background: #3b82f6; color: white; }
            .status-terminated { background: #ef4444; color: white; }
            .status-paid { background: #8b5cf6; color: white; }
            .status-free { background: #14b8a6; color: white; }  /* NEW: Free token color */
            .status-revoked { background: #6b7280; color: white; }
            .status-expired { background: #9ca3af; color: white; }
            
            /* Button styling */
            .btn-secondary.warning {
                background: #f59e0b;
                color: white;
                border: none;
            }
            
            .btn-secondary.warning:hover {
                background: #d97706;
            }
            
            /* Revenue display */
            .revenue-display {
                color: #10b981;
                font-weight: 700;
                font-size: 14px;
            }
            
            /* Table improvements */
            #usersTable th, #tokensTable th, #requestsTable th {
                white-space: nowrap;
                font-weight: 600;
                color: #374151;
            }
            
            #usersTable td, #tokensTable td, #requestsTable td {
                vertical-align: middle;
            }
            
            /* Revenue edit modal styles */
            .warning-box {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 12px;
                border-radius: 6px;
                margin: 15px 0;
                font-size: 13px;
                color: #856404;
            }
            
            .warning-box i {
                margin-right: 8px;
            }
            
            /* Revenue display in table */
            .revenue-cell {
                font-weight: 600;
                color: #10b981;
            }
            
            .revenue-cell.zero {
                color: #6b7280;
            }
            
            /* Location chip styling */
            .location-chip {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: #e9ecef;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 12px;
                color: #495057;
            }
            
            .location-chip i {
                font-size: 11px;
                color: #6c757d;
            }
            
            /* Action buttons spacing */
            .action-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: nowrap;
            }
            
            .action-buttons button {
                min-width: 32px;
                height: 32px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .action-buttons button i {
                font-size: 14px;
            }
            
            /* Responsive table adjustments */
            @media (max-width: 1200px) {
                #usersTable td:nth-child(6),
                #usersTable th:nth-child(6) {
                    display: none;
                }
            }
            
            @media (max-width: 992px) {
                #usersTable td:nth-child(5),
                #usersTable th:nth-child(5) {
                    display: none;
                }
            }
            
            /* Filter buttons for location */
            .filter-buttons {
                display: flex;
                gap: 10px;
                margin: 15px 0;
            }
            
            .filter-btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            
            .filter-btn.active {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }
            
            .filter-btn:hover:not(.active) {
                background: #f8f9fa;
            }
            
            /* Search box improvements */
            .search-box {
                position: relative;
                margin-bottom: 20px;
            }
            
            .search-box i {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #6b7280;
            }
            
            .search-box input {
                padding-left: 40px;
                width: 100%;
                max-width: 300px;
            }
            
            /* Theme toggle button */
            .theme-toggle {
                cursor: pointer;
                transition: all 0.3s ease;
                padding: 10px 15px;
                border-radius: 8px;
                background: rgba(79, 70, 229, 0.05);
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .theme-toggle:hover {
                background: rgba(79, 70, 229, 0.1);
                color: var(--primary-color);
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            }
            
            .theme-toggle i {
                font-size: 18px;
                color: var(--primary-color);
                transition: transform 0.3s ease;
            }
            
            .theme-toggle:hover i {
                transform: rotate(15deg);
            }
            
            .theme-toggle span {
                font-weight: 500;
                font-size: 14px;
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

/* Theme transitions */
body {
    transition: background-color 0.3s ease;
}

/* Theme-specific styles - HIGH PRIORITY */
body.theme-purple {
    --primary-color: #4f46e5 !important;
    --primary-dark: #3730a3 !important;
    --secondary-color: #8b5cf6 !important;
}

body.theme-blue {
    --primary-color: #3b82f6 !important;
    --primary-dark: #1e40af !important;
    --secondary-color: #60a5fa !important;
}

body.theme-green {
    --primary-color: #10b981 !important;
    --primary-dark: #047857 !important;
    --secondary-color: #34d399 !important;
}

body.theme-orange {
    --primary-color: #f59e0b !important;
    --primary-dark: #d97706 !important;
    --secondary-color: #fbbf24 !important;
}

body.theme-red {
    --primary-color: #ef4444 !important;
    --primary-dark: #dc2626 !important;
    --secondary-color: #f87171 !important;
}

body.theme-violet {
    --primary-color: #8b5cf6 !important;
    --primary-dark: #7c3aed !important;
    --secondary-color: #a78bfa !important;
}

body.theme-pink {
    --primary-color: #ec4899 !important;
    --primary-dark: #db2777 !important;
    --secondary-color: #f472b6 !important;
}

body.theme-teal {
    --primary-color: #14b8a6 !important;
    --primary-dark: #0d9488 !important;
    --secondary-color: #2dd4bf !important;
}

body.theme-amber {
    --primary-color: #f97316 !important;
    --primary-dark: #ea580c !important;
    --secondary-color: #fb923c !important;
}

body.theme-indigo {
    --primary-color: #6366f1 !important;
    --primary-dark: #4f46e5 !important;
    --secondary-color: #818cf8 !important;
}

/* Theme toggle styling */
.theme-toggle {
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 10px 15px;
    border-radius: 8px;
    background: rgba(79, 70, 229, 0.05);
    margin: 10px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.theme-toggle:hover {
    background: rgba(79, 70, 229, 0.1);
    color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.theme-toggle i {
    font-size: 18px;
    color: var(--primary-color);
    transition: transform 0.3s ease;
}

.theme-toggle:hover i {
    transform: rotate(15deg);
}

.theme-toggle span {
    font-weight: 500;
    font-size: 14px;
}

/* Ensure buttons use theme colors */
.btn-primary {
    background: var(--primary-color) !important;
    border-color: var(--primary-color) !important;
}

.btn-primary:hover {
    background: var(--primary-dark) !important;
    border-color: var(--primary-dark) !important;
}

/* Theme-specific stat item icons */
.stat-item i {
    color: var(--primary-color) !important;
}

/* Theme-specific action button icons */
.action-btn i {
    color: var(--primary-color) !important;
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