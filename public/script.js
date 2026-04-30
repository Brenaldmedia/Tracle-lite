console.log('Tracle-Lite Frontend Loading...');

const IS_HEROKU = window.location.hostname.includes('herokuapp.com');
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const CURRENT_ORIGIN = window.location.origin;
const CURRENT_HOSTNAME = window.location.hostname;
const CURRENT_PROTOCOL = window.location.protocol;

let BACKEND_URL, WEB_SOCKET_URL, API_BASE_URL;

BACKEND_URL = CURRENT_ORIGIN;
WEB_SOCKET_URL = CURRENT_PROTOCOL === 'https:' ? `wss://${CURRENT_HOSTNAME}` : `ws://${CURRENT_HOSTNAME}`;
API_BASE_URL = BACKEND_URL;

let socket = null;
let countdownInterval;
let currentUserNumber = null;
let currentUserEmail = null;
let modalCountdownInterval = null;

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
    statusSection: document.getElementById('statusSection'),
    connectedNumber: document.getElementById('connectedNumber'),
    registerEmail: document.getElementById('registerEmail'),
    codeEmail: document.getElementById('codeEmail'),
    codeNumber: document.getElementById('codeNumber'),
    emailValidationResult: document.getElementById('emailValidationResult'),
    sessionsList: document.getElementById('sessionsList'),
    customModal: document.getElementById('customModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalConfirm: document.getElementById('modalConfirm'),
    themeToggleBtn: document.querySelector('.nav-item[data-section="theme"]'),
    adminApplicationSection: document.getElementById('adminApplicationSection'),
    adminApplicationModal: document.getElementById('adminApplicationModal'),
    adminName: document.getElementById('adminName'),
    adminPhone: document.getElementById('adminPhone'),
    adminEmail: document.getElementById('adminEmail'),
    adminCountry: document.getElementById('adminCountry'),
    adminReason: document.getElementById('adminReason'),
    submitApplicationBtn: document.getElementById('submitApplicationBtn'),
    charCount: document.getElementById('charCount')
};

async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            showToast('Network error. Please check your connection.', 'error');
        } else if (error.message.includes('HTTP')) {
            showToast('Server error. Please try again later.', 'error');
        } else {
            showToast('Connection error. Please try again.', 'error');
        }
        throw error;
    }
}

function showLoader(button, text = 'Processing...') {
    if (!button) return;
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    const spinner = document.createElement('i');
    spinner.className = 'fas fa-spinner fa-spin';
    button.innerHTML = '';
    button.appendChild(spinner);
    const textSpan = document.createElement('span');
    textSpan.className = 'btn-text';
    textSpan.textContent = ` ${text}`;
    button.appendChild(textSpan);
    button.classList.add('btn-loading');
}

function hideLoader(button) {
    if (!button || !button.dataset.originalHtml) return;
    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml;
    button.classList.remove('btn-loading');
    delete button.dataset.originalHtml;
}

function showPairingModalLoader() {
    const display = document.getElementById('pairingCodeDisplay');
    if (display) {
        display.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>Generating pairing code...</span></div>`;
    }
}

function showPairingCodeInModal(code) {
    const display = document.getElementById('pairingCodeDisplay');
    if (display) {
        display.innerHTML = `
            <div class="code-large">${code}</div>
            <button class="copy-code-btn" onclick="copyPairingCode()">
                <i class="fas fa-copy"></i> Copy Code
            </button>
        `;
    }
    startModalCountdown(120);
}

function startModalCountdown(seconds) {
    if (modalCountdownInterval) clearInterval(modalCountdownInterval);
    let timeLeft = seconds;
    const countdownElement = document.getElementById('modalCountdown');
    if (!countdownElement) return;
    
    const updateDisplay = () => {
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        countdownElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
    };
    
    updateDisplay();
    
    modalCountdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(modalCountdownInterval);
            modalCountdownInterval = null;
            countdownElement.textContent = 'Expired';
            const modal = document.getElementById('pairingCodeModal');
            if (modal && !modal.classList.contains('hidden')) {
                closePairingModal();
                showToast('Pairing code expired. Please generate a new code.', 'warning');
            }
        } else {
            updateDisplay();
        }
    }, 1000);
}

function stopModalCountdown() {
    if (modalCountdownInterval) {
        clearInterval(modalCountdownInterval);
        modalCountdownInterval = null;
    }
}

function openPairingModal() {
    const modal = document.getElementById('pairingCodeModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closePairingModal() {
    const modal = document.getElementById('pairingCodeModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        stopModalCountdown();
    }
}

function copyPairingCode() {
    const codeElement = document.querySelector('#pairingCodeDisplay .code-large');
    if (codeElement) {
        const code = codeElement.textContent;
        navigator.clipboard.writeText(code).then(() => {
            showToast('Pairing code copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy code', 'error');
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initSocket();
    initEventListeners();
    checkSavedEmail();
    checkThemePreference();
    checkAdminAccess();
    initAdminApplication();
    initCountrySuggestions();
});

setInterval(checkAdminAccess, 5 * 60 * 1000);

function initCountrySuggestions() {
    const countryInput = document.getElementById('adminCountry');
    if (!countryInput) return;
    const commonCountries = ['Nigeria', 'Ghana', 'United States', 'United Kingdom', 'Canada', 'India', 'South Africa', 'Kenya', 'Australia', 'Germany', 'France', 'Brazil', 'Mexico', 'Japan', 'China'];
    let suggestionsContainer;
    countryInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (!value || value.length < 2) { hideSuggestions(); return; }
        const filtered = commonCountries.filter(country => country.toLowerCase().includes(value));
        showSuggestions(filtered);
    });
    countryInput.addEventListener('blur', function() { setTimeout(hideSuggestions, 200); });
    countryInput.addEventListener('focus', function() {
        const value = this.value.toLowerCase();
        if (value && value.length >= 2) {
            const filtered = commonCountries.filter(country => country.toLowerCase().includes(value));
            if (filtered.length > 0) showSuggestions(filtered);
        }
    });
    function showSuggestions(countries) {
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'country-suggestions';
            countryInput.parentNode.appendChild(suggestionsContainer);
        }
        if (countries.length === 0) { hideSuggestions(); return; }
        suggestionsContainer.innerHTML = countries.map(country => `<div class="country-suggestion" data-country="${country}">${country}</div>`).join('');
        suggestionsContainer.style.display = 'block';
        suggestionsContainer.querySelectorAll('.country-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', function() {
                countryInput.value = this.dataset.country;
                hideSuggestions();
            });
        });
    }
    function hideSuggestions() { if (suggestionsContainer) suggestionsContainer.style.display = 'none'; }
}

function validateCountry(country) {
    if (!country || country.trim().length < 2 || country.trim().length > 50) return false;
    const countryRegex = /^[a-zA-Z\s\-']+$/;
    return countryRegex.test(country);
}

function initAdminApplication() {
    if (elements.adminReason) {
        updateWordCount();
        elements.adminReason.addEventListener('input', function() { updateWordCount(); });
        elements.adminReason.addEventListener('paste', function(e) {
            setTimeout(() => {
                updateWordCount();
                const text = this.value.trim();
                const words = text.split(/\s+/).filter(word => word.length > 0);
                if (words.length > 100) {
                    const limitedText = words.slice(0, 100).join(' ');
                    this.value = limitedText;
                    showToast('Text truncated to 100 words maximum', 'warning');
                    updateWordCount();
                }
            }, 0);
        });
    }
    function updateWordCount() {
        const text = elements.adminReason.value.trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        if (elements.charCount) {
            elements.charCount.textContent = `${wordCount} / 100 words`;
            if (wordCount > 100) elements.charCount.style.color = 'var(--accent-danger)';
            else if (wordCount >= 80) elements.charCount.style.color = 'var(--accent-warning)';
            else if (wordCount >= 1) elements.charCount.style.color = 'var(--accent-success)';
            else elements.charCount.style.color = 'var(--text-secondary)';
            if (wordCount >= 100 && words.length > 100) {
                const limitedText = words.slice(0, 100).join(' ');
                elements.adminReason.value = limitedText;
                setTimeout(() => updateWordCount(), 0);
                showToast('Maximum 100 words reached', 'warning');
            }
        }
    }
}

async function submitAdminApplication() {
    const name = elements.adminName.value.trim();
    const phone = elements.adminPhone.value.trim();
    const email = elements.adminEmail.value.trim();
    const country = elements.adminCountry.value.trim();
    const reason = elements.adminReason.value.trim();
    if (!name || !phone || !email || !country || !reason) {
        showModal('Missing Information', 'Please fill in all required fields.', 'OK');
        return;
    }
    const words = reason.split(/\s+/).filter(word => word.length > 0);
    if (words.length > 100) {
        showModal('Too Many Words', `Please limit your reason to maximum 100 words. Current: ${words.length} words`, 'OK');
        return;
    }
    if (!validateCountry(country)) {
        showModal('Invalid Country', 'Please enter a valid country name.', 'OK');
        return;
    }
    if (!validateEmail(email)) {
        showModal('Invalid Email', 'Please enter a valid email address.', 'OK');
        return;
    }
    const submitBtn = elements.submitApplicationBtn;
    if (submitBtn) showLoader(submitBtn, 'Submitting...');
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/submit-admin-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, country, reason, wordCount: words.length, timestamp: new Date().toISOString() })
        });
        if (response.success) {
            if (elements.adminName) elements.adminName.value = '';
            if (elements.adminPhone) elements.adminPhone.value = '';
            if (elements.adminEmail) elements.adminEmail.value = '';
            if (elements.adminCountry) elements.adminCountry.value = '';
            if (elements.adminReason) elements.adminReason.value = '';
            if (elements.charCount) {
                elements.charCount.textContent = '0 words';
                elements.charCount.style.color = 'var(--accent-success)';
            }
            showAdminApplicationSuccess(email, name);
            showToast('Application submitted successfully', 'success');
        } else {
            showModal('Submission Failed', response.message || 'Failed to submit application.', 'OK');
        }
    } catch (error) {
        showModal('Submission Error', 'Failed to submit application. Please try again.', 'OK');
    } finally {
        if (submitBtn) hideLoader(submitBtn);
    }
}

function showAdminApplicationSuccess(email, name) {
    const section = document.getElementById('adminApplicationSection');
    if (!section) return;
    section.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-check-circle"></i> Application Submitted!</h2>
            <p>Your admin application has been received</p>
        </div>
        <div class="token-card">
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: var(--accent-success); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px; color: var(--text-primary);">Application Submitted Successfully!</h3>
                <p style="color: var(--text-secondary); margin-bottom: 15px;">Your admin application has been received and is under review.</p>
                <p style="color: var(--text-secondary); margin-bottom: 15px;"><strong>Please contact the Tracle-Lite admin to complete your application:</strong></p>
                <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); margin: 20px 0;">
                    <p style="margin-bottom: 10px;"><i class="fas fa-info-circle"></i> <strong>Contact Admin:</strong></p>
                    <p style="margin-bottom: 8px;"><i class="fas fa-envelope"></i> <strong>Email:</strong> <a href="mailto:brenaldmedia@gmail.com">brenaldmedia@gmail.com</a></p>
                    <p style="margin-bottom: 8px;"><i class="fab fa-whatsapp"></i> <strong>WhatsApp:</strong> +234 815 022 1529</p>
                    <p style="margin-bottom: 8px;"><i class="fab fa-telegram"></i> <strong>Telegram:</strong> @Brenaldmedia</p>
                </div>
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="primary-btn" onclick="showSection('home')" style="margin-right: 10px;">
                        <i class="fas fa-home"></i> Return to Dashboard
                    </button>
                    <button class="secondary-btn" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Submit Another Application
                    </button>
                </div>
            </div>
        </div>
    `;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') document.body.classList.remove('dark-theme');
    else document.body.classList.add('dark-theme');
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
        updateThemeIcon('light');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
    }
}

function showModal(title, message, confirmText = 'Confirm', confirmCallback = null, cancelCallback = null) {
    if (!elements.modalTitle || !elements.modalBody || !elements.modalConfirm) return;
    elements.modalTitle.textContent = title;
    if (message.includes('<') && message.includes('>')) elements.modalBody.innerHTML = message;
    else elements.modalBody.innerHTML = `<p>${message}</p>`;
    elements.modalConfirm.textContent = confirmText;
    const newConfirmBtn = elements.modalConfirm.cloneNode(true);
    elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, elements.modalConfirm);
    elements.modalConfirm = newConfirmBtn;
    if (confirmCallback) elements.modalConfirm.onclick = function() { confirmCallback(); closeModal(); };
    else elements.modalConfirm.onclick = closeModal;
    const modalCancel = document.querySelector('.modal-btn.secondary');
    if (modalCancel && cancelCallback) modalCancel.onclick = function() { cancelCallback(); closeModal(); };
    else if (modalCancel) modalCancel.onclick = closeModal;
    elements.customModal.classList.remove('hidden');
}

function closeModal() {
    elements.customModal.classList.add('hidden');
    elements.modalConfirm.onclick = null;
}

function closeAdminApplicationModal() {
    const modal = document.getElementById('adminApplicationModal');
    if (modal) modal.classList.add('hidden');
}

function initNavigation() {
    elements.menuToggle.addEventListener('click', () => { elements.navOverlay.classList.toggle('active'); });
    elements.closeNav.addEventListener('click', () => { elements.navOverlay.classList.remove('active'); });
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (section === 'theme') { e.stopPropagation(); toggleTheme(); return; }
            if (item.getAttribute('onclick') && item.getAttribute('onclick').includes('admin.html')) return;
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            showSection(section);
            if (window.innerWidth <= 768) elements.navOverlay.classList.remove('active');
        });
    });
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const section = btn.dataset.section;
            if (section) {
                elements.navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
                showSection(section);
            }
        });
    });
}

function showSection(section) {
    elements.contentSections.forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const headerTitle = document.querySelector('.header-title h1');
    const headerSubtitle = document.querySelector('.header-title p');
    if (!headerTitle || !headerSubtitle) return;
    switch(section) {
        case 'home': headerTitle.textContent = 'Dashboard'; headerSubtitle.textContent = 'Welcome to Tracle-Lite'; break;
        case 'register': headerTitle.textContent = 'Register'; headerSubtitle.textContent = 'Register your account for FREE'; break;
        case 'features': headerTitle.textContent = 'Features'; headerSubtitle.textContent = 'Explore bot commands'; break;
        case 'sessions': headerTitle.textContent = 'My Sessions'; headerSubtitle.textContent = 'Manage connected devices'; loadUserSessions(); break;
        case 'adminApplication': headerTitle.textContent = 'Become Admin'; headerSubtitle.textContent = 'Apply to be an administrator'; break;
        default: headerTitle.textContent = 'Dashboard'; headerSubtitle.textContent = 'Welcome to Tracle-Lite';
    }
}

function initSocket() {
    const socketUrl = CURRENT_ORIGIN;
    if (socket && socket.connected) socket.disconnect();
    socket = io(socketUrl, {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 30000,
        forceNew: true,
        autoConnect: true
    });
    socket.on('connect', () => {});
    socket.on('connect_error', () => {});
    socket.on('active-users-update', (data) => {
        if (elements.activeUsersCount) elements.activeUsersCount.textContent = data.count;
        if (elements.liveUsers) elements.liveUsers.textContent = data.count;
    });
      socket.on('pairing-code', (data) => {
        console.log('🔑 Pairing code received:', data);
        console.log('📧 Data email:', data.email);
        console.log('👤 Current user email:', currentUserEmail);
        
        if (data.email !== currentUserEmail) {
            console.log('❌ Email mismatch, ignoring');
            return;
        }
        
        console.log('✅ Email matches, showing modal');
        currentUserNumber = data.userNumber;
        showPairingCodeInModal(data.pairingCode);
        openPairingModal();
    });
    socket.on('connected', (data) => {
        if (data.email !== currentUserEmail) return;
        closePairingModal();
        showConnected(data.userNumber);
    });
    socket.on('disconnected', (data) => {
        if (data.email !== currentUserEmail) return;
    });
    socket.on('error', (data) => {
        if (data.email !== currentUserEmail) return;
        closePairingModal();
        showModal('Error', data.error, 'OK');
    });
    socket.on('pairing-expired', (data) => {
        if (data.email !== currentUserEmail) return;
        closePairingModal();
        showToast('Pairing code expired. Please generate a new code.', 'warning');
    });
    socket.on('qr', (data) => {
        if (data.email !== currentUserEmail) return;
        if (data.qr) {
            currentUserNumber = data.userNumber;
            showPairingCodeInModal(data.qr);
            openPairingModal();
        }
    });
}

function checkSavedEmail() {
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
        currentUserEmail = savedEmail;
        if (elements.userEmail) elements.userEmail.textContent = savedEmail;
        if (elements.userStatus) elements.userStatus.textContent = 'Registered user';
        if (elements.codeEmail) elements.codeEmail.value = savedEmail;
    }
}

function saveUserEmail(email) {
    localStorage.setItem('user_email', email);
    currentUserEmail = email;
    if (elements.userEmail) elements.userEmail.textContent = email;
    if (elements.userStatus) elements.userStatus.textContent = 'Registered user';
    if (elements.codeEmail) elements.codeEmail.value = email;
}

async function getPairingCode() {
    const email = elements.codeEmail.value.trim();
    const number = elements.codeNumber.value.trim();
    if (!email || !number) {
        showModal('Missing Information', 'Please fill in all fields.', 'OK');
        return;
    }
    const validatedNumber = validateWhatsAppNumber(number);
    if (!validatedNumber) {
        showModal('Invalid Number', 'Please enter a valid WhatsApp number with country code.', 'OK');
        return;
    }
    const getCodeBtn = document.querySelector('.primary-btn[onclick*="getPairingCode"]');
    if (getCodeBtn) showLoader(getCodeBtn, 'Getting Code...');
    try {
        saveUserEmail(email);
        showPairingModalLoader();
        const sessionCheckResponse = await safeFetch(`${API_BASE_URL}/api/user/check-session-exists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userNumber: validatedNumber })
        });
        if (sessionCheckResponse.sessionExists) {
            hideLoader(getCodeBtn);
            showModal('Session Found', `A session already exists for ${validatedNumber}. Do you want to generate a new code?`, 'Generate New Code', () => {
                createNewSession(validatedNumber, email, true);
            });
        } else {
            createNewSession(validatedNumber, email, false);
        }
    } catch (error) {
        hideLoader(getCodeBtn);
        closePairingModal();
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
    }
}

function createNewSession(userNumber, email, deleteExisting = false) {
    if (deleteExisting) {
        deleteUserSessionImmediately(userNumber, email, () => { actuallyCreateNewSession(userNumber, email); });
    } else {
        actuallyCreateNewSession(userNumber, email);
    }
}

function actuallyCreateNewSession(userNumber, email) {
    socket.emit('create-session', { userNumber, email });
}

function validateWhatsAppNumber(number) {
    const cleanNumber = number.replace(/\D/g, '');
    if (!/^\d+$/.test(cleanNumber)) return false;
    if (cleanNumber.length < 10 || cleanNumber.length > 15) return false;
    return cleanNumber;
}

function showConnected(userNumber) {
    if (elements.statusSection) elements.statusSection.classList.remove('hidden');
    if (userNumber && elements.connectedNumber) elements.connectedNumber.textContent = formatPhoneNumber(userNumber);
}

function resetConnection() {
    if (elements.statusSection) elements.statusSection.classList.add('hidden');
    if (elements.codeNumber) elements.codeNumber.value = '';
    showSection('home');
}

function startCountdown(seconds) {
    let timeLeft = seconds;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            stopCountdown();
        }
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

async function registerUser() {
    const email = elements.registerEmail.value.trim();
    if (!email) { showModal('Email Required', 'Please enter your email address.', 'OK'); return; }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) { showModal('Invalid Email', 'Please enter a valid email address.', 'OK'); return; }
    const registerBtn = document.querySelector('.primary-btn[onclick*="registerUser"]');
    if (registerBtn) showLoader(registerBtn, 'Registering...');
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (response.success) {
            saveUserEmail(email);
            showModal('Registration Successful', `Your email ${email} has been registered successfully. You can now use Tracle-Lite for FREE!`, 'Get Started', () => { showSection('home'); });
        } else {
            showModal('Registration Failed', response.message || 'Failed to register.', 'OK');
        }
    } catch (error) {
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
    } finally {
        if (registerBtn) hideLoader(registerBtn);
    }
}

async function loadUserSessions() {
    try {
        if (!currentUserEmail) {
            if (elements.sessionsList) {
                elements.sessionsList.innerHTML = `<div class="no-sessions"><i class="fas fa-user"></i><h4>Authentication Required</h4><p>Please register first.</p><button class="primary-btn" onclick="showSection('register')"><i class="fas fa-user-plus"></i> Register Now</button></div>`;
            }
            return;
        }
        if (elements.sessionsList) { elements.sessionsList.innerHTML = `<div class="loading-sessions"><i class="fas fa-spinner fa-spin"></i><span>Loading...</span></div>`; }
        const response = await safeFetch(`${API_BASE_URL}/api/user/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUserEmail })
        });
        if (response.success && response.sessions && response.sessions.length > 0) {
            if (elements.sessionsList) {
                let sessionsHTML = '<div class="sessions-grid">';
                response.sessions.forEach(session => {
                    sessionsHTML += `<div class="session-card" id="session-card-${session.userNumber}"><div class="session-header"><i class="fas fa-phone"></i><h4>${session.userNumber}</h4><span class="session-status ${session.isConnected ? 'connected' : 'disconnected'}">${session.isConnected ? 'Connected' : 'Disconnected'}</span></div><div class="session-body"><p><strong>Registered:</strong> ${session.registered ? 'Yes' : 'No'}</p><p><strong>Last Active:</strong> ${session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'Never'}</p><div class="session-actions"><button class="btn-restore small" onclick="restoreSession('${session.userNumber}')" id="restore-btn-${session.userNumber}"><i class="fas fa-sync-alt"></i> <span class="btn-text">Restore</span></button><button class="btn-delete small" onclick="deleteUserSession('${session.userNumber}')" id="delete-btn-${session.userNumber}"><i class="fas fa-trash"></i> <span class="btn-text">Delete</span></button></div></div></div>`;
                });
                sessionsHTML += '</div>';
                elements.sessionsList.innerHTML = sessionsHTML;
            }
        } else {
            if (elements.sessionsList) {
                elements.sessionsList.innerHTML = `<div class="no-sessions"><i class="fas fa-link-slash"></i><h4>No Active Sessions</h4><p>Connect your WhatsApp to get started.</p><button class="primary-btn" onclick="showSection('home')"><i class="fas fa-plus"></i> Connect Device</button></div>`;
            }
        }
    } catch (error) {
        if (elements.sessionsList) {
            elements.sessionsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><h4>Error Loading Sessions</h4><button class="primary-btn" onclick="loadUserSessions()"><i class="fas fa-redo"></i> Retry</button></div>`;
        }
    }
}

async function restoreSession(userNumber) {
    if (!currentUserEmail) return;
    const restoreBtn = document.getElementById(`restore-btn-${userNumber}`);
    if (restoreBtn) showLoader(restoreBtn, 'Restoring...');
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/user/restore-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUserEmail, userNumber })
        });
        if (response.success) {
            showSection('home');
            if (elements.codeNumber) elements.codeNumber.value = userNumber;
            showPairingModalLoader();
            setTimeout(() => { actuallyCreateNewSession(userNumber, currentUserEmail); }, 1000);
        }
    } catch (error) {}
    finally { if (restoreBtn) hideLoader(restoreBtn); }
}

async function deleteUserSession(userNumber) {
    if (!currentUserEmail) return;
    showModal('Delete Session', `Are you sure you want to delete session for ${userNumber}?`, 'Delete', () => { deleteUserSessionImmediately(userNumber, currentUserEmail); });
}

async function deleteUserSessionImmediately(userNumber, email, callback = null) {
    const deleteBtn = document.getElementById(`delete-btn-${userNumber}`);
    if (deleteBtn) showLoader(deleteBtn, 'Deleting...');
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/user/session`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userNumber })
        });
        if (response.success) {
            const sessionCard = document.getElementById(`session-card-${userNumber}`);
            if (sessionCard) { sessionCard.style.opacity = '0.5'; setTimeout(() => { sessionCard.remove(); if (document.querySelectorAll('.session-card').length === 0) loadUserSessions(); }, 500); }
            socket.emit('disconnect-session', { userNumber, email });
            if (callback) callback();
        }
    } catch (error) {}
    finally { if (deleteBtn) hideLoader(deleteBtn); }
}

function generateNewCode() {
    const email = currentUserEmail || elements.codeEmail?.value.trim();
    const number = currentUserNumber || elements.codeNumber?.value.trim();
    
    if (!email || !number) { 
        showModal('Error', 'Please enter your email and WhatsApp number first', 'OK'); 
        return; 
    }
    
    showPairingModalLoader();
    createNewSession(number, email, true);
}
function checkAdminAccess() {
    const adminToken = localStorage.getItem('admin_token');
    const adminTokenTime = localStorage.getItem('admin_token_time');
    if (adminToken && adminTokenTime) {
        const currentTime = Date.now();
        const tokenAge = currentTime - parseInt(adminTokenTime);
        if (tokenAge < 24 * 60 * 60 * 1000) {
            const adminNavItem = document.querySelector('.nav-item[onclick*="admin.html"]');
            if (adminNavItem) {
                adminNavItem.innerHTML = `<i class="fas fa-lock"></i><span>Admin Dashboard</span><span style="margin-left: auto; font-size: 10px; background: var(--accent-success); color: white; padding: 2px 6px; border-radius: 10px;">Active</span>`;
                adminNavItem.style.color = 'var(--accent-success)';
            }
        } else {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_token_time');
        }
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => { showToast('Copied!', 'success'); }).catch(() => { showToast('Failed to copy', 'error'); });
}

function formatPhoneNumber(number) { return `+${number}`; }

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
}

function initEventListeners() {
    if (elements.registerEmail) elements.registerEmail.addEventListener('keypress', (e) => { if (e.key === 'Enter') registerUser(); });
    if (elements.codeEmail) elements.codeEmail.addEventListener('keypress', (e) => { if (e.key === 'Enter') getPairingCode(); });
    if (elements.codeNumber) elements.codeNumber.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
    if (elements.adminPhone) elements.adminPhone.addEventListener('input', function(e) { this.value = this.value.replace(/\D/g, ''); });
    if (elements.adminCountry) {
        elements.adminCountry.addEventListener('input', function(e) { if (this.value.trim() && !validateCountry(this.value)) this.style.borderColor = 'var(--accent-danger)'; else this.style.borderColor = ''; });
        elements.adminCountry.addEventListener('blur', function(e) { if (this.value.trim() && !validateCountry(this.value)) { this.focus(); } });
    }
}

window.getPairingCode = getPairingCode;
window.createNewSession = createNewSession;
window.generateNewCode = generateNewCode;
window.showSection = showSection;
window.registerUser = registerUser;
window.copyToClipboard = copyToClipboard;
window.loadUserSessions = loadUserSessions;
window.restoreSession = restoreSession;
window.deleteUserSession = deleteUserSession;
window.toggleTheme = toggleTheme;
window.closeModal = closeModal;
window.showModal = showModal;
window.checkAdminAccess = checkAdminAccess;
window.submitAdminApplication = submitAdminApplication;
window.closeAdminApplicationModal = closeAdminApplicationModal;
window.resetConnection = resetConnection;
window.closePairingModal = closePairingModal;
window.copyPairingCode = copyPairingCode;