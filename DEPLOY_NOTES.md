# Events Feature — Production Deploy

## Files to upload (replace existing at these exact paths)
- api/events.js          ← NEW: the events page handler
- api/events_data.js     ← NEW: 10-city verified events dataset (refresh 1st & 15th)
- api/city.js            ← MODIFIED: adds "See what's on" CTA (only for cities with events)
- vercel.json            ← MODIFIED: adds /:city/events route (before hood catch-all)
- generate-sitemap.js    ← MODIFIED: adds /events/ URLs for cities with data

## After uploading
Vercel auto-redeploys on commit. Then:
1. Visit /lisbon/events/ — should render the events page.
2. Visit /lisbon — scroll below the table, the dark "See what's on" button should appear.
3. Visit /porto — that button should NOT appear (Porto has no events yet — correct).
4. Run generate-sitemap.js locally OR let your build do it; confirm sitemap has /events/ URLs.

## Live cities (10): lisbon, copenhagen, barcelona, berlin, amsterdam,
   vienna, madrid, paris, rome, prague.

## How it stays fresh
- Page computes "today" server-side on every request (new Date()), so the
  8-week window and auto-hide are always current — NO hardcoded date.
- Past events (end date < today) auto-hide. Verified: Lisbon shows 5 events
  in June, drops to 2 by August automatically.
- Cache: s-maxage=3600 (1h) — shorter than city pages since events are time-sensitive.

## Refreshing data (1st & 15th)
Edit api/events_data.js per EVENTS_RUNBOOK.md. Keep the quality bar:
verify dates by web search, tag persona fitment honestly, add cautions,
never link to resellers. 3 events currently carry verified:false → they show
a "dates to confirm" badge. Confirm or remove them when you can.

## Adding the next 10 cities tomorrow
Just append new city keys to api/events_data.js (same schema). The route,
sitemap, and CTA all key off whether a city exists in that file — no other
code changes needed. The city's "See what's on" button appears automatically.

## Known notes
- Barcelona's Festa Major de Gràcia (Aug 14-20) is just outside the 8-week
  window today, so Barcelona shows 4 events now, 5 once the window rolls forward.
- 3 unverified-date events show a "dates to confirm" badge (your call to keep/hold).
