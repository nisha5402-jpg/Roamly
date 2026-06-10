// _render_samples.js — renders a fixed sample of pages to ./_out/<label>/
// Usage: node _render_samples.js <label>
var fs = require('fs'), path = require('path');
var label = process.argv[2] || 'baseline';
var OUT = path.join(__dirname, '_out', label);
fs.mkdirSync(OUT, { recursive: true });

function mockRes(file) {
  var headers = {};
  return {
    setHeader: function(k, v){ headers[k] = v; },
    statusCode: 200,
    status: function(c){ this.statusCode = c; return this; },
    send: function(body){
      fs.writeFileSync(path.join(OUT, file),
        '<!-- status:' + this.statusCode + ' headers:' + JSON.stringify(headers) + ' -->\n' + String(body));
    },
    json: function(obj){
      fs.writeFileSync(path.join(OUT, file),
        '<!-- status:' + this.statusCode + ' headers:' + JSON.stringify(headers) + ' -->\n' + JSON.stringify(obj, null, 1));
    },
    end: function(body){ this.send(body || ''); }
  };
}

var samples = [
  ['neighbourhood', { city: 'berlin',     hood: 'kreuzberg'   }, 'n_kreuzberg.html'],
  ['neighbourhood', { city: 'lisbon',     hood: 'bairro-alto' }, 'n_bairroalto.html'],
  ['neighbourhood', { city: 'copenhagen', hood: 'amager'      }, 'n_amager.html'],
  ['neighbourhood', { city: 'stockholm',  hood: 'ostermalm'   }, 'n_ostermalm.html'],
  ['neighbourhood', { city: 'ljubljana',  hood: 'metelkova'   }, 'n_metelkova.html'],
  ['city',          { city: 'copenhagen' },                      'c_copenhagen.html'],
  ['city',          { city: 'copenhagen', budget: '1' },         'c_copenhagen_budget.html'],
  ['persona',       { city: 'stockholm',  persona: 'family' },   'p_sthlm_family.html'],
  ['persona',       { city: 'lisbon',     persona: 'solo' },     'p_lisbon_solo.html'],
  ['compare',       { city: 'copenhagen', pair: 'norrebro-vs-indre-by' }, 'x_cph_compare.html'],
  ['data',          { city: 'copenhagen' },                      'd_copenhagen.json'],
  ['data',          { city: 'copenhagen', hood: 'vesterbro' },   'd_vesterbro.json']
];

samples.forEach(function(s){
  var handler = require('./api/' + s[0] + '.js');
  try {
    handler({ query: s[1], headers: {}, url: '/' }, mockRes(s[2]));
    console.log('OK  ', s[2]);
  } catch (e) {
    console.log('FAIL', s[2], e.message);
  }
});
