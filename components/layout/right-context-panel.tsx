import Link from 'next/link'
import { Calendar, Users, Clock, ChevronRight, Heart } from 'lucide-react'
import { scheduleEvents, rsvpGuests } from '@/lib/mock-data'

function getCountdown(): number {
  const wedding = new Date('2025-10-18T00:00:00')
  const today = new Date('2025-07-11T00:00:00')
  return Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function RightContextPanel() {
  const countdown = getCountdown()
  const upcomingEvents = scheduleEvents
    .filter(e => new Date(e.date + 'T00:00:00') >= new Date('2025-07-11T00:00:00'))
    .slice(0, 3)
  const attending = rsvpGuests.filter(g => g.status === 'attending').length
  const pending = rsvpGuests.filter(g => g.status === 'pending').length

  const quickLinks = [
    { label: 'Gift Registry', href: '/tools/gifts' },
    { label: 'Venue Info', href: '/tools/venue' },
    { label: 'Wedding Playlist', href: '/tools/playlist' },
    { label: 'Seating Chart', href: '/tools/seating' },
  ]

  return (
    <aside
      aria-label="Wedding details"
      className="fixed right-0 top-0 h-screen w-[300px] bg-background border-l border-border hidden xl:flex flex-col z-30 overflow-y-auto no-scrollbar"
    >
      <div className="flex flex-col gap-5 p-5">

        {/* Countdown */}
        <div className="bg-gradient-brand rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 fill-white" aria-hidden="true" />
            <span className="text-xs font-medium opacity-90 uppercase tracking-wide">Countdown</span>
          </div>
          <p className="text-4xl font-bold leading-none tabular-nums">{countdown}</p>
          <p className="text-sm opacity-80 mt-1.5">days until October 18th</p>
        </div>

        {/* RSVP summary */}
        <div className="bg-surface-muted rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-muted" aria-hidden="true" />
              <span className="text-sm font-semibold text-ink">RSVP Status</span>
            </div>
            <Link href="/tools/rsvp" className="text-xs text-primary font-semibold hover:underline">
              View all
            </Link>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-card rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">{attending}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">Attending</p>
            </div>
            <div className="flex-1 bg-card rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-amber-500 tabular-nums">{pending}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">Pending</p>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-muted" aria-hidden="true" />
              <span className="text-sm font-semibold text-ink">Upcoming</span>
            </div>
            <Link href="/tools/schedule" className="text-xs text-primary font-semibold hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map(event => {
              const d = new Date(event.date + 'T00:00:00')
              const mon = d.toLocaleString('en-US', { month: 'short' })
              const day = d.getDate()
              return (
                <Link key={event.id} href="/tools/schedule">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-muted hover:bg-border transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-card flex flex-col items-center justify-center shadow-sm">
                      <span className="text-[9px] text-ink-muted uppercase leading-none font-medium">{mon}</span>
                      <span className="text-sm font-bold text-ink leading-none">{day}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-ink truncate leading-tight">{event.title}</p>
                      <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {event.time}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-sm font-semibold text-ink mb-2">Quick Links</p>
          <div className="space-y-0.5">
            {quickLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-muted transition-colors group"
              >
                <span className="text-sm text-ink-muted group-hover:text-ink transition-colors">{label}</span>
                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink-muted transition-colors" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </aside>
  )
}
