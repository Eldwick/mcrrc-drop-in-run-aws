# MCRRC Run Finder — Product Requirements Document

## Overview

**Product Name:** MCRRC Run Finder
**Purpose:** Help Montgomery County Road Runners Club members discover weekly drop-in group runs that match their location and pace.
**Target Users:** MCRRC members and prospective runners in the Montgomery County, MD area.

## Problem Statement

MCRRC has a vibrant community of weekly group runs organized by volunteers across the county, but there's no centralized, easy way for members — especially newer ones — to find a run that's close to them and has people running at their pace. Information is scattered across email lists, the website, and word of mouth. This tool makes it dead simple: tell us where you are and how fast you run, and we'll show you the best options on a map.

## User Types

### 1. Run Seekers (anonymous, no account required)

Runners looking for a group run to join. They provide:

- **Their location** (address, zip code, or map pin)
- **Their pace range** (one of four pace buckets)

They receive a map and ranked list of runs sorted by relevance (combination of pace match quality and proximity).

### 2. Run Organizers (no account — edit via secret link)

Volunteers who lead weekly group runs. They can create and manage a run listing. No account or login is required — when a run is created, the organizer receives a unique secret edit link (URL with a token). Anyone with the link can edit or deactivate the listing.

## Core Data Model

### Run Listing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of the run (e.g., "Bethesda Tuesday Track") |
| `day_of_week` | enum | Yes | Day the run meets (Monday–Sunday) |
| `start_time` | time | Yes | Start time (e.g., 6:30 AM) |
| `location_name` | string | Yes | Human-readable meeting spot (e.g., "Bethesda Elementary parking lot") |
| `location_coords` | lat/lng | Yes | Precise coordinates for map pin and distance calc |
| `typical_distances` | string | Yes | Typical distance(s) offered (e.g., "4 or 6 miles") |
| `terrain` | enum | Yes | Road / Trail / Mixed |
| `pace_groups` | object | Yes | Pace availability matrix (see below) |
| `contact_name` | string | No | Organizer's name |
| `contact_email` | string | No | Organizer's email |
| `contact_phone` | string | No | Organizer's phone |
| `notes` | text | No | Free-text notes (e.g., "Coffee at Starbucks after. Bring headlamp Nov–Feb.") |
| `is_active` | boolean | Yes | Whether the run is currently active (default: true) |
| `edit_token` | string | System | Secret token for edit access (generated on creation) |
| `created_at` | timestamp | System | When the listing was created |
| `updated_at` | timestamp | System | When the listing was last modified |

### Pace Availability Matrix

For each run, organizers indicate how reliably each pace range is represented. This is the key matching data.

**Pace Ranges:**

| Key | Label |
|-----|-------|
| `sub_8` | Faster than 8:00/mile |
| `8_to_9` | 8:00–9:00/mile |
| `9_to_10` | 9:00–10:00/mile |
| `10_plus` | 10:00+/mile |

**Availability Levels (with match scores for ranking):**

| Level | Label | Score |
|-------|-------|-------|
| `consistently` | Consistently | 1.0 |
| `frequently` | Frequently | 0.7 |
| `sometimes` | Sometimes | 0.4 |
| `rarely` | Rarely | 0.1 |

Example for a run:

```
pace_groups: {
  sub_8: "consistently",
  8_to_9: "frequently",
  9_to_10: "sometimes",
  10_plus: "rarely"
}
```

## Key Flows

### Flow 1: Run Seeker — Find a Run

1. **Landing page** shows a map centered on Montgomery County with all active runs pinned.
2. User enters their location (address/zip or clicks on the map) and selects their pace range.
3. The map and list update: runs are ranked by a **relevance score** combining:
   - **Pace match score** — how reliably their pace range is represented at the run (using the availability scores above)
   - **Proximity score** — closer runs rank higher, with distance shown
4. Each run card/pin shows: name, day/time, distance from user, terrain, pace match quality (e.g., "Your pace: Consistently"), and a snippet of notes.
5. Clicking a run opens a detail view with full info, map directions link, and organizer contact info.

**Ranking Algorithm (v1):**

```
relevance = (pace_score * 0.6) + (proximity_score * 0.4)
```

Where:
- `pace_score` = availability level score for the user's selected pace range (0.1–1.0)
- `proximity_score` = normalized inverse distance (1.0 at 0 miles, decaying toward 0; e.g., `1 / (1 + distance_miles / 5)`)

Weights (0.6 / 0.4) are a starting point and can be tuned based on feedback.

### Flow 2: Run Organizer — Create a Run

1. Organizer clicks "Add a Run" from the landing page.
2. Fills out the run form:
   - Name, day of week, start time
   - Location: type an address or drop a pin on the map
   - Typical distance(s), terrain
   - Pace availability matrix: for each of the 4 pace ranges, select Consistently / Frequently / Sometimes / Rarely
   - Contact info (optional)
   - Notes (optional)
3. On submit, the system generates a unique **edit link** (e.g., `https://app.com/runs/abc123/edit?token=xyz789`).
4. **Critical UX moment:** The edit link is displayed prominently with clear instructions: "Bookmark this link or save it somewhere safe — it's the only way to edit or remove your run." Option to email the link to themselves.
5. The run immediately appears on the map.

### Flow 3: Run Organizer — Edit or Deactivate a Run

1. Organizer visits their saved edit link.
2. The form is pre-populated with current data. They can:
   - Update any fields
   - Mark the run as inactive (hides from map/search but doesn't delete)
   - Reactivate a previously deactivated run
3. Changes take effect immediately.

## Pages / Views

| Page | Description |
|------|-------------|
| **Home / Map** | Map with all active runs + search/filter controls. This is the primary view. |
| **Run Detail** | Full info for a single run, accessible by clicking a pin or card. |
| **Add a Run** | Form to create a new run listing. |
| **Edit a Run** | Form to edit an existing run (accessed via secret link). |

## Non-Functional Requirements

### Tech Stack

- **Framework:** Next.js (App Router) — serverless functions for API routes, React for frontend
- **Database:** Neon (serverless Postgres, free tier) — hosted Postgres with connection pooling, no server to manage
- **ORM:** Drizzle or Prisma (whichever Claude Code handles best) for type-safe DB access
- **Hosting:** Vercel — serverless deployment, automatic preview deploys, edge-optimized
- **Map:** Leaflet + OpenStreetMap tiles (free, no API key)
- **Geocoding:** Nominatim / OpenStreetMap geocoder (free, no API key) for address → coordinates
- **Distance:** Haversine formula for straight-line distance in miles (no routing API needed)
- **Auth:** None — just the edit token mechanism (crypto-random token stored in DB)
- **Zero paid API dependencies** — the entire stack should run without paid API keys or services
- **Mobile-first responsive design** — Tailwind CSS for styling

### Data Seeding

The app should support a JSON seed file so that known MCRRC group runs can be pre-loaded at launch. Organizers can later "claim" their run by contacting the admin for the edit link, or new runs can be added organically.

### Performance & Scale

- Expected scale: 20–50 run listings, ~hundreds of monthly users
- This is a lightweight community tool, not a high-traffic app
- Optimize for simplicity and maintainability over scalability

## Future Considerations (Not in v1)

These are ideas that may be valuable later but are explicitly **out of scope** for the initial build:

- **Day-of-week filtering** — let seekers filter by "I'm free on Tuesdays and Thursdays"
- **Multi-pace selection** — "I'm comfortable at 8–9 or 9–10"
- **Seasonal schedules** — runs that only operate certain months
- **User accounts** — favorites, "my runs," notifications
- **Run check-ins or attendance** — track how many people actually show up
- **Club-agnostic / multi-club support** — other running clubs could use the platform
- **Admin dashboard** — for MCRRC board to manage all listings
- **Integration with MCRRC website** — embed the map or link from mcrrc.org

## Resolved Decisions

1. **Edit link recovery:** Contact the site admin. Sufficient for v1 given the small community.
2. **Moderation:** None for now. Low risk given the niche MCRRC audience.
3. **Mobile-first design.** Primary design target is mobile (runners searching on their phones). Must still look fine on desktop via responsive layout.
4. **Distance units:** Miles only. No toggle needed.
5. **Add a Run page:** Publicly accessible — anyone can create a listing, no gatekeeping. The link doesn't need to be prominently featured on the home page, but it's not hidden or secret either (e.g., a link in the footer or a secondary nav item).
6. **Edit a Run page:** Accessible only via the secret edit link with token. No public browse/edit interface.
7. **Distance calculation:** Haversine formula (straight-line distance). No driving directions API needed — keeps it free and simple. Displayed as "X miles away."
8. **Mapping & Geocoding:** All free/open-source. Leaflet + OpenStreetMap tiles for the map. Nominatim (OpenStreetMap's geocoder) for address → coordinates lookup. No paid API keys required.

## Success Metrics

- Number of runs listed (target: 15+ within first month)
- Number of unique visitors using the seeker flow
- Organizer feedback on ease of listing creation
- Qualitative: do new members say they found a run through the tool?
