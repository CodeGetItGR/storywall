'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Users, Bell, UserPlus, AtSign } from 'lucide-react'
import { notifications as initialNotifs, users } from '@/lib/mock-data'
import Avatar from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Notification } from '@/lib/types'

const iconMap: Record<Notification['type'], React.ElementType> = {
  like:    Heart,
  comment: MessageCircle,
  rsvp:    Users,
  mention: AtSign,
  follow:  UserPlus,
}

const colorMap: Record<Notification['type'], string> = {
  like:    'text-rose-500 bg-rose-50',
  comment: 'text-sky-500 bg-sky-50',
  rsvp:    'text-emerald-500 bg-emerald-50',
  mention: 'text-violet-500 bg-violet-50',
  follow:  'text-amber-500 bg-amber-50',
}

function timeAgo(dateStr: string): string {
  const now = new Date('2025-07-11T12:00:00Z').getTime()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(initialNotifs)

  const unreadCount = notifs.filter(n => !n.read).length

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const today = notifs.filter(n => !n.read)
  const earlier = notifs.filter(n => n.read)

  return (
    <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-ink">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-ink-faint" />
          </div>
          <p className="text-sm font-medium text-ink-muted">No notifications yet</p>
          <p className="text-xs text-ink-faint mt-1">We&apos;ll let you know when something happens</p>
        </div>
      ) : (
        <div>
          {today.length > 0 && (
            <section>
              <p className="px-4 pt-5 pb-2 text-xs font-bold text-ink-muted uppercase tracking-wide">New</p>
              {today.map(n => (
                <NotifRow key={n.id} notif={n} onRead={() => markRead(n.id)} />
              ))}
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <p className="px-4 pt-5 pb-2 text-xs font-bold text-ink-muted uppercase tracking-wide">Earlier</p>
              {earlier.map(n => (
                <NotifRow key={n.id} notif={n} onRead={() => markRead(n.id)} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function NotifRow({ notif, onRead }: { notif: Notification; onRead: () => void }) {
  const fromUser = users.find(u => u.id === notif.fromUserId)
  if (!fromUser) return null

  const Icon = iconMap[notif.type]
  const colorCls = colorMap[notif.type]

  return (
    <button
      onClick={onRead}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted',
        !notif.read && 'bg-primary-light/40',
      )}
    >
      {/* Avatar with type badge */}
      <div className="relative flex-shrink-0">
        <Avatar initials={fromUser.initials} color={fromUser.avatarColor} size="md" alt={fromUser.name} />
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background',
          colorCls,
        )}>
          <Icon className="w-2.5 h-2.5" strokeWidth={2} />
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className={cn(
          'text-sm leading-snug',
          notif.read ? 'text-ink-muted' : 'text-ink font-medium',
        )}>
          {notif.content}
        </p>
        <p className="text-xs text-ink-faint mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>

      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" aria-hidden="true" />
      )}
    </button>
  )
}
