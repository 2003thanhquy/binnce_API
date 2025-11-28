require('dotenv').config();
const { USDMClient } = require('binance');

// Khởi tạo Binance Futures Client
const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = process.env.BINANCE_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error('⚠️  Vui lòng cấu hình BINANCE_API_KEY và BINANCE_API_SECRET trong file .env');
  process.exit(1);
}

const client = new USDMClient({
  api_key: apiKey,
  api_secret: apiSecret,
  // Có thể thêm testnet: true để test trên testnet
  // testnet: true
});

// Cache exchange info để tránh gọi nhiều lần
let exchangeInfoCache = null;
let exchangeInfoCacheTime = 0;
const EXCHANGE_INFO_CACHE_TTL = 5 * 60 * 1000; // 5 phút

async function getExchangeInfo() {
  const now = Date.now();
  if (!exchangeInfoCache || (now - exchangeInfoCacheTime) > EXCHANGE_INFO_CACHE_TTL) {
    exchangeInfoCache = await client.getExchangeInfo();
    exchangeInfoCacheTime = now;
  }
  return exchangeInfoCache;
}

module.exports = {
  client,
  getExchangeInfo
};

