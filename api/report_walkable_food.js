// api/report_walkable_food.js — Data study: Most Walkable Food Neighbourhoods in Europe.
// A LINKABLE ASSET for domain authority: original research from the 384-neighbourhood
// dataset, with a quotable headline finding, ranked tables, transparent methodology,
// and Dataset + Article JSON-LD so journalists/AI engines can cite it.
//
// Route (add to vercel.json):
//   /reports/most-walkable-food-neighbourhoods-europe  ->  /api/report_walkable_food
//
// Refresh: regenerate whenever scores update (rankings recompute from live data).

var scores = require('../roamly_scores.json');
var SLUG = require('./_slug.js');
var urlKey = SLUG.urlKey, slugify = SLUG.slugify;

var YEAR = 2026;
var UPDATED = 'June 2026';

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function buildData(){
  var rows=[];
  Object.keys(scores.cities).forEach(function(ck){
    var c=scores.cities[ck];
    Object.keys(c.neighbourhoods).forEach(function(hn){
      var d=c.neighbourhoods[hn];
      var walk=d.walk||0, food=d.food||0;
      rows.push({ck:ck, hood:hn, city:c.name, country:c.country||'',
        walk:walk, food:food, composite: Math.round((walk*0.5+food*0.5)*10)/10});
    });
  });
  rows.sort(function(a,b){return b.composite-a.composite || b.food-a.food;});
  // city averages (2+ hoods)
  var byCity={};
  rows.forEach(function(r){ (byCity[r.city]=byCity[r.city]||[]).push(r); });
  var cityAvg=Object.keys(byCity).map(function(c){
    var a=byCity[c];
    return {city:c, ck:a[0].ck, country:a[0].country,
      avg: Math.round(a.reduce(function(x,y){return x+y.composite;},0)/a.length*10)/10, n:a.length};
  }).filter(function(x){return x.n>=2;}).sort(function(a,b){return b.avg-a.avg;});
  return {rows:rows, cityAvg:cityAvg, total:rows.length};
}

function hoodRow(r,i){
  var rank=i+1;
  var medal = rank<=3 ? '#BFA040' : '#162030';
  return '<tr style="border-bottom:1px solid #EAE3D3">'
    +'<td style="padding:11px 8px;font-family:\'DM Mono\',monospace;font-size:14px;color:'+medal+';font-weight:500">'+rank+'</td>'
    +'<td style="padding:11px 8px"><a href="/'+urlKey(r.ck)+'/'+slugify(r.hood)+'/" style="color:#162030;text-decoration:none;font-weight:500">'+esc(r.hood)+'</a>'
      +'<div style="font-size:12px;color:rgba(22,32,48,.5)">'+esc(r.city)+', '+esc(r.country)+'</div></td>'
    +'<td style="padding:11px 8px;text-align:center;font-family:\'DM Mono\',monospace;font-size:13px">'+r.walk+'</td>'
    +'<td style="padding:11px 8px;text-align:center;font-family:\'DM Mono\',monospace;font-size:13px">'+r.food+'</td>'
    +'<td style="padding:11px 8px;text-align:center;font-family:\'DM Mono\',monospace;font-size:15px;color:#9C821F;font-weight:500">'+r.composite+'</td>'
  +'</tr>';
}
function cityRow(r,i){
  return '<tr style="border-bottom:1px solid #EAE3D3">'
    +'<td style="padding:10px 8px;font-family:\'DM Mono\',monospace;font-size:14px;color:#162030">'+(i+1)+'</td>'
    +'<td style="padding:10px 8px"><a href="/'+urlKey(r.ck)+'" style="color:#162030;text-decoration:none;font-weight:500">'+esc(r.city)+'</a> <span style="font-size:12px;color:rgba(22,32,48,.5)">'+esc(r.country)+'</span></td>'
    +'<td style="padding:10px 8px;text-align:center;font-family:\'DM Mono\',monospace;font-size:13px;color:rgba(22,32,48,.5)">'+r.n+'</td>'
    +'<td style="padding:10px 8px;text-align:center;font-family:\'DM Mono\',monospace;font-size:15px;color:#9C821F;font-weight:500">'+r.avg+'</td>'
  +'</tr>';
}

function generatePage(){
  var D=buildData();
  var top1=D.rows[0], top2=D.rows[1], topCity=D.cityAvg[0];
  var hoodTable = D.rows.slice(0,25).map(hoodRow).join('');
  var cityTable = D.cityAvg.slice(0,15).map(cityRow).join('');

  var canonical='https://www.localechoice.com/reports/most-walkable-food-neighbourhoods-europe';
  var title='Europe\u2019s Most Walkable Food Neighbourhoods ('+YEAR+') | LocaleChoice Report';
  var headline = esc(top1.hood)+' in '+esc(top1.city)+' tops Europe\u2019s walkable-food ranking';
  var desc='A data study of '+D.total+' European neighbourhoods ranking where you can eat best on foot. '
    +esc(top1.hood)+' ('+esc(top1.city)+') and '+esc(top2.hood)+' ('+esc(top2.city)+') lead; '
    +esc(topCity.city)+' is the strongest city overall.';

  // Article + Dataset schema
  var ld = {
    "@context":"https://schema.org","@graph":[
      {"@type":"Article","headline":headline,"description":desc,"url":canonical,
       "datePublished":"2026-06-15","dateModified":"2026-06-15",
       "author":{"@type":"Organization","name":"LocaleChoice"},
       "publisher":{"@type":"Organization","name":"LocaleChoice"}},
      {"@type":"Dataset","name":"Europe Walkable Food Neighbourhood Index "+YEAR,
       "description":"Composite walkability and food-scene scores for "+D.total+" neighbourhoods across European cities.",
       "url":canonical,"creator":{"@type":"Organization","name":"LocaleChoice"},
       "license":"https://creativecommons.org/licenses/by/4.0/",
       "measurementTechnique":"Composite of LocaleChoice walkability and food scores (0\u2013100), equally weighted."}
    ]
  };

  var css='*{margin:0;padding:0;box-sizing:border-box}body{background:#F2EDE3;color:#162030;font-family:\'DM Sans\',system-ui,sans-serif;line-height:1.6}'
    +'.bar{background:#162030;height:6px}.wrap{max-width:820px;margin:0 auto;padding:0 20px 80px}'
    +'a{color:#2B5C8A}table{width:100%;border-collapse:collapse;margin:14px 0}'
    +'th{text-align:left;font-family:\'Barlow Condensed\',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:rgba(22,32,48,.5);padding:8px;border-bottom:1.5px solid #DDD5C0}'
    +'h2{font-family:\'Barlow Condensed\',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:26px;margin:38px 0 6px}'
    +'p{margin:12px 0}';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    +'<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    +'<title>'+title+'</title><meta name="description" content="'+esc(desc)+'">'
    +'<link rel="canonical" href="'+canonical+'">'
    +'<meta property="og:title" content="'+esc(headline)+'"><meta property="og:description" content="'+esc(desc)+'">'
    +'<meta property="og:url" content="'+canonical+'"><meta property="og:type" content="article">'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet">'
    +'<script type="application/ld+json">'+JSON.stringify(ld)+'</script>'
    +'<style>'+css+'</style></head><body><div class="bar"></div><div class="wrap">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0">'
      +'<a href="/" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:22px;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;color:#162030">Locale<span style="color:#9C821F">Choice</span></a>'
      +'<a href="/methodology" style="font-size:13px;color:rgba(22,32,48,.6);text-decoration:none">Methodology</a>'
    +'</div>'
    +'<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:rgba(22,32,48,.5);margin:6px 0 10px">LocaleChoice Report \u00b7 '+UPDATED+'</div>'
    +'<h1 style="font-family:\'Playfair Display\',serif;font-size:clamp(28px,5vw,42px);line-height:1.12">Europe\u2019s Most Walkable Food Neighbourhoods</h1>'
    +'<p style="font-size:17px;color:#1E2D3D">We scored <b>'+D.total+' neighbourhoods</b> across European cities on walkability and food, then ranked where you can eat best entirely on foot \u2014 no taxis, no planning. '+esc(top1.hood)+' in '+esc(top1.city)+' comes out on top.</p>'

    +'<div style="background:#fff;border:1.5px solid #BFA040;border-radius:14px;padding:20px 24px;margin:24px 0">'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:12px;color:#9C821F;margin-bottom:6px">The headline finding</div>'
      +'<div style="font-size:18px;line-height:1.5"><b>'+esc(top1.hood)+'</b> ('+esc(top1.city)+') and <b>'+esc(top2.hood)+'</b> ('+esc(top2.city)+') lead Europe for walkable dining, each scoring '+top1.composite+'/100. At city level, <b>'+esc(topCity.city)+'</b> is the strongest overall, averaging '+topCity.avg+' across '+topCity.n+' neighbourhoods.</div>'
    +'</div>'

    +'<h2>Top 25 neighbourhoods</h2>'
    +'<p style="font-size:14px;color:rgba(22,32,48,.6)">Composite = walkability and food scores, equally weighted (0\u2013100). Click any neighbourhood for its full profile.</p>'
    +'<table><thead><tr><th>#</th><th>Neighbourhood</th><th style="text-align:center">Walk</th><th style="text-align:center">Food</th><th style="text-align:center">Score</th></tr></thead><tbody>'+hoodTable+'</tbody></table>'

    +'<h2>Top 15 cities overall</h2>'
    +'<p style="font-size:14px;color:rgba(22,32,48,.6)">Average walkable-food score across a city\u2019s scored neighbourhoods (cities with 2+ neighbourhoods).</p>'
    +'<table><thead><tr><th>#</th><th>City</th><th style="text-align:center">Hoods</th><th style="text-align:center">Avg</th></tr></thead><tbody>'+cityTable+'</tbody></table>'

    +'<h2>Method</h2>'
    +'<p style="font-size:14.5px">Every LocaleChoice neighbourhood carries seven 0\u2013100 scores built from open mapping data and place density. For this study we combined the <b>walkability</b> and <b>food</b> scores into an equally-weighted composite, then ranked all '+D.total+' neighbourhoods in our dataset. No paid placements, no editorial thumb on the scale \u2014 the same transparent scores power every ranking on the site. Full method at <a href="/methodology">our methodology page</a>.</p>'
    +'<p style="font-size:13px;color:rgba(22,32,48,.5)">Data: LocaleChoice Neighbourhood Index, '+UPDATED+'. Free to cite with a link to this page (CC BY 4.0).</p>'

    +'<div style="background:#fff;border:1.5px solid rgba(22,32,48,.08);border-radius:14px;padding:18px 22px;margin-top:28px">'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;text-transform:uppercase;font-size:18px">Want this for your own trip?</div>'
      +'<p style="margin:6px 0 0;font-size:14px">LocaleChoice ranks neighbourhoods in 110 European cities by how well they fit <i>you</i> \u2014 walkability, food, safety, transit, family, cost and vibe. <a href="/">Find your neighbourhood \u2192</a></p>'
    +'</div>'
    +'</div></body></html>';
}

module.exports = function handler(req,res){
  try{
    var html=generatePage();
    res.setHeader('Cache-Control','s-maxage=86400,stale-while-revalidate=3600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  }catch(err){
    console.error('report_walkable_food error:',err.message,err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};
module.exports._generatePage = generatePage;
