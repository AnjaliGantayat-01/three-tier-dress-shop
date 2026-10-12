import os
import time
from decimal import Decimal, InvalidOperation

import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Restrict this in production.

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "database": os.getenv("DB_NAME", "dressshop"),
    "user": os.getenv("DB_USER", "shopuser"),
    "password": os.getenv("DB_PASSWORD", ""),
    "connection_timeout": 5,
}

def get_connection():
    # Compose starts the API after the DB health check; retries also help during restarts.
    last_error = None
    for _ in range(10):
        try:
            return mysql.connector.connect(**DB_CONFIG)
        except mysql.connector.Error as exc:
            last_error = exc
            time.sleep(2)
    raise last_error

def as_dict(cursor, row):
    result = dict(zip(cursor.column_names, row))
    for key, value in result.items():
        if isinstance(value, Decimal):
            result[key] = float(value)
        elif hasattr(value, "isoformat"):
            result[key] = value.isoformat()
    return result

@app.get("/api/health")
def health():
    try:
        conn = get_connection()
        conn.close()
        return jsonify({"status": "ok", "database": "connected"})
    except mysql.connector.Error:
        app.logger.exception("Health check database connection failed")
        return jsonify({"status": "error", "database": "unavailable"}), 503

@app.get("/api/products")
def list_products():
    category = request.args.get("category")
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if category:
            cursor.execute(
                "SELECT id, name, description, price, image_url, category FROM products WHERE category=%s ORDER BY id",
                (category,),
            )
        else:
            cursor.execute(
                "SELECT id, name, description, price, image_url, category FROM products ORDER BY id"
            )
        return jsonify([as_dict(cursor, row) for row in cursor.fetchall()])
    finally:
        conn.close()

@app.get("/api/products/<int:product_id>")
def get_product(product_id):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, description, price, image_url, category FROM products WHERE id=%s",
            (product_id,),
        )
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error": "Product not found"}), 404
        return jsonify(as_dict(cursor, row))
    finally:
        conn.close()

@app.post("/api/orders")
def create_order():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("customer_name", "")).strip()
    email = str(payload.get("customer_email", "")).strip()
    items = payload.get("items")

    if not name or len(name) > 120:
        return jsonify({"error": "Enter a customer name (maximum 120 characters)."}), 400
    if "@" not in email or len(email) > 190:
        return jsonify({"error": "Enter a valid email address."}), 400
    if not isinstance(items, list) or not items:
        return jsonify({"error": "Your cart is empty."}), 400

    quantities = {}
    for item in items:
        try:
            product_id = int(item.get("product_id"))
            quantity = int(item.get("quantity"))
        except (TypeError, ValueError, AttributeError):
            return jsonify({"error": "Each item needs a valid product_id and quantity."}), 400
        if product_id <= 0 or quantity < 1 or quantity > 20:
            return jsonify({"error": "Quantity must be between 1 and 20."}), 400
        quantities[product_id] = quantities.get(product_id, 0) + quantity

    conn = get_connection()
    try:
        conn.start_transaction()
        cursor = conn.cursor()
        total = Decimal("0.00")
        order_products = []
        for product_id, quantity in quantities.items():
            cursor.execute("SELECT id, price FROM products WHERE id=%s FOR UPDATE", (product_id,))
            row = cursor.fetchone()
            if row is None:
                conn.rollback()
                return jsonify({"error": f"Product {product_id} does not exist."}), 400
            price = Decimal(str(row[1]))
            total += price * quantity
            order_products.append((product_id, quantity, price))

        cursor.execute(
            "INSERT INTO orders (customer_name, customer_email, total) VALUES (%s, %s, %s)",
            (name, email, total),
        )
        order_id = cursor.lastrowid
        for product_id, quantity, price in order_products:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)",
                (order_id, product_id, quantity, price),
            )
        conn.commit()
        return jsonify({"message": "Order placed successfully", "order_id": order_id, "total": float(total)}), 201
    except mysql.connector.Error:
        conn.rollback()
        app.logger.exception("Order creation failed")
        return jsonify({"error": "Could not place order. Please try again."}), 500
    finally:
        conn.close()

@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Route not found"}), 404

@app.errorhandler(500)
def server_error(_error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
