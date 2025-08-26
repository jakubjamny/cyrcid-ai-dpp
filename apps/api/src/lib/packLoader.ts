// apps/api/src/lib/packLoader.ts
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export class NotFoundError extends Error {}
export class ValidationError extends Error {
  constructor(msg: string, public details?: unknown) { super(msg); }
}

export type LoaderOptions = {
  /** Absolutní cesta ke kořeni repa. Default = process.cwd() */
  baseDir?: string;
  /** Cesta k JSON schématu manifestu. Default = packages/schema/pack.manifest.schema.json */
  schemaPath?: string;
};

type Registry = {
  /** Např. { "t_shirts": { "packId": "apparel-v1" } }  */
  categories: Record<string, { packId: string; version?: string }>;
};

export async function loadRegistry(opts: LoaderOptions = {}) {
  const baseDir = opts.baseDir ?? process.cwd();
  const p = path.resolve(baseDir, "knowledge/registry.json");
  const raw = await fs.readFile(p, "utf8").catch(() => { throw new NotFoundError(`Missing registry at ${p}`); });
  return JSON.parse(raw) as Registry;
}

export function resolvePackId(reg: Registry, category: string) {
  const entry = reg.categories?.[category];
  if (!entry?.packId) throw new NotFoundError(`Category "${category}" not found in registry`);
  return entry.packId;
}

export async function loadManifest(packId: string, opts: LoaderOptions = {}) {
  const baseDir = opts.baseDir ?? process.cwd();
  const p = path.resolve(baseDir, "knowledge/packs", packId, "manifest.yaml");
  const raw = await fs.readFile(p, "utf8").catch(() => { throw new NotFoundError(`Missing manifest for pack "${packId}" (${p})`); });
  return YAML.parse(raw);
}

export async function validateManifest(manifest: unknown, opts: LoaderOptions = {}) {
  const baseDir = opts.baseDir ?? process.cwd();
  const schemaPath = opts.schemaPath ?? path.resolve(baseDir, "packages/schema/pack.manifest.schema.json");
  const schema = JSON.parse(await fs.readFile(schemaPath, "utf8"));
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(manifest);
  if (!ok) {
    throw new ValidationError("Pack manifest failed validation", validate.errors);
  }
}

export async function getPack(category: string, opts: LoaderOptions = {}) {
  const registry = await loadRegistry(opts);
  const packId = resolvePackId(registry, category);
  const manifest = await loadManifest(packId, opts);
  await validateManifest(manifest, opts);
  return {
    category,
    packId,
    manifest,
    // pár metadat, může se hodit pro klienty
    _meta: {
      schema: "pack.manifest.schema.json",
      validatedAt: new Date().toISOString()
    }
  };
}
