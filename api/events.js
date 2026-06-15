// api/events.js — "What's on" events page per city.
// Mirrors the structure/conventions of api/city.js: serverless handler,
// require()'d JSON-ish data, _slug.js for URL keys, same brand CSS tokens.
//
// Route (see vercel.json):  /:city/events  ->  /api/events?city=:city
//
// Data:   api/events_data.js  (refresh 1st & 15th per EVENTS_RUNBOOK.md)
// Design: single page per city, 8-week rolling window, auto-hide past events
//         by end date AT REQUEST TIME (server computes "today"), persona
//         fitment chips + honest cautions + hashtags + two-tier links.

var scores = require('../roamly_scores.json');
var EVENTS = require('./events_data.js');
var SLUG = require('./_slug.js');
var urlKey = SLUG.urlKey;

// KEY_MAP parity with city.js: tolerate accented/legacy inbound keys.
var KEY_MAP = { 'malmö':'malmo', 'düsseldorf':'dusseldorf' };

var PERSONA_LABELS = { Solo:'Solo Explorer', Family:'Families', Foodie:'Food Lover', Culture:'Culture Seeker' };
var CAT_COLORS = {
  Festival:['rgba(139,58,58,.12)','#8B3A3A'],
  Music:['rgba(83,74,183,.12)','#534AB7'],
  Culture:['rgba(43,92,138,.10)','#1E4268'],
  Food:['rgba(138,94,26,.14)','#8A5E1A'],
  Family:['rgba(44,95,74,.12)','#2C5F4A'],
  Seasonal:['rgba(44,95,74,.12)','#2C5F4A']
};

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pad(n){return n<10?'0'+n:''+n;}
function todayUTC(){ var d=new Date(); return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())); }
function parseISO(s){ var p=String(s).split('-'); return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); }
var MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
var MON_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtShort(d){ return d.getUTCDate()+' '+MON_SHORT[d.getUTCMonth()]; }

function dateRange(e){
  var s=parseISO(e.start), en=parseISO(e.end);
  if(e.start===e.end) return fmtShort(s);
  return fmtShort(s)+' \u2013 '+fmtShort(en);
}
function groupOf(e, today){
  var s=parseISO(e.start);
  if(s<=today) return 'On now';
  var diffDays=(s-today)/86400000;
  if(diffDays<=7) return 'This week';
  if(s.getUTCMonth()===today.getUTCMonth() && s.getUTCFullYear()===today.getUTCFullYear()) return 'Later this month';
  return MON[s.getUTCMonth()];
}

function eventCard(e, today){
  var s=parseISO(e.start), en=parseISO(e.end);
  var live = s<=today && en>=today;
  var cc = CAT_COLORS[e.cat] || ['rgba(22,32,48,.08)','#162030'];
  var fitChips = Object.keys(e.fitment||{}).map(function(p){
    return '<span style="display:inline-flex;align-items:baseline;gap:5px;background:rgba(44,95,74,.12);border-radius:99px;padding:4px 11px;font-size:12.5px;color:#2C5F4A">'
      +'<b style="font-weight:700">'+esc(p)+'</b><span style="color:rgba(22,32,48,.5);font-size:11.5px">'+esc(e.fitment[p])+'</span></span>';
  }).join('');
  var cautionHtml = Object.keys(e.caution||{}).map(function(p){
    return '<div style="display:flex;gap:7px;align-items:flex-start;background:rgba(138,94,26,.14);border-radius:6px;padding:8px 11px;font-size:12.5px;color:#8A5E1A;line-height:1.45;margin-bottom:10px">'
      +'<b style="font-weight:700;white-space:nowrap">\u26A0 '+esc(p)+':</b><span>'+esc(e.caution[p])+'</span></div>';
  }).join('');
  var tagsHtml = (e.tags||[]).map(function(t){
    return '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:#2B5C8A;background:rgba(43,92,138,.10);padding:2px 8px;border-radius:6px">'+esc(t)+'</span>';
  }).join(' ');
  var hoodLink = e.hood ? '<a href="/'+urlKey(/* cityKey injected below */ CARD_CITYKEY)+'/'+SLUG.slugify(e.hood)+'/" style="font-size:13px;color:#2B5C8A;text-decoration:none">\uD83D\uDCCD Stay near: '+esc(e.hood)+'</a>' : '';
  var linkLabel = e.ltype==='official' ? 'Official site \u2197' : 'Find info \u2197';
  var linkHtml = (e.link && e.link!=='#')
    ? '<a href="'+esc(e.link)+'" target="_blank" rel="noopener nofollow" style="font-size:13px;color:#2B5C8A;text-decoration:none">'+linkLabel+'</a>'
    : '';
  return '<div style="background:#fff;border:1.5px solid '+(live?'#BFA040':'rgba(22,32,48,.08)')+';border-radius:18px;padding:18px 20px;margin-bottom:12px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">'
      +'<span style="font-family:\'DM Mono\',monospace;font-size:10px;padding:2px 9px;border-radius:99px;background:'+cc[0]+';color:'+cc[1]+'">'+esc(e.cat)+'</span>'
      +(live?'<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:#2C5F4A">\u25CF on now</span>':'')
      +(!e.verified?'<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:#8A5E1A;background:rgba(138,94,26,.14);padding:2px 8px;border-radius:99px">dates to confirm</span>':'')
    +'</div>'
    +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;text-transform:uppercase;font-size:22px;letter-spacing:.02em;line-height:1.05">'+esc(e.name)+'</div>'
    +'<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:rgba(22,32,48,.5);margin:3px 0 10px">'+dateRange(e)+' \u00B7 '+esc(e.area)+'</div>'
    +'<div style="font-size:14.5px;color:#1E2D3D;line-height:1.55;margin-bottom:12px">'+esc(e.blurb)+'</div>'
    +'<div style="font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:rgba(22,32,48,.5);margin-bottom:6px">who it suits</div>'
    +'<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">'+fitChips+'</div>'
    +cautionHtml
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+tagsHtml+'</div>'
    +'<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-top:1px dashed #DDD5C0;padding-top:11px">'+hoodLink+linkHtml+'</div>'
  +'</div>';
}
// closure-injected cityKey for hood links (set in generatePage)
var CARD_CITYKEY='';

function generatePage(cityKey, cityName, rawEvents){
  var today = todayUTC();
  CARD_CITYKEY = cityKey;
  var winEnd = new Date(today.getTime()+8*7*86400000); // 8 weeks

  // auto-hide: keep events whose END is today-or-later AND START within window
  var visible = (rawEvents||[]).filter(function(e){
    var en=parseISO(e.end), s=parseISO(e.start);
    return en>=today && s<=winEnd;
  }).sort(function(a,b){ return parseISO(a.start)-parseISO(b.start); });

  var ORDER=['On now','This week','Later this month'];
  // append month names in chronological order found
  var groups={};
  visible.forEach(function(e){ var g=groupOf(e,today); (groups[g]=groups[g]||[]).push(e); });
  var monthGroups = Object.keys(groups).filter(function(g){return ORDER.indexOf(g)<0;})
    .sort(function(a,b){ return MON.indexOf(a)-MON.indexOf(b); });
  var groupOrder = ORDER.filter(function(g){return groups[g];}).concat(monthGroups);

  var body;
  if(visible.length===0){
    body='<div style="background:#fff;border:1.5px dashed #DDD5C0;border-radius:12px;padding:22px;text-align:center;font-size:14px;color:rgba(22,32,48,.5)">'
      +'It\u2019s a quieter stretch in '+esc(cityName)+' right now. '
      +'<a href="https://www.google.com/search?q='+encodeURIComponent(cityName+' events this week')+'" target="_blank" rel="noopener nofollow" style="color:#2B5C8A">See the city\u2019s full calendar \u2192</a></div>';
  } else {
    body = groupOrder.map(function(g){
      return '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:13px;color:#9C821F;margin:22px 0 12px;display:flex;align-items:center;gap:10px">'+esc(g)+'<span style="flex:1;height:1px;background:#DDD5C0"></span></div>'
        + groups[g].map(function(e){return eventCard(e,today);}).join('');
    }).join('');
  }

  var hiddenCount = (rawEvents||[]).filter(function(e){ return parseISO(e.end)<today; }).length;
  var winLabel = fmtShort(today)+' \u2013 '+fmtShort(winEnd)+' '+winEnd.getUTCFullYear();

  var canonical = 'https://www.localechoice.com/'+urlKey(cityKey)+'/events/';
  var title = 'What\u2019s On in '+esc(cityName)+' \u2014 Events This Season | LocaleChoice';
  var desc  = 'The festivals, concerts and seasonal events on in '+esc(cityName)+' over the next 8 weeks \u2014 tagged by who they suit, with neighbourhoods to stay near. Updated 1st &amp; 15th.';

  // JSON-LD ItemList of events
  var ld = {
    "@context":"https://schema.org","@type":"ItemList",
    "name":"Events in "+cityName,
    "itemListElement": visible.map(function(e,i){
      var ev={"@type":"Event","name":e.name,"startDate":e.start,"endDate":e.end,
        "eventStatus":"https://schema.org/EventScheduled",
        "location":{"@type":"Place","name":e.area+', '+cityName}};
      if(e.link&&e.link!=='#'&&e.ltype==='official') ev.url=e.link;
      return {"@type":"ListItem","position":i+1,"item":ev};
    })
  };

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    +'<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    +'<title>'+title+'</title>'
    +'<meta name="description" content="'+desc+'">'
    +'<link rel="canonical" href="'+canonical+'">'
    +'<meta property="og:title" content="'+title+'"><meta property="og:description" content="'+desc+'">'
    +'<meta property="og:url" content="'+canonical+'"><meta property="og:type" content="website">'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet">'
    +'<script type="application/ld+json">'+JSON.stringify(ld)+'</script>'
    +'<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#F2EDE3;color:#162030;font-family:\'DM Sans\',system-ui,sans-serif;line-height:1.5}'
    +'.bar{background:#162030;height:6px}.wrap{max-width:760px;margin:0 auto;padding:0 20px 70px}'
    +'a{color:#2B5C8A}</style></head><body>'
    +'<div class="bar"></div><div class="wrap">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0">'
      +'<a href="/" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:22px;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;color:#162030">Locale<span style="color:#9C821F">Choice</span></a>'
    +'</div>'
    +'<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:rgba(22,32,48,.5);margin:6px 0 16px"><a href="/'+urlKey(cityKey)+'" style="text-decoration:none">'+esc(cityName)+'</a> \u203A What\u2019s on</div>'
    +'<h1 style="font-family:\'Playfair Display\',serif;font-size:clamp(28px,4.6vw,40px);line-height:1.12">What\u2019s on in '+esc(cityName)+' <i style="color:#1E2D3D">this season</i></h1>'
    +'<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:rgba(22,32,48,.5);margin:10px 0 6px">Next 8 weeks \u00B7 '+winLabel+' \u00B7 updated 1st &amp; 15th \u00B7 past events hidden automatically</div>'
    +'<p style="font-size:14px;color:#1E2D3D;margin:10px 0 18px;max-width:620px">The festivals and happenings worth planning a trip around \u2014 each one tagged with who it suits, and an honest word where it doesn\u2019t. <a href="/'+urlKey(cityKey)+'">See where to stay \u2192</a></p>'
    + body
    +'<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:rgba(22,32,48,.5);margin-top:24px;border-top:1.5px solid #DDD5C0;padding-top:14px;line-height:1.7">'
      + (hiddenCount>0 ? (hiddenCount+' past event'+(hiddenCount===1?'':'s')+' hidden automatically \u00B7 ') : '')
      +'refreshed 1st &amp; 15th \u00B7 free festivals link to official info, never a paid reseller \u00B7 '
      +'<a href="/'+urlKey(cityKey)+'">'+esc(cityName)+' neighbourhood rankings \u2192</a></div>'
    +'</div></body></html>';
}

module.exports = function handler(req,res){
  var cityKey=String(req.query.city||'').toLowerCase().trim();
  if(KEY_MAP[cityKey])cityKey=KEY_MAP[cityKey];
  if(!cityKey)return res.status(400).send('Missing city');
  var cityData=scores.cities[cityKey];
  if(!cityData)return res.status(404).send('City not found: '+cityKey);
  // events keyed by url-slug of the city key (matches events_data.js keys)
  var key = urlKey(cityKey);
  var rawEvents = EVENTS[key] || EVENTS[cityKey] || null;
  if(!rawEvents)return res.status(404).send('No events for this city yet');
  try{
    var html=generatePage(cityKey, cityData.name||cityKey, rawEvents);
    // shorter cache than city pages — events are time-sensitive
    res.setHeader('Cache-Control','s-maxage=3600,stale-while-revalidate=600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html);
  }catch(err){
    console.error('events.js error:',err.message,err.stack);
    return res.status(500).send('Error: '+err.message);
  }
};

module.exports._generatePage = generatePage; // for tests
