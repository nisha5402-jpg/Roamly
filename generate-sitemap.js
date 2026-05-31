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

var cityKeys = Object.keys(scores.cities);
cityKeys.forEach(function(cityKey) {
  var urlKey = urlSafeCityKey(cityKey);
  urls.push({loc: BASE+'/'+urlKey, lastmod: TODAY, changefreq: 'monthly', priority: '0.8'});
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
var COMPARE_CITIES = ['paris','barcelona','lisbon','amsterdam','london','rome','berlin','copenhagen','vienna','prague'];
var PW_SM = {
  solo:{walk:0.25,food:0.20,vibe:0.25,safety:0.15,cost:0.05,transit:0.05,family:0.05},
  family:{safety:0.30,family:0.25,walk:0.15,transit:0.15,food:0.10,cost:0.05,vibe:0.0},
  foodie:{food:0.35,vibe:0.20,walk:0.20,transit:0.10,safety:0.10,cost:0.05,family:0.0},
  culture:{walk:0.25,vibe:0.20,transit:0.20,safety:0.15,food:0.15,cost:0.05,family:0.0}
};
function smScore(h,p){var w=PW_SM[p];return Object.keys(w).reduce(function(s,f){return s+(h[f]||60)*w[f];},0);}
function smPenalty(h,p){var pen=0;if(p==='family'){if((h.safety||60)<60)pen+=20;if((h.family||60)<55)pen+=15;if((h.vibe||60)>85)pen+=10;}else if(p==='solo'){if((h.safety||60)<55)pen+=15;}else if(p==='culture'){if((h.safety||60)<55)pen+=10;}return pen;}
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
console.log('  Neighbourhood pages: '+hoodCount);
console.log('  Comparison pages:    '+compareCount);
console.log('  Total URLs:          '+urls.length);
