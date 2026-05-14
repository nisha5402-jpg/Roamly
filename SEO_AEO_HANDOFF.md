# LocaleChoice SEO + AEO Build — Handoff Notes

**Author:** Claude Opus 4.7 (May 2026 session)
**Status:** Ready to deploy
**Target:** SEO + AEO + agentic discovery (Google + ChatGPT/Claude/Perplexity + AI tool recommendations)

---

## What this build does

Takes LocaleChoice from 110 indexable pages with basic schema to **496 indexable pages with full AEO-optimised structured data**, plus a public JSON data API and a methodology page.

### Surface area expansion
| | Before | After |
|---|---:|---:|
| Indexable pages | 110 | 496 |
| Schema types per page | 3 | 5 |
| Public data endpoints | 0 | 2 (city + neighbourhood) |
| Methodology page | No | Yes |
| llms.txt | Basic 24-line | Curated index of 215 pages |

### What "AEO-optimised" means concretely

Every neighbourhood page now includes:

1. **TL;DR block** (`.tldr-block`) — declarative, answer-first 2-3 sentences right after the H1. This is THE primary citation surface for LLMs. Speakable schema flags it for extraction.
2. **Answer-first FAQ** — every FAQ answer starts with "Yes / No / It depends" before details. Six questions per page including the new "Who should stay here?" comparative question.
3. **Article schema** with author (Organization), datePublished, dateModified, mainEntityOfPage. AI agents weight authorship heavily.
4. **Place schema** with 7 `additionalProperty` entries — each score as a structured PropertyValue with name, value, maxValue, description. Machine-parseable.
5. **SpeakableSpecification** — flags `.tldr-block` and `.faq-a` as voice/AI extraction surfaces.
6. **Link to methodology page** in every score breakdown and footer — credibility signal.
7. **Link to JSON data endpoint** in every footer — `<link rel="alternate" type="application/json">` plus visible footer link.

---

## Files in this build

### New files (5)
- `api/neighbourhood.js` — handles `/{city}/{hood}/` URLs (384 pages)
- `api/methodology.js` — handles `/methodology` (credibility page)
- `api/data.js` — handles `/api/data/{city}` and `/api/data/{city}/{hood}` (machine-readable JSON)
- `generate-sitemap.js` — run after data changes; rewrites sitemap.xml
- `generate-llms-txt.js` — run after data changes; rewrites llms.txt

### Modified files (1)
- `api/city.js` — added `slugify()` helper, made hood names in table link to new neighbourhood pages, changed hood card primary CTA from "Ranked Recommendation" to "Full guide to {hood}"

### Regenerated artifacts (2)
- `sitemap.xml` — 496 URLs (1 home + 1 methodology + 110 cities + 384 neighbourhoods)
- `llms.txt` — 27KB curated AI agent index

### Updated config (1)
- `vercel.json` — added rewrites for `/methodology`, `/api/data/...`, `/{city}/{hood}/`

### Files NOT touched
- `index.html` (homepage — still pending rewrite to target "where to stay in Europe")
- `robots.txt` (already optimal — allows GPTBot, ClaudeBot, PerplexityBot, etc)
- `api/insights.js` (unchanged)
- `roamly_scores.json`, `roamly_insights.json` (data files)
- `README.md`

---

## Architecture decisions

**1. Why a single canonical TL;DR block (not multiple summaries)?**
Speakable schema needs ONE selector. Putting all summary content in `.tldr-block` makes it unambiguous which content LLMs and voice assistants should extract. Multiple summary patterns confuse the selector.

**2. Why answer-first FAQ patterns ("Yes." / "No." / "It depends")?**
LLMs extracting "is Príncipe Real safe?" want a leading verdict. Without it, they have to infer it from the score, which they may do incorrectly. With it, the citation is unambiguous: the page says yes.

**3. Why is `Place` schema using `additionalProperty` instead of custom fields?**
`additionalProperty` is the schema.org-blessed way to attach arbitrary numeric data. AI agents trained on schema.org know to parse this. Custom JSON keys outside the schema vocabulary would be ignored.

**4. Why public JSON API with wide-open CORS?**
Agentic web requires it. Claude/ChatGPT/Perplexity agents browsing the web need to fetch structured data without auth friction. The data is already public via the HTML pages — exposing it as JSON just makes it more efficient for agents.

**5. Why curated llms.txt (215 pages) instead of all 496?**
Token cost. LLMs ingesting llms.txt have a budget. 215 curated entries (110 cities + 100 deepest neighbourhoods + key static pages) is the sweet spot — comprehensive but not bloated. The depth scoring in `generate-llms-txt.js` ranks by editorial content density.

**6. Why include a methodology page if data files are public?**
Three reasons. First, AI agents preferentially cite sources with explicit methodology — it's an EEAT (experience, expertise, authority, trust) signal Google and LLMs both weight. Second, it's a place to disclose limitations openly (better than being called out for them later). Third, it ranks for searches like "how do you score neighbourhoods" — small but real long-tail.

**7. Why no `/{city}/{persona}/` pages (yet)?**
Avoiding thin-content collision with the 384 neighbourhood pages. Persona-as-path-segment would also collide with the neighbourhood regex unless carefully constrained. If you add this later, restrict to the 4 known persona strings and put them in vercel.json BEFORE the neighbourhood rewrite.

---

## Local testing

```bash
# Generate all preview HTMLs (in working directory):
node _test.js  # See /preview_*.html

# Regenerate sitemap and llms.txt after data changes:
node generate-sitemap.js
node generate-llms-txt.js
```

Open the previews in browser to verify:
- `preview_neighbourhood_lisbon-principe-real.html`
- `preview_methodology.html`
- `preview_data_lisbon-principe-real.json`
- `preview_city_lisbon.html` (updated with new outbound links)

---

## Deploy sequence

1. **Commit and push the 8 changed files:**
   ```
   api/neighbourhood.js       (new)
   api/methodology.js          (new)
   api/data.js                 (new)
   api/city.js                 (modified — slugify + outbound links)
   vercel.json                 (replaced)
   sitemap.xml                 (regenerated)
   llms.txt                    (regenerated)
   generate-sitemap.js         (new — utility)
   generate-llms-txt.js        (new — utility)
   ```

2. **Vercel auto-deploys.** Watch the build log for any cold-start issues with `data.js` (it loads the 5.4MB insights JSON).

3. **Smoke test live URLs:**
   - `https://www.localechoice.com/lisbon/principe-real/` → neighbourhood page
   - `https://www.localechoice.com/methodology` → methodology page
   - `https://www.localechoice.com/api/data/lisbon/principe-real` → JSON
   - `https://www.localechoice.com/api/data/lisbon` → city-level JSON
   - `https://www.localechoice.com/llms.txt` → AI index
   - `https://www.localechoice.com/sitemap.xml` → 496 URLs

4. **Google Search Console:**
   - Submit updated sitemap.xml
   - URL Inspection → request indexing on 10-15 strategic pages (mix of cities and neighbourhoods)

5. **Bing Webmaster Tools:**
   - Submit sitemap. Bing powers ChatGPT search — explicit Bing submission helps AEO.

6. **Test schemas:**
   - Schema.org validator: paste a neighbourhood URL
   - Google Rich Results Test: same URL
   - Should report Article, FAQPage, Place, BreadcrumbList all valid

7. **Test with Claude/ChatGPT directly:**
   - Ask ChatGPT: "Where should I stay in Lisbon for families? Cite your sources."
   - Should eventually cite LocaleChoice (4-12 weeks after deploy for AI training cycles to catch up; faster for live-search models like Perplexity).

---

## Common maintenance tasks for Sonnet 4.6

**Add a city:** Edit `roamly_scores.json` + `roamly_insights.json`, run both generators, commit.

**Add a persona:** Update `PERSONA_WEIGHTS`, `PERSONA_LABELS`, `PERSONA_EMOJI`, `PERSONAS` arrays in ALL of: `api/city.js`, `api/neighbourhood.js`, `api/data.js`, AND update the weights table in `api/methodology.js`. Four files. Easy to miss `methodology.js`.

**Change FAQ wording for neighbourhood pages:** Edit `buildFaqs()` in `api/neighbourhood.js`. Six questions; keep them answer-first.

**Change TL;DR pattern:** Edit `buildTldr()` in `api/neighbourhood.js`. Keep it 2-3 sentences, declarative, opens with verdict.

**Update score weights:** Update `PERSONA_WEIGHTS` in city.js, neighbourhood.js, data.js — AND update the table in methodology.js. All four must match.

---

## Known limitations to fix later

1. **Booking.com affiliate ID** still `REPLACE_WITH_YOUR_AID` in city.js and neighbourhood.js. Replace once registered.
2. **Homepage (`index.html`) not yet rewritten** for AEO. Should add a TL;DR + WebSite + Organization schema + ItemList of all 110 cities.
3. **98 cities still use generic INTROS fallback.** Rewriting custom intros for the other cities would strengthen city-page rankings significantly.
4. **No `/compare/{city}/{a}-vs-{b}/` pages yet.** This is Phase 3 — high-value SEO surface area for "X vs Y" queries.
5. **No author bio page.** AI agents preferentially cite sites with named human authors. An "About" page with a real name and credentials would boost EEAT.

---

## How AI discoverability is actually achieved (the real explanation)

Three pipelines run in parallel after deploy:

1. **Google index** — sitemap submission triggers crawling. Pages appear in 2-4 weeks. Schema-rich pages get rich results (FAQ accordion, breadcrumb display).
2. **Bing/ChatGPT index** — Bing webmaster submission. ChatGPT's web search runs through Bing, so this is the primary AEO pipeline.
3. **LLM training crawls** — GPTBot, ClaudeBot, PerplexityBot, Google-Extended are already whitelisted in robots.txt. They periodically re-crawl. Content from this build will appear in future model training, which means months not weeks. Live-search models (Perplexity, ChatGPT with browse, Claude with search) get it sooner.

The methodology page + llms.txt + JSON API are the agentic discovery pipeline. Agents browsing the web for travel queries can:
- Read llms.txt as a site map
- Fetch JSON directly for structured data
- Cite the methodology page for credibility

This is what "AEO-ready" means in practice — not magic, just being legible to the systems that will be doing more of the searching.

---

## Post-build audit log (May 14, 2026)

Three pre-existing bugs were found and fixed during the final audit. These bugs existed in the originally deployed code too — none were introduced by this build.

**Bug 1 — KEY_MAP value for Düsseldorf was wrong.** The map had `'dusseldorf':'\xfcsseldorf'` (missing the leading `d`), so Düsseldorf requests resolved to `üsseldorf` and 404'd. Fixed to `'dusseldorf':'d\xfcsseldorf'` in all three files (city.js, neighbourhood.js, data.js). Effect: Düsseldorf was previously unreachable; now works.

**Bug 2 — Three city keys have non-URL-safe characters** (`düsseldorf`, `malmö`, `heraklion_(crete)`). The Vercel regex `[a-z][a-z0-9_]+` rejected them, so clean URLs for these cities never worked. Internal links in city.js also emitted them raw. Fixed by adding a `urlKey()` helper to every file that emits URLs (city.js, neighbourhood.js, data.js, generate-sitemap.js, generate-llms-txt.js). The KEY_MAP handles the inbound conversion (URL-safe → raw key for data lookup); `urlKey()` handles the outbound conversion (raw key → URL-safe for emitted links).

**Bug 3 — Sitemap and llms.txt emitted broken URLs.** Same root cause as Bug 2. Fixed by applying `urlKey()` in both generator scripts.

**Verification after fixes:** Ran exhaustive route tests — all 110 cities, all 384 neighbourhood pages, all 110 JSON endpoints return 200 status with valid responses. Special cities (Düsseldorf, Malmö, Heraklion) now route via URL-safe forms (`/dusseldorf`, `/malmo`, `/heraklion_crete`) and emit only clean URLs in their internal links.

**Maintenance note for Sonnet 4.6:** `urlKey()` and `slugify()` are now in 5 files. They MUST stay byte-identical. If you add a new city with non-ASCII characters in the key, the `urlKey()` function will handle it automatically — no KEY_MAP entry needed unless Vercel's URL parsing rejects the URL-safe form for some reason. To test, run `node final_audit.js` from the project root after any change to handlers.
