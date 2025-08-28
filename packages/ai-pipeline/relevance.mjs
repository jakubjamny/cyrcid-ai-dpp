// Minimal Relevance Guard (ESM)
// Priority: do_not_infer > required > allowed_if_evidence > allowed
import YAML from "yaml";

export function loadMatrix(yamlText) {
  return YAML.parse(yamlText);
}
const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

function matchPath(pattern, path) {
  // pattern like "/materials/*/code"; wildcard replaces one segment
  const pSeg = String(pattern).split("/").filter(Boolean);
  const xSeg = String(path).split("/").filter(Boolean);
  if (pSeg.length !== xSeg.length) return false;
  for (let i = 0; i < pSeg.length; i++) {
    if (pSeg[i] === "*") continue;
    if (pSeg[i] !== xSeg[i]) return false;
  }
  return true;
}

function listAllPaths(obj, base = "") {
  const out = [];
  const walk = (node, prefix) => {
    if (node !== Object(node)) return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${prefix}/${i}`));
    } else {
      for (const [k, v] of Object.entries(node)) {
        const p = `${prefix}/${k}`;
        out.push(p);
        walk(v, p);
      }
    }
  };
  walk(obj, base);
  return out;
}

function firstRuleFor(path, rules) {
  const order = ["do_not_infer", "required", "allowed_if_evidence", "allowed"];
  for (const key of order) {
    const list = toArray(rules[key] || []);
    for (const item of list) {
      const pattern = typeof item === "string" ? item : item?.path;
      if (pattern && matchPath(pattern, path)) return { key, def: item };
    }
  }
  return null;
}

function hasQualifiedEvidence(sources = [], def, constraints) {
  const confMin = def?.min_confidence ?? constraints?.defaults?.min_confidence ?? 0.6;
  const allowedTypes = def?.allowed_source_types || constraints?.defaults?.allowed_source_types;
  for (const s of sources) {
    if (!s) continue;
    if (allowedTypes && !allowedTypes.includes(s.type)) continue;
    const conf = typeof s.confidence === "number" ? s.confidence : (s.meta?.confidence ?? s.confidence);
    if (!(conf >= confMin)) continue;
    // Optional DQR checks
    const dqrCfg = constraints?.defaults?.dqr;
    if (dqrCfg?.enabled) {
      const t = s.dqr_total ?? s.dqr?.total;
      const ter = s.dqr?.ter; const ger = s.dqr?.ger; const tir = s.dqr?.tir; const perf = s.dqr?.perf;
      if (t != null && !(t <= dqrCfg.total_max)) continue;
      if (ter != null && !(ter <= dqrCfg.components_max)) continue;
      if (ger != null && !(ger <= dqrCfg.components_max)) continue;
      if (tir != null && !(tir <= dqrCfg.components_max)) continue;
      if (perf != null && !(perf <= dqrCfg.perf_max)) continue;
    }
    return true;
  }
  return false;
}

export function validateAndFilter(output, matrix, { category = "tshirt" } = {}) {
  const cat = matrix.categories?.[category]?.overrides || {};
  const base = matrix.categories?.default || {};
  const rules = {
    required: [...toArray(base.required), ...toArray(cat.required)],
    allowed: [...toArray(base.allowed), ...toArray(cat.allowed)],
    do_not_infer: [...toArray(base.do_not_infer), ...toArray(cat.do_not_infer)],
    allowed_if_evidence: [...toArray(base.allowed_if_evidence), ...toArray(cat.allowed_if_evidence)],
  };
  const constraints = matrix.constraints?.allowed_if_evidence || { defaults: { min_confidence: 0.6 } };
  const paths = listAllPaths(output);
  const violations = [];
  const trimmed = structuredClone(output);

  const getByPath = (obj, path) => {
    const seg = String(path).split("/").filter(Boolean);
    let cur = obj;
    for (const s of seg) { if (cur == null) return undefined; cur = cur[s]; }
    return cur;
  };
  const deleteByPath = (obj, path) => {
    const seg = String(path).split("/").filter(Boolean);
    const last = seg.pop();
    let cur = obj;
    for (const s of seg) { if (cur == null) return; cur = cur[s]; }
    if (cur && last in cur) delete cur[last];
  };

  for (const p of paths) {
    const rule = firstRuleFor(p, rules);
    if (!rule) continue;
    if (rule.key === "do_not_infer") {
      const node = getByPath(output, p);
      const src = node?.meta?.sources?.[0]?.type || node?.sources?.[0]?.type;
      if (src !== "user" && src !== "system:integration") {
        violations.push({ path: p, rule: "do_not_infer", action: "trimmed" });
        deleteByPath(trimmed, p);
      }
    } else if (rule.key === "allowed_if_evidence") {
      const node = getByPath(output, p);
      const sources = node?.meta?.sources || node?.sources || [];
      if (!hasQualifiedEvidence(sources, rule.def, constraints)) {
        violations.push({ path: p, rule: "allowed_if_evidence", action: "trimmed" });
        deleteByPath(trimmed, p);
      }
    }
  }

  // required presence after trims
  const missingRequired = [];
  const allAfter = listAllPaths(trimmed);
  for (const r of toArray(rules.required)) {
    const exists = allAfter.some((p) => matchPath(r, p));
    if (!exists) missingRequired.push(r);
  }

  return { ok: missingRequired.length === 0, result: trimmed, violations, missingRequired };
}
