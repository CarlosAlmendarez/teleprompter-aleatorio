// Copies the pdf.js worker into public/ so the client can load it from a
// stable, same-origin path (works offline; no CDN). Runs on postinstall so the
// file always matches the installed pdfjs-dist version.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  const pkgPath = require.resolve("pdfjs-dist/package.json");
  const src = join(dirname(pkgPath), "build", "pdf.worker.min.mjs");
  const destDir = join(process.cwd(), "public");
  const dest = join(destDir, "pdf.worker.min.mjs");
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
  console.log("copy-pdf-worker: public/pdf.worker.min.mjs updated");
} catch (error) {
  console.warn("copy-pdf-worker: skipped -", error.message);
}
