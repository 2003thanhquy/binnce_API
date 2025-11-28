// API Base URL
const API_BASE = '';

// State
let symbols = [];
let selectedSymbol = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSymbols();
    setupEventListeners();
    refreshScheduledOrders();
    updateQuantityHelp(); // Initialize quantity help text
    
    // Setup close position checkbox listener
    const closePositionCheckbox = document.getElementById('closePosition');
    if (closePositionCheckbox) {
        closePositionCheckbox.addEventListener('change', handleClosePositionChange);
    }
});

// Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Order form
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    document.getElementById('type').addEventListener('change', togglePriceField);
    document.getElementById('scheduleOrder').addEventListener('change', toggleScheduleField);
    document.getElementById('symbol').addEventListener('change', handleSymbolChange);

    // Refresh symbols button (keep this one as it's useful)
    document.getElementById('refreshSymbols').addEventListener('click', loadSymbols);
    
    // Quantity type change
    document.getElementById('quantityType').addEventListener('change', handleQuantityTypeChange);
    
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
    
    const fundingRateSymbol = document.getElementById('fundingRateSymbol');
    if (fundingRateSymbol) {
        fundingRateSymbol.addEventListener('change', loadFundingRate);
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
    const scheduleOrder = document.getElementById('scheduleOrder').checked;
    const scheduleGroup = document.getElementById('scheduleGroup');
    if (scheduleOrder) {
        scheduleGroup.style.display = 'block';
        // Set default time to 10 minutes from now
        const now = new Date();
        const targetTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
        
        // Set default values
        document.getElementById('scheduleDate').value = formatDate(targetTime);
        document.getElementById('scheduleHour').value = targetTime.getHours();
        document.getElementById('scheduleMinute').value = targetTime.getMinutes();
        document.getElementById('scheduleSecond').value = targetTime.getSeconds();
        
        // Set default cancel time (2 minutes after order time)
        // Auto set close position time to 2 minutes after scheduled time
        const closePositionTime = new Date(targetTime.getTime() + 2 * 60 * 1000);
        document.getElementById('closePositionDate').value = formatDate(closePositionTime);
        document.getElementById('closePositionHour').value = closePositionTime.getHours();
        document.getElementById('closePositionMinute').value = closePositionTime.getMinutes();
        document.getElementById('closePositionSecond').value = closePositionTime.getSeconds();
        
        // Start countdown
        startCountdown();
    } else {
        scheduleGroup.style.display = 'none';
        clearInterval(window.countdownInterval);
    }
    
    // Toggle close position at time
    document.getElementById('closePositionAtTime').addEventListener('change', function() {
        const closePositionTimeGroup = document.getElementById('closePositionTimeGroup');
        closePositionTimeGroup.style.display = this.checked ? 'block' : 'none';
    });
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
    
    const updateCountdown = () => {
        const date = document.getElementById('scheduleDate').value;
        const hour = parseInt(document.getElementById('scheduleHour').value) || 0;
        const minute = parseInt(document.getElementById('scheduleMinute').value) || 0;
        const second = parseInt(document.getElementById('scheduleSecond').value) || 0;
        
        if (!date) {
            document.getElementById('countdown').textContent = 'Vui lòng chọn ngày';
            return;
        }
        
        const targetTime = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
        const now = new Date();
        const diff = targetTime.getTime() - now.getTime();
        
        if (diff <= 0) {
            document.getElementById('countdown').textContent = '⚠️ Thời gian đã qua';
            document.getElementById('countdown').style.color = '#dc3545';
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
        
        document.getElementById('countdown').textContent = `⏰ Còn lại: ${countdownText}`;
        document.getElementById('countdown').style.color = '#667eea';
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
        const symbol = document.getElementById('fundingIncomeSymbol').value;
        const url = `${API_BASE}/api/funding-income${symbol ? `?symbol=${symbol}` : '?limit=100'}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const income = await response.json();
        
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
        const symbol = document.getElementById('fundingRateSymbol').value;
        const url = `${API_BASE}/api/funding-rate${symbol ? `?symbol=${symbol}` : '?limit=100'}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const rates = await response.json();
        
        if (!Array.isArray(rates) || rates.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Chưa có funding rate nào</p>';
            return;
        }

        listContainer.innerHTML = rates.map(rate => {
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
        }).join('');
    } catch (error) {
        showNotification('Lỗi khi tải funding rate: ' + error.message, 'error');
        const listContainer = document.getElementById('fundingRateList');
        listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Lỗi: ${error.message}</p>`;
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

// Make cancelOrder available globally
window.cancelOrder = cancelOrder;
window.cancelOpenOrder = cancelOpenOrder;
window.closePosition = closePosition;

