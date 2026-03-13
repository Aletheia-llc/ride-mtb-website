# Forum Enhancements Design

**Date:** 2026-03-12

## Goal

Add four user-facing features to the Forum module to bring it to feedback-gathering quality: post editing/deletion, email notifications, a badge system, and a karma-based leaderboard.

## Current State

The Forum already has: threaded discussions, voting, bookmarks, gated communities, mod queue, search, tags, hot score, and in-app notifications. The XP system fires correctly. The `User` model has a `karma` field that is already incremented when posts receive upvotes (via `voteOnPost` in `src/modules/forum/lib/queries.ts`). The `Notification` model supports in-app delivery only.

## Architecture

All four features are additive. Schema gets two new models (`ForumBadge`, `ForumUserBadge`) and new fields on `ForumPost` (`editedAt`, `deletedAt`) and `ForumThread` (`deletedAt`). No existing tables are restructured. Email uses Resend (new dependency). Badge grants are fire-and-forget side effects inside existing server actions.

**New dependency to install:**
```bash
npm install resend
```
Requires `RESEND_API_KEY` env var.

---

## Feature 1: Post Edit/Delete

### Schema changes

Add to `ForumPost`:
```prisma
editedAt  DateTime?
deletedAt DateTime?
```

Add to `ForumThread`:
```prisma
deletedAt DateTime?
```

Soft delete: deleted posts remain in the DB with `deletedAt` set. The thread view renders them as "This post has been deleted." so thread structure stays intact.

### Authorization

The `UserRole` enum has `user`, `instructor`, and `admin` — there is no `mod` role. Authorization checks use `admin` only (alongside post authorship). Moderator-level permissions in the forum map to `admin` role for now.

### API routes

**`PATCH /api/forum/posts/[id]`**

1. Auth — 401 if not signed in
2. Fetch post, 404 if not found or `deletedAt != null`
3. Authorization: user must be the post author OR have role `admin`
4. Edit window: if `now - post.createdAt > 15 minutes` AND user is not `admin`: return 403 with `{ error: 'edit_window_expired' }`
5. Validate `content` (non-empty, max 10,000 chars)
6. Update `content` and set `editedAt = now()`
7. Return updated post

**`DELETE /api/forum/posts/[id]`**

1. Auth — 401
2. Fetch post, 404 if not found
3. Authorization: author OR `admin`
4. Set `deletedAt = now()` on the post
5. If this is the first post in the thread (`isFirst = true`): also set `deletedAt = now()` on the `ForumThread`
6. Return 204

### UI changes

**`ThreadView.tsx`**: For each post, if current user is the author (and within 15 min) or is admin, show Edit/Delete actions beneath the post. The 15-min window check in the UI is a convenience only — the API is authoritative. Edit triggers inline form; delete shows a confirmation before calling the API. Deleted posts render a muted placeholder: "This post has been deleted." Edited posts show "(edited)" in small text next to the timestamp.

**`EditPostForm.tsx`** (new client component): Inline textarea pre-filled with current content, Save and Cancel buttons. Calls `PATCH` and updates the post in local state on success.

---

## Feature 2: Email Notifications

### Email provider

Resend (`resend` npm package). From address: `notifications@ride-mtb.com`.

### Notification preferences

Add field to `User` model in schema:
```prisma
emailNotifications Boolean @default(true)
```

The following files also need updating when this field is added:
- `src/modules/profile/types/index.ts` — add `emailNotifications` to `UserProfileData` type
- `src/app/profile/settings/page.tsx` (or equivalent `ProfileForm` component) — add toggle UI
- `updateProfile` server action — include `emailNotifications` in the update

Profile settings page gets a toggle: "Email me when someone replies to my threads." Default on.

### Triggers

**Reply to your thread:** In `createPost` server action, after the post is saved:
1. Get the thread's author
2. If thread author != post author AND thread author has `emailNotifications = true`
3. Send email: "Someone replied to your thread: {thread title}"

**@mention:** When post content contains `@username` pattern:
1. Parse all `@username` tokens from content using a regex
2. Look up each username in DB (`User.username` has a unique index — fast lookup)
3. For each found user with `emailNotifications = true` (who isn't the post author): send mention email

### Email templates

Plain HTML strings in `src/modules/forum/lib/email.ts`. Two templates:

**Reply notification:**
```
Subject: New reply in "{thread title}"
Body: {replier name} replied to your thread "{thread title}" on Ride MTB.
[View thread button → {thread URL}]
Footer: Unsubscribe in profile settings.
```

**Mention notification:**
```
Subject: {mentioner name} mentioned you on Ride MTB
Body: {mentioner name} mentioned you in "{thread title}".
[View post button → {thread URL}]
Footer: Unsubscribe in profile settings.
```

### Implementation location

`src/modules/forum/lib/email.ts` — `sendReplyNotification()` and `sendMentionNotification()` functions. Called fire-and-forget (`.catch(console.error)`) from `createPost` action so email failures never break post creation.

---

## Feature 3: Badge System

### Schema additions

Follow the `Forum*` prefix convention used by all existing forum models (`ForumCategory`, `ForumThread`, etc.) to avoid naming collision with the existing `Badge` UI component at `src/ui/components/Badge.tsx`.

```prisma
model ForumBadge {
  id          String         @id @default(cuid())
  slug        String         @unique
  name        String
  description String
  icon        String         // lucide icon name, e.g. "MessageSquare"
  color       String         // CSS color, e.g. "#f59e0b"
  createdAt   DateTime       @default(now())

  userBadges  ForumUserBadge[]

  @@map("forum_badges")
}

model ForumUserBadge {
  id        String    @id @default(cuid())
  userId    String
  badgeSlug String
  awardedAt DateTime  @default(now())

  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge     ForumBadge   @relation(fields: [badgeSlug], references: [slug])

  @@unique([userId, badgeSlug])
  @@map("forum_user_badges")
}
```

Add back-references to `User`:
```prisma
forumBadges ForumUserBadge[]
```

### Badge definitions (seeded via `prisma/seed-badges.ts`, run with `npx tsx prisma/seed-badges.ts`)

| Slug | Name | Trigger |
|------|------|---------|
| `first-post` | First Post | Created first post |
| `10-posts` | Regular | Created 10 posts |
| `50-posts` | Contributor | Created 50 posts |
| `100-posts` | Veteran | Created 100 posts |
| `first-thread` | Thread Starter | Created first thread |
| `helpful` | Helpful | Received 10 upvotes total (karma >= 10) |
| `popular` | Popular | Received 50 upvotes total (karma >= 50) |
| `month-old` | Early Rider | Account at least 30 days old |

### Grant logic

`src/modules/forum/lib/badges.ts` — `checkAndGrantBadges(userId, context)` function. Called fire-and-forget after `createPost`, `createThread`, and `votePost` actions. Checks badge conditions by querying post counts and `User.karma`, then upserts `ForumUserBadge` records — the `@@unique` constraint prevents duplicates.

### Display

- Forum user profile page (`/forum/user/[username]`): badge grid with icon + name + tooltip description
- Post card (`PostCard.tsx`): show up to 3 badge icons inline next to username. Requires updating the `getThread` query in `src/modules/forum/lib/queries.ts` to include `author.forumBadges` in the post select.
- Badge icon components use the stored lucide icon name, resolved dynamically at render time via a lookup map

Note: `PostCard.tsx` already imports `Badge` from `@/ui/components`. The new `ForumBadge` Prisma type does not collide because it's named `ForumBadge` — no import aliasing needed.

---

## Feature 4: Forum Leaderboard

### Karma — current state

`User.karma` is already incremented by the `voteOnPost` query in `src/modules/forum/lib/queries.ts`. It recalculates karma from scratch by summing all vote values for a user's posts — this is accurate and race-condition-resistant. No changes needed to karma write logic.

### Page

**`/forum/leaderboard`** — server-rendered page. Queries top 50 users by `karma DESC` with `postCount` (count of non-deleted `ForumPost` records where `deletedAt IS NULL`). Displays: rank number, avatar (or initials fallback), username (links to `/forum/user/[username]`), post count, karma score.

### Sidebar update

The existing "Leaderboard" link in `ForumSidebar.tsx` (line ~189) currently points to `/learn/leaderboard`. Update it to `/forum/leaderboard` (or add a second entry "Forum Leaderboard" if keeping both). Do not add a duplicate.

---

## Out of Scope

- Thread editing (thread titles can be edited by admins via the report queue for now)
- Advanced auto-moderation / spam filtering (existing manual report system is sufficient for MVP)
- Community-level notification settings
- Digest emails (daily/weekly summaries)
- Badge-gated permissions

---

## Testing

- `PATCH /api/forum/posts/[id]`: test 401 unauthenticated, 403 edit window expired, 200 success
- `DELETE /api/forum/posts/[id]`: test soft delete sets `deletedAt`, thread deleted when first post deleted
- `sendReplyNotification`: unit test that Resend is called with correct recipient and subject
- `checkAndGrantBadges`: test that first-post badge is granted after first post, not duplicated on second
- `/forum/leaderboard`: test renders top users sorted by karma
