// API Base URL
const API_BASE = window.location.origin;

// State
let symbols = [];
let selectedSymbol = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load symbols for dropdowns
    loadSymbols();
    
    // Setup global event listeners (only for elements that exist in index.html)
    setupEventListeners();
    
    // Note: Page-specific initialization is handled by router.js
    // refreshScheduledOrders(), updateQuantityHelp(), etc. are called when pages load
});

// Event Listeners
function setupEventListeners() {
    // Tab switching - removed because router.js handles this now
    // Note: Event listeners for page-specific elements are set up in router.js initializePage()
    
    // Only setup global listeners here that exist in index.html
    // Page-specific listeners are handled in router.js after page loads

    // Refresh symbols button (only if exists)
    const refreshSymbolsBtn = document.getElementById('refreshSymbols');
    if (refreshSymbolsBtn) {
        refreshSymbolsBtn.addEventListener('click', loadSymbols);
    }
    
    // Quantity type change (only if exists)
    const quantityTypeSelect = document.getElementById('quantityType');
    if (quantityTypeSelect) {
        quantityTypeSelect.addEventListener('change', handleQuantityTypeChange);
    }
    
    // Funding tab switching
    const fundingIncomeTab = document.getElementById('fundingIncomeTab');
    const fundingRateTab = document.getElementById('fundingRateTab');
    const fundingIncomeContent = document.getElementById('fundingIncomeContent');
    const fundingRateContent = document.getElementById('fundingRateContent');
    
    if (fundingIncomeTab && fundingRateTab && fundingIncomeContent && fundingRateContent) {
        fundingIncomeTab.addEventListener('click', () => {
            fundingIncomeTab.style.background = '#667eea';
            fundingIncomeTab.style.color = 'white';
            fundingRateTab.style.background = '#f5f5f5';
            fundingRateTab.style.color = '#666';
            fundingIncomeContent.style.display = 'block';
            fundingRateContent.style.display = 'none';
            loadFundingIncome();
        });
        
        fundingRateTab.addEventListener('click', () => {
            fundingRateTab.style.background = '#667eea';
            fundingRateTab.style.color = 'white';
            fundingIncomeTab.style.background = '#f5f5f5';
            fundingIncomeTab.style.color = '#666';
            fundingIncomeContent.style.display = 'none';
            fundingRateContent.style.display = 'block';
            loadFundingRate();
        });
    }
    
    // Add event listeners for symbol filters
    const positionHistorySymbol = document.getElementById('positionHistorySymbol');
    if (positionHistorySymbol) {
        positionHistorySymbol.addEventListener('change', loadPositionHistory);
    }
    
    const fundingIncomeSymbol = document.getElementById('fundingIncomeSymbol');
    if (fundingIncomeSymbol) {
        fundingIncomeSymbol.addEventListener('change', loadFundingIncome);
    }
    
    const fundingIncomeSort = document.getElementById('fundingIncomeSort');
    if (fundingIncomeSort) {
        fundingIncomeSort.addEventListener('change', loadFundingIncome);
    }
    
    const fundingIncomeLimit = document.getElementById('fundingIncomeLimit');
    if (fundingIncomeLimit) {
        fundingIncomeLimit.addEventListener('change', loadFundingIncome);
    }
    
    const exportFundingIncomeBtn = document.getElementById('exportFundingIncomeBtn');
    if (exportFundingIncomeBtn) {
        exportFundingIncomeBtn.addEventListener('click', exportFundingIncomeCSV);
    }
    
    const showFundingIncomeSummaryBtn = document.getElementById('showFundingIncomeSummaryBtn');
    if (showFundingIncomeSummaryBtn) {
        showFundingIncomeSummaryBtn.addEventListener('click', () => {
            const summaryDiv = document.getElementById('fundingIncomeSummary');
            if (summaryDiv) {
                summaryDiv.style.display = summaryDiv.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    const hideFundingIncomeSummaryBtn = document.getElementById('hideFundingIncomeSummaryBtn');
    if (hideFundingIncomeSummaryBtn) {
        hideFundingIncomeSummaryBtn.addEventListener('click', () => {
            const summaryDiv = document.getElementById('fundingIncomeSummary');
            if (summaryDiv) {
                summaryDiv.style.display = 'none';
            }
        });
    }
    
    const loadFundingIncomeSummaryBtn = document.getElementById('loadFundingIncomeSummaryBtn');
    if (loadFundingIncomeSummaryBtn) {
        loadFundingIncomeSummaryBtn.addEventListener('click', loadFundingIncomeSummary);
    }
    
    const fundingRateSymbol = document.getElementById('fundingRateSymbol');
    if (fundingRateSymbol) {
        fundingRateSymbol.addEventListener('change', loadFundingRate);
    }
    
    const fundingRateSort = document.getElementById('fundingRateSort');
    if (fundingRateSort) {
        fundingRateSort.addEventListener('change', loadFundingRate);
    }
    
    const fundingRateLimit = document.getElementById('fundingRateLimit');
    if (fundingRateLimit) {
        fundingRateLimit.addEventListener('change', loadFundingRate);
    }
    
    const exportFundingRateBtn = document.getElementById('exportFundingRateBtn');
    if (exportFundingRateBtn) {
        exportFundingRateBtn.addEventListener('click', exportFundingRateCSV);
    }
    
    // Market Data tab switching
    const orderBookTab = document.getElementById('orderBookTab');
    const tradesTab = document.getElementById('tradesTab');
    const ticker24hrTab = document.getElementById('ticker24hrTab');
    const orderBookContent = document.getElementById('orderBookContent');
    const tradesContent = document.getElementById('tradesContent');
    const ticker24hrContent = document.getElementById('ticker24hrContent');
    
    if (orderBookTab && tradesTab && ticker24hrTab) {
        orderBookTab.addEventListener('click', () => {
            orderBookTab.style.background = '#667eea';
            orderBookTab.style.color = 'white';
            tradesTab.style.background = '#f5f5f5';
            tradesTab.style.color = '#666';
            ticker24hrTab.style.background = '#f5f5f5';
            ticker24hrTab.style.color = '#666';
            orderBookContent.style.display = 'block';
            tradesContent.style.display = 'none';
            ticker24hrContent.style.display = 'none';
            loadOrderBook();
        });
        
        tradesTab.addEventListener('click', () => {
            tradesTab.style.background = '#667eea';
            tradesTab.style.color = 'white';
            orderBookTab.style.background = '#f5f5f5';
            orderBookTab.style.color = '#666';
            ticker24hrTab.style.background = '#f5f5f5';
            ticker24hrTab.style.color = '#666';
            orderBookContent.style.display = 'none';
            tradesContent.style.display = 'block';
            ticker24hrContent.style.display = 'none';
            loadTrades();
        });
        
        ticker24hrTab.addEventListener('click', () => {
            ticker24hrTab.style.background = '#667eea';
            ticker24hrTab.style.color = 'white';
            orderBookTab.style.background = '#f5f5f5';
            orderBookTab.style.color = '#666';
            tradesTab.style.background = '#f5f5f5';
            tradesTab.style.color = '#666';
            orderBookContent.style.display = 'none';
            tradesContent.style.display = 'none';
            ticker24hrContent.style.display = 'block';
            loadTicker24hr();
        });
    }
    
    const loadMarketDataBtn = document.getElementById('loadMarketDataBtn');
    if (loadMarketDataBtn) {
        loadMarketDataBtn.addEventListener('click', () => {
            const symbol = document.getElementById('marketDataSymbol')?.value;
            if (!symbol) {
                showNotification('Vui lòng chọn symbol', 'error');
                return;
            }
            loadOrderBook();
            loadTrades();
            loadTicker24hr();
        });
    }
    
    // Account tab switching
    const accountSummaryTab = document.getElementById('accountSummaryTab');
    const accountBalanceTab = document.getElementById('accountBalanceTab');
    const accountSummaryContent = document.getElementById('accountSummaryContent');
    const accountBalanceContent = document.getElementById('accountBalanceContent');
    
    if (accountSummaryTab && accountBalanceTab) {
        accountSummaryTab.addEventListener('click', () => {
            accountSummaryTab.style.background = '#667eea';
            accountSummaryTab.style.color = 'white';
            accountBalanceTab.style.background = '#f5f5f5';
            accountBalanceTab.style.color = '#666';
            accountSummaryContent.style.display = 'block';
            accountBalanceContent.style.display = 'none';
        });
        
        accountBalanceTab.addEventListener('click', () => {
            accountBalanceTab.style.background = '#667eea';
            accountBalanceTab.style.color = 'white';
            accountSummaryTab.style.background = '#f5f5f5';
            accountSummaryTab.style.color = '#666';
            accountSummaryContent.style.display = 'none';
            accountBalanceContent.style.display = 'block';
            loadAccountBalance();
        });
    }
    
    // Liquidation
    const loadLiquidationBtn = document.getElementById('loadLiquidationBtn');
    if (loadLiquidationBtn) {
        loadLiquidationBtn.addEventListener('click', loadLiquidation);
    }
    
    const liquidationSymbol = document.getElementById('liquidationSymbol');
    if (liquidationSymbol) {
        liquidationSymbol.addEventListener('change', loadLiquidation);
    }
    
    const liquidationLimit = document.getElementById('liquidationLimit');
    if (liquidationLimit) {
        liquidationLimit.addEventListener('change', loadLiquidation);
    }
    
    // Populate market data symbol dropdown
    const marketDataSymbol = document.getElementById('marketDataSymbol');
    if (marketDataSymbol) {
        loadSymbols().then(symbols => {
            symbols.forEach(s => {
                const option = document.createElement('option');
                option.value = s.symbol;
                option.textContent = s.symbol;
                marketDataSymbol.appendChild(option);
            });
        });
    }
    
    // Populate liquidation symbol dropdown
    if (liquidationSymbol) {
        loadSymbols().then(symbols => {
            symbols.forEach(s => {
                const option = document.createElement('option');
                option.value = s.symbol;
                option.textContent = s.symbol;
                liquidationSymbol.appendChild(option);
            });
        });
    }
}

// Tab Management
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // Tự động load dữ liệu khi vào tab
    if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'account') {
        loadAccount();
    } else if (tabName === 'scheduled') {
        refreshScheduledOrders();
    } else if (tabName === 'open-orders') {
        loadOpenOrders();
    } else if (tabName === 'positions') {
        loadPositions();
    } else if (tabName === 'position-history') {
        loadPositionHistory();
    } else if (tabName === 'funding') {
        loadFundingIncome();
    } else if (tabName === 'market-data') {
        // Market data tab - load symbols if needed
    } else if (tabName === 'liquidation') {
        loadLiquidation();
    } else if (tabName === 'account') {
        loadAccount();
        loadAccountBalance();
        loadFundingIncome();
    }
    
    // Auto refresh mỗi 5 giây khi đang ở tab này
    if (window.autoRefreshInterval) {
        clearInterval(window.autoRefreshInterval);
    }
    
    if (tabName === 'open-orders' || tabName === 'positions' || tabName === 'scheduled') {
        window.autoRefreshInterval = setInterval(() => {
            if (document.querySelector(`[data-tab="${tabName}"]`).classList.contains('active')) {
                if (tabName === 'open-orders') {
                    loadOpenOrders();
                } else if (tabName === 'positions') {
                    loadPositions();
                } else if (tabName === 'scheduled') {
                    refreshScheduledOrders();
                }
            }
        }, 5 * 1000); // Refresh mỗi 10 phút
    }
    
    // Restart countdown if schedule tab is active
    if (tabName === 'place-order' && document.getElementById('scheduleOrder').checked) {
        startCountdown();
    }
}

// Load Symbols
async function loadSymbols() {
    try {
        const response = await fetch(`${API_BASE}/api/symbols`);
        const data = await response.json();
        symbols = data;
        
        const symbolSelect = document.getElementById('symbol');
        const historySymbolSelect = document.getElementById('historySymbol');
        
        symbolSelect.innerHTML = '<option value="">Chọn cặp giao dịch</option>';
        historySymbolSelect.innerHTML = '<option value="">Tất cả</option>';
        
        data.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol.symbol;
            option.textContent = `${symbol.symbol} (${symbol.baseAsset}/${symbol.quoteAsset})`;
            symbolSelect.appendChild(option);
            
            const historyOption = option.cloneNode(true);
            historySymbolSelect.appendChild(historyOption);
            
            // Add to position history symbol select
            const positionHistorySymbolSelect = document.getElementById('positionHistorySymbol');
            if (positionHistorySymbolSelect) {
                const positionHistoryOption = option.cloneNode(true);
                positionHistorySymbolSelect.appendChild(positionHistoryOption);
            }
            
            // Add to funding income symbol select
            const fundingIncomeSymbolSelect = document.getElementById('fundingIncomeSymbol');
            if (fundingIncomeSymbolSelect) {
                const fundingIncomeOption = option.cloneNode(true);
                fundingIncomeSymbolSelect.appendChild(fundingIncomeOption);
            }
            
            // Add to funding rate symbol select
            const fundingRateSymbolSelect = document.getElementById('fundingRateSymbol');
            if (fundingRateSymbolSelect) {
                const fundingRateOption = option.cloneNode(true);
                fundingRateSymbolSelect.appendChild(fundingRateOption);
            }
        });
    } catch (error) {
        showNotification('Lỗi khi tải danh sách symbols: ' + error.message, 'error');
    }
}

// Handle Symbol Change
async function handleSymbolChange(e) {
    selectedSymbol = e.target.value;
    if (selectedSymbol) {
        await loadPrice(selectedSymbol);
        // Update quantity help text based on symbol
        updateQuantityHelp();
        // Check if symbol has position
        checkPositionForSymbol(selectedSymbol);
    }
}

// Check if symbol has position and update close position checkbox
async function checkPositionForSymbol(symbol) {
    try {
        const response = await fetch(`${API_BASE}/api/positions?symbol=${symbol}`);
        const closePositionCheckbox = document.getElementById('closePosition');
        const closePositionGroup = closePositionCheckbox.closest('.form-group');
        
        if (response.ok) {
            const positions = await response.json();
            
            if (positions.length > 0) {
                const position = positions[0];
                const positionAmt = position.positionAmt;
                const sideText = positionAmt > 0 ? 'LONG' : 'SHORT';
                const sideColor = positionAmt > 0 ? '#28a745' : '#dc3545';
                
                // Update label text (giữ checkbox, chỉ update text)
                const label = closePositionGroup.querySelector('label');
                const checkbox = closePositionGroup.querySelector('input[type="checkbox"]');
                
                // Tìm và update strong element (xóa các node text thừa)
                let textElement = label.querySelector('strong');
                if (!textElement) {
                    // Tạo strong element nếu chưa có
                    textElement = document.createElement('strong');
                    textElement.style.color = '#e74c3c';
                    // Xóa tất cả text nodes và append strong
                    Array.from(label.childNodes).forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            label.removeChild(node);
                        }
                    });
                    // Insert sau checkbox
                    if (checkbox.nextSibling) {
                        label.insertBefore(textElement, checkbox.nextSibling);
                    } else {
                        label.appendChild(textElement);
                    }
                }
                // Clear và set lại nội dung
                textElement.innerHTML = `🔴 Đóng vị thế ngay (Close Position) - <span style="color: ${sideColor}; font-weight: bold;">Hiện có: ${formatNumber(Math.abs(positionAmt))} hợp đồng ${sideText}</span>`;
                
                // Update small text
                const small = closePositionGroup.querySelector('small');
                if (small) {
                    small.textContent = `Đóng toàn bộ vị thế ${symbol}. Hệ thống sẽ tự động đặt lệnh MARKET ${sideText === 'LONG' ? 'SELL' : 'BUY'} với số lượng ${formatNumber(Math.abs(positionAmt))} hợp đồng và reduceOnly=true.`;
                }
                
                // Re-attach event listener nếu cần
                if (checkbox) {
                    checkbox.removeEventListener('change', handleClosePositionChange);
                    checkbox.addEventListener('change', handleClosePositionChange);
                }
            } else {
                // No position - reset về text mặc định
                const label = closePositionGroup.querySelector('label');
                const checkbox = closePositionGroup.querySelector('input[type="checkbox"]');
                let textElement = label.querySelector('strong');
                
                if (!textElement) {
                    textElement = document.createElement('strong');
                    textElement.style.color = '#e74c3c';
                    // Xóa text nodes thừa
                    Array.from(label.childNodes).forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            label.removeChild(node);
                        }
                    });
                    // Insert sau checkbox
                    if (checkbox.nextSibling) {
                        label.insertBefore(textElement, checkbox.nextSibling);
                    } else {
                        label.appendChild(textElement);
                    }
                }
                // Clear và set lại nội dung
                textElement.textContent = '🔴 Đóng vị thế ngay (Close Position)';
                
                const small = closePositionGroup.querySelector('small');
                if (small) {
                    small.textContent = 'Đóng toàn bộ vị thế đang mở của symbol này ngay lập tức. Hệ thống sẽ tự động tính số lượng và đặt lệnh MARKET với reduceOnly.';
                }
                
                if (checkbox) {
                    checkbox.removeEventListener('change', handleClosePositionChange);
                    checkbox.addEventListener('change', handleClosePositionChange);
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra vị thế:', error);
    }
}

// Handle close position checkbox change
function handleClosePositionChange() {
    const isChecked = this.checked;
    const quantityInput = document.getElementById('quantity');
    const quantityTypeSelect = document.getElementById('quantityType');
    const priceInput = document.getElementById('price');
    const typeSelect = document.getElementById('type');
    const sideSelect = document.getElementById('side');
    const leverageInput = document.getElementById('leverage');
    
    if (isChecked) {
        // Disable inputs when closing position
        quantityInput.disabled = true;
        quantityTypeSelect.disabled = true;
        priceInput.disabled = true;
        typeSelect.disabled = true;
        sideSelect.disabled = true;
        leverageInput.disabled = true;
        quantityInput.required = false;
    } else {
        // Enable inputs
        quantityInput.disabled = false;
        quantityTypeSelect.disabled = false;
        priceInput.disabled = false;
        typeSelect.disabled = false;
        sideSelect.disabled = false;
        leverageInput.disabled = false;
        quantityInput.required = true;
    }
}

// Handle Quantity Type Change
function handleQuantityTypeChange() {
    updateQuantityHelp();
}

// Update quantity help text
function updateQuantityHelp() {
    const quantityType = document.getElementById('quantityType').value;
    const quantityLabel = document.getElementById('quantityLabel');
    const quantityHelp = document.getElementById('quantityHelp');
    const quantityInput = document.getElementById('quantity');
    
    if (quantityType === 'usdt') {
        quantityLabel.textContent = '💰 Số tiền (USDT):';
        quantityHelp.innerHTML = `
            <strong>Nhập số tiền USDT bạn muốn sử dụng.</strong><br>
            Hệ thống sẽ tự động tính số lượng hợp đồng dựa trên:<br>
            • Giá hiện tại của coin<br>
            • Đòn bẩy bạn chọn<br><br>
            <strong>Ví dụ:</strong> Nhập 10 USDT với đòn bẩy 10x = 100 USDT giá trị, hệ thống tự tính số hợp đồng.<br>
            <strong>Khuyên dùng:</strong> Cách này dễ hiểu và an toàn hơn.
        `;
        quantityInput.step = '0.01';
    } else {
        quantityLabel.textContent = '📊 Số lượng hợp đồng:';
        quantityHelp.innerHTML = `
            <strong>Nhập trực tiếp số lượng hợp đồng.</strong><br>
            <strong>Hợp đồng là gì?</strong> Mỗi hợp đồng = 1 đơn vị của coin.<br>
            Ví dụ: 1 hợp đồng BTCUSDT = 1 BTC, 100 hợp đồng TURBOUSDT = 100 TURBO.<br><br>
            <strong>Lưu ý:</strong> Bạn cần tự tính số tiền = Số hợp đồng × Giá hiện tại / Đòn bẩy
        `;
        quantityInput.step = '0.001';
    }
}

// Load Price
async function loadPrice(symbol) {
    try {
        const response = await fetch(`${API_BASE}/api/price/${symbol}`);
        const data = await response.json();
        const priceInfo = document.getElementById('priceInfo');
        priceInfo.textContent = `Giá hiện tại: ${formatNumber(data.price)} USDT`;
        
        // Auto-fill price if limit order
        const type = document.getElementById('type').value;
        if (type === 'LIMIT' && !document.getElementById('price').value) {
            document.getElementById('price').value = data.price.toFixed(2);
        }
    } catch (error) {
        console.error('Lỗi khi lấy giá:', error);
    }
}

// Toggle Price Field
function togglePriceField() {
    const type = document.getElementById('type').value;
    const priceGroup = document.getElementById('priceGroup');
    if (type === 'LIMIT') {
        priceGroup.style.display = 'block';
        if (selectedSymbol) {
            loadPrice(selectedSymbol);
        }
    } else {
        priceGroup.style.display = 'none';
    }
}

// Toggle Schedule Field
function toggleScheduleField() {
    const scheduleOrder = document.getElementById('scheduleOrder');
    if (!scheduleOrder) return;
    
    const scheduleFields = document.getElementById('scheduleFields');
    if (!scheduleFields) return;
    
    if (scheduleOrder.checked) {
        scheduleFields.style.display = 'block';
        // Set default time to 10 minutes from now
        const now = new Date();
        const targetTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
        
        // Set default values
        const scheduleDate = document.getElementById('scheduleDate');
        const scheduleHour = document.getElementById('scheduleHour');
        const scheduleMinute = document.getElementById('scheduleMinute');
        const scheduleSecond = document.getElementById('scheduleSecond');
        
        if (scheduleDate) scheduleDate.value = formatDate(targetTime);
        if (scheduleHour !== null) scheduleHour.value = targetTime.getHours();
        if (scheduleMinute !== null) scheduleMinute.value = targetTime.getMinutes();
        if (scheduleSecond !== null) scheduleSecond.value = targetTime.getSeconds();
        
        // Auto set close position time to 2 minutes after scheduled time
        const closePositionTime = new Date(targetTime.getTime() + 2 * 60 * 1000);
        const closePositionDate = document.getElementById('closePositionDate');
        const closePositionHour = document.getElementById('closePositionHour');
        const closePositionMinute = document.getElementById('closePositionMinute');
        const closePositionSecond = document.getElementById('closePositionSecond');
        
        if (closePositionDate) closePositionDate.value = formatDate(closePositionTime);
        if (closePositionHour !== null) closePositionHour.value = closePositionTime.getHours();
        if (closePositionMinute !== null) closePositionMinute.value = closePositionTime.getMinutes();
        if (closePositionSecond !== null) closePositionSecond.value = closePositionTime.getSeconds();
        
        // Start countdown
        if (typeof startCountdown === 'function') {
            startCountdown();
        }
    } else {
        scheduleFields.style.display = 'none';
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }
    }
}

// Toggle Close Position At Time Field
function toggleClosePositionAtTimeField() {
    const closePositionAtTime = document.getElementById('closePositionAtTime');
    const closePositionTimeFields = document.getElementById('closePositionTimeFields');
    
    if (closePositionAtTime && closePositionTimeFields) {
        closePositionTimeFields.style.display = closePositionAtTime.checked ? 'block' : 'none';
        
        // Auto set default time if checked
        if (closePositionAtTime.checked) {
            const scheduleDate = document.getElementById('scheduleDate')?.value;
            const scheduleHour = document.getElementById('scheduleHour')?.value;
            const scheduleMinute = document.getElementById('scheduleMinute')?.value;
            const scheduleSecond = document.getElementById('scheduleSecond')?.value;
            
            if (scheduleDate && scheduleHour !== null && scheduleMinute !== null && scheduleSecond !== null) {
                // Set close position time to 2 minutes after scheduled time
                const scheduledTime = new Date(`${scheduleDate}T${String(scheduleHour).padStart(2, '0')}:${String(scheduleMinute).padStart(2, '0')}:${String(scheduleSecond).padStart(2, '0')}`);
                const closePositionTime = new Date(scheduledTime.getTime() + 2 * 60 * 1000); // 2 minutes after
                
                document.getElementById('closePositionDate').value = formatDate(closePositionTime);
                document.getElementById('closePositionHour').value = closePositionTime.getHours();
                document.getElementById('closePositionMinute').value = closePositionTime.getMinutes();
                document.getElementById('closePositionSecond').value = closePositionTime.getSeconds();
            }
        }
    }
}

// Format date for input[type="date"]
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Start countdown timer
function startCountdown() {
    clearInterval(window.countdownInterval);
    
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) {
        // Countdown element doesn't exist on this page, skip
        return;
    }
    
    const updateCountdown = () => {
        const scheduleDateEl = document.getElementById('scheduleDate');
        const scheduleHourEl = document.getElementById('scheduleHour');
        const scheduleMinuteEl = document.getElementById('scheduleMinute');
        const scheduleSecondEl = document.getElementById('scheduleSecond');
        const countdownEl = document.getElementById('countdown');
        
        if (!scheduleDateEl || !scheduleHourEl || !scheduleMinuteEl || !scheduleSecondEl || !countdownEl) {
            return;
        }
        
        const date = scheduleDateEl.value;
        const hour = parseInt(scheduleHourEl.value) || 0;
        const minute = parseInt(scheduleMinuteEl.value) || 0;
        const second = parseInt(scheduleSecondEl.value) || 0;
        
        if (!date) {
            countdownEl.textContent = 'Vui lòng chọn ngày';
            return;
        }
        
        const targetTime = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
        const now = new Date();
        const diff = targetTime.getTime() - now.getTime();
        
        if (diff <= 0) {
            countdownEl.textContent = '⚠️ Thời gian đã qua';
            countdownEl.style.color = '#dc3545';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        let countdownText = '';
        if (days > 0) countdownText += `${days} ngày `;
        if (hours > 0 || days > 0) countdownText += `${hours} giờ `;
        if (minutes > 0 || hours > 0 || days > 0) countdownText += `${minutes} phút `;
        countdownText += `${seconds} giây`;
        
        countdownEl.textContent = `⏰ Còn lại: ${countdownText}`;
        countdownEl.style.color = '#667eea';
    };
    
    updateCountdown();
    window.countdownInterval = setInterval(updateCountdown, 1000);
    
    // Update countdown when time inputs change
    ['scheduleDate', 'scheduleHour', 'scheduleMinute', 'scheduleSecond'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateCountdown);
            element.addEventListener('input', updateCountdown);
        }
    });
}

// Handle Order Submit
async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const closePosition = formData.get('closePosition') === 'on';
    const symbol = formData.get('symbol');
    
    // Nếu chọn đóng vị thế, gọi API đóng vị thế
    if (closePosition && symbol) {
        try {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang đóng vị thế...';

            const response = await fetch(`${API_BASE}/api/close-position`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol })
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(`✅ ${result.message || 'Đã đặt lệnh đóng vị thế'}`, 'success');
                e.target.reset();
                togglePriceField();
                toggleScheduleField();
                // Refresh positions và open orders
                if (document.getElementById('positions').classList.contains('active')) {
                    loadPositions();
                }
                if (document.getElementById('open-orders').classList.contains('active')) {
                    loadOpenOrders();
                }
            } else {
                showNotification('❌ Lỗi: ' + result.error, 'error');
            }
        } catch (error) {
            showNotification('❌ Lỗi: ' + error.message, 'error');
        } finally {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đặt Lệnh';
        }
        return;
    }
    
    const quantityType = formData.get('quantityType');
    const quantity = parseFloat(formData.get('quantity'));
    const leverage = parseInt(formData.get('leverage')) || 1;
    
    let finalQuantity = quantity;
    
    // Nếu chọn theo USDT, cần tính số lượng hợp đồng
    if (quantityType === 'usdt' && selectedSymbol) {
        try {
            // Lấy giá và thông tin precision
            const [priceResponse, symbolInfoResponse] = await Promise.all([
                fetch(`${API_BASE}/api/price/${selectedSymbol}`),
                fetch(`${API_BASE}/api/symbol-info/${selectedSymbol}`)
            ]);
            
            const priceData = await priceResponse.json();
            const symbolInfo = await symbolInfoResponse.json();
            
            const currentPrice = priceData.price;
            // Tính số lượng hợp đồng = (Số tiền USDT * Đòn bẩy) / Giá hiện tại
            let calculatedQuantity = (quantity * leverage) / currentPrice;
            
            console.log(`Tính toán: ${quantity} USDT × ${leverage}x = ${(quantity * leverage).toFixed(2)} USDT`);
            console.log(`Giá hiện tại: ${currentPrice}`);
            console.log(`Số lượng tính được: ${calculatedQuantity}`);
            
            // Làm tròn theo precision
            if (symbolInfo.stepSize && symbolInfo.stepSize > 0) {
                const stepSize = symbolInfo.stepSize;
                // Làm tròn xuống về bội số của stepSize
                calculatedQuantity = Math.floor(calculatedQuantity / stepSize) * stepSize;
                console.log(`Sau khi làm tròn theo stepSize (${stepSize}): ${calculatedQuantity}`);
            }
            
            // Làm tròn theo số chữ số thập phân
            finalQuantity = parseFloat(calculatedQuantity.toFixed(symbolInfo.quantityPrecision || 8));
            
            // Kiểm tra nếu làm tròn thành 0
            if (finalQuantity <= 0) {
                // Tính số lượng tối thiểu để đạt được notional 5 USDT
                const MIN_NOTIONAL = 5;
                const minQuantityNeeded = MIN_NOTIONAL / currentPrice;
                
                // Làm tròn lên theo stepSize
                let adjustedQuantity = minQuantityNeeded;
                if (symbolInfo.stepSize && symbolInfo.stepSize > 0) {
                    adjustedQuantity = Math.ceil(minQuantityNeeded / symbolInfo.stepSize) * symbolInfo.stepSize;
                }
                adjustedQuantity = parseFloat(adjustedQuantity.toFixed(symbolInfo.quantityPrecision || 8));
                
                const minUsdtNeeded = (adjustedQuantity * currentPrice) / leverage;
                
                showNotification(
                    `❌ Số tiền ${quantity} USDT với đòn bẩy ${leverage}x quá nhỏ. ` +
                    `Sau khi làm tròn, số lượng hợp đồng = 0. ` +
                    `Cần tối thiểu ${minUsdtNeeded.toFixed(4)} USDT (≈${adjustedQuantity} hợp đồng × ${currentPrice.toFixed(8)} / ${leverage}x)`,
                    'error'
                );
                return;
            }
            
            // Tính notional và kiểm tra minimum
            const notional = finalQuantity * currentPrice;
            const MIN_NOTIONAL = 5;
            
            if (notional < MIN_NOTIONAL) {
                // Tính số lượng tối thiểu
                const minQuantity = Math.ceil(MIN_NOTIONAL / currentPrice / (symbolInfo.stepSize || 1)) * (symbolInfo.stepSize || 1);
                const adjustedQuantity = parseFloat(minQuantity.toFixed(symbolInfo.quantityPrecision || 8));
                const minUsdtNeeded = (adjustedQuantity * currentPrice) / leverage;
                
                showNotification(
                    `⚠️ Cảnh báo: Giá trị lệnh (${notional.toFixed(2)} USDT) nhỏ hơn tối thiểu ${MIN_NOTIONAL} USDT. ` +
                    `Cần tối thiểu ${minUsdtNeeded.toFixed(4)} USDT để đạt ${adjustedQuantity} hợp đồng (≈${(adjustedQuantity * currentPrice).toFixed(2)} USDT)`,
                    'error'
                );
                return;
            }
            
            // Hiển thị thông báo số lượng đã được làm tròn
            if (Math.abs(finalQuantity - (quantity * leverage) / currentPrice) > 0.0001) {
                console.log(`Số lượng đã được làm tròn từ ${(quantity * leverage) / currentPrice} thành ${finalQuantity}`);
            }
            
            // Hiển thị thông tin notional
            console.log(`Notional: ${notional.toFixed(2)} USDT (${finalQuantity} hợp đồng × ${currentPrice.toFixed(8)})`);
        } catch (error) {
            showNotification('Lỗi khi lấy giá để tính số lượng hợp đồng: ' + error.message, 'error');
            return;
        }
    }
    
    const orderData = {
        symbol: formData.get('symbol'),
        side: formData.get('side'),
        type: formData.get('type'),
        quantity: finalQuantity,
        leverage: leverage,
        marginType: formData.get('marginType') || 'CROSSED',
        reduceOnly: formData.get('reduceOnly') === 'on'
    };

    if (orderData.type === 'LIMIT') {
        orderData.price = formData.get('price');
        orderData.timeInForce = 'GTC';
    }

    const isScheduled = formData.get('scheduleOrder') === 'on';
    
    try {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý...';

        let response;
        if (isScheduled) {
            // Get scheduled time from separate inputs
            const date = formData.get('scheduleDate');
            const hour = parseInt(formData.get('scheduleHour')) || 0;
            const minute = parseInt(formData.get('scheduleMinute')) || 0;
            const second = parseInt(formData.get('scheduleSecond')) || 0;
            
            const scheduledDateTime = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
            orderData.scheduledTime = scheduledDateTime.toISOString();
            
            // Get close position after fill option
            const closePositionAfterFill = formData.get('closePositionAfterFill') === 'on';
            if (closePositionAfterFill) {
                orderData.closePositionAfterFill = true;
            }
            
            // Get close position at time option
            const closePositionAtTime = formData.get('closePositionAtTime') === 'on';
            if (closePositionAtTime) {
                const closeDate = formData.get('closePositionDate');
                const closeHour = parseInt(formData.get('closePositionHour')) || 0;
                const closeMinute = parseInt(formData.get('closePositionMinute')) || 0;
                const closeSecond = parseInt(formData.get('closePositionSecond')) || 0;
                
                if (closeDate) {
                    const closeDateTime = new Date(`${closeDate}T${String(closeHour).padStart(2, '0')}:${String(closeMinute).padStart(2, '0')}:${String(closeSecond).padStart(2, '0')}`);
                    orderData.closePositionAtTime = true;
                    orderData.closePositionTime = closeDateTime.toISOString();
                }
            }
            
            response = await fetch(`${API_BASE}/api/schedule-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        } else {
            response = await fetch(`${API_BASE}/api/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        }

        const result = await response.json();

        if (response.ok) {
            showNotification(
                isScheduled 
                    ? `✅ ${result.message}` 
                    : '✅ Đặt lệnh thành công!',
                'success'
            );
            e.target.reset();
            togglePriceField();
            toggleScheduleField();
            if (isScheduled) {
                refreshScheduledOrders();
                switchTab('scheduled');
            }
        } else {
            showNotification('❌ Lỗi: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Lỗi: ' + error.message, 'error');
    } finally {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đặt Lệnh';
    }
}

// Refresh Scheduled Orders
async function refreshScheduledOrders() {
    const listContainer = document.getElementById('scheduledOrdersList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải lệnh đã lên lịch...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/scheduled-orders`);
        
        // Kiểm tra response status
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Lỗi response:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        // Kiểm tra content-type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Response không phải JSON:', text.substring(0, 200));
            throw new Error('Server trả về HTML thay vì JSON. Kiểm tra lại route API.');
        }
        
        const orders = await response.json();
        
        if (!Array.isArray(orders)) {
            console.error('Orders không phải array:', orders);
            listContainer.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: Dữ liệu không hợp lệ</p>';
            return;
        }
        
        if (orders.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có lệnh nào được lên lịch</p>';
            return;
        }

        listContainer.innerHTML = orders.map(order => {
            const scheduledTime = new Date(order.scheduledTime);
            const statusClass = `status-${order.status}`;
            
            let timeInfo = `<p><strong>Thời gian:</strong> ${formatDateTime(scheduledTime)}</p>`;
            if (order.status === 'executed' && order.delayMs !== undefined) {
                const delayText = order.delayMs >= 0 
                    ? `+${order.delayMs}ms` 
                    : `${order.delayMs}ms`;
                const delayColor = Math.abs(order.delayMs) < 1000 ? '#28a745' : '#ffc107';
                timeInfo += `<p style="font-size: 12px; color: ${delayColor};"><strong>Độ lệch:</strong> ${delayText}</p>`;
            }
            
            let closePositionInfo = '';
            if (order.closePositionAfterFill) {
                closePositionInfo = `<p style="color: #e74c3c; font-weight: bold;">🔴 Tự động đóng vị thế sau khi khớp</p>`;
                if (order.positionClosed) {
                    closePositionInfo += `<p style="color: #28a745;"><strong>✅ Đã đóng vị thế:</strong> ${order.positionClosedAt ? formatDateTime(new Date(order.positionClosedAt)) : 'Đã đóng'}</p>`;
                    if (order.closeOrderId) {
                        closePositionInfo += `<p style="font-size: 12px;"><strong>OrderId đóng vị thế:</strong> ${order.closeOrderId}</p>`;
                    }
                } else if (order.positionCloseError) {
                    closePositionInfo += `<p style="color: #e74c3c;"><strong>❌ Lỗi đóng vị thế:</strong> ${order.positionCloseError}</p>`;
                } else {
                    closePositionInfo += `<p style="color: #ffc107;">⏳ Đang chờ lệnh khớp để đóng vị thế...</p>`;
                }
            }
            
            if (order.closePositionAtTime) {
                const closeTime = new Date(order.closePositionTime);
                closePositionInfo += `<p style="color: #e74c3c; font-weight: bold; margin-top: 10px;">🔴 Cắt vị thế theo thời gian: ${formatDateTime(closeTime)}</p>`;
                if (order.positionClosedAtTime) {
                    closePositionInfo += `<p style="color: #28a745;"><strong>✅ Đã cắt vị thế:</strong> ${order.positionClosedAtTimeAt ? formatDateTime(new Date(order.positionClosedAtTimeAt)) : 'Đã cắt'}</p>`;
                    if (order.closeOrderIdAtTime) {
                        closePositionInfo += `<p style="font-size: 12px;"><strong>OrderId cắt vị thế:</strong> ${order.closeOrderIdAtTime}</p>`;
                    }
                } else if (order.positionCloseAtTimeError) {
                    closePositionInfo += `<p style="color: #e74c3c;"><strong>❌ Lỗi cắt vị thế:</strong> ${order.positionCloseAtTimeError}</p>`;
                } else {
                    const now = new Date();
                    const closeTimeDate = new Date(order.closePositionTime);
                    if (closeTimeDate > now) {
                        const remaining = Math.floor((closeTimeDate - now) / 1000);
                        const minutes = Math.floor(remaining / 60);
                        const seconds = remaining % 60;
                        closePositionInfo += `<p style="color: #ffc107;" id="countdown-close-${order.id}">⏳ Còn ${minutes} phút ${seconds} giây đến thời gian cắt vị thế...</p>`;
                    } else {
                        closePositionInfo += `<p style="color: #ffc107;">⏳ Đang chờ đến thời gian cắt vị thế...</p>`;
                    }
                }
            }
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h3>${order.symbol} - ${order.side} ${order.type}</h3>
                        <p><strong>Số lượng:</strong> ${order.quantity} hợp đồng</p>
                        ${order.price ? `<p><strong>Giá:</strong> ${formatNumber(order.price)} USDT</p>` : ''}
                        ${order.leverage ? `<p><strong>Đòn bẩy:</strong> ${order.leverage}x</p>` : ''}
                        ${order.marginType ? `<p><strong>Margin:</strong> ${order.marginType === 'ISOLATED' ? 'Isolated (Cô lập)' : 'Cross (Chéo)'}</p>` : ''}
                            ${timeInfo}
                            ${closePositionInfo}
                        <span class="status-badge ${statusClass}">${getStatusText(order.status)}</span>
                        ${order.error ? `<p style="color: #e74c3c; margin-top: 5px;">Lỗi: ${order.error}</p>` : ''}
                    </div>
                    ${order.status === 'scheduled' ? `
                        <button class="btn-danger" onclick="cancelOrder('${order.id}')">Hủy</button>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Start countdown timers for close position at time (update every 1 second)
        orders.forEach(order => {
            if (order.closePositionAtTime && order.closePositionTime && !order.positionClosedAtTime) {
                const countdownElement = document.getElementById(`countdown-close-${order.id}`);
                if (countdownElement) {
                    const updateCloseCountdown = () => {
                        const now = new Date();
                        const closeTimeDate = new Date(order.closePositionTime);
                        if (closeTimeDate > now) {
                            const remaining = Math.floor((closeTimeDate - now) / 1000);
                            const minutes = Math.floor(remaining / 60);
                            const seconds = remaining % 60;
                            countdownElement.textContent = `⏳ Còn ${minutes} phút ${seconds} giây đến thời gian cắt vị thế...`;
                        } else {
                            countdownElement.textContent = `⏳ Đang chờ đến thời gian cắt vị thế...`;
                        }
                    };
                    
                    // Update immediately
                    updateCloseCountdown();
                    
                    // Update every 1 second
                    const intervalId = setInterval(() => {
                        const element = document.getElementById(`countdown-close-${order.id}`);
                        if (element) {
                            updateCloseCountdown();
                        } else {
                            clearInterval(intervalId);
                            if (window.closePositionCountdowns) {
                                window.closePositionCountdowns.delete(order.id);
                            }
                        }
                    }, 1000); // Update every 1 second
                    
                    // Store interval ID for cleanup
                    if (!window.closePositionCountdowns) {
                        window.closePositionCountdowns = new Map();
                    }
                    // Clear old interval if exists
                    if (window.closePositionCountdowns.has(order.id)) {
                        clearInterval(window.closePositionCountdowns.get(order.id));
                    }
                    window.closePositionCountdowns.set(order.id, intervalId);
                }
            }
        });
        
        // Clean up old intervals for orders that no longer exist
        if (window.closePositionCountdowns) {
            const currentOrderIds = new Set(orders.map(o => o.id));
            window.closePositionCountdowns.forEach((intervalId, orderId) => {
                if (!currentOrderIds.has(orderId)) {
                    clearInterval(intervalId);
                    window.closePositionCountdowns.delete(orderId);
                }
            });
        }
    } catch (error) {
        console.error('Lỗi chi tiết:', error);
        const listContainer = document.getElementById('scheduledOrdersList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi khi tải lệnh: ${error.message}</p>`;
        showNotification('Lỗi khi tải lệnh đã lên lịch: ' + error.message, 'error');
    }
}

// Cancel Order
async function cancelOrder(orderId) {
    if (!confirm('Bạn có chắc muốn hủy lệnh này?')) {
        return;
    }

    try {
        console.log(`🗑️  Đang hủy lệnh: ${orderId}`);
        const response = await fetch(`${API_BASE}/api/scheduled-order/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Kiểm tra response
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            console.error('Lỗi response:', response.status, errorData);
            showNotification('❌ Lỗi: ' + (errorData.error || errorText), 'error');
            return;
        }
        
        const result = await response.json();
        console.log('Kết quả hủy lệnh:', result);

        if (result.success) {
            showNotification('✅ ' + (result.message || 'Đã hủy lệnh'), 'success');
            // Refresh sau 500ms để đảm bảo server đã cập nhật
            setTimeout(() => {
                refreshScheduledOrders();
            }, 500);
        } else {
            showNotification('❌ Lỗi: ' + (result.error || 'Không thể hủy lệnh'), 'error');
        }
    } catch (error) {
        console.error('Lỗi khi hủy lệnh:', error);
        showNotification('❌ Lỗi: ' + error.message, 'error');
    }
}

// Load History
async function loadHistory() {
    try {
        const symbol = document.getElementById('historySymbol').value;
        const url = `${API_BASE}/api/orders-history${symbol ? `?symbol=${symbol}` : '?limit=50'}`;
        const response = await fetch(url);
        const orders = await response.json();
        
        const listContainer = document.getElementById('historyList');
        
        if (orders.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có lệnh nào</p>';
            return;
        }

        listContainer.innerHTML = orders.map(order => {
            const time = new Date(order.updateTime);
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h3>${order.symbol} - ${order.side} ${order.type}</h3>
                        <p><strong>Số lượng:</strong> ${order.executedQty || order.origQty}</p>
                        ${order.price ? `<p><strong>Giá:</strong> ${formatNumber(order.price)} USDT</p>` : ''}
                        <p><strong>Trạng thái:</strong> ${order.status}</p>
                        <p><strong>Thời gian:</strong> ${formatDateTime(time)}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải lịch sử: ' + error.message, 'error');
    }
}

// Load Position History
async function loadPositionHistory() {
    const listContainer = document.getElementById('positionHistoryList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải lịch sử vị thế...</p>
        </div>
    `;
    
    try {
        const symbol = document.getElementById('positionHistorySymbol').value;
        const url = `${API_BASE}/api/position-history${symbol ? `?symbol=${symbol}` : '?limit=100'}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const positions = await response.json();
        
        if (!Array.isArray(positions) || positions.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có vị thế nào đã đóng</p>';
            return;
        }

        listContainer.innerHTML = positions.map(pos => {
            const pnlColor = pos.totalRealizedPnl >= 0 ? '#28a745' : '#dc3545';
            const pnlSign = pos.totalRealizedPnl >= 0 ? '+' : '';
            const openTime = pos.openTime ? formatDateTime(new Date(pos.openTime)) : 'N/A';
            const closeTime = pos.closeTime ? formatDateTime(new Date(pos.closeTime)) : 'N/A';
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h3>${pos.symbol} - ${pos.sideText} (${pos.side})</h3>
                        <p><strong>Số lượng:</strong> ${formatNumber(pos.totalQuantity)} hợp đồng</p>
                        <p><strong>Số lần giao dịch:</strong> ${pos.tradeCount} lần</p>
                        <p><strong>Giá trung bình:</strong> ${formatNumber(pos.avgPrice)} USDT</p>
                        <p><strong>Phí giao dịch:</strong> ${formatNumber(pos.totalCommission)} USDT</p>
                        <p style="color: ${pnlColor}; font-weight: bold; font-size: 16px;">
                            <strong>Lời/Lỗ (Realized PnL):</strong> ${pnlSign}${formatNumber(pos.totalRealizedPnl)} USDT
                        </p>
                        <p><strong>Thời gian mở:</strong> ${openTime}</p>
                        <p><strong>Thời gian đóng:</strong> ${closeTime}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải lịch sử vị thế: ' + error.message, 'error');
        const listContainer = document.getElementById('positionHistoryList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Store funding data for export
let currentFundingIncomeData = [];
let currentFundingRateData = [];
let currentFundingRateCurrentData = [];

// Load Funding Income
async function loadFundingIncome() {
    const listContainer = document.getElementById('fundingIncomeList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải funding income...</p>
        </div>
    `;
    
    try {
        const symbol = document.getElementById('fundingIncomeSymbol')?.value || '';
        const sortSelect = document.getElementById('fundingIncomeSort');
        const limitSelect = document.getElementById('fundingIncomeLimit');
        const sortValue = sortSelect?.value || 'time-desc';
        const limit = limitSelect?.value || '50';
        
        const [sortBy, sortOrder] = sortValue.split('-');
        
        let url = `${API_BASE}/api/funding-income?limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
        if (symbol) {
            url += `&symbol=${symbol}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const income = await response.json();
        currentFundingIncomeData = income; // Store for export
        
        if (!Array.isArray(income) || income.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có funding income nào</p>';
            return;
        }

        const totalIncome = income.reduce((sum, item) => sum + item.income, 0);
        const incomeColor = totalIncome >= 0 ? '#28a745' : '#dc3545';

        listContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="font-size: 18px; font-weight: bold; color: ${incomeColor};">
                    Tổng Funding Income: ${totalIncome >= 0 ? '+' : ''}${formatNumber(totalIncome)} USDT
                </p>
                <p style="font-size: 14px; color: #666; margin-top: 5px;">
                    Hiển thị ${income.length} bản ghi
                </p>
            </div>
            ${income.map(item => {
                const itemColor = item.income >= 0 ? '#28a745' : '#dc3545';
                const time = formatDateTime(new Date(item.time));
                return `
                    <div class="order-item">
                        <div class="order-info">
                            <h3>${item.symbol}</h3>
                            <p style="color: ${itemColor}; font-weight: bold; font-size: 16px;">
                                <strong>Funding Income:</strong> ${item.income >= 0 ? '+' : ''}${formatNumber(item.income)} USDT
                            </p>
                            <p><strong>Thời gian:</strong> ${time}</p>
                            ${item.info ? `<p><strong>Thông tin:</strong> ${item.info}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        showNotification('Lỗi khi tải funding income: ' + error.message, 'error');
        const listContainer = document.getElementById('fundingIncomeList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Load Funding Rate Current (Real-time)
async function loadFundingRateCurrent() {
    const listContainer = document.getElementById('fundingRateCurrentList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải funding rate hiện tại...</p>
        </div>
    `;
    
    try {
        const symbol = document.getElementById('fundingRateCurrentSymbol')?.value || '';
        
        let url = `${API_BASE}/api/funding-rate-current`;
        if (symbol) {
            url += `?symbol=${symbol}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const rates = await response.json();
        currentFundingRateCurrentData = rates; // Store for export
        
        if (!Array.isArray(rates) || rates.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có dữ liệu funding rate hiện tại</p>';
            return;
        }
        
        // Calculate time until next funding
        const now = Date.now();
        
        listContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                <p style="font-size: 14px; color: #666;">
                    Hiển thị ${rates.length} symbols • Sắp xếp theo |funding rate| từ cao xuống thấp
                </p>
            </div>
            ${rates.map(rate => {
                const ratePercent = (rate.fundingRate * 100).toFixed(4);
                const rateColor = rate.fundingRate >= 0 ? '#28a745' : '#dc3545';
                const nextFundingTime = rate.nextFundingTime ? new Date(rate.nextFundingTime) : null;
                const timeUntilNext = nextFundingTime ? Math.max(0, Math.floor((nextFundingTime.getTime() - now) / 1000)) : null;
                const hoursUntil = timeUntilNext ? Math.floor(timeUntilNext / 3600) : null;
                const minutesUntil = timeUntilNext ? Math.floor((timeUntilNext % 3600) / 60) : null;
                
                return `
                    <div class="order-item">
                        <div class="order-info">
                            <h3>${rate.symbol}</h3>
                            <p><strong>Funding Rate:</strong> 
                                <span style="color: ${rateColor}; font-weight: bold; font-size: 18px;">${ratePercent}%</span>
                                <span style="color: #666; font-size: 14px;">(${rate.fundingRate})</span>
                            </p>
                            <p><strong>Mark Price:</strong> ${formatNumber(rate.markPrice)} USDT</p>
                            <p><strong>Index Price:</strong> ${formatNumber(rate.indexPrice)} USDT</p>
                            ${nextFundingTime ? `
                                <p><strong>Funding tiếp theo:</strong> ${formatDateTime(nextFundingTime)}</p>
                                ${timeUntilNext !== null && timeUntilNext > 0 ? `
                                    <p style="color: #ff9800; font-weight: bold;">
                                        ⏰ Còn ${hoursUntil}h ${minutesUntil}m đến funding tiếp theo
                                    </p>
                                ` : '<p style="color: #28a745; font-weight: bold;">✅ Đang trong kỳ funding</p>'}
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        showNotification('Lỗi khi tải funding rate hiện tại: ' + error.message, 'error');
        const listContainer = document.getElementById('fundingRateCurrentList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Export Funding Rate Current to CSV
function exportFundingRateCurrentCSV() {
    if (!currentFundingRateCurrentData || currentFundingRateCurrentData.length === 0) {
        showNotification('Không có dữ liệu để export', 'error');
        return;
    }
    
    const headers = ['Symbol', 'Funding Rate', 'Funding Rate (%)', 'Mark Price (USDT)', 'Index Price (USDT)', 'Next Funding Time'];
    const rows = currentFundingRateCurrentData.map(rate => [
        rate.symbol,
        rate.fundingRate,
        (rate.fundingRate * 100).toFixed(4),
        rate.markPrice,
        rate.indexPrice,
        rate.nextFundingTime ? formatDateTime(new Date(rate.nextFundingTime)) : ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `funding_rate_current_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('✅ Đã export CSV thành công', 'success');
}

// Load Funding Rate
async function loadFundingRate() {
    const listContainer = document.getElementById('fundingRateList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải funding rate...</p>
        </div>
    `;
    
    try {
        const symbol = document.getElementById('fundingRateSymbol')?.value || '';
        const sortSelect = document.getElementById('fundingRateSort');
        const limitSelect = document.getElementById('fundingRateLimit');
        const sortValue = sortSelect?.value || 'absRate-desc';
        const limit = limitSelect?.value || '50';
        
        const [sortBy, sortOrder] = sortValue.split('-');
        
        let url = `${API_BASE}/api/funding-rate?limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
        if (symbol) {
            url += `&symbol=${symbol}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const rates = await response.json();
        currentFundingRateData = rates; // Store for export
        
        if (!Array.isArray(rates) || rates.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có funding rate nào</p>';
            return;
        }

        listContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                <p style="font-size: 14px; color: #666;">
                    Hiển thị ${rates.length} bản ghi
                </p>
            </div>
            ${rates.map(rate => {
                const time = formatDateTime(new Date(rate.fundingTime));
                const ratePercent = (rate.fundingRate * 100).toFixed(4);
                const rateColor = rate.fundingRate >= 0 ? '#28a745' : '#dc3545';
                
                return `
                    <div class="order-item">
                        <div class="order-info">
                            <h3>${rate.symbol}</h3>
                            <p><strong>Funding Rate:</strong> <span style="color: ${rateColor}; font-weight: bold;">${ratePercent}%</span> (${rate.fundingRate})</p>
                            <p><strong>Mark Price:</strong> ${formatNumber(rate.markPrice)} USDT</p>
                            <p><strong>Thời gian:</strong> ${time}</p>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        showNotification('Lỗi khi tải funding rate: ' + error.message, 'error');
        const listContainer = document.getElementById('fundingRateList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Export Funding Income to CSV
function exportFundingIncomeCSV() {
    if (!currentFundingIncomeData || currentFundingIncomeData.length === 0) {
        showNotification('Không có dữ liệu để export', 'error');
        return;
    }
    
    const headers = ['Symbol', 'Income (USDT)', 'Time', 'Info'];
    const rows = currentFundingIncomeData.map(item => [
        item.symbol,
        item.income,
        formatDateTime(new Date(item.time)),
        item.info || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `funding_income_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('✅ Đã export CSV thành công', 'success');
}

// Export Funding Rate to CSV
function exportFundingRateCSV() {
    if (!currentFundingRateData || currentFundingRateData.length === 0) {
        showNotification('Không có dữ liệu để export', 'error');
        return;
    }
    
    const headers = ['Symbol', 'Funding Rate', 'Funding Rate (%)', 'Mark Price (USDT)', 'Time'];
    const rows = currentFundingRateData.map(rate => [
        rate.symbol,
        rate.fundingRate,
        (rate.fundingRate * 100).toFixed(4),
        rate.markPrice,
        formatDateTime(new Date(rate.fundingTime))
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `funding_rate_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('✅ Đã export CSV thành công', 'success');
}

// Load Funding Income Summary
async function loadFundingIncomeSummary() {
    const summaryList = document.getElementById('fundingIncomeSummaryList');
    if (!summaryList) return;
    
    summaryList.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải tổng hợp...</p>
        </div>
    `;
    
    try {
        const symbol = document.getElementById('fundingIncomeSymbol')?.value || '';
        const period = document.getElementById('fundingIncomePeriod')?.value || 'day';
        
        let url = `${API_BASE}/api/funding-income-summary?period=${period}`;
        if (symbol) {
            url += `&symbol=${symbol}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const summary = await response.json();
        
        if (!Array.isArray(summary) || summary.length === 0) {
            summaryList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có dữ liệu tổng hợp</p>';
            return;
        }
        
        const totalAll = summary.reduce((sum, item) => sum + item.totalIncome, 0);
        const totalColor = totalAll >= 0 ? '#28a745' : '#dc3545';
        
        summaryList.innerHTML = `
            <div style="background: #fff; padding: 10px; border-radius: 5px; margin-bottom: 10px; border: 2px solid ${totalColor};">
                <p style="font-size: 16px; font-weight: bold; color: ${totalColor};">
                    Tổng cộng: ${totalAll >= 0 ? '+' : ''}${formatNumber(totalAll)} USDT
                </p>
            </div>
            ${summary.map(item => {
                const itemColor = item.totalIncome >= 0 ? '#28a745' : '#dc3545';
                return `
                    <div style="background: #fff; padding: 10px; border-radius: 5px; margin-bottom: 5px; border-left: 4px solid ${itemColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${item.period}</strong>
                                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                                    ${item.count} giao dịch • ${item.symbolCount} symbol
                                </p>
                            </div>
                            <p style="color: ${itemColor}; font-weight: bold; font-size: 16px;">
                                ${item.totalIncome >= 0 ? '+' : ''}${formatNumber(item.totalIncome)} USDT
                            </p>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        showNotification('Lỗi khi tải tổng hợp: ' + error.message, 'error');
        summaryList.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Funding tab switching - moved to main DOMContentLoaded

// Load Account
async function loadAccount() {
    try {
        const response = await fetch(`${API_BASE}/api/account`);
        const account = await response.json();
        
        const container = document.getElementById('accountInfo');
        
        const totalWalletBalance = account.totalWalletBalance || 0;
        const availableBalance = account.availableBalance || 0;
        const totalUnrealizedProfit = account.totalUnrealizedProfit || 0;
        
        container.innerHTML = `
            <div class="account-item">
                <strong>Tổng số dư ví:</strong>
                <p>${formatNumber(totalWalletBalance)} USDT</p>
            </div>
            <div class="account-item">
                <strong>Số dư khả dụng:</strong>
                <p>${formatNumber(availableBalance)} USDT</p>
            </div>
            <div class="account-item">
                <strong>Lợi nhuận chưa thực hiện:</strong>
                <p style="color: ${totalUnrealizedProfit >= 0 ? '#28a745' : '#dc3545'};">
                    ${formatNumber(totalUnrealizedProfit)} USDT
                </p>
            </div>
            <div class="account-item">
                <strong>Đòn bẩy tối đa:</strong>
                <p>${account.maxLeverage || 'N/A'}</p>
            </div>
        `;
    } catch (error) {
        showNotification('Lỗi khi tải thông tin tài khoản: ' + error.message, 'error');
    }
}

// Notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Utility Functions
function formatNumber(num) {
    return parseFloat(num).toLocaleString('vi-VN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
    });
}

function formatDateTime(date) {
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getStatusText(status) {
    const statusMap = {
        'scheduled': 'Đã lên lịch',
        'executed': 'Đã thực thi',
        'failed': 'Thất bại',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

// Load Open Orders
async function loadOpenOrders() {
    const listContainer = document.getElementById('openOrdersList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải lệnh đang chạy...</p>
        </div>
    `;
    
    try {
        console.log('📊 Đang tải lệnh đang chạy...');
        const response = await fetch(`${API_BASE}/api/open-orders`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const orders = await response.json();
        console.log(`📊 Nhận được ${orders.length} lệnh đang chạy`);
        
        if (!Array.isArray(orders)) {
            console.error('Orders không phải array:', orders);
            listContainer.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: Dữ liệu không hợp lệ</p>';
            return;
        }
        
        if (orders.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Không có lệnh nào đang chạy</p>';
            return;
        }

        listContainer.innerHTML = orders.map(order => {
            const time = new Date(order.time || order.updateTime);
            const origQty = parseFloat(order.origQty || 0);
            const executedQty = parseFloat(order.executedQty || 0);
            const remainingQty = origQty - executedQty;
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h3>${order.symbol} - ${order.side} ${order.type}</h3>
                        <p><strong>Số lượng:</strong> ${formatNumber(origQty)} hợp đồng</p>
                        <p><strong>Đã khớp:</strong> ${formatNumber(executedQty)} hợp đồng</p>
                        <p><strong>Còn lại:</strong> ${formatNumber(remainingQty)} hợp đồng</p>
                        ${order.price ? `<p><strong>Giá đặt:</strong> ${formatNumber(order.price)} USDT</p>` : ''}
                        ${order.position ? `
                            <p><strong>Vị thế hiện tại:</strong> ${formatNumber(order.position.positionAmt)} hợp đồng</p>
                            <p><strong>Giá vào:</strong> ${formatNumber(order.position.entryPrice)} USDT</p>
                            <p><strong>Giá mark:</strong> ${formatNumber(order.position.markPrice)} USDT</p>
                            <p style="color: ${order.position.unRealizedProfit >= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
                                <strong>Lợi nhuận chưa thực hiện:</strong> ${formatNumber(order.position.unRealizedProfit)} USDT
                            </p>
                            <p><strong>Đòn bẩy:</strong> ${order.position.leverage}x</p>
                        ` : ''}
                        <p><strong>Trạng thái:</strong> ${order.status}</p>
                        <p><strong>Thời gian đặt:</strong> ${formatDateTime(time)}</p>
                    </div>
                    <button class="btn-danger" onclick="cancelOpenOrder('${order.symbol}', '${order.orderId}')">Hủy Lệnh</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải lệnh đang chạy: ' + error.message, 'error');
    }
}

// Cancel Open Order
async function cancelOpenOrder(symbol, orderId) {
    if (!confirm(`Bạn có chắc muốn hủy lệnh ${orderId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/cancel-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, orderId })
        });
        const result = await response.json();

        if (response.ok) {
            showNotification('✅ Đã hủy lệnh thành công', 'success');
            loadOpenOrders();
        } else {
            showNotification('❌ Lỗi: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Lỗi: ' + error.message, 'error');
    }
}

// Load Positions
async function loadPositions() {
    const listContainer = document.getElementById('positionsList');
    
    // Show loading
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải vị thế...</p>
        </div>
    `;
    
    try {
        console.log('📊 Đang tải vị thế...');
        const response = await fetch(`${API_BASE}/api/positions`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const positions = await response.json();
        console.log(`📊 Nhận được ${positions.length} vị thế`);
        
        if (!Array.isArray(positions)) {
            console.error('Positions không phải array:', positions);
            listContainer.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: Dữ liệu không hợp lệ</p>';
            return;
        }
        
        if (positions.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Không có vị thế nào đang mở</p>';
            return;
        }

        listContainer.innerHTML = positions.map(position => {
            const positionAmt = position.positionAmt;
            const isLong = positionAmt > 0;
            const sideText = isLong ? 'LONG (Mua)' : 'SHORT (Bán)';
            const sideColor = isLong ? '#28a745' : '#dc3545';
            
            return `
                <div class="order-item" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                    <div class="order-info" style="flex: 1;">
                        <h3>${position.symbol} - ${sideText}</h3>
                        <p><strong>Số lượng:</strong> <span style="color: ${sideColor}; font-weight: bold;">${formatNumber(Math.abs(positionAmt))} hợp đồng</span></p>
                        <p><strong>Giá vào:</strong> ${formatNumber(position.entryPrice)} USDT</p>
                        <p><strong>Giá break-even:</strong> ${formatNumber(position.breakEvenPrice)} USDT</p>
                        <p><strong>Giá mark:</strong> ${formatNumber(position.markPrice)} USDT</p>
                        <p><strong>Giá thanh lý:</strong> ${position.liquidationPrice > 0 ? formatNumber(position.liquidationPrice) : 'N/A'} USDT</p>
                        <p style="color: ${position.unRealizedProfit >= 0 ? '#28a745' : '#dc3545'}; font-weight: bold; font-size: 16px;">
                            <strong>Lợi nhuận chưa thực hiện:</strong> ${formatNumber(position.unRealizedProfit)} USDT
                        </p>
                        <p><strong>Giá trị notional:</strong> ${formatNumber(Math.abs(position.notional))} USDT</p>
                        <p><strong>Đòn bẩy:</strong> ${position.leverage}x</p>
                        <p><strong>Margin ban đầu:</strong> ${formatNumber(position.initialMargin)} USDT</p>
                        <p><strong>Margin duy trì:</strong> ${formatNumber(position.maintMargin)} USDT</p>
                        ${position.isolatedMargin > 0 ? `<p><strong>Isolated Margin:</strong> ${formatNumber(position.isolatedMargin)} USDT</p>` : ''}
                        <p><strong>Loại margin:</strong> ${position.isolatedMargin > 0 ? 'Isolated' : 'Cross'}</p>
                        <p><strong>Cập nhật:</strong> ${formatDateTime(new Date(position.updateTime))}</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
                        <button class="btn-danger" onclick="closePosition('${position.symbol}')" style="padding: 12px 24px; font-size: 15px; font-weight: bold; white-space: nowrap; min-width: 180px;">
                            🔴 Cắt Lệnh / Đóng Vị Thế
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Lỗi khi tải vị thế:', error);
        const listContainer = document.getElementById('positionsList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
        showNotification('Lỗi khi tải vị thế: ' + error.message, 'error');
    }
}

// Close Position
async function closePosition(symbol) {
    if (!confirm(`Bạn có chắc muốn đóng toàn bộ vị thế ${symbol}?\n\nLệnh sẽ được đặt với type MARKET và reduceOnly=true để đóng vị thế.`)) {
        return;
    }

    try {
        console.log(`🔴 Đang đóng vị thế: ${symbol}`);
        const response = await fetch(`${API_BASE}/api/close-position`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || errorText);
        }
        
        const result = await response.json();
        console.log('Kết quả đóng vị thế:', result);

        if (result.success) {
            showNotification('✅ ' + (result.message || 'Đã đặt lệnh đóng vị thế'), 'success');
            // Refresh positions sau 1 giây
            setTimeout(() => {
                loadPositions();
                loadOpenOrders(); // Cũng refresh open orders vì có thể có lệnh mới
            }, 1000);
        } else {
            showNotification('❌ Lỗi: ' + (result.error || 'Không thể đóng vị thế'), 'error');
        }
    } catch (error) {
        console.error('Lỗi khi đóng vị thế:', error);
        showNotification('❌ Lỗi: ' + error.message, 'error');
    }
}

// Load Order Book
async function loadOrderBook() {
    const symbol = document.getElementById('marketDataSymbol')?.value;
    if (!symbol) {
        document.getElementById('orderBookList').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Vui lòng chọn symbol</p>';
        return;
    }
    
    const listContainer = document.getElementById('orderBookList');
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải order book...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/market/orderbook/${symbol}?limit=20`);
        const data = await response.json();
        
        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h3 style="color: #dc3545; margin-bottom: 10px;">Bids (Mua)</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${data.bids.map(bid => `
                            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span style="color: #28a745; font-weight: bold;">${formatNumber(bid.price)}</span>
                                <span>${formatNumber(bid.quantity)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <h3 style="color: #28a745; margin-bottom: 10px;">Asks (Bán)</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${data.asks.map(ask => `
                            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span style="color: #dc3545; font-weight: bold;">${formatNumber(ask.price)}</span>
                                <span>${formatNumber(ask.quantity)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        showNotification('Lỗi khi tải order book: ' + error.message, 'error');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Load Recent Trades
async function loadTrades() {
    const symbol = document.getElementById('marketDataSymbol')?.value;
    if (!symbol) {
        document.getElementById('tradesList').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Vui lòng chọn symbol</p>';
        return;
    }
    
    const listContainer = document.getElementById('tradesList');
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải trades...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/market/trades/${symbol}?limit=50`);
        const trades = await response.json();
        
        listContainer.innerHTML = trades.map(trade => {
            const time = formatDateTime(new Date(trade.time));
            const color = trade.isBuyerMaker ? '#dc3545' : '#28a745';
            return `
                <div class="order-item">
                    <div class="order-info">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="color: ${color}; font-weight: bold; font-size: 16px;">
                                    ${formatNumber(trade.price)} USDT
                                </p>
                                <p style="font-size: 14px; color: #666;">${formatNumber(trade.quantity)}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="font-size: 12px; color: #999;">${time}</p>
                                <p style="font-size: 12px; color: #999;">${trade.isBuyerMaker ? 'SELL' : 'BUY'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải trades: ' + error.message, 'error');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Load 24hr Ticker
async function loadTicker24hr() {
    const symbol = document.getElementById('marketDataSymbol')?.value;
    if (!symbol) {
        document.getElementById('ticker24hrInfo').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Vui lòng chọn symbol</p>';
        return;
    }
    
    const container = document.getElementById('ticker24hrInfo');
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải 24h stats...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/market/ticker/24hr/${symbol}`);
        const ticker = await response.json();
        
        const priceChangeColor = ticker.priceChangePercent >= 0 ? '#28a745' : '#dc3545';
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div class="account-item">
                    <strong>Giá hiện tại:</strong>
                    <p style="font-size: 20px; font-weight: bold;">${formatNumber(ticker.lastPrice)} USDT</p>
                </div>
                <div class="account-item">
                    <strong>Thay đổi 24h:</strong>
                    <p style="color: ${priceChangeColor}; font-size: 18px; font-weight: bold;">
                        ${ticker.priceChangePercent >= 0 ? '+' : ''}${ticker.priceChangePercent.toFixed(2)}%
                    </p>
                </div>
                <div class="account-item">
                    <strong>Giá cao nhất:</strong>
                    <p style="color: #28a745;">${formatNumber(ticker.highPrice)} USDT</p>
                </div>
                <div class="account-item">
                    <strong>Giá thấp nhất:</strong>
                    <p style="color: #dc3545;">${formatNumber(ticker.lowPrice)} USDT</p>
                </div>
                <div class="account-item">
                    <strong>Volume 24h:</strong>
                    <p>${formatNumber(ticker.volume)}</p>
                </div>
                <div class="account-item">
                    <strong>Quote Volume:</strong>
                    <p>${formatNumber(ticker.quoteVolume)} USDT</p>
                </div>
                <div class="account-item">
                    <strong>Bid Price:</strong>
                    <p>${formatNumber(ticker.bidPrice)} USDT</p>
                </div>
                <div class="account-item">
                    <strong>Ask Price:</strong>
                    <p>${formatNumber(ticker.askPrice)} USDT</p>
                </div>
            </div>
        `;
    } catch (error) {
        showNotification('Lỗi khi tải 24h stats: ' + error.message, 'error');
        container.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Load Liquidation History
async function loadLiquidation() {
    const listContainer = document.getElementById('liquidationList');
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải lịch sử thanh lý...</p>
        </div>
    `;
    
    try {
        const symbol = document.getElementById('liquidationSymbol')?.value || '';
        const limit = document.getElementById('liquidationLimit')?.value || '50';
        
        let url = `${API_BASE}/api/force-orders?limit=${limit}`;
        if (symbol) {
            url += `&symbol=${symbol}`;
        }
        
        const response = await fetch(url);
        const orders = await response.json();
        
        if (!Array.isArray(orders) || orders.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có lệnh thanh lý nào</p>';
            return;
        }
        
        listContainer.innerHTML = orders.map(order => {
            const time = formatDateTime(new Date(order.time));
            const forceType = order.forceCloseType === 'LIQUIDATION' ? 'Thanh lý' : 'ADL';
            const forceColor = order.forceCloseType === 'LIQUIDATION' ? '#dc3545' : '#ff9800';
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h3>${order.symbol} - ${forceType}</h3>
                        <p style="color: ${forceColor}; font-weight: bold;">
                            <strong>Loại:</strong> ${forceType}
                        </p>
                        <p><strong>Side:</strong> ${order.side}</p>
                        <p><strong>Type:</strong> ${order.type}</p>
                        <p><strong>Số lượng:</strong> ${formatNumber(order.origQty)}</p>
                        <p><strong>Giá:</strong> ${formatNumber(order.price)} USDT</p>
                        <p><strong>Thời gian:</strong> ${time}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải lịch sử thanh lý: ' + error.message, 'error');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Load Account Balance
async function loadAccountBalance() {
    const listContainer = document.getElementById('accountBalanceList');
    if (!listContainer) return;
    
    listContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Đang tải balance...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/account/balance`);
        const balances = await response.json();
        
        if (!Array.isArray(balances) || balances.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Không có balance nào</p>';
            return;
        }
        
        listContainer.innerHTML = balances.map(balance => {
            const marginColor = balance.marginUsed > 0 ? '#ff9800' : '#28a745';
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h3>${balance.asset}</h3>
                        <p><strong>Wallet Balance:</strong> ${formatNumber(balance.walletBalance)}</p>
                        <p><strong>Available Balance:</strong> ${formatNumber(balance.availableBalance)}</p>
                        <p><strong>Margin Used:</strong> <span style="color: ${marginColor};">${formatNumber(balance.marginUsed)}</span></p>
                        <p><strong>Margin Available:</strong> ${formatNumber(balance.marginAvailable)}</p>
                        <p><strong>Unrealized PnL:</strong> 
                            <span style="color: ${balance.crossUnPnl >= 0 ? '#28a745' : '#dc3545'};">
                                ${formatNumber(balance.crossUnPnl)}
                            </span>
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải balance: ' + error.message, 'error');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
    }
}

// Make cancelOrder available globally
window.cancelOrder = cancelOrder;
window.cancelOpenOrder = cancelOpenOrder;
window.closePosition = closePosition;

