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

var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
var PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
var PERSONA_EMOJI  = {solo:'&#x1F9ED;',family:'&#x1F46A;',foodie:'&#x1F37D;',culture:'&#x1F3DB;'};
var PERSONAS = ['solo','family','foodie','culture'];

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
  +'<style>\n'
  +'*{box-sizing:border-box;margin:0;padding:0}\n'
  +'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f2;color:#1a1a1a;line-height:1.6}\n'
  +'.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n'
  +'.logo{font-size:17px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:.01em}\n'
  +'.logo em{font-style:italic;color:#bfa040}\n'
  +'.rr-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-decoration:none}\n'
  +'.hero{background:#162030;padding:28px 20px 36px}\n'
  +'.crumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px}\n'
  +'.crumb-link{font-size:13px;font-weight:500;color:rgba(255,255,255,.4);text-decoration:none}\n'
  +'.crumb-sep{font-size:13px;color:rgba(255,255,255,.2)}\n'
  +'.crumb-current{font-size:14px;font-weight:500;color:rgba(255,255,255,.85)}\n'
  +'.h1{font-size:clamp(26px,4.5vw,38px);font-weight:900;color:#fff;text-transform:uppercase;line-height:.95;letter-spacing:-.01em;margin-bottom:10px}\n'
  +'.h1 em{font-style:italic;color:#bfa040;text-transform:none}\n'
  +'.hero-summary{font-size:13px;color:rgba(255,255,255,.55);font-family:monospace;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;line-height:1.5}\n'
  +'.container{max-width:820px;margin:0 auto;padding:28px 20px}\n'
  +'h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#888;margin-bottom:14px}\n'
  +'.tldr-block{background:#fff;border-left:4px solid #bfa040;border-radius:0 12px 12px 0;padding:20px 22px;margin:20px 0 28px;font-size:15.5px;line-height:1.65;color:#1a1a1a;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.04)}\n'
  +'.tldr-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#bfa040;margin-bottom:8px}\n'
  +'.card{background:#fff;border-radius:12px;border:0.5px solid #e8e8e4;padding:20px 22px;margin-bottom:24px}\n'
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
  +'.persona-card{display:block;text-decoration:none;padding:14px 10px;background:#fafaf8;border:0.5px solid #e8e8e4;border-radius:10px;text-align:center;transition:border-color .15s}\n'
  +'.persona-card:hover{border-color:#bfa040;background:#fff}\n'
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
  +'.faq-list{background:#fff;border:0.5px solid #e8e8e4;border-radius:12px;overflow:hidden;margin-bottom:24px}\n'
  +'.faq-item{padding:16px 22px;border-bottom:0.5px solid #f0f0ec}\n'
  +'.faq-item:last-child{border-bottom:none}\n'
  +'.faq-q{font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:6px}\n'
  +'.faq-a{font-size:13px;color:#555;line-height:1.65}\n'
  +'.cta-strip{background:#162030;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px}\n'
  +'.method-link{display:inline-block;font-size:11px;color:#888;text-decoration:none;border-bottom:0.5px dotted #aaa;margin-top:6px}\n'
  +'.bars{margin-top:10px}\n'
  +'footer{background:#162030;padding:24px 20px;text-align:center}\n'
  +'footer a{color:rgba(255,255,255,.5);text-decoration:none;font-size:11px;margin:0 8px}\n'
  +'@media(max-width:600px){.persona-grid{grid-template-columns:repeat(2,1fr)}.related-grid{grid-template-columns:1fr}.container{padding:18px}}\n'
  +'</style>\n</head>\n<body>\n'

  // ── Nav ──────────────────────────────────────────────────────────────────
  +'<nav class="nav">\n'
  +'<a href="/" class="logo">Locale<em>Choice</em></a>\n'
  +'<a href="/'+urlCityKey+'" class="rr-btn">All '+esc(cityName)+' \u2192</a>\n'
  +'</nav>\n'

  // ── Hero ─────────────────────────────────────────────────────────────────
  +'<div class="hero">\n<div class="container" style="padding-top:0;padding-bottom:0">\n'
  +'<div class="crumb">'
    +'<a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">\u203a</span>'
    +'<a class="crumb-link" href="/'+urlCityKey+'">'+esc(cityName)+'</a><span class="crumb-sep">\u203a</span>'
    +'<span class="crumb-current">'+esc(hoodName)+'</span>'
  +'</div>\n'
  +'<h1 class="h1"><em>'+esc(hoodName)+'</em>,<br>'+esc(cityName)+'</h1>\n'
  +'<div class="hero-summary">'+esc(summary)+'</div>\n'
  +'</div>\n</div>\n'

  +'<div class="container">\n'

  // ── TL;DR (AEO citation surface, also human summary) ─────────────────────
  +'<div class="tldr-block" itemprop="abstract">'
  +'<div class="tldr-label">Quick answer</div>'
  +esc(tldr)
  +'</div>\n'

  // Persona scores
  +'<h2>How '+esc(hoodName)+' scores for each traveller</h2>\n'
  +'<div class="persona-grid">'+personaStrip+'</div>\n'
  +'<p style="font-size:11px;color:#aaa;margin-bottom:24px">Tap any persona to see all '+cityName+' neighbourhoods ranked for that travel style</p>\n'

  // Score breakdown with methodology link
  +'<div class="card">\n'
  +'<h2>The data behind '+esc(hoodName)+'</h2>\n'
  +bar('Walk',h.walk||0)+bar('Food',h.food||0)+bar('Safety',h.safety||0)+bar('Vibe',h.vibe||0)
  +bar('Transit',h.transit||0)+bar('Family',h.family||0)+bar('Cost',h.cost||0)
  +'<p style="font-size:11px;color:#aaa;margin-top:10px">Scores 0\u2013100. Walk and transit from OpenStreetMap. Food from Google Places. Family from OSM parks. Safety, cost and vibe from editorial review. Updated May 2026.</p>\n'
  +'<a href="/methodology" class="method-link">Read full methodology \u2192</a>\n'
  +'</div>\n'

  +(primary.best_for ? '<div class="card">\n<h2>Why stay in '+esc(hoodName)+'</h2>\n<div class="why-blk">'+esc(primary.best_for)+'</div>\n'
    +(primary.not_for ? '<div class="notfor-blk"><strong>Not for:</strong> '+esc(primary.not_for)+'</div>' : '')
    +'</div>\n' : '')

  +(primary.local_insight && primary.local_insight.text ?
    '<div class="card">\n<h2>Local insight</h2>\n'
    +'<div class="local-blk">'
    +'<div class="local-lbl">\ud83d\udccd Insider tip <span class="local-type">'+esc(primary.local_insight.type||'local')+'</span></div>'
    +'<div class="local-txt">\u201c'+esc(primary.local_insight.text)+'\u201d</div>'
    +'</div>\n</div>\n' : '')

  +(primary.day_sketch ? '<div class="card">\n<h2>A day in '+esc(hoodName)+'</h2>\n<div class="day-blk">'+esc(primary.day_sketch)+'</div>\n</div>\n' : '')
  +(foodHtml ? '<div class="card">\n<h2>Where to eat in '+esc(hoodName)+'</h2>\n<div class="bars">'+foodHtml+'</div>\n</div>\n' : '')
  +(cultureHtml ? '<div class="card">\n<h2>Things to do in '+esc(hoodName)+'</h2>\n<div class="bars">'+cultureHtml+'</div>\n</div>\n' : '')
  +(beachHtml ? '<div class="card">\n<h2>Beaches near '+esc(hoodName)+'</h2>\n<div class="bars">'+beachHtml+'</div>\n</div>\n' : '')
  +(barsHtml ? '<div class="card">\n<h2>Bars and caf\u00e9s in '+esc(hoodName)+'</h2>\n<div class="bars">'+barsHtml+'</div>\n</div>\n' : '')
  +(lgHtml ? '<div class="card">\n<h2>Getting to and around '+esc(hoodName)+'</h2>\n'+lgHtml
    +(primary.watch_out ? '<div class="watch-blk">\u26a0 '+esc(primary.watch_out)+'</div>' : '')
    +'</div>\n' : '')

  // FAQ
  +'<h2 style="margin-top:8px">Frequently asked</h2>\n'
  +'<div class="faq-list">'+faqHtml+'</div>\n'

  // Booking CTA
  +'<div class="cta-strip">\n'
  +'<div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:5px">Stay in '+esc(hoodName)+'</div>\n'
  +'<div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px">Browse hotels and apartments in this exact neighbourhood</div>\n'
  +'<a href="https://www.booking.com/searchresults.html?ss='+encodeURIComponent(hoodName+' '+cityName)+'&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored" style="display:inline-block;padding:11px 26px;border-radius:99px;background:#bfa040;color:#162030;font-size:14px;font-weight:700;text-decoration:none">\ud83c\udfe8 Find hotels in '+esc(hoodName)+' \u2192</a>\n'
  +'</div>\n'

  // Related
  +'<h2>Other '+esc(cityName)+' neighbourhoods to consider</h2>\n'
  +'<div class="related-grid">'+relatedHtml+'</div>\n'
  +'<div style="margin-top:16px;text-align:center"><a href="/'+urlCityKey+'" style="font-size:13px;color:#2d6a9f;text-decoration:none;font-weight:500">See all '+allHoodCount+' '+esc(cityName)+' neighbourhoods ranked \u2192</a></div>\n'

  +'</div>\n'

  // Footer with methodology + data links (credibility for AI)
  +'<footer>\n'
  +'<div style="font-size:16px;font-weight:900;color:#fff">Locale<em style="font-style:italic;color:#bfa040">Choice</em></div>\n'
  +'<div style="margin-top:10px"><a href="/methodology">Methodology</a> \u00b7 <a href="/api/data/'+urlCityKey+'/'+hoodSlug+'">JSON data</a> \u00b7 <a href="/">All cities</a></div>\n'
  +'<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:10px">\u00a9 2026 LocaleChoice \u00b7 110 cities \u00b7 384 neighbourhoods \u00b7 Updated May 2026</div>\n'
  +'</footer>\n'

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
