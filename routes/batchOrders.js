const express = require('express');
const router = express.Router();
const { client } = require('../config/binance');
const { getExchangeInfo } = require('../config/binance');
const { roundQuantity, getSymbolPrecision } = require('../utils/precision');
const { setLeverage, setMarginType } = require('../utils/binanceHelpers');

// API: Đặt nhiều lệnh cùng lúc (batch orders)
router.post('/batch-orders', async (req, res) => {
  try {
    const { orders } = req.body; // Array of order objects
    
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'orders phải là array không rỗng' });
    }
    
    if (orders.length > 5) {
      return res.status(400).json({ error: 'Tối đa 5 lệnh mỗi lần' });
    }
    
    const exchangeInfo = await getExchangeInfo();
    const results = [];
    const errors = [];
    
    // Process each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      try {
        const { symbol, side, type, quantity, price, timeInForce, reduceOnly, leverage, marginType } = order;
        
        // Get symbol precision
        const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
        if (!symbolInfo) {
          errors.push({ index: i, error: 'Symbol không tồn tại' });
          continue;
        }
        
        const precision = getSymbolPrecision(symbolInfo);
        
        // Round quantity
        let roundedQuantity = roundQuantity(parseFloat(quantity), precision.stepSize, precision.quantityPrecision);
        
        if (roundedQuantity <= 0 && parseFloat(quantity) > 0) {
          errors.push({ index: i, error: 'Số lượng sau khi làm tròn = 0' });
          continue;
        }
        
        // Set margin type and leverage if provided
        if (marginType) {
          await setMarginType(symbol, marginType);
        }
        if (leverage && leverage > 1) {
          await setLeverage(symbol, leverage);
        }
        
        // Prepare order params
        const orderParams = {
          symbol: symbol.toUpperCase(),
          side: side.toUpperCase(),
          type: type.toUpperCase(),
          quantity: roundedQuantity,
        };
        
        if (type.toUpperCase() === 'LIMIT' && price) {
          orderParams.price = parseFloat(price);
          orderParams.timeInForce = timeInForce || 'GTC';
        }
        
        if (reduceOnly !== undefined) {
          orderParams.reduceOnly = reduceOnly;
        }
        
        // Submit order
        const result = await client.submitNewOrder(orderParams);
        results.push({
          index: i,
          success: true,
          order: result
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }
    
    res.json({
      success: results.length > 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: orders.length,
        success: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Lỗi khi đặt batch orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Hủy nhiều lệnh cùng lúc
router.delete('/batch-orders', async (req, res) => {
  try {
    const { symbol, orderIdList } = req.body; // orderIdList: array of orderIds
    
    if (!symbol) {
      return res.status(400).json({ error: 'Thiếu symbol' });
    }
    
    if (!Array.isArray(orderIdList) || orderIdList.length === 0) {
      return res.status(400).json({ error: 'orderIdList phải là array không rỗng' });
    }
    
    if (orderIdList.length > 10) {
      return res.status(400).json({ error: 'Tối đa 10 lệnh mỗi lần' });
    }
    
    const result = await client.cancelMultipleOrders({
      symbol: symbol.toUpperCase(),
      orderIdList: orderIdList.map(id => parseInt(id))
    });
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Lỗi khi hủy batch orders:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

