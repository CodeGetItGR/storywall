'use client'

import { useState } from 'react'
import {
  Users, MessageSquare, Gift, Music, LayoutDashboard,
  TrendingUp, CheckCircle2, Clock, XCircle, Flag, Trash2,
  ChevronRight, Eye, EyeOff
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { posts, rsvpGuests, giftItems, playlist, notifications } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type ManageTab = 'overview' | 'posts' | 'rsvp' | 'registry'

const tabItems: { key: ManageTab; icon: React.ElementType }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'posts',    icon: MessageSquare },
  { key: 'rsvp',     icon: Users },
  { key: 'registry', icon: Gift },
]

export default function ManagePage() {
  const t = useTranslations('ManagePage')
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

  const quickActions = [
    { key: 'sendRsvpReminder', href: '/tools/rsvp', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { key: 'exportGuestList', href: '#', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
    { key: 'viewRegistry', href: '/tools/gifts', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { key: 'manageSeating', href: '/tools/seating', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
  ] as const

  const rsvpBreakdown = [
    { key: 'confirmed', count: confirmedGuests.length, color: 'bg-emerald-500' },
    { key: 'pending', count: pendingGuests.length, color: 'bg-amber-400' },
    { key: 'declined', count: declinedGuests.length, color: 'bg-rose-400' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-ink">{t('title')}</h1>
          </div>
          <p className="text-xs text-ink-muted">{t('eventNameAndDate')}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary-light text-primary-dark text-xs font-bold">{t('hostView')}</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-muted rounded-full p-1 mx-4 mb-5">
        {tabItems.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-colors',
              tab === key ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="px-4 flex flex-col gap-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t('stats.totalGuests.label')} value={`${totalGuests}`}
              sub={t('stats.totalGuests.sub', { count: confirmedGuests.length })}
              color="bg-emerald-50 text-emerald-600"
              Icon={Users}
            />
            <StatCard
              label={t('stats.daysToGo.label')} value="99"
              sub={t('stats.daysToGo.sub')}
              color="bg-rose-50 text-rose-500"
              Icon={Clock}
            />
            <StatCard
              label={t('stats.registryClaimed.label')} value={`${reservedItems.length}/${giftItems.length}`}
              sub={t('stats.registryClaimed.sub', { value: registryValue.toLocaleString() })}
              color="bg-amber-50 text-amber-500"
              Icon={Gift}
            />
            <StatCard
              label={t('stats.wallPosts.label')} value={`${posts.length}`}
              sub={t('stats.wallPosts.sub', { count: unreadNotifs })}
              color="bg-violet-50 text-violet-500"
              Icon={MessageSquare}
            />
          </div>

          {/* RSVP breakdown */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-ink">{t('rsvpBreakdown.title')}</p>
              <button onClick={() => setTab('rsvp')} className="text-xs text-primary font-semibold hover:underline">{t('seeAll')}</button>
            </div>
            <div className="flex gap-2 mb-3">
              {rsvpBreakdown.map(({ key, count, color }) => {
                const pct = Math.round((count / rsvpGuests.length) * 100)
                return (
                  <div key={key} className="flex-1 text-center">
                    <p className="text-xl font-bold text-ink tabular-nums">{count}</p>
                    <div className="h-1.5 rounded-full bg-border my-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-ink-muted">{t(`rsvpBreakdown.${key}`)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top playlist song */}
          {topSong && (
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">{t('topRequestedSong')}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{topSong.title}</p>
                  <p className="text-xs text-ink-muted">{t('artistAndVotes', { artist: topSong.artist, votes: topSong.votes })}</p>
                </div>
                <Link href="/tools/playlist" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                  {t('playlist')} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">{t('quickActions')}</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ key, href, color }) => (
                <Link
                  key={key}
                  href={href}
                  className={cn('flex items-center justify-center text-center px-3 py-3 rounded-xl text-xs font-semibold transition-colors', color)}
                >
                  {t(`quickActionLabels.${key}`)}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">{t('recentActivity')}</p>
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
            {t('postsSummary', { total: posts.length, flagged: flaggedPosts.size, hidden: hiddenPosts.size })}
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
                      {t('postMeta', { likes: post.likes, comments: post.commentCount })}
                    </p>
                    <p className="text-sm text-ink leading-snug line-clamp-3">{post.content}</p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {post.tags.map(tag => <span key={tag} className="text-xs text-primary">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                  {isFlagged && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">{t('flagged')}</span>
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
                    {isHidden ? t('unhide') : t('hide')}
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
                    {isFlagged ? t('unflag') : t('flag')}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-rose-500 hover:bg-rose-50 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('delete')}
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
            {t('rsvpSummary', { total: rsvpGuests.length, attending: totalGuests })}
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
                {guest.dietary && <p className="text-xs text-amber-600 font-medium mt-0.5">{t('diet', { dietary: guest.dietary })}</p>}
                {guest.message && <p className="text-xs text-ink-muted mt-1 italic line-clamp-2">&ldquo;{guest.message}&rdquo;</p>}
              </div>
              {guest.status === 'pending' && (
                <button className="flex-shrink-0 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition-colors">
                  {t('remind')}
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
              <p className="text-xs text-ink-muted mt-0.5">{t('itemsReserved')}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 tabular-nums">${registryValue.toLocaleString()}</p>
              <p className="text-xs text-ink-muted mt-0.5">{t('totalValue')}</p>
            </div>
          </div>
          {giftItems.map(item => (
            <div key={item.id} className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', item.reserved ? 'bg-emerald-50' : 'bg-surface-muted')}>
                <Gift className={cn('w-5 h-5', item.reserved ? 'text-emerald-500' : 'text-ink-faint')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-muted">{t('priceAndCategory', { price: item.price.toLocaleString(), category: item.category })}</p>
                {item.reserved && item.reservedBy && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">{t('reservedBy', { name: item.reservedBy })}</p>
                )}
              </div>
              <span className={cn(
                'flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                item.reserved ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-muted text-ink-muted',
              )}>
                {item.reserved ? t('reserved') : t('available')}
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
