const express = require('express');
const router = express.Router();
const { client } = require('../config/binance');

// API: Lấy lịch sử funding income
router.get('/funding-income', async (req, res) => {
  try {
    const { symbol, limit = 50, startTime, endTime } = req.query; // Giảm limit mặc định từ 100 xuống 50
    const params = {
      incomeType: 'FUNDING_FEE',
      limit: Math.min(parseInt(limit), 500) // Max 500 để tránh quá tải
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
    
    // Sort by time descending (newest first) - có thể override bằng sort param
    const sortBy = req.query.sortBy || 'time';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    if (sortBy === 'time') {
      formattedIncome.sort((a, b) => (b.time - a.time) * sortOrder);
    } else if (sortBy === 'income') {
      formattedIncome.sort((a, b) => (b.income - a.income) * sortOrder);
    } else if (sortBy === 'symbol') {
      formattedIncome.sort((a, b) => a.symbol.localeCompare(b.symbol) * sortOrder);
    }
    
    res.json(formattedIncome);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử funding income:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Tổng hợp funding income theo ngày/tuần/tháng
router.get('/funding-income-summary', async (req, res) => {
  try {
    const { symbol, period = 'day' } = req.query; // period: day, week, month
    const params = {
      incomeType: 'FUNDING_FEE',
      limit: 1000 // Lấy nhiều hơn để tổng hợp
    };
    
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }
    
    const income = await client.getIncomeHistory(params);
    
    // Format và group theo period
    const summary = {};
    
    income.forEach(item => {
      const time = parseInt(item.time || 0);
      const date = new Date(time);
      let key;
      
      if (period === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }
      
      if (!summary[key]) {
        summary[key] = {
          period: key,
          totalIncome: 0,
          count: 0,
          symbols: new Set()
        };
      }
      
      summary[key].totalIncome += parseFloat(item.income || 0);
      summary[key].count++;
      summary[key].symbols.add(item.symbol);
    });
    
    // Convert to array
    const result = Object.values(summary).map(item => ({
      period: item.period,
      totalIncome: item.totalIncome,
      count: item.count,
      symbolCount: item.symbols.size
    }));
    
    // Sort by period descending
    result.sort((a, b) => b.period.localeCompare(a.period));
    
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy tổng hợp funding income:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy lịch sử funding rate
router.get('/funding-rate', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query; // Giảm limit mặc định từ 100 xuống 50
    const params = { limit: Math.min(parseInt(limit), 500) }; // Max 500
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
    
    // Sort - có thể override bằng sort param
    const sortBy = req.query.sortBy || 'absRate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    if (sortBy === 'absRate') {
      // Sort by absolute fundingRate descending (highest abs value first)
      formattedRates.sort((a, b) => (Math.abs(b.fundingRate) - Math.abs(a.fundingRate)) * sortOrder);
    } else if (sortBy === 'rate') {
      formattedRates.sort((a, b) => (b.fundingRate - a.fundingRate) * sortOrder);
    } else if (sortBy === 'time') {
      formattedRates.sort((a, b) => (b.fundingTime - a.fundingTime) * sortOrder);
    } else if (sortBy === 'symbol') {
      formattedRates.sort((a, b) => a.symbol.localeCompare(b.symbol) * sortOrder);
    }
    
    res.json(formattedRates);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử funding rate:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy funding rate HIỆN TẠI (real-time) - GET /fapi/v1/premiumIndex
router.get('/funding-rate-current', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    let premiumIndexes;
    if (symbol) {
      // Lấy cho 1 symbol cụ thể (weight: 1)
      const premiumIndex = await client.getMarkPrice({ symbol: symbol.toUpperCase() });
      premiumIndexes = [premiumIndex];
    } else {
      // Lấy cho tất cả symbols (weight: 10)
      premiumIndexes = await client.getMarkPrice();
    }
    
    // Format response
    const formattedRates = premiumIndexes.map(item => ({
      symbol: item.symbol,
      fundingRate: parseFloat(item.lastFundingRate || 0), // Funding rate hiện tại
      markPrice: parseFloat(item.markPrice || 0),
      indexPrice: parseFloat(item.indexPrice || 0),
      estimatedSettlePrice: parseFloat(item.estimatedSettlePrice || 0),
      interestRate: parseFloat(item.interestRate || 0),
      nextFundingTime: parseInt(item.nextFundingTime || 0), // Thời gian funding tiếp theo
      time: parseInt(item.time || 0)
    }));
    
    // Sort by absolute fundingRate descending (highest abs value first: -2% = 2% > 1% > 0%)
    formattedRates.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
    
    res.json(formattedRates);
  } catch (error) {
    console.error('Lỗi khi lấy funding rate hiện tại:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

