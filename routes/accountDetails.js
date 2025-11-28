const express = require('express');
const router = express.Router();
const { client } = require('../config/binance');

// API: Lấy balance chi tiết
router.get('/balance', async (req, res) => {
  try {
    const account = await client.getAccountInformation();
    
    // Format balance
    const balances = (account.assets || []).map(asset => ({
      asset: asset.asset,
      walletBalance: parseFloat(asset.walletBalance || 0),
      availableBalance: parseFloat(asset.availableBalance || 0),
      maxWithdrawAmount: parseFloat(asset.maxWithdrawAmount || 0),
      crossWalletBalance: parseFloat(asset.crossWalletBalance || 0),
      crossUnPnl: parseFloat(asset.crossUnPnl || 0),
      availableWithoutBorrow: parseFloat(asset.availableWithoutBorrow || 0),
      initialMargin: parseFloat(asset.initialMargin || 0),
      maintMargin: parseFloat(asset.maintMargin || 0),
      marginUsed: parseFloat(asset.marginUsed || 0),
      marginAvailable: parseFloat(asset.marginAvailable || 0)
    })).filter(b => b.walletBalance !== 0 || b.availableBalance !== 0);
    
    // Sort by walletBalance descending
    balances.sort((a, b) => b.walletBalance - a.walletBalance);
    
    res.json(balances);
  } catch (error) {
    console.error('Lỗi khi lấy balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Thay đổi position margin (thêm/bớt margin)
router.post('/position-margin', async (req, res) => {
  try {
    const { symbol, amount, type } = req.body; // type: 1 = add, 2 = reduce
    
    if (!symbol || !amount || !type) {
      return res.status(400).json({ error: 'Thiếu symbol, amount hoặc type' });
    }
    
    const result = await client.modifyPositionMargin({
      symbol: symbol.toUpperCase(),
      amount: parseFloat(amount),
      type: parseInt(type) // 1 = add, 2 = reduce
    });
    
    res.json({ 
      success: true, 
      message: `Đã ${type === 1 ? 'thêm' : 'giảm'} margin thành công`,
      result 
    });
  } catch (error) {
    console.error('Lỗi khi thay đổi position margin:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

