const express = require('express');
const router = express.Router();
const { client } = require('../config/binance');

// API: Lấy thông tin tài khoản
router.get('/account', async (req, res) => {
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

module.exports = router;

