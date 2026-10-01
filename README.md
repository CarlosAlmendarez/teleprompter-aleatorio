# Teleprompter

Teleprompter y biblioteca de guiones y partituras para músicos, presentadores y
creadores. Escribe o importa tus textos, sincroniza la letra con los compases de
un MusicXML, adjunta partituras en PDF y encadénalo todo en setlists que puedes
usar incluso sin conexión.

## Funciones

- **Teleprompter**: desplazamiento automático o manual, velocidad y tamaño
  ajustables, modo espejo, pantalla completa y control por teclado. Recuerda
  velocidad, tamaño, espejo y la posición donde lo dejaste.
- **Guiones con estructura**: `# Título` crea secciones a las que saltar desde la
  barra, y `((nota))` se muestra atenuada como indicación de dirección.
- **Avance por voz** (guiones de texto): el texto sigue lo que vas diciendo y lo
  coloca en la línea guía. Usa la Web Speech API (Chrome, Edge, Safari) y
  necesita conexión.
- **Modo operador**: "Herramientas → Abrir pantalla de lectura" abre una segunda
  ventana (en Chrome, en el segundo monitor) que muestra el texto mientras esta la
  controla. Incluye espejo vertical para cristales de teleprompter.
- **Lectura personalizable** por dispositivo: tipo de letra, interlineado,
  márgenes, alto contraste, alineación y línea guía.
- **Cronómetro**: tiempo transcurrido, tiempo restante a tu velocidad y, con una
  duración objetivo, si vas adelantado o atrasado.
- **ChordPro**: acordes encima de la sílaba, secciones (verso, coro, puente),
  comentarios y tablaturas; las directivas no se muestran.
- **Transposición y cejilla** en ChordPro y MusicXML, con ♯/♭ según la
  tonalidad de destino; el tono se guarda por documento.
- **En escena**: la pantalla no se apaga, modo pedal Bluetooth configurable y
  cuenta atrás (3-2-1, o un compás de metrónomo en el reproductor de acordes).
- **Tablas de acordes desde MusicXML**: el reproductor avanza compás a compás al
  tempo de la partitura (respeta cambios de tempo y compás).
- **Letra sincronizada**: marca con `{m:N}` dónde empieza cada frase; el editor
  avisa si una etiqueta apunta a un compás que no existe.
- **PDF en pantalla dividida**: adjunta una partitura o guion en PDF que se
  desplaza al ritmo del reproductor (con marcas opcionales `página:compás`).
  Las páginas se dibujan bajo demanda, sin límite de longitud.
- **Biblioteca** con carpetas anidadas, búsqueda, orden e importación arrastrando
  archivos `.txt`, `.docx` (Word), `.cho`/`.pro`/`.chopro` (ChordPro), `.onsong`,
  `.musicxml`/`.xml` y `.pdf`.
- **Setlists**: ordena documentos y reprodúcelos uno tras otro, con ajustes
  propios por paso (velocidad, tono, cejilla, tempo) y una nota de transición.
  Compártelos con un **enlace de solo lectura** (con caducidad opcional y
  revocable) para que la banda los abra sin cuenta.
- **Grabar vídeo** mientras lees (Herramientas → Grabar vídeo con la cámara): la
  cámara se ve de fondo y el vídeo se descarga en tu dispositivo.
- **Modo sin conexión**: marca documentos o setlists como “Disponible sin
  conexión” y ábrelos sin internet. Se puede instalar como app (PWA).

### Atajos de teclado

| Reproductor    | Teclas                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Teleprompter   | `Espacio` play/pausa · `↑/↓` mover · `←/→` velocidad · `M` auto/manual · `F` pantalla completa |
| Acordes        | `Espacio` play/pausa · `←/→` compás · `↑/↓` tempo · `R` inicio · `F` pantalla completa · `H` barra |
| PDF            | `F` pantalla completa                                                                          |
| Setlist (todos)| `N` / `AvPág` siguiente · `P` / `RePág` anterior · `Esc` volver                                 |

Con el **modo pedal** activo (botón 🦶 en la barra), las teclas asignadas al pedal
tienen prioridad sobre estos atajos.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Auth.js (Google + enlace
mágico con Resend) · Drizzle ORM sobre Neon Postgres · Vercel Blob para PDFs ·
pdf.js · Vitest.

## Puesta en marcha

Requisitos: Node.js 20 o superior y una base de datos Postgres (Neon).

```bash
npm install                    # también copia el worker de pdf.js a public/
cp .env.local.example .env.local
# rellena .env.local (ver tabla)
npm run db:push                # crea/actualiza las tablas en la base de datos
npm run dev                    # http://localhost:3000
```

| Variable                                  | Para qué                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                            | Cadena de conexión *pooled* de Neon Postgres                             |
| `AUTH_SECRET`                             | Secreto de Auth.js (`npx auth secret`)                                   |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`    | Credenciales OAuth de Google Cloud                                       |
| `AUTH_RESEND_KEY`, `AUTH_RESEND_FROM`     | Envío del enlace de acceso por correo (Resend)                           |
| `BLOB_READ_WRITE_TOKEN`                   | Store de Vercel Blob para subir PDFs (`vercel env pull` en local)        |

## Scripts

| Comando                 | Descripción                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo                                                           |
| `npm run build`         | Build de producción (usa webpack)                                                |
| `npm start`             | Sirve el build de producción                                                     |
| `npm run lint`          | ESLint                                                                           |
| `npm test`              | Tests unitarios (Vitest) de los parsers y utilidades                             |
| `npm run db:push`       | Aplica `lib/db/schema.ts` a la base de datos                                     |
| `npm run db:studio`     | Explorador de la base de datos (Drizzle Studio)                                  |
| `npm run blob:cleanup`  | Lista PDFs huérfanos en Vercel Blob; con `-- --delete` los borra                 |

## Notas de funcionamiento

- **PDFs**: se suben directamente desde el navegador a Vercel Blob (hasta 25 MB).
  Al borrar un documento o reemplazar su PDF, el archivo antiguo se elimina si
  ningún otro documento lo usa. Solo se aceptan URLs de Vercel Blob.
- **Metadatos**: `PATCH /api/documents/:id` fusiona `metadata` con lo guardado;
  enviar `null` en una clave la elimina.
- **Sin conexión**: el service worker (`public/sw.js`) solo se registra en el build
  de producción. Guarda las páginas de documentos, reproductores y setlists
  visitadas o marcadas, y los PDFs. La biblioteca en sí necesita conexión. Al
  cerrar sesión se borran las copias del dispositivo. Para probarlo en local:
  `npm run build && npm start`.

## Estructura

```
app/
  page.tsx                 landing pública
  (auth)/login             inicio de sesión y verificación
  (app)/                   biblioteca, documentos y setlists (con cabecera)
  (immersive)/             reproductores a pantalla completa: prompter, scores, pdf
  api/                     documents, folders, setlists, offline, blob upload
  offline/                 página que muestra el service worker sin conexión
components/                UI por área (library, prompter, scores, pdf, setlists, offline…)
lib/
  db/schema.ts             esquema Drizzle
  musicxml/                parsers de acordes y letra (con tests)
  pdf/                     anclajes PDF y subida a Blob
  setlists/, offline/      consultas y tipos de cada función
public/sw.js               service worker
```
