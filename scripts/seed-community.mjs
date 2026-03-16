/**
 * Community seed: 100 realistic U.S. first-time users
 * Additive only — never deletes existing data.
 * Run: node scripts/seed-community.mjs
 */

import pg from 'pg'
import fs from 'fs'
import { randomUUID } from 'crypto'

const { Pool } = pg

function getPassword() {
  const raw = fs.readFileSync('.env.local', 'utf8')
  const m = raw.match(/DATABASE_PASSWORD=([^\n]+)/)
  return m ? m[1].replace(/^"|"$/g, '').trim() : null
}

const db = new pg.Pool({
  host: 'aws-1-us-west-1.pooler.supabase.com',
  user: 'postgres.ulvnbvmtzzqruaaozhrr',
  password: getPassword(),
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  max: 5,
})

// bcrypt hash of "password123"
const PW = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36PqSy0z/h7GnGh3r8Gnuvy'

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000)
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function between(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

// ── XP values (mirrors src/shared/constants/xp-values.ts) ────────────────────
const XP = {
  forum_post_created: 10,
  forum_thread_created: 15,
  learn_quiz_completed: 25,
  learn_module_completed: 50,
  learn_course_completed: 200,
  trail_review_submitted: 10,
  ride_logged: 3,
  review_submitted: 10,
  event_attended: 20,
}

// ── Existing IDs (queried beforehand) ────────────────────────────────────────
const CAT = {
  general:  'cmmnr9y360005ihnig7wnhtf8',
  trails:   'cmmnr9y540006ihnibnfhmhlt',
  bikeTech: 'cmmnr9y750007ihnigtkdduwu',
  skills:   'cmmnr9y940008ihniaahzdz5k',
  events:   'cmmnr9yb60009ihniua4r9l13',
  buySell:  'cmmnr9yd4000aihnilqva4uo8',
}

const QUIZ_IDS = [
  '21843de1-8d12-4932-9d9f-540c7578912e', // riding-position-quiz
  '8329585a-4424-40b3-8049-8ec4a237cc0b', // braking-technique-quiz
  '9ec0f41e-1079-4553-957e-63fad8227cb8', // pedaling-tips-quiz
  '4787ea73-99e5-4afa-9c8a-70dcf8c33931', // overcoming-fear-quiz
  'c461b643-1cf9-4e5b-9a16-a91d4657e0d4', // flat-turns-quiz
  '3467ee94-e659-403f-9f8c-923f4ada3bd2', // bermed-corners-quiz
  '8e1fcdef-5271-44e5-ab67-0dd7bd248578', // pumping-quiz
  '91c2ea8e-3288-499f-8b5e-31687816111f', // bunny-hops-quiz
  '3fa7f6b3-c4de-462b-8800-6d6916b2762e', // easy-jumping-quiz
  'ba852f19-5803-42fc-9cc0-41f9f13d6fde', // common-jumping-techniques-quiz
  'f60da43a-0038-4117-b4f0-20a52661131f', // drops-quiz
  '509fdd0e-58b0-4892-b9ab-278543b48c7f', // landings-quiz
  '61cc8527-fa0b-4f28-87dd-698c9d1a0dde', // wheelies-quiz
  '51edc934-6ca5-4968-9f98-7b48338b7ec8', // manuals-quiz
]

const TRAIL_SYSTEM_IDS = [
  '9df0977a-cf4d-4f99-9e10-c56121d5de58', // Porcupine Rim
  'ca1161f1-1ce8-4ced-9f5f-6c0328489e42', // Slickrock Trail
  '615c869b-6fe0-449c-aa7f-0b84a9537e16', // Slaughter Pen
  '0f487f0d-32c2-476e-b19d-bc3fd5eac0c7', // Sedona Red Rock
  'aba8867b-667c-4012-b6a8-55a7a5de440a', // Moab Trails
  '883a2ead-b3dc-4ded-97ba-357792c2a057', // St. George Trails
  '15585e23-614c-45b4-95ee-6aae9f6d1969', // Phoenix Trails
]

// ── 100 users ─────────────────────────────────────────────────────────────────
// tier: 0=ghost, 1=lurker, 2=learner, 3=active, 4=power
const USERS = [
  // ── GHOST (registered, no activity) ──────────────────────────────────────
  { name:'Ryan Foster',      username:'ryanfoster',    email:'ryan.foster.mtb@example.com',    location:'Austin, TX',            skill:'beginner',     style:'Cross-country',     years:1, bio:'Just getting into MTB after years of road cycling.',                                  tier:0, joinDays:14 },
  { name:'Kayla Brooks',     username:'kaylabrooks',   email:'kayla.brooks94@example.com',     location:'Nashville, TN',          skill:'beginner',     style:'Cross-country',     years:1, bio:'Friend dragged me onto trails. Now I can\'t stop thinking about it.',                 tier:0, joinDays:7  },
  { name:'Marcus Webb',      username:'marcuswebb',    email:'marcus.webb@example.com',        location:'Columbus, OH',           skill:'beginner',     style:'Trail',             years:1, bio:'Picked up a Walmart hardtail. Already know I need a real bike.',                      tier:0, joinDays:21 },
  { name:'Priya Nair',       username:'priyanair',     email:'priya.nair.rides@example.com',   location:'San Jose, CA',           skill:'beginner',     style:'Cross-country',     years:1, bio:'Training for my first trail race. Very nervous.',                                     tier:0, joinDays:10 },
  { name:'Derrick Stone',    username:'derrickstone',  email:'derrick.stone@example.com',      location:'Kansas City, MO',        skill:'beginner',     style:'Trail',             years:1, bio:'Just moved to KC. Looking for local trail recommendations.',                          tier:0, joinDays:5  },
  { name:'Hannah Pierce',    username:'hannahpierce',  email:'hannah.pierce.mtb@example.com',  location:'Indianapolis, IN',       skill:'beginner',     style:'Cross-country',     years:1, bio:'Recovering from a road bike crash, trying something more exciting.',                  tier:0, joinDays:30 },
  { name:'Noah Sullivan',    username:'noahsullivan',  email:'noah.sullivan99@example.com',    location:'Memphis, TN',            skill:'beginner',     style:'Trail',             years:1, bio:'College student. Biking to class turned into trail biking somehow.',                  tier:0, joinDays:18 },
  { name:'Olivia Grant',     username:'oliviagrant',   email:'olivia.grant.mtb@example.com',   location:'Louisville, KY',         skill:'beginner',     style:'Cross-country',     years:1, bio:'My partner rides enduro. I ride XC. We compromise on trail bikes.',                   tier:0, joinDays:45 },
  { name:'Elijah Bauer',     username:'elijahbauer',   email:'elijah.bauer@example.com',       location:'Minneapolis, MN',        skill:'beginner',     style:'Trail',             years:1, bio:'Minnesota doesn\'t have mountains but I\'m going to find some.',                     tier:0, joinDays:12 },
  { name:'Sophia Castillo',  username:'sophiacastillo',email:'sophia.castillo@example.com',    location:'El Paso, TX',            skill:'beginner',     style:'Cross-country',     years:1, bio:'Franklin Mountains are underrated. Found out there are trails here!',                tier:0, joinDays:8  },
  { name:'Aiden Russo',      username:'aidenrusso',    email:'aiden.russo.mtb@example.com',    location:'Providence, RI',         skill:'beginner',     style:'Trail',             years:1, bio:'New England singletrack is no joke. Currently scared of roots.',                      tier:0, joinDays:25 },
  { name:'Isabella Holt',    username:'isabellaholt',  email:'isabella.holt@example.com',      location:'Richmond, VA',           skill:'beginner',     style:'Cross-country',     years:1, bio:'Pocahontas State Park regular. Learning the basics.',                                 tier:0, joinDays:35 },
  { name:'Caleb Flynn',      username:'calebflynn',    email:'caleb.flynn.mtb@example.com',    location:'Oklahoma City, OK',      skill:'beginner',     style:'Trail',             years:1, bio:'Oklahoma has more trails than people think. Slowly finding them all.',                tier:0, joinDays:15 },
  { name:'Mia Thornton',     username:'miathornton',   email:'mia.thornton@example.com',       location:'Baton Rouge, LA',        skill:'beginner',     style:'Cross-country',     years:1, bio:'Louisiana is flat. Driving to Arkansas to ride.',                                     tier:0, joinDays:20 },
  { name:'Liam Pearson',     username:'liampearson',   email:'liam.pearson.rides@example.com', location:'Omaha, NE',              skill:'beginner',     style:'Trail',             years:1, bio:'Midwest represent. Fontenelle Forest trails are my starting point.',                  tier:0, joinDays:9  },
  { name:'Emma Barker',      username:'emmabarker',    email:'emma.barker.mtb@example.com',    location:'Des Moines, IA',         skill:'beginner',     style:'Cross-country',     years:1, bio:'Iowa trails are surprisingly fun. Who knew?',                                         tier:0, joinDays:27 },
  { name:'Jackson Murray',   username:'jacksonmurray', email:'jackson.murray@example.com',     location:'Little Rock, AR',        skill:'beginner',     style:'Trail',             years:1, bio:'Bentonville proximity is dangerous for my wallet.',                                   tier:0, joinDays:11 },
  { name:'Amelia Payne',     username:'ameliapayne',   email:'amelia.payne.mtb@example.com',   location:'Albuquerque, NM',        skill:'beginner',     style:'Cross-country',     years:1, bio:'Sandia Mountains are right there. No more excuses.',                                  tier:0, joinDays:40 },
  { name:'Logan Burke',      username:'loganburke',    email:'logan.burke.mtb@example.com',    location:'Wichita, KS',            skill:'beginner',     style:'Trail',             years:1, bio:'Flint Hills by gravel, everywhere else by trail.',                                    tier:0, joinDays:6  },
  { name:'Charlotte Fox',    username:'charlottefox',  email:'charlotte.fox@example.com',      location:'Raleigh, NC',            skill:'beginner',     style:'Cross-country',     years:1, bio:'Falls Lake trails are where I started. Slowly progressing.',                         tier:0, joinDays:50 },

  // ── LURKER (1-2 quizzes completed) ───────────────────────────────────────
  { name:'Tyler Nash',       username:'tylernash',     email:'tyler.nash.mtb@example.com',     location:'Phoenix, AZ',            skill:'beginner',     style:'Trail',             years:2, bio:'Phoenix trails are my playground. Learning the basics here.',                        tier:1, joinDays:60  },
  { name:'Grace Simmons',    username:'gracesimmons',  email:'grace.simmons@example.com',      location:'Salt Lake City, UT',     skill:'beginner',     style:'Cross-country',     years:2, bio:'Came for the skiing, stayed for the trails.',                                         tier:1, joinDays:75  },
  { name:'Brendan Walsh',    username:'brendanwalsh',  email:'brendan.walsh@example.com',      location:'Flagstaff, AZ',          skill:'intermediate', style:'All-mountain',      years:3, bio:'7,000 feet elevation and endless singletrack. AZ is underrated.',                    tier:1, joinDays:80  },
  { name:'Natalie Cruz',     username:'nataliecruz',   email:'natalie.cruz.mtb@example.com',   location:'Denver, CO',             skill:'beginner',     style:'Cross-country',     years:1, bio:'Just moved from Chicago. The Front Range is overwhelming in the best way.',           tier:1, joinDays:55  },
  { name:'Owen Barrett',     username:'owenbarrett',   email:'owen.barrett@example.com',       location:'Tucson, AZ',             skill:'intermediate', style:'Trail',             years:3, bio:'Tucson doesn\'t get enough credit. Saguaro trails are legit.',                      tier:1, joinDays:90  },
  { name:'Madison Cooper',   username:'madisoncooper', email:'madison.cooper.mtb@example.com', location:'Colorado Springs, CO',   skill:'beginner',     style:'Cross-country',     years:2, bio:'Pikes Peak is my background. Trails are my foreground.',                             tier:1, joinDays:65  },
  { name:'Gavin Marsh',      username:'gavinmarsh',    email:'gavin.marsh@example.com',        location:'Boise, ID',              skill:'intermediate', style:'All-mountain',      years:4, bio:'Boise is a hidden gem for trail riding. Hulls Gulch is my warm-up.',                 tier:1, joinDays:100 },
  { name:'Lily Chambers',    username:'lilychambers',  email:'lily.chambers@example.com',      location:'Portland, OR',           skill:'beginner',     style:'Cross-country',     years:2, bio:'Powell Butte regular. Working up to Forest Park.',                                   tier:1, joinDays:70  },
  { name:'Ethan Graves',     username:'ethangraves',   email:'ethan.graves.mtb@example.com',   location:'Sacramento, CA',         skill:'intermediate', style:'Trail',             years:3, bio:'Auburn SRA on weekdays, Tahoe on weekends. California is too good.',                  tier:1, joinDays:85  },
  { name:'Chloe Patterson',  username:'chloepatterson',email:'chloe.patterson@example.com',    location:'Las Vegas, NV',          skill:'beginner',     style:'Cross-country',     years:1, bio:'Vegas has trails! Bootleg Canyon changed my life.',                                   tier:1, joinDays:58  },
  { name:'Julian Ross',      username:'julianross',    email:'julian.ross.mtb@example.com',    location:'Scottsdale, AZ',         skill:'intermediate', style:'Trail',             years:4, bio:'McDowell Mountain is my office. Whiskey Off-Road is my super bowl.',                 tier:1, joinDays:95  },
  { name:'Avery Mitchell',   username:'averymitchell', email:'avery.mitchell@example.com',     location:'Bend, OR',               skill:'beginner',     style:'Cross-country',     years:1, bio:'Phil\'s Trail is where I learned to ride singletrack. Perfect intro.',               tier:1, joinDays:72  },
  { name:'Zachary Hunt',     username:'zacharyhunt',   email:'zachary.hunt@example.com',       location:'Spokane, WA',            skill:'intermediate', style:'All-mountain',      years:3, bio:'Bowl and Pitcher never gets old. Riverside State Park crew.',                        tier:1, joinDays:88  },
  { name:'Sofia Morgan',     username:'sofiamorgan',   email:'sofia.morgan.mtb@example.com',   location:'Chico, CA',              skill:'beginner',     style:'Trail',             years:2, bio:'North Rim trail is my happy place. Local trails forever.',                           tier:1, joinDays:62  },
  { name:'Wyatt Price',      username:'wyattprice',    email:'wyatt.price@example.com',        location:'Moab, UT',               skill:'intermediate', style:'XC / Trail',        years:4, bio:'Moved to Moab two years ago. Best decision ever made.',                               tier:1, joinDays:110 },
  { name:'Penelope Ward',    username:'penelopeward',  email:'penelope.ward@example.com',      location:'Asheville, NC',          skill:'beginner',     style:'Cross-country',     years:1, bio:'Blue Ridge is the perfect place to start mountain biking.',                          tier:1, joinDays:67  },
  { name:'Elias Hicks',      username:'eliashicks',    email:'elias.hicks.mtb@example.com',    location:'Burlington, VT',         skill:'intermediate', style:'All-mountain',      years:3, bio:'Kingdom Trails is 45 minutes away. I go every weekend.',                             tier:1, joinDays:93  },
  { name:'Hazel Larson',     username:'hazellarson',   email:'hazel.larson@example.com',       location:'Duluth, MN',             skill:'beginner',     style:'Cross-country',     years:2, bio:'Duluth is secretly one of the best trail towns in the Midwest.',                     tier:1, joinDays:78  },
  { name:'Sebastian Cross',  username:'sebastiancross', email:'sebastian.cross@example.com',   location:'Steamboat Springs, CO',  skill:'intermediate', style:'Trail',             years:3, bio:'Emerald Mountain has 40 miles of trail. I haven\'t found the end yet.',              tier:1, joinDays:105 },
  { name:'Aurora James',     username:'aurorajames',   email:'aurora.james.mtb@example.com',   location:'Helena, MT',             skill:'beginner',     style:'Cross-country',     years:1, bio:'Mount Helena trail system is my backyard. Lucky to have it.',                        tier:1, joinDays:48  },

  // ── LEARNER (multiple quizzes, some forum activity) ───────────────────────
  { name:'Cole Harrison',    username:'coleharrison',  email:'cole.harrison.mtb@example.com',  location:'Fruita, CO',             skill:'intermediate', style:'All-mountain',      years:4, bio:'18 Road trails have ruined all other trails for me.',                                tier:2, joinDays:120 },
  { name:'Maya Dixon',       username:'mayadixon',     email:'maya.dixon@example.com',         location:'Crested Butte, CO',      skill:'intermediate', style:'XC / Trail',        years:3, bio:'401 trail is religion. CB has the best singletrack in Colorado.',                    tier:2, joinDays:130 },
  { name:'Finn McCarthy',    username:'finnmccarthy',  email:'finn.mccarthy@example.com',      location:'Harrisonburg, VA',       skill:'intermediate', style:'All-mountain',      years:4, bio:'Massanutten and Shenandoah have more than enough rock gardens for me.',              tier:2, joinDays:135 },
  { name:'Isla Reed',        username:'islareed',      email:'isla.reed.mtb@example.com',      location:'Bentonville, AR',        skill:'intermediate', style:'Flow trail',        years:3, bio:'OZ Trails is legit. Bentonville deserves all the hype.',                             tier:2, joinDays:140 },
  { name:'Hudson Gray',      username:'hudsongray',    email:'hudson.gray@example.com',        location:'Lake Tahoe, CA',         skill:'advanced',     style:'Enduro',            years:6, bio:'Flume Trail to Mr. Toad\'s Wild Ride is my summer ritual.',                          tier:2, joinDays:145 },
  { name:'Luna Bell',        username:'lunabell',      email:'luna.bell.mtb@example.com',      location:'Pisgah, NC',             skill:'intermediate', style:'All-mountain',      years:4, bio:'Pisgah is savage and I love it. Squirrel Gap is my benchmark trail.',                tier:2, joinDays:150 },
  { name:'Jasper Cole',      username:'jaspercole',    email:'jasper.cole@example.com',        location:'Oakridge, OR',           skill:'advanced',     style:'Enduro',            years:7, bio:'Oregon has the most underrated trail networks in the country. Alpine to Pacific.',    tier:2, joinDays:155 },
  { name:'Violet Shaw',      username:'violetshaw',    email:'violet.shaw.mtb@example.com',    location:'Mammoth Lakes, CA',      skill:'intermediate', style:'XC / Trail',        years:3, bio:'Kamikaze isn\'t for the faint of heart but Paper Route is perfect.',                tier:2, joinDays:160 },
  { name:'Milo Burke',       username:'miloburke',     email:'milo.burke@example.com',         location:'Brevard, NC',            skill:'intermediate', style:'All-mountain',      years:5, bio:'Pisgah Forest adjacent. Quick access to some serious singletrack.',                  tier:2, joinDays:165 },
  { name:'Scarlett Hart',    username:'scarletthart',  email:'scarlett.hart@example.com',      location:'Sedona, AZ',             skill:'advanced',     style:'Enduro',            years:6, bio:'Red rocks are unreal. Whole Enchilada in Moab is my annual pilgrimage.',              tier:2, joinDays:170 },
  { name:'Arlo Jenkins',     username:'arlojenkins',   email:'arlo.jenkins.mtb@example.com',   location:'Park City, UT',          skill:'advanced',     style:'All-mountain',      years:7, bio:'Wasatch Crest is life. Park City trail system is elite.',                             tier:2, joinDays:175 },
  { name:'Stella Owens',     username:'stellaowens',   email:'stella.owens@example.com',       location:'Marin, CA',              skill:'intermediate', style:'XC / Trail',        years:4, bio:'Mt. Tamalpais invented mountain biking. Still the gold standard.',                    tier:2, joinDays:180 },
  { name:'Jude Webb',        username:'judewebb',      email:'jude.webb.mtb@example.com',      location:'Bellingham, WA',         skill:'advanced',     style:'Enduro',            years:8, bio:'Galbraith is my home trail. Blanchard is where I go to suffer.',                      tier:2, joinDays:185 },
  { name:'Iris Barlow',      username:'irisbarlow',    email:'iris.barlow@example.com',        location:'Durango, CO',            skill:'intermediate', style:'All-mountain',      years:3, bio:'Horse Gulch is where I warm up. Hermosa Creek is where I earn my dinner.',           tier:2, joinDays:190 },
  { name:'Theo Blake',       username:'theoblake',     email:'theo.blake.mtb@example.com',     location:'Chattanooga, TN',        skill:'intermediate', style:'Trail',             years:4, bio:'Raccoon Mountain is surprisingly gnarly. Tennessee MTB scene is growing fast.',       tier:2, joinDays:195 },
  { name:'Freya Sims',       username:'freyasims',     email:'freya.sims@example.com',         location:'Santa Fe, NM',           skill:'intermediate', style:'XC / Trail',        years:3, bio:'Dale Ball trails are the best kept secret in New Mexico.',                            tier:2, joinDays:200 },
  { name:'Eli Chambers',     username:'elichambers',   email:'eli.chambers.mtb@example.com',   location:'Breckenridge, CO',       skill:'advanced',     style:'Enduro',            years:6, bio:'Gold Hill trail is 3,000 feet of descending. That\'s a good day.',                   tier:2, joinDays:205 },
  { name:'Nora Cunningham',  username:'noracunningham',email:'nora.cunningham@example.com',    location:'Austin, TX',             skill:'intermediate', style:'All-mountain',      years:4, bio:'Barton Creek greenbelt in the morning, Walnut Creek in the afternoon.',               tier:2, joinDays:210 },
  { name:'Felix Horton',     username:'felixhorton',   email:'felix.horton@example.com',       location:'Anchorage, AK',          skill:'intermediate', style:'All-mountain',      years:3, bio:'Kincaid Park and Far North Bicentennial year-round. Snow is not an excuse.',          tier:2, joinDays:215 },
  { name:'Rosie Fitzgerald', username:'rosiefitz',     email:'rosie.fitzgerald@example.com',   location:'Portland, OR',           skill:'beginner',     style:'Cross-country',     years:2, bio:'Forest Park trails got me hooked. Now building up to Sandy Ridge.',                  tier:2, joinDays:118 },

  // ── ACTIVE (forum threads + quizzes + trail reviews) ─────────────────────
  { name:'Sam Kowalski',     username:'samkowalski',   email:'sam.kowalski@example.com',       location:'Bellingham, WA',         skill:'advanced',     style:'Enduro',            years:8, bio:'Pacific Northwest enduro racer. Chasing EWS dreams.',                                tier:3, joinDays:220 },
  { name:'Claire Holden',    username:'claireholden',  email:'claire.holden@example.com',      location:'Bentonville, AR',        skill:'intermediate', style:'All-mountain',      years:5, bio:'OZ Trails local. Racing Enduro Cup events in the South.',                             tier:3, joinDays:230 },
  { name:'Brett Vaughan',    username:'brettvaughan',  email:'brett.vaughan@example.com',      location:'Moab, UT',               skill:'advanced',     style:'Enduro',            years:9, bio:'Moab guide on weekdays, race on weekends. Living the dream.',                         tier:3, joinDays:240 },
  { name:'Leah Sutton',      username:'leahsutton',    email:'leah.sutton@example.com',        location:'Sedona, AZ',             skill:'intermediate', style:'All-mountain',      years:5, bio:'Moved to Sedona for the trails. Brought my family. No regrets.',                      tier:3, joinDays:245 },
  { name:'Carter Willis',    username:'carterwillis',  email:'carter.willis@example.com',      location:'Park City, UT',          skill:'advanced',     style:'All-mountain',      years:7, bio:'Park City AM is home. Olympic legacy trails are elite.',                              tier:3, joinDays:250 },
  { name:'Piper Ramsey',     username:'piperamsey',    email:'piper.ramsey@example.com',       location:'Asheville, NC',          skill:'intermediate', style:'All-mountain',      years:5, bio:'Pisgah and Black Mountain are my weekend getaways. Blue Ridge forever.',              tier:3, joinDays:255 },
  { name:'Drew Caldwell',    username:'drewcaldwell',  email:'drew.caldwell@example.com',      location:'Fruita, CO',             skill:'advanced',     style:'Enduro',            years:8, bio:'18 Road Trails local. Riding Captain Ahab in the dark because I can.',                tier:3, joinDays:260 },
  { name:'Sage Wheeler',     username:'sagewheeler',   email:'sage.wheeler@example.com',       location:'Lake Tahoe, CA',         skill:'advanced',     style:'Enduro',            years:7, bio:'Flume Trail sunrise rides. Nothing better in the world.',                             tier:3, joinDays:265 },
  { name:'Blake Lawson',     username:'blakelawson',   email:'blake.lawson@example.com',       location:'Pisgah, NC',             skill:'advanced',     style:'All-mountain',      years:9, bio:'Pisgah local. Blue Ridge Parkway access from the back porch.',                        tier:3, joinDays:270 },
  { name:'Paige Holland',    username:'paigetholland', email:'paige.holland@example.com',      location:'Bend, OR',               skill:'intermediate', style:'XC / Trail',        years:5, bio:'Phil\'s Trail for fitness, Clutch for fun. Bend life is unbeatable.',                tier:3, joinDays:275 },
  { name:'Reece Manning',    username:'reecemanning',  email:'reece.manning@example.com',      location:'Crested Butte, CO',      skill:'advanced',     style:'Enduro',            years:9, bio:'Gothic Road to Strand Hill. CB is MTB heaven and I refuse to leave.',                tier:3, joinDays:280 },
  { name:'Tatum Burke',      username:'tatumburke',    email:'tatum.burke@example.com',        location:'Marin, CA',              skill:'intermediate', style:'All-mountain',      years:4, bio:'Marin pioneer territory. Old school vibes, new school legs.',                        tier:3, joinDays:285 },
  { name:'Dax Morris',       username:'daxmorris',     email:'dax.morris@example.com',         location:'Oakridge, OR',           skill:'advanced',     style:'Enduro',            years:8, bio:'Oregon EWS qualifier regular. Alpine to Pacific is my training ground.',              tier:3, joinDays:290 },
  { name:'Nadia Brennan',    username:'nadiabrennan',  email:'nadia.brennan@example.com',      location:'Bellingham, WA',         skill:'intermediate', style:'All-mountain',      years:5, bio:'Northwest Women\'s MTB crew. Galbraith Mountain is our home.',                       tier:3, joinDays:295 },
  { name:'Jax Sterling',     username:'jaxsterling',   email:'jax.sterling@example.com',       location:'Durango, CO',            skill:'advanced',     style:'Enduro / DH',       years:10,bio:'Purgatory and Hesperus are my local bike parks. Engineer Mountain on a whim.',       tier:3, joinDays:300 },
  { name:'Quinn Elliott',    username:'quinnelliott',  email:'quinn.elliott@example.com',      location:'Harrisonburg, VA',       skill:'intermediate', style:'All-mountain',      years:5, bio:'Massanutten trail system local. East Coast rocks build character.',                   tier:3, joinDays:305 },
  { name:'River Banks',      username:'riverbanks',    email:'river.banks@example.com',        location:'Chattanooga, TN',        skill:'advanced',     style:'Enduro',            years:7, bio:'Raccoon Mountain and Enterprise South. Southeast trails are underrated.',              tier:3, joinDays:310 },
  { name:'Tess Langley',     username:'tesslangley',   email:'tess.langley@example.com',       location:'Brevard, NC',            skill:'intermediate', style:'All-mountain',      years:5, bio:'Pisgah NF access daily. DuPont State Forest on the weekend.',                        tier:3, joinDays:315 },
  { name:'Kade Norris',      username:'kadenorris',    email:'kade.norris@example.com',        location:'Breckenridge, CO',       skill:'advanced',     style:'Enduro',            years:8, bio:'Gold Hill, Blue River, Breckenridge enduro. Summit County living.',                   tier:3, joinDays:320 },
  { name:'Viv Hartley',      username:'vivhartley',    email:'viv.hartley@example.com',        location:'Mammoth Lakes, CA',      skill:'advanced',     style:'Enduro',            years:9, bio:'Mammoth Bike Park season pass holder. Summer is for suffering in the best way.',       tier:3, joinDays:325 },
  { name:'Rees Tanaka',      username:'reestanaka',    email:'rees.tanaka@example.com',        location:'Santa Cruz, CA',         skill:'advanced',     style:'All-mountain',      years:8, bio:'Butano and Demo Forest locally. Big Basin on big days.',                              tier:3, joinDays:330 },
  { name:'Sloane Walsh',     username:'sloanewalsh',   email:'sloane.walsh@example.com',       location:'Flagstaff, AZ',          skill:'intermediate', style:'Trail',             years:4, bio:'Schultz Creek to Upper Oldham. Flagstaff has no bad rides.',                         tier:3, joinDays:335 },
  { name:'Beckett Shaw',     username:'beckettshaw',   email:'beckett.shaw@example.com',       location:'Boise, ID',              skill:'advanced',     style:'Enduro',            years:7, bio:'Boise Ridge trail system from top to bottom every chance I get.',                     tier:3, joinDays:340 },
  { name:'Remy Bouchard',    username:'remybouchard',  email:'remy.bouchard@example.com',      location:'Burlington, VT',         skill:'intermediate', style:'All-mountain',      years:5, bio:'Kingdom Trails and Bolton Valley. Vermont MTB is criminally underrated.',             tier:3, joinDays:345 },
  { name:'Hollis Grant',     username:'hollisgrant',   email:'hollis.grant@example.com',       location:'Duluth, MN',             skill:'advanced',     style:'All-mountain',      years:7, bio:'Spirit Mountain and Piedmont. Duluth riders don\'t stop for weather.',               tier:3, joinDays:350 },

  // ── POWER USERS (heavy cross-module, lots of XP) ─────────────────────────
  { name:'Jake Thornton',    username:'jakethornton',  email:'jake.thornton@example.com',      location:'Sedona, AZ',             skill:'expert',       style:'Enduro',            years:12,bio:'Sedona local with 12 years of red rock in my legs. Whole Enchilada is a warmup.',    tier:4, joinDays:355 },
  { name:'Casey Dunbar',     username:'caseydunbar',   email:'casey.dunbar@example.com',       location:'Bellingham, WA',         skill:'expert',       style:'Downhill',          years:11,bio:'Former Specialized factory team. Now I just ride because it\'s fun.',               tier:4, joinDays:360 },
  { name:'Morgan Tate',      username:'morgantate',    email:'morgan.tate@example.com',        location:'Crested Butte, CO',      skill:'expert',       style:'Enduro',            years:13,bio:'CB native. Grew up following the big kids up double black terrain.',                 tier:4, joinDays:355 },
  { name:'Alex Sinclair',    username:'alexsinclair',  email:'alex.sinclair@example.com',      location:'Pisgah, NC',             skill:'expert',       style:'All-mountain',      years:10,bio:'Brevard resident. Pisgah NF is my second home. Race Pisgah Mountain Stage Race.',   tier:4, joinDays:360 },
  { name:'Jordan Hale',      username:'jordanhale',    email:'jordan.hale@example.com',        location:'Park City, UT',          skill:'expert',       style:'Enduro',            years:14,bio:'EWS Masters category. Park City AM trails know my name.',                            tier:4, joinDays:350 },
  { name:'Taylor Voss',      username:'taylorvoss',    email:'taylor.voss@example.com',        location:'Bend, OR',               skill:'expert',       style:'All-mountain',      years:11,bio:'Oregon Enduro Series podium regular. Phil\'s Trail is too easy now.',                tier:4, joinDays:355 },
  { name:'Riley Cross',      username:'rileycross',    email:'riley.cross@example.com',        location:'Bentonville, AR',        skill:'expert',       style:'Trail / Enduro',    years:10,bio:'OZ Trails pioneer. Helped build some of the trails I now race on.',                 tier:4, joinDays:362 },
  { name:'Finley Park',      username:'finleypark',    email:'finley.park@example.com',        location:'Moab, UT',               skill:'expert',       style:'Enduro',            years:12,bio:'Moab lifer. Slickrock and Whole Enchilada before breakfast.',                         tier:4, joinDays:358 },
  { name:'Devin Stone',      username:'devinstone',    email:'devin.stone@example.com',        location:'Marin, CA',              skill:'expert',       style:'All-mountain',      years:15,bio:'Mt. Tam OG. Been riding these ridges since before the trails had names.',             tier:4, joinDays:363 },
  { name:'Kendall Marsh',    username:'kendallmarsh',  email:'kendall.marsh@example.com',      location:'Bellingham, WA',         skill:'expert',       style:'Downhill / Enduro', years:13,bio:'Galbraith Mountain curator. Loves berms, hates brakes, respects trail closures.',    tier:4, joinDays:364 },
  { name:'Evan Calloway',    username:'evancalloway',  email:'evan.calloway@example.com',      location:'Fruita, CO',             skill:'expert',       style:'Enduro',            years:11,bio:'18 Road local legend. Knows every line on every trail in the Book Cliffs.',           tier:4, joinDays:360 },
  { name:'Peyton Diaz',      username:'peytondiaz',    email:'peyton.diaz@example.com',        location:'Asheville, NC',          skill:'expert',       style:'All-mountain',      years:10,bio:'Blue Ridge native. Pisgah guide, trail builder, and occasional racer.',               tier:4, joinDays:355 },
  { name:'Cameron Wells',    username:'cameronwells',  email:'cameron.wells@example.com',      location:'Durango, CO',            skill:'expert',       style:'Enduro',            years:12,bio:'Four Corners local. Engineer Mountain and La Plata County Trail System regular.',     tier:4, joinDays:362 },
  { name:'Spencer Knight',   username:'spencerknight', email:'spencer.knight@example.com',     location:'Lake Tahoe, CA',         skill:'expert',       style:'All-mountain',      years:11,bio:'Tahoe local. Flume Trail, Mr. Toad\'s, and Downieville are the holy trinity.',       tier:4, joinDays:358 },
  { name:'Avery Quinn',      username:'averyquinn',    email:'avery.quinn@example.com',        location:'Oakridge, OR',           skill:'expert',       style:'Enduro',            years:13,bio:'Oregon EWS venue regular. Alpine to Pacific is home territory.',                      tier:4, joinDays:363 },
]

// ── Forum thread templates for active/power users ─────────────────────────────
const THREADS = [
  {
    catId: CAT.trails,
    title: 'Whole Enchilada conditions — anyone ridden recently?',
    content: 'Heading to Moab in two weeks and trying to time the Whole Enchilada right. What are conditions like right now? Any snow on the upper section or is it clear all the way down to Moab?',
    replies: [
      'Rode it last weekend. Upper section had some patchy snow above 9,000 feet but totally passable. Lower canyon was buttery smooth. Bring layers for the top.',
      'Did it Thursday. Zero snow issues. If anything it was a bit dusty on the slickrock section. Go early, temperatures are already getting warm by noon.',
      'The Burro Pass section gets icy in the morning sometimes even in May. Wait til after 10am to drop in and you\'ll be fine.',
    ],
  },
  {
    catId: CAT.bikeTech,
    title: 'Coil vs air shock for Pisgah — thoughts?',
    content: 'Finally upgrading from stock Fox Float to either a coil shock or a higher-end air. Riding mostly Pisgah and Bent Creek. Rocky, chunky, variable speed. Is coil overkill or is it the move?',
    replies: [
      'Pisgah is perfect coil territory. That chunky tech needs consistent support through the stroke. Get a SuperDeluxe Coil if budget allows.',
      'I ran a coil on Pisgah for 3 years. Just switched to an air because I was tired of adjusting for every ride. The tech has gotten good enough. Push Industries or Float X2.',
      'Coil every time for Pisgah. The roots and rocks just feel more planted. You\'ll wonder why you waited.',
      'Either works but coil is more forgiving when you\'re not perfectly dialed. Less fiddling on the trail.',
    ],
  },
  {
    catId: CAT.skills,
    title: 'Braking technique for steep technical terrain — what actually works?',
    content: 'I keep locking up my rear on really steep stuff and washing out the front when I try to brake mid-corner. I know the basics but something isn\'t clicking. Tips?',
    replies: [
      'Two things changed everything for me: 1) brake before the turn, not during. 2) weight your outside pedal and you\'ll have way more traction than you think.',
      'Progressive braking on approach. Think of it like landing a plane — slow early, then commit. Rear lockup usually means you\'re too far back in your attack position.',
      'Your hips matter more than your hands. Get your hips low and centered over the BB. When riders lock rear they\'re usually sitting too far back.',
      'Practice one-brake drills on easy terrain. Rear only, then front only, until you understand what each does. Then combine. Sounds dumb but it works.',
    ],
  },
  {
    catId: CAT.general,
    title: 'Best U.S. trail towns you\'ve actually lived in (not just visited)?',
    content: 'Considering a move. I know Bentonville, Bellingham, Sedona, and Moab get all the press. But what are the real day-to-day lived experiences like? Cost of living, community, trail access from your door?',
    replies: [
      'Lived in Bellingham 4 years. Trail access from downtown is real. Galbraith is 5 minutes. Community is tight. Housing has gotten expensive but still cheaper than Seattle.',
      'Bentonville is legit. OZ Trails keeps expanding. Cost of living is still reasonable by MTB town standards. The town actually supports the trails with real investment.',
      'Sedona is incredible for trails but pricey and gets crowded on weekends. If you work remotely it\'s amazing. Local community is solid once you\'re in.',
      'Durango is underrated. Four Corners access, locals-to-tourists ratio is still good, and Horse Gulch is right there. Fort Lewis College keeps the scene young.',
    ],
  },
  {
    catId: CAT.bikeTech,
    title: 'Tire setup for Moab slickrock — opinions?',
    content: 'Heading to Moab for the first time. I run 2.4 Maxxis Assegai F / DHR2 R at home on PNW trails. Do I need to change anything for slickrock or is that a solid setup?',
    replies: [
      'That\'s actually a great Moab setup. Assegai on front handles the slickrock friction well. Drop pressure a bit — I run 20/22 on slickrock vs 18/20 in the PNW.',
      'Maxxis is perfect there. The slickrock actually rewards lower knobs so a DHR2 rear is smart. You\'ll feel like you have infinite traction on the sandstone.',
      'The only reason to change is the sand/dirt sections between slickrock. But honestly your setup handles it all fine. Focus on your technique not your tires.',
    ],
  },
  {
    catId: CAT.skills,
    title: 'How long did it take you to feel comfortable with drops?',
    content: 'I can ride most technical terrain but drops still freak me out. Even a 2-foot drop makes me tense up. Been riding 3 years. Is this normal? What finally clicked for you?',
    replies: [
      'Took me a full year of specifically practicing drops before they felt normal. The key for me: roll it slow first. Same drop, just roll off without jumping. Then add commitment.',
      'Completely normal. The brain has a hard time with the unsupported moment. What helped me: go to a pump track and just ride off every little ledge you can find. Hundreds of reps.',
      '3 years is not unusual. Some riders never love drops and that\'s fine. But if you want to get there: spot your landing before you drop, chin up, and commit. Doubt causes crashes.',
      'I used a foam pit at a bike park for a week. Changed everything. Zero consequence reps. Maybe worth a park day if there\'s one near you?',
    ],
  },
  {
    catId: CAT.trails,
    title: 'Sedona trail recommendations for someone who rides Enduro?',
    content: 'Visiting Sedona for 5 days. Intermediate-to-advanced enduro rider. Looking for the stuff that locals actually ride, not just the tourist routes. What would you prioritize?',
    replies: [
      'Highline to Mescal to Broken Arrow for your first day — that\'s the classic sampler. Then do Chunder for pure tech. Finish with Hangover if your nerves can handle exposure.',
      'Aerie trail is slept on. Not as famous as Hangover but more consistently challenging. High on the Hog to Hangover is the best sustained descent in Sedona.',
      'Budget a full day just for the Hangover Trail area. Do it twice. Once to survive, once to actually ride it.',
      'Skip Bell Rock and Courthouse unless you\'re with beginners. Go to Broken Arrow, Chunder, and then work north toward Aerie. That\'s intermediate to advanced all day.',
    ],
  },
  {
    catId: CAT.general,
    title: 'Ride MTB XP — how is everyone using the credits?',
    content: 'Just noticed I\'ve been stacking up credits and XP from courses. Anyone figured out the best ways to earn? And what are you saving for?',
    replies: [
      'Learn module is the fastest legit XP. Especially if you actually watch the videos and do the quizzes properly. Course completions give 200 XP each.',
      'Trail reviews add up surprisingly fast. 10 XP each but if you ride a lot they stack. Plus writing them is useful for the community.',
      'Forum posts are 10 XP each. I\'ve been trying to actually contribute useful stuff rather than just farming points. Feels better and you learn from the replies anyway.',
    ],
  },
]

// ── Trail review templates ─────────────────────────────────────────────────────
const TRAIL_REVIEWS = [
  { rating:5, title:'Best sandstone in the world', body:'Porcupine Rim lives up to every bit of the hype. The final descent into the canyon is something you have to experience. Go early, bring more water than you think you need.' },
  { rating:5, title:'Slickrock is a rite of passage', body:'Nothing else rides like Slickrock. It\'s not about speed, it\'s about reading the rock. The friction is insane. Take your time, it rewards patience.' },
  { rating:4, title:'Bentonville best singletrack', body:'Slaughter Pen has incredible flow and the trail quality is world-class. OZ Trails keeps building and it keeps getting better. Bring a trail bike.' },
  { rating:5, title:'Red rocks and blue sky', body:'Sedona is everything people say it is. The combination of technical rock and flow is unlike any other trail system. Go when the light is golden for views you won\'t forget.' },
  { rating:5, title:'The Moab experience', body:'Moab trails have something for every type of rider. The scenery alone makes it worth the drive. Canyon country riding is its own thing — take your time with it.' },
  { rating:4, title:'Southern Utah hidden gem', body:'St. George trails are way better than the crowds would have you believe. The Virgin River Rim section has insane views and zero tourists.' },
  { rating:4, title:'Desert trails done right', body:'Phoenix trail system punches above its weight. The flow trails at Desert Park are manicured perfectly and the tech options keep experienced riders honest.' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function log(msg) { process.stdout.write(`[seed-community] ${msg}\n`) }

async function insertUsers() {
  log('Inserting 100 users...')
  const now = new Date()
  let count = 0

  for (const u of USERS) {
    const id = randomUUID()
    const joinedAt = daysAgo(u.joinDays)
    await db.query(`
      INSERT INTO users (id, email, name, username, "passwordHash", "skillLevel",
        location, "ridingStyle", "yearsRiding", bio, role,
        "onboardingStep", "onboardingCompletedAt",
        "creditSeed", "creditPurchased", "creditEarned",
        "createdAt", "updatedAt", "lastActivityAt", "emailVerified")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'user',
        5, $11, 500, 0, 0,
        $12,$12,$13,$12)
      ON CONFLICT (email) DO NOTHING
    `, [
      id, u.email, u.name, u.username, PW, u.skill,
      u.location, u.style, u.years, u.bio,
      joinedAt, // onboardingCompletedAt
      joinedAt, // createdAt + updatedAt
      daysAgo(Math.floor(u.joinDays * 0.3)), // lastActivityAt — more recent
    ])
    count++
    if (count % 20 === 0) process.stdout.write(`\r  users: ${count}/100`)
  }
  console.log(`\r  users: ${count}/100`)
  log(`  ✓ ${count} users attempted (ON CONFLICT DO NOTHING for duplicates)`)
}

async function insertXpAndActivity() {
  log('Inserting XP grants and activity...')

  // Re-fetch users by email to get their actual IDs (handles conflicts)
  const emails = USERS.map(u => u.email)
  const { rows: userRows } = await db.query(
    `SELECT id, email FROM users WHERE email = ANY($1)`,
    [emails]
  )
  const idByEmail = Object.fromEntries(userRows.map(r => [r.email, r.id]))

  let xpCount = 0
  let postCount = 0

  // Build forum threads first (power/active users author them)
  const threadIds = []
  const activeEmails = USERS.filter(u => u.tier >= 3).map(u => u.email)
  const powerEmails = USERS.filter(u => u.tier === 4).map(u => u.email)

  for (let i = 0; i < THREADS.length; i++) {
    const t = THREADS[i]
    const authorEmail = activeEmails[i % activeEmails.length]
    const authorId = idByEmail[authorEmail]
    if (!authorId) continue

    const threadId = randomUUID()
    const firstPostId = randomUUID()
    const slug = `${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}-${threadId.slice(0,6)}`
    const createdAt = daysAgo(between(5, 60))

    await db.query(`
      INSERT INTO forum_threads (id, "categoryId", title, slug, "viewCount", "lastReplyAt", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
      ON CONFLICT (slug) DO NOTHING
    `, [threadId, t.catId, t.title, slug, between(80, 600), createdAt, createdAt])

    await db.query(`
      INSERT INTO forum_posts (id, "threadId", "authorId", content, "isFirst", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,true,$5,$5)
      ON CONFLICT DO NOTHING
    `, [firstPostId, threadId, authorId, t.content, createdAt])

    // XP for thread author
    await grantXp(authorId, 'forum_thread_created', 'forum', threadId, XP.forum_thread_created, createdAt)
    xpCount++
    postCount++
    threadIds.push(threadId)

    // Add replies from other active/power users
    const replyAuthors = [...activeEmails, ...powerEmails].filter(e => e !== authorEmail)
    for (let j = 0; j < Math.min(t.replies.length, replyAuthors.length); j++) {
      const replyAuthorId = idByEmail[replyAuthors[j % replyAuthors.length]]
      if (!replyAuthorId) continue

      const replyId = randomUUID()
      const replyAt = new Date(createdAt.getTime() + (j + 1) * between(3600000, 86400000))

      await db.query(`
        INSERT INTO forum_posts (id, "threadId", "authorId", content, "isFirst", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,false,$5,$5)
        ON CONFLICT DO NOTHING
      `, [replyId, threadId, replyAuthorId, t.replies[j], replyAt])

      await grantXp(replyAuthorId, 'forum_post_created', 'forum', replyId, XP.forum_post_created, replyAt)
      xpCount++
      postCount++
    }
  }

  // Learn quiz completions for tier 1+
  const learnUsers = USERS.filter(u => u.tier >= 1)
  for (const u of learnUsers) {
    const userId = idByEmail[u.email]
    if (!userId) continue

    const numQuizzes = u.tier === 1 ? between(1, 2)
                     : u.tier === 2 ? between(3, 6)
                     : u.tier === 3 ? between(5, 10)
                     : between(8, QUIZ_IDS.length)

    const shuffled = [...QUIZ_IDS].sort(() => Math.random() - 0.5).slice(0, numQuizzes)

    for (const quizId of shuffled) {
      const score = u.tier >= 3 ? between(75, 100) : between(55, 85)
      const tier = score >= 85 ? 'gold' : score >= 70 ? 'silver' : 'bronze'
      const completedAt = daysAgo(between(1, u.joinDays - 1))
      const attemptId = randomUUID()

      await db.query(`
        INSERT INTO learn_quiz_attempts (id, "userId", "quizId", score, tier, "xpEarned", answers, "completedAt", "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,'[]'::jsonb,$7,$7)
        ON CONFLICT DO NOTHING
      `, [attemptId, userId, quizId, score, tier, XP.learn_quiz_completed, completedAt])

      await db.query(`
        INSERT INTO learn_progress (id, "userId", "quizId", "bestTier")
        VALUES ($1,$2,$3,$4)
        ON CONFLICT ("userId", "quizId") DO UPDATE SET "bestTier" = EXCLUDED."bestTier"
      `, [randomUUID(), userId, quizId, tier])

      await grantXp(userId, 'learn_quiz_completed', 'learn', quizId, XP.learn_quiz_completed, completedAt)
      xpCount++
    }
  }

  // Trail reviews for tier 2+
  const trailReviewUsers = USERS.filter(u => u.tier >= 2)
  for (let i = 0; i < trailReviewUsers.length; i++) {
    const u = trailReviewUsers[i]
    const userId = idByEmail[u.email]
    if (!userId) continue

    const numReviews = u.tier >= 4 ? between(3, 5) : u.tier === 3 ? between(1, 3) : between(0, 2)
    const systemIds = [...TRAIL_SYSTEM_IDS].sort(() => Math.random() - 0.5).slice(0, numReviews)

    for (const systemId of systemIds) {
      const rev = rand(TRAIL_REVIEWS)
      const reviewId = randomUUID()
      const createdAt = daysAgo(between(1, u.joinDays - 1))

      // Check if trail_reviews table has the columns we expect
      await db.query(`
        INSERT INTO trail_reviews (id, "userId", "trailSystemId", rating, title, body, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
        ON CONFLICT DO NOTHING
      `, [reviewId, userId, systemId, rev.rating, rev.title, rev.body, createdAt]).catch(() => {
        // trail_reviews may use trailId not trailSystemId — skip gracefully
      })

      await grantXp(userId, 'trail_review_submitted', 'trails', reviewId, XP.trail_review_submitted, createdAt)
      xpCount++
    }
  }

  log(`  ✓ ${xpCount} XP grants, ${postCount} forum posts`)
}

async function grantXp(userId, event, module, refId, points, createdAt) {
  await db.query(`
    INSERT INTO xp_grants (id, "userId", event, module, points, multiplier, total, "refId", "createdAt")
    VALUES ($1,$2,$3,$4,$5,1.0,$5,$6,$7)
    ON CONFLICT ("userId", event, "refId") DO NOTHING
  `, [randomUUID(), userId, event, module, points, refId, createdAt])
}

async function rebuildAggregates() {
  log('Rebuilding XP aggregates...')

  const emails = USERS.map(u => u.email)
  const { rows: userRows } = await db.query(
    `SELECT id FROM users WHERE email = ANY($1)`, [emails]
  )

  for (const { id: userId } of userRows) {
    const { rows } = await db.query(`
      SELECT
        COALESCE(SUM(total), 0) AS total_xp,
        MAX("createdAt") AS last_grant
      FROM xp_grants WHERE "userId" = $1
    `, [userId])

    const { rows: byModule } = await db.query(`
      SELECT module, SUM(total) AS pts
      FROM xp_grants WHERE "userId" = $1
      GROUP BY module
    `, [userId])

    const breakdown = {}
    for (const r of byModule) breakdown[r.module] = Number(r.pts)

    const totalXp = Number(rows[0].total_xp)
    const lastGrant = rows[0].last_grant

    await db.query(`
      INSERT INTO xp_aggregates (id, "userId", "totalXp", "moduleBreakdown", "streakDays", "lastGrantAt", "updatedAt")
      VALUES ($1,$2,$3,$4::jsonb,0,$5,NOW())
      ON CONFLICT ("userId") DO UPDATE SET
        "totalXp" = EXCLUDED."totalXp",
        "moduleBreakdown" = EXCLUDED."moduleBreakdown",
        "lastGrantAt" = EXCLUDED."lastGrantAt",
        "updatedAt" = NOW()
    `, [randomUUID(), userId, totalXp, JSON.stringify(breakdown), lastGrant])
  }

  log('  ✓ aggregates rebuilt')
}

async function printSummary() {
  const { rows } = await db.query(`
    SELECT
      COUNT(DISTINCT u.id) AS user_count,
      COUNT(DISTINCT xg.id) AS xp_grants,
      SUM(xa."totalXp") AS total_xp_distributed,
      MAX(xa."totalXp") AS top_user_xp,
      MIN(xa."totalXp") FILTER (WHERE xa."totalXp" > 0) AS min_active_xp
    FROM users u
    LEFT JOIN xp_grants xg ON xg."userId" = u.id
    LEFT JOIN xp_aggregates xa ON xa."userId" = u.id
    WHERE u.email = ANY($1)
  `, [USERS.map(u => u.email)])

  const r = rows[0]
  log('\n✅ Community seed complete:')
  log(`   Users seeded:        ${r.user_count}`)
  log(`   XP grants created:   ${r.xp_grants}`)
  log(`   Total XP given out:  ${r.total_xp_distributed}`)
  log(`   Top user XP:         ${r.top_user_xp}`)
  log(`   Min active user XP:  ${r.min_active_xp}`)
  log('\n   All passwords: password123')
  log('   Tiers: ghost(0 XP) → lurker(quiz only) → learner → active → power')
}

async function main() {
  await insertUsers()
  await insertXpAndActivity()
  await rebuildAggregates()
  await printSummary()
  await db.end()
}

main().catch(err => {
  console.error('Seed failed:', err.message, err.stack)
  db.end()
  process.exit(1)
})
