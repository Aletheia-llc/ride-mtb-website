# Forum Redesign — Krusty Krab Port Design

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Replace the monolith's forum with the Krusty Krab standalone experience, wired to Supabase — same schema model names, same UI, same routing.

**Reference:** `/Users/kylewarner/Documents/the-krusty-krab` is the source of truth for all UI, schema structure, and component design.

---

## Decisions

| Decision | Choice |
|----------|--------|
| Styling | Tailwind v4 (monolith standard) |
| Thread detail | Replace with PostDetail + flat CommentThread |
| Comment model | Flat (no nested rendering), `parentId` tracked in DB only |
| Sidebar | Feed + category pages only; thread detail is full-width |
| Comment pagination | 20 per page with page-number controls (← 1 2 3 →). The Krusty Krab reference uses "Load More" — this spec intentionally uses page numbers instead. |
| Schema naming | Match standalone naming where possible (see Schema section for precise model map) |
| Migration strategy | `prisma migrate dev` (creates rollback-safe migration file) — never `db push` on production |

---

## Architecture

### What Changes

- `/forum/page.tsx` — remove hero + category grid, add two-column layout (sidebar + thread feed)
- `/forum/[categorySlug]/page.tsx` — same two-column layout, filtered to category
- `/forum/thread/[slug]/page.tsx` — full replacement: PostDetail + CommentThread
- `ForumSubNav` — stripped to notification bell + "New Thread" button only
- Schema — Forum-prefixed models replaced (see Schema section for exact map)
- Existing data migrated from Forum-prefixed to new models

### What Stays Unchanged

- All routing URLs
- `ForumNotification` model name (avoids collision with system `Notification` model)
- `ForumSortTabs`
- `NotificationBell`
- `LinkPreviewCard`
- Global `Notification` model (system-wide: XP grants, events, etc.)

### What Gets Removed

- `NestedReplies.tsx`
- `ThreadView.tsx`
- `PostCard.tsx` (the per-post component used inside ThreadView)
- All `Forum`-prefixed Prisma models listed in the Schema section below

---

## Schema

### Model Renames

| Remove | Replace with | Notes |
|--------|-------------|-------|
| `ForumThread` | `Post` | |
| `ForumPost` | `Comment` | |
| `ForumCategory` | `Category` | |
| `ForumVote` | `Vote` | See Vote section below |
| `ForumBookmark` | `Bookmark` | See Bookmark migration note |
| `ForumTag` + `ForumThreadTag` | `Tag` + `PostTag` | |
| `ForumBadge` + `ForumUserBadge` | `Badge` + `UserBadge` | |
| `ForumNotification` | **Keep as `ForumNotification`** | Avoids collision with existing system `Notification` model used by XP/events |
| `ForumReport` | `Report` | |
| `ForumCommunityMembership` | `CommunityMembership` | |
| `ForumLinkPreview` | `LinkPreview` | PK stays as `url String @id` |

### Post (replaces ForumThread)

```prisma
model Post {
  id            String    @id @default(cuid())
  title         String
  slug          String    @unique
  body          String
  authorId      String
  categoryId    String
  voteScore     Int       @default(0)
  hotScore      Float     @default(0)
  commentCount  Int       @default(0)
  viewCount     Int       @default(0)
  isPinned      Boolean   @default(false)
  isLocked      Boolean   @default(false)
  isCreatorPost Boolean   @default(false)
  editedAt      DateTime?
  editedById    String?
  lastReplyAt   DateTime?
  lastReplyById String?
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  author    User     @relation(fields: [authorId], references: [id])
  category  Category @relation(fields: [categoryId], references: [id])
  comments  Comment[]
  votes     Vote[]
  bookmarks Bookmark[]
  tags      PostTag[]
  linkPreview LinkPreview? @relation(fields: [linkPreviewUrl], references: [url])
  linkPreviewUrl String?
  notifications ForumNotification[]

  @@index([categoryId])
  @@index([authorId])
  @@index([createdAt])
  @@index([hotScore])
  @@index([voteScore])
  @@index([deletedAt])
  @@map("posts")
}
```

### Comment (replaces ForumPost)

```prisma
model Comment {
  id         String    @id @default(cuid())
  body       String
  postId     String
  authorId   String
  parentId   String?   // stored but not rendered as nested UI
  voteScore  Int       @default(0)
  editedAt   DateTime?
  editedById String?
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  post   Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User    @relation(fields: [authorId], references: [id])
  parent Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies Comment[] @relation("CommentReplies")
  votes  Vote[]
  notifications ForumNotification[]

  @@index([postId])
  @@index([authorId])
  @@map("comments")
}
```

### Category (replaces ForumCategory)

```prisma
model Category {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  icon          String?
  color         String   @default("#6b7280")
  sortOrder     Int      @default(0)
  isGated       Boolean  @default(false)
  ownerId       String?  // nullable — no createdBy requirement
  coverImageUrl String?
  memberCount   Int      @default(0)

  owner       User?                  @relation("ownedCommunities", fields: [ownerId], references: [id])
  posts       Post[]
  memberships CommunityMembership[]

  @@map("categories")
}
```

### Vote (replaces ForumVote)

The new `Vote` model supports both post votes and comment votes via separate nullable FKs.

```prisma
model Vote {
  id        String   @id @default(cuid())
  userId    String
  postId    String?    // set when voting on a Post
  commentId String?    // set when voting on a Comment
  value     Int
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post    Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  // NOTE: Do NOT use @@unique([userId, postId]) — PostgreSQL treats NULL as
  // distinct in unique constraints, which would allow unlimited votes when
  // postId is NULL. Instead, use partial indexes via raw SQL in the migration:
  @@map("votes")
}
```

**Required raw SQL in migration file** (add to the generated migration after `prisma migrate dev`):
```sql
CREATE UNIQUE INDEX votes_user_post_unique ON votes ("userId", "postId") WHERE "postId" IS NOT NULL;
CREATE UNIQUE INDEX votes_user_comment_unique ON votes ("userId", "commentId") WHERE "commentId" IS NOT NULL;
```

**Migration note:** Existing `ForumVote` rows all reference `ForumPost` records. After migration:
- If the `ForumPost` is the OP (its parent `ForumThread` has this as the first post) → map to `Vote.postId` pointing to the new `Post`
- If the `ForumPost` is a reply → map to `Vote.commentId` pointing to the new `Comment`

### Bookmark (replaces ForumBookmark)

```prisma
model Bookmark {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
  @@map("bookmarks")
}
```

**Migration note:** `ForumBookmark.threadId` is a FK to `ForumThread`. It does NOT map directly to `Post.id` — a join is required:
```sql
INSERT INTO bookmarks (id, userId, postId, createdAt)
SELECT fb.id, fb.userId, p.id, fb.createdAt
FROM forum_bookmarks fb
JOIN posts p ON p.id = (
  SELECT c.id FROM comments c WHERE c.postId = p.id ORDER BY c.createdAt LIMIT 1
)
```
Actually simpler: `ForumThread.id` becomes `Post.id` directly since they map 1:1. The bookmark `threadId` value IS the new `Post.id` after migration.

### Tag + PostTag (replaces ForumTag + ForumThreadTag)

```prisma
model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  slug  String    @unique
  color String    @default("#6b7280")
  posts PostTag[]

  @@map("tags")
}

model PostTag {
  postId String
  tagId  String
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}
```

### Badge + UserBadge (replaces ForumBadge + ForumUserBadge)

```prisma
model Badge {
  id          String      @id @default(cuid())
  name        String      @unique
  slug        String      @unique
  description String
  icon        String
  color       String
  userBadges  UserBadge[]

  @@map("badges")
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  badgeId   String
  awardedAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge Badge @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@unique([userId, badgeId])
  @@map("user_badges")
}
```

**Migration note:** `ForumUserBadge` uses `badgeSlug` as FK. Migration must look up `Badge.id` by slug after seeding badges.

### Report (replaces ForumReport)

```prisma
model Report {
  id         String   @id @default(cuid())
  reporterId String
  postId     String?
  commentId  String?
  reason     String
  status     String   @default("pending")
  createdAt  DateTime @default(now())

  reporter User     @relation("Reporter", fields: [reporterId], references: [id])
  post     Post?    @relation(fields: [postId], references: [id])
  comment  Comment? @relation(fields: [commentId], references: [id])

  @@map("reports")
}
```

### CommunityMembership (replaces ForumCommunityMembership)

```prisma
model CommunityMembership {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  role       String   @default("member")
  createdAt  DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId])
  @@map("community_memberships")
}
```

### LinkPreview (replaces ForumLinkPreview)

```prisma
model LinkPreview {
  url         String   @id
  title       String?
  description String?
  imageUrl    String?
  fetchedAt   DateTime @default(now())
  posts       Post[]

  @@map("link_previews")
}
```

### ForumNotification — KEEP NAME, UPDATE FK RELATIONS

The `ForumNotification` model is **not renamed** (avoids collision with system `Notification`). However, its FK relations currently point to `ForumThread` and `ForumPost` — both of which are being dropped. These must be updated to reference `Post` and `Comment`:

```prisma
model ForumNotification {
  // ... existing fields unchanged ...
  postId     String?   // was threadId → ForumThread; now → Post
  commentId  String?   // was postId → ForumPost; now → Comment

  post    Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  // actor/user relations unchanged
}
```

`notifications.ts` uses `postId` in dedup lookups — update all references from `forumThread`/`forumPost` to `post`/`comment`.

### User Model Additions

Only these three fields are truly missing from the monolith's `User` model:

```prisma
isPremium          Boolean  @default(false)
isVerifiedCreator  Boolean  @default(false)
coverUrl           String?
```

All other Krusty Krab `User` fields (`karma`, `avatarUrl`, `bio`, `location`, `websiteUrl`, `creditEarned`, `creditSeed`, `creditPurchased`) already exist in the monolith. Note naming differences:
- Krusty Krab `website` → monolith `websiteUrl`
- Krusty Krab `creditSeedPurchased` → monolith `creditPurchased`

The `lastActivityAt DateTime?` field already exists — `getOnlineUserCount` can query `WHERE lastActivityAt > NOW() - INTERVAL '5 minutes'`.

---

## Layout

### Feed + Category Pages

```
[Global Top Nav]
[ForumSubNav — notification bell + "New Thread" button]

┌──────────────────────────────────────────────────────┐
│  ForumSidebarNav (240px)  │  main content (fluid)    │
│                           │                          │
│  BROWSE                   │  [ForumSortTabs]         │
│  ● Riding Skills          │                          │
│  ● Gear & Reviews         │  [ForumThreadCard]       │
│  ● Trail Talk             │  [ForumThreadCard]       │
│  ● Maintenance            │  [ForumThreadCard]       │
│  + Discover Communities   │  ...                     │
│                           │                          │
│  FORUM STATS              │                          │
│  42 posts                 │                          │
│  183 comments             │                          │
│  28 members               │                          │
│                           │                          │
│  WHO'S ONLINE             │                          │
│  3 users online           │                          │
└──────────────────────────────────────────────────────┘
```

### Thread Detail Page

```
[Global Top Nav]
[ForumSubNav — notification bell + breadcrumb: Forum › Category › Thread Title]

┌──────────────────────────────────────────────────────┐
│  Full-width (max-w-4xl centered)                     │
│                                                      │
│  [PostDetail]                                        │
│    Tags row                                          │
│    Author block: avatar, name, role badge, joined,   │
│                  karma, post count                   │
│    Post body (markdown rendered via react-markdown)  │
│    LinkPreviewCard (if post.linkPreviewUrl set)      │
│    Action bar: ▲ score ▼  Bookmark  Report  Share   │
│                                                      │
│  [CommentThread]                                     │
│    "38 comments"  [Oldest][Newest][Best]             │
│    [ReplyForm — if authenticated + not locked]       │
│    [CommentCard] × 20                               │
│    [Pagination: ← 1 2 3 →]                          │
└──────────────────────────────────────────────────────┘
```

---

## Components

### New Components

| Component | File | Description |
|-----------|------|-------------|
| `ForumSidebarNav` | `src/modules/forum/components/ForumSidebarNav.tsx` | Category list (colored dots), forum stats (posts/comments/members), who's online count |
| `PostDetail` | `src/modules/forum/components/PostDetail.tsx` | OP post: tags row, author block, markdown body, link preview, action bar (vote/bookmark/report/share) |
| `CommentThread` | `src/modules/forum/components/CommentThread.tsx` | Sort tabs (Oldest/Newest/Best), reply form at top, flat paginated CommentCard list, pagination controls |
| `CommentCard` | `src/modules/forum/components/CommentCard.tsx` | Single comment: author (avatar, name, role, joined, karma), body, vote buttons, reply toggle, edit/delete |

### Updated Components

| Component | Changes |
|-----------|---------|
| `ForumThreadCard` | Adapt to `Post` model: `post.body` for preview, `post.category`, `post.author` directly on post (no `post.posts[0]` indirection) |
| `ForumSortTabs` | No changes |
| `ForumSubNav` | Strip to: notification bell (right) + breadcrumb (left on thread detail, empty on feed). Remove All Posts / Communities / Bookmarks links — those move to sidebar |
| `ReplyForm` | Remove `parentId` hidden input (flat comments) |
| `NotificationBell` | No changes to component; API route it calls must be updated (see API Routes below) |
| `LinkPreviewCard` | No changes |

### Deleted Components

- `src/modules/forum/components/NestedReplies.tsx`
- `src/modules/forum/components/ThreadView.tsx`
- `src/modules/forum/components/PostCard.tsx`

### Updated API Routes

| Route | Change |
|-------|--------|
| `src/app/api/forum/notifications/route.ts` | Already uses `db.forumNotification` — no change needed (model not renamed) |
| `src/app/api/forum/notifications/read/route.ts` | Same — no change needed |
| `src/app/api/forum/posts/[id]/route.ts` | Update to use `db.comment` instead of `db.forumPost` |

### Updated Lib Files

These lib files reference Forum-prefixed models directly and must be updated:

| File | Change |
|------|--------|
| `src/modules/forum/lib/badges.ts` | Replace `db.forumPost`, `db.forumThread`, `db.forumVote`, `db.forumUserBadge` with `db.comment`, `db.post`, `db.vote`, `db.userBadge` |
| `src/modules/forum/lib/notifications.ts` | `ForumNotification` model name unchanged. Update FK field refs: `threadId` → `postId` (→ `Post`), `postId` → `commentId` (→ `Comment`) |
| `src/modules/forum/lib/link-preview.ts` | Replace `db.forumLinkPreview` with `db.linkPreview` |
| `src/modules/forum/lib/email.ts` | Update any field references from `ForumThread`/`ForumPost` to `Post`/`Comment` |
| `src/modules/forum/types/index.ts` | Replace all `ForumThread`, `ForumPost`, `ForumCategory` type references with `Post`, `Comment`, `Category` |
| `src/modules/forum/actions/moderateReport.ts` | Replace `db.forumReport` with `db.report` |

### Updated Server Actions

| Action | Changes |
|--------|---------|
| `createThread.ts` | Use `db.post`, field `body` (not `content`) |
| `createPost.ts` | Use `db.comment`, field `body`, no `parentId` in UI |
| `votePost.ts` | Use `db.vote` with `postId` or `commentId` depending on target |
| `bookmarkThread.ts` | Use `db.bookmark`, field `postId` |
| `reportContent.ts` | Use `db.report` |
| `communityMembership.ts` | Use `db.communityMembership`, `db.category` |
| `createCommunity.ts` | Use `db.category` |

---

## Data Layer — Queries

### New/Updated Queries in `src/modules/forum/lib/queries.ts`

| Query | Description | Return Shape |
|-------|-------------|-------------|
| `getAllPosts(sort, page)` | Feed: all posts sorted by hot/new/top, paginated 20/page | `Post & { author, category, tags, _count: { comments } }[]` |
| `getPostsByCategory(slug, sort, page)` | Category-filtered feed | Same as above |
| `getPostBySlug(slug)` | Single post for thread detail | `Post & { author, category, tags, linkPreview, _count: { comments } }` |
| `getComments(postId, sort, page)` | Flat paginated comments (20/page) | `Comment & { author: { id, name, username, image, avatarUrl, role, karma, createdAt, isPremium, isVerifiedCreator }, votes: [] }[]` |
| `getCategories()` | All categories ordered by sortOrder | `Category[]` |
| `getForumStats()` | `{ postCount, commentCount, memberCount }` | counts from `db.post.count({ where: { deletedAt: null } })`, `db.comment.count({ where: { deletedAt: null } })`, `db.user.count` |
| `getOnlineUserCount()` | Count users with `lastActivityAt > NOW() - 5min` | `number` |
| `getBookmarkedPosts(userId)` | All posts bookmarked by user | `Post & { author, category, tags, _count: { comments } }[]` |
| `getUserPosts(username, page)` | All posts by a user, paginated | `Post & { author, category, _count: { comments } }[]` |
| `searchPosts(query)` | Full-text search on `Post.title` + `Post.body` | `Post & { author, category }[]` |
| `searchComments(query)` | Full-text search on `Comment.body` | `Comment & { author, post }[]` |

**All queries that return `Post` or `Comment` records MUST filter `where: { deletedAt: null }` to exclude soft-deleted content.**

### Removed Queries

- `getThreadBySlug` (nested include) → replaced by `getPostBySlug` + `getComments`
- `getAllThreads` → replaced by `getAllPosts`
- `getThreadsByCategory` → replaced by `getPostsByCategory`
- `getBookmarkedThreads` → replaced by `getBookmarkedPosts`
- `getUserForumThreads` → replaced by `getUserPosts`
- `searchForumThreads`, `searchForumReplies` → replaced by `searchPosts`, `searchComments`

---

## Routing (Unchanged)

| URL | Page |
|-----|------|
| `/forum` | Main feed with sidebar |
| `/forum/[categorySlug]` | Category-filtered feed with sidebar |
| `/forum/thread/[slug]` | Thread detail, full-width |
| `/forum/new` | New thread form |
| `/forum/bookmarks` | Bookmarks page |
| `/forum/notifications` | Notifications page |
| `/forum/user/[username]` | User profile |
| `/forum/search` | Search results |

---

## Implementation Sequence

1. **Schema update** — update `prisma/schema.prisma`:
   - Replace all Forum-prefixed models with new names (see Schema section)
   - Add `isPremium`, `isVerifiedCreator`, `coverUrl` to `User`
   - Keep `ForumNotification` as-is
   - Update all `User` relation fields to reference new model names

2. **Prisma migrate** — run `npx prisma migrate dev --name forum-redesign-schema` (NOT `db push`). Then open the generated migration SQL file and append the two partial index statements for `Vote` before applying:
   ```sql
   CREATE UNIQUE INDEX votes_user_post_unique ON votes ("userId", "postId") WHERE "postId" IS NOT NULL;
   CREATE UNIQUE INDEX votes_user_comment_unique ON votes ("userId", "commentId") WHERE "commentId" IS NOT NULL;
   ```

3. **Prisma generate** — run `npx prisma generate` explicitly after migration

4. **Data migration script** — `scripts/migrate-forum-redesign.ts`:
   - `ForumCategory` → `Category`
   - `ForumThread` → `Post` (map `content` → `body`)
   - `ForumPost` (OP posts) → keep as `Comment` linked to new `Post`
   - `ForumVote` → `Vote` (split: OP post votes → `Vote.postId`, reply votes → `Vote.commentId`)
   - `ForumBookmark` → `Bookmark` (`threadId` maps directly to new `Post.id` — same cuid)
   - `ForumTag` → `Tag`, `ForumThreadTag` → `PostTag`
   - `ForumBadge` → `Badge`, `ForumUserBadge` → `UserBadge` (slug → id join)
   - `ForumReport` → `Report`
   - `ForumCommunityMembership` → `CommunityMembership`
   - `ForumLinkPreview` → `LinkPreview`

5. **Queries** — rewrite `src/modules/forum/lib/queries.ts` against new model names

6. **Lib files** — update `badges.ts`, `link-preview.ts`, `notifications.ts`, `email.ts` for new model names

6a. **Types** — update `src/modules/forum/types/index.ts` to reference `Post`, `Comment`, `Category`

7. **Server actions** — update all actions in `src/modules/forum/actions/` including `moderateReport.ts`

8. **ForumSidebarNav** — build sidebar component

9. **ForumSubNav** — strip down to bell + breadcrumb/new-thread button

10. **Feed page** — replace `/forum/page.tsx` with two-column layout (sidebar + feed)

11. **Category page** — add sidebar to `/forum/[categorySlug]/page.tsx`

12. **PostDetail** — build OP renderer (tags, author block, markdown body, link preview, action bar)

13. **CommentCard** — build single-comment component

14. **CommentThread** — build sort tabs + paginated flat list + reply form

15. **Thread detail page** — wire PostDetail + CommentThread into `/forum/thread/[slug]/page.tsx`

16. **Search** — update `/forum/search` page and queries to use `db.post` / `db.comment`

17. **Cleanup** — delete `NestedReplies.tsx`, `ThreadView.tsx`, `PostCard.tsx`; update barrel exports in `src/modules/forum/components/index.ts`

18. **Verification** — smoke test all forum pages locally: feed, category, thread detail, create thread, reply, vote, bookmark, notifications
