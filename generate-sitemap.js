// ═══════════════════════════════════════════════════════════════════════════
// generate-sitemap.js
// USAGE: node generate-sitemap.js
// Produces sitemap.xml at project root with all indexable URLs.
// FOR SONNET 4.6: Run after data changes or new pages added.
// ═══════════════════════════════════════════════════════════════════════════

var fs = require('fs');
var path = require('path');
var scores = require('./roamly_scores.json');

var BASE = 'https://www.localechoice.com';
var TODAY = new Date().toISOString().split('T')[0];

function slugify(s) {
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[\s\/]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-').replace(/^\-|\-$/g,'');
}

// City keys can contain non-URL-safe chars (ü, ö, parentheses, underscores).
// Convert to URL-safe form using HYPHENS (May 2026 — was underscores).
// KEY_MAP in api/city.js handles the inbound translation back to data keys.
function urlSafeCityKey(k) {
  return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[()]/g,'').replace(/[\s\/_]+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
}

var urls = [];
urls.push({loc: BASE+'/',             lastmod: TODAY, changefreq: 'weekly',  priority: '1.0'});
urls.push({loc: BASE+'/methodology',  lastmod: TODAY, changefreq: 'monthly', priority: '0.6'});
// Blog articles (June 2026 fix): these were manually appended to sitemap.xml
// and the generator didn't know about them — every regeneration silently
// dropped them. Add new blog posts HERE, not by hand-editing sitemap.xml.
urls.push({loc: BASE+'/blog/where-to-stay-europe-data/', lastmod: TODAY, changefreq: 'monthly', priority: '0.7'});
urls.push({loc: BASE+'/blog/where-to-stay-london-data/', lastmod: TODAY, changefreq: 'monthly', priority: '0.7'});

var cityKeys = Object.keys(scores.cities);
cityKeys.forEach(function(cityKey) {
  var urlKey = urlSafeCityKey(cityKey);
  urls.push({loc: BASE+'/'+urlKey, lastmod: TODAY, changefreq: 'monthly', priority: '0.8'});
});

// ── Persona pages (added June 2026) ──────────────────────────────────────
// EVIDENCE: persona pages were never in the sitemap, yet GSC shows they are
// the best-performing page type on BOTH channels — 1.09% CTR vs 0.42% for
// neighbourhood pages, 54% of all non-brand clicks, and ~57% of Copilot
// citations (bergen/family alone: 15). Only 173 of 440 had ever surfaced in
// GSC; the rest were undiscovered. Trailing slash matches the canonical in
// api/persona.js.
var personaCount = 0;
var SITEMAP_PERSONAS = ['solo','family','foodie','culture'];
cityKeys.forEach(function(cityKey) {
  var urlKey = urlSafeCityKey(cityKey);
  SITEMAP_PERSONAS.forEach(function(p) {
    urls.push({loc: BASE+'/'+urlKey+'/'+p+'/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8'});
    personaCount++;
  });
});

// ── Events pages (only cities present in events_data.js) ──
var eventsCount = 0;
var EVENTS_DATA = (function(){ try { return require('./api/events_data.js'); } catch(e){ return {}; } })();
cityKeys.forEach(function(cityKey){
  var urlKey = urlSafeCityKey(cityKey);
  if (EVENTS_DATA[urlKey]) {
    urls.push({loc: BASE+'/'+urlKey+'/events/', lastmod: TODAY, changefreq: 'weekly', priority: '0.7'});
    eventsCount++;
  }
});

var hoodCount = 0;
cityKeys.forEach(function(cityKey) {
  var urlKey = urlSafeCityKey(cityKey);
  var hoods = scores.cities[cityKey].neighbourhoods || {};
  Object.keys(hoods).forEach(function(hoodName) {
    urls.push({
      loc: BASE+'/'+urlKey+'/'+slugify(hoodName)+'/',
      lastmod: TODAY, changefreq: 'monthly', priority: '0.7'
    });
    hoodCount++;
  });
});

// ── Comparison pages (soft-launch: top 10 cities, top 3 hoods, 3 pairs each) ──
// Scoring model from the single source of truth (api/_scoring.js). Ranking
// uses UNROUNDED scores — must match compare.js pair selection exactly.
var SCORING = require('./api/_scoring.js');
var COMPARE_CITIES = SCORING.COMPARE_CITIES;
function smScore(h,p){return SCORING.calcScoreRaw(h,p);}
function smPenalty(h,p){return SCORING.gatekeepPenalty(h,p);}
function smTop3(cityData){
  var hoods=Object.keys(cityData.neighbourhoods);
  var scored=hoods.map(function(hn){var h=cityData.neighbourhoods[hn];var best=Math.max.apply(null,['solo','family','foodie','culture'].map(function(p){return Math.max(0,smScore(h,p)-smPenalty(h,p));}));return {name:hn,best:best};});
  scored.sort(function(a,b){return b.best-a.best;});
  return scored.slice(0,3).map(function(x){return x.name;});
}
var compareCount = 0;
COMPARE_CITIES.forEach(function(cityKey){
  if (!scores.cities[cityKey]) return;
  var urlKey = urlSafeCityKey(cityKey);
  var top3 = smTop3(scores.cities[cityKey]);
  var pairs = [[top3[0],top3[1]],[top3[0],top3[2]],[top3[1],top3[2]]];
  pairs.forEach(function(pr){
    var pairSlug = slugify(pr[0])+'-vs-'+slugify(pr[1]);
    urls.push({
      loc: BASE+'/'+urlKey+'/compare/'+pairSlug+'/',
      lastmod: TODAY, changefreq: 'monthly', priority: '0.6'
    });
    compareCount++;
  });
});

var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
urls.forEach(function(u) {
  xml += '  <url>\n    <loc>'+u.loc+'</loc>\n    <lastmod>'+u.lastmod+'</lastmod>\n    <changefreq>'+u.changefreq+'</changefreq>\n    <priority>'+u.priority+'</priority>\n  </url>\n';
});
xml += '</urlset>\n';

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml);

console.log('sitemap.xml written');
console.log('  Homepage:            1');
console.log('  Methodology:         1');
console.log('  City pages:          '+cityKeys.length);
console.log('  Persona pages:       '+personaCount);
console.log('  Events pages:        '+eventsCount);
console.log('  Neighbourhood pages: '+hoodCount);
console.log('  Comparison pages:    '+compareCount);
console.log('  Total URLs:          '+urls.length);
