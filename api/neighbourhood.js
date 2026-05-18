// ═══════════════════════════════════════════════════════════════════════════
// api/neighbourhood.js
// Serves /{city}/{neighbourhood}/ pages — e.g. /lisbon/principe-real/
//
// OPTIMISED FOR THREE PARADIGMS SIMULTANEOUSLY:
//   1. SEO (Google) — long-tail keyword capture per neighbourhood
//   2. AEO (AI answers) — extractable, attributable, fact-rich content
//   3. Agentic discovery (Claude/ChatGPT/Perplexity) — structured JSON-LD,
//      explicit methodology citation, machine-readable data
//
// AUTHOR: Claude Opus 4.7 (May 2026)
// MAINTAINER NOTES FOR SONNET 4.6:
//   - Mirrors patterns in api/city.js. Share slugify() and PERSONA_* constants.
//   - Don't reorder route handlers in vercel.json — specific before general.
//   - TL;DR block is THE primary citation surface. Keep it 2-3 sentences,
//     declarative, answer-first. If you rewrite the page, never remove it.
//   - Speakable schema flags the TL;DR for AI extraction — preserve the CSS
//     class .tldr-block so the schema selector matches.
// ═══════════════════════════════════════════════════════════════════════════

var scores   = require('../roamly_scores.json');
var insights = require('../roamly_insights.json');
var CITY_CENTERS = require('./city_centers.js');
var HOOD_COORDS = require('./hood_coords.js');

var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
var PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
var PERSONA_EMOJI  = {solo:'&#x1F9ED;',family:'&#x1F46A;',foodie:'&#x1F37D;',culture:'&#x1F3DB;'};
var PERSONAS = ['solo','family','foodie','culture'];

// ─── Centralised "data updated" date ─────────────────────────────────────
var DATA_UPDATED = 'May 2026';

// ─── Score transparency helper ────────────────────────────────────────────
var FACTOR_LABELS = {
  walk:'walkability', transit:'transit', food:'food', family:'family-friendliness',
  safety:'safety', cost:'affordability', vibe:'vibe'
};
function weightExplanation(persona, score) {
  var w = PERSONA_WEIGHTS[persona];
  var entries = Object.keys(w).map(function(k){return {k:k,v:w[k]};}).sort(function(a,b){return b.v-a.v;});
  var top1 = entries[0], top2 = entries[1];
  var personaWord = {solo:'solo travellers', family:'families', foodie:'foodies', culture:'culture seekers'}[persona];
  return 'This '+score+' is weighted toward '+FACTOR_LABELS[top1.k]+' ('+Math.round(top1.v*100)+'%) and '
    +FACTOR_LABELS[top2.k]+' ('+Math.round(top2.v*100)+'%) for '+personaWord+'.';
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function calcScore(h, p) {
  var w = PERSONA_WEIGHTS[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0));
}
function sc(s){return s>=80?'#1a7a4a':s>=65?'#2d6a9f':s>=50?'#b07d2a':'#8b3a3a';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function slugify(s) {
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[\s\/]+/g,'-')
    .replace(/[^a-z0-9\-]/g,'')
    .replace(/\-+/g,'-')
    .replace(/^\-|\-$/g,'');
}
// City key → URL-safe form (inverse of KEY_MAP). Used for outbound links.
function urlKey(k) {
  return String(k||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[()]/g,'')
    .replace(/[\s\/]+/g,'_')
    .replace(/[^a-z0-9_]/g,'')
    .replace(/_+/g,'_')
    .replace(/^_|_$/g,'');
}
function findHoodBySlug(cityHoods, slug) {
  var keys = Object.keys(cityHoods);
  for (var i=0; i<keys.length; i++) {
    if (slugify(keys[i]) === slug) return keys[i];
  }
  return null;
}

function bar(lbl, val) {
  return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">'
    +'<span style="font-size:10px;color:#aaa;width:52px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em;font-weight:500">'+lbl+'</span>'
    +'<div style="flex:1;height:5px;background:#e8e8e4;border-radius:3px;min-width:40px">'
    +'<div style="width:'+val+'%;height:5px;background:'+sc(val)+';border-radius:3px"></div></div>'
    +'<span style="font-size:12px;font-weight:600;color:'+sc(val)+';width:26px;text-align:right">'+val+'</span>'
    +'</div>';
}

// AEO helper: extract first sentence from a longer paragraph
function firstSentence(s) {
  if (!s) return '';
  var match = String(s).match(/^[^.!?]*[.!?]/);
  return match ? match[0].trim() : String(s).substring(0, 140);
}

// Smart splitter for day_sketch into morning/afternoon/evening.
// Handles single-sentence sketches by splitting on commas, falls back to whole
// paragraph if no useful split is possible.
function splitDaySketch(s) {
  if (!s) return null;
  var sentences = String(s).match(/[^.!?]+[.!?]+/g) || [String(s)];

  if (sentences.length >= 3) {
    // Use first 3 sentences as morning/afternoon/evening
    return {
      morning: sentences[0].trim(),
      afternoon: sentences[1].trim(),
      evening: sentences.slice(2).join(' ').trim()
    };
  }
  if (sentences.length === 2) {
    return {
      morning: sentences[0].trim(),
      afternoon: sentences[1].trim(),
      evening: null
    };
  }
  // Single sentence — try to split on commas if it looks like a comma-list
  var parts = sentences[0].split(/,\s+/);
  if (parts.length >= 3) {
    return {
      morning: parts[0].trim().replace(/[.!?]+$/,''),
      afternoon: parts.slice(1, Math.ceil(parts.length/2)+1).join(', ').trim().replace(/[.!?]+$/,''),
      evening: parts.slice(Math.ceil(parts.length/2)+1).join(', ').trim().replace(/[.!?]+$/,'')
    };
  }
  return null; // no useful split — render as single paragraph
}

// Get the nth sentence from a paragraph (0-indexed). Used to split day_sketch
// into morning/afternoon/evening blocks.
function getSentence(s, n) {
  if (!s) return '';
  var sentences = String(s).match(/[^.!?]+[.!?]+/g) || [];
  return sentences[n] ? sentences[n].trim() : '';
}

// AEO helper: build answer-first TL;DR from data + insights
// Pattern: "[Hood] is [a/the] [verdict] in [City] for [audience]. [Specific fact 1]. [Specific fact 2]."
function buildTldr(hoodName, cityName, h, ps, rankInCity, allHoodCount, primaryInsight, bestPersona) {
  var verdict;
  var bestRank = rankInCity[bestPersona];

  if (bestRank === 1) {
    verdict = 'the top-ranked neighbourhood in '+cityName+' for '+PERSONA_LABELS[bestPersona].toLowerCase()+'s';
  } else if (bestRank <= 3) {
    verdict = 'a top-three neighbourhood in '+cityName+' for '+PERSONA_LABELS[bestPersona].toLowerCase()+'s';
  } else if (bestRank <= Math.ceil(allHoodCount/2)) {
    verdict = 'one of the stronger '+cityName+' neighbourhoods for '+PERSONA_LABELS[bestPersona].toLowerCase()+'s';
  } else {
    verdict = 'a '+cityName+' neighbourhood with specific strengths';
  }

  var standoutFacts = [];
  if ((h.walk||0) >= 85) standoutFacts.push('walkability scores '+h.walk+'/100');
  if ((h.food||0) >= 80) standoutFacts.push('food scene scores '+h.food+'/100');
  if ((h.safety||0) >= 85) standoutFacts.push('safety scores '+h.safety+'/100');
  if ((h.family||0) >= 80) standoutFacts.push('family-friendliness scores '+h.family+'/100');
  if ((h.vibe||0) >= 80) standoutFacts.push('vibe scores '+h.vibe+'/100');
  if (!standoutFacts.length) {
    standoutFacts.push('walk score '+(h.walk||0)+', food score '+(h.food||0)+', safety score '+(h.safety||0));
  }
  var facts = standoutFacts.slice(0,2).join(' and ');

  var keyDetail = '';
  if (primaryInsight && primaryInsight.best_for) {
    keyDetail = firstSentence(primaryInsight.best_for);
  }

  // Two-sentence TL;DR — declarative, answer-first, citation-friendly
  return hoodName+' is '+verdict+'. '+capitalize(facts)+'.'
    + (keyDetail ? ' '+keyDetail : '');
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase()+s.substring(1) : s; }

// AEO helper: answer-first FAQ generation. Lead with Yes/No/explicit answer.
function buildFaqs(hoodName, cityName, cityKey, h, ps, rankInCity, allHoodCount, ins, primary, bestPersona) {
  var faqs = [];

  // Q1: Is it a good area to stay? — direct verdict
  var verdict;
  if (rankInCity.solo <= 3) verdict = 'Yes';
  else if (rankInCity.solo <= Math.ceil(allHoodCount/2)) verdict = 'Yes, depending on your travel style';
  else verdict = 'It depends — '+hoodName+' has specific strengths but ranks lower than other '+cityName+' options for general travellers';

  faqs.push({
    q: 'Is '+hoodName+' a good area to stay in '+cityName+' for first-time visitors?',
    a: verdict+'. '+hoodName+' ranks #'+rankInCity.solo+' of '+allHoodCount+' '+cityName+' neighbourhoods for first-time visitors (combined score '+ps.solo+'/100), with walk score '+(h.walk||0)+'/100, food '+(h.food||0)+'/100, safety '+(h.safety||0)+'/100, and vibe '+(h.vibe||0)+'/100.'
      + (primary.best_for ? ' '+firstSentence(primary.best_for) : '')
  });

  // Q2: Safety — direct safety verdict
  var safetyVerdict;
  if ((h.safety||0) >= 85) safetyVerdict = 'Yes, '+hoodName+' is one of the safer neighbourhoods in '+cityName;
  else if ((h.safety||0) >= 70) safetyVerdict = 'Yes, '+hoodName+' is generally safe';
  else if ((h.safety||0) >= 55) safetyVerdict = hoodName+' is moderately safe with some areas to be cautious';
  else safetyVerdict = hoodName+' has lower safety scores than other '+cityName+' neighbourhoods';

  faqs.push({
    q: 'Is '+hoodName+' safe?',
    a: safetyVerdict+'. Safety score '+(h.safety||0)+'/100 based on editorial review of incidents, lighting and street activity.'
      + (primary.watch_out ? ' '+primary.watch_out : '')
  });

  // Q3: Families — direct family verdict
  var familyVerdict;
  if (rankInCity.family <= 3) familyVerdict = 'Yes, '+hoodName+' is one of the best '+cityName+' neighbourhoods for families';
  else if (rankInCity.family <= Math.ceil(allHoodCount/2)) familyVerdict = 'Yes, '+hoodName+' works for families, though some other '+cityName+' neighbourhoods rank higher';
  else familyVerdict = hoodName+' is not the top choice for families in '+cityName+' — quieter, more family-oriented neighbourhoods rank higher';

  faqs.push({
    q: 'Is '+hoodName+' good for families?',
    a: familyVerdict+'. Ranks #'+rankInCity.family+' of '+allHoodCount+' for families, scoring '+ps.family+'/100 on family-weighted metrics (family-friendliness '+(h.family||0)+'/100, safety '+(h.safety||0)+'/100).'
      + (ins.family.best_for ? ' '+firstSentence(ins.family.best_for) : '')
  });

  // Q4: What's it known for? — descriptive answer
  faqs.push({
    q: 'What is '+hoodName+' known for?',
    a: (primary.best_for ? firstSentence(primary.best_for)+' '+(primary.best_for.split(/[.!?]/).slice(1,2).join('.')||'').trim() : hoodName+' is one of '+allHoodCount+' distinct neighbourhoods in '+cityName+'.')
      + (primary.local_insight && primary.local_insight.text ? ' Local detail: '+primary.local_insight.text : '')
  });

  // Q5: Airport transfer — direct logistic answer
  var logisticsAnswer = (primary.logistics && primary.logistics.airport_transfer)
    ? primary.logistics.airport_transfer
    : 'Public transport (metro/bus) and taxis connect '+cityName+'\u2019s main airport to '+hoodName+'. Travel time typically 20\u201360 minutes depending on traffic.';

  faqs.push({
    q: 'How do I get from '+cityName+' airport to '+hoodName+'?',
    a: logisticsAnswer
  });

  // Q6 (new for AEO): Best for which type of traveller? — explicit AI-friendly comparison
  var bestForList = PERSONAS.map(function(p){return {p:p, s:ps[p], rank:rankInCity[p]};})
                            .sort(function(a,b){return a.rank - b.rank;});
  var bestPersonaLabel = PERSONA_LABELS[bestForList[0].p].toLowerCase();
  var worstPersonaLabel = PERSONA_LABELS[bestForList[bestForList.length-1].p].toLowerCase();
  faqs.push({
    q: 'Who should stay in '+hoodName+'?',
    a: hoodName+' suits '+bestPersonaLabel+'s best (ranked #'+bestForList[0].rank+' of '+allHoodCount+' '+cityName+' neighbourhoods for them).'
      + ' It works less well for '+worstPersonaLabel+'s (ranked #'+bestForList[bestForList.length-1].rank+').'
      + (primary.not_for ? ' Not recommended for: '+primary.not_for : '')
  });

  return faqs;
}

// ── Page generator ──────────────────────────────────────────────────────────
function generatePage(cityKey, cityData, hoodName) {
  var cityName = cityData.name;
  var country  = cityData.country || '';
  var hoods    = cityData.neighbourhoods;
  var h        = hoods[hoodName];
  var hoodSlug = slugify(hoodName);
  var urlCityKey = urlKey(cityKey);  // URL-safe city slug; raw cityKey may have ü/ö/parentheses
  var allHoodNames = Object.keys(hoods);
  var allHoodCount = allHoodNames.length;

  // Persona scores
  var ps = {};
  PERSONAS.forEach(function(p){ ps[p] = calcScore(h, p); });
  var bestPersona = PERSONAS.reduce(function(b,p){return ps[p] > ps[b] ? p : b;});

  // Ranks
  var rankInCity = {};
  PERSONAS.forEach(function(p) {
    var sorted = allHoodNames.map(function(n){return {n:n,s:calcScore(hoods[n],p)};})
                  .sort(function(a,b){return b.s-a.s;});
    for (var i=0; i<sorted.length; i++) {
      if (sorted[i].n === hoodName) { rankInCity[p] = i+1; break; }
    }
  });

  // Insights
  var ins = {};
  PERSONAS.forEach(function(p) { ins[p] = insights[cityKey+'/'+hoodName+'/'+p] || {}; });
  var primary = ins[bestPersona];

  // ── TL;DR (THE AEO CITATION SURFACE) ─────────────────────────────────────
  var tldr = buildTldr(hoodName, cityName, h, ps, rankInCity, allHoodCount, primary, bestPersona);

  // ── Hero summary line ────────────────────────────────────────────────────
  var summaryParts = [];
  if (rankInCity[bestPersona] === 1) summaryParts.push('#1 in '+cityName+' for '+PERSONA_LABELS[bestPersona].toLowerCase()+'s');
  else if (rankInCity[bestPersona] <= 3) summaryParts.push('Top '+rankInCity[bestPersona]+' in '+cityName+' for '+PERSONA_LABELS[bestPersona].toLowerCase()+'s');
  if ((h.walk||0) >= 85) summaryParts.push('walk score '+h.walk+'/100');
  if ((h.food||0) >= 80) summaryParts.push('food score '+h.food+'/100');
  if ((h.safety||0) >= 85) summaryParts.push('safety '+h.safety+'/100');
  var summary = summaryParts.length ? summaryParts.join(' \u00b7 ') : (cityName+' neighbourhood ranked across walkability, food, safety and vibe');

  // ── FAQs (answer-first for AEO) ──────────────────────────────────────────
  var faqs = buildFaqs(hoodName, cityName, cityKey, h, ps, rankInCity, allHoodCount, ins, primary, bestPersona);

  // ── Persona strip ────────────────────────────────────────────────────────
  var personaStrip = PERSONAS.map(function(p){
    var rank = rankInCity[p];
    var color = sc(ps[p]);
    return '<a href="/'+urlCityKey+'/'+p+'/" class="persona-card">'
      +'<div class="persona-emoji">'+PERSONA_EMOJI[p]+'</div>'
      +'<div class="persona-label">'+PERSONA_LABELS[p]+'</div>'
      +'<div class="persona-score" style="color:'+color+'">'+ps[p]+'</div>'
      +'<div class="persona-rank">#'+rank+' in '+cityName+'</div>'
      +'</a>';
  }).join('');

  // ── Item lists ───────────────────────────────────────────────────────────
  function itemList(items, type) {
    if (!items || !items.length) return '';
    return items.filter(function(x){return x && x.name && x.name !== 'null';}).map(function(it){
      var fb = '';
      if (type==='culture' && it.free===true)  fb=' <span class="free-pill">Free</span>';
      if (type==='culture' && it.free===false) fb=' <span class="paid-pill">Paid</span>';
      var price = (type==='food' && it.price) ? '<span class="price-pill">'+esc(it.price)+'</span>' : '';
      return '<div class="item-row">'
        +'<div style="flex:1"><div class="item-name">'+esc(it.name)+fb+'</div>'
        +'<div class="item-note">'+esc(it.note||'')+'</div></div>'
        +price+'</div>';
    }).join('');
  }
  var hl = primary.highlights || {};
  var foodHtml    = itemList(hl.food, 'food');
  var cultureHtml = itemList(hl.culture, 'culture');
  var beachHtml   = itemList(hl.beaches, 'beach');
  var barsHtml    = itemList(hl.bars_cafes, 'bar');
  var marketsHtml = itemList(hl.markets, 'market');

  // ════ SESSION 2: Dense item renderer for the new highlights grid ════
  function itemListDense(items, type) {
    if (!items || !items.length) return '';
    return items.filter(function(x){return x && x.name && x.name !== 'null';}).slice(0, 3).map(function(it){
      var tag = '';
      if (type === 'food' && it.price) {
        var cls = it.price === '\u20ac\u20ac\u20ac' ? 'hl-tag-p3' : it.price === '\u20ac\u20ac' ? 'hl-tag-p2' : 'hl-tag-p1';
        tag = '<span class="hl-item-tag '+cls+'">'+esc(it.price)+'</span>';
      } else if (type === 'culture' && it.free === true) {
        tag = '<span class="hl-item-tag hl-tag-free">Free</span>';
      } else if (type === 'culture' && it.free === false) {
        tag = '<span class="hl-item-tag hl-tag-paid">Paid</span>';
      }
      return '<div class="hl-item">'
        +'<div class="hl-item-row">'
          +'<div class="hl-item-name">'+esc(it.name)+'</div>'
          +tag
        +'</div>'
        +'<div class="hl-item-note">'+esc(it.note||'')+'</div>'
      +'</div>';
    }).join('');
  }
  var foodHtmlDense    = itemListDense(hl.food, 'food');
  var cultureHtmlDense = itemListDense(hl.culture, 'culture');
  var beachHtmlDense   = itemListDense(hl.beaches, 'beach');
  var barsHtmlDense    = itemListDense(hl.bars_cafes, 'bar');
  var marketsHtmlDense = itemListDense(hl.markets, 'market');

  // ════ SESSION 2: 3-column score bar grid renderer ════
  function barGrid(scores) {
    return scores.map(function(s){
      var col = sc(s.val);
      var cls = s.val >= 80 ? 'high' : s.val >= 65 ? 'mid' : 'low';
      return '<div class="score-bar-new">'
        +'<div class="score-bar-row">'
          +'<div class="score-bar-name">'+s.label+'</div>'
          +'<div class="score-bar-num" style="color:'+col+'">'+s.val+'</div>'
        +'</div>'
        +'<div class="score-bar-track"><div class="score-bar-fill" style="width:'+s.val+'%;background:'+col+'"></div></div>'
      +'</div>';
    }).join('');
  }

  // ── Logistics ────────────────────────────────────────────────────────────
  var lg = primary.logistics || {};
  var lgHtml = '';
  if (lg.airport_transfer || lg.getting_around || (lg.best_base_for && lg.best_base_for.length)) {
    lgHtml = '<div class="log-wrap">'
      +(lg.airport_transfer?'<div class="log-row"><span class="log-lbl">Airport</span><span class="log-val">'+esc(lg.airport_transfer)+'</span></div>':'')
      +(lg.getting_around  ?'<div class="log-row"><span class="log-lbl">Daily</span><span class="log-val">'+esc(lg.getting_around)+'</span></div>':'')
      +(lg.best_base_for && lg.best_base_for.length
        ?'<div class="log-row"><span class="log-lbl">Day trips</span><div class="log-val"><div class="trips">'
        +lg.best_base_for.map(function(t){return '<span class="trip">'+esc(t)+'</span>';}).join('')
        +'</div></div></div>':'')
      +'</div>';
  }

  // ── Related hoods (internal linking) ─────────────────────────────────────
  var related = allHoodNames
    .filter(function(n){return n !== hoodName;})
    .map(function(n){return {n:n, s:calcScore(hoods[n], bestPersona)};})
    .sort(function(a,b){return b.s-a.s;})
    .slice(0,6);
  var relatedHtml = related.map(function(r){
    return '<a href="/'+urlCityKey+'/'+slugify(r.n)+'/" class="related-card">'
      +'<div class="related-name">'+esc(r.n)+'</div>'
      +'<div class="related-score" style="color:'+sc(r.s)+'">'+r.s+'</div>'
      +'</a>';
  }).join('');

  // ── Map data ─────────────────────────────────────────────────────────────
  // Build pin data for all neighbourhoods in this city. Current hood gets a
  // 'current' tag so it can be highlighted in the map.
  var cityCenter = CITY_CENTERS[cityKey] || CITY_CENTERS[urlCityKey] || null;
  var cityHoodCoords = HOOD_COORDS[cityKey] || HOOD_COORDS[urlCityKey] || [];
  var currentHoodSlug = slugify(hoodName);

  // For each hood with coords, compute its best-persona score and rank
  var mapPins = cityHoodCoords.map(function(hc){
    // Find this hood's data by slug match
    var actualName = null;
    Object.keys(hoods).forEach(function(n){
      if (slugify(n) === hc.slug || slugify(n) === hc.id) actualName = n;
    });
    if (!actualName) return null;
    var hData = hoods[actualName];
    var score = calcScore(hData, bestPersona);
    // Rank by best persona for ordering
    return {
      slug: slugify(actualName),
      name: actualName,
      lat: hc.lat,
      lng: hc.lng,
      score: score,
      isCurrent: slugify(actualName) === currentHoodSlug
    };
  }).filter(function(p){return p !== null;})
    .sort(function(a,b){return b.score - a.score;})
    .map(function(p, idx){
      p.rank = idx + 1;
      return p;
    });
  var mapDataJson = JSON.stringify({
    center: cityCenter,
    pins: mapPins,
    currentSlug: currentHoodSlug
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STRUCTURED DATA — the AEO/SEO core
  // ══════════════════════════════════════════════════════════════════════════

  // Organization (publisher credibility)
  var orgSchema = {
    '@context':'https://schema.org','@type':'Organization',
    name: 'LocaleChoice',
    url: 'https://www.localechoice.com/',
    description: 'Data-driven neighbourhood ranker for 110 European cities. Scores 384 neighbourhoods on walkability, food, safety, transit, family-friendliness, cost and vibe.',
    sameAs: []
  };

  // Article schema with author + datePublished (AI agents heavily weight authorship)
  var articleSchema = {
    '@context':'https://schema.org','@type':'Article',
    headline: hoodName+', '+cityName+' \u2014 Neighbourhood Guide',
    description: tldr,
    author: {'@type':'Organization', name:'LocaleChoice', url:'https://www.localechoice.com/'},
    publisher: orgSchema,
    datePublished: '2026-05-14',
    dateModified: '2026-05-14',
    mainEntityOfPage: 'https://www.localechoice.com/'+urlCityKey+'/'+hoodSlug+'/',
    about: {'@type':'Place', name: hoodName+', '+cityName}
  };

  // FAQPage schema
  var faqSchema = {
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.map(function(f){
      return {'@type':'Question', name:f.q,
              acceptedAnswer:{'@type':'Answer', text:f.a}};
    })
  };

  // Place schema with explicit AdditionalProperty for each score (AI agents parse this)
  var placeSchema = {
    '@context':'https://schema.org','@type':'Place',
    name: hoodName+', '+cityName,
    description: tldr,
    containedInPlace: {'@type':'City', name: cityName, addressCountry: country},
    url: 'https://www.localechoice.com/'+urlCityKey+'/'+hoodSlug+'/',
    additionalProperty: [
      {'@type':'PropertyValue', name:'walkability_score',  value: h.walk||0,    maxValue: 100, description:'Pedestrian-friendliness from OpenStreetMap data'},
      {'@type':'PropertyValue', name:'food_score',         value: h.food||0,    maxValue: 100, description:'Restaurant density and quality from Google Places'},
      {'@type':'PropertyValue', name:'safety_score',       value: h.safety||0,  maxValue: 100, description:'Editorial safety review'},
      {'@type':'PropertyValue', name:'vibe_score',         value: h.vibe||0,    maxValue: 100, description:'Cultural energy and atmosphere'},
      {'@type':'PropertyValue', name:'transit_score',      value: h.transit||0, maxValue: 100, description:'Public transport access'},
      {'@type':'PropertyValue', name:'family_score',       value: h.family||0,  maxValue: 100, description:'Family-friendliness (parks, playgrounds, quiet)'},
      {'@type':'PropertyValue', name:'cost_score',         value: h.cost||0,    maxValue: 100, description:'Affordability (higher = more affordable)'}
    ]
  };

  // Speakable — flags the TL;DR for voice/AI extraction
  var speakableSchema = {
    '@context':'https://schema.org','@type':'WebPage',
    speakable: {
      '@type':'SpeakableSpecification',
      cssSelector: ['.tldr-block', '.faq-a']
    },
    url: 'https://www.localechoice.com/'+urlCityKey+'/'+hoodSlug+'/'
  };

  // Breadcrumb
  var bcSchema = {
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'LocaleChoice',item:'https://www.localechoice.com/'},
      {'@type':'ListItem',position:2,name:cityName,item:'https://www.localechoice.com/'+urlCityKey},
      {'@type':'ListItem',position:3,name:hoodName,item:'https://www.localechoice.com/'+urlCityKey+'/'+hoodSlug+'/'}
    ]
  };

  var faqHtml = faqs.map(function(f){
    return '<div class="faq-item">'
      +'<div class="faq-q">'+esc(f.q)+'</div>'
      +'<div class="faq-a">'+esc(f.a)+'</div>'
      +'</div>';
  }).join('');

  // ══════════════════════════════════════════════════════════════════════════
  // HTML
  // ══════════════════════════════════════════════════════════════════════════
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
  +'<meta charset="UTF-8"/>\n'
  +'<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
  +'<title>'+esc(hoodName)+', '+esc(cityName)+': Good for First Trip?</title>\n'
  +'<meta name="description" content="'+esc(tldr.substring(0, 155))+'"/>\n'
  +'<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>\n'
  +'<link rel="canonical" href="https://www.localechoice.com/'+urlCityKey+'/'+hoodSlug+'/"/>\n'
  +'<link rel="alternate" type="application/json" href="https://www.localechoice.com/api/data/'+urlCityKey+'/'+hoodSlug+'" title="Data for '+esc(hoodName)+'"/>\n'
  +'<meta property="og:title" content="'+esc(hoodName)+', '+esc(cityName)+': Good for First Trip?"/>\n'
  +'<meta property="og:description" content="'+esc(tldr.substring(0, 200))+'"/>\n'
  +'<meta property="og:url" content="https://www.localechoice.com/'+urlCityKey+'/'+hoodSlug+'/"/>\n'
  +'<meta property="og:type" content="article"/>\n'
  +'<meta property="og:site_name" content="LocaleChoice"/>\n'
  +'<meta name="twitter:card" content="summary_large_image"/>\n'
  +'<meta name="article:published_time" content="2026-05-14"/>\n'
  +'<meta name="article:modified_time" content="2026-05-14"/>\n'
  +'<script type="application/ld+json">'+JSON.stringify(articleSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(placeSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(faqSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(speakableSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(bcSchema)+'</script>\n'
  +'<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'
  +'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'
  +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500;1,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Mono:wght@500&display=swap" rel="stylesheet"/>\n'
  +'<style>\n'
  +'*{box-sizing:border-box;margin:0;padding:0}\n'
  +'body{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf8f3;color:#162030;line-height:1.65;-webkit-font-smoothing:antialiased}\n'
  +'.h1,.faq-q,.item-name,.related-name,h2{font-family:"Playfair Display",Georgia,serif}\n'
  +'h2{font-family:"DM Sans",sans-serif}\n'
  +'.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n'
  +'.logo{font-size:17px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:.01em}\n'
  +'.logo em{font-style:italic;color:#bfa040}\n'
  +'.nav-link{color:rgba(255,255,255,.75);text-decoration:none;font-size:13px;font-weight:500;padding:6px 12px;border-radius:6px;transition:all .15s;letter-spacing:.01em}\n'
  +'.nav-link:hover{color:#fff;background:rgba(255,255,255,.06)}\n'
  +'.rr-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-decoration:none}\n'
  +'.hero{background:#162030;padding:28px 20px 36px}\n'
  +'.crumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px}\n'
  +'.crumb-link{font-size:13px;font-weight:500;color:rgba(255,255,255,.4);text-decoration:none}\n'
  // ════ Hero with score display (added in this session) ════
  +'.hero{background:linear-gradient(135deg,#162030 0%,#0f1a24 60%,#1f2d44 100%);padding:36px 20px 44px;position:relative;overflow:hidden}\n'
  +'.hero::before{content:\"\";position:absolute;inset:0;background-image:radial-gradient(circle at 20% 30%,rgba(191,160,64,.06) 0%,transparent 40%),radial-gradient(circle at 80% 70%,rgba(45,106,159,.08) 0%,transparent 40%);pointer-events:none}\n'
  +'.hero-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:36px;align-items:center;max-width:1080px;margin:0 auto;position:relative;z-index:1}\n'
  +'@media(max-width:760px){.hero-grid{grid-template-columns:1fr;gap:24px}}\n'
  +'.score-display{background:rgba(247,244,238,.04);border:0.5px solid rgba(191,160,64,.25);border-radius:12px;padding:24px 22px;text-align:center}\n'
  +'.score-display-label{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#d4b95a;margin-bottom:10px}\n'
  +'.score-display-big{font-family:"Playfair Display",Georgia,serif;font-size:76px;font-weight:700;line-height:1;color:#d4b95a;letter-spacing:-.02em}\n'
  +'.score-display-suffix{font-size:20px;color:rgba(247,244,238,.4);margin-left:2px;font-weight:400}\n'
  +'.score-display-rank{margin-top:8px;font-size:12px;color:rgba(247,244,238,.7)}\n'
  +'.score-display-rank strong{color:#f7f4ee}\n'
  +'.score-display-explain{margin-top:14px;padding-top:14px;border-top:0.5px solid rgba(191,160,64,.15);font-size:12px;color:rgba(247,244,238,.6);font-style:italic;line-height:1.55}\n'
  +'.hero-summary{font-size:13px;color:rgba(255,255,255,.55);font-family:"DM Mono",monospace;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;line-height:1.5}\n'
  +'.crumb-sep{font-size:13px;color:rgba(255,255,255,.2)}\n'
  +'.crumb-current{font-size:14px;font-weight:500;color:rgba(255,255,255,.85)}\n'
  +'.h1{font-size:clamp(28px,5vw,42px);font-weight:700;color:#fff;line-height:1.02;letter-spacing:-.02em;margin-bottom:12px;text-transform:none}\n'
  +'.h1 em{font-style:italic;color:#bfa040;font-weight:500;display:block;font-size:.55em;margin-top:8px;letter-spacing:-.005em;text-transform:none}\n'
  +'.container{max-width:820px;margin:0 auto;padding:28px 20px}\n'
  +'h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#888;margin-bottom:14px}\n'
  +'.tldr-block{background:#fff;border-left:4px solid #bfa040;border-radius:0 10px 10px 0;padding:22px 26px;margin:24px 0 32px;font-size:16px;line-height:1.6;color:#162030;font-weight:500;box-shadow:0 1px 3px rgba(22,32,48,.04);font-family:"Playfair Display",Georgia,serif}\n'
  +'.tldr-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#bfa040;margin-bottom:10px;font-family:"DM Mono","DM Sans",monospace}\n'
  +'.card{background:#fff;border-radius:10px;border:0.5px solid rgba(22,32,48,.08);padding:22px 24px;margin-bottom:24px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.why-blk{padding:15px 18px;border-radius:8px;border-left:3px solid #3b5bdb;background:#f0f4ff;font-size:14px;line-height:1.7;color:#1a1a1a}\n'
  +'.notfor-blk{padding:12px 14px;border-radius:8px;border-left:3px solid #e03131;background:#fff0f0;font-size:13px;line-height:1.6;color:#c92a2a;margin-top:12px}\n'
  +'.local-blk{background:#162030;border-radius:10px;padding:14px 18px;margin:14px 0}\n'
  +'.local-lbl{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#bfa040;margin-bottom:6px;display:flex;align-items:center;gap:6px}\n'
  +'.local-type{background:rgba(191,160,64,.15);color:#bfa040;padding:1px 6px;border-radius:99px;font-size:9px}\n'
  +'.local-txt{font-size:14px;color:rgba(255,255,255,.85);font-style:italic;line-height:1.55}\n'
  +'.day-blk{font-size:14px;color:#444;line-height:1.7;background:#fafaf8;padding:16px 18px;border-radius:8px;border:0.5px solid #f0f0ec;margin-top:14px}\n'
  +'.item-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:#fafaf8;border-radius:8px;border:0.5px solid #f0f0ec;margin:6px 0}\n'
  +'.item-name{font-size:13px;font-weight:600;color:#1a1a1a}\n'
  +'.item-note{font-size:12px;color:#777;margin-top:2px;line-height:1.45}\n'
  +'.price-pill{font-size:11px;padding:2px 7px;border-radius:99px;background:#f4f4f2;border:0.5px solid #e8e8e4;color:#888;flex-shrink:0;height:fit-content}\n'
  +'.free-pill{font-size:10px;padding:1px 5px;border-radius:99px;background:#e8f5e9;color:#2e7d32;margin-left:5px}\n'
  +'.paid-pill{font-size:10px;padding:1px 5px;border-radius:99px;background:#fce4e4;color:#c62828;margin-left:5px}\n'
  +'.persona-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:6px}\n'
  +'.persona-card{display:block;text-decoration:none;padding:14px 10px;background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;text-align:center;transition:all .2s;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.persona-card:hover{border-color:#bfa040;transform:translateY(-1px);box-shadow:0 6px 16px rgba(22,32,48,.06)}\n'
  +'.persona-emoji{font-size:18px;margin-bottom:4px}\n'
  +'.persona-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}\n'
  +'.persona-score{font-size:24px;font-weight:700;line-height:1}\n'
  +'.persona-rank{font-size:10px;color:#aaa;margin-top:3px}\n'
  +'.log-wrap{background:#fafaf8;border-radius:8px;overflow:hidden;border:0.5px solid #f0f0ec}\n'
  +'.log-row{display:flex;gap:12px;padding:12px 14px;border-bottom:0.5px solid #f0f0ec;font-size:13px}\n'
  +'.log-row:last-child{border-bottom:none}\n'
  +'.log-lbl{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em;width:70px;flex-shrink:0;padding-top:2px;font-weight:600}\n'
  +'.log-val{color:#444;line-height:1.5;flex:1}\n'
  +'.trips{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}\n'
  +'.trip{font-size:11px;padding:3px 8px;border-radius:99px;background:#f0f0ec;border:0.5px solid #e8e8e4;color:#666}\n'
  +'.watch-blk{display:flex;gap:8px;padding:12px 14px;border-radius:8px;background:#fffbeb;font-size:13px;color:#8a5e10;line-height:1.55;margin-top:14px;border:0.5px solid #f0d080}\n'
  +'.related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}\n'
  +'.related-card{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#fafaf8;border:0.5px solid #e8e8e4;border-radius:8px;text-decoration:none;transition:border-color .15s}\n'
  +'.related-card:hover{border-color:#bfa040;background:#fff}\n'
  +'.related-name{font-size:13px;color:#1a1a1a;font-weight:500}\n'
  +'.related-score{font-size:16px;font-weight:700}\n'
  +'.faq-list{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;overflow:hidden;margin-bottom:24px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.faq-item{padding:18px 24px;border-bottom:0.5px solid rgba(22,32,48,.05)}\n'
  +'.faq-item:last-child{border-bottom:none}\n'
  +'.faq-q{font-size:16px;font-weight:500;color:#162030;margin-bottom:7px;letter-spacing:-.005em}\n'
  +'.faq-a{font-size:13.5px;color:rgba(22,32,48,.65);line-height:1.7}\n'
  +'.cta-strip{background:#162030;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px}\n'
  +'.method-link{display:inline-block;font-size:11px;color:#888;text-decoration:none;border-bottom:0.5px dotted #aaa;margin-top:6px}\n'
  +'.bars{margin-top:10px}\n'
  +'footer{background:#162030;padding:24px 20px;text-align:center}\n'
  +'footer a{color:rgba(255,255,255,.5);text-decoration:none;font-size:11px;margin:0 8px}\n'
  +'@media(max-width:600px){.persona-grid{grid-template-columns:repeat(2,1fr)}.related-grid{grid-template-columns:1fr}.container{padding:18px}}\n'

  // ════ SESSION 2: Dense layout additions ════
  +'.container{max-width:1080px}\n'
  +'.verdict-fit{display:grid;grid-template-columns:1.3fr 1fr;gap:18px;margin:24px 0 28px;align-items:stretch}\n'
  +'@media(max-width:860px){.verdict-fit{grid-template-columns:1fr;gap:14px}}\n'
  +'.tldr-block{margin:0!important}\n'
  +'.fit-strip{background:#f0ebe0;border-radius:0 10px 10px 0;padding:18px 22px;display:flex;flex-direction:column;gap:14px}\n'
  +'.fit-col-yes h3{font-family:"Playfair Display",Georgia,serif;font-size:15px;font-weight:700;color:#1a7a4a;margin-bottom:6px;display:flex;align-items:center;gap:8px}\n'
  +'.fit-col-no h3{font-family:"Playfair Display",Georgia,serif;font-size:15px;font-weight:700;color:#b85540;margin-bottom:6px;display:flex;align-items:center;gap:8px}\n'
  +'.fit-col-yes p,.fit-col-no p{font-size:13px;color:rgba(22,32,48,.75);line-height:1.55}\n'

  // Insight pull-quote
  +'.insight-card{background:linear-gradient(135deg,#1c2840,#162030);color:#f7f4ee;padding:22px 28px;border-radius:10px;margin:28px 0;position:relative;overflow:hidden}\n'
  +'.insight-card::before{content:\"\u201c\";position:absolute;top:-16px;right:24px;font-family:"Playfair Display",Georgia,serif;font-size:110px;color:rgba(191,160,64,.12);line-height:1;font-style:italic}\n'
  +'.insight-label{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#d4b95a;margin-bottom:10px;position:relative;z-index:1}\n'
  +'.insight-text{font-family:"Playfair Display",Georgia,serif;font-size:19px;font-weight:500;font-style:italic;line-height:1.5;max-width:64ch;position:relative;z-index:1}\n'

  // Day sketch 3-block flow
  +'.day-card{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;padding:22px 24px;margin-bottom:28px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.day-card h2{margin-bottom:8px}\n'
  +'.day-intro{font-size:13.5px;color:rgba(22,32,48,.7);line-height:1.65;margin-bottom:16px;max-width:64ch}\n'
  +'.day-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}\n'
  +'@media(max-width:720px){.day-flow{grid-template-columns:1fr}}\n'
  +'.day-block{padding:16px 18px;border-radius:8px;background:#f0ebe0}\n'
  +'.day-block-time{font-family:"DM Mono",monospace;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#bfa040;margin-bottom:6px}\n'
  +'.day-block-text{font-size:13px;color:#162030;line-height:1.55;font-family:"Playfair Display",Georgia,serif;font-weight:500}\n'

  // Score bars 3-column grid
  +'.score-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 16px;margin:10px 0}\n'
  +'@media(max-width:900px){.score-grid{grid-template-columns:repeat(2,1fr)}}\n'
  +'@media(max-width:520px){.score-grid{grid-template-columns:1fr}}\n'
  +'.score-bar-new{background:#faf8f3;padding:12px 16px;border-radius:8px;border:0.5px solid rgba(22,32,48,.06)}\n'
  +'.score-bar-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}\n'
  +'.score-bar-name{font-family:"Playfair Display",Georgia,serif;font-size:14px;font-weight:500;color:#162030}\n'
  +'.score-bar-num{font-family:"DM Mono",monospace;font-size:18px;font-weight:700}\n'
  +'.score-bar-track{height:4px;background:rgba(22,32,48,.06);border-radius:99px;overflow:hidden}\n'
  +'.score-bar-fill{height:100%;border-radius:99px}\n'

  // Highlights — 3 column compact
  +'.highlights-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}\n'
  +'@media(max-width:1000px){.highlights-grid{grid-template-columns:repeat(2,1fr)}}\n'
  +'@media(max-width:600px){.highlights-grid{grid-template-columns:1fr}}\n'
  +'.hl-cat{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;padding:18px 20px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.hl-cat-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:10px;border-bottom:0.5px solid rgba(22,32,48,.06)}\n'
  +'.hl-cat-icon{font-size:18px}\n'
  +'.hl-cat-name{font-family:"Playfair Display",Georgia,serif;font-size:16px;font-weight:700;color:#162030}\n'
  +'.hl-item{padding:8px 0;border-top:0.5px solid rgba(22,32,48,.05)}\n'
  +'.hl-item:first-of-type{border-top:none;padding-top:0}\n'
  +'.hl-item-row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:3px}\n'
  +'.hl-item-name{font-family:"Playfair Display",Georgia,serif;font-size:14px;font-weight:700;color:#162030;line-height:1.3}\n'
  +'.hl-item-tag{font-family:"DM Mono",monospace;font-size:9px;padding:2px 6px;border-radius:99px;font-weight:700;letter-spacing:.04em;flex-shrink:0;height:fit-content}\n'
  +'.hl-tag-p1{color:#1a7a4a;background:rgba(26,122,74,.1)}\n'
  +'.hl-tag-p2{color:#2d6a9f;background:rgba(45,106,159,.1)}\n'
  +'.hl-tag-p3{color:#b07d2a;background:rgba(176,125,42,.1)}\n'
  +'.hl-tag-free{color:#1a7a4a;background:rgba(26,122,74,.1)}\n'
  +'.hl-tag-paid{color:#b85540;background:rgba(184,85,64,.1)}\n'
  +'.hl-item-note{font-size:12px;color:rgba(22,32,48,.6);line-height:1.45}\n'

  // Logistics 3-column
  +'.logistics-grid-new{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0 14px}\n'
  +'@media(max-width:760px){.logistics-grid-new{grid-template-columns:1fr 1fr}}\n'
  +'@media(max-width:520px){.logistics-grid-new{grid-template-columns:1fr}}\n'
  +'.log-card{background:#faf8f3;border:0.5px solid rgba(22,32,48,.06);border-radius:8px;padding:14px 16px}\n'
  +'.log-card-icon{font-size:16px;margin-bottom:4px}\n'
  +'.log-card-title{font-family:"Playfair Display",Georgia,serif;font-size:14px;font-weight:700;color:#162030;margin-bottom:4px}\n'
  +'.log-card-text{font-size:12px;color:rgba(22,32,48,.65);line-height:1.5}\n'
  +'.log-card-text strong{color:#162030}\n'
  +'.log-card-list{list-style:none;padding:0;margin:0}\n'
  +'.log-card-list li{padding:2px 0;font-size:12px;color:rgba(22,32,48,.75);display:flex;gap:5px;line-height:1.4}\n'
  +'.log-card-list li::before{content:\"\u2192\";color:#bfa040;flex-shrink:0}\n'

  // Watch out band
  +'.watch-band{background:linear-gradient(135deg,#f5e8e2,#f9efe9);border-left:4px solid #b85540;padding:14px 20px;border-radius:0 8px 8px 0;margin-top:14px}\n'
  +'.watch-label{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#b85540;font-weight:700;margin-bottom:5px;display:flex;align-items:center;gap:6px}\n'
  +'.watch-text{font-size:13.5px;color:#162030;line-height:1.55}\n'
  +'.watch-text strong{color:#b85540}\n'

  // ════ Map section (added in this session) ════
  +'.map-section{margin:24px 0 28px}\n'
  +'.map-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px}\n'
  +'.map-legend{display:inline-flex;gap:12px;flex-wrap:wrap;align-items:center;background:#fff;padding:8px 14px;border-radius:8px;border:0.5px solid rgba(22,32,48,.08);font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.04em;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.map-legend-label{color:rgba(22,32,48,.55);font-weight:700;letter-spacing:.1em;text-transform:uppercase}\n'
  +'.legend-item{display:inline-flex;align-items:center;gap:4px;color:#162030}\n'
  +'.legend-dot{width:10px;height:10px;border-radius:50%}\n'
  +'.legend-dot.hi{background:#2ECC71}\n'
  +'.legend-dot.md2{background:#F1C40F}\n'
  +'.legend-dot.md{background:#E67E22}\n'
  +'.legend-dot.lo{background:#E74C3C}\n'
  +'.map-wrap{position:relative;height:440px;border-radius:12px;overflow:hidden;border:0.5px solid rgba(22,32,48,.08);box-shadow:0 4px 16px rgba(22,32,48,.04)}\n'
  +'@media(max-width:720px){.map-wrap{height:360px}}\n'
  +'#gmap{width:100%;height:100%}\n'
  +'.score-pin{display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-100%);transition:transform .2s}\n'
  +'.score-pin:hover{transform:translateY(-100%) scale(1.1);z-index:9999!important}\n'
  +'.pin-label{background:#162030;color:#fff;font-family:"DM Mono",monospace;font-size:10px;padding:3px 8px;border-radius:4px;white-space:nowrap;margin-bottom:2px;font-weight:600;letter-spacing:.04em;box-shadow:0 2px 6px rgba(0,0,0,.2)}\n'
  +'.pin-label.rank1{background:#bfa040;color:#162030}\n'
  +'.pin-label.current{background:#b85540;color:#fff}\n'
  +'.pin-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:"DM Mono",monospace;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.25)}\n'
  +'.pin-circle.hi{background:#2ECC71}\n'
  +'.pin-circle.md2{background:#F1C40F;color:#333}\n'
  +'.pin-circle.md{background:#E67E22}\n'
  +'.pin-circle.lo{background:#E74C3C}\n'
  +'.pin-circle.rank1{background:#bfa040;color:#162030;border-color:#162030;width:38px;height:38px;font-size:13px}\n'
  +'.pin-circle.current{background:#b85540;border:3px solid #fff;width:40px;height:40px;font-size:14px}\n'
  +'.pin-tail{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid;margin-top:-1px}\n'
  +'.pin-tail.hi{border-top-color:#2ECC71}\n'
  +'.pin-tail.md2{border-top-color:#F1C40F}\n'
  +'.pin-tail.md{border-top-color:#E67E22}\n'
  +'.pin-tail.lo{border-top-color:#E74C3C}\n'
  +'.pin-tail.rank1{border-top-color:#bfa040}\n'
  +'.pin-tail.current{border-top-color:#b85540}\n'
  +'</style>\n</head>\n<body>\n'

  // ── Nav ──────────────────────────────────────────────────────────────────
  +'<nav class="nav">\n'
  +'<a href="/" class="logo">Locale<em>Choice</em></a>\n'
  +'<div style="display:flex;gap:6px;align-items:center">'
  +'<a href="/methodology" class="nav-link">Methodology</a>'
  +'<a href="/'+urlCityKey+'" class="rr-btn">All '+esc(cityName)+' \u2192</a>'
  +'</div>'
  +'</nav>\n'

  // ── Hero ─────────────────────────────────────────────────────────────────
  +'<div class="hero">\n'
  +'<div class="hero-grid">\n'
  +'<div>\n'
  +'<div class="crumb">'
    +'<a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">\u203a</span>'
    +'<a class="crumb-link" href="/'+urlCityKey+'">'+esc(cityName)+'</a><span class="crumb-sep">\u203a</span>'
    +'<span class="crumb-current">'+esc(hoodName)+'</span>'
  +'</div>\n'
  +'<h1 class="h1"><em>'+esc(hoodName)+'</em>,<br>'+esc(cityName)+'</h1>\n'
  +'<div class="hero-summary">'+esc(summary)+'</div>\n'
  +'</div>\n'
  +'<div class="score-display">'
    +'<div class="score-display-label">Score for '+PERSONA_LABELS[bestPersona].toLowerCase()+'s</div>'
    +'<div class="score-display-big">'+ps[bestPersona]+'<span class="score-display-suffix">/100</span></div>'
    +'<div class="score-display-rank">'+(rankInCity[bestPersona]===1 ? 'Ranked <strong>#1 in '+esc(cityName)+'</strong>' : 'Ranked <strong>#'+rankInCity[bestPersona]+' of '+allHoodCount+'</strong> in '+esc(cityName))+'</div>'
    +'<div class="score-display-explain">'+esc(weightExplanation(bestPersona, ps[bestPersona]))+'</div>'
  +'</div>\n'
  +'</div>\n'
  +'</div>\n'

  +'<div class="container">\n'

  // ── Verdict + Fit side-by-side (Session 2) ────────────────────────────────
  +'<div class="verdict-fit">\n'
  +'<div class="tldr-block" itemprop="abstract">'
    +'<div class="tldr-label">\u2318 Quick answer</div>'
    +esc(tldr)
  +'</div>\n'
  +(primary.best_for || primary.not_for ? '<div class="fit-strip">'
    +(primary.best_for ? '<div class="fit-col-yes"><h3>\u2713 Why it works</h3><p>'+esc(primary.best_for)+'</p></div>' : '')
    +(primary.not_for ? '<div class="fit-col-no"><h3>\u2717 Not for you if</h3><p>'+esc(primary.not_for)+'</p></div>' : '')
  +'</div>\n' : '')
  +'</div>\n'

  // ── Live Google Map (added in this session) ───────────────────────────────
  +(mapPins.length > 0 && cityCenter ?
    '<div class="map-section">'
    +'<div class="map-header">'
      +'<div>'
        +'<div class="section-eyebrow" style="font-family:\"DM Mono\",monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(22,32,48,.55);margin-bottom:4px">Visualise it</div>'
        +'<h2 style="font-family:\"Playfair Display\",Georgia,serif;font-size:22px;font-weight:700;color:#162030;letter-spacing:-.01em;text-transform:none">All '+esc(cityName)+' neighbourhoods on the <em style="font-style:italic;color:#bfa040;font-weight:500">map</em></h2>'
      +'</div>'
      +'<div class="map-legend">'
        +'<span class="map-legend-label">Score</span>'
        +'<span class="legend-item"><span class="legend-dot hi"></span> 80+</span>'
        +'<span class="legend-item"><span class="legend-dot md2"></span> 65-79</span>'
        +'<span class="legend-item"><span class="legend-dot md"></span> 50-64</span>'
        +'<span class="legend-item"><span class="legend-dot lo"></span> &lt;50</span>'
      +'</div>'
    +'</div>'
    +'<div class="map-wrap"><div id="gmap"></div></div>'
  +'</div>\n' : '')

  // ── Local insight pull-quote (Session 2) ──────────────────────────────────
  +(primary.local_insight && primary.local_insight.text ?
    '<div class="insight-card">'
    +'<div class="insight-label">\u2318 Local insight'+(primary.local_insight.type?' \u00b7 '+esc(primary.local_insight.type):'')+'</div>'
    +'<div class="insight-text">\u201c'+esc(primary.local_insight.text)+'\u201d</div>'
    +'</div>\n' : '')

  // ── A day here (Session 2 — 3-block timeline derived from day_sketch) ─────
  +(function(){
    if (!primary.day_sketch) return '';
    var split = splitDaySketch(primary.day_sketch);
    if (!split) {
      // Single short sketch — render as paragraph card (no timeline)
      return '<div class="day-card"><h2>A day in '+esc(hoodName)+'</h2>'
        +'<p class="day-intro">'+esc(primary.day_sketch)+'</p></div>\n';
    }
    return '<div class="day-card">'
      +'<h2>A day in '+esc(hoodName)+'</h2>'
      +'<div class="day-flow">'
        +'<div class="day-block"><div class="day-block-time">\u2600 Morning</div><div class="day-block-text">'+esc(split.morning)+'</div></div>'
        +'<div class="day-block"><div class="day-block-time">\u25d4 Afternoon</div><div class="day-block-text">'+esc(split.afternoon)+'</div></div>'
        +(split.evening ? '<div class="day-block"><div class="day-block-time">\u263e Evening</div><div class="day-block-text">'+esc(split.evening)+'</div></div>' : '')
      +'</div>'
    +'</div>\n';
  })()

  // ── Persona scores (kept from existing layout) ────────────────────────────
  +'<h2>How '+esc(hoodName)+' scores for each traveller</h2>\n'
  +'<div class="persona-grid">'+personaStrip+'</div>\n'
  +'<p style="font-size:11px;color:rgba(22,32,48,.5);margin-bottom:24px">Tap any persona to see all '+cityName+' neighbourhoods ranked for that travel style</p>\n'

  // ── Score breakdown — new 3-column grid (Session 2) ───────────────────────
  +'<div class="card">\n'
  +'<h2>The data behind '+esc(hoodName)+'</h2>\n'
  +'<div class="score-grid">'
    +barGrid([
      {label:'Walkability',val:h.walk||0},
      {label:'Food',val:h.food||0},
      {label:'Safety',val:h.safety||0},
      {label:'Vibe',val:h.vibe||0},
      {label:'Transit',val:h.transit||0},
      {label:'Family',val:h.family||0},
      {label:'Cost',val:h.cost||0}
    ])
  +'</div>\n'
  +'<p style="font-size:11px;color:rgba(22,32,48,.5);margin-top:12px">Scores 0\u2013100. Walk and transit from OpenStreetMap. Food from Google Places. Family from OSM parks. Safety, cost and vibe from editorial review. Updated '+DATA_UPDATED+'.</p>\n'
  +'<a href="/methodology" class="method-link">Read full methodology \u2192</a>\n'
  +'</div>\n'

  // ── Highlights — 3-column dense grid (Session 2) ──────────────────────────
  +(foodHtmlDense || cultureHtmlDense || beachHtmlDense || barsHtmlDense || marketsHtmlDense ?
    '<h2 style="margin-top:8px">What to do in '+esc(hoodName)+'</h2>\n'
    +'<div class="highlights-grid">'
    +(foodHtmlDense ? '<div class="hl-cat"><div class="hl-cat-header"><span class="hl-cat-icon">\ud83c\udf77</span><span class="hl-cat-name">Food</span></div>'+foodHtmlDense+'</div>' : '')
    +(cultureHtmlDense ? '<div class="hl-cat"><div class="hl-cat-header"><span class="hl-cat-icon">\ud83c\udfdb</span><span class="hl-cat-name">Culture</span></div>'+cultureHtmlDense+'</div>' : '')
    +(barsHtmlDense ? '<div class="hl-cat"><div class="hl-cat-header"><span class="hl-cat-icon">\ud83c\udf78</span><span class="hl-cat-name">Bars & Caf\u00e9s</span></div>'+barsHtmlDense+'</div>' : '')
    +(marketsHtmlDense ? '<div class="hl-cat"><div class="hl-cat-header"><span class="hl-cat-icon">\ud83d\uded2</span><span class="hl-cat-name">Markets</span></div>'+marketsHtmlDense+'</div>' : '')
    +(beachHtmlDense ? '<div class="hl-cat"><div class="hl-cat-header"><span class="hl-cat-icon">\ud83c\udfd6</span><span class="hl-cat-name">Beach trips</span></div>'+beachHtmlDense+'</div>' : '')
    +'</div>\n' : '')

  // ── Logistics — 3-column row (Session 2) ──────────────────────────────────
  +(lg.airport_transfer || lg.getting_around || (lg.best_base_for && lg.best_base_for.length) ?
    '<div class="card">'
    +'<h2>Getting to and around '+esc(hoodName)+'</h2>'
    +'<div class="logistics-grid-new">'
      +(lg.airport_transfer ? '<div class="log-card"><div class="log-card-icon">\u2708</div><div class="log-card-title">Airport</div><div class="log-card-text">'+esc(lg.airport_transfer)+'</div></div>' : '')
      +(lg.getting_around ? '<div class="log-card"><div class="log-card-icon">\ud83d\udeb6</div><div class="log-card-title">Getting around</div><div class="log-card-text">'+esc(lg.getting_around)+'</div></div>' : '')
      +(lg.best_base_for && lg.best_base_for.length ? '<div class="log-card"><div class="log-card-icon">\ud83d\uddfa</div><div class="log-card-title">Day trips</div><ul class="log-card-list">'
        +lg.best_base_for.slice(0,4).map(function(t){return '<li>'+esc(t)+'</li>';}).join('')
      +'</ul></div>' : '')
    +'</div>'
    +(primary.watch_out ? '<div class="watch-band"><div class="watch-label">\u26a0 Watch out</div><div class="watch-text">'+esc(primary.watch_out)+'</div></div>' : '')
  +'</div>\n' : '')

  // ── FAQ (unchanged structure for AEO compatibility) ───────────────────────
  +'<h2 style="margin-top:8px">Frequently asked</h2>\n'
  +'<div class="faq-list">'+faqHtml+'</div>\n'

  // ── Booking CTA (unchanged) ───────────────────────────────────────────────
  +'<div class="cta-strip">\n'
  +'<div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:5px">Stay in '+esc(hoodName)+'</div>\n'
  +'<div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px">Browse hotels and apartments in this exact neighbourhood</div>\n'
  +'<a href="https://www.booking.com/searchresults.html?ss='+encodeURIComponent(hoodName+' '+cityName)+'&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored" style="display:inline-block;padding:11px 26px;border-radius:99px;background:#bfa040;color:#162030;font-size:14px;font-weight:700;text-decoration:none">\ud83c\udfe8 Find hotels in '+esc(hoodName)+' \u2192</a>\n'
  +'</div>\n'

  // ── Related hoods (unchanged for internal linking) ────────────────────────
  +'<h2>Other '+esc(cityName)+' neighbourhoods to consider</h2>\n'
  +'<div class="related-grid">'+relatedHtml+'</div>\n'
  +'<div style="margin-top:16px;text-align:center"><a href="/'+urlCityKey+'" style="font-size:13px;color:#2d6a9f;text-decoration:none;font-weight:500">See all '+allHoodCount+' '+esc(cityName)+' neighbourhoods ranked \u2192</a></div>\n'

  +'</div>\n'

  // Footer with methodology + data links (credibility for AI)
  +'<footer>\n'
  +'<div style="font-size:16px;font-weight:900;color:#fff">Locale<em style="font-style:italic;color:#bfa040">Choice</em></div>\n'
  +'<div style="margin-top:10px"><a href="/methodology">Methodology</a> \u00b7 <a href="/">All cities</a></div>\n'
  +'<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:10px">\u00a9 2026 LocaleChoice \u00b7 110 cities \u00b7 384 neighbourhoods \u00b7 Updated '+DATA_UPDATED+'</div>\n'
  +'</footer>\n'

  // ── Google Map script (added in this session) ─────────────────────────────
  +(mapPins.length > 0 && cityCenter ?
    '<script>\n'
    +'var MAP_DATA = '+mapDataJson+';\n'
    +'var gmap, mapOverlays = [];\n'
    +'function scoreClass(s){return s>=80?"hi":s>=65?"md2":s>=50?"md":"lo";}\n'
    +'function initMap(){\n'
    +'  gmap = new google.maps.Map(document.getElementById("gmap"),{\n'
    +'    center:{lat:MAP_DATA.center.lat,lng:MAP_DATA.center.lng},\n'
    +'    zoom:MAP_DATA.center.zoom||13,\n'
    +'    styles:[\n'
    +'      {featureType:"all",elementType:"labels.text.fill",stylers:[{color:"#162030"}]},\n'
    +'      {featureType:"water",elementType:"geometry",stylers:[{color:"#c9d8e8"}]},\n'
    +'      {featureType:"landscape",elementType:"geometry",stylers:[{color:"#f2ede3"}]},\n'
    +'      {featureType:"road",elementType:"geometry",stylers:[{color:"#ffffff"}]},\n'
    +'      {featureType:"road",elementType:"geometry.stroke",stylers:[{color:"#e0d8c8"}]},\n'
    +'      {featureType:"poi.park",elementType:"geometry",stylers:[{color:"#d8eacc"}]},\n'
    +'      {featureType:"transit",elementType:"geometry",stylers:[{color:"#ddd8cc"}]},\n'
    +'      {featureType:"administrative",elementType:"geometry.stroke",stylers:[{color:"#c8b88a"}]}\n'
    +'    ],\n'
    +'    mapTypeControl:false,streetViewControl:false,fullscreenControl:true,zoomControl:true,\n'
    +'    zoomControlOptions:{position:google.maps.ControlPosition.RIGHT_BOTTOM}\n'
    +'  });\n'
    +'  var bounds = new google.maps.LatLngBounds();\n'
    +'  MAP_DATA.pins.forEach(function(pin){\n'
    +'    var pos = new google.maps.LatLng(pin.lat,pin.lng);\n'
    +'    bounds.extend(pos);\n'
    +'    var isCurrent = pin.isCurrent;\n'
    +'    var isTop = pin.rank === 1 && !isCurrent;\n'
    +'    var col = scoreClass(pin.score);\n'
    +'    var classMod = isCurrent ? "current" : (isTop ? "rank1" : col);\n'
    +'    var div = document.createElement("div");\n'
    +'    div.className = "score-pin";\n'
    +'    var label = document.createElement("div");\n'
    +'    label.className = "pin-label " + (isCurrent ? "current" : (isTop ? "rank1" : ""));\n'
    +'    label.textContent = pin.name;\n'
    +'    var circle = document.createElement("div");\n'
    +'    circle.className = "pin-circle " + classMod;\n'
    +'    circle.textContent = pin.score;\n'
    +'    var tail = document.createElement("div");\n'
    +'    tail.className = "pin-tail " + classMod;\n'
    +'    div.appendChild(label); div.appendChild(circle); div.appendChild(tail);\n'
    +'    if (!isCurrent) {\n'
    +'      div.style.cursor = "pointer";\n'
    +'      div.addEventListener("click", function(){\n'
    +'        window.location.href = "/'+urlCityKey+'/" + pin.slug + "/";\n'
    +'      });\n'
    +'    }\n'
    +'    var overlay = new google.maps.OverlayView();\n'
    +'    overlay.onAdd = function(){ this.getPanes().overlayMouseTarget.appendChild(div); };\n'
    +'    overlay.draw = function(){\n'
    +'      var pt = this.getProjection().fromLatLngToDivPixel(pos);\n'
    +'      if (pt) { div.style.position="absolute"; div.style.left=(pt.x-18)+"px"; div.style.top=pt.y+"px"; }\n'
    +'    };\n'
    +'    overlay.onRemove = function(){ if(div.parentNode) div.parentNode.removeChild(div); };\n'
    +'    overlay.setMap(gmap);\n'
    +'    mapOverlays.push(overlay);\n'
    +'  });\n'
    +'  if (!bounds.isEmpty()) {\n'
    +'    gmap.fitBounds(bounds, {top:60,bottom:60,left:60,right:60});\n'
    +'    google.maps.event.addListenerOnce(gmap, "idle", function(){\n'
    +'      if (gmap.getZoom() > 14) gmap.setZoom(14);\n'
    +'    });\n'
    +'  }\n'
    +'}\n'
    +'(function(){\n'
    +'  var key = "AIzaSyA9410R5AlmHiaNM9mDOzTt15y6_N_tryY";\n'
    +'  var s = document.createElement("script");\n'
    +'  s.src = "https://maps.googleapis.com/maps/api/js?key=" + key + "&callback=initMap";\n'
    +'  s.async = true; s.defer = true;\n'
    +'  document.head.appendChild(s);\n'
    +'  window.initMap = initMap;\n'
    +'})();\n'
    +'</script>\n'
  : '')

  +'</body>\n</html>';
}

// ── Vercel handler ──────────────────────────────────────────────────────────
var KEY_MAP={'dusseldorf':'d\xfcsseldorf','malmo':'malm\xf6','heraklion_crete':'heraklion_(crete)'};

module.exports = function handler(req,res){
  var cityKey = String(req.query.city||'').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];
  if (!cityKey) return res.status(400).send('Missing city');

  var cityData = scores.cities[cityKey];
  if (!cityData) return res.status(404).send('City not found: '+cityKey);

  var hoodSlug = String(req.query.hood||'').toLowerCase().trim();
  if (!hoodSlug) return res.status(400).send('Missing neighbourhood');

  var hoodName = findHoodBySlug(cityData.neighbourhoods, hoodSlug);
  if (!hoodName) return res.status(404).send('Neighbourhood not found: '+hoodSlug+' in '+cityKey);

  try{
    var html = generatePage(cityKey, cityData, hoodName);
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch(err) {
    console.error('neighbourhood.js error:', err.message, err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};
