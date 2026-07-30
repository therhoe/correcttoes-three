# Correct Toes — Shopify Theme (Horizon)

Live theme for correcttoes.com (toe spacers designed by sports podiatrist Dr. Ray McClanahan; multi-brand store also carrying Lems, Luna Sandals, Vivobarefoot, etc.). Owner: Shep — a developer, not a trained designer; explain design reasoning, don't assume design vocabulary.

## Critical workflow

- **This repo has LIVE 2-way GitHub↔Shopify sync on `main`.** The Shopify theme editor commits back as `shopify[bot]`. **Always `git pull` before editing theme files** — and never hand-edit `config/settings_data.json` or `templates/*.json` while the theme editor is open on the connected theme.
- `docs/` is ignored by the Shopify sync — safe for documentation and design explorations.
- Templates and settings_data are auto-generated JSON (header comments say so); Shopify may reformat them on its next write. Preserve the header comment when rewriting.

## Design system — read `docs/design-system.md` before any visual change

The short version:
- **Fonts (decided 2026-07-28, do not revisit casually):** Archivo 700 headings (`archivo_n7`), DM Sans 400 body (`dm_sans_n4`), DM Sans 500 subheading/eyebrow (`dm_sans_n5`). H5 preset = eyebrow style.
- **Colors:** use the 6 color schemes by role (scheme-1 white default, scheme-3 gray alt, scheme-2 brand teal `#004d72`, scheme-4 brand orange `#d45511` sparingly, scheme-5 dark, scheme-6 image-overlay). Don't hardcode hex when a scheme fits; `#00000026` stored on blocks is inert stock-default noise — ignore it.
- Don't use `type_preset: "custom"` when a standard preset fits. Never reference `var(--font-primary--family)` — it's undeclared (see doc backlog).

## Established conventions (reference implementations)

- **Product cards** ("Edition 3 Merchant", chosen from `docs/product-card-exploration.html`): gallery → vendor eyebrow (12px text block, `{{ closest.product.vendor }}`) → title (15px DM Sans 500) → shaded-star rating (`★★★★☆ | 365`) on its own row → price → swatches. (The rating used to share a space-between `_product-card-group` row with the price; that group was removed 2026-07-30 so the rating sits directly under the title.) Reference: the `product-card` block in `templates/collection.json`. Rolled out to all commerce grids; `collection.library.json` deliberately keeps content-style cards (no price).
  - ⚠️ **Editing Edition 3 typography means editing it twice.** `snippets/color-variant-card.liquid` hardcodes a copy (it renders from a section, so it can't read block settings — see `docs/design-system.md` §5b for why this is unfixable).
- **Color variant cards:** `sections/main-collection.liquid` → "Color variant cards" group, default **off**. Splits a product into one card per colour, each linking to `?variant=`. Splits on option **name** ("Color"), never on swatch data; the `product_type` fence ("Toe Spacers") is required because shoe brands also have a `Color` option. Falls back to one card per product whenever a filter is active. Not yet applied to the homepage `product-list` rows.
- **Star ratings** live in `snippets/product-rating.liquid` (CSS in `snippets/product-rating-styles.liquid`); `blocks/review.liquid` is a thin wrapper over it. Don't add `| default:` to its boolean params — Liquid's `default` treats `false` as empty.
- **Heroes:** custom "Inset from page edges" checkbox + "Inset corner radius" slider + "Inset top margin" slider added to `sections/hero.liquid`; enabled (12px radius, 40px top) on all hero templates. Media insets to the page-width grid, aligning with the header logo; the top gap is independent of the side inset.
- **Sale badges** show computed "Save X%" (`blocks/_product-card-gallery.liquid`), fall back to "Sale" under 5%; badge uses scheme-4 orange. Quick add is ON globally.

## Working preferences (from the owner)

- **When given a screenshot with a named design point, address ONLY that point** — ignore every other design element in the image.
- Preferred flow for design decisions: build a self-contained comparison page in `docs/` (several "editions" on real store content, real brand colors, embedded fonts), publish as an artifact, let Shep pick, then apply the winner — reference-template first, site-wide rollout after preview approval.
- Commit and push after each coherent chunk so the Shopify preview theme stays current.

## Open items

- Judge.me: set a minimum review count (~3) in its admin so "1 reviews" rows hide — Shep's to-do, requires store admin.
- Deferred cleanup backlog with effort/risk ratings: `docs/design-system.md` §6 (font-primary alias, dead color scheme, Shoplift-era product template variants, gray consolidation, brand tokens).
