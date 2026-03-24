/**
 * Migrate standalone forum data into the monolith's Supabase.
 *
 * Prerequisites:
 *   1. Standalone forum Docker container must be running:
 *      docker start <your-ridemtbforum-container>
 *   2. Run from monolith root: npx tsx scripts/migrate-forum.ts [--dry-run]
 *
 * The script is idempotent — safe to run multiple times.
 */
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🔍 DRY RUN — no writes will happen\n')

// ── DB connections ────────────────────────────────────────────
const src = new Pool({
  connectionString: process.env.STANDALONE_FORUM_DATABASE_URL
    ?? 'postgresql://postgres:postgres@localhost:5443/ridemtbforum',
})

const dest = new Pool({
  connectionString: process.env.DATABASE_DIRECT_URL,
})

if (!process.env.DATABASE_DIRECT_URL) {
  console.error('❌ DATABASE_DIRECT_URL not set in .env.local')
  process.exit(1)
}

// ── Counters ─────────────────────────────────────────────────
const stats: Record<string, { ok: number; skip: number; err: number }> = {}
function counter(key: string) {
  if (!stats[key]) stats[key] = { ok: 0, skip: 0, err: 0 }
  return stats[key]
}

async function upsert(table: string, data: Record<string, unknown>, conflictCol = 'id') {
  if (DRY_RUN) { counter(table).ok++; return }
  const keys = Object.keys(data)
  const vals = Object.values(data)
  const cols = keys.map(k => `"${k}"`).join(', ')
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const updates = keys
    .filter(k => k !== conflictCol)
    .map(k => `"${k}" = EXCLUDED."${k}"`)
    .join(', ')

  try {
    await dest.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
       ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updates}`,
      vals,
    )
    counter(table).ok++
  } catch (e) {
    counter(table).err++
    console.error(`  ⚠ ${table} row failed:`, (e as Error).message)
  }
}

// ── Step 1: Users ─────────────────────────────────────────────
async function migrateUsers(): Promise<Map<string, string>> {
  console.log('1/11 Migrating users...')
  const { rows } = await src.query(
    `SELECT id, email, name, username, "createdAt" FROM "User"`,
  )

  const idMap = new Map<string, string>()

  for (const row of rows) {
    const email = row.email ?? `${row.username ?? row.id}@legacy.ridemtb.com`

    // Check if user already exists in dest
    const existing = await dest.query(
      `SELECT id FROM "users" WHERE email = $1 LIMIT 1`,
      [email],
    )

    if (existing.rows.length > 0) {
      idMap.set(row.id, existing.rows[0].id)
      counter('users').skip++
      continue
    }

    // Create dormant account
    const hashedPassword = await bcrypt.hash(
      Math.random().toString(36) + Math.random().toString(36),
      10,
    )
    const newId = `migrated-${row.id}`

    if (!DRY_RUN) {
      await dest.query(
        `INSERT INTO "users" (id, email, name, username, "passwordHash", "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW())
         ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()
         RETURNING id`,
        [newId, email, row.name ?? row.username, row.username, hashedPassword, row.createdAt],
      )
    }

    idMap.set(row.id, DRY_RUN ? newId : (
      (await dest.query(`SELECT id FROM "users" WHERE email = $1`, [email])).rows[0]?.id ?? newId
    ))
    counter('users').ok++
  }

  console.log(`  ✓ users: ${counter('users').ok} migrated, ${counter('users').skip} matched existing, ${counter('users').err} errors`)
  return idMap
}

// ── Step 2: ForumCategory ─────────────────────────────────────
async function migrateCategories(): Promise<Map<string, string>> {
  console.log('2/11 Migrating categories...')
  const { rows } = await src.query(
    `SELECT id, name, slug, description, "sortOrder", "createdAt" FROM "Category"`,
  )
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const destId = `migrated-cat-${row.id}`
    await upsert('forum_categories', {
      id: destId,
      name: row.name,
      slug: `migrated-${row.slug}`,
      description: row.description,
      sortOrder: row.sortOrder ?? 0,
      color: '#6b7280',
      isGated: false,
      memberCount: 0,
    })
    idMap.set(row.id, destId)
  }

  console.log(`  ✓ categories: ${counter('forum_categories').ok} ok, ${counter('forum_categories').err} errors`)
  return idMap
}

// ── Step 3: ForumTag ──────────────────────────────────────────
async function migrateTags(): Promise<Map<string, string>> {
  console.log('3/11 Migrating tags...')
  const { rows } = await src.query(`SELECT id, name, slug FROM "Tag"`)
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const destId = `migrated-tag-${row.id}`

    if (DRY_RUN) {
      counter('forum_tags').ok++
      idMap.set(row.id, destId)
      continue
    }

    // Check if tag with this name already exists (different id)
    const existing = await dest.query(
      `SELECT id FROM forum_tags WHERE name = $1 LIMIT 1`,
      [row.name],
    )
    if (existing.rows.length > 0) {
      idMap.set(row.id, existing.rows[0].id)
      counter('forum_tags').skip++
      continue
    }

    await upsert('forum_tags', {
      id: destId,
      name: row.name,
      slug: row.slug,
      color: '#6b7280',
    })
    idMap.set(row.id, destId)
  }

  console.log(`  ✓ tags: ${counter('forum_tags').ok} ok, ${counter('forum_tags').skip} matched, ${counter('forum_tags').err} errors`)
  return idMap
}

// ── Step 4: ForumThread (standalone Post → thread) ────────────
async function migrateThreads(
  userIdMap: Map<string, string>,
  categoryIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('4/11 Migrating threads...')
  // Standalone "Post" is a top-level discussion = ForumThread
  const { rows } = await src.query(
    `SELECT id, title, "categoryId", "authorId", body, "isPinned",
            "isLocked", "viewCount", "createdAt", "updatedAt"
     FROM "Post" ORDER BY "createdAt" ASC`,
  )
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const threadId = `migrated-thread-${row.id}`
    const authorId = userIdMap.get(row.authorId) ?? null
    const categoryId = categoryIdMap.get(row.categoryId) ?? null
    if (!authorId || !categoryId) { counter('forum_threads').err++; continue }

    await upsert('forum_threads', {
      id: threadId,
      categoryId,
      title: row.title ?? '(Untitled)',
      slug: `migrated-${row.id}`,
      isPinned: row.isPinned ?? false,
      isLocked: row.isLocked ?? false,
      viewCount: row.viewCount ?? 0,
      hotScore: 0,
      voteScore: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })

    // Also create the "isFirst" post containing the thread body
    const firstPostId = `migrated-fp-${row.id}`
    await upsert('forum_posts', {
      id: firstPostId,
      threadId,
      authorId,
      content: row.body ?? '',
      isFirst: true,
      depth: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })

    idMap.set(row.id, threadId)
  }

  console.log(`  ✓ threads: ${counter('forum_threads').ok} ok, ${counter('forum_threads').err} errors`)
  return idMap
}

// ── Step 5a: ForumPost flat pass (standalone Comment → reply) ─
async function migratePostsFlat(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('5a/11 Migrating posts (flat pass)...')
  const { rows } = await src.query(
    `SELECT id, "postId" as "threadId", "authorId", body, "parentId",
            "createdAt", "updatedAt"
     FROM "Comment" ORDER BY "createdAt" ASC`,
  )
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const postId = `migrated-post-${row.id}`
    const authorId = userIdMap.get(row.authorId) ?? null
    const threadId = threadIdMap.get(row.threadId) ?? null
    if (!authorId || !threadId) { counter('forum_posts').err++; continue }

    await upsert('forum_posts', {
      id: postId,
      threadId,
      authorId,
      content: row.body ?? '',
      isFirst: false,
      depth: 0,          // backfilled in 5b
      parentId: null,    // backfilled in 5b
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })

    idMap.set(row.id, postId)
  }

  console.log(`  ✓ posts flat: ${counter('forum_posts').ok} ok, ${counter('forum_posts').err} errors`)
  return idMap
}

// ── Step 5b: Backfill parentId + depth ───────────────────────
async function backfillPostParents(
  commentIdMap: Map<string, string>,
): Promise<void> {
  console.log('5b/11 Backfilling parentId + depth...')
  const { rows } = await src.query(
    `SELECT id, "parentId" FROM "Comment" WHERE "parentId" IS NOT NULL`,
  )

  let updated = 0
  for (const row of rows) {
    const destPostId = commentIdMap.get(row.id)
    const destParentId = commentIdMap.get(row.parentId)
    if (!destPostId || !destParentId) continue

    if (!DRY_RUN) {
      // Get parent depth
      const { rows: parentRows } = await dest.query(
        `SELECT depth FROM forum_posts WHERE id = $1`,
        [destParentId],
      )
      const parentDepth = parentRows[0]?.depth ?? 0
      const newDepth = Math.min(parentDepth + 1, 3)

      await dest.query(
        `UPDATE forum_posts SET "parentId" = $1, depth = $2 WHERE id = $3`,
        [destParentId, newDepth, destPostId],
      )
    }
    updated++
  }

  console.log(`  ✓ backfilled ${updated} post parents`)
}

// ── Step 6: ForumVote ─────────────────────────────────────────
async function migrateVotes(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
  commentIdMap: Map<string, string>,
): Promise<void> {
  console.log('6/11 Migrating votes...')
  const { rows } = await src.query(
    `SELECT id, "userId", "postId", "commentId", value FROM "Vote"`,
  )

  for (const row of rows) {
    const userId = userIdMap.get(row.userId)
    // Votes can be on a Post (thread) or Comment (post)
    let destPostId: string | null = null
    if (row.commentId) {
      destPostId = commentIdMap.get(row.commentId) ?? null
    } else if (row.postId) {
      // Vote on a thread → vote on its isFirst post
      const threadId = threadIdMap.get(row.postId)
      if (threadId) {
        const { rows: fp } = await dest.query(
          `SELECT id FROM forum_posts WHERE "threadId" = $1 AND "isFirst" = true LIMIT 1`,
          [threadId],
        )
        destPostId = fp[0]?.id ?? null
      }
    }

    if (!userId || !destPostId) { counter('forum_votes').err++; continue }

    await upsert('forum_votes', {
      id: `migrated-vote-${row.id}`,
      postId: destPostId,
      userId,
      value: row.value ?? 1,
    })
  }

  console.log(`  ✓ votes: ${counter('forum_votes').ok} ok, ${counter('forum_votes').err} errors`)
}

// ── Step 7: ForumThreadTag ────────────────────────────────────
async function migrateThreadTags(
  threadIdMap: Map<string, string>,
  tagIdMap: Map<string, string>,
): Promise<void> {
  console.log('7/11 Migrating thread tags...')
  const { rows } = await src.query(`SELECT "postId", "tagId" FROM "PostTag"`)

  for (const row of rows) {
    const threadId = threadIdMap.get(row.postId)
    const tagId = tagIdMap.get(row.tagId)
    if (!threadId || !tagId) { counter('forum_thread_tags').err++; continue }

    if (!DRY_RUN) {
      await dest.query(
        `INSERT INTO forum_thread_tags ("threadId", "tagId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [threadId, tagId],
      )
    }
    counter('forum_thread_tags').ok++
  }

  console.log(`  ✓ thread tags: ${counter('forum_thread_tags').ok} ok`)
}

// ── Step 8: ForumBookmark ─────────────────────────────────────
async function migrateBookmarks(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
): Promise<void> {
  console.log('8/11 Migrating bookmarks...')
  const { rows } = await src.query(`SELECT id, "userId", "postId", "createdAt" FROM "Bookmark"`)

  for (const row of rows) {
    const userId = userIdMap.get(row.userId)
    const threadId = threadIdMap.get(row.postId)   // standalone Bookmark.postId = Post (thread)
    if (!userId || !threadId) { counter('forum_bookmarks').err++; continue }

    await upsert('forum_bookmarks', {
      id: `migrated-bm-${row.id}`,
      userId,
      threadId,
      createdAt: row.createdAt,
    })
  }

  console.log(`  ✓ bookmarks: ${counter('forum_bookmarks').ok} ok`)
}

// ── Step 9: ForumBadge ────────────────────────────────────────
async function migrateBadges(): Promise<Map<string, string>> {
  console.log('9/11 Migrating badges...')
  const { rows } = await src.query(`SELECT id, name, description, icon FROM "Badge"`)
  const idToSlug = new Map<string, string>()

  for (const row of rows) {
    const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    await upsert('forum_badges', {
      id: `migrated-badge-${row.id}`,
      slug,
      name: row.name,
      description: row.description ?? '',
      icon: row.icon ?? 'award',
      color: '#6b7280',
    })
    idToSlug.set(row.id, slug)
  }

  console.log(`  ✓ badges: ${counter('forum_badges').ok} ok`)
  return idToSlug
}

// ── Step 10: ForumUserBadge ───────────────────────────────────
async function migrateUserBadges(
  userIdMap: Map<string, string>,
  badgeIdToSlug: Map<string, string>,
): Promise<void> {
  console.log('10/11 Migrating user badges...')
  const { rows } = await src.query(`SELECT "userId", "badgeId", "awardedAt" FROM "UserBadge"`)

  for (const row of rows) {
    const userId = userIdMap.get(row.userId)
    const badgeSlug = badgeIdToSlug.get(row.badgeId)
    if (!userId || !badgeSlug) { counter('forum_user_badges').err++; continue }

    await upsert('forum_user_badges', {
      id: `migrated-ub-${row.userId}-${row.badgeId}`,
      userId,
      badgeSlug,
      awardedAt: row.awardedAt,
    })
  }

  console.log(`  ✓ user badges: ${counter('forum_user_badges').ok} ok`)
}

// ── Step 11: ForumReport ──────────────────────────────────────
async function migrateReports(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
  commentIdMap: Map<string, string>,
): Promise<void> {
  console.log('11/11 Migrating reports...')
  const { rows } = await src.query(
    `SELECT id, "reporterId", "postId", "commentId", reason, status, "createdAt" FROM "Report"`,
  )

  for (const row of rows) {
    const reporterId = userIdMap.get(row.reporterId)
    if (!reporterId) { counter('forum_reports').err++; continue }

    const threadId = row.postId ? threadIdMap.get(row.postId) : null
    const postId = row.commentId ? commentIdMap.get(row.commentId) : null

    await upsert('forum_reports', {
      id: `migrated-report-${row.id}`,
      reporterId,
      targetType: postId ? 'POST' : 'THREAD',
      threadId: threadId ?? null,
      postId: postId ?? null,
      reason: row.reason ?? 'migrated',
      status: row.status === 'resolved' ? 'CLOSED' : 'OPEN',
      createdAt: row.createdAt,
    })
  }

  console.log(`  ✓ reports: ${counter('forum_reports').ok} ok`)
}

// ── Recalculate hot scores after migration ────────────────────
async function recalculateScores(): Promise<void> {
  if (DRY_RUN) return
  console.log('\nRecalculating hot/vote scores for migrated threads...')
  const { rows: threads } = await dest.query(
    `SELECT id, "createdAt" FROM forum_threads WHERE id LIKE 'migrated-%'`,
  )

  for (const thread of threads) {
    const { rows: posts } = await dest.query(
      `SELECT id FROM forum_posts WHERE "threadId" = $1`,
      [thread.id],
    )
    const postIds = posts.map((p: { id: string }) => p.id)
    if (postIds.length === 0) continue

    const { rows: voteRows } = await dest.query(
      `SELECT COALESCE(SUM(value), 0) as score FROM forum_votes WHERE "postId" = ANY($1)`,
      [postIds],
    )
    const voteScore = parseInt(voteRows[0]?.score ?? '0', 10)
    const replyCount = Math.max(0, posts.length - 1)

    // Hot score: Reddit log10 formula
    const score = voteScore + replyCount * 2
    const order = Math.log10(Math.max(Math.abs(score), 1))
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0
    const timestamp = new Date(thread.createdAt).getTime() / 1000
    const hotScore = order + (sign * timestamp) / 45000

    await dest.query(
      `UPDATE forum_threads SET "hotScore" = $1, "voteScore" = $2 WHERE id = $3`,
      [hotScore, voteScore, thread.id],
    )
  }
  console.log(`  ✓ Recalculated scores for ${threads.length} threads`)
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Forum migration starting (${DRY_RUN ? 'DRY RUN' : 'LIVE'})\n`)

  const userIdMap = await migrateUsers()
  const categoryIdMap = await migrateCategories()
  const tagIdMap = await migrateTags()
  const threadIdMap = await migrateThreads(userIdMap, categoryIdMap)
  const commentIdMap = await migratePostsFlat(userIdMap, threadIdMap)
  await backfillPostParents(commentIdMap)
  await migrateVotes(userIdMap, threadIdMap, commentIdMap)
  await migrateThreadTags(threadIdMap, tagIdMap)
  await migrateBookmarks(userIdMap, threadIdMap)
  const badgeIdToSlug = await migrateBadges()
  await migrateUserBadges(userIdMap, badgeIdToSlug)
  await migrateReports(userIdMap, threadIdMap, commentIdMap)
  await recalculateScores()

  console.log('\n📊 Migration summary:')
  for (const [table, s] of Object.entries(stats)) {
    console.log(`  ${table}: ${s.ok} ok, ${s.skip} skipped, ${s.err} errors`)
  }
  console.log('\n✅ Done!')

  await src.end()
  await dest.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
