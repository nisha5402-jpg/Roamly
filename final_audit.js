var fs = require('fs');

function test(handlerPath, query, label) {
  try {
    delete require.cache[require.resolve(handlerPath)];
    var handler = require(handlerPath);
    var captured = { status: 200, body: '', headers: {} };
    var res = {
      setHeader: function(k,v){captured.headers[k]=v;},
      status: function(c){captured.status=c; return this;},
      send: function(b){captured.body=b;}
    };
    handler({query:query}, res);
    var ok = captured.status === 200;
    console.log('  '+(ok?'✓':'✗')+' '+label+' → '+captured.status+', '+captured.body.length+' chars');
    return ok ? captured.body : null;
  } catch(e) {
    console.log('  ✗ '+label+' → ERROR: '+e.message);
    return null;
  }
}

console.log('═══════ FULL FINAL AUDIT ═══════\n');

console.log('1. STANDARD CITY PAGES (raw key):');
var lisbonHtml = test('./api/city.js', {city:'lisbon'}, 'lisbon');
test('./api/city.js', {city:'barcelona'}, 'barcelona');

console.log('\n2. STANDARD NEIGHBOURHOOD PAGES:');
var prHtml = test('./api/neighbourhood.js', {city:'lisbon', hood:'principe-real'}, 'lisbon/principe-real');
test('./api/neighbourhood.js', {city:'barcelona', hood:'el-born'}, 'barcelona/el-born');

console.log('\n3. SPECIAL CITY ROUTING (URL-safe form via KEY_MAP):');
var duss = test('./api/city.js', {city:'dusseldorf'}, 'dusseldorf');
var malmo = test('./api/city.js', {city:'malmo'}, 'malmo');
var her = test('./api/city.js', {city:'heraklion_crete'}, 'heraklion_crete');

console.log('\n4. SPECIAL CITY NEIGHBOURHOOD PAGES:');
test('./api/neighbourhood.js', {city:'dusseldorf', hood:'altstadt'}, 'dusseldorf/altstadt');
test('./api/neighbourhood.js', {city:'malmo', hood:'mollevangstorget'}, 'malmo/mollevangstorget');

console.log('\n5. JSON DATA ENDPOINT:');
test('./api/data.js', {city:'lisbon'}, 'data/lisbon');
test('./api/data.js', {city:'lisbon', hood:'principe-real'}, 'data/lisbon/principe-real');
var dussData = test('./api/data.js', {city:'dusseldorf'}, 'data/dusseldorf');

console.log('\n6. METHODOLOGY:');
test('./api/methodology.js', {}, '/methodology');

console.log('\n7. URL CONSISTENCY CHECK:');
console.log('  Special city pages must emit ONLY URL-safe internal links:');
var bads = [];
[
  {label:'düsseldorf city page',          html:duss,     bad:/href="\/düsseldorf|localechoice\.com\/düsseldorf/},
  {label:'malmö city page',               html:malmo,    bad:/href="\/malmö|localechoice\.com\/malmö/},
  {label:'heraklion city page',           html:her,      bad:/href="\/heraklion_\(crete\)|localechoice\.com\/heraklion_\(crete\)/}
].forEach(function(check) {
  if (!check.html) { console.log('  ✗ '+check.label+': handler failed'); return; }
  var matches = check.html.match(check.bad);
  if (matches) {
    console.log('  ✗ '+check.label+': contains raw key in URL: '+matches[0].slice(0,60));
    bads.push(check.label);
  } else {
    console.log('  ✓ '+check.label+': no raw keys in URLs');
  }
});

console.log('\n8. STANDARD PAGE — confirm URL-safe keys still work for normal cities:');
[
  {label:'lisbon city',         html:lisbonHtml, expect:/href="\/lisbon/},
  {label:'lisbon/principe-real', html:prHtml,    expect:/canonical[^>]*lisbon\/principe-real/}
].forEach(function(c){
  if (!c.html) return console.log('  ✗ '+c.label+': handler failed');
  console.log('  '+(c.expect.test(c.html)?'✓':'✗')+' '+c.label);
});

console.log('\n9. AEO FEATURES PRESENT IN NEIGHBOURHOOD PAGE:');
if (prHtml) {
  var checks = [
    ['TL;DR block',                  prHtml.indexOf('class="tldr-block"') > -1],
    ['SpeakableSpecification schema',prHtml.indexOf('SpeakableSpecification') > -1],
    ['Article schema',               prHtml.indexOf('"@type":"Article"') > -1],
    ['Place schema with scores',     prHtml.indexOf('PropertyValue') > -1 && prHtml.indexOf('walkability_score') > -1],
    ['FAQPage schema',               prHtml.indexOf('"@type":"FAQPage"') > -1],
    ['BreadcrumbList schema',        prHtml.indexOf('"@type":"BreadcrumbList"') > -1],
    ['Methodology link',             prHtml.indexOf('/methodology') > -1],
    ['Canonical URL',                prHtml.indexOf('rel="canonical"') > -1],
    ['Persona cross-link',           /href="\/lisbon\/(solo|family|foodie|culture)\//.test(prHtml)],
    ['JSON alternate link',          prHtml.indexOf('rel="alternate"') > -1 && prHtml.indexOf('application/json') > -1],
    ['Answer-first FAQ',             /Yes, |Mostly, |It depends |Probably not /.test(prHtml)]
  ];
  checks.forEach(function(c){ console.log('  '+(c[1]?'✓':'✗')+' '+c[0]); });
}

console.log('\n10. SITEMAP / LLMS.TXT INTEGRITY:');
var sitemap = fs.readFileSync('sitemap.xml','utf8');
var llms = fs.readFileSync('llms.txt','utf8');
console.log('  '+(/<loc>/.test(sitemap)?'✓':'✗')+' sitemap has <loc> entries: '+(sitemap.match(/<loc>/g)||[]).length);
console.log('  '+(!/düsseldorf|malmö|\(crete\)/.test(sitemap)?'✓':'✗')+' sitemap has no Unicode/paren URLs');
console.log('  '+(!/düsseldorf|malmö|\(crete\)/.test(llms.match(/\(https[^)]+\)/g)||[].join(' '))?'✓':'✗')+' llms.txt URLs are all clean (display names still have diacritics, that is correct)');
console.log('  '+(llms.indexOf('localechoice@gmail.com')>-1?'✓':'✗')+' llms.txt has contact');
console.log('  '+(sitemap.indexOf('https://www.localechoice.com/methodology')>-1?'✓':'✗')+' sitemap has /methodology');

console.log('\n═══════ AUDIT COMPLETE ═══════');
