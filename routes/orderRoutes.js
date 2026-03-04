
const express = require("express");
const router = express.Router();
const { getOrdersByPhone } = require("../controllers/orderController");

router.get("/orders/:phone", getOrdersByPhone);

module.exports = router;