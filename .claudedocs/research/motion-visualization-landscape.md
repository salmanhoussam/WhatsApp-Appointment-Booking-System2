# Research — Motion / Code-Generated Visualization Landscape

**Status:** Research only. **No decision is made by this document.** Captured 2026-09-30 at
Salman's request, to answer "what could Alzabt actually build in this direction, and what is worth
starting?" — and so that the exclusions below are never re-derived from memory.

**Measured against:** `HEAD = 3ade90a`, 2026-09-30. Every `REPO` figure below is perishable; re-measure
before trusting it.

**Consumed by:** `.claudedocs/adr/ADR-0008-visual-report.md` (which cites this for its rejections).
**Sibling:** `.claudedocs/research/whatsapp-visual-report-journey.md` — that one is the product
journey inside our own system; this one is the outside landscape.

> **Evidence tags, per Salman's rule of 2026-09-30.** A research finding is not a decision, and the
> distinction has to survive being read months later:
>
> | tag | meaning |
> |---|---|
> | `SOURCE` | an external source says it |
> | `REPO` | measured in this repository |
> | `INFER` | our conclusion from the two above — **not a fact** |
> | `PROP` | a proposal |
> | `DECISION` | ratified by Salman |
> | `UNKNOWN` | unresolved, with the reason |
>
> This document contains **zero** `DECISION`. Decisions live in ADR-0008.

---

## 1. What Opus 5.5 is actually doing

`SOURCE` The model **outputs text only**. It writes a program that draws, and a browser runs it.
The contract every source converges on:

```
window.DURATION          the length
async window.seek(t)     "what does the screen look like at time t?"
the rule:                "Every pixel is a pure function of t"
forbidden:               Date.now · requestAnimationFrame · timers · CSS transitions · unseeded Math.random
then:                    Playwright → seek(i/fps) → screenshot →|pipe|→ ffmpeg -c:v libx264 -crf 18
```

`INFER` Why determinism matters for us specifically: frame 200 is computed without running frames
1–199, so output is reproducible, reviewable in a diff, and any frame can be captured directly.

`SOURCE` The code-versus-pixel argument, verbatim (Ciyo):

> *"A video model paints every frame as pixels, and it can redraw your logo slightly differently in
> each one. Code moves the real vector shapes, so the logo on the last frame is exactly the logo you
> gave it, in exactly your colours, at any size."*

`INFER` For a tenant with a brand colour and a price list, code is therefore the structurally
correct choice, not a preference: **the number you write is the number that appears.**

`SOURCE` Its stated limit: *"Code-driven motion is clean and geometric… For a smoky, filmic or
photographic clip, a video model is still the better tool."*

---

## 2. The pattern, measured locally — the most valuable finding here

`REPO` `/home/musicmaster/Downloads/motion_example` was accessible and inspected. **It holds
renders, not source**: 19 MP4 files, zero HTML, zero JS.

> ⇒ Questions about `seek(t)`, determinism and data separation **cannot be answered from that
> folder**, and were not guessed.

**Measured envelope** (ffprobe, all 19 identical):

```
720 × 900 (4:5)  ·  30 fps  ·  240 frames  ·  8.000 s exactly
h264 · yuv420p · level 3.1 · profile HIGH · has_b_frames=2
107 KB – 314 KB  (~105–310 kbps)
audio: AAC stereo 44.1 kHz at 3891 bps ⇒ an effectively empty track; the graphics are silent
box order: ftyp → moov → free → mdat  ⇒ faststart ✅
19 distinct mid-frame checksums ⇒ 19 genuinely different scenes
```

`INFER` **~150 KB for eight seconds.** Flat vector-ish content compresses extremely well, so file
size is not an obstacle for any distribution channel.

🔴 `REPO` + `SOURCE` **A trap worth keeping:** these files are `profile=High` with `has_b_frames=2`,
and Meta's own documentation states High-profile-with-B-frames is **not supported by Android
WhatsApp clients**. The render envelope is a deliberate choice (`-profile:v main -bf 0 -movflags
+faststart`), never a default. Rendering with defaults and sending would fail silently on a large
share of phones.

### The workflow, read off the rendered cards themselves

`REPO` The article is paywalled (§3), but the method is legible **inside the frames**:

```
Three steps:
  1  Pick one motion — "Like a chart or SVG. One effect per file, never all 16 at once."
  2  Show Claude a reference and name every state — "The start, the end, and how long each part takes."
  3  Ask for HTML and SVG, then fix it round by round — "One change per round."

PROMPT 1 (extract):
  "Open motion-board.html in this folder. I want the tile labelled: Chart morph.
   One effect.html that shows ONLY that tile, at 1080 x 1080. Keep the 8-second timing.
   Do not change motion-board.html."

PROMPT 2 (substitute):
  "In effect.html, keep the motion and change only the content.
   Words: [your headline].  Numbers: [your real numbers].  Colours: [your brand hex codes].
   Change one thing at a time."
```

`INFER` The real architecture is not "a model makes a video". It is:

```
motion-board.html  =  one component library holding every effect   ← written once, committed
      │ extract        choosing a scene type
      ▼
effect.html  +  [words] + [real numbers] + [brand colours]
      ▼
deterministic render  →  MP4
```

`INFER` **This is the same shape we already run** for tenant pages: `page_templates/` +
`page_content.json` + `primary_color`. The pattern is not new to us; only its output is.

### 🟢 Confirmed twice, independently

| | Charlie Hills (`REPO`, measured) | AI Topia (`SOURCE`, read) |
|---|---|---|
| structure | 4 categories × 4 effects = 16 | 4 × 4 = 16 |
| categories | INTERFACES · DATA AND LISTS · TYPE · SYSTEMS | Interfaces · Data · Type · Systems |
| names | Chart morph · Dashboard zoom · Glass focus… | Stat count-up · Bar race · Funnel fill… |
| cadence | 8 seconds | *"Every tile runs on the same 8-second cycle"* |
| brand | orange / cream | Electric Blue `#292DEB` + Ember `#F2A65A` |

`INFER` Two different boards, one structure. By this project's own Abstraction Rule (two
independent real cases), **"motion board + extract + substitute" is an earned pattern, not one
person's trick.**

`SOURCE` And AI Topia states the template/generation distinction outright:

> *"Ask Claude to copy a tile that already works and change only the words, and you keep the motion
> that works."* — versus — *"Ask Claude to 'make an animation about X' and you get something new and
> unpredictable every time."*

---

## 3. Source review

| source | what it gives | reliability | relevance |
|---|---|---|---|
| **Charlie Hills** (substack) | 🔴 **paywalled.** Only pricing and positioning visible; the text itself says *"The rest of this issue is for subscribers."* **The gated part was not read.** | — | the local renders replaced it entirely |
| **claudevideo.org/how-it-works** | three pipelines; HyperFrames and Remotion named; Remotion *"especially suited for data-driven and templated video"* | 🟢 consistent with all others | 🟢 high |
| **claudevideo.org** (index) | 8 categories: Motion Graphics 335 · Product & Ads 173 · Explainers 172 · Interactive 146 · Stories 109 · 3D 75 · Art 61 · Production 52 | 🟡 counts fine; view counts are claims | 🟡 mostly skill demos, not products |
| **awesome-opus-5.5-video** | 1,088 works in 8 sections, `cases.json` | 🟢 real index | 🟡 few data-visualization entries |
| **AI Topia** | 16 templates, 8-second cycle, embedded fonts, verbatim prompts, brand hex substitution | 🟢 high | 🟢 **highest** — second independent instance |
| **Ciyo (guide)** | structured prompts, states on a beat grid, `seek(t)`, springs, self-review loop | 🟢 high | 🟢 high |
| **Ciyo (logo)** | 1080×1920, 6 s, 30 fps = 181 frames; code-vs-pixel argument; 99.4% colour fidelity | 🟢 checkable numbers | 🟢 first 9:16 evidence |
| **Simon Berg** | showreel → *studio*: *"A structured document. A real interface for the human. And an agent with equal access to both."* | 🟡 one experience | 🟢 **highest architecturally** |
| **Revid** | 16:9 = 78% · median 29 s · 71% no voiceover · **zero of twelve craft variables predicted engagement**; *"distribution decided, not the edit"* | 🟡 **reported observations, not facts** | 🟢 high, as a counterweight |
| **opus55video.com** | 16:9 · 9:16 · 1:1; browser-side encoding, *"downloads complete in seconds"* | 🟡 commercial product page | 🟢 revealed the client-side path |
| **japsnap/motionreels** | a skill: reads a site, builds a product video. Puppeteer + `ffmpeg-static`, fixed `template/index.html`, `profile.json` separating prefs from rendering, a quality gate that blocks "slop" | 🟢 open source | 🟢 closest to a real use case. ⚠️ **GPL-3.0 — read as a pattern, never borrow code into a closed base** |
| **HyperFrames** | Apache-2.0, **no per-render fee**, byte-identical output, Puppeteer + FFmpeg, adapters (GSAP/Lottie/Three) | 🟢 real repository | 🟢 **best licence position** |
| **imginn** | an aggregator | — | ⚪ **not opened** |

---

## 4. Social patterns

```
🟢 REPO      the full Charlie Hills board — 19 clips measured locally
🟡 SOURCE    @stephanlivera — a 15 s showreel reported past two million views (a claim)
🟡 SOURCE    Rob Hallam · Meng To — reported praise for animation and 3D handling
🟡 SOURCE    recurring Reels shape: 1080×1920 · ~15 s · readable caption + end card
🔴 UNKNOWN   original Instagram/X posts were NOT reached — only their descriptions in articles
```

`REPO` The distribution pattern is visible on the last card: *"Comment MOVE and I'll send you all
16"* — a lead magnet. `INFER` This explains why 16:9 showreels dominate: **the purpose is to market
the maker, not to serve a customer.** Not one example found serves someone who does not know what
motion design is.

---

## 5. The 16 effects, ranked by whether they carry data

`REPO` Read from the frames. The only question asked: does it hold real numbers?

| # | effect | "Use it for" (as written) | value to us |
|---|---|---|---|
| **05** | **Chart morph** — bars become a line through their tops | *"A campaign result in a client report"* | 🟢🟢 highest |
| **06** | **Dashboard zoom** — one tile advances from the overview | *"Pulling out the KPI that matters"* | 🟢🟢 highest |
| **14** | **Glass focus** — a lens sharpens one line of a list | *"The one line of a pricing table you want read"* | 🟢 |
| **15** | Flowing paths — pulses between nodes | *"A funnel or automation diagram"* | 🟡 |
| **04** | Tabs → panels | *"Comparing plans or packages"* | 🟡 |
| **01–03** | Button→player · Search→results · Card→workspace | product demos | 🟡 |
| **07** | Spring stack | *"Three testimonials"* | 🟡 |
| **09–12** | Masked/Elastic type · Text→layout · Image reveal | headlines | ⚪ decoration |
| **08 · 13 · 16** | Magnetic dock · Perspective shift · Particle logo | brand | 🔴 pure WOW |

```
4 of 16 carry data  ·  4 adaptable  ·  8 decoration
⇒ "16 effects" is not 16 opportunities. It is four.
```

`REPO` **A detail worth copying:** card 05 carries the word **`illustrative`** beside its number —
the maker labelled his own fake data. `PROP` In our contract that should be a **field, not a
choice**.

---

## 6. Technology comparison

`SOURCE` + `REPO`. Stated criteria, not a ranking.

| | ① Recharts | ② HTML+seek+Playwright+ffmpeg | ③ Remotion | ④ HyperFrames | ⑤ LLM at build time | ⑥ LLM at runtime | ⑦ WebCodecs in-browser |
|---|---|---|---|---|---|---|---|
| output | live DOM | MP4 | MP4 | MP4 | **source template** | video/chart | MP4 |
| deterministic | 🟢 | 🟢 | 🟢 | 🟢🟢 byte-identical | 🟢 reviewable in diff | 🔴 no | 🟢 |
| interactive | 🟢🟢 | ❌ | ❌ | ❌ | — | — | ❌ |
| cost | $0 | $0 | 🔴 **$100/mo floor** ($0.01/render) | 🟢 **$0** | ~$0.66 once per template | 🔴 per run | $0 |
| licence | MIT | — | 🔴 **company licence ≥4 employees**; Enterprise from $500/mo | 🟢 **Apache-2.0** | — | — | browser standard |
| server dependency | ❌ | 🔴 yes | 🔴 yes | 🔴 yes | ❌ | 🔴 yes | 🟢🟢 **none** |
| privacy | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🔴 data leaves | 🟢🟢 never leaves browser |
| tenant isolation | query | file by prefix | same | same | neutral | 🔴 every call a path | 🟢🟢 no shared file |

`REPO` What we already have: `recharts ^2.15.3` · `three ^0.183` · `ffmpeg` at `/usr/bin/ffmpeg` ·
`node v20.20.2` · `ANTHROPIC_API_KEY` present in `config.py:68` and empty.

`SOURCE` WebCodecs: ~95.5% browser coverage, **no Safari `VideoEncoder`**, GPU-encoded, output never
leaves the page, needs `mp4-muxer` for the container.

`INFER` Three consequences: Remotion carries a real commercial cost for a SaaS · HyperFrames gives
the same class for free · and WebCodecs would remove our weakest link entirely (Playwright on
Railway is unmeasured, and its MCP was disconnected on the day of this research). Its limit: the
file stays on the viewer's device, so it serves "download and share", **not** "the system sends it".

---

## 7. Data-driven template versus per-tenant generation

| | 🟢 template + JSON + brand + deterministic renderer | 🔴 tenant data → LLM → a video each time |
|---|---|---|
| privacy | figures never leave our server | every tenant's revenue leaves on every run |
| cost | **$0 per render** | ~$0.66 × tenants × frequency, unbounded |
| reproducibility | byte-identical | yesterday's report cannot be reproduced |
| debugging | the scene is a file in the repo; a fault shows in a diff | "why did it come out like that?" has no answer |
| isolation | data injected, template neutral | every run is a potential leak path |
| consistency | every tenant gets the same quality | varies |

`INFER` The evidence points one way. The strongest counter-argument is not technical: **Charlie
Hills himself works the second way** — the model edits the HTML each time. The difference is scale.
He makes 16 clips once; we would make a report × N tenants × forever. **Scale inverts the answer.**

`SOURCE` Simon Berg's formulation is the one that generalises:

> *"A structured document. A real interface for the human. And an agent with equal access to both."*

`INFER` `PROP` All three already exist here — `client.config` is the structured document, the
dashboard is the human interface, **Lia is the agent with equal access**. A motion scene becomes
another editable section rather than a parallel product. *(Recorded as a proposal. Not opened.)*

---

## 8. Risks

| # | risk | tag |
|---|---|---|
| 🔴 1 | building a display on top of zero — `caracas`/`arizona` carry zero orders | `REPO` |
| 🔴 2 | the WOW trap — 12 of 12 craft variables predicted nothing; 8 of 16 effects are decoration | `SOURCE` |
| 🔴 3 | a video cannot be withdrawn — a wrong figure lives on in a phone | `INFER` |
| 🔴 4 | default encoding fails silently — High profile + B-frames on Android | `REPO`+`SOURCE` |
| 🔴 5 | moving revenue history — no amount stored on `Reservation`, so a price change rewrites the past | `REPO` |
| 🟡 6 | Remotion's contractual cost | `SOURCE` |
| 🟡 7 | unmeasured render dependency — Chromium on Railway unknown | `UNKNOWN` |
| 🟡 8 | `motionreels` is GPL-3.0 | `SOURCE` |
| 🟡 9 | clinic privacy — patient appointment data in a file on WhatsApp | `INFER` |
| 🟡 10 | unlabelled illustrative data | `INFER` |

---

## 9. Candidate POCs — none executed

```
A  Time-series endpoint            nothing to do with motion; useful even if this direction dies
B  Live chart on real data         cheapest proof of value; may make everything below unnecessary
C  One deterministic scene         proves determinism, data separation, re-branding, output envelope
D  Three aspect ratios from one    proves distribution; requires the encoding envelope of §2
E  In-browser render (WebCodecs)   proves a zero-server, zero-cost, full-privacy path
```

**Not proposed:** a model call per tenant · Remotion before the licence is settled · any WhatsApp
send before a media capability exists.

---

## 10. Open questions

```
UNKNOWN  Chromium/Playwright on Railway — never measured
UNKNOWN  original Instagram/X posts — not reached
UNKNOWN  the paywalled half of Charlie Hills — not read
Q        is the product a live chart, a report video, or a social clip? Three products, not three formats
Q        one data-series contract feeding all renderers? (evidence supports it; not executed)
Q        where to prove it — barber is ready and indexed; restaurant is the priority and has no data
```

---

## 11. What this research concluded, and what it did not

`INFER` **The strongest finding was not about video.** It is that the pattern behind it — a
structured document, a human interface, and an agent with equal access to both — already exists in
this system, and that a data-driven template with a deterministic renderer is a shape we already
run for tenant pages.

`INFER` **And the strongest counter-finding:** every public example is built to impress peers. The
one study that measured outcomes found the craft predicted nothing. **Production polish is not the
product.**

🔴 **No decision is made here.** ADR-0008 took the decisions that followed, and it cites this
document for its rejections — particularly Remotion, and per-tenant model generation.

*A method note worth keeping: the self-review loop the sources describe — render → contact sheet →
harsh critique → fix — is exactly the ffmpeg tiling used to read the 19 clips for §5. The tool that
makes these scenes is the tool that inspects them, which makes an automated quality gate (as in
`motionreels`) achievable rather than aspirational.*
