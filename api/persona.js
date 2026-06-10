// ═══════════════════════════════════════════════════════════════════════════
// api/persona.js — /{city}/{persona}/ pages
// e.g. /lisbon/family/, /barcelona/foodie/, /rome/culture/, /paris/solo/
//
// PURPOSE: Persona-specific city ranking pages. Captures highest-intent queries:
//   "best Lisbon neighbourhoods for families"
//   "best foodie areas in Barcelona"
//   "Rome for solo travellers where to stay"
//
// AEO + SEO design:
//   - TL;DR top recommendation declares "the winner" for the persona
//   - Article + ItemList + FAQPage + Breadcrumb schemas
//   - Speakable schema flags the TL;DR for AI extraction
//   - Cross-links to /{city} (general), /{city}/{hood}/ (each hood)
//
// AUTHOR: Claude Opus 4.7 (May 2026)
// MAINTAINER NOTES FOR SONNET 4.6:
//   - Route is /{city}/{persona}/ where persona ∈ {solo, family, foodie, culture}
//   - vercel.json constrains the regex to these 4 strings only, so it does NOT
//     collide with /{city}/{hood}/ which catches everything else
//   - PERSONA_WEIGHTS, PERSONA_LABELS, PERSONAS arrays must stay in sync with
//     city.js and neighbourhood.js
// ═══════════════════════════════════════════════════════════════════════════

var scores   = require('../roamly_scores.json');
var insights = require('../roamly_insights.json');
var related = require('./related_cities.js');

// Optional Wikipedia hero images (same module shared with city.js)
var CITY_IMAGES = {};
try { CITY_IMAGES = require('./city_images.js'); } catch(e) { /* designed hero fallback */ }

// ─── Scoring model: imported from the single source of truth ───────────────
// Weights, gatekeeping rules and dates live in api/_scoring.js. Edit THERE.
var SCORING = require('./_scoring.js');
var PERSONA_WEIGHTS = SCORING.PERSONA_WEIGHTS;
var PERSONA_WEIGHTS_BUDGET = SCORING.PERSONA_WEIGHTS_BUDGET;
var PERSONA_LABELS = SCORING.PERSONA_LABELS;
var PERSONA_EMOJI  = SCORING.PERSONA_EMOJI;
var PERSONAS = SCORING.PERSONAS;
var YEAR = SCORING.YEAR;

// Persona-specific title + meta phrasing for high search-intent matching
var PERSONA_TITLE_NOUN = {
  solo:    'Solo Travellers',
  family:  'Families',
  foodie:  'Food Lovers',
  culture: 'Culture Seekers'
};
// Title patterns rewritten June 2026 from GSC query evidence. The dominant
// real query shape is "best neighborhoods in [city] for families" / "best
// area to stay in [city] with family" (london 15+15+6+5 impr, stockholm
// pos 8.8 / 70 impr / 0 clicks, barcelona, berlin, madrid...). The previous
// "Where to Stay in X with Family" titles did not mirror that phrasing, so
// the keyword match (and SERP bolding) went to competitors. New pattern
// leads with "Best Neighbourhoods in {city}" — Google treats the
// neighbourhood/neighborhood spelling variants as equivalent for matching.
// "(YEAR)" freshness hook appended only when it fits under 60 chars.
function withYear(base) {
  return (base.length + 7 <= 60) ? base + ' (' + YEAR + ')' : base;
}
var PERSONA_TITLE_PATTERN = {
  solo:    function(city, n){
    var base = 'Best Neighbourhoods in '+city+' for Solo Travel';
    if (base.length > 60) base = city+' Solo: Best Neighbourhoods';
    return withYear(base);
  },
  family:  function(city, n){
    var base = 'Best Neighbourhoods in '+city+' for Families';
    if (base.length > 60) base = city+' for Families: Best Areas';
    return withYear(base);
  },
  foodie:  function(city, n){
    var base = 'Best Foodie Neighbourhoods in '+city;
    if (base.length > 60) base = city+' Foodie: Best Neighbourhoods';
    return withYear(base);
  },
  culture: function(city, n){
    var base = 'Best Neighbourhoods in '+city+' for Culture';
    if (base.length > 60) base = city+' Culture: Best Areas';
    return withYear(base);
  }
};
var PERSONA_HEADLINE_INTENT = {
  solo:    'where to stay alone',
  family:  'where to stay with kids',
  foodie:  'where to stay for food',
  culture: 'where to stay for culture'
};
var PERSONA_VERBS = {
  solo:    {best:'easiest to explore solo', factors:'walkability, vibe, safety and food'},
  family:  {best:'safest and most family-friendly', factors:'safety, family amenities, transit and walkability'},
  foodie:  {best:'best food scene', factors:'restaurant density, vibe and walkability'},
  culture: {best:'richest cultural mix', factors:'walkability, vibe, transit and food'}
};

var calcScore = SCORING.calcScore;
var gatekeepPenalty = SCORING.gatekeepPenalty;

// ─── Centralised "data updated" date ─────────────────────────────────────
var DATA_UPDATED = SCORING.DATA_UPDATED;

// ─── Score transparency: human-readable weight breakdown ─────────────────
var FACTOR_LABELS = SCORING.FACTOR_LABELS;

function weightExplanation(persona, budgetMode) {
  var w = (budgetMode ? PERSONA_WEIGHTS_BUDGET : PERSONA_WEIGHTS)[persona];
  var entries = Object.keys(w).map(function(k){return {k:k,v:w[k]};}).sort(function(a,b){return b.v-a.v;});
  var top1 = entries[0], top2 = entries[1];
  var personaWord = {solo:'solo travellers', family:'families', foodie:'foodies', culture:'culture seekers'}[persona];
  var modeNote = budgetMode ? ' in budget mode' : '';
  return 'These scores are weighted toward '+FACTOR_LABELS[top1.k]+' ('+Math.round(top1.v*100)+'%) and '
    +FACTOR_LABELS[top2.k]+' ('+Math.round(top2.v*100)+'%) for '+personaWord+modeNote+'.';
}
function sc(s){return s>=80?'#1a7a4a':s>=65?'#2d6a9f':s>=50?'#b07d2a':'#8b3a3a';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s\/]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-').replace(/^\-|\-$/g,'');}
function urlKey(k){return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[()]/g,'').replace(/[\s\/_]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');}

function bar(lbl, val) {
  return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0">'
    +'<span style="font-size:9px;color:#aaa;width:48px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em;font-weight:500">'+lbl+'</span>'
    +'<div style="flex:1;height:4px;background:#e8e8e4;border-radius:3px;min-width:30px">'
    +'<div style="width:'+val+'%;height:4px;background:'+sc(val)+';border-radius:3px"></div></div>'
    +'<span style="font-size:11px;font-weight:600;color:'+sc(val)+';width:22px;text-align:right">'+val+'</span>'
    +'</div>';
}

function generatePage(cityKey, cityData, persona, budgetMode) {
  budgetMode = !!budgetMode;
  var cityName = cityData.name;
  var country  = cityData.country || '';
  var hoods    = cityData.neighbourhoods;
  var urlCityKey = urlKey(cityKey);

  // Rank all hoods for this persona (with gatekeeping penalty applied)
  var ranked = Object.keys(hoods).map(function(n){
    var rawScore = calcScore(hoods[n],persona,budgetMode);
    var penalty  = gatekeepPenalty(hoods[n], persona);
    return {name:n, h:hoods[n], score: Math.max(0, rawScore - penalty)};
  }).sort(function(a,b){return b.score-a.score;});

  var top1 = ranked[0];
  var top2 = ranked[1] || null;
  var top3 = ranked[2] || null;
  var bottom = ranked[ranked.length-1];

  var personaLabel = PERSONA_LABELS[persona];
  var personaNoun  = PERSONA_TITLE_NOUN[persona];
  var verb = PERSONA_VERBS[persona];

  // ── TL;DR / verdict (AEO citation surface) ────────────────────────────────
  var verdict = top1.name+' is the best '+cityName+' neighbourhood for '+personaNoun.toLowerCase()
    +', scoring '+top1.score+'/100. '+(top2 ? top2.name+' ranks second with '+top2.score+', and '+(top3 ? top3.name+' third with '+top3.score+'.' : 'a tight race.') : '');

  // Get top hood insight for richer summary
  var top1Ins = insights[cityKey+'/'+top1.name+'/'+persona] || {};
  var top1Why = (top1Ins.best_for || '').split('.').slice(0,1).join('.') + (top1Ins.best_for ? '.' : '');

  // ── FAQ (answer-first, persona-targeted) ──────────────────────────────────
  var faqs = [
    {q:'Where should '+personaNoun.toLowerCase()+' stay in '+cityName+'?',
     a:'Stay in '+top1.name+'. It is the highest-ranked '+cityName+' neighbourhood for '+personaNoun.toLowerCase()+' with a score of '+top1.score+'/100, weighted on '+verb.factors+'. '+top1Why},
    {q:'What is the best '+cityName+' neighbourhood for '+personaNoun.toLowerCase()+'?',
     a:top1.name+' is the best '+cityName+' neighbourhood for '+personaNoun.toLowerCase()+', scoring '+top1.score+'/100. '+(top2 ? top2.name+' is the second-best at '+top2.score+'/100.' : '')},
    {q:'Which '+cityName+' areas should '+personaNoun.toLowerCase()+' avoid?',
     a:bottom.score < 50
       ? bottom.name+' scores lowest for '+personaNoun.toLowerCase()+' at '+bottom.score+'/100. Consider higher-ranked options like '+top1.name+' or '+(top2?top2.name:top1.name)+' instead.'
       : 'All '+ranked.length+' '+cityName+' neighbourhoods in our ranking score at least '+bottom.score+'/100 for '+personaNoun.toLowerCase()+'. None are explicitly unsuitable, though higher-ranked options like '+top1.name+' are recommended.'
    },
    {q:'How are these rankings calculated?',
     a:'Each neighbourhood is scored 0–100 on 7 factors (walkability, food, safety, vibe, transit, family-friendliness, cost). For '+personaNoun.toLowerCase()+', we weight these toward '+verb.factors+'. Data comes from OpenStreetMap, Google Places and editorial review. Full methodology at /methodology.'},
    {q:'Is '+top1.name+' really the right choice for '+personaNoun.toLowerCase()+'?',
     a:top1Why+' Walk score '+(top1.h.walk||0)+'/100, food '+(top1.h.food||0)+'/100, safety '+(top1.h.safety||0)+'/100, vibe '+(top1.h.vibe||0)+'/100, family '+(top1.h.family||0)+'/100.'}
  ];

  // ── Ranked list rendering ─────────────────────────────────────────────────
  var rankRows = ranked.map(function(r, i){
    var ins = insights[cityKey+'/'+r.name+'/'+persona] || {};
    var medal = i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : i === 2 ? '&#x1F949;' : ('#'+(i+1));
    var medalSize = i < 3 ? '20px' : '13px';
    var subline = (ins.best_for || '').split('.').slice(0,1).join('.');
    if (subline && subline.length > 140) subline = subline.substring(0, 137) + '...';

    // Show top 3 factor scores for this persona (highest-weighted factors)
    var w = PERSONA_WEIGHTS[persona];
    var topFactors = Object.keys(w).sort(function(a,b){return w[b]-w[a];}).slice(0,3);
    var factorPills = topFactors.map(function(f){
      var v = r.h[f]||0;
      return '<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:#fafaf8;border:0.5px solid #e8e8e4;color:'+sc(v)+';font-weight:600">'+f+' '+v+'</span>';
    }).join(' ');

    return '<a href="/'+urlCityKey+'/'+slugify(r.name)+'/" class="rank-row">'
      +'<div class="rank-medal" style="font-size:'+medalSize+'">'+medal+'</div>'
      +'<div class="rank-main">'
        +'<div class="rank-name">'+esc(r.name)+'</div>'
        +(subline ? '<div class="rank-sub">'+esc(subline)+'</div>' : '')
        +'<div class="rank-pills">'+factorPills+'</div>'
      +'</div>'
      +'<div class="rank-score" style="color:'+sc(r.score)+'">'+r.score+'</div>'
      +'</a>';
  }).join('');

  // ── Other personas (cross-link strip) ─────────────────────────────────────
  var otherPersonas = PERSONAS.filter(function(p){return p!==persona;}).map(function(p){
    return '<a href="/'+urlCityKey+'/'+p+'/" class="persona-pill">'
      +PERSONA_EMOJI[p]+' '+PERSONA_LABELS[p]
      +'</a>';
  }).join('');

  // ── Same persona, other cities (programmatic internal linking) ───────────
  // Hand-curated list of cities known for this persona (e.g. foodie ↔
  // Bologna, San Sebastian). Builds persona-cluster topical authority for AEO.
  var personaCities = related.getPersonaCities(persona, cityKey, scores.cities);
  var personaCitiesHtml = '';
  if (personaCities.length > 0) {
    personaCitiesHtml = '<h2>'+esc(personaNoun)+' in other cities</h2>\n'
      + '<div class="related-cities-grid" style="margin-bottom:24px">'
      + personaCities.map(function(rc){
          return '<a href="/'+urlKey(rc.key)+'/'+persona+'/" class="related-city-card">'
            + '<div class="related-city-name">'+esc(rc.name)+'</div>'
            + '<div class="related-city-country">For '+esc(personaNoun.toLowerCase())+'</div>'
            + '</a>';
        }).join('')
      + '</div>\n';
  }

  // ── Schemas ───────────────────────────────────────────────────────────────
  var faqSchema = {'@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.map(function(f){return {'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}};})};

  var itemListSchema = {
    '@context':'https://schema.org','@type':'ItemList',
    name: 'Best '+cityName+' neighbourhoods for '+personaNoun,
    description: verdict,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: ranked.length,
    itemListElement: ranked.map(function(r, i){
      return {'@type':'ListItem', position:i+1, name:r.name,
        url:'https://www.localechoice.com/'+urlCityKey+'/'+slugify(r.name)+'/'};
    })
  };

  var articleSchema = {
    '@context':'https://schema.org','@type':'Article',
    headline: 'Best '+cityName+' Neighbourhoods for '+personaNoun+' (Ranked 2026)',
    description: verdict,
    author: {'@type':'Organization', name:'LocaleChoice', url:'https://www.localechoice.com/'},
    publisher: {'@type':'Organization', name:'LocaleChoice', url:'https://www.localechoice.com/'},
    datePublished: '2026-05-14',
    dateModified: '2026-05-14',
    mainEntityOfPage: 'https://www.localechoice.com/'+urlCityKey+'/'+persona+'/'
  };

  var speakableSchema = {
    '@context':'https://schema.org','@type':'WebPage',
    speakable:{'@type':'SpeakableSpecification', cssSelector:['.tldr-block','.verdict-line','.faq-a']},
    url:'https://www.localechoice.com/'+urlCityKey+'/'+persona+'/'
  };

  var bcSchema = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'LocaleChoice',item:'https://www.localechoice.com/'},
    {'@type':'ListItem',position:2,name:cityName,item:'https://www.localechoice.com/'+urlCityKey},
    {'@type':'ListItem',position:3,name:'For '+personaNoun,item:'https://www.localechoice.com/'+urlCityKey+'/'+persona+'/'}
  ]};

  var faqHtml = faqs.map(function(f){
    return '<div class="faq-item">'
      +'<div class="faq-q">'+esc(f.q)+'</div>'
      +'<div class="faq-a">'+esc(f.a)+'</div>'
      +'</div>';
  }).join('');

  // ── SERP snippet (rewritten May 2026 based on Search Console CTR data) ────
  // Old format: "Where to Stay in X with Kids" — got 0% CTR at position 5
  // because it didn't keyword-match real queries like "best neighborhoods
  // in [city] for families". New format mirrors actual search behaviour.
  var nHoods = ranked.length;
  var pageTitle = PERSONA_TITLE_PATTERN[persona](cityName, nHoods);
  if (budgetMode) pageTitle = 'Budget '+pageTitle;

  // Description leads with the BENEFIT and now also includes key intent
  // signals from Search Console queries: safety + transit + schools (family).
  var benefitPhrase = {
    solo:    'Where solo travellers should stay in '+cityName,
    family:  'Where families should stay in '+cityName,
    foodie:  'Where food lovers should stay in '+cityName,
    culture: 'Where culture seekers should stay in '+cityName
  }[persona];
  // Persona-specific factor emphasis aligned to actual queries seen in GSC
  var factorEmphasis = {
    solo:    'walkability, safety and vibe',
    family:  'safety, family amenities, transit and walkability',
    foodie:  'food density, walkability and vibe',
    culture: 'walkability, transit and cultural depth'
  }[persona];
  var pageDesc;
  if (budgetMode) {
    pageDesc = 'Budget-friendly '+cityName+' neighbourhoods for '+PERSONA_TITLE_NOUN[persona].toLowerCase()+'. '+nHoods+' areas re-ranked with cost as the primary factor. Updated '+DATA_UPDATED+'.';
  } else {
    // June 2026: answer-first. The verdict (#1 hood + score) now LEADS the
    // snippet instead of being truncated off the end at 155 chars.
    pageDesc = top1.name+' is our #1 of '+nHoods+' '+cityName+' neighbourhoods for '+PERSONA_TITLE_NOUN[persona].toLowerCase()+' ('+top1.score+'/100), ranked on '+factorEmphasis+'. Updated '+DATA_UPDATED+'.';
  }
  pageDesc = pageDesc.substring(0, 155);

  // ── HTML ──────────────────────────────────────────────────────────────────
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
  +'<meta charset="UTF-8"/>\n'
  +'<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
  +'<title>'+esc(pageTitle)+'</title>\n'
  +'<meta name="description" content="'+esc(pageDesc)+'"/>\n'
  +'<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>\n'
  +'<link rel="canonical" href="https://www.localechoice.com/'+urlCityKey+'/'+persona+'/'+(budgetMode?'?budget=1':'')+'"/>\n'
  +'<link rel="alternate" type="application/json" href="https://www.localechoice.com/api/data/'+urlCityKey+'" title="JSON data for '+esc(cityName)+'"/>\n'
  +'<meta property="og:title" content="'+esc(pageTitle)+'"/>\n'
  +'<meta property="og:description" content="'+esc(pageDesc)+'"/>\n'
  +'<meta property="og:url" content="https://www.localechoice.com/'+urlCityKey+'/'+persona+'/'+(budgetMode?'?budget=1':'')+'"/>\n'
  +'<meta property="og:type" content="article"/>\n'
  +'<meta property="og:site_name" content="LocaleChoice"/>\n'
  +'<meta name="twitter:card" content="summary_large_image"/>\n'
  +'<meta name="author" content="LocaleChoice"/>\n'
  +'<script type="application/ld+json">'+JSON.stringify(faqSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(itemListSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(articleSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(speakableSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(bcSchema)+'</script>\n'
  +'<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'
  +'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'
  +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500;1,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Mono:wght@500&display=swap" rel="stylesheet"/>\n'
  +'<style>\n'
  +'*{box-sizing:border-box;margin:0;padding:0}\n'
  +'body{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf8f3;color:#162030;line-height:1.65;-webkit-font-smoothing:antialiased}\n'
  +'.h1,.faq-q,.rank-name,.verdict-line{font-family:"Playfair Display",Georgia,serif}\n'
  +'.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n'
  +'.logo{font-size:17px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:.01em}\n'
  +'.logo em{font-style:italic;color:#bfa040}\n'
  +'.rr-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-decoration:none}\n'
  +'.hero{background:linear-gradient(135deg,#162030 0%,#0f1a24 60%,#1f2d44 100%);padding:40px 20px 48px;position:relative;overflow:hidden}\n'
  +'.hero::before{content:\"\";position:absolute;inset:0;background-image:radial-gradient(circle at 15% 25%,rgba(191,160,64,.08) 0%,transparent 50%),radial-gradient(circle at 85% 70%,rgba(212,185,90,.06) 0%,transparent 50%);pointer-events:none}\n'
  +'.hero::after{content:attr(data-glyph);position:absolute;top:50%;right:5%;transform:translateY(-50%);font-family:"Playfair Display",Georgia,serif;font-style:italic;font-weight:700;font-size:220px;line-height:1;color:rgba(191,160,64,.045);pointer-events:none;letter-spacing:-.04em;display:none}\n'
  +'@media(min-width:760px){.hero::after{display:block}}\n'
  +'.hero-inner{position:relative;z-index:1;max-width:1080px;margin:0 auto}\n'
  +'.hero.hero-photo{padding:80px 20px 56px;background:#162030}\n'
  +'.hero-photo-bg{position:absolute;inset:0;z-index:0;overflow:hidden}\n'
  +'.hero-photo-bg img{width:100%;height:100%;object-fit:cover;filter:brightness(.55) saturate(1.05)}\n'
  +'.hero-photo-bg::after{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,32,48,.15) 0%,rgba(22,32,48,.55) 60%,rgba(22,32,48,.92) 100%)}\n'
  +'.hero.hero-photo::after{display:none}\n'
  +'.hero-photo-credit{position:absolute;bottom:8px;right:12px;z-index:2;font-family:"DM Mono",monospace;font-size:9px;color:rgba(247,244,238,.45);letter-spacing:.04em}\n'
  +'.hero-photo-credit a{color:inherit;text-decoration:none}\n'
  +'.hero-photo-credit a:hover{color:#d4b95a}\n'
  +'.crumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px}\n'
  +'.crumb-link{font-size:13px;font-weight:500;color:rgba(255,255,255,.4);text-decoration:none}\n'
  +'.crumb-link:hover{color:rgba(255,255,255,.75)}\n'
  +'.crumb-sep{font-size:13px;color:rgba(255,255,255,.2)}\n'
  +'.crumb-current{font-size:14px;font-weight:500;color:rgba(255,255,255,.85)}\n'
  +'.h1{font-size:clamp(28px,4.5vw,40px);font-weight:700;color:#fff;line-height:1.02;letter-spacing:-.02em;margin-bottom:12px;text-transform:none}\n'
  +'.h1 em{font-style:italic;color:#bfa040;font-weight:500;display:block;font-size:.55em;margin-top:8px;letter-spacing:-.005em;text-transform:none}\n'
  +'.hero-summary{font-size:13px;color:rgba(255,255,255,.55);font-family:monospace;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;line-height:1.5}\n'
  +'.container{max-width:820px;margin:0 auto;padding:28px 20px}\n'
  +'h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#888;margin-bottom:14px}\n'
  +'.tldr-block{background:#fff;border-left:4px solid #bfa040;padding:22px 26px;margin-bottom:28px;border-radius:0 10px 10px 0;box-shadow:0 1px 3px rgba(22,32,48,.04)}\n'
  +'.tldr-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#bfa040;margin-bottom:10px;font-family:"DM Mono","DM Sans",monospace}\n'
  +'.verdict-line{font-size:17px;font-weight:500;color:#162030;line-height:1.45;margin-bottom:10px;letter-spacing:-.005em}\n'
  +'.tldr-detail{font-size:13.5px;color:rgba(22,32,48,.65);line-height:1.7}\n'
  +'.score-explain{font-size:12.5px;color:#5d5645;line-height:1.55;margin:14px 0 16px;padding:10px 12px;background:#faf8f3;border-left:2px solid #bfa040;border-radius:0 4px 4px 0;font-style:italic}\n'
  +'.explain-link{color:#162030;text-decoration:none;border-bottom:0.5px solid rgba(22,32,48,.3);font-style:normal;font-weight:500;white-space:nowrap;margin-left:4px}\n'
  +'.explain-link:hover{border-bottom-color:#162030}\n'
  +'.nav-link{color:rgba(255,255,255,.75);text-decoration:none;font-size:13px;font-weight:500;padding:6px 12px;border-radius:6px;transition:all .15s;letter-spacing:.01em}\n'
  +'.nav-link:hover{color:#fff;background:rgba(255,255,255,.06)}\n'
  +'.budget-toggle-wrap{margin:0 0 22px}\n'
  +'.budget-toggle{display:inline-flex;align-items:center;gap:10px;padding:11px 16px;border-radius:10px;background:#fff;border:1px solid rgba(22,32,48,.10);text-decoration:none;color:#162030;transition:all .15s;box-shadow:0 1px 2px rgba(22,32,48,.02);max-width:100%}\n'
  +'.budget-toggle:hover{border-color:#bfa040;transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,32,48,.06)}\n'
  +'.budget-toggle.on{background:#2c5f4a;border-color:#2c5f4a;color:#fff;box-shadow:0 2px 6px rgba(44,95,74,.20)}\n'
  +'.budget-toggle.on:hover{background:#234d3c;border-color:#234d3c}\n'
  +'.budget-dot{width:8px;height:8px;border-radius:50%;background:#ccc;flex-shrink:0;transition:background .15s}\n'
  +'.budget-toggle.on .budget-dot{background:#bfa040;box-shadow:0 0 0 3px rgba(191,160,64,.25)}\n'
  +'.budget-lbl{font-size:13px;font-weight:600;letter-spacing:.01em;flex-shrink:0}\n'
  +'.budget-state{font-family:"DM Mono",monospace;font-size:10px;font-weight:500;letter-spacing:.08em;margin-left:4px;padding:2px 7px;border-radius:4px;background:rgba(22,32,48,.06);color:#666;text-transform:uppercase}\n'
  +'.budget-toggle.on .budget-state{background:rgba(255,255,255,.18);color:#fff}\n'
  +'.budget-hint{font-size:12px;color:#888;border-left:1px solid rgba(22,32,48,.10);padding-left:10px;line-height:1.3}\n'
  +'.budget-toggle.on .budget-hint{color:rgba(255,255,255,.78);border-left-color:rgba(255,255,255,.20)}\n'
  +'@media(max-width:560px){.budget-hint{display:none}}\n'
  +'.rank-row{display:flex;align-items:center;gap:14px;padding:18px 22px;background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;margin-bottom:8px;text-decoration:none;color:inherit;transition:all .2s;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.rank-row:hover{border-color:#bfa040;transform:translateY(-1px);box-shadow:0 6px 16px rgba(22,32,48,.06)}\n'
  +'.rank-medal{width:36px;font-weight:700;text-align:center;color:rgba(22,32,48,.4);flex-shrink:0;font-family:"DM Mono",monospace}\n'
  +'.rank-main{flex:1;min-width:0}\n'
  +'.rank-name{font-size:18px;font-weight:700;color:#162030;margin-bottom:3px;letter-spacing:-.005em}\n'
  +'.rank-sub{font-size:13px;color:rgba(22,32,48,.6);line-height:1.5;margin-bottom:6px}\n'
  +'.rank-pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}\n'
  +'.rank-score{font-size:24px;font-weight:700;line-height:1;flex-shrink:0;min-width:36px;text-align:right}\n'
  +'.persona-pill{display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:99px;background:#fafaf8;border:0.5px solid #e8e8e4;color:#444;font-size:12.5px;font-weight:600;text-decoration:none;margin:0 4px 4px 0}\n'
  +'.persona-pill:hover{border-color:#bfa040;background:#fff}\n'
  +'.related-cities-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}\n'
  +'.related-city-card{display:block;padding:14px 16px;background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:8px;text-decoration:none;transition:all .15s;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.related-city-card:hover{border-color:#bfa040;transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,32,48,.06)}\n'
  +'.related-city-name{font-family:"Playfair Display",Georgia,serif;font-size:16px;font-weight:500;color:#162030;letter-spacing:-.005em;margin-bottom:2px}\n'
  +'.related-city-country{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(22,32,48,.5)}\n'
  +'.faq-list{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;overflow:hidden;margin-bottom:24px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.faq-item{padding:18px 24px;border-bottom:0.5px solid rgba(22,32,48,.05)}\n'
  +'.faq-item:last-child{border-bottom:none}\n'
  +'.faq-q{font-size:16px;font-weight:500;color:#162030;margin-bottom:7px;letter-spacing:-.005em}\n'
  +'.faq-a{font-size:13.5px;color:rgba(22,32,48,.65);line-height:1.7}\n'
  +'.cta-strip{background:#162030;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px}\n'
  +'.method-link{display:block;text-align:center;font-size:11px;color:#999;margin-bottom:18px;text-decoration:none}\n'
  +'footer{background:#162030;padding:24px 20px;text-align:center;margin-top:4px}\n'
  +'@media(max-width:600px){.rank-pills{display:none}.container{padding:18px}}\n'
  +'</style>\n</head>\n<body>\n'
  +'<nav class="nav"><a href="/" class="logo">Locale<em>Choice</em></a><div style="display:flex;gap:6px;align-items:center"><a href="/methodology" class="nav-link">Methodology</a><a href="/'+urlCityKey+'" class="rr-btn">All '+esc(cityName)+' &#x2192;</a></div></nav>\n'
  +(function(){
    var img = CITY_IMAGES[cityKey] || CITY_IMAGES[urlCityKey];
    if (img && img.url) {
      var credit = img.wikipediaUrl ? '<div class="hero-photo-credit">Image: <a href="'+esc(img.wikipediaUrl)+'" target="_blank" rel="noopener">Wikipedia</a></div>' : '';
      return '<div class="hero hero-photo" data-glyph="'+esc(cityName.charAt(0))+'">'
        +'<div class="hero-photo-bg"><img src="'+esc(img.url)+'" alt="'+esc(cityName)+'" loading="eager"/></div>'
        +credit
        +'<div class="hero-inner">\n'
        +'<div class="crumb">'
          +'<a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">&rsaquo;</span>'
          +'<a class="crumb-link" href="/'+urlCityKey+'">'+esc(cityName)+'</a><span class="crumb-sep">&rsaquo;</span>'
          +'<span class="crumb-current">For '+esc(personaNoun)+'</span></div>\n'
        +'<h1 class="h1">'+esc(cityName)+' for<br><em>'+esc(personaNoun)+'</em></h1>\n'
        +'<div class="hero-summary">'+esc(ranked.length+' neighbourhoods ranked · weighted for '+verb.factors)+'</div>\n'
        +'</div></div>\n';
    }
    return '<div class="hero" data-glyph="'+esc(cityName.charAt(0))+'"><div class="hero-inner">\n'
      +'<div class="crumb">'
        +'<a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">&rsaquo;</span>'
        +'<a class="crumb-link" href="/'+urlCityKey+'">'+esc(cityName)+'</a><span class="crumb-sep">&rsaquo;</span>'
        +'<span class="crumb-current">For '+esc(personaNoun)+'</span></div>\n'
      +'<h1 class="h1">'+esc(cityName)+' for<br><em>'+esc(personaNoun)+'</em></h1>\n'
      +'<div class="hero-summary">'+esc(ranked.length+' neighbourhoods ranked · weighted for '+verb.factors)+'</div>\n'
      +'</div></div>\n';
  })()
  +'<div class="container">\n'

  // TL;DR
  +'<div class="tldr-block">\n'
  +'<div class="tldr-label">'+PERSONA_EMOJI[persona]+' The verdict</div>\n'
  +'<p class="verdict-line">'+esc(verdict)+'</p>\n'
  +(top1Why ? '<p class="tldr-detail">'+esc(top1Why)+'</p>\n' : '')
  +'</div>\n'

  // Budget toggle
  +'<div class="budget-toggle-wrap">'
  + (budgetMode
      ? '<a href="/'+urlCityKey+'/'+persona+'/" class="budget-toggle on" title="Showing affordable neighbourhoods first \u2014 click to switch off">'
        + '<span class="budget-dot"></span>'
        + '<span class="budget-lbl">Budget mode <span class="budget-state">ON</span></span>'
        + '<span class="budget-hint">Re-ranked by affordability</span>'
        + '</a>'
      : '<a href="/'+urlCityKey+'/'+persona+'/?budget=1" class="budget-toggle" title="Re-rank to prioritise affordable neighbourhoods">'
        + '<span class="budget-dot"></span>'
        + '<span class="budget-lbl">Budget mode <span class="budget-state">OFF</span></span>'
        + '<span class="budget-hint">Travelling on a budget? Re-rank by affordability</span>'
        + '</a>'
    )
  +'</div>\n'

  // Ranked list
  +'<h2>The '+esc(ranked.length+' '+cityName+' neighbourhoods ranked for '+personaNoun.toLowerCase()+(budgetMode?' \u00b7 budget mode':''))+'</h2>\n'
  +'<div class="score-explain">'+esc(weightExplanation(persona, budgetMode))+' <a href="/methodology" class="explain-link">See methodology &#x2192;</a></div>\n'
  +rankRows
  +'<p style="font-size:11px;color:#aaa;margin-top:14px;margin-bottom:24px">Scores 0–100. Data last updated '+DATA_UPDATED+'. Click any neighbourhood for the full guide.</p>\n'

  // Other personas
  +'<h2>Same city, different traveller</h2>\n'
  +'<div style="margin-bottom:24px">'+otherPersonas+'</div>\n'

  // Same persona, other cities (programmatic internal linking)
  +personaCitiesHtml

  // FAQ
  +'<h2>Frequently asked</h2>\n'
  +'<div class="faq-list">'+faqHtml+'</div>\n'

  // CTA
  +'<div class="cta-strip">\n'
  +'<div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:5px">Stay in '+esc(top1.name)+'</div>\n'
  +'<div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px">Our #1 pick for '+esc(personaNoun.toLowerCase())+' in '+esc(cityName)+'</div>\n'
  +'<a href="https://www.booking.com/searchresults.html?ss='+encodeURIComponent(top1.name+' '+cityName)+'&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored" style="display:inline-block;padding:11px 26px;border-radius:99px;background:#bfa040;color:#162030;font-size:14px;font-weight:700;text-decoration:none">&#x1F3E8; Find hotels in '+esc(top1.name)+' &rarr;</a>\n'
  +'</div>\n'

  +'<a href="/methodology" class="method-link">&#x1F4CA; How LocaleChoice scores neighbourhoods &rarr;</a>\n'
  +'</div>\n'
  +'<footer>\n'
  +'<div style="font-size:16px;font-weight:900;color:#fff">Locale<em style="font-style:italic;color:#bfa040">Choice</em></div>\n'
  +'<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:10px">&copy; 2026 LocaleChoice &middot; <a href="/methodology" style="color:rgba(255,255,255,.4);text-decoration:none">Methodology</a> &middot; Data updated '+DATA_UPDATED+'</div>\n'
  +'</footer>\n'
  +'</body>\n</html>';
}

var KEY_MAP={
  'dusseldorf':'d\xfcsseldorf','malmo':'malm\xf6',
  'san-sebastian':'san_sebastian',
  'palma-mallorca':'palma_mallorca',
  'cluj-napoca':'cluj_napoca',
  'luxembourg-city':'luxembourg_city',
  'heraklion-crete':'heraklion_(crete)',
  'heraklion_crete':'heraklion_(crete)'
};

module.exports = function handler(req, res) {
  var cityKey = String(req.query.city||'').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];
  if (!cityKey) return res.status(400).send('Missing city');

  var cityData = scores.cities[cityKey];
  if (!cityData) return res.status(404).send('City not found: '+cityKey);

  var persona = String(req.query.persona||'').toLowerCase().trim();
  if (PERSONAS.indexOf(persona) < 0) return res.status(404).send('Invalid persona: '+persona);
  var budgetMode = String(req.query.budget||'') === '1';

  try {
    var html = generatePage(cityKey, cityData, persona, budgetMode);
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('persona.js error:', err.message, err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};
