//front
const socket = io();
let countdownInterval;
let currentUserNumber = null;
let currentUserToken = null;
let currentUserEmail = null;

// ===== DOM ELEMENTS =====
const elements = {
    navOverlay: document.getElementById('navOverlay'),
    menuToggle: document.getElementById('menuToggle'),
    closeNav: document.getElementById('closeNav'),
    userEmail: document.getElementById('userEmail'),
    userStatus: document.getElementById('userStatus'),
    activeUsersCount: document.getElementById('activeUsersCount'),
    liveUsers: document.getElementById('liveUsers'),
    navItems: document.querySelectorAll('.nav-item'),
    contentSections: document.querySelectorAll('.content-section'),
    pairingSection: document.getElementById('pairingSection'),
    statusSection: document.getElementById('statusSection'),
    codeDisplay: document.getElementById('codeDisplay'),
    countdown: document.getElementById('countdown'),
    connectedNumber: document.getElementById('connectedNumber'),
    emailInput: document.getElementById('emailInput'),
    codeEmail: document.getElementById('codeEmail'),
    codeTokenInput: document.getElementById('codeTokenInput'),
    codeNumber: document.getElementById('codeNumber'),
    tokenValidationResult: document.getElementById('tokenValidationResult'),
    sessionsList: document.getElementById('sessionsList'),
    customModal: document.getElementById('customModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalConfirm: document.getElementById('modalConfirm'),
    themeToggleBtn: document.querySelector('.nav-item[data-section="theme"]') // Add this line
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSocket();
    initEventListeners();
    checkSavedToken();
    checkThemePreference();
    checkAdminAccess();
});

setInterval(checkAdminAccess, 5 * 60 * 1000);

// ===== THEME FUNCTIONS =====
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    console.log('Loading theme:', savedTheme);
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        console.log('Applied light theme');
    } else {
        document.body.classList.add('dark-theme');
        console.log('Applied dark theme');
    }
    
    // Update theme icon in navigation
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const themeToggle = document.querySelector('.nav-item[data-section="theme"]');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (theme === 'light') {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark Mode';
        } else {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light Mode';
        }
    }
}

function toggleTheme() {
    console.log('Toggle theme clicked');
    
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        showToast('Theme changed to Light mode', 'success');
        updateThemeIcon('light');
        console.log('Switched to light theme');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Theme changed to Dark mode', 'success');
        updateThemeIcon('dark');
        console.log('Switched to dark theme');
    }
}

// ===== CUSTOM MODAL FUNCTIONS =====
function showModal(title, message, confirmText = 'Confirm', confirmCallback = null) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = message;
    elements.modalConfirm.textContent = confirmText;
    
    if (confirmCallback) {
        const originalOnclick = elements.modalConfirm.onclick;
        elements.modalConfirm.onclick = function() {
            confirmCallback();
            closeModal();
        };
    }
    
    elements.customModal.classList.remove('hidden');
}

function closeModal() {
    elements.customModal.classList.add('hidden');
    elements.modalConfirm.onclick = null;
}

// ===== NAVIGATION =====
function initNavigation() {
    console.log('Initializing navigation...');
    
    elements.menuToggle.addEventListener('click', () => {
        elements.navOverlay.classList.toggle('active');
    });
    
    elements.closeNav.addEventListener('click', () => {
        elements.navOverlay.classList.remove('active');
    });
    
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            console.log('Nav item clicked:', section);
            
            // Handle theme toggle separately
            if (section === 'theme') {
                e.stopPropagation(); // Prevent event from bubbling up
                toggleTheme();
                return;
            }
            
            // Handle admin login separately
            if (section === 'admin') {
                return;
            }
            
            // Normal navigation items
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            showSection(section);
            
            if (window.innerWidth <= 768) {
                elements.navOverlay.classList.remove('active');
            }
        });
    });
    
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const section = btn.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

function showSection(section) {
    console.log('Showing section:', section);
    
    elements.contentSections.forEach(sec => {
        sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    const headerTitle = document.querySelector('.header-title h1');
    const headerSubtitle = document.querySelector('.header-title p');
    
    switch(section) {
        case 'home':
            headerTitle.textContent = 'Dashboard';
            headerSubtitle.textContent = 'Welcome to Tracle-Lite Pro';
            break;
        case 'token':
            headerTitle.textContent = 'Get Token';
            headerSubtitle.textContent = 'Request your access token';
            break;
        case 'features':
            headerTitle.textContent = 'Features';
            headerSubtitle.textContent = 'Explore premium features';
            break;
        case 'sessions':
            headerTitle.textContent = 'My Sessions';
            headerSubtitle.textContent = 'Manage connected devices';
            loadUserSessions();
            break;
    }
}

// ===== SOCKET FUNCTIONS =====
function initSocket() {
    socket.on('connect', () => {
        console.log('Connected to server');
        showToast('✅ Connected to server', 'success');
    });
    
    socket.on('active-users-update', (data) => {
        if (elements.activeUsersCount) {
            elements.activeUsersCount.textContent = data.count;
        }
        if (elements.liveUsers) {
            elements.liveUsers.textContent = data.count;
        }
    });
    
    socket.on('pairing-code', (data) => {
        if (data.email !== currentUserEmail || data.token !== currentUserToken) {
            console.log('Ignoring pairing code for different user');
            return;
        }
        
        currentUserNumber = data.userNumber;
        const code = data.pairingCode;
        showPairingCode(code);
    });
    
    socket.on('connected', (data) => {
        if (data.email !== currentUserEmail || data.token !== currentUserToken) {
            console.log('Ignoring connection for different user');
            return;
        }
        
        showConnected(data.userNumber);
    });
    
    socket.on('disconnected', (data) => {
        if (data.email !== currentUserEmail || data.token !== currentUserToken) {
            return;
        }
        showToast('WhatsApp session disconnected', 'warning');
    });
    
    socket.on('error', (data) => {
        if (data.email !== currentUserEmail || data.token !== currentUserToken) {
            return;
        }
        showToast('Error: ' + data.error, 'error');
    });
    
    socket.on('pairing-expired', (data) => {
        if (data.email !== currentUserEmail || data.token !== currentUserToken) {
            return;
        }
        showToast('Pairing code expired. Generate a new one.', 'warning');
        resetPairingSection();
    });
}

// ===== TOKEN MANAGEMENT =====
function checkSavedToken() {
    const savedToken = localStorage.getItem('user_token');
    const savedEmail = localStorage.getItem('user_email');
    
    if (savedToken && savedEmail) {
        currentUserToken = savedToken;
        currentUserEmail = savedEmail;
        
        elements.userEmail.textContent = savedEmail;
        elements.userStatus.textContent = 'Token: ' + savedToken.substring(0, 12) + '...';
        elements.userStatus.style.color = 'var(--accent-success)';
        elements.codeTokenInput.value = savedToken;
        
        showToast('✅ Welcome back! Your token is loaded.', 'success');
    }
}

function saveUserToken(token, email) {
    localStorage.setItem('user_token', token);
    localStorage.setItem('user_email', email);
    localStorage.setItem('token_saved_at', Date.now());
    
    currentUserToken = token;
    currentUserEmail = email;
    
    elements.userEmail.textContent = email;
    elements.userStatus.textContent = 'Token: ' + token.substring(0, 12) + '...';
    elements.userStatus.style.color = 'var(--accent-success)';
    elements.codeTokenInput.value = token;
    
    showToast('✅ Token saved for this session', 'success');
}

// ===== TOKEN VALIDATION =====
async function validateTokenForUser(email, token) {
    try {
        console.log('🔐 Validating token:', { email, token: token.substring(0, 12) + '...' });
        
        const response = await fetch('/api/validate-token-email', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                email: email,
                token: token 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Token validation failed`);
        }
        
        const data = await response.json();
        console.log('🔐 Validation response:', data);
        
        return data;
        
    } catch (error) {
        console.error('❌ Token validation error:', error);
        return { 
            valid: false, 
            message: 'Failed to validate token. Please try again.' 
        };
    }
}

// ===== MAIN PAIRING CODE FUNCTION =====
async function getPairingCode() {
    const email = elements.codeEmail.value.trim();
    const token = elements.codeTokenInput.value.trim();
    const number = elements.codeNumber.value.trim();
    
    if (!email || !token || !number) {
        showModal('Missing Information', 'Please fill in all fields: Email, Token, and WhatsApp Number.', 'OK');
        return;
    }
    
    if (!token.startsWith('Tracle_') || token.length !== 18) {
        showModal('Invalid Token', 'Token should start with "Tracle_" and be exactly 18 characters long.', 'OK');
        return;
    }
    
    const validatedNumber = validateWhatsAppNumber(number);
    if (!validatedNumber) {
        showModal('Invalid Number', 'Please enter a valid WhatsApp number with country code (e.g., 1234567890, 441234567890)', 'OK');
        return;
    }
    
    const getCodeBtn = document.querySelector('.primary-btn[onclick*="getPairingCode"]');
    const originalHtml = getCodeBtn.innerHTML;
    getCodeBtn.disabled = true;
    getCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Code...';
    
    try {
        // First validate token
        const validationResult = await validateTokenForUser(email, token);
        
        if (validationResult.valid) {
            saveUserToken(token, email);
            
            // Check if session exists on B2 and get new code
            const sessionCheckResponse = await fetch('/api/user/check-session-exists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    token: token,
                    userNumber: validatedNumber
                })
            });
            
            if (sessionCheckResponse.ok) {
                const sessionData = await sessionCheckResponse.json();
                
                if (sessionData.sessionExists) {
                    showModal('Session Found', 
                        `A session already exists for ${validatedNumber}.<br><br>
                        <strong>Options:</strong><br>
                        1. Restore existing session (if disconnected)<br>
                        2. Generate new pairing code<br>
                        3. Delete session and start fresh`,
                        'Generate New Code',
                        () => {
                            createNewSession(validatedNumber, email, token);
                        }
                    );
                } else {
                    // No session exists, create new one
                    createNewSession(validatedNumber, email, token);
                }
            } else {
                // Fallback to direct creation
                createNewSession(validatedNumber, email, token);
            }
            
        } else {
            showModal('Token Error', validationResult.message || 'Failed to verify token.', 'OK');
        }
    } catch (error) {
        console.error('Pairing code error:', error);
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
    } finally {
        getCodeBtn.disabled = false;
        getCodeBtn.innerHTML = originalHtml;
    }
}

function createNewSession(userNumber, email, token) {
    if (elements.pairingSection && !elements.pairingSection.classList.contains('hidden')) {
        elements.pairingSection.classList.remove('hidden');
        elements.codeDisplay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generating pairing code...</span>
            </div>
        `;
    }
    
    socket.emit('create-session', {
        userNumber: userNumber,
        email: email,
        token: token
    });
    
    startCountdown(120);
}

function validateWhatsAppNumber(number) {
    const cleanNumber = number.replace(/\D/g, '');
    
    if (!/^\d+$/.test(cleanNumber)) {
        return false;
    }
    
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        return false;
    }
    
    // Return the cleaned number without auto-adding any country code
    return cleanNumber;
}

function showPairingCode(code) {
    elements.pairingSection.classList.remove('hidden');
    elements.statusSection.classList.add('hidden');
    
    elements.codeDisplay.innerHTML = `
        <div class="code-text">${code}</div>
        <button class="copy-btn" onclick="copyToClipboard('${code}')">
            <i class="fas fa-copy"></i> Copy
        </button>
    `;
    
    startCountdown(120);
    showToast('✅ Pairing code generated! Click "Copy" to copy it.', 'success');
    
    // Auto-scroll to code section
    const codeSection = document.getElementById('pairingSection');
    if (codeSection) {
        setTimeout(() => {
            codeSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 500);
    }
}

function showConnected(userNumber) {
    stopCountdown();
    elements.pairingSection.classList.add('hidden');
    elements.statusSection.classList.remove('hidden');
    
    if (userNumber) {
        elements.connectedNumber.textContent = formatPhoneNumber(userNumber);
    }
    
    showToast('✅ Successfully connected to WhatsApp!', 'success');
}

function resetConnection() {
    elements.statusSection.classList.add('hidden');
    elements.codeNumber.value = '';
    showSection('home');
}

function resetPairingSection() {
    elements.pairingSection.classList.add('hidden');
    stopCountdown();
}

// ===== COUNTDOWN FUNCTIONS =====
function startCountdown(seconds) {
    let timeLeft = seconds;
    stopCountdown();
    
    elements.countdown.textContent = `${timeLeft}s`;
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        elements.countdown.textContent = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            stopCountdown();
            elements.countdown.textContent = 'Expired';
            showToast('Pairing code expired. Click "New Code" for a new one.', 'warning');
        }
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// ===== TOKEN REQUEST FUNCTIONS =====
async function requestToken() {
    const email = elements.emailInput.value.trim();
    
    if (!email) {
        showModal('Email Required', 'Please enter your email address to request a token.', 'OK');
        return;
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com)$/;
    if (!emailRegex.test(email)) {
        showModal('Invalid Email', 'Only @gmail.com or @outlook.com emails are allowed.', 'OK');
        return;
    }
    
    const requestBtn = document.querySelector('.primary-btn[onclick*="requestToken"]');
    const originalHtml = requestBtn.innerHTML;
    requestBtn.disabled = true;
    requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting...';
    
    try {
        const response = await fetch('/api/request-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showModal('Request Submitted', 
                `<div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: var(--accent-success); margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px;">Token Request Submitted!</h3>
                    <p>${data.message}</p>
                    <p><strong>Your request has been sent to admin.</strong></p>
                    <p>Please wait for admin approval and check your email <strong>${email}</strong> for the token.</p>
                    <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); margin-top: 20px;">
                        <p><i class="fas fa-info-circle"></i> <strong>Contact Admin if you have issues:</strong></p>
                        <p>📧 Email: <strong>brenaldmedia@gmail.com</strong></p>
                        <p>📱 WhatsApp: <a href="https://wa.me/2349025303930" target="_blank">+234 902 530 3930</a></p>
                    </div>
                </div>`, 
                'Got it', 
                () => {
                    elements.emailInput.value = '';
                });
            
        } else {
            showModal('Request Failed', data.message || 'Failed to request token. Please try again.', 'OK');
        }
    } catch (error) {
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
        console.error('Token request error:', error);
    } finally {
        requestBtn.disabled = false;
        requestBtn.innerHTML = originalHtml;
    }
}

// ===== SESSIONS MANAGEMENT =====
async function loadUserSessions() {
    try {
        if (!currentUserEmail || !currentUserToken) {
            elements.sessionsList.innerHTML = `
                <div class="no-sessions">
                    <i class="fas fa-key"></i>
                    <h4>Authentication Required</h4>
                    <p>Please enter your email and token first.</p>
                    <button class="primary-btn" onclick="showSection('home')">
                        <i class="fas fa-home"></i> Go to Dashboard
                    </button>
                </div>
            `;
            return;
        }
        
        elements.sessionsList.innerHTML = `
            <div class="loading-sessions">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading your sessions...</span>
            </div>
        `;
        
        const response = await fetch('/api/user-sessions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: currentUserEmail,
                token: currentUserToken
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }
        
        const data = await response.json();
        
        if (data.success && data.sessions && data.sessions.length > 0) {
            let sessionsHTML = '<div class="sessions-grid">';
            
            data.sessions.forEach(session => {
                sessionsHTML += `
                    <div class="session-card">
                        <div class="session-header">
                            <i class="fas fa-phone"></i>
                            <h4>${session.userNumber}</h4>
                            <span class="session-status ${session.isConnected ? 'connected' : 'disconnected'}">
                                ${session.isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <div class="session-body">
                            <p><strong>Registered:</strong> ${session.registered ? 'Yes' : 'No'}</p>
                            <p><strong>Mode:</strong> ${session.settings?.botMode || 'public'}</p>
                            <p><strong>Last Active:</strong> ${session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'Never'}</p>
                            <div class="session-actions">
                                <button class="btn-restore small" onclick="restoreSession('${session.userNumber}')">
                                    <i class="fas fa-sync-alt"></i> Restore
                                </button>
                                <button class="btn-delete small" onclick="deleteUserSession('${session.userNumber}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            sessionsHTML += '</div>';
            elements.sessionsList.innerHTML = sessionsHTML;
        } else {
            elements.sessionsList.innerHTML = `
                <div class="no-sessions">
                    <i class="fas fa-link-slash"></i>
                    <h4>No Active Sessions</h4>
                    <p>You haven't connected any WhatsApp devices yet.</p>
                    <p>Use the pairing feature to connect your WhatsApp.</p>
                    <button class="primary-btn" onclick="showSection('home')">
                        <i class="fas fa-plus"></i> Connect Device
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        elements.sessionsList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Error Loading Sessions</h4>
                <p>Failed to load sessions. Please try again.</p>
            </div>
        `;
    }
}

// ===== SESSION MANAGEMENT FUNCTIONS =====
async function restoreSession(userNumber) {
    if (!currentUserEmail || !currentUserToken) {
        showToast('Authentication required', 'error');
        return;
    }
    
    try {
        showModal('Restore Session', 
            `Do you want to restore session for ${userNumber}? This will generate a new pairing code.`,
            'Restore',
            async () => {
                try {
                    showToast('Restoring session...', 'info');
                    
                    const response = await fetch('/api/user/restore-session', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: currentUserEmail,
                            token: currentUserToken,
                            userNumber: userNumber
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.success) {
                            showToast('✅ Session restored! Generating new pairing code...', 'success');
                            
                            // Switch to home section and generate new code
                            elements.codeNumber.value = userNumber;
                            showSection('home');
                            
                            // Generate new pairing code
                            setTimeout(() => {
                                createNewSession(userNumber, currentUserEmail, currentUserToken);
                            }, 1000);
                        } else {
                            showToast('❌ ' + data.message, 'error');
                        }
                    } else {
                        throw new Error('Failed to restore session');
                    }
                } catch (error) {
                    console.error('Error restoring session:', error);
                    showToast('❌ Failed to restore session', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error in restoreSession:', error);
        showToast('❌ Error restoring session', 'error');
    }
}

async function deleteUserSession(userNumber) {
    if (!currentUserEmail || !currentUserToken) {
        showToast('Authentication required', 'error');
        return;
    }
    
    try {
        showModal('Delete Session', 
            `Are you sure you want to delete session for ${userNumber}? This will disconnect WhatsApp and remove all session data .`,
            'Delete',
            async () => {
                try {
                    showToast('Deleting session...', 'info');
                    
                    const response = await fetch(`/api/delete-user-session`, {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: currentUserEmail,
                            token: currentUserToken,
                            userNumber: userNumber
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        showToast('✅ Session deleted successfully', 'success');
                        
                        // Reload sessions list
                        loadUserSessions();
                        
                        // Emit disconnect event
                        socket.emit('disconnect-session', {
                            userNumber: userNumber,
                            email: currentUserEmail,
                            token: currentUserToken
                        });
                    } else {
                        throw new Error('Failed to delete session');
                    }
                } catch (error) {
                    console.error('Error deleting session:', error);
                    showToast('❌ Failed to delete session', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error in deleteSession:', error);
        showToast('❌ Error deleting session', 'error');
    }
}

function generateNewCode() {
    if (!currentUserNumber || !currentUserEmail || !currentUserToken) {
        showToast('Please enter your details first', 'error');
        return;
    }
    
    createNewSession(currentUserNumber, currentUserEmail, currentUserToken);
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
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
            console.log('Admin token expired');
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('Copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy to clipboard', 'error');
        });
}

function formatPhoneNumber(number) {
    // Simply return the number with + prefix
    return `+${number}`;
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function initEventListeners() {
    elements.emailInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') requestToken();
    });
    
    elements.codeEmail?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') getPairingCode();
    });
    
    elements.codeNumber?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    elements.codeTokenInput?.addEventListener('input', (e) => {
        const token = e.target.value;
        if (token.startsWith('Tracle_') && token.length === 18) {
            e.target.style.borderColor = 'var(--accent-success)';
        } else {
            e.target.style.borderColor = '';
        }
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopCountdown();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (currentUserNumber) {
        socket.emit('disconnect-session', {
            userNumber: currentUserNumber,
            email: currentUserEmail,
            token: currentUserToken
        });
    }
});

// Socket reconnection
socket.on('disconnect', () => {
    showToast('Connection lost. Reconnecting...', 'warning');
});

socket.on('reconnect', () => {
    showToast('Reconnected to server', 'success');
});

// Export functions to window for onclick handlers
window.getPairingCode = getPairingCode;
window.createNewSession = createNewSession;
window.generateNewCode = generateNewCode;
window.showSection = showSection;
window.requestToken = requestToken;
window.copyToClipboard = copyToClipboard;
window.loadUserSessions = loadUserSessions;
window.restoreSession = restoreSession;
window.deleteUserSession = deleteUserSession;
window.toggleTheme = toggleTheme;
window.closeModal = closeModal;
window.showModal = showModal;
window.checkAdminAccess = checkAdminAccess;

// Initialize
console.log('🚀 Tracle-Lite Pro Frontend Loaded - Smart Session Management');