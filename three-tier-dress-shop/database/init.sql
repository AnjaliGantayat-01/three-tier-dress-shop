CREATE DATABASE IF NOT EXISTS dressshop;
USE dressshop;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  category VARCHAR(60) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PLACED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO products (name, description, price, image_url, category) VALUES
('Floral Summer Dress', 'Lightweight floral dress for everyday wear.', 1299.00, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=700', 'Casual'),
('Classic Black Dress', 'A timeless black dress for evening occasions.', 1899.00, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=700', 'Party'),
('Cotton Everyday Dress', 'Comfortable cotton dress for warm days.', 999.00, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=700', 'Casual'),
('Elegant Occasion Dress', 'An elegant look for special events.', 2499.00, 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=700', 'Party')
ON DUPLICATE KEY UPDATE name = VALUES(name);
