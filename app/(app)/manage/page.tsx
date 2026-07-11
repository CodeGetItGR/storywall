'use client'

import { useState } from 'react'
import {
  Users, MessageSquare, Gift, Music, LayoutDashboard,
  TrendingUp, CheckCircle2, Clock, XCircle, Flag, Trash2,
  ChevronRight, Eye, EyeOff
} from 'lucide-react'
import { posts, rsvpGuests, giftItems, playlist, notifications } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type ManageTab = 'overview' | 'posts' | 'rsvp' | 'registry'

const tabItems: { key: ManageTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'posts',    label: 'Posts',    icon: MessageSquare },
  { key: 'rsvp',     label: 'RSVP',     icon: Users },
  { key: 'registry', label: 'Registry', icon: Gift },
]

export default function ManagePage() {
  const [tab, setTab] = useState<ManageTab>('overview')
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set())
  const [flaggedPosts, setFlaggedPosts] = useState<Set<string>>(new Set())

  const confirmedGuests = rsvpGuests.filter(g => g.status === 'attending')
  const pendingGuests   = rsvpGuests.filter(g => g.status === 'pending')
  const declinedGuests  = rsvpGuests.filter(g => g.status === 'not-attending')
  const totalGuests     = confirmedGuests.reduce((sum, g) => sum + 1 + g.plusOnes, 0)

  const reservedItems  = giftItems.filter(g => g.reserved)
  const registryValue  = reservedItems.reduce((sum, g) => sum + g.price, 0)
  const unreadNotifs   = notifications.filter(n => !n.read).length
  const topSong        = [...playlist].sort((a, b) => b.votes - a.votes)[0]

  return (
    <div className="max-w-3xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-ink">Host Dashboard</h1>
          </div>
          <p className="text-xs text-ink-muted">Emma &amp; James · Oct 18, 2025</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary-light text-primary-dark text-xs font-bold">Host View</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-muted rounded-full p-1 mx-4 mb-5">
        {tabItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-colors',
              tab === key ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="px-4 flex flex-col gap-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total guests" value={`${totalGuests}`}
              sub={`${confirmedGuests.length} RSVPs confirmed`}
              color="bg-emerald-50 text-emerald-600"
              Icon={Users}
            />
            <StatCard
              label="Days to go" value="99"
              sub="October 18, 2025"
              color="bg-rose-50 text-rose-500"
              Icon={Clock}
            />
            <StatCard
              label="Registry claimed" value={`${reservedItems.length}/${giftItems.length}`}
              sub={`$${registryValue.toLocaleString()} reserved`}
              color="bg-amber-50 text-amber-500"
              Icon={Gift}
            />
            <StatCard
              label="Wall posts" value={`${posts.length}`}
              sub={`${unreadNotifs} new notifications`}
              color="bg-violet-50 text-violet-500"
              Icon={MessageSquare}
            />
          </div>

          {/* RSVP breakdown */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-ink">RSVP Breakdown</p>
              <button onClick={() => setTab('rsvp')} className="text-xs text-primary font-semibold hover:underline">See all</button>
            </div>
            <div className="flex gap-2 mb-3">
              {[
                { label: 'Confirmed', count: confirmedGuests.length, color: 'bg-emerald-500' },
                { label: 'Pending', count: pendingGuests.length, color: 'bg-amber-400' },
                { label: 'Declined', count: declinedGuests.length, color: 'bg-rose-400' },
              ].map(({ label, count, color }) => {
                const pct = Math.round((count / rsvpGuests.length) * 100)
                return (
                  <div key={label} className="flex-1 text-center">
                    <p className="text-xl font-bold text-ink tabular-nums">{count}</p>
                    <div className="h-1.5 rounded-full bg-border my-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-ink-muted">{label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top playlist song */}
          {topSong && (
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Top Requested Song</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{topSong.title}</p>
                  <p className="text-xs text-ink-muted">{topSong.artist} · {topSong.votes} votes</p>
                </div>
                <Link href="/tools/playlist" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                  Playlist <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Send RSVP reminder', href: '/tools/rsvp', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                { label: 'Export guest list', href: '#', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
                { label: 'View registry', href: '/tools/gifts', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                { label: 'Manage seating', href: '/tools/seating', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
              ].map(({ label, href, color }) => (
                <Link
                  key={label}
                  href={href}
                  className={cn('flex items-center justify-center text-center px-3 py-3 rounded-xl text-xs font-semibold transition-colors', color)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Recent Activity</p>
            <div className="flex flex-col gap-0">
              {notifications.slice(0, 5).map((n, i) => (
                <div key={n.id} className={cn('py-2.5 flex items-start gap-2', i < 4 && 'border-b border-border/50')}>
                  <div className={cn('w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0', n.read ? 'bg-border' : 'bg-primary')} />
                  <p className="text-xs text-ink-muted leading-snug flex-1">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Posts moderation ── */}
      {tab === 'posts' && (
        <div className="px-4 flex flex-col gap-3">
          <p className="text-xs text-ink-muted mb-1">
            {posts.length} posts on the wall · {flaggedPosts.size} flagged · {hiddenPosts.size} hidden
          </p>
          {posts.map(post => {
            const isHidden = hiddenPosts.has(post.id)
            const isFlagged = flaggedPosts.has(post.id)
            return (
              <div
                key={post.id}
                className={cn(
                  'bg-card rounded-2xl border shadow-sm p-4 transition-opacity',
                  isHidden && 'opacity-50',
                  isFlagged && 'border-rose-200 bg-rose-50/30',
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1">
                      Post by user · {post.likes} likes · {post.commentCount} comments
                    </p>
                    <p className="text-sm text-ink leading-snug line-clamp-3">{post.content}</p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {post.tags.map(t => <span key={t} className="text-xs text-primary">#{t}</span>)}
                      </div>
                    )}
                  </div>
                  {isFlagged && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">Flagged</span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => setHiddenPosts(prev => {
                      const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                  >
                    {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {isHidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button
                    onClick={() => setFlaggedPosts(prev => {
                      const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n
                    })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      isFlagged ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-surface-muted text-ink-muted hover:text-ink',
                    )}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {isFlagged ? 'Unflag' : 'Flag'}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-rose-500 hover:bg-rose-50 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── RSVP management ── */}
      {tab === 'rsvp' && (
        <div className="px-4 flex flex-col gap-3">
          <p className="text-xs text-ink-muted mb-1">
            {rsvpGuests.length} total invitations · {totalGuests} guests attending
          </p>
          {rsvpGuests.map(guest => (
            <div key={guest.id} className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                guest.status === 'attending' ? 'bg-emerald-50' : guest.status === 'pending' ? 'bg-amber-50' : 'bg-rose-50',
              )}>
                {guest.status === 'attending' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {guest.status === 'pending'   && <Clock className="w-5 h-5 text-amber-500" />}
                {guest.status === 'not-attending' && <XCircle className="w-5 h-5 text-rose-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-ink">{guest.name}</p>
                  {guest.plusOnes > 0 && (
                    <span className="text-xs text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-full">+{guest.plusOnes}</span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{guest.email}</p>
                {guest.dietary && <p className="text-xs text-amber-600 font-medium mt-0.5">Diet: {guest.dietary}</p>}
                {guest.message && <p className="text-xs text-ink-muted mt-1 italic line-clamp-2">&ldquo;{guest.message}&rdquo;</p>}
              </div>
              {guest.status === 'pending' && (
                <button className="flex-shrink-0 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition-colors">
                  Remind
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Registry management ── */}
      {tab === 'registry' && (
        <div className="px-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">{reservedItems.length}</p>
              <p className="text-xs text-ink-muted mt-0.5">Items reserved</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 tabular-nums">${registryValue.toLocaleString()}</p>
              <p className="text-xs text-ink-muted mt-0.5">Total value</p>
            </div>
          </div>
          {giftItems.map(item => (
            <div key={item.id} className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', item.reserved ? 'bg-emerald-50' : 'bg-surface-muted')}>
                <Gift className={cn('w-5 h-5', item.reserved ? 'text-emerald-500' : 'text-ink-faint')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-muted">${item.price.toLocaleString()} · {item.category}</p>
                {item.reserved && item.reservedBy && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Reserved by {item.reservedBy}</p>
                )}
              </div>
              <span className={cn(
                'flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                item.reserved ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-muted text-ink-muted',
              )}>
                {item.reserved ? 'Reserved' : 'Available'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label, value, sub, color, Icon,
}: {
  label: string; value: string; sub: string; color: string; Icon: React.ElementType
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon className="w-4 h-4" strokeWidth={1.8} />
      </div>
      <p className="text-2xl font-bold text-ink tabular-nums leading-none">{value}</p>
      <p className="text-xs font-semibold text-ink mt-1">{label}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{sub}</p>
    </div>
  )
}
