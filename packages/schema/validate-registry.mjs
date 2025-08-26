// packages/schema/validate-registry.mjs
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const ROOT = process.cwd();
const registryPath = process.argv[2] || "knowledge/registry.json";

function err(msg) { console.error("❌ " + msg); }
function ok(msg)  { console.log("✅ " + msg); }

if (!fs.existsSync(registryPath)) {
  err(`Registry not found: ${registryPath}`);
  process.exit(1);
}

const reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const entries = Object.entries(reg);
if (entries.length === 0) {
  err("Registry is empty");
  process.exit(1);
}

let failed = false;

for (const [category, target] of entries) {
  let entryFailed = false;

  if (!category || typeof category !== "string") {
    err(`Invalid category key: ${String(category)}`); failed = entryFailed = true;
  }

  const m = /^([a-z0-9-]+)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(target || "");
  if (!m) { err(`Invalid target "${target}" for category "${category}"`); failed = entryFailed = true; }

  const packId = m?.[1];
  const version = m?.[2];

  const packDir  = path.resolve(ROOT, `knowledge/packs/${packId}`);
  const manifest = path.join(packDir, "manifest.yaml");

  if (!fs.existsSync(packDir))   { err(`Pack folder missing: ${packDir}`); failed = entryFailed = true; }
  if (!fs.existsSync(manifest))  { err(`Manifest missing for ${packId}: ${manifest}`); failed = entryFailed = true; }

  if (fs.existsSync(manifest)) {
    try {
      const data = YAML.parse(fs.readFileSync(manifest, "utf8"));

      if (data.id !== packId) {
        err(`Manifest id mismatch for ${packId}: expected ${packId}, got ${data.id}`);
        failed = entryFailed = true;
      }
      if (data.version !== version) {
        err(`Manifest version mismatch for ${packId}: expected ${version}, got ${data.version}`);
        failed = entryFailed = true;
      }

      // required subdirs
      for (const d of ["relevance","defaults","vocab"]) {
        const p = path.join(packDir, d);
        if (!fs.existsSync(p)) { err(`Missing dir ${d} in ${packId}`); failed = entryFailed = true; }
      }

      // links.lci_map musí ukazovat na existující soubor
      const lci = data?.links?.lci_map;
      if (!lci) {
        err(`links.lci_map missing in manifest for ${packId}`);
        failed = entryFailed = true;
      } else {
        const lciAbs = path.resolve(packDir, lci);
        if (!fs.existsSync(lciAbs)) {
          err(`links.lci_map not found for ${packId}: "${lci}" → ${path.relative(ROOT, lciAbs)}`);
          failed = entryFailed = true;
        }
      }

      // (informativní) exposed cesty – doporučené hodnoty
      const ex = data?.exposed || {};
      const expected = { defaults_dir: "./defaults", relevance_dir: "./relevance", vocab_dir: "./vocab" };
      for (const k of Object.keys(expected)) {
        if (ex[k] && path.normalize(ex[k]) !== expected[k]) {
          console.log(`ℹ️  manifest.exposed.${k} is "${ex[k]}", usually "${expected[k]}"`);
        }
      }

    } catch (e) {
      err(`Cannot parse manifest for ${packId}: ${e.message}`);
      failed = entryFailed = true;
    }
  }

  if (!entryFailed) ok(`Category "${category}" → ${target} OK`);
}

process.exit(failed ? 1 : 0);
