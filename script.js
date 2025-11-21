console.log('🚀 Smart Finance script.js starting to load...');

// Global Variables
let currentUser = null;
let transactions = [];
let savingsGoals = [];
let currentPage = 'dashboard';
let editingTransaction = null;
let previewingTransaction = null;
let historyPeriod = 'month';
let uploadedImage = null;
let currentChartPeriod = 'week';
let balanceVisible = true;
let isOnline = navigator.onLine;
let syncStatus = 'connecting';
let unsubscribeTransactions = null;
let unsubscribeSavings = null;
let isLoggedIn = false;
let rememberMe = false;
let savingsListVisible = false;

// Firebase instances and data will be loaded from firebase.js  
let validAccounts = [];
let categories = {
    income: ['Gaji', 'Freelance', 'Bisnis', 'Investasi', 'Bonus', 'Hadiah', 'Lainnya'],
    expense: ['Makanan', 'Transport', 'Hiburan', 'Belanja', 'Tagihan', 'Kesehatan', 'Pendidikan', 'Lainnya']
};

// Wait for Firebase to load, then initialize
function waitForFirebase() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        function checkFirebase() {
            attempts++;
            
            if (window.validAccounts && window.validAccounts.length > 0) {
                const auth = window.firebaseAuth;
                const db = window.firebaseDb; 
                const storage = window.firebaseStorage;
                
                validAccounts = window.validAccounts;
                categories = window.categories || categories;
                
                console.log('Firebase data loaded:', {
                    auth: !!auth,
                    db: !!db,
                    storage: !!storage,
                    validAccounts: validAccounts.length
                });
                
                resolve();
            } else if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.log('Firebase timeout, using fallback data');
                resolve();
            }
        }
        
        checkFirebase();
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, waiting for Firebase...');
    
    try {
        await waitForFirebase();
        await initializeApp();
    } catch (error) {
        console.error('Failed to initialize:', error);
        initializeAppFallback();
    }
});

// Initialize Application
async function initializeApp() {
    try {
        console.log('Initializing app...');
        updateLoadingText('Memuat aplikasi...');
        
        setupOfflineMonitoring();
        setupEventListeners();
        
        // Check if user should auto-login
        const shouldAutoLogin = await checkAutoLogin();
        
        if (shouldAutoLogin) {
            updateLoadingText('Masuk otomatis...', 'success');
            await performAutoLogin();
        } else {
            setTimeout(() => {
                hideLoadingScreen();
                showLoginScreen();
            }, 1500);
        }
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
                console.log('Force hiding loading screen');
                hideLoadingScreen();
                if (!isLoggedIn) {
                    showLoginScreen();
                }
            }
        }, 3000);
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateLoadingText('Gagal memuat aplikasi...', 'error');
        
        setTimeout(() => {
            hideLoadingScreen();
            showLoginScreen();
        }, 2000);
    }
}

// Fallback initialization if Firebase fails
function initializeAppFallback() {
    console.log('Using fallback initialization...');
    
    validAccounts = [
        { email: 'admin@smartfinance.com', password: 'admin123', name: 'Admin' },
        { email: 'user@smartfinance.com', password: 'user123', name: 'User' },
        { email: 'demo@smartfinance.com', password: 'demo123', name: 'Demo' }
    ];
    
    updateLoadingText('Mode offline...', 'warning');
    
    setTimeout(() => {
        hideLoadingScreen();
        showLoginScreen();
        setupEventListeners();
    }, 1500);
}

// Check for auto-login
async function checkAutoLogin() {
    try {
        const savedCredentials = localStorage.getItem('smartfinance_credentials');
        if (savedCredentials) {
            const { email, password, remember } = JSON.parse(savedCredentials);
            if (remember && email && password) {
                return { email, password };
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking auto-login:', error);
        return false;
    }
}

// Perform auto-login
async function performAutoLogin() {
    try {
        const credentials = await checkAutoLogin();
        if (credentials) {
            const validAccount = validAccounts.find(acc => 
                acc.email.toLowerCase() === credentials.email.toLowerCase() && 
                acc.password === credentials.password
            );
            
            if (validAccount) {
                await completeLogin(credentials.email, credentials.password, validAccount, true);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Auto-login failed:', error);
        return false;
    }
}

// Load saved credentials to form
function loadSavedCredentials() {
    try {
        const savedCredentials = localStorage.getItem('smartfinance_credentials');
        if (savedCredentials) {
            const { email, password, remember } = JSON.parse(savedCredentials);
            
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const checkbox = document.getElementById('rememberCheckbox');
            
            if (emailInput && email) emailInput.value = email;
            if (passwordInput && password) passwordInput.value = password;
            if (checkbox && remember) {
                checkbox.classList.add('checked');
                rememberMe = true;
            }
        }
    } catch (error) {
        console.error('Error loading saved credentials:', error);
    }
}

// Toggle remember me checkbox
function toggleRemember() {
    const checkbox = document.getElementById('rememberCheckbox');
    rememberMe = !rememberMe;
    
    if (checkbox) {
        if (rememberMe) {
            checkbox.classList.add('checked');
        } else {
            checkbox.classList.remove('checked');
        }
    }
}

// Show/Hide screens
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        // Load saved credentials when showing login screen
        setTimeout(() => loadSavedCredentials(), 100);
    }
}

function hideLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.classList.add('hidden');
    }
}

function updateLoadingText(text, type = '') {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
        loadingText.className = `loading-text ${type}`;
    }
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.classList.remove('hidden');
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Enhanced Login with credentials
async function loginWithCredentials() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        alert('Form login tidak ditemukan!');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    console.log('Login attempt:', { email, password: password ? '***' : 'empty' });
    
    if (!email || !password) {
        alert('Mohon masukkan email dan password!');
        return;
    }
    
    if (!validAccounts || validAccounts.length === 0) {
        console.error('No valid accounts available');
        alert('Error: Data akun tidak tersedia!');
        return;
    }
    
    console.log('Available accounts:', validAccounts.map(acc => ({ email: acc.email, name: acc.name })));
    
    const validAccount = validAccounts.find(acc => 
        acc.email.toLowerCase() === email.toLowerCase() && 
        acc.password === password
    );
    
    console.log('Found valid account:', !!validAccount);
    
    if (!validAccount) {
        alert('Email atau password salah!\n\nGunakan akun demo:\n• admin@smartfinance.com / admin123\n• user@smartfinance.com / user123\n• demo@smartfinance.com / demo123');
        console.log('Login failed - invalid credentials');
        return;
    }
    
    await completeLogin(email, password, validAccount, false);
}

// Complete login process
async function completeLogin(email, password, validAccount, isAutoLogin = false) {
    try {
        if (!isAutoLogin) {
            updateLoadingText('Masuk ke akun...', 'success');
            showLoadingScreen();
        }
        
        // Save credentials if remember me is checked
        if (rememberMe || isAutoLogin) {
            localStorage.setItem('smartfinance_credentials', JSON.stringify({
                email: email,
                password: password,
                remember: true
            }));
        } else {
            localStorage.removeItem('smartfinance_credentials');
        }
        
        const auth = window.firebaseAuth;
        if (auth) {
            try {
                const result = await auth.signInAnonymously();
                currentUser = {
                    uid: result.user.uid,
                    email: email,
                    displayName: validAccount.name
                };
                console.log('Firebase auth successful');
            } catch (firebaseError) {
                console.log('Firebase auth failed, using offline mode:', firebaseError);
                currentUser = {
                    uid: 'offline_' + Date.now(),
                    email: email,
                    displayName: validAccount.name
                };
            }
        } else {
            console.log('No Firebase available, using offline mode');
            currentUser = {
                uid: 'offline_' + Date.now(),
                email: email,
                displayName: validAccount.name
            };
        }
        
        isLoggedIn = true;
        console.log('User logged in successfully:', currentUser);
        
        await initializeUserData();
        
        hideLoginScreen();
        hideLoadingScreen();
        updateUserInfo();
        setSyncStatus(window.firebaseAuth ? 'synced' : 'offline');
        showPage('dashboard');
        
    } catch (error) {
        console.error('Login error:', error);
        hideLoadingScreen();
        alert('Gagal masuk. Coba lagi.');
    }
}

// Enhanced login with Enter key support
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && !loginScreen.classList.contains('hidden')) {
            loginWithCredentials();
        }
    }
});

// Update user info in header
function updateUserInfo() {
    const userAvatar = document.getElementById('userAvatar');
    const userStatus = document.getElementById('userStatus');
    
    if (currentUser && userAvatar && userStatus) {
        const initials = currentUser.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 
                        currentUser.email ? currentUser.email.substring(0, 2).toUpperCase() : 'U';
        userAvatar.textContent = initials;
        
        if (currentUser.displayName) {
            userStatus.textContent = currentUser.displayName;
        } else if (currentUser.email) {
            userStatus.textContent = currentUser.email;
        } else {
            userStatus.textContent = 'User';
        }
    }
}

// Show user info modal
function showUserInfo() {
    if (!currentUser) return;
    
    const userInfo = `
        <div class="modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">Informasi Akun</div>
                <div class="preview-content">
                    <div class="preview-item">
                        <div class="preview-label">Nama</div>
                        <div class="preview-value">${currentUser.displayName || 'User'}</div>
                    </div>
                    <div class="preview-item">
                        <div class="preview-label">Email</div>
                        <div class="preview-value">${currentUser.email || 'N/A'}</div>
                    </div>
                    <div class="preview-item">
                        <div class="preview-label">Status</div>
                        <div class="preview-value">${isOnline ? 'Online' : 'Offline'}</div>
                    </div>
                    <div class="preview-item">
                        <div class="preview-label">Data Tersimpan</div>
                        <div class="preview-value">${transactions.length} transaksi, ${savingsGoals.length} target tabungan</div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Tutup</button>
                    <button type="button" class="btn btn-small" onclick="logout()" style="background: #FF453A; color: #FFF;">Keluar</button>
                </div>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.innerHTML = userInfo;
    modal.addEventListener('click', function(e) {
        if (e.target === this) this.remove();
    });
    document.body.appendChild(modal.firstElementChild);
}

// Logout function
function logout() {
    if (confirm('Yakin ingin keluar?')) {
        currentUser = null;
        transactions = [];
        savingsGoals = [];
        isLoggedIn = false;
        
        const auth = window.firebaseAuth;
        if (auth && auth.currentUser) {
            auth.signOut();
        }
        
        if (unsubscribeTransactions) unsubscribeTransactions();
        if (unsubscribeSavings) unsubscribeSavings();
        
        // Clear saved credentials
        localStorage.removeItem('smartfinance_credentials');
        
        showLoginScreen();
        setSyncStatus('offline');
        
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    }
}

// Setup offline monitoring
function setupOfflineMonitoring() {
    window.addEventListener('online', () => {
        isOnline = true;
        if (isLoggedIn) {
            setSyncStatus('syncing');
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        setSyncStatus('offline');
    });
    
    isOnline = navigator.onLine;
}

// Set sync status
function setSyncStatus(status) {
    syncStatus = status;
    const syncDot = document.getElementById('syncDot');
    const syncText = document.getElementById('syncText');
    
    if (syncDot && syncText) {
        syncDot.classList.remove('synced', 'syncing', 'offline');
        
        switch (status) {
            case 'synced':
                syncDot.classList.add('synced');
                syncText.textContent = 'Online';
                break;
            case 'syncing':
                syncDot.classList.add('syncing');
                syncText.textContent = 'Syncing...';
                break;
            case 'offline':
                syncDot.classList.add('offline');
                syncText.textContent = 'Offline';
                break;
            default:
                syncText.textContent = 'Connecting...';
        }
    }
}

// Initialize user data
async function initializeUserData() {
    try {
        setSyncStatus('syncing');
        
        loadLocalData();
        updateUI();
        renderSavingsGoals();
        
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        if (auth && db && currentUser && currentUser.uid && currentUser.uid.indexOf('offline_') !== 0) {
            console.log('Setting up Firebase listeners...');
            setupFirebaseListeners();
        }
        
        setSyncStatus(auth && currentUser.uid.indexOf('offline_') !== 0 ? 'synced' : 'offline');
        
    } catch (error) {
        console.error('Error loading data:', error);
        setSyncStatus('offline');
        loadLocalData();
        updateUI();
        renderSavingsGoals();
    }
}

// Enhanced Firebase sync with user-specific data
function setupFirebaseListeners() {
    const db = window.firebaseDb;
    if (!db || !currentUser || currentUser.uid.startsWith('offline_')) {
        console.log('Firebase not available or offline user, using local storage only');
        return;
    }
    
    const userRef = db.collection('users').doc(currentUser.email);
    
    // Listen to transactions with user-specific data
    unsubscribeTransactions = userRef.collection('transactions')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const newTransactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date.toDate ? doc.data().date.toDate() : new Date(doc.data().date),
                timestamp: doc.data().timestamp.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp)
            }));
            
            // Only update if data actually changed
            if (JSON.stringify(newTransactions) !== JSON.stringify(transactions)) {
                transactions = newTransactions;
                updateUI();
                updateReportsPage();
                saveLocalData();
                console.log(`Transactions synced from Firebase for ${currentUser.email}:`, transactions.length);
            }
        }, (error) => {
            console.error('Firebase transactions listener error:', error);
            loadLocalData();
        });
    
    // Listen to savings goals with user-specific data
    unsubscribeSavings = userRef.collection('savings')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const newSavingsGoals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp)
            }));
            
            // Only update if data actually changed
            if (JSON.stringify(newSavingsGoals) !== JSON.stringify(savingsGoals)) {
                savingsGoals = newSavingsGoals;
                renderSavingsGoals();
                saveLocalData();
                console.log(`Savings goals synced from Firebase for ${currentUser.email}:`, savingsGoals.length);
            }
        }, (error) => {
            console.error('Firebase savings listener error:', error);
            loadLocalData();
        });
    
    console.log(`Firebase listeners setup for user: ${currentUser.email}`);
}

// Load data from localStorage with user-specific keys
function loadLocalData() {
    try {
        if (!currentUser) return;
        
        const userKey = currentUser.email.replace(/[.@]/g, '_');
        const localTransactions = localStorage.getItem(`transactions_${userKey}`);
        const localSavings = localStorage.getItem(`savingsGoals_${userKey}`);
        
        if (localTransactions) {
            transactions = JSON.parse(localTransactions);
        }
        
        if (localSavings) {
            savingsGoals = JSON.parse(localSavings);
        }
        
        console.log(`Local data loaded for ${currentUser.email}:`, { transactions: transactions.length, savings: savingsGoals.length });
    } catch (error) {
        console.error('Error loading local data:', error);
    }
}

// Save data to localStorage with user-specific keys
function saveLocalData() {
    try {
        if (!currentUser) return;
        
        const userKey = currentUser.email.replace(/[.@]/g, '_');
        localStorage.setItem(`transactions_${userKey}`, JSON.stringify(transactions));
        localStorage.setItem(`savingsGoals_${userKey}`, JSON.stringify(savingsGoals));
        
        console.log(`Local data saved for ${currentUser.email}`);
    } catch (error) {
        console.error('Error saving local data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    try {
        // Set default date
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Setup transaction form
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', handleTransactionSubmit);
        }
        
        // Setup savings form
        const savingsForm = document.getElementById('savingsForm');
        if (savingsForm) {
            savingsForm.addEventListener('submit', handleSavingsSubmit);
        }
        
        // Setup add savings form
        const addSavingsForm = document.getElementById('addSavingsForm');
        if (addSavingsForm) {
            addSavingsForm.addEventListener('submit', handleAddSavingsSubmit);
        }
        
        // Setup edit form
        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', handleEditSubmit);
        }
        
        // Setup type selector
        document.addEventListener('click', function(e) {
            if (e.target.closest('.type-option')) {
                handleTypeSelection(e.target.closest('.type-option'));
            }
        });
        
        // Setup currency formatting
        setupCurrencyInputs();
        
        // Setup period filters
        updateReportsPeriodFilter();
        
        console.log('Event listeners setup completed');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Setup currency input formatting with enhanced validation
function setupCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('.currency-input');
    currencyInputs.forEach(input => {
        // Format on input
        input.addEventListener('input', function(e) {
            formatCurrencyInput(e.target);
            updateSubmitButtons();
        });
        
        // Prevent non-numeric input
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        // Handle paste events
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const numbersOnly = paste.replace(/\D/g, '');
            if (numbersOnly) {
                input.value = numbersOnly;
                formatCurrencyInput(input);
                updateSubmitButtons();
            }
        });
        
        // Format existing values on page load
        if (input.value) {
            formatCurrencyInput(input);
        }
    });
}

// Enhanced format currency input with dots (20000 -> 20.000)
function formatCurrencyInput(input) {
    // Get raw value (numbers only)
    let value = input.value.replace(/\D/g, '');
    
    // Store raw value in hidden input
    const hiddenInput = document.getElementById(input.id + 'Value');
    if (hiddenInput) {
        hiddenInput.value = value;
    }
    
    // Format with dots for thousands separator
    if (value) {
        // Add dots every 3 digits from right
        let formatted = '';
        let count = 0;
        for (let i = value.length - 1; i >= 0; i--) {
            if (count > 0 && count % 3 === 0) {
                formatted = '.' + formatted;
            }
            formatted = value[i] + formatted;
            count++;
        }
        input.value = formatted;
    } else {
        input.value = '';
    }
    
    // Update button states
    updateSubmitButtons();
}

// Handle transaction type selection
function handleTypeSelection(option) {
    const type = option.dataset.type;
    
    // Remove active from all options
    document.querySelectorAll('.type-option').forEach(opt => {
        opt.classList.remove('active', 'income', 'expense');
    });
    
    // Add active and type class to selected option
    option.classList.add('active', type);
    
    // Update category options
    updateCategoryOptions(type);
    
    // Show subsequent form groups
    showFormGroup('categoryGroup');
}

// Update category options based on type
function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    const categoryOptions = categories[type] || [];
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    
    categoryOptions.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Add event listener for category change
    categorySelect.addEventListener('change', function() {
        if (this.value) {
            showFormGroup('amountGroup');
        }
    });
}

// Show form group
function showFormGroup(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.remove('hidden');
        
        // Show next groups in sequence
        if (groupId === 'amountGroup') {
            setTimeout(() => showFormGroup('dateGroup'), 100);
        } else if (groupId === 'dateGroup') {
            setTimeout(() => showFormGroup('descriptionGroup'), 100);
        } else if (groupId === 'descriptionGroup') {
            setTimeout(() => showFormGroup('imageGroup'), 100);
        }
        
        updateSubmitButton();
    }
}

// Update submit button state
function updateSubmitButtons() {
    updateSubmitButton();
    updateSavingsSubmitButton();
    updateAddSavingsSubmitButton();
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const category = document.getElementById('category');
    const amount = document.getElementById('amountValue');
    const date = document.getElementById('date');
    
    if (submitBtn && category && amount && date) {
        const isValid = category.value && amount.value && date.value;
        submitBtn.disabled = !isValid;
    }
}

// Update savings submit button state
function updateSavingsSubmitButton() {
    const submitBtn = document.getElementById('savingsSubmitBtn');
    const goal = document.getElementById('savingsGoal');
    const target = document.getElementById('savingsTargetValue');
    
    if (submitBtn && goal && target) {
        const isValid = goal.value.trim() && target.value;
        submitBtn.disabled = !isValid;
    }
}

// Update add savings submit button state
function updateAddSavingsSubmitButton() {
    const submitBtn = document.getElementById('addSavingsSubmitBtn');
    const amount = document.getElementById('savingsAddAmountValue');
    
    if (submitBtn && amount) {
        const isValid = amount.value && parseInt(amount.value) > 0;
        submitBtn.disabled = !isValid;
    }
}

// Handle transaction form submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const type = document.querySelector('.type-option.active')?.dataset.type;
    const category = document.getElementById('category').value;
    const amount = parseInt(document.getElementById('amountValue').value);
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    
    if (!type || !category || !amount || !date) {
        return;
    }
    
    const transaction = {
        type,
        category,
        amount,
        date: new Date(date),
        description,
        timestamp: new Date(),
        userId: currentUser.uid,
        image: uploadedImage || null
    };
    
    try {
        await saveTransaction(transaction);
        resetTransactionForm();
        showPage('dashboard');
        updateReportsPage();
    } catch (error) {
        console.error('Error saving transaction:', error);
    }
}

// Handle edit form submission
async function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!editingTransaction) return;
    
    const type = document.getElementById('editType').value;
    const category = document.getElementById('editCategory').value;
    const amount = parseInt(document.getElementById('editAmountValue').value);
    const date = document.getElementById('editDate').value;
    const description = document.getElementById('editDescription').value;
    
    if (!type || !category || !amount || !date) {
        return;
    }
    
    const updatedTransaction = {
        ...editingTransaction,
        type,
        category,
        amount,
        date: new Date(date),
        description
    };
    
    try {
        await updateTransaction(editingTransaction.id, updatedTransaction);
        closeEditModal();
        updateUI();
        updateReportsPage();
    } catch (error) {
        console.error('Error updating transaction:', error);
    }
}

// Save transaction to Firebase with better error handling
async function saveTransaction(transaction) {
    const db = window.firebaseDb;
    
    if (db && currentUser.uid.indexOf('offline_') !== 0) {
        try {
            // If transaction has image, check size one more time
            if (transaction.image) {
                const sizeInBytes = Math.round((transaction.image.length * 3) / 4);
                console.log('Image size:', sizeInBytes, 'bytes');
                
                if (sizeInBytes > 1000000) { // 1MB limit for Firestore
                    console.warn('Image still too large for Firestore, saving without image');
                    // Save transaction without image to Firebase
                    const transactionWithoutImage = { ...transaction };
                    delete transactionWithoutImage.image;
                    await db.collection('users').doc(currentUser.email)
                        .collection('transactions').add(transactionWithoutImage);
                    
                    // Save full transaction (with image) locally only
                    saveTransactionLocally(transaction);
                    
                    alert('Transaksi berhasil disimpan! Gambar hanya tersimpan secara lokal karena ukuran file.');
                    console.log('Transaction saved to Firebase without image, full data saved locally');
                    return;
                }
            }
            
            await db.collection('users').doc(currentUser.email)
                .collection('transactions').add(transaction);
            console.log('Transaction saved to Firebase with image');
        } catch (error) {
            console.error('Firebase save failed:', error);
            
            // If it's an image size error, try saving without image
            if (error.message && error.message.includes('longer than')) {
                try {
                    const transactionWithoutImage = { ...transaction };
                    delete transactionWithoutImage.image;
                    await db.collection('users').doc(currentUser.email)
                        .collection('transactions').add(transactionWithoutImage);
                    
                    // Save full transaction locally
                    saveTransactionLocally(transaction);
                    
                    alert('Transaksi berhasil disimpan! Gambar hanya tersimpan secara lokal.');
                    console.log('Transaction saved to Firebase without image after error');
                    return;
                } catch (secondError) {
                    console.error('Second save attempt failed:', secondError);
                    saveTransactionLocally(transaction);
                }
            } else {
                saveTransactionLocally(transaction);
            }
        }
    } else {
        saveTransactionLocally(transaction);
    }
}

// Update transaction in Firebase
async function updateTransaction(transactionId, updatedTransaction) {
    const db = window.firebaseDb;
    
    if (db && currentUser.uid.indexOf('offline_') !== 0) {
        try {
            await db.collection('users').doc(currentUser.email)
                .collection('transactions').doc(transactionId).update(updatedTransaction);
            console.log('Transaction updated in Firebase');
        } catch (error) {
            console.error('Firebase update failed:', error);
            updateTransactionLocally(transactionId, updatedTransaction);
        }
    } else {
        updateTransactionLocally(transactionId, updatedTransaction);
    }
}

// Delete transaction from Firebase
async function deleteTransaction(transactionId) {
    const db = window.firebaseDb;
    
    if (db && currentUser.uid.indexOf('offline_') !== 0) {
        try {
            await db.collection('users').doc(currentUser.email)
                .collection('transactions').doc(transactionId).delete();
            console.log('Transaction deleted from Firebase');
        } catch (error) {
            console.error('Firebase delete failed:', error);
            deleteTransactionLocally(transactionId);
        }
    } else {
        deleteTransactionLocally(transactionId);
    }
}

// Save transaction locally
function saveTransactionLocally(transaction) {
    transaction.id = Date.now().toString();
    transactions.unshift(transaction);
    saveLocalData();
    updateUI();
    updateReportsPage();
}

// Update transaction locally
function updateTransactionLocally(transactionId, updatedTransaction) {
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updatedTransaction };
        saveLocalData();
        updateUI();
        updateReportsPage();
    }
}

// Delete transaction locally
function deleteTransactionLocally(transactionId) {
    transactions = transactions.filter(t => t.id !== transactionId);
    saveLocalData();
    updateUI();
    updateReportsPage();
}

// Reset transaction form
function resetTransactionForm() {
    const form = document.getElementById('transactionForm');
    if (form) form.reset();
    
    // Clear uploaded image
    uploadedImage = null;
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.innerHTML = '';
    
    // Hide form groups
    ['categoryGroup', 'amountGroup', 'dateGroup', 'descriptionGroup', 'imageGroup'].forEach(id => {
        const group = document.getElementById(id);
        if (group) group.classList.add('hidden');
    });
    
    // Reset type selector
    document.querySelectorAll('.type-option').forEach(opt => {
        opt.classList.remove('active', 'income', 'expense');
    });
    
    // Set default date
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    updateSubmitButton();
}

// Handle savings form submission
async function handleSavingsSubmit(e) {
    e.preventDefault();
    
    const goal = document.getElementById('savingsGoal').value;
    const target = parseInt(document.getElementById('savingsTargetValue').value);
    const initial = parseInt(document.getElementById('savingsInitialValue').value || '0');
    
    if (!goal || !target) {
        return;
    }
    
    const savingsGoal = {
        goal,
        target,
        current: initial,
        progress: (initial / target) * 100,
        timestamp: new Date(),
        userId: currentUser.uid
    };
    
    try {
        await saveSavingsGoal(savingsGoal);
        resetSavingsForm();
        hideSavingsForm();
        showSavingsGoalsList();
    } catch (error) {
        console.error('Error saving savings goal:', error);
    }
}

// Handle add savings form submission
async function handleAddSavingsSubmit(e) {
    e.preventDefault();
    
    const goalId = e.target.dataset.goalId;
    const addAmount = parseInt(document.getElementById('savingsAddAmountValue').value);
    
    if (!goalId || !addAmount) {
        return;
    }
    
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Show loading state
    const submitBtn = document.getElementById('addSavingsSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Menyimpan...';
    submitBtn.disabled = true;
    
    goal.current += addAmount;
    goal.progress = (goal.current / goal.target) * 100;
    
    try {
        await updateSavingsGoal(goalId, goal);
        closeAddSavingsModal();
        
        // Show success feedback
        showProgressUpdateFeedback(goalId, addAmount);
        
        // Re-render with animation delay
        setTimeout(() => {
            renderSavingsGoals();
        }, 300);
    } catch (error) {
        console.error('Error updating savings goal:', error);
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Show visual feedback when savings is updated
function showProgressUpdateFeedback(goalId, amount) {
    // Find the goal card and show animation
    const goalCards = document.querySelectorAll('.savings-goal-card');
    goalCards.forEach(card => {
        const addButton = card.querySelector(`[onclick="addToSavingsGoal('${goalId}')"]`);
        if (addButton) {
            // Create floating amount
            const floatingAmount = document.createElement('div');
            floatingAmount.innerHTML = `+${formatCurrency(amount)}`;
            floatingAmount.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #32E612, #2BD610);
                color: #000;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
                z-index: 1000;
                animation: floatUp 2s ease-out forwards;
                pointer-events: none;
            `;
            
            // Add CSS animation
            if (!document.getElementById('floatUpAnimation')) {
                const style = document.createElement('style');
                style.id = 'floatUpAnimation';
                style.textContent = `
                    @keyframes floatUp {
                        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                        40% { transform: translate(-50%, -50%) scale(1); }
                        60% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
                        100% { transform: translate(-50%, -150%) scale(0.8); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            card.style.position = 'relative';
            card.appendChild(floatingAmount);
            
            // Remove after animation
            setTimeout(() => {
                floatingAmount.remove();
            }, 2000);
        }
    });
}

// Save savings goal to Firebase
async function saveSavingsGoal(savingsGoal) {
    const db = window.firebaseDb;
    
    if (db && currentUser.uid.indexOf('offline_') !== 0) {
        try {
            await db.collection('users').doc(currentUser.email)
                .collection('savings').add(savingsGoal);
            console.log('Savings goal saved to Firebase');
        } catch (error) {
            console.error('Firebase save failed:', error);
            saveSavingsGoalLocally(savingsGoal);
        }
    } else {
        saveSavingsGoalLocally(savingsGoal);
    }
}

// Update savings goal in Firebase
async function updateSavingsGoal(goalId, updatedGoal) {
    const db = window.firebaseDb;
    
    if (db && currentUser.uid.indexOf('offline_') !== 0) {
        try {
            await db.collection('users').doc(currentUser.email)
                .collection('savings').doc(goalId).update(updatedGoal);
            console.log('Savings goal updated in Firebase');
        } catch (error) {
            console.error('Firebase update failed:', error);
            updateSavingsGoalLocally(goalId, updatedGoal);
        }
    } else {
        updateSavingsGoalLocally(goalId, updatedGoal);
    }
}

// Delete savings goal from Firebase
async function deleteSavingsGoal(goalId) {
    const db = window.firebaseDb;
    
    if (db && currentUser.uid.indexOf('offline_') !== 0) {
        try {
            await db.collection('users').doc(currentUser.email)
                .collection('savings').doc(goalId).delete();
            console.log('Savings goal deleted from Firebase');
        } catch (error) {
            console.error('Firebase delete failed:', error);
            deleteSavingsGoalLocally(goalId);
        }
    } else {
        deleteSavingsGoalLocally(goalId);
    }
}

// Save savings goal locally
function saveSavingsGoalLocally(savingsGoal) {
    savingsGoal.id = Date.now().toString();
    savingsGoals.push(savingsGoal);
    saveLocalData();
    renderSavingsGoals();
}

// Update savings goal locally
function updateSavingsGoalLocally(goalId, updatedGoal) {
    const index = savingsGoals.findIndex(g => g.id === goalId);
    if (index !== -1) {
        savingsGoals[index] = { ...savingsGoals[index], ...updatedGoal };
        saveLocalData();
        renderSavingsGoals();
    }
}

// Delete savings goal locally
function deleteSavingsGoalLocally(goalId) {
    savingsGoals = savingsGoals.filter(g => g.id !== goalId);
    saveLocalData();
    renderSavingsGoals();
}

// Reset savings form
function resetSavingsForm() {
    const form = document.getElementById('savingsForm');
    if (form) form.reset();
    updateSavingsSubmitButton();
}

// Navigation functions
function showPage(pageId) {
    console.log('Showing page:', pageId);
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const navBtn = document.querySelector(`[data-page="${pageId}"]`);
    if (navBtn) navBtn.classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    currentPage = pageId;
    
    // Update header elements
    const header = document.getElementById('mainHeader');
    const balanceCard = document.getElementById('balanceCard');
    const actionButtons = document.getElementById('actionButtons');
    
    if (header && balanceCard && actionButtons) {
        if (pageId === 'dashboard') {
            header.classList.remove('simple');
            balanceCard.classList.add('show');
            actionButtons.style.display = 'grid';
            updateStats();
            renderRecentTransactions();
            // Add small delay to ensure DOM is ready
            setTimeout(() => renderDashboardChart(), 100);
        } else {
            header.classList.add('simple');
            balanceCard.classList.remove('show');
            actionButtons.style.display = 'none';
        }
    }
    
    // Update specific pages
    if (pageId === 'reports') {
        setTimeout(() => updateReportsPage(), 100);
    } else if (pageId === 'history') {
        setTimeout(() => renderAllTransactions(), 100);
    } else if (pageId === 'add') {
        setTimeout(() => setupCurrencyInputs(), 100);
    }
}

function showAddTransaction(type = '') {
    showPage('add');
    
    if (type) {
        // Auto-select transaction type if provided
        const typeOption = document.querySelector(`[data-type="${type}"]`);
        if (typeOption) {
            setTimeout(() => handleTypeSelection(typeOption), 100);
        }
    } else {
        resetTransactionForm();
    }
}

// Update stats
function updateStats() {
    if (!balanceVisible || currentPage !== 'dashboard') return;
    
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const remainingBalance = totalIncome - totalExpense;
    
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = formatCurrency(remainingBalance);
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Balance Visibility Toggle
function toggleBalanceVisibility() {
    balanceVisible = !balanceVisible;
    const balanceElement = document.getElementById('totalBalance');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (balanceElement && eyeIcon) {
        if (balanceVisible) {
            updateStats();
            eyeIcon.innerHTML = '<path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>';
        } else {
            balanceElement.textContent = 'Rp ••••••';
            eyeIcon.innerHTML = '<path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z"/>';
        }
    }
}

// Update UI
function updateUI() {
    updateStats();
    renderRecentTransactions();
    renderDashboardChart();
}

// Render dashboard chart
function renderDashboardChart() {
    const container = document.getElementById('mainChart');
    if (!container) return;
    
    // Get last 7 days data
    const today = new Date();
    const chartData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const dayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.toDateString() === date.toDateString();
        });
        
        const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        chartData.push({
            date: date,
            income: income,
            expense: expense,
            label: date.toLocaleDateString('id-ID', { weekday: 'short' })
        });
    }
    
    // Find max value for scaling
    const maxValue = Math.max(
        ...chartData.map(d => Math.max(d.income, d.expense)),
        100000 // Minimum scale
    );
    
    // Generate chart HTML
    container.innerHTML = chartData.map(day => {
        const incomeHeight = (day.income / maxValue) * 100;
        const expenseHeight = (day.expense / maxValue) * 100;
        
        return `
            <div class="main-chart-day">
                <div class="main-chart-bars">
                    ${day.income > 0 ? `<div class="main-chart-bar income" style="height: ${incomeHeight}px;" title="Pemasukan: ${formatCurrency(day.income)}"></div>` : ''}
                    ${day.expense > 0 ? `<div class="main-chart-bar expense" style="height: ${expenseHeight}px;" title="Pengeluaran: ${formatCurrency(day.expense)}"></div>` : ''}
                    ${day.income === 0 && day.expense === 0 ? '<div class="main-chart-bar" style="height: 2px; background: #2A2A2A;"></div>' : ''}
                </div>
                <div class="main-chart-date">${day.label}</div>
            </div>
        `;
    }).join('');
}

// Rendering functions - FIXED EXPENSE ICONS WITH SIMPLE ARROWS
function renderRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">Belum Ada Transaksi</div>
                <div class="empty-text">Mulai tambahkan transaksi pertama Anda!</div>
            </div>
        `;
    } else {
        const recent = transactions.slice(0, 4);
        container.innerHTML = recent.map(transaction => `
            <div class="transaction-item" onclick="showTransactionDetail('${transaction.id}')">
                <div class="transaction-icon ${transaction.type}">
                    ${transaction.type === 'income' ? 
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7,10L12,15L17,10H7Z"/></svg>' :
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17,14L12,9L7,14H17Z"/></svg>'
                    }
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.category}</div>
                    <div class="transaction-subtitle">${transaction.description || 'No description'}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
    }
}

function renderAllTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">Belum Ada Transaksi</div>
                <div class="empty-text">Mulai tambahkan transaksi pertama Anda!</div>
            </div>
        `;
        return;
    }
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sortedTransactions.map(transaction => {
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        });
        
        return `
            <div class="transaction-item" onclick="showTransactionDetail('${transaction.id}')">
                <div class="transaction-icon ${transaction.type}">
                    ${transaction.type === 'income' ? 
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7,10L12,15L17,10H7Z"/></svg>' :
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17,14L12,9L7,14H17Z"/></svg>'
                    }
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.category}</div>
                    <div class="transaction-subtitle">${transaction.description || 'No description'} • ${formattedDate}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `;
    }).join('');
}

// Show transaction detail modal
function showTransactionDetail(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const modal = document.getElementById('transactionDetailModal');
    if (!modal) return;
    
    // Update modal content
    document.getElementById('detailType').textContent = transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    document.getElementById('detailCategory').textContent = transaction.category;
    document.getElementById('detailAmount').textContent = formatCurrency(transaction.amount);
    document.getElementById('detailDate').textContent = new Date(transaction.date).toLocaleDateString('id-ID');
    document.getElementById('detailDescription').textContent = transaction.description || 'Tidak ada keterangan';
    
    // Show/hide image
    const imageContainer = document.getElementById('detailImageContainer');
    const imageElement = document.getElementById('detailImage');
    if (transaction.image && imageContainer && imageElement) {
        imageElement.src = transaction.image;
        imageContainer.style.display = 'block';
    } else if (imageContainer) {
        imageContainer.style.display = 'none';
    }
    
    // Store current transaction for editing
    previewingTransaction = transaction;
    
    modal.style.display = 'block';
}

// Close transaction detail modal
function closeTransactionDetailModal() {
    const modal = document.getElementById('transactionDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
    previewingTransaction = null;
}

// Delete transaction from detail modal
function deleteTransactionFromDetail() {
    if (!previewingTransaction) return;
    const transactionId = previewingTransaction.id;
    closeTransactionDetailModal();
    deleteTransactionPrompt(transactionId);
}

// Edit transaction from detail modal
function editTransactionFromDetail() {
    if (!previewingTransaction) return;
    
    closeTransactionDetailModal();
    
    // Populate edit form
    editingTransaction = previewingTransaction;
    
    document.getElementById('editType').value = editingTransaction.type;
    updateEditCategoryOptions(editingTransaction.type);
    
    setTimeout(() => {
        document.getElementById('editCategory').value = editingTransaction.category;
        document.getElementById('editAmount').value = editingTransaction.amount.toLocaleString('id-ID');
        document.getElementById('editAmountValue').value = editingTransaction.amount;
        document.getElementById('editDate').value = new Date(editingTransaction.date).toISOString().split('T')[0];
        document.getElementById('editDescription').value = editingTransaction.description || '';
    }, 100);
    
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Update edit category options
function updateEditCategoryOptions(type) {
    const categorySelect = document.getElementById('editCategory');
    if (!categorySelect) return;
    
    const categoryOptions = categories[type] || [];
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    
    categoryOptions.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
    editingTransaction = null;
}

// Delete transaction prompt
function deleteTransactionPrompt(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">Hapus Transaksi</div>
            <div class="modal-body">
                <p>Apakah Anda yakin ingin menghapus transaksi ini?</p>
                <div class="transaction-preview">
                    <div class="transaction-icon ${transaction.type}">
                        ${transaction.type === 'income' ? 
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7,10L12,15L17,10H7Z"/></svg>' :
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17,14L12,9L7,14H17Z"/></svg>'
                        }
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-category">${transaction.category}</div>
                        <div class="transaction-date">${new Date(transaction.date).toLocaleDateString('id-ID')}</div>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Batal</button>
                <button type="button" class="btn btn-danger" onclick="deleteTransactionConfirmed('${transactionId}', this.closest('.modal'))">Hapus</button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) this.remove();
    });
    
    document.body.appendChild(modal);
}

// Delete transaction confirmed
async function deleteTransactionConfirmed(transactionId, modalElement) {
    try {
        await deleteTransaction(transactionId);
        if (modalElement) modalElement.remove();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        if (modalElement) modalElement.remove();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            ${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'} ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 300);
    }, 3000);
}

function renderSavingsGoals() {
    const container = document.getElementById('savingsGoalsList');
    if (!container) return;
    
    if (savingsGoals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">Belum Ada Target Tabungan</div>
                <div class="empty-text">Buat target tabungan pertama Anda!</div>
            </div>
        `;
    } else {
        container.innerHTML = savingsGoals.map(goal => {
            const progressPercentage = Math.min(goal.progress || 0, 100);
            const remaining = Math.max(0, goal.target - goal.current);
            
            return `
                <div class="savings-goal-card">
                    <div class="savings-goal-header">
                        <div class="savings-goal-info">
                            <h3>${goal.goal}</h3>
                            <div class="savings-goal-target">Target: ${formatCurrency(goal.target)}</div>
                        </div>
                        <div class="savings-goal-actions">
                            <button class="btn-small-icon btn-add-savings" onclick="addToSavingsGoal('${goal.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17,13H13V17H11V13H7V11H11V7H13V11H17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                </svg>
                            </button>
                            <button class="btn-small-icon btn-delete-savings" onclick="deleteSavingsGoal('${goal.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="savings-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <div class="progress-info">
                            <div class="progress-current">${formatCurrency(goal.current)}</div>
                            <div class="progress-percentage">${Math.round(progressPercentage)}%</div>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px; color: #8E8E93;">
                            Sisa: ${formatCurrency(remaining)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// PERBAIKAN: Fungsi untuk memfilter transaksi berdasarkan periode
function getFilteredTransactions(period) {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'month3':
            startDate.setMonth(now.getMonth() - 3);
            break;
        case 'month1': // For reports page
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'month2': // For reports page
            startDate.setMonth(now.getMonth() - 2);
            break;
        default:
            // Default to all time
            return transactions;
    }
    
    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= now;
    });
}

// PERBAIKAN: Update reports period filter function
function updateReportsPeriodFilter() {
    const periodFilter = document.getElementById('reportsPeriodFilter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            updateReportsPage();
        });
    }
}

// PERBAIKAN: Enhanced updateReportsPage function with period filtering
function updateReportsPage() {
    const periodFilter = document.getElementById('reportsPeriodFilter');
    const selectedPeriod = periodFilter ? periodFilter.value : 'month';
    
    updatePieChart(selectedPeriod);
    updateCategoryBreakdown(selectedPeriod);
    updatePeriodSummary(selectedPeriod);
}

// PERBAIKAN: Update pie chart with period filtering
function updatePieChart(period = 'month') {
    const filteredTransactions = getFilteredTransactions(period);
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    // Update pie chart
    const pieChart = document.getElementById('pieChart');
    const balanceInPie = document.getElementById('balanceInPie');
    const incomeInPie = document.getElementById('incomeInPie');
    const expenseInPie = document.getElementById('expenseInPie');
    
    if (pieChart && totalIncome + totalExpense > 0) {
        const incomeAngle = (totalIncome / (totalIncome + totalExpense)) * 360;
        pieChart.style.setProperty('--income-angle', `${incomeAngle}deg`);
    }
    
    if (balanceInPie) balanceInPie.textContent = formatCurrency(balance);
    if (incomeInPie) incomeInPie.textContent = formatCurrency(totalIncome);
    if (expenseInPie) expenseInPie.textContent = formatCurrency(totalExpense);
}

// PERBAIKAN: Update category breakdown with period filtering
function updateCategoryBreakdown(period = 'month') {
    const filteredTransactions = getFilteredTransactions(period);
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenseTransactions.forEach(transaction => {
        if (!categoryTotals[transaction.category]) {
            categoryTotals[transaction.category] = { amount: 0, count: 0 };
        }
        categoryTotals[transaction.category].amount += transaction.amount;
        categoryTotals[transaction.category].count += 1;
    });
    
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const container = document.getElementById('categoryBreakdown');
    
    if (container) {
        if (Object.keys(categoryTotals).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-title">Belum Ada Pengeluaran</div>
                    <div class="empty-text">Mulai catat pengeluaran Anda</div>
                </div>
            `;
        } else {
            const sortedCategories = Object.entries(categoryTotals)
                .sort(([,a], [,b]) => b.amount - a.amount);
            
            container.innerHTML = sortedCategories.map(([category, data]) => {
                const percentage = totalExpense > 0 ? (data.amount / totalExpense * 100).toFixed(1) : 0;
                const iconClass = category.toLowerCase().replace(/\s+/g, '');
                
                return `
                    <div class="category-item">
                        <div class="category-info">
                            <div class="category-icon ${iconClass}">
                                ${getCategoryIcon(category)}
                            </div>
                            <div class="category-details">
                                <div class="category-name">${category}</div>
                                <div class="category-count">${data.count} transaksi</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div class="category-amount">${formatCurrency(data.amount)}</div>
                            <div class="category-percentage">${percentage}%</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function getCategoryIcon(category) {
    const icons = {
        'Makanan': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.1,13.34L3.91,9.16C2.35,7.59 2.35,5.06 3.91,3.5L10.93,10.5L8.1,13.34M14.88,11.53C16.28,12.92 16.28,15.18 14.88,16.57C13.49,17.96 11.23,17.96 9.84,16.57L9.84,16.57C8.45,15.18 8.45,12.92 9.84,11.53L9.84,11.53C11.23,10.14 13.49,10.14 14.88,11.53L14.88,11.53M19.5,2L21,3.5L3.5,21L2,19.5L4.13,17.37C2.96,15.74 2.96,13.35 4.13,11.72L9.13,6.72C10.76,5.09 13.15,5.09 14.78,6.72C16.41,8.35 16.41,10.74 14.78,12.37L19.5,2Z"/></svg>',
        'Transport': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92,6.01C18.72,5.42 18.16,5 17.5,5H15V4A2,2 0 0,0 13,2H11A2,2 0 0,0 9,4V5H6.5C5.84,5 5.28,5.42 5.08,6.01L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6.01M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M5.81,10L7.13,6.5H16.87L18.19,10H5.81Z"/></svg>',
        'Hiburan': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17,3A2,2 0 0,1 19,5V15A2,2 0 0,1 17,17H13V19H14A1,1 0 0,1 15,20H22V22H15A1,1 0 0,1 14,21H10A1,1 0 0,1 9,22H2V20H9A1,1 0 0,1 10,19H11V17H7A2,2 0 0,1 5,15V5A2,2 0 0,1 7,3H17M17,5H7V15H17V5Z"/></svg>',
        'Belanja': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19,7H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M9,6A1,1 0 0,1 10,5H14A1,1 0 0,1 15,6V7H9V6M18,19A1,1 0 0,1 17,20H7A1,1 0 0,1 6,19V9H8V10A1,1 0 0,0 9,11A1,1 0 0,0 10,10V9H14V10A1,1 0 0,0 15,11A1,1 0 0,0 16,10V9H18V19Z"/></svg>',
        'Tagihan': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>',
        'Kesehatan': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H13V17H11V13H7V11H11V7H13V11H17V13Z"/></svg>',
        'Pendidikan': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/></svg>',
        'Gaji': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6.5A2,2 0 0,1 14,8.5A2,2 0 0,1 12,10.5A2,2 0 0,1 10,8.5A2,2 0 0,1 12,6.5M12,19A7,7 0 0,1 5,12A1,1 0 0,1 6,11A6,6 0 0,0 12,17A6,6 0 0,0 18,11A1,1 0 0,1 19,12A7,7 0 0,1 12,19Z"/></svg>',
        'Freelance': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/></svg>',
        'Bisnis': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,7V3H2V21H22V7H12M12,7H22V21H12V7M6,19H4V17H6V19M6,15H4V13H6V15M6,11H4V9H6V11M6,7H4V5H6V7M10,19H8V17H10V19M10,15H8V13H10V15M10,11H8V9H10V11M10,7H8V5H10V7M20,19H12V17H14V15H12V13H14V11H12V9H20V19Z"/></svg>',
        'Investasi': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/></svg>',
        'Bonus': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21A7,7 0 0,1 14,26H10A7,7 0 0,1 3,19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M5,16H4V17H5A5,5 0 0,0 10,12A5,5 0 0,0 5,7V16M19,7A5,5 0 0,0 14,12A5,5 0 0,0 19,17H20V16H19V7Z"/></svg>',
        'Hadiah': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,8A2,2 0 0,0 10,10H14A2,2 0 0,0 12,8M12,6A4,4 0 0,1 16,10H19V12H5V10H8A4,4 0 0,1 12,6M11,14V22H5V14H11M19,14V22H13V14H19Z"/></svg>',
        'Lainnya': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>'
    };
    return icons[category] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>';
}

// PERBAIKAN: Update period summary with period filtering
function updatePeriodSummary(period = 'month') {
    const container = document.getElementById('periodSummary');
    if (!container) return;
    
    const filteredTransactions = getFilteredTransactions(period);
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
    
    // Get period label
    const periodLabels = {
        'today': 'Hari Ini',
        'week': 'Minggu Ini', 
        'month': 'Bulan Ini',
        'month1': '1 Bulan Lalu',
        'month2': '2 Bulan Lalu',
        'month3': '3 Bulan Lalu'
    };
    
    const periodLabel = periodLabels[period] || 'Bulan Ini';
    
    container.innerHTML = `
        <div style="background: #2A2A2A; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
            <div style="text-align: center; color: #32E612; font-weight: 600; font-size: 14px;">
                Periode: ${periodLabel}
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card income">
                <div class="stat-value">${formatCurrency(totalIncome)}</div>
                <div class="stat-label">Total Pemasukan</div>
            </div>
            <div class="stat-card expense">
                <div class="stat-value">${formatCurrency(totalExpense)}</div>
                <div class="stat-label">Total Pengeluaran</div>
            </div>
        </div>
        <div style="background: #2A2A2A; padding: 16px; border-radius: 12px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #8E8E93;">Saldo Bersih:</span>
                <span style="color: ${balance >= 0 ? '#32E612' : '#FF453A'}; font-weight: 600;">${formatCurrency(balance)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #8E8E93;">Tingkat Tabungan:</span>
                <span style="color: #FFFFFF; font-weight: 600;">${savingsRate}%</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #8E8E93;">Total Transaksi:</span>
                <span style="color: #FFFFFF; font-weight: 600;">${filteredTransactions.length}</span>
            </div>
        </div>
    `;
}

// Savings functions
function showSavingsForm() {
    const formCard = document.getElementById('savingsFormCard');
    const listBtn = document.getElementById('savingsListBtn');
    const addBtn = document.getElementById('savingsAddButton');
    
    if (formCard && listBtn && addBtn) {
        formCard.style.display = 'block';
        listBtn.style.display = 'none';
        addBtn.style.display = 'none';
    }
    
    resetSavingsForm();
}

function hideSavingsForm() {
    const formCard = document.getElementById('savingsFormCard');
    const listBtn = document.getElementById('savingsListBtn');
    const addBtn = document.getElementById('savingsAddButton');
    
    if (formCard && listBtn && addBtn) {
        formCard.style.display = 'none';
        listBtn.style.display = 'block';
        addBtn.style.display = 'block';
    }
}

function showSavingsGoalsList() {
    const goalsList = document.getElementById('savingsGoalsList');
    const listBtn = document.getElementById('savingsListBtn');
    const addBtn = document.getElementById('savingsAddButton');
    
    if (goalsList && listBtn && addBtn) {
        if (savingsListVisible) {
            goalsList.style.display = 'none';
            savingsListVisible = false;
        } else {
            goalsList.style.display = 'block';
            renderSavingsGoals();
            savingsListVisible = true;
        }
    }
}

async function addToSavingsGoal(goalId) {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    const modal = document.getElementById('addSavingsModal');
    const form = document.getElementById('addSavingsForm');
    
    if (modal && form) {
        // Update modal content
        document.getElementById('savingsModalTarget').textContent = goal.goal + ' - ' + formatCurrency(goal.target);
        document.getElementById('savingsModalCurrent').textContent = formatCurrency(goal.current);
        document.getElementById('savingsModalRemaining').textContent = formatCurrency(Math.max(0, goal.target - goal.current));
        
        // Set goal ID on form
        form.dataset.goalId = goalId;
        
        // Reset amount input
        const addAmountInput = document.getElementById('savingsAddAmount');
        const addAmountValue = document.getElementById('savingsAddAmountValue');
        if (addAmountInput) {
            addAmountInput.value = '';
        }
        if (addAmountValue) {
            addAmountValue.value = '';
        }
        
        // Update button state
        updateAddSavingsSubmitButton();
        
        modal.style.display = 'block';
    }
}

// Image Upload Handler - FIXED with Compression
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 10MB for initial upload)
    if (file.size > 10 * 1024 * 1024) {
        alert('File terlalu besar! Maksimal 10MB.');
        event.target.value = '';
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar!');
        event.target.value = '';
        return;
    }
    
    // Show loading state
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #8E8E93;">
                <div class="loading-spinner" style="width: 30px; height: 30px; margin: 0 auto 10px;"></div>
                Memproses gambar...
            </div>
        `;
    }
    
    // Compress and resize image
    compressImage(file, 800, 600, 0.8).then(compressedDataUrl => {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `
                <div style="position: relative; display: inline-block; margin-top: 10px;">
                    <img src="${compressedDataUrl}" style="max-width: 100%; max-height: 120px; border-radius: 8px;">
                    <button type="button" onclick="removeImage()" style="position: absolute; top: -8px; right: -8px; background: #FF453A; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">×</button>
                </div>
            `;
        }
        uploadedImage = compressedDataUrl;
    }).catch(error => {
        console.error('Error compressing image:', error);
        alert('Gagal memproses gambar. Silakan coba lagi.');
        event.target.value = '';
        if (preview) preview.innerHTML = '';
    });
}

// Image compression function
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculate new dimensions
            let { width, height } = img;
            
            // Scale down if image is too large
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            // Set canvas size
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to data URL with compression
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Check if still too large for Firestore (max 900KB to be safe)
            const sizeInBytes = Math.round((compressedDataUrl.length * 3) / 4);
            if (sizeInBytes > 900 * 1024) {
                // Reduce quality further if still too large
                const newQuality = Math.max(0.3, quality * 0.7);
                if (newQuality >= 0.3) {
                    // Recursively compress with lower quality
                    compressImage(file, maxWidth * 0.8, maxHeight * 0.8, newQuality)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error('Gambar terlalu besar dan tidak bisa dikompres lebih lanjut.'));
                }
            } else {
                resolve(compressedDataUrl);
            }
        };
        
        img.onerror = function() {
            reject(new Error('Gagal memuat gambar.'));
        };
        
        // Load image
        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Gagal membaca file.'));
        reader.readAsDataURL(file);
    });
}

// Remove uploaded image - FIXED
function removeImage() {
    const preview = document.getElementById('imagePreview');
    const input = document.getElementById('imageInput');
    if (preview) preview.innerHTML = '';
    if (input) input.value = '';
    uploadedImage = null;
}

// Modal functions
function closeAddSavingsModal() {
    const modal = document.getElementById('addSavingsModal');
    if (modal) modal.style.display = 'none';
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    if (modal) modal.style.display = 'none';
}

// Export and clear data functions
async function exportData() {
    // Prepare CSV data with proper headers
    const csvData = [];
    
    // Add CSV Headers
    csvData.push(['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Keterangan']);
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add transaction data
    sortedTransactions.forEach(transaction => {
        const date = new Date(transaction.date).toLocaleDateString('id-ID');
        const type = transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const category = transaction.category;
        const amount = transaction.amount;
        const description = transaction.description || '';
        
        csvData.push([date, type, category, amount, description]);
    });
    
    // Add summary section
    csvData.push(['']); // Empty row
    csvData.push(['=== RINGKASAN KEUANGAN ===']);
    
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    csvData.push(['Total Pemasukan', '', '', totalIncome, '']);
    csvData.push(['Total Pengeluaran', '', '', totalExpense, '']);
    csvData.push(['Saldo Bersih', '', '', balance, '']);
    csvData.push(['Total Transaksi', '', '', transactions.length, '']);
    csvData.push(['Tanggal Export', '', '', new Date().toLocaleDateString('id-ID'), '']);
    csvData.push(['User', '', '', currentUser.displayName || currentUser.email, '']);
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
        row.map(cell => {
            // Handle cells that might contain commas or quotes
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')
    ).join('\n');
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-Keuangan-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show success message
    console.log('Data exported as CSV successfully');
}

// Export backup JSON function (for full backup)
async function exportBackup() {
    const data = {
        transactions,
        savingsGoals,
        exportDate: new Date(),
        user: currentUser.displayName || currentUser.email,
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Backup exported as JSON successfully');
}

async function clearAllData() {
    if (confirm('Yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!')) {
        // Clear Firebase data
        const db = window.firebaseDb;
        if (db && !currentUser.uid.startsWith('offline_')) {
            try {
                const userRef = db.collection('users').doc(currentUser.email);
                
                // Delete all transactions
                const transactionsSnapshot = await userRef.collection('transactions').get();
                const batch = db.batch();
                transactionsSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Delete all savings
                const savingsSnapshot = await userRef.collection('savings').get();
                savingsSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                console.log('All Firebase data cleared for user:', currentUser.email);
            } catch (error) {
                console.error('Error clearing Firebase data:', error);
            }
        }
        
        // Clear local data
        transactions = [];
        savingsGoals = [];
        saveLocalData();
        updateStats();
        renderRecentTransactions();
        renderSavingsGoals();
        updateReportsPage();
        renderDashboardChart();
        
        alert('Semua data berhasil dihapus!');
    }
}

// Placeholder functions for features to be implemented
function showChartDetail() { 
    const modal = document.getElementById('chartModal');
    if (modal) modal.style.display = 'block';
}

// Global functions that might be called from HTML
window.fillLogin = (email, password) => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
};

// Export all necessary functions to window object
window.loginWithCredentials = loginWithCredentials;
window.toggleRemember = toggleRemember;
window.showUserInfo = showUserInfo;
window.logout = logout;
window.showPage = showPage;
window.showAddTransaction = showAddTransaction;
window.toggleBalanceVisibility = toggleBalanceVisibility;
window.showChartDetail = showChartDetail;
window.exportData = exportData;
window.exportBackup = exportBackup;
window.clearAllData = clearAllData;
window.showSavingsForm = showSavingsForm;
window.showSavingsGoalsList = showSavingsGoalsList;
window.hideSavingsForm = hideSavingsForm;
window.addToSavingsGoal = addToSavingsGoal;
window.deleteSavingsGoal = deleteSavingsGoal;
window.closeAddSavingsModal = closeAddSavingsModal;
window.closeChartModal = closeChartModal;
window.handleImageUpload = handleImageUpload;
window.removeImage = removeImage;
window.formatCurrencyInput = formatCurrencyInput;
window.setupCurrencyInputs = setupCurrencyInputs;
window.showTransactionDetail = showTransactionDetail;
window.closeTransactionDetailModal = closeTransactionDetailModal;
window.editTransactionFromDetail = editTransactionFromDetail;
window.deleteTransactionFromDetail = deleteTransactionFromDetail;
window.closeEditModal = closeEditModal;
window.deleteTransactionPrompt = deleteTransactionPrompt;
window.deleteTransactionConfirmed = deleteTransactionConfirmed;
window.getFilteredTransactions = getFilteredTransactions;

console.log('Smart Finance Tracker script loaded successfully!');
