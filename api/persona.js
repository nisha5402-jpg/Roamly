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

var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
var PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
var PERSONA_EMOJI  = {solo:'&#x1F9ED;',family:'&#x1F46A;',foodie:'&#x1F37D;',culture:'&#x1F3DB;'};
var PERSONAS = ['solo','family','foodie','culture'];

// Persona-specific title + meta phrasing for high search-intent matching
var PERSONA_TITLE_NOUN = {
  solo:    'Solo Travellers',
  family:  'Families',
  foodie:  'Food Lovers',
  culture: 'Culture Seekers'
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

function calcScore(h, p) {
  var w = PERSONA_WEIGHTS[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0));
}
function sc(s){return s>=80?'#1a7a4a':s>=65?'#2d6a9f':s>=50?'#b07d2a':'#8b3a3a';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s\/]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-').replace(/^\-|\-$/g,'');}
function urlKey(k){return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[()]/g,'').replace(/[\s\/]+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'');}

function bar(lbl, val) {
  return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0">'
    +'<span style="font-size:9px;color:#aaa;width:48px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em;font-weight:500">'+lbl+'</span>'
    +'<div style="flex:1;height:4px;background:#e8e8e4;border-radius:3px;min-width:30px">'
    +'<div style="width:'+val+'%;height:4px;background:'+sc(val)+';border-radius:3px"></div></div>'
    +'<span style="font-size:11px;font-weight:600;color:'+sc(val)+';width:22px;text-align:right">'+val+'</span>'
    +'</div>';
}

function generatePage(cityKey, cityData, persona) {
  var cityName = cityData.name;
  var country  = cityData.country || '';
  var hoods    = cityData.neighbourhoods;
  var urlCityKey = urlKey(cityKey);

  // Rank all hoods for this persona
  var ranked = Object.keys(hoods).map(function(n){
    return {name:n, h:hoods[n], score:calcScore(hoods[n],persona)};
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

  // ── HTML ──────────────────────────────────────────────────────────────────
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
  +'<meta charset="UTF-8"/>\n'
  +'<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
  +'<title>Best '+esc(cityName)+' Neighbourhoods for '+esc(personaNoun)+' (2026) | LocaleChoice</title>\n'
  +'<meta name="description" content="'+esc((verdict + ' Ranked across ' + verb.factors + '.').substring(0, 155))+'"/>\n'
  +'<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>\n'
  +'<link rel="canonical" href="https://www.localechoice.com/'+urlCityKey+'/'+persona+'/"/>\n'
  +'<link rel="alternate" type="application/json" href="https://www.localechoice.com/api/data/'+urlCityKey+'" title="JSON data for '+esc(cityName)+'"/>\n'
  +'<meta property="og:title" content="Best '+esc(cityName)+' Neighbourhoods for '+esc(personaNoun)+' (2026)"/>\n'
  +'<meta property="og:description" content="'+esc(verdict)+'"/>\n'
  +'<meta property="og:url" content="https://www.localechoice.com/'+urlCityKey+'/'+persona+'/"/>\n'
  +'<meta property="og:type" content="article"/>\n'
  +'<meta property="og:site_name" content="LocaleChoice"/>\n'
  +'<meta name="twitter:card" content="summary_large_image"/>\n'
  +'<meta name="author" content="LocaleChoice"/>\n'
  +'<script type="application/ld+json">'+JSON.stringify(faqSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(itemListSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(articleSchema)+'</script>\n'
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
  +'.crumb-link:hover{color:rgba(255,255,255,.75)}\n'
  +'.crumb-sep{font-size:13px;color:rgba(255,255,255,.2)}\n'
  +'.crumb-current{font-size:14px;font-weight:500;color:rgba(255,255,255,.85)}\n'
  +'.h1{font-size:clamp(24px,4.4vw,36px);font-weight:900;color:#fff;text-transform:uppercase;line-height:1;letter-spacing:-.01em;margin-bottom:10px}\n'
  +'.h1 em{font-style:italic;color:#bfa040;text-transform:none}\n'
  +'.hero-summary{font-size:13px;color:rgba(255,255,255,.55);font-family:monospace;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;line-height:1.5}\n'
  +'.container{max-width:820px;margin:0 auto;padding:28px 20px}\n'
  +'h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#888;margin-bottom:14px}\n'
  +'.tldr-block{background:#fff;border-left:4px solid #bfa040;padding:18px 22px;margin-bottom:24px;border-radius:0 12px 12px 0;box-shadow:0 1px 0 rgba(0,0,0,.04)}\n'
  +'.tldr-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#bfa040;margin-bottom:8px}\n'
  +'.verdict-line{font-size:15.5px;font-weight:600;color:#1a1a1a;line-height:1.5;margin-bottom:8px}\n'
  +'.tldr-detail{font-size:13.5px;color:#444;line-height:1.6}\n'
  +'.rank-row{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#fff;border:0.5px solid #e8e8e4;border-radius:12px;margin-bottom:8px;text-decoration:none;color:inherit;transition:border-color .15s}\n'
  +'.rank-row:hover{border-color:#bfa040;box-shadow:0 1px 3px rgba(0,0,0,.04)}\n'
  +'.rank-medal{width:32px;font-weight:700;text-align:center;color:#888;flex-shrink:0}\n'
  +'.rank-main{flex:1;min-width:0}\n'
  +'.rank-name{font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:3px}\n'
  +'.rank-sub{font-size:12.5px;color:#666;line-height:1.45;margin-bottom:6px}\n'
  +'.rank-pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}\n'
  +'.rank-score{font-size:24px;font-weight:700;line-height:1;flex-shrink:0;min-width:36px;text-align:right}\n'
  +'.persona-pill{display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:99px;background:#fafaf8;border:0.5px solid #e8e8e4;color:#444;font-size:12.5px;font-weight:600;text-decoration:none;margin:0 4px 4px 0}\n'
  +'.persona-pill:hover{border-color:#bfa040;background:#fff}\n'
  +'.faq-list{background:#fff;border:0.5px solid #e8e8e4;border-radius:12px;overflow:hidden;margin-bottom:24px}\n'
  +'.faq-item{padding:16px 22px;border-bottom:0.5px solid #f0f0ec}\n'
  +'.faq-item:last-child{border-bottom:none}\n'
  +'.faq-q{font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:6px}\n'
  +'.faq-a{font-size:13px;color:#555;line-height:1.65}\n'
  +'.cta-strip{background:#162030;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px}\n'
  +'.method-link{display:block;text-align:center;font-size:11px;color:#999;margin-bottom:18px;text-decoration:none}\n'
  +'footer{background:#162030;padding:24px 20px;text-align:center;margin-top:4px}\n'
  +'@media(max-width:600px){.rank-pills{display:none}.container{padding:18px}}\n'
  +'</style>\n</head>\n<body>\n'
  +'<nav class="nav"><a href="/" class="logo">Locale<em>Choice</em></a><a href="/'+urlCityKey+'" class="rr-btn">All '+esc(cityName)+' &#x2192;</a></nav>\n'
  +'<div class="hero"><div class="container" style="padding-top:0;padding-bottom:0">\n'
  +'<div class="crumb">'
    +'<a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">&rsaquo;</span>'
    +'<a class="crumb-link" href="/'+urlCityKey+'">'+esc(cityName)+'</a><span class="crumb-sep">&rsaquo;</span>'
    +'<span class="crumb-current">For '+esc(personaNoun)+'</span></div>\n'
  +'<h1 class="h1">'+esc(cityName)+' for<br><em>'+esc(personaNoun)+'</em></h1>\n'
  +'<div class="hero-summary">'+esc(ranked.length+' neighbourhoods ranked · weighted for '+verb.factors)+'</div>\n'
  +'</div></div>\n'
  +'<div class="container">\n'

  // TL;DR
  +'<div class="tldr-block">\n'
  +'<div class="tldr-label">'+PERSONA_EMOJI[persona]+' The verdict</div>\n'
  +'<p class="verdict-line">'+esc(verdict)+'</p>\n'
  +(top1Why ? '<p class="tldr-detail">'+esc(top1Why)+'</p>\n' : '')
  +'</div>\n'

  // Ranked list
  +'<h2>The '+esc(ranked.length+' '+cityName+' neighbourhoods ranked for '+personaNoun.toLowerCase())+'</h2>\n'
  +rankRows
  +'<p style="font-size:11px;color:#aaa;margin-top:14px;margin-bottom:24px">Scores 0–100, weighted for '+verb.factors+'. Click any neighbourhood for the full guide. <a href="/methodology" style="color:#bfa040;text-decoration:none">Methodology &rarr;</a></p>\n'

  // Other personas
  +'<h2>Same city, different traveller</h2>\n'
  +'<div style="margin-bottom:24px">'+otherPersonas+'</div>\n'

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
  +'<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:10px">&copy; 2026 LocaleChoice &middot; <a href="/methodology" style="color:rgba(255,255,255,.4);text-decoration:none">Methodology</a> &middot; Data updated May 2026</div>\n'
  +'</footer>\n'
  +'</body>\n</html>';
}

var KEY_MAP={'dusseldorf':'d\xfcsseldorf','malmo':'malm\xf6','heraklion_crete':'heraklion_(crete)'};

module.exports = function handler(req, res) {
  var cityKey = String(req.query.city||'').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];
  if (!cityKey) return res.status(400).send('Missing city');

  var cityData = scores.cities[cityKey];
  if (!cityData) return res.status(404).send('City not found: '+cityKey);

  var persona = String(req.query.persona||'').toLowerCase().trim();
  if (PERSONAS.indexOf(persona) < 0) return res.status(404).send('Invalid persona: '+persona);

  try {
    var html = generatePage(cityKey, cityData, persona);
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('persona.js error:', err.message, err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};
