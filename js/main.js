/* ================================================================
   THE TRIPTI EDIT — MAIN JAVASCRIPT
   Cart, catalogue, navigation and WhatsApp checkout live here.
   ================================================================ */

// Replace these two placeholders before launch.
const STORE_CONFIG = {
  whatsappNumber: "919999999999", // Country code + number, without + or spaces.
  upiId: "thetriptiedit@upi",
  freeShippingMinimum: 999,
  standardShipping: 79
};

const CART_KEY = "theTriptiEditCart";
const PRODUCTS = window.PRODUCTS || [];

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupStoreDetails();
  setupProductActions();
  updateCartCount();
  setActiveNavigation();
  document.querySelectorAll("[data-current-year]").forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  const page = document.body.dataset.page;
  if (page === "home") renderFeaturedProducts();
  if (page === "shop") setupShop();
  if (page === "product") renderProductPage();
  if (page === "cart") renderCart();
  if (page === "contact") setupContactForm();
});

/* ---------- Shared helpers ---------- */

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function getProduct(id) {
  return PRODUCTS.find((product) => product.id === Number(id));
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

/* ---------- Header and navigation ---------- */

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");
  if (!toggle || !navigation) return;

  toggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  navigation.addEventListener("click", () => {
    navigation.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });
}

function setActiveNavigation() {
  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    if (link.getAttribute("href") === currentFile || (currentFile === "product.html" && link.getAttribute("href") === "shop.html")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function setupStoreDetails() {
  const greeting = encodeURIComponent("Hello The Tripti Edit, I would like some help.");
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${greeting}`;
    link.target = "_blank";
    link.rel = "noopener";
  });
  document.querySelectorAll("[data-upi-id]").forEach((item) => {
    item.textContent = STORE_CONFIG.upiId;
  });
}

/* ---------- Product cards and catalogue ---------- */

function productCard(product) {
  const oldPrice = product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : "";
  return `
    <article class="product-card">
      <a class="product-image-wrap" href="product.html?id=${product.id}" aria-label="View ${product.name}">
        <img src="${product.image}" alt="${product.imageAlt}" loading="lazy">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
      </a>
      <div class="product-card-body">
        <p class="product-category">${product.category}</p>
        <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
        <div class="product-card-footer">
          <p class="product-price">${formatPrice(product.price)} ${oldPrice}</p>
          <button class="quick-add" type="button" data-add-to-cart="${product.id}" aria-label="Add ${product.name} to bag">+</button>
        </div>
      </div>
    </article>`;
}

function renderFeaturedProducts() {
  const container = document.querySelector("#featured-products");
  if (!container) return;
  container.innerHTML = PRODUCTS.filter((product) => product.featured).slice(0, 4).map(productCard).join("");
}

function setupShop() {
  const filters = document.querySelector("#category-filters");
  const container = document.querySelector("#shop-products");
  if (!filters || !container) return;

  const categories = ["All", ...new Set(PRODUCTS.map((product) => product.category))];
  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  let activeCategory = categories.includes(requestedCategory) ? requestedCategory : "All";

  filters.innerHTML = categories.map((category) => `
    <button class="filter-button ${category === activeCategory ? "is-active" : ""}" type="button" data-category="${category}">${category}</button>
  `).join("");

  function renderFilteredProducts() {
    const visible = activeCategory === "All" ? PRODUCTS : PRODUCTS.filter((product) => product.category === activeCategory);
    container.innerHTML = visible.map(productCard).join("");
    document.querySelector("#product-count").textContent = `${visible.length} ${visible.length === 1 ? "product" : "products"}`;
    document.querySelector("#shop-empty").hidden = visible.length > 0;
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    filters.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("is-active", item === button));
    renderFilteredProducts();
  });

  renderFilteredProducts();
}

/* ---------- Dynamic product details ---------- */

function renderProductPage() {
  const container = document.querySelector("#product-detail");
  const productId = new URLSearchParams(window.location.search).get("id") || 1;
  const product = getProduct(productId);
  if (!container) return;

  if (!product) {
    container.innerHTML = `<div class="empty-state"><h1>Product not found</h1><p>This item may have moved or is no longer available.</p><a class="button button-dark" href="shop.html">Return to shop</a></div>`;
    document.querySelector(".related-section").hidden = true;
    return;
  }

  document.title = `${product.name} | The Tripti Edit`;
  updateMeta("meta[name='description']", `${product.name}: ${product.description} Shop from The Tripti Edit.`);
  updateMeta("meta[property='og:title']", `${product.name} | The Tripti Edit`);
  updateMeta("meta[property='og:description']", product.description);
  updateMeta("meta[property='og:url']", `https://thetriptiedit.in/product.html?id=${product.id}`);
  document.querySelector("#breadcrumb-product").textContent = product.name;

  const oldPrice = product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : "";
  const sizeField = product.sizes ? `
    <div class="field-group"><label for="product-size">Select size</label><select id="product-size">${product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("")}</select><a href="contact.html#faq" class="size-link">Size help</a></div>` : "";

  container.innerHTML = `
    <section class="product-detail">
      <div class="product-detail-image"><img src="${product.image}" alt="${product.imageAlt}">${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}</div>
      <div class="product-info">
        <p class="eyebrow">${product.category}</p>
        <h1>${product.name}</h1>
        <p class="detail-price">${formatPrice(product.price)} ${oldPrice}</p>
        <p class="tax-note">Inclusive of all taxes</p>
        <p class="product-description">${product.description}</p>
        ${sizeField}
        <div class="purchase-row"><div class="quantity-control" aria-label="Choose quantity"><button type="button" data-product-qty="minus" aria-label="Decrease quantity">−</button><input id="product-quantity" type="number" min="1" max="10" value="1" aria-label="Quantity"><button type="button" data-product-qty="plus" aria-label="Increase quantity">+</button></div><button class="button button-gold" type="button" data-detail-add="${product.id}">Add to bag</button></div>
        <div class="delivery-note"><span>✦</span><div><strong>Complimentary shipping above ₹999</strong><p>Usually dispatched within 2–3 working days.</p></div></div>
        <details class="detail-accordion" open><summary>Product details</summary><ul>${product.details.map((detail) => `<li>${detail}</li>`).join("")}</ul></details>
        <details class="detail-accordion"><summary>Shipping & returns</summary><p>Estimated delivery is 4–8 working days. Contact us within 3 days for damaged or incorrect items.</p></details>
      </div>
    </section>`;

  const related = PRODUCTS.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);
  document.querySelector("#related-products").innerHTML = related.map(productCard).join("");
  setupProductQuantity();
}

function updateMeta(selector, content) {
  const tag = document.querySelector(selector);
  if (tag) tag.setAttribute("content", content);
}

function setupProductQuantity() {
  const input = document.querySelector("#product-quantity");
  if (!input) return;
  document.querySelectorAll("[data-product-qty]").forEach((button) => {
    button.addEventListener("click", () => {
      const change = button.dataset.productQty === "plus" ? 1 : -1;
      input.value = Math.max(1, Math.min(10, Number(input.value) + change));
    });
  });
}

/* ---------- Cart actions ---------- */

function setupProductActions() {
  document.addEventListener("click", (event) => {
    const quickButton = event.target.closest("[data-add-to-cart]");
    if (quickButton) addToCart(Number(quickButton.dataset.addToCart), 1);

    const detailButton = event.target.closest("[data-detail-add]");
    if (detailButton) {
      const quantity = Number(document.querySelector("#product-quantity")?.value || 1);
      const size = document.querySelector("#product-size")?.value || "";
      addToCart(Number(detailButton.dataset.detailAdd), quantity, size);
    }
  });
}

function addToCart(productId, quantity = 1, size = "") {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId && item.size === size);
  if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
  else cart.push({ id: productId, quantity, size });
  saveCart(cart);
  showToast(`${getProduct(productId)?.name || "Product"} added to your bag`);
}

function updateCartCount() {
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll(".cart-count").forEach((item) => item.textContent = count);
}

function calculateOrder(cart) {
  const subtotal = cart.reduce((total, item) => {
    const product = getProduct(item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
  const shipping = subtotal === 0 || subtotal >= STORE_CONFIG.freeShippingMinimum ? 0 : STORE_CONFIG.standardShipping;
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderCart() {
  const list = document.querySelector("#cart-items");
  const content = document.querySelector("#cart-content");
  const empty = document.querySelector("#cart-empty");
  const summary = document.querySelector("#order-summary");
  if (!list || !content || !empty || !summary) return;

  const cart = getCart().filter((item) => getProduct(item.id));
  saveCart(cart);
  const isEmpty = cart.length === 0;
  content.hidden = isEmpty;
  empty.hidden = !isEmpty;
  if (isEmpty) return;

  list.innerHTML = cart.map((item, index) => {
    const product = getProduct(item.id);
    return `
      <article class="cart-item">
        <a href="product.html?id=${product.id}" class="cart-item-image"><img src="${product.image}" alt="${product.imageAlt}"></a>
        <div class="cart-item-info"><p class="product-category">${product.category}</p><h2><a href="product.html?id=${product.id}">${product.name}</a></h2>${item.size ? `<p class="cart-meta">Size: ${item.size}</p>` : ""}<p class="cart-item-price">${formatPrice(product.price)}</p><div class="cart-item-actions"><div class="quantity-control"><button type="button" data-cart-change="-1" data-cart-index="${index}" aria-label="Decrease ${product.name} quantity">−</button><input type="number" min="1" max="10" value="${item.quantity}" data-cart-input="${index}" aria-label="${product.name} quantity"><button type="button" data-cart-change="1" data-cart-index="${index}" aria-label="Increase ${product.name} quantity">+</button></div><button class="remove-button" type="button" data-cart-remove="${index}">Remove</button></div></div>
        <p class="cart-line-total">${formatPrice(product.price * item.quantity)}</p>
      </article>`;
  }).join("");

  const totals = calculateOrder(cart);
  summary.innerHTML = `<p class="eyebrow">Order summary</p><h2>${cart.reduce((total, item) => total + item.quantity, 0)} items</h2><div class="summary-row"><span>Subtotal</span><strong>${formatPrice(totals.subtotal)}</strong></div><div class="summary-row"><span>Shipping</span><strong>${totals.shipping === 0 ? "Complimentary" : formatPrice(totals.shipping)}</strong></div><div class="summary-row summary-total"><span>Total</span><strong>${formatPrice(totals.total)}</strong></div>`;

  list.onclick = handleCartClick;
  list.onchange = handleCartInput;
  setupCheckoutForm(cart, totals);
}

function handleCartClick(event) {
  const changeButton = event.target.closest("[data-cart-change]");
  const removeButton = event.target.closest("[data-cart-remove]");
  const cart = getCart();
  if (changeButton) {
    const index = Number(changeButton.dataset.cartIndex);
    cart[index].quantity = Math.max(1, Math.min(10, cart[index].quantity + Number(changeButton.dataset.cartChange)));
    saveCart(cart);
    renderCart();
  }
  if (removeButton) {
    const removed = getProduct(cart[Number(removeButton.dataset.cartRemove)].id);
    cart.splice(Number(removeButton.dataset.cartRemove), 1);
    saveCart(cart);
    renderCart();
    showToast(`${removed?.name || "Product"} removed`);
  }
}

function handleCartInput(event) {
  const input = event.target.closest("[data-cart-input]");
  if (!input) return;
  const cart = getCart();
  const index = Number(input.dataset.cartInput);
  cart[index].quantity = Math.max(1, Math.min(10, Number(input.value) || 1));
  saveCart(cart);
  renderCart();
}

function setupCheckoutForm(cart, totals) {
  const form = document.querySelector("#checkout-form");
  if (!form) return;
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const orderLines = cart.map((item) => {
      const product = getProduct(item.id);
      const size = item.size ? `, Size ${item.size}` : "";
      return `• ${product.name}${size} × ${item.quantity} — ${formatPrice(product.price * item.quantity)}`;
    }).join("\n");
    const message = [
      "Hello The Tripti Edit, I would like to place this order:", "", orderLines, "",
      `Subtotal: ${formatPrice(totals.subtotal)}`,
      `Shipping: ${totals.shipping === 0 ? "Complimentary" : formatPrice(totals.shipping)}`,
      `Order total: ${formatPrice(totals.total)}`, "",
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      `Address: ${data.get("address")}`, "",
      "Preferred payment: Please confirm UPI or Cash on Delivery."
    ].join("\n");
    window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };
}

/* ---------- Contact form ---------- */

function setupContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const message = `Hello The Tripti Edit,\n\nMy name is ${data.get("name")} (${data.get("phone")}).\n\n${data.get("message")}`;
    window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });
}

