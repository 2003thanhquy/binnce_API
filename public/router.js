// Simple Router for loading HTML pages
// API_BASE is defined in script.js

// Load page content
async function loadPage(pageName) {
    try {
        const response = await fetch(`pages/${pageName}.html`);
        if (!response.ok) {
            throw new Error(`Page not found: ${pageName}`);
        }
        const html = await response.text();
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = html;
        
        // Initialize page-specific scripts after loading
        initializePage(pageName);
    } catch (error) {
        console.error('Error loading page:', error);
        document.getElementById('content-area').innerHTML = `
            <div class="card">
                <h2>Lỗi</h2>
                <p>Không thể tải trang: ${pageName}</p>
                <p style="color: #999;">${error.message}</p>
            </div>
        `;
    }
}

// Initialize page-specific functionality
function initializePage(pageName) {
    // Load symbols for dropdowns if needed
    if (typeof loadSymbols === 'function') {
        loadSymbols().then(symbols => {
            // Check if symbols is a valid array
            if (!Array.isArray(symbols)) {
                console.warn('loadSymbols did not return an array:', symbols);
                return;
            }
            // Populate symbol dropdowns
            document.querySelectorAll('[data-symbol-dropdown]').forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Tất cả</option>';
                symbols.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.symbol;
                    option.textContent = s.symbol;
                    select.appendChild(option);
                });
                if (currentValue) {
                    select.value = currentValue;
                }
            });
        }).catch(error => {
            console.error('Error loading symbols:', error);
        });
    }
    
    // Initialize page-specific event listeners
    switch(pageName) {
        case 'place-order':
            // Setup place order form
            const orderForm = document.getElementById('orderForm');
            if (orderForm) {
                if (typeof handleOrderSubmit === 'function') {
                    orderForm.addEventListener('submit', handleOrderSubmit);
                }
                if (typeof togglePriceField === 'function') {
                    document.getElementById('type')?.addEventListener('change', togglePriceField);
                }
                if (typeof toggleScheduleField === 'function') {
                    document.getElementById('scheduleOrder')?.addEventListener('change', toggleScheduleField);
                }
                if (typeof handleSymbolChange === 'function') {
                    document.getElementById('symbol')?.addEventListener('change', handleSymbolChange);
                }
                if (typeof loadSymbols === 'function') {
                    document.getElementById('refreshSymbols')?.addEventListener('click', loadSymbols);
                }
                if (typeof handleQuantityTypeChange === 'function') {
                    document.getElementById('quantityType')?.addEventListener('change', handleQuantityTypeChange);
                }
                if (typeof toggleClosePositionAtTimeField === 'function') {
                    document.getElementById('closePositionAtTime')?.addEventListener('change', toggleClosePositionAtTimeField);
                }
                if (typeof handleClosePositionChange === 'function') {
                    document.getElementById('closePosition')?.addEventListener('change', handleClosePositionChange);
                }
            }
            break;
        case 'open-orders':
            if (typeof loadOpenOrders === 'function') loadOpenOrders();
            // Auto refresh every 10 minutes
            setInterval(() => {
                if (document.querySelector('.tab-btn[data-page="open-orders"]')?.classList.contains('active')) {
                    loadOpenOrders();
                }
            }, 10 * 60 * 1000);
            break;
        case 'positions':
            if (typeof loadPositions === 'function') loadPositions();
            // Auto refresh every 10 minutes
            setInterval(() => {
                if (document.querySelector('.tab-btn[data-page="positions"]')?.classList.contains('active')) {
                    loadPositions();
                }
            }, 10 * 60 * 1000);
            break;
        case 'scheduled':
            // Lần đầu vào tab: hiển thị loading + dữ liệu
            if (typeof refreshScheduledOrders === 'function') refreshScheduledOrders(true);
            // Auto refresh mỗi 5 giây nhưng KHÔNG hiển thị loading để tránh giật màn hình
            setInterval(() => {
                if (document.querySelector('.tab-btn[data-page="scheduled"]')?.classList.contains('active')) {
                    if (typeof refreshScheduledOrders === 'function') refreshScheduledOrders(false);
                }
            }, 5000);
            break;
        case 'history':
            if (typeof loadHistory === 'function') loadHistory();
            document.getElementById('historySymbol')?.addEventListener('change', loadHistory);
            break;
        case 'position-history':
            if (typeof loadPositionHistory === 'function') loadPositionHistory();
            document.getElementById('positionHistorySymbol')?.addEventListener('change', loadPositionHistory);
            break;
        case 'funding':
            // Setup funding tab switching
            const fundingIncomeTab = document.getElementById('fundingIncomeTab');
            const fundingRateCurrentTab = document.getElementById('fundingRateCurrentTab');
            const fundingRateTab = document.getElementById('fundingRateTab');
            if (fundingIncomeTab && fundingRateCurrentTab && fundingRateTab) {
                fundingIncomeTab.addEventListener('click', () => {
                    fundingIncomeTab.style.background = '#667eea';
                    fundingIncomeTab.style.color = 'white';
                    fundingRateCurrentTab.style.background = '#f5f5f5';
                    fundingRateCurrentTab.style.color = '#666';
                    fundingRateTab.style.background = '#f5f5f5';
                    fundingRateTab.style.color = '#666';
                    document.getElementById('fundingIncomeContent').style.display = 'block';
                    document.getElementById('fundingRateCurrentContent').style.display = 'none';
                    document.getElementById('fundingRateContent').style.display = 'none';
                    if (typeof loadFundingIncome === 'function') loadFundingIncome();
                });
                fundingRateCurrentTab.addEventListener('click', () => {
                    fundingRateCurrentTab.style.background = '#667eea';
                    fundingRateCurrentTab.style.color = 'white';
                    fundingIncomeTab.style.background = '#f5f5f5';
                    fundingIncomeTab.style.color = '#666';
                    fundingRateTab.style.background = '#f5f5f5';
                    fundingRateTab.style.color = '#666';
                    document.getElementById('fundingIncomeContent').style.display = 'none';
                    document.getElementById('fundingRateCurrentContent').style.display = 'block';
                    document.getElementById('fundingRateContent').style.display = 'none';
                    if (typeof loadFundingRateCurrent === 'function') loadFundingRateCurrent();
                });
                fundingRateTab.addEventListener('click', () => {
                    fundingRateTab.style.background = '#667eea';
                    fundingRateTab.style.color = 'white';
                    fundingIncomeTab.style.background = '#f5f5f5';
                    fundingIncomeTab.style.color = '#666';
                    fundingRateCurrentTab.style.background = '#f5f5f5';
                    fundingRateCurrentTab.style.color = '#666';
                    document.getElementById('fundingIncomeContent').style.display = 'none';
                    document.getElementById('fundingRateCurrentContent').style.display = 'none';
                    document.getElementById('fundingRateContent').style.display = 'block';
                    if (typeof loadFundingRate === 'function') loadFundingRate();
                });
            }
            // Setup funding event listeners
            document.getElementById('fundingIncomeSymbol')?.addEventListener('change', loadFundingIncome);
            document.getElementById('fundingIncomeSort')?.addEventListener('change', loadFundingIncome);
            document.getElementById('fundingIncomeLimit')?.addEventListener('change', loadFundingIncome);
            document.getElementById('exportFundingIncomeBtn')?.addEventListener('click', exportFundingIncomeCSV);
            document.getElementById('showFundingIncomeSummaryBtn')?.addEventListener('click', () => {
                const div = document.getElementById('fundingIncomeSummary');
                if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none';
            });
            document.getElementById('hideFundingIncomeSummaryBtn')?.addEventListener('click', () => {
                const div = document.getElementById('fundingIncomeSummary');
                if (div) div.style.display = 'none';
            });
            document.getElementById('loadFundingIncomeSummaryBtn')?.addEventListener('click', loadFundingIncomeSummary);
            
            // Funding Rate Current
            document.getElementById('loadFundingRateCurrentBtn')?.addEventListener('click', loadFundingRateCurrent);
            document.getElementById('fundingRateCurrentSymbol')?.addEventListener('change', loadFundingRateCurrent);
            document.getElementById('exportFundingRateCurrentBtn')?.addEventListener('click', exportFundingRateCurrentCSV);
            
            // Funding Rate History
            document.getElementById('fundingRateSymbol')?.addEventListener('change', loadFundingRate);
            document.getElementById('fundingRateSort')?.addEventListener('change', loadFundingRate);
            document.getElementById('fundingRateLimit')?.addEventListener('change', loadFundingRate);
            document.getElementById('exportFundingRateBtn')?.addEventListener('click', exportFundingRateCSV);
            
            if (typeof loadFundingIncome === 'function') loadFundingIncome();
            break;
        case 'market-data':
            // Setup market data tab switching
            const orderBookTab = document.getElementById('orderBookTab');
            const tradesTab = document.getElementById('tradesTab');
            const ticker24hrTab = document.getElementById('ticker24hrTab');
            if (orderBookTab && tradesTab && ticker24hrTab) {
                orderBookTab.addEventListener('click', () => {
                    orderBookTab.style.background = '#667eea';
                    orderBookTab.style.color = 'white';
                    tradesTab.style.background = '#f5f5f5';
                    tradesTab.style.color = '#666';
                    ticker24hrTab.style.background = '#f5f5f5';
                    ticker24hrTab.style.color = '#666';
                    document.getElementById('orderBookContent').style.display = 'block';
                    document.getElementById('tradesContent').style.display = 'none';
                    document.getElementById('ticker24hrContent').style.display = 'none';
                    if (typeof loadOrderBook === 'function') loadOrderBook();
                });
                tradesTab.addEventListener('click', () => {
                    tradesTab.style.background = '#667eea';
                    tradesTab.style.color = 'white';
                    orderBookTab.style.background = '#f5f5f5';
                    orderBookTab.style.color = '#666';
                    ticker24hrTab.style.background = '#f5f5f5';
                    ticker24hrTab.style.color = '#666';
                    document.getElementById('orderBookContent').style.display = 'none';
                    document.getElementById('tradesContent').style.display = 'block';
                    document.getElementById('ticker24hrContent').style.display = 'none';
                    if (typeof loadTrades === 'function') loadTrades();
                });
                ticker24hrTab.addEventListener('click', () => {
                    ticker24hrTab.style.background = '#667eea';
                    ticker24hrTab.style.color = 'white';
                    orderBookTab.style.background = '#f5f5f5';
                    orderBookTab.style.color = '#666';
                    tradesTab.style.background = '#f5f5f5';
                    tradesTab.style.color = '#666';
                    document.getElementById('orderBookContent').style.display = 'none';
                    document.getElementById('tradesContent').style.display = 'none';
                    document.getElementById('ticker24hrContent').style.display = 'block';
                    if (typeof loadTicker24hr === 'function') loadTicker24hr();
                });
            }
            document.getElementById('loadMarketDataBtn')?.addEventListener('click', () => {
                const symbol = document.getElementById('marketDataSymbol')?.value;
                if (!symbol) {
                    showNotification('Vui lòng chọn symbol', 'error');
                    return;
                }
                if (typeof loadOrderBook === 'function') loadOrderBook();
                if (typeof loadTrades === 'function') loadTrades();
                if (typeof loadTicker24hr === 'function') loadTicker24hr();
            });
            break;
        case 'liquidation':
            if (typeof loadLiquidation === 'function') loadLiquidation();
            document.getElementById('loadLiquidationBtn')?.addEventListener('click', loadLiquidation);
            document.getElementById('liquidationSymbol')?.addEventListener('change', loadLiquidation);
            document.getElementById('liquidationLimit')?.addEventListener('change', loadLiquidation);
            break;
        case 'account':
            // Setup account tab switching
            const accountSummaryTab = document.getElementById('accountSummaryTab');
            const accountBalanceTab = document.getElementById('accountBalanceTab');
            if (accountSummaryTab && accountBalanceTab) {
                accountSummaryTab.addEventListener('click', () => {
                    accountSummaryTab.style.background = '#667eea';
                    accountSummaryTab.style.color = 'white';
                    accountBalanceTab.style.background = '#f5f5f5';
                    accountBalanceTab.style.color = '#666';
                    document.getElementById('accountSummaryContent').style.display = 'block';
                    document.getElementById('accountBalanceContent').style.display = 'none';
                });
                accountBalanceTab.addEventListener('click', () => {
                    accountBalanceTab.style.background = '#667eea';
                    accountBalanceTab.style.color = 'white';
                    accountSummaryTab.style.background = '#f5f5f5';
                    accountSummaryTab.style.color = '#666';
                    document.getElementById('accountSummaryContent').style.display = 'none';
                    document.getElementById('accountBalanceContent').style.display = 'block';
                    if (typeof loadAccountBalance === 'function') loadAccountBalance();
                });
            }
            if (typeof loadAccount === 'function') loadAccount();
            if (typeof loadAccountBalance === 'function') loadAccountBalance();
            break;
    }
}

// Tab navigation
document.addEventListener('DOMContentLoaded', () => {
    // Set active tab
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Load page
            const pageName = btn.getAttribute('data-page');
            loadPage(pageName);
        });
    });
    
    // Load default page
    loadPage('place-order');
});

