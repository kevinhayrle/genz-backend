const pool = require("../db");

exports.getOrdersByPhone = async (req, res) => {
  const { phone } = req.params;

  try {
  
    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC",
      [phone]
    );

    if (orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map(o => o.id);
    const [items] = await pool.query(
      `
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (?)
      `,
      [orderIds]
    );

 
    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push({
     name: item.name,
  image_url: item.image_url,
        size: item.size,
        quantity: item.quantity,
        price: item.price
      });
    });

    
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemsByOrder[order.id] || []
    }));

    res.json(ordersWithItems);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};