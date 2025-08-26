import { afterAll, beforeAll, expect, test } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";
import { getPack } from "../src/lib/packLoader.js";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "packloader-"));
  mkdirSync(path.join(tmpDir, "knowledge/packs/apparel-v1"), { recursive: true });
  writeFileSync(path.join(tmpDir, "knowledge/registry.json"),
    JSON.stringify({ categories: { t_shirts: { packId: "apparel-v1" } } }, null, 2)
  );
  const manifest = { id: "apparel-v1", version: "1.0.0", categories: ["t_shirts"] };
  writeFileSync(path.join(tmpDir, "knowledge/packs/apparel-v1/manifest.yaml"), YAML.stringify(manifest));
  const testSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    required: ["id", "version", "categories"],
    properties: {
      id: { type: "string" },
      version: { type: "string" },
      categories: { type: "array", items: { type: "string" } }
    },
    additionalProperties: true
  };
  mkdirSync(path.join(tmpDir, "packages/schema"), { recursive: true });
  writeFileSync(path.join(tmpDir, "packages/schema/pack.manifest.schema.json"), JSON.stringify(testSchema, null, 2));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

test("getPack loads and validates manifest for category", async () => {
  const pack = await getPack("t_shirts", { baseDir: tmpDir });
  expect(pack.packId).toBe("apparel-v1");
  expect(pack.manifest.id).toBe("apparel-v1");
});
