import Link from 'next/link'
import {
  Users, Gift, BookHeart, Calendar, MapPin,
  Music, HelpCircle, LayoutGrid, Mail, ChevronRight
} from 'lucide-react'

const tools = [
  {
    href: '/tools/rsvp',
    icon: Users,
    label: 'RSVP',
    description: 'Confirm your attendance and dietary preferences',
    color: 'bg-emerald-50 text-emerald-600',
    badge: '6 attending',
  },
  {
    href: '/tools/gifts',
    icon: Gift,
    label: 'Gift Registry',
    description: 'Browse the couple\'s wish list and claim a gift',
    color: 'bg-rose-50 text-rose-500',
    badge: '3 reserved',
  },
  {
    href: '/tools/wishbook',
    icon: BookHeart,
    label: 'Wishbook',
    description: 'Leave a heartfelt message for Emma & James',
    color: 'bg-pink-50 text-pink-500',
    badge: '4 entries',
  },
  {
    href: '/tools/schedule',
    icon: Calendar,
    label: 'Schedule',
    description: 'Full timeline of events leading up to the big day',
    color: 'bg-amber-50 text-amber-500',
    badge: '9 events',
  },
  {
    href: '/tools/venue',
    icon: MapPin,
    label: 'Venue',
    description: 'Rosewood Estate — directions, parking & amenities',
    color: 'bg-sky-50 text-sky-500',
    badge: null,
  },
  {
    href: '/tools/playlist',
    icon: Music,
    label: 'Playlist',
    description: 'Vote on songs and suggest tracks for the reception',
    color: 'bg-violet-50 text-violet-500',
    badge: '10 songs',
  },
  {
    href: '/tools/quiz',
    icon: HelpCircle,
    label: 'Couple Quiz',
    description: 'How well do you know Emma & James?',
    color: 'bg-orange-50 text-orange-500',
    badge: '5 questions',
  },
  {
    href: '/tools/seating',
    icon: LayoutGrid,
    label: 'Seating',
    description: 'Find your table assignment for the reception',
    color: 'bg-indigo-50 text-indigo-500',
    badge: '5 tables',
  },
  {
    href: '/tools/future-messages',
    icon: Mail,
    label: 'Future Messages',
    description: 'Write a letter to be opened on their anniversary',
    color: 'bg-teal-50 text-teal-500',
    badge: null,
  },
]

export default function ToolsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
      <div className="pt-5 pb-6">
        <h1 className="text-2xl font-bold text-ink">Tools</h1>
        <p className="text-sm text-ink-muted mt-1">Everything you need to enjoy and participate in the wedding</p>
      </div>

      <div className="flex flex-col gap-2">
        {tools.map(tool => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex items-center gap-4 bg-card rounded-2xl px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-border/50 group"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${tool.color}`}>
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{tool.label}</p>
                  {tool.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted text-[11px] font-medium">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5 leading-snug">{tool.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink-muted transition-colors flex-shrink-0" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
