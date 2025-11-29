const { client, getExchangeInfo } = require('../config/binance');
const { roundQuantity, calculateQuantityPrecision, getSymbolPrecision } = require('../utils/precision');
const { setLeverage, setMarginType } = require('../utils/binanceHelpers');

// Lưu trữ các lệnh đã lên lịch
const scheduledOrders = new Map();

// Lấy tất cả scheduled orders (đã filter circular references)
function getAllScheduledOrders() {
  const orders = Array.from(scheduledOrders.values());
  return orders.map(order => {
    const cleanOrder = {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      timeInForce: order.timeInForce,
      scheduledTime: order.scheduledTime,
      closePositionAtTime: order.closePositionAtTime,
      closePositionTime: order.closePositionTime,
      reduceOnly: order.reduceOnly,
      leverage: order.leverage,
      marginType: order.marginType,
      status: order.status,
      orderId: order.orderId,
      executedAt: order.executedAt,
      cancelledAt: order.cancelledAt,
      result: order.result,
      error: order.error,
      scheduledTimeMs: order.scheduledTimeMs,
      actualTimeMs: order.actualTimeMs,
      delayMs: order.delayMs,
      closePositionAfterFill: order.closePositionAfterFill,
      positionClosed: order.positionClosed,
      positionClosedAt: order.positionClosedAt,
      closeOrderId: order.closeOrderId,
      positionCloseError: order.positionCloseError,
      positionClosedAtTime: order.positionClosedAtTime,
      positionClosedAtTimeAt: order.positionClosedAtTimeAt,
      closeOrderIdAtTime: order.closeOrderIdAtTime,
      positionCloseAtTimeError: order.positionCloseAtTimeError
    };
    return cleanOrder;
  });
}

// Lấy một scheduled order
function getScheduledOrder(orderId) {
  return scheduledOrders.get(orderId);
}

// Hủy scheduled order
function cancelScheduledOrder(orderId) {
  const order = scheduledOrders.get(orderId);
  
  if (!order) {
    return { success: false, error: 'Không tìm thấy lệnh' };
  }

  if (order.status === 'scheduled') {
    // Hủy timeout và interval
    if (order.timeoutId) {
      clearTimeout(order.timeoutId);
    }
    if (order.checkInterval) {
      clearInterval(order.checkInterval);
    }
    if (order.positionCheckInterval) {
      clearInterval(order.positionCheckInterval);
    }
    if (order.closePositionCheckInterval) {
      clearInterval(order.closePositionCheckInterval);
    }
    if (order.closePositionTimeoutId) {
      clearTimeout(order.closePositionTimeoutId);
    }
    
    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    scheduledOrders.set(orderId, order);
    
    return { success: true, order };
  } else if (order.status === 'executed' && order.orderId && (order.closePositionTimeoutId || order.closePositionCheckInterval)) {
    // Cancel the auto-close position timeout and interval
    if (order.closePositionTimeoutId) {
      clearTimeout(order.closePositionTimeoutId);
      order.closePositionTimeoutId = null;
    }
    if (order.closePositionCheckInterval) {
      clearInterval(order.closePositionCheckInterval);
      order.closePositionCheckInterval = null;
    }
    scheduledOrders.set(orderId, order);
    
    return { success: true, order, message: 'Đã hủy lịch tự động cắt vị thế' };
  } else {
    return { 
      success: false, 
      error: `Lệnh không thể hủy. Trạng thái: ${order.status}`,
      status: order.status,
      orderId: order.orderId
    };
  }
}

// Đóng vị thế (helper function)
async function closePosition(symbol, orderData) {
  try {
    const positions = await client.getPositions({ symbol });
    const position = positions.find(p => parseFloat(p.positionAmt || 0) !== 0);
    
    if (!position) {
      return { success: false, message: 'Không có vị thế nào để đóng' };
    }
    
    const positionAmt = parseFloat(position.positionAmt || 0);
    
    if (positionAmt === 0) {
      return { success: false, message: 'Vị thế đã được đóng (positionAmt = 0)' };
    }
    
    // Determine side to close
    const side = positionAmt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(positionAmt);
    
    // Get precision
    const exchangeInfo = await getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
    
    let roundedQuantity = quantity;
    if (symbolInfo) {
      const precision = getSymbolPrecision(symbolInfo);
      roundedQuantity = roundQuantity(quantity, precision.stepSize, precision.quantityPrecision);
    }
    
    // Close position with MARKET order
    const closeOrderParams = {
      symbol: symbol,
      side: side,
      type: 'MARKET',
      quantity: roundedQuantity,
      reduceOnly: true
    };
    
    const closeResult = await client.submitNewOrder(closeOrderParams);
    
    return { 
      success: true, 
      orderId: closeResult.orderId,
      message: `Đã đóng vị thế ${symbol}: OrderId ${closeResult.orderId}`
    };
  } catch (error) {
    console.error(`❌ Lỗi khi đóng vị thế ${symbol}:`, error);
    return { success: false, error: error.message };
  }
}

// Tạo scheduled order
async function createScheduledOrder(orderData) {
  const { scheduledTime, closePositionAtTime, closePositionTime, closePositionAfterFill } = orderData;
  
  const targetTime = new Date(scheduledTime);
  const now = new Date();
  const delay = targetTime.getTime() - now.getTime();
  
  // Nếu lệnh đã tồn tại và đang scheduled, hủy interval/timeout cũ trước
  const existingOrder = scheduledOrders.get(orderData.id);
  if (existingOrder && existingOrder.status === 'scheduled') {
    if (existingOrder.checkInterval) {
      clearInterval(existingOrder.checkInterval);
    }
    if (existingOrder.timeoutId) {
      clearTimeout(existingOrder.timeoutId);
    }
    if (existingOrder.closePositionCheckInterval) {
      clearInterval(existingOrder.closePositionCheckInterval);
    }
    if (existingOrder.closePositionTimeoutId) {
      clearTimeout(existingOrder.closePositionTimeoutId);
    }
  }
  
  // Lưu thông tin lệnh
  scheduledOrders.set(orderData.id, orderData);
  
  // Hẹn giờ thực thi lệnh với độ chính xác cao
  // Sử dụng interval động: 100ms khi còn xa, 10ms khi gần (< 1 giây)
  let checkInterval = null;
  let currentInterval = 100; // Bắt đầu với 100ms
  
  const scheduleCheck = async () => {
    const currentTime = new Date().getTime();
    const targetTimeMs = targetTime.getTime();
    const remaining = targetTimeMs - currentTime;
    
    // Nếu còn > 1 giây, dùng interval 100ms
    // Nếu còn < 1 giây, dùng interval 10ms để tăng độ chính xác
    const newInterval = remaining > 1000 ? 100 : 10;
    
    // Nếu interval thay đổi, clear và tạo lại
    if (newInterval !== currentInterval && checkInterval) {
      clearInterval(checkInterval);
      currentInterval = newInterval;
      checkInterval = setInterval(scheduleCheck, currentInterval);
      return;
    }
    
    // Chờ đến đúng hoặc sau thời gian target (không gửi sớm hơn thời gian đặt)
    // Chỉ thực thi khi remaining <= 0 (đã đến hoặc quá thời gian)
    if (remaining > 0) {
      return;
    }
    
    // Đã đến hoặc quá thời gian target => thực thi ngay
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    
    try {
      // Lấy thông tin precision và làm tròn số lượng
      const exchangeInfo = await getExchangeInfo();
      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === orderData.symbol);
      
      if (symbolInfo) {
        const precision = getSymbolPrecision(symbolInfo);
        orderData.quantity = roundQuantity(orderData.quantity, precision.stepSize, precision.quantityPrecision);
      }
      
      // Tính và kiểm tra notional
      let orderPrice = null;
      if (orderData.type === 'LIMIT' && orderData.price) {
        orderPrice = orderData.price;
      } else {
        try {
          const ticker = await client.getMarkPrice({ symbol: orderData.symbol });
          orderPrice = parseFloat(ticker.markPrice);
        } catch (error) {
          console.error('Lỗi khi lấy mark price:', error);
          orderPrice = orderData.price || 0;
        }
      }
      
      const notional = orderData.quantity * orderPrice;
      const MIN_NOTIONAL = 5;
      
      // Kiểm tra notional (trừ khi reduceOnly)
      if (!orderData.reduceOnly && notional < MIN_NOTIONAL) {
        orderData.status = 'failed';
        orderData.error = `Giá trị lệnh (Notional) phải tối thiểu ${MIN_NOTIONAL} USDT. Hiện tại: ${notional.toFixed(2)} USDT`;
        orderData.executedAt = new Date().toISOString();
        console.error(`❌ Lệnh ${orderData.id} thất bại: ${orderData.error}`);
        return;
      }
      
      // Đặt margin type và leverage trước
      if (orderData.marginType) {
        await setMarginType(orderData.symbol, orderData.marginType);
      }
      if (orderData.leverage && orderData.leverage > 1) {
        await setLeverage(orderData.symbol, orderData.leverage);
      }
      
      const orderParams = {
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.quantity,
      };

      if (orderData.type === 'LIMIT' && orderPrice) {
        orderParams.price = orderPrice;
        orderParams.timeInForce = orderData.timeInForce;
      }

      if (orderData.reduceOnly) {
        orderParams.reduceOnly = orderData.reduceOnly;
      }

      const actualExecutionTime = new Date();
      const result = await client.submitNewOrder(orderParams);
      orderData.status = 'executed';
      orderData.result = result;
      orderData.orderId = result.orderId;
      orderData.executedAt = actualExecutionTime.toISOString();
      orderData.scheduledTimeMs = targetTimeMs;
      orderData.actualTimeMs = actualExecutionTime.getTime();
      orderData.delayMs = actualExecutionTime.getTime() - targetTimeMs;
      
      console.log(`✅ Lệnh ${orderData.id} đã được thực thi vào ${actualExecutionTime.toISOString()}`);
      console.log(`   Thời gian dự kiến: ${targetTime.toISOString()}`);
      console.log(`   Độ lệch: ${orderData.delayMs}ms`);
      console.log(`   OrderId: ${result.orderId}`);
      
      // Auto close position at scheduled time if enabled
      // Sử dụng setInterval để đảm bảo độ chính xác cao, tương tự như thực thi lệnh
      if (closePositionAtTime && closePositionTime) {
        const closeTimeDate = new Date(closePositionTime);
        const closeTimeMs = closeTimeDate.getTime();
        
        // Kiểm tra xem thời gian cắt có trong tương lai không
        if (closeTimeMs > actualExecutionTime.getTime()) {
          // Sử dụng interval động: 100ms khi còn xa, 10ms khi gần (< 1 giây)
          let closeCheckInterval = null;
          let closeCurrentInterval = 100;
          
          const scheduleCloseCheck = async () => {
            const currentTime = new Date().getTime();
            const remaining = closeTimeMs - currentTime;
            
            // Nếu còn > 1 giây, dùng interval 100ms
            // Nếu còn < 1 giây, dùng interval 10ms để tăng độ chính xác
            const newInterval = remaining > 1000 ? 100 : 10;
            
            // Nếu interval thay đổi, clear và tạo lại
            if (newInterval !== closeCurrentInterval && closeCheckInterval) {
              clearInterval(closeCheckInterval);
              closeCurrentInterval = newInterval;
              closeCheckInterval = setInterval(scheduleCloseCheck, closeCurrentInterval);
              return;
            }
            
            // Chờ đến đúng hoặc sau thời gian cắt
            if (remaining > 0) {
              return;
            }
            
            // Đã đến hoặc quá thời gian cắt => thực thi ngay
            if (closeCheckInterval) {
              clearInterval(closeCheckInterval);
            }
            
            try {
              const result = await closePosition(orderData.symbol, orderData);
              const actualCloseTime = new Date();
              if (result.success) {
                orderData.positionClosedAtTime = true;
                orderData.positionClosedAtTimeAt = actualCloseTime.toISOString();
                orderData.closeOrderIdAtTime = result.orderId;
                const closeDelayMs = actualCloseTime.getTime() - closeTimeMs;
                console.log(`✅ Đã cắt vị thế ${orderData.symbol} theo thời gian: OrderId ${result.orderId}`);
                console.log(`   Thời gian dự kiến: ${closeTimeDate.toISOString()}`);
                console.log(`   Thời gian thực tế: ${actualCloseTime.toISOString()}`);
                console.log(`   Độ lệch: ${closeDelayMs}ms`);
              } else {
                orderData.positionClosedAtTime = true;
                orderData.positionClosedAtTimeAt = actualCloseTime.toISOString();
                orderData.positionCloseAtTimeError = result.error || result.message;
                console.log(`ℹ️  ${result.message || result.error}`);
              }
            } catch (error) {
              orderData.positionClosedAtTime = true;
              orderData.positionClosedAtTimeAt = new Date().toISOString();
              orderData.positionCloseAtTimeError = error.message;
              console.error(`❌ Lỗi khi cắt vị thế ${orderData.symbol}:`, error);
            }
          };
          
          // Bắt đầu với interval 100ms
          closeCheckInterval = setInterval(scheduleCloseCheck, closeCurrentInterval);
          
          // Fallback timeout để cleanup nếu có vấn đề
          const closeTimeoutId = setTimeout(() => {
            if (closeCheckInterval) {
              clearInterval(closeCheckInterval);
            }
          }, (closeTimeMs - actualExecutionTime.getTime()) + 2000);
          
          orderData.closePositionCheckInterval = closeCheckInterval;
          orderData.closePositionTimeoutId = closeTimeoutId;
          console.log(`⏰ Đã lên lịch cắt vị thế ${orderData.symbol} vào ${closeTimeDate.toISOString()}`);
        } else {
          console.log(`⚠️  Thời gian cắt vị thế đã qua, không thể lên lịch`);
        }
      }
      
      // Auto close position after fill if enabled
      if (closePositionAfterFill && result.orderId) {
        const checkOrderStatus = setInterval(async () => {
          try {
            const orderStatus = await client.getOrder({
              symbol: orderData.symbol,
              orderId: result.orderId
            });
            
            if (orderStatus.status === 'FILLED' || parseFloat(orderStatus.executedQty || 0) > 0) {
              clearInterval(checkOrderStatus);
              
              console.log(`🔴 Lệnh ${orderData.id} đã khớp, đang đóng vị thế ${orderData.symbol}...`);
              
              const result = await closePosition(orderData.symbol, orderData);
              if (result.success) {
                orderData.positionClosed = true;
                orderData.positionClosedAt = new Date().toISOString();
                orderData.closeOrderId = result.orderId;
                console.log(`✅ ${result.message}`);
              } else {
                orderData.positionClosed = true;
                orderData.positionClosedAt = new Date().toISOString();
                orderData.positionCloseError = result.error || result.message;
                console.log(`ℹ️  ${result.message || result.error}`);
              }
            }
          } catch (error) {
            console.log(`⏳ Đang chờ lệnh ${orderData.id} khớp...`);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkOrderStatus);
          if (!orderData.positionClosed) {
            console.log(`⏰ Đã hết thời gian chờ đóng vị thế cho lệnh ${orderData.id}`);
          }
        }, 5 * 60 * 1000);
        
        orderData.positionCheckInterval = checkOrderStatus;
        console.log(`🔴 Đã bật chế độ tự động đóng vị thế cho lệnh ${orderData.id}`);
      }
    } catch (error) {
      orderData.status = 'failed';
      orderData.error = error.message;
      orderData.executedAt = new Date().toISOString();
      console.error(`❌ Lỗi khi thực thi lệnh ${orderData.id}:`, error);
    }
  };
  
  // Bắt đầu với interval 100ms
  checkInterval = setInterval(scheduleCheck, currentInterval);
  
  // Fallback timeout
  const timeoutId = setTimeout(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  }, delay + 2000);

  orderData.timeoutId = timeoutId;
  orderData.checkInterval = checkInterval;
  
  return orderData;
}

module.exports = {
  getAllScheduledOrders,
  getScheduledOrder,
  cancelScheduledOrder,
  createScheduledOrder
};

