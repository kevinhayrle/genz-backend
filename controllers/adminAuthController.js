const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const adminLogin = async (req, res) => {

  const { username, password } = req.body;

  try {

const [rows] = await db.query(
  "SELECT * FROM admin WHERE username = ?",
  [username]
);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const admin = rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { adminId: admin.id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { adminLogin };