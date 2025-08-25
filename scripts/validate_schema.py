#!/usr/bin/env python3
import sys, json, glob, math
from jsonschema import Draft202012Validator, validate

SCHEMA_PATH = "packages/schema/dpp.schema.json"
EXAMPLES_GLOB = "examples/*.json"
TOLERANCE = 0.1  # povolená odchylka při součtu materiálů

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def sum_materials_ok(data):
    materials = data.get("materials", [])
    total = sum((m.get("share_percent", 0) for m in materials))
    return abs(total - 100.0) <= TOLERANCE

def main():
    try:
        schema = load_json(SCHEMA_PATH)
        # validace schématu samotného
        Draft202012Validator.check_schema(schema)
    except Exception as e:
        print(f"[SCHEMA ERROR] {e}")
        sys.exit(1)

    validator = Draft202012Validator(schema)

    ok = True
    for path in glob.glob(EXAMPLES_GLOB):
        try:
            data = load_json(path)
            errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
            if errors:
                ok = False
                print(f"[INVALID] {path}")
                for err in errors:
                    loc = "/".join([str(p) for p in err.path])
                    print(f"  - {loc}: {err.message}")
                continue
            if not sum_materials_ok(data):
                ok = False
                print(f"[INVALID] {path}")
                print("  - materials.share_percent must sum to 100 ± 0.1")
            else:
                print(f"[OK] {path}")
        except Exception as e:
            ok = False
            print(f"[ERROR] {path}: {e}")

    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
