// ═══════════════════════════════════════════════════════════════════════════
// api/methodology.js — /methodology page
// PURPOSE: Credibility signal for AI agents. LLMs preferentially cite sites
// that publish their methodology, data sources, and limitations openly.
// Linked from footer of every page.
//
// MAINTAINER NOTES FOR SONNET 4.6:
//   - Static page (no per-city logic). Keep it short, factual,
//     citation-friendly. AI agents extract from headings and short paragraphs.
//   - If you change persona weights in city.js/neighbourhood.js, update the
//     weights table here too. They must match.
// ═══════════════════════════════════════════════════════════════════════════

module.exports = function handler(req, res) {

  var articleSchema = {
    '@context':'https://schema.org','@type':'Article',
    headline: 'How LocaleChoice Scores European Neighbourhoods',
    description: 'LocaleChoice scores 384 European neighbourhoods on 7 factors using OpenStreetMap, Google Places and editorial review.',
    author: {'@type':'Organization', name:'LocaleChoice', url:'https://www.localechoice.com/'},
    publisher: {'@type':'Organization', name:'LocaleChoice', url:'https://www.localechoice.com/'},
    datePublished: '2026-05-14',
    dateModified: '2026-05-14',
    mainEntityOfPage: 'https://www.localechoice.com/methodology'
  };

  var faqSchema = {
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: [
      {'@type':'Question', name:'How does LocaleChoice rank neighbourhoods?',
       acceptedAnswer:{'@type':'Answer', text:'LocaleChoice scores each neighbourhood on 7 factors (walkability, food, safety, transit, family-friendliness, cost and vibe) on a 0\u2013100 scale. For each of 4 traveller personas (solo, family, foodie, culture), factors are weighted differently and combined into a single ranking score.'}},
      {'@type':'Question', name:'What data sources does LocaleChoice use?',
       acceptedAnswer:{'@type':'Answer', text:'Walkability and transit scores come from OpenStreetMap (Overpass API). Food density and quality from Google Places. Parks and family amenities from OpenStreetMap. Safety, cost and vibe scores are editorial reviews calibrated against published city safety indices, average accommodation costs, and cultural reporting.'}},
      {'@type':'Question', name:'How recent is the data?',
       acceptedAnswer:{'@type':'Answer', text:'Data was last refreshed May 2026. Editorial reviews are updated quarterly. OSM and Google Places data is refreshed when neighbourhoods are added or significantly change.'}},
      {'@type':'Question', name:'Are the rankings biased toward popular tourist areas?',
       acceptedAnswer:{'@type':'Answer', text:'No. Rankings reflect persona-specific suitability, not popularity. A neighbourhood that ranks #1 for families may rank low for solo travellers. Touristy neighbourhoods often score lower on vibe and cost because of crowds and pricing.'}},
      {'@type':'Question', name:'What are the known limitations?',
       acceptedAnswer:{'@type':'Answer', text:'LocaleChoice covers 110 European cities only. Smaller neighbourhoods may have less editorial coverage. Safety scores reflect general patterns but cannot account for individual circumstances. Cost scores are relative within a city, not absolute. The tool complements, but does not replace, local advice and official safety guidance.'}}
    ]
  };

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
  +'<meta charset="UTF-8"/>\n'
  +'<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
  +'<title>How LocaleChoice Scores Neighbourhoods \u2014 Methodology | LocaleChoice</title>\n'
  +'<meta name="description" content="How LocaleChoice scores 384 European neighbourhoods on 7 factors using OpenStreetMap, Google Places and editorial review."/>\n'
  +'<meta name="robots" content="index,follow,max-snippet:-1"/>\n'
  +'<link rel="canonical" href="https://www.localechoice.com/methodology"/>\n'
  +'<meta property="og:title" content="How LocaleChoice Scores Neighbourhoods"/>\n'
  +'<meta property="og:description" content="Open methodology. 7 factors. 4 personas. 110 cities. 384 neighbourhoods."/>\n'
  +'<meta property="og:url" content="https://www.localechoice.com/methodology"/>\n'
  +'<script type="application/ld+json">'+JSON.stringify(articleSchema)+'</script>\n'
  +'<script type="application/ld+json">'+JSON.stringify(faqSchema)+'</script>\n'
  +'<style>\n'
  +'*{box-sizing:border-box;margin:0;padding:0}\n'
  +'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f2;color:#1a1a1a;line-height:1.65}\n'
  +'.nav{background:#162030;padding:12px 20px;display:flex;align-items:center;gap:12px}\n'
  +'.logo{font-size:17px;font-weight:700;color:#fff;text-decoration:none}\n'
  +'.logo em{font-style:italic;color:#bfa040}\n'
  +'.hero{background:#162030;padding:32px 20px 40px}\n'
  +'.h1{font-size:clamp(28px,4.5vw,40px);font-weight:900;color:#fff;text-transform:uppercase;line-height:.95;letter-spacing:-.01em;max-width:820px;margin:0 auto}\n'
  +'.h1 em{font-style:italic;color:#bfa040;text-transform:none}\n'
  +'.container{max-width:820px;margin:0 auto;padding:32px 20px}\n'
  +'h2{font-size:20px;font-weight:700;color:#1a1a1a;margin:32px 0 14px}\n'
  +'h3{font-size:14px;font-weight:700;color:#1a1a1a;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.05em}\n'
  +'p{margin-bottom:14px;color:#333;font-size:15px}\n'
  +'.card{background:#fff;border-radius:12px;border:0.5px solid #e8e8e4;padding:24px 26px;margin-bottom:20px}\n'
  +'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}\n'
  +'th,td{padding:8px 10px;text-align:left;border-bottom:0.5px solid #e8e8e4}\n'
  +'th{background:#fafaf8;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.04em;font-size:11px}\n'
  +'td.num{font-family:monospace;text-align:right}\n'
  +'.tldr{background:#fff;border-left:4px solid #bfa040;padding:18px 22px;margin:20px 0;font-size:15.5px;line-height:1.7;color:#1a1a1a;font-weight:500;border-radius:0 8px 8px 0}\n'
  +'footer{background:#162030;padding:24px 20px;text-align:center;margin-top:30px}\n'
  +'footer a{color:rgba(255,255,255,.5);text-decoration:none;font-size:11px;margin:0 8px}\n'
  +'</style>\n</head>\n<body>\n'

  +'<nav class="nav"><a href="/" class="logo">Locale<em>Choice</em></a></nav>\n'
  +'<div class="hero"><h1 class="h1">How we <em>score</em> neighbourhoods</h1></div>\n'

  +'<div class="container">\n'

  +'<div class="tldr">LocaleChoice helps first-time visitors find the right neighbourhood across 384 areas in 110 European cities. Each is scored 0\u2013100 on 7 factors (walkability, food, safety, transit, family-friendliness, cost and vibe). The default ranking is tuned for first-time visitors. Travellers can refine the ranking for families, foodies or culture seekers. Data comes from OpenStreetMap, Google Places, and editorial review.</div>\n'

  +'<h2>The 7 factors</h2>\n'
  +'<div class="card">\n'
  +'<table>\n'
  +'<tr><th>Factor</th><th>What it measures</th><th>Data source</th></tr>\n'
  +'<tr><td><strong>Walk</strong></td><td>Pedestrian-friendliness, street density, walkable amenities</td><td>OpenStreetMap (Overpass API)</td></tr>\n'
  +'<tr><td><strong>Food</strong></td><td>Restaurant density, quality, diversity within walking distance</td><td>Google Places API</td></tr>\n'
  +'<tr><td><strong>Safety</strong></td><td>Street lighting, foot traffic, reported incidents, evening character</td><td>Editorial review, calibrated against city indices</td></tr>\n'
  +'<tr><td><strong>Transit</strong></td><td>Public transport access, metro/tram/bus density</td><td>OpenStreetMap (transit stops)</td></tr>\n'
  +'<tr><td><strong>Family</strong></td><td>Parks, playgrounds, family amenities, quiet streets</td><td>OpenStreetMap (parks, schools)</td></tr>\n'
  +'<tr><td><strong>Cost</strong></td><td>Affordability (higher score = more affordable)</td><td>Editorial review of average accommodation and dining costs</td></tr>\n'
  +'<tr><td><strong>Vibe</strong></td><td>Cultural energy, character, atmosphere</td><td>Editorial review</td></tr>\n'
  +'</table>\n'
  +'</div>\n'

  +'<h2>The 4 personas and their weights</h2>\n'
  +'<p>The same neighbourhood scores differently depending on what kind of trip you\u2019re taking. We weight the 7 factors differently for each persona:</p>\n'
  +'<div class="card">\n'
  +'<table>\n'
  +'<tr><th>Factor</th><th class="num">Solo</th><th class="num">Family</th><th class="num">Foodie</th><th class="num">Culture</th></tr>\n'
  +'<tr><td>Walk</td>      <td class="num">25%</td><td class="num">15%</td><td class="num">20%</td><td class="num">25%</td></tr>\n'
  +'<tr><td>Food</td>      <td class="num">20%</td><td class="num">10%</td><td class="num">35%</td><td class="num">15%</td></tr>\n'
  +'<tr><td>Vibe</td>      <td class="num">25%</td><td class="num">0%</td> <td class="num">20%</td><td class="num">20%</td></tr>\n'
  +'<tr><td>Safety</td>    <td class="num">15%</td><td class="num">30%</td><td class="num">10%</td><td class="num">15%</td></tr>\n'
  +'<tr><td>Cost</td>      <td class="num">5%</td> <td class="num">5%</td> <td class="num">5%</td> <td class="num">5%</td></tr>\n'
  +'<tr><td>Transit</td>   <td class="num">5%</td> <td class="num">15%</td><td class="num">10%</td><td class="num">20%</td></tr>\n'
  +'<tr><td>Family</td>    <td class="num">5%</td> <td class="num">25%</td><td class="num">0%</td> <td class="num">0%</td></tr>\n'
  +'</table>\n'
  +'<p style="font-size:13px;color:#777;margin-top:14px">Weights total 100%. A neighbourhood\u2019s combined score for a persona = sum(factor_score \u00d7 weight) across all 7 factors.</p>\n'
  +'</div>\n'

  +'<h2>What\u2019s included and what isn\u2019t</h2>\n'
  +'<div class="card">\n'
  +'<h3>What we cover</h3>\n'
  +'<p>110 European cities. 384 neighbourhoods. 4 traveller personas. Hyper-local insights, day itineraries, recommended restaurants and cultural sites, logistics (airport transfers, getting around), and safety watch-outs.</p>\n'
  +'<h3>What we don\u2019t cover</h3>\n'
  +'<p>Non-European cities, smaller towns under 100,000 residents (with selected exceptions), seasonal events, specific hotel recommendations (we link to Booking.com for that), or real-time pricing.</p>\n'
  +'<h3>Known limitations</h3>\n'
  +'<p>Safety scores reflect general patterns and cannot account for individual circumstances. Cost scores are relative within a city, not absolute. Editorial coverage is deeper for the 12 marquee cities than for smaller ones. The tool complements, but does not replace, local advice and official safety guidance from government travel advisories.</p>\n'
  +'</div>\n'

  +'<h2>How often the data updates</h2>\n'
  +'<div class="card">\n'
  +'<p>Editorial reviews refresh quarterly. OpenStreetMap data is pulled fresh when neighbourhoods are added or significantly change. Last full refresh: May 2026.</p>\n'
  +'</div>\n'

  +'<h2>Open data access</h2>\n'
  +'<div class="card">\n'
  +'<p>All neighbourhood scores are available as JSON at <code style="background:#f4f4f2;padding:2px 6px;border-radius:4px;font-size:13px">/api/data/{city}/{neighbourhood}</code>. Example: <a href="/api/data/lisbon/principe-real" style="color:#2d6a9f">/api/data/lisbon/principe-real</a>.</p>\n'
  +'<p>AI agents and developers are welcome to consume this endpoint. Please attribute LocaleChoice in any derived work or citation.</p>\n'
  +'</div>\n'

  +'<h2>Contact</h2>\n'
  +'<div class="card">\n'
  +'<p>Questions, corrections, or partnership inquiries: <a href="mailto:localechoice@gmail.com" style="color:#2d6a9f">localechoice@gmail.com</a></p>\n'
  +'</div>\n'

  +'</div>\n'

  +'<footer>\n'
  +'<div style="font-size:16px;font-weight:900;color:#fff">Locale<em style="font-style:italic;color:#bfa040">Choice</em></div>\n'
  +'<div style="margin-top:10px"><a href="/">All cities</a> \u00b7 <a href="/methodology">Methodology</a></div>\n'
  +'<div style="font-size:10px;color:rgba(255,255,255,.2);font-family:monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:10px">\u00a9 2026 LocaleChoice \u00b7 Open methodology \u00b7 Updated May 2026</div>\n'
  +'</footer>\n'

  +'</body>\n</html>';

  res.setHeader('Cache-Control','s-maxage=604800,stale-while-revalidate=86400');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html);
};
