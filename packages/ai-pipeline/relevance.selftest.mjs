import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { validateAndFilter } from './relevance.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const freemium = fs.readFileSync(path.resolve(__dirname, '../../knowledge/packs/apparel-v1/relevance/freemium.yaml'), 'utf8');
const full = fs.readFileSync(path.resolve(__dirname, '../../knowledge/packs/apparel-v1/relevance/full_lca.yaml'), 'utf8');

const freemiumM = YAML.parse(freemium);
const fullM = YAML.parse(full);

const sample = {
product: { id: 'YP-TEE-001', name: 'T-shirt', category: 'tshirt' },
materials: [{ code: 'CO', fraction_mass: 0.95 }, { code: 'EL', fraction_mass: 0.05 }],
care: { wash: '30C' },
lca: { impacts: { GWP: { value: 5.1, unit: 'kg CO2e', meta: { sources: [{ type: 'ai', confidence: 0.8 }] } } } },
supply_chain: { stage1: { supplier_name: 'ACME' } }
};

// 1) Freemium musí ořezat veškeré LCA a supplier_name
let r = validateAndFilter(sample, freemiumM, { category: 'tshirt' });
if (!r.ok) throw new Error('Freemium: Required fields missing');
if (r.result.lca) throw new Error('Freemium: LCA was not trimmed');
if (r.result?.supply_chain?.stage1?.supplier_name) throw new Error('Freemium: supplier_name was not trimmed');

// 2) Full LCA musí ořezat LCA s AI zdrojem (bez kvalifikované evidence)
r = validateAndFilter(sample, fullM, { category: 'tshirt' });
if (r.result?.lca?.impacts?.GWP) throw new Error('Full-LCA: GWP should be trimmed without evidence');

// 3) Když dodáme ecoinvent zdroj s dostatečnou jistotou, musí projít
const sample2 = JSON.parse(JSON.stringify(sample));
sample2.lca.impacts.GWP.meta.sources = [{ type: 'ecoinvent', confidence: 0.72, dqr_total: 1.2, dqr: { ter: 2, ger: 1, tir: 2, perf: 3 } }];
r = validateAndFilter(sample2, fullM, { category: 'tshirt' });
if (!r.result?.lca?.impacts?.GWP) throw new Error('Full-LCA: GWP should pass with qualified evidence');

console.log('Relevance self-test passed.');
