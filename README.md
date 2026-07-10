# Lorgric — Farm-to-Market Platform for Ghana's Northern Savannah Zone

## Overview

Lorgric is a digital marketplace that connects smallholder farmers in Ghana's Northern Savannah Zone directly with buyers, while solving the two problems that make informal farm-to-market trade unreliable: **getting produce physically moved** (logistics) and **getting paid safely** (payments and trust). Alongside the produce marketplace, farmers and buyers can also buy agricultural inputs — seeds, fertilizer, tools — from registered vendors, and book independent delivery riders on demand, all inside one platform.

The platform is built around five distinct user roles — **Farmer, Buyer, Vendor, Logistics Provider, and Admin** — each with a purpose-built dashboard, plus a shared identity-verification and trust layer, encrypted messaging, mobile-money payments, and an AI layer that personalizes recommendations and gives farmers market advice. Every workflow reflects the realities of the market it serves: phone-number login (not email), mobile money and cash-on-delivery as payment options, SMS as a first-class notification channel, and no-key-required weather/mapping so operating costs stay low.

This document walks through every feature currently in the product, organized by who uses it, and explains why it matters — written for stakeholders evaluating the platform's readiness and value, not just its code.

**Quick facts:**
- **5 user roles**, each with a dedicated portal and dashboard
- **2 marketplaces**: produce (farmer → buyer) and agricultural inputs (vendor → farmer/buyer)
- **2 payment paths**: MTN/Telecel mobile money (via Paystack) or cash-on-delivery
- **AI-personalized** buyer recommendations and farmer market insights
- **Paid identity verification** (Ghana Card) gates the ability to sell or accept delivery jobs
- **End-to-end encrypted** in-app messaging (AES-256-GCM at rest)
- **Real-time delivery tracking** with support for multi-rider relay handoffs
- **Live platform stats** (active farmers, listings, districts, produce delivered) shown publicly on the landing page

---

## Table of Contents

1. [Who Uses Lorgric](#1-who-uses-lorgric)
2. [Trust & Identity: Registration, Login, and Verification](#2-trust--identity-registration-login-and-verification)
3. [Farmer Portal](#3-farmer-portal)
4. [Buyer Portal](#4-buyer-portal)
5. [Vendor Portal & the Equipment Marketplace](#5-vendor-portal--the-equipment-marketplace)
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
| **Farmer** | Smallholder producers | List produce for sale, fulfill orders, request transport, buy inputs |
| **Buyer** | Individuals or businesses purchasing produce | Browse/search the marketplace, place orders, pay, track delivery |
| **Vendor** | Agro-input shop owners (seeds, fertilizer, tools, equipment) | Run a storefront on the Equipment Marketplace, fulfill orders, manage a delivery fleet |
| **Logistics Provider** | Independent delivery riders | Accept and fulfill transport jobs, relay deliveries, earn per job |
| **Admin** | Platform operators | Moderate listings, review verifications, resolve disputes, monitor analytics |

A single account can hold more than one role's privileges — for example, a Farmer can also be flagged as a Vendor (`isVendor`) to run an input shop alongside their farm, and both Farmers and Buyers can purchase from the Equipment Marketplace regardless of their primary role.

Every route in the app is protected twice — once at the network edge (before any page even renders) and again inside each page's own data-loading logic — so a Buyer cannot load a Farmer's dashboard, and vice versa, simply by guessing a URL. Anyone who fails a role check lands on a clear "Access Denied" screen with options to go back, go home, or sign in as someone else.

---

## 2. Trust & Identity: Registration, Login, and Verification

Trust and identity are treated as first-class product features, not an afterthought — this is what makes it safe to move real money through the platform.

### Multi-role registration with phone OTP verification
A 3-step signup wizard: **(1)** pick a role, **(2)** fill role-specific details — every role provides full name, phone number, password, region, and Ghana Card number/name/residence location up front, with extra fields per role (farm details for Farmers, business type for Buyers, license plate for Logistics, shop name for Vendors, a mandatory ID photo upload for anyone registering as Admin), **(3)** verify a 6-digit SMS one-time code (10-minute expiry, resend available) before the account is actually created.

**Why it matters:** collecting identity data at signup — not as an optional afterthought — means the trust layer is built into the platform from day one, and OTP verification stops bot/fake signups before they ever reach the database.

### Phone-based login with brute-force protection
Users log in with **phone number + password**, not email — because that's how people actually identify themselves in this market, and it removes an adoption barrier for users without a personal email address. Passwords are hashed with bcrypt. After 5 failed login attempts on the same phone number within 15 minutes, further attempts are locked out — even for phone numbers that don't correspond to a real account, so the lockout mechanism itself can never be used to figure out which phone numbers are registered.

**Why it matters:** protects accounts (and the money tied to them) from automated credential-stuffing attacks, without requiring the email address that a meaningful share of users in this market may not have.

### Paid Ghana Card identity verification
A second, **paid** trust tier, separate from free registration: the user submits their Ghana Card number, the name on the card, a residence location, and a photo of the card (front, optionally back), then pays a verification fee — **GHS 50 for Farmers and Vendors, GHS 30 for Logistics Providers, GHS 10 for Buyers** — through the same mobile-money payment flow used elsewhere on the platform. An admin then manually reviews the submitted ID photo and approves or rejects the request. Only once both the payment clears **and** an admin approves does the account become "Verified."

Verification isn't just a badge — it's a functional gate: **farmers cannot publish a produce listing**, and **logistics providers cannot accept a delivery job**, until they're verified.

**Why it matters:** this is both a fraud-prevention control (a human actually checks the ID before someone can sell or move goods) and a small revenue stream, and gating the highest-risk actions (selling, accepting paid delivery work) behind it means the platform's core money-moving activities always have a verified identity behind them.

### Becoming an Admin — a separate, mandatory approval gate
Choosing "Admin" at registration does **not** grant admin access immediately. It creates an `AdminRequest` — a mandatory (not optional, unlike ID verification) review that requires a Ghana Card photo and must be approved by an *existing* admin before any admin feature becomes available. Until then, the user sees a clear "application pending" status screen. Separately, an existing admin can promote any user to Admin directly from the Users screen with one click, and the very first admin (when none exist yet to approve anyone) can be created via a command-line script.

**Why it matters:** prevents anyone from self-granting the platform's most powerful role just by picking it from a dropdown — every self-registered admin has to be vetted by a human who's already trusted.

---

## 3. Farmer Portal

### Dashboard
At-a-glance stat tiles (active listings, pending orders, completed orders, total earnings from paid orders), a live weather widget, a verification-status banner, a table of recent orders with status and a track-order link, and a grid of the farmer's most recent listings with their moderation status.

**Why it matters:** gives a farmer a single-glance view of their business health without navigating through multiple separate pages.

### Produce listing management
Farmers create listings with crop type (autocomplete from common Ghanaian crops), category, quantity, unit, price, description, harvest/expiry dates, location, and up to 5 photos (uploaded to Cloudinary). Every new listing is invisible to buyers until an **admin approves it** — the listing's own lifecycle status (Active/Draft/Sold/Expired) is tracked separately from its moderation status (Pending/Approved/Rejected), so a farmer's own listings page clearly distinguishes "this is live" from "this is still awaiting review."

**Why it matters:** this is the core reason a farmer joins the platform — the ability to reach buyers directly — while the moderation gate stops fraudulent or spam listings from ever reaching the storefront.

### Order management with a live status workflow
A live-updating (polling every 20 seconds) table of incoming orders, each advanceable through its fulfillment lifecycle with a single button — Confirm Order → Mark Ready for Pickup — with rows visibly highlighting when a status just changed. Every order links to a printable delivery slip, and once delivered, to a one-click shortcut to rate the buyer.

**Why it matters:** farmers manage order fulfillment without a phone call, and the buyer sees the same status update in near real time on their side.

### Transport/delivery requests
Farmers can request a rider for any paid order — pre-filled with the listing's pickup location and the buyer's delivery address — or create a general transport request for other needs. They can accept a system-calculated fare (based on distance and cargo weight) or offer a custom negotiated price, and once a rider accepts, pay them directly through the platform. Pending requests can be cancelled.

**Why it matters:** solves last-mile delivery — arguably Northern Ghana's single biggest farm-to-market bottleneck — inside the platform, instead of leaving farmers to arrange transport informally and unreliably.

### Buying agricultural inputs ("Purchases")
Farmers are also buyers on the separate Equipment Marketplace (seeds, tools, fertilizer sold by Vendors) — this section shows their input-purchase history with the ability to cancel a pending order or rate the vendor after delivery.

**Why it matters:** recognizes that farmers are equipment buyers too, so one account serves both sides of a farmer's needs — selling their harvest and buying what they need to grow it.

### Complaints
A structured incident-report form (category: Fraud, Quality Issue, Delivery Problem, Payment Dispute, Harassment, Technical, Other, plus free-text description), tracked through an admin resolution workflow.

**Why it matters:** gives farmers a formal, auditable escalation path for disputes — a bad-faith buyer, a payment issue — instead of relying only on informal messaging.

---

## 4. Buyer Portal

### Dashboard
The same at-a-glance stat-tile pattern (total orders, active orders, total spent), a verification-status banner, and — distinctively — an **AI-powered recommendations panel** that actively suggests nearby produce the buyer is likely to want (see [Section 9](#9-the-intelligence-layer-ai-weather-and-analytics)).

**Why it matters:** turns the buyer's home screen from a passive order list into something that proactively works for them.

### Marketplace browse & search
A full storefront experience: debounced text search, multi-select category filters, min/max price range, region filter, and pagination — all reflecting only approved, active listings. Each listing card shows a photo slideshow, price, quantity available, harvest date, the farmer's name and farm, a live follow-count, and one-click shortcuts to message the farmer or place an order.

**Why it matters:** this is the buyer's core discovery tool — real filtering (by price, category, region) is what turns a scattered set of smallholder farmers into something actually shoppable.

### Listing detail & one-flow ordering
A full listing page with a photo slideshow, the farmer's profile card (star rating, farm size, bio, verified badge), and an order panel with a quantity stepper capped at real available stock, a live running total, and a "Place Order" action. After placing an order, a payment-choice panel appears immediately — mobile money or cash-on-delivery (if the farmer accepts it).

**Why it matters:** turns browsing into a completed transaction without ever leaving the listing page.

### AI-personalized recommendations
Using the buyer's purchase history, browsing activity, and GPS location, an AI model selects the top nearby listings most relevant to that specific buyer and writes a short, friendly recommendation — deliverable both on the dashboard and as an SMS nudge.

**Why it matters:** proactively reconnects buyers with produce they're likely to want, driving repeat purchases instead of relying on buyers remembering to check back — a personalization layer smallholder-farmer marketplaces don't typically have.

### Order tracking
The buyer's mirror of the farmer's order table: farm name and location, whether the order is pickup or delivery, payment method and status, and a one-click "Rate" action once delivered.

**Why it matters:** gives buyers delivery-app-style visibility into what is otherwise an informal produce trade.

### Purchase history (produce + equipment)
A tabbed view separating produce orders from equipment-marketplace purchases, with cancel and rate actions on the equipment side.

**Why it matters:** one consolidated history across both marketplaces the platform offers.

---

## 5. Vendor Portal & the Equipment Marketplace

Vendors sell farm inputs — seeds, fertilizer, pesticides, tools, irrigation equipment, animal feed, storage — through a catalog and order system that runs in parallel to the produce marketplace.

### Vendor dashboard
Revenue, order counts by status, top-selling products, and a verification-status banner.

**Why it matters:** a real-time performance snapshot for shop owners without digging through order lists manually.

### Product catalog management
Vendors list products with name, category (9 types), price, unit, and stock, and can toggle availability or delete listings. Adding a new product is blocked with a clear "verify your account" prompt until the vendor is identity-verified.

**Why it matters:** lets vendors self-serve their entire storefront while enforcing the same paid-verification trust gate that applies to selling anywhere else on the platform.

### Order fulfillment
A live-polling (20s) order queue split into active and completed sections, with a single-button status advance through the fulfillment lifecycle (Pending → Confirmed → Processing → Shipped → Delivered) and full visibility into customer contact and line items.

**Why it matters:** vendors process incoming orders without leaving the page or manually refreshing.

### Fleet management
Vendors can register their own delivery vehicles (bus, minibus, pickup, van) with driver name, phone, and capacity, toggle availability, and share live GPS location.

**Why it matters:** lets vendors run their own last-mile delivery instead of depending entirely on independent logistics riders — useful for bulkier input orders.

### The Equipment Marketplace (buyer-facing storefront)
This is the customer-facing side of the vendor system — despite the name, it's not farm-machinery rental, it's where any Farmer or Buyer shops for inputs. Full search and category filtering, product cards with image slideshows, an add-to-cart flow with a quantity stepper and slide-out cart drawer, an optional delivery address, and a checkout that intelligently splits a multi-vendor cart into one separate order per vendor so payment and fulfillment never get muddled across shops. A "Message Vendor" quick-contact option sits on every product.

**Why it matters:** gives every farmer and buyer a place to buy the inputs they need the same way they'd buy produce — in one platform, with checkout logic that correctly handles buying from multiple shops at once.

### Vendor complaints
The same structured incident-report form available to every role.

---

## 6. Transport & Logistics — Booking, Fulfilling, and Tracking Deliveries

This is the full loop that solves physical delivery, spanning the requester side (Farmers, Buyers, or anyone needing something moved) and the provider side (Logistics Providers).

### Booking a delivery (Find a Rider)
A live map-based booking screen showing every currently available rider and vendor-owned vehicle, with real online/away/offline status, filterable to motorbikes only or buses/trucks only. The requester drops pickup and delivery pins on the map (or uses their current GPS location), enters cargo weight, and sees a live, transparent fare estimate — base fare plus distance and weight components plus an ETA — *before* booking.

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
The customer-facing companion: a current status badge, a visual timeline, farmer/buyer verified-status cards, transport provider info with a call button, the full multi-rider relay chain if the delivery was handed off, and a live pickup-to-delivery map.

**Why it matters:** answers "where's my order" for a buyer or farmer without anyone having to message or call.

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
Every farmer produce listing requires admin approval before it appears on the public marketplace — admins approve or reject with an optional note shown back to the farmer.

**Why it matters:** a manual content-moderation checkpoint that stops spam, mispriced, or fraudulent listings from ever reaching buyers.

### Identity verification review
Reviews every paid verification application — viewing the submitted Ghana Card photo directly — and approves or rejects with notes.

**Why it matters:** the human half of the identity-trust system; the fee alone doesn't verify anyone, a person has to actually check the ID.

### Admin application review
The mandatory review queue for anyone who registered directly as an Admin, described in [Section 2](#2-trust--identity-registration-login-and-verification).

**Why it matters:** the control point that keeps the platform's most powerful role from being granted without human oversight.

### Complaint resolution
Every role's incident reports land in one queue, filterable by status, with the ability to read the full report and set a resolution status and notes.

**Why it matters:** centralized dispute resolution across the entire platform, regardless of which role filed or was the subject of a complaint.

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
Direct conversations between any two users — a conversation list with unread badges, live search-to-start-conversation, near-real-time polling, optimistic sending, and browser desktop notifications when the tab isn't in focus. Every message is encrypted (AES-256-GCM) before being stored and only decrypted for the authorized participants reading it.

**Why it matters:** lets any two users negotiate and coordinate — price, pickup timing — directly on the platform, and encrypting messages at rest means a database breach doesn't expose those conversations.

### Unified notifications
A single engine fans every platform event (new message, order confirmed, payment chosen, delivery handed off, etc.) out to both an in-app bell notification and an SMS, de-duplicated so nobody is pinged twice for the same event, with rapid repeat messages collapsed into one notification instead of spamming.

**Why it matters:** keeps users informed by SMS even when they're not actively in the app — important where connectivity or data is inconsistent — while still maintaining a proper in-app history.

### Mobile money payments, with cash-on-delivery as a fallback
Buyers pay for produce orders and transport bookings via **MTN Mobile Money or Telecel Cash**, processed through Paystack. Every flow also supports **cash-on-delivery** as an explicit, opt-in fallback (farmers choose whether they accept it). Successful payment automatically advances the order to confirmed status.

**Why it matters:** meets buyers and farmers where they already transact — mobile money, not cards — which is the difference between a payment feature people actually use and one they don't; the cash fallback ensures no sale is lost just because a buyer prefers to pay on arrival.

### Reviews & ratings
Once an order (produce or equipment) is marked delivered, the platform automatically creates review requests for whoever still owes a rating — a farmer rates their buyer, a buyer rates their farmer or vendor — and blocks reviewing before delivery or reviewing twice.

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

*This document reflects the platform's feature set as currently implemented in the codebase.*
