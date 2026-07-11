'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rsvpGuests } from '@/lib/mock-data'

type AttendingStatus = 'attending' | 'not-attending' | 'pending'

export default function RSVPPage() {
  const router = useRouter()
  const [attending, setAttending] = useState<AttendingStatus | null>(null)
  const [dietary, setDietary] = useState('')
  const [message, setMessage] = useState('')
  const [plusOnes, setPlusOnes] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const confirmed = rsvpGuests.filter(g => g.status === 'attending')
  const declined  = rsvpGuests.filter(g => g.status === 'not-attending')
  const pending   = rsvpGuests.filter(g => g.status === 'pending')

  const totalGuests = confirmed.reduce((sum, g) => sum + 1 + g.plusOnes, 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
        <div className="flex items-center gap-3 py-4 mb-4">
          <button onClick={() => router.back()} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-ink">RSVP</h1>
        </div>
        <div className="flex flex-col items-center text-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">
            {attending === 'attending' ? "You're on the list!" : "RSVP received"}
          </h2>
          <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
            {attending === 'attending'
              ? "We can't wait to celebrate with you! You'll receive updates as the big day approaches."
              : "Thank you for letting us know. You'll still have access to the StoryWall."}
          </p>
          <button
            onClick={() => router.push('/feed')}
            className="mt-8 px-8 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Back to the Wall
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 mb-2">
        <button onClick={() => router.back()} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink">RSVP</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Attending', count: confirmed.length, sub: `${totalGuests} guests`, color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: CheckCircle2 },
          { label: 'Pending', count: pending.length, sub: 'awaiting reply', color: 'text-amber-500', bg: 'bg-amber-50', Icon: Clock },
          { label: 'Declined', count: declined.length, sub: 'not attending', color: 'text-rose-500', bg: 'bg-rose-50', Icon: XCircle },
        ].map(({ label, count, sub, color, bg, Icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 flex flex-col items-center text-center`}>
            <Icon className={`w-5 h-5 ${color} mb-1`} strokeWidth={1.8} />
            <p className={`text-2xl font-bold ${color} tabular-nums`}>{count}</p>
            <p className="text-xs font-medium text-ink-muted mt-0.5 leading-tight">{label}</p>
            <p className="text-[10px] text-ink-faint leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      {/* RSVP form */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-6">
        <h2 className="text-base font-bold text-ink mb-4">Your RSVP</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Attending? */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Will you attend?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAttending('attending')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                  attending === 'attending'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                    : 'border-border text-ink-muted hover:border-emerald-200',
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Joyfully accept
              </button>
              <button
                type="button"
                onClick={() => setAttending('not-attending')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                  attending === 'not-attending'
                    ? 'border-rose-300 bg-rose-50 text-rose-500'
                    : 'border-border text-ink-muted hover:border-rose-200',
                )}
              >
                <XCircle className="w-4 h-4" />
                Regretfully decline
              </button>
            </div>
          </div>

          {attending === 'attending' && (
            <>
              {/* Plus-ones */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Plus ones</p>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3">
                  <button type="button" onClick={() => setPlusOnes(p => Math.max(0, p - 1))} className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold">−</button>
                  <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">{plusOnes} guest{plusOnes !== 1 ? 's' : ''}</span>
                  <button type="button" onClick={() => setPlusOnes(p => Math.min(4, p + 1))} className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold">+</button>
                </div>
              </div>

              {/* Dietary */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Dietary requirements</p>
                <div className="relative">
                  <select
                    value={dietary}
                    onChange={e => setDietary(e.target.value)}
                    className="w-full appearance-none bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition pr-10"
                    aria-label="Dietary requirements"
                  >
                    <option value="">None / No restrictions</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="gluten-free">Gluten-free</option>
                    <option value="halal">Halal</option>
                    <option value="kosher">Kosher</option>
                    <option value="other">Other (specify in message)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Message for Emma & James</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Optional — share your excitement or a special note..."
              className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
              aria-label="Message for the couple"
            />
          </div>

          <button
            type="submit"
            disabled={!attending}
            className="w-full py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Submit RSVP
          </button>
        </form>
      </div>

      {/* Guest list */}
      <h2 className="text-sm font-bold text-ink mb-3">Who&apos;s coming</h2>
      <div className="flex flex-col gap-2">
        {confirmed.map(guest => (
          <div key={guest.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-3 border border-border/50 shadow-sm">
            <div>
              <p className="text-sm font-medium text-ink">{guest.name}</p>
              {guest.message && <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">&ldquo;{guest.message}&rdquo;</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {guest.plusOnes > 0 && (
                <span className="text-xs text-ink-muted bg-surface-muted px-2 py-0.5 rounded-full">+{guest.plusOnes}</span>
              )}
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
