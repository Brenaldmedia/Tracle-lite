// front
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
    themeToggleBtn: document.querySelector('.nav-item[data-section="theme"]')
};

// ===== FREE PAIRING SYSTEM =====
let freePairingCountdown = null;
let freePairingRemainingTime = 0;

// Check free pairing status
async function checkFreePairingStatus() {
    try {
        const response = await fetch('/api/free-pairing/status');
        const data = await response.json();
        
        if (data.isActive) {
            freePairingRemainingTime = data.remainingTime;
            startFreePairingCountdown();
            updateUIForFreePeriod(true);
        } else {
            updateUIForFreePeriod(false);
        }
    } catch (error) {
        console.error('Error checking free pairing status:', error);
    }
}

// Start countdown for free pairing period
function startFreePairingCountdown() {
    if (freePairingCountdown) {
        clearInterval(freePairingCountdown);
    }
    
    freePairingCountdown = setInterval(() => {
        freePairingRemainingTime -= 1000;
        
        if (freePairingRemainingTime <= 0) {
            clearInterval(freePairingCountdown);
            updateUIForFreePeriod(false);
            showToast('Free pairing period has ended', 'warning');
        }
        
        updateFreePairingTimerDisplay();
    }, 1000);
}

// Update UI for free period
function updateUIForFreePeriod(isActive) {
    const tokenInput = document.getElementById('codeTokenInput');
    const getCodeBtn = document.getElementById('getPairingBtn');
    const tokenHint = document.getElementById('tokenHint');
    const pairingInstructions = document.getElementById('pairingInstructions');
    const freePeriodMessage = document.getElementById('freePeriodMessage');
    const freePeriodBanner = document.getElementById('freePeriodBanner');
    const freePairingStatusCard = document.getElementById('freePairingStatusCard');
    
    if (isActive) {
        // Show all free period elements
        if (freePeriodBanner) freePeriodBanner.classList.remove('hidden');
        if (freePeriodMessage) freePeriodMessage.classList.remove('hidden');
        if (freePairingStatusCard) freePairingStatusCard.classList.remove('hidden');
        
        // Update instructions
        if (pairingInstructions) {
            pairingInstructions.textContent = 'During free period: Only email and phone number required';
        }
        
        // Update token field
        tokenInput.placeholder = "Token (optional during free period)";
        tokenInput.required = false;
        
        // Update hint
        if (tokenHint) {
            tokenHint.innerHTML = '<i class="fas fa-info-circle"></i><span>Optional during free period</span>';
        }
        
        // Update button
        if (getCodeBtn) {
            const icon = getCodeBtn.querySelector('i');
            const text = getCodeBtn.querySelector('.btn-text');
            if (icon) icon.className = 'fas fa-gift';
            if (text) text.textContent = ' Get Free Pairing Code';
        }
    } else {
        // Hide all free period elements
        if (freePeriodBanner) freePeriodBanner.classList.add('hidden');
        if (freePeriodMessage) freePeriodMessage.classList.add('hidden');
        if (freePairingStatusCard) freePairingStatusCard.classList.add('hidden');
        
        // Restore normal instructions
        if (pairingInstructions) {
            pairingInstructions.textContent = 'Enter your email, token and number to get the bot pairing code';
        }
        
        // Restore token field
        tokenInput.placeholder = "Tracle_xxxxxxxxx";
        tokenInput.required = true;
        
        // Restore hint
        if (tokenHint) {
            tokenHint.innerHTML = '<i class="fas fa-info-circle"></i><span>Token required for access</span>';
        }
        
        // Restore button
        if (getCodeBtn) {
            const icon = getCodeBtn.querySelector('i');
            const text = getCodeBtn.querySelector('.btn-text');
            if (icon) icon.className = 'fas fa-play';
            if (text) text.textContent = ' Get Pairing Code';
        }
    }
}

// Update timer display
function updateFreePairingTimerDisplay() {
    const timerElement = document.getElementById('freePairingTimer');
    if (timerElement && freePairingRemainingTime > 0) {
        const hours = Math.floor(freePairingRemainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((freePairingRemainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((freePairingRemainingTime % (1000 * 60)) / 1000);
        timerElement.textContent = `${hours}h ${minutes}m ${seconds}s remaining`;
    }
}

// Modify getPairingCode function to handle free period
async function getPairingCode() {
    const email = elements.codeEmail.value.trim();
    const token = elements.codeTokenInput.value.trim();
    const number = elements.codeNumber.value.trim();
    
    // Check free pairing status first
    const freeStatusResponse = await fetch('/api/free-pairing/status');
    const freeStatus = await freeStatusResponse.json();
    
    if (!freeStatus.isActive) {
        // Normal validation required
        if (!email || !token || !number) {
            showModal('Missing Information', 'Please fill in all fields: Email, Token, and WhatsApp Number.', 'OK');
            return;
        }
        
        if (!token.startsWith('Tracle_') || token.length !== 18) {
            showModal('Invalid Token', 'Token should start with "Tracle_" and be exactly 18 characters long.', 'OK');
            return;
        }
        
        // Rest of normal validation...
    } else {
        // Free period - only email and number required
        if (!email || !number) {
            showModal('Missing Information', 'During free period, only Email and WhatsApp Number are required.', 'OK');
            return;
        }
        
        // Use empty token for free period
        const validatedNumber = validateWhatsAppNumber(number);
        if (!validatedNumber) {
            showModal('Invalid Number', 'Please enter a valid WhatsApp number with country code (e.g., 1234567890, 441234567890)', 'OK');
            return;
        }
        
        // Show free period message
        showToast('🎁 Using free pairing period! No token required.', 'success');
        
        // Proceed with empty token
        await processFreePairing(email, validatedNumber);
        return;
    }
    
    const validatedNumber = validateWhatsAppNumber(number);
    if (!validatedNumber) {
        showModal('Invalid Number', 'Please enter a valid WhatsApp number with country code (e.g., 1234567890, 441234567890)', 'OK');
        return;
    }
    
    // Get the correct button - check both possible selectors
    const getCodeBtn = document.querySelector('.primary-btn[onclick*="getPairingCode"]') || 
                      document.querySelector('.action-btn[onclick*="getPairingCode"]') ||
                      document.getElementById('getPairingBtn');
    
    if (getCodeBtn) {
        showLoader(getCodeBtn, 'Getting Code...');
    }
    
    try {
        const validationResult = await validateTokenForUser(email, token);
        
        if (validationResult.valid) {
            saveUserToken(token, email);
            
            // Show loading in pairing section
            showPairingSectionLoader('Generating pairing code...');
            
            if (elements.pairingSection && elements.pairingSection.classList.contains('hidden')) {
                elements.pairingSection.classList.remove('hidden');
            }
            
            if (elements.statusSection && !elements.statusSection.classList.contains('hidden')) {
                elements.statusSection.classList.add('hidden');
            }
            
            // Check if session exists
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
                    hideLoader(getCodeBtn);
                    showModal('Session Found', 
                        `A session already exists for ${validatedNumber}.<br><br>
                        <strong>Options:</strong><br>
                        1. Restore existing session (if disconnected)<br>
                        2. Generate new pairing code<br>
                        3. Delete session and start fresh<br><br>
                        <span style="color: var(--accent-warning); font-size: 12px;">
                            Note: If you choose "Generate New Code", the existing session will be deleted and replaced with a new one.
                        </span>`,
                        'Generate New Code',
                        () => {
                            createNewSession(validatedNumber, email, token, true);
                        },
                        () => {
                            // Cancel - just close modal
                        }
                    );
                } else {
                    createNewSession(validatedNumber, email, token, false);
                }
            } else {
                createNewSession(validatedNumber, email, token, false);
            }
            
        } else {
            hideLoader(getCodeBtn);
            showModal('Token Error', validationResult.message || 'Failed to verify token.', 'OK');
        }
    } catch (error) {
        console.error('Pairing code error:', error);
        hideLoader(getCodeBtn);
        hidePairingSectionLoader();
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
    }
}

// Process free pairing
async function processFreePairing(email, number) {
    const getCodeBtn = document.querySelector('.primary-btn[onclick*="getPairingCode"]') || 
                      document.getElementById('getPairingBtn');
    
    if (getCodeBtn) {
        showLoader(getCodeBtn, 'Getting Free Code...');
    }
    
    try {
        showPairingSectionLoader('Generating free pairing code...');
        
        if (elements.pairingSection && elements.pairingSection.classList.contains('hidden')) {
            elements.pairingSection.classList.remove('hidden');
        }
        
        // Emit to server with empty token for free period
        socket.emit('create-session', {
            userNumber: number,
            email: email,
            token: '' // Empty token for free period
        });
        
        startCountdown(120);
    } catch (error) {
        console.error('Free pairing error:', error);
        hideLoader(getCodeBtn);
        hidePairingSectionLoader();
        showModal('Error', 'Failed to generate free pairing code.', 'OK');
    }
}

// ===== LOADING STATE MANAGEMENT =====
function showLoader(button, text = 'Processing...') {
    if (!button) return;
    
    // Store original content
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    
    // Create loading state
    const spinner = document.createElement('i');
    spinner.className = 'fas fa-spinner fa-spin';
    
    button.innerHTML = '';
    button.appendChild(spinner);
    
    const textSpan = document.createElement('span');
    textSpan.className = 'btn-text';
    textSpan.textContent = ` ${text}`;
    button.appendChild(textSpan);
    
    // Add loading class for CSS styling
    button.classList.add('btn-loading');
}

function hideLoader(button) {
    if (!button || !button.dataset.originalHtml) return;
    
    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml;
    button.classList.remove('btn-loading');
    delete button.dataset.originalHtml;
}

function showSectionLoader(sectionId, text = 'Loading...') {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const loader = document.createElement('div');
    loader.className = 'section-loader';
    loader.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    loader.id = `${sectionId}-loader`;
    
    section.appendChild(loader);
}

function hideSectionLoader(sectionId) {
    const loader = document.getElementById(`${sectionId}-loader`);
    if (loader) loader.remove();
}

function showPairingSectionLoader(text = 'Generating pairing code...') {
    if (!elements.pairingSection) return;
    
    elements.pairingSection.classList.add('loading');
    
    if (!elements.codeDisplay) return;
    
    elements.codeDisplay.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>${text}</span>
        </div>
    `;
}

function hidePairingSectionLoader() {
    if (!elements.pairingSection) return;
    
    elements.pairingSection.classList.remove('loading');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSocket();
    initEventListeners();
    checkSavedToken();
    checkThemePreference();
    checkAdminAccess();
    checkFreePairingStatus(); // Add free pairing check
    
    // Also check free pairing status every minute
    setInterval(checkFreePairingStatus, 60000);  
});

setInterval(checkAdminAccess, 5 * 60 * 1000);

// ===== THEME FUNCTIONS =====
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
    }
    
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
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        showToast('Theme changed to Light mode', 'success');
        updateThemeIcon('light');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Theme changed to Dark mode', 'success');
        updateThemeIcon('dark');
    }
}

// ===== CUSTOM MODAL FUNCTIONS =====
function showModal(title, message, confirmText = 'Confirm', confirmCallback = null, cancelCallback = null) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = message;
    elements.modalConfirm.textContent = confirmText;
    
    // Remove existing event listeners
    const newConfirmBtn = elements.modalConfirm.cloneNode(true);
    elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, elements.modalConfirm);
    elements.modalConfirm = newConfirmBtn;
    
    if (confirmCallback) {
        elements.modalConfirm.onclick = function() {
            confirmCallback();
            closeModal();
        };
    }
    
    // Add cancel button handler
    const modalCancel = document.querySelector('.modal-btn.secondary');
    if (modalCancel && cancelCallback) {
        modalCancel.onclick = function() {
            cancelCallback();
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
    elements.menuToggle.addEventListener('click', () => {
        elements.navOverlay.classList.toggle('active');
    });
    
    elements.closeNav.addEventListener('click', () => {
        elements.navOverlay.classList.remove('active');
    });
    
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            
            if (section === 'theme') {
                e.stopPropagation();
                toggleTheme();
                return;
            }
            
            if (section === 'admin') {
                return;
            }
            
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
        console.log('Received pairing code:', data);
        
        // Store user info for session tracking
        currentUserEmail = data.email;
        currentUserToken = data.token;
        currentUserNumber = data.userNumber;
        
        // Hide any loading states
        const getCodeBtn = document.getElementById('getPairingBtn');
        if (getCodeBtn) {
            hideLoader(getCodeBtn);
        }
        
        hidePairingSectionLoader();
        
        // Show the pairing code
        const code = data.pairingCode;
        showPairingCode(code);
    });
    
    socket.on('qr', (data) => {
        console.log('Received QR data:', data);
        
        // Store user info for session tracking
        currentUserEmail = data.email;
        currentUserToken = data.token;
        currentUserNumber = data.userNumber;
        
        // Hide any loading states
        const getCodeBtn = document.getElementById('getPairingBtn');
        if (getCodeBtn) {
            hideLoader(getCodeBtn);
        }
        
        hidePairingSectionLoader();
        
        // If we have a QR code, show it as pairing code
        if (data.qr) {
            const code = data.qr;
            showPairingCode(code);
        }
    });
    
    socket.on('connected', (data) => {
        console.log('Connected event received:', data);
        
        // Store user info
        if (data.email) currentUserEmail = data.email;
        if (data.token) currentUserToken = data.token;
        if (data.userNumber) currentUserNumber = data.userNumber;
        
        hidePairingSectionLoader();
        showConnected(data.userNumber);
    });
    
    socket.on('disconnected', (data) => {
        showToast('WhatsApp session disconnected', 'warning');
    });
    
    socket.on('error', (data) => {
        console.error('Socket error:', data);
        
        // Hide loading states
        const getCodeBtn = document.getElementById('getPairingBtn');
        if (getCodeBtn) {
            hideLoader(getCodeBtn);
        }
        
        hidePairingSectionLoader();
        
        // Show error message
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            showModal('Error', data.error, 'OK');
        }
    });
    
    socket.on('pairing-expired', (data) => {
        showToast('Pairing code expired. Generate a new one.', 'warning');
        hidePairingSectionLoader();
        resetPairingSection();
    });
    
    // Free pairing info
    socket.on('free-pairing-info', (data) => {
        console.log('Free pairing info:', data);
        if (data.isFreePeriod) {
            showToast('🎁 Free pairing period active!', 'success');
        }
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
        return data;
        
    } catch (error) {
        console.error('❌ Token validation error:', error);
        return { 
            valid: false, 
            message: 'Failed to validate token. Please try again.' 
        };
    }
}

function createNewSession(userNumber, email, token, deleteExisting = false) {
    if (deleteExisting) {
        // First delete existing session
        deleteUserSessionImmediately(userNumber, email, token, () => {
            // After deletion, create new session
            actuallyCreateNewSession(userNumber, email, token);
        });
    } else {
        actuallyCreateNewSession(userNumber, email, token);
    }
}

function actuallyCreateNewSession(userNumber, email, token) {
    // Show loading state
    showPairingSectionLoader('Creating new session...');
    
    // Emit to server to create session
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
    
    return cleanNumber;
}

function showPairingCode(code) {
    // Make sure pairing section is visible
    if (elements.pairingSection && elements.pairingSection.classList.contains('hidden')) {
        elements.pairingSection.classList.remove('hidden');
    }
    
    // Hide status section if it's visible
    if (elements.statusSection && !elements.statusSection.classList.contains('hidden')) {
        elements.statusSection.classList.add('hidden');
    }
    
    // Display the code
    elements.codeDisplay.innerHTML = `
        <div class="code-text">${code}</div>
        <button class="copy-btn" onclick="copyToClipboard('${code}')">
            <i class="fas fa-copy"></i> Copy Code
        </button>
    `;
    
    // Start countdown
    startCountdown(120);
    
    // Show success toast
    showToast('✅ Pairing code generated! Click "Copy Code" to copy it.', 'success');
    
    // Scroll to the pairing section
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
    
    const requestBtn = document.querySelector('.primary-btn[onclick*="requestToken"]') ||
                      document.querySelector('button:contains("Request Token")');
    
    if (requestBtn) {
        showLoader(requestBtn, 'Requesting...');
    }
    
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
        if (requestBtn) {
            hideLoader(requestBtn);
        }
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
        
        // Show loading state
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
                    <div class="session-card" id="session-card-${session.userNumber}">
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
                                <button class="btn-restore small" onclick="restoreSession('${session.userNumber}')" id="restore-btn-${session.userNumber}">
                                    <i class="fas fa-sync-alt"></i> <span class="btn-text">Restore</span>
                                </button>
                                <button class="btn-delete small" onclick="deleteUserSession('${session.userNumber}')" id="delete-btn-${session.userNumber}">
                                    <i class="fas fa-trash"></i> <span class="btn-text">Delete</span>
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
                <button class="primary-btn" onclick="loadUserSessions()">
                    <i class="fas fa-redo"></i> Retry
                </button>
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
    
    const restoreBtn = document.getElementById(`restore-btn-${userNumber}`);
    if (restoreBtn) {
        showLoader(restoreBtn, 'Restoring...');
    }
    
    try {
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
                
                // Switch to home section
                showSection('home');
                
                // Set the number in the form
                elements.codeNumber.value = userNumber;
                
                // Show loading in pairing section
                showPairingSectionLoader('Restoring session and generating pairing code...');
                
                if (elements.pairingSection && elements.pairingSection.classList.contains('hidden')) {
                    elements.pairingSection.classList.remove('hidden');
                }
                
                if (elements.statusSection && !elements.statusSection.classList.contains('hidden')) {
                    elements.statusSection.classList.add('hidden');
                }
                
                // Generate new pairing code after a short delay
                setTimeout(() => {
                    actuallyCreateNewSession(userNumber, currentUserEmail, currentUserToken);
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
    } finally {
        if (restoreBtn) {
            hideLoader(restoreBtn);
        }
    }
}

async function deleteUserSession(userNumber) {
    if (!currentUserEmail || !currentUserToken) {
        showToast('Authentication required', 'error');
        return;
    }
    
    showModal('Delete Session', 
        `Are you sure you want to delete session for ${userNumber}? This will disconnect WhatsApp and remove all session data.`,
        'Delete',
        () => {
            deleteUserSessionImmediately(userNumber, currentUserEmail, currentUserToken);
        },
        () => {
            // Cancel - do nothing
        }
    );
}

async function deleteUserSessionImmediately(userNumber, email, token, callback = null) {
    const deleteBtn = document.getElementById(`delete-btn-${userNumber}`);
    if (deleteBtn) {
        showLoader(deleteBtn, 'Deleting...');
    }
    
    try {
        const response = await fetch(`/api/delete-user-session`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                token: token,
                userNumber: userNumber
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast('✅ Session deleted successfully', 'success');
            
            // Remove the session card from UI
            const sessionCard = document.getElementById(`session-card-${userNumber}`);
            if (sessionCard) {
                sessionCard.style.opacity = '0.5';
                setTimeout(() => {
                    sessionCard.remove();
                    // If no sessions left, reload the list
                    if (document.querySelectorAll('.session-card').length === 0) {
                        loadUserSessions();
                    }
                }, 500);
            }
            
            // Emit disconnect event
            socket.emit('disconnect-session', {
                userNumber: userNumber,
                email: email,
                token: token
            });
            
            if (callback) {
                callback();
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete session');
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        showToast('❌ Failed to delete session: ' + error.message, 'error');
    } finally {
        if (deleteBtn) {
            hideLoader(deleteBtn);
        }
    }
}

function generateNewCode() {
    if (!currentUserNumber || !currentUserEmail || !currentUserToken) {
        showToast('Please enter your details first', 'error');
        return;
    }
    
    const getCodeBtn = document.querySelector('.primary-btn[onclick*="generateNewCode"]') || 
                      document.querySelector('.secondary-btn.small-btn[onclick*="generateNewCode"]');
    
    if (getCodeBtn) {
        showLoader(getCodeBtn, 'Generating...');
    }
    
    showPairingSectionLoader('Generating new pairing code...');
    
    setTimeout(() => {
        createNewSession(currentUserNumber, currentUserEmail, currentUserToken, true);
        if (getCodeBtn) {
            hideLoader(getCodeBtn);
        }
    }, 100);
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
        } else {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
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