# Lorgric — Reducing Post-Harvest Loss in Ghana's Northern Savannah Zone

## Overview

**Scope statement:** We're helping tomato farmers in Ghana's Upper East Region reach wholesalers and processors before their harvest spoils, by storing it at nearby cold-chain storage facilities instead of selling within hours of harvest at whatever price is offered. The same model — book a storage facility instead of selling immediately, sell to a bulk buyer once it's safely stored — extends to yam and other fruit farmers across the wider Northern Savannah Zone, with dry storage for tubers and cold-chain for fresh fruit.

Lorgric is a digital platform built around a single mission: **cutting the post-harvest losses (PHL) that cost Northern Ghana's smallholder farmers 10–50% of every harvest**, and the country as a whole an estimated **US$1.9 billion a year** (APHLIS, 2022; WFP, 2023). Research on the region is consistent about the drivers — inadequate storage, damaged feeder roads, no cold chain, and, above all, a lack of a ready market to sell into before produce spoils. Lorgric addresses each of those directly, as a marketplace, not a report: it gets a farmer's harvest in front of a wholesaler, processor, rider, or storage facility **fast enough to sell before it rots**.

Concretely, that means solving the same problems informal farm-to-market trade always runs into — **aggregation and storage** (a physical place to hold produce until a bulk buyer is found), **getting produce physically moved** (logistics), and **getting paid safely** (payments and trust) — but doing it with the post-harvest clock in mind: produce listings carry harvest and expiry dates, the marketplace can be sorted by what's most at risk of spoiling, transport is bookable on demand instead of waiting on an unreliable middleman, and a network of cold-chain/hermetic-dry storage facilities lets a farmer stop being forced to sell (or lose) their harvest the moment it's picked.

The platform is built around five distinct user roles — **Farmer, Buyer, Storage Facility, Logistics Provider, and Admin** — each with a purpose-built dashboard, plus a shared identity-verification and trust layer, encrypted messaging, mobile-money payments, and an AI layer that personalizes recommendations and gives farmers market advice. Every workflow reflects the realities of the market it serves: phone-number login (not email), mobile money and cash-on-delivery as payment options, SMS as a first-class notification channel, and no-key-required weather/mapping so operating costs stay low.

This document walks through every feature currently in the product, organized by who uses it, and explains why it matters — written for stakeholders evaluating the platform's readiness and value, not just its code.

### Why post-harvest loss, and why this matters

- **10–50%** of smallholder harvests in Northern Ghana are lost after production, depending on crop and handling (APHLIS, 2022; FAO, 2019).
- **US$1.9 billion** is lost nationally each year to post-harvest inefficiencies (WFP, 2023).
- Fresh horticultural crops — tomatoes, mangoes, watermelons, leafy vegetables — lose **20–50%**, mostly to heat, bruising in transit, and no cold storage. A study of the **Upper East tomato value chain** (Anaba, 2018) — Lorgric's flagship crop and corridor — found losses compounding at *every* stage: ~10–13% on the farm, **26%** with wholesalers, **20%** at retail, driven above all by a lack of a ready market and no cold-chain storage.
- Grains fare better but aren't immune: maize loses ~15% to poor drying and storage; sorghum and millet lose ~12.4% in aggregate (APHLIS, 2022).
- **The gap is closeable, and fast**: a field intervention on Northern Ghana's sorghum value chain — better harvesting, tarpaulin drying, mechanized threshing, faster market access — cut losses from **12.4% to 6.6%** in a single season and nearly doubled participating farmers' income (APHLIS/VCA4D, 2022). Lorgric is built to deliver that same shift at platform scale: storage facilities that buy time, reliable transport, and direct access to wholesale/processor buyers.

### Crop-specific storage and post-harvest management

The nature of post-harvest loss varies by crop, so storage and handling advice has to be tailored to each commodity's own biology rather than treated as one generic problem — this is the research basis for the two storage types (Cold Chain and Hermetic/Dry) a Storage Facility operator chooses between on this platform (see [Section 5](#5-storage-facility-portal--the-aggregation-point)), scoped to the crops Lorgric actually supports: Tomato, Yam, and Fruits.

| Crop | Major Loss Hotspots | Recommended Storage & Handling | Expected Outcome | Platform Storage Type |
|---|---|---|---|---|
| **Tomato** | Heat exposure, bruising in transit, over-ripening with no refrigeration — losses compound at every stage: on the farm, with wholesalers, and at retail (Anaba, 2018) | Harvest at the correct ripeness stage; handle gently in ventilated crates rather than sacks; move quickly into cold-chain storage to slow ripening while a buyer is found | Slower ripening, less bruising and rot, and a wider window to reach a wholesale/processor buyer before spoilage | Cold Chain |
| **Yam** | Weight loss during prolonged storage; bruising during harvesting and transport | Store tubers in a well-ventilated barn-style setup; avoid mechanical injury during harvest and transport; keep storage cool and dry, with periodic inspection | Reduced physiological weight loss, lower rotting rates, and improved market quality | Hermetic/Dry |
| **Mango** (and other Fruits) | Fruit fly infestation, bruising, long transport times, no cold storage | Harvest at the correct maturity stage; handle carefully in field crates instead of sacks; move into cold-chain storage and refrigerated transport where possible | Reduced physical damage, slower ripening, and extended shelf life | Cold Chain |

*(Grain and legume crops — maize, rice, cowpea, groundnuts — follow their own hermetic-storage playbook, but sit outside Lorgric's current Tomato/Yam/Fruits scope, so they're intentionally left out of this table rather than described as something the platform supports.)*

This Tomato/Yam/Fruits narrowing is now consistent end-to-end: the database schema's `ProduceCategory` enum (`prisma/schema.prisma`), every API route's validation, and every UI file that renders a category label all match this scope. See `POST_HARVEST_LOSS_FINDINGS.md` for the verification trail.

Beyond crop-specific storage, transportation infrastructure matters just as much: poor feeder roads delay the move from farm to market, and that delay alone spoils highly perishable produce — tomatoes, mangoes, and yams among them — regardless of how well it was stored beforehand. This is the reason on-demand logistics booking and real-time tracking (see [Section 6](#6-transport--logistics--booking-fulfilling-and-tracking-deliveries)) sit alongside storage as a first-class feature rather than an afterthought.

### Feature → cause mapping

| Post-harvest loss cause (from the research) | How Lorgric addresses it |
|---|---|
| No ready market — surplus rots unsold, especially at seasonal gluts | Direct farmer↔buyer↔processor marketplace; a `WHOLESALER`/`PROCESSOR` buyer type for bulk sales |
| Produce sits too long before a sale is found | Listings carry harvest/expiry dates; the marketplace can be sorted by **spoilage urgency**, and farmers see an at-a-glance spoilage-risk flag on their own listings |
| No cold chain, no hermetic/dry storage for surplus produce | A network of **Storage Facilities** (cold-chain and hermetic-dry) that farmers book a drop-off slot at instead of selling immediately |
| Poor/damaged feeder roads bruise and delay produce in transit | On-demand logistics booking, real-time tracking, and multi-rider relay handoffs for long hauls |
| Limited access to post-harvest handling knowledge/extension services | AI layer gives farmers market and handling advice |
| Fraud, spoiled trust, and payment risk discourage timely, arm's-length sales | Ghana Card verification, encrypted messaging, mobile money + cash-on-delivery, and a two-sided rating system |

**Quick facts:**
- **5 user roles**, each with a dedicated portal and dashboard
- **Storage-facility network**: farmers book a drop-off at a cold-chain or hermetic-dry facility instead of selling immediately; the facility takes a flat **5% commission** on any resulting sale, the farmer keeps 95%
- **Spoilage-aware marketplace**: listings sortable by how soon they need to sell, with visual urgency flags for buyers and farmers alike, and a "Stored at [Facility]" badge once produce is in storage
- **B2B-first buyer types**: Wholesaler and Processor lead the buyer segment, alongside Retailer, Restaurant, Exporter, and Household
- **2 payment paths**: MTN/Telecel mobile money (via Paystack) or cash-on-delivery
- **AI-personalized** buyer recommendations and farmer market insights
- **Ghana Card identity verification** as a trust badge, not a functional gate — every account can already list, order, accept jobs, and book storage; verification unlocks for free after 10 completed transactions, or immediately for a one-time fee, with an admin still reviewing the ID either way
- **End-to-end encrypted** in-app messaging (AES-256-GCM at rest)
- **Real-time delivery tracking** with support for multi-rider relay handoffs
- **Live platform stats** (active farmers, listings, districts, produce delivered) shown publicly on the landing page
- **Binding price negotiation**: a buyer can make a structured offer (quantity + price + expiry) instead of haggling over chat — the farmer accepts, counters, or declines, and acceptance auto-generates a real order at the agreed terms
- **Risk-based listing approval**: a verified farmer with a clean record and a price in line with the market auto-publishes immediately; only price outliers or flagged accounts wait on manual admin review
- **Multi-farmer bulk orders**: a Wholesaler/Processor buyer can fill one purchase from several farmers' listings of the same crop in a single transaction — each farmer still fulfills only their own leg
- **Order disputes with a real refund path**: a buyer can reject delivered produce with a reason and photo; the farmer or an admin resolves it with a refund, a replacement, or a denial — a refund actually flips the order's payment status, not just a complaint on file

---

## Table of Contents

1. [Who Uses Lorgric](#1-who-uses-lorgric)
2. [Trust & Identity: Registration, Login, and Verification](#2-trust--identity-registration-login-and-verification)
3. [Farmer Portal](#3-farmer-portal)
4. [Buyer Portal](#4-buyer-portal)
5. [Storage Facility Portal — the Aggregation Point](#5-storage-facility-portal--the-aggregation-point)
6. [Transport & Logistics — Booking, Fulfilling, and Tracking Deliveries](#6-transport--logistics--booking-fulfilling-and-tracking-deliveries)
7. [Admin Portal — the Platform's Control Room](#7-admin-portal--the-platforms-control-room)
8. [Shared Platform Features](#8-shared-platform-features)
9. [The Intelligence Layer: AI, Weather, and Analytics](#9-the-intelligence-layer-ai-weather-and-analytics)
10. [Security & Trust Infrastructure](#10-security--trust-infrastructure)
11. [Technology Stack](#11-technology-stack)

---

## 1. Who Uses Lorgric

| Role | Who they are | What they do on the platform |
|---|---|---|
| **Farmer** | Smallholder producers | List produce for sale, book a storage-facility drop-off, request transport |
| **Buyer** | Wholesalers, processors, retailers, restaurants, exporters, households | Browse/search the marketplace, place orders, pay, track delivery |
| **Storage Facility** | Cold-chain or hermetic-dry storage operators | Manage facility profile/location, confirm/reject farmer drop-off bookings, hold and help sell produce, earn a 5% commission |
| **Logistics Provider** | Independent delivery riders | Accept and fulfill transport jobs, relay deliveries, earn per job |
| **Admin** | Platform operators | Moderate listings and storage facilities, review verifications, resolve disputes, monitor analytics |

Every route in the app is protected twice — once at the network edge (before any page even renders) and again inside each page's own data-loading logic — so a Buyer cannot load a Farmer's dashboard, and vice versa, simply by guessing a URL. Anyone who fails a role check lands on a clear "Access Denied" screen with options to go back, go home, or sign in as someone else. Admins are the one exception by design: every role-specific portal (Farmer, Buyer, Logistics, Storage Facility) also accepts the `ADMIN` role, so an admin can open any dashboard directly to investigate or assist, without needing a separate impersonation feature.

---

## 2. Trust & Identity: Registration, Login, and Verification

Trust and identity are treated as first-class product features, not an afterthought — this is what makes it safe to move real money through the platform.

### Multi-role registration with phone OTP verification
A 3-step signup wizard: **(1)** pick a role, **(2)** fill role-specific details — every role provides full name, phone number, password, region, and Ghana Card number/name/residence location up front, with extra fields per role (farm details for Farmers, business type for Buyers — Wholesaler leads the list, license plate for Logistics, facility name for Storage Facilities, a mandatory ID photo upload for anyone registering as Admin), **(3)** verify a 6-digit SMS one-time code (10-minute expiry, resend available) before the account is actually created.

**Why it matters:** collecting identity data at signup — not as an optional afterthought — means the trust layer is built into the platform from day one, and OTP verification stops bot/fake signups before they ever reach the database.

### Phone-based login with brute-force protection
Users log in with **phone number + password**, not email — because that's how people actually identify themselves in this market, and it removes an adoption barrier for users without a personal email address. Passwords are hashed with bcrypt. After 5 failed login attempts on the same phone number within 15 minutes, further attempts are locked out — even for phone numbers that don't correspond to a real account, so the lockout mechanism itself can never be used to figure out which phone numbers are registered.

**Why it matters:** protects accounts (and the money tied to them) from automated credential-stuffing attacks, without requiring the email address that a meaningful share of users in this market may not have.

### Ghana Card identity verification — a trust badge anyone can reach, free or fast-tracked
Verification is deliberately **not** a functional gate — a farmer without it can already list produce, a rider can already accept jobs, a buyer can already order or make offers, and a farmer can already book storage. Gating those actions behind a paid step would exclude exactly the smallholder farmers the platform exists to serve, so instead verification is a trust badge two different paths can reach:

- **Free, activity-based:** once an account has been part of 10 completed transactions (delivered orders for a farmer/buyer, delivered jobs for a rider, dropped-off bookings for a facility), it becomes *eligible* — but crossing the threshold alone doesn't unlock the apply button. An admin has to proactively invite that specific user first (see [Section 7](#7-admin-portal--the-platforms-control-room)); only after that invite does "Apply for Verification" appear on their account, at no cost.
- **Paid fast-track:** an account that doesn't want to wait can apply immediately by paying a one-time fee — **GHS 50 for Farmers and Storage Facilities, GHS 30 for Logistics Providers, GHS 10 for Buyers** — through the same mobile-money flow used elsewhere on the platform.

Either way, the application form is **pre-filled** with the Ghana Card number, card name, and residence location already collected at signup — a user only needs to correct anything that's changed and upload a photo of the card (front, required; back, optional), rather than retyping identity details the platform already has on file. That photo is the one genuinely new thing verification asks for: the signup fields are a self-declared claim, the photo is what lets a human actually check it. **An admin always reviews the submitted ID photo and approves or rejects it** — paying only buys the ability to apply sooner, never the badge itself, so the human fraud check that matters is identical on both paths. An unpaid fast-track application stays invisible to the admin review queue until its payment actually clears.

Once an application is approved, those identity fields lock on the user's profile — a verified user can no longer silently edit their own Ghana Card number, card name, or residence location (see [Section 8](#8-shared-platform-features)); changing them requires going through this same review process again, so a "verified" badge can never end up attached to data nobody actually checked.

**Why it matters:** a paid-only verification tier would price out the smallholder farmers this platform is built for; splitting it into a free activity-based path and an optional paid fast-track keeps the fraud-prevention value of a human ID check (and the small revenue stream) without making trust something only better-resourced users can afford. Pre-filling from signup removes the redundant step of typing the same details twice, without weakening the check itself.

### Becoming an Admin — a separate, mandatory approval gate
Choosing "Admin" at registration does **not** grant admin access immediately. It creates an `AdminRequest` — a mandatory (not optional, unlike ID verification) review that requires a Ghana Card photo and must be approved by an *existing* admin before any admin feature becomes available. Until then, the user sees a clear "application pending" status screen. Separately, an existing admin can promote any user to Admin directly from the Users screen with one click, and the very first admin (when none exist yet to approve anyone) can be created via a command-line script.

**Why it matters:** prevents anyone from self-granting the platform's most powerful role just by picking it from a dropdown — every self-registered admin has to be vetted by a human who's already trusted.

---

## 3. Farmer Portal

### Dashboard
At-a-glance stat tiles (active listings, pending orders, completed orders, total earnings from paid orders), a live weather widget, a verification-status banner, a table of recent orders with status and a track-order link, and a grid of the farmer's most recent listings with their moderation status.

A **Post-Harvest Loss** tile is computed fresh on every page load from three independent signals, not just one: produce whose listing has passed its expiry date still unsold, an order that was cancelled after the stock was already pulled from the marketplace (nothing restocks a listing on cancellation, so that value is genuinely gone), and a storage booking the farmer confirmed but never actually dropped off within a few days of the scheduled date — the one intervention built to prevent spoilage, missed. All three are valued in GHS and expressed as a percentage of everything the farmer has ever brought to market, color-coded by severity.

**Why it matters:** gives a farmer a single-glance view of their business health without navigating through multiple separate pages, and a loss figure that actually reflects the real points where produce goes to waste — not just "did this listing expire" — is what makes the number trustworthy enough to act on.

### Produce listing management
Farmers create listings with crop type (autocomplete from common Ghanaian crops), category, quantity, unit, price, description, harvest/expiry dates, location, and up to 5 photos (uploaded to Cloudinary). A listing doesn't default into a manual review queue: it **auto-publishes immediately** when the farmer is verified, has no open complaints against them, and the price sits within a normal band of the category's recent median — the farmer sees "It's live on the marketplace now — no waiting" the moment they submit. Only a price that's a statistical outlier, or a farmer with an open complaint, gets routed to manual admin review instead, and that farmer is told exactly why ("It needs a quick admin review"). The listing's own lifecycle status (Active/Draft/Sold/Expired) is tracked separately from its moderation status (Pending/Approved/Rejected either way).

Each farmer's own listings table also surfaces a **spoilage-risk indicator** — computed from the listing's expiry date — the moment produce is within a week of spoiling, escalating from "days left to sell" to "sell soon" to "sell today," so a farmer knows to drop the price or reach out to a bulk/processor buyer before the stock is a total loss instead of finding out after the fact.

**Why it matters:** this is the core reason a farmer joins the platform — the ability to reach buyers directly — and risk-based auto-approval keeps the manual review queue proportional to actual risk instead of gatekeeping every routine listing behind a human, which matters because produce spoils in hours-to-days, not however long a queue takes to clear. The spoilage-risk flag turns "produce quietly rotting unsold," the single most common driver of post-harvest loss in the research, into something a farmer can act on in time.

### Order management with a live status workflow
A live-updating (polling every 20 seconds) table of incoming orders, each advanceable through its fulfillment lifecycle with a single button — Confirm Order → Mark Ready for Pickup — with rows visibly highlighting when a status just changed. Every order links to a printable delivery slip, and once delivered, to a one-click shortcut to rate the buyer. An order that's part of a wholesale buyer's bulk order is flagged as such, but is otherwise managed identically to any other order — a farmer only ever sees and fulfills their own leg. If a buyer rejects a delivered order, it surfaces as a flagged row right in this table with the buyer's stated reason and a one-click **Refund / Replacement / Deny** resolution.

**Why it matters:** farmers manage order fulfillment without a phone call, and the buyer sees the same status update in near real time on their side, and a disputed order is resolved by the farmer directly, in the same table they already work from, instead of a separate unresolved complaint thread.

### Responding to offers
Every buyer offer on a farmer's listing lands on a dedicated **Offers** page — quantity, proposed price, an optional message, and a countdown to when the offer expires (48 hours per round). A farmer can **Accept** it outright, **Counter** with different quantity/price terms, or **Decline** — and the platform enforces whose turn it is, so a farmer can't accept their own still-pending proposal and a buyer can't accept a counter before the farmer sends one. Accepting either side's terms instantly creates a real order at that exact price and quantity — no separate step, no relying on a phone call to confirm what was agreed.

**Why it matters:** Ghanaian farm-to-market trade runs on haggling over price at the point of sale — without this, that negotiation happens over unstructured chat with no order ever generated from it, pushing the actual deal into a side-channel the platform can't see, measure, or protect.

### Transport/delivery requests
Farmers can request a rider for any paid order — pre-filled with the listing's pickup location and the buyer's delivery address — or create a general transport request for other needs. Typing a pickup/delivery address (rather than using GPS or picking a point on the map) still resolves to coordinates automatically in the background, so the fare/distance/ETA estimate always appears instead of silently staying blank. Farmers can accept the system-calculated fare (based on distance and cargo weight) or offer a custom negotiated price, and once a rider accepts, pay them directly through the platform. The request list refreshes on its own every 15 seconds, so a rider accepting or advancing a job shows up without the farmer needing to hit refresh. Pending requests can be cancelled.

**Why it matters:** solves last-mile delivery — arguably Northern Ghana's single biggest farm-to-market bottleneck — inside the platform, instead of leaving farmers to arrange transport informally and unreliably.

### Booking storage instead of selling immediately
A farmer doesn't have to sell (or hold) produce alone: a map of approved storage facilities — filterable by cold-chain vs. hermetic-dry, with capacity, accepted crop categories, and rating shown per facility — lets a farmer pick one nearby and submit a drop-off booking (crop, quantity, asking price, scheduled drop-off date/time). Bookings are tracked through their own lifecycle (Pending → Confirmed/Rejected → Dropped Off, or Returned to Farmer if reclaimed before it sells), visible on a "My Bookings" page.

**Why it matters:** this is the platform's direct answer to "surplus produce rots because there's no ready market" — instead of a forced sale within hours of harvest, a farmer can buy time at a facility built for exactly that crop's storage needs, and reach a wholesaler or processor once it's safely stored, at a flat 5% commission to the facility.

### Complaints
A structured incident-report form (category: Fraud, Quality Issue, Delivery Problem, Payment Dispute, Harassment, Technical, Other, plus free-text description), tracked through an admin resolution workflow.

**Why it matters:** gives farmers a formal, auditable escalation path for disputes — a bad-faith buyer, a payment issue — instead of relying only on informal messaging.

---

## 4. Buyer Portal

### Dashboard
The same at-a-glance stat-tile pattern (total orders, active orders, total spent), a verification-status banner, and — distinctively — an **AI-powered recommendations panel** that actively suggests nearby produce the buyer is likely to want (see [Section 9](#9-the-intelligence-layer-ai-weather-and-analytics)).

**Why it matters:** turns the buyer's home screen from a passive order list into something that proactively works for them.

### Marketplace browse & search
A full storefront experience: debounced text search, multi-select category filters, min/max price range, region filter, a **"spoiling soon — sell first" sort**, and pagination — all reflecting only approved, active listings. Each listing card shows a photo slideshow, price, quantity available, harvest date, a spoilage-urgency badge when the produce is within a week of its expiry date, a **"Stored at [Facility Name]"** badge when the produce is being held at a storage facility, the farmer's name and farm, a live follow-count, and one-click shortcuts to message the farmer or place an order.

Above the results, a **Flagship Corridor** chip — 🍅 Upper East Tomato Corridor — applies the exact category/region/crop scope named in this platform's own stated focus. It's a real, clickable filter, not just pitch copy: clicking it narrows the marketplace to precisely that corridor's produce.

**Why it matters:** this is the buyer's core discovery tool — real filtering (by price, category, region) is what turns a scattered set of smallholder farmers into something actually shoppable, and the urgency sort lets buyers actively route demand toward the produce most at risk of being lost, instead of that surplus quietly rotting unsold. The flagship-corridor chip makes the platform's narrowed scope something anyone can click into and verify, not just a claim in a pitch deck.

### Listing detail & one-flow ordering
A full listing page with a photo slideshow, the farmer's profile card (star rating, farm size, bio, verified badge), a spoilage-urgency banner when the listing is nearing its expiry date, and — when the produce is stored at a facility — the facility's name and location shown as the effective pickup point, alongside an order panel with a quantity stepper capped at real available stock, a live running total, and a "Place Order" action. Buyers can still message the farmer directly at any time, whether or not the produce is currently in storage. After placing an order, a payment-choice panel appears immediately — mobile money or cash-on-delivery (if the farmer accepts it).

**Why it matters:** turns browsing into a completed transaction without ever leaving the listing page.

### Negotiating price with a binding offer
Instead of only the listed price, a buyer can click **Make an Offer** and propose a quantity and price per unit (plus an optional note) directly from the listing page. The farmer sees it on their Offers page and can accept, counter with different terms, or decline; the buyer then does the same with any counter, back and forth, until someone accepts, declines, or 48 hours passes and it expires. A tracked **My Offers** page shows every offer's status and whose turn it is to act. The moment either side accepts, the platform creates a real order at the agreed price and quantity automatically — the negotiated price is binding, not just a number mentioned in chat.

**Why it matters:** haggling over price is how this market actually works — without a structured offer flow, that negotiation happens in an unstructured message thread with no price field, no expiry, and no way to actually check out at the agreed price, which pushes buyers and farmers back toward an informal, unprotected side deal.

### Bulk orders — buying wholesale quantities across multiple farmers
A Wholesaler or Processor buyer (the segment this platform is actually built for) doesn't have to place one order per farmer to fill a real wholesale quantity. From a dedicated **Bulk Order** flow, a buyer picks a crop, sees every active listing for it across *every* farmer, and selects however many listings — and however many different farmers — it takes to reach the quantity they need, all in one submission. The platform creates one ordinary `Order` per farmer behind the scenes — each farmer still only ever sees and fulfills their own leg, exactly like a normal order — while the buyer sees one rolled-up **Bulk Order** with a farmer-by-farmer delivery status. This flow is scoped to Wholesaler/Processor accounts specifically; a Retailer, Restaurant, Exporter, or Household buyer still uses the ordinary single-listing order flow, since bulk aggregation across farmers is a wholesale buying pattern, not a retail one.

**Why it matters:** most smallholder-farmer marketplaces quietly assume a farmer sells small quantities directly to one retailer or consumer at a time. In practice, a lot of Northern Ghana's produce moves through wholesalers who aggregate across many farmers before reselling — this is the platform actually modeling that transaction shape instead of forcing a wholesale buyer to place a dozen separate retail-sized orders by hand.

### AI-personalized recommendations
Using the buyer's purchase history, browsing activity, and GPS location, an AI model selects the top nearby listings most relevant to that specific buyer and writes a short, friendly recommendation — deliverable both on the dashboard and as an SMS nudge.

**Why it matters:** proactively reconnects buyers with produce they're likely to want, driving repeat purchases instead of relying on buyers remembering to check back — a personalization layer smallholder-farmer marketplaces don't typically have.

### Order tracking, and rejecting produce that doesn't meet the deal
The buyer's mirror of the farmer's order table: farm name and location, whether the order is pickup or delivery, payment method and status, and a one-click "Rate" action once delivered. Once an order is delivered, a buyer who isn't willing to accept it — wrong quantity, wrong item, damaged, not fresh — can **Reject Produce**: a reason, a description, and an optional photo file a real dispute against that specific order, notifying both the farmer and admins. The farmer (or an admin, if the farmer doesn't act) resolves it with a **refund** (which actually flips the order's payment status to refunded), a **replacement**, or a **denial** — a defined accountability path, not just a complaint that sits unresolved.

**Why it matters:** gives buyers delivery-app-style visibility into what is otherwise an informal produce trade, and answers the question every produce marketplace eventually has to: who bears responsibility, and what actually happens, when delivered produce isn't what was promised.

---

## 5. Storage Facility Portal — the Aggregation Point

Storage facilities are the platform's answer to "surplus produce rots because there's no ready market": a physical cold-chain or hermetic-dry site that a farmer books a drop-off slot at instead of selling immediately. Once produce is dropped off, the facility becomes the effective point of sale (or pickup) shown on the marketplace, and earns a flat **5% commission** on any resulting sale — the farmer keeps the remaining 95%. This is pure bookkeeping (see [Section 8](#8-shared-platform-features)); no real money-splitting happens at the payment layer, consistent with how farmer/logistics payout already works today.

### Storage facility dashboard
Commission earned, total sales facilitated, current active listings in storage, and counts of pending/confirmed bookings — plus the shared verification-status banner.

**Why it matters:** a real-time view of what's earning the facility money and what needs action, without digging through booking lists manually.

### Facility profile & location
Facility name, description, storage type(s) — **Cold Chain** for perishables like tomatoes and fresh fruit, or **Hermetic/Dry** (PICS-bag style) for tubers like yam that keep better in cool, dry conditions than refrigeration — advisory capacity in tonnes, accepted produce categories (Vegetables/Tubers/Fruits — the platform's own Tomato/Yam/Fruit scope), operating hours, and a location set by GPS or by picking a point on the map. Editing the location re-queues the facility for admin approval, mirroring how a relisted address needs re-vetting.

**Why it matters:** this is the information a farmer sees on the map before booking — accurate storage type and location are what makes the booking decision meaningful.

### Managing incoming bookings
A queue of farmer drop-off requests the facility can Confirm, Reject, mark **Dropped Off** (which auto-creates the produce listing if one doesn't exist yet, sets it live pending the usual admin moderation, and links it to the facility), or **Return to Farmer** (the clean inverse — the farmer reclaims produce before it sells, and the listing's facility link clears).

**Why it matters:** gives the facility operator full control over the physical handoff — nothing is marked "in storage" until the operator confirms produce has actually physically arrived.

### Inventory
Every listing currently linked to the facility, with status, moderation state, quantity, and the farmer's contact — what's actually on-site and still sellable, against the facility's advisory capacity.

**Why it matters:** lets an operator sanity-check they're not overcommitting physical space before confirming another booking.

### Managing orders and delivery on the farmer's behalf
Once a buyer orders produce that's sitting in the facility, the facility — not the farmer — drives that order through its fulfillment lifecycle (Confirm → Start Processing → Mark Ready for Pickup, or mark it delivered directly), and can book a rider for it through the same on-demand transport marketplace every other role uses. Every action the facility takes on an order or its delivery notifies the farmer directly, so nothing happens to their produce silently.

**Why it matters:** this is what makes storage a genuine "farmer steps back, facility takes over" handoff rather than just a place to park produce — the farmer keeps earning while the facility does the operational work of closing the sale.

### Facility dashboard: post-harvest loss tracking
Alongside commission and booking stats, the dashboard surfaces the facility's own **post-harvest loss percentage** — computed the same way as the farmer's own version (expired-unsold stock, cancelled-order value, and bookings confirmed but never actually dropped off), but rolled up across every farmer the facility has ever held produce for — color-coded by severity, plus a live count of orders still awaiting fulfillment. The same figure, scoped per-farmer, ranks the "My Customers" repeat-offender-style table so the facility can see at a glance which of its farmers are losing the most value.

**Why it matters:** gives a facility operator the same "are we actually preventing loss" signal the platform's mission is built around, not just revenue and volume numbers.

### Facility messaging
A dedicated messages inbox, identical to every other role's, so a facility can be contacted (and reply) directly instead of routing every question through its dashboard.

### Facility complaints
The same structured incident-report form available to every role.

---

## 6. Transport & Logistics — Booking, Fulfilling, and Tracking Deliveries

This is the full loop that solves physical delivery, spanning the requester side (Farmers, Buyers, or anyone needing something moved) and the provider side (Logistics Providers). Any pickup or delivery to/from a storage facility uses this same general rider marketplace — facilities don't run their own delivery fleet.

### Booking a delivery (Find a Rider)
A live map-based booking screen showing every currently available rider with real online/away/offline status. The requester drops pickup and delivery pins on the map (or uses their current GPS location), enters cargo weight, and sees a live, transparent fare estimate — base fare plus distance and weight components plus an ETA — *before* booking.

**Why it matters:** turns "I need something moved" into a self-serve, price-transparent booking experience similar to a ride-hailing app, instead of requiring a phone call to a dispatcher.

### The Logistics Provider's job board and cockpit
Riders see a live-updating dashboard of pending transport requests they can accept with one click (blocked until they're verified), and a fuller "Requests" screen showing the pickup/delivery map, offered price, cargo weight, and buyer contact where relevant. Every state a delivery can be in has an explicit action available: Accept → Mark Picked Up → In Transit → Mark Delivered, or Reject, or "Give Back" a job they can no longer fulfill. A focused "Active Deliveries" view narrows this down to just what the rider needs to act on right now, with direct-call links to both farmer and buyer.

**Why it matters:** this is the operational cockpit for a working rider — nothing about a delivery's progress requires a phone call, and giving a job back rather than abandoning it silently keeps deliveries from getting stuck.

### Multi-rider relay handoff
A rider mid-delivery can transfer the job to another available rider, with an optional handoff note — this creates a new leg in the delivery's record so the complete chain of custody (who carried it, and when) is preserved and visible on the public tracking page.

**Why it matters:** solves the real-world case where one motorbike can't cover an entire route, without losing traceability of who has the goods at any point.

### Delivery slip
A print-optimized, shareable order summary — a visual progress stepper, produce/transport/payment details, and direct-call contact cards for the farmer, buyer, and rider — plus a WhatsApp share button and a print button. Deliberately has no extra role restriction beyond being logged in, since it's designed to be handed to a physical courier or printed as a paper waybill.

**Why it matters:** this is the paper trail — literally printable — that makes a physical handoff carry the same information as the digital order.

### Order tracking
The customer-facing companion: a current status badge, a visual timeline, farmer/buyer verified-status cards, transport provider info with a call button, the full multi-rider relay chain if the delivery was handed off, and a pickup-to-delivery map. While a delivery is assigned, picked up, or in transit, that map upgrades to a **live rider position** — pulled from the same GPS the rider's own app is already reporting — polling every 10 seconds and showing distance-to-destination and an ETA in minutes, instead of just the static pickup/delivery pins.

**Why it matters:** answers "where's my order" for a buyer or farmer without anyone having to message or call, and even a coarse live position beats no location at all for trust and planning in the low-connectivity rural areas this platform targets.

---

## 7. Admin Portal — the Platform's Control Room

Admins are the humans behind trust and safety, content moderation, and platform health.

### Dashboard
Total users by role, pending-listing count, open-complaint count, and total listings/orders, with quick-action shortcuts straight to the two most time-sensitive queues.

**Why it matters:** a one-glance platform health check for whoever's on duty.

### User management
A searchable, filterable, paginated table of every user with activate/deactivate control. Each user's detail page shows their full profile — including their Ghana Card details, visible nowhere else on the platform — with actions to verify/unverify, activate/deactivate, or promote directly to Admin.

**Why it matters:** doubles as both the support/moderation toolkit and the direct escape hatch for granting admin access when needed, distinct from the self-service application flow.

### Listing approvals
Most farmer listings auto-approve and never reach this queue — what lands here is specifically what needs a human: a listing flagged for a **price anomaly** (more than 50% off the category's recent median, shown with the exact deviation) sorts to the top with a visible ⚠️ badge, and anything still pending after 2 hours gets a "spoilage risk" badge since the produce behind it is on a real clock. Admins approve or reject with an optional note shown back to the farmer.

**Why it matters:** a manual content-moderation checkpoint that stops spam, mispriced, or fraudulent listings from ever reaching buyers — narrowed to the listings that actually carry that risk, so admin attention isn't spent re-approving routine, in-range listings one by one.

### Identity verification review
Reviews every submitted application — free or paid — viewing the submitted Ghana Card photo directly, and approves or rejects with notes.

A separate **"Eligible, Not Applied"** queue lists unverified users who've crossed the free-verification activity threshold but haven't submitted anything yet. Each row expands into that specific user's actual qualifying transactions (their delivered orders, delivery jobs, or dropped-off bookings — whichever their role counts) so an admin can sanity-check the eligibility number before acting, and a **Send Verification Request** button fires an in-app + SMS notification inviting that user to submit their Ghana Card number and photo. Crossing the threshold alone no longer unlocks that user's own "Apply" button — this admin-sent invite is what does, and it can be resent if needed.

**Why it matters:** the human half of the identity-trust system; the fee alone doesn't verify anyone, a person has to actually check the ID. Requiring an admin to actively invite each eligible user — rather than letting the app unlock "Apply" automatically — puts a person in the loop *before* an ID photo is even requested, with the actual transaction history in front of them to judge whether reaching out makes sense.

### Admin application review
The mandatory review queue for anyone who registered directly as an Admin, described in [Section 2](#2-trust--identity-registration-login-and-verification).

**Why it matters:** the control point that keeps the platform's most powerful role from being granted without human oversight.

### Complaint resolution
Every role's incident reports land in one queue, filterable by status, with the ability to read the full report and set a resolution status and notes.

**Why it matters:** centralized dispute resolution across the entire platform, regardless of which role filed or was the subject of a complaint.

### Order disputes
A separate, order-specific queue from general complaints: every buyer-filed "Reject Produce" dispute, with the reason, description, photo (if any), the order's payment status, and the same **Refund / Replacement / Deny** resolution the farmer can also apply — admin visibility exists specifically for when a farmer doesn't act, or the two sides disagree, so a dispute is never stuck with no one able to resolve it.

**Why it matters:** answers, concretely, who is responsible when delivered produce isn't accepted — not left as an open question the way a general complaint can be.

### Messages
The same live, searchable, encrypted direct-messaging inbox every other role has, letting admins reach any user directly.

**Why it matters:** lets admins follow up on a complaint or verification question without leaving the admin panel.

### Analytics
The most detailed admin screen: date-range and location/role/device filters, key metrics with period-over-period growth (total events, unique sessions, unique users, distinct event types, average engagement per session), breakdown charts by device/OS/location/event type, and a raw, configurable-column event log.

**Why it matters:** genuine product-analytics tooling that shows engagement patterns and drop-off without needing a third-party analytics vendor.

---

## 8. Shared Platform Features

These work identically across every role.

### Encrypted in-app messaging
Direct conversations between any two users — a conversation list with unread badges, live search-to-start-conversation, near-real-time polling, optimistic sending, and browser desktop notifications when the tab isn't in focus. Every message is encrypted (AES-256-GCM) before being stored and only decrypted for the authorized participants reading it. Every role — including Storage Facilities and Logistics Providers — has its own dedicated inbox.

Messages started from a marketplace listing (the "Message Farmer" quick-contact button on a listing card or detail page) carry that listing's crop along with them, shown as a small tappable "About: [Crop]" badge in the conversation that links straight back to the listing.

**Why it matters:** lets any two users negotiate and coordinate — price, pickup timing — directly on the platform, and encrypting messages at rest means a database breach doesn't expose those conversations. The listing context turns "which of my 6 conversations with this buyer was about the tomatoes?" into something the UI just answers for you.

### Unified notifications
A single engine fans out dozens of distinct platform event types — new messages, order and delivery status changes, storage bookings, complaints and repeat-offender flags, verification and admin/Incident Team application outcomes, review requests, and more — to both an in-app bell notification (each with its own icon) and an SMS, de-duplicated so nobody is pinged twice for the same event, with rapid repeat messages collapsed into one notification instead of spamming.

**Why it matters:** keeps users informed by SMS even when they're not actively in the app — important where connectivity or data is inconsistent — while still maintaining a proper in-app history.

### Mobile money payments, with cash-on-delivery as a fallback
Buyers pay for produce orders and transport bookings via **MTN Mobile Money or Telecel Cash**, processed through Paystack. Every flow also supports **cash-on-delivery** as an explicit, opt-in fallback (farmers choose whether they accept it). Successful payment automatically advances the order to confirmed status.

**Why it matters:** meets buyers and farmers where they already transact — mobile money, not cards — which is the difference between a payment feature people actually use and one they don't; the cash fallback ensures no sale is lost just because a buyer prefers to pay on arrival.

### Self-service profile editing
Every user can edit their own profile in place — name, phone, region/district, and their role-specific details (farm name/size/location for Farmers, business name/type for Buyers, company/plate/vehicle for Logistics Providers, facility details for Storage Facilities) — directly from the Profile page, with an inline Edit/Save/Cancel toggle rather than a separate form page. Ghana Card number, card name, and residence location are editable the same way *until* the account becomes verified — from that point on they're shown locked, since that data has been through a human ID check and a self-edit would undermine the verified badge's meaning. Changing a locked identity field requires submitting a new verification application instead.

**Why it matters:** signup is a one-time snapshot, but a phone number changes, a business grows a name, a rider switches vehicles — without self-service editing, fixing any of that would mean contacting an admin. Locking identity fields post-verification keeps that convenience from quietly reopening the exact trust gap verification exists to close.

### Reviews & ratings
Once an order is marked delivered, the platform automatically creates review requests for whoever still owes a rating — a farmer rates their buyer, a buyer rates their farmer — and blocks reviewing before delivery or reviewing twice.

**Why it matters:** builds the star-rating trust signal shown throughout the marketplace that lets a buyer judge a farmer's reliability before ever placing an order.

---

## 9. The Intelligence Layer: AI, Weather, and Analytics

### AI-personalized buyer recommendations
Combines a buyer's purchase history, recent browsing behavior, and GPS location to have an AI model select the most relevant nearby listings and write a short, natural recommendation — delivered both as an on-demand dashboard widget and as an automated SMS campaign that's triggered by real user activity (e.g. viewing a product or updating location), with a cooldown so the same buyer isn't messaged repeatedly.

**Why it matters:** turns passive browsing into repeat purchases by proactively telling buyers "produce you'd want just became available near you," instead of relying on them to remember to check back.

### AI market insight for farmers
Given a farmer's crop, region, current listing price, recent order volume, and current weather, an AI model returns a short, actionable pricing and market recommendation.

**Why it matters:** gives smallholder farmers a lightweight substitute for a market analyst — an informed pricing decision without needing to shop around themselves.

### Behavioral analytics pipeline
Every page view, click, scroll, and product view is captured and streamed through a real-time event pipeline (Kafka), which is what actually feeds the AI recommendation engine and the admin analytics dashboard. Events are recorded to the database first, so nothing is lost even if the streaming layer has an issue.

**Why it matters:** this is the data spine that makes personalization possible — without capturing real behavior, the AI features would just be guessing, and it's what powers the admin team's visibility into how the platform is actually being used.

### Live weather and same-day farming advice
Pulls current conditions and a 7-day forecast for a farmer's location and converts the raw numbers into a plain-English, actionable recommendation — for example, flagging high rain probability with "delay harvest, cover stored produce," or extreme heat with "irrigate early morning, transport only in the evening."

**Why it matters:** turns raw weather data into a same-day decision a farmer can actually use, without needing to interpret meteorological jargon themselves.

### Location intelligence
Reverse geocoding (turning GPS coordinates into a readable place name) and live map views power location pickers, live delivery-rider tracking, and the rider-booking map — all built on open, no-license-fee map data.

**Why it matters:** distance and location are core to matching buyers with the *nearest* available farmer or rider, and doing this without a paid maps API keeps the platform's operating cost low as it scales.

### Public, real-time platform stats
The public landing page displays live counts — active farmers, approved active listings, distinct districts with farmers, and total tons of produce delivered — computed directly from the database on every page load, not hardcoded marketing copy.

**Why it matters:** gives visiting stakeholders, investors, and new users immediate, real proof of platform traction and geographic reach.

---

## 10. Security & Trust Infrastructure

- **Encrypted data at rest:** private messages are encrypted (AES-256-GCM) before storage.
- **Browser-level protections:** the platform applies security headers that block clickjacking, prevent MIME-type sniffing, restrict referrer leakage, disable camera/microphone access, and enforce a Content Security Policy that only allows the specific external services the app actually uses (media storage, map tiles, payments) — everything else is blocked by default.
- **Brute-force protection:** login lockout after repeated failed attempts, without allowing that lockout to reveal which phone numbers have accounts.
- **Identity verification:** paid, admin-reviewed Ghana Card checks gate the platform's highest-risk actions (selling, accepting delivery jobs).
- **Layered access control:** every role-restricted page is checked both before rendering and again in its data layer, so no portal's data is reachable by the wrong role via a guessed URL.
- **Durable media storage:** listing photos and ID verification photos are stored on managed cloud media infrastructure (not local disk), with sensitive ID photos kept in a logically separate location from public listing images.

---

## 11. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | PostgreSQL, via Prisma ORM |
| Authentication | NextAuth.js, phone + password credentials |
| Payments | Paystack (MTN Mobile Money / Telecel Cash) |
| Messaging/Events | Apache Kafka |
| AI | OpenRouter (Anthropic Claude & GPT-4o models) |
| SMS | mNotify (Ghana SMS gateway) |
| Media storage | Cloudinary |
| Maps & geocoding | Leaflet / React-Leaflet, OpenStreetMap Nominatim |
| Weather data | Open-Meteo |
| Testing | Playwright (end-to-end) |

---

*This document reflects the platform's feature set as currently implemented in the codebase. For an independent, code-level verification of the PHL claims made above (with file/line citations), see [`POST_HARVEST_LOSS_FINDINGS.md`](./POST_HARVEST_LOSS_FINDINGS.md).*
