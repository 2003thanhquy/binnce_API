const express = require('express');
const router = express.Router();
const scheduledOrderService = require('../services/scheduledOrderService');

// API: Đặt lệnh theo thời gian
router.post('/schedule-order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, timeInForce, scheduledTime, reduceOnly } = req.body;
    
    const targetTime = new Date(scheduledTime);
    const now = new Date();

    if (targetTime <= now) {
      return res.status(400).json({ error: 'Thời gian đặt lệnh phải trong tương lai' });
    }

    // Validate close position time if provided
    if (req.body.closePositionAtTime && req.body.closePositionTime) {
      const closeTimeDate = new Date(req.body.closePositionTime);
      if (closeTimeDate <= targetTime) {
        return res.status(400).json({ error: 'Thời gian cắt vị thế phải sau thời gian đặt lệnh' });
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const delay = targetTime.getTime() - now.getTime();
    
    // Kiểm tra delay hợp lệ
    if (delay < 1000) {
      return res.status(400).json({ error: 'Thời gian đặt lệnh phải ít nhất 1 giây trong tương lai' });
    }
    if (delay > 365 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Thời gian đặt lệnh không được quá 1 năm' });
    }

    const orderData = {
      id: orderId,
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      timeInForce: timeInForce || 'GTC',
      scheduledTime: targetTime.toISOString(),
      closePositionAtTime: req.body.closePositionAtTime || false,
      closePositionTime: req.body.closePositionTime || null,
      closePositionAfterFill: req.body.closePositionAfterFill || false,
      reduceOnly: reduceOnly || false,
      leverage: req.body.leverage ? parseInt(req.body.leverage) : 1,
      marginType: req.body.marginType || 'CROSSED',
      status: 'scheduled',
      orderId: null
    };

    await scheduledOrderService.createScheduledOrder(orderData);

    // Tạo response object không chứa circular references
    const responseOrder = {
      id: orderData.id,
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      quantity: orderData.quantity,
      price: orderData.price,
      timeInForce: orderData.timeInForce,
      scheduledTime: orderData.scheduledTime,
      closePositionAtTime: orderData.closePositionAtTime,
      closePositionTime: orderData.closePositionTime,
      reduceOnly: orderData.reduceOnly,
      leverage: orderData.leverage,
      marginType: orderData.marginType,
      status: orderData.status
    };

    res.json({ 
      success: true, 
      orderId,
      message: `Lệnh sẽ được thực thi vào lúc ${targetTime.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })}`,
      scheduledTime: targetTime.toISOString(),
      order: responseOrder
    });
  } catch (error) {
    console.error('Lỗi khi lên lịch lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lấy danh sách lệnh đã lên lịch
router.get('/scheduled-orders', (req, res) => {
  try {
    const orders = scheduledOrderService.getAllScheduledOrders();
    res.json(orders);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách lệnh đã lên lịch:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Hủy lệnh đã lên lịch
router.delete('/scheduled-order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🗑️  Yêu cầu hủy lệnh: ${orderId}`);
    
    const result = scheduledOrderService.cancelScheduledOrder(orderId);
    
    if (!result.success) {
      if (result.error === 'Không tìm thấy lệnh') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ 
        error: result.error,
        status: result.status,
        orderId: result.orderId
      });
    }
    
    // Create clean order object without circular references
    const order = result.order;
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
      cancelledAt: order.cancelledAt,
      orderId: order.orderId,
      executedAt: order.executedAt
    };
    
    console.log(`✅ Đã hủy lệnh thành công: ${orderId}`);
    res.json({ 
      success: true, 
      message: result.message || 'Đã hủy lệnh', 
      order: cleanOrder 
    });
  } catch (error) {
    console.error('Lỗi khi hủy lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Test scheduled order với thời gian giả lập
router.post('/test-scheduled-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { testDelay, testClosePosition } = req.body; // testDelay in seconds
    
    const order = scheduledOrderService.getScheduledOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy lệnh' });
    }
    
    if (order.status !== 'scheduled') {
      return res.status(400).json({ 
        error: `Lệnh không thể test. Trạng thái hiện tại: ${order.status}` 
      });
    }
    
    // Validate test delay
    const delaySeconds = parseInt(testDelay) || 5;
    if (delaySeconds < 1 || delaySeconds > 60) {
      return res.status(400).json({ 
        error: 'Thời gian delay phải từ 1 đến 60 giây' 
      });
    }
    
    // Hủy interval và timeout hiện tại
    if (order.checkInterval) {
      clearInterval(order.checkInterval);
      order.checkInterval = null;
    }
    if (order.timeoutId) {
      clearTimeout(order.timeoutId);
      order.timeoutId = null;
    }
    
    // Set thời gian mới (test delay từ bây giờ)
    const now = new Date();
    const newScheduledTime = new Date(now.getTime() + delaySeconds * 1000);
    order.scheduledTime = newScheduledTime.toISOString();
    
    // Nếu test close position, set thời gian cắt = thời gian thực thi + 10 giây
    if (testClosePosition && order.closePositionAtTime && order.closePositionTime) {
      const newCloseTime = new Date(newScheduledTime.getTime() + 10 * 1000);
      order.closePositionTime = newCloseTime.toISOString();
    }
    
    // Tạo lại scheduled order với thời gian mới
    await scheduledOrderService.createScheduledOrder(order);
    
    console.log(`🧪 Test mode: Lệnh ${orderId} sẽ được thực thi sau ${delaySeconds} giây`);
    
    res.json({ 
      success: true, 
      message: `Lệnh sẽ được test và thực thi sau ${delaySeconds} giây`,
      scheduledTime: newScheduledTime.toISOString(),
      orderId: orderId
    });
  } catch (error) {
    console.error('Lỗi khi test lệnh:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

