# Events Wave 2 — 10 more cities (20 total)

## Files to upload (replace existing)
- api/events_data.js   ← now 20 cities (was 10)
- sitemap.xml          ← regenerated, now 20 /events/ URLs

That's it. No other code changes — the route, the city-page CTA, and the
sitemap generator already key off whatever cities exist in events_data.js,
so adding cities is data-only.

## New cities (whitespace/SEO targets, summer-rich):
bergen, porto, gothenburg, gdansk, graz, krakow, valencia, tallinn,
ljubljana, seville

## Validation run before packaging
- All 20 cities render HTTP 200 with JSON-LD + canonical ✓
- 0 schema issues, 0 reseller links, all dates valid ✓
- CTAs confirmed appearing on new city pages ✓
- Sitemap: 20 events URLs ✓

## HONEST NOTE — verification is thinner on wave 2
16 of 78 events are verified:false (show a "dates to confirm" badge). Wave 2
leans more on recurring-annual events whose exact 2026 dates I couldn't pin to
a single confident source (esp. Tallinn, Graz, Valencia — smaller cities, less
English coverage). They're real events at roughly the right time, but BEFORE you
lean on these pages for outreach, confirm the flagged dates against official
sites and flip verified:true (or remove). They're honest as-is (badge shows
uncertainty), just not as airtight as wave 1.

## After deploy
1. Hard-refresh / cache-bust a new city: localechoice.com/bergen/events/?x=1
2. Request indexing in GSC for your 2-3 strongest NEW cities (Porto, Krakow, Bergen)
3. Tomorrow's wave 3: same process, append to events_data.js
