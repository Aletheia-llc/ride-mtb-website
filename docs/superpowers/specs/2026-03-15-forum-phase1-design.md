# Forum Phase 1 — Core UX Design

**Date:** 2026-03-15
**Scope:** Feed sorting, nested replies, notifications, link preview, and data migration from standalone forum

---

## Goal

Recover the four highest-impact forum features lost when porting the standalone `ride-mtb-forum` into the monolith, and migrate all existing standalone forum data into the monolith's Supabase PostgreSQL database.

## Architecture

All forum data lives in the monolith's Supabase PostgreSQL via Prisma. New features extend the existing `Forum*` model family with additive, non-breaking schema changes. A one-time migration script reads from the standalone forum's Docker PostgreSQL and writes into Supabase.

**Tech Stack:** Next.js 15 App Router, Prisma v7 with PrismaPg adapter, Supabase PostgreSQL, Tailwind CSS v4, server actions, server components.

---

## Section 1: Data Migration

### Source
Standalone forum database: Docker PostgreSQL at `ride-mtb-forum`. The script reads the connection string from the env var `STANDALONE_FORUM_DATABASE_URL` (set in `scripts/.env.migrate` or passed inline — NOT from monolith's `.env.local`).

### Destination
Monolith Supabase: env var `DATABASE_DIRECT_URL` from the monolith's `.env.local` (bypasses pooler for bulk writes).

### Model Mapping

| Standalone model | Monolith model | Notes |
|---|---|---|
| `Category` | `ForumCategory` | Direct field mapping |
| `Post` | `ForumThread` | Standalone calls top-level posts "Post" |
| `Comment` | `ForumPost` | Standalone calls replies "Comment"; `Comment.parentId` → `ForumPost.parentId` (backfilled in step 5b) |
| `Vote` | `ForumVote` | Map `postId` via comment-to-post ID map; map `Post` votes to `isFirst=true` ForumPost |
| `Tag` | `ForumTag` | Direct |
| `PostTag` | `ForumThreadTag` | `PostTag.postId` → `ForumThreadTag.threadId` via ID map |
| `Bookmark` | `ForumBookmark` | `Bookmark.postId` (standalone Post = thread) → `ForumBookmark.threadId` via ID map |
| `Badge` | `ForumBadge` | Standalone uses `id`; monolith uses `slug`; build ID→slug map before UserBadge migration |
| `UserBadge` | `ForumUserBadge` | Lookup `badgeSlug` using Badge ID→slug map built in step 9 |
| `Report` | `ForumReport` | |

### User Matching Strategy

1. For each standalone `User`, look up by email in the monolith's `User` table.
2. **Match found** → link all migrated content to the existing user ID.
3. **No match** → create a new monolith `User` with:
   - Real email from standalone
   - `name` from standalone username
   - `emailVerified: null` (account dormant)
   - Random bcrypt-hashed password (unusable until "Forgot Password" flow)
4. **No email on standalone user** → assign `{username}@legacy.ridemtb.com`

Build a `standaloneUserId → monolithUserId` map before any other migration step.

### Migration Order (respects FK constraints)

1. Users → build `userIdMap: Map<string, string>`
2. ForumCategory → build `categoryIdMap`
3. ForumTag → build `tagIdMap`
4. ForumThread (standalone `Post`) → build `threadIdMap: Map<standalonePostId, monolithThreadId>`
5a. ForumPost flat pass — insert all standalone `Comment` rows with `parentId = null, depth = 0`; build `commentIdMap: Map<standaloneCommentId, monolithPostId>`
5b. ForumPost parentId backfill — iterate comments where `standalone.parentId != null`; update `ForumPost.parentId = commentIdMap.get(standalone.parentId)`, set `depth = parent.depth + 1` (capped at 3)
6. ForumVote — for thread-level votes use `threadIdMap` to find the `isFirst=true` post; for comment votes use `commentIdMap`
7. ForumThreadTag — map `PostTag.postId` via `threadIdMap`
8. ForumBookmark — map `Bookmark.postId` via `threadIdMap`
9. ForumBadge → build `badgeIdToSlugMap: Map<standaloneId, slug>`
10. ForumUserBadge — use `badgeIdToSlugMap` to resolve `badgeSlug`
11. ForumReport

### Script Behaviour
- File: `scripts/migrate-forum.ts`
- `--dry-run` flag: reads source, logs counts and sample records, writes nothing
- Idempotent: uses upsert (`ON CONFLICT DO UPDATE`) throughout
- Never aborts on a single row failure — logs error and continues; prints summary counts at end
- After completion: recalculates `hotScore` and `voteScore` for all migrated threads via `calculateThreadHotScore`

---

## Section 2: Schema Changes

**`hotScore Float @default(0)` on `ForumThread` already exists — no change needed.**

All other changes are additive. No existing columns removed. Existing rows unaffected by defaults.

### `ForumPost` — nested reply support
```prisma
parentId  String?
depth     Int         @default(0)
parent    ForumPost?  @relation("PostReplies", fields: [parentId], references: [id])
replies   ForumPost[] @relation("PostReplies")

@@index([parentId])
```

### `ForumThread` — add denormalized voteScore for `top` sort
```prisma
voteScore Int @default(0)
```
Updated alongside `hotScore` in the `votePost` server action.

### New: `ForumNotification`
```prisma
model ForumNotification {
  id        String                 @id @default(cuid())
  userId    String
  actorId   String?                // null for system-generated events (VOTE_MILESTONE)
  type      ForumNotificationType
  threadId  String?
  postId    String?
  meta      Json?                  // stores { threshold: 10 } for VOTE_MILESTONE de-dup
  read      Boolean                @default(false)
  createdAt DateTime               @default(now())

  user      User         @relation("ForumNotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  actor     User?        @relation("ForumNotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  thread    ForumThread? @relation(fields: [threadId], references: [id], onDelete: Cascade)
  post      ForumPost?   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([userId, createdAt])
  @@index([actorId, type, postId])
  @@map("forum_notifications")
}

enum ForumNotificationType {
  REPLY_TO_THREAD
  REPLY_TO_POST
  MENTION
  VOTE_MILESTONE
}
```

On `User` model, add the two back-relations:
```prisma
forumNotificationsReceived ForumNotification[] @relation("ForumNotificationRecipient")
forumNotificationsGiven    ForumNotification[] @relation("ForumNotificationActor")
```

On `ForumThread` model, add:
```prisma
notifications ForumNotification[]
```

On `ForumPost` model, add:
```prisma
notifications ForumNotification[]
```

### New: `ForumLinkPreview`
```prisma
model ForumLinkPreview {
  url         String   @id
  title       String?
  description String?
  imageUrl    String?
  fetchedAt   DateTime @default(now())

  @@map("forum_link_previews")
}
```
`fetchedAt` is explicitly written (`fetchedAt: new Date()`) on every upsert — it is not `@updatedAt` since Prisma's `@updatedAt` only fires on `update`, not `upsert`.

---

## Section 3: Feed Sorting

### URL Parameters
- `?sort=hot|new|top` (default: `hot`)
- `?t=day|week|month|all` (applies only when `sort=top`, default: `week`)
- Both the global feed (`/forum`) and category pages (`/forum/[categorySlug]`) support all sort/time params

### Sort Algorithms

**Hot** (default)
- Uses existing `calculateThreadHotScore` (Reddit log10 formula — do not replace):
  ```ts
  const score = voteScore + replyCount * 2
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0
  const timestamp = createdAt.getTime() / 1000
  return order + (sign * timestamp) / 45000
  ```
- `orderBy: [{ isPinned: 'desc' }, { hotScore: 'desc' }]`

**New**
- `orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]`

**Top**
- `orderBy: [{ isPinned: 'desc' }, { voteScore: 'desc' }]` — uses denormalized `voteScore` column
- `where: { createdAt: { gte: cutoff } }` where cutoff = `day` 24h / `week` 7d / `month` 30d / `all` no filter
- `getAllThreads` and `getThreadsByCategory` both accept `sort` and `t` params

### Signature Updates
```ts
getAllThreads(
  sort: 'hot' | 'new' | 'top' = 'hot',
  page: number = 1,
  categorySlug?: string,
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'week',
)

getThreadsByCategory(
  categorySlug: string,
  page: number = 1,
  sort: 'hot' | 'new' | 'top' = 'hot',
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'week',
)
```

---

## Section 4: Nested Replies

### Rules
- Max depth: 3 (`depth` values: 0, 1, 2, 3)
- `depth = 0`: direct reply to thread
- `depth = n`: reply to a post at depth `n-1`
- Reply button is hidden in UI for posts at `depth >= 3`
- Server action rejects if resolved parent depth >= 3

### `createPost` Input Shape
```ts
interface CreatePostInput {
  threadId: string
  content: string
  parentId?: string   // undefined = top-level reply
}
```

### Depth Validation (inside `db.$transaction`)
```ts
await db.$transaction(async (tx) => {
  let depth = 0
  if (input.parentId) {
    const parent = await tx.forumPost.findUniqueOrThrow({ where: { id: input.parentId }, select: { depth: true } })
    if (parent.depth >= 3) throw new Error('Max reply depth reached')
    depth = parent.depth + 1
  }
  await tx.forumPost.create({ data: { ...input, depth, parentId: input.parentId ?? null } })
})
```

### Query: `getThreadBySlug` Nested Include
```ts
posts: {
  where: { isFirst: false, parentId: null, deletedAt: null },   // top-level replies only
  orderBy: { createdAt: 'asc' },
  include: {
    author: { select: { ... } },
    replies: {                                  // depth 1
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { ... } },
        replies: {                              // depth 2
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { ... } },
            replies: {                          // depth 3 (leaf, no further include)
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              include: { author: { select: { ... } } },
            },
          },
        },
      },
    },
  },
}
```

### UI Behaviour
- Depth 0–1: always visible
- Depth 2–3: collapsed behind "N replies" toggle, expanded on click
- Each nesting level indented 16px with a left border in the category accent color
- Existing flat posts: `parentId = null`, `depth = 0` — no migration needed

---

## Section 5: Notifications

### Trigger Events

| Event | Recipient | De-dup key | Triggered in |
|---|---|---|---|
| Reply to your thread | Thread author | `actorId + REPLY_TO_THREAD + threadId` | `createPost` |
| Reply to your post | Post author | `actorId + REPLY_TO_POST + postId` | `createPost` |
| `@username` mention | Mentioned user | `actorId + MENTION + postId` | `createPost`, `createThread` |
| Post hits 10/50/100 upvotes | Post author | `SYSTEM + VOTE_MILESTONE + postId + threshold` | `votePost` |

**Duplicate suppression:** before creating a notification, check if a row exists with the same de-dup key AND `createdAt > now() - 1h`. If so, skip. For `VOTE_MILESTONE`, `actorId = null` (system event). Store `meta: { threshold: 10 }` in the `meta Json?` field. De-dup check: query for any existing `ForumNotification` where `type = VOTE_MILESTONE AND postId = x AND meta->>'threshold' = '10'` (any age — milestones never re-fire).

**Rules:**
- No notification for self-actions
- `VOTE_MILESTONE` uses the post's net vote score (`sum(value)` from `ForumVote`)
- Milestones fire once per threshold. Once fired at 10, reaching 10 again after dipping below will NOT re-fire (suppress by checking if a `VOTE_MILESTONE` notification for that `postId + threshold` already exists, regardless of age)
- Downvotes that un-trigger a threshold leave the existing notification in place — it is not deleted
- All notification creation is fire-and-forget: wrapped in `try/catch`, never blocks the main server action. Run before `redirect()` is called

### API
- `GET /api/forum/notifications` — returns `{ unreadCount: number }`
- `POST /api/forum/notifications/read` — marks all as read for the current session user

### UI
- Bell icon in forum nav with red badge showing unread count (hidden when 0)
- `/forum/notifications` page — chronological list of notifications with actor avatar, action summary, thread title, relative time
- "Mark all read" button clears the badge
- Each row links to the specific post/thread anchor

---

## Section 6: Link Preview

### Behaviour
- On `createThread` or `createPost`, extract the first `https?://` URL from content via regex
- Skip if URL is a `ridemtb.com` internal link
- Validate URL: must start with `http(s)://` and not resolve to a private IP range (127.x, 10.x, 192.168.x, 172.16-31.x)
- Fetch OG metadata server-side with a 2-second timeout
- Upsert into `ForumLinkPreview` (write `fetchedAt: new Date()` explicitly)
- TTL: if existing row has `fetchedAt < now() - 7days`, re-fetch and update
- The URL is stored on the post/thread as a `linkPreviewUrl String?` field (added to both `ForumThread` and `ForumPost` schemas) so the renderer knows which URL to look up without re-parsing content
- Rendering: when `linkPreviewUrl` is set, query `ForumLinkPreview` by URL and show a card below the post body
- Graceful failure: if fetch fails, times out, or returns no OG data → `linkPreviewUrl` stays null, no card shown. Post/thread always saves.

### Schema additions for link preview URL storage
```prisma
// ForumThread
linkPreviewUrl String?

// ForumPost
linkPreviewUrl String?
```

---

## File Structure

### New files
```
scripts/migrate-forum.ts                            — one-time migration script
scripts/.env.migrate.example                        — template for STANDALONE_FORUM_DATABASE_URL
src/modules/forum/lib/hot-score.ts                  — re-export calculateThreadHotScore (extracted from queries.ts)
src/modules/forum/lib/link-preview.ts               — OG fetch + DB cache logic
src/modules/forum/lib/notifications.ts              — createForumNotification helper
src/app/forum/notifications/page.tsx                — notifications list page
src/app/api/forum/notifications/route.ts            — GET unread count
src/app/api/forum/notifications/read/route.ts       — POST mark all read
src/modules/forum/components/NotificationBell.tsx   — bell icon + badge (client)
src/modules/forum/components/NotificationList.tsx   — notifications page list
src/modules/forum/components/LinkPreviewCard.tsx    — OG preview card
src/modules/forum/components/NestedReplies.tsx      — threaded reply tree renderer
```

### Modified files
```
prisma/schema.prisma                                — ForumPost (parentId/depth/linkPreviewUrl), ForumThread (voteScore/linkPreviewUrl), new ForumNotification + ForumLinkPreview models, User back-relations
src/modules/forum/lib/queries.ts                    — getAllThreads/getThreadsByCategory accept sort+timePeriod; getThreadBySlug nested include; votePost updates voteScore+hotScore
src/modules/forum/actions/createPost.ts             — add parentId to input; depth validation in transaction; fire notifications + link preview before redirect
src/modules/forum/actions/createThread.ts           — fire notifications + link preview before redirect
src/modules/forum/actions/votePost.ts               — update voteScore alongside hotScore; fire VOTE_MILESTONE notification
src/modules/forum/components/ForumSortTabs.tsx      — wire to real query params; show time filter when sort=top
src/modules/forum/components/ThreadView.tsx         — render NestedReplies tree; pass parentId to ReplyForm
src/modules/forum/components/ForumFeed.tsx          — pass sort+timePeriod params to queries
src/modules/forum/components/ReplyForm.tsx          — accept optional parentId prop
```

---

## Error Handling

- Migration script: logs each entity type's success/skip/error counts; single row failures are caught and logged, never abort the run; prints final summary
- Link preview: 2s timeout with `AbortController`; any thrown error is caught; post/thread saves regardless
- Notification creation: wrapped in `try/catch` inside a `void` call; never throws to caller
- Nested reply depth check: inside `db.$transaction`; throws `Error('Max reply depth reached')` which the server action catches and returns as a user-facing error
- Hot/vote score update on vote: existing fire-and-forget pattern preserved

---

## Testing

- Migration: `--dry-run` mode logs what would be written without touching Supabase; also verify idempotency by running twice and confirming row counts unchanged
- Hot score: pure function unit tests — `calculateThreadHotScore` already exists; add tests for age decay, negative votes, zero-score threads
- Nested replies: integration test — create thread, create reply, create reply-to-reply, assert depths; attempt depth-4 reply, assert rejection
- Notifications: integration test — create post on another user's thread, assert `ForumNotification` row created; self-reply, assert no notification; same actor within 1h, assert no duplicate
- Link preview: mock `fetch` in tests; assert card renders with OG data; assert no card when fetch throws; assert 7-day re-fetch triggers update
- Sort: integration test — create threads with known vote scores, assert `top` sort order correct; assert `hot` uses `hotScore` column; assert `new` uses `createdAt`
