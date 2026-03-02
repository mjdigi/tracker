// =========================================================================
// FIREBASE V9 MODULAR SDK IMPORTS (CDN)
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    push, 
    onValue, 
    remove,
    update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// =========================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBuTQZ0zwLMLdfzzD2KjEhaGk6BTzJK72s",
    authDomain: "secondhand-803a3.firebaseapp.com",
    databaseURL: "https://secondhand-803a3-default-rtdb.firebaseio.com",
    projectId: "secondhand-803a3",
    storageBucket: "secondhand-803a3.firebasestorage.app",
    messagingSenderId: "554970268999",
    appId: "1:554970268999:web:d4f418e31c65ef8599f862",
    measurementId: "G-8D44TJDZ24"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Global Variables
let currentUser = null;
let dbUnsubscribe = null; 
let financeChartInstance = null;
let currentTransactions = [];

// =========================================================================
// 2. DOM ELEMENT SELECTION
// =========================================================================
const authContainer = document.getElementById('auth-container');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const transactionForm = document.getElementById('transaction-form');
const titleSuggestionsEl = document.getElementById('title-suggestions');
const submitTransBtn = document.getElementById('submit-trans-btn');

const appDashboard = document.getElementById('app-dashboard');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const themeToggle = document.getElementById('theme-toggle');

const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const unpaidEl = document.getElementById('total-unpaid');
const transactionListEl = document.getElementById('transaction-list');
const transLoader = document.getElementById('trans-loader');
const exportCsvBtn = document.getElementById('export-csv');

// Filter Elements (Home Dashboard)
const filterTypeEl = document.getElementById('filter-type');
const filterMonthInputs = document.getElementById('filter-month-inputs');
const filterDateInputs = document.getElementById('filter-date-inputs');
const filterYearInputs = document.getElementById('filter-year-inputs');
const applyFilterBtn = document.getElementById('apply-filter-btn');
const filterMonthVal = document.getElementById('filter-month-val');
const filterYearVal = document.getElementById('filter-year-val');
const filterYearMonthOptional = document.getElementById('filter-year-month-optional');
const filterDateStart = document.getElementById('filter-date-start');
const filterDateEnd = document.getElementById('filter-date-end');

// Profile Filter Element
const profileModeFilter = document.getElementById('profile-mode-filter');

// Initialize Filter Defaults
const now = new Date();
const currentY = now.getFullYear();
const currentM = String(now.getMonth() + 1).padStart(2, '0');
filterMonthVal.value = `${currentY}-${currentM}`;

for (let i = currentY - 5; i <= currentY + 5; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    if(i === currentY) opt.selected = true;
    filterYearVal.appendChild(opt);
}

// Filter Event Listeners
filterTypeEl.addEventListener('change', (e) => {
    filterMonthInputs.classList.add('hidden');
    filterDateInputs.classList.add('hidden');
    filterYearInputs.classList.add('hidden');
    
    if (e.target.value === 'month') filterMonthInputs.classList.remove('hidden');
    if (e.target.value === 'date') filterDateInputs.classList.remove('hidden');
    if (e.target.value === 'year') filterYearInputs.classList.remove('hidden');
});

applyFilterBtn.addEventListener('click', () => {
    updateDashboardUI();
});

profileModeFilter.addEventListener('change', () => {
    updateDashboardUI();
});

// =========================================================================
// 3. UTILITY FUNCTIONS
// =========================================================================
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUpToast 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const formatMoney = (amount) => {
    return '₹' + Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = document.getElementById(this.getAttribute('data-target'));
        if (input.type === 'password') {
            input.type = 'text';
            this.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

themeToggle.addEventListener('click', () => {
    const htmlEl = document.documentElement;
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    
    if(financeChartInstance) {
        updateDashboardUI(); 
    }
});

// =========================================================================
// 4. AUTHENTICATION LOGIC
// =========================================================================
showRegisterBtn.addEventListener('click', () => {
    loginModal.classList.remove('active');
    registerModal.classList.add('active');
});

showLoginBtn.addEventListener('click', () => {
    registerModal.classList.remove('active');
    loginModal.classList.add('active');
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        showToast('Account created successfully!');
        registerForm.reset();
    } catch (error) {
        showToast(error.message.replace('Firebase: ', ''), 'error');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Logged in successfully!');
        loginForm.reset();
    } catch (error) {
        showToast('Invalid credentials. Please try again.', 'error');
    }
});

document.getElementById('google-login-btn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
        showToast('Logged in with Google!');
    } catch (error) {
        showToast('Google Sign-In failed.', 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Logged out successfully.');
        window.switchView('view-home'); // Reset view for next login
    } catch (error) {
        showToast('Error logging out.', 'error');
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.remove('active');
        appDashboard.classList.remove('hidden');
        
        const displayName = user.displayName || user.email.split('@')[0];
        
        userDisplayName.textContent = displayName;
        document.getElementById('profile-name').textContent = displayName;
        document.getElementById('profile-email').textContent = user.email;

        const profileAvatar = document.getElementById('profile-avatar');
        if (user.photoURL) {
            profileAvatar.innerHTML = `<img src="${user.photoURL}" alt="Profile Image" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            profileAvatar.innerHTML = `<i class="fa-solid fa-circle-user"></i>`;
        }

        fetchTransactions();
    } else {
        currentUser = null;
        appDashboard.classList.add('hidden');
        authContainer.classList.add('active');
        loginModal.classList.add('active');
        registerModal.classList.remove('active');
        
        if (dbUnsubscribe) { dbUnsubscribe(); dbUnsubscribe = null; }
        currentTransactions = [];
        updateDashboardUI();
    }
});

// =========================================================================
// 5. DATABASE OPERATIONS (CRUD)
// =========================================================================
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('trans-title').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const type = document.querySelector('input[name="trans-type"]:checked').value;
    const mode = document.querySelector('input[name="trans-mode"]:checked').value;
    
    const editId = document.getElementById('edit-trans-id').value;

    try {
        if (editId) {
            const transRef = ref(db, `users/${currentUser.uid}/transactions/${editId}`);
            await update(transRef, {
                title: title,
                amount: amount,
                type: type,
                mode: mode
            });
            showToast('Transaction updated successfully!');
            
            document.getElementById('edit-trans-id').value = '';
            submitTransBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Transaction';
            
            window.switchView('view-profile'); 
        } else {
            const transactionData = {
                title,
                amount,
                type,
                mode,
                timestamp: Date.now()
            };
            const userTransRef = ref(db, `users/${currentUser.uid}/transactions`);
            await push(userTransRef, transactionData);
            showToast('Transaction added!');
        }
        
        transactionForm.reset();
    } catch (error) {
        showToast(editId ? 'Error updating transaction.' : 'Error adding transaction.', 'error');
    }
});

window.deleteTransaction = async (id) => {
    if (!currentUser) return;
    try {
        const transRef = ref(db, `users/${currentUser.uid}/transactions/${id}`);
        await remove(transRef);
        showToast('Transaction deleted.', 'error');
    } catch (error) {
        showToast('Failed to delete.', 'error');
    }
};

window.editTransaction = (id) => {
    if (!currentUser) return;
    const trans = currentTransactions.find(t => t.id === id);
    if(!trans) return;

    document.getElementById('edit-trans-id').value = trans.id;
    document.getElementById('trans-title').value = trans.title;
    document.getElementById('trans-amount').value = trans.amount;
    
    const typeRadio = document.querySelector(`input[name="trans-type"][value="${trans.type}"]`);
    if(typeRadio) typeRadio.checked = true;
    
    const modeRadio = document.querySelector(`input[name="trans-mode"][value="${trans.mode}"]`);
    if(modeRadio) modeRadio.checked = true;

    submitTransBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Update Transaction';
    
    window.switchView('view-add');
};

const fetchTransactions = () => {
    if (!currentUser) return;
    
    transLoader.classList.remove('hidden');
    const userTransRef = ref(db, `users/${currentUser.uid}/transactions`);
    
    dbUnsubscribe = onValue(userTransRef, (snapshot) => {
        transLoader.classList.add('hidden');
        currentTransactions = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (let id in data) {
                currentTransactions.push({ id, ...data[id] });
            }
            currentTransactions.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        updateDashboardUI();
    });
};

// =========================================================================
// 6. UI & CHART UPDATES (WITH DYNAMIC FILTER)
// =========================================================================
const updateDashboardUI = () => {
    transactionListEl.innerHTML = '';
    titleSuggestionsEl.innerHTML = ''; 
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalUnpaid = 0;
    let uniqueTitles = new Set();
    let displayedCount = 0;

    // ----- Home View Filter Configuration -----
    const filterType = filterTypeEl.value;
    let subtitleText = "(This Month)";
    
    if (filterType === 'month') {
        const mVal = filterMonthVal.value;
        if (mVal) {
            const [y, m] = mVal.split('-');
            const dateObj = new Date(y, m - 1);
            subtitleText = `(${dateObj.toLocaleString('default', { month: 'short' })} ${y})`;
        } else {
            subtitleText = `(All Time)`;
        }
    } else if (filterType === 'year') {
        const yVal = filterYearVal.value;
        const mVal = filterYearMonthOptional.value;
        if (mVal !== "") {
            const monthName = new Date(yVal, mVal).toLocaleString('default', { month: 'short' });
            subtitleText = `(${monthName} ${yVal})`;
        } else {
            subtitleText = `(${yVal})`;
        }
    } else if (filterType === 'date') {
        const sVal = filterDateStart.value;
        const eVal = filterDateEnd.value;
        if (sVal && eVal) subtitleText = `(${sVal} to ${eVal})`;
        else if (sVal) subtitleText = `(From ${sVal})`;
        else if (eVal) subtitleText = `(Up to ${eVal})`;
        else subtitleText = `(All Time)`;
    }
    
    document.querySelectorAll('.summary-subtitle').forEach(el => el.textContent = subtitleText);

    // Profile specific mode filter
    const selectedProfileMode = profileModeFilter.value;

    currentTransactions.forEach(trans => {
        const transDate = new Date(trans.timestamp);
        let isIncludedInStats = false;

        // Apply Home View Filters for Statistics Calculation
        if (filterType === 'month') {
            const mVal = filterMonthVal.value;
            if (mVal) {
                const [y, m] = mVal.split('-');
                if (transDate.getFullYear() == parseInt(y) && transDate.getMonth() == (parseInt(m) - 1)) {
                    isIncludedInStats = true;
                }
            } else {
                isIncludedInStats = true;
            }
        } else if (filterType === 'date') {
            const startVal = filterDateStart.value;
            const endVal = filterDateEnd.value;
            const start = startVal ? new Date(startVal).setHours(0,0,0,0) : null;
            const end = endVal ? new Date(endVal).setHours(23,59,59,999) : null;
            
            if (start && end) {
                isIncludedInStats = trans.timestamp >= start && trans.timestamp <= end;
            } else if (start) {
                isIncludedInStats = trans.timestamp >= start;
            } else if (end) {
                isIncludedInStats = trans.timestamp <= end;
            } else {
                isIncludedInStats = true; 
            }
        } else if (filterType === 'year') {
            const yVal = filterYearVal.value;
            const mVal = filterYearMonthOptional.value;
            if (transDate.getFullYear() == yVal) {
                if (mVal !== "") {
                    if (transDate.getMonth() == parseInt(mVal)) {
                        isIncludedInStats = true;
                    }
                } else {
                    isIncludedInStats = true;
                }
            }
        }

        if (isIncludedInStats) {
            if (trans.type === 'income') totalIncome += trans.amount;
            if (trans.type === 'expense') totalExpense += trans.amount;
            if (trans.mode === 'not-paid') totalUnpaid += trans.amount;
        }

        // Add to Add-Transaction autocomplete
        uniqueTitles.add(trans.title);

        // Apply Profile Mode Filter for Recent Transactions list
        const modeVal = trans.mode || 'cash';
        if (selectedProfileMode === 'all' || selectedProfileMode === modeVal) {
            displayedCount++;
            
            const li = document.createElement('li');
            li.classList.add('trans-item', trans.type === 'income' ? 'inc' : 'exp');
            
            let modeLabel = modeVal === 'not-paid' ? 'Not Paid' : (modeVal === 'online' ? 'Online' : 'Cash');
            
            let editBtnHTML = modeVal === 'not-paid' 
                ? `<button class="edit-btn" onclick="editTransaction('${trans.id}')" title="Edit Transaction"><i class="fa-solid fa-pen"></i></button>`
                : '';

            li.innerHTML = `
                <div class="trans-info">
                    <h4>${trans.title} <span class="badge ${modeVal}">${modeLabel}</span></h4>
                    <small>${formatDate(trans.timestamp)}</small>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="trans-amount">${trans.type === 'income' ? '+' : '-'}${formatMoney(trans.amount)}</span>
                    ${editBtnHTML}
                    <button class="del-btn" onclick="deleteTransaction('${trans.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            transactionListEl.appendChild(li);
        }
    });

    uniqueTitles.forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        titleSuggestionsEl.appendChild(option);
    });

    if (displayedCount === 0) {
        transactionListEl.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">No transactions found.</p>';
    }

    const totalBalance = totalIncome - totalExpense;

    balanceEl.textContent = formatMoney(totalBalance);
    incomeEl.textContent = formatMoney(totalIncome);
    expenseEl.textContent = formatMoney(totalExpense);
    unpaidEl.textContent = formatMoney(totalUnpaid);

    balanceEl.style.color = totalBalance < 0 ? 'var(--expense)' : (totalBalance > 0 ? 'var(--income)' : 'inherit');

    renderChart(totalIncome, totalExpense);
};

// =========================================================================
// 7. CHART.JS INTEGRATION 
// =========================================================================
const renderChart = (income = 0, expense = 0) => {
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#1e1b4b';

    if (financeChartInstance) {
        financeChartInstance.destroy();
    }

    const hasData = income > 0 || expense > 0;
    const chartLabels = hasData ? ['Income', 'Expense'] : ['No Data Yet'];
    const chartData = hasData ? [income, expense] : [1]; 
    const chartColors = hasData ? ['#10b981', '#ef4444'] : [isDark ? '#334155' : '#cbd5e1'];

    financeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 0,
                hoverOffset: hasData ? 4 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: 'Poppins' } }
                },
                tooltip: {
                    enabled: hasData 
                }
            },
            cutout: '70%'
        }
    });
};

// =========================================================================
// 8. EXPORT TO CSV 
// =========================================================================
exportCsvBtn.addEventListener('click', () => {
    const selectedMode = profileModeFilter.value;
    const filteredTransactions = currentTransactions.filter(row => {
        const mode = row.mode || 'cash';
        return selectedMode === 'all' || selectedMode === mode;
    });

    if(filteredTransactions.length === 0) {
        showToast('No data to export!', 'error');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Title,Type,Mode,Amount\n";

    filteredTransactions.forEach(row => {
        const date = new Date(row.timestamp).toLocaleDateString('en-IN');
        const mode = row.mode || 'cash';
        csvContent += `${date},"${row.title}",${row.type},${mode},${row.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions_fintrack.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('CSV downloaded!');
});

// =========================================================================
// 9. SPA NAVIGATION LOGIC (TABS & BOTTOM NAV)
// =========================================================================
const allNavLinks = document.querySelectorAll('.nav-item, .tab-item');
const views = document.querySelectorAll('.view-section');

window.switchView = (targetId) => {
    views.forEach(view => view.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    
    allNavLinks.forEach(link => {
        if (link.getAttribute('data-target') === targetId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if(targetId === 'view-home' && financeChartInstance) {
        setTimeout(() => financeChartInstance.resize(), 50);
    }
};

allNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); 
        const target = link.getAttribute('data-target');
        window.switchView(target);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });
});