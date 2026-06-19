/* =========================================================
   PANEL DE ADMINISTRACIÓN
   - Login con Supabase (correo + contraseña)
   - Añadir / editar / borrar productos
   - Subir la foto al almacén de Supabase
   La web pública lee de la misma base de datos automáticamente.
   ========================================================= */

const client = getSupabase();   // null si aún no está configurado (config.js)

// Atajos a elementos
const $ = (id) => document.getElementById(id);

// Estado: id del producto que se está editando (null = creando uno nuevo)
let editingId = null;

/* ---------------------------------------------------------
   ARRANQUE
   --------------------------------------------------------- */
async function initAdmin() {
  // Sin configurar -> solo mostramos el aviso
  if (!client) {
    $("not-configured").hidden = false;
    return;
  }

  setupAuthEvents();
  setupFormEvents();
  setupBetaFeedback();

  // ¿Hay sesión activa? (Supabase la recuerda entre visitas)
  const { data } = await client.auth.getSession();
  if (data.session) showManager(data.session.user);
  else showLogin();

  // Reacciona a cambios de sesión (login / logout)
  client.auth.onAuthStateChange((_event, session) => {
    if (session) showManager(session.user);
    else showLogin();
  });
}

/* ---------------------------------------------------------
   MOSTRAR LOGIN / PANEL
   --------------------------------------------------------- */
function showLogin() {
  $("login-section").hidden = false;
  $("manager").hidden = true;
  $("btn-logout").hidden = true;
  $("who").textContent = "";
}

async function showManager(user) {
  $("login-section").hidden = true;
  $("manager").hidden = false;
  $("btn-logout").hidden = false;
  $("who").textContent = user.email;
  await loadProducts();
}

/* ---------------------------------------------------------
   AUTENTICACIÓN
   --------------------------------------------------------- */
function setupAuthEvents() {
  $("btn-login").addEventListener("click", async () => {
    const email = $("email").value.trim();
    const password = $("password").value;
    const errEl = $("login-error");
    errEl.hidden = true;

    if (!email || !password) {
      errEl.textContent = "Pon tu correo y contraseña.";
      errEl.hidden = false;
      return;
    }

    $("btn-login").disabled = true;
    const { error } = await client.auth.signInWithPassword({ email, password });
    $("btn-login").disabled = false;

    if (error) {
      errEl.textContent = "No se pudo entrar. Revisa el correo y la contraseña.";
      errEl.hidden = false;
    }
    // Si va bien, onAuthStateChange muestra el panel solo.
  });

  $("btn-logout").addEventListener("click", () => client.auth.signOut());
}

/* ---------------------------------------------------------
   FORMULARIO: añadir / editar
   --------------------------------------------------------- */
function setupFormEvents() {
  // Vista previa de la foto al elegirla
  $("f-foto").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const preview = $("foto-preview");
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.classList.add("show");
    } else {
      preview.classList.remove("show");
    }
  });

  $("btn-save").addEventListener("click", saveProduct);
  $("btn-cancel").addEventListener("click", resetForm);
}

// Sube la foto al almacén y devuelve su URL pública.
async function uploadPhoto(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await client.storage.from("productos").upload(path, file);
  if (error) throw error;
  return client.storage.from("productos").getPublicUrl(path).data.publicUrl;
}

async function saveProduct() {
  const okEl = $("save-ok");
  const errEl = $("save-error");
  okEl.hidden = true;
  errEl.hidden = true;

  const nombre = $("f-nombre").value.trim();
  if (!nombre) {
    errEl.textContent = "El producto necesita un nombre.";
    errEl.hidden = false;
    return;
  }

  const precioRaw = $("f-precio").value.trim();
  const variantesRaw = $("f-variantes").value.trim();

  const payload = {
    nombre,
    categoria: $("f-categoria").value,
    descripcion: $("f-descripcion").value.trim(),
    precio: precioRaw === "" ? null : Number(precioRaw),
    moneda: "EUR",
    disponibilidad: $("f-disponibilidad").value,
    // texto "S, M, L" -> lista ["S","M","L"]
    variantes: variantesRaw
      ? variantesRaw.split(",").map((v) => v.trim()).filter(Boolean)
      : [],
  };

  $("btn-save").disabled = true;
  $("btn-save").textContent = "Guardando…";

  try {
    // Si hay foto nueva, súbela primero
    const file = $("f-foto").files[0];
    if (file) payload.imagen = await uploadPhoto(file);

    if (editingId) {
      const { error } = await client.from("productos").update(payload).eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await client.from("productos").insert(payload);
      if (error) throw error;
    }

    okEl.textContent = editingId ? "Producto actualizado." : "Producto añadido y publicado.";
    okEl.hidden = false;
    resetForm();
    await loadProducts();
  } catch (err) {
    console.error(err);
    errEl.textContent = "No se pudo guardar. Inténtalo de nuevo.";
    errEl.hidden = false;
  } finally {
    $("btn-save").disabled = false;
    $("btn-save").textContent = "Guardar producto";
  }
}

function resetForm() {
  editingId = null;
  $("f-foto").value = "";
  $("foto-preview").classList.remove("show");
  $("f-nombre").value = "";
  $("f-categoria").value = "ropa";
  $("f-disponibilidad").value = "disponible";
  $("f-descripcion").value = "";
  $("f-precio").value = "";
  $("f-variantes").value = "";
  $("form-title").textContent = "Añadir producto";
  $("btn-cancel").hidden = true;
}

// Carga un producto existente en el formulario para editarlo.
function editProduct(p) {
  editingId = p.id;
  $("f-nombre").value = p.nombre || "";
  $("f-categoria").value = (p.categoria || "ropa").toLowerCase();
  $("f-disponibilidad").value = (p.disponibilidad || "disponible").toLowerCase();
  $("f-descripcion").value = p.descripcion || "";
  $("f-precio").value = p.precio == null ? "" : p.precio;
  $("f-variantes").value = Array.isArray(p.variantes) ? p.variantes.join(", ") : "";
  $("form-title").textContent = "Editar producto";
  $("btn-cancel").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------------------------------------------------
   FEEDBACK (BETA)
   Globito flotante donde Cathe deja su feedback (texto o
   dictado por voz). Se guarda en la tabla 'feedback' de
   Supabase para revisarlo cada semana.
   --------------------------------------------------------- */
function setupBetaFeedback() {
  const fab = $("beta-fab");
  const panel = $("beta-panel");
  if (!fab || !panel) return;

  // Abrir / cerrar el globito
  fab.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  $("beta-close").addEventListener("click", () => { panel.hidden = true; });

  // Enviar feedback -> Supabase
  $("beta-send").addEventListener("click", async () => {
    const fb = $("beta-feedback");
    fb.className = "beta-feedback";
    const mensaje = $("beta-text").value.trim();

    if (!mensaje) {
      fb.classList.add("error");
      fb.textContent = "Escribe (o dicta) algo primero.";
      return;
    }

    $("beta-send").disabled = true;
    fb.textContent = "Enviando…";
    try {
      const { data: { user } } = await client.auth.getUser();
      const { error } = await client.from("feedback").insert({
        mensaje,
        autor: user ? user.email : null,
      });
      if (error) throw error;

      fb.classList.add("ok");
      fb.textContent = "¡Gracias! Recibido.";
      $("beta-text").value = "";
      setTimeout(() => { panel.hidden = true; fb.textContent = ""; }, 1500);
    } catch (err) {
      console.error(err);
      fb.classList.add("error");
      fb.textContent = "No se pudo enviar. Inténtalo de nuevo.";
    } finally {
      $("beta-send").disabled = false;
    }
  });

  setupMic();
}

// Dictado por voz (Web Speech API). Solo transcribe a texto, en español.
function setupMic() {
  const micBtn = $("beta-mic");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Navegador sin dictado -> ocultamos el micrófono, se puede escribir igual
  if (!SR) { micBtn.hidden = true; return; }

  const rec = new SR();
  rec.lang = "es-ES";          // dictado en español
  rec.continuous = true;
  rec.interimResults = false;
  let recording = false;

  // Cada frase reconocida se añade al texto
  rec.addEventListener("result", (e) => {
    let texto = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      texto += e.results[i][0].transcript;
    }
    const ta = $("beta-text");
    ta.value = (ta.value ? ta.value + " " : "") + texto.trim();
  });

  const stop = () => { recording = false; micBtn.classList.remove("recording"); };
  rec.addEventListener("end", stop);
  rec.addEventListener("error", stop);

  micBtn.addEventListener("click", () => {
    if (recording) { rec.stop(); return; }
    try {
      rec.start();
      recording = true;
      micBtn.classList.add("recording");
    } catch (_) { /* ya estaba activo */ }
  });
}

/* ---------------------------------------------------------
   LISTA DE PRODUCTOS (editar / borrar)
   --------------------------------------------------------- */
async function loadProducts() {
  const listEl = $("product-list");
  const statusEl = $("list-status");

  const { data, error } = await client
    .from("productos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    statusEl.textContent = "No se pudieron cargar los productos.";
    return;
  }
  if (!data.length) {
    statusEl.textContent = "Aún no hay productos. Añade el primero arriba.";
    listEl.innerHTML = "";
    return;
  }

  statusEl.textContent = `${data.length} producto(s).`;
  listEl.innerHTML = "";

  data.forEach((row) => {
    const div = document.createElement("div");
    div.className = "product-row";
    const precio = row.precio == null ? "Consultar precio" : `${row.precio} €`;
    const disp = (row.disponibilidad || "disponible").toLowerCase();
    div.innerHTML = `
      <img src="${row.imagen || ""}" alt="" onerror="this.style.visibility='hidden'">
      <div class="info">
        <b>${row.nombre}</b>
        <small>${precio} · <span class="badge ${disp}">${disp}</span></small>
      </div>
      <div class="actions">
        <button class="edit">Editar</button>
        <button class="del">Borrar</button>
      </div>
    `;
    div.querySelector(".edit").addEventListener("click", () => editProduct(row));
    div.querySelector(".del").addEventListener("click", () => deleteProduct(row));
    listEl.appendChild(div);
  });
}

async function deleteProduct(row) {
  if (!confirm(`¿Borrar "${row.nombre}"? No se puede deshacer.`)) return;
  const { error } = await client.from("productos").delete().eq("id", row.id);
  if (error) {
    alert("No se pudo borrar. Inténtalo de nuevo.");
    return;
  }
  await loadProducts();
}

document.addEventListener("DOMContentLoaded", initAdmin);
