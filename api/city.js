const scores   = require('../roamly_scores.json');
const insights = require('../roamly_insights.json');

// ── Helpers ────────────────────────────────────────────────────────────────
const PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
const PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
const PERSONA_EMOJI  = {solo:'&#x1F9ED;',family:'&#x1F46A;',foodie:'&#x1F37D;',culture:'&#x1F3DB;'};
const PERSONAS = ['solo','family','foodie','culture'];

function calcScore(hood, p) {
  var w = PERSONA_WEIGHTS[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(hood[f]||60)*w[f];},0));
}
function ranked(hoods, p) {
  return Object.keys(hoods)
    .map(function(n){return Object.assign({name:n},hoods[n],{score:calcScore(hoods[n],p)});})
    .sort(function(a,b){return b.score-a.score;});
}
function sc(s){return s>=80?'#1a7a4a':s>=65?'#2d6a9f':s>=50?'#b07d2a':'#8b3a3a';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── City intros ────────────────────────────────────────────────────────────
var INTROS = {
  lisbon:'Lisbon is one of Europe\'s most rewarding cities to explore on foot — but where you stay defines your entire experience. Bairro Alto leads for solo travellers and foodies while Estrela is the clear choice for families.',
  barcelona:'Barcelona\'s neighbourhoods are wildly different in character. El Born suits solo explorers and foodies. Eixample offers families a logical grid. Gracia gives culture seekers a village feel within the city.',
  copenhagen:'Copenhagen rewards those who choose their base carefully. Vesterbro is the city\'s undisputed food neighbourhood. Norrebro is Copenhagen\'s most creative and multicultural area. Frederiksberg suits families.',
  paris:'Paris is a city of arrondissements, each with a distinct personality. Le Marais ranks highest for solo travellers. Saint-Germain is the cultural heartland. Bastille leads for foodies.',
  rome:'Rome\'s neighbourhood choice dramatically affects how much you walk versus commute. Trastevere scores 85 for walkability. Testaccio is the insider food neighbourhood.',
  amsterdam:'Amsterdam\'s Jordaan scores 92 for walkability — the highest in the city. De Pijp is Amsterdam\'s food neighbourhood. Oud-West offers families a quieter base.',
  berlin:'Kreuzberg is Berlin\'s cultural and creative heart. Prenzlauer Berg suits families. Charlottenburg offers the city\'s most elegant dining and shopping.',
  vienna:'Innere Stadt puts you in the Habsburg heart. Neubau is Vienna\'s creative neighbourhood. Leopoldstadt is emerging as the city\'s most interesting food area.',
  prague:'Vinohrady is where locals actually live. Zizkov is Prague\'s bohemian neighbourhood. Holesovice is the creative district with DOX contemporary art centre.',
  london:'South Bank puts you on the cultural mile with Tate Modern and Borough Market. Shoreditch suits solo explorers. Richmond suits families.',
  madrid:'Malasana is the city\'s creative neighbourhood. La Latina has the best tapas bars in Spain. Salamanca is Madrid\'s upscale district for fine dining.',
  budapest:'For solo travellers and foodies, District VII is the clear choice. District XIII suits local residential life. District I has the castle and Buda views.'
};

// ── Main generator ─────────────────────────────────────────────────────────
function generatePage(cityKey, cityData) {
  var cityName = cityData.name;
  var country  = cityData.country || '';
  var hoods    = cityData.neighbourhoods;
  var intro    = INTROS[cityKey] || (cityName + ' has ' + Object.keys(hoods).length + ' distinct neighbourhoods scored across walkability, food, safety, vibe and cost. Data updated May 2026.');
  var soloRank = ranked(hoods, 'solo');

  // ── Comparison table ────────────────────────────────────────────────────
  var tableRows = soloRank.map(function(h,i) {
    var ps = {};
    PERSONAS.forEach(function(p){ps[p]=calcScore(hoods[h.name],p);});
    return '<tr style="border-bottom:1px solid #f0f0ec">'
      + '<td style="padding:9px 12px;font-weight:500">' + (i+1) + '. ' + esc(h.name) + '</td>'
      + PERSONAS.map(function(p){return '<td style="padding:9px 12px;text-align:center;font-weight:700;color:'+sc(ps[p])+'">'+ps[p]+'</td>';}).join('')
      + '</tr>';
  }).join('');

  // ── Bar helper ──────────────────────────────────────────────────────────
  function bar(f, val) {
    var labels = {walk:'Walk',food:'Food',vibe:'Vibe',safety:'Safety',transit:'Transit',cost:'Cost',family:'Family'};
    return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0">'
      + '<span style="font-size:10px;color:#888;width:46px;flex-shrink:0;text-transform:uppercase;letter-spacing:.04em">' + labels[f] + '</span>'
      + '<div style="flex:1;height:5px;background:#ebebeb;border-radius:3px">'
      + '<div style="width:' + val + '%;height:5px;background:' + sc(val) + ';border-radius:3px"></div></div>'
      + '<span style="font-size:11px;color:#666;width:24px;text-align:right">' + val + '</span>'
      + '</div>';
  }

  // ── Neighbourhood deep-dives ─────────────────────────────────────────────
  var hoodCards = soloRank.map(function(h) {
    var ins       = insights[cityKey + '/' + h.name + '/solo']   || {};
    var insFam    = insights[cityKey + '/' + h.name + '/family'] || {};
    var ps        = {}; PERSONAS.forEach(function(p){ps[p]=calcScore(hoods[h.name],p);});

    var pills = PERSONAS.map(function(p) {
      return '<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:99px;background:#f4f4f2;font-size:11px;color:' + sc(ps[p]) + ';margin:2px">'
        + PERSONA_EMOJI[p] + ' ' + PERSONA_LABELS[p] + ': <strong>' + ps[p] + '</strong></span>';
    }).join('');

    var bars = ['walk','food','vibe','safety','transit','cost','family'].map(function(f){return bar(f,h[f]||0);}).join('');

    var why    = ins.best_for   || '';
    var notFor = ins.not_for    || '';
    var day    = ins.day_sketch || '';
    var li     = ins.local_insight || {};
    var watch  = ins.watch_out  || '';
    var lg     = ins.logistics  || {};
    var famBest= insFam.best_for || '';

    var foodItems  = (ins.highlights && ins.highlights.food)    || [];
    var cultItems  = (ins.highlights && ins.highlights.culture) || [];
    var beachItems = (ins.highlights && ins.highlights.beaches) || [];

    function itemRow(icon, name, note, badge) {
      return '<div style="display:flex;gap:8px;padding:7px 10px;background:#fafaf8;border-radius:7px;border:1px solid #f0f0ec;margin:4px 0;font-size:12px">'
        + '<div style="flex:1"><div style="font-weight:600;color:#1a1a1a">' + esc(name) + (badge||'') + '</div>'
        + '<div style="color:#777;margin-top:1px">' + esc(note) + '</div></div></div>';
    }

    var foodHtml = foodItems.filter(function(f){return f&&f.name;}).map(function(f) {
      return '<div style="display:flex;gap:8px;padding:7px 10px;background:#fafaf8;border-radius:7px;border:1px solid #f0f0ec;margin:4px 0;font-size:12px">'
        + '<div style="flex:1"><div style="font-weight:600">' + esc(f.name) + '</div>'
        + '<div style="color:#777;margin-top:1px">' + esc(f.note) + '</div></div>'
        + '<div style="color:#888;flex-shrink:0">' + esc(f.price||'') + '</div></div>';
    }).join('');

    var cultHtml = cultItems.filter(function(c){return c&&c.name;}).map(function(c) {
      var fb = c.free===true
        ? ' <span style="font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 5px;border-radius:99px">Free</span>'
        : c.free===false ? ' <span style="font-size:10px;background:#fce4e4;color:#c62828;padding:1px 5px;border-radius:99px">Paid</span>' : '';
      return itemRow('', c.name + fb, c.note, '');
    }).join('');

    var beachHtml = beachItems.filter(function(b){return b&&b.name&&b.name!=='null';}).map(function(b) {
      return itemRow('', b.name, b.note, '');
    }).join('');

    var lgHtml = '';
    if (lg.airport_transfer || lg.getting_around) {
      lgHtml = '<div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-top:10px;font-size:12px">'
        + (lg.airport_transfer ? '<div style="margin:3px 0"><strong>Airport:</strong> ' + esc(lg.airport_transfer) + '</div>' : '')
        + (lg.getting_around   ? '<div style="margin:3px 0"><strong>Getting around:</strong> ' + esc(lg.getting_around) + '</div>' : '')
        + (lg.best_base_for && lg.best_base_for.length
            ? '<div style="margin:3px 0"><strong>Day trips:</strong> ' + lg.best_base_for.map(esc).join(' &middot; ') + '</div>' : '')
        + '</div>';
    }

    function secLbl(txt) {
      return '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin:14px 0 8px;padding-bottom:5px;border-bottom:1px solid #f0f0ec">' + txt + '</div>';
    }

    return '<article id="' + esc(h.name.toLowerCase().replace(/[\s\/]+/g,'-')) + '"'
      + ' itemscope itemtype="https://schema.org/TouristDestination"'
      + ' style="border:1px solid #e8e8e4;border-radius:12px;padding:22px;margin-bottom:20px;background:#fff">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">'
      + '<div><h2 itemprop="name" style="font-size:21px;font-weight:700;margin:0 0 6px;color:#1a1a1a">' + esc(h.name) + '</h2>'
      + '<meta itemprop="containedInPlace" content="' + esc(cityName) + ', ' + esc(country) + '"/>'
      + '<div style="display:flex;flex-wrap:wrap;gap:3px">' + pills + '</div></div>'
      + '<div style="text-align:center;flex-shrink:0">'
      + '<div style="font-size:34px;font-weight:900;color:' + sc(h.score) + ';line-height:1">' + h.score + '</div>'
      + '<div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em">/100 solo</div>'
      + '</div></div>'
      + '<div style="margin:14px 0">' + bars + '</div>'
      + (why    ? '<div style="background:#f0f4ff;border-left:3px solid #3b5bdb;padding:10px 14px;border-radius:0 7px 7px 0;font-size:13px;line-height:1.6;margin-bottom:8px">' + esc(why) + '</div>' : '')
      + (notFor ? '<div style="background:#fff0f0;border-left:3px solid #e03131;padding:8px 12px;border-radius:0 7px 7px 0;font-size:12px;margin-bottom:8px">&#x26A0; <strong>Not ideal if:</strong> ' + esc(notFor) + '</div>' : '')
      + (famBest? '<div style="background:#f0fff4;border-left:3px solid #2e7d32;padding:8px 12px;border-radius:0 7px 7px 0;font-size:12px;margin-bottom:8px"><strong>For families:</strong> ' + esc(famBest) + '</div>' : '')
      + (day    ? secLbl('&#x2600; A day here') + '<p style="font-size:13px;color:#555;line-height:1.6;margin:0">' + esc(day) + '</p>' : '')
      + (li.text? '<div style="background:#1a2030;border-radius:8px;padding:12px 14px;margin:12px 0">'
                + '<div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#bfa040;margin-bottom:4px">&#x1F4CD; Local insight &middot; ' + esc(li.type||'') + '</div>'
                + '<div style="font-size:13px;color:rgba(255,255,255,.85);font-style:italic;line-height:1.5">' + esc(li.text) + '</div></div>' : '')
      + (foodHtml  ? secLbl('&#x1F37D; Where to eat')   + foodHtml  : '')
      + (cultHtml  ? secLbl('&#x1F3DB; What to see')    + cultHtml  : '')
      + (beachHtml ? secLbl('&#x1F3D6; Beaches')        + beachHtml : '')
      + (lgHtml    ? secLbl('&#x1F5FA; Getting around') + lgHtml    : '')
      + (watch && watch !== 'null' ? '<div style="background:#fff8e1;border-left:3px solid #f9a825;padding:8px 12px;border-radius:0 7px 7px 0;font-size:12px;margin-top:10px">&#x26A1; ' + esc(watch) + '</div>' : '')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">'
      + '<a href="/?city=' + esc(cityKey) + '&persona=solo" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:99px;background:#bfa040;color:#162030;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.03em">Ranked Recommendation &#x2192;</a>'
      + '<a href="https://www.booking.com/searchresults.html?ss=' + encodeURIComponent(h.name + ' ' + cityName) + '&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:99px;background:#f0f0ec;color:#444;text-decoration:none;font-size:12px;font-weight:500">&#x1F3E8; See hotels in ' + esc(h.name) + '</a>'
      + '</div></article>';
  }).join('');

  // ── FAQs ────────────────────────────────────────────────────────────────
  var soloTop   = soloRank[0];
  var famTop    = ranked(hoods,'family')[0];
  var foodTop   = ranked(hoods,'foodie')[0];
  var safest    = Object.entries(hoods).sort(function(a,b){return b[1].safety-a[1].safety;})[0];

  var faqs = [
    {q:'What is the best neighbourhood to stay in ' + cityName + '?',
     a:'It depends on your travel style. For solo explorers, ' + soloTop.name + ' ranks #1 with a combined score of ' + soloTop.score + '/100. For families, ' + famTop.name + ' leads with a safety score of ' + famTop.safety + '/100. For foodies, ' + foodTop.name + ' scores ' + foodTop.food + '/100 for food. LocaleChoice scores all ' + Object.keys(hoods).length + ' neighbourhoods across 7 factors and ranks them for your persona.'},
    {q:'Is ' + soloTop.name + ' a good area to stay in ' + cityName + '?',
     a:soloTop.name + ' is the top-ranked neighbourhood in ' + cityName + ' for solo explorers, scoring ' + soloTop.score + '/100. Walk score ' + soloTop.walk + '/100, food score ' + soloTop.food + '/100, vibe score ' + soloTop.vibe + '/100.'},
    {q:'Which area of ' + cityName + ' is best for families?',
     a:famTop.name + ' is the top-ranked neighbourhood in ' + cityName + ' for families, with a safety score of ' + famTop.safety + '/100 and family score of ' + famTop.family + '/100.'},
    {q:'What is the safest neighbourhood in ' + cityName + '?',
     a:safest[0] + ' has the highest safety score in ' + cityName + ' at ' + safest[1].safety + '/100, based on LocaleChoice editorial safety research.'},
    {q:'How does LocaleChoice rank ' + cityName + ' neighbourhoods?',
     a:'LocaleChoice scores each ' + cityName + ' neighbourhood across 7 factors: walkability (OpenStreetMap), transit access (Google Places), food scene (Google Places ratings), family-friendliness (OSM parks), safety (editorial), cost (editorial) and vibe (editorial). Data last updated May 2026.'}
  ];

  var faqSchema = {
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.map(function(f){return {'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}};})
  };
  var itemListSchema = {
    '@context':'https://schema.org','@type':'ItemList',
    name:'Best neighbourhoods in ' + cityName,
    description: cityName + ' neighbourhoods ranked by data. Updated May 2026.',
    numberOfItems: soloRank.length,
    itemListElement: soloRank.map(function(h,i){
      return {'@type':'ListItem',position:i+1,name:h.name,url:'https://www.localechoice.com/' + cityKey + '#' + h.name.toLowerCase().replace(/[\s\/]+/g,'-')};
    })
  };
  var breadcrumbSchema = {
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'LocaleChoice',item:'https://www.localechoice.com/'},
      {'@type':'ListItem',position:2,name:'Best neighbourhoods in ' + cityName,item:'https://www.localechoice.com/' + cityKey}
    ]
  };

  var faqHtml = faqs.map(function(f){
    return '<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" style="border-bottom:1px solid #f0f0ec;padding:14px 0">'
      + '<h3 itemprop="name" style="font-size:15px;font-weight:600;margin:0 0 6px;color:#1a1a1a">' + esc(f.q) + '</h3>'
      + '<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">'
      + '<p itemprop="text" style="font-size:13px;color:#555;line-height:1.6;margin:0">' + esc(f.a) + '</p>'
      + '</div></div>';
  }).join('');

  var otherCities = Object.keys(scores.cities).filter(function(k){return k!==cityKey;}).slice(0,16)
    .map(function(k){return '<a href="/' + k + '" style="font-size:12px;color:rgba(255,255,255,.35);text-decoration:none">' + scores.cities[k].name + '</a>';}).join('');

  var personaTabs = PERSONAS.map(function(p){
    return '<a href="/?city=' + cityKey + '&persona=' + p + '" style="display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:99px;border:1.5px solid rgba(255,255,255,.2);color:rgba(255,255,255,.65);text-decoration:none;font-size:12px;background:rgba(255,255,255,.05);font-weight:600">'
      + PERSONA_EMOJI[p] + ' ' + PERSONA_LABELS[p] + '</a>';
  }).join('');

  // ── Final HTML ──────────────────────────────────────────────────────────
  return '<!DOCTYPE html>\n'
  + '<html lang="en">\n<head>\n'
  + '<meta charset="UTF-8"/>\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
  + '<title>Best Neighbourhoods in ' + esc(cityName) + ' 2026 — Ranked by Data | LocaleChoice</title>\n'
  + '<meta name="description" content="Where to stay in ' + esc(cityName) + '? LocaleChoice scores all ' + Object.keys(hoods).length + ' neighbourhoods across walkability, food, safety, vibe and cost — ranked for solo travellers, families, foodies and culture seekers. Data updated May 2026."/>\n'
  + '<meta name="robots" content="index,follow"/>\n'
  + '<link rel="canonical" href="https://www.localechoice.com/' + cityKey + '"/>\n'
  + '<meta property="og:title" content="Best Neighbourhoods in ' + esc(cityName) + ' 2026 | LocaleChoice"/>\n'
  + '<meta property="og:description" content="Where to stay in ' + esc(cityName) + '? All ' + Object.keys(hoods).length + ' neighbourhoods scored and ranked for your travel style. Data updated May 2026."/>\n'
  + '<meta property="og:url" content="https://www.localechoice.com/' + cityKey + '"/>\n'
  + '<meta property="og:type" content="article"/>\n'
  + '<meta property="og:site_name" content="LocaleChoice"/>\n'
  + '<meta name="twitter:card" content="summary_large_image"/>\n'
  + '<script type="application/ld+json">' + JSON.stringify(faqSchema) + '</script>\n'
  + '<script type="application/ld+json">' + JSON.stringify(itemListSchema) + '</script>\n'
  + '<script type="application/ld+json">' + JSON.stringify(breadcrumbSchema) + '</script>\n'
  + '<style>\n'
  + '*{box-sizing:border-box;margin:0;padding:0}\n'
  + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fafaf8;color:#1a1a1a;line-height:1.6}\n'
  + '.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n'
  + '.logo{font-size:18px;font-weight:900;color:#fff;text-decoration:none;letter-spacing:.01em}\n'
  + '.logo em{font-style:italic;color:#bfa040}\n'
  + '.rr-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}\n'
  + '.rr-btn:hover{background:#d4b44a}\n'
  + '.hero{background:#162030;padding:28px 20px 32px}\n'
  + '.crumb{font-size:11px;color:rgba(255,255,255,.35);font-family:monospace;letter-spacing:.05em;margin-bottom:10px}\n'
  + '.crumb a{color:rgba(255,255,255,.35);text-decoration:none}\n'
  + 'h1{font-size:clamp(24px,4vw,38px);font-weight:900;color:#fff;text-transform:uppercase;line-height:.95;letter-spacing:-.01em;margin-bottom:10px}\n'
  + 'h1 em{font-style:italic;color:#bfa040;text-transform:none}\n'
  + '.hero-sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:16px}\n'
  + '.p-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}\n'
  + '.container{max-width:860px;margin:0 auto;padding:24px 20px}\n'
  + '.intro{background:#fff;border-radius:10px;border:1px solid #e8e8e4;padding:16px 20px;margin-bottom:22px;font-size:14px;color:#444;line-height:1.7}\n'
  + '.sec-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #e8e8e4}\n'
  + 'table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e8e8e4;font-size:13px;margin-bottom:8px}\n'
  + 'th{background:#f4f4f2;padding:9px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#666;font-weight:700}\n'
  + 'th:first-child{text-align:left}\n'
  + 'td{border-bottom:1px solid #f4f4f2}\n'
  + '.method{background:#fff;border:1px solid #e8e8e4;border-radius:10px;padding:18px 20px;margin-bottom:16px}\n'
  + '.factors{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}\n'
  + '.factor{background:#f4f4f2;border-radius:5px;padding:4px 10px;font-size:11px;color:#555}\n'
  + '.cta-box{background:#162030;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px}\n'
  + '.cta-p{display:inline-block;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:12px;text-decoration:none;font-weight:700;cursor:pointer;letter-spacing:.03em;margin:3px}\n'
  + '.cta-p:hover{background:#d4b44a}\n'
  + '.faq{background:#fff;border:1px solid #e8e8e4;border-radius:10px;padding:18px 20px;margin-bottom:16px}\n'
  + 'footer{background:#162030;padding:28px 20px;text-align:center;margin-top:8px}\n'
  + '.ft-cities{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:12px 0}\n'
  + '@media(max-width:600px){.container{padding:16px}}\n'
  + '</style>\n</head>\n<body>\n'

  // NAV
  + '<nav class="nav">\n'
  + '<a href="/" class="logo">Locale<em>Choice</em></a>\n'
  + '<a href="/?city=' + esc(cityKey) + '&persona=solo" class="rr-btn">Ranked Recommendation &#x2192;</a>\n'
  + '</nav>\n'

  // HERO
  + '<div class="hero">\n<div class="container" style="padding-top:0;padding-bottom:0">\n'
  + '<div class="crumb"><a href="/">LocaleChoice</a> &rsaquo; <a href="/">Europe</a> &rsaquo; ' + esc(cityName) + '</div>\n'
  + '<h1>Best neighbourhoods<br>in <em>' + esc(cityName) + '</em></h1>\n'
  + '<div class="hero-sub">' + Object.keys(hoods).length + ' neighbourhoods &middot; scored across 7 factors &middot; data updated May 2026</div>\n'
  + '<div class="p-tabs">' + personaTabs + '</div>\n'
  + '</div>\n</div>\n'

  // MAIN CONTENT
  + '<div class="container">\n'
  + '<p class="intro">' + esc(intro) + '</p>\n'

  + '<div class="sec-lbl">All neighbourhoods &mdash; ranked by persona</div>\n'
  + '<table>\n<thead><tr>\n'
  + '<th style="text-align:left">Neighbourhood</th>\n'
  + PERSONAS.map(function(p){return '<th>' + PERSONA_EMOJI[p] + ' ' + PERSONA_LABELS[p] + '</th>';}).join('\n')
  + '\n</tr></thead>\n<tbody>' + tableRows + '</tbody>\n</table>\n'
  + '<p style="font-size:11px;color:#aaa;margin:6px 0 0;text-align:right">Data updated May 2026 &middot; Powered by OpenStreetMap &amp; Google Places</p>\n'

  + '<div class="sec-lbl">Neighbourhood deep-dives</div>\n'
  + hoodCards

  + '<div class="method">\n'
  + '<h3 style="font-size:15px;font-weight:600;margin-bottom:8px">How LocaleChoice scores neighbourhoods</h3>\n'
  + '<p style="font-size:13px;color:#555;margin-bottom:10px;line-height:1.6">Each neighbourhood is scored across 7 factors using real data, then weighted differently per traveller persona to produce personalised rankings.</p>\n'
  + '<div class="factors">'
  + '<span class="factor">&#x1F6B6; Walk &mdash; OpenStreetMap</span>'
  + '<span class="factor">&#x1F687; Transit &mdash; Google Places</span>'
  + '<span class="factor">&#x1F37D; Food &mdash; Google Places</span>'
  + '<span class="factor">&#x1F46A; Family &mdash; OSM parks</span>'
  + '<span class="factor">&#x1F6E1; Safety &mdash; editorial</span>'
  + '<span class="factor">&#x1F4B0; Cost &mdash; editorial</span>'
  + '<span class="factor">&#x2728; Vibe &mdash; editorial</span>'
  + '</div>\n'
  + '<p style="font-size:11px;color:#aaa;margin-top:10px">Data last updated May 2026. Sources: OpenStreetMap contributors, Google Places API, editorial curation.</p>\n'
  + '</div>\n'

  + '<div class="cta-box">\n'
  + '<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">See your personalised ranking</div>\n'
  + '<div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:14px">Switch between personas &mdash; we rank all ' + Object.keys(hoods).length + ' ' + esc(cityName) + ' neighbourhoods for your travel style</div>\n'
  + '<div>' + PERSONAS.map(function(p){return '<a class="cta-p" href="/?city=' + cityKey + '&persona=' + p + '">' + PERSONA_EMOJI[p] + ' ' + PERSONA_LABELS[p] + '</a>';}).join('') + '</div>\n'
  + '<div style="margin-top:14px"><a href="https://www.booking.com/searchresults.html?ss=' + encodeURIComponent(cityName) + '&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored" style="display:inline-block;padding:9px 22px;border-radius:99px;background:rgba(255,255,255,.1);color:#fff;font-size:13px;font-weight:600;text-decoration:none;border:1.5px solid rgba(255,255,255,.2)">&#x1F3E8; Browse all hotels in ' + esc(cityName) + ' on Booking.com &rarr;</a></div>\n'
  + '</div>\n'

  + '<div class="faq" itemscope itemtype="https://schema.org/FAQPage">\n'
  + '<h2 style="font-size:17px;font-weight:700;margin-bottom:4px">Frequently asked questions</h2>\n'
  + '<p style="font-size:12px;color:#aaa;margin-bottom:14px">About neighbourhoods in ' + esc(cityName) + '</p>\n'
  + faqHtml
  + '</div>\n'

  + '</div>\n'

  // FOOTER
  + '<footer>\n'
  + '<div style="font-size:16px;font-weight:900;color:#fff">Locale<em style="font-style:italic;color:#bfa040">Choice</em></div>\n'
  + '<div class="ft-cities">' + otherCities + '</div>\n'
  + '<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:8px">&copy; 2026 LocaleChoice &middot; 110 cities &middot; 384 neighbourhoods &middot; Data updated May 2026</div>\n'
  + '</footer>\n'
  + '</body>\n</html>';
}

// ── Key map ────────────────────────────────────────────────────────────────
var KEY_MAP = {'dusseldorf':'düsseldorf','malmo':'malmö','heraklion_crete':'heraklion_(crete)'};

// ── Vercel handler ─────────────────────────────────────────────────────────
module.exports = function handler(req, res) {
  var cityKey = String(req.query.city || '').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];
  if (!cityKey) return res.status(400).send('Missing city');

  var cityData = scores.cities[cityKey];
  if (!cityData) return res.status(404).send('City not found: ' + cityKey);

  try {
    var html = generatePage(cityKey, cityData);
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch(err) {
    console.error('city.js error:', err.message, err.stack);
    return res.status(500).send('Error generating page: ' + err.message);
  }
};
