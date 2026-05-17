#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build.js — runs on Vercel before deploy
//
// Fetches hero images for all cities from Wikipedia's REST API and writes
// api/city_images.js as a static module. The api/city.js and api/persona.js
// handlers read this file at runtime — zero API calls in production.
//
// If the fetch fails for any reason, the build still succeeds. The site
// falls back to the designed gradient hero for affected cities.
// ═══════════════════════════════════════════════════════════════════════════

var https = require('https');
var fs    = require('fs');
var path  = require('path');

var UA = 'LocaleChoice/1.0 (https://localechoice.com) Vercel-build';
var SCORES_PATH = path.join(__dirname, 'roamly_scores.json');
var OUTPUT_PATH = path.join(__dirname, 'api', 'city_images.js');

// Override map for cities whose display name doesn't map cleanly to a
// Wikipedia article title. Most cities work without an override.
var WIKI_OVERRIDES = {
  'heraklion_(crete)':  'Heraklion',
  'heraklion_crete':    'Heraklion',
  'palma_mallorca':     'Palma_de_Mallorca',
  'san_sebastian':      'San_Sebasti%C3%A1n',
  'cluj_napoca':        'Cluj-Napoca',
  'luxembourg_city':    'Luxembourg_(city)',
  'gdansk':             'Gda%C5%84sk',
  'malmo':              'Malm%C3%B6',
  'malmö':              'Malm%C3%B6',
  'dusseldorf':         'D%C3%BCsseldorf',
  'düsseldorf':         'D%C3%BCsseldorf',
  'krakow':             'Krak%C3%B3w',
  'aarhus':             'Aarhus',
  'reykjavik':          'Reykjav%C3%ADk',
  'gothenburg':         'Gothenburg',
  'tallin':             'Tallinn',
  'tallinn':            'Tallinn',
  'turin':              'Turin',
  'porto':              'Porto',
  'algarve':            'Algarve',
  'nice':               'Nice',
  'venice':             'Venice',
  'florence':           'Florence',
  'cologne':            'Cologne',
  'munich':             'Munich',
  'vienna':             'Vienna',
  'prague':             'Prague',
  'warsaw':             'Warsaw',
  'rome':               'Rome',
  'milan':              'Milan',
  'naples':             'Naples'
};

function wikiTitleFor(cityKey, cityName) {
  var lower = String(cityKey).toLowerCase();
  if (WIKI_OVERRIDES[lower]) return WIKI_OVERRIDES[lower];
  return encodeURIComponent(String(cityName).replace(/\s+/g, '_'));
}

function fetchJson(url, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = 3;
  return new Promise(function(resolve, reject){
    var req = https.request(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' }
    }, function(res) {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        return fetchJson(res.headers.location, redirectsLeft - 1).then(resolve, reject);
      }
      var chunks = [];
      res.on('data', function(c){ chunks.push(c); });
      res.on('end', function(){
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP '+res.statusCode));
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch(e) {
          reject(new Error('Parse: '+e.message));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function(){ req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

function normKey(k) {
  return String(k).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[()]/g,'').replace(/[\s\/]+/g,'_')
    .replace(/[^a-z0-9_]/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'');
}

async function fetchCityImage(cityKey, cityName) {
  var title = wikiTitleFor(cityKey, cityName);
  var url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + title;
  try {
    var data = await fetchJson(url);
    var img = data.originalimage || data.thumbnail;
    if (!img || !img.source) return null;
    // Skip very small images (likely placeholder/coat-of-arms)
    if (img.width && img.width < 600) return null;
    return {
      title: data.title,
      url: img.source,
      width: img.width,
      height: img.height,
      wikipediaUrl: data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page
    };
  } catch(e) {
    return null;
  }
}

async function main() {
  console.log('━━━ Wikipedia image fetcher ━━━');

  // Load existing image file if present — we'll preserve any manual entries
  var existing = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      delete require.cache[OUTPUT_PATH];
      existing = require(OUTPUT_PATH);
      console.log('Loaded '+Object.keys(existing).length+' existing entries (will preserve manual edits)');
    } catch(e) { existing = {}; }
  }

  var scores;
  try {
    scores = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8'));
  } catch(e) {
    console.error('Cannot read roamly_scores.json — aborting image fetch.');
    console.error('Falling back: build succeeds but no images generated.');
    process.exit(0);  // Don't fail the build
  }

  var cities = Object.keys(scores.cities);
  console.log('Fetching images for '+cities.length+' cities...');

  var results = Object.assign({}, existing);  // preserve existing
  var success = 0, failed = 0, skipped = 0;

  for (var i = 0; i < cities.length; i++) {
    var cityKey = cities[i];
    var cityName = scores.cities[cityKey].name;
    var safeKey = normKey(cityKey);

    // Skip if we already have a manual entry tagged as such
    if (existing[safeKey] && existing[safeKey].manual === true) {
      skipped++;
      continue;
    }

    var img = await fetchCityImage(cityKey, cityName);
    if (img) {
      results[safeKey] = img;
      success++;
      process.stdout.write('.');
    } else {
      failed++;
      process.stdout.write('x');
    }
    if ((i + 1) % 25 === 0) process.stdout.write(' ['+(i+1)+'/'+cities.length+']\n');
    await sleep(120);
  }

  process.stdout.write('\n');
  console.log('Success: '+success+', Failed: '+failed+', Skipped (manual): '+skipped);

  var content = '// Auto-generated by build.js — do not edit by hand.\n'
    + '// Generated: ' + new Date().toISOString() + '\n'
    + '// Source: Wikipedia REST API\n'
    + '//\n'
    + '// To override a specific city manually, add { manual: true } to its entry —\n'
    + '// the build script will preserve it on next run.\n\n'
    + 'module.exports = ' + JSON.stringify(results, null, 2) + ';\n';

  fs.writeFileSync(OUTPUT_PATH, content);
  console.log('Wrote '+OUTPUT_PATH+' ('+Object.keys(results).length+' cities)');
}

main().catch(function(e){
  console.error('Build script error (non-fatal):', e.message);
  console.error('Site will fall back to designed gradient heroes.');
  // Exit 0 — don't fail the Vercel build
  process.exit(0);
});
