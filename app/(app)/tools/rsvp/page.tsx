'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider'
import { useCreateRsvp, useEventRsvps, useRsvp, useUpdateRsvp } from '@/hooks/useRsvps'
import { useEventMembers } from '@/hooks/useEventMembers'
import type { AttendanceStatus } from '@/lib/api/types'

type AttendingStatus = 'attending' | 'not-attending'

function rsvpStorageKey(memberId: string) {
  return `storywall.rsvpId.${memberId}`
}

export default function RSVPPage() {
  const t = useTranslations('RSVPPage')
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeEvent = useActiveEvent()
  const activeMember = useActiveMember()
  const eventId = activeEvent?.id ?? null
  const memberId = activeMember?.id ?? null
  const isHost = useIsHost()

  const presetAttending = searchParams.get('attending')
  const [attending, setAttending] = useState<AttendingStatus | null>(
    presetAttending === 'attending' || presetAttending === 'not-attending' ? presetAttending : null,
  )
  const [dietary, setDietary] = useState('')
  const [message, setMessage] = useState('')
  const [plusOnes, setPlusOnes] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const [rsvpId, setRsvpId] = useState<string | null>(null)
  useEffect(() => {
    if (!memberId) return
    setRsvpId(localStorage.getItem(rsvpStorageKey(memberId)))
  }, [memberId])

  const { data: existingRsvp } = useRsvp(rsvpId)

  // Server data is the source of truth for an already-submitted RSVP, but it
  // arrives after mount — hydrate the form once it loads without clobbering
  // whatever the guest has already started typing.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!existingRsvp || hydratedRef.current) return
    hydratedRef.current = true
    setAttending(existingRsvp.attendanceStatus === 'ATTENDING' ? 'attending' : 'not-attending')
    setPlusOnes(Math.max(0, existingRsvp.adultCount - 1))
    setDietary(existingRsvp.dietaryNotes ?? '')
    setMessage(existingRsvp.notes ?? '')
  }, [existingRsvp])

  const createRsvp = useCreateRsvp(eventId ?? undefined)
  const updateRsvp = useUpdateRsvp(rsvpId ?? '', eventId ?? undefined)

  // Only HOST members can list every guest's RSVP — attendees only ever see
  // their own via useRsvp above, so skip this fetch (and the guest list) for
  // everyone else.
  const { data: eventRsvps } = useEventRsvps(isHost ? eventId : null)
  const { data: eventMembers } = useEventMembers(isHost ? eventId : null)
  const memberNames = new Map((eventMembers ?? []).map(m => [m.id, m.displayName]))
  const confirmedGuests = (eventRsvps ?? [])
    .filter(r => r.attendanceStatus === 'ATTENDING')
    .map(r => ({ ...r, name: memberNames.get(r.eventMemberId) ?? r.eventMemberId }))

  const summary = activeEvent?.rsvpSummary

  const isSubmitting = createRsvp.isPending || updateRsvp.isPending
  const submitError = createRsvp.error ?? updateRsvp.error

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!attending || !memberId) return

    const attendanceStatus: AttendanceStatus = attending === 'attending' ? 'ATTENDING' : 'DECLINED'
    const adultCount = 1 + plusOnes

    if (rsvpId) {
      await updateRsvp.mutateAsync({
        attendanceStatus,
        adultCount,
        childCount: 0,
        dietaryNotes: dietary || undefined,
        notes: message || undefined,
      })
    } else {
      const created = await createRsvp.mutateAsync({
        eventMemberId: memberId,
        attendanceStatus,
        adultCount,
        childCount: 0,
        dietaryNotes: dietary || undefined,
        notes: message || undefined,
        submittedAt: new Date().toISOString(),
      })
      setRsvpId(created.id)
      localStorage.setItem(rsvpStorageKey(memberId), created.id)
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
        <div className="flex items-center gap-3 py-4 mb-4">
          <button onClick={() => router.back()} aria-label={t('goBack')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-ink">{t('title')}</h1>
        </div>
        <div className="flex flex-col items-center text-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">
            {attending === 'attending' ? t('onTheList') : t('rsvpReceived')}
          </h2>
          <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
            {attending === 'attending' ? t('attendingConfirmation') : t('declinedConfirmation')}
          </p>
          <button
            onClick={() => router.push('/feed')}
            className="mt-8 px-8 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t('backToTheWall')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 mb-2">
        <button onClick={() => router.back()} aria-label={t('goBack')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink">{t('title')}</h1>
      </div>

      {/* RSVP form */}
      <div className="p-5 mb-6">
        <h2 className="text-base font-bold text-ink mb-4">{t('yourRsvp')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Attending? */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('willYouAttend')}</p>
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
                {t('joyfullyAccept')}
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
                {t('regretfullyDecline')}
              </button>
            </div>
          </div>

          {attending === 'attending' && (
            <>
              {/* Plus-ones */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('plusOnes')}</p>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3">
                  <button type="button" onClick={() => setPlusOnes(p => Math.max(0, p - 1))} className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold">−</button>
                  <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">{t('guestsCount', { count: plusOnes })}</span>
                  <button type="button" onClick={() => setPlusOnes(p => Math.min(4, p + 1))} className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold">+</button>
                </div>
              </div>

              {/* Dietary */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('dietaryRequirements')}</p>
                <div className="relative">
                  <select
                    value={dietary}
                    onChange={e => setDietary(e.target.value)}
                    className="w-full appearance-none bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition pr-10"
                    aria-label={t('dietaryRequirements')}
                  >
                    <option value="">{t('dietaryOptions.none')}</option>
                    <option value="vegetarian">{t('dietaryOptions.vegetarian')}</option>
                    <option value="vegan">{t('dietaryOptions.vegan')}</option>
                    <option value="gluten-free">{t('dietaryOptions.glutenFree')}</option>
                    <option value="halal">{t('dietaryOptions.halal')}</option>
                    <option value="kosher">{t('dietaryOptions.kosher')}</option>
                    <option value="other">{t('dietaryOptions.other')}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('messageForCouple')}</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder={t('messagePlaceholder')}
              className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
              aria-label={t('messageAriaLabel')}
            />
          </div>

          {submitError && (
            <p className="text-xs text-rose-500 text-center">{t('submitError')}</p>
          )}

          <button
            type="submit"
            disabled={!attending || !memberId || isSubmitting}
            className="w-full py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {t('submitRsvp')}
          </button>
        </form>
      </div>

      {/* Guest list — HOST only, attendees don't have visibility into others' RSVPs */}
      {isHost && confirmedGuests.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-ink mb-3">{t('whosComing')}</h2>
          <div className="flex flex-col gap-2">
            {confirmedGuests.map(guest => (
              <div key={guest.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-3 border border-border/50 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-ink">{guest.name}</p>
                  {guest.notes && <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">&ldquo;{guest.notes}&rdquo;</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {guest.adultCount + guest.childCount > 1 && (
                    <span className="text-xs text-ink-muted bg-surface-muted px-2 py-0.5 rounded-full">+{guest.adultCount + guest.childCount - 1}</span>
                  )}
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
