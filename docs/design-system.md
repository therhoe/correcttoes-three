# Correct Toes — Theme Design System

Reference for anyone editing this theme (in code or the Shopify theme editor).
Theme base: Shopify **Horizon**. Audited 2026-07-28; fonts switched to Archivo + DM Sans the same day.

> **TL;DR rules:** Use the type presets, not "Custom". Use color schemes, not hex pickers.
> When you need the brand orange or teal, copy the exact hex from this doc.

---

## 1. Font roles

Two typefaces, four roles. All fonts are served by the Shopify Fonts API (no font files in `assets/`), loaded with `font-display: swap` and preloaded in `snippets/fonts.liquid`.

| Role | Typeface | Weight | CSS variables | Used for |
|---|---|---|---|---|
| Body | **DM Sans** | 400 | `--font-body--family/style/weight` | Paragraphs, RTE text, most UI |
| Heading | **Archivo** | 700 | `--font-heading--*` | H1–H4, H6 |
| Subheading | **DM Sans** | 500 | `--font-subheading--*` | H5 / eyebrow labels, product-card titles & vendor |
| Accent | **DM Sans** | 400 | `--font-accent--*` | Available, rarely used |

Shopify font handles: `archivo_n7`, `dm_sans_n4`, `dm_sans_n5` (set in Theme settings → Typography). Previous pairing (Figtree + Open Sans) retired 2026-07-28 — comparison specimens in [`font-exploration.html`](font-exploration.html).

⚠️ **`--font-primary--*` does not exist.** ~50 blocks across the template JSONs store `var(--font-primary--family)` as their font value — a leftover from an older setup. It's harmless today (the value is only emitted when a block's type preset is "Custom", and no block combines the two), but **never select it for new work, and don't flip those blocks to the Custom preset** without fixing the font first. Backlog item #1 removes this landmine.

## 2. Type scale

Set globally in **Theme settings → Typography**. Do not rebuild these sizes per-block.

| Preset | Size | Font | Notes |
|---|---|---|---|
| H1 | 56px | Heading (Archivo 700) | Fluid on small screens (auto `clamp()`) |
| H2 | 48px | Heading | Fluid |
| H3 | 32px | Heading | |
| H4 | 24px | Heading | The workhorse heading in practice (62 uses) |
| H5 | 14px | Subheading (DM Sans 500), loose letter-spacing | **This is the eyebrow/kicker style**, not a "small heading" — use it above a heading, sparingly. Also sizes the compact product-card rating |
| H6 | 16px | Heading | Bold-label size (product-card prices use this) |
| Paragraph | 16px | Body (DM Sans 400), loose line-height | |

Mechanics (for developers): sizes ≥ 48px are automatically converted to fluid `clamp()` values in `snippets/theme-styles-variables.liquid` (~lines 243–352); below 48px they're static rem. There is also a fixed token ramp `--font-size--3xs` (10px) → `--font-size--6xl` (56px) for component CSS.

**Do:** pick the closest preset (H1–H6/Paragraph) in the block's Typography settings.
**Don't:** use the **"Custom"** preset unless no standard preset can work. Custom is the only path that emits per-block font/size CSS, and it's where drift comes from. (24 blocks currently use it — acceptable, don't add more.)

## 3. Color schemes

Six active schemes, defined in Theme settings → Colors. **Sections should get color from a scheme, not from hex pickers.**

| Scheme | Role | Background | Text | Usage count |
|---|---|---|---|---|
| `scheme-1` | **Default** — white surface | `#ffffff` | `#000000` / `#000000cf` | 90 |
| `scheme-3` | **Alt surface** — light gray band, for alternating section rhythm | `#f5f5f5` | `#000000` / `#000000cf` | 52 |
| `scheme-2` | **Brand teal** — high-emphasis band, white text | `#004d72` | `#ffffff` | 20 |
| `scheme-4` | **Brand orange** — strongest accent band, use sparingly | `#d45511` | `#ffffff` | 8 |
| `scheme-5` | **Dark** — near-black band | `#333333` | `#ffffff` | 8 |
| `scheme-6` | **Image overlay** — transparent bg, white text; for text sitting on photos (heroes) | transparent | `#ffffff` | 3 |

A 7th scheme (`scheme-58084d4c-…`, transparent bg / dark text) is defined but **used nowhere** — dead weight, safe to delete (backlog #2). Don't start using it.

**Rule of thumb for page rhythm:** scheme-1 → scheme-3 → scheme-1 for normal alternation; drop in one scheme-2 (teal) band for a major moment per page; scheme-4 (orange) at most once per page — it's the loudest thing the brand owns.

## 4. Brand palette

| Token | Hex | Where it lives |
|---|---|---|
| Brand orange | `#d45511` | scheme-4 background; secondary-button background in schemes 1–2 |
| Brand teal | `#004d72` | scheme-2 background; selected-variant color in scheme-1 |
| Brand teal (light) | `#006288` | selected-variant hover; some overlays |
| Light gray surface | `#f5f5f5` | scheme-3 background — **the** light gray |
| Dark surface | `#333333` | scheme-5 background |

Semantic tokens already defined in `snippets/theme-styles-variables.liquid`: `--color-error` `#8B0000`, `--color-success` `#006400`, `--color-white`, `--color-black`, plus stock-status colors (`--color-instock` etc.).

**Gray discipline:** the theme's files contain near-duplicate grays from past editing (`#f2f2f2` ×18, `#f9f9f9`, `#fafafa`, `#6b6b6b`). Going forward use **`#f5f5f5`** for any light-gray surface and scheme colors for text grays. Consolidating the existing strays is backlog #4.

**Known noise, ignore it:** `#00000026` appears ~575 times in template JSONs on `background_color`/`overlay_color` settings. That's the stock Horizon overlay default that the editor materializes onto every block — it is not drift, don't try to clean it up.

## 5. Do / Don't (editing rules)

**Typography**
- ✅ Use H1–H6/Paragraph presets; H5 is the eyebrow style.
- ✅ Change global sizes in Theme settings → Typography (affects everything consistently).
- ❌ Don't use the "Custom" type preset when a standard preset fits.
- ❌ Don't select fonts per-block; roles are global.

**Color**
- ✅ Give sections a color scheme; pick per the roles table above.
- ✅ Need brand orange/teal in a one-off setting? Copy the exact hex from §4.
- ❌ Don't invent new grays or near-brand colors ("almost-orange", "other teal").
- ❌ Don't add new color schemes without writing down their role here.

**Workflow (once the repo is connected to Shopify's GitHub integration)**
- ✅ `git pull` before editing theme files locally — the theme editor commits back to the branch.
- ❌ Don't hand-edit `config/settings_data.json` or `templates/*.json` while someone has the theme editor open on the connected theme.
- ℹ️ `docs/` is ignored by the Shopify sync — this file lives only in git.

## 5b. Color variant cards — a duplicated copy of Edition 3 typography ⚠️

`sections/main-collection.liquid` has a **"Color variant cards"** settings group
(default **off**). When enabled, a product is split into one card per colour, each
linking to that colour's `?variant=` URL. Rendered by
`snippets/color-variant-card.liquid`, gated by `snippets/color-variant-option-values.liquid`.

**The hazard:** those cards are rendered from a *section*, not from the block system,
so they **cannot read the Edition 3 block settings** and instead hardcode the typography.

Why it can't be fixed: the grid renders cards via
`{% content_for 'block', type: '_product-card', closest.product: product %}`, and that
API takes a **product only** — there is no `closest.variant`, and `product.selected_variant`
is only ever set by Shopify (from a `?variant=` URL or a filter). So a colour card cannot
be a `_product-card` block, and a snippet cannot reach block settings:
`main-collection` declares no `blocks` in its schema and `collection.json`'s `main` has no
`block_order`, only `static: true` blocks, which are **not** enumerable via `section.blocks`.

| Element | Value | Source of truth |
|---|---|---|
| Vendor eyebrow | `0.75rem`, subheading family, letter-spacing loose, pad-top 6 | `templates/collection.json` → `vendor_eyebrow` |
| Title | `0.9375rem`, subheading family, letter-spacing normal, pad-top 2 | → `product_title_*` |
| Colour name | `0.75rem`, subheading family (colour cards only) | n/a — new |
| Rating | preset `h5`, shaded stars, divider, no "reviews" label — own row under the title | → `review_*` |
| Price | preset `h6`, pad-top 4 — own row under the rating | → `price_*` |

- ✅ Retune Edition 3 in the theme editor? **Also update `snippets/color-variant-card.liquid`.**
- ✅ Card *chrome* (radius, padding, gap, image ratio) is a section setting, so it does **not** need syncing.
- ℹ️ Split matches on option **name** ("Color"), not on swatch data — the "Closeout Sale" product
  has an option named "Available" whose values look like colours and would wrongly expand.
- ℹ️ The `product_type` fence ("Toe Spacers") is **required**, not defensive: shoe brands
  (Lems, Vivobarefoot, Luna) also carry a `Color` option.

## 6. Backlog (known issues, deliberately deferred)

| # | Item | Effort | Risk | Notes |
|---|---|---|---|---|
| 1 | Declare `--font-primary--family/style/weight` as aliases of `--font-body--*` in `snippets/theme-styles-variables.liquid` (~line 169); also fix 2 schema defaults in `sections/hero.liquid` (~lines 1479/1507) that seed the invalid value into new hero sections | S | near-zero | Defuses the Custom-preset landmine; zero visual change today |
| 2 | Delete dead scheme `scheme-58084d4c-…` from `config/settings_data.json` (definition ~lines 419–457; duplicate inside `presets.Horizon`) | S | low | Re-verify 0 usages immediately before deleting |
| 3 | Product template consolidation: 8 product template variants (`original`, `original-v2`, `sport`, `sport-v2`, `stable`, `stable-v2`, `ct-closeout`, +) look like Shoplift A/B leftovers and hold most of the stored drift. Verify assignments first — Admin GraphQL: `{ products(first: 250) { nodes { handle templateSuffix } } }` — then delete unassigned ones (git history preserves them) | M | medium | Biggest cleanup win available |
| 4 | Replace stray `#f2f2f2` (×18) with `#f5f5f5` in surviving templates | S | low | Do after #3 |
| 5 | Add `--color-brand-orange: #d45511` / `--color-brand-teal: #004d72` / `--color-brand-teal-light: #006288` tokens to `theme-styles-variables.liquid` | S | none | Documentation-in-code for future custom sections |

---

*Companion file: [`font-exploration.html`](font-exploration.html) — side-by-side specimen of the current font pairing vs. three alternatives (all available in Shopify's font library). Open it in a browser.*
