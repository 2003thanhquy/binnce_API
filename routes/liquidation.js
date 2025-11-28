const express = require('express');
const router = express.Router();
const { client } = require('../config/binance');

// API: Lấy lịch sử lệnh thanh lý (liquidation/force orders)
router.get('/force-orders', async (req, res) => {
  try {
    const { symbol, startTime, endTime, limit = 100 } = req.query;
    
    const params = {
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
    
    const forceOrders = await client.getForceOrders(params);
    
    // Format response
    const formattedOrders = forceOrders.map(order => ({
      orderId: order.orderId,
      symbol: order.symbol,
      status: order.status,
      clientOrderId: order.clientOrderId,
      price: parseFloat(order.price || 0),
      avgPrice: parseFloat(order.avgPrice || 0),
      origQty: parseFloat(order.origQty || 0),
      executedQty: parseFloat(order.executedQty || 0),
      cumQuote: parseFloat(order.cumQuote || 0),
      timeInForce: order.timeInForce,
      type: order.type,
      reduceOnly: order.reduceOnly,
      closePosition: order.closePosition,
      side: order.side,
      positionSide: order.positionSide,
      stopPrice: parseFloat(order.stopPrice || 0),
      workingType: order.workingType,
      priceProtect: order.priceProtect,
      origType: order.origType,
      time: parseInt(order.time || 0),
      updateTime: parseInt(order.updateTime || 0),
      forceCloseType: order.forceCloseType // LIQUIDATION, ADL
    }));
    
    // Sort by time descending (newest first)
    formattedOrders.sort((a, b) => b.time - a.time);
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Lỗi khi lấy force orders:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

