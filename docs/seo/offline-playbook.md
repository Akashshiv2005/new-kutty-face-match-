# Offline Local Marketing & Grassroots SEO Playbook: KuttyStory

**Target Geographic Hub**: Tiruchirappalli, Tamil Nadu, India (Tier-2 South India Expansion)  
**Expansion Corridors**: Madurai, Thanjavur, Coimbatore, Chennai  
**Core Strategy**: Bridge offline touchpoints to existing digital canonical routes using UTM parameters, QR collateral, and community word-of-mouth.

---

## 1. Local-First Tiruchirappalli Partnerships

Building local authority and search relevance begins with tangible community presence. The following institutional partnerships drive both local brand awareness and search queries:

### Target Institution Categories & Pitch Scripts:

#### A. Preschools, Kindergartens & Daycares
- **Target Partners**: EuroKids Trichy, Kidzee, Kangaroo Kids, Little Elly, local Montessori academies in Thillai Nagar, Cantonment, and KK Nagar.
- **Value Proposition**: Exclusive custom storybooks for annual graduating batches or birthday gift schemes for students.
- **Pitch Script for School Principals**:
  > *"Respected Ma'am/Sir, I am reaching out from KuttyStory, based here in Trichy. We craft archival personalised storybooks where children become the heroes of their own adventures. To celebrate your kindergarten graduation (or Annual Day), we create bespoke keepsake books where each child's name and portrait are featured, fostering early literacy and pride in your school's curriculum. May we present a physical sample copy to your management team this Tuesday?"*

#### B. Pediatric Clinics & Child Healthcare Centers
- **Target Partners**: Waiting rooms of prominent pediatricians, dental clinics, and immunization centers in Trichy.
- **Placement**: A display stand with a read-only hardcover sample and a laminated QR poster: *"Keep your little one smiling while you wait! Scan to preview your child as a storybook hero."*

#### C. Baby Boutiques, Toy Stores & Photo Studios
- **Target Partners**: Premium maternity boutiques, infant apparel shops, and children's photography studios (newborn and 1st birthday photographers).
- **Mutual Affiliate Model**: Photographers offer a "Storybook Package" as an add-on to their 1st birthday milestone photoshoot, providing parents with a finished printed hardcover alongside digital photo prints.

---

## 2. Printed Collateral & Parcel QR Code Scheme

Every physical parcel shipped by KuttyStory across India is an unboxing opportunity to drive repeat orders, referrals, and verified reviews.

> [!IMPORTANT]
> All QR codes point strictly to EXISTING canonical routes with UTM parameters. No new routes or redirection endpoints are required.

### Printed Inserts Specifications:

| Collateral Piece | Dimensions & Print Stock | Destination URL (with UTM) | Primary Call to Action |
| :--- | :--- | :--- | :--- |
| **Keepsake Parcel QR Insert** | 4×6 inch postcard on 350 GSM matte archival card | `https://kuttystory.co.in/stories?utm_source=parcel&utm_medium=insert&utm_campaign=unboxing_qr` | *"Scan to explore more adventures for your child's home library."* |
| **Archival Bookmark** | 2×7 inch silk ribbon bookmark placed inside hardcover | `https://kuttystory.co.in/how-it-works?utm_source=bookmark&utm_medium=physical&utm_campaign=reading_routine` | *"Share the magic of reading with family and friends."* |
| **Review & Reprint Care Card** | 4×4 inch square card | `https://kuttystory.co.in/terms?utm_source=parcel&utm_medium=care_card#refund-policy` | *"Our 100% Reprint Guarantee. If anything arrived imperfect, scan here for immediate support."* |
| **Birthday Return Gift Flyer** | A5 glossy flyer distributed to party planners | `https://kuttystory.co.in/collections?utm_source=event_flyer&utm_medium=print#birthday-return-gifts` | *"Planning a birthday? Give guests an unforgettable return gift."* |

---

## 3. Events & School Exhibition Checklist

Physical presence at family expos, book fairs, and school carnivals allows parents to hold, touch, and turn the pages of an archival hardcover book.

### Recommended Local Events:
- Trichy Book Fair (Annual)
- School Annual Day & Sports Day Stalls
- Flea Markets & Mom-Entrepreneur Bazaars in Chennai/Bangalore/Trichy
- Baby & Toddler Expos in Tamil Nadu

### Event Execution Checklist:
- [ ] 3-4 physical sample hardcovers in both English and Tamil editions with display acrylic stands.
- [ ] iPad or Android tablet loaded with the interactive 3D flipbook reader (`RealisticBookFlipViewer`).
- [ ] Roll-up banner featuring high-resolution cover artwork and the headline: *"Your Child Is the Hero of This Story"*.
- [ ] Tabletop QR stand with promo code card: *"Scan to get 20% off your first personalized book: code WELCOME20"*.
- [ ] Sign-up sheet for parents (strictly physical or direct digital checkout; no unauthorized storage of child photos).

---

## 4. Multi-Channel Attribution & Coupon Strategy

KuttyStory already includes a flexible coupon engine in `src/components/PaymentModal.tsx` and the backend `validateCoupon` API. Attribution is tracked seamlessly using channel-specific coupon codes without requiring complicated cookies:

### Active Promo Code Attribution Schema:
- `WELCOME20`: Standard 20% off welcome coupon for site visitors and social media.
- `TRICHY20`: Local offline partner coupon for preschools and clinic stands in Tiruchirappalli.
- `EVENT20`: Stalls, book fairs, and school annual day exhibitions.
- `RETURN20`: Special tier for bulk birthday return gift inquiries on `/collections#birthday-return-gifts`.
- `INFLUENCER_NAME`: Dedicated 20% code for gifted parenting creators.

---

## 5. Proposed Database Migration: Order Attribution Tracking

To accurately measure whether an order came from a local preschool, a doctor clinic QR card, an Instagram reel, or a friend referral, we propose adding an optional order attribution field.

> [!NOTE]
> **Alembic DB Migration Proposal (Awaiting User Approval)**:  
> As required by project constraints, this database change is proposed here and will NOT be executed until the user explicitly reviews and approves it.

### Proposed Migration Details:
- **Table**: `orders`
- **New Column**: `referral_source` (VARCHAR(100), nullable=True)
- **New Column**: `utm_campaign` (VARCHAR(100), nullable=True)

### Proposed Alembic Revision Script (`backend/alembic/versions/add_referral_source_to_orders.py`):
```python
"""add referral_source and utm_campaign to orders table

Revision ID: 20261113_add_order_attribution
Revises: previous_revision
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('orders', sa.Column('referral_source', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('utm_campaign', sa.String(length=100), nullable=True))

def downgrade():
    op.drop_column('orders', 'utm_campaign')
    op.drop_column('orders', 'referral_source')
```

### Proposed UI Field:
A single, clean dropdown in the second step of `PaymentModal.tsx` before payment:
```text
How did you hear about KuttyStory?
[ Select an option (Optional) ▼ ]
- Instagram / Facebook
- Friend or Family Recommendation
- School or Preschool
- Doctor's Clinic / Hospital
- Parcel QR Card / Gift
- Google Search
- Other
```

---

## 6. Regional Media & Parent WhatsApp Community Strategy

### Tamil & English Regional Press Outreach:
- Target publications: *The Hindu (Trichy Edition)*, *The New Indian Express*, *Dina Thanthi*, *Ananda Vikatan*.
- Press release hook: *"Trichy-Based Creative Atelier Pioneers Personalised Children's Literature for South Indian Families"*.

### WhatsApp Community Guidelines:
- Do NOT spam unsolicited WhatsApp groups.
- Partner with preschool class-parent coordinators and apartment association groups by offering an exclusive educational workshop on *"Screen-Free Bedtime Reading Habits for 3 to 6 Year Olds"*.
- Share free printable reading milestone trackers and story discussion guides.

