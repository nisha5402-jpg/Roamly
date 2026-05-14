// ═══════════════════════════════════════════════════════════════════════════
// api/data.js — public JSON endpoint for /api/data/{city}/{hood}
// PURPOSE: Machine-readable data access for AI agents and developers.
// Returns the same data the page uses, in pure JSON. CORS-enabled.
//
// ROUTES (via vercel.json rewrite):
//   /api/data/{city}              → all neighbourhoods in city
//   /api/data/{city}/{hood}       → single neighbourhood
//
// AUTHOR: Claude Opus 4.7 (May 2026)
// MAINTAINER NOTES FOR SONNET 4.6:
//   - Returns scores + insights bundled. Same data as HTML pages, no auth.
//   - CORS is wide-open (Access-Control-Allow-Origin: *). This is deliberate
//     — agentic consumption requires it. If you ever add a paid tier, gate
//     it via a separate endpoint, don't restrict this one.
//   - Cache-Control is long because data only changes on commit.
// ═══════════════════════════════════════════════════════════════════════════

var scores   = require('../roamly_scores.json');
var insights = require('../roamly_insights.json');

var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
var PERSONAS = ['solo','family','foodie','culture'];

function slugify(s) {
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[\s\/]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-').replace(/^\-|\-$/g,'');
}
function urlKey(k) {
  return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[()]/g,'').replace(/[\s\/]+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'');
}
function calcScore(h, p) {
  var w = PERSONA_WEIGHTS[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0));
}
function findHoodBySlug(cityHoods, slug) {
  var keys = Object.keys(cityHoods);
  for (var i=0; i<keys.length; i++) if (slugify(keys[i]) === slug) return keys[i];
  return null;
}

var KEY_MAP={'dusseldorf':'d\xfcsseldorf','malmo':'malm\xf6','heraklion_crete':'heraklion_(crete)'};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=604800,stale-while-revalidate=86400');

  var cityKey = String(req.query.city||'').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];
  var hoodSlug = String(req.query.hood||'').toLowerCase().trim();

  if (!cityKey) {
    return res.status(400).send(JSON.stringify({error:'Missing city', usage:'/api/data/{city} or /api/data/{city}/{neighbourhood}'}));
  }

  var cityData = scores.cities[cityKey];
  if (!cityData) {
    return res.status(404).send(JSON.stringify({error:'City not found', city:cityKey, available_cities:Object.keys(scores.cities).slice(0,20)}));
  }

  // City-level response
  if (!hoodSlug) {
    var hoodList = Object.keys(cityData.neighbourhoods).map(function(name) {
      var h = cityData.neighbourhoods[name];
      var personaScores = {};
      PERSONAS.forEach(function(p){ personaScores[p] = calcScore(h, p); });
      return {
        name: name,
        slug: slugify(name),
        url: 'https://www.localechoice.com/'+urlKey(cityKey)+'/'+slugify(name)+'/',
        raw_scores: {walk:h.walk||0, food:h.food||0, safety:h.safety||0, vibe:h.vibe||0, transit:h.transit||0, family:h.family||0, cost:h.cost||0},
        persona_scores: personaScores
      };
    });
    return res.status(200).send(JSON.stringify({
      city: cityData.name,
      country: cityData.country,
      key: cityKey,
      url: 'https://www.localechoice.com/'+urlKey(cityKey),
      neighbourhood_count: hoodList.length,
      neighbourhoods: hoodList,
      methodology: 'https://www.localechoice.com/methodology',
      last_updated: '2026-05-14',
      attribution: 'LocaleChoice (https://www.localechoice.com/)'
    }));
  }

  // Neighbourhood-level response
  var hoodName = findHoodBySlug(cityData.neighbourhoods, hoodSlug);
  if (!hoodName) {
    return res.status(404).send(JSON.stringify({error:'Neighbourhood not found', neighbourhood:hoodSlug, city:cityKey, available:Object.keys(cityData.neighbourhoods).map(slugify)}));
  }

  var h = cityData.neighbourhoods[hoodName];
  var personaScores = {};
  var personaInsights = {};
  PERSONAS.forEach(function(p){
    personaScores[p] = calcScore(h, p);
    var ins = insights[cityKey+'/'+hoodName+'/'+p];
    if (ins) personaInsights[p] = ins;
  });

  return res.status(200).send(JSON.stringify({
    name: hoodName,
    slug: hoodSlug,
    city: cityData.name,
    country: cityData.country,
    url: 'https://www.localechoice.com/'+urlKey(cityKey)+'/'+hoodSlug+'/',
    raw_scores: {
      walk:    h.walk||0,
      food:    h.food||0,
      safety:  h.safety||0,
      vibe:    h.vibe||0,
      transit: h.transit||0,
      family:  h.family||0,
      cost:    h.cost||0
    },
    persona_scores: personaScores,
    persona_insights: personaInsights,
    tags: h.tags || '',
    methodology: 'https://www.localechoice.com/methodology',
    last_updated: '2026-05-14',
    attribution: 'LocaleChoice (https://www.localechoice.com/)'
  }));
};
