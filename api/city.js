
var scores   = require('../roamly_scores.json');
var insights = require('../roamly_insights.json');
var related = require('./related_cities.js');

// Optional city hero images from Wikipedia (run fetch_city_images.js to generate).
// If the file doesn't exist yet, fall back to {} so designed gradient hero is used.
var CITY_IMAGES = {};
try { CITY_IMAGES = require('./city_images.js'); } catch(e) { /* designed hero fallback */ }

// ─── Centralised "data updated" date ──────────────────────────────────────
// Update this single constant when refreshing data.
// Used in: page footers, meta descriptions, FAQ answers, methodology blocks.
var DATA_UPDATED = 'May 2026';
var DATA_UPDATED_ISO = '2026-05-01';

var PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
// Budget mode weights — derived from original index.html logic.
// Cost weight increases to 0.25 across all personas, other factors reduce proportionally.
// This causes a complete re-ranking that prioritises affordable neighbourhoods.
var PERSONA_WEIGHTS_BUDGET = {
  solo:    {walk:0.25,transit:0.15,safety:0.15,food:0.10,vibe:0.10,family:0.00,cost:0.25},
  family:  {walk:0.08,transit:0.17,safety:0.23,food:0.04,vibe:0.03,family:0.20,cost:0.25},
  foodie:  {walk:0.15,transit:0.10,safety:0.10,food:0.30,vibe:0.10,family:0.00,cost:0.25},
  culture: {walk:0.25,transit:0.20,safety:0.10,food:0.05,vibe:0.10,family:0.05,cost:0.25}
};
var PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
var PERSONA_EMOJI  = {solo:'&#x1F9ED;',family:'&#x1F46A;',foodie:'&#x1F37D;',culture:'&#x1F3DB;'};
var PERSONAS = ['solo','family','foodie','culture'];

function calcScore(h, p, budgetMode) {
  var w = (budgetMode ? PERSONA_WEIGHTS_BUDGET : PERSONA_WEIGHTS)[p];
  return Math.round(Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0));
}
function ranked(hoods, p, budgetMode) {
  return Object.keys(hoods).map(function(n){
    return Object.assign({name:n},hoods[n],{score:calcScore(hoods[n],p,budgetMode)});
  }).sort(function(a,b){return b.score-a.score;});
}

// ─── Score transparency: human-readable weight breakdown per persona ──────
// Returns a sentence like "This 83 is weighted toward food (35%) and
// walkability (20%) for foodies." Used below each score to fight the
// "arbitrary number" perception flagged in E-E-A-T reviews.
var FACTOR_LABELS = {
  walk:'walkability', transit:'transit', food:'food', family:'family-friendliness',
  safety:'safety', cost:'affordability', vibe:'vibe'
};
function weightExplanation(persona, budgetMode, score) {
  var w = (budgetMode ? PERSONA_WEIGHTS_BUDGET : PERSONA_WEIGHTS)[persona];
  var entries = Object.keys(w).map(function(k){return {k:k,v:w[k]};}).sort(function(a,b){return b.v-a.v;});
  var top1 = entries[0], top2 = entries[1];
  var personaWord = {solo:'solo travellers', family:'families', foodie:'foodies', culture:'culture seekers'}[persona];
  var modeNote = budgetMode ? ' in budget mode' : '';
  return 'This '+score+' is weighted toward '+FACTOR_LABELS[top1.k]+' ('+Math.round(top1.v*100)+'%) and '
    +FACTOR_LABELS[top2.k]+' ('+Math.round(top2.v*100)+'%) for '+personaWord+modeNote+'.';
}
function sc(s){return s>=80?'#1a7a4a':s>=65?'#2d6a9f':s>=50?'#b07d2a':'#8b3a3a';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Slugify hood names → URL-safe segments. Keep identical to api/neighbourhood.js.
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s\/]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-').replace(/^\-|\-$/g,'');}
// City key → URL-safe form. Inverse of KEY_MAP. Used for all outbound links.
function urlKey(k){return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[()]/g,'').replace(/[\s\/]+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'');}

var INTROS = {
  lisbon:'Lisbon is one of Europe\'s most rewarding cities — but where you stay defines your entire experience. Bairro Alto leads for solo travellers and foodies. Estrela is the clear choice for families. Each of the 12 neighbourhoods scores differently across walkability, food, safety and vibe.',
  barcelona:'Barcelona\'s neighbourhoods are wildly different in character. El Born suits solo explorers and foodies with its medieval lanes. Eixample offers families a logical grid. Gracia gives culture seekers a village feel within the city.',
  copenhagen:'Copenhagen rewards those who choose their base carefully. Vesterbro is the city\'s undisputed food neighbourhood — the Meatpacking District alone justifies it. Norrebro is the most creative and multicultural area. Frederiksberg suits families with its royal gardens.',
  paris:'Paris is a city of arrondissements, each with a distinct personality. Le Marais ranks highest for solo travellers. Saint-Germain is the cultural heartland. Bastille and Oberkampf lead for foodies with the highest restaurant density.',
  rome:'Rome\'s neighbourhood choice affects how much you walk versus commute. Trastevere scores 85 for walkability. Testaccio is the insider food neighbourhood. Prati suits families with wide streets and Vatican proximity.',
  amsterdam:'Jordan scores 92 for walkability — the highest in Amsterdam. De Pijp is the food neighbourhood with Albert Cuyp Market. Oud-West offers families a quieter residential base.',
  berlin:'Kreuzberg is Berlin\'s cultural and creative heart with vibe score 88. Prenzlauer Berg suits families with parks and calm streets. Charlottenburg offers the most elegant dining and shopping.',
  vienna:'Innere Stadt puts you in the Habsburg heart with walk score 88. Neubau is Vienna\'s creative neighbourhood. Leopoldstadt is emerging as the most interesting food area.',
  prague:'Vinohrady is where locals actually live — tree-lined streets, excellent cafes, safe and walkable. Zizkov is Prague\'s bohemian neighbourhood. Holesovice is the creative district with DOX art centre.',
  london:'South Bank puts you on the cultural mile with Tate Modern and Borough Market. Shoreditch suits solo explorers. Richmond suits families with the Thames and Richmond Park.',
  madrid:'Malasana is the creative neighbourhood with independent shops and bars. La Latina has the best tapas bars in Spain. Salamanca is Madrid\'s upscale district for fine dining.',
  budapest:'For solo travellers and foodies, District VII is the clear choice with the ruin bars. District XIII suits local residential life. District I has the castle and stunning Buda views.'
};

function getKeyInsight(cityHoods, hoodName, h, ins) {
  var li = ins.local_insight || {};
  var vals = Object.values(cityHoods);
  var cityMaxVibe   = Math.max.apply(null,vals.map(function(x){return x.vibe||0;}));
  var cityMaxFood   = Math.max.apply(null,vals.map(function(x){return x.food||0;}));
  var cityMaxWalk   = Math.max.apply(null,vals.map(function(x){return x.walk||0;}));
  var cityMaxSafety = Math.max.apply(null,vals.map(function(x){return x.safety||0;}));
  var cityMinCost   = Math.min.apply(null,vals.map(function(x){return x.cost||50;}));
  var famTop = Object.keys(cityHoods).sort(function(a,b){
    return calcScore(cityHoods[b],'family')-calcScore(cityHoods[a],'family');
  })[0];
  if (li.type && ['contrast','secret','timing'].indexOf(li.type)>=0 && li.text)
    return {type:'local', text:li.text.length>95?li.text.substring(0,92)+'...':li.text};
  if ((h.vibe||0)===cityMaxVibe && h.vibe>=80)
    return {type:'stat', text:'Highest vibe in the city \u2014 '+h.vibe+'/100'};
  if ((h.food||0)===cityMaxFood && h.food>=70)
    return {type:'stat', text:'Top food neighbourhood \u2014 food score '+h.food+'/100'};
  if ((h.walk||0)===cityMaxWalk && h.walk>=80)
    return {type:'stat', text:'Most walkable in the city \u2014 walk score '+h.walk+'/100'};
  if ((h.safety||0)===cityMaxSafety && h.safety>=75)
    return {type:'stat', text:'Safest neighbourhood in the city \u2014 safety '+h.safety+'/100'};
  if (hoodName===famTop)
    return {type:'family', text:'#1 for families \u2014 safety '+(h.safety||0)+'/100, family score '+(h.family||0)+'/100'};
  if ((h.cost||50)===cityMinCost && h.cost<=30)
    return {type:'warn', text:'Most expensive area \u2014 but central and highly walkable'};
  if (li.text)
    return {type:'local', text:li.text.length>95?li.text.substring(0,92)+'...':li.text};
  var bf = ins.best_for||'';
  if (bf){var s=bf.split('.')[0]+'.';return {type:'stat',text:s.length>95?s.substring(0,92)+'...':s};}
  return null;
}

function buildKeyInsight(cityHoods, hoodName, h, ins) {
  var ki = getKeyInsight(cityHoods, hoodName, h, ins);
  if (!ki) return '';
  var ICONS = {stat:'&#x2728;',local:'&#x1F4CD;',family:'&#x2665;',warn:'&#x26A0;'};
  return '<div class="ki ki-'+ki.type+'">'
    +'<span style="flex-shrink:0;font-size:13px">'+(ICONS[ki.type]||'&#x2728;')+'</span>'
    +'<span>'+esc(ki.text)+'</span></div>';
}

function bar(lbl, val) {
  return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">'
    +'<span style="font-size:10px;color:#aaa;width:52px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em;font-weight:500">'+lbl+'</span>'
    +'<div style="flex:1;height:5px;background:#e8e8e4;border-radius:3px;min-width:40px">'
    +'<div style="width:'+val+'%;height:5px;background:'+sc(val)+';border-radius:3px"></div></div>'
    +'<span style="font-size:12px;font-weight:600;color:'+sc(val)+';width:26px;text-align:right">'+val+'</span>'
    +'</div>';
}

function generatePage(cityKey, cityData, persona, budgetMode) {
  persona = persona || 'solo';
  budgetMode = !!budgetMode;
  var cityName = cityData.name;
  var country  = cityData.country || '';
  var hoods    = cityData.neighbourhoods;
  var intro    = INTROS[cityKey] || (cityName+' has '+Object.keys(hoods).length+' distinct neighbourhoods scored across walkability, food, safety, vibe and cost. Data updated '+DATA_UPDATED+'.');
  var soloRank = ranked(hoods,'solo', budgetMode);
  var personaRank = ranked(hoods, persona, budgetMode);

  // ── Comparison table ─────────────────────────────────────────────────────
  var pBests = {};
  PERSONAS.forEach(function(p){ pBests[p] = ranked(hoods,p,budgetMode)[0].name; });
  var tableRows = personaRank.map(function(h,i) {
    var ps = {};
    PERSONAS.forEach(function(p){ps[p]=calcScore(hoods[h.name],p,budgetMode);});
    var cells = PERSONAS.map(function(p){
      var isBest   = pBests[p] === h.name;
      var isActive = p === persona;
      var color    = ps[p]>=80?'#1a7a4a':ps[p]>=65?'#2d6a9f':ps[p]>=50?'#b07d2a':'#8b3a3a';
      var bg       = isActive ? 'background:rgba(22,32,48,.03);' : '';
      var weight   = isActive ? 'font-weight:800;' : 'font-weight:700;';
      return '<td style="color:'+color+';'+bg+weight+'">'+ps[p]+(isBest?'<span style="font-size:9px;color:#bfa040;margin-left:2px;vertical-align:top">&bull;</span>':'')+'</td>';
    }).join('');
    return '<tr><td style="color:#1a1a1a;font-weight:500"><a href="/'+urlKey(cityKey)+'/'+slugify(h.name)+'/" style="color:#1a1a1a;text-decoration:none;border-bottom:0.5px solid #ddd">'+(i+1)+'. '+esc(h.name)+'</a></td>'+cells+'</tr>';
  }).join('');
  var compareCards = tableRows; // used below

  // ── FAQ ──────────────────────────────────────────────────────────────────
  var soloTop  = soloRank[0];
  var famTop   = ranked(hoods,'family',budgetMode)[0];
  var foodTop  = ranked(hoods,'foodie',budgetMode)[0];
  var safest   = Object.entries(hoods).sort(function(a,b){return b[1].safety-a[1].safety;})[0];
  var faqs = [
    {q:'Where should first-time visitors stay in '+cityName+'?',
     a:'For first-time visitors, '+soloTop.name+' is the top recommendation — central, walkable and easy to navigate. It scores '+soloTop.score+'/100 with walk '+soloTop.walk+'/100, food '+soloTop.food+'/100 and vibe '+soloTop.vibe+'/100. Refine the ranking for families, foodies or culture seekers.'},
    {q:'What is the best neighbourhood to stay in '+cityName+'?',
     a:'It depends on your travel style. For first-time visitors and solo explorers, '+soloTop.name+' ranks #1 with a score of '+soloTop.score+'/100. For families, '+famTop.name+' leads with safety score '+famTop.safety+'/100. For foodies, '+foodTop.name+' scores '+foodTop.food+'/100 for food.'},
    {q:'Is '+soloTop.name+' a good area to stay in '+cityName+'?',
     a:soloTop.name+' is the top-ranked neighbourhood in '+cityName+' for solo explorers with a combined score of '+soloTop.score+'/100. Walk score '+soloTop.walk+'/100, food score '+soloTop.food+'/100, vibe score '+soloTop.vibe+'/100.'},
    {q:'Which area of '+cityName+' is best for families?',
     a:famTop.name+' is the top family neighbourhood in '+cityName+', with safety score '+famTop.safety+'/100 and family score '+famTop.family+'/100.'},
    {q:'What is the safest neighbourhood in '+cityName+'?',
     a:safest[0]+' has the highest safety score in '+cityName+' at '+safest[1].safety+'/100.'},
    {q:'How does LocaleChoice rank '+cityName+' neighbourhoods?',
     a:'LocaleChoice scores each neighbourhood across 7 factors: walkability (OpenStreetMap), transit (Google Places), food (Google Places), family-friendliness (OSM parks), safety (editorial), cost (editorial), vibe (editorial). Data updated '+DATA_UPDATED+'.'}
  ];

  // ── Accordion hood cards ─────────────────────────────────────────────────
  var hoodCards = personaRank.map(function(h, idx) {
    var ins     = insights[cityKey+'/'+h.name+'/'+persona] || insights[cityKey+'/'+h.name+'/solo'] || {};
    var insFam  = insights[cityKey+'/'+h.name+'/family'] || {};
    var ps      = {}; PERSONAS.forEach(function(p){ps[p]=calcScore(hoods[h.name],p,budgetMode);});
    var ki      = buildKeyInsight(hoods, h.name, hoods[h.name], ins);
    var why     = ins.best_for    || '';
    var notFor  = ins.not_for     || '';
    var day     = ins.day_sketch  || '';
    var li      = ins.local_insight || {};
    var watch   = ins.watch_out   || '';
    var lg      = ins.logistics   || {};
    var famBest = insFam.best_for || '';
    var foodItems  = (ins.highlights&&ins.highlights.food)    || [];
    var cultItems  = (ins.highlights&&ins.highlights.culture) || [];
    var beachItems = (ins.highlights&&ins.highlights.beaches) || [];

    // Score pills (compact, all 4 personas)
    var pills = PERSONAS.map(function(p){
      return '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;background:#f4f4f2;font-size:11px;color:'+sc(ps[p])+';margin:2px">'
        +PERSONA_EMOJI[p]+' '+ps[p]+'</span>';
    }).join('');

    // Bars (two column inside body)
    var barsLeft  = ['walk','food','vibe'].map(function(f){
      var L={walk:'Walk',food:'Food',vibe:'Vibe'}; return bar(L[f],h[f]||0);}).join('');
    var barsRight = ['safety','transit','cost'].map(function(f){
      var L={safety:'Safety',transit:'Transit',cost:'Cost'}; return bar(L[f],h[f]||0);}).join('');

    // Food rows
    var foodHtml = foodItems.filter(function(f){return f&&f.name;}).map(function(f){
      return '<div class="item-row"><div style="flex:1"><div class="item-name">'+esc(f.name)+'</div>'
        +'<div class="item-note">'+esc(f.note)+'</div></div>'
        +'<span class="price-pill">'+esc(f.price||'')+'</span></div>';
    }).join('');

    // Culture rows
    var cultHtml = cultItems.filter(function(c){return c&&c.name;}).map(function(c){
      var fb = c.free===true ? ' <span class="free-pill">Free</span>' : c.free===false ? ' <span class="paid-pill">Paid</span>' : '';
      return '<div class="item-row"><div style="flex:1"><div class="item-name">'+esc(c.name)+fb+'</div>'
        +'<div class="item-note">'+esc(c.note)+'</div></div></div>';
    }).join('');

    // Beach rows
    var beachHtml = beachItems.filter(function(b){return b&&b.name&&b.name!=='null';}).map(function(b){
      return '<div class="item-row"><div><div class="item-name">'+esc(b.name)+'</div>'
        +'<div class="item-note">'+esc(b.note)+'</div></div></div>';
    }).join('');

    // Logistics
    var lgHtml = '';
    if (lg.airport_transfer||lg.getting_around) {
      lgHtml = '<div class="log-wrap">'
        +(lg.airport_transfer?'<div class="log-row"><span class="log-lbl">Airport</span><span class="log-val">'+esc(lg.airport_transfer)+'</span></div>':'')
        +(lg.getting_around  ?'<div class="log-row"><span class="log-lbl">Daily</span><span class="log-val">'+esc(lg.getting_around)+'</span></div>':'')
        +(lg.best_base_for&&lg.best_base_for.length
          ?'<div class="log-row"><span class="log-lbl">Day trips</span><div class="log-val"><div class="trips">'
          +lg.best_base_for.map(function(t){return '<span class="trip">'+esc(t)+'</span>';}).join('')
          +'</div></div></div>':'')
        +'</div>';
    }

    var rank = String(idx+1).padStart(2,'0');

    var thumbHtml = '';
    return '<div class="hood-item" id="h-'+esc(h.name.toLowerCase().replace(/[\s\/]+/g,'-'))+'">'
      // Header (always visible)
      +'<div class="hood-hdr" onclick="tog(this)">'
        +'<div class="hood-rank">'+rank+'</div>'
        +'<div class="hood-main">'
          +'<div class="hood-name">'+esc(h.name)+'</div>'
          +'<div class="hood-tags">'+esc((h.tags||'').toUpperCase())+'</div>'
          +ki
        +'</div>'
        +'<div class="hood-right">'
          +'<div class="hood-score-wrap">'
            +'<div class="hood-score-num" style="color:'+sc(h.score)+'">'+h.score+'</div>'
            +'<div class="hood-score-lbl">'+persona.toUpperCase()+'</div>'
          +'</div>'
          +'<span class="chevron">+</span>'
        +'</div>'
      +'</div>'
      // Body (collapsed by default)
      +'<div class="hood-body">'
        +'<div class="body-div"></div>'
        // Two-col: why + scores
        +'<div class="two-col">'
          +'<div>'
            +(why?'<div class="blk-lbl">Why it works for you</div><div class="why-blk">'+esc(why)+'</div>':'')
            +(notFor?'<div class="notfor-blk">&#x26A0; <strong>Not ideal if:</strong> '+esc(notFor)+'</div>':'')
            +(famBest?'<div class="fam-blk"><strong>For families:</strong> '+esc(famBest)+'</div>':'')
          +'</div>'
          +'<div>'
            +'<div class="blk-lbl">Score breakdown</div>'
            +'<div class="score-explain">'+esc(weightExplanation(persona, budgetMode, h.score))+' <a href="/methodology" class="explain-link">See methodology &#x2192;</a></div>'
            +'<div class="two-col" style="gap:16px">'
              +'<div>'+barsLeft+'</div>'
              +'<div>'+barsRight+'</div>'
            +'</div>'
            +'<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:3px">'+pills+'</div>'
          +'</div>'
        +'</div>'
        // Day sketch
        +(day?'<div class="blk-lbl" style="margin-top:14px">&#x2600; A day here</div>'
             +'<div class="day-blk">'+esc(day)+'</div>':'')
        // Local insight
        +(li.text?'<div class="local-blk">'
            +'<div class="local-lbl">&#x1F4CD; Local insight '
            +(li.type?'<span class="local-type">'+esc(li.type)+'</span>':'')+'</div>'
            +'<div class="local-txt">'+esc(li.text)+'</div>'
          +'</div>':'')
        // Food / Culture / Beaches in two-col
        +(foodHtml||cultHtml?'<div class="two-col" style="margin-top:14px">'
          +(foodHtml?'<div><div class="blk-lbl">&#x1F37D; Where to eat</div>'+foodHtml+'</div>':'<div></div>')
          +(cultHtml?'<div><div class="blk-lbl">&#x1F3DB; What to see</div>'+cultHtml+'</div>':'<div></div>')
          +'</div>':'')
        +(beachHtml?'<div class="blk-lbl" style="margin-top:14px">&#x1F3D6; Beaches</div>'+beachHtml:'')
        // Logistics
        +(lgHtml?'<div class="blk-lbl" style="margin-top:14px">&#x1F5FA; Getting around</div>'+lgHtml:'')
        // Watch out
        +(watch&&watch!=='null'?'<div class="watch-blk">&#x26A1; '+esc(watch)+'</div>':'')
        // Action buttons
        +'<div class="action-row">'
          +'<a class="act-primary" href="/'+urlKey(cityKey)+'/'+slugify(h.name)+'/">Full guide to '+esc(h.name)+' &#x2192;</a>'
          +'<a class="act-secondary" href="https://www.booking.com/searchresults.html?ss='+encodeURIComponent(h.name+' '+cityName)+'&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored">&#x1F3E8; See hotels in '+esc(h.name)+'</a>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');

  // ── Schemas ──────────────────────────────────────────────────────────────
  var faqSchema = {'@context':'https://schema.org','@type':'FAQPage',
    mainEntity:faqs.map(function(f){return {'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}};})};
  var listSchema = {'@context':'https://schema.org','@type':'ItemList',
    name:'Best neighbourhoods in '+cityName,
    description:cityName+' neighbourhoods ranked by data. Updated '+DATA_UPDATED+'.',
    numberOfItems:soloRank.length,
    itemListElement:soloRank.map(function(h,i){return {'@type':'ListItem',position:i+1,name:h.name,url:'https://www.localechoice.com/'+urlKey(cityKey)+'#h-'+h.name.toLowerCase().replace(/[\s\/]+/g,'-')};})};
  var bcSchema = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'LocaleChoice',item:'https://www.localechoice.com/'},
    {'@type':'ListItem',position:2,name:'Best neighbourhoods in '+cityName,item:'https://www.localechoice.com/'+urlKey(cityKey)}]};

  var faqHtml = faqs.map(function(f){
    return '<div class="faq-item">'
      +'<div class="faq-q">'+esc(f.q)+'</div>'
      +'<div class="faq-a">'+esc(f.a)+'</div>'
      +'</div>';
  }).join('');

  var footer_cities = Object.keys(scores.cities).filter(function(k){return k!==cityKey;}).slice(0,16)
    .map(function(k){return '<a href="/'+urlKey(k)+'" style="font-size:12px;color:rgba(255,255,255,.3);text-decoration:none">'+scores.cities[k].name+'</a>';}).join('');

  // ── Related cities (programmatic internal linking) ───────────────────────
  // If same-country has 3+ cities, show ONLY those (honest "More in X" header).
  // Otherwise show curated popular European cities.
  // Flagged as a key gap in Google product team review (Link Architecture 6.5/10).
  var sameCountryCities = Object.keys(scores.cities)
    .filter(function(k){ return k !== cityKey && scores.cities[k].country === cityData.country; })
    .map(function(k){ return {key:k, name:scores.cities[k].name, country:scores.cities[k].country}; });

  var relatedCities, relatedTitle;
  if (sameCountryCities.length >= 3) {
    relatedCities = sameCountryCities.slice(0, 6);
    relatedTitle = 'More in '+esc(cityData.country);
  } else {
    relatedCities = related.getRelatedCities(cityKey, scores.cities, 6);
    relatedTitle = 'Popular European cities';
  }

  var relatedCitiesHtml = '';
  if (relatedCities.length > 0) {
    relatedCitiesHtml = '<div class="related-cities">'
      + '<div class="related-cities-hdr">'
        + '<span class="related-cities-ttl">'+relatedTitle+'</span>'
        + '<span class="related-cities-sub">explore another neighbourhood guide</span>'
      + '</div>'
      + '<div class="related-cities-grid">'
      + relatedCities.map(function(rc){
          return '<a href="/'+urlKey(rc.key)+'" class="related-city-card">'
            + '<div class="related-city-name">'+esc(rc.name)+'</div>'
            + '<div class="related-city-country">'+esc(rc.country)+'</div>'
            + '</a>';
        }).join('')
      + '</div>'
      + '</div>';
  }

  var personaLinks = PERSONAS.map(function(p){
    var active = p===persona;
    return '<a href="/'+urlKey(cityKey)+'?persona='+p+'" style="display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:99px;'
      +(active ? 'border:1.5px solid #bfa040;color:#bfa040;background:rgba(191,160,64,.12)' : 'border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.55)')
      +';text-decoration:none;font-size:12px">'+PERSONA_EMOJI[p]+' '+PERSONA_LABELS[p]+'</a>';
  }).join('');

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
  +'<meta charset="UTF-8"/>\n'
  +'<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
  +'<title>'+(budgetMode?'Budget-Friendly Neighbourhoods in '+esc(cityName)+' | LocaleChoice':'Where to Stay in '+esc(cityName)+': First-Time Visitor Guide')+'</title>\n'
  +'<meta name="description" content="'+(budgetMode?'Affordable '+esc(cityName)+' neighbourhoods ranked for budget travellers. '+Object.keys(hoods).length+' areas re-ranked with cost as the primary factor.':'First time in '+esc(cityName)+'? '+Object.keys(hoods).length+' neighbourhoods ranked for first-time visitors on safety, walkability and food. Refine for families, foodies or culture.')+'"/>\n'
  +'<meta name="robots" content="index,follow"/>\n'
  +'<link rel="canonical" href="https://www.localechoice.com/'+urlKey(cityKey)+(budgetMode?'?budget=1':'')+'"/>\n'
  +'<meta property="og:title" content="'+(budgetMode?'Budget-Friendly Neighbourhoods in '+esc(cityName):'Where to Stay in '+esc(cityName)+': First-Time Visitor Guide')+'"/>\n'
  +'<meta property="og:description" content="'+(budgetMode?'Affordable '+esc(cityName)+' neighbourhoods ranked for budget travellers.':'Where to stay in '+esc(cityName)+'? All '+Object.keys(hoods).length+' neighbourhoods scored and ranked for your travel style.')+'"/>\n'
  +'<meta property="og:url" content="https://www.localechoice.com/'+urlKey(cityKey)+(budgetMode?'?budget=1':'')+'"/>\n'
  +'<meta property="og:type" content="article"/>\n'
  +'<meta property="og:site_name" content="LocaleChoice"/>\n'
  +'<meta name="twitter:card" content="summary_large_image"/>\n'
  +'<script type="application/ld+json">'+JSON.stringify(faqSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(listSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(bcSchema)+'</script>\n'
  +'<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'
  +'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'
  +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500;1,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Mono:wght@500&display=swap" rel="stylesheet"/>\n'
  +'<style>\n'
  +'*{box-sizing:border-box;margin:0;padding:0}\n'
  +'body{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf8f3;color:#162030;line-height:1.65;-webkit-font-smoothing:antialiased}\n'
  +'.h1,.hood-name,.faq-q,.cmp-table th{font-family:"Playfair Display",Georgia,serif}\n'
  +'.h1{font-weight:700;letter-spacing:-.015em}\n'
  +'.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n'
  +'.logo{font-size:17px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:.01em}\n'
  +'.logo em{font-style:italic;color:#bfa040}\n'
  +'.nav-link{color:rgba(255,255,255,.75);text-decoration:none;font-size:13px;font-weight:500;padding:6px 12px;border-radius:6px;transition:all .15s;letter-spacing:.01em}\n'
  +'.nav-link:hover{color:#fff;background:rgba(255,255,255,.06)}\n'
  +'.rr-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-decoration:none}\n'
  +'.rr-btn:hover{background:#d4b44a}\n'
  +'.hero{background:linear-gradient(135deg,#162030 0%,#0f1a24 60%,#1f2d44 100%);padding:40px 20px 48px;position:relative;overflow:hidden}\n'
  +'.hero::before{content:\"\";position:absolute;inset:0;background-image:radial-gradient(circle at 15% 25%,rgba(191,160,64,.08) 0%,transparent 50%),radial-gradient(circle at 85% 70%,rgba(212,185,90,.06) 0%,transparent 50%),radial-gradient(circle at 50% 50%,rgba(45,106,159,.05) 0%,transparent 70%);pointer-events:none}\n'
  +'.hero::after{content:attr(data-glyph);position:absolute;top:50%;right:5%;transform:translateY(-50%);font-family:"Playfair Display",Georgia,serif;font-style:italic;font-weight:700;font-size:240px;line-height:1;color:rgba(191,160,64,.045);pointer-events:none;letter-spacing:-.04em;display:none}\n'
  +'@media(min-width:760px){.hero::after{display:block}}\n'
  +'.hero-inner{position:relative;z-index:1;max-width:1080px;margin:0 auto}\n'
  // Hero with photo background
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
  +'.crumb-current{font-size:16px;font-weight:500;color:#fff;letter-spacing:-.01em}\n'
  +'.h1{font-size:clamp(28px,4.5vw,42px);font-weight:700;color:#fff;line-height:1.02;letter-spacing:-.02em;margin-bottom:10px;text-transform:none}\n'
  +'.h1 em{font-style:italic;color:#bfa040;font-weight:500;display:block;font-size:.6em;margin-top:8px;letter-spacing:-.01em}\n'
  +'.hero-meta{font-size:12px;color:rgba(255,255,255,.35);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-bottom:18px}\n'
  +'.p-row{display:flex;gap:6px;flex-wrap:wrap}\n'
  +'.p-pill{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.55);font-size:12px;text-decoration:none}\n'
  +'.p-pill:hover{border-color:#bfa040;color:#bfa040}\n'
  +'.container{max-width:820px;margin:0 auto;padding:28px 20px}\n'
  +'.intro-card{background:#fff;border-radius:10px;border:0.5px solid rgba(22,32,48,.06);padding:20px 24px;margin-bottom:32px;font-size:14.5px;color:rgba(22,32,48,.7);line-height:1.7;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.sec-hdr{display:flex;align-items:center;gap:10px;margin-bottom:14px}\n'
  +'.sec-ttl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#888;white-space:nowrap}\n'
  +'.sec-line{flex:1;height:0.5px;background:#e8e8e4}\n'
  // Compare grid
  +'.cmp-wrap{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;overflow:hidden;margin-bottom:32px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\\n'
  +'.cmp-table{width:100%;border-collapse:collapse;table-layout:fixed}\\n'
  +'.cmp-table thead tr{background:#f8f8f6;border-bottom:1.5px solid #e8e8e4}\\n'
  +'.cmp-table th{padding:10px 12px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#999}\\n'
  +'.cmp-table th:first-child{text-align:left;width:32%;padding-left:20px}\\n'
  +'.cmp-table th:not(:first-child){text-align:center;width:17%}\\n'
  +'.cmp-table td{padding:13px 12px;border-bottom:0.5px solid #f0f0ec;font-size:13px;color:#444;font-weight:500}\\n'
  +'.cmp-table td:first-child{padding-left:20px;text-align:left}\\n'
  +'.cmp-table td:not(:first-child){text-align:center;font-size:15px;font-weight:700}\\n'
  +'.cmp-table tr:last-child td{border-bottom:none}\\n'
  +'.cmp-table tbody tr:hover td{background:#fafaf8}\\n'
  +'.cmp-note{font-size:11px;color:#bbb;text-align:right;padding:8px 20px 10px;border-top:0.5px solid #f0f0ec}\\n'
  +'.budget-toggle-wrap{margin:0 0 18px}\n'
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
    +'.hood-list{display:flex;flex-direction:column;gap:3px;margin-bottom:32px}\n'
  +'.hood-item{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;overflow:hidden;transition:all .2s;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.hood-item:hover{border-color:#bfa040;transform:translateY(-1px);box-shadow:0 6px 16px rgba(22,32,48,.06)}\n'
  +'.hood-hdr{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;cursor:pointer;user-select:none}\n'
  +'.hood-rank{font-size:22px;font-weight:700;color:#ddd;font-family:monospace;min-width:34px;line-height:1.1;flex-shrink:0}\\n'

  +'.hood-main{flex:1;min-width:0}\n'
  +'.hood-name{font-size:19px;font-weight:700;color:#162030;margin-bottom:3px;letter-spacing:-.01em}\n'
  +'.hood-tags{font-size:10px;color:#aaa;font-family:monospace;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px}\n'
  // Key insight
  +'.ki{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:8px;font-size:12px;line-height:1.4;max-width:95%}\n'
  +'.ki-stat{background:#eef3ff;color:#1a5fa8;border:0.5px solid #c5d5f5}\n'
  +'.ki-local{background:#162030;color:rgba(255,255,255,.82)}\n'
  +'.ki-family{background:#edfaf2;color:#1a6b35;border:0.5px solid #b5ddc3}\n'
  +'.ki-warn{background:#fffbeb;color:#8a5e10;border:0.5px solid #f0d080}\n'
  +'.hood-right{display:flex;align-items:flex-start;gap:12px;flex-shrink:0;padding-top:2px}\n'
  +'.hood-score-wrap{text-align:center}\n'
  +'.hood-score-num{font-size:22px;font-weight:700;line-height:1}\n'
  +'.score-explain{font-size:12px;color:#5d5645;line-height:1.55;margin-bottom:10px;padding:8px 10px;background:#faf8f3;border-left:2px solid #bfa040;border-radius:0 4px 4px 0;font-style:italic}\n'
  +'.explain-link{color:#162030;text-decoration:none;border-bottom:0.5px solid rgba(22,32,48,.3);font-style:normal;font-weight:500;white-space:nowrap}\n'
  +'.explain-link:hover{border-bottom-color:#162030}\n'
  +'.hood-score-lbl{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em}\n'
  +'.chevron{font-size:14px;color:#ccc;margin-top:4px;transition:transform .2s;display:inline-block}\n'
  +'.chevron.open{transform:rotate(180deg)}\n'
  +'.hood-body{padding:0 20px 20px;display:none}\n'
  +'.hood-body.open{display:block}\n'
  +'.body-div{height:0.5px;background:#f0f0ec;margin:0 0 18px}\n'
  +'.two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}\n'
  +'.blk-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:#aaa;margin-bottom:6px}\n'
  +'.why-blk{padding:13px 15px;border-radius:8px;border-left:3px solid #3b5bdb;background:#f0f4ff;font-size:13px;line-height:1.65;color:#1a1a1a}\n'
  +'.notfor-blk{padding:10px 12px;border-radius:8px;border-left:3px solid #e03131;background:#fff0f0;font-size:12px;line-height:1.5;color:#c92a2a;margin-top:8px}\n'
  +'.fam-blk{padding:10px 12px;border-radius:8px;border-left:3px solid #2e7d32;background:#f0fff4;font-size:12px;line-height:1.5;color:#1a5c22;margin-top:8px}\n'
  +'.day-blk{font-size:13px;color:#555;line-height:1.65;margin-bottom:14px}\n'
  +'.local-blk{background:#162030;border-radius:10px;padding:13px 16px;margin:14px 0}\n'
  +'.local-lbl{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#bfa040;margin-bottom:5px;display:flex;align-items:center;gap:6px}\n'
  +'.local-type{background:rgba(191,160,64,.15);color:#bfa040;padding:1px 6px;border-radius:99px;font-size:9px}\n'
  +'.local-txt{font-size:13px;color:rgba(255,255,255,.82);font-style:italic;line-height:1.55}\n'
  +'.item-row{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#fafaf8;border-radius:8px;border:0.5px solid #f0f0ec;margin:4px 0}\n'
  +'.item-name{font-size:12px;font-weight:600;color:#1a1a1a}\n'
  +'.item-note{font-size:11px;color:#888;margin-top:1px;line-height:1.35}\n'
  +'.price-pill{font-size:11px;padding:2px 6px;border-radius:99px;background:#f4f4f2;border:0.5px solid #e8e8e4;color:#888;flex-shrink:0}\n'
  +'.free-pill{font-size:10px;padding:1px 5px;border-radius:99px;background:#e8f5e9;color:#2e7d32;margin-left:5px}\n'
  +'.paid-pill{font-size:10px;padding:1px 5px;border-radius:99px;background:#fce4e4;color:#c62828;margin-left:5px}\n'
  +'.log-wrap{background:#fafaf8;border-radius:8px;overflow:hidden}\n'
  +'.log-row{display:flex;gap:10px;padding:8px 10px;border-bottom:0.5px solid #f0f0ec;font-size:12px}\n'
  +'.log-row:last-child{border-bottom:none}\n'
  +'.log-lbl{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em;width:60px;flex-shrink:0;padding-top:1px}\n'
  +'.log-val{color:#444;line-height:1.45;flex:1}\n'
  +'.trips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}\n'
  +'.trip{font-size:11px;padding:2px 7px;border-radius:99px;background:#f0f0ec;border:0.5px solid #e8e8e4;color:#888}\n'
  +'.watch-blk{display:flex;gap:8px;padding:9px 12px;border-radius:8px;background:#fffbeb;font-size:12px;color:#8a5e10;line-height:1.45;margin-top:12px}\n'
  +'.action-row{display:flex;gap:8px;flex-wrap:wrap;padding-top:14px;border-top:0.5px solid #f0f0ec;margin-top:14px}\n'
  +'.act-primary{display:inline-flex;align-items:center;gap:5px;padding:8px 18px;border-radius:99px;background:#bfa040;color:#162030;font-size:12px;font-weight:700;text-decoration:none}\n'
  +'.act-primary:hover{background:#d4b44a}\n'
  +'.act-secondary{display:inline-flex;align-items:center;gap:5px;padding:8px 18px;border-radius:99px;border:0.5px solid #ddd;background:#fff;color:#444;font-size:12px;text-decoration:none}\n'
  +'.act-secondary:hover{border-color:#bfa040}\n'
  +'.method-card{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;padding:20px 24px;margin-bottom:24px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.related-cities{margin-bottom:28px}\n'
  +'.related-cities-hdr{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;padding-bottom:10px;border-bottom:0.5px solid rgba(22,32,48,.08)}\n'
  +'.related-cities-ttl{font-family:"Playfair Display",Georgia,serif;font-size:21px;font-weight:500;color:#162030;letter-spacing:-.005em}\n'
  +'.related-cities-sub{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(22,32,48,.45)}\n'
  +'.related-cities-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}\n'
  +'.related-city-card{display:block;padding:14px 16px;background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:8px;text-decoration:none;transition:all .15s;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.related-city-card:hover{border-color:#bfa040;transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,32,48,.06)}\n'
  +'.related-city-name{font-family:"Playfair Display",Georgia,serif;font-size:16px;font-weight:500;color:#162030;letter-spacing:-.005em;margin-bottom:2px}\n'
  +'.related-city-country{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(22,32,48,.5)}\n'
  +'.factors{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}\n'
  +'.factor{font-size:11px;padding:4px 10px;border-radius:99px;background:#f4f4f2;border:0.5px solid #e8e8e4;color:#666}\n'
  +'.faq-list{background:#fff;border:0.5px solid rgba(22,32,48,.08);border-radius:10px;overflow:hidden;margin-bottom:24px;box-shadow:0 1px 2px rgba(22,32,48,.02)}\n'
  +'.faq-item{padding:18px 22px;border-bottom:0.5px solid rgba(22,32,48,.05)}\n'
  +'.faq-item:last-child{border-bottom:none}\n'
  +'.faq-q{font-size:16px;font-weight:500;color:#162030;margin-bottom:6px;letter-spacing:-.005em}\n'
  +'.faq-a{font-size:13.5px;color:rgba(22,32,48,.65);line-height:1.65}\n'
  +'.cta-strip{background:#162030;border-radius:12px;padding:22px;text-align:center;margin-bottom:24px}\n'
  +'footer{background:#162030;padding:24px 20px;text-align:center;margin-top:4px}\n'
  +'.ft-cities{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:10px 0}\n'
  +'@media(max-width:600px){.two-col{grid-template-columns:1fr}.cc-grid{grid-template-columns:1fr}.container{padding:16px}}\n'
  +'</style>\n</head>\n<body>\n'

  +'<nav class="nav">\n'
  +'<a href="/" class="logo">Locale<em>Choice</em></a>\n'
  +'<a href="/methodology" class="nav-link">Methodology</a>\n'
  +'</nav>\n'

  +(function(){
    var img = CITY_IMAGES[cityKey] || CITY_IMAGES[urlKey(cityKey)];
    if (img && img.url) {
      var credit = img.wikipediaUrl ? '<div class="hero-photo-credit">Image: <a href="'+esc(img.wikipediaUrl)+'" target="_blank" rel="noopener">Wikipedia</a></div>' : '';
      return '<div class="hero hero-photo" data-glyph="'+esc(cityName.charAt(0))+'">'
        +'<div class="hero-photo-bg"><img src="'+esc(img.url)+'" alt="'+esc(cityName)+'" loading="eager"/></div>'
        +credit
        +'<div class="hero-inner">\n'
        +'<div class="crumb"><a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">&rsaquo;</span><a class="crumb-link" href="/">Europe</a><span class="crumb-sep">&rsaquo;</span><span class="crumb-current">'+esc(cityName)+'</span></div>\n'
        +'<div class="h1">First time in <em>'+esc(cityName)+'</em>?<br>Where to stay.</div>\n'
        +'<div class="hero-meta">'+Object.keys(hoods).length+' neighbourhoods &nbsp;&middot;&nbsp; ranked for '+PERSONA_LABELS[persona]+' &nbsp;&middot;&nbsp; data updated '+DATA_UPDATED+'</div>\n'
        +'<div class="p-row">'+personaLinks+'</div>\n'
        +'</div>\n</div>\n';
    }
    // No photo — designed gradient hero with country initial watermark
    return '<div class="hero" data-glyph="'+esc(cityName.charAt(0))+'">\n<div class="hero-inner">\n'
      +'<div class="crumb"><a class="crumb-link" href="/">LocaleChoice</a><span class="crumb-sep">&rsaquo;</span><a class="crumb-link" href="/">Europe</a><span class="crumb-sep">&rsaquo;</span><span class="crumb-current">'+esc(cityName)+'</span></div>\n'
      +'<div class="h1">First time in <em>'+esc(cityName)+'</em>?<br>Where to stay.</div>\n'
      +'<div class="hero-meta">'+Object.keys(hoods).length+' neighbourhoods &nbsp;&middot;&nbsp; ranked for '+PERSONA_LABELS[persona]+' &nbsp;&middot;&nbsp; data updated '+DATA_UPDATED+'</div>\n'
      +'<div class="p-row">'+personaLinks+'</div>\n'
      +'</div>\n</div>\n';
  })()

  +'<div class="container">\n'
  +'<p class="intro-card">'+esc(intro)+'</p>\n'

  +'<div class="budget-toggle-wrap">'
  + (budgetMode
      ? '<a href="/'+urlKey(cityKey)+'" class="budget-toggle on" title="Showing affordable neighbourhoods first \u2014 click to switch off">'
        + '<span class="budget-dot"></span>'
        + '<span class="budget-lbl">Budget mode <span class="budget-state">ON</span></span>'
        + '<span class="budget-hint">Re-ranked by affordability</span>'
        + '</a>'
      : '<a href="/'+urlKey(cityKey)+'?budget=1" class="budget-toggle" title="Re-rank to prioritise affordable neighbourhoods">'
        + '<span class="budget-dot"></span>'
        + '<span class="budget-lbl">Budget mode <span class="budget-state">OFF</span></span>'
        + '<span class="budget-hint">Travelling on a budget? Re-rank by affordability</span>'
        + '</a>'
    )
  +'</div>\n'

  +'<div class="sec-hdr"><span class="sec-ttl">All neighbourhoods'+(budgetMode?' &middot; Budget mode':'')+'</span><div class="sec-line"></div></div>\n'
  +'<div class="cmp-wrap">'
  +'<table class="cmp-table">'
  +'<thead><tr>'
  +'<th>Neighbourhood</th>'
  +PERSONAS.map(function(p){var active=p===persona;var qs=budgetMode?'?budget=1':'';return '<th style="'+(active?'color:#162030;background:rgba(22,32,48,.06)':'')+'"><a href="/'+urlKey(cityKey)+'/'+p+'/'+qs+'" style="color:inherit;text-decoration:none">'+PERSONA_EMOJI[p]+' '+PERSONA_LABELS[p].split(' ')[0]+'</a></th>';}).join('')
  +'</tr></thead>'
  +'<tbody>'+compareCards+'</tbody>'
  +'</table>'
  +'<div class="cmp-note">Data updated '+DATA_UPDATED+' &middot; Powered by OpenStreetMap &amp; Google Places</div>'
  +'</div>\n'

  +'<div class="sec-hdr"><span class="sec-ttl">Neighbourhood deep-dives</span><div class="sec-line"></div></div>\n'
  +'<div class="hood-list">'+hoodCards+'</div>\n'

  +'<div class="method-card">\n'
  +'<div class="blk-lbl">How we score</div>\n'
  +'<p style="font-size:13px;color:#555;line-height:1.6;margin-bottom:10px">Each neighbourhood is scored across 7 factors using real data, then weighted differently per traveller persona to produce personalised rankings.</p>\n'
  +'<div class="factors">'
  +'<span class="factor">&#x1F6B6; Walk &mdash; OpenStreetMap</span>'
  +'<span class="factor">&#x1F687; Transit &mdash; Google Places</span>'
  +'<span class="factor">&#x1F37D; Food &mdash; Google Places</span>'
  +'<span class="factor">&#x1F46A; Family &mdash; OSM parks</span>'
  +'<span class="factor">&#x1F6E1; Safety &mdash; editorial</span>'
  +'<span class="factor">&#x1F4B0; Cost &mdash; editorial</span>'
  +'<span class="factor">&#x2728; Vibe &mdash; editorial</span>'
  +'</div>\n'
  +'<p style="font-size:11px;color:#aaa;margin-top:8px">Data last updated '+DATA_UPDATED+' &middot; OpenStreetMap &middot; Google Places API &middot; editorial curation &middot; <a href="/methodology" style="color:#162030;border-bottom:0.5px solid rgba(22,32,48,.3);text-decoration:none">Full methodology</a></p>\n'
  +'</div>\n'

  +relatedCitiesHtml

  +'<div class="faq-list">\n'+faqHtml+'</div>\n'

  +'<div class="cta-strip">\n'
  +'<div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:5px">See your personalised ranking</div>\n'
  +'<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:14px">Switch personas &mdash; we rank all '+Object.keys(hoods).length+' '+esc(cityName)+' neighbourhoods for you</div>\n'
  +'<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px">'
  +PERSONAS.map(function(p){return '<a href="/?city='+urlKey(cityKey)+'&persona='+p+'" style="display:inline-block;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:12px;font-weight:700;text-decoration:none">'+PERSONA_LABELS[p]+'</a>';}).join('')
  +'</div>\n'
  +'<a href="https://www.booking.com/searchresults.html?ss='+encodeURIComponent(cityName)+'&aid=REPLACE_WITH_YOUR_AID" target="_blank" rel="noopener sponsored" style="display:inline-block;padding:9px 22px;border-radius:99px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:600;text-decoration:none;border:0.5px solid rgba(255,255,255,.2)">&#x1F3E8; Browse all hotels in '+esc(cityName)+' on Booking.com &rarr;</a>\n'
  +'</div>\n'

  +'</div>\n'
  +'<footer>\n'
  +'<div style="font-size:16px;font-weight:900;color:#fff">Locale<em style="font-style:italic;color:#bfa040">Choice</em></div>\n'
  +'<div class="ft-cities">'+footer_cities+'</div>\n'
  +'<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:8px">&copy; 2026 LocaleChoice &middot; 110 cities &middot; 384 neighbourhoods &middot; Data updated '+DATA_UPDATED+'</div>\n'
  +'</footer>\n'
  +'<script>\n'
  +'function tog(hdr){\n'
  +'  var body=hdr.nextElementSibling;\n'
  +'  var chev=hdr.querySelector(".chevron");\n'
  +'  var open=body.classList.contains("open");\n'
  +'  body.classList.toggle("open",!open);\n'
  +'  if(chev){chev.classList.toggle("open",!open);chev.textContent=open?"+":"-";}\n'
  +'}\n'
  +'</script>\n'
  +'</body>\n</html>';
}

var KEY_MAP={'dusseldorf':'d\xfcsseldorf','malmo':'malm\xf6','heraklion_crete':'heraklion_(crete)'};

module.exports = function handler(req,res){
  var cityKey=String(req.query.city||'').toLowerCase().trim();
  if(KEY_MAP[cityKey])cityKey=KEY_MAP[cityKey];
  if(!cityKey)return res.status(400).send('Missing city');
  var cityData=scores.cities[cityKey];
  if(!cityData)return res.status(404).send('City not found: '+cityKey);
  var persona=String(req.query.persona||'solo').toLowerCase().trim();
  if(['solo','family','foodie','culture'].indexOf(persona)<0) persona='solo';
  var budgetMode = String(req.query.budget||'') === '1';
  try{
    var html=generatePage(cityKey,cityData,persona,budgetMode);
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  }catch(err){
    console.error('city.js error:',err.message,err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};
