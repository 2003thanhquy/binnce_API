const express = require('express');
const router = express.Router();
const { client, getExchangeInfo } = require('../config/binance');
const { roundQuantity, calculateQuantityPrecision, getSymbolPrecision } = require('../utils/precision');
const { setLeverage, setMarginType } = require('../utils/binanceHelpers');

// API: Đặt lệnh ngay lập tức
router.post('/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, timeInForce, reduceOnly, leverage, marginType } = req.body;
    
    // Lấy thông tin precision của symbol
    const exchangeInfo = await getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
    
    if (!symbolInfo) {
      return res.status(400).json({ error: 'Symbol không tồn tại' });
    }
    
    const precision = getSymbolPrecision(symbolInfo);
    
    // Làm tròn số lượng
    let roundedQuantity = roundQuantity(parseFloat(quantity), precision.stepSize, precision.quantityPrecision);
    
    // Kiểm tra nếu làm tròn thành 0
    if (roundedQuantity <= 0 && parseFloat(quantity) > 0) {
      return res.status(400).json({ 
        error: `Số lượng sau khi làm tròn = 0. Số lượng gốc: ${quantity}. ` +
               `Có thể do stepSize (${precision.stepSize}) quá lớn hoặc số lượng quá nhỏ. ` +
               `Vui lòng tăng số lượng hoặc kiểm tra lại precision của symbol.`,
        originalQuantity: quantity,
        stepSize: precision.stepSize,
        quantityPrecision: precision.quantityPrecision
      });
    }
    
    // Kiểm tra minQty
    if (precision.minQty && roundedQuantity < precision.minQty) {
      return res.status(400).json({ 
        error: `Số lượng tối thiểu là ${precision.minQty} hợp đồng. Số lượng đã làm tròn: ${roundedQuantity}` 
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
        orderPrice = parseFloat(price) || 0;
      }
    }
    
    const notional = roundedQuantity * orderPrice;
    const MIN_NOTIONAL = 5; // Binance yêu cầu tối thiểu 5 USDT
    
    // Kiểm tra notional (trừ khi reduceOnly)
    if (!reduceOnly && notional < MIN_NOTIONAL) {
      // Tính số lượng tối thiểu cần thiết
      const minQuantity = Math.ceil(MIN_NOTIONAL / orderPrice / (precision.stepSize || 1)) * (precision.stepSize || 1);
      const adjustedQuantity = roundQuantity(minQuantity, precision.stepSize, precision.quantityPrecision);
      
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

// API: Lấy lệnh đang chờ khớp (Open Orders)
router.get('/open-orders', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    let orders = [];
    
    try {
      if (symbol) {
        orders = await client.getAllOpenOrders({ 
          symbol: symbol.toUpperCase(),
          recvWindow: 5000
        });
        console.log(`📊 [Open Orders] Lấy được ${orders.length} lệnh đang chờ cho ${symbol}`);
      } else {
        console.log('🔍 [Open Orders] Đang lấy tất cả lệnh đang chờ (trọng số: 40)...');
        
        orders = await client.getAllOpenOrders({
          recvWindow: 5000
        });
        
        console.log(`📊 [Open Orders] getAllOpenOrders() trả về ${orders.length} lệnh`);
        
        if (orders.length <= 1) {
          console.log('⚠️  [Open Orders] Có ít lệnh, kiểm tra lại từ các symbols có positions...');
          
          try {
            const positions = await client.getPositions();
            const symbolsWithActivity = positions
              .filter(p => {
                const positionAmt = parseFloat(p.positionAmt || 0);
                const openOrderInitialMargin = parseFloat(p.openOrderInitialMargin || 0);
                return positionAmt !== 0 || openOrderInitialMargin > 0;
              })
              .map(p => p.symbol);
            
            console.log(`🔍 [Open Orders] Tìm thấy ${symbolsWithActivity.length} symbols có hoạt động: ${symbolsWithActivity.join(', ')}`);
            
            const allOrdersMap = new Map();
            orders.forEach(order => {
              allOrdersMap.set(order.orderId, order);
            });
            
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
      
      if (!Array.isArray(orders)) {
        console.error('❌ Orders không phải array:', orders);
        orders = [];
      }
    } catch (error) {
      console.error('❌ Lỗi khi gọi getAllOpenOrders:', error);
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
router.post('/cancel-order', async (req, res) => {
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

// API: Lấy lịch sử lệnh
router.get('/orders-history', async (req, res) => {
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

module.exports = router;

