// ===== CONNECTION CONFIGURATION FOR SINGLE DEPLOYMENT =====
console.log('🚀 Tracle-Lite V2 Frontend Loading...');

// Detect environment - FIXED
const IS_HEROKU = window.location.hostname.includes('herokuapp.com');
const IS_PTERODACTYL = window.location.hostname.includes('prexzyvilla.site') || 
                       window.location.hostname.includes('burzor');
const IS_LOCAL = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';

// Single deployment - backend and frontend on same server/port
const CURRENT_HOST = window.location.hostname;
const CURRENT_PORT = window.location.port || (window.location.protocol === 'https:' ? 443 : 80);
const PROTOCOL = window.location.protocol;

// Auto-detect configuration - FIXED FOR PTERODACTYL
let BACKEND_URL, WEB_SOCKET_URL, API_BASE_URL;

if (IS_HEROKU) {
    // Heroku - same origin
    BACKEND_URL = window.location.origin;  // Keep as herokuapp.com
    WEB_SOCKET_URL = window.location.origin.replace('http', 'ws'); // Keep as herokuapp.com
    console.log('🌐 Heroku deployment detected - Running full bot mode');
}

 else if (IS_PTERODACTYL) {
    // Pterodactyl - using port 2024
    BACKEND_URL = `${PROTOCOL}//${CURRENT_HOST}:2024`;
    WEB_SOCKET_URL = `${PROTOCOL === 'https:' ? 'wss:' : 'ws:'}//${CURRENT_HOST}:2024`;
    console.log('🌐 Pterodactyl deployment detected');
} else if (IS_LOCAL) {
    // Local development
    BACKEND_URL = `http://localhost:2024`;
    WEB_SOCKET_URL = `ws://localhost:2024`;
    console.log('🌐 Local development detected');
} else {
    // Fallback - use current origin with port 2024
    BACKEND_URL = `${PROTOCOL}//${CURRENT_HOST}:2024`;
    WEB_SOCKET_URL = `${PROTOCOL === 'https:' ? 'wss:' : 'ws:'}//${CURRENT_HOST}:2024`;
    console.log('🌐 Unknown environment, using default with port 2024');
}

// Always use backend URL for API
API_BASE_URL = BACKEND_URL;

console.log('🔗 Backend URL:', BACKEND_URL);
console.log('🔌 WebSocket URL:', WEB_SOCKET_URL);
console.log('📡 API Base URL:', API_BASE_URL);
console.log('📍 Current Origin:', window.location.origin);

// Keep only ONE copy of these functions:
function getApiBase() {
    return API_BASE_URL;
}

function getWebSocketURL() {
    return WEB_SOCKET_URL;
}

// Initialize socket - will be set in initSocket()
let socket = null;
let countdownInterval;
let currentUserNumber = null;
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
    // Admin Application Elements
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

// ===== INITIAL CONNECTION TEST =====
// ===== INITIAL CONNECTION TEST =====
async function testBackendConnection() {
  try {
    console.log('🔗 Testing backend connection from Heroku frontend...');
    
    const endpoints = [
      '/api/health',
      '/api/status',
      '/api/heroku-test',  // Changed from vercel-test to heroku-test
      '/api/test-connection'
    ];
    
    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          mode: 'cors' // Explicitly enable CORS
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Backend connected via ${endpoint}:`, data);
          
          // Show custom message for Heroku
          if (IS_HEROKU) {
            showToast('✅ Connected to Tracle-Lite V2 Backend', 'success');
          } else {
            showToast('✅ Connected to backend server', 'success');
          }
          
          success = true;
          break;
        }
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, error.message);
      }
    }
    
    if (!success) {
      if (IS_HEROKU) {
        showToast('⚠️ Cannot connect to backend. Please check if backend is running.', 'warning');
      } else {
        showToast('⚠️ Backend connection issues detected', 'warning');
      }
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    if (IS_HEROKU) {
      showToast('❌ Tracle-Lite V2 Backend is offline', 'error');
    } else {
      showToast('❌ Cannot connect to backend', 'error');
    }
    
    return false;
  }
}

// ===== ENHANCED ERROR HANDLING =====
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ Fetch error:', error);
        
        // Show user-friendly message
        if (error.message.includes('Failed to fetch')) {
            showToast('🌐 Network error: Cannot reach server', 'error');
        } else if (error.message.includes('HTTP')) {
            showToast(`Server error: ${error.message}`, 'error');
        } else {
            showToast('Connection error. Please check your network.', 'error');
        }
        
        throw error;
    }
}

// ===== LOADING STATE MANAGEMENT =====
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Tracle-Lite Frontend Loading...');
    
    // Test backend connection first
    await testBackendConnection();
    
    // Initialize everything else
    initNavigation();
    initSocket();
    setupSocketReconnection(); // Add this line
    initEventListeners();
    checkSavedEmail();
    checkThemePreference();
    checkAdminAccess();
    initAdminApplication();
    initCountrySuggestions();
    
    console.log('✅ Frontend initialized successfully');
});

setInterval(checkAdminAccess, 5 * 60 * 1000);

// ===== COUNTRY SUGGESTIONS =====
function initCountrySuggestions() {
    const countryInput = document.getElementById('adminCountry');
    if (!countryInput) return;
    
    const commonCountries = [
        'Nigeria', 'Ghana', 'United States', 'United Kingdom', 'Canada',
        'India', 'South Africa', 'Kenya', 'Australia', 'Germany',
        'France', 'Brazil', 'Mexico', 'Japan', 'China'
    ];
    
    let suggestionsContainer;
    
    countryInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        
        if (!value || value.length < 2) {
            hideSuggestions();
            return;
        }
        
        const filtered = commonCountries.filter(country => 
            country.toLowerCase().includes(value)
        );
        
        showSuggestions(filtered);
    });
    
    countryInput.addEventListener('blur', function() {
        setTimeout(hideSuggestions, 200);
    });
    
    countryInput.addEventListener('focus', function() {
        const value = this.value.toLowerCase();
        if (value && value.length >= 2) {
            const filtered = commonCountries.filter(country => 
                country.toLowerCase().includes(value)
            );
            if (filtered.length > 0) {
                showSuggestions(filtered);
            }
        }
    });
    
    function showSuggestions(countries) {
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'country-suggestions';
            countryInput.parentNode.appendChild(suggestionsContainer);
        }
        
        if (countries.length === 0) {
            hideSuggestions();
            return;
        }
        
        suggestionsContainer.innerHTML = countries.map(country => 
            `<div class="country-suggestion" data-country="${country}">${country}</div>`
        ).join('');
        
        suggestionsContainer.style.display = 'block';
        
        suggestionsContainer.querySelectorAll('.country-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', function() {
                countryInput.value = this.dataset.country;
                hideSuggestions();
            });
        });
    }
    
    function hideSuggestions() {
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
}

// ===== COUNTRY VALIDATION =====
function validateCountry(country) {
    if (!country || country.trim().length < 2 || country.trim().length > 50) {
        return false;
    }
    
    const countryRegex = /^[a-zA-Z\s\-']+$/;
    return countryRegex.test(country);
}

// ===== ENHANCED ADMIN APPLICATION FUNCTIONS =====
function initAdminApplication() {
    if (elements.adminReason) {
        // Set initial state
        updateWordCount();
        
        elements.adminReason.addEventListener('input', function() {
            updateWordCount();
        });
        
        elements.adminReason.addEventListener('paste', function(e) {
            // Allow paste to happen first
            setTimeout(() => {
                updateWordCount();
                
                // If after paste we exceed 100 words, truncate
                const text = this.value.trim();
                const words = text.split(/\s+/).filter(word => word.length > 0);
                
                if (words.length > 100) {
                    const limitedText = words.slice(0, 100).join(' ');
                    this.value = limitedText;
                    
                    showToast('⚠️ Pasted text was truncated to 100 words maximum', 'warning');
                    
                    // Update count again after truncation
                    updateWordCount();
                }
            }, 0);
        });
        
        // Add validation before form submission (optional)
        if (elements.adminForm) {
            elements.adminForm.addEventListener('submit', function(e) {
                const text = elements.adminReason.value.trim();
                const words = text.split(/\s+/).filter(word => word.length > 0);
                
                if (words.length > 100) {
                    e.preventDefault();
                    showToast('⚠️ Please reduce your text to 100 words or less', 'warning');
                    elements.adminReason.focus();
                }
            });
        }
    }
    
    function updateWordCount() {
        const text = elements.adminReason.value.trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        
        // Update character count display
        if (elements.charCount) {
            elements.charCount.textContent = `${wordCount} / 100 words`;
            
            // Color coding
            if (wordCount > 100) {
                elements.charCount.style.color = 'var(--accent-danger)';
            } else if (wordCount >= 80) {
                elements.charCount.style.color = 'var(--accent-warning)';
            } else if (wordCount >= 1) {
                elements.charCount.style.color = 'var(--accent-success)';
            } else {
                elements.charCount.style.color = 'var(--text-secondary)';
            }
            
            // Only prevent typing if we're at or over 100 words
            if (wordCount >= 100) {
                // Truncate if somehow we have more than 100 words
                if (words.length > 100) {
                    const limitedText = words.slice(0, 100).join(' ');
                    elements.adminReason.value = limitedText;
                    
                    // Update count again after truncation
                    setTimeout(() => updateWordCount(), 0);
                    
                    showToast('⚠️ Maximum 100 words reached', 'warning');
                }
            }
        }
    }
}

// ===== FIXED ADMIN APPLICATION SUBMISSION =====
async function submitAdminApplication() {
    const name = elements.adminName.value.trim();
    const phone = elements.adminPhone.value.trim();
    const email = elements.adminEmail.value.trim();
    const country = elements.adminCountry.value.trim();
    const reason = elements.adminReason.value.trim();

    // Validation
    if (!name || !phone || !email || !country || !reason) {
        showModal('Missing Information', 'Please fill in all required fields.', 'OK');
        return;
    }

    // Word count validation (DO NOT TOUCH THIS PART - keeping as is)
    const words = reason.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length > 100) {
        showModal('Too Many Words', 
            `Please limit your reason to maximum 100 words.<br><br>
            <strong>Current word count: ${words.length} words</strong><br>
            <span style="color: var(--accent-warning);">Maximum allowed: 100 words<br>
            Please reduce by ${words.length - 100} words.</span>`, 
            'OK');
        return;
    }
    
    // Country validation
    if (!validateCountry(country)) {
        showModal('Invalid Country', 'Please enter a valid country name (letters, spaces, hyphens, and apostrophes only).', 'OK');
        return;
    }

    if (!validateEmail(email)) {
        showModal('Invalid Email', 'Please enter a valid email address.', 'OK');
        return;
    }

    // Show loading state
    const submitBtn = elements.submitApplicationBtn;
    if (submitBtn) {
        showLoader(submitBtn, 'Submitting...');
    }

    try {
        const response = await safeFetch(`${API_BASE_URL}/api/submit-admin-application`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                phone: phone,
                email: email,
                country: country,
                reason: reason,
                wordCount: words.length,
                timestamp: new Date().toISOString()
            })
        });

        if (response.success) {
            // Clear form
            if (elements.adminName) elements.adminName.value = '';
            if (elements.adminPhone) elements.adminPhone.value = '';
            if (elements.adminEmail) elements.adminEmail.value = '';
            if (elements.adminCountry) elements.adminCountry.value = '';
            if (elements.adminReason) elements.adminReason.value = '';
            if (elements.charCount) {
                elements.charCount.textContent = '0 words';
                elements.charCount.style.color = 'var(--accent-success)';
            }

            // Show success message directly in the section (like token request does)
            showAdminApplicationSuccess(email, name);
            
            showToast('✅ Application submitted successfully!', 'success');
        } else {
            showModal('Submission Failed', response.message || 'Failed to submit application. Please try again.', 'OK');
        }
    } catch (error) {
        console.error('Admin application error:', error);
        showModal('Submission Error', `Failed to submit application: ${error.message}`, 'OK');
    } finally {
        if (submitBtn) {
            hideLoader(submitBtn);
        }
    }
}

// NEW FUNCTION: Show admin application success directly in the admin application section
function showAdminApplicationSuccess(email, name) {
    const section = document.getElementById('adminApplicationSection');
    if (!section) return;
    
    // Replace the entire section content with success message
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
                    <p style="margin-bottom: 8px;">
                        <i class="fas fa-envelope"></i> 
                        <strong>Email:</strong>
                        <a href="mailto:brenaldmedia@gmail.com?subject=Admin%20Application%20Follow-up" 
                           class="clickable-link email-link" target="_blank" style="color: #4285F4;">
                            <i class="fas fa-external-link-alt"></i> brenaldmedia@gmail.com
                        </a>
                    </p>
                    
                    <p style="margin-bottom: 8px;">
                        <i class="fab fa-whatsapp"></i> 
                        <strong>WhatsApp:</strong>
                        <a href="https://wa.me/2348150221529?text=Hello%2C%20I%20submitted%20an%20admin%20application%20for%20Tracle-Lite%20Pro" 
                           class="clickable-link whatsapp-link" target="_blank" style="color: #25D366;">
                            <i class="fab fa-whatsapp"></i> +234 815 022 1529
                        </a>
                    </p>
                    
                    <p style="margin-bottom: 8px;">
                        <i class="fab fa-telegram"></i> 
                        <strong>Telegram:</strong>
                        <a href="https://t.me/Brenaldmedia" 
                           class="clickable-link telegram-link" target="_blank" style="color: #0088cc;">
                            <i class="fab fa-telegram"></i> @Brenaldmedia
                        </a>
                    </p>
                </div>

                <div style="display: flex; gap: 10px; margin: 20px 0; justify-content: center;">
                    <a href="https://wa.me/2348150221529?text=Hello%2C%20I%20just%20submitted%20an%20admin%20application%20for%20Tracle-Lite%20Pro.%20My%20email%20is%20${encodeURIComponent(email)}" 
                       class="contact-action-btn whatsapp-link" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--border-radius); text-decoration: none; background: rgba(37, 211, 102, 0.1); color: #25D366; font-weight: 500;">
                        <i class="fab fa-whatsapp"></i> WhatsApp Now
                    </a>
                    
                    <a href="mailto:brenaldmedia@gmail.com?subject=Admin%20Application%20Follow-up&body=Hello%2C%0A%0AI%20just%20submitted%20an%20admin%20application%20for%20Tracle-Lite%20Pro.%0A%0AName%3A%20${encodeURIComponent(name)}%0AEmail%3A%20${encodeURIComponent(email)}%0A%0APlease%20let%20me%20know%20the%20next%20steps." 
                       class="contact-action-btn email-link" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--border-radius); text-decoration: none; background: rgba(66, 133, 244, 0.1); color: #4285F4; font-weight: 500;">
                        <i class="fas fa-envelope"></i> Email Now
                    </a>
                </div>

                <div style="background: rgba(var(--accent-info-rgb), 0.1); border: 1px solid rgba(var(--accent-info-rgb), 0.3); border-radius: var(--border-radius); padding: 1rem; margin-top: 1.5rem; text-align: left;">
                    <p style="margin: 0; color: var(--text-primary); font-size: 0.95rem; font-weight: 500;">
                        <i class="fas fa-info-circle"></i> <strong>Important:</strong> Make sure to mention you've submitted an admin application and include your email: <strong>${email}</strong>
                    </p>
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
    
    // Scroll to top of section
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

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
    if (!elements.modalTitle || !elements.modalBody || !elements.modalConfirm) return;
    
    elements.modalTitle.textContent = title;
    
    if (message.includes('<') && message.includes('>')) {
        elements.modalBody.innerHTML = message;
    } else {
        elements.modalBody.innerHTML = `<p>${message}</p>`;
    }
    
    elements.modalConfirm.textContent = confirmText;
    
    const newConfirmBtn = elements.modalConfirm.cloneNode(true);
    elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, elements.modalConfirm);
    elements.modalConfirm = newConfirmBtn;
    
    if (confirmCallback) {
        elements.modalConfirm.onclick = function() {
            confirmCallback();
            closeModal();
        };
    } else {
        elements.modalConfirm.onclick = closeModal;
    }
    
    const modalCancel = document.querySelector('.modal-btn.secondary');
    if (modalCancel && cancelCallback) {
        modalCancel.onclick = function() {
            cancelCallback();
            closeModal();
        };
    } else if (modalCancel) {
        modalCancel.onclick = closeModal;
    }
    
    elements.customModal.classList.remove('hidden');
    
    setTimeout(() => {
        const modalContent = elements.customModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.animation = 'slideIn 0.3s ease-out';
        }
    }, 10);
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
            
            if (item.getAttribute('onclick') && item.getAttribute('onclick').includes('admin.html')) {
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
                elements.navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
                
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
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    const headerTitle = document.querySelector('.header-title h1');
    const headerSubtitle = document.querySelector('.header-title p');
    
    if (!headerTitle || !headerSubtitle) return;
    
    switch(section) {
        case 'home':
            headerTitle.textContent = 'Dashboard';
            headerSubtitle.textContent = 'Welcome to Tracle-Lite Pro';
            break;
        case 'register':
            headerTitle.textContent = 'Register';
            headerSubtitle.textContent = 'Register your account for FREE';
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
        case 'adminApplication':
            headerTitle.textContent = 'Become Admin';
            headerSubtitle.textContent = 'Apply to be an administrator';
            break;
        default:
            headerTitle.textContent = 'Dashboard';
            headerSubtitle.textContent = 'Welcome to Tracle-Lite Pro';
    }
}

// ===== SOCKET FUNCTIONS =====
function initSocket() {
    console.log('🔗 Initializing socket connection to:', WEB_SOCKET_URL);
    
    // Clear any existing socket connection
    if (socket && socket.connected) {
        socket.disconnect();
    }
    
    // Create new socket connection with proper configuration
    socket = io(WEB_SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        secure: WEB_SOCKET_URL.startsWith('wss://'), // Secure for HTTPS
        rejectUnauthorized: false // Allow self-signed certificates
    });
    
    socket.on('connect', () => {
        console.log('✅ Connected to server with ID:', socket.id);
        showToast('✅ Connected to server', 'success');
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        console.error('⚠️ Attempted to connect to:', WEB_SOCKET_URL);
        showToast('Connection failed: ' + error.message, 'error');
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
        
        if (data.email !== currentUserEmail) {
            console.log('Ignoring pairing code for different user');
            return;
        }
        
        currentUserNumber = data.userNumber;
        const code = data.pairingCode;
        hidePairingSectionLoader();
        showPairingCode(code);
    });
    
    socket.on('connected', (data) => {
        if (data.email !== currentUserEmail) {
            console.log('Ignoring connection for different user');
            return;
        }
        
        hidePairingSectionLoader();
        showConnected(data.userNumber);
    });
    
    socket.on('disconnected', (data) => {
        if (data.email !== currentUserEmail) {
            return;
        }
        showToast('WhatsApp session disconnected', 'warning');
    });
    
    socket.on('error', (data) => {
        if (data.email !== currentUserEmail) {
            return;
        }
        showToast('Error: ' + data.error, 'error');
    });
    
    socket.on('pairing-expired', (data) => {
        if (data.email !== currentUserEmail) {
            return;
        }
        showToast('Pairing code expired. Generate a new one.', 'warning');
        hidePairingSectionLoader();
        resetPairingSection();
    });
    
    socket.on('qr', (data) => {
        console.log('Received QR data:', data);
        
        if (data.email !== currentUserEmail) {
            console.log('Ignoring QR for different user');
            return;
        }
        
        if (data.qr) {
            currentUserNumber = data.userNumber;
            hidePairingSectionLoader();
            showPairingCode(data.qr);
        }
    });
}
// ===== SOCKET RECONNECTION =====
function setupSocketReconnection() {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let isReconnecting = false;
    
    const attemptReconnect = () => {
        if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
            return;
        }
        
        isReconnecting = true;
        reconnectAttempts++;
        
        console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}...`);
        
        // Disconnect first if still connected
        if (socket && socket.connected) {
            socket.disconnect();
        }
        
        // Reinitialize socket
        initSocket();
        
        // Reset reconnecting flag after delay
        setTimeout(() => {
            isReconnecting = false;
        }, 5000);
    };
    
    // Listen for disconnection
    socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server:', reason);
        
        if (reason === 'io server disconnect') {
            // The server has forcefully disconnected the socket
            setTimeout(attemptReconnect, 1000);
        } else if (reason === 'io client disconnect') {
            // User-initiated disconnection
            showToast('Disconnected from server', 'warning');
        } else {
            // Network error - try to reconnect
            setTimeout(attemptReconnect, 2000);
        }
    });
    
    // Auto-reconnect when network comes back
    window.addEventListener('online', () => {
        console.log('🌐 Network connection restored');
        if (!socket.connected) {
            setTimeout(attemptReconnect, 1000);
        }
    });
}

// ===== EMAIL MANAGEMENT =====
function checkSavedEmail() {
    const savedEmail = localStorage.getItem('user_email');
    
    if (savedEmail) {
        currentUserEmail = savedEmail;
        
        if (elements.userEmail) {
            elements.userEmail.textContent = savedEmail;
        }
        if (elements.userStatus) {
            elements.userStatus.textContent = 'Registered user';
            elements.userStatus.style.color = 'var(--accent-success)';
        }
        if (elements.codeEmail) {
            elements.codeEmail.value = savedEmail;
        }
        
        showToast('✅ Welcome back! Your email is loaded.', 'success');
    }
}

function saveUserEmail(email) {
    localStorage.setItem('user_email', email);
    localStorage.setItem('email_saved_at', Date.now());
    
    currentUserEmail = email;
    
    if (elements.userEmail) {
        elements.userEmail.textContent = email;
    }
    if (elements.userStatus) {
        elements.userStatus.textContent = 'Registered user';
        elements.userStatus.style.color = 'var(--accent-success)';
    }
    if (elements.codeEmail) {
        elements.codeEmail.value = email;
    }
    
    showToast('✅ Email saved for this session', 'success');
}

// ===== EMAIL VALIDATION =====
async function validateEmailForUser(email) {
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/validate-email`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                email: email
            })
        });
        
        return response;
        
    } catch (error) {
        console.error('❌ Email validation error:', error);
        return { 
            valid: true, // Always valid for free version
            message: 'Email is valid' 
        };
    }
}

// ===== MAIN PAIRING CODE FUNCTION =====
async function getPairingCode() {
    const email = elements.codeEmail.value.trim();
    const number = elements.codeNumber.value.trim();
    
    if (!email || !number) {
        showModal('Missing Information', 'Please fill in all fields: Email and WhatsApp Number.', 'OK');
        return;
    }
    
    const validatedNumber = validateWhatsAppNumber(number);
    if (!validatedNumber) {
        showModal('Invalid Number', 'Please enter a valid WhatsApp number with country code (e.g., 1234567890, 441234567890)', 'OK');
        return;
    }
    
    const getCodeBtn = document.querySelector('.primary-btn[onclick*="getPairingCode"]') || 
                      document.querySelector('.action-btn[onclick*="getPairingCode"]') ||
                      document.querySelector('button:contains("Get Pairing Code")');
    
    if (getCodeBtn) {
        showLoader(getCodeBtn, 'Getting Code...');
    }
    
    try {
        const validationResult = await validateEmailForUser(email);
        
        if (validationResult.valid) {
            saveUserEmail(email);
            
            showPairingSectionLoader('Generating pairing code...');
            
            if (elements.pairingSection && elements.pairingSection.classList.contains('hidden')) {
                elements.pairingSection.classList.remove('hidden');
            }
            
            if (elements.statusSection && !elements.statusSection.classList.contains('hidden')) {
                elements.statusSection.classList.add('hidden');
            }
            
            const sessionCheckResponse = await safeFetch(`${API_BASE_URL}/api/user/check-session-exists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    userNumber: validatedNumber
                })
            });
            
            if (sessionCheckResponse.sessionExists) {
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
                        createNewSession(validatedNumber, email, true);
                    },
                    () => {
                        // Cancel
                    }
                );
            } else {
                createNewSession(validatedNumber, email, false);
            }
            
        } else {
            hideLoader(getCodeBtn);
            showModal('Email Error', validationResult.message || 'Failed to verify email.', 'OK');
        }
    } catch (error) {
        console.error('Pairing code error:', error);
        hideLoader(getCodeBtn);
        hidePairingSectionLoader();
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
    }
}

function createNewSession(userNumber, email, deleteExisting = false) {
    if (deleteExisting) {
        deleteUserSessionImmediately(userNumber, email, () => {
            actuallyCreateNewSession(userNumber, email);
        });
    } else {
        actuallyCreateNewSession(userNumber, email);
    }
}

function actuallyCreateNewSession(userNumber, email) {
    showPairingSectionLoader('Creating new session...');
    
    socket.emit('create-session', {
        userNumber: userNumber,
        email: email
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
    if (!elements.pairingSection.classList.contains('hidden')) {
        elements.pairingSection.classList.remove('hidden');
    }
    
    if (!elements.statusSection.classList.contains('hidden')) {
        elements.statusSection.classList.add('hidden');
    }
    
    if (elements.codeDisplay) {
        elements.codeDisplay.innerHTML = `
            <div class="code-text">${code}</div>
            <button class="copy-btn" onclick="copyToClipboard('${code}')">
                <i class="fas fa-copy"></i> Copy
            </button>
        `;
    }
    
    startCountdown(120);
    showToast('✅ Pairing code generated! Click "Copy" to copy it.', 'success');
    
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
    if (elements.pairingSection) {
        elements.pairingSection.classList.add('hidden');
    }
    if (elements.statusSection) {
        elements.statusSection.classList.remove('hidden');
    }
    
    if (userNumber && elements.connectedNumber) {
        elements.connectedNumber.textContent = formatPhoneNumber(userNumber);
    }
    
    showToast('✅ Successfully connected to WhatsApp!', 'success');
}

function resetConnection() {
    if (elements.statusSection) {
        elements.statusSection.classList.add('hidden');
    }
    if (elements.codeNumber) {
        elements.codeNumber.value = '';
    }
    showSection('home');
}

function resetPairingSection() {
    if (elements.pairingSection) {
        elements.pairingSection.classList.add('hidden');
    }
    stopCountdown();
}

// ===== COUNTDOWN FUNCTIONS =====
function startCountdown(seconds) {
    let timeLeft = seconds;
    stopCountdown();
    
    if (elements.countdown) {
        elements.countdown.textContent = `${timeLeft}s`;
    }
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        if (elements.countdown) {
            elements.countdown.textContent = `${timeLeft}s`;
        }
        
        if (timeLeft <= 0) {
            stopCountdown();
            if (elements.countdown) {
                elements.countdown.textContent = 'Expired';
            }
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

// ===== USER REGISTRATION FUNCTIONS =====
async function registerUser() {
    const email = elements.registerEmail.value.trim();
    
    if (!email) {
        showModal('Email Required', 'Please enter your email address to register.', 'OK');
        return;
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        showModal('Invalid Email', 'Please enter a valid email address.', 'OK');
        return;
    }
    
    const registerBtn = document.querySelector('.primary-btn[onclick*="registerUser"]') ||
                      document.querySelector('button:contains("Register Now")');
    
    if (registerBtn) {
        showLoader(registerBtn, 'Registering...');
    }
    
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (response.success) {
            saveUserEmail(email);
            
            showModal('Registration Successful', 
                `<div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: var(--accent-success); margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px;">Registration Successful!</h3>
                    <p>Your email <strong>${email}</strong> has been registered successfully.</p>
                    <p>You can now use Tracle-Lite Pro for FREE!</p>
                    <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); margin-top: 20px;">
                        <p><i class="fas fa-info-circle"></i> <strong>What's Next:</strong></p>
                        <p>1. Go to Dashboard to get pairing code</p>
                        <p>2. Enter your WhatsApp number</p>
                        <p>3. Connect your WhatsApp!</p>
                    </div>
                </div>`, 
                'Get Started', 
                () => {
                    showSection('home');
                });
            
        } else {
            showModal('Registration Failed', response.message || 'Failed to register. Please try again.', 'OK');
        }
    } catch (error) {
        showModal('Network Error', 'Failed to connect to server. Please check your internet connection.', 'OK');
        console.error('Registration error:', error);
    } finally {
        if (registerBtn) {
            hideLoader(registerBtn);
        }
    }
}

// ===== SESSIONS MANAGEMENT =====
async function loadUserSessions() {
    try {
        if (!currentUserEmail) {
            if (elements.sessionsList) {
                elements.sessionsList.innerHTML = `
                    <div class="no-sessions">
                        <i class="fas fa-user"></i>
                        <h4>Authentication Required</h4>
                        <p>Please register or enter your email first.</p>
                        <button class="primary-btn" onclick="showSection('register')">
                            <i class="fas fa-user-plus"></i> Register Now
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        if (elements.sessionsList) {
            elements.sessionsList.innerHTML = `
                <div class="loading-sessions">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading your sessions...</span>
                </div>
            `;
        }
        
        const response = await safeFetch(`${API_BASE_URL}/api/user/sessions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: currentUserEmail
            })
        });
        
        if (response.success && response.sessions && response.sessions.length > 0) {
            if (elements.sessionsList) {
                let sessionsHTML = '<div class="sessions-grid">';
                
                response.sessions.forEach(session => {
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
            }
        } else {
            if (elements.sessionsList) {
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
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        if (elements.sessionsList) {
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
}

// ===== SESSION MANAGEMENT FUNCTIONS =====
async function restoreSession(userNumber) {
    if (!currentUserEmail) {
        showToast('Authentication required', 'error');
        return;
    }
    
    const restoreBtn = document.getElementById(`restore-btn-${userNumber}`);
    if (restoreBtn) {
        showLoader(restoreBtn, 'Restoring...');
    }
    
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/user/restore-session`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: currentUserEmail,
                userNumber: userNumber
            })
        });
        
        if (response.success) {
            showToast('✅ Session restored! Generating new pairing code...', 'success');
            
            showSection('home');
            
            if (elements.codeNumber) {
                elements.codeNumber.value = userNumber;
            }
            
            showPairingSectionLoader('Restoring session and generating pairing code...');
            
            if (elements.pairingSection && elements.pairingSection.classList.contains('hidden')) {
                elements.pairingSection.classList.remove('hidden');
            }
            
            if (elements.statusSection && !elements.statusSection.classList.contains('hidden')) {
                elements.statusSection.classList.add('hidden');
            }
            
            setTimeout(() => {
                actuallyCreateNewSession(userNumber, currentUserEmail);
            }, 1000);
        } else {
            showToast('❌ ' + response.message, 'error');
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
    if (!currentUserEmail) {
        showToast('Authentication required', 'error');
        return;
    }
    
    showModal('Delete Session', 
        `Are you sure you want to delete session for ${userNumber}? This will disconnect WhatsApp and remove all session data.`,
        'Delete',
        () => {
            deleteUserSessionImmediately(userNumber, currentUserEmail);
        },
        () => {
            // Cancel
        }
    );
}

async function deleteUserSessionImmediately(userNumber, email, callback = null) {
    const deleteBtn = document.getElementById(`delete-btn-${userNumber}`);
    if (deleteBtn) {
        showLoader(deleteBtn, 'Deleting...');
    }
    
    try {
        const response = await safeFetch(`${API_BASE_URL}/api/user/session`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                userNumber: userNumber
            })
        });
        
        if (response.success) {
            showToast('✅ Session deleted successfully', 'success');
            
            const sessionCard = document.getElementById(`session-card-${userNumber}`);
            if (sessionCard) {
                sessionCard.style.opacity = '0.5';
                setTimeout(() => {
                    sessionCard.remove();
                    if (document.querySelectorAll('.session-card').length === 0) {
                        loadUserSessions();
                    }
                }, 500);
            }
            
            socket.emit('disconnect-session', {
                userNumber: userNumber,
                email: email
            });
            
            if (callback) {
                callback();
            }
        } else {
            throw new Error(response.message || 'Failed to delete session');
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
    if (!currentUserNumber || !currentUserEmail) {
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
        createNewSession(currentUserNumber, currentUserEmail, true);
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
    if (!toastContainer) return;
    
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
    if (elements.registerEmail) {
        elements.registerEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerUser();
        });
    }
    
    if (elements.codeEmail) {
        elements.codeEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') getPairingCode();
        });
    }
    
    if (elements.codeNumber) {
        elements.codeNumber.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    if (elements.adminPhone) {
        elements.adminPhone.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '');
        });
    }
    
    if (elements.adminCountry) {
        elements.adminCountry.addEventListener('input', function(e) {
            if (this.value.trim() && !validateCountry(this.value)) {
                this.style.borderColor = 'var(--accent-danger)';
            } else {
                this.style.borderColor = '';
            }
        });
        
        elements.adminCountry.addEventListener('blur', function(e) {
            if (this.value.trim() && !validateCountry(this.value)) {
                showToast('Please enter a valid country name (letters, spaces, hyphens, and apostrophes only)', 'warning');
                this.focus();
            }
        });
    }
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
            email: currentUserEmail
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

// ===== EXPORT FUNCTIONS TO WINDOW =====
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

// Initialize
console.log('🚀 Tracle-Lite Pro Frontend Loaded - Token-Free Version');