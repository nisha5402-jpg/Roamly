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
console.log('  Total URLs:          '+urls.length);
