#!/usr/bin/env npx tsx
// ── Database Seed Script ─────────────────────────────────────
// Usage: npx tsx scripts/seed.ts
//
// Populates the database with realistic mountain biking data:
//   Users, Forum, Learn, Trails, Events, Shops, Gear Reviews, XP
//
// WARNING: This script deletes all existing data before seeding.

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

// ── DB Client ────────────────────────────────────────────────

function createDb(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DATABASE_POOLED_URL
  if (!connectionString) {
    console.error(
      'Error: DATABASE_URL or DATABASE_POOLED_URL must be set in .env',
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString, max: 2 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// ── Helpers ──────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

/** Returns a Date that is `daysAgo` days before now */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

/** Returns a Date that is `daysFromNow` days in the future */
function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

// bcrypt hash of "password123" (10 rounds) — pre-computed so we don't need bcrypt dep
const PASSWORD_HASH =
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36PqSy0z/h7GnGh3r8Gnuvy'

// ── Seed Functions ───────────────────────────────────────────

async function seedUsers(db: PrismaClient) {
  console.log('  Creating users...')

  const users = await Promise.all([
    db.user.create({
      data: {
        email: 'admin@ridemtb.com',
        name: 'Kyle Warner',
        username: 'kylewarner',
        role: 'admin',
        skillLevel: 'expert',
        passwordHash: PASSWORD_HASH,
        bio: 'Professional mountain biker and founder of Ride MTB. Passionate about growing the sport and helping riders of all levels improve.',
        location: 'Sedona, AZ',
        ridingStyle: 'Enduro / Trail',
        favoriteBike: '2024 Santa Cruz Megatower',
        favoriteTrail: 'Hangover Trail, Sedona',
        yearsRiding: 15,
        websiteUrl: 'https://ridemtb.com',
        createdAt: daysAgo(365),
        lastActivityAt: daysAgo(0),
      },
    }),
    db.user.create({
      data: {
        email: 'instructor@ridemtb.com',
        name: 'Sarah Chen',
        username: 'sarahchen',
        role: 'instructor',
        skillLevel: 'advanced',
        passwordHash: PASSWORD_HASH,
        bio: 'PMBIA-certified MTB instructor with 10 years of teaching experience. Specializing in skills clinics and women-specific coaching.',
        location: 'Whistler, BC',
        ridingStyle: 'All-mountain',
        favoriteBike: '2024 Yeti SB140',
        favoriteTrail: 'A-Line, Whistler',
        yearsRiding: 12,
        createdAt: daysAgo(300),
        lastActivityAt: daysAgo(1),
      },
    }),
    db.user.create({
      data: {
        email: 'mike.r@example.com',
        name: 'Mike Rodriguez',
        username: 'mikerides',
        role: 'user',
        skillLevel: 'intermediate',
        passwordHash: PASSWORD_HASH,
        bio: 'Weekend warrior out of Moab. Love long XC rides and the occasional shuttle run.',
        location: 'Moab, UT',
        ridingStyle: 'XC / Trail',
        favoriteBike: '2023 Trek Fuel EX 8',
        yearsRiding: 5,
        createdAt: daysAgo(180),
        lastActivityAt: daysAgo(3),
      },
    }),
    db.user.create({
      data: {
        email: 'jess.t@example.com',
        name: 'Jessica Torres',
        username: 'jesst_mtb',
        role: 'user',
        skillLevel: 'beginner',
        passwordHash: PASSWORD_HASH,
        bio: 'New to mountain biking and loving it! Trying to learn everything I can.',
        location: 'Burlington, VT',
        ridingStyle: 'Cross-country',
        yearsRiding: 1,
        createdAt: daysAgo(60),
        lastActivityAt: daysAgo(5),
      },
    }),
    db.user.create({
      data: {
        email: 'dan.k@example.com',
        name: 'Dan Kim',
        username: 'dankshreds',
        role: 'user',
        skillLevel: 'advanced',
        passwordHash: PASSWORD_HASH,
        bio: 'Gravity rider at heart. If it has drops and jumps, count me in.',
        location: 'Bellingham, WA',
        ridingStyle: 'Downhill / Freeride',
        favoriteBike: '2024 Specialized Demo',
        favoriteTrail: 'Galbraith Mountain',
        yearsRiding: 8,
        createdAt: daysAgo(250),
        lastActivityAt: daysAgo(2),
      },
    }),
  ])

  console.log(`    Created ${users.length} users`)
  return users
}

async function seedForumCategories(db: PrismaClient) {
  console.log('  Creating forum categories...')

  const categories = [
    {
      name: 'General Discussion',
      slug: 'general-discussion',
      description:
        'Chat about anything mountain biking related. Introductions, random thoughts, and community vibes.',
      icon: 'message-circle',
      sortOrder: 1,
    },
    {
      name: 'Trail Talk',
      slug: 'trail-talk',
      description:
        'Trail conditions, recommendations, trip reports, and beta on your favorite spots.',
      icon: 'map-pin',
      sortOrder: 2,
    },
    {
      name: 'Bike Tech',
      slug: 'bike-tech',
      description:
        'Wrenching, upgrades, setup tips, and troubleshooting. All things mechanical.',
      icon: 'wrench',
      sortOrder: 3,
    },
    {
      name: 'Riding Skills',
      slug: 'riding-skills',
      description:
        'Technique discussions, coaching tips, progression advice, and skills challenges.',
      icon: 'target',
      sortOrder: 4,
    },
    {
      name: 'Events & Meetups',
      slug: 'events-meetups',
      description:
        'Organize group rides, share race info, plan meetups, and find riding buddies.',
      icon: 'calendar',
      sortOrder: 5,
    },
    {
      name: 'Buy / Sell',
      slug: 'buy-sell',
      description:
        'Marketplace for used gear, bikes, and parts. Keep it fair, keep it honest.',
      icon: 'tag',
      sortOrder: 6,
    },
  ]

  const created = []
  for (const cat of categories) {
    created.push(await db.forumCategory.create({ data: cat }))
  }

  console.log(`    Created ${created.length} forum categories`)
  return created
}

type ForumCategoryRecord = { id: string; slug: string }
type UserRecord = { id: string; name: string | null }

async function seedForumThreads(
  db: PrismaClient,
  categories: ForumCategoryRecord[],
  users: UserRecord[],
) {
  console.log('  Creating forum threads & posts...')

  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]))
  const [admin, instructor, mike, jess, dan] = users

  const threadData: {
    categorySlug: string
    title: string
    isPinned?: boolean
    posts: { authorId: string; content: string; daysAgo: number }[]
  }[] = [
    // ── General Discussion ──
    {
      categorySlug: 'general-discussion',
      title: 'Welcome to Ride MTB! Introduce Yourself',
      isPinned: true,
      posts: [
        {
          authorId: admin.id,
          content:
            "Hey everyone! Welcome to the Ride MTB community. Drop a comment and tell us about yourself — where you ride, what you ride, and what you're stoked about this season. Let's build something great together.",
          daysAgo: 90,
        },
        {
          authorId: jess.id,
          content:
            "Hey all! I'm Jess from Burlington, VT. Just picked up mountain biking last year after years of road cycling. Currently riding a Trek Marlin and absolutely loving the Kingdom Trails. Hoping to upgrade to a full-sus by fall!",
          daysAgo: 55,
        },
        {
          authorId: dan.id,
          content:
            "What's up! Dan from Bellingham. Been riding for about 8 years, mostly gravity stuff. Just got a new Specialized Demo and it's an absolute weapon. Stoked to find a community that's not just Pinkbike reposts.",
          daysAgo: 50,
        },
      ],
    },
    {
      categorySlug: 'general-discussion',
      title: 'What Got You Into Mountain Biking?',
      posts: [
        {
          authorId: mike.id,
          content:
            'Curious to hear everyone\'s origin story. For me, a buddy dragged me out to Moab 5 years ago and I was immediately hooked. Rented a crappy hardtail, rode Slickrock, and ordered my own bike the next week.',
          daysAgo: 45,
        },
        {
          authorId: instructor.id,
          content:
            "I grew up riding BMX and transitioned to mountain biking in my late teens. The freedom of being in the woods, the technical challenge... it's just unmatched. Now I get to teach people and watch that same lightbulb go on.",
          daysAgo: 44,
        },
        {
          authorId: jess.id,
          content:
            "I was honestly intimidated for years. Road cycling felt safe and structured. But I moved to Vermont and everyone here rides dirt. My neighbor lent me her old bike and took me on the easiest trail she knew. I was terrible and loved every second.",
          daysAgo: 43,
        },
      ],
    },
    {
      categorySlug: 'general-discussion',
      title: 'Unpopular MTB Opinions Thread',
      posts: [
        {
          authorId: dan.id,
          content:
            "I'll start: 29ers are overrated for technical terrain. Fight me. My 27.5 Demo is way more playful on tight, steep stuff. Yes I know about the rollover advantage. No I don't care.",
          daysAgo: 30,
        },
        {
          authorId: mike.id,
          content:
            "Mine: dropper posts are more important than full suspension. I'd rather ride a hardtail with a dropper than a full-sus with a fixed post. The ability to get out of the way of the saddle changes everything.",
          daysAgo: 29,
        },
        {
          authorId: admin.id,
          content:
            "Here's one: most riders would benefit way more from a skills clinic than a bike upgrade. I see people on $8k bikes who can't corner. Put that money into coaching first.",
          daysAgo: 28,
        },
        {
          authorId: instructor.id,
          content:
            "Kyle nailed it. As an instructor, I watch riders blow through corners because they never learned proper body position. A $200 clinic will make you faster than a $2000 wheelset upgrade every time.",
          daysAgo: 28,
        },
      ],
    },

    // ── Trail Talk ──
    {
      categorySlug: 'trail-talk',
      title: 'Moab in April — What to Expect?',
      posts: [
        {
          authorId: jess.id,
          content:
            "Planning my first trip to Moab in April. Is it too hot? Too crowded? What trails should a solid beginner prioritize? I've heard Slickrock is a must-do but wondering if it's above my level.",
          daysAgo: 40,
        },
        {
          authorId: mike.id,
          content:
            "April is prime time! Temps in the 70s, not too hot. It does get busy but nothing unmanageable if you start early. For your level I'd recommend: Bar M (great warmup), Courthouse Loop, and Dead Horse Point. Save Slickrock for day 2 when you've got your desert legs.",
          daysAgo: 39,
        },
        {
          authorId: admin.id,
          content:
            "Mike's recs are solid. I'd add Klondike Bluffs to the list — amazing views, not too technical, and usually less crowded than the Moab Brand trails. Bring way more water than you think you need.",
          daysAgo: 39,
        },
      ],
    },
    {
      categorySlug: 'trail-talk',
      title: 'Kingdom Trails 2024 Season Update',
      posts: [
        {
          authorId: jess.id,
          content:
            "Kingdom Trails just posted their spring update. Opening day is May 15th! They've been doing a ton of trail work over the winter — new flow trail called Sidewinder looks incredible. Day passes going up to $20 this year though.",
          daysAgo: 35,
        },
        {
          authorId: mike.id,
          content:
            "$20 is still a steal for what you get. That trail network is world-class. I've been wanting to make the trip from Utah — anyone want to organize a Ride MTB group trip this summer?",
          daysAgo: 34,
        },
      ],
    },
    {
      categorySlug: 'trail-talk',
      title: 'Whistler Opening Weekend Report',
      posts: [
        {
          authorId: instructor.id,
          content:
            "Just got back from opening weekend at the park. A-Line is in perfect shape, they rebuilt the lower section berms and they are SO good. Crank It Up has a new B-line option through the rock garden that's way more approachable. Dirt Merchant is still closed for construction but should be open by July.",
          daysAgo: 20,
        },
        {
          authorId: dan.id,
          content:
            "So jealous. How were the lift lines? Last year opening weekend was a 30-minute wait and I nearly lost it.",
          daysAgo: 19,
        },
        {
          authorId: instructor.id,
          content:
            "Lines were about 15-20 min for Fitzsimmons, but if you hit Garbanzo it was walk-on most of the afternoon. Pro tip: ride Garbanzo in the morning when everyone's stacking A-Line laps, then switch to Fitz after lunch.",
          daysAgo: 19,
        },
      ],
    },

    // ── Bike Tech ──
    {
      categorySlug: 'bike-tech',
      title: 'Setting Up Suspension — A Beginner Guide',
      isPinned: true,
      posts: [
        {
          authorId: admin.id,
          content:
            "I see this question come up all the time so let's make a sticky. Here's the basics:\n\n1. **Sag**: Set your fork and shock to 25-30% sag for trail riding. Sit on the bike in riding position and measure.\n2. **Rebound**: Start fully closed (slow), then open clicks until the wheel returns to the ground quickly without bouncing.\n3. **Compression**: Start in the middle and adjust from there.\n\nThe single best thing you can do is get a shock pump and actually measure your sag. Most riders I meet are running way too much pressure.",
          daysAgo: 60,
        },
        {
          authorId: dan.id,
          content:
            "Great write-up. I'd add: your suspension should be active, not stiff. If you're not using full travel on your local trails, you're probably running too much pressure or too much compression damping. Check your o-rings after every ride.",
          daysAgo: 59,
        },
      ],
    },
    {
      categorySlug: 'bike-tech',
      title: 'Shimano vs SRAM — The Eternal Debate',
      posts: [
        {
          authorId: mike.id,
          content:
            "Getting ready to swap my drivetrain. Currently on Shimano Deore and considering jumping to SRAM GX Eagle. Worth the switch or should I stay in the Shimano ecosystem? Budget is about $400.",
          daysAgo: 25,
        },
        {
          authorId: dan.id,
          content:
            "Honestly at that price point both are excellent. SRAM shifts a bit more crisply under load in my experience, but Shimano's clutch mechanism is smoother and they're easier to set up. If you're already on Shimano and it's working, I'd go SLX — better bang for buck than switching ecosystems.",
          daysAgo: 24,
        },
        {
          authorId: admin.id,
          content:
            "I've ridden both extensively. My unpopular take: for trail riding, Shimano XT is the sweet spot. SRAM's advantage shows up more in racing where the instant shift engagement matters. For weekend warriors, Shimano's reliability and ease of maintenance wins.",
          daysAgo: 24,
        },
      ],
    },
    {
      categorySlug: 'bike-tech',
      title: 'Tubeless Conversion Tips',
      posts: [
        {
          authorId: jess.id,
          content:
            "I keep getting flats on my stock tubes and everyone says go tubeless. Is it really worth it? And can I do it myself or should I take it to a shop? My rims say tubeless-ready on them.",
          daysAgo: 15,
        },
        {
          authorId: instructor.id,
          content:
            "Absolutely worth it. Tubeless will eliminate 90% of your flats and you can run lower pressure for better grip. If your rims are tubeless-ready, you just need: tubeless tape, valves, sealant, and a floor pump (or compressor). Watch a YouTube tutorial first — it's messy but not hard. Budget about $40-50 in supplies.",
          daysAgo: 14,
        },
        {
          authorId: mike.id,
          content:
            "One tip: if the tire won't seat with a floor pump, wrap a tube strap (or old inner tube cut into a band) around the center of the tire to push the beads out. Works every time. Also, Stan's sealant is the standard but Orange Seal lasts longer in hot climates.",
          daysAgo: 14,
        },
      ],
    },

    // ── Riding Skills ──
    {
      categorySlug: 'riding-skills',
      title: 'How to Corner Properly — The #1 Skill to Learn',
      isPinned: true,
      posts: [
        {
          authorId: instructor.id,
          content:
            "Cornering is the single most impactful skill you can improve. Here's the framework I teach:\n\n1. **Look where you want to go** — not at the ground in front of your wheel\n2. **Outside foot down, inside knee out** — this loads the tires and creates lean angle\n3. **Heavy hands, light feet** — push into your grips through the turn\n4. **Brake BEFORE the corner**, not in it — enter at the right speed and rail through\n5. **Lean the bike, not your body** — your body stays centered over the bottom bracket\n\nPractice on a flat grassy area first. Draw a circle and ride it until it's second nature.",
          daysAgo: 75,
        },
        {
          authorId: admin.id,
          content:
            "This is gold, Sarah. The 'lean the bike not your body' tip was the single biggest unlock for me. Most people lean their whole body into the turn like a motorcycle, but on a mountain bike you want to keep your weight centered and let the bike angle underneath you.",
          daysAgo: 74,
        },
      ],
    },
    {
      categorySlug: 'riding-skills',
      title: 'Conquering Fear on Steep Terrain',
      posts: [
        {
          authorId: jess.id,
          content:
            "How do you deal with steep sections that just look terrifying? I know I have the bike handling to do it, but I freeze up and either walk it or brake the whole way down (which I know is worse).",
          daysAgo: 20,
        },
        {
          authorId: instructor.id,
          content:
            "Fear is your brain protecting you — it's not a bad thing. Here's how I coach riders through it:\n\n1. **Session it**: Walk the section first. Visualize your line. Then ride just the bottom half. Work up.\n2. **Dropper down**: Get your saddle out of the way. This lets you shift weight back.\n3. **One finger braking**: Forces you to modulate instead of death-gripping.\n4. **Breathe**: Seriously. Most riders hold their breath on scary stuff. Exhale through the feature.\n\nThe confidence comes from small wins stacking up. Don't try to jump from green to double black.",
          daysAgo: 19,
        },
        {
          authorId: dan.id,
          content:
            "Sarah's advice is spot on. I'll add: ride with people better than you, but who are patient. Watching someone flow through a feature you're scared of shows your brain it's possible. And there's no shame in walking anything, ever.",
          daysAgo: 18,
        },
      ],
    },
    {
      categorySlug: 'riding-skills',
      title: 'Manual Practice — Am I Doing This Right?',
      posts: [
        {
          authorId: mike.id,
          content:
            "Been trying to learn manuals for months and I can only hold it for like 2 seconds before the front drops. I watch YouTube videos and it looks effortless. What am I missing?",
          daysAgo: 10,
        },
        {
          authorId: admin.id,
          content:
            "Manuals are one of those skills that takes way longer than people expect. A few things to check:\n\n- Are you using your hips to find the balance point, or just pulling with your arms?\n- Are you covering the rear brake? That's your safety net.\n- Practice on a slight downhill — it's easier to find the balance point.\n\n2 seconds is actually a great start. It took me a solid year before I could manual a parking lot consistently.",
          daysAgo: 9,
        },
      ],
    },

    // ── Events & Meetups ──
    {
      categorySlug: 'events-meetups',
      title: 'Ride MTB Summer Group Ride Series',
      isPinned: true,
      posts: [
        {
          authorId: admin.id,
          content:
            "We're kicking off a weekly summer group ride series! Every Thursday at 6pm, rotating locations. All skill levels welcome — we'll split into groups. First ride is June 1st at our local trails. Drop a comment if you're interested and what region you're in!",
          daysAgo: 30,
        },
        {
          authorId: mike.id,
          content:
            "I'm in for Moab rides! Would love to lead a group through the Bar M / Courthouse area for beginners. Happy to shuttle-guide the more advanced stuff too.",
          daysAgo: 29,
        },
        {
          authorId: jess.id,
          content:
            "Burlington/Kingdom Trails checking in! I know I'm newer but I'd love to join beginner-friendly rides.",
          daysAgo: 29,
        },
      ],
    },
    {
      categorySlug: 'events-meetups',
      title: 'Anyone Racing Enduro This Season?',
      posts: [
        {
          authorId: dan.id,
          content:
            "Signing up for the NW Cup series and a couple California Enduro Series races. Anyone else doing the race circuit? Would be cool to have a Ride MTB pit area.",
          daysAgo: 22,
        },
        {
          authorId: admin.id,
          content:
            "I'm doing a few EWS qualifier events. Let's definitely coordinate — even just having friendly faces at the trailhead makes race day better. We should get some Ride MTB jerseys made too.",
          daysAgo: 21,
        },
      ],
    },
    {
      categorySlug: 'events-meetups',
      title: 'Trail Work Day — Giving Back',
      posts: [
        {
          authorId: instructor.id,
          content:
            "Our local trail association has a work day coming up. Raking berms, clearing deadfall, drainage work. It's hard work but honestly really satisfying to maintain the trails we all ride. Plus, free lunch and beer after. Who's in?",
          daysAgo: 12,
        },
        {
          authorId: jess.id,
          content:
            "I've never done trail work before but I'd love to learn. Do I need to bring tools or do they provide them?",
          daysAgo: 11,
        },
        {
          authorId: instructor.id,
          content:
            "They provide everything! Just bring gloves, water, and sun protection. Wear clothes you don't mind getting dirty. It's a great way to meet the local riding community.",
          daysAgo: 11,
        },
      ],
    },

    // ── Buy / Sell ──
    {
      categorySlug: 'buy-sell',
      title: 'WTS: Fox 36 Factory GRIP2 Fork — Great Condition',
      posts: [
        {
          authorId: dan.id,
          content:
            "Selling my Fox 36 Factory GRIP2, 160mm travel, 29\" wheel. Bought new last season, maybe 50 rides on it. Just got a Fox 38 so this needs a new home.\n\nKashima coat in great shape, stanchions clean, no scratches. Fresh service at 40-hour mark. Includes original box.\n\nAsking $550 shipped, $500 local pickup (Bellingham, WA).\n\nSerious inquiries only, please.",
          daysAgo: 8,
        },
        {
          authorId: mike.id,
          content:
            "PM'd! Been looking for exactly this for my trail bike build.",
          daysAgo: 7,
        },
      ],
    },
    {
      categorySlug: 'buy-sell',
      title: 'Looking For: Size Large Trail Frame',
      posts: [
        {
          authorId: mike.id,
          content:
            "Building up a new trail bike and looking for a size large frame. Ideally 130-150mm travel, modern geo (steep seat tube, ~65 degree head angle). Budget up to $1500. Open to most brands. Whatcha got?",
          daysAgo: 5,
        },
        {
          authorId: admin.id,
          content:
            "Check out the Guerrilla Gravity Smash. They're based in Colorado, made in the USA, and their frame swaps are amazing. I've seen used ones in your budget. The geo is progressive and the build quality is top-notch.",
          daysAgo: 4,
        },
      ],
    },
    {
      categorySlug: 'buy-sell',
      title: 'Free: Box of Random MTB Parts — Burlington VT',
      posts: [
        {
          authorId: jess.id,
          content:
            "Cleaning out my garage and found a box of parts from the used bike I bought: old brake pads (some life left), a set of flat pedals, some cables and housing, a 50mm stem, and a seatpost clamp. Nothing fancy but free to anyone who can pick up in Burlington.",
          daysAgo: 3,
        },
      ],
    },
  ]

  let threadCount = 0
  let postCount = 0

  for (const td of threadData) {
    const categoryId = catMap[td.categorySlug]
    if (!categoryId) {
      console.warn(`    Warning: Category "${td.categorySlug}" not found`)
      continue
    }

    const thread = await db.forumThread.create({
      data: {
        categoryId,
        title: td.title,
        slug: slugify(td.title),
        isPinned: td.isPinned ?? false,
        viewCount: Math.floor(Math.random() * 500) + 20,
        createdAt: daysAgo(td.posts[0]?.daysAgo ?? 30),
      },
    })
    threadCount++

    for (let i = 0; i < td.posts.length; i++) {
      const p = td.posts[i]
      await db.forumPost.create({
        data: {
          threadId: thread.id,
          authorId: p.authorId,
          content: p.content,
          isFirst: i === 0,
          createdAt: daysAgo(p.daysAgo),
        },
      })
      postCount++
    }
  }

  console.log(`    Created ${threadCount} threads, ${postCount} posts`)
}

async function seedLearnCourses(db: PrismaClient) {
  console.log('  Creating learn courses, modules & quizzes...')

  // ── Course 1: Mountain Biking Fundamentals ──
  const course1 = await db.learnCourse.create({
    data: {
      slug: 'mountain-biking-fundamentals',
      title: 'Mountain Biking Fundamentals',
      description:
        'Everything you need to know to get started with mountain biking. From basic bike setup to your first trail ride, this course covers the essential skills and knowledge every rider needs.',
      difficulty: 'beginner',
      category: 'riding_skills',
      sortOrder: 1,
      status: 'published',
      createdAt: daysAgo(180),
    },
  })

  const c1Modules = [
    {
      slug: 'bike-setup-basics',
      title: 'Bike Setup Basics',
      sortOrder: 1,
      lessonContent: {
        blocks: [
          {
            type: 'text',
            content:
              'Before hitting the trail, proper bike setup is crucial for both safety and enjoyment.',
          },
        ],
      },
      status: 'published' as const,
      quiz: {
        title: 'Bike Setup Basics Quiz',
        slug: 'bike-setup-basics-quiz',
        difficulty: 'beginner' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt: 'What is the recommended sag percentage for trail riding?',
            options: {
              choices: ['10-15%', '25-30%', '40-50%', '60-70%'],
              correctIndex: 1,
            },
            explanation:
              '25-30% sag is the standard starting point for trail riding. This provides enough travel for bump absorption while maintaining pedaling efficiency.',
            sortOrder: 1,
          },
          {
            type: 'true_false' as const,
            prompt:
              'You should always set your tire pressure to the maximum listed on the sidewall.',
            options: { correctAnswer: false },
            explanation:
              'Maximum pressure is rarely optimal. Lower pressures provide better traction and comfort. Trail riders typically run 22-30 PSI depending on tire width, terrain, and rider weight.',
            sortOrder: 2,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'What is the purpose of a dropper seatpost?',
            options: {
              choices: [
                'To make the bike lighter',
                'To lower the saddle on descents for better control',
                'To absorb bumps from the trail',
                'To shift gears more smoothly',
              ],
              correctIndex: 1,
            },
            explanation:
              'A dropper post lets you quickly lower your saddle when descending, allowing your body to move freely behind and below the saddle for better control on steep and technical terrain.',
            sortOrder: 3,
          },
        ],
      },
    },
    {
      slug: 'body-position-fundamentals',
      title: 'Body Position Fundamentals',
      sortOrder: 2,
      lessonContent: {
        blocks: [
          {
            type: 'text',
            content:
              'Your body position on the bike determines how well you can handle terrain, maintain traction, and stay in control.',
          },
        ],
      },
      status: 'published' as const,
      quiz: {
        title: 'Body Position Quiz',
        slug: 'body-position-quiz',
        difficulty: 'beginner' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt:
              'In the "attack position," where should your weight be centered?',
            options: {
              choices: [
                'Over the front wheel',
                'Over the rear wheel',
                'Over the bottom bracket (pedals)',
                'Evenly split between hands and feet',
              ],
              correctIndex: 2,
            },
            explanation:
              'The attack position centers your weight over the bottom bracket with bent elbows and knees, giving you maximum control and the ability to shift weight in any direction.',
            sortOrder: 1,
          },
          {
            type: 'true_false' as const,
            prompt:
              'You should grip the handlebars as tightly as possible for maximum control.',
            options: { correctAnswer: false },
            explanation:
              'A death grip leads to arm pump and fatigue. Keep a firm but relaxed grip, letting the bike move beneath you. Your arms should act as suspension.',
            sortOrder: 2,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'When descending steep terrain, you should shift your body weight:',
            options: {
              choices: [
                'Forward over the handlebars',
                'Low and behind the saddle',
                'Straight up and tall',
                'To one side of the bike',
              ],
              correctIndex: 1,
            },
            explanation:
              'On steep descents, shift your hips back and low behind the saddle. This prevents going over the bars and keeps your weight centered between the wheels.',
            sortOrder: 3,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'What should you do with your pedals when traversing a slope?',
            options: {
              choices: [
                'Keep the uphill pedal down',
                'Keep the downhill pedal down',
                'Keep both pedals level',
                'Pedal continuously',
              ],
              correctIndex: 1,
            },
            explanation:
              'Keeping the downhill pedal weighted helps maintain traction and balance on off-camber terrain. It drops your center of gravity and presses the tires into the slope.',
            sortOrder: 4,
          },
        ],
      },
    },
    {
      slug: 'braking-techniques',
      title: 'Braking Techniques',
      sortOrder: 3,
      lessonContent: {
        blocks: [
          {
            type: 'text',
            content:
              'Understanding how to brake effectively is just as important as knowing how to pedal. Proper braking technique keeps you safe and makes you faster.',
          },
        ],
      },
      status: 'published' as const,
      quiz: {
        title: 'Braking Techniques Quiz',
        slug: 'braking-techniques-quiz',
        difficulty: 'beginner' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt: 'Which brake provides the most stopping power?',
            options: {
              choices: [
                'Front brake',
                'Rear brake',
                'Both equally',
                'It depends on the terrain',
              ],
              correctIndex: 0,
            },
            explanation:
              'The front brake provides approximately 70% of your stopping power because weight transfers forward under braking. Learning to use it confidently is essential.',
            sortOrder: 1,
          },
          {
            type: 'true_false' as const,
            prompt:
              'You should brake before a corner, not during it.',
            options: { correctAnswer: true },
            explanation:
              'Braking in a corner reduces available traction for turning and can cause your wheels to wash out. Scrub speed before the corner and carry momentum through it.',
            sortOrder: 2,
          },
          {
            type: 'multiple_choice' as const,
            prompt: 'How many fingers should you use on each brake lever?',
            options: {
              choices: ['All four', 'Three', 'One', 'Two'],
              correctIndex: 2,
            },
            explanation:
              'Modern disc brakes are powerful enough to control with just one finger. This allows your other fingers to maintain a secure grip on the bars for better control.',
            sortOrder: 3,
          },
        ],
      },
    },
  ]

  for (const m of c1Modules) {
    const mod = await db.learnModule.create({
      data: {
        courseId: course1.id,
        slug: m.slug,
        title: m.title,
        sortOrder: m.sortOrder,
        lessonContent: m.lessonContent,
        status: m.status,
        createdAt: daysAgo(175),
      },
    })

    const quiz = await db.learnQuiz.create({
      data: {
        moduleId: mod.id,
        slug: m.quiz.slug,
        title: m.quiz.title,
        difficulty: m.quiz.difficulty,
        category: m.quiz.category,
        status: m.quiz.status,
        createdAt: daysAgo(175),
      },
    })

    for (const q of m.quiz.questions) {
      await db.learnQuestion.create({
        data: {
          quizId: quiz.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          explanation: q.explanation,
          sortOrder: q.sortOrder,
        },
      })
    }
  }

  // ── Course 2: Trail Riding Mastery ──
  const course2 = await db.learnCourse.create({
    data: {
      slug: 'trail-riding-mastery',
      title: 'Trail Riding Mastery',
      description:
        'Take your trail riding to the next level. Advanced cornering, line selection, and flow state — learn to ride with confidence and style on any terrain.',
      difficulty: 'intermediate',
      category: 'riding_skills',
      sortOrder: 2,
      status: 'published',
      createdAt: daysAgo(120),
    },
  })

  const c2Modules = [
    {
      slug: 'advanced-cornering',
      title: 'Advanced Cornering',
      sortOrder: 1,
      status: 'published' as const,
      quiz: {
        title: 'Advanced Cornering Quiz',
        slug: 'advanced-cornering-quiz',
        difficulty: 'intermediate' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt: 'In a flat corner, what creates traction?',
            options: {
              choices: [
                'Leaning your body into the turn',
                'Weighting the outside pedal and leaning the bike',
                'Braking through the turn',
                'Pedaling through the turn',
              ],
              correctIndex: 1,
            },
            explanation:
              'In flat corners without berms, you create traction by weighting your outside foot and pushing the bike into a lean while keeping your body relatively upright. This forces the tire knobs into the dirt.',
            sortOrder: 1,
          },
          {
            type: 'multiple_choice' as const,
            prompt: 'When riding a bermed corner, your body should be:',
            options: {
              choices: [
                'Perpendicular to the ground',
                'Perpendicular to the berm surface',
                'Leaning away from the berm',
                'Crouched as low as possible',
              ],
              correctIndex: 1,
            },
            explanation:
              'In a berm, stay perpendicular to the riding surface (the berm wall). This means your whole body leans with the berm, pressing both wheels into the supported surface for maximum grip.',
            sortOrder: 2,
          },
          {
            type: 'true_false' as const,
            prompt:
              'Looking through the exit of a corner before you enter it helps you ride it faster.',
            options: { correctAnswer: true },
            explanation:
              'Your bike follows your eyes. Looking ahead through the corner exit sets up your body position and line choice before you get there, resulting in smoother, faster cornering.',
            sortOrder: 3,
          },
          {
            type: 'multiple_choice' as const,
            prompt: 'What is "countersteering"?',
            options: {
              choices: [
                'Turning the bars the opposite direction before a corner to initiate lean',
                'Using the rear brake to steer in corners',
                'Shifting weight to the front wheel mid-corner',
                'Pedaling backward to slow down',
              ],
              correctIndex: 0,
            },
            explanation:
              'Countersteering is a brief push on the inside handlebar that initiates bike lean. At higher speeds, this is how you actually begin a turn — the bike leans into the corner and the bars follow.',
            sortOrder: 4,
          },
        ],
      },
    },
    {
      slug: 'line-selection',
      title: 'Line Selection',
      sortOrder: 2,
      status: 'published' as const,
      quiz: {
        title: 'Line Selection Quiz',
        slug: 'line-selection-quiz',
        difficulty: 'intermediate' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt:
              'When approaching a rock garden, you should look at:',
            options: {
              choices: [
                'Each individual rock to avoid',
                'The smooth line between the rocks',
                'Your front wheel',
                'The rider ahead of you',
              ],
              correctIndex: 1,
            },
            explanation:
              'Focus on the solution, not the problem. Look at the smooth path between obstacles, and your bike will naturally follow your vision. Fixating on rocks you want to avoid usually means you hit them.',
            sortOrder: 1,
          },
          {
            type: 'true_false' as const,
            prompt:
              'The fastest line through a trail section is always the smoothest one.',
            options: { correctAnswer: false },
            explanation:
              'Sometimes a rougher line that maintains momentum (like staying high on a berm or taking a direct line over a root) is faster than a smooth detour that requires braking and re-accelerating.',
            sortOrder: 2,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'On a trail with multiple root crossings, what angle should you try to cross roots at?',
            options: {
              choices: [
                'Parallel to the roots',
                'As close to perpendicular (90 degrees) as possible',
                'Any angle is fine',
                '45 degrees',
              ],
              correctIndex: 1,
            },
            explanation:
              'Crossing roots at a perpendicular angle minimizes the chance of your wheel sliding along the root. When you cross at a shallow angle, especially when wet, roots become very slippery.',
            sortOrder: 3,
          },
        ],
      },
    },
    {
      slug: 'finding-flow',
      title: 'Finding Flow',
      sortOrder: 3,
      status: 'published' as const,
      quiz: {
        title: 'Finding Flow Quiz',
        slug: 'finding-flow-quiz',
        difficulty: 'intermediate' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt: 'What is "pump" in mountain biking?',
            options: {
              choices: [
                'Inflating your tires on the trail',
                'Using body movements to generate speed without pedaling',
                'A type of trail feature',
                'A pedaling technique for climbs',
              ],
              correctIndex: 1,
            },
            explanation:
              'Pumping is the technique of pushing your bike into downslopes and unweighting over bumps to generate free speed. It is the foundation of flow riding.',
            sortOrder: 1,
          },
          {
            type: 'true_false' as const,
            prompt:
              'Flow state in mountain biking requires riding at maximum speed.',
            options: { correctAnswer: false },
            explanation:
              'Flow is about riding at a speed where your skills match the challenge. It is about smoothness, rhythm, and connection with the trail — not raw speed. Riding too fast actually breaks flow.',
            sortOrder: 2,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'How do you maintain speed through rolling terrain without pedaling?',
            options: {
              choices: [
                'Coast and let gravity do the work',
                'Pump into the downslopes and absorb the upslopes',
                'Brake before each upslope',
                'Shift to a lower gear',
              ],
              correctIndex: 1,
            },
            explanation:
              'By extending your body (pushing the bike down) into downslopes and compressing (absorbing) into upslopes, you harness the trail terrain to maintain and even gain speed. This is the fundamental pump technique.',
            sortOrder: 3,
          },
        ],
      },
    },
  ]

  for (const m of c2Modules) {
    const mod = await db.learnModule.create({
      data: {
        courseId: course2.id,
        slug: m.slug,
        title: m.title,
        sortOrder: m.sortOrder,
        status: m.status,
        createdAt: daysAgo(115),
      },
    })

    const quiz = await db.learnQuiz.create({
      data: {
        moduleId: mod.id,
        slug: m.quiz.slug,
        title: m.quiz.title,
        difficulty: m.quiz.difficulty,
        category: m.quiz.category,
        status: m.quiz.status,
        createdAt: daysAgo(115),
      },
    })

    for (const q of m.quiz.questions) {
      await db.learnQuestion.create({
        data: {
          quizId: quiz.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          explanation: q.explanation,
          sortOrder: q.sortOrder,
        },
      })
    }
  }

  // ── Course 3: Advanced Technique ──
  const course3 = await db.learnCourse.create({
    data: {
      slug: 'advanced-technique',
      title: 'Advanced Technique',
      description:
        'Push your limits with advanced techniques: jumps, drops, manuals, and technical climbing. For experienced riders ready to unlock the next level.',
      difficulty: 'advanced',
      category: 'riding_skills',
      sortOrder: 3,
      status: 'published',
      createdAt: daysAgo(90),
    },
  })

  const c3Modules = [
    {
      slug: 'jumping-and-drops',
      title: 'Jumping and Drops',
      sortOrder: 1,
      status: 'published' as const,
      quiz: {
        title: 'Jumping and Drops Quiz',
        slug: 'jumping-drops-quiz',
        difficulty: 'advanced' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt: 'What is the proper technique for hitting a tabletop jump?',
            options: {
              choices: [
                'Pull up hard on the bars at the lip',
                'Compress into the lip and let the jump shape launch you',
                'Lean back and lift the front wheel',
                'Pedal as hard as possible into the lip',
              ],
              correctIndex: 1,
            },
            explanation:
              'The jump itself does the work. Compress your body into the transition at the lip (like a pump), stay centered, and the jump shape will launch you. Pulling up leads to over-rotation.',
            sortOrder: 1,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'When dropping off a ledge, your front wheel should leave the edge:',
            options: {
              choices: [
                'At the same time as the rear',
                'After the rear wheel',
                'Before the rear wheel, with a slight front wheel lift',
                'It does not matter',
              ],
              correctIndex: 2,
            },
            explanation:
              'A slight front wheel lift as you leave the drop keeps you from nose-diving. The front wheel clears the edge first, allowing you to land both wheels together or slightly rear-first.',
            sortOrder: 2,
          },
          {
            type: 'true_false' as const,
            prompt:
              'Speed is always your friend when hitting jumps — the faster the better.',
            options: { correctAnswer: false },
            explanation:
              'Each jump has an optimal speed window. Too slow and you case the landing, too fast and you overshoot. Start slow and gradually increase speed until you are landing on the downslope consistently.',
            sortOrder: 3,
          },
          {
            type: 'multiple_choice' as const,
            prompt: 'If you feel like you are going to over-rotate (nose dive) in the air, you should:',
            options: {
              choices: [
                'Push the bars forward to extend your arms',
                'Pull the bars to your chest',
                'Kick the rear end of the bike out',
                'Tuck into a ball',
              ],
              correctIndex: 0,
            },
            explanation:
              'Pushing the bars forward (extending your arms) shifts the bike forward relative to your body, bringing the front end up. This is the primary correction for over-rotation.',
            sortOrder: 4,
          },
          {
            type: 'multiple_choice' as const,
            prompt: 'What is "dead sailor"?',
            options: {
              choices: [
                'A type of drop landing',
                'Being stiff and frozen in the air with no bike control',
                'A jump technique for beginners',
                'Riding with one hand off the bars',
              ],
              correctIndex: 1,
            },
            explanation:
              'Dead sailor describes a rider who is rigid and immobile in the air, unable to make corrections. It comes from fear and tension. Staying loose and active in the air is essential for safe jumping.',
            sortOrder: 5,
          },
        ],
      },
    },
    {
      slug: 'technical-climbing',
      title: 'Technical Climbing',
      sortOrder: 2,
      status: 'published' as const,
      quiz: {
        title: 'Technical Climbing Quiz',
        slug: 'technical-climbing-quiz',
        difficulty: 'advanced' as const,
        category: 'riding_skills' as const,
        status: 'published' as const,
        questions: [
          {
            type: 'multiple_choice' as const,
            prompt:
              'On a steep rocky climb, how should you distribute your weight?',
            options: {
              choices: [
                'All the way back for rear traction',
                'All the way forward for front traction',
                'Forward enough to keep the front down, back enough for rear traction',
                'Stand up and lean over the bars',
              ],
              correctIndex: 2,
            },
            explanation:
              'Technical climbing requires a balanced weight distribution. Too far back and the front wanders; too far forward and the rear spins. Find the sweet spot where both wheels maintain traction.',
            sortOrder: 1,
          },
          {
            type: 'true_false' as const,
            prompt:
              'Momentum is more important than gear selection on technical climbs.',
            options: { correctAnswer: true },
            explanation:
              'While being in the right gear matters, maintaining momentum is king on technical climbs. Shifting mid-obstacle often causes chain drops or stalls. Set your gear before the section and commit.',
            sortOrder: 2,
          },
          {
            type: 'multiple_choice' as const,
            prompt:
              'When climbing over a root step-up, you should:',
            options: {
              choices: [
                'Bunny hop over it',
                'Unweight the front, then drive the rear wheel over with a pedal stroke',
                'Dismount and walk',
                'Brake hard and inch over it',
              ],
              correctIndex: 1,
            },
            explanation:
              'For root step-ups during a climb: lighten the front wheel as it reaches the obstacle, then use a well-timed pedal stroke to drive the rear wheel up and over. Maintain forward momentum throughout.',
            sortOrder: 3,
          },
        ],
      },
    },
  ]

  for (const m of c3Modules) {
    const mod = await db.learnModule.create({
      data: {
        courseId: course3.id,
        slug: m.slug,
        title: m.title,
        sortOrder: m.sortOrder,
        status: m.status,
        createdAt: daysAgo(85),
      },
    })

    const quiz = await db.learnQuiz.create({
      data: {
        moduleId: mod.id,
        slug: m.quiz.slug,
        title: m.quiz.title,
        difficulty: m.quiz.difficulty,
        category: m.quiz.category,
        status: m.quiz.status,
        createdAt: daysAgo(85),
      },
    })

    for (const q of m.quiz.questions) {
      await db.learnQuestion.create({
        data: {
          quizId: quiz.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          explanation: q.explanation,
          sortOrder: q.sortOrder,
        },
      })
    }
  }

  console.log('    Created 3 courses, 8 modules, 8 quizzes, 27 questions')
}

async function seedTrailSystems(db: PrismaClient) {
  console.log('  Creating trail systems & trails...')

  // ── Whistler ──
  const whistler = await db.trailSystem.create({
    data: {
      name: 'Whistler Mountain Bike Park',
      slug: 'whistler-mountain-bike-park',
      description:
        'The legendary Whistler Mountain Bike Park in British Columbia. Over 80 trails spanning 4,900 vertical feet of lift-accessed downhill, cross-country, and everything in between. The gold standard of bike parks.',
      city: 'Whistler',
      state: 'BC',
      country: 'CA',
      latitude: 50.1163,
      longitude: -122.9574,
      websiteUrl: 'https://www.whistlerblackcomb.com/bike-park',
      systemType: 'bike_park',
      status: 'open',
      totalMiles: 0,
      trailCount: 0,
      createdAt: daysAgo(365),
    },
  })

  const whistlerTrails = [
    {
      name: 'A-Line',
      slug: 'whistler-a-line',
      description:
        'The most famous jump trail in the world. Perfectly sculpted tabletops, berms, and step-downs from top to bottom. A rite of passage for every mountain biker.',
      trailType: 'flow' as const,
      physicalDifficulty: 3,
      technicalDifficulty: 4,
      distance: 2.8,
      elevationGain: 50,
      elevationLoss: 1200,
      highPoint: 5020,
      lowPoint: 3820,
      status: 'open' as const,
      condition: 'tacky_perfect' as const,
    },
    {
      name: 'Crank It Up',
      slug: 'whistler-crank-it-up',
      description:
        'A flowy intermediate trail with berms, rollers, and optional features. Great progression from green trails to the bigger stuff.',
      trailType: 'flow' as const,
      physicalDifficulty: 2,
      technicalDifficulty: 3,
      distance: 3.1,
      elevationGain: 80,
      elevationLoss: 1100,
      highPoint: 4980,
      lowPoint: 3880,
      status: 'open' as const,
      condition: 'tacky_perfect' as const,
    },
    {
      name: 'Dirt Merchant',
      slug: 'whistler-dirt-merchant',
      description:
        'Iconic expert jump trail with massive gaps, technical rock features, and high-consequence drops. Not for the faint of heart.',
      trailType: 'freeride' as const,
      physicalDifficulty: 3,
      technicalDifficulty: 5,
      distance: 1.2,
      elevationGain: 20,
      elevationLoss: 600,
      highPoint: 4480,
      lowPoint: 3880,
      status: 'closed_construction' as const,
    },
    {
      name: 'B-Line',
      slug: 'whistler-b-line',
      description:
        'The perfect beginner trail. Smooth, flowy, with gentle berms and small rollers. If you can ride a bike, you can ride B-Line.',
      trailType: 'flow' as const,
      physicalDifficulty: 1,
      technicalDifficulty: 1,
      distance: 2.5,
      elevationGain: 30,
      elevationLoss: 900,
      highPoint: 4780,
      lowPoint: 3880,
      status: 'open' as const,
      condition: 'tacky_perfect' as const,
    },
    {
      name: 'Top of the World',
      slug: 'whistler-top-of-the-world',
      description:
        'Alpine XC trail that climbs above the treeline for panoramic views. Technical singletrack with exposure, rock slabs, and alpine meadows. The crown jewel of Whistler riding.',
      trailType: 'xc' as const,
      physicalDifficulty: 5,
      technicalDifficulty: 4,
      distance: 8.7,
      elevationGain: 2200,
      elevationLoss: 2200,
      highPoint: 7160,
      lowPoint: 4960,
      status: 'open' as const,
      condition: 'dry_fast' as const,
    },
  ]

  let totalMilesW = 0
  for (const t of whistlerTrails) {
    await db.trail.create({
      data: { ...t, trailSystemId: whistler.id, createdAt: daysAgo(300) },
    })
    totalMilesW += t.distance
  }
  await db.trailSystem.update({
    where: { id: whistler.id },
    data: {
      trailCount: whistlerTrails.length,
      totalMiles: Math.round(totalMilesW * 100) / 100,
    },
  })

  // ── Moab ──
  const moab = await db.trailSystem.create({
    data: {
      name: 'Moab Trail Network',
      slug: 'moab-trail-network',
      description:
        'The desert mecca of mountain biking. Slickrock sandstone, red dirt singletrack, and otherworldly landscapes. Moab offers riding unlike anywhere else on earth.',
      city: 'Moab',
      state: 'UT',
      country: 'US',
      latitude: 38.5733,
      longitude: -109.5498,
      websiteUrl: 'https://www.discovermoab.com/biking/',
      systemType: 'trail_network',
      status: 'open',
      totalMiles: 0,
      trailCount: 0,
      createdAt: daysAgo(365),
    },
  })

  const moabTrails = [
    {
      name: 'Slickrock Trail',
      slug: 'moab-slickrock-trail',
      description:
        'The legendary Slickrock Trail. 10.5 miles of pure Navajo sandstone with extreme traction, roller-coaster terrain, and unforgettable views of the La Sal Mountains. Physically demanding but technically accessible.',
      trailType: 'loop' as const,
      physicalDifficulty: 5,
      technicalDifficulty: 3,
      distance: 10.5,
      elevationGain: 1800,
      elevationLoss: 1800,
      highPoint: 4800,
      lowPoint: 4200,
      status: 'open' as const,
      condition: 'dry_fast' as const,
    },
    {
      name: 'Porcupine Rim',
      slug: 'moab-porcupine-rim',
      description:
        'A world-class point-to-point ride featuring exposed cliff-edge singletrack, technical rock gardens, and a 2,800-foot descent into Castle Valley. Best done as a shuttle.',
      trailType: 'shuttle' as const,
      physicalDifficulty: 4,
      technicalDifficulty: 5,
      distance: 14.0,
      elevationGain: 800,
      elevationLoss: 2800,
      highPoint: 6800,
      lowPoint: 4000,
      status: 'open' as const,
      condition: 'dry_dusty' as const,
    },
    {
      name: 'Bar M Loop',
      slug: 'moab-bar-m-loop',
      description:
        'A fun and accessible beginner loop through desert terrain with sandy washes and slickrock sections. Great for warming up or introducing friends to Moab riding.',
      trailType: 'loop' as const,
      physicalDifficulty: 2,
      technicalDifficulty: 2,
      distance: 7.8,
      elevationGain: 400,
      elevationLoss: 400,
      highPoint: 4400,
      lowPoint: 4100,
      status: 'open' as const,
      condition: 'dry_fast' as const,
    },
    {
      name: 'Whole Enchilada',
      slug: 'moab-whole-enchilada',
      description:
        'The ultimate Moab ride. A 26-mile shuttle descent from the La Sal Mountains to the Colorado River, passing through five distinct ecosystems. Alpine forest to desert floor — a bucket-list ride.',
      trailType: 'shuttle' as const,
      physicalDifficulty: 5,
      technicalDifficulty: 5,
      distance: 26.4,
      elevationGain: 1200,
      elevationLoss: 7500,
      highPoint: 11500,
      lowPoint: 4000,
      status: 'open' as const,
      condition: 'dry_dusty' as const,
    },
  ]

  let totalMilesM = 0
  for (const t of moabTrails) {
    await db.trail.create({
      data: { ...t, trailSystemId: moab.id, createdAt: daysAgo(280) },
    })
    totalMilesM += t.distance
  }
  await db.trailSystem.update({
    where: { id: moab.id },
    data: {
      trailCount: moabTrails.length,
      totalMiles: Math.round(totalMilesM * 100) / 100,
    },
  })

  // ── Kingdom Trails ──
  const kingdom = await db.trailSystem.create({
    data: {
      name: 'Kingdom Trails',
      slug: 'kingdom-trails',
      description:
        'The Northeast premier mountain biking destination. Over 100 miles of singletrack through rolling Vermont hills, classic hardwood forests, and pastoral farmland. Known for incredible flow trails and community-maintained perfection.',
      city: 'East Burke',
      state: 'VT',
      country: 'US',
      latitude: 44.5883,
      longitude: -71.9609,
      websiteUrl: 'https://kingdomtrails.org',
      systemType: 'trail_network',
      status: 'open',
      totalMiles: 0,
      trailCount: 0,
      createdAt: daysAgo(365),
    },
  })

  const kingdomTrails = [
    {
      name: 'Tap & Die',
      slug: 'kingdom-tap-and-die',
      description:
        'Flowy singletrack through birch and maple forest. Smooth berms, roots to play on, and a few punchy climbs. The quintessential Kingdom Trails experience.',
      trailType: 'flow' as const,
      physicalDifficulty: 3,
      technicalDifficulty: 3,
      distance: 3.2,
      elevationGain: 450,
      elevationLoss: 450,
      highPoint: 2200,
      lowPoint: 1800,
      status: 'open' as const,
      condition: 'tacky_perfect' as const,
    },
    {
      name: 'Kitchel',
      slug: 'kingdom-kitchel',
      description:
        'A beloved intermediate trail winding through hardwood forest. Technical roots, natural features, and that classic New England singletrack feel.',
      trailType: 'xc' as const,
      physicalDifficulty: 3,
      technicalDifficulty: 3,
      distance: 2.8,
      elevationGain: 380,
      elevationLoss: 380,
      highPoint: 2100,
      lowPoint: 1750,
      status: 'open' as const,
      condition: 'damp' as const,
    },
    {
      name: 'Sidewinder',
      slug: 'kingdom-sidewinder',
      description:
        'Brand new flow trail built for the 2024 season. Machine-built berms, progressive jumps, and smooth-as-butter tread. The future of Kingdom Trails.',
      trailType: 'flow' as const,
      physicalDifficulty: 2,
      technicalDifficulty: 2,
      distance: 1.8,
      elevationGain: 50,
      elevationLoss: 350,
      highPoint: 2100,
      lowPoint: 1750,
      status: 'open' as const,
      condition: 'tacky_perfect' as const,
    },
  ]

  let totalMilesK = 0
  for (const t of kingdomTrails) {
    await db.trail.create({
      data: { ...t, trailSystemId: kingdom.id, createdAt: daysAgo(250) },
    })
    totalMilesK += t.distance
  }
  await db.trailSystem.update({
    where: { id: kingdom.id },
    data: {
      trailCount: kingdomTrails.length,
      totalMiles: Math.round(totalMilesK * 100) / 100,
    },
  })

  console.log('    Created 3 trail systems, 12 trails')
}

async function seedEvents(db: PrismaClient, users: UserRecord[]) {
  console.log('  Creating events...')

  const [admin, instructor, mike, jess, dan] = users

  const events = [
    {
      creatorId: admin.id,
      title: 'Ride MTB Summer Kickoff Group Ride',
      slug: 'summer-kickoff-group-ride-2024',
      description:
        'Join us for the official Ride MTB summer season kickoff! All skill levels welcome. We will split into groups and ride for 2-3 hours followed by post-ride tacos. Bring water, helmet, and good vibes.',
      location: 'Sedona, AZ — Broken Arrow Trailhead',
      city: 'Sedona',
      state: 'AZ',
      latitude: 34.8281,
      longitude: -111.7677,
      startDate: daysFromNow(14),
      endDate: daysFromNow(14),
      maxAttendees: 50,
      eventType: 'group_ride' as const,
      status: 'published' as const,
      createdAt: daysAgo(7),
    },
    {
      creatorId: instructor.id,
      title: 'Women-Specific Skills Clinic: Cornering & Braking',
      slug: 'womens-skills-clinic-cornering-braking',
      description:
        'A 4-hour skills clinic focused on cornering and braking fundamentals in a supportive, women-only environment. Led by PMBIA-certified instructor Sarah Chen. All skill levels welcome. Bikes and helmets required, pads recommended.',
      location: 'Whistler, BC — Lost Lake Parking',
      city: 'Whistler',
      state: 'BC',
      latitude: 50.1221,
      longitude: -122.9482,
      startDate: daysFromNow(21),
      endDate: daysFromNow(21),
      maxAttendees: 12,
      eventType: 'skills_clinic' as const,
      status: 'published' as const,
      createdAt: daysAgo(5),
    },
    {
      creatorId: dan.id,
      title: 'Northwest Enduro Cup — Round 3',
      slug: 'nw-enduro-cup-round-3',
      description:
        'Round 3 of the NW Enduro Cup series at Galbraith Mountain. 5 timed stages, ~4000ft of descending. Categories from beginner to pro. Registration through NW Cup website.',
      location: 'Bellingham, WA — Galbraith Mountain',
      city: 'Bellingham',
      state: 'WA',
      latitude: 48.7294,
      longitude: -122.4244,
      startDate: daysFromNow(35),
      endDate: daysFromNow(36),
      maxAttendees: 200,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(14),
    },
    {
      creatorId: jess.id,
      title: 'Kingdom Trails Spring Trail Work Day',
      slug: 'kingdom-trails-spring-work-day',
      description:
        'Help us get the trails ready for the season! Tasks include clearing deadfall, repairing drainage, raking berms, and general trail maintenance. Tools provided. Free lunch and day pass for volunteers.',
      location: 'East Burke, VT — Kingdom Trails Welcome Center',
      city: 'East Burke',
      state: 'VT',
      latitude: 44.5883,
      longitude: -71.9609,
      startDate: daysFromNow(10),
      endDate: daysFromNow(10),
      maxAttendees: 40,
      eventType: 'trail_work' as const,
      status: 'published' as const,
      createdAt: daysAgo(10),
    },
    {
      creatorId: mike.id,
      title: 'Moab Desert Classic — Beginner Group Ride',
      slug: 'moab-desert-classic-beginner-ride',
      description:
        'A chill no-drop group ride through some of Moab best beginner-friendly trails. We will hit Bar M and Courthouse Loop. Perfect for riders new to desert riding. Bring at least 2 liters of water!',
      location: 'Moab, UT — Bar M Trailhead',
      city: 'Moab',
      state: 'UT',
      latitude: 38.6175,
      longitude: -109.5863,
      startDate: daysFromNow(28),
      endDate: daysFromNow(28),
      maxAttendees: 20,
      eventType: 'group_ride' as const,
      status: 'published' as const,
      createdAt: daysAgo(3),
    },
    // --- Additional events across major MTB destinations ---
    {
      creatorId: admin.id,
      title: 'Bentonville Ozark Enduro — Open Registration',
      slug: 'bentonville-ozark-enduro',
      description:
        'The Ozark Enduro returns to Bentonville! 6 stages on Slaughter Pen and Back 40 trails. Known as the friendliest race in the sport — party vibes, incredible singletrack, and Arkansas hospitality. All categories, beginner through elite.',
      location: 'Bentonville, AR — Slaughter Pen Trail System',
      city: 'Bentonville',
      state: 'AR',
      latitude: 36.3729,
      longitude: -94.2088,
      startDate: daysFromNow(42),
      endDate: daysFromNow(43),
      maxAttendees: 300,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(21),
    },
    {
      creatorId: instructor.id,
      title: 'Park City Bike Skills Camp — Intermediate',
      slug: 'park-city-skills-camp-intermediate',
      description:
        'Two-day skills camp at Park City Mountain Resort covering switchbacks, rock gardens, steep chutes, and jump technique. Small groups of 6. Lift-served laps included. Lunch provided both days.',
      location: 'Park City, UT — Park City Mountain Resort',
      city: 'Park City',
      state: 'UT',
      latitude: 40.6514,
      longitude: -111.5080,
      startDate: daysFromNow(30),
      endDate: daysFromNow(31),
      maxAttendees: 18,
      eventType: 'skills_clinic' as const,
      status: 'published' as const,
      createdAt: daysAgo(12),
    },
    {
      creatorId: dan.id,
      title: 'Pisgah Stage Race — 4-Day Epic',
      slug: 'pisgah-stage-race',
      description:
        'Four days of racing through the Pisgah National Forest — one of the most iconic enduro venues in North America. Rocky, rooty, relentless. All categories welcome. Camping on-site available.',
      location: 'Brevard, NC — Pisgah National Forest',
      city: 'Brevard',
      state: 'NC',
      latitude: 35.2315,
      longitude: -82.7343,
      startDate: daysFromNow(60),
      endDate: daysFromNow(63),
      maxAttendees: 150,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(30),
    },
    {
      creatorId: jess.id,
      title: 'Asheville Sunday Morning Ride',
      slug: 'asheville-sunday-morning-ride',
      description:
        'Weekly no-drop group ride from the Hub bike shop. Mixed ability — we split into three pace groups at the first junction. Post-ride breakfast at Button & Co. Bagels. Show up, sign the waiver, shred.',
      location: 'Asheville, NC — Bent Creek Experimental Forest',
      city: 'Asheville',
      state: 'NC',
      latitude: 35.5051,
      longitude: -82.6143,
      startDate: daysFromNow(7),
      endDate: daysFromNow(7),
      maxAttendees: 60,
      eventType: 'group_ride' as const,
      status: 'published' as const,
      createdAt: daysAgo(4),
    },
    {
      creatorId: mike.id,
      title: 'Downieville Classic — Downhill & XC',
      slug: 'downieville-classic',
      description:
        'The legendary Downieville Classic is back. 17 miles of descending from Packer Saddle to town. The XC course covers the full Sierra Buttes loop. One of the oldest MTB races in the country — come experience history.',
      location: 'Downieville, CA — Sierra Buttes Trail',
      city: 'Downieville',
      state: 'CA',
      latitude: 39.5596,
      longitude: -120.8310,
      startDate: daysFromNow(75),
      endDate: daysFromNow(76),
      maxAttendees: 400,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(45),
    },
    {
      creatorId: instructor.id,
      title: 'Copper Harbor Trail Work Weekend',
      slug: 'copper-harbor-trail-work',
      description:
        'Help us expand the Copper Harbor trail network! Weekend work sessions adding new flow trail segments and maintaining existing infrastructure. IMBA trail crew leading the effort. Free camping at the KOA, dinner provided Saturday night.',
      location: 'Copper Harbor, MI — Keweenaw Trail System',
      city: 'Copper Harbor',
      state: 'MI',
      latitude: 47.4678,
      longitude: -87.8830,
      startDate: daysFromNow(48),
      endDate: daysFromNow(49),
      maxAttendees: 50,
      eventType: 'trail_work' as const,
      status: 'published' as const,
      createdAt: daysAgo(8),
    },
    {
      creatorId: admin.id,
      title: 'Oakridge Shred Fest — Flow Trail Relay',
      slug: 'oakridge-shred-fest',
      description:
        'Teams of 3 compete in a relay format down Dead Mountain and Middle Fork trails. Oregon summer vibes, old-growth forest, and some of the fastest flow trails on the West Coast. After-party at Brewers Union Local 180.',
      location: 'Oakridge, OR — Larison Rock Trail',
      city: 'Oakridge',
      state: 'OR',
      latitude: 43.7443,
      longitude: -122.4581,
      startDate: daysFromNow(55),
      endDate: daysFromNow(55),
      maxAttendees: 120,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(20),
    },
    {
      creatorId: jess.id,
      title: 'Colorado Springs Ladies Ride — Fountain Creek',
      slug: 'colorado-springs-ladies-ride',
      description:
        'Women and non-binary riders welcome! Easy to intermediate pace through Fountain Creek Regional Park and Palmer Park. Ride finishes at a local brewery. No one gets left behind — this is a community, not a race.',
      location: 'Colorado Springs, CO — Palmer Park',
      city: 'Colorado Springs',
      state: 'CO',
      latitude: 38.8339,
      longitude: -104.8214,
      startDate: daysFromNow(12),
      endDate: daysFromNow(12),
      maxAttendees: 30,
      eventType: 'group_ride' as const,
      status: 'published' as const,
      createdAt: daysAgo(6),
    },
    {
      creatorId: dan.id,
      title: 'Tucson 24 Hours in the Old Pueblo',
      slug: 'tucson-24hr-old-pueblo',
      description:
        'The iconic 24-hour solo and team relay race in the Arizona desert. 17-mile loop through saguaro cactus, rocky washes, and ridgeline singletrack. Solo, duo, 4-person, and 5-person team categories. Night riding required.',
      location: 'Tucson, AZ — Rillito Regional Park',
      city: 'Tucson',
      state: 'AZ',
      latitude: 32.3065,
      longitude: -110.8750,
      startDate: daysFromNow(90),
      endDate: daysFromNow(91),
      maxAttendees: 500,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(60),
    },
    {
      creatorId: mike.id,
      title: 'Crested Butte Alpine Epic Ride',
      slug: 'crested-butte-alpine-epic',
      description:
        'Self-supported 50-mile epic through Crested Butte high country. Four significant climbs, stunning alpine views, and enough singletrack to keep you smiling for weeks. GPS route provided. This is not a race — it is an adventure.',
      location: 'Crested Butte, CO — Gothic Road',
      city: 'Crested Butte',
      state: 'CO',
      latitude: 38.8697,
      longitude: -106.9878,
      startDate: daysFromNow(68),
      endDate: daysFromNow(68),
      maxAttendees: 75,
      eventType: 'group_ride' as const,
      status: 'published' as const,
      createdAt: daysAgo(25),
    },
    {
      creatorId: instructor.id,
      title: 'Maui Mountain Bike Skills Retreat',
      slug: 'maui-skills-retreat',
      description:
        'Three days of guided riding and skills coaching at Haleakala and the Kahakapao trail system. Morning skills sessions, afternoon guided rides, evening talks on bike setup and nutrition. Limited to 10 riders. Truly a bucket-list experience.',
      location: 'Kula, HI — Kahakapao Recreation Area',
      city: 'Kula',
      state: 'HI',
      latitude: 20.7984,
      longitude: -156.3319,
      startDate: daysFromNow(80),
      endDate: daysFromNow(82),
      maxAttendees: 10,
      eventType: 'skills_clinic' as const,
      status: 'published' as const,
      createdAt: daysAgo(15),
    },
    {
      creatorId: admin.id,
      title: 'Bend Thursday Night MTB Series',
      slug: 'bend-thursday-night-series',
      description:
        'Weekly Thursday evening ride from Phil\'s Trailhead. Rotating routes through Tumalo Creek and Wanoga systems. All abilities, all bikes. Headlights required after 7pm. First one of the season — come meet your summer riding crew.',
      location: 'Bend, OR — Phil\'s Trailhead',
      city: 'Bend',
      state: 'OR',
      latitude: 44.0582,
      longitude: -121.3153,
      startDate: daysFromNow(4),
      endDate: daysFromNow(4),
      maxAttendees: 80,
      eventType: 'group_ride' as const,
      status: 'published' as const,
      createdAt: daysAgo(2),
    },
    {
      creatorId: jess.id,
      title: 'Fruita Fall Classic — Desert Race',
      slug: 'fruita-fall-classic',
      description:
        'Colorado\'s premier desert MTB race returns to the 18 Road trail system. Cross-country and enduro categories on world-class red dirt singletrack. Post-race BBQ at the campground. Camping available all weekend.',
      location: 'Fruita, CO — 18 Road Trail System',
      city: 'Fruita',
      state: 'CO',
      latitude: 39.1586,
      longitude: -108.7340,
      startDate: daysFromNow(95),
      endDate: daysFromNow(96),
      maxAttendees: 250,
      eventType: 'race' as const,
      status: 'published' as const,
      createdAt: daysAgo(40),
    },
  ]

  for (const e of events) {
    await db.event.create({ data: e })
  }

  console.log(`    Created ${events.length} events`)
}

async function seedShops(db: PrismaClient) {
  console.log('  Creating shops...')

  const shops = [
    {
      name: 'Sedona Bike & Bean',
      slug: 'sedona-bike-and-bean',
      description:
        'Full-service bike shop and coffee house in the heart of Sedona. Expert mechanics, premium rentals, and the best espresso in red rock country. Your one-stop before and after every ride.',
      address: '242 N State Route 89A',
      city: 'Sedona',
      state: 'AZ',
      zipCode: '86336',
      country: 'US',
      phone: '(928) 555-0142',
      email: 'info@sedonabikeandbean.com',
      websiteUrl: 'https://sedonabikeandbean.com',
      latitude: 34.8697,
      longitude: -111.7610,
      services: JSON.parse(
        JSON.stringify([
          'Full bike service & repair',
          'Suspension service',
          'Bike rentals (half & full day)',
          'Shuttle service',
          'Group ride guides',
          'Bike fitting',
          'Coffee bar',
        ]),
      ),
      brands: JSON.parse(
        JSON.stringify([
          'Santa Cruz',
          'Yeti',
          'Fox',
          'SRAM',
          'Maxxis',
          'Troy Lee Designs',
        ]),
      ),
      createdAt: daysAgo(200),
    },
    {
      name: 'Moab Cyclery',
      slug: 'moab-cyclery',
      description:
        'Moab premier mountain bike shop since 1998. Deep desert riding knowledge, demo fleet of the latest trail bikes, and mechanics who know every bolt on every bike.',
      address: '391 S Main St',
      city: 'Moab',
      state: 'UT',
      zipCode: '84532',
      country: 'US',
      phone: '(435) 555-0198',
      email: 'ride@moabcyclery.com',
      websiteUrl: 'https://moabcyclery.com',
      latitude: 38.5697,
      longitude: -109.5490,
      services: JSON.parse(
        JSON.stringify([
          'Full bike service & repair',
          'Bike rentals & demos',
          'Shuttle service to trailheads',
          'Custom wheel builds',
          'Tubeless conversions',
          'Trail maps & beta',
        ]),
      ),
      brands: JSON.parse(
        JSON.stringify([
          'Ibis',
          'Evil',
          'Shimano',
          'RockShox',
          'WTB',
          'Ergon',
        ]),
      ),
      createdAt: daysAgo(365),
    },
    {
      name: 'Village Sport Shop',
      slug: 'village-sport-shop',
      description:
        'Family-owned shop in East Burke serving the Kingdom Trails community since 2005. Rentals, repairs, day passes, and local trail knowledge from the people who built and maintain the trails.',
      address: '511 Broad St',
      city: 'East Burke',
      state: 'VT',
      zipCode: '05832',
      country: 'US',
      phone: '(802) 555-0167',
      email: 'hello@villagesportshop.com',
      websiteUrl: 'https://villagesportshop.com',
      latitude: 44.5886,
      longitude: -71.9606,
      services: JSON.parse(
        JSON.stringify([
          'Full bike service & repair',
          'Bike rentals',
          'Kingdom Trails day passes',
          'Trail maps & guided rides',
          'Kids bike program',
          'Seasonal storage',
        ]),
      ),
      brands: JSON.parse(
        JSON.stringify([
          'Trek',
          'Specialized',
          'Fox',
          'Shimano',
          'Maxxis',
          'Pearl Izumi',
        ]),
      ),
      createdAt: daysAgo(300),
    },
  ]

  for (const s of shops) {
    await db.shop.create({ data: s })
  }

  console.log(`    Created ${shops.length} shops`)
}

async function seedGearReviews(db: PrismaClient, users: UserRecord[]) {
  console.log('  Creating gear reviews...')

  const [admin, instructor, mike, , dan] = users

  const reviews = [
    {
      userId: admin.id,
      title: 'Santa Cruz Megatower V3 — The Do-Everything Enduro Bike',
      slug: 'santa-cruz-megatower-v3-review',
      category: 'bikes' as const,
      brand: 'Santa Cruz',
      productName: 'Megatower V3',
      rating: 5,
      pros: 'Incredible descending capability. VPP suspension is plush yet pedals well. Carbon frame is stiff and light. Geometry is perfect for aggressive trail and enduro racing. Lifetime frame warranty.',
      cons: 'Expensive. The stock build spec could include better brakes. Heavy compared to shorter-travel bikes (obviously). Not the fastest climber in the category.',
      content:
        "I've been on the Megatower V3 for about 6 months now and it has completely changed how I ride. The 160mm rear / 170mm fork combo eats everything. Rock gardens that used to rattle my fillings are just background noise. The VPP suspension platform has this incredible ability to stay composed at speed — it never packs up or wallows. On climbs, it's not going to win any XC races, but for an enduro bike it pedals shockingly well in the middle shock setting. The geo update (steeper seat tube, longer reach) puts you in a perfect position for both climbing and descending. Build quality is Santa Cruz through and through — everything is dialed. If you ride aggressive terrain and want one bike that does it all, this is it.",
      createdAt: daysAgo(45),
    },
    {
      userId: dan.id,
      title: 'Fox 38 Factory — The Gravity Fork Benchmark',
      slug: 'fox-38-factory-review',
      category: 'suspension' as const,
      brand: 'Fox',
      productName: '38 Factory GRIP2',
      rating: 5,
      pros: 'Incredibly stiff 38mm chassis. GRIP2 damper offers amazing tunability. Smooth throughout the travel. Kashima coating reduces friction. Excellent big-hit performance.',
      cons: 'Expensive. Heavier than the 36. GRIP2 has a lot of adjustments which can be overwhelming for beginners. Requires regular maintenance for peak performance.',
      content:
        "Upgraded from a Fox 36 to the 38 and the difference in stiffness is immediately noticeable. On steep, chunky terrain, the 38's chassis doesn't flex or deflect — your line holds true through the worst rock gardens. The GRIP2 damper is the real star though. High and low speed compression plus rebound gives you ridiculous control over the fork's behavior. I run the LSC pretty open for trail compliance and lean on the HSC for big hit support. Takes some time to dial in but once you find your settings, it's magic. The small bump sensitivity is excellent for a fork this burly. If you ride hard and fast in gnarly terrain, the 38 is the fork.",
      createdAt: daysAgo(30),
    },
    {
      userId: instructor.id,
      title: 'Giro Switchblade MIPS — Versatile Full Face Helmet',
      slug: 'giro-switchblade-mips-review',
      category: 'helmets' as const,
      brand: 'Giro',
      productName: 'Switchblade MIPS',
      rating: 4,
      pros: 'Removable chin bar is a game-changer. MIPS protection. Comfortable for all-day use. Good ventilation with chin bar off. Certified for both half-shell and full-face use.',
      cons: 'Heavier than dedicated half-shell helmets. Chin bar attachment points collect dirt. Pricey for what it is. Visor adjustment range is limited.',
      content:
        "As an instructor who teaches everything from beginner XC to advanced downhill, I need a helmet that does it all. The Switchblade comes close. The removable chin bar means I can clip it on for bike park or advanced skills sessions, then pop it off for XC days. The MIPS liner provides peace of mind, and the fit system is comfortable enough for 6+ hour days. Ventilation is solid with the chin bar off, though it does get warm when fully sealed up. My main gripe is the weight — it's noticeably heavier than my dedicated half-shell. But the convenience of one helmet for everything makes it worth the trade-off. If you ride a variety of disciplines, this is a smart choice.",
      createdAt: daysAgo(25),
    },
    {
      userId: mike.id,
      title: 'Maxxis Assegai / DHR II Combo — The Perfect Tire Pairing',
      slug: 'maxxis-assegai-dhr-ii-combo-review',
      category: 'wheels' as const,
      brand: 'Maxxis',
      productName: 'Assegai (F) / DHR II (R)',
      rating: 4,
      pros: 'Best cornering grip available (Assegai front). DHR II is a great all-rounder for the rear. Predictable traction in all conditions. MaxxTerra compound is durable. Tubeless setup is easy.',
      cons: 'Heavy. Rolls slower than XC-oriented tires. Assegai wears faster on the rear (don not put it there). Expensive when buying the premium casing options.',
      content:
        "This tire combo has become the industry standard for trail and enduro for good reason. The Assegai front gives you cornering confidence that borders on reckless — you can lean the bike over further than you ever thought possible and it just grips. The open tread pattern clears mud well too. On the rear, the DHR II strikes a great balance between grip and rolling speed. The transition knobs give you predictable breakaway when the rear slides, and it brakes well in a straight line. I run the EXO+ casing in MaxxTerra compound and get about 500 miles before they need replacing. Not cheap, not light, but nothing corners better.",
      createdAt: daysAgo(18),
    },
    {
      userId: admin.id,
      title: 'PNW Rainier Gen 3 Dropper Post — Budget Dropper Champion',
      slug: 'pnw-rainier-gen-3-dropper-review',
      category: 'cockpit' as const,
      brand: 'PNW Components',
      productName: 'Rainier Gen 3',
      rating: 4,
      pros: 'Incredible value for money. Smooth and reliable action. Internally routed. Multiple travel options. PNW customer service is excellent. 3-year warranty.',
      cons: 'Not quite as smooth as a BikeYoke Revive or Fox Transfer. Slightly heavier than premium options. Remote lever is functional but basic. Cartridge is not user-serviceable.',
      content:
        "The PNW Rainier Gen 3 is proof that you don't need to spend $300+ on a dropper post. At around $180, it delivers 90% of the performance of posts costing twice as much. The action is smooth, the return speed is consistent, and I have had zero issues over 8 months of hard riding. The internal routing is clean, and PNW offers enough travel options to fit virtually any frame. Where it falls slightly short of the premium droppers is in the silkiness of the action — a Revive or Transfer feels just a touch more buttery. But for the price? Absolute no-brainer. If you're upgrading from a fixed post or replacing a worn-out dropper on a budget, the Rainier Gen 3 is the answer.",
      createdAt: daysAgo(10),
    },
  ]

  for (const r of reviews) {
    await db.gearReview.create({ data: r })
  }

  console.log(`    Created ${reviews.length} gear reviews`)
}

async function seedXpAggregates(db: PrismaClient, users: UserRecord[]) {
  console.log('  Creating XP aggregates...')

  const [admin, instructor, mike, jess, dan] = users

  const aggregates = [
    {
      userId: admin.id,
      totalXp: 12450,
      moduleBreakdown: {
        forum: 3200,
        learn: 4500,
        trails: 2100,
        events: 1200,
        reviews: 850,
        rides: 600,
      },
      streakDays: 15,
      lastGrantAt: daysAgo(0),
    },
    {
      userId: instructor.id,
      totalXp: 9800,
      moduleBreakdown: {
        forum: 2800,
        learn: 3600,
        trails: 1500,
        events: 900,
        reviews: 600,
        rides: 400,
      },
      streakDays: 8,
      lastGrantAt: daysAgo(1),
    },
    {
      userId: mike.id,
      totalXp: 4200,
      moduleBreakdown: {
        forum: 1500,
        learn: 1200,
        trails: 800,
        events: 300,
        reviews: 200,
        rides: 200,
      },
      streakDays: 3,
      lastGrantAt: daysAgo(3),
    },
    {
      userId: jess.id,
      totalXp: 1100,
      moduleBreakdown: {
        forum: 400,
        learn: 350,
        trails: 150,
        events: 100,
        reviews: 0,
        rides: 100,
      },
      streakDays: 1,
      lastGrantAt: daysAgo(5),
    },
    {
      userId: dan.id,
      totalXp: 7500,
      moduleBreakdown: {
        forum: 2200,
        learn: 2000,
        trails: 1800,
        events: 600,
        reviews: 500,
        rides: 400,
      },
      streakDays: 5,
      lastGrantAt: daysAgo(2),
    },
  ]

  for (const a of aggregates) {
    await db.xpAggregate.create({ data: a })
  }

  console.log(`    Created ${aggregates.length} XP aggregates`)
}

// ── Clear Database ───────────────────────────────────────────

async function clearDatabase(db: PrismaClient) {
  console.log('  Clearing existing data...')

  // Delete in reverse FK-dependency order
  await db.bikeServiceLog.deleteMany()
  await db.userBike.deleteMany()
  await db.mediaItem.deleteMany()
  await db.listing.deleteMany()
  await db.merchProduct.deleteMany()
  await db.coachProfile.deleteMany()
  await db.shop.deleteMany()
  await db.gearReview.deleteMany()
  await db.eventRsvp.deleteMany()
  await db.event.deleteMany()
  await db.trailFavorite.deleteMany()
  await db.trailReview.deleteMany()
  await db.rideLog.deleteMany()
  await db.trailGpsTrack.deleteMany()
  await db.trail.deleteMany()
  await db.trailSystem.deleteMany()
  await db.learnCertificate.deleteMany()
  await db.learnProgress.deleteMany()
  await db.learnQuizAttempt.deleteMany()
  await db.learnQuestion.deleteMany()
  await db.learnQuiz.deleteMany()
  await db.learnModule.deleteMany()
  await db.learnCourse.deleteMany()
  await db.forumVote.deleteMany()
  await db.forumPost.deleteMany()
  await db.forumThread.deleteMany()
  await db.forumCategory.deleteMany()
  await db.xpGrant.deleteMany()
  await db.xpAggregate.deleteMany()
  await db.notification.deleteMany()
  await db.session.deleteMany()
  await db.account.deleteMany()
  await db.verificationToken.deleteMany()
  await db.user.deleteMany()

  console.log('    Cleared all tables')
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const db = createDb()

  try {
    console.log('🌱 Seeding database...\n')

    await clearDatabase(db)
    console.log()

    const users = await seedUsers(db)
    const categories = await seedForumCategories(db)
    await seedForumThreads(db, categories, users)
    await seedLearnCourses(db)
    await seedTrailSystems(db)
    await seedEvents(db, users)
    await seedShops(db)
    await seedGearReviews(db, users)
    await seedXpAggregates(db, users)

    console.log('\n✅ Seed complete!')
    console.log('   Accounts: admin@ridemtb.com / instructor@ridemtb.com')
    console.log('   Password: password123 (all accounts)')
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
