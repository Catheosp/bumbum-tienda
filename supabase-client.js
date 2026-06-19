/* =========================================================
   CONEXIÓN CON SUPABASE (compartida por la web y el panel)
   Aquí se crea el cliente y se traduce una fila de la base de
   datos al formato de producto que usa el resto de la web.
   ========================================================= */

// Crea el cliente UNA sola vez. Devuelve null si aún no se configuró.
let _supabaseClient = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null; // todavía sin conectar
  if (!_supabaseClient) {
    // 'supabase' es la librería cargada por CDN en el <head>
    _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabaseClient;
}

// Traduce una fila de la tabla 'productos' al objeto que usa la web.
function rowToProduct(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    categoria: (r.categoria || "").toLowerCase(),
    descripcion: r.descripcion || "",
    // precio vacío/null -> "Consultar precio"
    precio: r.precio === null || r.precio === undefined || r.precio === ""
      ? null
      : Number(r.precio),
    moneda: r.moneda || "EUR",
    // imagen única guardada como URL -> lista de imágenes
    imagenes: r.imagen ? [r.imagen] : [],
    // variantes: en la base es una lista; admitimos también texto "S, M, L"
    variantes: Array.isArray(r.variantes)
      ? r.variantes
      : (r.variantes
          ? String(r.variantes).split(",").map((s) => s.trim()).filter(Boolean)
          : []),
    disponibilidad: (r.disponibilidad || "disponible").toLowerCase(),
  };
}
