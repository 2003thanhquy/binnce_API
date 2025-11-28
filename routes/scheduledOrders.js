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

module.exports = router;

