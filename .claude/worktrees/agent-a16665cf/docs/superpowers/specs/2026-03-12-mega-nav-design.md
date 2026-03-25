# Mega-Nav Design Spec

**Date:** 2026-03-12
**Project:** Ride MTB (`/Users/kylewarner/Documents/ride-mtb`)

---

## Goal

Add hover-triggered mega-menu panels to the five richest top-level nav items (Learn, Forum, Trails, Bikes, Marketplace), surfacing each module's depth directly from the nav bar. Events and Reviews remain plain links. Existing sub-navs (ForumSubNav, LearnSubNav) are unchanged.

---

## Architecture

### New files

**`src/ui/components/MegaNav/megaNavConfig.ts`**
Static config object keyed by module slug. Each entry defines:
- `featured`: `{ icon: LucideIcon, title: string, description: string, href: string, ctaLabel: string, bgClass: string }` — the left-hand featured card. `bgClass` must be a complete, static Tailwind utility string (e.g. `"bg-emerald-500/10"`) — never dynamically assembled — so Tailwind v4 content scanning does not purge it.
- `groups`: array of `{ label: string, links: [{ icon: LucideIcon, label: string, href: string }] }` — right-hand link columns. Modules with only one group render two columns (featured + one group); modules with two groups render three columns.

Import: `import type { LucideIcon } from 'lucide-react'`

**`src/ui/components/MegaNav/MegaNavPanel.tsx`**
`'use client'` component. Accepts a module config entry + optional `isLoggedIn: boolean` prop and renders the panel UI:
- Left column: featured card (colored background via `bgClass`, large icon, title, description, CTA link)
- Right columns: link groups with icon + label per link

**Auth-gated links** (Bookmarks, My Garage): always rendered. If the user is not logged in and clicks them, the target page handles the redirect to sign-in. The mega-nav does not conditionally hide them — this keeps the component simple and hints at available features to encourage sign-up.

### Modified file

**`src/ui/components/TopNav.tsx`**

Currently a Server Component. Must be split into:
- `TopNav.tsx` — thin server wrapper, fetches nothing new (session already passed in as prop from layout), renders `<TopNavClient session={session} />`
- `TopNavClient.tsx` — `'use client'` component containing all existing nav markup plus new hover state logic

`TopNavClient` additions:
- `activeNav: string | null` state
- A single `timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` for the leave-close debounce
- `<header>` gets `relative` class added (required for absolute-positioned panel to anchor correctly below the bar)
- Nav items with mega-menu config get a `ChevronDown` icon (add to lucide imports), rotates 180° when that item is active
- Active nav item gets pill styling: `rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-primary)]`

---

## Panel Layout

```
┌────────────────────────────────────────────────────────────────┐
│  TopNav bar (sticky, z-50, relative)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ absolute panel (z-40, full-width, below bar)             │  │
│  │ ┌──────────────┬───────────────┬──────────────────────┐  │  │
│  │ │ Featured Card│  Group 1      │  Group 2 (if present)│  │  │
│  │ │ bgClass bg   │  Label        │  Label               │  │  │
│  │ │ large icon   │  • Icon Link  │  • Icon Link         │  │  │
│  │ │ Title        │  • Icon Link  │  • Icon Link         │  │  │
│  │ │ Description  │  • Icon Link  │                      │  │  │
│  │ │ → CTA        │               │                      │  │  │
│  │ └──────────────┴───────────────┴──────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Panel is `position: absolute`, `left-0 right-0`, anchored to the `relative` header. Content is constrained to `--max-content-width`. Styling: `bg-[var(--color-bg)] border-b border-[var(--color-border)] shadow-lg`. Fades in (`opacity-0 → opacity-100`) over 150ms via Tailwind transition.

**Z-index layering:**
- TopNav header: `z-50`
- MegaNav panel: `z-40` (renders inside the `relative` header, so it layers above page content correctly)
- ForumSubNav / LearnSubNav: `z-40 sticky top-14` — panel will overlap these when open, which is correct

---

## Hover Behavior

- **Enter:** `onMouseEnter` on a nav item with config → clear any pending close timer → `setActiveNav(key)` (no enter debounce needed; the 150ms fade handles accidental flickers)
- **Leave nav item:** `onMouseLeave` → start 200ms timer to `setActiveNav(null)`; cancel timer if mouse enters the panel before it fires
- **Leave panel:** `onMouseLeave` → same 200ms timer pattern
- **Escape key:** `useEffect` adds a `keydown` listener when `activeNav !== null`, calls `setActiveNav(null)` on Escape
- **Mobile:** panels are `hidden md:block` (matching the existing nav's `hidden md:flex` breakpoint)

---

## Module Content

### Learn
- **Featured:** bgClass `"bg-emerald-500/10"`, icon `GraduationCap`, title "Level Up Your Skills", description "Start with beginner fundamentals or jump into advanced technique.", href `/learn/courses`, ctaLabel "Browse Courses"
- **Group 1 — Explore:** Courses `/learn/courses` (BookOpen), Quizzes `/learn/quizzes` (ClipboardList), Leaderboard `/learn/leaderboard` (Trophy)
- **Group 2 — Your Progress:** Dashboard `/dashboard` (LayoutDashboard), My Certificates `/learn/certificates/[certId]` — note: no index listing page exists; link to `/dashboard` instead as that surfaces progress

### Forum
- **Featured:** bgClass `"bg-blue-500/10"`, icon `MessageSquare`, title "Join the Conversation", description "Ask questions, share rides, connect with the MTB community.", href `/forum`, ctaLabel "Browse Forum"
- **Group 1 — Browse:** All Posts `/forum` (LayoutList), Communities `/forum/communities` (Users), Search `/forum/search` (Search)
- **Group 2 — You:** Bookmarks `/forum/bookmarks` (Bookmark), New Post `/forum/new` (PenLine)

### Trails
- **Featured:** bgClass `"bg-orange-500/10"`, icon `Map`, title "Find Your Next Trail", description "Explore trail systems, view maps, and discover new terrain near you.", href `/trails/explore`, ctaLabel "Explore Trails"
- **Group 1 — Discover:** Explore Systems `/trails/explore` (Compass), Trail Map `/trails/map` (MapPin)
- **Group 2 — (none)** — Trails has only one group; panel renders two columns (featured + one group)

### Bikes
- **Featured:** bgClass `"bg-purple-500/10"`, icon `Bike`, title "Find Your Perfect Bike", description "Answer a few questions and get matched to your ideal mountain bike.", href `/bikes/selector`, ctaLabel "Take the Quiz"
- **Group 1 — Tools:** Bike Selector `/bikes/selector` (Sliders), My Garage `/bikes/garage` (Wrench)
- **Group 2 — Research:** Reviews `/reviews` (Star)

### Marketplace
- **Featured:** bgClass `"bg-yellow-500/10"`, icon `ShoppingBag`, title "Buy & Sell Gear", description "Find used bikes, parts, and gear from the Ride MTB community.", href `/marketplace`, ctaLabel "Browse Listings"
- **Group 1 — Shop:** Browse Listings `/marketplace` (Tag), Create Listing `/marketplace/create` (PlusCircle)
- **Group 2 — (none)** — Marketplace has only one group; panel renders two columns

---

## What Does NOT Change

- `ForumSubNav.tsx` and `LearnSubNav.tsx` — unchanged
- Events and Reviews nav items — plain links, no mega-menu
- Mobile nav — unchanged
- Any module page content
- `src/app/layout.tsx` — no changes needed; session continues to be passed to TopNav as a prop

---

## File Structure

```
src/ui/components/
  TopNav.tsx           (modified — thin server wrapper)
  TopNavClient.tsx     (new — 'use client', all existing nav logic + hover state)
  MegaNav/
    megaNavConfig.ts   (new)
    MegaNavPanel.tsx   (new — 'use client')
```
