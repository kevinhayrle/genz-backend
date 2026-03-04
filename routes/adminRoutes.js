const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/adminMiddleware');
const { adminLogin } = require('../controllers/adminAuthController');

const {
  getAllProducts,
  getProductById,
  deleteProduct,
  addProduct,
  updateProduct,
  updateProductOrder
} = require('../controllers/productController');

const {
  addCoupon,
  getAllCoupons,
  deleteCoupon
} = require('../controllers/couponController');

router.post('/login', adminLogin);

router.get('/products', verifyToken, getAllProducts);
router.post('/products', verifyToken, addProduct);
router.put('/products/reorder', verifyToken, updateProductOrder);
router.get('/products/:id', verifyToken, getProductById);
router.put('/products/:id', verifyToken, updateProduct);
router.delete('/products/:id', verifyToken, deleteProduct);

router.post('/coupons/add', verifyToken, addCoupon);
router.get('/coupons', verifyToken, getAllCoupons);
router.delete('/coupons/delete/:id', verifyToken, deleteCoupon);

module.exports = router;
