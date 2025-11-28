require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { USDMClient } = require('binance');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Khởi tạo Binance Futures Client
const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = process.env.BINANCE_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error('⚠️  Vui lòng cấu hình BINANCE_API_KEY và BINANCE_API_SECRET trong file .env');
  process.exit(1);
}

const client = new USDMClient({
  api_key: apiKey,
  api_secret: apiSecret,
  // Có thể thêm testnet: true để test trên testnet
  // testnet: true
});

// Lưu trữ các lệnh đã lên lịch
const scheduledOrders = new Map();

// Cache exchange info để tránh gọi nhiều lần
let exchangeInfoCache = null;
let exchangeInfoCacheTime = 0;
const EXCHANGE_INFO_CACHE_TTL = 5 * 60 * 1000; // 5 phút

async function getExchangeInfo() {
  const now = Date.now();
  if (!exchangeInfoCache || (now - exchangeInfoCacheTime) > EXCHANGE_INFO_CACHE_TTL) {
    exchangeInfoCache = await client.getExchangeInfo();
    exchangeInfoCacheTime = now;
  }
  return exchangeInfoCache;
}

// API: Lấy danh sách symbols
app.get('/api/symbols', async (req, res) => {
  try {
    const exchangeInfo = await getExchangeInfo();
    const symbols = exchangeInfo.symbols
      .filter(s => s.status === 'TRADING' && s.contractType === 'PERPETUAL')
      .map(s => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset
      }));
    res.json(symbols);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách symbols:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy thông tin precision của symbol
app.get('/api/symbol-info/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const exchangeInfo = await getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
    
    if (!symbolInfo) {
      return res.status(404).json({ error: 'Symbol không tồn tại' });
    }
    
    // Tìm stepSize và quantityPrecision từ filters
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
    const minQty = lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : null;
    const maxQty = lotSizeFilter ? parseFloat(lotSizeFilter.maxQty) : null;
    
    // Tính số chữ số thập phân từ stepSize
    let quantityPrecision = 0;
    if (stepSize) {
      const stepSizeStr = stepSize.toString();
      if (stepSizeStr.includes('.')) {
        quantityPrecision = stepSizeStr.split('.')[1].length;
      } else if (stepSizeStr.includes('e')) {
        // Xử lý scientific notation
        const match = stepSizeStr.match(/e-(\d+)/);
        if (match) {
          quantityPrecision = parseInt(match[1]);
        }
      }
    }
    
    res.json({
      symbol: symbolInfo.symbol,
      stepSize,
      minQty,
      maxQty,
      quantityPrecision,
      pricePrecision: symbolInfo.pricePrecision || 8
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin symbol:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy giá hiện tại của symbol
app.get('/api/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const ticker = await client.getMarkPrice({ symbol });
    res.json({ price: parseFloat(ticker.markPrice) });
  } catch (error) {
    console.error('Lỗi khi lấy giá:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy thông tin tài khoản
app.get('/api/account', async (req, res) => {
  try {
    const account = await client.getAccountInformation();
    // Format response để frontend dễ sử dụng
    const accountInfo = {
      totalWalletBalance: parseFloat(account.totalWalletBalance || 0),
      availableBalance: parseFloat(account.availableBalance || 0),
      totalUnrealizedProfit: parseFloat(account.totalUnrealizedProfit || 0),
      totalMarginBalance: parseFloat(account.totalMarginBalance || 0),
      assets: account.assets || [],
      positions: account.positions || [],
      maxLeverage: account.maxLeverage || 'N/A'
    };
    res.json(accountInfo);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin tài khoản:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy vị thế đang mở (Positions) - GET /fapi/v3/positionRisk
// Endpoint: GET /fapi/v3/positionRisk (hoặc /fapi/v2/positionRisk)
// - Trả về danh sách tất cả symbol đang có position hoặc open orders
// - Filter positionAmt ≠ 0 để lấy các vị thế đang mở
// - Đây là API để xem "tôi đang có bao nhiêu vị thế futures đang chạy"
app.get('/api/positions', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    let positions = [];
    try {
      if (symbol) {
        positions = await client.getPositions({ 
          symbol: symbol.toUpperCase(),
          recvWindow: 5000
        });
      } else {
        // Lấy tất cả positions - API này trả về symbols có position hoặc open orders
        console.log('🔍 [Positions] Đang lấy tất cả vị thế (GET /fapi/v3/positionRisk)...');
        positions = await client.getPositions({
          recvWindow: 5000
        });
      }
      
      // Filter chỉ lấy positions có số lượng khác 0 (đang có vị thế)
      const activePositions = positions.filter(p => parseFloat(p.positionAmt || 0) !== 0);
      
      console.log(`📊 [Positions] Tổng: ${positions.length} positions, ${activePositions.length} vị thế đang mở (positionAmt ≠ 0)`);
      
      // Format positions
      const formattedPositions = activePositions.map(p => ({
        symbol: p.symbol,
        positionSide: p.positionSide || 'BOTH',
        positionAmt: parseFloat(p.positionAmt || 0),
        entryPrice: parseFloat(p.entryPrice || 0),
        breakEvenPrice: parseFloat(p.breakEvenPrice || 0),
        markPrice: parseFloat(p.markPrice || 0),
        unRealizedProfit: parseFloat(p.unRealizedProfit || 0),
        liquidationPrice: parseFloat(p.liquidationPrice || 0),
        isolatedMargin: parseFloat(p.isolatedMargin || 0),
        notional: parseFloat(p.notional || 0),
        marginAsset: p.marginAsset || 'USDT',
        isolatedWallet: parseFloat(p.isolatedWallet || 0),
        initialMargin: parseFloat(p.initialMargin || 0),
        maintMargin: parseFloat(p.maintMargin || 0),
        positionInitialMargin: parseFloat(p.positionInitialMargin || 0),
        openOrderInitialMargin: parseFloat(p.openOrderInitialMargin || 0), // Margin cho open orders
        leverage: parseInt(p.leverage || 1),
        updateTime: p.updateTime || Date.now()
      }));
      
      // Log phân bố
      if (formattedPositions.length > 0) {
        const positionsBySymbol = {};
        formattedPositions.forEach(p => {
          if (!positionsBySymbol[p.symbol]) {
            positionsBySymbol[p.symbol] = 0;
          }
          positionsBySymbol[p.symbol]++;
        });
        console.log('📋 [Positions] Phân bố theo symbol:', positionsBySymbol);
      }
      
      res.json(formattedPositions);
    } catch (error) {
      console.error('❌ Lỗi khi lấy positions:', error);
      res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error('❌ Lỗi khi lấy vị thế:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Đặt đòn bẩy cho symbol
async function setLeverage(symbol, leverage) {
  try {
    await client.setLeverage({
      symbol: symbol.toUpperCase(),
      leverage: parseInt(leverage)
    });
  } catch (error) {
    console.error(`Lỗi khi đặt đòn bẩy cho ${symbol}:`, error);
    // Không throw error, chỉ log vì có thể đòn bẩy đã được set trước đó
  }
}

// API: Đặt margin type cho symbol
async function setMarginType(symbol, marginType) {
  try {
    await client.setMarginType({
      symbol: symbol.toUpperCase(),
      marginType: marginType.toUpperCase() // ISOLATED hoặc CROSSED
    });
  } catch (error) {
    console.error(`Lỗi khi đặt margin type cho ${symbol}:`, error);
    // Không throw error, chỉ log vì có thể margin type đã được set trước đó
  }
}

// Hàm làm tròn số lượng theo precision
function roundQuantity(quantity, stepSize, quantityPrecision) {
  if (quantity <= 0) {
    return 0;
  }
  
  if (!stepSize || stepSize === 0) {
    // Nếu không có stepSize, làm tròn theo quantityPrecision
    return parseFloat(quantity.toFixed(quantityPrecision));
  }
  
  // Làm tròn về bội số của stepSize (làm tròn xuống)
  let rounded = Math.floor(quantity / stepSize) * stepSize;
  
  // Đảm bảo không bao giờ thành 0 nếu quantity > 0
  if (rounded <= 0 && quantity > 0) {
    // Làm tròn lên nếu làm tròn xuống thành 0
    rounded = Math.ceil(quantity / stepSize) * stepSize;
  }
  
  // Làm tròn theo số chữ số thập phân
  return parseFloat(rounded.toFixed(quantityPrecision));
}

// API: Đặt lệnh ngay lập tức
app.post('/api/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, timeInForce, reduceOnly, leverage, marginType } = req.body;
    
    // Lấy thông tin precision của symbol
    const exchangeInfo = await getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
    
    if (!symbolInfo) {
      return res.status(400).json({ error: 'Symbol không tồn tại' });
    }
    
    // Lấy stepSize và precision
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
    const minQty = lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : null;
    
    // Tính quantityPrecision từ stepSize
    let quantityPrecision = 8;
    if (stepSize) {
      const stepSizeStr = stepSize.toString();
      if (stepSizeStr.includes('.')) {
        quantityPrecision = stepSizeStr.split('.')[1].length;
      } else if (stepSizeStr.includes('e')) {
        const match = stepSizeStr.match(/e-(\d+)/);
        if (match) {
          quantityPrecision = parseInt(match[1]);
        }
      }
    }
    
    // Làm tròn số lượng
    let roundedQuantity = roundQuantity(parseFloat(quantity), stepSize, quantityPrecision);
    
    // Kiểm tra nếu làm tròn thành 0
    if (roundedQuantity <= 0 && parseFloat(quantity) > 0) {
      return res.status(400).json({ 
        error: `Số lượng sau khi làm tròn = 0. Số lượng gốc: ${quantity}. ` +
               `Có thể do stepSize (${stepSize}) quá lớn hoặc số lượng quá nhỏ. ` +
               `Vui lòng tăng số lượng hoặc kiểm tra lại precision của symbol.`,
        originalQuantity: quantity,
        stepSize: stepSize,
        quantityPrecision: quantityPrecision
      });
    }
    
    // Kiểm tra minQty
    if (minQty && roundedQuantity < minQty) {
      return res.status(400).json({ 
        error: `Số lượng tối thiểu là ${minQty} hợp đồng. Số lượng đã làm tròn: ${roundedQuantity}` 
      });
    }
    
    // Tính notional (giá trị lệnh) và kiểm tra minimum notional
    let orderPrice = null;
    if (type.toUpperCase() === 'LIMIT') {
      orderPrice = parseFloat(price);
    } else {
      // MARKET order: lấy mark price
      try {
        const ticker = await client.getMarkPrice({ symbol: symbol.toUpperCase() });
        orderPrice = parseFloat(ticker.markPrice);
      } catch (error) {
        console.error('Lỗi khi lấy mark price:', error);
        // Fallback: sử dụng giá từ request nếu có
        orderPrice = parseFloat(price) || 0;
      }
    }
    
    const notional = roundedQuantity * orderPrice;
    const MIN_NOTIONAL = 5; // Binance yêu cầu tối thiểu 5 USDT
    
    // Kiểm tra notional (trừ khi reduceOnly)
    if (!reduceOnly && notional < MIN_NOTIONAL) {
      // Tính số lượng tối thiểu cần thiết
      const minQuantity = Math.ceil(MIN_NOTIONAL / orderPrice / stepSize) * stepSize;
      const adjustedQuantity = roundQuantity(minQuantity, stepSize, quantityPrecision);
      
      return res.status(400).json({ 
        error: `Giá trị lệnh (Notional) phải tối thiểu ${MIN_NOTIONAL} USDT. ` +
               `Hiện tại: ${notional.toFixed(2)} USDT (${roundedQuantity} hợp đồng × ${orderPrice.toFixed(8)}). ` +
               `Số lượng tối thiểu cần: ${adjustedQuantity} hợp đồng (≈${(adjustedQuantity * orderPrice).toFixed(2)} USDT)`,
        notional: notional,
        minNotional: MIN_NOTIONAL,
        suggestedQuantity: adjustedQuantity,
        currentQuantity: roundedQuantity,
        price: orderPrice
      });
    }
    
    // Đặt margin type trước
    if (marginType) {
      await setMarginType(symbol, marginType);
    }
    
    // Đặt đòn bẩy trước khi đặt lệnh
    if (leverage && leverage > 1) {
      await setLeverage(symbol, leverage);
    }
    
    const orderParams = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: roundedQuantity,
    };

    if (type.toUpperCase() === 'LIMIT') {
      orderParams.price = orderPrice;
      orderParams.timeInForce = timeInForce || 'GTC';
    }

    if (reduceOnly !== undefined) {
      orderParams.reduceOnly = reduceOnly;
    }

    const result = await client.submitNewOrder(orderParams);
    res.json({ success: true, order: result });
  } catch (error) {
    console.error('Lỗi khi đặt lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Đặt lệnh theo thời gian
app.post('/api/schedule-order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, timeInForce, scheduledTime, reduceOnly } = req.body;
    
    const targetTime = new Date(scheduledTime);
    const now = new Date();

    if (targetTime <= now) {
      return res.status(400).json({ error: 'Thời gian đặt lệnh phải trong tương lai' });
    }

    // Validate close position time if provided
    if (req.body.closePositionAtTime && req.body.closePositionTime) {
      const closeTimeDate = new Date(req.body.closePositionTime);
      if (closeTimeDate <= targetTime) {
        return res.status(400).json({ error: 'Thời gian cắt vị thế phải sau thời gian đặt lệnh' });
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const delay = targetTime.getTime() - now.getTime();
    
    // Kiểm tra delay hợp lệ (tối thiểu 1 giây, tối đa 1 năm)
    if (delay < 1000) {
      return res.status(400).json({ error: 'Thời gian đặt lệnh phải ít nhất 1 giây trong tương lai' });
    }
    if (delay > 365 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Thời gian đặt lệnh không được quá 1 năm' });
    }

    const orderData = {
      id: orderId,
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      timeInForce: timeInForce || 'GTC',
      scheduledTime: targetTime.toISOString(),
      closePositionAtTime: req.body.closePositionAtTime || false,
      closePositionTime: req.body.closePositionTime || null,
      reduceOnly: reduceOnly || false,
      leverage: req.body.leverage ? parseInt(req.body.leverage) : 1,
      marginType: req.body.marginType || 'CROSSED',
      status: 'scheduled',
      orderId: null // Will be set after order is placed
    };

    // Lưu thông tin lệnh
    scheduledOrders.set(orderId, orderData);

    // Hẹn giờ thực thi lệnh với độ chính xác cao
    // Sử dụng setInterval để kiểm tra chính xác đến giây
    const checkInterval = setInterval(async () => {
      const currentTime = new Date().getTime();
      const targetTimeMs = targetTime.getTime();
      const remaining = targetTimeMs - currentTime;
      
      // Nếu còn hơn 1 giây, chờ tiếp
      if (remaining > 1000) {
        return;
      }
      
      // Nếu đã đến hoặc quá thời gian (trong vòng 1 giây), thực thi
      clearInterval(checkInterval);
      
      try {
        // Lấy thông tin precision và làm tròn số lượng
        const exchangeInfo = await getExchangeInfo();
        const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === orderData.symbol);
        
        if (symbolInfo) {
          const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
          const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
          
          let quantityPrecision = 8;
          if (stepSize) {
            const stepSizeStr = stepSize.toString();
            if (stepSizeStr.includes('.')) {
              quantityPrecision = stepSizeStr.split('.')[1].length;
            } else if (stepSizeStr.includes('e')) {
              const match = stepSizeStr.match(/e-(\d+)/);
              if (match) {
                quantityPrecision = parseInt(match[1]);
              }
            }
          }
          
          // Làm tròn số lượng
          orderData.quantity = roundQuantity(orderData.quantity, stepSize, quantityPrecision);
        }
        
        // Tính và kiểm tra notional
        let orderPrice = null;
        if (orderData.type === 'LIMIT' && orderData.price) {
          orderPrice = orderData.price;
        } else {
          // MARKET order: lấy mark price
          try {
            const ticker = await client.getMarkPrice({ symbol: orderData.symbol });
            orderPrice = parseFloat(ticker.markPrice);
          } catch (error) {
            console.error('Lỗi khi lấy mark price:', error);
            orderPrice = orderData.price || 0;
          }
        }
        
        const notional = orderData.quantity * orderPrice;
        const MIN_NOTIONAL = 5;
        
        // Kiểm tra notional (trừ khi reduceOnly)
        if (!orderData.reduceOnly && notional < MIN_NOTIONAL) {
          orderData.status = 'failed';
          orderData.error = `Giá trị lệnh (Notional) phải tối thiểu ${MIN_NOTIONAL} USDT. Hiện tại: ${notional.toFixed(2)} USDT`;
          orderData.executedAt = new Date().toISOString();
          console.error(`❌ Lệnh ${orderId} thất bại: ${orderData.error}`);
          return;
        }
        
        // Đặt margin type trước
        if (orderData.marginType) {
          await setMarginType(orderData.symbol, orderData.marginType);
        }
        
        // Đặt đòn bẩy trước khi đặt lệnh
        if (orderData.leverage && orderData.leverage > 1) {
          await setLeverage(orderData.symbol, orderData.leverage);
        }
        
        const orderParams = {
          symbol: orderData.symbol,
          side: orderData.side,
          type: orderData.type,
          quantity: orderData.quantity,
        };

        if (orderData.type === 'LIMIT' && orderPrice) {
          orderParams.price = orderPrice;
          orderParams.timeInForce = orderData.timeInForce;
        }

        if (orderData.reduceOnly) {
          orderParams.reduceOnly = orderData.reduceOnly;
        }

        const actualExecutionTime = new Date();
        const result = await client.submitNewOrder(orderParams);
        orderData.status = 'executed';
        orderData.result = result;
        orderData.orderId = result.orderId; // Save orderId for cancellation
        orderData.executedAt = actualExecutionTime.toISOString();
        orderData.scheduledTimeMs = targetTimeMs;
        orderData.actualTimeMs = actualExecutionTime.getTime();
        orderData.delayMs = actualExecutionTime.getTime() - targetTimeMs;
        
        console.log(`✅ Lệnh ${orderId} đã được thực thi vào ${actualExecutionTime.toISOString()}`);
        console.log(`   Thời gian dự kiến: ${targetTime.toISOString()}`);
        console.log(`   Độ lệch: ${orderData.delayMs}ms`);
        console.log(`   OrderId: ${result.orderId}`);
        
        // Auto close position at scheduled time if enabled
        if (orderData.closePositionAtTime && orderData.closePositionTime) {
          const closeTimeDate = new Date(orderData.closePositionTime);
          const closeDelay = closeTimeDate.getTime() - actualExecutionTime.getTime();
          
          if (closeDelay > 0) {
            const closeTimeoutId = setTimeout(async () => {
              try {
                console.log(`🔴 Đến thời gian cắt vị thế ${orderData.symbol}...`);
                
                // Get current position
                const positions = await client.getPositions({ symbol: orderData.symbol });
                const position = positions.find(p => parseFloat(p.positionAmt || 0) !== 0);
                
                if (position) {
                  const positionAmt = parseFloat(position.positionAmt || 0);
                  
                  if (positionAmt !== 0) {
                    // Determine side to close
                    const side = positionAmt > 0 ? 'SELL' : 'BUY';
                    const quantity = Math.abs(positionAmt);
                    
                    // Get precision
                    const exchangeInfo = await getExchangeInfo();
                    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === orderData.symbol);
                    
                    let roundedQuantity = quantity;
                    if (symbolInfo) {
                      const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
                      const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
                      
                      let quantityPrecision = 8;
                      if (stepSize) {
                        const stepSizeStr = stepSize.toString();
                        if (stepSizeStr.includes('.')) {
                          quantityPrecision = stepSizeStr.split('.')[1].length;
                        } else if (stepSizeStr.includes('e')) {
                          const match = stepSizeStr.match(/e-(\d+)/);
                          if (match) {
                            quantityPrecision = parseInt(match[1]);
                          }
                        }
                      }
                      
                      roundedQuantity = roundQuantity(quantity, stepSize, quantityPrecision);
                    }
                    
                    // Close position with MARKET order
                    const closeOrderParams = {
                      symbol: orderData.symbol,
                      side: side,
                      type: 'MARKET',
                      quantity: roundedQuantity,
                      reduceOnly: true
                    };
                    
                    const closeResult = await client.submitNewOrder(closeOrderParams);
                    orderData.positionClosedAtTime = true;
                    orderData.positionClosedAtTimeAt = new Date().toISOString();
                    orderData.closeOrderIdAtTime = closeResult.orderId;
                    
                    console.log(`✅ Đã cắt vị thế ${orderData.symbol} theo thời gian: OrderId ${closeResult.orderId}`);
                  } else {
                    console.log(`ℹ️  Vị thế ${orderData.symbol} đã được đóng (positionAmt = 0)`);
                    orderData.positionClosedAtTime = true;
                    orderData.positionClosedAtTimeAt = new Date().toISOString();
                  }
                } else {
                  console.log(`ℹ️  Không có vị thế nào để đóng cho ${orderData.symbol}`);
                  orderData.positionClosedAtTime = true;
                  orderData.positionClosedAtTimeAt = new Date().toISOString();
                }
              } catch (closeError) {
                console.error(`❌ Lỗi khi cắt vị thế ${orderData.symbol} theo thời gian:`, closeError);
                orderData.positionCloseAtTimeError = closeError.message;
              }
            }, closeDelay);
            
            orderData.closePositionTimeoutId = closeTimeoutId;
            console.log(`⏰ Đã lên lịch cắt vị thế ${orderData.symbol} vào ${closeTimeDate.toISOString()}`);
          } else {
            console.log(`⚠️  Thời gian cắt vị thế đã qua, không thể lên lịch`);
          }
        }
        
        // Auto close position after fill if enabled
        if (orderData.closePositionAfterFill && result.orderId) {
          // Check order status periodically and close position when filled
          const checkOrderStatus = setInterval(async () => {
            try {
              // Get order status
              const orderStatus = await client.getOrder({
                symbol: orderData.symbol,
                orderId: result.orderId
              });
              
              // If order is filled (FILLED status), close position
              if (orderStatus.status === 'FILLED' || parseFloat(orderStatus.executedQty || 0) > 0) {
                clearInterval(checkOrderStatus);
                
                console.log(`🔴 Lệnh ${orderId} đã khớp, đang đóng vị thế ${orderData.symbol}...`);
                
                try {
                  // Get current position
                  const positions = await client.getPositions({ symbol: orderData.symbol });
                  const position = positions.find(p => parseFloat(p.positionAmt || 0) !== 0);
                  
                  if (position) {
                    const positionAmt = parseFloat(position.positionAmt || 0);
                    
                    if (positionAmt !== 0) {
                      // Determine side to close
                      const side = positionAmt > 0 ? 'SELL' : 'BUY';
                      const quantity = Math.abs(positionAmt);
                      
                      // Get precision
                      const exchangeInfo = await getExchangeInfo();
                      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === orderData.symbol);
                      
                      let roundedQuantity = quantity;
                      if (symbolInfo) {
                        const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
                        const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
                        
                        let quantityPrecision = 8;
                        if (stepSize) {
                          const stepSizeStr = stepSize.toString();
                          if (stepSizeStr.includes('.')) {
                            quantityPrecision = stepSizeStr.split('.')[1].length;
                          } else if (stepSizeStr.includes('e')) {
                            const match = stepSizeStr.match(/e-(\d+)/);
                            if (match) {
                              quantityPrecision = parseInt(match[1]);
                            }
                          }
                        }
                        
                        roundedQuantity = roundQuantity(quantity, stepSize, quantityPrecision);
                      }
                      
                      // Close position with MARKET order
                      const closeOrderParams = {
                        symbol: orderData.symbol,
                        side: side,
                        type: 'MARKET',
                        quantity: roundedQuantity,
                        reduceOnly: true
                      };
                      
                      const closeResult = await client.submitNewOrder(closeOrderParams);
                      orderData.positionClosed = true;
                      orderData.positionClosedAt = new Date().toISOString();
                      orderData.closeOrderId = closeResult.orderId;
                      
                      console.log(`✅ Đã đóng vị thế ${orderData.symbol}: OrderId ${closeResult.orderId}`);
                    } else {
                      console.log(`ℹ️  Vị thế ${orderData.symbol} đã được đóng (positionAmt = 0)`);
                      orderData.positionClosed = true;
                      orderData.positionClosedAt = new Date().toISOString();
                    }
                  } else {
                    console.log(`ℹ️  Không có vị thế nào để đóng cho ${orderData.symbol}`);
                    orderData.positionClosed = true;
                    orderData.positionClosedAt = new Date().toISOString();
                  }
                } catch (closeError) {
                  console.error(`❌ Lỗi khi đóng vị thế ${orderData.symbol}:`, closeError);
                  orderData.positionCloseError = closeError.message;
                }
              }
            } catch (error) {
              // Order might not exist yet or other error, continue checking
              console.log(`⏳ Đang chờ lệnh ${orderId} khớp...`);
            }
          }, 100); // Check every 100ms (0.1 seconds) for very fast response
          
          // Stop checking after 5 minutes
          setTimeout(() => {
            clearInterval(checkOrderStatus);
            if (!orderData.positionClosed) {
              console.log(`⏰ Đã hết thời gian chờ đóng vị thế cho lệnh ${orderId}`);
            }
          }, 5 * 60 * 1000); // 5 minutes
          
          orderData.positionCheckInterval = checkOrderStatus;
          console.log(`🔴 Đã bật chế độ tự động đóng vị thế cho lệnh ${orderId}`);
        }
      } catch (error) {
        orderData.status = 'failed';
        orderData.error = error.message;
        orderData.executedAt = new Date().toISOString();
        console.error(`❌ Lỗi khi thực thi lệnh ${orderId}:`, error);
      }
    }, 100); // Kiểm tra mỗi 100ms để đảm bảo chính xác
    
    // Fallback timeout để đảm bảo lệnh được thực thi
    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
    }, delay + 2000); // Thêm 2 giây buffer

    orderData.timeoutId = timeoutId;
    orderData.checkInterval = checkInterval;

    // Tạo response object không chứa circular references
    const responseOrder = {
      id: orderData.id,
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      quantity: orderData.quantity,
      price: orderData.price,
      timeInForce: orderData.timeInForce,
      scheduledTime: orderData.scheduledTime,
      closePositionAtTime: orderData.closePositionAtTime,
      closePositionTime: orderData.closePositionTime,
      reduceOnly: orderData.reduceOnly,
      leverage: orderData.leverage,
      marginType: orderData.marginType,
      status: orderData.status
    };

    res.json({ 
      success: true, 
      orderId,
      message: `Lệnh sẽ được thực thi vào lúc ${targetTime.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })}`,
      scheduledTime: targetTime.toISOString(),
      order: responseOrder
    });
  } catch (error) {
    console.error('Lỗi khi lên lịch lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy danh sách lệnh đã lên lịch
app.get('/api/scheduled-orders', (req, res) => {
  const orders = Array.from(scheduledOrders.values());
  // Filter out circular references (timeoutId, checkInterval)
  const cleanOrders = orders.map(order => {
    const cleanOrder = {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      timeInForce: order.timeInForce,
        scheduledTime: order.scheduledTime,
        closePositionAtTime: order.closePositionAtTime,
        closePositionTime: order.closePositionTime,
        reduceOnly: order.reduceOnly,
        leverage: order.leverage,
        marginType: order.marginType,
        status: order.status,
        orderId: order.orderId,
        executedAt: order.executedAt,
      cancelledAt: order.cancelledAt,
      result: order.result,
      error: order.error,
      scheduledTimeMs: order.scheduledTimeMs,
      actualTimeMs: order.actualTimeMs,
      delayMs: order.delayMs,
      closePositionAfterFill: order.closePositionAfterFill,
      positionClosed: order.positionClosed,
      positionClosedAt: order.positionClosedAt,
      closeOrderId: order.closeOrderId,
      positionCloseError: order.positionCloseError,
      closePositionAtTime: order.closePositionAtTime,
      closePositionTime: order.closePositionTime,
      positionClosedAtTime: order.positionClosedAtTime,
      positionClosedAtTimeAt: order.positionClosedAtTimeAt,
      closeOrderIdAtTime: order.closeOrderIdAtTime,
      positionCloseAtTimeError: order.positionCloseAtTimeError
    };
    return cleanOrder;
  });
  res.json(cleanOrders);
});

// API: Hủy lệnh đã lên lịch
app.delete('/api/scheduled-order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🗑️  Yêu cầu hủy lệnh: ${orderId}`);
    
    const order = scheduledOrders.get(orderId);
    
    if (!order) {
      console.error(`❌ Không tìm thấy lệnh: ${orderId}`);
      return res.status(404).json({ error: 'Không tìm thấy lệnh' });
    }

    console.log(`📋 Trạng thái lệnh: ${order.status}`);

    if (order.status === 'scheduled') {
      // Hủy timeout và interval
      if (order.timeoutId) {
        clearTimeout(order.timeoutId);
        console.log(`✅ Đã hủy timeout: ${orderId}`);
      }
      if (order.checkInterval) {
        clearInterval(order.checkInterval);
        console.log(`✅ Đã hủy checkInterval: ${orderId}`);
      }
      if (order.positionCheckInterval) {
        clearInterval(order.positionCheckInterval);
        console.log(`✅ Đã hủy positionCheckInterval: ${orderId}`);
      }
      
      order.status = 'cancelled';
      order.cancelledAt = new Date().toISOString();
      
      // Xóa khỏi Map sau khi hủy
      scheduledOrders.set(orderId, order);
      
      // Create clean order object without circular references
      const cleanOrder = {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        timeInForce: order.timeInForce,
        scheduledTime: order.scheduledTime,
        closePositionAtTime: order.closePositionAtTime,
        closePositionTime: order.closePositionTime,
        reduceOnly: order.reduceOnly,
        leverage: order.leverage,
        marginType: order.marginType,
        status: order.status,
        cancelledAt: order.cancelledAt
      };
      
      console.log(`✅ Đã hủy lệnh thành công: ${orderId}`);
      res.json({ success: true, message: 'Đã hủy lệnh', order: cleanOrder });
    } else if (order.status === 'executed' && order.orderId && order.closePositionTimeoutId) {
      // Cancel the auto-close position timeout if order is manually cancelled
      clearTimeout(order.closePositionTimeoutId);
      order.closePositionTimeoutId = null;
      scheduledOrders.set(orderId, order);
      
      console.log(`✅ Đã hủy lịch tự động cắt vị thế: ${orderId}`);
      
      // Create clean order object without circular references
      const cleanOrder = {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        timeInForce: order.timeInForce,
        scheduledTime: order.scheduledTime,
        closePositionAtTime: order.closePositionAtTime,
        closePositionTime: order.closePositionTime,
        reduceOnly: order.reduceOnly,
        leverage: order.leverage,
        marginType: order.marginType,
        status: order.status,
        orderId: order.orderId,
        executedAt: order.executedAt
      };
      
      res.json({ success: true, message: 'Đã hủy lịch tự động cắt vị thế', order: cleanOrder });
    } else {
      console.error(`❌ Lệnh không thể hủy. Trạng thái: ${order.status}, orderId: ${order.orderId}, closePositionTimeoutId: ${order.closePositionTimeoutId}`);
      res.status(400).json({ 
        error: `Lệnh không thể hủy. Trạng thái: ${order.status}`,
        status: order.status,
        orderId: order.orderId
      });
    }
  } catch (error) {
    console.error('Lỗi khi hủy lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lệnh đang chờ khớp (Open Orders)
// Endpoint: GET /fapi/v1/openOrders
// - Trả về các lệnh limit/stop... chưa khớp hết, status NEW/PARTIALLY_FILLED
// - Nếu có symbol: trọng số 1
// - Nếu không có symbol: trả về tất cả orders, trọng số 40
app.get('/api/open-orders', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    let orders = [];
    
    try {
      if (symbol) {
        // Lấy orders cho 1 symbol cụ thể (trọng số 1)
        orders = await client.getAllOpenOrders({ 
          symbol: symbol.toUpperCase(),
          recvWindow: 5000
        });
        console.log(`📊 [Open Orders] Lấy được ${orders.length} lệnh đang chờ cho ${symbol}`);
      } else {
        // Lấy TẤT CẢ lệnh đang chờ - không có symbol (trọng số 40)
        // Theo tài liệu: không có symbol sẽ trả về tất cả orders
        console.log('🔍 [Open Orders] Đang lấy tất cả lệnh đang chờ (trọng số: 40)...');
        
        orders = await client.getAllOpenOrders({
          recvWindow: 5000
        });
        
        console.log(`📊 [Open Orders] getAllOpenOrders() trả về ${orders.length} lệnh`);
        
        // Kiểm tra: nếu chỉ có 1 lệnh nhưng có nhiều symbols có positions
        // Có thể cần lấy từ từng symbol để đảm bảo không bỏ sót
        if (orders.length <= 1) {
          console.log('⚠️  [Open Orders] Có ít lệnh, kiểm tra lại từ các symbols có positions...');
          
          try {
            // Lấy danh sách symbols có positions hoặc open orders
            const positions = await client.getPositions();
            const symbolsWithActivity = positions
              .filter(p => {
                const positionAmt = parseFloat(p.positionAmt || 0);
                const openOrderInitialMargin = parseFloat(p.openOrderInitialMargin || 0);
                // Có vị thế HOẶC có open orders (openOrderInitialMargin > 0)
                return positionAmt !== 0 || openOrderInitialMargin > 0;
              })
              .map(p => p.symbol);
            
            console.log(`🔍 [Open Orders] Tìm thấy ${symbolsWithActivity.length} symbols có hoạt động: ${symbolsWithActivity.join(', ')}`);
            
            // Lấy orders từ từng symbol có hoạt động
            const allOrdersMap = new Map();
            
            // Thêm orders đã có
            orders.forEach(order => {
              allOrdersMap.set(order.orderId, order);
            });
            
            // Lấy từ từng symbol
            for (const sym of symbolsWithActivity) {
              try {
                const symOrders = await client.getAllOpenOrders({ 
                  symbol: sym,
                  recvWindow: 5000
                });
                if (Array.isArray(symOrders) && symOrders.length > 0) {
                  console.log(`  ✓ ${sym}: ${symOrders.length} lệnh đang chờ`);
                  symOrders.forEach(order => {
                    if (!allOrdersMap.has(order.orderId)) {
                      allOrdersMap.set(order.orderId, order);
                    }
                  });
                }
              } catch (err) {
                console.error(`  ❌ ${sym}: Lỗi - ${err.message}`);
              }
            }
            
            orders = Array.from(allOrdersMap.values());
            console.log(`📊 [Open Orders] Tổng cộng: ${orders.length} lệnh đang chờ`);
          } catch (fallbackError) {
            console.error('Lỗi khi fallback:', fallbackError.message);
          }
        }
        
        // Log phân bố orders theo symbol
        if (orders.length > 0) {
          const ordersBySymbol = {};
          orders.forEach(order => {
            if (!ordersBySymbol[order.symbol]) {
              ordersBySymbol[order.symbol] = 0;
            }
            ordersBySymbol[order.symbol]++;
          });
          console.log('📋 [Open Orders] Phân bố theo symbol:', ordersBySymbol);
        } else {
          console.log('ℹ️  [Open Orders] Không có lệnh nào đang chờ khớp');
        }
      }
      
      // Kiểm tra orders là array
      if (!Array.isArray(orders)) {
        console.error('❌ Orders không phải array:', orders);
        orders = [];
      }
    } catch (error) {
      console.error('❌ Lỗi khi gọi getAllOpenOrders:', error);
      console.error('Error details:', error.message);
      orders = [];
    }
    
    // Get positions to calculate PnL
    let positions = [];
    try {
      positions = await client.getPositions();
    } catch (error) {
      console.error('Lỗi khi lấy positions:', error);
    }
    
    // Combine order info with position info
    const ordersWithPnL = orders.map(order => {
      const position = positions.find(p => p.symbol === order.symbol);
      return {
        ...order,
        position: position ? {
          positionAmt: parseFloat(position.positionAmt || 0),
          entryPrice: parseFloat(position.entryPrice || 0),
          markPrice: parseFloat(position.markPrice || 0),
          unRealizedProfit: parseFloat(position.unRealizedProfit || 0),
          leverage: parseInt(position.leverage || 1)
        } : null
      };
    });
    
    console.log(`✅ Trả về ${ordersWithPnL.length} lệnh với thông tin PnL`);
    res.json(ordersWithPnL);
  } catch (error) {
    console.error('Lỗi khi lấy lệnh đang chạy:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Hủy lệnh đang chạy
app.post('/api/cancel-order', async (req, res) => {
  try {
    const { symbol, orderId } = req.body;
    
    if (!symbol || !orderId) {
      return res.status(400).json({ error: 'Thiếu symbol hoặc orderId' });
    }

    const result = await client.cancelOrder({
      symbol: symbol.toUpperCase(),
      orderId: parseInt(orderId)
    });
    
    res.json({ success: true, order: result });
  } catch (error) {
    console.error('Lỗi khi hủy lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Đóng/Hủy vị thế đang mở (Close Position)
// Theo tài liệu: Không có API riêng để đóng vị thế
// Phải dùng lệnh MARKET ngược lại với reduceOnly=true
// - Nếu positionAmt > 0 (long) → đặt SELL
// - Nếu positionAmt < 0 (short) → đặt BUY
// - quantity = abs(positionAmt)
app.post('/api/close-position', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Thiếu symbol' });
    }

    // Bước 1: Lấy vị thế hiện tại
    const positions = await client.getPositions({ symbol: symbol.toUpperCase() });
    const position = positions.find(p => parseFloat(p.positionAmt || 0) !== 0);
    
    if (!position) {
      return res.status(400).json({ error: `Không có vị thế nào đang mở cho ${symbol}` });
    }

    const positionAmt = parseFloat(position.positionAmt || 0);
    
    if (positionAmt === 0) {
      return res.status(400).json({ error: 'Vị thế đã đóng (positionAmt = 0)' });
    }

    // Bước 2: Xác định side để đóng
    // Nếu positionAmt > 0 (long) → đặt SELL
    // Nếu positionAmt < 0 (short) → đặt BUY
    const side = positionAmt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(positionAmt);

    // Bước 3: Lấy precision để làm tròn quantity
    const exchangeInfo = await getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
    
    if (!symbolInfo) {
      return res.status(400).json({ error: 'Symbol không tồn tại' });
    }

    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
    
    let quantityPrecision = 8;
    if (stepSize) {
      const stepSizeStr = stepSize.toString();
      if (stepSizeStr.includes('.')) {
        quantityPrecision = stepSizeStr.split('.')[1].length;
      } else if (stepSizeStr.includes('e')) {
        const match = stepSizeStr.match(/e-(\d+)/);
        if (match) {
          quantityPrecision = parseInt(match[1]);
        }
      }
    }

    // Làm tròn quantity
    let roundedQuantity = roundQuantity(quantity, stepSize, quantityPrecision);

    console.log(`🔄 Đóng vị thế ${symbol}:`);
    console.log(`   Vị thế hiện tại: ${positionAmt} (${positionAmt > 0 ? 'LONG' : 'SHORT'})`);
    console.log(`   Lệnh đóng: ${side} ${roundedQuantity} hợp đồng (reduceOnly=true)`);

    // Bước 4: Gửi lệnh MARKET reduce-only để đóng
    const orderParams = {
      symbol: symbol.toUpperCase(),
      side: side,
      type: 'MARKET',
      quantity: roundedQuantity,
      reduceOnly: true // Quan trọng: chỉ đóng, không mở thêm
    };

    const result = await client.submitNewOrder(orderParams);
    
    console.log(`✅ Đã đóng vị thế ${symbol}: OrderId ${result.orderId}`);
    
    res.json({ 
      success: true, 
      message: `Đã đặt lệnh đóng vị thế ${symbol}`,
      position: {
        symbol: symbol,
        originalPositionAmt: positionAmt,
        side: side,
        quantity: roundedQuantity
      },
      order: result
    });
  } catch (error) {
    console.error('Lỗi khi đóng vị thế:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lịch sử lệnh
app.get('/api/orders-history', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;
    const params = { limit: parseInt(limit) };
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }
    const orders = await client.getAllOrders(params);
    res.json(orders);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lịch sử vị thế đã đóng (từ userTrades)
app.get('/api/position-history', async (req, res) => {
  try {
    const { symbol, limit = 100 } = req.query;
    const params = { limit: parseInt(limit) };
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }
    
    // Lấy user trades
    const trades = await client.getAccountTrades(params);
    
    // Nhóm trades thành các vị thế đã đóng
    const positionMap = new Map();
    
    trades.forEach(trade => {
      const key = `${trade.symbol}_${trade.side}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, {
          symbol: trade.symbol,
          side: trade.side,
          trades: [],
          totalRealizedPnl: 0,
          totalCommission: 0,
          totalQuantity: 0,
          openTime: null,
          closeTime: null
        });
      }
      
      const position = positionMap.get(key);
      position.trades.push(trade);
      position.totalRealizedPnl += parseFloat(trade.realizedPnl || 0);
      position.totalCommission += parseFloat(trade.commission || 0);
      position.totalQuantity += parseFloat(trade.qty || 0);
      
      const tradeTime = parseInt(trade.time);
      if (!position.openTime || tradeTime < position.openTime) {
        position.openTime = tradeTime;
      }
      if (!position.closeTime || tradeTime > position.closeTime) {
        position.closeTime = tradeTime;
      }
    });
    
    // Convert to array and format
    const positions = Array.from(positionMap.values()).map(pos => ({
      symbol: pos.symbol,
      side: pos.side,
      sideText: pos.side === 'BUY' ? 'LONG' : 'SHORT',
      totalRealizedPnl: pos.totalRealizedPnl,
      totalCommission: pos.totalCommission,
      totalQuantity: pos.totalQuantity,
      openTime: pos.openTime,
      closeTime: pos.closeTime,
      tradeCount: pos.trades.length,
      avgPrice: pos.trades.length > 0 
        ? pos.trades.reduce((sum, t) => sum + parseFloat(t.price || 0), 0) / pos.trades.length 
        : 0
    }));
    
    // Sort by closeTime descending (newest first)
    positions.sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));
    
    res.json(positions);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử vị thế:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lịch sử funding income
app.get('/api/funding-income', async (req, res) => {
  try {
    const { symbol, limit = 100, startTime, endTime } = req.query;
    const params = {
      incomeType: 'FUNDING_FEE',
      limit: parseInt(limit)
    };
    
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }
    if (startTime) {
      params.startTime = parseInt(startTime);
    }
    if (endTime) {
      params.endTime = parseInt(endTime);
    }
    
    const income = await client.getIncomeHistory(params);
    
    // Format response
    const formattedIncome = income.map(item => ({
      symbol: item.symbol,
      income: parseFloat(item.income || 0),
      incomeType: item.incomeType,
      time: parseInt(item.time || 0),
      info: item.info || ''
    }));
    
    // Sort by time descending (newest first)
    formattedIncome.sort((a, b) => b.time - a.time);
    
    res.json(formattedIncome);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử funding income:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lịch sử funding rate
app.get('/api/funding-rate', async (req, res) => {
  try {
    const { symbol, limit = 100 } = req.query;
    const params = { limit: parseInt(limit) };
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }
    
    const fundingRates = await client.getFundingRateHistory(params);
    
    // Format response
    const formattedRates = fundingRates.map(rate => ({
      symbol: rate.symbol,
      fundingRate: parseFloat(rate.fundingRate || 0),
      fundingTime: parseInt(rate.fundingTime || 0),
      markPrice: parseFloat(rate.markPrice || 0)
    }));
    
    // Sort by absolute fundingRate descending (highest abs value first: -2.2% = 2.2% > 1.0% > 0%)
    formattedRates.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
    
    res.json(formattedRates);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử funding rate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route chính - phải đặt sau tất cả các API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route cho các route không tồn tại
app.use((req, res) => {
  res.status(404).json({ error: 'Route không tồn tại', path: req.path });
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 Binance Futures Trading Platform`);
});

