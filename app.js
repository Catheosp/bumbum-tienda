/* =========================================================
   NOMBRE_MARCA — Catálogo digital (HTML/CSS/JS vanilla)
   No procesa pagos. Muestra productos, arma un pedido y
   cierra el contacto por WhatsApp. Captura de leads opcional.
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURACIÓN
   Los ajustes editables (WhatsApp, Supabase, leads) viven en
   config.js, para tenerlos todos juntos en un solo archivo.
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   FUENTE DE DATOS — aislada a propósito.
   Si el panel está conectado (Supabase configurado en config.js),
   lee los productos de ahí; si no, usa el products.json de ejemplo.
   --------------------------------------------------------- */
async function fetchProducts() {
  const client = getSupabase();              // definido en supabase-client.js
  if (client) {
    const { data, error } = await client
      .from("productos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(rowToProduct);           // mapper en supabase-client.js
  }
  // Respaldo: archivo local de ejemplo (mientras no se conecta el panel)
  const res = await fetch(PRODUCTS_URL);
  if (!res.ok) throw new Error("No se pudieron cargar los productos");
  return res.json();
}

/* ---------------------------------------------------------
   ESTADO DE LA APP
   --------------------------------------------------------- */
let PRODUCTS = [];          // catálogo completo
let currentFilter = "todo"; // filtro de categoría activo
const cart = [];            // items del pedido: { key, id, nombre, variante, precio, moneda, cantidad }

// Metadatos de las etiquetas de disponibilidad
const AVAILABILITY = {
  disponible: { text: "Disponible", cls: "disponible" },
  pocas:      { text: "Pocas unidades", cls: "pocas" },
  agotado:    { text: "Agotado", cls: "agotado" },
  encargo:    { text: "Por encargo", cls: "encargo" },
};

/* ---------------------------------------------------------
   UTILIDADES
   --------------------------------------------------------- */

// Formatea el precio o devuelve "Consultar precio" si es null.
function formatPrice(precio, moneda) {
  if (precio === null || precio === undefined) return null;
  const symbol = moneda === "EUR" ? "€" : (moneda || "");
  return `${precio} ${symbol}`.trim();
}

// Clave única de un item del carrito (producto + variante).
function cartKey(id, variante) {
  return variante ? `${id}__${variante}` : id;
}

/* ---------------------------------------------------------
   RENDER DEL CATÁLOGO
   --------------------------------------------------------- */
function renderCatalog() {
  const catalog = document.getElementById("catalog");
  const list = PRODUCTS.filter(
    (p) => currentFilter === "todo" || p.categoria === currentFilter
  );

  if (list.length === 0) {
    catalog.innerHTML = `<p class="catalog-status">No hay productos en esta categoría.</p>`;
    return;
  }

  catalog.innerHTML = list.map(cardHTML).join("");
}

// Devuelve el HTML de una tarjeta de producto.
function cardHTML(p) {
  const avail = AVAILABILITY[p.disponibilidad] || AVAILABILITY.disponible;
  const agotado = p.disponibilidad === "agotado";
  const priceLabel = formatPrice(p.precio, p.moneda);
  const img = (p.imagenes && p.imagenes[0]) || "";

  const priceHTML = priceLabel
    ? `<p class="card-price">${priceLabel}</p>`
    : `<p class="card-price consultar">Consultar precio</p>`;

  return `
    <article class="card">
      <img class="card-img" src="${img}" alt="${p.nombre}"
           loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="card-body">
        <span class="badge ${avail.cls}">${avail.text}</span>
        <h3 class="card-name">${p.nombre}</h3>
        <p class="card-desc">${p.descripcion || ""}</p>
        ${priceHTML}
        <button class="btn-add" data-id="${p.id}" ${agotado ? "disabled" : ""}>
          ${agotado ? "No disponible" : "Agregar al pedido"}
        </button>
      </div>
    </article>
  `;
}

/* ---------------------------------------------------------
   SELECCIÓN DE VARIANTE (modal)
   Si el producto tiene variantes, se pide elegir una antes
   de añadir al pedido.
   --------------------------------------------------------- */
let pendingProduct = null;     // producto en espera de variante
let selectedVariant = null;    // variante elegida en el modal

function openVariantModal(product) {
  pendingProduct = product;
  selectedVariant = null;

  const modal = document.getElementById("variant-modal");
  const options = document.getElementById("variant-options");
  const confirm = document.getElementById("variant-confirm");

  document.getElementById("variant-title").textContent =
    `${product.nombre} — elige una opción`;

  options.innerHTML = product.variantes
    .map((v) => `<button class="variant-chip" data-variant="${v}">${v}</button>`)
    .join("");

  confirm.disabled = true;
  modal.hidden = false;
}

function closeVariantModal() {
  document.getElementById("variant-modal").hidden = true;
  pendingProduct = null;
  selectedVariant = null;
}

/* ---------------------------------------------------------
   LÓGICA DEL CARRITO / PEDIDO
   --------------------------------------------------------- */

// Añade un producto (con su variante si aplica) al pedido.
function addToCart(product, variante = null) {
  const key = cartKey(product.id, variante);
  const existing = cart.find((it) => it.key === key);

  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({
      key,
      id: product.id,
      nombre: product.nombre,
      variante,
      precio: product.precio,
      moneda: product.moneda,
      cantidad: 1,
    });
  }
  renderCart();
  openCart();
}

// Cambia la cantidad (+1 / -1). Si llega a 0, elimina el item.
function changeQty(key, delta) {
  const item = cart.find((it) => it.key === key);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) removeItem(key);
  else renderCart();
}

function removeItem(key) {
  const idx = cart.findIndex((it) => it.key === key);
  if (idx > -1) cart.splice(idx, 1);
  renderCart();
}

// Total de unidades en el pedido (para el contador).
function totalItems() {
  return cart.reduce((sum, it) => sum + it.cantidad, 0);
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const count = document.getElementById("cart-count");
  const waBtn = document.getElementById("btn-whatsapp");

  // Contador del botón flotante
  const total = totalItems();
  count.textContent = total;
  count.hidden = total === 0;

  if (cart.length === 0) {
    container.innerHTML = `<p class="cart-empty">Aún no has agregado productos.</p>`;
    waBtn.setAttribute("aria-disabled", "true");
  } else {
    container.innerHTML = cart.map(cartItemHTML).join("");
    waBtn.removeAttribute("aria-disabled");
  }

  // Regenera el enlace de WhatsApp con el pedido actual
  waBtn.href = buildWhatsAppLink();
}

function cartItemHTML(it) {
  const priceLabel = formatPrice(it.precio, it.moneda) || "Consultar precio";
  const variantLine = it.variante
    ? `<p class="cart-item-variant">Opción: ${it.variante}</p>`
    : "";
  return `
    <div class="cart-item">
      <div>
        <p class="cart-item-name">${it.nombre}</p>
        ${variantLine}
        <p class="cart-item-price">${priceLabel}</p>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-action="dec" data-key="${it.key}" aria-label="Quitar uno">−</button>
        <span class="qty-val">${it.cantidad}</span>
        <button class="qty-btn" data-action="inc" data-key="${it.key}" aria-label="Añadir uno">+</button>
      </div>
      <button class="cart-item-remove" data-action="remove" data-key="${it.key}">Eliminar</button>
    </div>
  `;
}

/* ---------------------------------------------------------
   CONSTRUCCIÓN DEL MENSAJE DE WHATSAPP
   Función separada y clara, como pide el encargo.
   --------------------------------------------------------- */

// Genera el texto legible del pedido (sin codificar).
function buildWhatsAppMessage() {
  if (cart.length === 0) return "";

  const lineas = cart.map((it) => {
    const variante = it.variante ? ` (${it.variante})` : "";
    return `- ${it.cantidad}x ${it.nombre}${variante}`;
  });

  return `Hola! Me interesan estos productos:\n${lineas.join(
    "\n"
  )}\n¿Tienen disponibles?`;
}

// Construye el enlace wa.me con el mensaje codificado.
function buildWhatsAppLink() {
  const text = encodeURIComponent(buildWhatsAppMessage());
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

/* ---------------------------------------------------------
   PANEL DE PEDIDO (abrir / cerrar)
   --------------------------------------------------------- */
function openCart() {
  document.getElementById("cart-panel").classList.add("is-open");
  document.getElementById("cart-panel").setAttribute("aria-hidden", "false");
  document.getElementById("overlay").hidden = false;
}
function closeCart() {
  document.getElementById("cart-panel").classList.remove("is-open");
  document.getElementById("cart-panel").setAttribute("aria-hidden", "true");
  document.getElementById("overlay").hidden = true;
}

/* ---------------------------------------------------------
   CAPTURA DE LEADS (opcional, FASE 2)
   POST a LEAD_ENDPOINT mediante fetch (no <form> nativo).
   --------------------------------------------------------- */
function setupLeadBlock() {
  const block = document.getElementById("lead-block");

  // Si no hay endpoint configurado, el bloque no se muestra.
  if (!LEAD_ENDPOINT) {
    block.hidden = true;
    return;
  }
  block.hidden = false;

  const nameEl = document.getElementById("lead-name");
  const emailEl = document.getElementById("lead-email");
  const consentEl = document.getElementById("lead-consent");
  const btn = document.getElementById("btn-lead");
  const feedback = document.getElementById("lead-feedback");

  // El botón solo se activa con consentimiento marcado.
  function syncButton() {
    btn.disabled = !consentEl.checked;
  }
  consentEl.addEventListener("change", syncButton);
  syncButton();

  btn.addEventListener("click", async () => {
    feedback.className = "lead-feedback";
    feedback.textContent = "";

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();

    // Validaciones básicas
    if (!email || !email.includes("@")) {
      feedback.classList.add("error");
      feedback.textContent = "Introduce un email válido.";
      return;
    }
    if (!consentEl.checked) {
      feedback.classList.add("error");
      feedback.textContent = "Debes aceptar el consentimiento para enviar.";
      return;
    }

    btn.disabled = true;
    feedback.textContent = "Enviando…";

    try {
      const res = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ nombre: name, email, consentimiento: true }),
      });
      if (!res.ok) throw new Error("Error en el envío");

      feedback.classList.add("ok");
      feedback.textContent = "¡Gracias! Te avisaremos de novedades.";
      nameEl.value = "";
      emailEl.value = "";
      consentEl.checked = false;
    } catch (err) {
      feedback.classList.add("error");
      feedback.textContent = "No se pudo enviar. Inténtalo más tarde.";
    } finally {
      syncButton();
    }
  });
}

/* ---------------------------------------------------------
   EVENTOS (delegación) E INICIALIZACIÓN
   --------------------------------------------------------- */
function setupEvents() {
  // Filtros de categoría
  document.getElementById("filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFilter = btn.dataset.cat;
    renderCatalog();
  });

  // "Agregar al pedido" (delegado en el catálogo)
  document.getElementById("catalog").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add");
    if (!btn || btn.disabled) return;
    const product = PRODUCTS.find((p) => p.id === btn.dataset.id);
    if (!product) return;

    // Con variantes -> modal; sin variantes -> directo al carrito
    if (product.variantes && product.variantes.length > 0) {
      openVariantModal(product);
    } else {
      addToCart(product);
    }
  });

  // Controles del carrito (+/- y eliminar)
  document.getElementById("cart-items").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, key } = btn.dataset;
    if (action === "inc") changeQty(key, +1);
    else if (action === "dec") changeQty(key, -1);
    else if (action === "remove") removeItem(key);
  });

  // Abrir / cerrar panel de pedido
  document.getElementById("cart-fab").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("overlay").addEventListener("click", closeCart);

  // Modal de variantes: elegir opción
  document.getElementById("variant-options").addEventListener("click", (e) => {
    const chip = e.target.closest(".variant-chip");
    if (!chip) return;
    document
      .querySelectorAll(".variant-chip")
      .forEach((c) => c.classList.remove("is-selected"));
    chip.classList.add("is-selected");
    selectedVariant = chip.dataset.variant;
    document.getElementById("variant-confirm").disabled = false;
  });

  // Modal de variantes: confirmar / cancelar
  document.getElementById("variant-confirm").addEventListener("click", () => {
    if (pendingProduct && selectedVariant) {
      addToCart(pendingProduct, selectedVariant);
    }
    closeVariantModal();
  });
  document.getElementById("variant-cancel").addEventListener("click", closeVariantModal);
}

// Muestra el enlace de Instagram solo si hay usuario en config.js.
function setupInstagram() {
  const ig = document.getElementById("ig-link");
  if (!ig) return;
  if (INSTAGRAM_USER) {
    const user = INSTAGRAM_USER.replace(/^@/, "");
    ig.href = "https://instagram.com/" + user;
    ig.textContent = "@" + user;
    ig.hidden = false;
  } else {
    ig.hidden = true;
  }
}

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  setupInstagram();
  setupEvents();
  setupLeadBlock();
  renderCart();

  try {
    PRODUCTS = await fetchProducts();
    renderCatalog();
  } catch (err) {
    document.getElementById("catalog").innerHTML =
      `<p class="catalog-status">No se pudieron cargar los productos. Revisa products.json.</p>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
