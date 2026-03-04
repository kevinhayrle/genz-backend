const db = require("../db");

exports.addProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    discounted_price,
    sort_order,
    image_url,
    category,
    sizes,
    extra_images
  } = req.body;

  if (
    !name ||
    price === undefined ||
    isNaN(price) ||
    price < 0 ||
    !image_url ||
    !category ||
    !sizes
  ) {
    return res.status(400).json({
      error: "Name, valid price, image, category and sizes are required."
    });
  }

  if (discounted_price && discounted_price >= price) {
    return res.status(400).json({
      error: "Discounted price must be less than actual price."
    });
  }

  const normalizedSizes = Array.isArray(sizes)
    ? sizes.join(",")
    : typeof sizes === "string"
    ? sizes
    : "";

  const normalizedExtraImages = Array.isArray(extra_images)
    ? extra_images
    : typeof extra_images === "string"
    ? extra_images.split(",").map(s => s.trim())
    : [];

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO products
       (name, description, price, discounted_price, image_url,
        category, sizes, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name.trim(),
        description || null,
        price,
        discounted_price || null,
        image_url.trim(),
        category,
        normalizedSizes,
        Number(sort_order ?? 0)
      ]
    );

    const productId = result.insertId;

    if (normalizedExtraImages.length > 0) {
      const values = normalizedExtraImages.map(img => [productId, img]);
      await conn.query(
        "INSERT INTO product_images (product_id, image_url) VALUES ?",
        [values]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Product added successfully." });

  } catch (err) {
    await conn.rollback();
    console.error("Error adding product:", err);
    res.status(500).json({ error: "Server error while adding product." });
  } finally {
    conn.release();
  }
};

exports.getAllProducts = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT id, name, price, discounted_price, image_url,
             category, sizes, sort_order, created_at
      FROM products
      ORDER BY sort_order ASC, created_at DESC
    `);

    const products = rows.map(p => ({
      ...p,
      sizes: p.sizes ? p.sizes.split(",") : []
    }));

    res.json(products);

  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.getProductById = async (req, res) => {
  const { id } = req.params;

  try {

    const [[product]] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    product.sizes = product.sizes ? product.sizes.split(",") : [];

    const [images] = await db.query(
      "SELECT image_url FROM product_images WHERE product_id = ?",
      [id]
    );

    product.extra_images = images.map(i => i.image_url);

    res.json(product);

  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.updateProduct = async (req, res) => {

  const { id } = req.params;

  const {
    name,
    description,
    price,
    discounted_price,
    sort_order,
    image_url,
    category,
    sizes,
    extra_images
  } = req.body;

  if (!id || !name || price === undefined || isNaN(price) || price < 0) {
    return res.status(400).json({ error: "Invalid product data." });
  }

  const normalizedSizes = Array.isArray(sizes)
    ? sizes.join(",")
    : typeof sizes === "string"
    ? sizes
    : "";

  const normalizedExtraImages = Array.isArray(extra_images)
    ? extra_images
    : typeof extra_images === "string"
    ? extra_images.split(",").map(s => s.trim())
    : [];

  const conn = await db.getConnection();

  try {

    await conn.beginTransaction();

    await conn.query(
      `UPDATE products
       SET name = ?, description = ?, price = ?, discounted_price = ?,
           image_url = ?, category = ?, sizes = ?, sort_order = ?
       WHERE id = ?`,
      [
        name,
        description || null,
        price,
        discounted_price || null,
        image_url,
        category,
        normalizedSizes,
        Number(sort_order ?? 0),
        id
      ]
    );

    await conn.query("DELETE FROM product_images WHERE product_id = ?", [id]);

    if (normalizedExtraImages.length > 0) {

      const values = normalizedExtraImages.map(img => [id, img]);

      await conn.query(
        "INSERT INTO product_images (product_id, image_url) VALUES ?",
        [values]
      );
    }

    await conn.commit();

    res.json({ message: "Product updated successfully." });

  } catch (err) {

    await conn.rollback();
    console.error("Error updating product:", err);

    res.status(500).json({ error: "Server error during product update." });

  } finally {
    conn.release();
  }
};

exports.deleteProduct = async (req, res) => {

  const { id } = req.params;
  const conn = await db.getConnection();

  try {

    await conn.beginTransaction();

    await conn.query("DELETE FROM product_images WHERE product_id = ?", [id]);

    const [result] = await conn.query(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {

      await conn.rollback();
      return res.status(404).json({ error: "Product not found." });

    }

    await conn.commit();

    res.json({ message: "Product deleted successfully." });

  } catch (err) {

    await conn.rollback();
    console.error("Error deleting product:", err);

    res.status(500).json({ error: "Server error while deleting product." });

  } finally {
    conn.release();
  }
};

exports.getAllCategories = async (_req, res) => {

  try {

    const [rows] = await db.query(
      "SELECT DISTINCT category FROM products"
    );

    res.json(rows.map(r => r.category));

  } catch (err) {

    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories." });

  }
};

exports.updateProductOrder = async (req, res) => {

  const order = req.body;

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: "Invalid order data." });
  }

  try {

    await Promise.all(
      order.map(item =>
        db.query(
          "UPDATE products SET sort_order = ? WHERE id = ?",
          [Number(item.sort_order), Number(item.id)]
        )
      )
    );

    res.json({ message: "Product order updated successfully." });

  } catch (err) {

    console.error("Error updating product order:", err);
    res.status(500).json({ error: "Failed to update order." });

  }
};