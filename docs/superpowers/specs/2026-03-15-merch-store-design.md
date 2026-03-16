# Ride MTB Merchandise Store — Design Spec

**Date:** 2026-03-15
**Last updated:** 2026-03-15 (post multi-agent audit)
**Status:** Approved
**Scope:** Full merchandise store including channel strategy, fulfillment, customer journey, automation/manual breakdown, AI agent, tech integration, platform cross-module surfaces, and legal/compliance

---

## 1. Overview

A fully embedded, headless merchandise store living at `ride-mtb.com/shop` — seamlessly integrated into the Ride MTB platform. Users never leave the site. Shopify is the commerce backend; the Ride MTB Next.js app owns all UI. Amazon is a parallel distribution channel for discovery and volume, not a separate operation.

**North star:** Build it right, build it complete. No shortcuts that require re-architecting later.

---

## 2. Channel + Fulfillment Architecture

```
Ride MTB Shopify Store (hub)
  ├── Apparel + Lifestyle  →  Printful/Printify (POD)
  │                            auto-fulfills, ships direct to customer
  ├── MTB Accessories      →  Amazon FBA (Multi-Channel Fulfillment)
  │                            single warehouse, fulfills Shopify + Amazon orders
  ├── Digital Goods        →  Shopify Digital Downloads (or SendOwl)
  │                            instant delivery on purchase, zero fulfillment
  └── Amazon Storefront    →  Amazon Sales Channel (Shopify integration)
                               syncs listings, routes accessory orders to FBA
                               Amazon Merch on Demand for apparel on Amazon
```

**Core principle:** Shopify is the source of truth for products, pricing, and customer data. Amazon is a distribution channel that feeds into the same system.

**Multi-Channel Fulfillment (MCF):** FBA inventory fulfills both Amazon orders and Shopify orders. Ship accessories to Amazon's warehouse once; MCF ships regardless of which channel the order came from. The Shopify MCF app handles order routing natively — the agent's SP-API access is read-only for inventory and orders; it does NOT independently trigger MCF fulfillment requests to avoid duplicate fulfillment.

**MCF blank box:** Amazon MCF must be explicitly configured to ship in plain (non-Amazon-branded) packaging. This is required both for brand experience and for MCF program compliance. Configure this in Amazon Seller Central MCF settings before first Shopify order routes through MCF.

**FBA prep requirements:** Every FBA unit requires an FNSKU scannable label (not just a UPC barcode). Apply labels yourself or use Amazon's FBA Label Service (~$0.55/unit). Soft goods (apparel) require polybag packaging with suffocation warnings on bags above a minimum opening size. Any accessory containing a battery is classified as Dangerous Goods (Hazmat) — requires Safety Data Sheet submission and stores in Hazmat-enabled FCs at higher fee rates. Determine size tier (standard vs. oversize) per SKU before pricing, as it directly determines FBA fulfillment fees.

**Fulfillment by product category:**

| Category | Fulfillment | Inventory risk |
|---|---|---|
| Apparel | Printful/Printify (POD) | Zero |
| Lifestyle goods | Printful/Printify (POD) | Zero |
| MTB Accessories | Amazon FBA + MCF | Medium (bulk stocking required) |
| Digital goods | Shopify instant delivery | Zero |

**POD inventory settings:** POD products must have Shopify inventory tracking disabled and "Continue selling when out of stock" enabled. Default settings will show products as out of stock as soon as any inventory is decremented — POD has no real inventory to track.

---

## 3. Customer Journey

### Path A — Shopify (owned traffic)
```
Ride MTB platform (Learn / Forum / Trail Maps / Bike Selector / nav)
  → /shop route (embedded, never leaves site)
  → Personalized product listing (based on cross-module user data)
  → Product detail → Add to cart
  → Checkout (cart pre-filled via cartBuyerIdentityUpdate mutation;
    redirects to shop.ride-mtb.com hosted checkout)
  → Order confirmation email (auto)
  → Fulfillment routed by product type (auto)
  → Shipping notification + tracking (auto)
  → Post-purchase: review request email (auto, Klaviyo — Shopify customers only)
  → XP awarded to Ride MTB account (auto, webhook)
```

### Path B — Amazon FBA (cold discovery)
```
Amazon search → Your listing (Prime badge via FBA)
  → Amazon PDP → Amazon checkout
  → FBA picks, packs, ships (fully auto, plain packaging via MCF blank box)
  → Shipping notification via Amazon (auto)
  → Package insert: branded thank-you card with QR code → ride-mtb.com
    (insert copy: brand info + community invite ONLY — no discount offers,
    no review solicitation, no incentives to purchase off Amazon.
    Amazon policy prohibits inserts that redirect customers away from
    Amazon with any kind of incentive. Violation = listing suspension.)
  → Customer recaptured organically via platform value, not discount bribery
```

### Path C — Amazon Merch on Demand (apparel on Amazon)
```
Amazon search → Merch listing
  → Amazon checkout
  → Merch partner prints + ships (fully auto)
  → Royalty paid to Ride MTB (no fulfillment involvement)
  → Merch on Demand operates entirely outside SP-API and Shopify —
    orders, fulfillment, and royalties managed in separate Merch portal
```

### Cross-Module Commerce Touchpoints (platform-native paths)
These are high-intent surfaces that connect platform activity to product discovery:

- **Course completion → product trigger:** After completing a course (e.g., "Cornering Technique"), surface relevant gear (e.g., knee/elbow pads) at the moment of completion — highest purchase intent on the platform.
- **Trail Maps → contextual gear:** Trail pages surface terrain-relevant products via product tags (`#wet-conditions`, `#technical-terrain`, `#enduro`, `#flow-trails`). A PNW enduro trail suggests waterproof gloves and protection; a Sedona flow trail suggests eyewear.
- **Bike Selector result → pre-filtered shop:** An "aggressive enduro" result pre-filters `/shop` differently than a "casual flow" result. Requires personalization data model on user record (see Section 9).
- **Forum → contextual product cards:** Threads about specific gear or techniques surface relevant product cards. High purchase-intent surface.
- **Post-course bundle:** Cross-sell merch after a paid course purchase — natural next step in the same transaction flow.

---

## 4. Account Linking

**Approach:** Option C implemented to feel like A — silent Shopify customer creation, unified experience.

When a logged-in Ride MTB user enters checkout for the first time:
1. Check if a Shopify customer exists for their email (Admin API)
2. If not: create Shopify customer silently using their Ride MTB profile data
3. Store Shopify customer ID in Ride MTB DB against user record
4. Pre-fill checkout using `cartBuyerIdentityUpdate` mutation (sets email + shipping address on the cart object before redirecting to hosted checkout)
5. User experiences one seamless account — no second signup, no friction

Order history is pulled from Shopify Admin API by email and displayed inside the Ride MTB account profile. Amazon orders are not linked (handled via organic platform recapture via package insert).

**CCPA disclosure note:** Silently transmitting a user's name, email, and address to Shopify for order processing must be disclosed in the platform's privacy policy under CCPA (California) as a data sharing arrangement for the purpose of order fulfillment. This does not require a separate consent prompt at checkout — disclosure in the privacy policy is sufficient — but the privacy policy must exist and be linked from checkout before this goes live.

---

## 5. Automation vs. Manual

### Fully Automated

**Orders & fulfillment:**
- Payment processing (Shopify Payments / Stripe)
- Order confirmation + receipt emails
- POD order routing to Printful/Printify on purchase
- Digital product delivery (instant download link)
- FBA/MCF order routing (via Shopify MCF app — not agent-triggered)
- Shipping notifications + tracking emails
- Tax calculation by region (via Shopify Tax — does not replace nexus registration and filing; see Section 11)
- Refund processing for orders ≤$50 (auto-approved; XP deducted via negative XpTransaction entry at same time; XP also deducted on `order.cancelled` webhook)

**Marketing:**
- Welcome series for new email subscribers (Klaviyo)
- Abandoned cart recovery (Klaviyo — Shopify customers only; Amazon orders excluded)
- Post-purchase review request, 3–5 days after delivery (Klaviyo — **Shopify customers only. Amazon orders must be explicitly excluded from this flow.** Amazon ToS prohibits review solicitation via external email for Amazon-channel orders. Violation = seller account risk.)
- Win-back emails for lapsed customers (Klaviyo — Shopify customers only)
- Low stock notification to customers who saved a product

**Amazon:**
- FBA: all pick, pack, ship, returns for accessory orders
- Merch on Demand: all production + shipping for apparel
- Amazon customer service for FBA orders (Amazon handles directly)
- Prime badge + buy box logic

**Platform:**
- XP awards on `order.paid` webhook
- XP reversal on `order.cancelled` and `order.refunded` webhooks
- Inventory sync (Shopify ↔ Amazon via Sales Channel) — FBA accessory SKUs only; POD products have no real inventory and are excluded from sync
- FBA restock alerts (agent, daily poll)

### Manual (or Agent-Drafted, Human-Approved)

**Product launch (per SKU):**
- Trademark/IP clearance search before listing (USPTO TESS + Amazon marketplace search)
- Supplier negotiation + sampling + quality approval
- **FBA fee calculation per SKU** (determine size tier, calculate actual FBA fees) — required before finalizing pricing; the 35–45% Amazon margin target cannot be confirmed without this
- Product photography
- Writing product descriptions + SEO copy
- Amazon listing creation (title, bullets, A+ content, keywords) including variation structure (parent-child listings per Amazon's category-specific variation themes)
- Pricing strategy per channel (subject to channel price parity rule — see Section 6)
- FNSKU labeling + FBA prep (polybag, packaging standards per Amazon requirements)
- FBA inbound shipment plan creation + shipment to Amazon warehouse
- POD quality sample order before public launch

**Ongoing operations:**
- Reviewing agent-drafted restock POs → approve + send
- Reviewing agent-drafted customer service replies → edit + send
- Reviewing agent-drafted Amazon listing updates → approve + publish
- Reviewing + approving price adjustment recommendations
- Amazon advertising management (Sponsored Products campaigns — keyword harvesting, bid adjustments, ACoS monitoring)
- Amazon seller account health monitoring (agent flags, you resolve)
- Dispute + chargeback management
- Quarterly FBA fee schedule verification (Amazon adjusts fees annually)
- Long-term storage review + removal order decisions (units approaching 365-day threshold)

**Strategy:**
- Product roadmap decisions (add, sunset, discount) — subject to floor pricing policy
- Promotional calendar (subject to channel price parity rule)
- Channel margin analysis + budget allocation
- Apparel drop creative direction (brief → designer with work-for-hire agreement → upload to POD)
- Seasonal restocking decisions
- POD graduation evaluation (criteria: see Section 6)
- XP threshold calibration review (quarterly)

---

## 6. Revenue Model

### Per-Channel Margin Targets

**Important:** FBA fees vary significantly by size tier (standard small/large, oversize tiers range from ~$3–$75+/unit). The margins below are targets — actual margins must be verified per SKU using Amazon's FBA Revenue Calculator before committing to pricing. FBA fee schedules change annually; revalidate quarterly.

| Category | Channel | Unit cost | Target retail | Net margin |
|---|---|---|---|---|
| Apparel | Shopify (POD) | $13–35 | $30–70 | ~45–50% |
| Apparel | Amazon Merch | $0 (royalty) | $25–40 | ~15–20% royalty |
| Accessories | Shopify (MCF) | COGS + FBA fees | $40–120 | ~50–60% |
| Accessories | Amazon FBA | COGS + FBA fees | $40–120 | ~35–45% |
| Lifestyle goods | Shopify (POD) | $3–18 | $10–38 | ~50–55% |
| Digital goods | Shopify | ~$0 | $15–50 | ~97% |

**Margin compressors not in the table:** Return rates (POD apparel 3–5%, accessories higher if descriptions create expectation mismatches), chargeback fees (~$15/dispute), Amazon advertising spend (ACoS eats into FBA margin — factor in real CAC), and POD defect replacements. Net realized margin will be below the table targets until these are measured and managed.

### Channel Price Parity Rule

Amazon's seller policies require your Amazon price is never higher than on any other channel. **Shopify must not undercut Amazon listings.** Before running any Shopify-only sale, coupon, or promotional price, verify it doesn't violate parity. Violations trigger Amazon Buy Box suppression. The agent's promotional calendar workflow must check this constraint before drafting any price change.

### Channel Priority by Margin
1. Digital goods (highest margin, push to platform users)
2. Accessories on Shopify via MCF (owned customer relationship)
3. Apparel on Shopify (solid margins, no inventory risk)
4. Accessories on Amazon FBA (lower margin, high discovery volume)
5. Apparel on Amazon Merch (lowest margin, brand awareness only)

### Revenue Streams

**Core:**
- **Direct product sales** — all categories across Shopify + Amazon channels
- **Digital goods** — training plans, technique guides, presets (~97% margin, instant delivery)

**Cross-platform:**
- **Affiliate links** — gear reviews in Learn module link to Amazon Associates tag. **Important constraint:** Amazon Associates ToS prohibits earning commissions on your own products. Do not affiliate-link SKUs you also sell on Amazon — this can trigger Associates account review and commission forfeiture. Affiliate links in Learn should link to third-party products only, not your own store listings.
- **FTC disclosure required** on all affiliate links — "As an Amazon Associate I earn from qualifying purchases" must appear adjacent to each link in article body text. Global footer disclaimer does not satisfy the "clear and conspicuous" standard.
- **Course + gear bundles** — cross-sell merch alongside paid course purchase. Transaction must flow through a single checkout (either Shopify or Learn's checkout — decide before building to avoid split payment complexity).

**Community-driven:**
- **Limited drops** — scarcity-based apparel tied to platform milestones or trail features. Example mechanic: "The Squamish Chief Drop" — sold for 72 hours when the trail map feature launches. POD makes this zero-risk.
- **Community design voting** — post design candidates to Forum, let community vote before production commitment. Higher launch-day conversion + designs pre-validated by buyers. Low-cost, high-engagement mechanic.
- **Trail-system-specific products** — city/trail-specific jerseys, prints, or tote bags ("Bend Trails", "Moab Classics"). POD makes these feasible with zero additional inventory. Natural cross-sell on trail map pages.
- **Event merchandise** — event-specific products with a purchase window tied to online challenges or community events. High conversion (audience was primed before the product existed).

**B2B / Wholesale:**
- **Team kits / club orders** — custom branded kits for local MTB clubs. Requires: minimum order definition, configurator or brief-based process, draft order flow in Shopify, net-30 vs. prepay decision, quoted lead time.
- **Local bike shop (LBS) wholesale** — accessories (not apparel) to LBS partners. Password-protected Shopify wholesale page + simple price list. Unlocks a channel with no paid acquisition cost.
- **Event organizer channel** — pre-committed orders for trail associations, local race series, MTB festivals (participant bags, podium prizes). High AOV, no sell-through risk, real-world brand exposure.

**Ancillary:**
- **Co-branded / sponsored products** — MTB component brands supply inventory at zero cost in exchange for a revenue share or flat fee. At meaningful traffic this outperforms POD margin.
- **Gift cards** — zero-cost, immediately profitable, float on unredeemed value. Useful as agent CS goodwill tool. Native Shopify feature.
- **Referral program** — refer a new Ride MTB member, both earn XP + first-order discount. Highest-leverage, lowest-cost acquisition channel for a platform with a community forum.
- **Custom/personalized items** — jersey customizer, name on product. High AOV, near-zero return rate. Future phase once core catalog is established.

### XP → Discount Retention Flywheel

**Thresholds (pending calibration — see note below):**

| XP threshold | Reward |
|---|---|
| 1,000 XP | 10% off merch |
| 5,000 XP | Free shipping |
| 10,000 XP | Access to member-only products |
| 25,000 XP | Early access to limited drops |

**Tier identity (named tiers create social status beyond mechanical discounts):**

| Tier | XP range |
|---|---|
| Trail Builder | 0–999 XP |
| Ridge Runner | 1,000–4,999 XP |
| Summit Member | 5,000–9,999 XP |
| Elevation Elite | 10,000+ XP |

**XP earning sources (merch + cross-platform):**
- Purchase on Shopify (primary)
- Course completion (Learn module)
- Trail log submission (Trail Maps)
- Forum post milestones
- Writing a product review
- Voting on a community design
- Referring a new platform member
- Sharing a purchase on social (if verifiable)

**XP stacking policy:** Rewards do not stack within the same order. A user can apply one discount type per transaction (e.g., 10% off OR free shipping — not both simultaneously). This is enforced at the discount code generation step. Member-only product access and early drop access are not discounts — they are access gates that do not affect this rule.

**XP expiry:** XP earned in any rolling 12-month window expires if the account shows zero activity for 6 months. This creates urgency to use earned rewards and keeps the flywheel spinning rather than accruing passively. Expiry is notified via email 30 days before it triggers.

**XP anti-abuse:** Rate limits on XP-earning events per user per day. Forum post XP requires minimum post length and mod approval threshold before awarding. Referral XP requires the referred user to complete a verified action (first purchase or first course). Anomaly detection in XpTransaction records — flag accounts with XP accumulation significantly above cohort average.

**Calibration note:** XP thresholds must be calibrated against actual module activity rates before launch. Define how quickly a typical active user (daily forum poster + weekly trail log + 2 courses/month) hits each threshold. If 25,000 XP is achievable in two weeks, early drop access has no scarcity value. Target: Ridge Runner in ~4–6 weeks of active use, Summit Member in ~3–4 months, Elevation Elite in 6–12 months.

**XP flywheel is bidirectional:** Buying merch unlocks platform perks; platform activity unlocks merch discounts. The reverse also applies — a merch purchase could unlock a related course at a discount, or grant early access to a trail feature in Trail Maps. Design both directions.

### POD Graduation Criteria

When a POD apparel or lifestyle SKU demonstrates sustained demand, evaluate migrating to stocked inventory for improved margins:
- **Trigger:** 50+ units/month for 3 consecutive months on a single SKU
- **Evaluation:** Request bulk quote from supplier (typically 200-unit MOQ for first order), calculate margin improvement vs. storage + handling cost
- **Decision:** If stocked margin > POD margin by 15%+ after all costs, graduate to stocked + FBA

### KPI Framework

Success metrics by time horizon:

**Month 1:**
- First Shopify sale
- Amazon listing live (at least one FBA accessory SKU)
- Klaviyo welcome + abandoned cart flows active
- Webhook XP awards functioning
- Agent Slack workflow operational

**Month 3:**
- Shopify conversion rate: >1.5% of /shop visitors
- Amazon FBA: first organic (non-ad) sale
- XP redemption rate: >5% of eligible users redeeming at least one reward
- Return rate: <5% POD apparel, <8% accessories

**Month 6:**
- Revenue split target: 40% Shopify, 40% Amazon FBA, 20% other
- AOV: $45+ Shopify, $35+ Amazon
- Repeat purchase rate: >20% of Shopify customers making second purchase
- Amazon advertising ACoS: <35%

**Month 12:**
- At least one POD SKU graduated to stocked inventory
- At least one trail-specific limited drop completed
- Agent handling >80% of CS inquiries at draft stage with <20% requiring human edit before send
- LBS wholesale channel operational (at least 2 shop partners)

---

## 7. AI Agent

### Architecture

```
Event sources                 Agent brain               Outputs
──────────────────────────────────────────────────────────────
Shopify webhooks       ──→                      ──→  Execute actions
Amazon SP-API          ──→   Claude Sonnet 4.6  ──→  Draft for review
Scheduled cron jobs    ──→   (Anthropic SDK)    ──→  Escalation alerts
Manual triggers        ──→                      ──→  Reports / summaries
Platform DB signals    ──→                      ──→  Community insights
```

**SP-API technical requirements:**
- LWA (Login with Amazon) access tokens expire every 60 minutes — confirm `amazon-sp-api` package is configured for automatic access token refresh using the stored refresh token. Silent expiry will break all agent Amazon actions.
- SP-API rate limits vary by endpoint — implement exponential backoff with jitter on 429 responses. Critical for polling jobs that run under high load.
- SP-API Reports API is asynchronous — request a report, poll for completion (15 min to several hours), download from pre-signed S3 URL. Agent tasks that depend on report data (keyword suggestions, sales trends, inventory health) must account for this latency.
- Use SP-API Notifications API (SQS or EventBridge) for order sync instead of hourly cron polling — real-time, more reliable, fewer API calls.
- Configure SP-API sandbox endpoint for development and testing.

### Autonomous Actions (no human approval needed)

| Task | Trigger | Action |
|---|---|---|
| XP awards | `order.paid` webhook | Lookup user by email → award XP → notify user |
| XP reversal | `order.cancelled` / `order.refunded` webhooks | Lookup user → create negative XpTransaction |
| Shipping confirmation | Fulfillment webhook | Confirm tracking pushed to customer |
| Low inventory alerts | FBA Inventory API (daily) | Slack alert with restock quantity suggestion |
| Excess inventory alerts | FBA Inventory API (daily) | Flag units approaching 365-day storage threshold → recommend removal order |
| Revenue reports | Scheduled (weekly/monthly) | Pull Shopify + Admin API + SP-API → format → deliver |
| Account health monitoring | Amazon SP-API (daily) | Alert on: listing suppression, policy flag, ODR >0.8%, unauthorized sellers on your ASINs |
| Listing hijacking check | SP-API GetItemOffers (daily) | Flag any ASIN with unexpected additional sellers |
| Community purchase intent | Platform DB (weekly) | Surface rising product mentions in Forum threads → flag as demand signal |
| Ambassador identification | Platform DB (weekly) | Surface users meeting criteria (high XP + active trail logs + active forum) → draft outreach for review |

### Draft + Approve (human reviews before execution)

| Task | Trigger | Agent does | Human does |
|---|---|---|---|
| Restock POs | Inventory below threshold | Draft PO: quantity, supplier, cost — factoring in both Amazon and MCF/Shopify velocity | Review → send |
| Customer service replies | New email to Shopify Inbox (polled via Shopify Inbox API) or support email alias (via Postmark inbound webhook) | Draft reply with full order context from Admin API | Edit if needed → send via same channel |
| Amazon listing updates | Sales + SP-API search trend data | Rewrite copy with keyword suggestions (using SP-API Reports API data — async, plan for latency) | Review → publish |
| Price adjustments | SP-API GetCompetitivePricing data | Recommend changes with reasoning, subject to channel price parity check | Approve → execute |
| New product listings | Structured Slack command: `/new-product [name] [category] [key features] [price range]` | Draft Amazon title/bullets/A+ outline, Shopify description, SEO metadata | Review → publish |
| Refunds >$50 | Customer request | Draft response + recommend approve/deny | Decide → execute |
| Removal orders | Excess inventory alert (365-day threshold approaching) | Draft removal order recommendation with cost/benefit | Approve → execute |
| Ambassador outreach | Weekly community scan | Draft personalized outreach message for high-XP, high-activity users | Review → send |

### Escalation Rules (agent pulls human in immediately)

- FBA inventory hits zero with active listings
- Amazon account health: Order Defect Rate >0.8%, Late Shipment Rate >3%, Pre-Fulfillment Cancel Rate >2%
- Unauthorized seller detected on any ASIN
- Listing suppressed on Amazon
- Unusual order spike (potential fraud — cross-reference Shopify `risk` field)
- Supplier doesn't confirm PO within 48 hours
- Customer escalates to chargeback
- Any action that would spend >$100

### Agent Tools / Integrations

- Shopify Admin API — orders, customers, products, inventory, discount code generation
- Shopify Storefront API — product browse, cart creation, cart mutations, checkout URL generation (cart operations are writes, not read-only)
- Amazon SP-API — orders, inventory, listings, pricing via GetCompetitivePricing (Note: Merch on Demand is outside SP-API — managed in separate Merch portal)
- SP-API Notifications API — real-time order events via SQS (preferred over cron polling)
- Klaviyo API — trigger and manage email flows (Shopify customers only — Amazon customers excluded)
- Email — CS replies, POs
- Ride MTB DB — read/write XP, user lookup by email, cross-module activity signals
- Slack `#merch-ops` — escalation channel + draft+approve interface
- Printful/Printify API — POD failure/delay monitoring only

### Guardrails

- Never send customer-facing messages autonomously (except transactional: shipping, receipt)
- Never spend >$100 autonomously (single threshold — no exceptions below this)
- Never trigger MCF fulfillment directly — Shopify MCF app owns this
- Log every action with reasoning to `AgentActionLog` table
- Fail loudly — escalate rather than guess when uncertain
- Klaviyo flows are never triggered for Amazon-channel customers

### Agent Dashboard — Interim Plan

Full dashboard UI is a future build. Until then, draft+approve workflow via **Slack `#merch-ops`**:

- Agent posts drafted actions with context, reasoning, and approve/reject buttons (Slack Block Kit)
- Human clicks approve → agent executes; clicks reject → agent logs and stands down
- All actions logged to `AgentActionLog` table in DB regardless of delivery method
- Dashboard UI replaces Slack interface once built, using `AgentActionLog` as data source

---

## 8. Tech Integration

### Shopify API Versioning

Pin a specific Shopify API version in both `storefront.ts` and `admin.ts` (e.g., `2024-10`). Shopify deprecates versions on a rolling 12-month cycle with breaking-change notices. Without pinning, an SDK upgrade can silently migrate you to a breaking version. Add a recurring calendar task to upgrade the pinned version annually.

### Headless Shopify in Next.js

```
ride-mtb.com/shop              →  Product listing (Storefront API + ISR)
ride-mtb.com/shop/[handle]     →  Product detail (Storefront API + ISR)
ride-mtb.com/cart              →  Cart (Storefront API — write operations)
ride-mtb.com/checkout          →  Checkout bridge: cartBuyerIdentityUpdate mutation
                                   pre-fills email + address, then redirect to
                                   shop.ride-mtb.com (Shopify hosted checkout,
                                   custom domain configured in Shopify settings)
ride-mtb.com/account/orders    →  Order history (Admin API, by email)
```

**Checkout architecture note:** Full custom checkout UI requires Shopify Plus ($2,300/month). At Basic/mid-tier, cart is built in Next.js and the final step redirects to Shopify's hosted checkout on the branded subdomain. This is the correct approach. `cartBuyerIdentityUpdate` is the mechanism for pre-filling buyer data on the cart before the redirect — not a checkout-level API call.

**Checkout session expiry:** Shopify checkout URLs expire after 24 hours. Handle this in the checkout bridge: detect expired URLs and regenerate a new checkout URL from the existing cart rather than surfacing a broken link to the user.

**Cart persistence:** The Shopify cart `cartId` must be persisted client-side (localStorage with a cookie fallback for SSR). Associate `cartId` with the logged-in user session so carts survive browser refresh, device switches, and page navigation. This is required for Klaviyo abandoned cart recovery to function — Klaviyo needs the cart URL, which is derived from the persisted `cartId`.

### Caching Strategy (ISR)

Product listing and PDP pages must use Incremental Static Regeneration — live Storefront API calls on every request will be slow and burn API quota. Recommended revalidation intervals:
- `/shop` listing page: `revalidate: 300` (5 minutes)
- `/shop/[handle]` PDP: `revalidate: 300`
- On-demand revalidation: trigger via `products/update` Shopify webhook → call Next.js `revalidatePath('/shop')` and `revalidatePath('/shop/' + handle)`

### Collections, Search, and Filtering

Product listing at `/shop` requires:
- **Collections hierarchy:** Apparel, Accessories, Digital, Lifestyle — use Shopify automated collections (tag-based rules) for operational ease as POD catalog grows
- **Faceted filtering:** category, price range, size — use Storefront API `filters` argument on collection queries
- **Search:** Use Storefront API `predictiveSearch` endpoint for typeahead + full search results
- **Sort options:** Best selling, price low/high, newest

### Webhook Architecture

```
Shopify webhooks → /api/webhooks/shopify (Next.js API route)
  ├── order.paid
  │     ├── verify HMAC signature
  │     ├── check Shopify risk score — hold high-risk orders before XP award
  │     ├── lookup Ride MTB user by customer email
  │     ├── if user found: award XP + create XpTransaction record
  │     ├── if user NOT found: log to XpPendingAward table (never silently drop)
  │     └── upsert ShopifyOrder record (idempotency key: Shopify order GID)
  ├── order.cancelled
  │     └── lookup order → create negative XpTransaction (reversal)
  ├── order.refunded
  │     └── lookup order → create negative XpTransaction proportional to refund amount
  ├── order.fulfilled (check fulfillment_status — may be "partial")
  │     └── confirm tracking synced to order record
  ├── fulfillments/create
  │     └── handle partial fulfillments (physical + digital in same order)
  └── customer.created
        └── upsert Shopify customer mapping in Ride MTB DB

Amazon SP-API → SP-API Notifications API (SQS) — preferred over cron polling
  ├── ORDER_CHANGE notification → order sync (real-time)
  └── Fallback cron jobs (if Notifications not yet configured):
      ├── inventory check (daily)
      ├── order sync (hourly)
      └── account health (daily)
```

**Webhook reliability:** All handlers must be idempotent. Use Shopify order GID as idempotency key. Return 200 immediately regardless of processing success — log failures to error table for agent review. Never return 5xx (causes aggressive Shopify retry storms).

### SEO

**Structured data (Schema.org):** Add JSON-LD `Product`, `Offer`, and `BreadcrumbList` on every PDP. Headless implementations don't get this automatically — it's required for Google rich results (price, availability, ratings in SERPs).

**Sitemap:** Implement `src/app/sitemap.ts` (Next.js 15 native) that fetches all products from Storefront API and generates a product catalog sitemap. Critical for Google to discover and index new product pages.

**robots.txt:** `noindex` on `/cart` and `/checkout` routes via `generateMetadata()` setting `robots: { index: false }`. Prevent checkout bridge pages from being indexed.

**Meta tags per PDP:** Pull Shopify's `seo { title description }` fields via Storefront API and map to `generateMetadata()` in Next.js. Don't leave PDPs with default or empty meta tags.

**Canonical URLs:** Use flat `/shop/[handle]` structure. If collection-filtered URLs are added later, set canonical to the flat URL variant to prevent link equity fragmentation.

**next/image config:** Add `cdn.shopify.com` to `next.config.ts` `images.remotePatterns`. Without this, Next.js refuses to optimize Shopify product images.

### Key Packages

```
@shopify/storefront-api-client     Storefront API (browse, cart, checkout URL)
@shopify/admin-api-client          Admin API (orders, customers, inventory, discounts)
amazon-sp-api                      SP-API wrapper (confirm auto LWA token refresh)
@anthropic-ai/sdk                  AI agent (Claude Sonnet 4.6)
klaviyo-api                        Email automation
```

### Environment Variables

```
SHOPIFY_STOREFRONT_ACCESS_TOKEN      (public token — intended to be exposed client-side,
                                      scope to read-only storefront operations only)
SHOPIFY_ADMIN_ACCESS_TOKEN           (secret — server-side only)
SHOPIFY_STORE_DOMAIN
SHOPIFY_WEBHOOK_SECRET
SHOPIFY_API_VERSION                  (e.g. "2024-10" — pin explicitly)
AMAZON_SP_CLIENT_ID
AMAZON_SP_CLIENT_SECRET
AMAZON_SP_REFRESH_TOKEN
AMAZON_SELLER_ID
AMAZON_SP_AWS_ACCESS_KEY
AMAZON_SP_AWS_SECRET_KEY
KLAVIYO_API_KEY
ANTHROPIC_API_KEY
SLACK_BOT_TOKEN                      (for #merch-ops agent workflow)
SLACK_MERCH_OPS_CHANNEL_ID
```

### DB Schema Changes (Prisma)

```prisma
// Add to User model
model User {
  // ... existing fields
  shopifyCustomerId     String?
  preferredTerrain      String?           // from Bike Selector: "enduro", "xc", "flow"
  homeRegion            String?           // from Trail Maps activity
  shopifyOrders         ShopifyOrder[]
  xpTransactions        XpTransaction[]
  xpPendingAwards       XpPendingAward[]
  agentActionLogs       AgentActionLog[]
}

model ShopifyOrder {
  id              String    @id           // Shopify order GID (idempotency key)
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])
  email           String
  totalPrice      Float
  currency        String
  riskLevel       String?                 // Shopify fraud risk: low/medium/high
  xpAwarded       Int       @default(0)
  createdAt       DateTime  @default(now())
  raw             Json
}

model XpTransaction {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  amount    Int                           // negative for reversals/redemptions
  source    String                        // "merch_purchase", "course_complete",
                                          // "trail_log", "product_review",
                                          // "referral", "discount_redemption",
                                          // "order_cancelled", "order_refunded"
  refNote   String?
  expiresAt DateTime?                     // XP expiry date (12-month rolling window)
  createdAt DateTime  @default(now())
}

model XpPendingAward {
  id        String    @id @default(cuid())
  email     String
  orderId   String    @unique
  xpAmount  Int
  resolved  Boolean   @default(false)
  createdAt DateTime  @default(now())
}

model AgentActionLog {
  id          String    @id @default(cuid())
  userId      String?
  user        User?     @relation(fields: [userId], references: [id])
  action      String                        // action type
  payload     Json                          // full context
  reasoning   String                        // agent's reasoning
  status      String                        // "autonomous", "pending_approval",
                                            // "approved", "rejected", "escalated"
  approvedBy  String?
  createdAt   DateTime  @default(now())
}
```

### XP → Discount Redemption Mechanism

```
User on /shop or /cart → app checks XP total + tier from DB
  → if threshold met, surface reward offer with tier badge
  → user clicks "Apply XP Reward"
  → check stacking policy — only one discount type per order
  → server calls Shopify Admin API: create price rule + one-time discount code
      (scoped to one use, tied to their email, expires in 24 hours)
  → discount code applied to cart via Storefront API discountCodes field
  → user proceeds to checkout at shop.ride-mtb.com with discount applied
  → on order.paid: create negative XpTransaction (source: "discount_redemption")
```

### Folder Structure

```
src/
  app/
    shop/
      page.tsx                     product listing (ISR)
      [handle]/page.tsx            product detail (ISR)
      cart/page.tsx                cart
      checkout/page.tsx            checkout bridge (cartBuyerIdentityUpdate → redirect)
    account/
      orders/page.tsx              order history
  lib/
    shopify/
      storefront.ts                Storefront API client (pinned API version)
      admin.ts                     Admin API client (pinned API version)
      customer.ts                  silent customer creation
      cart.ts                      cart persistence + cartBuyerIdentityUpdate
    amazon/
      sp-api.ts                    SP-API client (auto LWA token refresh)
      inventory.ts                 inventory polling + excess inventory logic
      notifications.ts             SP-API Notifications API (SQS listener)
    xp/
      awards.ts                    XP award + reversal logic
      discounts.ts                 discount code generation
      thresholds.ts                tier definitions + calibration
  api/
    webhooks/
      shopify/route.ts             all Shopify webhook handlers
    revalidate/
      shop/route.ts                on-demand ISR revalidation
  agent/
    index.ts                       agent entrypoint
    tools/                         tool definitions
    tasks/                         handlers: xp, cs, restock, listings,
                                   community-signals, ambassador
```

---

## 9. Platform Commerce Integration

This section covers how the merch store integrates with and reinforces the broader Ride MTB ecosystem. These are the surfaces that make Ride MTB's merch store categorically different from any standalone MTB shop.

### Cross-Module Data Model

The User record must store cross-module signals that inform personalization:
- `preferredTerrain` — from Bike Selector quiz result
- `homeRegion` — derived from Trail Maps activity (most-browsed system)
- `coursesCompleted[]` — from Learn module
- `trailLogsCount` — from Trail Maps
- `forumPostCount` — from Forum

These fields power the personalized shop homepage and contextual product recommendations.

### Personalized Shop Homepage

The `/shop` landing page renders differently per user based on their platform profile:
- Bike Selector result → surface terrain-matched products above the fold
- Most-browsed trail region → surface trail-specific drops if available
- Courses completed → surface gear relevant to completed disciplines
- New/no data → surface bestsellers + newest arrivals (default)

### Course Completion → Product Surface

After completing a course in the Learn module:
1. Learn triggers an event to the merch module with the course category tag
2. Merch module looks up products tagged with matching category
3. Renders a "Gear for this discipline" card in the course completion UI
4. XP just earned from the course completion is shown alongside the merch offer

### Trail Map → Product Integration

Each trail page in Trail Maps includes a "Trail Essentials" product strip:
1. Trail page metadata includes terrain tags (`#technical`, `#flow`, `#wet-conditions`, etc.)
2. Merch module queries products tagged to match terrain attributes
3. Renders a horizontal product strip at the bottom of the trail page
4. Trail-system-specific limited drops surface on their home trail page when active

### Forum → Commerce Surface

Forum threads can surface contextual product cards:
1. Thread tags (auto-generated or moderator-applied) map to product categories
2. A "Related Gear" sidebar or inline card appears on threads tagged with gear-related topics
3. No hard sell — passive discovery surface, user-initiated click-through only

### Community Design Voting

Mechanism for community-driven product development:
1. Admin posts design candidates to a dedicated Forum category ("Design Lab")
2. Community votes using existing Forum reaction/poll mechanic
3. Top design after 7–14 day voting window is greenlit for production
4. Launch post in Forum credits the vote, drives pre-launch awareness
5. Agent monitors voting results and drafts launch announcement for review

### Ambassador Program

Ride MTB members who demonstrate high platform engagement qualify for ambassador consideration:
- Criteria: Elevation Elite tier (10,000+ XP) + 50+ trail logs + 100+ forum posts
- Agent identifies candidates weekly via DB query, drafts personalized outreach for human review
- Ambassadors receive: product allocation (cost to Ride MTB), community recognition badge, early drop access
- In exchange: content creation, trail reports, local advocacy — not paid cash

### New User Onboarding Integration

The merch store is introduced contextually during onboarding, not as a navigation item:
- After first course completion: "You earned 150 XP — you're on your way to Ridge Runner status and your first merch discount"
- After Bike Selector result: "Based on your riding style, here's the gear our community recommends"
- After first trail log: XP notification with progress toward next tier shown
- First-purchase incentive for new platform members: 15% off first order, surfaced after first XP-earning action

---

## 10. Upfront Setup Checklist

### Amazon (start immediately — longest lead times)
- [ ] Run trademark clearance search (USPTO TESS) for "Ride MTB" + logo in Classes 25, 35, 41 **before** filing
- [ ] Register Amazon Professional Seller Account ($39.99/month)
- [ ] Apply for trademark via Amazon IP Accelerator (~$1,000–1,500, faster approval than standard)
- [ ] Apply for Amazon Brand Registry (requires trademark — weeks via IP Accelerator, 6–12 months standard)
- [ ] Apply for Amazon Merch on Demand (invitation/waitlist — apply early)
- [ ] Purchase GS1 UPC barcodes (each size/color variant = one UPC; a t-shirt in 4 sizes × 3 colors = 12 UPCs; base: $250 for 10 + $50/year)
- [ ] Register SP-API developer application in Seller Central (Developer Console → Create App → Self-Authorized)
- [ ] Complete SP-API LWA OAuth flow to obtain `AMAZON_SP_REFRESH_TOKEN`
- [ ] Set up IAM role + AWS credentials for SP-API (`AMAZON_SP_AWS_ACCESS_KEY`, `AMAZON_SP_AWS_SECRET_KEY`)
- [ ] Set up SP-API SQS queue for Notifications API (order sync)
- [ ] Configure SP-API sandbox endpoint for development
- [ ] Run FBA Revenue Calculator for each accessory SKU to verify margin targets before pricing
- [ ] Configure MCF "blank box" (plain, non-Amazon-branded packaging) in Seller Central MCF settings
- [ ] Set up first FBA inbound shipment once supplier is locked (FNSKU labels, polybag prep, size tier confirmed)
- [ ] Set up Amazon Sponsored Products advertising account + initial campaign budget (~$500–1,000/month for first 90 days)

### Shopify
- [ ] Create Shopify store (Basic plan, $39/month)
- [ ] Enable Shopify Payments (eliminates transaction fees)
- [ ] Configure custom checkout subdomain: `shop.ride-mtb.com` in Shopify settings
- [ ] Create Shopify Custom App → generate Admin API access token (scopes: read/write orders, customers, products, inventory, discounts)
- [ ] Generate Storefront API access token (public; scope to read-only storefront ops)
- [ ] Register webhooks: `order.paid`, `order.cancelled`, `order.refunded`, `order.fulfilled`, `fulfillments/create`, `customer.created`, `products/update` → `/api/webhooks/shopify`; copy HMAC secret
- [ ] Install Printful or Printify app (compare margins per SKU before committing)
- [ ] Install Amazon Sales Channel app
- [ ] Install Shopify MCF app
- [ ] Install product reviews app (Judge.me or Okendo)
- [ ] Install returns management app (Loop Returns or AfterShip Returns)
- [ ] Create Klaviyo account + get API key + install Klaviyo Shopify app
- [ ] Configure Klaviyo channel segmentation: tag Amazon-sourced customers to exclude from review request + win-back flows
- [ ] Set up TaxJar or Avalara account for FBA nexus tracking + automated filing
- [ ] Define and publish collections: Apparel, Accessories, Digital, Lifestyle (automated tag-based rules)
- [ ] Configure metafield schema: member-only product gating, terrain tags, trail-system tags
- [ ] Set POD products to "Continue selling when out of stock" / inventory tracking disabled
- [ ] Add `cdn.shopify.com` to `next.config.ts` `images.remotePatterns`
- [ ] Add all env vars to Vercel project settings

### Business + Legal (complete before first sale)
- [ ] Obtain EIN from IRS (required before registering with Shopify Payments and Amazon — do not use SSN)
- [ ] Form LLC (state selection matters — form in home state unless there's a strong reason for Wyoming/Delaware)
- [ ] Register for sales tax seller's permit in home state
- [ ] Set up TaxJar/Avalara to monitor FBA nexus state creation and trigger registration workflow
- [ ] Draft and publish Privacy Policy (CCPA, GDPR basics, discloses Shopify/Klaviyo/Printful data sharing)
- [ ] Draft and publish Return Policy (POD items must be disclosed as custom/made-to-order, non-returnable)
- [ ] Draft and publish Digital Goods Terms of Sale (no refunds after delivery)
- [ ] Sign Data Processing Agreements with: Klaviyo, Printful/Printify, Shopify
- [ ] Install cookie consent CMP (Consent Management Platform) for GDPR + CCPA opt-out
- [ ] Obtain product liability insurance before selling any physical accessory
- [ ] Set up CASL-compliant email consent flow for Canadian users (express opt-in required, log consent timestamps in Klaviyo)
- [ ] Configure CAN-SPAM compliance in all Klaviyo emails: physical mailing address, opt-out mechanism
- [ ] Establish work-for-hire agreement template for all external designers (copyright assignment required)
- [ ] Open business bank account
- [ ] Set up accounting software (QuickBooks or Wave)
- [ ] Get Anthropic API key → add to Vercel as `ANTHROPIC_API_KEY`
- [ ] Create Slack `#merch-ops` channel, invite Slack bot for agent workflow
- [ ] Set up Postmark inbound (or Shopify Inbox) for CS email intake

### Estimated Upfront Investment

| Scenario | Estimate |
|---|---|
| Lean launch (POD + no FBA yet, no trademark) | ~$500–800 (includes legal basics) |
| Full launch (POD + FBA + trademark in progress) | ~$4,000–6,000 |
| Full launch with IP Accelerator (Brand Registry fast-track) | ~$6,000–8,500 |
| Add advertising budget for FBA launch (first 90 days) | +$1,500–3,000 |

---

## 11. Legal & Compliance

This section summarizes the highest-priority compliance requirements. **None of these are optional — they must be resolved before the store accepts its first order.**

### Sales Tax
- **Physical nexus via FBA:** Amazon distributes FBA inventory across fulfillment centers in multiple states without notifying you. Each FC location creates physical nexus from day one — you owe sales tax collection in that state immediately, not after crossing a revenue threshold. Use TaxJar or Avalara to track FBA nexus states in real time and trigger registration automatically.
- **Economic nexus:** Even without FBA, economic nexus thresholds apply in most states once you cross $100K in sales or 200 transactions/year in that state (post-Wayfair).
- **Shopify Tax handles calculation, not filing.** You must separately register for seller's permits in each nexus state and file returns. Shopify Tax is not a compliance substitute.
- **Amazon is a marketplace facilitator** and collects/remits tax on Amazon orders in all 50 sales-tax states. You are still responsible for collection and remittance on all Shopify/MCF orders.
- **Digital goods taxation** varies by state — Washington, Tennessee, New York, and others tax digital downloads. Verify Shopify Tax configuration for digital goods by state before launch.

### Affiliate Disclosures (FTC)
- All Amazon affiliate links in Learn module content require adjacent disclosure: *"As an Amazon Associate I earn from qualifying purchases"* — placement must be near the link in article body text. Footer disclaimer alone is insufficient.
- **Do not earn Associates commissions on your own Amazon listings.** Amazon Associates ToS prohibits this. If a Learn article links to a product you also sell on Amazon via your affiliate tag, remove the affiliate tag from that link.
- Email affiliate link disclosure required within the email itself if Klaviyo emails include affiliate links.

### Privacy
- **Privacy Policy** required before collecting any personal data. Must disclose: data collected, purpose, third-party sharing (Shopify, Klaviyo, Printful, Printify, Amazon for MCF), user rights under CCPA/GDPR.
- **Data Processing Agreements** with Klaviyo, Printful/Printify, and Shopify must be signed before processing customer data through these services.
- **GDPR:** If selling to EU customers (no geo-restriction in place), full GDPR compliance is required — lawful basis, Article 13/14 notice, right to erasure/access/portability, DPAs with all processors.
- **Cookie consent:** GDPR (EU), PECR (UK), and CCPA require a CMP before the site uses any non-essential cookies or tracking pixels. Install before launch.

### Consumer Protection
- **Return Policy** must be published on the storefront. California requires a posted policy — without one, state law gives consumers 30 days to return for a full refund. POD items must be disclosed as custom/made-to-order and explicitly non-returnable for buyer's remorse.
- **Digital goods** must have a ToS stating no refunds after delivery. Disclose before purchase.
- **Product liability insurance** required before selling any physical MTB accessory. You are the seller of record on Shopify orders.
- **Magnuson-Moss Warranty Act:** Any written warranty on products over $15 triggers specific disclosure requirements. If no written warranty is offered, document that policy explicitly.

### Amazon Compliance
- **Package inserts** in FBA shipments: Amazon prohibits inserts that direct customers away from Amazon with any incentive to purchase off-platform or capture contact information. Inserts may contain brand information and a thank-you. Nothing else.
- **Review solicitation:** Only Amazon's own "Request a Review" tool is compliant for Amazon-channel orders. External Klaviyo review emails sent to Amazon customers violate Amazon ToS. Channel separation in Klaviyo is mandatory.
- **MCF blank box** must be explicitly configured (see Section 2).

### Intellectual Property
- **Trademark clearance search** before filing — USPTO TESS for "Ride MTB" and all logo variants in Classes 25 (apparel), 35 (retail services), 41 (education/entertainment). A conflicting mark kills the application.
- **Work-for-hire agreements** with all external designers — written contract required for copyright to vest in Ride MTB (not the designer) under US copyright law.
- **Amazon Merch content policies** — review designs against Merch's content rules before submission. Avoid references to specific MTB events, organizations, or geographical descriptions that imply official affiliation.

### Email Marketing
- **CAN-SPAM:** Physical mailing address + functioning opt-out in every commercial email. Klaviyo handles mechanics but address and opt-out must be configured.
- **CASL:** Canadian recipients require express opt-in consent (logged with timestamp in Klaviyo) before any commercial email. Geographic segmentation required. Penalties up to $10M CAD per violation.
- **Consent separation:** Transactional email (order confirmation, shipping) is implied by transaction. Marketing email (abandoned cart, win-back, review requests) requires separate explicit consent. Do not enroll users in marketing flows on account creation alone.

---

## 12. Open Questions / Future Phases

### Needs Decision Before Build
- Printful vs. Printify — compare per-SKU margins across all product categories before committing
- XP threshold calibration — simulate active user accumulation rates before locking in numbers
- Attribution model — first-touch vs. last-touch vs. multi-touch, and how cross-module credit is allocated
- Bundle checkout — which platform owns the transaction for course + gear bundles (Shopify or Learn module)
- XP discount stacking edge cases — confirm stacking policy covers all reward type combinations
- Personalization data model — confirm fields and how they're populated from each module

### Future Phases (design when approaching)
- Full agent dashboard UI (replace Slack interim workflow)
- Community product voting mechanic (Design Lab in Forum)
- Trail map → product integration (requires terrain tag taxonomy on both trail and product sides)
- Course completion → product trigger (requires event bridge between Learn and Shop)
- Ambassador program (requires criteria definition and outreach workflow)
- Referral program (requires referral tracking + XP/discount incentive design)
- LBS wholesale portal
- Custom/personalized items (jersey customizer)
- Amazon A/B testing (Manage Your Experiments) — available after Brand Registry
- Subscribe & Save eligibility evaluation for consumable accessories
- Amazon Transparency program / Project Zero (available after Brand Registry)
- S-Corp election (consult accountant when revenue warrants — strict IRS deadline)
- International expansion (additional currency, GDPR hardening, international shipping strategy)
