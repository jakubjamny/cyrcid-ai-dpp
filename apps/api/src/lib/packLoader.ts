import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/** 404 pro registry/manifest */
export class NotFoundError extends Error {}
/** 400 pro AJV chyby manifestu */
export class ValidationError extends Error {
  constructor(msg: string, public details?: unknown) {
    super(msg);
  }
}

/** Volitelná přesměrování cest (užitečné v testech/CI) */
export type LoaderOptions = {
  baseDir?: string;    // default: process.cwd()
  schemaPath?: string; // default: packages/schema/pack.manifest.schema.json
};

/**
 * Registry může být:
 *  A) přímo mapa category -> entry
 *  B) zabalené { categories: mapa }
 * Entry může být:
 *  - "apparel-v1"
 *  - { packId: "apparel-v1", version?: "1.0.0" }
 *  - { pack:   "apparel-v1", version?: "1.0.0" }
 */
type CategoryEntry = string | { packId?: string; pack?: string; version?: string };
type CategoriesMap = Record<string, CategoryEntry>;
type RegistryWrapped = { categories: CategoriesMap } | CategoriesMap;

/** Načti registry.json */
export async function loadRegistry(opts: LoaderOptions = {}): Promise<RegistryWrapped> {
  const baseDir = opts.baseDir ?? process.cwd();
  const p = path.resolve(baseDir, "knowledge/registry.json");
  const raw = await fs.readFile(p, "utf8").catch(() => {
    throw new NotFoundError(`Missing registry at ${p}`);
  });
  return JSON.parse(raw) as RegistryWrapped;
}

/** Jednotná extrakce mapy kategorií (pro oba tvary registru) */
function getCategoriesMap(reg: RegistryWrapped): CategoriesMap {
  return (reg as any).categories ?? (reg as CategoriesMap);
}

/** Rozhodni packId z registru – podporuje string i objekt (packId/pack) */
export function resolvePackId(reg: RegistryWrapped, category: string): string {
  const map = getCategoriesMap(reg);
  const entry = map?.[category];

  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const pid = (entry as any).packId ?? (entry as any).pack;
    if (typeof pid === "string" && pid.length > 0) return pid;
  }
  throw new NotFoundError(`Category "${category}" not found in registry`);
}

/** Načti manifest.yaml pro daný packId */
export async function loadManifest(packId: string, opts: LoaderOptions = {}) {
  const baseDir = opts.baseDir ?? process.cwd();
  const p = path.resolve(baseDir, "knowledge/packs", packId, "manifest.yaml");
  const raw = await fs.readFile(p, "utf8").catch(() => {
    throw new NotFoundError(`Missing manifest for pack "${packId}" (${p})`);
  });
  return YAML.parse(raw);
}

/** Ověř manifest proti JSON schématu pack.manifest.schema.json (AJV 2020-12) */
export async function validateManifest(manifest: unknown, opts: LoaderOptions = {}) {
  const baseDir = opts.baseDir ?? process.cwd();
  const schemaPath =
    opts.schemaPath ?? path.resolve(baseDir, "packages/schema/pack.manifest.schema.json");
  const schema = JSON.parse(await fs.readFile(schemaPath, "utf8"));
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(manifest);
  if (!ok) throw new ValidationError("Pack manifest failed validation", validate.errors);
}

/** High-level: vrať pack (manifest + metadata) pro zadanou kategorii */
export async function getPack(category: string, opts: LoaderOptions = {}) {
  const registry = await loadRegistry(opts);
  const packId = resolvePackId(registry, category);
  const manifest = await loadManifest(packId, opts);
  await validateManifest(manifest, opts);
  return {
    category,
    packId,
    manifest,
    _meta: {
      schema: "pack.manifest.schema.json",
      validatedAt: new Date().toISOString(),
    },
  };
}
