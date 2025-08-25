#!/usr/bin/env node
// packages/schema/validate-pack.mjs
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "pack.manifest.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error(
    "Usage: node packages/schema/validate-pack.mjs <path/to/manifest.yaml> [...more]"
  );
  process.exit(2);
}

let hasError = false;

for (const input of inputs) {
  const abs = path.resolve(process.cwd(), input);
  let data;
  try {
    const raw = fs.readFileSync(abs, "utf8");
    data = YAML.parse(raw);
  } catch (e) {
    hasError = true;
    console.error(`❌ Cannot read/parse ${input}: ${e.message}`);
    continue;
  }

  const ok = validate(data);
  if (!ok) {
    hasError = true;
    console.error(`❌ ${input} is INVALID`);
    for (const err of validate.errors ?? []) {
      console.error(`  - ${err.instancePath || "(root)"} ${err.message}`);
    }
  } else {
    console.log(`✅ ${input} is valid`);
  }
}

process.exit(hasError ? 1 : 0);
