# Certificate Module — Architecture

## Overview

The Certificate module is a fully self-contained feature folder at `/Certificate/`
that integrates with the Rising Edge Technologies static site. It follows the same
conventions as every other module in the codebase:

- **No build step.** Plain HTML, CSS, and vanilla JS — works on `file://` or any
  static HTTP host.
- **Depth-aware paths.** `/Certificate/` is one level deep from site root, so all
  global assets use `../` (e.g. `../assets/css/main.css`, `../assets/js/core.js`).
- **RBAC-aware.** Auth and role checks use the same `re_user` / `re-logged-in`
  localStorage keys as the rest of the site.
- **Offline-first.** All API calls detect `location.protocol === 'file:'` or a
  network failure and fall back to `localStorage` (`re_certificates`), so the
  module is fully functional without a backend.

---

## Folder Structure

```
Certificate/
├── index.html          — Dashboard: list + stats
├── generate.html       — Issue new certificate (form)
├── preview.html        — Live A4 certificate preview + export
├── verify.html         — Public verification page
├── details.html        — Certificate details + audit log
├── resend.html         — Resend email
│
├── css/
│   └── certificate.css — Module-specific styles, imported after main.css
│
├── assets/
│   ├── seal.svg        — Company seal (gold, circular, "RISING EDGE TECHNOLOGIES")
│   ├── watermark.svg   — PCB-trace background watermark (0.06 opacity)
│   ├── badge.svg       — Shield "VERIFIED" badge
│   └── border.svg      — A4 landscape gold ornamental border (1123×794px)
│
├── js/
│   ├── certificate-api.js      — Data layer (CRUD + offline fallback)
│   ├── qr-generator.js         — QR code via qrcodejs CDN + SVG fallback
│   ├── certificate-renderer.js — Template fill + html2canvas PNG/print
│   ├── pdf-generator.js        — jsPDF + html2canvas → A4 landscape PDF
│   ├── email.js                — Email preview + resend
│   └── certificate.js          — Main controller (auto-inits by page path)
│
├── templates/
│   ├── certificate-template.html — Printable A4 `<div>` (injected as innerHTML)
│   └── email-template.html       — Standalone HTML email for mailers
│
├── api/
│   └── swagger.yaml    — OpenAPI 3.0 spec for the backend REST API
│
└── docs/
    ├── architecture.md — This file
    └── api.md          — API quick-reference
```

---

## JS Module Dependency Graph

```
certificate.js  ←─ certificate-api.js
                ←─ certificate-renderer.js  ←─ qr-generator.js
                ←─ pdf-generator.js
                ←─ email.js
```

`certificate.js` is the only entry point. It auto-detects which page it's on
via `window.location.pathname` and calls the appropriate `init*()` method.

---

## Certificate Document Dimensions

| Property     | Value                    |
|--------------|--------------------------|
| Format       | A4 Landscape             |
| Pixel size   | 1123 × 794 px (at 96dpi) |
| CSS class    | `.cert-doc`              |
| Print size   | 297mm × 210mm            |
| PDF scale    | html2canvas scale=3      |
| PNG scale    | html2canvas scale=2      |

The preview pages scale the `.cert-doc` element down using CSS `transform: scale(N)`
with `transform-origin: top left`. The `margin-bottom` correction accounts for
the removed height: `margin-bottom: calc(-794px * (1 - N))`.

---

## Offline / Demo Mode

`CertAPI` (in `certificate-api.js`) checks `location.protocol === 'file:'` on
load and sets `CertAPI.isOffline = true`. Every method returns a Promise that
resolves immediately from `localStorage.getItem('re_certificates')`.

Mock data is seeded on first load if the key is empty, so the UI is never blank.

When running via HTTP against the real backend, replace the base URL in
`certificate-api.js`:

```js
var BASE_URL = 'https://api.risingedgetechnologies.com/v1';
```

---

## Authentication & RBAC

| Page       | Minimum Role Required |
|------------|-----------------------|
| index      | ADMIN                 |
| generate   | ADMIN                 |
| preview    | ADMIN                 |
| verify     | Public (none)         |
| details    | ADMIN                 |
| resend     | ADMIN                 |

`certificate.js` calls `getAuthUser()` from `core.js`. If the user isn't logged
in or lacks the required role, it redirects to `../login.html`.

---

## Design Tokens

All certificate-specific tokens live in `css/certificate.css` under `:root`:

| Token           | Value   | Usage                    |
|-----------------|---------|--------------------------|
| `--cert-navy`   | #0B1F3A | Primary background       |
| `--cert-blue`   | #007BFF | Accent / CTA             |
| `--cert-gold`   | #D4AF37 | Borders, headings, seal  |
| `--cert-silver` | #C0C0C0 | Secondary metallic       |
| `--cert-bg`     | #F8F6F0 | Certificate document bg  |

Typography: **Cinzel** (headings on certificate) and **Playfair Display** (body
text on certificate), both from Google Fonts. Site UI uses **Inter** (global).

---

## QR Code

QR codes encode the public verification URL:

```
https://risingedgetechnologies.com/Certificate/verify.html?id={certificateNumber}
```

Rendered via `qrcodejs` CDN. If the CDN fails, `qr-generator.js` falls back to
an inline SVG placeholder. QR elements use `class="cert-qr-box"` and carry a
`data-url` attribute that the renderer reads at runtime.

---

## PDF Generation Pipeline

1. `pdf-generator.js` lazy-loads `html2canvas` and `jsPDF` from cdnjs CDN.
2. `html2canvas` rasterises the `.cert-doc` element at scale=3.
3. jsPDF creates a new A4 landscape document and adds the canvas as an image.
4. The PDF is saved via `jsPDF.save(filename)`.

All CDN loads are Promise-based and cached — subsequent calls do not re-insert
`<script>` tags.
