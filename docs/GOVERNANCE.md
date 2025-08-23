# Governance & Workflow

## Role
- **Owners (Schema/AI):** schvalují změny `packages/schema`, `packages/ai-pipeline`, `knowledge/`.
- **Maintainers (Web/API/Widget):** správa `apps/`, `packages/widget`, `exporters/`.
- **Contributors:** PR přes fork/branch.

## Branching
- Hlavní větev: `main` (chráněná).
- Pracovní větve: `feat/*`, `fix/*`, `docs/*`.
- Každý PR musí projít CI a mít aspoň 1 review od Ownera pro části `schema` a `knowledge`.

## Semver & verze
- **Schéma:** `packages/schema` používá semver. Breaking změna -> major bump.
- **Knowledge packy:** semver v `manifest.yaml`. Publikace probíhá přes PR + tag.
- `knowledge/registry.json` ukazuje „pinned“ verzi packu pro runtime.

## PR checklist (povinné pro schema/knowledge)
- [ ] CI zelené
- [ ] Aktualizovaný `docs/CHANGELOG.md` (pokud se mění verze)
- [ ] U golden setu neběží regresní selhání, nebo je akceptované v review

## Branch protection (GitHub)
1. Settings → Branches → Add rule: `main`
2. Zaškrtni: Require a pull request before merging (min. 1 review)
3. Require status checks to pass → vyber CI (build)
4. Doplň: Require linear history (volitelné), Dismiss stale approvals (volitelné)

## CI
- Spouští `npm run ci` (viz `scripts/validate.js`).
- Cíl: validní JSON/YAML, existence klíčových složek a souborů, základ schématu.

## Releases
- Taguj verze: `schema@1.0.0`, `apparel-pack@1.0.0`.
- Release notes do `docs/CHANGELOG.md`.

## Security
- Secrets pouze v CI/CD přes GitHub Secrets.
- Nikdy necommituje API klíče či osobní data.