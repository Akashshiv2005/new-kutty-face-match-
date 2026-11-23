# KuttyStory SEO: Open Questions, Placeholders & Approvals

> This document tracks all items requiring founder/product owner verification or approval under strict white-hat SEO rules. Fabricated claims, reviews, ratings, statistics, addresses, or phone numbers are never published; instead, they are held here with `{{PLACEHOLDER}}` tags until verified.

---

## 1. Architectural & Routing Approvals (Priority)

### A. Dedicated 404 Error Page
- **Current State**: Catch-all route in `App.tsx` (`<Route path="*" element={<Navigate to="/" replace />} />`) silently redirects any invalid URL directly to the homepage `/`.
- **SEO Impact**: Returning a 302/client-side redirect to the home page for missing pages creates a "Soft 404" in Google Search Console, confusing crawlers and diluting homepage authority.
- **Proposed Solution**: Create a dedicated `<NotFoundPage />` that displays a helpful 404 message ("Story Not Found"), offers links back to `/stories` and `/`, and emits a `noindex, nofollow` tag.
- **Status**: ⏳ **Pending Approval from User** (hard rule 1 prevents modifying `App.tsx` route table without user approval).

### B. Missing Refund Policy Page
- **Current State**: The website footer links "Refund Policy" to `/terms`. On `/terms`, there are general provisions, but no dedicated `/refund-policy` URL.
- **SEO & Google Merchant Trust Impact**: Google Search Console, Google Merchant Center, and Razorpay compliance guidelines prefer a clearly discoverable, dedicated cancellation & refund policy page.
- **Proposed Solution**: Keep `/terms` covering both Terms and Refund Policy for now, with an anchored section `<section id="refund-policy">` so that the footer link `<Link to="/terms#refund-policy">` lands directly on the exact refund criteria. If desired, propose adding a dedicated `/refund-policy` route in `App.tsx`.
- **Status**: ⏳ **Pending Approval from User**.

### C. Order Attribution Database Field ("How did you hear about us?")
- **Current State**: No database column in `orders` table to track marketing channel attribution (e.g. preschool flyer, pediatric clinic QR, friend referral, Instagram).
- **Proposed Solution**: Add an optional `referral_source` (VARCHAR 100) and `utm_campaign` (VARCHAR 100) via an Alembic database migration, paired with a non-intrusive dropdown in the shipping/order modal.
- **Status**: ⏳ **Pending Approval from User** (requires executing an Alembic migration).

---

## 2. Unverified Product Claims & Codebase Audit Findings

| Item | Code / Claim Found | Codebase Verification | White-Hat SEO Status & Safe Copy |
| :--- | :--- | :--- | :--- |
| **Print vs Digital** | Digital PDF (₹799) vs Hardcover Print (₹1399) | **Verified in Code**: Backend `seed_stories.py` sets `price_digital=799.0`, `price_print=1399.0`. PDF generation via ReportLab is implemented; checkout and Razorpay handle digital and print options. | **Approved for copy**: Accurately explain both instant PDF download and physical hardcover print formats. |
| **Delivery Time** | "Delivered in 10-15 days" | **Verified by Founder/Owner**: Instant PDF download upon generation; physical hardcover print delivered in 10–15 days based on delivery person / courier partner across all over India. | **Approved for copy**: Accurately state: Instant PDF download; physical hardcover delivered in 10–15 days based on courier delivery partner across all 28 states and union territories in India. |
| **Tamil Language Availability** | "Available in Tamil & English" | **Partially Implemented**: Backend contains `font/` and language toggle flags, with language surcharge field, but AI generation prompt and text replacement in story pages is predominantly English. | **Cautious Wording**: "English edition with Tamil support in development/select titles" — avoid promising 100% Tamil catalog-wide until backend story translation pipeline is fully enabled. |
| **Refund & Cancellation Policy** | "100% money back guarantee" | **Code check**: Custom personalised goods are non-refundable once print rendering begins, but reprints for manufacturing defects are standard. | **Accurate Policy**: State clearly: *"Due to individual child personalisation, orders cannot be cancelled once digital generation has commenced. We offer free reprints for any printing or binding defects."* |
| **Group / Bulk Return Gifts** | Return gifts for birthday parties | **Code check**: No automated bulk checkout discount or tiered pricing in database. | **Inquiry-First Copy**: Provide direct inquiry contact via WhatsApp / email for bulk party packs without inventing fake tiered price tables. |

---

## 3. Placeholders Inventory (`{{PLACEHOLDER}}`)

The following data points are marked with `{{PLACEHOLDER}}` in copy and schemas:

1. **Business Physical Address**:
   - `{{OFFICE_ADDRESS_LINE_1}}`: E.g., [Door No, Street Name], Tiruchirappalli, Tamil Nadu, 6200XX, India.
   - *Current Schema*: Uses general founding location: `Tiruchirappalli, Tamil Nadu, India`.
2. **Support Phone Number**:
   - `{{SUPPORT_PHONE}}`: Currently using configured WhatsApp number `+91 90031 69615`. Needs confirmation whether this is also the official voice support line.
3. **Official Support Email**:
   - `{{SUPPORT_EMAIL}}`: Official support email set to `info@kuttystory.co.in`.
4. **Operating Hours**:
   - `{{SUPPORT_HOURS}}`: E.g., `Monday to Saturday, 9:30 AM – 6:30 PM IST`.
5. **Customer Reviews & Testimonials**:
   - `{{VERIFIED_REVIEWS_LIST}}`: Zero fake testimonials. Only real customer reviews from the database (`/admin/feedback`) with explicit parental consent will be displayed.
6. **Press Mentions & Awards**:
   - `{{PRESS_MENTIONS}}`: No fabricated press quotes or award badges are included.
7. **Atelier Statistics (About Page)**:
   - Existing numbers on `/about` (1,300 books sold, 15/28 states reached, 99.4% satisfaction) are marked as `{{ATELIER_METRIC_BOOKS_SOLD}}`, `{{ATELIER_METRIC_STATES}}`, etc., awaiting live database telemetry confirmation.

