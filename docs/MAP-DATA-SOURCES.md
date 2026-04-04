# Map Data Sources — Ride MTB

A comprehensive reference for every map layer we have or want to build. For each layer: what data we need, where to get it, how to ingest it, and what the data model looks like.

---

## Current Layers

| Layer | Status | Primary Source | DB Model |
|-------|--------|---------------|----------|
| Trails | ✅ Live | Internal DB (OSM import) | `TrailSystem`, `Trail` |
| Events | ✅ Live | Internal DB (user-submitted) | `Event` |
| Coaching | ✅ Live | Internal DB (user-submitted) | `CoachProfile`, `Clinic` |
| Skateparks | ✅ Live | Internal DB (OSM import) | `Facility` (SKATEPARK) |
| Pump Tracks | ✅ Live | Internal DB (OSM import) | `Facility` (PUMPTRACK) |
| Bike Parks | ✅ Live | Internal DB (OSM import) | `Facility` (BIKEPARK) |

## Planned Layers

| Layer | Priority | Primary Source | DB Model |
|-------|----------|---------------|----------|
| Bike Shops | 🔴 High | OSM + Google Places | `Facility` (BIKE_SHOP) |
| Trailheads & Parking | 🔴 High | OSM + USFS GIS | `Trailhead` |
| Bike Repair Stations | 🟡 Medium | OSM | `Facility` (REPAIR_STATION) |
| Rentals & Demo Centers | 🟡 Medium | OSM + manual | `Facility` (RENTAL) |
| Campgrounds | 🟡 Medium | Recreation.gov + OSM | `Campground` |
| Shuttles | 🟠 Low | Manual / user-submitted | `Shuttle` |
| Water Refill Points | 🟠 Low | OSM | `Facility` (WATER) |

---

## Layer-by-Layer Data Sources

---

### 1. Trails

**What we need:** Trail system locations (clustered pins), individual trail lines (shown at zoom ≥11), difficulty, length, surface type.

**Current state:** Already imported from OSM. 2,284+ trails across 38 systems in Supabase.

#### Expand with:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **OpenStreetMap** | Global trail network, updated continuously | Overpass API (free) | Free |
| **USFS GTLF** | Official National Forest trail data with maintained status | [fs.usda.gov/visit/maps](https://www.fs.usda.gov/visit/maps) — bulk download | Free |
| **BLM GeoData** | Bureau of Land Management trails | [blm.gov/services/geospatial](https://www.blm.gov/services/geospatial) — bulk download | Free |
| **Trailforks API** | Community-rated MTB trails, conditions, photos | Partnership / licensing required | Paid |
| **MTB Project (REI)** | Trail descriptions, photos, GPX | `https://www.mtbproject.com/data` | Free API key |

**OSM Overpass query for MTB trails:**
```
[out:json][timeout:90];
(
  way["highway"="path"]["mtb:scale"]({{bbox}});
  way["highway"="track"]["mtb:scale"]({{bbox}});
  relation["route"="mtb"]({{bbox}});
);
out body geom;
```

**Key OSM tags:**
- `mtb:scale` — 0–6 (roughly matches our 1–5 difficulty)
- `mtb:scale:uphill` — climb difficulty
- `surface` — paved / gravel / dirt / rock
- `sac_scale` — hiking difficulty (cross-reference)
- `trail_visibility`

---

### 2. Events

**What we need:** Race events, group rides, clinics, trail days — with date, location, type, and registration link.

**Current state:** User-submitted via internal form.

#### Expand with:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **USA Cycling** | Official sanctioned races (XC, Enduro, DH, Marathon) | `https://usacycling.org/events` — scrape or export | Free |
| **Enduro World Series** | EWS/EWSS round listings | RSS + website scrape | Free |
| **Trailforks Events** | Community ride events, trail days | Trailforks API | Paid |
| **Eventbrite API** | MTB-tagged events near a location | `https://www.eventbrite.com/developer/v3/` | Free tier |
| **MTB race series** | NorCal, NICA, IMBA events — manual scrape or feed | Per-organization | Free |
| **Facebook Events** | Local club rides (declining reliability) | Graph API (restricted) | Free |

**USA Cycling scrape fields:**
```
name, date, location (city/state), discipline, category, registration_url, organizer
```

**Eventbrite query:**
```
GET https://www.eventbritefapi.com/v3/events/search/
  ?q=mountain+bike
  &categories=108
  &location.within=50mi
  &location.address={user_location}
```

---

### 3. Coaching

**What we need:** Coach profiles with location and specialty, scheduled clinics with date/price/location.

**Current state:** Fully user-submitted. PMBIA-certified coaches add their own profiles.

#### Expand with:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **PMBIA Directory** | Certified instructor listings with location | [pmbia.org](https://www.pmbia.org) — scrape or partnership | Free |
| **BICP Directory** | Bike Instructor Certification Program listings | [bikeicp.com](https://www.bikeicp.com) | Free |
| **IMBA Chapters** | Local club coaching programs | IMBA chapter directory scrape | Free |
| **Trailforks Coaches** | Coach listings in Trailforks database | Trailforks API | Paid |

---

### 4. Skateparks

**What we need:** Location, surface, lighting (lit), amenities, photos.

**Current state:** OSM import. Schema: `Facility` with `type=SKATEPARK`.

#### Expand with:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **OpenStreetMap** | Global, community-maintained, best free source | Overpass API | Free |
| **Skatepark Project** | US skateparks with quality ratings | [skatepark.org](https://www.skatepark.org) — scrape | Free |
| **Concrete Disciples** | Global skatepark directory, photos | [concretedisciples.com](https://www.concretedisciples.com) — scrape | Free |
| **Google Places** | Fills gaps, adds hours/photos/reviews | Places API | Pay-per-use |

**OSM Overpass query:**
```
[out:json][timeout:60];
(
  node["leisure"="skateboard_park"]({{bbox}});
  way["leisure"="skateboard_park"]({{bbox}});
  relation["leisure"="skateboard_park"]({{bbox}});
);
out center;
```

**Key OSM tags:**
- `leisure=skateboard_park`
- `surface` — concrete / asphalt / wood
- `lit` — yes / no
- `fee` — yes / no
- `operator`
- `opening_hours`

---

### 5. Pump Tracks

**What we need:** Location, surface type, indoor/outdoor, operator, lit status.

**Current state:** OSM import. Schema: `Facility` with `type=PUMPTRACK`.

#### Expand with:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **OpenStreetMap** | Primary source, growing coverage | Overpass API | Free |
| **Velosolutions** | Commercial pump track builder — owns/knows every track they built globally | [velosolutions.com](https://www.velosolutions.com) — contact/scrape | Free |
| **Pumptrack.com** | Community-curated directory | [pumptrack.com](https://www.pumptrack.com) — scrape | Free |
| **Pump Track World Championships** | Competition-grade tracks | PTWC listings | Free |

**OSM Overpass query:**
```
[out:json][timeout:60];
(
  node["pump_track"="yes"]({{bbox}});
  way["pump_track"="yes"]({{bbox}});
  node["leisure"="track"]["sport"="bmx"]({{bbox}});
  way["leisure"="track"]["sport"="bmx"]({{bbox}});
  node["sport"="pump_track"]({{bbox}});
);
out center;
```

**Key OSM tags:**
- `pump_track=yes`
- `sport=pump_track` or `sport=bmx`
- `surface` — dirt / asphalt / concrete / wood
- `indoor` — yes / no
- `lit`

---

### 6. Bike Parks

**What we need:** Location, services (lifts, rentals, lessons), season, difficulty range, website.

**Current state:** OSM import. Schema: `Facility` with `type=BIKEPARK`.

#### Expand with:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **OpenStreetMap** | General coverage | Overpass API | Free |
| **IMBA Epic/Epics list** | IMBA-designated destinations | [imba.com](https://www.imba.com/trails) | Free |
| **Bike Park List** | Community-maintained global directory | [bikepark.ch](https://www.bikepark.ch) — scrape | Free |
| **Ski resort portals** | Lift-served bike parks — many ski resorts run summer bike parks | Individual resort sites | Manual |
| **Trailforks Bike Parks** | Rated lift-access parks with trail maps | Trailforks API | Paid |

**OSM Overpass query:**
```
[out:json][timeout:60];
(
  node["sport"="cycling"]["leisure"="sports_centre"]({{bbox}});
  way["sport"="cycling"]["leisure"="sports_centre"]({{bbox}});
  node["bicycle_park"="yes"]({{bbox}});
  node["leisure"="resort"]["sport"="cycling"]({{bbox}});
  way["name"~"Bike Park",i]({{bbox}});
);
out center;
```

---

### 7. Bike Shops 🆕

**What we need:** Shop name, location, hours, phone, website, services offered (repair, rental, full-suspension demo, MTB-specific). This feeds directly into the Shop Owner Portal.

**Current state:** Shop model exists in DB for the owner portal, but no map layer yet.

#### Sources:

| Source | What it adds | Access | Cost | Quality |
|--------|-------------|--------|------|---------|
| **OpenStreetMap** | Global, free, includes `bicycle:mtb` tag | Overpass API | Free | ⭐⭐⭐ |
| **Google Places API** | Best coverage, hours, photos, popular times | Places API | ~$0.017/request | ⭐⭐⭐⭐⭐ |
| **Yelp Fusion API** | Reviews, photos, pricing tier | [fusion.yelp.com](https://fusion.yelp.com) | Free 500 req/day | ⭐⭐⭐⭐ |
| **NBDA Dealer Locator** | National Bicycle Dealers Association — US specialty retailers | [nbda.com](https://nbda.com) — scrape | Free | ⭐⭐⭐ |
| **QBP Dealer Locator** | Quality Bicycle Products distributor — most US IBDs use QBP | [qbp.com](https://qbp.com) | Scrape | ⭐⭐⭐⭐ |
| **Trek Retailer Locator** | Trek dealer network | Trek API (partner) or scrape | Free | ⭐⭐⭐ |
| **Specialized Retailers** | Specialized dealer network | Specialized API or scrape | Free | ⭐⭐⭐ |

**OSM Overpass query:**
```
[out:json][timeout:90];
(
  node["shop"="bicycle"]({{bbox}});
  way["shop"="bicycle"]({{bbox}});
  node["shop"="sports"]["sport"="cycling"]({{bbox}});
);
out center;
```

**Key OSM tags to capture:**
- `shop=bicycle`
- `name`
- `addr:*` — full address
- `opening_hours`
- `phone` / `contact:phone`
- `website` / `contact:website`
- `service:bicycle:repair` — yes / no
- `service:bicycle:rental` — yes / no
- `service:bicycle:sales` — yes / no
- `brand` — Trek, Specialized, Giant, etc.

**Strategy:** OSM for the initial global seed. Then match against our existing `Shop` model (the owner portal shops) to link OSM records to claimed businesses. Google Places for gap-fill and richer data (hours, photos).

**Google Places search:**
```
POST https://places.googleapis.com/v1/places:searchText
{
  "textQuery": "mountain bike shop",
  "locationBias": { "circle": { "center": { ... }, "radius": 50000 } },
  "includedType": "bicycle_store"
}
```

---

### 8. Trailheads & Parking 🆕

**What we need:** Trailhead location, parking capacity, fee, facilities (restrooms, water, kiosk), which trail systems are accessible from it.

**Why it matters:** Riders need to know where to park. Right now nothing on our map tells you where to start a ride.

#### Sources:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **OpenStreetMap** | Trailheads, parking lots, facilities | Overpass API | Free |
| **USFS Recreation GIS** | Official Forest Service trailheads with facilities | [fs.usda.gov GIS data](https://data-usfs.hub.arcgis.com) | Free |
| **BLM GeoCommunicator** | BLM-managed trailheads | [blm.gov GIS](https://www.blm.gov/services/geospatial) | Free |
| **NPS Data Store** | National Park trailheads | [irma.nps.gov](https://irma.nps.gov/DataStore/) | Free |
| **Recreation.gov** | Permit-required trailhead parking reservations | [recreation.gov API](https://www.recreation.gov/use-our-data) | Free |

**OSM Overpass query:**
```
[out:json][timeout:90];
(
  node["highway"="trailhead"]({{bbox}});
  node["amenity"="parking"]["access"!="private"]["leisure"~"trail|nature_reserve"]({{bbox}});
  node["highway"="trailhead"]["parking"]({{bbox}});
);
out center;
```

---

### 9. Bike Repair Stations 🆕

**What we need:** Location, tools available (pump, hex keys, tire levers), 24/7 availability.

These are the self-service fix-it stands increasingly common at trailheads and in towns.

#### Sources:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **OpenStreetMap** | Best source, growing fast | Overpass API | Free |
| **Bikeflation** | Community-reported repair stations | [bikeflation.com](https://bikeflation.com) — scrape | Free |

**OSM Overpass query:**
```
[out:json][timeout:30];
(
  node["amenity"="bicycle_repair_station"]({{bbox}});
);
out;
```

**Key OSM tags:**
- `amenity=bicycle_repair_station`
- `service:bicycle:pump` — yes / no
- `service:bicycle:tools` — yes / no
- `opening_hours` — `24/7` for outdoor stands
- `operator`

---

### 10. Campgrounds 🆕

**What we need:** Campgrounds near trail systems — with site type (tent/RV/dispersed), reservation status, and proximity to trails.

#### Sources:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **Recreation.gov API** | All federal campgrounds (USFS, NPS, BLM, COE) with reservation data | [recreation.gov/use-our-data](https://www.recreation.gov/use-our-data) | Free API key |
| **OpenStreetMap** | Supplements recreation.gov, global coverage | Overpass API | Free |
| **The Dyrt API** | Community-reviewed campgrounds, dispersed camping | [thedyrt.com/api](https://thedyrt.com/developer) | Freemium |
| **Hipcamp** | Private land / unique camping near trails | No public API | Manual |

**Recreation.gov API:**
```
GET https://ridb.recreation.gov/api/v1/campgrounds
  ?apikey={key}
  &latitude={lat}
  &longitude={lng}
  &radius=25
  &activity=BIKING
```

---

### 11. Shuttles 🆕

**What we need:** Shuttle services (point A → point B for bikes), operating areas, price, booking link.

**Current state:** Not in DB yet. Purely user-submitted for now.

#### Sources:

| Source | What it adds | Access | Cost |
|--------|-------------|--------|------|
| **User-submitted** | Best accuracy — operators register themselves | Internal form | Free |
| **Trailforks Shuttles** | Some shuttle listings in their DB | Trailforks API | Paid |
| **Manual research** | Known shuttle operators by region | One-time research | Free |

No great automated source for this. Owner registration (like our shop portal) is the best approach.

---

## Data Ingestion Strategy

### Tier 1 — Run now (OSM Overpass)

OSM is free, global, and gives us the best MTB-specific coverage with a single import script. Run for all `Facility` types + bike shops:

```
Skateparks    → leisure=skateboard_park
Pump Tracks   → pump_track=yes OR sport=pump_track
Bike Parks    → sport=cycling + leisure=sports_centre OR name~"Bike Park"
Bike Shops    → shop=bicycle
Repair Stands → amenity=bicycle_repair_station
Trailheads    → highway=trailhead
```

All of these upsert into the existing `Facility` model (extend `FacilityType` enum) or a new `Trailhead` model.

### Tier 2 — Enrichment (once Tier 1 is live)

| Dataset | Purpose | Effort |
|---------|---------|--------|
| Google Places | Fill gaps in bike shop hours, photos, ratings | Medium — API key, per-request cost |
| Recreation.gov | Federal campgrounds near trail systems | Low — free REST API |
| PMBIA/BICP directories | Seed coach profiles | Low — one-time scrape |
| USA Cycling events | Seed race calendar | Low — scrape or RSS |

### Tier 3 — Partnerships (longer term)

| Partner | Value |
|---------|-------|
| **Trailforks** | Best MTB-specific trail + event data, conditions, photos |
| **Strava Metro** | Aggregate heatmaps showing where people actually ride |
| **IMBA** | Official trail designation data, chapter events |
| **Komoot** | Route planning integration |
| **Garmin / Wahoo** | Sync planned routes to device |

---

## OSM Data Quality Notes

| Layer | OSM Coverage | Confidence |
|-------|-------------|------------|
| Bike Shops | ⭐⭐⭐⭐ Excellent — well-maintained globally | High |
| Skateparks | ⭐⭐⭐⭐ Very good in US/EU | High |
| Pump Tracks | ⭐⭐⭐ Good and improving | Medium |
| Bike Parks | ⭐⭐⭐ Inconsistent tagging | Medium |
| Trailheads | ⭐⭐⭐ Good in USFS areas | Medium |
| Repair Stations | ⭐⭐⭐ Patchy — community-dependent | Low-Medium |
| Campgrounds | ⭐⭐ Federal sites good, private spotty | Low-Medium |

OSM data is **CC BY-SA licensed** — free to use with attribution. Attribution: "© OpenStreetMap contributors".

---

## Supabase / DB Notes

**Security:** All facility data is stored in Supabase (PostgreSQL). Prisma uses parameterized queries throughout — no raw string interpolation in queries. The DB connection goes through Supabase's session pooler over SSL (IPv4-compatible). No client-side DB access — all reads go through Next.js API routes.

**Existing `Facility` model** can absorb most new layer types by extending the `FacilityType` enum:

```prisma
enum FacilityType {
  SKATEPARK
  PUMPTRACK
  BIKEPARK
  BIKE_SHOP      // new
  REPAIR_STATION // new
  RENTAL         // new
  WATER          // new
}
```

**Trailheads** probably warrant their own model (they relate to `TrailSystem` records via foreign key).

**Campgrounds** need their own model (reservation data, site types, capacity are structurally different from facilities).

---

## Next Steps

1. **Extend `FacilityType` enum** → add `BIKE_SHOP`, `REPAIR_STATION`
2. **Run OSM import script** → seed bike shops, repair stations globally
3. **Match OSM bike shops to existing `Shop` model** → link claimed businesses to map pins
4. **Add Trailhead model + OSM import**
5. **Recreation.gov campground import** (free API, high value for riders)
6. **Evaluate Trailforks partnership** for trail conditions + richer data
