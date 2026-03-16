# Ride MTB Merchandise Store — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Full merchandise store including channel strategy, fulfillment, customer journey, automation/manual breakdown, AI agent, and tech integration

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

**Multi-Channel Fulfillment (MCF):** FBA inventory fulfills both Amazon orders and Shopify orders. Ship accessories to Amazon's warehouse once; MCF ships regardless of which channel the order came from.

**Fulfillment by product category:**

| Category | Fulfillment | Inventory risk |
|---|---|---|
| Apparel | Printful/Printify (POD) | Zero |
| Lifestyle goods | Printful/Printify (POD) | Zero |
| MTB Accessories | Amazon FBA + MCF | Medium (bulk stocking required) |
| Digital goods | Shopify instant delivery | Zero |

---

## 3. Customer Journey

### Path A — Shopify (owned traffic)
```
Ride MTB platform (Learn / Forum / Trail Maps / nav)
  → /shop route (embedded, never leaves site)
  → Product listing → Product detail → Add to cart
  → Checkout (Shopify Storefront API, pre-filled with Ride MTB account data)
  → Order confirmation email (auto)
  → Fulfillment routed by product type (auto)
  → Shipping notification + tracking (auto)
  → Post-purchase: review request email (auto, Klaviyo)
  → XP awarded to Ride MTB account (auto, webhook)
```

### Path B — Amazon FBA (cold discovery)
```
Amazon search → Your listing (Prime badge via FBA)
  → Amazon PDP → Amazon checkout
  → FBA picks, packs, ships (fully auto)
  → Shipping notification via Amazon (auto)
  → Package insert: QR code → ride-mtb.com account signup + discount
  → Customer recaptured into owned ecosystem
```

### Path C — Amazon Merch on Demand (apparel on Amazon)
```
Amazon search → Merch listing
  → Amazon checkout
  → Merch partner prints + ships (fully auto)
  → Royalty paid to Ride MTB (no fulfillment involvement)
```

**Amazon recapture:** The only owned touchpoint in an FBA/Merch order is the physical package. Every outbound shipment includes a branded insert card with a QR code, a discount offer for the Ride MTB store, and an invite to the platform community.

---

## 4. Account Linking

**Approach:** Option C implemented to feel like A — silent Shopify customer creation, unified experience.

When a logged-in Ride MTB user enters checkout for the first time:
1. Check if a Shopify customer exists for their email (Admin API)
2. If not: create Shopify customer silently using their Ride MTB profile data
3. Store Shopify customer ID in Ride MTB DB against user record
4. Pre-fill checkout with name + email via Storefront API
5. User experiences one seamless account — no second signup, no friction

Order history is pulled from Shopify Admin API by email and displayed inside the Ride MTB account profile. Amazon orders are not linked (handled via package insert recapture strategy).

---

## 5. Automation vs. Manual

### Fully Automated

**Orders & fulfillment:**
- Payment processing (Shopify Payments / Stripe)
- Order confirmation + receipt emails
- POD order routing to Printful/Printify on purchase
- Digital product delivery (instant download link)
- FBA/MCF order routing (Shopify → Amazon MCF API)
- Shipping notifications + tracking emails
- Tax calculation by region
- Basic refund processing

**Marketing:**
- Welcome series for new email subscribers (Klaviyo)
- Abandoned cart recovery (Klaviyo)
- Post-purchase review request, 3-5 days after delivery (Klaviyo)
- Win-back emails for lapsed customers (Klaviyo)
- Low stock notification to customers who saved a product

**Amazon:**
- FBA: all pick, pack, ship, returns for accessory orders
- Merch on Demand: all production + shipping for apparel
- Amazon customer service for FBA orders
- Prime badge + buy box logic

**Platform:**
- XP awards on `order.paid` webhook
- Inventory sync (Shopify ↔ Amazon via Sales Channel)
- FBA restock alerts (agent, daily poll)

### Manual (or Agent-Drafted, Human-Approved)

**Product launch (per SKU):**
- Supplier negotiation + sampling + quality approval
- Product photography
- Writing product descriptions + SEO copy
- Amazon listing creation (title, bullets, A+ content, keywords)
- Pricing strategy per channel
- First FBA inbound shipment prep and shipping

**Ongoing operations:**
- Reviewing agent-drafted restock POs → approve + send
- Reviewing agent-drafted customer service replies → edit + send
- Reviewing agent-drafted Amazon listing updates → approve + publish
- Reviewing + approving price adjustment recommendations
- Amazon seller account health monitoring (agent flags, you resolve)
- Dispute + chargeback management

**Strategy:**
- Product roadmap decisions (add, sunset, discount)
- Promotional calendar
- Channel margin analysis + budget allocation
- Apparel drop creative direction (brief → designer → upload to POD)
- Seasonal restocking decisions

---

## 6. Revenue Model

### Per-Channel Margin Targets

| Category | Channel | Unit cost | Target retail | Net margin |
|---|---|---|---|---|
| Apparel | Shopify (POD) | $13-35 | $30-70 | ~45-50% |
| Apparel | Amazon Merch | $0 (royalty) | $25-40 | ~15-20% royalty |
| Accessories | Shopify (MCF) | COGS + FBA fees | $40-120 | ~50-60% |
| Accessories | Amazon FBA | COGS + FBA fees | $40-120 | ~35-45% |
| Lifestyle goods | Shopify (POD) | $3-18 | $10-38 | ~50-55% |
| Digital goods | Shopify | ~$0 | $15-50 | ~97% |

### Channel Priority by Margin
1. Digital goods (highest margin, push to platform users)
2. Accessories on Shopify via MCF (owned customer relationship)
3. Apparel on Shopify (solid margins, no inventory risk)
4. Accessories on Amazon FBA (lower margin, high discovery volume)
5. Apparel on Amazon Merch (lowest margin, brand awareness only)

### Additional Revenue Streams
- **Affiliate links** — gear reviews in Learn module link to Amazon with affiliate tag (passive, zero ops)
- **Team kits / bulk orders** — B2B channel for local MTB clubs (high AOV, manual but high value)
- **Limited drops** — scarcity-based apparel tied to platform milestones or trail features
- **Bundles** — course purchase + gear bundle (cross-sells Learn into merch)

### XP → Discount Retention Flywheel

| XP threshold | Reward |
|---|---|
| 1,000 XP | 10% off merch |
| 5,000 XP | Free shipping |
| 10,000 XP | Access to member-only products |
| 25,000 XP | Early access to limited drops |

XP is earned across the entire platform (Learn, Forum, Trail Maps, purchases). The merch store is both a destination and a reward.

---

## 7. AI Agent

### Architecture

```
Event sources                 Agent brain               Outputs
──────────────────────────────────────────────────────────────
Shopify webhooks       ──→                      ──→  Execute actions
Amazon SP-API polls    ──→   Claude Sonnet 4.6  ──→  Draft for review
Scheduled cron jobs    ──→   (Anthropic SDK)    ──→  Escalation alerts
Manual triggers        ──→                      ──→  Reports / summaries
```

### Autonomous Actions (no human approval needed)

| Task | Trigger | Action |
|---|---|---|
| XP awards | `order.paid` webhook | Lookup user by email → award XP → notify user |
| Shipping confirmation | Fulfillment webhook | Confirm tracking pushed to customer |
| Low inventory alerts | FBA Inventory API (daily) | Slack/email alert with restock quantity suggestion |
| Revenue reports | Scheduled (weekly/monthly) | Pull Shopify + Amazon data → format → deliver |
| Account health monitoring | Amazon SP-API (daily) | Immediate alert on listing suppression or policy flag |
| Reorder threshold alerts | Inventory poll | Flag items approaching zero stock |

### Draft + Approve (human reviews before execution)

| Task | Trigger | Agent does | Human does |
|---|---|---|---|
| Restock POs | Inventory below threshold | Draft PO: quantity, supplier, cost | Review → send |
| Customer service replies | New support ticket | Draft with full order context | Edit if needed → send |
| Amazon listing updates | Sales + search trend data | Rewrite copy with keyword suggestions | Review → publish |
| Price adjustments | Competitor pricing data | Recommend changes with reasoning | Approve → execute |
| New product listings | Manual trigger | Draft Amazon copy, Shopify description, SEO metadata | Review → publish |
| Refunds >$50 | Customer request | Draft response + recommend approve/deny | Decide → execute |

### Escalation Rules (agent pulls human in immediately)

- FBA inventory hits zero with active listings
- Amazon account health drops below threshold
- Unusual order spike (potential fraud pattern)
- Supplier doesn't confirm PO within 48 hours
- Customer escalates to chargeback
- Any action that would spend >$500

### Agent Tools / Integrations

- Shopify Admin API — orders, customers, products, inventory
- Shopify Storefront API — product sync (read-only)
- Amazon SP-API — orders, inventory, listings, pricing
- Klaviyo API — trigger and manage email flows
- Email — send drafted CS replies, POs
- Ride MTB DB — read/write XP, user lookup by email
- Slack — escalation channel
- Printful/Printify API — POD order status monitoring

### Guardrails

- Never send customer-facing messages autonomously (except transactional: shipping, receipt)
- Never spend >$100 autonomously (threshold raised over time as trust builds)
- Log every action with reasoning, reviewable in a simple dashboard
- Fail loudly — escalate rather than guess when uncertain

---

## 8. Tech Integration

### Headless Shopify in Next.js

```
ride-mtb.com/shop              →  Product listing (Storefront API)
ride-mtb.com/shop/[handle]     →  Product detail (Storefront API)
ride-mtb.com/cart              →  Cart (Storefront API)
ride-mtb.com/checkout          →  Checkout bridge (Storefront API)
ride-mtb.com/account/orders    →  Order history (Admin API, by email)
```

### Webhook Architecture

```
Shopify webhooks → /api/webhooks/shopify (Next.js API route)
  ├── order.paid
  │     ├── lookup Ride MTB user by email
  │     ├── award XP
  │     └── log order against user profile
  ├── order.fulfilled
  │     └── confirm tracking synced
  └── customer.created
        └── sync to Ride MTB DB

Amazon SP-API → agent cron jobs
  ├── inventory check (daily)
  ├── order sync (hourly)
  └── account health (daily)
```

### Key Packages

```
@shopify/storefront-api-client     Storefront API (browse, cart, checkout)
@shopify/admin-api-client          Admin API (orders, customers, inventory)
amazon-sp-api                      SP-API wrapper
@anthropic-ai/sdk                  AI agent (Claude Sonnet 4.6)
klaviyo-api                        Email automation
```

### Environment Variables

```
SHOPIFY_STOREFRONT_ACCESS_TOKEN
SHOPIFY_ADMIN_ACCESS_TOKEN
SHOPIFY_STORE_DOMAIN
SHOPIFY_WEBHOOK_SECRET
AMAZON_SP_CLIENT_ID
AMAZON_SP_CLIENT_SECRET
AMAZON_SP_REFRESH_TOKEN
AMAZON_SELLER_ID
KLAVIYO_API_KEY
```

### Folder Structure

```
src/
  app/
    shop/
      page.tsx                     product listing
      [handle]/page.tsx            product detail
      cart/page.tsx                cart
      checkout/page.tsx            checkout bridge
    account/
      orders/page.tsx              order history (Shopify Admin API)
  lib/
    shopify/
      storefront.ts                Storefront API client
      admin.ts                     Admin API client
      customer.ts                  silent customer creation
    amazon/
      sp-api.ts                    SP-API client
      inventory.ts                 inventory polling
  api/
    webhooks/
      shopify/route.ts             Shopify webhook handler
  agent/
    index.ts                       agent entrypoint
    tools/                         agent tool definitions
    tasks/                         task handlers (xp, cs, restock, listings)
```

---

## 9. Upfront Setup Checklist

### Amazon (must start immediately — long lead times)
- [ ] Register Amazon Professional Seller Account ($39.99/month)
- [ ] Apply for trademark via Amazon IP Accelerator (~$1,000-1,500, faster approval)
- [ ] Apply for Amazon Brand Registry (requires trademark — 6-12 months standard, weeks via IP Accelerator)
- [ ] Apply for Amazon Merch on Demand (waitlist — apply early)
- [ ] Purchase GS1 UPC barcodes ($250 for 10 + $50/year) — required for every listing
- [ ] Set up first FBA inbound shipment once supplier is locked

### Shopify
- [ ] Create Shopify store (Basic plan, $39/month to start)
- [ ] Enable Shopify Payments (eliminates transaction fees)
- [ ] Install Printful or Printify app
- [ ] Install Amazon Sales Channel app
- [ ] Install Shopify MCF app
- [ ] Configure Klaviyo integration
- [ ] Set up webhook endpoints

### Business
- [ ] Form LLC (before taking payments)
- [ ] Open business bank account
- [ ] Set up accounting software (QuickBooks or Wave)

### Estimated upfront investment
| Scenario | Estimate |
|---|---|
| Lean launch (POD + no FBA yet) | ~$200-300 |
| Full launch (POD + FBA + trademark in progress) | ~$3,000-5,000 |
| Full launch with IP Accelerator (Brand Registry fast-track) | ~$5,000-7,000 |

---

## 10. Open Questions / Future Decisions

- Specific POD partner: Printful vs. Printify (compare margins per product category before committing)
- Whether to use Shopify's native checkout or a custom checkout experience via Storefront API
- Agent dashboard design (where human reviews drafts and approves actions)
- B2B / team kit pricing and ordering workflow
- Affiliate program structure for Ride MTB community members
