const API = "/api";
let products = [];
let cart = JSON.parse(sessionStorage.getItem("dressBloomCart") || "{}");

const money = value => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value));

async function loadProducts() {
  const status = document.getElementById("catalog-status");
  status.textContent = "Loading dresses…";
  try {
    const category = document.getElementById("category-filter").value;
    const response = await fetch(`${API}/products${category ? `?category=${encodeURIComponent(category)}` : ""}`);
    if (!response.ok) throw new Error("Could not load products");
    products = await response.json();
    status.textContent = products.length ? `${products.length} styles in this collection` : "No dresses found.";
    renderProducts();
    renderCart();
  } catch (error) {
    status.textContent = "Could not connect to the shop API. Check that Docker services are running.";
    console.error(error);
  }
}

function renderProducts() {
  const grid = document.getElementById("products");
  grid.replaceChildren();
  for (const product of products) {
    const card = document.createElement("article");
    card.className = "product-card";
    const img = document.createElement("img");
    img.className = "product-image";
    img.src = product.image_url;
    img.alt = product.name;
    img.loading = "lazy";
    img.onerror = () => { img.src = "https://placehold.co/600x800/faf6f1/b85e65?text=DressBloom"; };
    const info = document.createElement("div");
    info.className = "product-info";
    const title = document.createElement("h3");
    title.textContent = product.name;
    const desc = document.createElement("p");
    desc.textContent = product.description;
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = money(product.price);
    const button = document.createElement("button");
    button.className = "add-button";
    button.textContent = "Add to cart";
    button.addEventListener("click", () => changeQuantity(product.id, 1));
    bottom.append(price, button);
    info.append(title, desc, bottom);
    card.append(img, info);
    grid.append(card);
  }
}

function saveCart() {
  sessionStorage.setItem("dressBloomCart", JSON.stringify(cart));
}

function changeQuantity(id, delta) {
  const current = Number(cart[id] || 0);
  const next = current + delta;
  if (next <= 0) delete cart[id];
  else cart[id] = Math.min(next, 20);
  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");
  container.replaceChildren();
  let total = 0;
  let count = 0;
  const entries = Object.entries(cart);
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Your cart is empty.";
    container.append(empty);
  }
  for (const [id, quantity] of entries) {
    const product = products.find(item => item.id === Number(id));
    if (!product) continue;
    total += Number(product.price) * quantity;
    count += quantity;
    const line = document.createElement("div");
    line.className = "cart-line";
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const subtotal = document.createElement("small");
    subtotal.textContent = `${quantity} × ${money(product.price)}`;
    details.append(name, subtotal);
    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    const minus = document.createElement("button");
    minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "Remove one");
    minus.addEventListener("click", () => changeQuantity(product.id, -1));
    const qty = document.createElement("span"); qty.textContent = quantity;
    const plus = document.createElement("button");
    plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "Add one");
    plus.addEventListener("click", () => changeQuantity(product.id, 1));
    controls.append(minus, qty, plus);
    line.append(details, controls);
    container.append(line);
  }
  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-total").textContent = money(total);
}

document.getElementById("category-filter").addEventListener("change", loadProducts);
document.getElementById("cart-jump").addEventListener("click", () => {
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("order-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.getElementById("order-status");
  const items = Object.entries(cart).map(([product_id, quantity]) => ({
    product_id: Number(product_id), quantity: Number(quantity)
  }));
  if (!items.length) {
    status.textContent = "Add at least one dress before checkout.";
    return;
  }
  const form = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  status.textContent = "Placing your demo order…";
  try {
    const response = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: form.get("customer_name"),
        customer_email: form.get("customer_email"),
        items
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Order failed");
    status.textContent = `Order #${result.order_id} placed successfully. Total: ${money(result.total)}.`;
    cart = {};
    saveCart();
    renderCart();
    event.currentTarget.reset();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

loadProducts();
