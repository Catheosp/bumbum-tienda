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
  $("btn-store").hidden = true;
  $("who").textContent = "";
}

async function showManager(user) {
  $("login-section").hidden = true;
  $("manager").hidden = false;
  $("btn-logout").hidden = false;
  $("btn-store").hidden = false;
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

  // Abrir / cerrar el globito (al abrir, cargamos los mensajes ya enviados)
  fab.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) loadFeedback();
  });
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
      loadFeedback();   // refresca la lista para que aparezca el nuevo mensaje
      setTimeout(() => { fb.textContent = ""; }, 2500);
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

/* ---------------------------------------------------------
   LISTA DE FEEDBACK (previsualizar / editar / borrar)
   Se muestra dentro del globo, debajo del botón Enviar.
   --------------------------------------------------------- */
async function loadFeedback() {
  const wrap = $("beta-list-wrap");
  const list = $("beta-list");
  if (!wrap || !list) return;

  const { data, error } = await client
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  // Sin mensajes (o sin permiso de lectura) -> ocultamos la sección
  if (error || !data || !data.length) {
    wrap.hidden = true;
    list.innerHTML = "";
    return;
  }

  wrap.hidden = false;
  list.innerHTML = "";

  data.forEach((row) => {
    const item = document.createElement("div");
    item.className = "beta-item";

    const fecha = row.created_at
      ? new Date(row.created_at).toLocaleDateString("es-ES",
          { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";

    item.innerHTML =
      '<p class="beta-item-msg"></p>' +
      '<div class="beta-item-foot">' +
      '  <span class="beta-item-meta"></span>' +
      '  <span class="beta-item-actions">' +
      '    <button class="beta-item-edit" type="button" title="Editar" aria-label="Editar">✏️</button>' +
      '    <button class="beta-item-del" type="button" title="Borrar" aria-label="Borrar">✕</button>' +
      '  </span>' +
      '</div>';

    item.querySelector(".beta-item-msg").textContent = row.mensaje;
    item.querySelector(".beta-item-meta").textContent =
      [row.autor, fecha].filter(Boolean).join(" · ");

    // Borrar
    item.querySelector(".beta-item-del").addEventListener("click", async () => {
      if (!confirm("¿Borrar este feedback?")) return;
      const { error } = await client.from("feedback").delete().eq("id", row.id);
      if (error) { alert("No se pudo borrar. Revisa los permisos en Supabase."); return; }
      loadFeedback();
    });

    // Editar (en línea)
    item.querySelector(".beta-item-edit")
      .addEventListener("click", () => startEditFeedback(item, row));

    list.appendChild(item);
  });
}

// Edición en línea de un mensaje de feedback
function startEditFeedback(item, row) {
  if (item.querySelector(".beta-item-editbox")) return;   // ya se está editando

  const msgEl = item.querySelector(".beta-item-msg");
  const footEl = item.querySelector(".beta-item-foot");

  const box = document.createElement("div");
  box.className = "beta-item-editbox";

  const ta = document.createElement("textarea");
  ta.className = "beta-item-edit-ta";
  ta.value = row.mensaje;

  const actions = document.createElement("div");
  actions.className = "beta-item-edit-actions";
  const save = document.createElement("button");
  save.type = "button"; save.className = "beta-item-save"; save.textContent = "Guardar";
  const cancel = document.createElement("button");
  cancel.type = "button"; cancel.className = "beta-item-cancel"; cancel.textContent = "Cancelar";
  actions.append(save, cancel);
  box.append(ta, actions);

  msgEl.hidden = true;
  footEl.hidden = true;
  item.insertBefore(box, msgEl);
  ta.focus();

  cancel.addEventListener("click", () => loadFeedback());
  save.addEventListener("click", async () => {
    const nuevo = ta.value.trim();
    if (!nuevo) { ta.focus(); return; }
    save.disabled = true;
    const { error } = await client.from("feedback").update({ mensaje: nuevo }).eq("id", row.id);
    if (error) { alert("No se pudo guardar. Revisa los permisos en Supabase."); save.disabled = false; return; }
    loadFeedback();
  });
}

// Dictado por voz (Web Speech API). Transcribe a texto en el idioma elegido,
// con resultados en vivo, auto-reinicio y mensajes de error claros.
function setupMic() {
  const micBtn = $("beta-mic");
  const langSel = $("beta-lang");
  const fb = $("beta-feedback");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Navegador sin dictado (p. ej. Firefox) -> ocultamos micro e idioma y avisamos
  if (!SR) {
    micBtn.hidden = true;
    const row = document.querySelector(".beta-mic-row");
    if (row) {
      row.innerHTML =
        '<span class="beta-lang-label">El dictado por voz no funciona en este ' +
        'navegador. Usa Chrome, Edge o Safari (o escribe a mano).</span>';
    }
    return;
  }

  // Idioma del dictado: recuerda el último elegido; si no, lo deduce del navegador
  if (langSel) {
    const LANG_KEY = "bumbum_dictado_lang";
    const saved = localStorage.getItem(LANG_KEY);
    const options = Array.from(langSel.options).map((o) => o.value);
    if (saved && options.includes(saved)) {
      langSel.value = saved;
    } else {
      const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
      const match = options.find((c) => c.slice(0, 2).toLowerCase() === nav);
      if (match) langSel.value = match;
    }
    langSel.addEventListener("change", () => {
      localStorage.setItem(LANG_KEY, langSel.value);
    });
  }

  let rec = null;
  let recording = false;   // intención del usuario (sigue grabando hasta pulsar stop)
  let baseText = "";       // texto ya confirmado antes/durante el dictado

  const setStatus = (msg, cls) => {
    fb.className = "beta-feedback" + (cls ? " " + cls : "");
    fb.textContent = msg || "";
  };

  const stopUI = () => {
    recording = false;
    micBtn.classList.remove("recording");
    micBtn.textContent = "🎤";
  };

  // Mensajes claros para los errores más típicos del micrófono
  const ERRORS = {
    "not-allowed": "Permiso de micrófono denegado. Actívalo en el candado 🔒 de la barra de direcciones y recarga.",
    "service-not-allowed": "Safari tiene bloqueado el reconocimiento de voz para esta web. Borra los datos del sitio (Ajustes → Safari → Avanzado → Datos de sitios web) y vuelve a entrar.",
    "no-speech": "No oí nada. Acerca el micrófono y vuelve a pulsar 🎤.",
    "audio-capture": "No se encontró micrófono. Comprueba que hay uno conectado.",
    "network": "Sin conexión para transcribir. Revisa tu internet.",
  };

  function buildRec() {
    const r = new SR();
    r.lang = langSel ? langSel.value : "es-ES";
    r.continuous = true;
    r.interimResults = true;   // muestra lo que se va oyendo en tiempo real

    r.addEventListener("result", (e) => {
      let finalTxt = "", interimTxt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTxt += t;
        else interimTxt += t;
      }
      if (finalTxt) baseText = (baseText ? baseText + " " : "") + finalTxt.trim();
      $("beta-text").value = (baseText + " " + interimTxt).trim();
    });

    // El navegador corta solo tras unos segundos de silencio: reiniciamos
    // mientras el usuario no haya pulsado stop.
    r.addEventListener("end", () => {
      if (recording) {
        try { r.start(); return; } catch (_) { /* reintentará en el próximo end */ }
      }
      stopUI();
      setStatus("");
    });

    r.addEventListener("error", (e) => {
      recording = false;       // un error real no debe auto-reiniciar
      stopUI();
      if (e.error === "aborted") { setStatus(""); return; }
      setStatus(ERRORS[e.error] || ("Error de dictado: " + e.error), "error");
    });

    return r;
  }

  // Cambiar de idioma mientras grabas: paramos para que vuelvas a empezar con él
  if (langSel) {
    langSel.addEventListener("change", () => {
      if (recording && rec) { recording = false; rec.stop(); }
    });
  }

  micBtn.addEventListener("click", async () => {
    if (recording && rec) { recording = false; rec.stop(); return; }
    baseText = $("beta-text").value.trim();   // conserva lo ya escrito

    // Pedimos el micro explícitamente: en iOS esto hace que salga el aviso
    // "¿Permitir micrófono?" de forma fiable antes de arrancar el dictado.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());  // soltamos el micro; solo queríamos el permiso
      }
    } catch (_) {
      setStatus(ERRORS["not-allowed"], "error");
      return;
    }

    rec = buildRec();
    try {
      rec.start();
      recording = true;
      micBtn.classList.add("recording");
      micBtn.textContent = "⏹";
      setStatus("Escuchando… habla ahora. Pulsa ⏹ para terminar.", "ok");
    } catch (_) {
      recording = false;
      setStatus("No se pudo iniciar el dictado. Inténtalo de nuevo.", "error");
    }
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
