const express = require('express');
const router = express.Router();
const { client, getExchangeInfo } = require('../config/binance');
const { getSymbolPrecision } = require('../utils/precision');

// API: Lấy danh sách symbols
router.get('/symbols', async (req, res) => {
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
router.get('/symbol-info/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const exchangeInfo = await getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
    
    if (!symbolInfo) {
      return res.status(404).json({ error: 'Symbol không tồn tại' });
    }
    
    const precision = getSymbolPrecision(symbolInfo);
    
    res.json({
      symbol: symbolInfo.symbol,
      ...precision
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin symbol:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy giá hiện tại của symbol
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const ticker = await client.getMarkPrice({ symbol });
    res.json({ price: parseFloat(ticker.markPrice) });
  } catch (error) {
    console.error('Lỗi khi lấy giá:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

