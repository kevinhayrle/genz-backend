const express = require('express');
const cors = require("cors");
const productRoutes = require('./routes/productRoutes');

require('dotenv').config();

const app = express();
console.log('👋 Genz backend started');

const allowedOrigins = [
  'https://genz.netlify.app',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

console.log('✅ CORS configured');

app.use(express.json());
console.log('✅ express.json middleware loaded');

try {
  const adminRoutes = require('./routes/adminRoutes');
  const couponRoutes = require('./routes/couponRoutes'); 
  const checkoutRoutes = require("./routes/checkoutRoutes");
  const orderRoutes = require("./routes/orderRoutes");
  app.use('/api/products', productRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/coupons', couponRoutes); 
  app.use("/api/checkout", checkoutRoutes);
  app.use("/api", orderRoutes);
  console.log('✅ Routes registered');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
}

app.get('/', (req, res) => {
  res.send('Genz backend is running ✅');
});

const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("❌ Render's PORT is not defined in environment");
}

app.listen(PORT, () => {
  console.log(`🚀 Genz backend running on port ${PORT}`);
});