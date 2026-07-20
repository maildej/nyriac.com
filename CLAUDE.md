# CLAUDE.md — nyriac.com

## About the owner

Dan runs this project. **Dan is not a developer** and knows little about web design or development. When helping him:

- Explain things in plain English; avoid jargon (or define it when unavoidable).
- Make edits for him rather than telling him how to code.
- Keep the site simple — resist adding frameworks, build tools, or JavaScript unless truly needed.
- When something requires action outside this folder (GitHub, Wix), give exact click-by-click steps.

## What this site is

Website for the **New York Regional Immigration Assistance Centers (RIAC)**. In Dan's words:

> We provide free expert legal advice and support on immigration consequences for all mandated providers in New York state — expert legal advice for public defenders and assigned counsel, analyzing the immigration consequences of the case they are representing someone in. The website is relatively basic: it primarily gives attorneys access to our contact details and downloadable practice advisories.

Audience: attorneys (public defenders, assigned counsel, mandated providers) — not the general public.

## Important constraints

- **Do not use the branding of, or link to, the NYS Office of Indigent Legal Services (ILS)** or its website (ils.ny.gov) anywhere on the site. Factual information (region/county assignments, the centers' own contact details) is fine; ILS names, logos, and links are not. Avoid external links generally.
- The six regions, their colors, and county assignments mirror the RIAC logo and are listed in `tools/build-map.py`. Region colors are defined once in `css/style.css` (`--r1`…`--r6`).

## Technical setup

- **Plain static HTML/CSS.** No build step, no JavaScript, no frameworks, no Jekyll (`.nojekyll` disables it). One external dependency: Google Fonts (Source Serif 4 + Inter) loaded via a `<link>` in each page's `<head>`.
- **Hosting:** GitHub Pages, deployed from the `main` branch of a GitHub repo.
- **Domain:** `nyriac.com`, registered at **Wix**. Wix does not allow domain transfers or nameserver changes, so DNS is managed inside Wix: A records point the apex domain to GitHub Pages' IPs, and a CNAME points `www` to the GitHub Pages address. The `CNAME` file in this folder tells GitHub Pages the custom domain. See `SETUP.md` for the exact records.

## File map

| File | Purpose |
|---|---|
| `index.html` | Landing page: hero with the **clickable region map** (inline SVG), what we do, who we serve |
| `advisories.html` | List of downloadable practice advisory PDFs |
| `contact.html` | Six region cards (`#region-1` … `#region-6`) with counties served and each center's contacts — the map links here |
| `css/style.css` | All styling, shared by every page (brand + region colors at top in `:root`) |
| `images/riac-mark.svg` | Colored map mark used as the header logo on every page |
| `images/favicon.svg` | Browser tab icon (navy square + map) |
| `advisories/` | Drop advisory PDFs here; link them from `advisories.html` |
| `tools/` | Map generator (`build-map.py` + county boundary data). **Dan can ignore this folder**; it's only needed if region/county assignments ever change. It regenerates `tools/map-inline.svg`, which is pasted into `index.html` and mirrored in `images/`. |
| `404.html` | Shown for broken links (uses absolute `/` paths) |
| `CNAME` | Custom domain for GitHub Pages — **do not delete or edit** |
| `.nojekyll` | Tells GitHub Pages to serve files as-is — **do not delete** |
| `SETUP.md` | One-time GitHub + Wix DNS setup instructions for Dan |

## Conventions

- Navigation (header) and footer are copied into each page — when editing them, update **all three pages** (`index.html`, `advisories.html`, `contact.html`) plus `404.html`'s header.
- Pages use relative links (`advisories.html`); only `404.html` uses absolute links (`/advisories.html`) because GitHub serves it from any URL.
- Placeholder content is marked with yellow `.notice` boxes and the word "placeholder" — real contact details and advisory PDFs still need to be filled in.
- To publish changes: commit and push to `main` (or upload the changed files via github.com); GitHub Pages redeploys automatically in ~1 minute.

## Outstanding

- Dan must verify the six centers' contact details in `contact.html` (compiled from public sources, July 2026), then remove the yellow notice box there.
- Add real advisory PDFs to `advisories/` and update `advisories.html`.
- Complete the one-time setup in `SETUP.md` (create repo, enable Pages, add DNS records in Wix).
