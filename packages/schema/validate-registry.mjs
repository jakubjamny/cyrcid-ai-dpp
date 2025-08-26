#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [,, registryPath = "knowledge/registry.json"] = process.argv;
const root = process.cwd();

function die(msg) { console.error(msg); process.exit(1); }
function err(msg) { console.error(msg); hasError = true; }

let hasError = false;

// 1) Načti registry
let reg;
try {
  const raw = fs.readFileSync(registryPath, "utf8");
  reg = JSON.parse(raw);
} catch (e) {
  die(`Failed to read/parse registry at ${registryPath}: ${e.message}`);
}

// 2) Získej mapu kategorií (podporuj oba tvary)
const map = reg && typeof reg === "object"
  ? (reg.categories && typeof reg.categories === "object" ? reg.categories : reg)
  : null;

if (!map || typeof map !== "object") {
  die("Registry must be an object or { categories: { ... } }");
}

// 3) Validuj, že pro každou kategorii umíme určit packId (string)
for (const [category, entry] of Object.entries(map)) {
  let packId;
  if (typeof entry === "string") {
    packId = entry;
  } else if (entry && typeof entry === "object") {
    // tolerujeme různé názvy klíčů
    packId = entry.packId ?? entry.pack ?? entry.id ?? entry.target;
  }

  if (!packId || typeof packId !== "string") {
    err(`Invalid target "${typeof entry === "object" ? "[object Object]" : String(entry)}" for category "${category}"`);
    continue;
  }

  // 4) Musí existovat složka a manifest
  const packDir = path.join(root, "knowledge", "packs", packId);
  if (!fs.existsSync(packDir)) {
    err(`Pack folder missing: ${packDir}`);
    continue;
  }
  const manifest = path.join(packDir, "manifest.yaml");
  if (!fs.existsSync(manifest)) {
    err(`Manifest missing for ${packId}: ${manifest}`);
    continue;
  }

  console.log(`✓ ${category} -> ${packId}`);
}

process.exit(hasError ? 1 : 0);
