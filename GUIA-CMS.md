# Guía: el panel para añadir productos

Con esto, tu amiga gestiona la tienda desde una página privada: **entra, hace la
foto, rellena el formulario, pulsa Guardar y el producto aparece solo.** Sin
código, sin Excel, sin comas.

Para que eso funcione, la web se conecta a un "cajón online" gratuito llamado
**Supabase** (ahí se guardan los productos y las fotos). La configuración de
abajo se hace **una sola vez**. Después, ya nadie toca nada técnico.

---

## Parte 1 · Crear el cajón online (una vez, ~10 min)

### 1. Crear la cuenta y el proyecto
1. Entra en <https://supabase.com> y pulsa **Start your project** (puedes entrar
   con tu cuenta de Google).
2. Pulsa **New project**. Ponle un nombre (ej. `tienda-marca`), inventa una
   contraseña de base de datos (guárdala por si acaso) y elige la región más
   cercana (ej. *West EU*). Pulsa **Create**. Espera ~1 minuto.

### 2. Crear la tabla y el almacén de fotos (copiar y pegar)
1. En el menú de la izquierda, abre **SQL Editor** y pulsa **New query**.
2. Copia **todo** este bloque, pégalo y pulsa **Run** (botón verde):

```sql
-- Tabla de productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text default 'ropa',
  descripcion text,
  precio numeric,
  moneda text default 'EUR',
  imagen text,
  variantes text[] default '{}',
  disponibilidad text default 'disponible',
  created_at timestamptz default now()
);

-- Seguridad: cualquiera puede VER; solo con login se puede EDITAR
alter table productos enable row level security;
create policy "lectura publica" on productos for select using (true);
create policy "escritura con login" on productos
  for all to authenticated using (true) with check (true);

-- Almacén de fotos (carpeta pública)
insert into storage.buckets (id, name, public)
  values ('productos', 'productos', true)
  on conflict (id) do nothing;
create policy "fotos lectura publica" on storage.objects
  for select using (bucket_id = 'productos');
create policy "fotos subir con login" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos');
create policy "fotos borrar con login" on storage.objects
  for delete to authenticated using (bucket_id = 'productos');
```

Si ves *"Success. No rows returned"*, ¡perfecto!

### 3. Crear el usuario de tu amiga (su login)
1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Pon su **correo** y una **contraseña**. Activa *"Auto Confirm User"* si aparece.
3. Pulsa **Create**. Esos serán el correo y la contraseña con los que ella entra
   al panel.

---

## Parte 2 · Conectar la web con el cajón (una vez)

### 4. Copiar las dos claves
1. Menú izquierdo → **Project Settings** (el engranaje) → **API**.
2. Copia estos dos valores:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public** (una clave larga; es la pública, se puede usar en la web)

### 5. Pegarlas en el proyecto
Abre el archivo **`config.js`** y rellena estas dos líneas:

```js
const SUPABASE_URL = "https://abcd1234.supabase.co";
const SUPABASE_ANON_KEY = "la-clave-anon-public-larga";
```

Sube el cambio a GitHub. **¡Listo!** A partir de aquí:
- La tienda muestra los productos que haya en el cajón.
- El panel está en `tu-web/admin.html` (también hay un enlace pequeño
  "Acceso administración" abajo del todo en la web).

---

## El día a día de tu amiga (lo único que usará)

1. Entra en `tu-web/admin.html`.
2. Pone su correo y contraseña (la primera vez; luego la recuerda).
3. **Añadir producto:** elige la foto, escribe nombre, precio, tallas, marca si
   está disponible o agotado, y pulsa **Guardar**. Aparece al instante.
4. **Editar** o **Borrar:** botones junto a cada producto de la lista.

Eso es todo. Nada de código, ni archivos, ni comas.

---

## Feedback de Cathe (botón "BETA")

Dentro del panel hay un globito **💬 BETA** (abajo a la derecha). Cathe puede
escribir ahí lo que falla o quiere mejorar — o **dictarlo con el micrófono** (lo
transcribe en español). Cada mensaje se guarda para que **tú lo revises cada semana**.

### Activarlo (una vez): crear la tabla de feedback
En Supabase → **SQL Editor** → **New query**, pega esto y pulsa **Run**:

```sql
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  mensaje text not null,
  autor text,
  created_at timestamptz default now()
);
alter table feedback enable row level security;
create policy "feedback insertar con login" on feedback
  for insert to authenticated with check (true);
create policy "feedback leer con login" on feedback
  for select to authenticated using (true);
```

### Leer el feedback cada semana
En Supabase → menú izquierdo **Table Editor** → tabla **feedback**. Verás cada
mensaje con la fecha (`created_at`) y quién lo escribió (`autor`). Ordena por fecha
para ver los más nuevos primero.

> El micrófono usa el dictado del navegador. Funciona en Chrome (Android) y en
> Safari del iPhone; si un navegador no lo soporta, el botón del micro se oculta
> y Cathe puede escribir igual.

## Preguntas frecuentes

- **¿Es gratis?** Sí, el plan gratuito de Supabase sobra para una tienda pequeña.
- **¿Se puede usar desde el móvil?** Sí, el panel funciona en el móvil; la foto
  se puede hacer en el momento con la cámara.
- **Olvidó la contraseña:** entra tú a Supabase → Authentication → Users, y desde
  los tres puntos junto a su usuario puedes restablecerla.
- **No aparece un producto recién creado:** recarga la página de la tienda.
