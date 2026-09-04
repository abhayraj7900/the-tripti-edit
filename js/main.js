/* ================================================================
   TRIPTI JEWELLERS — MAIN JAVASCRIPT
   Cart, catalogue, navigation and WhatsApp checkout live here.
   ================================================================ */

// Replace these two placeholders before launch.
const STORE_CONFIG = {
  whatsappNumber: "919999999999", // Country code + number, without + or spaces.
  upiId: "thetriptiedit@upi",
  supportEmail: "triptijewellers4826@gmail.com",
  freeShippingMinimum: 999,
  standardShipping: 79
};

const CART_KEY = "theTriptiEditCart";
const WISHLIST_KEY = "triptiJewellersWishlist";
let PRODUCTS = window.PRODUCTS || [];

document.addEventListener("DOMContentLoaded", async () => {
  window.TriptiSupabase?.consumeAuthHash();
  setupNavigation();
  setupSearchForms();
  setupProductActions();
  updateCartCount();
  updateWishlistCount();
  setActiveNavigation();
  updateAccountLinks();
  document.querySelectorAll("[data-current-year]").forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  await loadRemoteStoreData();
  setupStoreDetails();

  const page = document.body.dataset.page;
  if (page === "home") renderFeaturedProducts();
  if (page === "shop") setupShop();
  if (page === "product") renderProductPage();
  if (page === "cart") renderCart();
  if (page === "watchlist" || page === "wishlist") renderWishlist();
  if (page === "contact") setupContactForm();
  syncWishlistForSignedInUser();
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

function getWishlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY));
    return Array.isArray(saved) ? [...new Set(saved.map(Number).filter(Number.isInteger))] : [];
  } catch (error) {
    return [];
  }
}

function saveWishlist(wishlist) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  updateWishlistCount();
}

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[character]);
}

function mapDatabaseProduct(product) {
  return {
    id: Number(product.id),
    name: product.name,
    category: product.category,
    price: Number(product.price),
    oldPrice: product.old_price === null ? null : Number(product.old_price),
    stock: Number(product.stock || 0),
    image: product.image_url,
    imagePosition: product.image_position || "center",
    imageAlt: product.image_alt || product.name,
    badge: product.badge || "",
    featured: Boolean(product.featured),
    description: product.description || "",
    details: Array.isArray(product.details) ? product.details : [],
    sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes : undefined
  };
}

async function loadRemoteStoreData() {
  const api = window.TriptiSupabase;
  if (!api) return;
  const page = document.body.dataset.page;
  const needsCatalogue = ["home", "shop", "product", "cart", "watchlist", "wishlist"].includes(page);
  const [catalogResult, settingsResult, bannerResult] = await Promise.allSettled([
    needsCatalogue ? api.select("products", "select=*&is_active=eq.true&order=display_order.asc,created_at.asc") : Promise.resolve([]),
    api.select("site_settings", "select=*&id=eq.1&limit=1"),
    page === "home" ? api.select("banners", "select=*&is_active=eq.true&order=display_order.asc,created_at.desc&limit=1") : Promise.resolve([])
  ]);

  if (catalogResult.status === "fulfilled" && catalogResult.value.length) {
    PRODUCTS = catalogResult.value.map(mapDatabaseProduct);
    window.PRODUCTS = PRODUCTS;
  }
  if (settingsResult.status === "fulfilled" && settingsResult.value[0]) {
    const settings = settingsResult.value[0];
    STORE_CONFIG.whatsappNumber = settings.whatsapp_number || STORE_CONFIG.whatsappNumber;
    STORE_CONFIG.upiId = settings.upi_id || STORE_CONFIG.upiId;
    STORE_CONFIG.supportEmail = settings.support_email || STORE_CONFIG.supportEmail;
    STORE_CONFIG.freeShippingMinimum = Number(settings.free_shipping_minimum ?? STORE_CONFIG.freeShippingMinimum);
    STORE_CONFIG.standardShipping = Number(settings.standard_shipping ?? STORE_CONFIG.standardShipping);
    document.querySelectorAll(".offer-bar").forEach((item) => { item.textContent = settings.announcement; });
  }
  if (bannerResult.status === "fulfilled" && bannerResult.value[0]) renderManagedBanner(bannerResult.value[0]);
}

function renderManagedBanner(banner) {
  const main = document.querySelector("main");
  if (!main || document.querySelector("#managed-home-banner") || document.body.dataset.page !== "home") return;
  const section = document.createElement("section");
  section.id = "managed-home-banner";
  section.className = "managed-home-banner";
  if (banner.image_url) section.style.backgroundImage = `linear-gradient(90deg, rgba(35, 9, 16, .93), rgba(52, 7, 19, .45)), url("${String(banner.image_url).replace(/[\"\\\n\r]/g, "")}")`;
  section.innerHTML = `<div class="container"><p class="eyebrow eyebrow-light">Featured now</p><h2>${escapeHTML(banner.title)}</h2><p>${escapeHTML(banner.body)}</p><a class="button button-gold" href="${escapeHTML(banner.link_url || "shop.html")}">${escapeHTML(banner.button_label || "Shop now")}</a></div>`;
  main.prepend(section);
}

/* ---------- Header and navigation ---------- */

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#main-nav");
  const backdrop = document.querySelector(".menu-backdrop");
  if (!toggle || !navigation) return;

  function setOpen(isOpen) {
    navigation.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close jewellery menu" : "Open jewellery menu");
    navigation.setAttribute("aria-hidden", String(!isOpen));
    if (backdrop) backdrop.hidden = !isOpen;
  }

  toggle.addEventListener("click", () => setOpen(!navigation.classList.contains("is-open")));
  document.querySelectorAll("[data-menu-close]").forEach((control) => control.addEventListener("click", () => setOpen(false)));
  navigation.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
}

function setActiveNavigation() {
  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  const activeCategory = new URLSearchParams(window.location.search).get("category");
  document.querySelectorAll(".category-nav a, .mobile-menu a, .header-actions a").forEach((link) => {
    const href = link.getAttribute("href");
    const linkCategory = new URL(href, window.location.href).searchParams.get("category");
    if ((activeCategory && linkCategory === activeCategory) || (!activeCategory && href === currentFile) || (currentFile === "product.html" && href === "shop.html")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function setupSearchForms() {
  const query = new URLSearchParams(window.location.search).get("search") || "";
  document.querySelectorAll(".site-search input[name='search']").forEach((input) => {
    input.value = query;
  });
}

function setupStoreDetails() {
  const greeting = encodeURIComponent("Hello Tripti Jewellers, I would like some help.");
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${greeting}`;
    link.target = "_blank";
    link.rel = "noopener";
  });
  document.querySelectorAll("[data-upi-id]").forEach((item) => {
    item.textContent = STORE_CONFIG.upiId;
  });
  document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
    link.href = `mailto:${STORE_CONFIG.supportEmail}`;
    link.textContent = STORE_CONFIG.supportEmail;
  });
}

async function updateAccountLinks() {
  const api = window.TriptiSupabase;
  const session = api ? await api.getSession({ refresh: false }) : null;
  const destination = session ? "account.html" : "login.html";
  const label = "My account";
  document.querySelectorAll("[data-account-link]").forEach((link) => {
    link.href = destination;
    link.setAttribute("aria-label", session ? "View my account" : "Login or create account");
    const text = link.querySelector("[data-account-text]");
    if (text) text.textContent = label;
  });
  document.querySelectorAll("[data-account-menu-link]").forEach((link) => {
    link.href = destination;
    const text = link.querySelector("[data-account-menu-text]");
    if (text) text.textContent = label;
  });
}

/* ---------- Product cards and catalogue ---------- */

function productCard(product) {
  const oldPrice = product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : "";
  const isSaved = getWishlist().includes(product.id);
  const inStock = product.stock === undefined || product.stock > 0;
  const name = escapeHTML(product.name);
  return `
    <article class="product-card">
      <button class="wishlist-toggle ${isSaved ? "is-saved" : ""}" type="button" data-wishlist-toggle="${product.id}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove" : "Add"} ${name} ${isSaved ? "from" : "to"} watchlist"><span data-wishlist-icon aria-hidden="true">${isSaved ? "♥" : "♡"}</span></button>
      <a class="product-image-wrap" href="product.html?id=${product.id}" aria-label="View ${name}">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.imageAlt)}" loading="lazy" style="object-position: ${escapeHTML(product.imagePosition || "center")}">
        ${product.badge ? `<span class="product-badge">${escapeHTML(product.badge)}</span>` : ""}
        ${inStock ? "" : '<span class="stock-badge">Out of stock</span>'}
      </a>
      <div class="product-card-body">
        <p class="product-category">${escapeHTML(product.category)}</p>
        <h3><a href="product.html?id=${product.id}">${name}</a></h3>
        <div class="product-card-footer">
          <p class="product-price">${formatPrice(product.price)} ${oldPrice}</p>
          <button class="quick-add" type="button" data-add-to-cart="${product.id}" aria-label="${inStock ? `Add ${name} to bag` : `${name} is out of stock`}" ${inStock ? "" : "disabled"}>${inStock ? "+" : "×"}</button>
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
  const searchQuery = (new URLSearchParams(window.location.search).get("search") || "").trim().toLowerCase();
  let activeCategory = categories.includes(requestedCategory) ? requestedCategory : "All";

  filters.innerHTML = categories.map((category) => `
    <button class="filter-button ${category === activeCategory ? "is-active" : ""}" type="button" data-category="${category}">${category}</button>
  `).join("");

  function renderFilteredProducts() {
    let visible = activeCategory === "All" ? PRODUCTS : PRODUCTS.filter((product) => product.category === activeCategory);
    if (searchQuery) {
      visible = visible.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchQuery));
    }
    container.innerHTML = visible.map(productCard).join("");
    document.querySelector("#product-count").textContent = `${visible.length} ${visible.length === 1 ? "design" : "designs"}${searchQuery ? ` for “${searchQuery}”` : ""}`;
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

  document.title = `${product.name} | Tripti Jewellers`;
  updateMeta("meta[name='description']", `${product.name}: ${product.description} Shop from Tripti Jewellers.`);
  updateMeta("meta[property='og:title']", `${product.name} | Tripti Jewellers`);
  updateMeta("meta[property='og:description']", product.description);
  updateMeta("meta[property='og:url']", `https://tripti-jewellers.rosy-mochi-9272.chatgpt.site/product.html?id=${product.id}`);
  document.querySelector("#breadcrumb-product").textContent = product.name;

  const oldPrice = product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : "";
  const isSaved = getWishlist().includes(product.id);
  const inStock = product.stock === undefined || product.stock > 0;
  const sizeField = product.sizes ? `
    <div class="field-group"><label for="product-size">Select size</label><select id="product-size">${product.sizes.map((size) => `<option value="${escapeHTML(size)}">${escapeHTML(size)}</option>`).join("")}</select><a href="contact.html#faq" class="size-link">Size help</a></div>` : "";

  container.innerHTML = `
    <section class="product-detail">
      <div class="product-detail-image"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.imageAlt)}" style="object-position: ${escapeHTML(product.imagePosition || "center")}">${product.badge ? `<span class="product-badge">${escapeHTML(product.badge)}</span>` : ""}</div>
      <div class="product-info">
        <p class="eyebrow">${escapeHTML(product.category)}</p>
        <h1>${escapeHTML(product.name)}</h1>
        <p class="detail-price">${formatPrice(product.price)} ${oldPrice}</p>
        <p class="tax-note">Inclusive of all taxes</p>
        <p class="product-description">${escapeHTML(product.description)}</p>
        ${sizeField}
        <div class="purchase-row"><div class="quantity-control" aria-label="Choose quantity"><button type="button" data-product-qty="minus" aria-label="Decrease quantity">−</button><input id="product-quantity" type="number" min="1" max="${Math.min(10, product.stock || 10)}" value="1" aria-label="Quantity"><button type="button" data-product-qty="plus" aria-label="Increase quantity">+</button></div><button class="button button-gold" type="button" data-detail-add="${product.id}" ${inStock ? "" : "disabled"}>${inStock ? "Add to bag" : "Out of stock"}</button></div>
        <button class="wishlist-detail-button ${isSaved ? "is-saved" : ""}" type="button" data-wishlist-toggle="${product.id}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove" : "Add"} ${product.name} ${isSaved ? "from" : "to"} watchlist"><span data-wishlist-icon aria-hidden="true">${isSaved ? "♥" : "♡"}</span><span data-wishlist-text>${isSaved ? "Saved to watchlist" : "Save to watchlist"}</span></button>
        <div class="delivery-note"><span>✦</span><div><strong>Complimentary shipping above ₹999</strong><p>Usually dispatched within 2–3 working days.</p></div></div>
        <details class="detail-accordion" open><summary>Product details</summary><ul>${product.details.map((detail) => `<li>${escapeHTML(detail)}</li>`).join("")}</ul></details>
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
      input.value = Math.max(1, Math.min(Number(input.max) || 10, Number(input.value) + change));
    });
  });
}

/* ---------- Cart actions ---------- */

function setupProductActions() {
  document.addEventListener("click", (event) => {
    const wishlistButton = event.target.closest("[data-wishlist-toggle]");
    if (wishlistButton) {
      const productId = Number(wishlistButton.dataset.wishlistToggle);
      const isSaved = toggleWishlist(productId);
      const product = getProduct(productId);
      if (["watchlist", "wishlist"].includes(document.body.dataset.page)) renderWishlist();
      else syncWishlistButtons(productId);
      showToast(`${product?.name || "Product"} ${isSaved ? "saved to" : "removed from"} your watchlist`);
      return;
    }

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

/* ---------- Wishlist actions ---------- */

function toggleWishlist(productId) {
  const wishlist = getWishlist();
  const existingIndex = wishlist.indexOf(productId);
  if (existingIndex >= 0) wishlist.splice(existingIndex, 1);
  else wishlist.push(productId);
  saveWishlist(wishlist);
  persistWishlistChange(productId, existingIndex < 0);
  return existingIndex < 0;
}

async function persistWishlistChange(productId, isSaved) {
  const api = window.TriptiSupabase;
  if (!api) return;
  const user = await api.getUser();
  if (!user) return;
  try {
    if (isSaved) {
      await api.insert("wishlist_items", { user_id: user.id, product_id: productId }, { select: false, upsert: true, onConflict: "user_id,product_id" });
    } else {
      await api.remove("wishlist_items", `user_id=eq.${encodeURIComponent(user.id)}&product_id=eq.${Number(productId)}`);
    }
  } catch (error) {
    console.warn("Watchlist sync is not ready:", error.message);
  }
}

async function syncWishlistForSignedInUser() {
  const api = window.TriptiSupabase;
  if (!api) return;
  const user = await api.getUser();
  if (!user) return;
  try {
    const rows = await api.select("wishlist_items", `select=product_id&user_id=eq.${encodeURIComponent(user.id)}`);
    const local = getWishlist();
    const remote = rows.map((row) => Number(row.product_id));
    const merged = [...new Set([...local, ...remote])];
    const missing = local.filter((id) => !remote.includes(id));
    if (missing.length) {
      await api.insert("wishlist_items", missing.map((productId) => ({ user_id: user.id, product_id: productId })), { select: false, upsert: true, onConflict: "user_id,product_id" });
    }
    saveWishlist(merged);
    if (["watchlist", "wishlist"].includes(document.body.dataset.page)) renderWishlist();
  } catch (error) {
    console.warn("Watchlist sync is not ready:", error.message);
  }
}

function syncWishlistButtons(productId) {
  const isSaved = getWishlist().includes(productId);
  const product = getProduct(productId);
  document.querySelectorAll(`[data-wishlist-toggle="${productId}"]`).forEach((button) => {
    button.classList.toggle("is-saved", isSaved);
    button.setAttribute("aria-pressed", String(isSaved));
    button.setAttribute("aria-label", `${isSaved ? "Remove" : "Add"} ${product?.name || "product"} ${isSaved ? "from" : "to"} watchlist`);
    const icon = button.querySelector("[data-wishlist-icon]");
    const text = button.querySelector("[data-wishlist-text]");
    if (icon) icon.textContent = isSaved ? "♥" : "♡";
    if (text) text.textContent = isSaved ? "Saved to watchlist" : "Save to watchlist";
  });
}

function updateWishlistCount() {
  const count = getWishlist().filter((id) => getProduct(id)).length;
  document.querySelectorAll(".wishlist-count").forEach((item) => item.textContent = count);
}

function renderWishlist() {
  const grid = document.querySelector("#wishlist-products");
  const content = document.querySelector("#wishlist-content");
  const empty = document.querySelector("#wishlist-empty");
  const summary = document.querySelector("#wishlist-summary");
  if (!grid || !content || !empty || !summary) return;

  const stored = getWishlist();
  const wishlist = stored.filter((id) => getProduct(id));
  if (wishlist.length !== stored.length) saveWishlist(wishlist);
  const isEmpty = wishlist.length === 0;
  content.hidden = isEmpty;
  empty.hidden = !isEmpty;
  if (isEmpty) return;

  summary.textContent = `${wishlist.length} saved ${wishlist.length === 1 ? "design" : "designs"}`;
  grid.innerHTML = wishlist.map((id) => productCard(getProduct(id))).join("");
}

function addToCart(productId, quantity = 1, size = "") {
  const product = getProduct(productId);
  if (!product || (product.stock !== undefined && product.stock < 1)) {
    showToast("This design is currently out of stock");
    return;
  }
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId && item.size === size);
  const maximum = Math.min(10, product.stock ?? 10);
  if (existing) existing.quantity = Math.min(maximum, existing.quantity + quantity);
  else cart.push({ id: productId, quantity: Math.min(maximum, quantity), size });
  saveCart(cart);
  showToast(`${product.name} added to your bag`);
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
        <div class="cart-item-info"><p class="product-category">${escapeHTML(product.category)}</p><h2><a href="product.html?id=${product.id}">${escapeHTML(product.name)}</a></h2>${item.size ? `<p class="cart-meta">Size: ${escapeHTML(item.size)}</p>` : ""}<p class="cart-item-price">${formatPrice(product.price)}</p><div class="cart-item-actions"><div class="quantity-control"><button type="button" data-cart-change="-1" data-cart-index="${index}" aria-label="Decrease ${escapeHTML(product.name)} quantity">−</button><input type="number" min="1" max="${Math.min(10, product.stock ?? 10)}" value="${item.quantity}" data-cart-input="${index}" aria-label="${escapeHTML(product.name)} quantity"><button type="button" data-cart-change="1" data-cart-index="${index}" aria-label="Increase ${escapeHTML(product.name)} quantity">+</button></div><button class="remove-button" type="button" data-cart-remove="${index}">Remove</button></div></div>
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
    const product = getProduct(cart[index].id);
    cart[index].quantity = Math.max(1, Math.min(10, product?.stock ?? 10, cart[index].quantity + Number(changeButton.dataset.cartChange)));
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
  const product = getProduct(cart[index].id);
  cart[index].quantity = Math.max(1, Math.min(10, product?.stock ?? 10, Number(input.value) || 1));
  saveCart(cart);
  renderCart();
}

function setupCheckoutForm(cart, totals) {
  const form = document.querySelector("#checkout-form");
  if (!form) return;
  const savedDraft = JSON.parse(localStorage.getItem("triptiCheckoutDraft") || "null");
  if (savedDraft) {
    ["name", "phone", "address"].forEach((key) => { if (savedDraft[key] && form.elements[key]) form.elements[key].value = savedDraft[key]; });
  }
  prefillCheckoutFromAccount(form);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const draft = { name: data.get("name"), phone: data.get("phone"), address: data.get("address") };
    localStorage.setItem("triptiCheckoutDraft", JSON.stringify(draft));
    const api = window.TriptiSupabase;
    const user = api ? await api.getUser() : null;
    if (!user) {
      window.location.href = "login.html?returnTo=cart.html";
      return;
    }
    const submitButton = form.querySelector("button[type='submit']");
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Creating your order…";
    try {
      const order = await api.rpc("place_order", {
        p_customer_name: String(data.get("name")),
        p_phone: String(data.get("phone")),
        p_address: String(data.get("address")),
        p_payment_method: "To be confirmed on WhatsApp",
        p_items: cart.map((item) => ({ id: item.id, quantity: item.quantity, size: item.size || "" }))
      });
    const orderLines = cart.map((item) => {
      const product = getProduct(item.id);
      const size = item.size ? `, Size ${item.size}` : "";
      return `• ${product.name}${size} × ${item.quantity} — ${formatPrice(product.price * item.quantity)}`;
    }).join("\n");
    const message = [
      `Hello Tripti Jewellers, I placed order ${order.order_number}:`, "", orderLines, "",
      `Subtotal: ${formatPrice(order.subtotal)}`,
      `Shipping: ${Number(order.shipping) === 0 ? "Complimentary" : formatPrice(order.shipping)}`,
      `Order total: ${formatPrice(order.total)}`, "",
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      `Address: ${data.get("address")}`, "",
      "Preferred payment: Please confirm UPI or Cash on Delivery."
    ].join("\n");
      saveCart([]);
      localStorage.removeItem("triptiCheckoutDraft");
      window.location.assign(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`);
    } catch (error) {
      showToast(error.message);
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  };
}

async function prefillCheckoutFromAccount(form) {
  const api = window.TriptiSupabase;
  if (!api || form.elements.name.value || form.elements.phone.value || form.elements.address.value) return;
  const user = await api.getUser();
  if (!user) return;
  try {
    const [profiles, addresses] = await Promise.all([
      api.select("profiles", `select=full_name,phone&id=eq.${encodeURIComponent(user.id)}&limit=1`),
      api.select("addresses", `select=*&user_id=eq.${encodeURIComponent(user.id)}&order=is_default.desc,created_at.desc&limit=1`)
    ]);
    const profile = profiles[0];
    const address = addresses[0];
    if (profile?.full_name) form.elements.name.value = profile.full_name;
    if (profile?.phone) form.elements.phone.value = profile.phone;
    if (address) form.elements.address.value = `${address.address_line}, ${address.city}, ${address.state} – ${address.pincode}`;
  } catch (error) {
    console.warn("Checkout profile could not be loaded:", error.message);
  }
}

/* ---------- Contact form ---------- */

function setupContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const message = `Hello Tripti Jewellers,\n\nMy name is ${data.get("name")} (${data.get("phone")}).\n\n${data.get("message")}`;
    window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });
}
