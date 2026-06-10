// ═══════════════════════════════════════════════════════════════════════════
// api/_scoring.js — SINGLE SOURCE OF TRUTH for the scoring model.
//
// Created June 2026. Replaces six independent copies of PERSONA_WEIGHTS and
// four copies of gatekeepPenalty that previously lived in:
//   api/city.js, api/neighbourhood.js, api/persona.js, api/compare.js,
//   api/data.js, generate-sitemap.js
//
// WHY: the copies had to be kept in sync by hand ("kept in sync with
// api/persona.js" comments). One missed edit and compare pages would silently
// disagree with neighbourhood pages — an AI agent cross-reading both notices
// before we do. Edit weights HERE and every page, sitemap and JSON endpoint
// stays consistent automatically.
//
// Underscore prefix = not deployed as a Vercel serverless function
// (same convention as api/_slug.js).
// ═══════════════════════════════════════════════════════════════════════════

// ─── Centralised dates ─────────────────────────────────────────────────────
// Update DATA_UPDATED / DATA_UPDATED_ISO when refreshing scores data.
// Update YEAR each January — it feeds "(2026)" freshness hooks in titles.
var DATA_UPDATED     = 'May 2026';
var DATA_UPDATED_ISO = '2026-05-01';
var YEAR             = '2026';

// ─── Persona model ──────────────────────────────────────────────────────────
var PERSONAS = ['solo','family','foodie','culture'];

var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};

// Budget mode — cost weight boosted to 0.25, other factors reduced
// proportionally. Causes a complete re-ranking favouring affordable hoods.
var PERSONA_WEIGHTS_BUDGET = {
  solo:    {walk:0.25,transit:0.15,safety:0.15,food:0.10,vibe:0.10,family:0.00,cost:0.25},
  family:  {walk:0.08,transit:0.17,safety:0.23,food:0.04,vibe:0.03,family:0.20,cost:0.25},
  foodie:  {walk:0.15,transit:0.10,safety:0.10,food:0.30,vibe:0.10,family:0.00,cost:0.25},
  culture: {walk:0.25,transit:0.20,safety:0.10,food:0.05,vibe:0.10,family:0.05,cost:0.25}
};

var PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
var PERSONA_EMOJI  = {solo:'&#x1F9ED;',family:'&#x1F46A;',foodie:'&#x1F37D;',culture:'&#x1F3DB;'};

var FACTOR_LABELS = {
  walk:'walkability', transit:'transit', food:'food', family:'family-friendliness',
  safety:'safety', cost:'affordability', vibe:'vibe'
};

// ─── Comparison soft-launch cities (May 2026) ──────────────────────────────
var COMPARE_CITIES = ['paris','barcelona','lisbon','amsterdam','london','rome','berlin','copenhagen','vienna','prague'];

// ─── Scoring functions ──────────────────────────────────────────────────────
// calcScore: weighted persona score, rounded — for DISPLAY. budgetMode optional.
function calcScore(h, p, budgetMode) {
  var w = (budgetMode ? PERSONA_WEIGHTS_BUDGET : PERSONA_WEIGHTS)[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0));
}

// calcScoreRaw: UNROUNDED variant — for RANKING (compare-pair selection,
// sitemap top-3). Rounding before ranking can create ties that flip which
// hoods are picked; neighbourhood.js, compare.js and generate-sitemap.js
// must all rank on the same unrounded numbers or their pair sets diverge.
function calcScoreRaw(h, p, budgetMode) {
  var w = (budgetMode ? PERSONA_WEIGHTS_BUDGET : PERSONA_WEIGHTS)[p];
  return Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0);
}

// gatekeepPenalty (added May 2026 after Gemini editorial review):
// soft penalty — not hard exclusion — so small cities still produce a full
// ranking. Rules are cumulative:
//   FAMILY:  -20 if safety<60, -15 if family<55, -10 if vibe>85 (nightlife proxy)
//   SOLO:    -15 if safety<55
//   CULTURE: -10 if safety<55
function gatekeepPenalty(h, p) {
  var penalty = 0;
  if (p === 'family') {
    if ((h.safety || 60) < 60) penalty += 20;
    if ((h.family || 60) < 55) penalty += 15;
    if ((h.vibe   || 60) > 85) penalty += 10;
  } else if (p === 'solo') {
    if ((h.safety || 60) < 55) penalty += 15;
  } else if (p === 'culture') {
    if ((h.safety || 60) < 55) penalty += 10;
  }
  return penalty;
}

// personaScore: final published score = weighted score minus gatekeeping,
// floored at 0. Use this anywhere a ranked/displayed score is needed.
function personaScore(h, p, budgetMode) {
  return Math.max(0, calcScore(h, p, budgetMode) - gatekeepPenalty(h, p));
}

module.exports = {
  DATA_UPDATED: DATA_UPDATED,
  DATA_UPDATED_ISO: DATA_UPDATED_ISO,
  YEAR: YEAR,
  PERSONAS: PERSONAS,
  PERSONA_WEIGHTS: PERSONA_WEIGHTS,
  PERSONA_WEIGHTS_BUDGET: PERSONA_WEIGHTS_BUDGET,
  PERSONA_LABELS: PERSONA_LABELS,
  PERSONA_EMOJI: PERSONA_EMOJI,
  FACTOR_LABELS: FACTOR_LABELS,
  COMPARE_CITIES: COMPARE_CITIES,
  calcScore: calcScore,
  calcScoreRaw: calcScoreRaw,
  gatekeepPenalty: gatekeepPenalty,
  personaScore: personaScore
};
