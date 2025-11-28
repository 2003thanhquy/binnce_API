require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api', require('./routes/symbols'));
app.use('/api', require('./routes/account'));
app.use('/api', require('./routes/positions'));
app.use('/api', require('./routes/orders'));
app.use('/api', require('./routes/scheduledOrders'));
app.use('/api', require('./routes/funding'));
app.use('/api/market', require('./routes/marketData'));
app.use('/api/account', require('./routes/accountDetails'));
app.use('/api', require('./routes/liquidation'));
app.use('/api', require('./routes/batchOrders'));

// Route chính
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
