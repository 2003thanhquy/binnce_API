// Hàm làm tròn số lượng theo precision
function roundQuantity(quantity, stepSize, quantityPrecision) {
  if (quantity <= 0) {
    return 0;
  }
  
  if (!stepSize || stepSize === 0) {
    // Nếu không có stepSize, làm tròn theo quantityPrecision
    return parseFloat(quantity.toFixed(quantityPrecision));
  }
  
  // Làm tròn về bội số của stepSize (làm tròn xuống)
  let rounded = Math.floor(quantity / stepSize) * stepSize;
  
  // Đảm bảo không bao giờ thành 0 nếu quantity > 0
  if (rounded <= 0 && quantity > 0) {
    // Làm tròn lên nếu làm tròn xuống thành 0
    rounded = Math.ceil(quantity / stepSize) * stepSize;
  }
  
  // Làm tròn theo số chữ số thập phân
  return parseFloat(rounded.toFixed(quantityPrecision));
}

// Tính quantityPrecision từ stepSize
function calculateQuantityPrecision(stepSize) {
  if (!stepSize) return 8;
  
  const stepSizeStr = stepSize.toString();
  if (stepSizeStr.includes('.')) {
    return stepSizeStr.split('.')[1].length;
  } else if (stepSizeStr.includes('e')) {
    const match = stepSizeStr.match(/e-(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return 8;
}

// Lấy thông tin precision từ symbol info
function getSymbolPrecision(symbolInfo) {
  const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
  const stepSize = lotSizeFilter ? parseFloat(lotSizeFilter.stepSize) : null;
  const minQty = lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : null;
  const maxQty = lotSizeFilter ? parseFloat(lotSizeFilter.maxQty) : null;
  const quantityPrecision = calculateQuantityPrecision(stepSize);
  
  return {
    stepSize,
    minQty,
    maxQty,
    quantityPrecision,
    pricePrecision: symbolInfo.pricePrecision || 8
  };
}

module.exports = {
  roundQuantity,
  calculateQuantityPrecision,
  getSymbolPrecision
};

