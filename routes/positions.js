const express = require('express');
const router = express.Router();
const { client, getExchangeInfo } = require('../config/binance');
const { roundQuantity, calculateQuantityPrecision } = require('../utils/precision');

// API: Lấy vị thế đang mở (Positions) - GET /fapi/v3/positionRisk
router.get('/positions', async (req, res) => {
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
        openOrderInitialMargin: parseFloat(p.openOrderInitialMargin || 0),
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

// API: Đóng/Hủy vị thế đang mở (Close Position)
router.post('/close-position', async (req, res) => {
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
    const quantityPrecision = calculateQuantityPrecision(stepSize);

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
      reduceOnly: true
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

// API: Lấy lịch sử vị thế đã đóng (từ userTrades)
router.get('/position-history', async (req, res) => {
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

module.exports = router;

