# NOMBRE_MARCA — Catálogo digital (showroom)

Catálogo estático para mostrar productos (ropa y banderines), dejar que el
visitante arme un pedido y cerrarlo por **WhatsApp**. **No procesa pagos.**
Incluye captura opcional de leads (nombre + email) conforme al RGPD.

- **Stack:** HTML + CSS + JavaScript vanilla. Sin frameworks ni build step.
- **Hosting:** pensado para **GitHub Pages** (100% estático), mobile-first.

## Estructura de archivos

```
index.html          → la tienda (lo que ve el cliente)
admin.html          → panel privado para añadir/editar productos
styles.css          → estilos de la tienda (variables CSS para re-tematizar)
admin.css           → estilos del panel
config.js           → AJUSTES editables: WhatsApp, Supabase, leads
supabase-client.js  → conexión con la base de datos
app.js              → lógica de la tienda: catálogo, filtros, pedido, WhatsApp
admin.js            → lógica del panel: login, alta/edición de productos
products.json       → productos de EJEMPLO (respaldo hasta conectar el panel)
img/                → imágenes de ejemplo
GUIA-CMS.md         → cómo montar el panel (Supabase), paso a paso
```

## 1) Añadir o editar productos (panel de administración)

Los productos se gestionan desde un **panel con formulario** (`admin.html`),
respaldado por **Supabase** (base de datos + fotos + login). La persona que
gestiona la tienda entra, hace la foto, rellena el formulario y el producto se
publica al instante. Sin tocar código.

👉 **Configuración paso a paso en [GUIA-CMS.md](GUIA-CMS.md)** (se hace una vez).

Mientras Supabase no esté configurado en `config.js`, la web muestra los
productos de ejemplo de `products.json` como respaldo.

Valores de `disponibilidad` (pintan etiquetas de color):
- `disponible` → verde
- `pocas` → ámbar ("Pocas unidades")
- `agotado` → rojo ("Agotado", botón desactivado)
- `encargo` → azul ("Por encargo")

## 2) Reemplazar el número de WhatsApp

En **`config.js`**, cambia la constante:

```js
const WHATSAPP_NUMBER = "NUMERO_WHATSAPP";
```

Pon el número en **formato internacional, sin `+` ni espacios**.
Ejemplo España: `"34600111222"`.

El mensaje del pedido se genera automáticamente, por ejemplo:

> Hola! Me interesan estos productos:
> - 1x Pantalón verde (M)
> - 2x Banderín Berlín
> ¿Tienen disponibles?

## 3) Conectar la captura de leads (FASE 2)

El bloque de leads está **oculto por defecto**. Para activarlo, en `config.js`
define el endpoint:

```js
const LEAD_ENDPOINT = "https://formspree.io/f/xxxxxxx";
```

Opciones recomendadas (ambas gratis y compatibles con sitios estáticos):
- **Formspree:** crea un formulario y pega su URL `https://formspree.io/f/...`.
- **Google Apps Script:** publica un Web App que reciba un POST con JSON
  (`{ nombre, email, consentimiento }`) y lo guarde en una hoja de cálculo.

Si `LEAD_ENDPOINT` queda como `""`, el bloque simplemente **no se muestra**.

El envío se hace con `fetch` (POST JSON), **no** con `<form>` nativo. La casilla
de consentimiento es **obligatoria** y hay una nota de privacidad colapsable
junto al formulario (cumplimiento RGPD).

## 4) Re-tematizar (colores y tipografía)

Todo se controla con variables CSS en `:root` (arriba de `styles.css`):

```css
:root {
  --color-accent: #1c1c1a;
  --font-base: system-ui, sans-serif;
  /* …colores de marca, estados de disponibilidad, radios, etc. */
}
```

## 5) Publicar en GitHub Pages

1. Sube todos los archivos a un repositorio de GitHub.
2. En *Settings → Pages*, elige la rama (`main`) y la carpeta raíz (`/root`).
3. Tu catálogo quedará disponible en `https://USUARIO.github.io/REPO/`.

> Como es 100% estático, no hay servidor que mantener. Para migrar la fuente de
> datos en el futuro (Google Sheets CSV o un CMS) solo se reescribe la función
> `fetchProducts()` en `app.js`; el resto del código no cambia.

## Personalización rápida (placeholders a reemplazar)

- `NOMBRE_MARCA` → nombre real (en `index.html` y textos).
- `@USUARIO_INSTAGRAM` y su enlace → cuenta real.
- `WHATSAPP_NUMBER` → número real.
- `LEAD_ENDPOINT` → URL de Formspree/Apps Script (fase 2).
- Imágenes de `/img` → tus fotos reales.
