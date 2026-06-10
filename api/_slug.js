// api/_slug.js
// Single source of truth for URL slugs across all serverless renderers.
// Replaces the duplicated NFD-based sluggers in neighbourhood.js, persona.js,
// city.js, compare.js, data.js (and normKey in build.js).
//
// THE BUG IT FIXES: normalize('NFD').replace(/[\u0300-\u036f]/g,'') only strips
// accents from characters that DECOMPOSE into base+mark (ü, é, á...). Characters
// like ø, å, æ, ł, đ, þ do NOT decompose, so the next ASCII filter deleted them
// outright — "Grünerløkka" -> "grunerlkka", "Grønland" -> "grnland".
// Here we transliterate those explicitly BEFORE the NFD fallback, so no letter
// is ever dropped. ASCII-only names are unaffected (no slug churn).

var TRANSLIT = {
  'æ':'ae','ø':'o','å':'a','þ':'th','ð':'d','œ':'oe','ß':'ss',
  'ä':'a','ö':'o','ü':'u',
  'à':'a','á':'a','â':'a','ã':'a','ā':'a','ă':'a','ą':'a','ǎ':'a',
  'ç':'c','ć':'c','č':'c','ĉ':'c','ċ':'c',
  'ď':'d','đ':'d',
  'è':'e','é':'e','ê':'e','ë':'e','ē':'e','ĕ':'e','ę':'e','ě':'e','ė':'e',
  'ğ':'g','ģ':'g','ĝ':'g','ġ':'g',
  'ì':'i','í':'i','î':'i','ï':'i','ī':'i','į':'i','ı':'i',
  'ł':'l','ľ':'l','ļ':'l','ĺ':'l',
  'ñ':'n','ń':'n','ň':'n','ņ':'n',
  'ò':'o','ó':'o','ô':'o','õ':'o','ō':'o','ő':'o','ǒ':'o',
  'ř':'r','ŕ':'r',
  'ś':'s','š':'s','ş':'s','ș':'s','ŝ':'s',
  'ť':'t','ţ':'t','ț':'t',
  'ù':'u','ú':'u','û':'u','ū':'u','ů':'u','ű':'u','ų':'u','ǔ':'u',
  'ý':'y','ÿ':'y',
  'ź':'z','ž':'z','ż':'z'
};
var TRANSLIT_RE = new RegExp('(' + Object.keys(TRANSLIT).join('|') + ')', 'gi');

function transliterate(input) {
  var s = String(input == null ? '' : input).replace(TRANSLIT_RE, function (m) {
    return TRANSLIT[m.toLowerCase()] || m;
  });
  // Fallback: strip any remaining combining marks (decomposable accents).
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Hood/name slug — hyphen separator. Mirrors old slugify() output for ASCII.
function slugify(s) {
  return transliterate(s).toLowerCase()
    .replace(/[\s\/]+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// City-key slug — also collapses underscores and drops parentheses.
function urlKey(k) {
  return transliterate(k).toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[\s\/_]+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// build.js image-key form — underscore separator (kept for cache-key parity).
function normKey(k) {
  return transliterate(k).toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[\s\/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

module.exports = { slugify: slugify, urlKey: urlKey, normKey: normKey, transliterate: transliterate };
