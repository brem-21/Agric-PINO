# Admin Analytics — Implementation Guide

This doc explains how the admin analytics dashboard (`/admin/analytics`) works end to end, and how to extend it: new event types, new metrics, new filters, new columns.

---

## 1. Architecture at a glance

```
 Browser (every page)                    Next.js server                         Storage / consumers
 ─────────────────────                   ───────────────                        ───────────────────
 <AnalyticsTracker/>                     POST /api/analytics
   └─ useTracker()  ──── fetch ────────▶   1. zod-validate the event
       page_view                            2. prisma.userEvent.create()  ────▶  Postgres  "UserEvent"
       click                                3. publishEvent()  ───────────────▶  Kafka  "lorgric.events"
       scroll                               4. after(): reverseGeocode()                │
       location_update                         → update placeName                      ▼
       (+ custom via track())                                                   kafka-consumer
                                                                                 → AI recommendations
 /admin/analytics (client page)          GET /api/admin/events          ◀────  reads UserEvent
   ├─ filters / KPIs / breakdowns  ◀──── GET /api/admin/events/summary  ◀────  reads UserEvent
   └─ event log + IP tooltip       ◀──── GET /api/admin/ip-lookup  ──────────▶  ip-api.com
```

The main design rule: **the dashboard reads only from Postgres.** Kafka feeds the recommendation engine, not the dashboard. Events are written to the DB *before* they're published to Kafka, so if Kafka is down the event is still saved and still shows on the dashboard.

---

## 2. File map

| Layer | File | Role |
|---|---|---|
| Client capture | `src/hooks/use-tracker.ts` | `useTracker()` hook: session ID, device info, auto-tracking, `track()` function |
| | `src/components/shared/analytics-tracker.tsx` | Mounts `useTracker()` once |
| | `src/components/providers.tsx` | Renders `<AnalyticsTracker />` app-wide |
| Ingestion | `src/app/api/analytics/route.ts` | Validates, persists, publishes, geocodes |
| Data model | `prisma/schema.prisma` → `model UserEvent` | Event table |
| Streaming | `src/lib/kafka.ts` | Kafka client, producer, `TOPICS`, `EventType`, `publishEvent()` |
| | `src/lib/kafka-consumer.ts` | Consumer → `generateAndSendRecommendations()` |
| | `src/instrumentation.ts` | Starts the consumer inside the Next.js process |
| | `src/scripts/kafka-consumer.ts` | Standalone consumer (`npm run kafka:consumer`) |
| Admin APIs | `src/app/api/admin/events/route.ts` | Paginated, filtered event log |
| | `src/app/api/admin/events/summary/route.ts` | KPIs, growth %, breakdowns, filter options |
| | `src/app/api/admin/ip-lookup/route.ts` | IP → city/ISP (on hover) |
| | `src/app/api/admin/stats/route.ts` | Platform counts for the admin home page (not event-based) |
| Helpers | `src/lib/analytics-range.ts` | `resolveRange()` — day/week/month/year/custom → `{from, to}` |
| | `src/lib/geocode.ts` | Nominatim reverse geocoding (rate-limited queue + cache) |
| | `src/lib/ip-geolocation.ts` | ip-api.com lookup (cached, skips private IPs) |
| | `src/lib/utils.ts` → `formatIp()` | Normalises `::ffff:x.x.x.x`, `::1` |
| UI | `src/app/admin/analytics/page.tsx` | The dashboard |
| | `src/app/admin/admin-sidebar.tsx` | "Analytics" nav link |

---

## 3. How it works, step by step

### 3.1 Capture (`useTracker`)

`<AnalyticsTracker />` is mounted in `providers.tsx`, so it runs on **every page for every visitor**, whether logged in or not. Each event is a fire-and-forget `POST /api/analytics`; errors are swallowed so tracking can never break the page.

| Event | Fired when | Extra `data` |
|---|---|---|
| `page_view` | pathname changes | `referrer` |
| `click` | click on `a`, `button`, or any `[data-track]` element | `element`, `text` (≤60 chars), `href`, `trackId` |
| `scroll` | scroll depth rises by ≥10% (600 ms debounce) | `depth` (0–100) |
| `location_update` | once per browser tab, if the user grants geolocation | `lat`, `lon`, `accuracy` |

Every event also carries:
- `sessionId`: a UUID kept in `sessionStorage["lorgric_sid"]`. It lasts for one browser tab.
- `os` and `deviceType`: parsed from the user agent.
- `url`: the current pathname.
- `location`: the cached `{lat, lon}`, if location was granted.

The hook returns `track(type, data)` for custom events (see §5.1).

### 3.2 Ingestion (`POST /api/analytics`)

1. **Validate** with zod. `type` must be one of the enum values, or the event is silently dropped (the response is still `{ok: true}`).
2. **Enrich** on the server: `userId` (from the NextAuth session, or `null`), `ip` (from `x-forwarded-for` or `x-real-ip`), and `userAgent`.
3. **Persist** to `UserEvent`. Common keys are copied out of `data` into their own columns (`os`, `deviceType`, `url`, `referrer`, `depth`, `element`, `elementText`, `href`, `trackId`, `accuracy`, `lat`, `lon`, `ipFormatted`), so they can be indexed and grouped. The full `data` JSON is also kept, so nothing is lost.
4. **Publish** to Kafka topic `lorgric.events`, keyed by `sessionId`. Failures are logged and ignored.
5. **Geocode later**: if lat/lon exist, Next's `after()` reverse-geocodes them once the response has been sent and fills in `placeName`. Nominatim allows about 1 request/sec, so this must never block ingestion.

### 3.3 Data model

```prisma
model UserEvent {
  id, sessionId, userId?, type, data (Json), ip?, userAgent?, createdAt
  // promoted columns (null on legacy rows — APIs fall back to `data`)
  ipFormatted, placeName, os, deviceType, url, referrer, depth,
  element, elementText, href, trackId, accuracy, lat, lon
  @@index([userId]) @@index([type]) @@index([createdAt])
}
```

`user` uses `onDelete: SetNull`. If a user is deleted, their events stay and become anonymous.

### 3.4 Admin read APIs

All three return `401` unless `session.user.role === "ADMIN"`.

**`GET /api/admin/events`**: the paginated log.

| Param | Meaning |
|---|---|
| `type` | exact event type |
| `range` | `day` (today) · `week` (last 7 days) · `month` (last 30, default in UI) · `year` (last 365) · `custom` + `from`/`to` (`YYYY-MM-DD`) |
| `location` | exact `placeName` |
| `role` | `FARMER` · `BUYER` · `LOGISTICS` · `STORAGE_FACILITY` · `ADMIN` (joins via `user`) |
| `os` | exact OS |
| `page`, `limit` | `limit` capped at 20 |

Each row comes back with a `columns` object. For each field it uses the promoted column if set, otherwise the raw `data` value. Any keys that aren't promoted are added too. Rows that have coordinates but no `placeName` yet are geocoded on the fly (one lookup per distinct coordinate).

**`GET /api/admin/events/summary`**: the KPI and breakdown payload.
- `totals`: `totalEvents`, `uniqueSessions`, `uniqueUsers`, `distinctEventTypes`, `avgEventsPerSession`. Each is `{value, growth}`, where `growth` is the % change against the **previous window of the same length**. `null` means the previous value was 0, and the UI shows "New".
- `deviceBreakdown`, `osBreakdown`, `typeBreakdown`: `{key, count, pct}[]`, sorted by count.
- `locationBreakdown`: the top 6 locations plus an "Other" bucket.
- `filterOptions`: all known locations and OSes (**across all time, not just the selected range**) plus the fixed role list.

**`GET /api/admin/ip-lookup?ip=`**: city, region, country, ISP, org from ip-api.com. Private and loopback IPs are never looked up.

### 3.5 Dashboard (`/admin/analytics`)

This is a client component. It has one shared `filterParams` object (range, custom dates, location, role, OS) that drives **both** requests:
- the `summary` fetch, which feeds the 5 KPI tiles and 4 breakdown cards
- the `events` fetch, which feeds the log table. It also adds `type` (the tab row) and `page`.

Changing any filter resets the table to page 1. The log table builds its columns as **the fixed columns** (Time, Type, User, Session, IP, Location) **plus one column for every distinct key in `columns` on the current page**. A new `data` key therefore shows up as a column automatically, with no UI change. The **Columns** picker lets admins hide columns; this choice isn't saved after a reload. Hovering an IP looks it up once per IP per page load.

### 3.6 Kafka consumer (recommendations)

The consumer group is `lorgric-recommendations` and it reads `lorgric.events` from the latest offset. It only acts when all of these are true:
- the event has a `userId`
- `type` is one of `location_update`, `product_view`, `farmer_view`
- that user hasn't had a recommendation in the last hour (an **in-memory** cooldown, kept separately in each process)

When it acts, it calls `generateAndSendRecommendations()`, which only does anything for `BUYER` users who have coordinates.

---

## 4. Running it locally

```bash
docker compose up -d        # postgres :5435, kafka :29092, kafka-ui :8090, pgadmin :5055
npx prisma db push          # this project uses db push, not migrations
npm run dev                 # app on :3000; also starts the Kafka consumer via instrumentation.ts
```

- `KAFKA_BROKERS` (in `.env.local`) defaults to `localhost:29092`.
- `npm run kafka:consumer` runs the consumer as a separate process, e.g. as a sidecar. It isn't needed alongside `npm run dev`, because both join the same consumer group and the topic has only one partition, so one of them just sits idle.
- To get an admin account, run `npm run make-admin` and then log in. The page is at `http://localhost:3000/admin/analytics`.

**Quick checks**
- Browse a few pages, then: `docker exec -it agrictech_db psql -U agrictech -d agrictech_dev -c 'SELECT type, url, "placeName", "createdAt" FROM "UserEvent" ORDER BY "createdAt" DESC LIMIT 10;'`
- Kafka: open http://localhost:8090 → Topics → `lorgric.events` → Messages.

---

## 5. How to extend it

### 5.1 Add a new event type (e.g. `listing_share`)

1. **Allow it** in **both** places, or it will be dropped:
   - `src/app/api/analytics/route.ts`: add it to the `z.enum([...])`
   - `src/lib/kafka.ts`: add it to the `EventType` union
2. **Emit it** from a client component:
   ```tsx
   import { useTracker } from "@/hooks/use-tracker";
   const { track } = useTracker();
   track("listing_share", { listingId, channel: "whatsapp" });
   ```
   > Note: calling `useTracker()` again also sets up its listeners again (page views, clicks, scroll), so those events would be counted twice. For many emitters, split `track` out into a small standalone helper or a context instead (see §6).
3. **Show it as a tab**: add `{ value: "listing_share", label: "Listing Share" }` to `TYPE_TABS` in `src/app/admin/analytics/page.tsx`. The event already counts in KPIs and the "Event Type Distribution" card without this; the tab only adds filtering.
4. **(Optional) Trigger recommendations**: add it to `triggerTypes` in `src/lib/kafka-consumer.ts`.

Its `data` keys (`listingId`, `channel`) appear in the log table automatically.

### 5.2 Track a click without new code

Add `data-track` to any element:
```tsx
<div data-track="hero-cta-card" onClick={...}>…</div>
```
Its value is stored in the `trackId` column, so you can filter and group on it.

### 5.3 Promote a `data` key to a real column

Do this when you need to filter, group or index on a key:
1. Add the field to `model UserEvent` in `prisma/schema.prisma` (add `@@index` if you'll filter on it), then run `npx prisma db push`.
2. Write it in `POST /api/analytics`: `myKey: typeof raw.myKey === "string" ? raw.myKey : null`.
3. In `GET /api/admin/events`: add it to the `select`, to the `columns` object (with a `?? raw.myKey` fallback for legacy rows), and to `PROMOTED_KEYS`.
4. (Optional) Backfill old rows from JSON:
   `UPDATE "UserEvent" SET "myKey" = data->>'myKey' WHERE "myKey" IS NULL AND data ? 'myKey';`

### 5.4 Add a KPI tile

1. In `summary/route.ts`, compute the value inside `computeTotals()`, which runs for both the current and the previous window, so growth comes free. Then return it in `totals` as `{ value, growth: pctChange(curr, prev) }`.
2. In `page.tsx`, add it to the `Summary.totals` interface and render a `<StatTile icon={…} label="…" metric={summary.totals.newKey} />`. Adjust the `lg:grid-cols-5` grid if needed.

### 5.5 Add a breakdown card (e.g. top pages)

1. In `summary/route.ts`, add a group-by query to the `Promise.all`:
   ```ts
   prisma.userEvent.groupBy({ by: ["url"], where: { ...currentWhere, url: { not: null } }, _count: true })
   ```
   Map it with `withPct(rows.map(g => ({ key: g.url!, count: g._count })), currentTotals.totalEvents)`, optionally `.slice(0, N)`, and return it.
2. In `page.tsx`, add it to the `Summary` interface and render `<BreakdownCard title="Top Pages" rows={summary.pageBreakdown} emptyLabel="…" />`.

### 5.6 Add a dashboard filter (e.g. device type)

1. **Both** `events/route.ts` and `summary/route.ts`: read `searchParams.get("device")` and add `...(device && { deviceType: device })` to the `where` or `baseWhere`.
2. `summary/route.ts`: return its options in `filterOptions`. Query all-time values, like `allOsRows`.
3. `page.tsx`: add a `useState`, add it to `filterParams` (**and** its dependency array), and render a `<select>` using `resetToPageOne(setX)`.

### 5.7 Add a new time range

Add a branch to `resolveRange()` in `src/lib/analytics-range.ts`, and add the tab to `RANGE_TABS`. The previous-window comparison adjusts to the new range length by itself.

### 5.8 Charts / time series

There is no trend chart yet (the comment *"affect KPIs, breakdowns, trend…"* in `page.tsx` refers to one that hasn't been built). To add one, write a bucketed count with `prisma.$queryRaw`:
```sql
SELECT date_trunc('day', "createdAt") AS bucket, count(*)::int AS n
FROM "UserEvent" WHERE "createdAt" BETWEEN $1 AND $2 GROUP BY 1 ORDER BY 1;
```
Use `hour` buckets for the `day` range. Apply the same `location`/`role`/`os` filters. A role filter needs a join to `"User"`.

---

## 6. Known gaps and gotchas

- **`product_view`, `farmer_view` and `equipment_view` are never sent.** They're accepted by the API and have dashboard tabs, but no component calls `track()` with them. Their tabs are always empty, and the only event that can trigger a recommendation today is `location_update`. Wire them up on the listing, farmer-profile and equipment detail pages (§5.1 step 2).
- **No `data-track` attributes are used anywhere yet**, so `trackId` is always empty.
- **Calling `useTracker()` more than once registers its auto-trackers more than once.** Before adding many custom emitters, split out a `track()` helper that has no side effects.
- **The type list is defined in three places**: the zod enum, the `EventType` union and `TYPE_TABS`. Keep them in sync; a shared constant would be cleaner.
- **Summary queries are full group-bys on each request.** `uniqueSessions` and `uniqueUsers` load every distinct key into memory. That's fine at current volume, but at scale switch to `COUNT(DISTINCT …)` via `$queryRaw`, add `@@index([createdAt, type])`, or roll up into a daily table.
- **The geocode and IP caches are in-memory**, so they're lost on restart and not shared between instances. Old rows without `placeName` are geocoded again when the log is read, at about 1/sec.
- **The recommendation cooldown is per process**, so multiple app instances can each send a recommendation within the hour.
- **The location filter is an exact `placeName` match.** Place names come from Nominatim strings, so the same area can appear in slightly different forms.
- **Privacy**: the app stores IPs and precise coordinates (with permission) for anonymous visitors too. Consider a retention job (e.g. delete events older than N days) and mention it in the privacy policy.
- `limit=0` on `/api/admin/events` makes `pages` evaluate to `Infinity`/`NaN`. The UI never sends it, but clamp to ≥1 if the API is exposed more widely.
