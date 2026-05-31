// api/compare.js — Neighbourhood vs Neighbourhood comparison pages
// ──────────────────────────────────────────────────────────────────────────
// Soft-launch (May 2026): top 10 cities, top 3 hoods each, 3 pairwise pages.
// Built to a "thin-proof utility" bar: side-by-side 7-factor matrix, persona
// score comparison, data-derived verdict + decision logic, schema, internal
// links back to both hood pages. Reuses the exact scoring model from persona.js
// so numbers stay consistent across the site.
// Route: /:city/compare/:pair  where pair = "hood-a-vs-hood-b"
// ──────────────────────────────────────────────────────────────────────────

var scores = require('../roamly_scores.json');

// ─── Scoring model (kept in sync with api/persona.js) ─────────────────────
var COMPARE_CITIES = ['paris','barcelona','lisbon','amsterdam','london','rome','berlin','copenhagen','vienna','prague'];
var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
var PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
var PERSONAS = ['solo','family','foodie','culture'];
var DATA_UPDATED = 'May 2026';

function calcScore(h, p) {
  var w = PERSONA_WEIGHTS[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0));
}
function gatekeepPenalty(h, p) {
  var penalty = 0;
  if (p === 'family') {
    if ((h.safety || 60) < 60) penalty += 20;
    if ((h.family || 60) < 55) penalty += 15;
    if ((h.vibe || 60) > 85)   penalty += 10;
  } else if (p === 'solo') {
    if ((h.safety || 60) < 55) penalty += 15;
  } else if (p === 'culture') {
    if ((h.safety || 60) < 55) penalty += 10;
  }
  return penalty;
}
function personaScore(h, p) {
  return Math.max(0, calcScore(h, p) - gatekeepPenalty(h, p));
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s\/]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');}
function cap(s){return String(s||'').charAt(0).toUpperCase()+String(s||'').slice(1);}

var KEY_MAP={'dusseldorf':'d\xfcsseldorf','malmo':'malm\xf6','heraklion_crete':'heraklion_(crete)'};

// City display name
function cityDisplay(cityKey, cityData){
  if (cityData && cityData.display) return cityData.display;
  if (cityData && cityData.name) return cityData.name;
  return cap(cityKey.replace(/_/g,' '));
}

// Factor metadata
var FACTORS = [
  {key:'safety',  label:'Safety',        higher:true},
  {key:'walk',    label:'Walkability',   higher:true},
  {key:'transit', label:'Transit',       higher:true},
  {key:'food',    label:'Food Scene',    higher:true},
  {key:'family',  label:'For Families',  higher:true},
  {key:'vibe',    label:'Vibe / Energy', higher:true},
  {key:'cost',    label:'Affordability', higher:true}  // cost stored as inverted (higher = more affordable)
];

// Find hood by slug within a city
function findHoodBySlug(cityHoods, slug){
  var keys = Object.keys(cityHoods);
  for (var i=0;i<keys.length;i++){
    if (slugify(keys[i]) === slug) return keys[i];
  }
  return null;
}

// Rank hoods in a city by their best persona score, return top N hood names
// NOTE: uses UNROUNDED scores for ranking (must match generate-sitemap.js exactly,
// otherwise sitemap URLs and on-page links can diverge and 404).
function topHoods(cityData, n){
  var hoods = Object.keys(cityData.neighbourhoods);
  var scored = hoods.map(function(hn){
    var h = cityData.neighbourhoods[hn];
    var best = Math.max.apply(null, PERSONAS.map(function(p){
      var w = PERSONA_WEIGHTS[p];
      var raw = Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0);
      return Math.max(0, raw - gatekeepPenalty(h,p));
    }));
    return {name:hn, best:best};
  });
  scored.sort(function(a,b){return b.best-a.best;});
  return scored.slice(0, n).map(function(x){return x.name;});
}

// Build a data-derived verdict comparing two hoods
function buildVerdict(nameA, nameB, hA, hB){
  // Find where each wins decisively (gap >= 8 points on a factor)
  var aWins = [], bWins = [];
  FACTORS.forEach(function(f){
    var va = hA[f.key]||60, vb = hB[f.key]||60;
    var gap = va - vb;
    if (gap >= 8) aWins.push(f.label.toLowerCase());
    else if (gap <= -8) bWins.push(f.label.toLowerCase());
  });

  // Persona winners (weighted scores, including gatekeeping)
  var personaWinners = {};
  PERSONAS.forEach(function(p){
    var sa = personaScore(hA,p), sb = personaScore(hB,p);
    personaWinners[p] = (sa > sb) ? 'A' : (sb > sa ? 'B' : 'tie');
  });

  // Detect contradiction: raw "for families" factor winner vs weighted family persona winner.
  // This happens when a hood has high family amenities but high vibe (nightlife) that
  // triggers the family gatekeeping penalty. Strip the raw factor claim to avoid confusing
  // the reader — the weighted persona verdict is the one that matters for the decision.
  var famFactorWinner = ((hA.family||60) - (hB.family||60) >= 8) ? 'A'
                       : ((hB.family||60) - (hA.family||60) >= 8) ? 'B' : 'tie';
  if (famFactorWinner !== 'tie' && personaWinners.family !== 'tie' && famFactorWinner !== personaWinners.family) {
    // Remove the raw "for families" claim from whichever win-list it's in
    aWins = aWins.filter(function(x){return x !== 'for families';});
    bWins = bWins.filter(function(x){return x !== 'for families';});
  }

  function listPhrase(arr){
    if (arr.length === 0) return '';
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0]+' and '+arr[1];
    return arr.slice(0,-1).join(', ')+' and '+arr[arr.length-1];
  }

  var parts = [];
  if (aWins.length) parts.push('<strong>'+esc(nameA)+'</strong> leads on '+esc(listPhrase(aWins)));
  if (bWins.length) parts.push('<strong>'+esc(nameB)+'</strong> leads on '+esc(listPhrase(bWins)));
  var lead = parts.length ? parts.join('; ')+'.' : 'The two areas score closely across most factors.';

  // Decision logic — who should pick which, based on persona winners
  var aPersonas = PERSONAS.filter(function(p){return personaWinners[p]==='A';}).map(function(p){return PERSONA_LABELS[p].toLowerCase()+'s';});
  var bPersonas = PERSONAS.filter(function(p){return personaWinners[p]==='B';}).map(function(p){return PERSONA_LABELS[p].toLowerCase()+'s';});

  var decision = '';
  if (aPersonas.length) decision += 'Choose <strong>'+esc(nameA)+'</strong> if you are travelling as '+esc(listPhrase(aPersonas))+'. ';
  if (bPersonas.length) decision += 'Choose <strong>'+esc(nameB)+'</strong> if you are travelling as '+esc(listPhrase(bPersonas))+'.';
  if (!decision) decision = 'Both areas suit similar travellers — the choice comes down to the specific factors above.';

  return {lead:lead, decision:decision, personaWinners:personaWinners};
}

// Factor value descriptor + color band
function band(v){ return v>=70?'good':v>=55?'mid':'low'; }
function bandColor(v){ return v>=70?'#4a7c3f':v>=55?'#bfa040':'#b85c4b'; }

// ─── Page generation ───────────────────────────────────────────────────────
function generateComparePage(cityKey, cityData, nameA, nameB){
  var cityName = cityDisplay(cityKey, cityData);
  var hA = cityData.neighbourhoods[nameA];
  var hB = cityData.neighbourhoods[nameB];
  var slugA = slugify(nameA), slugB = slugify(nameB);
  var cityUrl = cityKey.replace(/_/g,'-');

  var verdict = buildVerdict(nameA, nameB, hA, hB);

  // Persona score comparison rows
  var personaRows = PERSONAS.map(function(p){
    var sa = personaScore(hA,p), sb = personaScore(hB,p);
    var winA = sa>sb, winB = sb>sa;
    return '<tr>'
      +'<td class="cmp-factor">'+esc(PERSONA_LABELS[p])+'</td>'
      +'<td class="cmp-val '+(winA?'cmp-win':'')+'">'+sa+'<span class="cmp-100">/100</span></td>'
      +'<td class="cmp-val '+(winB?'cmp-win':'')+'">'+sb+'<span class="cmp-100">/100</span></td>'
      +'</tr>';
  }).join('');

  // Factor comparison rows (raw 7 factors)
  var factorRows = FACTORS.map(function(f){
    var va = hA[f.key]||60, vb = hB[f.key]||60;
    var winA = va>vb+2, winB = vb>va+2;
    return '<tr>'
      +'<td class="cmp-factor">'+esc(f.label)+'</td>'
      +'<td class="cmp-val '+(winA?'cmp-win':'')+'" style="border-left:3px solid '+bandColor(va)+'">'+va+'</td>'
      +'<td class="cmp-val '+(winB?'cmp-win':'')+'" style="border-left:3px solid '+bandColor(vb)+'">'+vb+'</td>'
      +'</tr>';
  }).join('');

  // ── Schema: ItemList of two Places being compared ──
  var schema = {
    "@context":"https://schema.org",
    "@type":"ItemList",
    "name":nameA+" vs "+nameB+", "+cityName,
    "description":"Side-by-side comparison of "+nameA+" and "+nameB+" in "+cityName+" across safety, walkability, transit, food, family-friendliness, vibe and cost.",
    "itemListElement":[
      {"@type":"ListItem","position":1,"item":{
        "@type":"Place","name":nameA+", "+cityName,
        "additionalProperty":FACTORS.map(function(f){return {"@type":"PropertyValue","name":f.label,"value":String(hA[f.key]||60)};})
      }},
      {"@type":"ListItem","position":2,"item":{
        "@type":"Place","name":nameB+", "+cityName,
        "additionalProperty":FACTORS.map(function(f){return {"@type":"PropertyValue","name":f.label,"value":String(hB[f.key]||60)};})
      }}
    ]
  };

  var breadcrumbSchema = {
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"LocaleChoice","item":"https://www.localechoice.com/"},
      {"@type":"ListItem","position":2,"name":cityName,"item":"https://www.localechoice.com/"+cityUrl},
      {"@type":"ListItem","position":3,"name":nameA+" vs "+nameB,"item":"https://www.localechoice.com/"+cityUrl+"/compare/"+slugA+"-vs-"+slugB+"/"}
    ]
  };

  // Title targets comparison search intent ("X vs Y ... where to stay").
  // Length-adaptive: Google truncates ~60 chars, so fall back through
  // progressively shorter variants that all keep the "vs" + stay intent.
  // Note: plain hyphen (not an HTML entity) — the title is esc()'d at output.
  var pairStr = nameA+' vs '+nameB;
  var titleCandidates = [
    pairStr+': Which '+cityName+' Neighbourhood to Stay In?',  // ideal, intent-rich
    pairStr+': Where to Stay in '+cityName+'?',                 // shorter, keeps stay intent
    pairStr+', '+cityName+': Which to Choose?',                 // original fallback
    pairStr+' - '+cityName,                                     // bare minimum
    pairStr                                                     // last resort: just the pair
  ];
  var title = titleCandidates[titleCandidates.length - 1];
  for (var ti = 0; ti < titleCandidates.length; ti++) {
    if (titleCandidates[ti].length <= 60) { title = titleCandidates[ti]; break; }
  }
  if (title.length > 60) title = title.substring(0, 57).replace(/\s+\S*$/, '') + '...';
  var desc = nameA+' or '+nameB+' in '+cityName+'? Side-by-side comparison of safety, walkability, transit, food and vibe scores with a data-driven verdict. Updated '+DATA_UPDATED+'.';
  desc = desc.substring(0,155);

  var canonical = 'https://www.localechoice.com/'+cityUrl+'/compare/'+slugA+'-vs-'+slugB+'/';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
    +'<meta charset="utf-8"/>\n'
    +'<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
    +'<title>'+esc(title)+'</title>\n'
    +'<meta name="description" content="'+esc(desc)+'"/>\n'
    +'<link rel="canonical" href="'+esc(canonical)+'"/>\n'
    +'<meta property="og:title" content="'+esc(title)+'"/>\n'
    +'<meta property="og:description" content="'+esc(desc)+'"/>\n'
    +'<meta property="og:type" content="website"/>\n'
    +'<script type="application/ld+json">'+JSON.stringify(schema)+'</script>\n'
    +'<script type="application/ld+json">'+JSON.stringify(breadcrumbSchema)+'</script>\n'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'
    +'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'
    +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@500&display=swap" rel="stylesheet"/>\n'
    +'<style>\n'
    +'*{box-sizing:border-box;margin:0;padding:0}\n'
    +'body{font-family:"DM Sans",sans-serif;color:#162030;background:#f5f1e8;line-height:1.5}\n'
    +'a{color:inherit}\n'
    +'.nav{background:#162030;padding:16px 24px;display:flex;justify-content:space-between;align-items:center}\n'
    +'.nav-logo{font-family:"Playfair Display",serif;font-size:18px;color:#fff;font-weight:700;text-decoration:none}\n'
    +'.nav-logo em{color:#d4b95a;font-style:italic}\n'
    +'.nav-link{color:rgba(255,255,255,.8);font-size:13px;text-decoration:none;margin-left:18px}\n'
    +'.hero{background:linear-gradient(135deg,#1c2840,#162030);padding:40px 24px 44px;color:#fff}\n'
    +'.hero-inner{max-width:900px;margin:0 auto}\n'
    +'.crumb{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:16px}\n'
    +'.crumb a{color:rgba(255,255,255,.5);text-decoration:none}\n'
    +'.crumb-sep{margin:0 6px}\n'
    +'.h1{font-family:"Playfair Display",serif;font-size:clamp(26px,4.5vw,40px);line-height:1.12;font-weight:700;letter-spacing:-.02em}\n'
    +'.h1 .vs{color:#d4b95a;font-style:italic;font-weight:500;padding:0 6px}\n'
    +'.hero-city{font-size:14px;color:rgba(255,255,255,.6);font-family:"DM Mono",monospace;text-transform:uppercase;letter-spacing:.08em;margin-top:12px}\n'
    +'.container{max-width:900px;margin:0 auto;padding:32px 24px}\n'
    +'.verdict-card{background:#fff;border:0.5px solid rgba(22,32,48,.1);border-radius:12px;padding:22px 24px;margin-bottom:28px;box-shadow:0 1px 3px rgba(22,32,48,.04)}\n'
    +'.verdict-label{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#bfa040;margin-bottom:10px}\n'
    +'.verdict-lead{font-family:"Playfair Display",serif;font-size:19px;line-height:1.4;color:#162030;margin-bottom:14px}\n'
    +'.verdict-decision{font-size:14px;line-height:1.6;color:rgba(22,32,48,.85)}\n'
    +'.ai-copy-btn{display:inline-flex;align-items:center;gap:8px;background:#fff;border:0.5px solid rgba(191,160,64,.45);border-radius:8px;padding:10px 16px;margin:0 0 24px;cursor:pointer;font-family:"DM Sans",sans-serif;font-size:13px;font-weight:500;color:#162030;transition:all .15s}\n'
    +'.ai-copy-btn:hover{border-color:#bfa040;box-shadow:0 2px 8px rgba(191,160,64,.14);background:#fffdf7}\n'
    +'.ai-copy-icon{font-size:14px}\n'
    +'.ai-copy-done{display:none;color:#1a7a4a;font-weight:600}\n'
    +'.ai-copy-btn.copied .ai-copy-text,.ai-copy-btn.copied .ai-copy-icon{display:none}\n'
    +'.ai-copy-btn.copied .ai-copy-done{display:inline}\n'
    +'.ai-copy-btn.copied{border-color:rgba(26,122,74,.4);background:rgba(26,122,74,.05)}\n'
    +'h2.sec{font-family:"Playfair Display",serif;font-size:20px;margin:32px 0 14px;font-weight:700}\n'
    +'.cmp-table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(22,32,48,.04);border:0.5px solid rgba(22,32,48,.08)}\n'
    +'.cmp-table th{font-family:"DM Mono",monospace;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:14px 12px;text-align:center;background:#162030;color:#fff;font-weight:500}\n'
    +'.cmp-table th:first-child{text-align:left}\n'
    +'.cmp-table td{padding:12px;border-bottom:0.5px solid rgba(22,32,48,.07);text-align:center;font-family:"Playfair Display",serif;font-size:17px;font-weight:600}\n'
    +'.cmp-factor{text-align:left!important;font-family:"DM Sans",sans-serif!important;font-size:13px!important;font-weight:500!important;color:rgba(22,32,48,.7)}\n'
    +'.cmp-100{font-size:10px;color:rgba(22,32,48,.4);font-weight:400}\n'
    +'.cmp-win{background:rgba(74,124,63,.08);color:#1a5c2a;position:relative}\n'
    +'.cmp-win::after{content:"\\2713";position:absolute;top:4px;right:6px;font-size:10px;color:#4a7c3f}\n'
    +'.cmp-note{font-size:12px;color:rgba(22,32,48,.5);margin-top:10px;line-height:1.5}\n'
    +'.cta-row{display:flex;gap:12px;margin:28px 0;flex-wrap:wrap}\n'
    +'.cta-btn{flex:1;min-width:180px;background:#fff;border:0.5px solid rgba(191,160,64,.4);border-radius:10px;padding:16px 18px;text-decoration:none;transition:all .15s}\n'
    +'.cta-btn:hover{border-color:#bfa040;box-shadow:0 2px 8px rgba(191,160,64,.12)}\n'
    +'.cta-btn-label{font-family:"DM Mono",monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#bfa040;display:block;margin-bottom:4px}\n'
    +'.cta-btn-name{font-family:"Playfair Display",serif;font-size:17px;font-weight:600;color:#162030}\n'
    +'.cta-btn-arrow{color:#bfa040;margin-left:4px}\n'
    +'.method-note{font-size:11px;color:rgba(22,32,48,.5);margin-top:24px;padding:14px 18px;background:rgba(22,32,48,.025);border-radius:8px;line-height:1.55}\n'
    +'.method-note a{color:#888}\n'
    +'.footer{background:#162030;color:rgba(255,255,255,.6);padding:24px;text-align:center;font-size:12px;margin-top:40px}\n'
    +'</style>\n</head>\n<body>\n'

    // Nav
    +'<div class="nav"><a class="nav-logo" href="/">Locale<em>Choice</em></a>'
    +'<div><a class="nav-link" href="/methodology">Methodology</a>'
    +'<a class="nav-link" href="/'+cityUrl+'">All '+esc(cityName)+' &#8594;</a></div></div>\n'

    // Hero
    +'<div class="hero"><div class="hero-inner">'
    +'<div class="crumb"><a href="/">LocaleChoice</a><span class="crumb-sep">&#8250;</span>'
    +'<a href="/'+cityUrl+'">'+esc(cityName)+'</a><span class="crumb-sep">&#8250;</span>Compare</div>'
    +'<h1 class="h1">'+esc(nameA)+'<span class="vs">vs</span>'+esc(nameB)+'</h1>'
    +'<div class="hero-city">'+esc(cityName)+' &middot; neighbourhood comparison</div>'
    +'</div></div>\n'

    // Body
    +'<div class="container">\n'

    // Verdict
    +'<div class="verdict-card">'
    +'<div class="verdict-label">The verdict</div>'
    +'<div class="verdict-lead">'+verdict.lead+'</div>'
    +'<div class="verdict-decision">'+verdict.decision+'</div>'
    +'</div>\n'

    // Copy for ChatGPT/Claude — seeds the comparison into AI chats
    +(function(){
      var copyText = nameA+' vs '+nameB+' in '+cityName+' \u2014 neighbourhood comparison (scores 0-100, via LocaleChoice):\\n'
        +nameA+': safety '+(hA.safety||60)+', walk '+(hA.walk||60)+', transit '+(hA.transit||60)+', food '+(hA.food||60)+', family '+(hA.family||60)+', vibe '+(hA.vibe||60)+', affordability '+(hA.cost||60)+'\\n'
        +nameB+': safety '+(hB.safety||60)+', walk '+(hB.walk||60)+', transit '+(hB.transit||60)+', food '+(hB.food||60)+', family '+(hB.family||60)+', vibe '+(hB.vibe||60)+', affordability '+(hB.cost||60)+'\\n'
        +'Source: '+canonical;
      var payload = esc(JSON.stringify(copyText));
      return '<button class="ai-copy-btn" data-copy="'+payload+'" onclick="lcCopyForAI(this)">'
        +'<span class="ai-copy-icon">\u2728</span>'
        +'<span class="ai-copy-text">Copy for ChatGPT / Claude</span>'
        +'<span class="ai-copy-done">\u2713 Copied \u2014 paste into any AI chat</span>'
        +'</button>\n';
    }())

    // Persona scores table
    +'<h2 class="sec">Score by traveller type</h2>'
    +'<table class="cmp-table"><thead><tr><th>Traveller</th><th>'+esc(nameA)+'</th><th>'+esc(nameB)+'</th></tr></thead>'
    +'<tbody>'+personaRows+'</tbody></table>'
    +'<p class="cmp-note">Each score is weighted for that traveller type. Safety and family-friendliness weigh most for families; food and vibe for food lovers; walkability and vibe for solo travellers.</p>\n'

    // Factor table
    +'<h2 class="sec">The 7 factors, side by side</h2>'
    +'<table class="cmp-table"><thead><tr><th>Factor</th><th>'+esc(nameA)+'</th><th>'+esc(nameB)+'</th></tr></thead>'
    +'<tbody>'+factorRows+'</tbody></table>'
    +'<p class="cmp-note">All scores 0&#8211;100. Walk and transit from OpenStreetMap. Food from Google Places. Family from OSM parks. Safety, cost and vibe from editorial review. Affordability is shown so higher always means better.</p>\n'

    // CTAs to individual hood pages
    +'<h2 class="sec">Full neighbourhood guides</h2>'
    +'<div class="cta-row">'
    +'<a class="cta-btn" href="/'+cityUrl+'/'+slugA+'/"><span class="cta-btn-label">Read full guide</span>'
    +'<span class="cta-btn-name">'+esc(nameA)+'<span class="cta-btn-arrow">&#8594;</span></span></a>'
    +'<a class="cta-btn" href="/'+cityUrl+'/'+slugB+'/"><span class="cta-btn-label">Read full guide</span>'
    +'<span class="cta-btn-name">'+esc(nameB)+'<span class="cta-btn-arrow">&#8594;</span></span></a>'
    +'</div>\n'

    // Methodology
    +'<div class="method-note">Comparison generated from LocaleChoice neighbourhood scores. '
    +'Each factor is measured 0&#8211;100; persona scores apply traveller-specific weightings. '
    +'<a href="/methodology">Read full methodology &#8594;</a></div>\n'

    +'</div>\n'

    // Footer
    +'<div class="footer">LocaleChoice &middot; Data-driven neighbourhood scoring for European travel &middot; Updated '+DATA_UPDATED+'</div>\n'
    +'<script>\n'
    +'function lcCopyForAI(btn){\n'
    +'  try{\n'
    +'    var txt = JSON.parse(btn.getAttribute("data-copy"));\n'
    +'    navigator.clipboard.writeText(txt).then(function(){\n'
    +'      btn.classList.add("copied");setTimeout(function(){btn.classList.remove("copied");},2600);\n'
    +'    }).catch(function(){\n'
    +'      var ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);\n'
    +'      ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);\n'
    +'      btn.classList.add("copied");setTimeout(function(){btn.classList.remove("copied");},2600);\n'
    +'    });\n'
    +'  }catch(e){}\n'
    +'}\n'
    +'</script>\n'
    +'</body>\n</html>';
}

// ─── Handler ────────────────────────────────────────────────────────────────
module.exports = function handler(req, res){
  var cityKey = String(req.query.city||'').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];
  if (!cityKey) return res.status(400).send('Missing city');

  var cityData = scores.cities[cityKey];
  if (!cityData) return res.status(404).send('City not found: '+cityKey);

  // pair param: "hood-a-vs-hood-b"
  var pair = String(req.query.pair||'').toLowerCase().trim();
  if (!pair || pair.indexOf('-vs-') === -1) return res.status(400).send('Invalid comparison');

  var halves = pair.split('-vs-');
  if (halves.length !== 2) return res.status(404).send('Invalid comparison');
  var slugA = halves[0], slugB = halves[1];
  if (!slugA || !slugB) return res.status(404).send('Invalid comparison');

  var nameA = findHoodBySlug(cityData.neighbourhoods, slugA);
  var nameB = findHoodBySlug(cityData.neighbourhoods, slugB);
  if (!nameA || !nameB) return res.status(404).send('One or both neighbourhoods not found');
  if (nameA === nameB) return res.status(400).send('Cannot compare a neighbourhood with itself');

  // Allowlist gate: only serve the exact curated pairs that are in the sitemap.
  // This prevents (a) reversed-order duplicate content, (b) arbitrary combinatorial
  // pages that would look like thin mass-generation to a core-update classifier,
  // and (c) comparisons in non-soft-launch cities.
  if (COMPARE_CITIES.indexOf(cityKey) === -1) return res.status(404).send('Comparison not available');
  var top3 = topHoods(cityData, 3);
  var canonicalPairs = [
    slugify(top3[0])+'-vs-'+slugify(top3[1]),
    slugify(top3[0])+'-vs-'+slugify(top3[2]),
    slugify(top3[1])+'-vs-'+slugify(top3[2])
  ];
  if (canonicalPairs.indexOf(pair) === -1) {
    return res.status(404).send('Comparison not available');
  }

  try {
    var html = generateComparePage(cityKey, cityData, nameA, nameB);
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch(err) {
    console.error('compare.js error:', err.message, err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};

// Export helpers for sitemap generation
module.exports.topHoods = topHoods;
module.exports.slugify = slugify;
module.exports.COMPARE_CITIES = COMPARE_CITIES;
