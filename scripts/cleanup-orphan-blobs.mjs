// Lists (and with --delete, removes) Vercel Blob files no document references
// any more — e.g. PDFs deleted or replaced before automatic cleanup existed.
//
//   node scripts/cleanup-orphan-blobs.mjs            # dry run: only lists
//   node scripts/cleanup-orphan-blobs.mjs --delete   # actually deletes
//
// Reads DATABASE_URL and BLOB_READ_WRITE_TOKEN from .env.local.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { del, list } from "@vercel/blob";

config({ path: ".env.local" });
const { DATABASE_URL, BLOB_READ_WRITE_TOKEN: token } = process.env;
if (!DATABASE_URL || !token) {
  console.error("DATABASE_URL and BLOB_READ_WRITE_TOKEN must be set in .env.local");
  process.exit(1);
}
const shouldDelete = process.argv.includes("--delete");

const sql = neon(DATABASE_URL);
const rows = await sql`
  SELECT blob_url AS url FROM documents WHERE blob_url IS NOT NULL
  UNION
  SELECT metadata->'pdf'->>'url' FROM documents WHERE metadata->'pdf'->>'url' IS NOT NULL
`;
const referenced = new Set(rows.map((r) => r.url));

const orphans = [];
let cursor;
do {
  const page = await list({ token, cursor, limit: 1000 });
  for (const blob of page.blobs) {
    if (!referenced.has(blob.url)) orphans.push(blob);
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

const totalMb = orphans.reduce((sum, b) => sum + b.size, 0) / 1024 / 1024;
console.log(`${referenced.size} referenced blob(s); ${orphans.length} orphan(s), ${totalMb.toFixed(1)} MB`);
for (const blob of orphans) console.log(`  ${blob.pathname}  (${(blob.size / 1024).toFixed(0)} KB)`);

if (orphans.length === 0) process.exit(0);
if (!shouldDelete) {
  console.log("\nDry run — nothing deleted. Re-run with --delete to remove them.");
  process.exit(0);
}
for (let i = 0; i < orphans.length; i += 100) {
  await del(orphans.slice(i, i + 100).map((b) => b.url), { token });
}
console.log(`Deleted ${orphans.length} orphan blob(s).`);
