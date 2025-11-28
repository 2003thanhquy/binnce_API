const { client } = require('../config/binance');

// API: Đặt đòn bẩy cho symbol
async function setLeverage(symbol, leverage) {
  try {
    await client.setLeverage({
      symbol: symbol.toUpperCase(),
      leverage: parseInt(leverage)
    });
  } catch (error) {
    console.error(`Lỗi khi đặt đòn bẩy cho ${symbol}:`, error);
    // Không throw error, chỉ log vì có thể đòn bẩy đã được set trước đó
  }
}

// API: Đặt margin type cho symbol
async function setMarginType(symbol, marginType) {
  try {
    await client.setMarginType({
      symbol: symbol.toUpperCase(),
      marginType: marginType.toUpperCase() // ISOLATED hoặc CROSSED
    });
  } catch (error) {
    console.error(`Lỗi khi đặt margin type cho ${symbol}:`, error);
    // Không throw error, chỉ log vì có thể margin type đã được set trước đó
  }
}

module.exports = {
  setLeverage,
  setMarginType
};

