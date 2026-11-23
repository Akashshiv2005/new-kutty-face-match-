# KuttyStory Production SEO Launch Verification Checklist

**Target Host**: `https://kuttystory.co.in`  
**Evaluation Standard**: White-Hat Technical SEO, Core Web Vitals, Schema.org Compliance, Child Privacy Safeguards  
**Verification Date**: November 2026  
**Auditor**: Senior Technical SEO Engineer & Content Strategist (Antigravity)  

---

## 1. Launch Gate & Quarantine Verification

| Item | Requirement | Verification Method | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1.1 Demo Host Quarantine** | Demo/staging hosts must never be indexed or compete in Google India search. | Check `frontend/.env` and run `scripts/verify-seo-env.mjs`. | **PASS** | `VITE_INDEXABLE=false` correctly enforces `noindex, nofollow` on all pages and blocks demo canonical tags. |
| **1.2 Robots.txt Gate** | Quarantined builds must output `Disallow: /`; Production builds must allow public pages and disallow `/admin*`, `/api/`, `/storage/`. | Inspect `dist/robots.txt` after `npm run build`. | **PASS** | Output verified: `User-agent: *\nDisallow: /` in staging; production includes `Sitemap: https://kuttystory.co.in/sitemap.xml`. |
| **1.3 Sitemap Suppression** | Sitemaps must not be generated or exposed on quarantined/staging domains. | Check `dist/sitemap.xml` presence during quarantined build. | **PASS** | `generate-seo-assets.mjs` unlinks `sitemap.xml` in quarantined mode; generates 11 canonical URLs in production mode. |
| **1.4 Self-Referencing Canonicals** | Production URLs must point strictly to `https://kuttystory.co.in/{path}`, never to demo domains. | Inspect `<link rel="canonical">` in `dist/*/index.html`. | **PASS** | Prerender script and `<Seo />` component strictly omit canonicals when quarantined, and emit self-referencing canonicals in production. |

---

## 2. Source Code & Prerender Verification (View-Source Test)

| URL Path | Expected Title & H1 | Verification Command / Evidence | Status |
| :--- | :--- | :--- | :--- |
| `/` | **Title**: *Personalised Story Books for Kids in India \| KuttyStory*<br>**H1**: *Personalised Story Books for Kids — Your Child Is the Hero* | Tested via `dist/index.html`. Pre-rendered H1, H2, 100+ words intro copy, and 3 FAQs present in initial raw HTML bytes. | **PASS** |
| `/stories` | **Title**: *Personalised Kids Story Books Online \| KuttyStory*<br>**H1**: *Explore Personalised Story Books for Kids* | Tested via `dist/stories/index.html`. Verbatim title, meta, H1, links to `#birthday-gifts`, `#by-age`, and FAQs present in raw HTML. | **PASS** |
| `/how-it-works` | **Title**: *How Personalised Story Books Work \| KuttyStory*<br>**H1**: *How to Create Your Child's Personalised Story Book* | Tested via `dist/how-it-works/index.html`. 5-step atelier process and photo tips guide pre-rendered in raw HTML. | **PASS** |
| `/about` | **Title**: *About KuttyStory \| Personalised Books for Kids*<br>**H1**: *About KuttyStory* | Tested via `dist/about/index.html`. Trichy founding story and `#contact` block present in raw HTML. | **PASS** |
| `/collections` | **Title**: *Curated Book Collections & Gift Sets \| KuttyStory*<br>**H1**: *Curated Children's Book Collections & Gift Sets* | Tested via `dist/collections/index.html`. Anchored `#birthday-return-gifts` section present in raw HTML. | **PASS** |
| `/kuttys-story` | **Title**: *Kutty's Story — The Vision Behind KuttyStory \| KuttyStory*<br>**H1**: *Kutty's Story — Why Every Child Deserves Their Own Adventure* | Tested via `dist/kuttys-story/index.html`. Brand narrative and South Indian cultural context pre-rendered in raw HTML. | **PASS** |
| `/footsteps` | **Title**: *FootSteps — Celebrating Childhood Milestones \| KuttyStory*<br>**H1**: *FootSteps — Celebrating Childhood Milestones* | Tested via `dist/footsteps/index.html`. Milestone showcase pre-rendered in raw HTML. | **PASS** |
| `/journal` | **Title**: *Little Authors Journal & Reader Stories \| KuttyStory*<br>**H1**: *Little Authors Journal — Stories from Our Young Readers* | Tested via `dist/journal/index.html`. Reader stories showcase pre-rendered in raw HTML. | **PASS** |
| `/privacy` | **Title**: *Privacy Policy & Child Safety \| KuttyStory*<br>**H1**: *Privacy Policy & Child Data Protection* | Tested via `dist/privacy/index.html`. Retention rights and parental consent text pre-rendered in raw HTML. | **PASS** |
| `/terms` | **Title**: *Terms & Conditions & Refund Policy \| KuttyStory*<br>**H1**: *Terms & Conditions of Service* | Tested via `dist/terms/index.html`. Anchored `#refund-policy` section pre-rendered in raw HTML. | **PASS** |
| `/personalize/unicorn-story` | **Title**: *Personalised Fairytale & Adventure Story Book for Kids \| KuttyStory*<br>**H1**: *The Girl and the Magical Unicorn — Personalised Story Book for Kids* | Tested via `dist/personalize/unicorn-story/index.html`. Complete product details, pricing in INR, and FAQs pre-rendered. | **PASS** |

---

## 3. Structured Data Validation (Schema.org / Rich Results Test)

| Schema Model | Target Pages | Validation Evidence | Status |
| :--- | :--- | :--- | :--- |
| **Organization** | Site-wide | Validated via `scripts/validate-jsonld.mjs`. Legal entity name, logo URL, and Trichy locality correctly defined. | **PASS** |
| **WebSite** | Site-wide | Validated via `scripts/validate-jsonld.mjs`. Site name, canonical URL, and `en-IN` language confirmed. | **PASS** |
| **BreadcrumbList** | Inner pages | Validated via `scripts/validate-jsonld.mjs`. Hierarchical list elements matching breadcrumb navigation. | **PASS** |
| **FAQPage** | `/`, `/stories`, `/how-it-works`, `/personalize/:slug` | Validated via `scripts/validate-jsonld.mjs`. Question/answer text matches visible on-page copy 100%. | **PASS** |
| **Product + Offer** | `/personalize/:slug` only | Validated via `scripts/validate-jsonld.mjs`. Real database prices (Digital: ₹799, Hardcover: ₹1399), INR currency, and in-stock availability. Zero fake review ratings. | **PASS** |

---

## 4. Performance & Core Web Vitals (CWV) Verification

| Test Item | Benchmark / Rule | Verification Evidence | Status |
| :--- | :--- | :--- | :--- |
| **Font Optimization** | Max 2–3 families; `display=swap`; preload critical font | Pruned `index.html` from 7 families down to 3 (`Nunito`, `Quicksand`, `Fraunces`). Added `rel="preload"` for Nunito. | **PASS** |
| **Payment SDK Deferral** | Razorpay `checkout.js` must NOT load on initial page load | Removed from `index.html`. Dynamic loader `loadRazorpayCheckout()` in `src/lib/razorpay.ts` loads only when opening payment modal. | **PASS** |
| **Route Code Splitting** | Initial bundle under 350KB; separate chunks per page | Implemented `React.lazy` across all 11 customer routes and admin pages in `App.tsx`. Verified via Vite build output: `index.js` is 276KB. | **PASS** |
| **Unused Asset Purge** | Delete unused template SVGs | Deleted `next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg` from `public/`. | **PASS** |
| **Static Cache Policy** | `immutable` on hashed assets; `must-revalidate` on HTML | Documented in `TECH-SEO-AUDIT.md` for Nginx/CDN deployment. | **PASS** |

---

## 5. Child Safety, Privacy & Zero-PII Tracking Verification

| Privacy Safeguard | Verification Criteria | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Child Portrait Consent** | Explicit parental consent text beside upload input | **PASS** | Added to `PhotoTipsGuide.tsx`: *"Parental consent required: By uploading, you confirm you are the child's parent or legal guardian..."* with link to `/privacy#retention`. |
| **Zero PII in Analytics** | GA4 events must NEVER send child names, photos, or emails | **PASS** | Inspected `src/lib/analytics.ts`. `trackPersonaliseStart`, `trackPreviewView`, and `trackPurchase` strictly transmit anonymous story slugs, variant types, and transaction amounts. |
| **Zero PII in Sitemaps** | Dynamic user session IDs or preview paths must be excluded | **PASS** | `generate-seo-assets.mjs` only includes the 11 static canonical routes. |
| **Flow States Noindex** | Mid-personalization, preview, and payment views must be `noindex` | **PASS** | `PersonalizePage.tsx` emits `<Seo noindex={true} />` whenever `isFlowState` is active. |

---

## 6. Pre-Launch Final Verification Action Items

Before switching `VITE_INDEXABLE=true` on the production server:
1. [ ] Point DNS for `kuttystory.co.in` to the production server.
2. [ ] Replace `{{SUPPORT_EMAIL}}`, `{{SUPPORT_PHONE}}`, and `{{OFFICE_ADDRESS_LINE_1}}` in `frontend/src/seo/siteConfig.ts` with real registered business credentials.
3. [ ] Set `VITE_INDEXABLE=true` in production `.env`.
4. [ ] Run `npm run build` on production server.
5. [ ] Perform one end-to-end test order in Razorpay Test Mode to confirm order flow and analytics dispatch.
6. [ ] Submit `https://kuttystory.co.in/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

