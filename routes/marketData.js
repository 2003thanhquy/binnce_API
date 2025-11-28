const express = require('express');
const router = express.Router();
const { client } = require('../config/binance');

// API: Lấy order book (độ sâu thị trường)
router.get('/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 20 } = req.query;
    
    const orderBook = await client.getOrderBook({
      symbol: symbol.toUpperCase(),
      limit: parseInt(limit)
    });
    
    res.json({
      symbol: symbol.toUpperCase(),
      bids: orderBook.bids.map(bid => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1])
      })),
      asks: orderBook.asks.map(ask => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1])
      })),
      lastUpdateId: orderBook.lastUpdateId
    });
  } catch (error) {
    console.error('Lỗi khi lấy order book:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lịch sử giao dịch gần đây
router.get('/trades/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 50 } = req.query;
    
    const trades = await client.getRecentTrades({
      symbol: symbol.toUpperCase(),
      limit: parseInt(limit)
    });
    
    const formattedTrades = trades.map(trade => ({
      id: trade.id,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.qty),
      quoteQty: parseFloat(trade.quoteQty),
      time: parseInt(trade.time),
      isBuyerMaker: trade.isBuyerMaker
    }));
    
    res.json(formattedTrades);
  } catch (error) {
    console.error('Lỗi khi lấy trades:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy dữ liệu nến (candlestick)
router.get('/klines/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100, startTime, endTime } = req.query;
    
    const params = {
      symbol: symbol.toUpperCase(),
      interval: interval,
      limit: parseInt(limit)
    };
    
    if (startTime) {
      params.startTime = parseInt(startTime);
    }
    if (endTime) {
      params.endTime = parseInt(endTime);
    }
    
    const klines = await client.getKlines(params);
    
    const formattedKlines = klines.map(k => ({
      openTime: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: parseInt(k[6]),
      quoteVolume: parseFloat(k[7]),
      trades: parseInt(k[8]),
      takerBuyBaseVolume: parseFloat(k[9]),
      takerBuyQuoteVolume: parseFloat(k[10])
    }));
    
    res.json(formattedKlines);
  } catch (error) {
    console.error('Lỗi khi lấy klines:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy thống kê 24h
router.get('/ticker/24hr/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const ticker = await client.get24hrTicker({ symbol: symbol.toUpperCase() });
    
    res.json({
      symbol: ticker.symbol,
      priceChange: parseFloat(ticker.priceChange || 0),
      priceChangePercent: parseFloat(ticker.priceChangePercent || 0),
      weightedAvgPrice: parseFloat(ticker.weightedAvgPrice || 0),
      prevClosePrice: parseFloat(ticker.prevClosePrice || 0),
      lastPrice: parseFloat(ticker.lastPrice || 0),
      lastQty: parseFloat(ticker.lastQty || 0),
      bidPrice: parseFloat(ticker.bidPrice || 0),
      bidQty: parseFloat(ticker.bidQty || 0),
      askPrice: parseFloat(ticker.askPrice || 0),
      askQty: parseFloat(ticker.askQty || 0),
      openPrice: parseFloat(ticker.openPrice || 0),
      highPrice: parseFloat(ticker.highPrice || 0),
      lowPrice: parseFloat(ticker.lowPrice || 0),
      volume: parseFloat(ticker.volume || 0),
      quoteVolume: parseFloat(ticker.quoteVolume || 0),
      openTime: parseInt(ticker.openTime || 0),
      closeTime: parseInt(ticker.closeTime || 0),
      firstId: parseInt(ticker.firstId || 0),
      lastId: parseInt(ticker.lastId || 0),
      count: parseInt(ticker.count || 0)
    });
  } catch (error) {
    console.error('Lỗi khi lấy 24hr ticker:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy thống kê 24h cho tất cả symbols
router.get('/ticker/24hr', async (req, res) => {
  try {
    const tickers = await client.get24hrTicker();
    
    const formattedTickers = tickers.map(ticker => ({
      symbol: ticker.symbol,
      priceChange: parseFloat(ticker.priceChange || 0),
      priceChangePercent: parseFloat(ticker.priceChangePercent || 0),
      lastPrice: parseFloat(ticker.lastPrice || 0),
      volume: parseFloat(ticker.volume || 0),
      quoteVolume: parseFloat(ticker.quoteVolume || 0)
    }));
    
    // Sort by volume descending
    formattedTickers.sort((a, b) => b.quoteVolume - a.quoteVolume);
    
    res.json(formattedTickers);
  } catch (error) {
    console.error('Lỗi khi lấy 24hr tickers:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy premium index (mark price + funding rate)
router.get('/premiumIndex/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const premiumIndex = await client.getMarkPrice({ symbol: symbol.toUpperCase() });
    
    res.json({
      symbol: premiumIndex.symbol,
      markPrice: parseFloat(premiumIndex.markPrice || 0),
      indexPrice: parseFloat(premiumIndex.indexPrice || 0),
      estimatedSettlePrice: parseFloat(premiumIndex.estimatedSettlePrice || 0),
      lastFundingRate: parseFloat(premiumIndex.lastFundingRate || 0),
      nextFundingTime: parseInt(premiumIndex.nextFundingTime || 0),
      interestRate: parseFloat(premiumIndex.interestRate || 0),
      time: parseInt(premiumIndex.time || 0)
    });
  } catch (error) {
    console.error('Lỗi khi lấy premium index:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

