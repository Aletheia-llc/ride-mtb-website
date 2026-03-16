# Forum Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace monolith forum's Forum-prefixed schema and hero+category-grid UI with the Krusty Krab experience — sidebar+feed layout, PostDetail+CommentThread thread detail, Tailwind v4, wired to Supabase.

**Architecture:** Schema models are renamed from Forum-prefixed to clean names (ForumThread→Post, ForumPost→Comment, etc.) with an embedded SQL data migration. UI adopts two-column layout (sidebar+feed) on feed/category pages and full-width PostDetail+CommentThread on thread detail. ForumNotification model name is kept to avoid collision with the system Notification model.

**Tech Stack:** Next.js 15, Prisma v7, PostgreSQL (Supabase), Tailwind v4, NextAuth v5, react-markdown, remark-gfm

**Reference codebase:** `/Users/kylewarner/Documents/the-krusty-krab` — source of truth for UI design

**Test command:** `npx vitest run` (no `npm test` script)

---

## File Structure

**Create:**
- `src/modules/forum/components/ForumSidebarNav.tsx` — category list, forum stats, who's online
- `src/modules/forum/components/PostDetail.tsx` — OP post with author block, markdown body, action bar
- `src/modules/forum/components/CommentCard.tsx` — single flat comment
- `src/modules/forum/components/CommentThread.tsx` — sort tabs + paginated flat comment list

**Modify:**
- `prisma/schema.prisma` — replace all Forum-prefixed models with clean names
- `prisma/migrations/<timestamp>_forum_redesign_schema/migration.sql` — embed data migration SQL
- `src/modules/forum/types/index.ts` — update all type definitions
- `src/modules/forum/lib/queries.ts` — full rewrite against new model names
- `src/modules/forum/lib/badges.ts` — update db.forumPost→db.comment, db.forumUserBadge→db.userBadge
- `src/modules/forum/lib/badges.test.ts` — update mocks to new model names
- `src/modules/forum/lib/notifications.ts` — threadId→postId, postId→commentId field refs
- `src/modules/forum/lib/link-preview.ts` — db.forumLinkPreview→db.linkPreview
- `src/modules/forum/lib/email.ts` — update any field refs
- `src/modules/forum/actions/createThread.ts` — use db.post, field body
- `src/modules/forum/actions/createPost.ts` — use db.comment, field body
- `src/modules/forum/actions/votePost.ts` — use db.vote, accept postId or commentId
- `src/modules/forum/actions/bookmarkThread.ts` — use db.bookmark, field postId
- `src/modules/forum/actions/reportContent.ts` — use db.report
- `src/modules/forum/actions/communityMembership.ts` — use db.communityMembership, db.category
- `src/modules/forum/actions/createCommunity.ts` — use db.category
- `src/modules/forum/actions/moderateReport.ts` — use db.report
- `src/modules/forum/components/ForumThreadCard.tsx` — adapt to Post model (post.body, post.author directly)
- `src/modules/forum/components/index.ts` — update barrel exports
- `src/ui/components/ForumSubNav.tsx` — strip to notification bell + New Thread button only
- `src/app/forum/page.tsx` — two-column sidebar+feed layout
- `src/app/forum/[categorySlug]/page.tsx` — two-column sidebar+feed layout
- `src/app/forum/thread/[slug]/page.tsx` — PostDetail + CommentThread
- `src/app/forum/search/page.tsx` — update to searchPosts/searchComments
- `src/app/forum/user/[username]/page.tsx` — update to getUserPosts
- `src/app/api/forum/posts/[id]/route.ts` — use db.comment

**Delete:**
- `src/modules/forum/components/NestedReplies.tsx`
- `src/modules/forum/components/ThreadView.tsx`
- `src/modules/forum/components/PostCard.tsx`

---

## Chunk 1: Schema + Migration

### Task 1: Update prisma/schema.prisma

**Files:**
- Modify: `prisma/schema.prisma`

**Context:**
Current forum models use `Forum` prefix and map to `forum_*` tables. We replace them with clean names mapping to clean table names. ForumNotification is KEPT (same model name) but its FK columns change. The User model needs 3 new fields and updated relation names.

- [ ] **Step 1: Read the current schema forum section**

```bash
grep -n "model Forum\|@@map(\"forum_" prisma/schema.prisma
```

- [ ] **Step 2: Replace the entire forum section of schema.prisma**

Find the line `// ============================================================` before `// FORUM` and the line before `// ============================================================` before `// LEARN`. Replace everything in between with:

```prisma
// ============================================================
// FORUM
// ============================================================

model Category {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  icon          String?
  color         String   @default("#6b7280")
  sortOrder     Int      @default(0)
  isGated       Boolean  @default(false)
  ownerId       String?
  coverImageUrl String?
  memberCount   Int      @default(0)

  owner       User?                 @relation("ownedCommunities", fields: [ownerId], references: [id])
  posts       Post[]
  memberships CommunityMembership[]

  @@map("categories")
}

model Post {
  id             String    @id @default(cuid())
  title          String
  slug           String    @unique
  body           String    @db.Text
  authorId       String
  categoryId     String
  voteScore      Int       @default(0)
  hotScore       Float     @default(0)
  commentCount   Int       @default(0)
  viewCount      Int       @default(0)
  isPinned       Boolean   @default(false)
  isLocked       Boolean   @default(false)
  isCreatorPost  Boolean   @default(false)
  editedAt       DateTime?
  editedById     String?
  lastReplyAt    DateTime?
  lastReplyById  String?
  linkPreviewUrl String?
  deletedAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  author      User         @relation("PostAuthor", fields: [authorId], references: [id])
  category    Category     @relation(fields: [categoryId], references: [id])
  comments    Comment[]
  votes       Vote[]
  bookmarks   Bookmark[]
  tags        PostTag[]
  linkPreview LinkPreview? @relation(fields: [linkPreviewUrl], references: [url])
  notifications ForumNotification[]
  reports     Report[]

  @@index([categoryId])
  @@index([authorId])
  @@index([createdAt])
  @@index([hotScore])
  @@index([voteScore])
  @@index([deletedAt])
  @@map("posts")
}

model Comment {
  id         String    @id @default(cuid())
  body       String    @db.Text
  postId     String
  authorId   String
  parentId   String?
  voteScore  Int       @default(0)
  editedAt   DateTime?
  editedById String?
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  post    Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  author  User      @relation("CommentAuthor", fields: [authorId], references: [id])
  parent  Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies Comment[] @relation("CommentReplies")
  votes   Vote[]
  notifications ForumNotification[]
  reports Report[]

  @@index([postId])
  @@index([authorId])
  @@map("comments")
}

model Vote {
  id        String   @id @default(cuid())
  userId    String
  postId    String?
  commentId String?
  value     Int
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post    Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  // NOTE: No @@unique here — partial indexes added via raw SQL in migration
  // (PostgreSQL treats NULL as distinct in unique constraints)
  @@index([userId])
  @@map("votes")
}

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

model Badge {
  id          String      @id @default(cuid())
  name        String      @unique
  slug        String      @unique
  description String
  icon        String
  color       String
  createdAt   DateTime    @default(now())
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

model Report {
  id             String    @id @default(cuid())
  reporterId     String
  reportedUserId String?
  postId         String?
  commentId      String?
  reason         String
  status         String    @default("pending")
  moderatorId    String?
  modNote        String?
  resolvedAt     DateTime?
  createdAt      DateTime  @default(now())

  reporter  User     @relation("Reporter", fields: [reporterId], references: [id])
  moderator User?    @relation("Moderator", fields: [moderatorId], references: [id])
  post      Post?    @relation(fields: [postId], references: [id])
  comment   Comment? @relation(fields: [commentId], references: [id])

  @@index([status])
  @@map("reports")
}

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

model LinkPreview {
  url         String   @id
  title       String?
  description String?
  imageUrl    String?
  fetchedAt   DateTime @default(now())
  posts       Post[]

  @@map("link_previews")
}

model ForumNotification {
  id        String                @id @default(cuid())
  userId    String
  actorId   String?
  type      ForumNotificationType
  postId    String?    // points to Post (was threadId → ForumThread)
  commentId String?    // points to Comment (was postId → ForumPost)
  meta      Json?
  read      Boolean               @default(false)
  createdAt DateTime              @default(now())

  user    User     @relation("ForumNotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  actor   User?    @relation("ForumNotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  post    Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([userId, createdAt])
  @@index([actorId, type, commentId])
  @@map("forum_notifications")
}
```

- [ ] **Step 3: Update User model — add 3 new fields and update forum relation names**

In the `model User { ... }` block, after `lastActivityAt DateTime?`, add:
```prisma
  isPremium          Boolean  @default(false)
  isVerifiedCreator  Boolean  @default(false)
  coverUrl           String?
```

Replace ALL existing forum relation lines on User (the lines from `forumPosts` through `forumBadges`) with:
```prisma
  posts                      Post[]                   @relation("PostAuthor")
  comments                   Comment[]                @relation("CommentAuthor")
  votes                      Vote[]
  bookmarks                  Bookmark[]
  forumNotificationsReceived ForumNotification[]      @relation("ForumNotificationRecipient")
  forumNotificationsGiven    ForumNotification[]      @relation("ForumNotificationActor")
  ownedCommunities           Category[]               @relation("ownedCommunities")
  communityMemberships       CommunityMembership[]
  reports                    Report[]                 @relation("Reporter")
  modActions                 Report[]                 @relation("Moderator")
  userBadges                 UserBadge[]
```

- [ ] **Step 4: Remove Forum-prefixed enum values that are no longer needed**

Remove `enum ForumReportStatus` and `enum ForumReportTarget` (both replaced by String fields in new Report model). Keep `enum ForumNotificationType`.

- [ ] **Step 5: Verify schema parses cleanly**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

---

### Task 2: Create Migration, Embed Data SQL, Apply

**Files:**
- Create/Modify: `prisma/migrations/<timestamp>_forum_redesign_schema/migration.sql`

**Critical constraints:**
- ForumThread has NO `authorId` or `body` — these come from `forum_posts` where `isFirst = true`
- ForumThread.id = Post.id (same cuid) — bookmarks + notifications can reuse the ID values
- ForumPost.id (isFirst=false) = Comment.id (same cuid)
- ForumVote rows all reference ForumPost; must split by `isFirst` to determine postId vs commentId
- ForumNotification has `threadId` (→ ForumThread) and `postId` (→ ForumPost); after migration they become `postId` (→ Post) and `commentId` (→ Comment); column values are identical since IDs are preserved
- Vote uniqueness uses PostgreSQL partial indexes (NULL in unique constraints is not excluded by default)
- Old status enum values (OPEN, REVIEWED, etc.) must be lowercased for new String field

- [ ] **Step 1: Generate the migration file without applying**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma migrate dev --create-only --name forum-redesign-schema
```

Note the generated file path (something like `prisma/migrations/20260316XXXXXX_forum_redesign_schema/migration.sql`).

- [ ] **Step 2: Open the migration file and find insertion points**

The generated SQL will have sections in roughly this order:
1. `AlterTable` + `AddColumn` for users (isPremium, isVerifiedCreator, coverUrl)
2. `CreateTable` for all new models (categories, posts, comments, votes, etc.)
3. `AlterTable "forum_notifications"` — drops old cols, adds new cols
4. `DropTable` for all old Forum-prefixed tables
5. `AddForeignKey` statements

**IMPORTANT:** We must insert data migration SQL BETWEEN the CreateTable section and the DropTable section.

For `forum_notifications`, we must backup old column values BEFORE Prisma drops them.

- [ ] **Step 3: Add the notification column backup BEFORE the AlterTable forum_notifications block**

Find `ALTER TABLE "forum_notifications"` in the migration file. Immediately BEFORE that block, insert:

```sql
-- ── Backup forum_notifications FK values before column rename ──────────────
ALTER TABLE "forum_notifications" ADD COLUMN "_tmp_thread_id" TEXT;
ALTER TABLE "forum_notifications" ADD COLUMN "_tmp_post_id" TEXT;
UPDATE "forum_notifications" SET "_tmp_thread_id" = "threadId", "_tmp_post_id" = "postId";
```

- [ ] **Step 4: Add data migration SQL AFTER the AlterTable forum_notifications block and BEFORE any DropTable statements**

Find the first `DROP TABLE` statement. Insert ALL of the following before it:

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- DATA MIGRATION: Forum-prefixed → new models
-- All IDs are preserved (same cuid values), so FK references remain valid.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Restore forum_notifications with new column names
UPDATE "forum_notifications" SET "postId" = "_tmp_thread_id", "commentId" = "_tmp_post_id";
ALTER TABLE "forum_notifications" DROP COLUMN "_tmp_thread_id";
ALTER TABLE "forum_notifications" DROP COLUMN "_tmp_post_id";

-- 2. Categories (direct copy — same fields)
INSERT INTO "categories" (id, name, slug, description, icon, color, "sortOrder", "isGated", "ownerId", "coverImageUrl", "memberCount")
SELECT id, name, slug, description, icon, color, "sortOrder", "isGated", "ownerId", "coverImageUrl", "memberCount"
FROM "forum_categories";

-- 3. Link previews (direct copy)
INSERT INTO "link_previews" (url, title, description, "imageUrl", "fetchedAt")
SELECT url, title, description, "imageUrl", "fetchedAt"
FROM "forum_link_previews";

-- 4. Posts (ForumThread + first ForumPost for authorId + body)
-- ForumThread has no authorId or body — they come from forum_posts where isFirst=true
INSERT INTO "posts" (
  id, title, slug, body, "authorId", "categoryId",
  "voteScore", "hotScore", "commentCount", "viewCount",
  "isPinned", "isLocked", "isCreatorPost",
  "editedAt", "editedById", "lastReplyAt", "lastReplyById",
  "linkPreviewUrl", "deletedAt", "createdAt", "updatedAt"
)
SELECT
  ft.id,
  ft.title,
  ft.slug,
  fp.content,
  fp."authorId",
  ft."categoryId",
  ft."voteScore",
  ft."hotScore",
  (SELECT COUNT(*)::int FROM "forum_posts" WHERE "threadId" = ft.id AND "isFirst" = false AND "deletedAt" IS NULL),
  ft."viewCount",
  ft."isPinned",
  ft."isLocked",
  false,
  fp."editedAt",
  NULL,
  ft."lastReplyAt",
  NULL,
  ft."linkPreviewUrl",
  ft."deletedAt",
  ft."createdAt",
  ft."updatedAt"
FROM "forum_threads" ft
JOIN "forum_posts" fp ON fp."threadId" = ft.id AND fp."isFirst" = true;

-- 5. Comments (ForumPost where isFirst=false)
INSERT INTO "comments" (
  id, body, "postId", "authorId", "parentId",
  "voteScore", "editedAt", "editedById", "deletedAt", "createdAt", "updatedAt"
)
SELECT
  fp.id,
  fp.content,
  fp."threadId",   -- ForumThread.id = Post.id (same cuid)
  fp."authorId",
  fp."parentId",
  COALESCE((SELECT SUM(value)::int FROM "forum_votes" WHERE "postId" = fp.id), 0),
  fp."editedAt",
  NULL,
  fp."deletedAt",
  fp."createdAt",
  fp."updatedAt"
FROM "forum_posts" fp
WHERE fp."isFirst" = false;

-- 6. Votes — split by whether ForumPost was OP (isFirst=true) or reply (isFirst=false)
-- OP votes → Vote.postId (pointing to Post = ForumThread.id)
INSERT INTO "votes" (id, "userId", "postId", "commentId", value, "createdAt")
SELECT fv.id, fv."userId", fp."threadId", NULL, fv.value, fv."createdAt"
FROM "forum_votes" fv
JOIN "forum_posts" fp ON fp.id = fv."postId" AND fp."isFirst" = true;

-- Reply votes → Vote.commentId (pointing to Comment = ForumPost.id)
INSERT INTO "votes" (id, "userId", "postId", "commentId", value, "createdAt")
SELECT fv.id, fv."userId", NULL, fv."postId", fv.value, fv."createdAt"
FROM "forum_votes" fv
JOIN "forum_posts" fp ON fp.id = fv."postId" AND fp."isFirst" = false;

-- 7. Bookmarks — threadId IS Post.id (same cuid, no join needed)
INSERT INTO "bookmarks" (id, "userId", "postId", "createdAt")
SELECT id, "userId", "threadId", "createdAt"
FROM "forum_bookmarks";

-- 8. Tags
INSERT INTO "tags" (id, name, slug, color)
SELECT id, name, slug, color
FROM "forum_tags";

-- 9. PostTags — threadId IS Post.id
INSERT INTO "post_tags" ("postId", "tagId")
SELECT "threadId", "tagId"
FROM "forum_thread_tags";

-- 10. Badges
INSERT INTO "badges" (id, name, slug, description, icon, color, "createdAt")
SELECT id, slug, slug, description, icon, color, "createdAt"
FROM "forum_badges";
-- Note: ForumBadge.name and ForumBadge.slug are separate fields. Adjust if name differs from slug.

-- 11. UserBadges — ForumUserBadge uses badgeSlug FK; join to get new badge.id
INSERT INTO "user_badges" (id, "userId", "badgeId", "awardedAt")
SELECT fub.id, fub."userId", b.id, fub."awardedAt"
FROM "forum_user_badges" fub
JOIN "badges" b ON b.slug = fub."badgeSlug";

-- 12. Reports — map targetType enum + separate postId/commentId
-- Old: targetType=THREAD → threadId=<ForumThread.id>=Post.id
-- Old: targetType=POST   → postId=<ForumPost.id>=Comment.id
INSERT INTO "reports" (
  id, "reporterId", "reportedUserId", "postId", "commentId",
  reason, status, "moderatorId", "modNote", "resolvedAt", "createdAt"
)
SELECT
  fr.id,
  fr."reporterId",
  fr."reportedUserId",
  CASE WHEN fr."targetType" = 'THREAD' THEN fr."threadId" ELSE NULL END,
  CASE WHEN fr."targetType" = 'POST'   THEN fr."postId"   ELSE NULL END,
  fr.reason,
  LOWER(fr.status::text),
  fr."moderatorId",
  fr."modNote",
  fr."resolvedAt",
  fr."createdAt"
FROM "forum_reports" fr;

-- 13. CommunityMemberships (direct copy)
INSERT INTO "community_memberships" (id, "userId", "categoryId", role, "createdAt")
SELECT id, "userId", "categoryId", role, "createdAt"
FROM "forum_community_memberships";

-- 14. Partial unique indexes for Vote (NULL-safe uniqueness)
CREATE UNIQUE INDEX "votes_user_post_unique"    ON "votes" ("userId", "postId")    WHERE "postId"    IS NOT NULL;
CREATE UNIQUE INDEX "votes_user_comment_unique" ON "votes" ("userId", "commentId") WHERE "commentId" IS NOT NULL;
```

- [ ] **Step 5: Apply the migration**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma migrate dev
```

If prompted "there is 1 unapplied migration, do you want to apply it?", confirm yes.

Expected: `The following migration(s) have been applied: ... forum_redesign_schema`

- [ ] **Step 6: Regenerate Prisma client**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma generate
```

- [ ] **Step 7: Verify new tables exist**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma studio
```

Or via psql: check that `posts`, `comments`, `votes`, `categories` tables exist with data.

- [ ] **Step 8: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(forum): replace Forum-prefixed schema with clean model names + data migration"
```

---

## Chunk 2: Types + Queries

### Task 3: Rewrite src/modules/forum/types/index.ts

**Files:**
- Modify: `src/modules/forum/types/index.ts`

- [ ] **Step 1: Write the failing test**

```bash
cd /Users/kylewarner/Documents/ride-mtb && cat src/modules/forum/types/index.ts
```

- [ ] **Step 2: Replace the entire file**

```typescript
// ── Forum module shared types ───────────────────────────────────────────────

export interface ForumAuthor {
  id: string
  name: string | null
  username: string | null
  image: string | null
  avatarUrl?: string | null
  role?: string
  karma?: number | null
  isPremium?: boolean
  isVerifiedCreator?: boolean
  userBadges?: BadgeDisplay[]
  // Extended fields present on PostDetail + CommentCard author blocks
  bio?: string | null
  createdAt?: Date
  _count?: { posts: number }
}

export interface BadgeDisplay {
  badge: {
    name: string
    description: string
    icon: string
    color: string
  }
}

export interface ForumCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  sortOrder: number
  _count: { posts: number }
}

export interface PostSummary {
  id: string
  title: string
  slug: string
  body: string
  isPinned: boolean
  isLocked: boolean
  voteScore: number
  commentCount: number
  viewCount: number
  createdAt: Date
  updatedAt: Date
  linkPreviewUrl: string | null
  author: ForumAuthor
  category: { id: string; name: string; slug: string; color: string; icon: string | null }
  tags: Array<{ tag: { id: string; name: string; slug: string; color: string } }>
  _count: { comments: number }
}

export interface PostDetail extends PostSummary {
  body: string
  linkPreview: LinkPreviewData | null
}

export interface ForumComment {
  id: string
  body: string
  postId: string
  authorId: string
  parentId: string | null
  voteScore: number
  editedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  author: ForumAuthor
}

export interface LinkPreviewData {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
  fetchedAt: Date
}

// ── Utility ─────────────────────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(months / 12)
  return `${years}y ago`
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/forum/types/index.ts
git commit -m "feat(forum): update types for Post/Comment/Category model names"
```

---

### Task 4: Rewrite src/modules/forum/lib/queries.ts

**Files:**
- Modify: `src/modules/forum/lib/queries.ts`

**Context:** The existing 1087-line file uses all Forum-prefixed model names. Full replacement below. Key changes:
- `getAllThreads` → `getAllPosts` (returns `{ posts, total, pageCount }`)
- `getThreadsByCategory` merged into `getAllPosts` with optional `categorySlug`
- `getThreadBySlug` replaced by `getPostBySlug` + separate `getComments`
- `createThread`/`createPost` query helpers renamed `createPostRecord`/`createCommentRecord`
- `voteOnPost` → `voteOnContent` (accepts `postId` or `commentId`)

- [ ] **Step 1: Write the complete new queries.ts**

```typescript
import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'

const PAGE_SIZE = 20

// ── Shared select shapes ───────────────────────────────────────────────────

const authorSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  avatarUrl: true,
  role: true,
  karma: true,
} satisfies Prisma.UserSelect

const authorDetailSelect = {
  ...authorSelect,
  bio: true,
  createdAt: true,
  isPremium: true,
  isVerifiedCreator: true,
  _count: { select: { posts: { where: { deletedAt: null } } } },
  userBadges: {
    include: {
      badge: { select: { name: true, description: true, icon: true, color: true } },
    },
  },
} satisfies Prisma.UserSelect

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  color: true,
  icon: true,
} satisfies Prisma.CategorySelect

const tagInclude = {
  tag: { select: { id: true, name: true, slug: true, color: true } },
} satisfies Prisma.PostTagInclude

// ── Time period helper ─────────────────────────────────────────────────────

function getTimePeriodStart(period: string): Date {
  const now = new Date()
  const ms = {
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
    year: 365 * 86_400_000,
  }[period]
  return ms ? new Date(now.getTime() - ms) : new Date(0)
}

// ── Read: Feed ─────────────────────────────────────────────────────────────

export async function getAllPosts(
  sort: 'hot' | 'new' | 'top' = 'hot',
  page = 1,
  categorySlug?: string,
  timePeriod?: string,
) {
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.PostWhereInput = {
    deletedAt: null,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(sort === 'top' && timePeriod && timePeriod !== 'all'
      ? { createdAt: { gte: getTimePeriodStart(timePeriod) } }
      : {}),
  }

  const orderBy: Prisma.PostOrderByWithRelationInput =
    sort === 'new' ? { createdAt: 'desc' }
    : sort === 'top' ? { voteScore: 'desc' }
    : { hotScore: 'desc' }

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
        tags: { include: tagInclude },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    }),
    db.post.count({ where }),
  ])

  return { posts, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ── Read: Single post ──────────────────────────────────────────────────────

export async function getPostBySlug(slug: string) {
  return db.post.findUnique({
    where: { slug, deletedAt: null },
    include: {
      author: { select: authorDetailSelect },
      category: { select: categorySelect },
      tags: { include: tagInclude },
      linkPreview: true,
      _count: { select: { comments: { where: { deletedAt: null } } } },
    },
  })
}

// ── Read: Comments ─────────────────────────────────────────────────────────

export async function getComments(
  postId: string,
  sort: 'oldest' | 'newest' | 'best' = 'oldest',
  page = 1,
) {
  const skip = (page - 1) * PAGE_SIZE
  const where: Prisma.CommentWhereInput = { postId, deletedAt: null }

  const orderBy: Prisma.CommentOrderByWithRelationInput | Prisma.CommentOrderByWithRelationInput[] =
    sort === 'newest' ? { createdAt: 'desc' }
    : sort === 'best' ? [{ voteScore: 'desc' }, { createdAt: 'asc' }]
    : { createdAt: 'asc' }

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: { author: { select: authorDetailSelect } },
    }),
    db.comment.count({ where }),
  ])

  return { comments, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ── Read: Categories ───────────────────────────────────────────────────────

export async function getCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      color: true,
      sortOrder: true,
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  })
}

// ── Read: Stats ────────────────────────────────────────────────────────────

export async function getForumStats() {
  const [postCount, commentCount, memberCount] = await Promise.all([
    db.post.count({ where: { deletedAt: null } }),
    db.comment.count({ where: { deletedAt: null } }),
    db.user.count(),
  ])
  return { postCount, commentCount, memberCount }
}

export async function getOnlineUserCount() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000)
  return db.user.count({ where: { lastActivityAt: { gte: fiveMinutesAgo } } })
}

// ── Read: Bookmarks ────────────────────────────────────────────────────────

export async function getBookmarkedPosts(userId: string) {
  const bookmarks = await db.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          author: { select: authorSelect },
          category: { select: categorySelect },
          tags: { include: tagInclude },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      },
    },
  })
  return bookmarks.map((b) => b.post)
}

// ── Read: User profile ─────────────────────────────────────────────────────

export async function getUserPosts(username: string, page = 1) {
  const skip = (page - 1) * PAGE_SIZE
  const where: Prisma.PostWhereInput = { deletedAt: null, author: { username } }

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    }),
    db.post.count({ where }),
  ])

  return { posts, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ── Read: Search ───────────────────────────────────────────────────────────

export async function searchPosts(query: string) {
  return db.post.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: authorSelect },
      category: { select: categorySelect },
    },
  })
}

export async function searchComments(query: string) {
  return db.comment.findMany({
    where: {
      deletedAt: null,
      body: { contains: query, mode: 'insensitive' },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: authorSelect },
      post: { select: { id: true, title: true, slug: true } },
    },
  })
}

export async function searchUsers(query: string) {
  return db.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      role: true,
      karma: true,
    },
  })
}

export async function getForumSearchCounts(query: string) {
  const [posts, comments, users] = await Promise.all([
    db.post.count({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
    db.comment.count({
      where: { deletedAt: null, body: { contains: query, mode: 'insensitive' } },
    }),
    db.user.count({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
  ])
  return { posts, comments, users }
}

// ── Write helpers (called by server actions) ───────────────────────────────

export async function createPostRecord(data: {
  categoryId: string
  title: string
  slug: string
  authorId: string
  body: string
  linkPreviewUrl?: string
}) {
  return db.post.create({
    data: {
      categoryId: data.categoryId,
      title: data.title,
      slug: data.slug,
      authorId: data.authorId,
      body: data.body,
      linkPreviewUrl: data.linkPreviewUrl ?? null,
    },
  })
}

export async function createCommentRecord(data: {
  postId: string
  authorId: string
  body: string
}) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId: data.postId,
        authorId: data.authorId,
        body: data.body,
      },
    })
    await tx.post.update({
      where: { id: data.postId },
      data: {
        lastReplyAt: new Date(),
        lastReplyById: data.authorId,
        commentCount: { increment: 1 },
      },
    })
    return comment
  })
}

export async function voteOnContent(data: {
  userId: string
  postId?: string
  commentId?: string
  value: 1 | -1
}) {
  const { userId, postId, commentId, value } = data
  if (!postId && !commentId) throw new Error('Must provide postId or commentId')

  const existing = await db.vote.findFirst({
    where: { userId, ...(postId ? { postId } : { commentId }) },
  })

  let scoreDelta: number
  if (!existing) {
    await db.vote.create({
      data: { userId, postId: postId ?? null, commentId: commentId ?? null, value },
    })
    scoreDelta = value
  } else if (existing.value === value) {
    await db.vote.delete({ where: { id: existing.id } })
    scoreDelta = -value
  } else {
    await db.vote.update({ where: { id: existing.id }, data: { value } })
    scoreDelta = value * 2
  }

  if (postId) {
    const post = await db.post.update({
      where: { id: postId },
      data: { voteScore: { increment: scoreDelta } },
      select: { authorId: true, voteScore: true },
    })
    await db.user.update({
      where: { id: post.authorId },
      data: { karma: { increment: scoreDelta } },
    })
    return { voteScore: post.voteScore }
  } else {
    const comment = await db.comment.update({
      where: { id: commentId! },
      data: { voteScore: { increment: scoreDelta } },
      select: { authorId: true, voteScore: true },
    })
    await db.user.update({
      where: { id: comment.authorId },
      data: { karma: { increment: scoreDelta } },
    })
    return { voteScore: comment.voteScore }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -40
```

Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/modules/forum/lib/queries.ts
git commit -m "feat(forum): rewrite queries.ts for Post/Comment/Category model names"
```

---

## Chunk 3: Lib Files + Actions

### Task 5: Update lib files (badges, notifications, link-preview, email)

**Files:**
- Modify: `src/modules/forum/lib/badges.ts`
- Modify: `src/modules/forum/lib/badges.test.ts`
- Modify: `src/modules/forum/lib/notifications.ts`
- Modify: `src/modules/forum/lib/link-preview.ts`
- Modify: `src/modules/forum/lib/email.ts`

- [ ] **Step 1: Update badges.ts**

Read the current file, then replace model references:
- `db.forumPost.count` → `db.comment.count`
- `db.forumThread.count` → `db.post.count`
- `db.forumUserBadge.upsert` → `db.userBadge.upsert`
- `userId_badgeSlug: { userId, badgeSlug: slug }` → first look up badge by slug, then use `userId_badgeId`

Full replacement for the award function pattern:

```typescript
import 'server-only'
import { db } from '@/lib/db/client'

const BADGES = [
  { slug: 'first-post',    name: 'First Post',    threshold: 1,  model: 'post'    },
  { slug: 'ten-posts',     name: 'Ten Posts',     threshold: 10, model: 'post'    },
  { slug: 'first-comment', name: 'First Comment', threshold: 1,  model: 'comment' },
  // Add more as needed — match slugs seeded in badges table
] as const

export async function checkAndAwardBadges(userId: string): Promise<void> {
  const [postCount, commentCount] = await Promise.all([
    db.post.count({ where: { authorId: userId, deletedAt: null } }),
    db.comment.count({ where: { authorId: userId, deletedAt: null } }),
  ])

  for (const badge of BADGES) {
    const count = badge.model === 'post' ? postCount : commentCount
    if (count < badge.threshold) continue

    const badgeRecord = await db.badge.findUnique({ where: { slug: badge.slug }, select: { id: true } })
    if (!badgeRecord) continue

    await db.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badgeRecord.id } },
      update: {},
      create: { userId, badgeId: badgeRecord.id },
    })
  }
}
```

- [ ] **Step 2: Update badges.test.ts — change mocks to new model names**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    post: { count: vi.fn() },
    comment: { count: vi.fn() },
    badge: { findUnique: vi.fn() },
    userBadge: { upsert: vi.fn() },
  },
}))

import { db } from '@/lib/db/client'
import { checkAndAwardBadges } from './badges'

const mockDb = db as unknown as {
  post: { count: ReturnType<typeof vi.fn> }
  comment: { count: ReturnType<typeof vi.fn> }
  badge: { findUnique: ReturnType<typeof vi.fn> }
  userBadge: { upsert: ReturnType<typeof vi.fn> }
}

describe('checkAndAwardBadges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('awards first-post badge when user has 1 post', async () => {
    mockDb.post.count.mockResolvedValue(1)
    mockDb.comment.count.mockResolvedValue(0)
    mockDb.badge.findUnique.mockResolvedValue({ id: 'badge-1' })
    mockDb.userBadge.upsert.mockResolvedValue({})

    await checkAndAwardBadges('user-1')

    expect(mockDb.userBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_badgeId: { userId: 'user-1', badgeId: 'badge-1' } },
      }),
    )
  })

  it('does not award badge when count is below threshold', async () => {
    mockDb.post.count.mockResolvedValue(0)
    mockDb.comment.count.mockResolvedValue(0)
    mockDb.badge.findUnique.mockResolvedValue(null)
    mockDb.userBadge.upsert.mockResolvedValue({})

    await checkAndAwardBadges('user-1')

    expect(mockDb.userBadge.upsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run badge tests**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/forum/lib/badges.test.ts
```

Expected: all pass.

- [ ] **Step 4: Update notifications.ts — rename FK field refs**

Old field names: `threadId` (FK → ForumThread) and `postId` (FK → ForumPost).
New field names: `postId` (FK → Post) and `commentId` (FK → Comment).

Replace the entire file:

```typescript
import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'

type NotificationType = 'REPLY_TO_THREAD' | 'REPLY_TO_POST' | 'MENTION' | 'VOTE_MILESTONE'

interface CreateNotificationInput {
  type: NotificationType
  userId: string
  actorId?: string
  postId?: string     // points to Post (was threadId)
  commentId?: string  // points to Comment (was postId)
  meta?: Record<string, unknown>
}

export async function createForumNotification(input: CreateNotificationInput): Promise<void> {
  const { type, userId, actorId, postId, commentId, meta } = input

  if (actorId && actorId === userId) return

  if (type === 'VOTE_MILESTONE') {
    const threshold = (meta as { threshold?: number })?.threshold
    const existing = await db.forumNotification.findFirst({
      where: { type: 'VOTE_MILESTONE', commentId: commentId ?? null, userId },
      select: { id: true, meta: true },
    })
    if (existing) {
      const existingMeta = existing.meta as { threshold?: number } | null
      if (existingMeta?.threshold === threshold) return
    }
  } else {
    const oneHourAgo = new Date(Date.now() - 3_600_000)
    const existing = await db.forumNotification.findFirst({
      where: {
        type,
        userId,
        actorId: actorId ?? null,
        ...(postId ? { postId } : {}),
        ...(commentId ? { commentId } : {}),
        createdAt: { gte: oneHourAgo },
      },
      select: { id: true },
    })
    if (existing) return
  }

  await db.forumNotification.create({
    data: {
      type,
      userId,
      actorId: actorId ?? null,
      postId: postId ?? null,
      commentId: commentId ?? null,
      meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
      read: false,
    },
  })
}

export function extractMentions(content: string): string[] {
  return [...content.matchAll(/@([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
}
```

- [ ] **Step 5: Update link-preview.ts — db.forumLinkPreview → db.linkPreview**

Read the file and replace every occurrence of `db.forumLinkPreview` with `db.linkPreview`. The table name and fields are otherwise unchanged (`url`, `title`, `description`, `imageUrl`, `fetchedAt`).

- [ ] **Step 6: Update email.ts — check for field refs**

Read `src/modules/forum/lib/email.ts`. If it references `ForumThread`, `ForumPost`, `thread.title`, etc., update them to `Post`, `Comment`, `post.title`. If it has no model references, no changes needed.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/forum/lib/
git commit -m "feat(forum): update lib files for Post/Comment/Category/Badge model names"
```

---

### Task 6: Update all server actions

**Files:**
- Modify: `src/modules/forum/actions/createThread.ts`
- Modify: `src/modules/forum/actions/createPost.ts`
- Modify: `src/modules/forum/actions/votePost.ts`
- Modify: `src/modules/forum/actions/bookmarkThread.ts`
- Modify: `src/modules/forum/actions/reportContent.ts`
- Modify: `src/modules/forum/actions/communityMembership.ts`
- Modify: `src/modules/forum/actions/createCommunity.ts`
- Modify: `src/modules/forum/actions/moderateReport.ts`

- [ ] **Step 1: Read all action files before modifying**

```bash
for f in src/modules/forum/actions/*.ts; do echo "=== $f ==="; cat "$f"; echo; done
```

- [ ] **Step 2: Update createThread.ts**

Key changes:
- Call `createPostRecord` (from queries) instead of `createThreadQuery`
- Update `db.forumThread` → `db.post`
- Field: `content` → `body`
- After creating post, update `db.post` for linkPreviewUrl (was `db.forumThread`)

Replace model/field references throughout. Example critical section:
```typescript
import { createPostRecord } from '@/modules/forum/lib/queries'
// ...
const post = await createPostRecord({
  categoryId,
  title,
  slug,
  authorId: session.user.id,
  body: content,  // form field may still be named "content"
})
// Update linkPreviewUrl on post:
if (linkPreviewUrl) {
  await db.post.update({ where: { id: post.id }, data: { linkPreviewUrl } })
}
```

- [ ] **Step 3: Update createPost.ts (creates comments)**

Key changes:
- Call `createCommentRecord` instead of `createPostQuery`/`db.forumPost.create`
- `db.forumThread.findUnique` → `db.post.findUnique`
- `db.forumPost` → `db.comment`
- Field: `content` → `body`, `threadId` → `postId`
- Notification calls: pass `postId` (was `threadId`) and `commentId` (was `postId`)

```typescript
import { createCommentRecord } from '@/modules/forum/lib/queries'
import { createForumNotification } from '@/modules/forum/lib/notifications'
// ...
const post = await db.post.findUnique({ where: { id: postId } })
if (!post || post.isLocked) return { error: 'Thread not found or locked' }

const comment = await createCommentRecord({
  postId,
  authorId: session.user.id,
  body,
})

// Notify post author of new reply
void createForumNotification({
  type: 'REPLY_TO_THREAD',
  userId: post.authorId,
  actorId: session.user.id,
  postId: post.id,        // points to Post
}).catch(console.error)
```

- [ ] **Step 4: Update votePost.ts**

The action now accepts a target type to distinguish Post votes from Comment votes:

```typescript
'use server'
import { auth } from '@/lib/auth'
import { voteOnContent } from '@/modules/forum/lib/queries'

export async function votePost(
  targetId: string,
  value: 1 | -1,
  targetType: 'post' | 'comment' = 'post',
) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  try {
    const result = await voteOnContent({
      userId: session.user.id,
      ...(targetType === 'post' ? { postId: targetId } : { commentId: targetId }),
      value,
    })
    return { success: true, voteScore: result.voteScore }
  } catch (error) {
    console.error('votePost error:', error)
    return { error: 'Failed to vote' }
  }
}
```

- [ ] **Step 5: Update bookmarkThread.ts**

```typescript
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function toggleForumBookmark(postId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const userId = session.user.id
  const existing = await db.bookmark.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } })
    return { bookmarked: false }
  } else {
    await db.bookmark.create({ data: { userId, postId } })
    return { bookmarked: true }
  }
}
```

- [ ] **Step 6: Update reportContent.ts**

```typescript
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function reportContent(data: {
  targetType: 'post' | 'comment'
  targetId: string
  reason: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  await db.report.create({
    data: {
      reporterId: session.user.id,
      postId: data.targetType === 'post' ? data.targetId : null,
      commentId: data.targetType === 'comment' ? data.targetId : null,
      reason: data.reason,
      status: 'pending',
    },
  })

  return { success: true }
}
```

- [ ] **Step 7: Update communityMembership.ts — db.forumCommunityMembership → db.communityMembership, db.forumCategory → db.category**

Replace all `db.forumCommunityMembership` → `db.communityMembership` and `db.forumCategory` → `db.category`.

- [ ] **Step 8: Update createCommunity.ts — db.forumCategory → db.category**

Replace all `db.forumCategory` → `db.category`.

- [ ] **Step 9: Update moderateReport.ts — db.forumReport → db.report**

Replace all `db.forumReport` → `db.report`. The status string values should now be lowercase (e.g., `'pending'`, `'reviewed'`, `'resolved'`, `'dismissed'`).

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 11: Commit**

```bash
git add src/modules/forum/actions/
git commit -m "feat(forum): update all server actions for Post/Comment/Bookmark/Report model names"
```

---

### Task 7: Update API route

**Files:**
- Modify: `src/app/api/forum/posts/[id]/route.ts`

- [ ] **Step 1: Read the file**

```bash
cat src/app/api/forum/posts/[id]/route.ts
```

- [ ] **Step 2: Replace db.forumPost with db.comment**

This route handles soft-delete or edit of a forum post (now a comment). Replace:
- `db.forumPost.findUnique` → `db.comment.findUnique`
- `db.forumPost.update` → `db.comment.update`
- Field `content` → `body`

- [ ] **Step 3: Verify TypeScript compiles and commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -20
git add src/app/api/forum/posts/
git commit -m "feat(forum): update api/forum/posts route to use db.comment"
```

---

## Chunk 4: Nav + Sidebar + ForumThreadCard

### Task 8: Strip ForumSubNav + build ForumSidebarNav

**Files:**
- Modify: `src/ui/components/ForumSubNav.tsx`
- Create: `src/modules/forum/components/ForumSidebarNav.tsx`

- [ ] **Step 1: Strip ForumSubNav to notification bell + New Thread button**

Replace the entire file:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenSquare } from 'lucide-react'
import { NotificationBell } from '@/modules/forum/components/NotificationBell'

export function ForumSubNav() {
  const pathname = usePathname()
  const isThreadDetail = pathname.startsWith('/forum/thread/')

  return (
    <nav className="sticky top-14 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        {isThreadDetail ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            <Link href="/forum" className="hover:text-[var(--color-text)]">Forum</Link>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/forum/new"
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <PenSquare className="h-3.5 w-3.5" />
            New Thread
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Build ForumSidebarNav**

```typescript
import Link from 'next/link'
import { getCategories, getForumStats, getOnlineUserCount } from '@/modules/forum/lib/queries'
import { Users, Circle } from 'lucide-react'

export async function ForumSidebarNav({ activeSlug }: { activeSlug?: string }) {
  const [categories, stats, onlineCount] = await Promise.all([
    getCategories(),
    getForumStats(),
    getOnlineUserCount(),
  ])

  return (
    <aside className="w-60 shrink-0 space-y-6">
      {/* Browse */}
      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Browse
        </p>
        <nav className="space-y-0.5">
          <Link
            href="/forum"
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              !activeSlug
                ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            All Posts
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/forum/${cat.slug}`}
              className={[
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                activeSlug === cat.slug
                  ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <Circle
                className="h-2 w-2 shrink-0 fill-current"
                style={{ color: cat.color }}
              />
              {cat.name}
            </Link>
          ))}
        </nav>
        <Link
          href="/forum/communities"
          className="mt-1 flex items-center gap-2 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <Users className="h-4 w-4" />
          Discover Communities
        </Link>
      </div>

      {/* Forum Stats */}
      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Forum Stats
        </p>
        <div className="space-y-1 px-2 text-sm text-[var(--color-text-muted)]">
          <div>{stats.postCount.toLocaleString()} posts</div>
          <div>{stats.commentCount.toLocaleString()} comments</div>
          <div>{stats.memberCount.toLocaleString()} members</div>
        </div>
      </div>

      {/* Who's Online */}
      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Who's Online
        </p>
        <div className="flex items-center gap-2 px-2 text-sm text-[var(--color-text-muted)]">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Export from components barrel**

Add to `src/modules/forum/components/index.ts`:
```typescript
export { ForumSidebarNav } from './ForumSidebarNav'
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/ForumSubNav.tsx src/modules/forum/components/ForumSidebarNav.tsx src/modules/forum/components/index.ts
git commit -m "feat(forum): strip ForumSubNav + build ForumSidebarNav with categories/stats/online"
```

---

### Task 9: Adapt ForumThreadCard to Post model

**Files:**
- Modify: `src/modules/forum/components/ForumThreadCard.tsx`

**Context:**
Current card receives a `ForumThreadSummary` which has `posts: Array<{ author }>` and gets the author as `thread.posts[0]?.author`. After migration, the `Post` model has `author` directly on the post (no indirection).

Key changes:
- Remove `firstPost = thread.posts[0]` pattern — author is now `post.author` directly
- `thread._count.posts - 1` (reply count, subtracting OP) → `post._count.comments`
- Vote action: old `votePost(firstPost.id, value)` → `votePost(post.id, value, 'post')`
- Body preview: was `firstPost.content.slice(0,200)` → `post.body.slice(0,200)`
- Category is now `post.category` (same shape)

- [ ] **Step 1: Read ForumThreadCard.tsx**

```bash
cat src/modules/forum/components/ForumThreadCard.tsx
```

- [ ] **Step 2: Rewrite to use Post model**

The component receives `post: PostSummary` (from `@/modules/forum/types`).

Replace the props type and all access patterns. Key structural changes:

```typescript
import type { PostSummary } from '@/modules/forum/types'

interface ForumThreadCardProps {
  post: PostSummary
  showCategory?: boolean
}

export function ForumThreadCard({ post, showCategory = true }: ForumThreadCardProps) {
  // Direct access — no more posts[0] indirection
  const author = post.author
  const preview = post.body.replace(/[#*`[\]]/g, '').slice(0, 200)
  const commentCount = post._count.comments

  // Voting: target is the post itself with targetType='post'
  const handleVote = async (value: 1 | -1) => {
    await votePost(post.id, value, 'post')
  }

  // Bookmark: use post.id directly
  const handleBookmark = async () => {
    await toggleForumBookmark(post.id)
  }

  // ... rest of component render using post.title, post.slug, post.category, post.tags, etc.
}
```

Make sure the component exports are updated and the `PostSummary` import replaces whatever type was used before.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/forum/components/ForumThreadCard.tsx
git commit -m "feat(forum): adapt ForumThreadCard to Post model (direct author, _count.comments)"
```

---

## Chunk 5: Feed Pages

### Task 10: Update /forum/page.tsx — sidebar + feed layout

**Files:**
- Modify: `src/app/forum/page.tsx`

**Context:**
Current page renders a hero section + `CategoryList` component. Replace entirely with a two-column layout: 240px sidebar on the left, paginated thread feed on the right.

- [ ] **Step 1: Read current page**

```bash
cat src/app/forum/page.tsx
```

- [ ] **Step 2: Replace with two-column layout**

```typescript
import { Suspense } from 'react'
import { getAllPosts } from '@/modules/forum/lib/queries'
import { ForumSidebarNav } from '@/modules/forum/components/ForumSidebarNav'
import { ForumFeed } from '@/modules/forum/components/ForumFeed'
import { ForumSortTabs } from '@/modules/forum/components/ForumSortTabs'

interface Props {
  searchParams: Promise<{ sort?: string; page?: string; period?: string }>
}

export default async function ForumPage({ searchParams }: Props) {
  const { sort = 'hot', page = '1', period } = await searchParams
  const sortValue = (sort === 'new' || sort === 'top') ? sort : 'hot'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const { posts, total, pageCount } = await getAllPosts(sortValue, pageNum, undefined, period)

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6">
      <Suspense>
        <ForumSidebarNav />
      </Suspense>
      <main className="min-w-0 flex-1">
        <ForumSortTabs activeSort={sortValue} activePeriod={period} />
        <ForumFeed posts={posts} />
        {pageCount > 1 && (
          <ForumPagination currentPage={pageNum} pageCount={pageCount} />
        )}
      </main>
    </div>
  )
}
```

Add a simple `ForumPagination` component inline or as a new file `src/modules/forum/components/ForumPagination.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export function ForumPagination({ currentPage, pageCount }: { currentPage: number; pageCount: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    return `${pathname}?${params.toString()}`
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {currentPage > 1 && (
        <Link href={buildHref(currentPage - 1)} className="rounded-md px-3 py-1.5 text-sm hover:bg-[var(--color-surface)]">
          ←
        </Link>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          className={[
            'rounded-md px-3 py-1.5 text-sm',
            page === currentPage
              ? 'bg-[var(--color-primary)] text-white'
              : 'hover:bg-[var(--color-surface)] text-[var(--color-text-muted)]',
          ].join(' ')}
        >
          {page}
        </Link>
      ))}
      {currentPage < pageCount && (
        <Link href={buildHref(currentPage + 1)} className="rounded-md px-3 py-1.5 text-sm hover:bg-[var(--color-surface)]">
          →
        </Link>
      )}
    </nav>
  )
}
```

- [ ] **Step 3: Update ForumFeed.tsx to accept `posts: PostSummary[]`**

Read `src/modules/forum/components/ForumFeed.tsx`. Update the props type from `ForumThreadSummary[]` to `PostSummary[]`. The feed component renders `<ForumThreadCard post={post} />` for each post.

Key changes:
- Props: `threads: ForumThreadSummary[]` → `posts: PostSummary[]`
- Pass `post={post}` to ForumThreadCard (not `thread={thread}`)

- [ ] **Step 4: Add ForumPagination to barrel exports**

```typescript
// In src/modules/forum/components/index.ts
export { ForumPagination } from './ForumPagination'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/app/forum/page.tsx src/modules/forum/components/
git commit -m "feat(forum): replace hero+grid with sidebar+feed two-column layout"
```

---

### Task 11: Update /forum/[categorySlug]/page.tsx — add sidebar

**Files:**
- Modify: `src/app/forum/[categorySlug]/page.tsx`

- [ ] **Step 1: Read current page**

```bash
cat "src/app/forum/[categorySlug]/page.tsx"
```

- [ ] **Step 2: Add sidebar + update to getAllPosts with categorySlug**

```typescript
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAllPosts, getCategories } from '@/modules/forum/lib/queries'
import { ForumSidebarNav } from '@/modules/forum/components/ForumSidebarNav'
import { ForumFeed } from '@/modules/forum/components/ForumFeed'
import { ForumSortTabs } from '@/modules/forum/components/ForumSortTabs'
import { ForumPagination } from '@/modules/forum/components/ForumPagination'

interface Props {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ sort?: string; page?: string; period?: string }>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const { sort = 'hot', page = '1', period } = await searchParams
  const sortValue = (sort === 'new' || sort === 'top') ? sort : 'hot'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const { posts, pageCount } = await getAllPosts(sortValue, pageNum, categorySlug, period)

  // Verify category exists
  const categories = await getCategories()
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6">
      <Suspense>
        <ForumSidebarNav activeSlug={categorySlug} />
      </Suspense>
      <main className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h1 className="text-xl font-semibold">{category.name}</h1>
          {category.description && (
            <p className="text-sm text-[var(--color-text-muted)]">{category.description}</p>
          )}
        </div>
        <ForumSortTabs activeSort={sortValue} activePeriod={period} />
        <ForumFeed posts={posts} />
        {pageCount > 1 && (
          <ForumPagination currentPage={pageNum} pageCount={pageCount} />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles and commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -20
git add "src/app/forum/[categorySlug]/page.tsx"
git commit -m "feat(forum): add sidebar to category page + use getAllPosts"
```

---

## Chunk 6: Thread Detail Components

### Task 12: Install react-markdown + remark-gfm

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npm install react-markdown remark-gfm
```

- [ ] **Step 2: Verify installed**

```bash
node -e "require('react-markdown'); console.log('ok')"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add react-markdown + remark-gfm for forum post/comment body rendering"
```

---

### Task 13: Build PostDetail component

**Files:**
- Create: `src/modules/forum/components/PostDetail.tsx`

**Context:**
Renders the OP post of a thread. Based on Krusty Krab's PostDetail.tsx at `/Users/kylewarner/Documents/the-krusty-krab/src/modules/forum/components/PostDetail.tsx`. Key sections: tags row, author block (avatar, name, role, karma, post count, joined, badges), markdown body, LinkPreviewCard, action bar (vote/bookmark/report/share).

Differences from Krusty Krab version:
- No tipping (creditSeed) in action bar
- Uses Tailwind v4 (not CSS Modules)
- `ForumAuthor` fields from our types

- [ ] **Step 1: Read Krusty Krab PostDetail for reference**

```bash
cat /Users/kylewarner/Documents/the-krusty-krab/src/modules/forum/components/PostDetail.tsx
```

- [ ] **Step 2: Create PostDetail.tsx adapted to our stack**

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronUp, ChevronDown, Bookmark, Flag, Share2 } from 'lucide-react'
import { formatRelativeTime } from '@/modules/forum/types'
import { votePost } from '@/modules/forum/actions/votePost'
import { toggleForumBookmark } from '@/modules/forum/actions/bookmarkThread'
import { LinkPreviewCard } from '@/modules/forum/components/LinkPreviewCard'
import type { PostDetail as PostDetailType } from '@/modules/forum/types'

interface PostDetailProps {
  post: PostDetailType
  currentUserId?: string
  isBookmarked?: boolean
}

export function PostDetail({ post, currentUserId, isBookmarked: initialBookmarked = false }: PostDetailProps) {
  const [voteScore, setVoteScore] = useState(post.voteScore)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [voting, setVoting] = useState(false)

  const author = post.author
  const joinedYear = author.createdAt ? new Date(author.createdAt).getFullYear() : null
  const postCount = author._count?.posts ?? 0

  const handleVote = async (value: 1 | -1) => {
    if (!currentUserId || voting) return
    setVoting(true)
    const result = await votePost(post.id, value, 'post')
    if (result && 'voteScore' in result) setVoteScore(result.voteScore)
    setVoting(false)
  }

  const handleBookmark = async () => {
    if (!currentUserId) return
    const result = await toggleForumBookmark(post.id)
    if (result && 'bookmarked' in result) setBookmarked(result.bookmarked)
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
  }

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>

      {/* Author block */}
      <div className="mb-6 flex items-start gap-4 border-b border-[var(--color-border)] pb-4">
        <Link href={`/forum/user/${author.username}`}>
          {author.avatarUrl || author.image ? (
            <Image
              src={author.avatarUrl ?? author.image ?? ''}
              alt={author.name ?? 'Author'}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-lg font-bold text-[var(--color-primary)]">
              {(author.name ?? author.username ?? '?')[0].toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/forum/user/${author.username}`}
              className="font-semibold hover:text-[var(--color-primary)]"
            >
              {author.name ?? author.username}
            </Link>
            {author.role && author.role !== 'user' && (
              <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-primary)] capitalize">
                {author.role}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
            {joinedYear && <span>Joined {joinedYear}</span>}
            <span>{postCount} posts</span>
            {author.karma !== undefined && author.karma !== null && (
              <span>{author.karma} karma</span>
            )}
          </div>
          {author.userBadges && author.userBadges.length > 0 && (
            <div className="mt-1 flex gap-1">
              {author.userBadges.slice(0, 3).map((ub, i) => (
                <span
                  key={i}
                  title={ub.badge.name}
                  className="text-base"
                >
                  {ub.badge.icon}
                </span>
              ))}
            </div>
          )}
        </div>
        <time
          dateTime={post.createdAt.toISOString()}
          className="text-xs text-[var(--color-text-muted)]"
        >
          {formatRelativeTime(post.createdAt)}
        </time>
      </div>

      {/* Body */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.body}
        </ReactMarkdown>
      </div>

      {/* Link preview */}
      {post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}

      {/* Action bar */}
      <div className="mt-6 flex items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote(1)}
            disabled={!currentUserId || voting}
            className="rounded p-1 hover:bg-[var(--color-primary)]/10 disabled:opacity-40"
            aria-label="Upvote"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className="min-w-[2ch] text-center text-sm font-semibold">{voteScore}</span>
          <button
            onClick={() => handleVote(-1)}
            disabled={!currentUserId || voting}
            className="rounded p-1 hover:bg-red-500/10 disabled:opacity-40"
            aria-label="Downvote"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {currentUserId && (
          <button
            onClick={handleBookmark}
            className={[
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
              bookmarked
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
            {bookmarked ? 'Saved' : 'Save'}
          </button>
        )}

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>

        {currentUserId && currentUserId !== post.author.id && (
          <button className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-red-500">
            <Flag className="h-4 w-4" />
            Report
          </button>
        )}
      </div>
    </article>
  )
}
```

- [ ] **Step 3: Export from barrel**

Add to `src/modules/forum/components/index.ts`:
```typescript
export { PostDetail } from './PostDetail'
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/forum/components/PostDetail.tsx src/modules/forum/components/index.ts
git commit -m "feat(forum): add PostDetail component (tags, author block, markdown body, action bar)"
```

---

### Task 14: Build CommentCard component

**Files:**
- Create: `src/modules/forum/components/CommentCard.tsx`

- [ ] **Step 1: Read Krusty Krab CommentCard for reference**

```bash
ls /Users/kylewarner/Documents/the-krusty-krab/src/modules/forum/components/ | grep -i comment
cat /Users/kylewarner/Documents/the-krusty-krab/src/modules/forum/components/CommentThread.tsx 2>/dev/null | head -150
```

- [ ] **Step 2: Create CommentCard.tsx**

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { formatRelativeTime } from '@/modules/forum/types'
import { votePost } from '@/modules/forum/actions/votePost'
import type { ForumComment } from '@/modules/forum/types'

interface CommentCardProps {
  comment: ForumComment
  currentUserId?: string
  onReplyClick?: (commentId: string, username: string) => void
}

export function CommentCard({ comment, currentUserId, onReplyClick }: CommentCardProps) {
  const [voteScore, setVoteScore] = useState(comment.voteScore)
  const [voting, setVoting] = useState(false)

  const author = comment.author
  const joinedYear = author.createdAt ? new Date(author.createdAt).getFullYear() : null
  const postCount = author._count?.posts ?? 0

  const handleVote = async (value: 1 | -1) => {
    if (!currentUserId || voting) return
    setVoting(true)
    const result = await votePost(comment.id, value, 'comment')
    if (result && 'voteScore' in result) setVoteScore(result.voteScore)
    setVoting(false)
  }

  if (comment.deletedAt) {
    return (
      <div className="border-b border-[var(--color-border)] py-4">
        <p className="text-sm italic text-[var(--color-text-muted)]">[deleted]</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 border-b border-[var(--color-border)] py-4">
      {/* Author avatar */}
      <Link href={`/forum/user/${author.username}`} className="shrink-0">
        {author.avatarUrl || author.image ? (
          <Image
            src={author.avatarUrl ?? author.image ?? ''}
            alt={author.name ?? 'Author'}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-bold text-[var(--color-primary)]">
            {(author.name ?? author.username ?? '?')[0].toUpperCase()}
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        {/* Author meta */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link
            href={`/forum/user/${author.username}`}
            className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            {author.name ?? author.username}
          </Link>
          {author.role && author.role !== 'user' && (
            <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 font-medium text-[var(--color-primary)] capitalize">
              {author.role}
            </span>
          )}
          {joinedYear && <span>Joined {joinedYear}</span>}
          <span>{postCount} posts</span>
          {author.karma !== null && author.karma !== undefined && (
            <span>{author.karma} karma</span>
          )}
          <span className="ml-auto">{formatRelativeTime(comment.createdAt)}</span>
        </div>

        {/* Body */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote(1)}
              disabled={!currentUserId || voting}
              className="rounded p-0.5 hover:bg-[var(--color-primary)]/10 disabled:opacity-40"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold">{voteScore}</span>
            <button
              onClick={() => handleVote(-1)}
              disabled={!currentUserId || voting}
              className="rounded p-0.5 hover:bg-red-500/10 disabled:opacity-40"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {currentUserId && onReplyClick && (
            <button
              onClick={() => onReplyClick(comment.id, author.username ?? '')}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Reply
            </button>
          )}
          {comment.editedAt && (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              edited {formatRelativeTime(comment.editedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Export from barrel and commit**

```bash
# Add export to src/modules/forum/components/index.ts
# export { CommentCard } from './CommentCard'

git add src/modules/forum/components/CommentCard.tsx src/modules/forum/components/index.ts
git commit -m "feat(forum): add CommentCard component"
```

---

### Task 15: Build CommentThread + update thread detail page

**Files:**
- Create: `src/modules/forum/components/CommentThread.tsx`
- Modify: `src/app/forum/thread/[slug]/page.tsx`

- [ ] **Step 1: Create CommentThread.tsx**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CommentCard } from './CommentCard'
import { ReplyForm } from './ReplyForm'
import { ForumPagination } from './ForumPagination'
import type { ForumComment } from '@/modules/forum/types'

interface CommentThreadProps {
  postId: string
  comments: ForumComment[]
  total: number
  pageCount: number
  currentPage: number
  activeSort: 'oldest' | 'newest' | 'best'
  currentUserId?: string
  isLocked?: boolean
}

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest' },
  { value: 'newest', label: 'Newest' },
  { value: 'best',   label: 'Best' },
] as const

export function CommentThread({
  postId,
  comments,
  total,
  pageCount,
  currentPage,
  activeSort,
  currentUserId,
  isLocked,
}: CommentThreadProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', sort)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <h2 className="text-lg font-semibold">
          {total} {total === 1 ? 'comment' : 'comments'}
        </h2>
        <div className="flex gap-1 rounded-md border border-[var(--color-border)] p-0.5">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={[
                'rounded px-3 py-1 text-sm transition-colors',
                activeSort === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reply form at top */}
      {currentUserId && !isLocked && (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ReplyForm postId={postId} />
        </div>
      )}
      {isLocked && (
        <p className="mb-6 rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
          This thread is locked. No new comments can be added.
        </p>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          No comments yet. Be the first to reply!
        </p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <ForumPagination currentPage={currentPage} pageCount={pageCount} />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Update /forum/thread/[slug]/page.tsx**

Replace the entire file with PostDetail + CommentThread layout:

```typescript
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPostBySlug, getComments } from '@/modules/forum/lib/queries'
import { db } from '@/lib/db/client'
import { PostDetail } from '@/modules/forum/components/PostDetail'
import { CommentThread } from '@/modules/forum/components/CommentThread'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; page?: string }>
}

export default async function ThreadPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { sort = 'oldest', page = '1' } = await searchParams

  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const sortValue = (['oldest', 'newest', 'best'].includes(sort) ? sort : 'oldest') as 'oldest' | 'newest' | 'best'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const [session, { comments, total, pageCount }] = await Promise.all([
    auth(),
    getComments(post.id, sortValue, pageNum),
  ])

  // Increment view count (fire and forget)
  void db.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  // Check if current user has bookmarked this post
  const isBookmarked = session?.user?.id
    ? !!(await db.bookmark.findUnique({
        where: { userId_postId: { userId: session.user.id, postId: post.id } },
      }))
    : false

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PostDetail
        post={post}
        currentUserId={session?.user?.id}
        isBookmarked={isBookmarked}
      />
      <CommentThread
        postId={post.id}
        comments={comments}
        total={total}
        pageCount={pageCount}
        currentPage={pageNum}
        activeSort={sortValue}
        currentUserId={session?.user?.id}
        isLocked={post.isLocked}
      />
    </div>
  )
}
```

- [ ] **Step 3: Add CommentThread to barrel exports**

```typescript
// In src/modules/forum/components/index.ts
export { CommentThread } from './CommentThread'
```

- [ ] **Step 4: Update ReplyForm to remove parentId field**

Read `src/modules/forum/components/ReplyForm.tsx`. Remove any `parentId` hidden input since comments are now flat. The form submits `postId` + `body` only.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/forum/components/CommentThread.tsx src/modules/forum/components/index.ts src/app/forum/thread/
git commit -m "feat(forum): add CommentThread + PostDetail+CommentThread thread detail page"
```

---

## Chunk 7: Cleanup + Search + Verification

### Task 16: Update search page + user profile page

**Files:**
- Modify: `src/app/forum/search/page.tsx`
- Modify: `src/app/forum/user/[username]/page.tsx` (if it exists)

- [ ] **Step 1: Read the search page**

```bash
cat src/app/forum/search/page.tsx
```

- [ ] **Step 2: Update search page to use new query functions**

Replace query calls:
- `searchForumThreads(query)` → `searchPosts(query)`
- `searchForumReplies(query)` → `searchComments(query)`
- `getForumSearchCounts(query)` → stays same (already renamed in queries.ts)
- `searchForumUsers(query)` → `searchUsers(query)`

Update import paths if needed. Update result rendering:
- Thread results: access `post.body` for preview, `post.author` directly
- Reply results: access `comment.body`, `comment.post.title` for context

- [ ] **Step 3: Update user profile page**

```bash
cat src/app/forum/user/[username]/page.tsx 2>/dev/null || echo "file not found"
```

If the file exists, replace `getUserForumThreads` with `getUserPosts`. Update result rendering to use `post.body` preview, `post._count.comments` for comment count.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/app/forum/search/ src/app/forum/user/
git commit -m "feat(forum): update search + user profile pages for Post/Comment model names"
```

---

### Task 17: Delete old components + update barrel exports + final type check

**Files:**
- Delete: `src/modules/forum/components/NestedReplies.tsx`
- Delete: `src/modules/forum/components/ThreadView.tsx`
- Delete: `src/modules/forum/components/PostCard.tsx`
- Modify: `src/modules/forum/components/index.ts`

- [ ] **Step 1: Check nothing imports the deleted components**

```bash
cd /Users/kylewarner/Documents/ride-mtb
grep -r "NestedReplies\|ThreadView\|PostCard" src/ --include="*.tsx" --include="*.ts" -l
```

If any files import them, remove those imports first.

- [ ] **Step 2: Delete old components**

```bash
rm src/modules/forum/components/NestedReplies.tsx
rm src/modules/forum/components/ThreadView.tsx
rm src/modules/forum/components/PostCard.tsx
```

- [ ] **Step 3: Update barrel exports in index.ts**

Read `src/modules/forum/components/index.ts` and remove exports for `NestedReplies`, `ThreadView`, `PostCard`. Ensure all new components are exported: `ForumSidebarNav`, `PostDetail`, `CommentCard`, `CommentThread`, `ForumPagination`.

- [ ] **Step 4: Full TypeScript compile check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit
```

Fix ALL errors before proceeding.

- [ ] **Step 5: Run tests**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run
```

All tests must pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/forum/components/
git commit -m "feat(forum): delete NestedReplies/ThreadView/PostCard, update barrel exports"
```

---

### Task 18: Smoke test verification

**Goal:** Confirm all forum routes render without errors.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npm run dev &
sleep 5
```

- [ ] **Step 2: Check each route**

```bash
# Forum feed
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/forum
# Expected: 200

# Category page
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/forum/riding-skills
# Expected: 200 or 404 (if slug doesn't exist in dev DB)

# Search
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/forum/search?q=test"
# Expected: 200

# New thread form
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/forum/new
# Expected: 200 or 302 (redirect to login)
```

- [ ] **Step 3: Visual check in browser**

Open `http://localhost:3000/forum` and verify:
- Two-column layout: sidebar on left, feed on right
- Sidebar shows category list with colored dots, forum stats, who's online
- Thread cards render without errors

If any route returns 500, check server logs:
```bash
# In the terminal where npm run dev is running, look for errors
```

- [ ] **Step 4: Fix any runtime errors and commit**

```bash
git add -A
git commit -m "feat(forum): forum redesign complete — Krusty Krab layout + schema migration"
```

---

*Plan complete. Execute with `superpowers:subagent-driven-development`.*
