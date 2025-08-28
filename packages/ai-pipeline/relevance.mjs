// Minimal Relevance Guard (ESM)
// Usage: import { validateAndFilter } from "./relevance.mjs";
import YAML from "yaml";

export function loadMatrix(yamlText) {
const m = YAML.parse(yamlText);
return m;
}

function toArray(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

function matchPath(pattern, path) {
// pattern like "/materials/*/code"; wildcard replaces one segment
const pSeg = pattern.split('/').filter(Boolean);
const xSeg = path.split('/').filter(Boolean);
if (pSeg.length !== xSeg.length) return false;
for (let i = 0; i < pSeg.length; i++) {
if (pSeg[i] === '*') continue;
if (pSeg[i] !== xSeg[i]) return false;
}
return true;
}

function listAllPaths(obj, base = "") {
const out = [];
const helper = (node, prefix) => {
if (node !== Object(node)) return;
if (Array.isArray(node)) {
node.forEach((v, i) => helper(v, `${prefix}/${i}`));
} else {
for (const [k, v] of Object.entries(node)) {
const p = `${prefix}/${k}`;
out.push(p);
helper(v, p);
}
}
};
helper(obj, base);
return out;
}

function firstRuleFor(path, rules) {
// priority: do_not_infer > required > allowed_if_evidence > allowed
const order = ['do_not_infer', 'required', 'allowed_if_evidence', 'allowed'];
for (const key of order) {
const list = toArray(rules[key] || []);
for (const item of list) {
const pattern = typeof item === 'string' ? item : item.path;
if (pattern && matchPath(pattern, path)) return { key, def: item };
}
}
return null;
}

function hasQualifiedEvidence(sources = [], def, constraints) {
const confMin = def?.min_confidence ?? constraints?.defaults?.min_confidence ?? 0.6;
const allowedTypes = def?.allowed_source_types || constraints?.defaults?.allowed_source_types;
let okAny = false;
for (const s of sources) {
}
