// Bulk-import prospects into Firestore from a CSV file. Run locally, never on Vercel:
//   node scripts/import-prospects.mjs prospects.csv
// CSV columns (header row required): name,title,company,source,notes
// Reads NEXT_PUBLIC_FIREBASE_PROJECT_ID from .env.local in the repo root.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/import-prospects.mjs <file.csv>");
  process.exit(1);
}

const env = readFileSync(resolve(import.meta.dirname, "..", ".env.local"), "utf8");
const projectId = env.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/)?.[1]?.trim();
if (!projectId) {
  console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in .env.local");
  process.exit(1);
}

// Minimal CSV parser: handles quoted fields with commas.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (field || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const header = rows.shift().map((h) => h.trim().toLowerCase());
const idx = (name) => header.indexOf(name);
if (idx("name") === -1) {
  console.error(`CSV needs a header row with at least a "name" column. Found: ${header.join(", ")}`);
  process.exit(1);
}

const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/prospects`;
let imported = 0;

for (const row of rows) {
  const get = (name) => (idx(name) >= 0 ? (row[idx(name)] ?? "").trim() : "");
  const name = get("name");
  if (!name) continue;
  const body = {
    fields: {
      name: { stringValue: name },
      title: { stringValue: get("title") },
      company: { stringValue: get("company") },
      source: { stringValue: get("source") },
      notes: { stringValue: get("notes") },
      status: { stringValue: "new" },
      createdAt: { timestampValue: new Date().toISOString() },
    },
  };
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`FAILED ${name}: ${res.status} ${await res.text()}`);
  } else {
    imported++;
    console.log(`OK  ${name}`);
  }
}

console.log(`\nImported ${imported}/${rows.length} prospects into "${projectId}".`);
