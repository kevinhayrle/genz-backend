const db = require('../db');

exports.addCoupon = async (req, res) => {
const {
  coupon_code,
  discount_type,
  discount_value,
  min_cart_value,
  max_discount,
  expiry_date
} = req.body;

const normalizedDiscount = Number(discount_value);
const normalizedMinCart = Number(min_cart_value) || 0;
const normalizedMaxDiscount =
  max_discount !== undefined && max_discount !== ""
    ? Number(max_discount)
    : null;

const normalizedExpiry =
  expiry_date && expiry_date.trim() !== ""
    ? expiry_date
    : null;


  if (!coupon_code || !discount_type || isNaN(normalizedDiscount)) {
  return res.status(400).json({ error: 'Required fields missing or invalid.' });
}

  try {
    await db.query(
      `INSERT INTO coupons 
       (coupon_code, discount_type, discount_value, min_cart_value, max_discount, expiry_date, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [

  coupon_code,
  discount_type,
  normalizedDiscount,
  normalizedMinCart,
  normalizedMaxDiscount,
  normalizedExpiry
]

    );

    res.status(201).json({ message: 'Coupon added successfully.' });
  } catch (err) {
    console.error('Error adding coupon:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Coupon code already exists.' });
    }

    res.status(500).json({ error: 'Server error while adding coupon.' });
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM coupons ORDER BY created_at DESC'
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ error: 'Server error while fetching coupons.' });
  }
};

exports.deleteCoupon = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM coupons WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    res.json({ message: 'Coupon deleted successfully.' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ error: 'Server error while deleting coupon.' });
  }
};

exports.applyCoupon = async (req, res) => {
  const { coupon_code, cart_total } = req.body;

  if (!coupon_code || !cart_total) {
    return res.status(400).json({ error: 'Coupon code and cart total are required.' });
  }

  try {
    const [[coupon]] = await db.query(
      'SELECT * FROM coupons WHERE coupon_code = ? AND is_active = 1',
      [coupon_code]
    );

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive coupon.' });
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired.' });
    }

    if (cart_total < coupon.min_cart_value) {
      return res.status(400).json({
        error: `Minimum cart value ₹${coupon.min_cart_value} required`
      });
    }

    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      discount = (cart_total * coupon.discount_value) / 100;

      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

    const final_total = Math.max(cart_total - discount, 0);

    res.json({
      success: true,
      discount: Math.round(discount),
      final_total: Math.round(final_total),
      coupon_code: coupon.coupon_code
    });

  } catch (err) {
    console.error('Error applying coupon:', err);
    res.status(500).json({ error: 'Server error while applying coupon.' });
  }
};
