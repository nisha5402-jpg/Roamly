# Deploy: Domain-Authority Report + Events Engine Upgrade

## Files to upload (replace/add at these paths)
- api/report_walkable_food.js   ← NEW: the data-study page (linkable asset)
- api/events.js                 ← UPGRADED: richer cards + hybrid window (see below)
- vercel.json                   ← adds /reports/... route
- generate-sitemap.js           ← adds the report URL
- sitemap.xml                   ← regenerated

## 1. The report (your authority play)
Live at: /reports/most-walkable-food-neighbourhoods-europe
- Original research from your 384-neighbourhood data — a citable, quotable study.
- Has Article + Dataset JSON-LD (CC BY 4.0) so journalists & AI engines can cite it.
- 24 internal links into neighbourhood pages (helps their authority too).
- Headline finding auto-computes from live scores; re-deploy to refresh.

### What to DO with it (this is where authority actually comes from):
A linkable asset earns nothing until people link to it. Next steps (only you can do these):
1. Post the finding (not the link first) in relevant subreddits / FB expat groups:
   "I scored 384 European neighbourhoods on walkability + food — here's the top 25."
2. Email 5-10 travel bloggers/journalists the headline + offer the data.
3. Add the IndexNow key you generated earlier; request indexing in GSC.
4. Link to it from your homepage and relevant city/neighbourhood pages.
This single page won't move DA alone — the OUTREACH around it does.

## 2. Events engine upgrade (events.js)
Richer cards now render: venue, price, getting-there, insider tip + deeper blurb +
prominent "Book / official site" button. Window is now HYBRID: near-term events
grouped by date up top, then "Later this summer" below (through end of Sept), so
summer-peak cities (Bergen etc.) never look thin.

IMPORTANT: the richer fields (venue/price/getting_there/tip) only show for events
that HAVE them. Bergen + Lisbon are authored to the deep standard. The other 18
cities still have the older shallower data — they'll render fine (the new fields
just don't appear) but won't show the full depth until their data is re-authored.
That re-authoring is the next batch of work (see EVENTS_RUNBOOK deep-schema).

## Deep-schema event fields (for future authoring)
venue, price, getting_there, tip  ← all new, all optional, all shown if present.
