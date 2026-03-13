import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, BookOpen, ClipboardList, Trophy, LayoutDashboard,
  MessageSquare, LayoutList, Users, Search, Bookmark, PenLine, CalendarDays,
  Map, Compass, MapPin,
  Bike, Sliders, Wrench, Star,
  ShoppingBag, Tag, PlusCircle,
} from 'lucide-react'

export interface MegaNavLink {
  icon: LucideIcon
  label: string
  href: string
}

export interface MegaNavGroup {
  label: string
  links: MegaNavLink[]
}

export interface MegaNavFeatured {
  icon: LucideIcon
  title: string
  description: string
  href: string
  ctaLabel: string
  bgClass: string
}

export interface MegaNavEntry {
  featured: MegaNavFeatured
  groups: MegaNavGroup[]
}

export const MEGA_NAV_CONFIG: Record<string, MegaNavEntry> = {
  learn: {
    featured: {
      icon: GraduationCap,
      title: 'Level Up Your Skills',
      description: 'Start with beginner fundamentals or jump into advanced technique.',
      href: '/learn/courses',
      ctaLabel: 'Browse Courses',
      bgClass: 'bg-emerald-500/10',
    },
    groups: [
      {
        label: 'Explore',
        links: [
          { icon: BookOpen, label: 'Courses', href: '/learn/courses' },
          { icon: ClipboardList, label: 'Quizzes', href: '/learn/quizzes' },
          { icon: Trophy, label: 'Leaderboard', href: '/learn/leaderboard' },
        ],
      },
      {
        label: 'Your Progress',
        links: [
          { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
          { icon: GraduationCap, label: 'My Certificates', href: '/dashboard' },
        ],
      },
    ],
  },
  forum: {
    featured: {
      icon: MessageSquare,
      title: 'Join the Conversation',
      description: 'Ask questions, share rides, connect with the MTB community.',
      href: '/forum',
      ctaLabel: 'Browse Forum',
      bgClass: 'bg-blue-500/10',
    },
    groups: [
      {
        label: 'Browse',
        links: [
          { icon: LayoutList, label: 'All Posts', href: '/forum' },
          { icon: Users, label: 'Communities', href: '/forum/communities' },
          { icon: Search, label: 'Search', href: '/forum/search' },
          { icon: CalendarDays, label: 'Events', href: '/events' },
        ],
      },
      {
        label: 'You',
        links: [
          { icon: Bookmark, label: 'Bookmarks', href: '/forum/bookmarks' },
          { icon: PenLine, label: 'New Post', href: '/forum/new' },
        ],
      },
    ],
  },
  trails: {
    featured: {
      icon: Map,
      title: 'Find Your Next Trail',
      description: 'Explore trail systems, view maps, and discover new terrain near you.',
      href: '/trails/explore',
      ctaLabel: 'Explore Trails',
      bgClass: 'bg-orange-500/10',
    },
    groups: [
      {
        label: 'Discover',
        links: [
          { icon: Compass, label: 'Explore Systems', href: '/trails/explore' },
          { icon: MapPin, label: 'Trail Map', href: '/trails/map' },
        ],
      },
    ],
  },
  bikes: {
    featured: {
      icon: Bike,
      title: 'Find Your Perfect Bike',
      description: 'Answer a few questions and get matched to your ideal mountain bike.',
      href: '/bikes/selector',
      ctaLabel: 'Take the Quiz',
      bgClass: 'bg-purple-500/10',
    },
    groups: [
      {
        label: 'Tools',
        links: [
          { icon: Sliders, label: 'Bike Selector', href: '/bikes/selector' },
          { icon: Wrench, label: 'My Garage', href: '/bikes/garage' },
        ],
      },
      {
        label: 'Research',
        links: [
          { icon: Star, label: 'Reviews', href: '/reviews' },
        ],
      },
    ],
  },
  marketplace: {
    featured: {
      icon: ShoppingBag,
      title: 'Buy & Sell Gear',
      description: 'Find used bikes, parts, and gear from the Ride MTB community.',
      href: '/marketplace',
      ctaLabel: 'Browse Listings',
      bgClass: 'bg-yellow-500/10',
    },
    groups: [
      {
        label: 'Shop',
        links: [
          { icon: Tag, label: 'Browse Listings', href: '/marketplace' },
          { icon: PlusCircle, label: 'Create Listing', href: '/marketplace/create' },
        ],
      },
    ],
  },
}
