// ===== GLOBAL VARIABLES =====
const socket = io();
let countdownInterval;
let currentUserNumber = null;
let currentQuestionId = null;
let currentUserToken = null;
let currentUserEmail = null;
let currentCodeCountdown = null;
let codeCountdownInterval = null;

// ===== DOM ELEMENTS =====
const elements = {
    // Navigation
    navOverlay: document.getElementById('navOverlay'),
    menuToggle: document.getElementById('menuToggle'),
    closeNav: document.getElementById('closeNav'),
    
    // User info
    userEmail: document.getElementById('userEmail'),
    userStatus: document.getElementById('userStatus'),
    
    // Active users
    activeUsersCount: document.getElementById('activeUsersCount'),
    liveUsers: document.getElementById('liveUsers'),
    
    // Sections
    navItems: document.querySelectorAll('.nav-item'),
    contentSections: document.querySelectorAll('.content-section'),
    
    // Connection
    pairingSection: document.getElementById('pairingSection'),
    statusSection: document.getElementById('statusSection'),
    codeDisplay: document.getElementById('codeDisplay'),
    countdown: document.getElementById('countdown'),
    connectedNumber: document.getElementById('connectedNumber'),
    
    // Token Request Section
    emailInput: document.getElementById('emailInput'),
    requestTokenBtn: document.getElementById('requestTokenBtn'),
    tokenResult: document.getElementById('tokenResult'),
    
    // Quiz
    quizQuestion: document.getElementById('quizQuestion'),
    quizOptions: document.getElementById('quizOptions'),
    quizResult: document.getElementById('quizResult'),
    
    // Code Section (for getting bot code)
    codeEmail: document.getElementById('codeEmail'),
    codeTokenInput: document.getElementById('codeTokenInput'),
    codeNumber: document.getElementById('codeNumber'),
    tokenValidationResult: document.getElementById('tokenValidationResult'),
    
    // Sessions
    sessionsList: document.getElementById('sessionsList'),
    
    // Modal
    customModal: document.getElementById('customModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalConfirm: document.getElementById('modalConfirm')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSocket();
    initEventListeners();
    
    // Load initial quiz if needed
    loadQuiz();
    
    // Check for saved token
    checkSavedToken();
    
    // Check theme preference
    checkThemePreference();
    
    // Check admin access on page load
    checkAdminAccess();
});

// Also add this function to refresh admin status periodically
setInterval(checkAdminAccess, 5 * 60 * 1000); // Check every 5 minutes

// ===== THEME FUNCTIONS =====
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    // Toggle between light/dark mode only
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        showToast('Theme changed to Light mode', 'success');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Theme changed to Dark mode', 'success');
    }
}

// ===== CUSTOM MODAL FUNCTIONS =====
function showModal(title, message, confirmText = 'Confirm', confirmCallback = null) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = message;
    elements.modalConfirm.textContent = confirmText;
    
    // Store callback
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
    // Clear callback
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
    
    // Navigation item clicks
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Skip if it's the admin link (handled by onclick)
            if (item.querySelector('span')?.textContent === 'Admin Login') {
                return;
            }
            
            if (item.querySelector('span')?.textContent === 'Toggle Theme') {
                toggleTheme();
                return;
            }
            
            const section = item.dataset.section;
            
            // Remove active class from all items
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show corresponding section
            showSection(section);
            
            // Close menu on mobile
            if (window.innerWidth <= 768) {
                elements.navOverlay.classList.remove('active');
            }
        });
    });
    
    // Action buttons
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
    // Hide all sections
    elements.contentSections.forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        // Scroll to top of the section
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Update header title
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
        case 'quiz':
            headerTitle.textContent = 'Security Quiz';
            headerSubtitle.textContent = 'Answer a simple question';
            break;
        case 'features':
            headerTitle.textContent = 'Features';
            headerSubtitle.textContent = 'Explore premium features';
            break;
        case 'code':
            headerTitle.textContent = 'Get Code';
            headerSubtitle.textContent = 'Get WhatsApp pairing code';
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
        currentUserNumber = data.userNumber;
        const code = data.pairingCode;
        
        // Show pairing code in home section
        showPairingCode(code);
    });
    
    socket.on('connected', (data) => {
        showConnected(data.userNumber);
    });
    
    socket.on('disconnected', () => {
        showToast('WhatsApp session disconnected', 'warning');
    });
    
    socket.on('error', (data) => {
        showToast('Error: ' + data.error, 'error');
    });
}

// ===== TOKEN MANAGEMENT =====
function checkSavedToken() {
    const savedToken = localStorage.getItem('user_token');
    const savedEmail = localStorage.getItem('user_email');
    
    if (savedToken && savedEmail) {
        currentUserToken = savedToken;
        currentUserEmail = savedEmail;
        
        // Update UI
        elements.userEmail.textContent = savedEmail;
        elements.userStatus.textContent = 'Token: ' + savedToken.substring(0, 12) + '...';
        elements.userStatus.style.color = 'var(--accent-success)';
        
        // Pre-fill token inputs
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
    
    // Update UI
    elements.userEmail.textContent = email;
    elements.userStatus.textContent = 'Token: ' + token.substring(0, 12) + '...';
    elements.userStatus.style.color = 'var(--accent-success)';
    
    // Update token input fields
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

// ===== PAIRING CODE FUNCTIONS =====
function createSession() {
    // Get number from home section
    let number = elements.codeNumber?.value?.trim() || currentUserNumber;
    
    if (!number) {
        showModal('Missing Information', 'Please enter your WhatsApp number to generate pairing code.', 'OK');
        return;
    }
    
    const validatedNumber = validateWhatsAppNumber(number);
    if (!validatedNumber) {
        showModal('Invalid Number', 'Please enter a valid WhatsApp number format (e.g., 2349012345678)', 'OK');
        return;
    }
    
    // Show loading state in home section
    if (elements.pairingSection && !elements.pairingSection.classList.contains('hidden')) {
        elements.pairingSection.classList.remove('hidden');
        elements.codeDisplay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generating pairing code...</span>
            </div>
        `;
    }
    
    // Emit socket event to generate pairing code
    socket.emit('create-session', {
        userNumber: validatedNumber
    });
    
    // Start countdown
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
    
    if (cleanNumber.startsWith('0')) {
        return '234' + cleanNumber.substring(1);
    }
    
    if (cleanNumber.startsWith('234')) {
        return cleanNumber;
    }
    
    if (cleanNumber.length >= 10 && cleanNumber.length <= 12) {
        return '234' + cleanNumber;
    }
    
    return cleanNumber;
}

function showPairingCode(code) {
    // For home section
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
}

function showConnected(userNumber) {
    // For home section
    stopCountdown();
    elements.pairingSection.classList.add('hidden');
    elements.statusSection.classList.remove('hidden');
    
    if (userNumber) {
        elements.connectedNumber.textContent = formatPhoneNumber(userNumber);
    }
    
    showToast('✅ Successfully connected to WhatsApp!', 'success');
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

// ===== MAIN FUNCTION FOR START PROCESS BUTTON =====
async function verifyTokenAndStartQuiz() {
    const email = elements.codeEmail.value.trim();
    const token = elements.codeTokenInput.value.trim();
    const number = elements.codeNumber.value.trim();
    
    // Validation
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
        showModal('Invalid Number', 'Please enter a valid WhatsApp number format (e.g., 2349012345678)', 'OK');
        return;
    }
    
    // Show loading state
    const startBtn = document.querySelector('.primary-btn[onclick*="verifyTokenAndStartQuiz"]');
    const originalHtml = startBtn.innerHTML;
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    
    try {
        // Validate token with email
        const validationResult = await validateTokenForUser(email, token);
        
        if (validationResult.valid) {
            // Save token for this session
            saveUserToken(token, email);
            
            // Token is valid for this email, now show quiz
            await showQuizAfterTokenValidation();
            showToast('✅ Token verified successfully! Answer the quiz to get pairing code.', 'success');
            
        } else {
            // Show error
            showModal('Token Error', validationResult.message || 'Failed to verify token.', 'OK');
        }
    } catch (error) {
        console.error('Token verification error:', error);
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
    } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = originalHtml;
    }
}

async function showQuizAfterTokenValidation() {
    // Get the get-bot-code-section
    const getBotCodeSection = document.querySelector('.get-bot-code-section');
    
    // Create quiz HTML
    const quizHTML = `
        <div class="quiz-card" id="homeQuizContainer" style="margin-top: 20px;">
            <div class="quiz-header">
                <h4><i class="fas fa-brain"></i> Security Verification</h4>
                <p>Answer correctly to get your pairing code</p>
            </div>
            <div id="homeQuizContent">
                <div class="quiz-question" id="homeQuizQuestion"></div>
                <div class="quiz-options" id="homeQuizOptions"></div>
            </div>
            <div id="homeQuizResult" class="quiz-result"></div>
        </div>
    `;
    
    // Insert quiz after the get-bot-code-section
    getBotCodeSection.insertAdjacentHTML('afterend', quizHTML);
    
    // Load quiz question
    await loadHomeQuizQuestion();
}

async function loadHomeQuizQuestion() {
    try {
        const response = await fetch('/api/quiz');
        const data = await response.json();
        
        if (data.success) {
            currentQuestionId = data.questionId;
            
            document.getElementById('homeQuizQuestion').innerHTML = `
                <h4>${data.question}</h4>
                <p>Select the correct answer:</p>
            `;
            
            const optionsDiv = document.getElementById('homeQuizOptions');
            optionsDiv.innerHTML = '';
            data.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerHTML = `
                    <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                    <span>${option}</span>
                `;
                btn.onclick = () => submitHomeQuizAnswer(index);
                optionsDiv.appendChild(btn);
            });
            
            document.getElementById('homeQuizResult').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        showToast('Failed to load quiz', 'error');
    }
}

async function submitHomeQuizAnswer(answer) {
    try {
        const response = await fetch('/api/verify-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                questionId: currentQuestionId, 
                answer: answer 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.correct) {
                // Show success message
                document.getElementById('homeQuizResult').innerHTML = `
                    <div class="success-message">
                        <i class="fas fa-check-circle"></i>
                        <h4>Correct!</h4>
                        <p>${data.message}</p>
                    </div>
                `;
                document.getElementById('homeQuizResult').style.display = 'block';
                
                // Hide quiz, generate pairing code
                setTimeout(() => {
                    document.getElementById('homeQuizContainer').remove();
                    createSession();
                }, 1500);
                
            } else {
                document.getElementById('homeQuizResult').innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-times-circle"></i>
                        <h4>Incorrect</h4>
                        <p>${data.message} Try again.</p>
                    </div>
                `;
                document.getElementById('homeQuizResult').style.display = 'block';
                
                // Reload new question
                setTimeout(loadHomeQuizQuestion, 2000);
            }
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showToast('Failed to submit answer', 'error');
    }
}

// ===== TOKEN REQUEST FUNCTIONS =====
async function requestToken() {
    const email = elements.emailInput.value.trim();
    
    if (!email) {
        showModal('Email Required', 'Please enter your email address to request a token.', 'OK');
        return;
    }
    
    // Validate email format
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

// ===== QUIZ FUNCTIONS =====
async function loadQuiz() {
    try {
        const response = await fetch('/api/quiz');
        const data = await response.json();
        
        if (data.success) {
            currentQuestionId = data.questionId;
            
            elements.quizQuestion.innerHTML = `
                <h4>${data.question}</h4>
                <p>Select the correct answer:</p>
            `;
            
            elements.quizOptions.innerHTML = '';
            data.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerHTML = `
                    <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                    <span>${option}</span>
                `;
                btn.onclick = () => submitAnswer(index);
                elements.quizOptions.appendChild(btn);
            });
            
            elements.quizResult.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        showToast('Failed to load quiz', 'error');
    }
}

async function submitAnswer(answer) {
    try {
        const response = await fetch('/api/verify-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                questionId: currentQuestionId, 
                answer: answer 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.correct) {
                elements.quizResult.innerHTML = `
                    <div class="success-message">
                        <i class="fas fa-check-circle"></i>
                        <h4>Correct!</h4>
                        <p>${data.message}</p>
                    </div>
                `;
                elements.quizResult.style.display = 'block';
                showToast('Correct answer!', 'success');
                
            } else {
                elements.quizResult.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-times-circle"></i>
                        <h4>Incorrect</h4>
                        <p>${data.message} Try again.</p>
                    </div>
                `;
                elements.quizResult.style.display = 'block';
                showToast('Incorrect answer. Try again.', 'error');
                
                // Reload new question
                setTimeout(loadQuiz, 2000);
            }
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showToast('Failed to submit answer', 'error');
    }
}

// ===== SESSIONS MANAGEMENT =====
async function loadUserSessions() {
    try {
        elements.sessionsList.innerHTML = `
            <div class="loading-sessions">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading your sessions...</span>
            </div>
        `;
        
        const response = await fetch('/api/sessions');
        const data = await response.json();
        
        if (data.sessions && data.sessions.length > 0) {
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
                            <div class="session-actions">
                                <button class="btn-secondary small" onclick="deleteSession('${session.userNumber}')">
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

// ===== DELETE SESSION FUNCTION =====
async function deleteSession(userNumber) {
    try {
        showModal('Delete Session', 
            `Are you sure you want to delete session for ${userNumber}? This will disconnect WhatsApp and remove all session data.`,
            'Delete',
            async () => {
                try {
                    // Show loading
                    showToast('Deleting session...', 'info');
                    
                    // Call API to delete session
                    const response = await fetch(`/api/session/${userNumber}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        showToast('✅ Session deleted successfully', 'success');
                        
                        // Reload sessions list
                        loadUserSessions();
                        
                        // Emit socket event to disconnect
                        socket.emit('disconnect-session', userNumber);
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
    if (number.startsWith('234') && number.length === 13) {
        return `+${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 9)} ${number.substring(9)}`;
    }
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
    
    // Auto-remove toast after 5 seconds
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
    // Input enter key support
    elements.emailInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') requestToken();
    });
    
    elements.codeEmail?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyTokenAndStartQuiz();
    });
    
    // Auto-format phone input
    elements.codeNumber?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    // Token input validation
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
        socket.emit('disconnect-session', currentUserNumber);
    }
});

// Socket reconnection
socket.on('disconnect', () => {
    showToast('Connection lost. Reconnecting...', 'warning');
});

socket.on('reconnect', () => {
    showToast('Reconnected to server', 'success');
});

// Initialize
console.log('🚀 Tracle-Lite Pro Frontend Loaded');

// Export functions to window for onclick handlers
window.createSession = createSession;
window.showSection = showSection;
window.requestToken = requestToken;
window.verifyTokenAndStartQuiz = verifyTokenAndStartQuiz;
window.copyToClipboard = copyToClipboard;
window.submitAnswer = submitAnswer;
window.loadQuiz = loadQuiz;
window.loadUserSessions = loadUserSessions;
window.deleteSession = deleteSession;
window.toggleTheme = toggleTheme;
window.closeModal = closeModal;
window.showModal = showModal;
window.checkAdminAccess = checkAdminAccess;