/* =========================================================
   CONFIGURACIÓN — todos los ajustes editables en un solo sitio.
   Si no sabes qué poner en algo, mira las guías .md del proyecto.
   ========================================================= */

/* --- WhatsApp ---
   Número con código de país, SIN '+' ni espacios.
   Ejemplo España: "34600111222". */
const WHATSAPP_NUMBER = "4915168465547";

/* --- Instagram (opcional) ---
   Pon el usuario (sin @) cuando la marca tenga cuenta, ej. "bumbum.pants".
   Si se deja vacío, el botón de Instagram NO se muestra. */
const INSTAGRAM_USER = "";

/* --- Panel de administración (Supabase) ---
   Estos dos valores los copias de Supabase una sola vez.
   Paso a paso en GUIA-CMS.md.
   Mientras estén vacíos, la web muestra los productos de ejemplo. */
const SUPABASE_URL = "https://frbmjeuityfcxhwwnurv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYm1qZXVpdHlmY3hod3dudXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzEwNjUsImV4cCI6MjA5NzQ0NzA2NX0.D0_7g9B3L1pRKlyx85ab5dNpX9Pd5fo5zd_xKFMdNZE";

/* --- Captura de leads (opcional, fase 2) ---
   URL de Formspree o similar. Vacío = el bloque no se muestra. */
const LEAD_ENDPOINT = "";

/* --- Características de los productos (tags) ---
   'id' se guarda en la base de datos; 'es' se muestra en el panel (Cathe);
   'en' se muestra en la tienda (cliente). Añade o quita líneas libremente. */
const PRODUCT_FEATURES = [
  { id: "3d",           es: "3D (varias capas)", en: "3D" },
  { id: "hand-painted", es: "Pintado a mano",    en: "Hand painted" },
  { id: "patchwork",    es: "Patchwork (collage)", en: "Patchwork" },
  { id: "handmade",     es: "Hecho a mano",      en: "Handmade" },
];

/* --- Respaldo local (no hace falta tocar) --- */
const PRODUCTS_URL = "products.json";
