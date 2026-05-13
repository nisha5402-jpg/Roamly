const scores   = require('../roamly_scores.json');
const insights = require('../roamly_insights.json');

// ── Scoring ────────────────────────────────────────────────────────────────
const PERSONA_WEIGHTS = {
  solo:    {walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:  {safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:  {food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture: {walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
const PERSONA_LABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
const PERSONA_EMOJI  = {solo:'🧭',family:'👨‍👩‍👧',foodie:'🍽',culture:'🏛'};

function calcScore(hood, persona) {
  const w = PERSONA_WEIGHTS[persona];
  return Math.round(Object.keys(w).reduce((s,f) => s+(hood[f]||60)*w[f], 0));
}
function ranked(hoods, persona) {
  return Object.entries(hoods)
    .map(([name,h]) => ({name,...h,score:calcScore(h,persona)}))
    .sort((a,b) => b.score-a.score);
}
function scoreColor(s) {
  if(s>=80) return '#1a7a4a';
  if(s>=65) return '#2d6a9f';
  if(s>=50) return '#b07d2a';
  return '#8b3a3a';
}
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── City intros ────────────────────────────────────────────────────────────
const CITY_INTROS = {
  lisbon:"Lisbon is one of Europe's most rewarding cities to explore on foot — but where you stay defines your entire experience. The 12 neighbourhoods score very differently across walkability, food, safety and vibe. Bairro Alto leads for solo travellers and foodies while Estrela is the clear choice for families.",
  barcelona:"Barcelona's neighbourhoods are wildly different in character. El Born suits solo explorers and foodies with its medieval lanes and concentrated nightlife. Eixample offers families a logical grid, easy navigation and proximity to Sagrada Família. Gràcia gives culture seekers a village feel within the city.",
  copenhagen:"Copenhagen rewards those who choose their base carefully. Vesterbro is the city's undisputed food neighbourhood — the Meatpacking District alone justifies it. Nørrebro is Copenhagen's most creative and multicultural area. Frederiksberg suits families with its royal gardens and calm streets.",
  paris:"Paris is a city of arrondissements, each with a distinct personality. Le Marais ranks highest for solo travellers with walk score 91 and vibe 88. Saint-Germain is the cultural heartland for culture seekers. Bastille and Oberkampf lead for foodies with the highest independent restaurant density.",
  rome:"Rome's neighbourhood choice dramatically affects how much you walk versus commute. Trastevere scores 85 for walkability and keeps you close to authentic trattorias. Prati suits families with wide pavements and proximity to the Vatican. Testaccio is the insider food neighbourhood.",
  amsterdam:"Amsterdam's neighbourhoods cluster around the canal ring. Jordaan scores 92 for walkability — the highest in the city — and suits all personas. De Pijp is Amsterdam's food neighbourhood with Albert Cuyp Market. Oud-West offers families a quieter residential base.",
  berlin:"Berlin is a city where neighbourhood choice matters more than almost anywhere in Europe. Kreuzberg is the cultural and creative heart with vibe score 88. Prenzlauer Berg suits families with its parks and calm streets. Charlottenburg offers the city's most elegant dining and shopping.",
  vienna:"Vienna's compact centre makes neighbourhood choice about atmosphere rather than distance. Innere Stadt puts you in the Habsburg heart with walk score 88. Neubau is Vienna's creative neighbourhood with independent galleries and cafés. Leopoldstadt is emerging as the city's most interesting food area.",
  prague:"Prague's historic centre is compact but the tourist density varies enormously by neighbourhood. Vinohrady is where locals actually live — tree-lined streets, excellent cafés, safe and walkable. Žižkov is Prague's bohemian neighbourhood. Holešovice is the creative district with DOX contemporary art centre.",
  london:"London's size makes neighbourhood choice critical — staying in the wrong area adds 30-45 minutes to every journey. South Bank puts you on the cultural mile with Tate Modern, Borough Market and the Globe Theatre. Shoreditch suits solo explorers and foodies. Richmond suits families.",
  madrid:"Madrid rewards those who leave the tourist centre. Malasaña is the city's creative neighbourhood with independent shops and bars. La Latina has the best tapas bars in Spain. Salamanca is Madrid's upscale residential district for fine dining.",
  budapest:"Budapest's neighbourhoods split across the Danube. For solo travellers and foodies, District VII is the clear choice with the ruin bars. District XIII suits local residential life. District I has the castle and stunning Buda views."
};

// ── FAQ generator ──────────────────────────────────────────────────────────
function cityFAQs(cityKey, cityName, hoods) {
  const soloTop   = ranked(hoods,'solo')[0];
  const familyTop = ranked(hoods,'family')[0];
  const foodTop   = ranked(hoods,'foodie')[0];
  const safest    = Object.entries(hoods).sort((a,b)=>b[1].safety-a[1].safety)[0];
  return [
    {q:`What is the best neighbourhood to stay in ${cityName}?`,
     a:`It depends on your travel style. For solo explorers, ${soloTop.name} ranks #1 with a combined score of ${soloTop.score}/100. For families, ${familyTop.name} leads with a safety score of ${familyTop.safety}/100. For foodies, ${foodTop.name} scores ${foodTop.food}/100 for food. LocaleChoice scores all ${Object.keys(hoods).length} neighbourhoods across 7 factors and ranks them for your persona.`},
    {q:`Is ${soloTop.name} a good area to stay in ${cityName}?`,
     a:`${soloTop.name} is the top-ranked neighbourhood in ${cityName} for solo explorers, scoring ${soloTop.score}/100. Walk score ${soloTop.walk}/100, food score ${soloTop.food}/100, vibe score ${soloTop.vibe}/100. It offers strong walkability and the best local atmosphere in the city.`},
    {q:`Which area of ${cityName} is best for families?`,
     a:`${familyTop.name} is the top-ranked neighbourhood in ${cityName} for families, with a safety score of ${familyTop.safety}/100 and family score of ${familyTop.family}/100. It offers the combination of safety, walkability and family-oriented amenities that travelling with children requires.`},
    {q:`What is the safest neighbourhood in ${cityName}?`,
     a:`${safest[0]} has the highest safety score in ${cityName} at ${safest[1].safety}/100, based on LocaleChoice's editorial safety research. All ${Object.keys(hoods).length} ${cityName} neighbourhoods are scored for safety on a 0-100 scale.`},
    {q:`How does LocaleChoice rank ${cityName} neighbourhoods?`,
     a:`LocaleChoice scores each ${cityName} neighbourhood across 7 factors: walkability (OpenStreetMap), transit access (Google Places), food scene (Google Places ratings), family-friendliness (OSM parks and playgrounds), safety (editorial research), cost (editorial research) and local vibe (editorial). These 7 scores are weighted differently for each traveller persona. Data last updated May 2026.`}
  ];
}

// ── Main page generator ────────────────────────────────────────────────────
function generateCityPage(cityKey, cityData, insights) {
  const cityName = cityData.name;
  const country  = cityData.country || '';
  const hoods    = cityData.neighbourhoods;
  const intro    = CITY_INTROS[cityKey] || `${cityName} has ${Object.keys(hoods).length} distinct neighbourhoods, each scoring differently across walkability, food, safety, vibe and cost. LocaleChoice ranks them for your travel style. Data last updated May 2026.`;
  const faqs     = cityFAQs(cityKey, cityName, hoods);
  const PERSONAS = ['solo','family','foodie','culture'];
  const soloRanked = ranked(hoods,'solo');

  // ── Score bars helper
  function bars(hood) {
    const factors = ['walk','food','vibe','safety','transit','cost','family'];
    const labels  = {walk:'Walk',food:'Food',vibe:'Vibe',safety:'Safety',transit:'Transit',cost:'Cost',family:'Family'};
    return factors.map(f => `
      <div style="display:flex;align-items:center;gap:8px;margin:3px 0">
        <span style="font-size:10px;color:#888;width:46px;flex-shrink:0;text-transform:uppercase;letter-spacing:.04em">${labels[f]}</span>
        <div style="flex:1;height:5px;background:#ebebeb;border-radius:3px">
          <div style="width:${hood[f]||0}%;height:5px;background:${scoreColor(hood[f]||0)};border-radius:3px"></div>
        </div>
        <span style="font-size:11px;color:#666;width:24px;text-align:right">${hood[f]||0}</span>
      </div>`).join('');
  }

  // ── Comparison table
  const tableRows = soloRanked.map((h,i) => {
    const ps = {};
    PERSONAS.forEach(p => { ps[p] = calcScore(hoods[h.name],p); });
    return `<tr style="border-bottom:1px solid #f0f0ec">
      <td style="padding:9px 12px;font-weight:500">${i+1}. ${esc(h.name)}</td>
      ${PERSONAS.map(p=>`<td style="padding:9px 12px;text-align:center;font-weight:700;color:${scoreColor(ps[p])}">${ps[p]}</td>`).join('')}
    </tr>`;
  }).join('');

  // ── Neighbourhood deep-dives
  let hoodCards = '';
  for (const h of soloRanked) {
    const ins = insights[`${cityKey}/${h.name}/solo`]  || {};
    const insFamily = insights[`${cityKey}/${h.name}/family`] || {};
    const ps = {}; PERSONAS.forEach(p => { ps[p] = calcScore(hoods[h.name],p); });

    const pills = PERSONAS.map(p =>
      `<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:99px;background:#f4f4f2;font-size:11px;color:${scoreColor(ps[p])};margin:2px">
        ${PERSONA_EMOJI[p]} ${PERSONA_LABELS[p]}: <strong>${ps[p]}</strong>
      </span>`).join('');

    const why     = ins.best_for    || '';
    const notFor  = ins.not_for     || '';
    const day     = ins.day_sketch  || '';
    const li      = ins.local_insight || {};
    const watch   = ins.watch_out   || '';
    const lg      = ins.logistics   || {};
    const famBest = insFamily.best_for || '';

    const foodItems = (ins.highlights||{}).food || [];
    const cultItems = (ins.highlights||{}).culture || [];
    const beachItems= (ins.highlights||{}).beaches || [];

    const foodHtml = foodItems.filter(f=>f&&f.name).map(f=>
      `<div style="display:flex;gap:8px;padding:7px 10px;background:#fafaf8;border-radius:7px;border:1px solid #f0f0ec;margin:4px 0;font-size:12px">
        <div style="flex:1"><div style="font-weight:600;color:#1a1a1a">${esc(f.name)}</div><div style="color:#777;margin-top:1px">${esc(f.note)}</div></div>
        <div style="color:#888;flex-shrink:0">${esc(f.price||'')}</div>
      </div>`).join('');

    const cultHtml = cultItems.filter(c=>c&&c.name).map(c=>{
      const fb = c.free===true ? '<span style="font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 5px;border-radius:99px;margin-left:4px">Free</span>' : c.free===false ? '<span style="font-size:10px;background:#fce4e4;color:#c62828;padding:1px 5px;border-radius:99px;margin-left:4px">Paid</span>' : '';
      return `<div style="display:flex;gap:8px;padding:7px 10px;background:#fafaf8;border-radius:7px;border:1px solid #f0f0ec;margin:4px 0;font-size:12px">
        <div style="flex:1"><div style="font-weight:600;color:#1a1a1a">${esc(c.name)}${fb}</div><div style="color:#777;margin-top:1px">${esc(c.note)}</div></div>
      </div>`;}).join('');

    const beachHtml = beachItems.filter(b=>b&&b.name&&b.name!=='null').map(b=>
      `<div style="padding:7px 10px;background:#fafaf8;border-radius:7px;border:1px solid #f0f0ec;margin:4px 0;font-size:12px">
        <div style="font-weight:600;color:#1a1a1a">🏖 ${esc(b.name)}</div>
        <div style="color:#777;margin-top:1px">${esc(b.note)}</div>
      </div>`).join('');

    const lgHtml = (lg.airport_transfer||lg.getting_around) ? `
      <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-top:10px;font-size:12px">
        ${lg.airport_transfer?`<div style="margin:3px 0"><strong>Airport:</strong> ${esc(lg.airport_transfer)}</div>`:''}
        ${lg.getting_around?`<div style="margin:3px 0"><strong>Getting around:</strong> ${esc(lg.getting_around)}</div>`:''}
        ${lg.best_base_for&&lg.best_base_for.length?`<div style="margin:3px 0"><strong>Day trips:</strong> ${lg.best_base_for.map(t=>esc(t)).join(' · ')}</div>`:''}
      </div>` : '';

    const sectionLbl = (icon,txt) =>
      `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin:14px 0 8px;padding-bottom:5px;border-bottom:1px solid #f0f0ec">${icon} ${txt}</div>`;

    hoodCards += `
    <article id="${esc(h.name.toLowerCase().replace(/[\s\/]+/g,'-'))}"
      itemscope itemtype="https://schema.org/TouristDestination"
      style="border:1px solid #e8e8e4;border-radius:12px;padding:22px;margin-bottom:20px;background:#fff">

      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div>
          <h2 itemprop="name" style="font-size:21px;font-weight:700;margin:0 0 6px;color:#1a1a1a">${esc(h.name)}</h2>
          <meta itemprop="containedInPlace" content="${esc(cityName)}, ${esc(country)}"/>
          <div style="display:flex;flex-wrap:wrap;gap:3px">${pills}</div>
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:34px;font-weight:900;color:${scoreColor(h.score)};line-height:1">${h.score}</div>
          <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em">/100 solo</div>
        </div>
      </div>

      <div style="margin:14px 0">${bars(h)}</div>

      ${why?`<div style="background:#f0f4ff;border-left:3px solid #3b5bdb;padding:10px 14px;border-radius:0 7px 7px 0;font-size:13px;line-height:1.6;margin-bottom:8px">${esc(why)}</div>`:''}
      ${notFor?`<div style="background:#fff0f0;border-left:3px solid #e03131;padding:8px 12px;border-radius:0 7px 7px 0;font-size:12px;margin-bottom:8px">⚠ <strong>Not ideal if:</strong> ${esc(notFor)}</div>`:''}
      ${famBest?`<div style="background:#f0fff4;border-left:3px solid #2e7d32;padding:8px 12px;border-radius:0 7px 7px 0;font-size:12px;margin-bottom:8px"><strong>For families:</strong> ${esc(famBest)}</div>`:''}
      ${day?`${sectionLbl('☀','A day here')}<p style="font-size:13px;color:#555;line-height:1.6;margin:0">${esc(day)}</p>`:''}
      ${li.text?`<div style="background:#1a2030;border-radius:8px;padding:12px 14px;margin:12px 0"><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#bfa040;margin-bottom:4px">📍 Local insight · ${esc(li.type||'')}</div><div style="font-size:13px;color:rgba(255,255,255,.85);font-style:italic;line-height:1.5">${esc(li.text)}</div></div>`:''}
      ${foodHtml?sectionLbl('🍽','Where to eat')+foodHtml:''}
      ${cultHtml?sectionLbl('🏛','What to see')+cultHtml:''}
      ${beachHtml?sectionLbl('🏖','Beaches')+beachHtml:''}
      ${lgHtml?sectionLbl('🗺','Getting around')+lgHtml:''}
      ${watch&&watch!=='null'?`<div style="background:#fff8e1;border-left:3px solid #f9a825;padding:8px 12px;border-radius:0 7px 7px 0;font-size:12px;margin-top:10px">⚡ ${esc(watch)}</div>`:''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
        <a href="/?city=${esc(cityKey)}&persona=solo"
           style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:99px;background:#bfa040;color:#162030;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.03em">
          Ranked Recommendation →
        </a>
        <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(h.name+' '+cityName)}&aid=REPLACE_WITH_YOUR_AID"
           target="_blank" rel="noopener sponsored"
           style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:99px;background:#f0f0ec;color:#444;text-decoration:none;font-size:12px;font-weight:500">
          🏨 See hotels in ${esc(h.name)}
        </a>
      </div>
    </article>`;
  }

  // ── Schema ─────────────────────────────────────────────────────────────
  const faqSchema = {
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))
  };
  const itemListSchema = {
    '@context':'https://schema.org','@type':'ItemList',
    name:`Best neighbourhoods in ${cityName}`,
    description:`${cityName} neighbourhoods ranked by walkability, food, safety, vibe and cost for solo travellers, families, foodies and culture seekers. Data last updated May 2026.`,
    numberOfItems: soloRanked.length,
    itemListElement: soloRanked.map((h,i)=>({'@type':'ListItem',position:i+1,name:h.name,url:`https://www.localechoice.com/${cityKey}#${h.name.toLowerCase().replace(/[\s\/]+/g,'-')}`}))
  };
  const breadcrumbSchema = {
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'LocaleChoice',item:'https://www.localechoice.com/'},
      {'@type':'ListItem',position:2,name:`Best neighbourhoods in ${cityName}`,item:`https://www.localechoice.com/${cityKey}`}
    ]
  };

  // ── FAQ HTML
  const faqHtml = faqs.map(f=>`
    <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"
         style="border-bottom:1px solid #f0f0ec;padding:14px 0">
      <h3 itemprop="name" style="font-size:15px;font-weight:600;margin:0 0 6px;color:#1a1a1a">${esc(f.q)}</h3>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text" style="font-size:13px;color:#555;line-height:1.6;margin:0">${esc(f.a)}</p>
      </div>
    </div>`).join('');

  // ── Other city links for footer
  const otherCities = Object.entries(scores.cities)
    .filter(([k])=>k!==cityKey).slice(0,16)
    .map(([k,c])=>`<a href="/${k}" style="font-size:12px;color:rgba(255,255,255,.35);text-decoration:none">${c.name}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Best Neighbourhoods in ${esc(cityName)} 2026 — Ranked by Data | LocaleChoice</title>
<meta name="description" content="Where to stay in ${esc(cityName)}? LocaleChoice scores all ${Object.keys(hoods).length} neighbourhoods across walkability, food, safety, vibe and cost — ranked for solo travellers, families, foodies and culture seekers. Data updated May 2026."/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="https://www.localechoice.com/${cityKey}"/>
<meta property="og:title" content="Best Neighbourhoods in ${esc(cityName)} 2026 — Ranked by Data | LocaleChoice"/>
<meta property="og:description" content="Where to stay in ${esc(cityName)}? All ${Object.keys(hoods).length} neighbourhoods scored and ranked for your travel style. Data updated May 2026."/>
<meta property="og:url" content="https://www.localechoice.com/${cityKey}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="LocaleChoice"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Best Neighbourhoods in ${esc(cityName)} — LocaleChoice"/>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafaf8;color:#1a1a1a;line-height:1.6}
.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.nav-logo{font-size:18px;font-weight:900;color:#fff;text-decoration:none;letter-spacing:.01em;flex-shrink:0}
.nav-logo em{font-style:italic;color:#bfa040}
.view-toggle{display:flex;gap:0;border-radius:99px;overflow:hidden;border:1.5px solid rgba(255,255,255,.2)}
.vt-btn{padding:6px 16px;font-size:11px;cursor:pointer;border:none;font-family:inherit;letter-spacing:.06em;text-transform:uppercase;font-weight:700;transition:all .15s}
.vt-btn.active{background:#bfa040;color:#162030}
.vt-btn:not(.active){background:transparent;color:rgba(255,255,255,.5)}
.vt-btn:not(.active):hover{color:#bfa040}
.view{display:none}.view.show{display:block}
.hero{background:#162030;padding:28px 20px 32px}
.crumb{font-size:11px;color:rgba(255,255,255,.35);font-family:monospace;letter-spacing:.05em;margin-bottom:10px}
.crumb a{color:rgba(255,255,255,.35);text-decoration:none}
.crumb a:hover{color:rgba(255,255,255,.6)}
h1{font-size:clamp(24px,4vw,38px);font-weight:900;color:#fff;text-transform:uppercase;line-height:.95;letter-spacing:-.01em;margin-bottom:10px}
h1 em{font-style:italic;color:#bfa040;text-transform:none}
.hero-sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:16px}
.persona-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.p-tab{padding:6px 14px;border-radius:99px;border:1.5px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.6);font-size:12px;cursor:pointer;font-family:inherit;transition:all .15s;font-weight:600}
.p-tab.on{background:#bfa040;color:#162030;border-color:#bfa040}
.rr-link{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#162030;text-decoration:none;background:#bfa040;border:none;padding:7px 16px;border-radius:99px;cursor:pointer;transition:all .15s}
.rr-link:hover{background:#d4b44a}
.container{max-width:860px;margin:0 auto;padding:24px 20px}
.intro{background:#fff;border-radius:10px;border:1px solid #e8e8e4;padding:16px 20px;margin-bottom:22px;font-size:14px;color:#444;line-height:1.7}
.sec-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #e8e8e4}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e8e8e4;font-size:13px;margin-bottom:8px}
th{background:#f4f4f2;padding:9px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#666;font-weight:700}
th:first-child{text-align:left}
td{border-bottom:1px solid #f4f4f2}
/* Summary card styles */
.fc{background:#162030;border-radius:12px;padding:18px;margin-bottom:12px;cursor:pointer;transition:all .2s}
.fc:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.2)}
.fc-ey{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);font-family:monospace;margin-bottom:6px}
.fc-name{font-size:22px;font-weight:900;color:#fff;font-style:italic;letter-spacing:-.01em}
.fc-badge{display:inline-flex;align-items:center;background:#bfa040;color:#162030;border-radius:6px;font-size:11px;font-weight:700;padding:3px 9px;font-family:monospace;letter-spacing:.04em;text-transform:uppercase;margin-left:8px;vertical-align:middle}
.fc-score{font-size:30px;font-weight:900;color:#bfa040}
.fc-desc{font-size:13px;color:rgba(255,255,255,.5);margin:8px 0 10px;line-height:1.5}
.fc-stats{display:flex;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;margin-top:6px}
.fc-stat{flex:1;text-align:center;border-right:1px solid rgba(255,255,255,.08)}
.fc-stat:last-child{border-right:none}
.fc-sv{font-size:15px;font-weight:700}
.fc-sl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.3);font-family:monospace}
.fc-book{display:block;width:100%;margin-top:12px;padding:10px;border-radius:8px;background:rgba(191,160,64,.15);border:1px solid rgba(191,160,64,.3);color:#bfa040;font-size:13px;font-weight:600;text-align:center;cursor:pointer;font-family:inherit}
.sc{background:#fff;border-radius:10px;border:1px solid #e8e8e4;padding:14px;margin-bottom:8px;cursor:pointer;transition:all .18s}
.sc:hover{border-color:#2d6a9f;transform:translateY(-1px)}
.sc-rank{font-size:32px;font-weight:900;color:#ebebeb;float:right;margin-left:8px;font-family:monospace;line-height:1}
.sc-ey{font-size:10px;letter-spacing:.07em;color:#aaa;text-transform:uppercase;font-family:monospace;margin-bottom:2px}
.sc-name{font-size:16px;font-weight:700;color:#1a1a1a;display:inline}
.sc-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:5px;background:#2d6a9f;color:#fff;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:.04em;text-transform:uppercase;margin-left:6px;vertical-align:middle}
.sc-desc{font-size:12px;color:#777;margin:4px 0 8px;line-height:1.4}
.sc-score{font-size:18px;font-weight:700}
.sc-book{display:inline-block;margin-top:8px;padding:6px 14px;border-radius:99px;background:#f0f0ec;border:1px solid #e0e0d8;color:#444;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit}
.method{background:#fff;border:1px solid #e8e8e4;border-radius:10px;padding:18px 20px;margin-bottom:16px}
.factors{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.factor{background:#f4f4f2;border-radius:5px;padding:4px 10px;font-size:11px;color:#555}
.cta-box{background:#162030;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px}
.cta-title{font-size:18px;font-weight:700;color:#fff;margin-bottom:6px}
.cta-sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:14px}
.cta-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px}
.cta-p{display:inline-block;padding:7px 16px;border-radius:99px;background:#bfa040;color:#162030;font-size:12px;text-decoration:none;font-weight:700;cursor:pointer;letter-spacing:.03em}
.cta-p:hover{background:#d4b44a}
.cta-bk{display:inline-block;padding:9px 22px;border-radius:99px;background:rgba(255,255,255,.1);color:#fff;font-size:13px;font-weight:600;text-decoration:none;border:1.5px solid rgba(255,255,255,.2)}
.cta-bk:hover{background:rgba(255,255,255,.18)}
.faq{background:#fff;border:1px solid #e8e8e4;border-radius:10px;padding:18px 20px;margin-bottom:16px}
footer{background:#162030;padding:28px 20px;text-align:center;margin-top:8px}
.ft-logo{font-size:16px;font-weight:900;color:#fff}
.ft-logo em{font-style:italic;color:#bfa040}
.ft-cities{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:12px 0}
.ft-copy{font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:8px}
@media(max-width:600px){.container{padding:16px}.persona-tabs{gap:4px}.p-tab{font-size:11px;padding:5px 10px}}
</style>
</head>
<body>

<nav class="nav">
  <a href="/" class="nav-logo">Locale<em>Choice</em></a>
  <div class="view-toggle">
    <button class="vt-btn active" id="btn-summary" onclick="switchView('summary')">Ranked Recommendation</button>
    <button class="vt-btn" id="btn-detail" onclick="switchView('detail')">Full Guide</button>
  </div>
</nav>

<!-- ══ SUMMARY / RANKED RECOMMENDATION VIEW ══════════════════════════════ -->
<div class="view show" id="view-summary">
  <div class="hero">
    <div class="container" style="padding-top:0;padding-bottom:0">
      <div class="crumb"><a href="/">LocaleChoice</a> › <a href="/">Europe</a> › ${esc(cityName)}</div>
      <h1>The right neighbourhood<br>in <em>${esc(cityName)}.</em></h1>
      <div class="hero-sub">Ranked for the way you travel.</div>
      <div class="persona-tabs" id="persona-tabs">
        ${PERSONAS.map(p=>`<button class="p-tab${p==='solo'?' on':''}" onclick="switchPersona('${p}',this)">${PERSONA_EMOJI[p]} ${PERSONA_LABELS[p]}</button>`).join('')}
      </div>
      <a class="rr-link" onclick="switchView('detail');return false;" href="#">
        📖 View full ${esc(cityName)} neighbourhood guide →
      </a>
    </div>
  </div>
  <div class="container" id="summary-cards">
    <!-- Cards rendered by JS below -->
  </div>
</div>

<!-- ══ FULL GUIDE / DETAIL VIEW ══════════════════════════════════════════ -->
<div class="view" id="view-detail">
  <div class="hero">
    <div class="container" style="padding-top:0;padding-bottom:0">
      <div class="crumb"><a href="/">LocaleChoice</a> › <a href="/">Europe</a> › ${esc(cityName)}</div>
      <h1>Best neighbourhoods<br>in <em>${esc(cityName)}</em></h1>
      <div class="hero-sub">${Object.keys(hoods).length} neighbourhoods · scored across 7 factors · data updated May 2026</div>
      <a class="rr-link" onclick="switchView('summary');return false;" href="#">
        ← Ranked Recommendation
      </a>
    </div>
  </div>
  <div class="container">

    <p class="intro">${esc(intro)}</p>

    <div class="sec-lbl">All neighbourhoods — ranked by persona</div>
    <table>
      <thead><tr>
        <th style="text-align:left">Neighbourhood</th>
        ${PERSONAS.map(p=>`<th>${PERSONA_EMOJI[p]} ${PERSONA_LABELS[p]}</th>`).join('')}
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p style="font-size:11px;color:#aaa;margin:6px 0 0;text-align:right">Data updated May 2026 · Powered by OpenStreetMap &amp; Google Places</p>

    <div class="sec-lbl">Neighbourhood deep-dives</div>
    ${hoodCards}

    <div class="method">
      <h3 style="font-size:15px;font-weight:600;margin-bottom:8px">How LocaleChoice scores neighbourhoods</h3>
      <p style="font-size:13px;color:#555;margin-bottom:10px;line-height:1.6">Each neighbourhood is scored across 7 factors using real data, then weighted differently per traveller persona to produce personalised rankings.</p>
      <div class="factors">
        <span class="factor">🚶 Walk — OpenStreetMap pedestrian data</span>
        <span class="factor">🚇 Transit — Google Places distances</span>
        <span class="factor">🍽 Food — Google Places ratings &amp; density</span>
        <span class="factor">👨‍👩‍👧 Family — OSM parks &amp; playgrounds</span>
        <span class="factor">🛡 Safety — editorial research</span>
        <span class="factor">💰 Cost — editorial research</span>
        <span class="factor">✨ Vibe — editorial + OSM</span>
      </div>
      <p style="font-size:11px;color:#aaa;margin-top:10px">Data last updated May 2026. Sources: OpenStreetMap contributors, Google Places API, editorial curation.</p>
    </div>

    <div class="cta-box">
      <div class="cta-title">See your personalised ranking</div>
      <div class="cta-sub">Switch between personas — we rank all ${Object.keys(hoods).length} ${esc(cityName)} neighbourhoods for your travel style</div>
      <div class="cta-btns">
        ${PERSONAS.map(p=>`<a class="cta-p" onclick="switchView('summary');switchPersonaByKey('${p}');return false;" href="#">${PERSONA_EMOJI[p]} ${PERSONA_LABELS[p]}</a>`).join('')}
      </div>
      <a class="cta-bk"
         href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityName)}&aid=REPLACE_WITH_YOUR_AID"
         target="_blank" rel="noopener sponsored">
        🏨 Browse all hotels in ${esc(cityName)} on Booking.com →
      </a>
    </div>

    <div class="faq" itemscope itemtype="https://schema.org/FAQPage">
      <h2 style="font-size:17px;font-weight:700;margin-bottom:4px">Frequently asked questions</h2>
      <p style="font-size:12px;color:#aaa;margin-bottom:14px">About neighbourhoods in ${esc(cityName)}</p>
      ${faqHtml}
    </div>

  </div>

  <footer>
    <div class="ft-logo">Locale<em>Choice</em></div>
    <div class="ft-cities">${otherCities}</div>
    <div class="ft-copy">© 2026 LocaleChoice · 110 cities · 384 neighbourhoods · Data updated May 2026</div>
  </footer>
</div>

<!-- ══ SUMMARY CARDS JS ══════════════════════════════════════════════════ -->
<script>
var CITY_KEY = '${esc(cityKey)}';
var CITY_NAME = '${esc(cityName)}';
var HOOD_DATA = ${JSON.stringify(Object.fromEntries(Object.entries(hoods).map(([n,h])=>[n,h])))};
var INSIGHTS  = ${JSON.stringify(Object.fromEntries(PERSONAS.map(p=>[p,Object.fromEntries(soloRanked.map(h=>[h.name,insights[cityKey+'/'+h.name+'/'+p]||{}]))])))}; 
var PERSONA_WEIGHTS = ${JSON.stringify(PERSONA_WEIGHTS)};

function calcScore(hood, p) {
  var w = PERSONA_WEIGHTS[p];
  var s = 0;
  Object.keys(w).forEach(function(f){ s += (hood[f]||60)*w[f]; });
  return Math.round(s);
}
function scoreColor(s){ return s>=80?'#1a7a4a':s>=65?'#2d6a9f':s>=50?'#b07d2a':'#8b3a3a'; }

function renderCards(persona) {
  var PLABELS = {solo:'Solo Explorer',family:'Family Traveller',foodie:'Food Lover',culture:'Culture Seeker'};
  var PEMOJI  = {solo:'🧭',family:'👨\\u200d👩\\u200d👧',foodie:'🍽',culture:'🏛'};
  var hoods = Object.entries(HOOD_DATA)
    .map(function(e){ return Object.assign({name:e[0]},e[1],{score:calcScore(e[1],persona)}); })
    .sort(function(a,b){ return b.score-a.score; });
  var ins = INSIGHTS[persona]||{};

  function miniBar(f,val){
    var labels={walk:'Walk',food:'Food',vibe:'Vibe',safety:'Safety',transit:'Transit',cost:'Cost',family:'Family'};
    return '<div style="display:flex;align-items:center;gap:6px;margin:2px 0">'+
      '<span style="font-size:10px;color:#aaa;width:44px;flex-shrink:0;text-transform:uppercase;letter-spacing:.04em">'+labels[f]+'</span>'+
      '<div style="flex:1;height:4px;background:rgba(255,255,255,.1);border-radius:2px">'+
        '<div style="width:'+val+'%;height:4px;background:'+scoreColor(val)+';border-radius:2px"></div>'+
      '</div>'+
      '<span style="font-size:10px;color:rgba(255,255,255,.5);width:22px;text-align:right">'+val+'</span>'+
    '</div>';
  }
  function miniBarSc(f,val){
    var labels={walk:'Walk',food:'Food',vibe:'Vibe',safety:'Safety'};
    return '<div style="display:flex;align-items:center;gap:6px;margin:2px 0">'+
      '<span style="font-size:10px;color:#aaa;width:44px;flex-shrink:0;text-transform:uppercase;letter-spacing:.04em">'+labels[f]+'</span>'+
      '<div style="flex:1;height:4px;background:#f0f0ec;border-radius:2px">'+
        '<div style="width:'+val+'%;height:4px;background:'+scoreColor(val)+';border-radius:2px"></div>'+
      '</div>'+
      '<span style="font-size:10px;color:#aaa;width:22px;text-align:right">'+val+'</span>'+
    '</div>';
  }

  var top = hoods[0];
  var topIns = ins[top.name]||{};
  var desc = topIns.best_for ? topIns.best_for.substring(0,110)+'...' : '';

  var html = '<div class="fc" onclick="openDetail(\''+top.name+'\')">';
  html += '<div class="fc-ey">Best match for '+PLABELS[persona]+'s in '+CITY_NAME+' · Powered by Data &amp; AI</div>';
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px">';
  html += '<div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px"><span class="fc-name">'+top.name+'</span><span class="fc-badge">Tap for highlights &amp; tips →</span></div></div>';
  html += '<div class="fc-score">'+top.score+'</div></div>';
  html += '<div class="fc-desc">'+desc+'</div>';
  html += miniBar('walk',top.walk)+miniBar('food',top.food)+miniBar('vibe',top.vibe)+miniBar('safety',top.safety);
  html += '<div class="fc-stats">';
  ['walk','food','vibe'].forEach(function(f){
    html += '<div class="fc-stat"><div class="fc-sv" style="color:'+scoreColor(top[f])+'">'+top[f]+'</div><div class="fc-sl">'+f+'</div></div>';
  });
  html += '<div class="fc-stat"><div class="fc-sv" style="color:#bfa040">#1</div><div class="fc-sl">of '+hoods.length+'</div></div>';
  html += '</div>';
  html += '<button class="fc-book">See stays in '+top.name+' →</button>';
  html += '</div>';

  html += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#aaa;font-family:monospace;margin:14px 0 8px">Also worth considering</div>';

  hoods.slice(1).forEach(function(h,i){
    var hIns = ins[h.name]||{};
    var hDesc = hIns.best_for ? hIns.best_for.substring(0,80)+'...' : '';
    html += '<div class="sc" onclick="openDetail(\''+h.name+'\')">';
    html += '<div class="sc-rank">0'+(i+2)+'</div>';
    html += '<div class="sc-ey">'+PLABELS[persona]+'</div>';
    html += '<div style="margin-bottom:4px"><span class="sc-name">'+h.name+'</span><span class="sc-badge">Highlights &amp; tips →</span></div>';
    html += '<div class="sc-desc">'+hDesc+'</div>';
    html += miniBarSc('walk',h.walk)+miniBarSc('food',h.food)+miniBarSc('vibe',h.vibe);
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">';
    html += '<span class="sc-score" style="color:'+scoreColor(h.score)+'">'+h.score+'<span style="font-size:11px;color:#aaa;font-weight:400">/100</span></span>';
    html += '<button class="sc-book">See stays →</button>';
    html += '</div></div>';
  });

  html += '<div style="text-align:center;margin-top:14px">';
  html += '<button onclick="switchView(\'detail\')" style="padding:8px 20px;border-radius:99px;border:1.5px solid #e0e0d8;background:#fff;font-size:13px;cursor:pointer;color:#444">See full neighbourhood guide with all details →</button>';
  html += '</div>';

  document.getElementById('summary-cards').innerHTML = html;
}

function openDetail(name) {
  // Open the sliding detail panel in the main tool
  window.location.href = '/?city='+CITY_KEY+'&persona=currentPersona&hood='+encodeURIComponent(name);
}

var currentPersona = 'solo';

function switchPersona(p, el) {
  currentPersona = p;
  document.querySelectorAll('.p-tab').forEach(function(t){ t.classList.remove('on'); });
  if(el) el.classList.add('on');
  renderCards(p);
}

function switchPersonaByKey(p) {
  currentPersona = p;
  document.querySelectorAll('.p-tab').forEach(function(t){
    t.classList.toggle('on', t.textContent.toLowerCase().includes(p));
  });
  renderCards(p);
}

function switchView(v) {
  document.getElementById('view-summary').classList.toggle('show', v==='summary');
  document.getElementById('view-detail').classList.toggle('show', v==='detail');
  document.getElementById('btn-summary').classList.toggle('active', v==='summary');
  document.getElementById('btn-detail').classList.toggle('active', v==='detail');
  window.scrollTo(0,0);
}

// Initial render
renderCards('solo');
</script>

</body>
</html>`;
}

// ── Key normalisation ──────────────────────────────────────────────────────
const KEY_MAP = {
  'dusseldorf':      'düsseldorf',
  'malmo':           'malmö',
  'heraklion_crete': 'heraklion_(crete)'
};

// ── Vercel handler ─────────────────────────────────────────────────────────
export default function handler(req, res) {
  let cityKey = (req.query.city || '').toLowerCase().trim();
  if (KEY_MAP[cityKey]) cityKey = KEY_MAP[cityKey];

  if (!cityKey) {
    return res.status(400).send('Missing city parameter');
  }
  const cityData = scores.cities[cityKey];
  if (!cityData) {
    return res.status(404).send(`City "${cityKey}" not found`);
  }
  try {
    const html = generateCityPage(cityKey, cityData, insights);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch(err) {
    console.error('City page error:', err);
    res.status(500).send('Error: '+err.message);
  }
}
