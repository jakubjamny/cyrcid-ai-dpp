#!/usr/bin/env node
// packages/schema/tools/extract-schema-paths.mjs
// Usage:
//   node packages/schema/tools/extract-schema-paths.mjs <schemaPath> <outCsvPath>
// Example:
//   node packages/schema/tools/extract-schema-paths.mjs \
//     packages/schema/dpp.schema.json \
//     knowledge/packs/apparel-v1/relevance/schema_paths.csv

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import RefParser from "@apidevtools/json-schema-ref-parser";
import traverse from "json-schema-traverse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = process.argv[2] || path.resolve(__dirname, "../dpp.schema.json");
const outPath = process.argv[3] || path.resolve(__dirname, "../../knowledge/packs/apparel-v1/relevance/schema_paths.csv");

function csvEscape(s = "") {
  const t = String(s).replaceAll('"', '""').replace(/\s+/g, ' ').trim();
  return `"${t}"`;
}

function shouldSkip(ptr) {
  // Skip non-instance definitions by default
  return ptr.startsWith("/$defs") || ptr.startsWith("/definitions");
}

const schema = await RefParser.dereference(schemaPath, {
  dereference: { circular: "ignore" },
});

const rows = [];
const header = ["path", "type", "required", "parent", "description"].join(",");

function push(ptr, node, isReq, parent) {
  if (shouldSkip(ptr)) return;
  const type = Array.isArray(node?.type) ? node.type.join("|") : node?.type || "";
  const desc = node?.description || node?.title || "";
  rows.push([
    ptr || "/",
    type,
    isReq ? "yes" : "no",
    parent || "",
    csvEscape(desc),
  ].join(","));
}

function walk(node, basePtr = "", parentPtr = "", inheritedReq = new Set()) {
  // Mark the current node
  push(basePtr, node, false, parentPtr);

  const req = new Set([...(node?.required || []), ...inheritedReq]);

  // Object properties
  if (node && (node.properties || node.patternProperties || node.additionalProperties)) {
    if (node.properties) {
      for (const [key, sub] of Object.entries(node.properties)) {
        const ptr = `${basePtr}/${key}`;
        const isReq = req.has(key);
        push(ptr, sub, isReq, basePtr);
        walk(sub, ptr, basePtr, new Set(sub?.required || []));
      }
    }
    if (node.patternProperties) {
      for (const [pattern, sub] of Object.entries(node.patternProperties)) {
        const ptr = `${basePtr}/${pattern}`;
        push(ptr, sub, false, basePtr);
        walk(sub, ptr, basePtr, new Set(sub?.required || []));
      }
    }
    if (node.additionalProperties && typeof node.additionalProperties === "object") {
      const ptr = `${basePtr}/*`;
      push(ptr, node.additionalProperties, false, basePtr);
      walk(node.additionalProperties, ptr, basePtr, new Set());
    }
  }

  // Arrays
  if (node && node.type === "array") {
    const items = node.items || node.prefixItems;
    const arrPtr = `${basePtr}/*`;
    if (items) {
      if (Array.isArray(items)) {
        items.forEach((it, idx) => {
          const iptr = `${basePtr}/${idx}`;
          push(iptr, it, false, basePtr);
          walk(it, iptr, basePtr, new Set());
        });
      } else {
        push(arrPtr, items, false, basePtr);
        walk(items, arrPtr, basePtr, new Set());
      }
    }
  }
}

walk(schema, "", "", new Set(schema?.required || []));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, [header, ...rows].join("\n") + "\n", "utf8");
console.log(`Wrote ${rows.length} rows to ${outPath}`);

/*
Dev notes:
- Install deps:  npm i -D @apidevtools/json-schema-ref-parser json-schema-traverse
- This script purposely dereferences $ref to output FULL inventory of instance-relevant paths.
- It uses wildcard `/*` for arrays and for additionalProperties (maps).
- You can post-process the CSV into freemium/full-LCA relevance matrices in step 4.
*/
