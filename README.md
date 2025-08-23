# CYRCID DPP – Monorepo (starter)

Toto je startovní kostra repozitáře pro AI generování Digitálních produktových pasů (DPP).

## Struktura
```
apps/           # web (Next.js) a api (Fastify/FastAPI)
packages/       # schema, ai-pipeline, widget
knowledge/      # knowledge packy (defaults, relevance, vocab, manifest)
golden/         # evaluace kvality (inputs/expected)
exporters/      # jsonld, pdf, qr
docs/           # dokumentace (governance, datový model, atd.)
.github/        # CI workflow
scripts/        # pomocné skripty (lint/validace)
```
## Rychlý start
1) Vytvoř repo na GitHubu/GitLabu (název: `cyrcid-dpp`).  
2) Na lokálu:
```bash
git init -b main
git add .
git commit -m "chore: bootstrap repo"
git remote add origin <URL-na-váš-repo>
git push -u origin main
```
3) V GitHubu nastav **branch protection** pro `main` (viz `docs/GOVERNANCE.md`).

## CI lokálně
```bash
npm i
npm run ci
```