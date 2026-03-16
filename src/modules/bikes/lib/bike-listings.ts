export interface BikeListing {
  id: string
  brand: string
  model: string
  category: number
  price: number
  travel: number | null // rear travel mm (null for hardtail/rigid)
  wheelSize: '29' | '27.5' | '29/27.5'
  frame: 'Alloy' | 'Carbon'
  description: string
  affiliateUrl: string
}

export const CATEGORY_SLUGS: Record<number, string> = {
  1: 'gravel',
  3: 'cross-country',
  5: 'trail',
  7: 'enduro',
  9: 'downhill',
}

export const SLUG_TO_CATEGORY: Record<string, number> = {
  gravel: 1,
  'cross-country': 3,
  trail: 5,
  enduro: 7,
  downhill: 9,
}

export const BIKE_LISTINGS: BikeListing[] = [
  // ── Category 1: Gravel / Road+ ──────────────────────────────────────────────
  {
    id: 'trek-marlin-5',
    brand: 'Trek', model: 'Marlin 5', category: 1, price: 639,
    travel: null, wheelSize: '29', frame: 'Alloy',
    description: 'Entry-level hardtail for gravel and light trail riding.',
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/marlin/marlin-5/p/35491/',
  },
  {
    id: 'trek-procaliber-9.5',
    brand: 'Trek', model: 'Procaliber 9.5', category: 1, price: 2799,
    travel: null, wheelSize: '29', frame: 'Carbon',
    description: 'Carbon XC hardtail built for speed on gravel and packed dirt.',
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/procaliber/procaliber-9-5/p/35497/',
  },
  {
    id: 'specialized-rockhopper-comp',
    brand: 'Specialized', model: 'Rockhopper Comp', category: 1, price: 1000,
    travel: null, wheelSize: '29', frame: 'Alloy',
    description: 'Versatile hardtail for riders stepping up to real trail riding.',
    affiliateUrl: 'https://www.specialized.com/us/en/rockhopper-comp/p/226069',
  },
  {
    id: 'giant-talon-1',
    brand: 'Giant', model: 'Talon 1', category: 1, price: 800,
    travel: null, wheelSize: '29', frame: 'Alloy',
    description: 'Reliable hardtail for beginners and casual riders.',
    affiliateUrl: 'https://www.giant-bicycles.com/us/talon-1-2024',
  },
  {
    id: 'cannondale-trail-4',
    brand: 'Cannondale', model: 'Trail 4', category: 1, price: 950,
    travel: null, wheelSize: '29', frame: 'Alloy',
    description: 'Solid hardtail with quality components at an accessible price.',
    affiliateUrl: 'https://www.cannondale.com/en-us/bikes/mountain/trail-bikes/trail/trail-4/cp4trl4',
  },

  // ── Category 3: Cross-Country ──────────────────────────────────────────────
  {
    id: 'trek-top-fuel-9.7',
    brand: 'Trek', model: 'Top Fuel 9.7', category: 3, price: 4499,
    travel: 100, wheelSize: '29', frame: 'Carbon',
    description: 'XC race weapon with 100mm of efficient travel and IsoStrut rear.',
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/top-fuel/top-fuel-9-7/p/35506/',
  },
  {
    id: 'specialized-epic-evo-comp',
    brand: 'Specialized', model: 'Epic Evo Comp', category: 3, price: 3800,
    travel: 120, wheelSize: '29', frame: 'Carbon',
    description: 'Epic platform with extra travel for more aggressive XC riding.',
    affiliateUrl: 'https://www.specialized.com/us/en/epic-evo-comp/p/199988',
  },
  {
    id: 'giant-anthem-advanced-pro',
    brand: 'Giant', model: 'Anthem Advanced Pro 29', category: 3, price: 4500,
    travel: 100, wheelSize: '29', frame: 'Carbon',
    description: 'Lightweight XC race bike with Maestro suspension.',
    affiliateUrl: 'https://www.giant-bicycles.com/us/anthem-advanced-pro-29-1-2024',
  },
  {
    id: 'scott-spark-rc-team',
    brand: 'Scott', model: 'Spark RC Team', category: 3, price: 7999,
    travel: 100, wheelSize: '29', frame: 'Carbon',
    description: 'World Cup-level XC bike with TwinLoc suspension control.',
    affiliateUrl: 'https://www.scott-sports.com/us/en/category/bikes-mountain-xc-racing',
  },
  {
    id: 'trek-fuel-ex-8',
    brand: 'Trek', model: 'Fuel EX 8', category: 3, price: 3299,
    travel: 130, wheelSize: '29', frame: 'Alloy',
    description: 'Versatile trail-oriented XC bike that climbs and descends.',
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/fuel-ex/fuel-ex-8/p/35530/',
  },

  // ── Category 5: Trail / All-Mountain ──────────────────────────────────────
  {
    id: 'trek-fuel-ex-9.8',
    brand: 'Trek', model: 'Fuel EX 9.8 GX', category: 5, price: 5699,
    travel: 130, wheelSize: '29', frame: 'Carbon',
    description: 'Balanced trail bike that excels both up and down.',
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/fuel-ex/fuel-ex-9-8-gx/p/35531/',
  },
  {
    id: 'specialized-stumpjumper-comp',
    brand: 'Specialized', model: 'Stumpjumper Comp', category: 5, price: 3500,
    travel: 140, wheelSize: '29', frame: 'Alloy',
    description: 'The benchmark trail bike. Playful, capable, and incredibly versatile.',
    affiliateUrl: 'https://www.specialized.com/us/en/stumpjumper-comp/p/226218',
  },
  {
    id: 'santa-cruz-hightower-c',
    brand: 'Santa Cruz', model: 'Hightower C', category: 5, price: 4699,
    travel: 135, wheelSize: '29', frame: 'Carbon',
    description: '29" trail bike built for aggressive all-mountain riding.',
    affiliateUrl: 'https://www.santacruzbicycles.com/en-US/hightower',
  },
  {
    id: 'canyon-spectral-cf-8',
    brand: 'Canyon', model: 'Spectral CF 8', category: 5, price: 3499,
    travel: 140, wheelSize: '29', frame: 'Carbon',
    description: 'Direct-to-consumer all-mountain bike with excellent value.',
    affiliateUrl: 'https://www.canyon.com/en-us/mountain-bikes/trail/spectral/cf/spectral-cf-8/3193.html',
  },
  {
    id: 'giant-trance-x-advanced-pro',
    brand: 'Giant', model: 'Trance X Advanced Pro 29', category: 5, price: 5500,
    travel: 130, wheelSize: '29', frame: 'Carbon',
    description: 'Giant flagship trail bike with Maestro suspension.',
    affiliateUrl: 'https://www.giant-bicycles.com/us/trance-x-advanced-pro-29-0-2024',
  },
  {
    id: 'yeti-sb130',
    brand: 'Yeti', model: 'SB130 C2', category: 5, price: 5999,
    travel: 130, wheelSize: '29', frame: 'Carbon',
    description: "Yeti's do-it-all trail machine with Switch Infinity suspension.",
    affiliateUrl: 'https://www.yeticycles.com/bikes/sb130.html',
  },

  // ── Category 7: Enduro ─────────────────────────────────────────────────────
  {
    id: 'specialized-enduro-comp',
    brand: 'Specialized', model: 'Enduro Comp', category: 7, price: 4500,
    travel: 170, wheelSize: '29/27.5', frame: 'Alloy',
    description: 'Race-bred enduro bike with mullet setup and 170mm travel.',
    affiliateUrl: 'https://www.specialized.com/us/en/enduro-comp/p/226251',
  },
  {
    id: 'santa-cruz-megatower-c',
    brand: 'Santa Cruz', model: 'Megatower C', category: 7, price: 5099,
    travel: 160, wheelSize: '29', frame: 'Carbon',
    description: 'Big-mountain enduro bike built for aggressive descending.',
    affiliateUrl: 'https://www.santacruzbicycles.com/en-US/megatower',
  },
  {
    id: 'yt-capra-core-4',
    brand: 'YT Industries', model: 'Capra Core 4', category: 7, price: 3599,
    travel: 170, wheelSize: '29/27.5', frame: 'Alloy',
    description: 'Direct-to-consumer enduro bike at a compelling price.',
    affiliateUrl: 'https://www.yt-industries.com/en/bikes/mountain/capra',
  },
  {
    id: 'canyon-strive-cf-8',
    brand: 'Canyon', model: 'Strive CF 8', category: 7, price: 4299,
    travel: 170, wheelSize: '29/27.5', frame: 'Carbon',
    description: 'Mullet enduro bike with Canyon\'s proven geometry.',
    affiliateUrl: 'https://www.canyon.com/en-us/mountain-bikes/enduro/strive/cf/strive-cf-8/3756.html',
  },
  {
    id: 'trek-slash-9.8',
    brand: 'Trek', model: 'Slash 9.8 GX', category: 7, price: 6499,
    travel: 170, wheelSize: '29', frame: 'Carbon',
    description: "Trek's enduro race platform. Stiff, precise, and fast.",
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/enduro-mountain-bikes/slash/slash-9-8-gx/p/35589/',
  },
  {
    id: 'norco-range-c1',
    brand: 'Norco', model: 'Range C1', category: 7, price: 6099,
    travel: 165, wheelSize: '29/27.5', frame: 'Carbon',
    description: 'Canadian enduro machine with mullet geometry.',
    affiliateUrl: 'https://www.norco.com/bikes/mountain/enduro/range/',
  },

  // ── Category 9: Downhill ───────────────────────────────────────────────────
  {
    id: 'specialized-demo-8-alloy',
    brand: 'Specialized', model: 'Demo 8 Alloy', category: 9, price: 4500,
    travel: 203, wheelSize: '29', frame: 'Alloy',
    description: 'Winning DH race platform in an alloy build for everyday riders.',
    affiliateUrl: 'https://www.specialized.com/us/en/demo-8-alloy/p/226261',
  },
  {
    id: 'santa-cruz-v10-7-c',
    brand: 'Santa Cruz', model: 'V10 7 C', category: 9, price: 6999,
    travel: 215, wheelSize: '29', frame: 'Carbon',
    description: 'Seven generations of World Cup DH racing distilled into one bike.',
    affiliateUrl: 'https://www.santacruzbicycles.com/en-US/v10',
  },
  {
    id: 'canyon-sender-cf-7',
    brand: 'Canyon', model: 'Sender CF 7', category: 9, price: 4299,
    travel: 203, wheelSize: '29', frame: 'Carbon',
    description: 'Direct-to-consumer DH value with full carbon frame.',
    affiliateUrl: 'https://www.canyon.com/en-us/mountain-bikes/downhill/sender/cf/sender-cf-7/3143.html',
  },
  {
    id: 'trek-session-9.9',
    brand: 'Trek', model: 'Session 9.9', category: 9, price: 8499,
    travel: 200, wheelSize: '29', frame: 'Carbon',
    description: 'Trek\'s top-tier DH race machine. Used by pro World Cup racers.',
    affiliateUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/downhill-mountain-bikes/session/session-9-9-xx1/p/35598/',
  },
  {
    id: 'yt-tues-cf-core-4',
    brand: 'YT Industries', model: 'Tues CF Core 4', category: 9, price: 4299,
    travel: 200, wheelSize: '29', frame: 'Carbon',
    description: 'Proven DH race frame with direct-to-consumer pricing.',
    affiliateUrl: 'https://www.yt-industries.com/en/bikes/mountain/tues',
  },
]
