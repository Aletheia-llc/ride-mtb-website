export const Routes = {
  home: '/',
  forum: {
    index: '/forum',
    category: (slug: string) => `/forum/${slug}`,
    thread: (threadId: string) => `/forum/thread/${threadId}`,
    newThread: (categorySlug: string) => `/forum/${categorySlug}/new`,
  },
  learn: {
    index: '/learn',
    courses: '/learn/courses',
    course: (slug: string) => `/learn/courses/${slug}`,
    lesson: (courseSlug: string, moduleSlug: string) => `/learn/courses/${courseSlug}/${moduleSlug}`,
    quizzes: '/learn/quizzes',
    quiz: (slug: string) => `/learn/quizzes/${slug}`,
    leaderboard: '/learn/leaderboard',
    certificate: (certId: string) => `/learn/certificates/${certId}`,
  },
  trails: {
    index: '/trails',
    explore: '/trails/explore',
    map: '/trails/map',
    trail: (slug: string) => `/trails/${slug}`,
    compare: '/trails/compare',
    submit: '/trails/submit',
  },
  bikes: {
    selector: '/bikes/selector',
    garage: '/bikes/garage',
    results: '/bikes/selector/results',
  },
  events: {
    index: '/events',
    event: (id: string) => `/events/${id}`,
  },
  reviews: {
    index: '/reviews',
    review: (id: string) => `/reviews/${id}`,
  },
  marketplace: {
    index: '/buy-sell',
    listing: (id: string) => `/buy-sell/${id}`,
    create: '/buy-sell/create',
  },
  merch: {
    index: '/merch',
    product: (slug: string) => `/merch/${slug}`,
  },
  shops: {
    index: '/shops',
    shop: (slug: string) => `/shops/${slug}`,
  },
  media: {
    index: '/media',
    video: (id: string) => `/media/${id}`,
  },
  coaching: {
    index: '/coaching',
    coach: (id: string) => `/coaching/${id}`,
  },
  rides: {
    index: '/rides',
    log: (id: string) => `/rides/${id}`,
  },
  profile: {
    view: (username: string) => `/profile/${username}`,
    settings: '/profile/settings',
    dashboard: '/profile/dashboard',
  },
  auth: {
    signIn: '/signin',
    register: '/register',
  },
  admin: {
    index: '/admin',
    forum: '/admin/forum',
    learn: '/admin/learn',
    trails: '/admin/trails',
  },
} as const
