// Additional Helper Functions for Smart Finance App
// Add this to the end of script.js or include as separate file

// Image Upload Handler
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('File terlalu besar! Maksimal 2MB.');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `
                <div style="position: relative; display: inline-block; margin-top: 10px;">
                    <img src="${e.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 8px;">
                    <button type="button" onclick="removeImage()" style="position: absolute; top: -8px; right: -8px; background: #FF453A; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">×</button>
                </div>
            `;
        }
        uploadedImage = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Remove uploaded image
function removeImage() {
    const preview = document.getElementById('imagePreview');
    const input = document.getElementById('imageInput');
    if (preview) preview.innerHTML = '';
    if (input) input.value = '';
    uploadedImage = null;
}

// Modal Functions
function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.style.display = 'none';
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    if (modal) modal.style.display = 'none';
}

function closeAddSavingsModal() {
    const modal = document.getElementById('addSavingsModal');
    if (modal) modal.style.display = 'none';
}

// Enhanced Chart Detail Function
function showChartDetail() {
    const modal = document.getElementById('chartModal');
    if (modal) {
        modal.style.display = 'block';
        updateChartDetailStats();
    }
}

function updateChartDetailStats() {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const detailIncome = document.getElementById('detailIncome');
    const detailExpense = document.getElementById('detailExpense');
    
    if (detailIncome) detailIncome.textContent = formatCurrency(totalIncome);
    if (detailExpense) detailExpense.textContent = formatCurrency(totalExpense);
}

// Enhanced Reports Functions
function updateReportsPage() {
    const periodFilter = document.getElementById('reportsPeriodFilter');
    const selectedPeriod = periodFilter ? periodFilter.value : 'month';
    
    updatePieChart(selectedPeriod);
    updateCategoryBreakdown(selectedPeriod);
    updatePeriodSummary(selectedPeriod);
}

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
        'Makanan': '🍽️',
        'Transport': '🚗',
        'Hiburan': '🎉',
        'Belanja': '🛍️',
        'Tagihan': '📄',
        'Kesehatan': '⚕️',
        'Pendidikan': '📚',
        'Gaji': '💰',
        'Freelance': '💻',
        'Bisnis': '🏢',
        'Investasi': '📈',
        'Bonus': '🎁',
        'Hadiah': '🎀',
        'Lainnya': '📝'
    };
    return icons[category] || '📝';
}

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

// Enhanced History Functions
function updateHistoryPage() {
    renderAllTransactions();
    updateHistoryFilters();
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        ${transaction.type === 'income' ? 
                            '<path d="M7,10L12,15L17,10H7Z"/>' : 
                            '<path d="M7,10L12,15L17,10H7Z" style="transform: rotate(180deg);"/>'
                        }
                    </svg>
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

function updateHistoryFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        const allCategories = [...new Set(transactions.map(t => t.category))];
        categoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
            allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
}

function showTransactionDetail(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const modal = document.getElementById('previewModal');
    if (modal) {
        document.getElementById('previewType').textContent = transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        document.getElementById('previewCategory').textContent = transaction.category;
        document.getElementById('previewAmount').textContent = formatCurrency(transaction.amount);
        document.getElementById('previewDate').textContent = new Date(transaction.date).toLocaleDateString('id-ID');
        document.getElementById('previewDescription').textContent = transaction.description || 'Tidak ada keterangan';
        
        modal.style.display = 'block';
    }
}

// Enhanced Savings Functions
function updateSavingsSubmitButton() {
    const submitBtn = document.getElementById('savingsSubmitBtn');
    const goal = document.getElementById('savingsGoal');
    const target = document.getElementById('savingsTarget');
    
    if (submitBtn && goal && target) {
        const isValid = goal.value.trim() && target.value;
        submitBtn.disabled = !isValid;
    }
}

// Add event listeners for savings form validation
document.addEventListener('DOMContentLoaded', function() {
    const savingsGoal = document.getElementById('savingsGoal');
    const savingsTarget = document.getElementById('savingsTarget');
    
    if (savingsGoal) {
        savingsGoal.addEventListener('input', updateSavingsSubmitButton);
    }
    
    if (savingsTarget) {
        savingsTarget.addEventListener('change', updateSavingsSubmitButton);
    }
});

// Page Update Functions
function onPageChange(pageId) {
    currentPage = pageId;
    
    switch (pageId) {
        case 'dashboard':
            updateUI();
            break;
        case 'history':
            updateHistoryPage();
            break;
        case 'reports':
            // Reset to default period when opening reports
            const periodFilter = document.getElementById('reportsPeriodFilter');
            if (periodFilter) {
                periodFilter.value = 'month';
            }
            updateReportsPage();
            break;
        case 'add':
            resetTransactionForm();
            break;
        case 'savings':
            renderSavingsGoals();
            break;
    }
}

// Enhanced showPage function
const originalShowPage = window.showPage;
window.showPage = function(pageId) {
    originalShowPage(pageId);
    onPageChange(pageId);
};

// PERBAIKAN: Filter Functions dengan period filtering
function setupFilters() {
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const historyPeriodFilter = document.getElementById('historyPeriodFilter');
    const reportsPeriodFilter = document.getElementById('reportsPeriodFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', applyHistoryFilters);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyHistoryFilters);
    }
    
    if (historyPeriodFilter) {
        historyPeriodFilter.addEventListener('change', applyHistoryFilters);
    }
    
    if (reportsPeriodFilter) {
        reportsPeriodFilter.addEventListener('change', function() {
            updateReportsPage();
        });
    }
}

// PERBAIKAN: Enhanced applyHistoryFilters with period filtering
function applyHistoryFilters() {
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const periodFilter = document.getElementById('historyPeriodFilter');
    
    const selectedType = typeFilter ? typeFilter.value : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : '';
    const selectedPeriod = periodFilter ? periodFilter.value : 'month';
    
    // Get filtered transactions based on period
    let filteredTransactions = getFilteredTransactions(selectedPeriod);
    
    // Apply type filter
    if (selectedType) {
        filteredTransactions = filteredTransactions.filter(t => t.type === selectedType);
    }
    
    // Apply category filter
    if (selectedCategory) {
        filteredTransactions = filteredTransactions.filter(t => t.category === selectedCategory);
    }
    
    renderFilteredTransactions(filteredTransactions);
}

// PERBAIKAN: Function to render filtered transactions
function renderFilteredTransactions(filteredTransactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">Tidak Ada Transaksi</div>
                <div class="empty-text">Tidak ada transaksi yang sesuai dengan filter</div>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        ${transaction.type === 'income' ? 
                            '<path d="M7,10L12,15L17,10H7Z"/>' : 
                            '<path d="M7,10L12,15L17,10H7Z" style="transform: rotate(180deg);"/>'
                        }
                    </svg>
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

// Format currency input function
function formatCurrencyInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value) {
        input.value = formatCurrency(parseInt(value));
    }
}

// Enhanced initialization
const originalInitializeApp = window.initializeApp || function() {};
window.initializeApp = async function() {
    await originalInitializeApp();
    setupFilters();
};

// Global functions
window.handleImageUpload = handleImageUpload;
window.removeImage = removeImage;
window.closePreviewModal = closePreviewModal;
window.closeEditModal = closeEditModal;
window.closeChartModal = closeChartModal;
window.closeAddSavingsModal = closeAddSavingsModal;
window.showTransactionDetail = showTransactionDetail;
window.formatCurrencyInput = formatCurrencyInput;
window.updateSavingsSubmitButton = updateSavingsSubmitButton;
window.getFilteredTransactions = getFilteredTransactions;
window.applyHistoryFilters = applyHistoryFilters;
window.renderFilteredTransactions = renderFilteredTransactions;

console.log('Additional helper functions loaded successfully!');
