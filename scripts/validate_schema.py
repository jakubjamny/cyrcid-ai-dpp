#!/usr/bin/env python3
import sys, json, glob
from jsonschema import Draft202012Validator

SCHEMA_PATH = "packages/schema/dpp.schema.json"
EXAMPLES_GLOB = "examples/*.json"
TOLERANCE = 0.1  # povolená odchylka pro součty v procentech

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def sum_materials_ok(data):
    """materials[*].share_percent musí dávat 100 % ± tolerance."""
    mats = data.get("materials", [])
    total = sum((m.get("share_percent", 0) for m in mats))
    return abs(total - 100.0) <= TOLERANCE

def origin_breakdown_ok(data):
    """
    Pokud existuje materials[i].origin.breakdown, součet share_percent = 100 ± tolerance
    a země se v breakdownu neopakují.
    """
    mats = data.get("materials", [])
    for m in mats:
        br = m.get("origin", {}).get("breakdown")
        if br:
            total = 0.0
            seen = set()
            for b in br:
                total += b.get("share_percent", 0)
                cc = b.get("country_code")
                if cc:
                    if cc in seen:
                        return False, "Duplicate country_code in materials.origin.breakdown"
                    seen.add(cc)
            if abs(total - 100.0) > TOLERANCE:
                return False, "materials.origin.breakdown.share_percent must sum to 100 ± 0.1"
    return True, ""

def main():
    # 1) validace schématu samotného
    try:
        schema = load_json(SCHEMA_PATH)
        Draft202012Validator.check_schema(schema)
    except Exception as e:
        print(f"[SCHEMA ERROR] {e}")
        sys.exit(1)

    validator = Draft202012Validator(schema)

    # 2) validace všech příkladů
    ok_all = True
    for path in sorted(glob.glob(EXAMPLES_GLOB)):
        try:
            data = load_json(path)
        except Exception as e:
            ok_all = False
            print(f"[ERROR] {path}: {e}")
            continue

        errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
        if errors:
            ok_all = False
            print(f"[INVALID] {path}")
            for err in errors:
                loc = "/" + "/".join([str(p) for p in err.path])
                print(f"  - {loc}: {err.message}")
            continue

        if not sum_materials_ok(data):
            ok_all = False
            print(f"[INVALID] {path}")
            print("  - materials.share_percent must sum to 100 ± 0.1")
            continue

        br_ok, br_msg = origin_breakdown_ok(data)
        if not br_ok:
            ok_all = False
            print(f"[INVALID] {path}")
            print(f"  - {br_msg}")
            continue

        print(f"[OK] {path}")

    sys.exit(0 if ok_all else 1)

if __name__ == "__main__":
    main()
