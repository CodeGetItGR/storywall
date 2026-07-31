'use client'

import React, { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { HeartCrack, User, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useEventInvitationPreview } from '@/hooks/useEventInvitations'
import { useMediaItem } from '@/hooks/useMedia'
import { getErrorMessage } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { InviteLayout } from '@/components/invite/InviteLayout'
import { Logo } from '@/components/common/Logo'

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png'

function TerminalState({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16">
      <Logo direction="col" className="mb-8" />
      <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
        <HeartCrack className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3 text-balance">{title}</h1>
      <p className="text-sm text-ink-muted max-w-sm leading-relaxed">{description}</p>
    </div>
  )
}

export default function InviteOnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const t = useTranslations('InviteOnboardingPage')
  const router = useRouter()
  const { guestLogin } = useAuth()

  const { data: preview, isLoading, error } = useEventInvitationPreview(token)
  const { data: coverMedia } = useMediaItem(preview?.coverMediaId ?? null)

  const [showGuestForm, setShowGuestForm] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
      </div>
    )
  }

  if ((error instanceof ApiError && error.status === 404) || !preview) {
    return <TerminalState title={t('invalidInvite.title')} description={t('invalidInvite.description')} />
  }

  if (preview.expired) {
    return <TerminalState title={t('expiredInvite.title')} description={t('expiredInvite.description')} />
  }

  if (preview.alreadyUsed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16">
        <Logo direction="col" className="mb-8" />
        <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
          <HeartCrack className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3 text-balance">{t('alreadyUsedInvite.title')}</h1>
        <p className="text-sm text-ink-muted max-w-sm mb-8 leading-relaxed">{t('alreadyUsedInvite.description')}</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t('haveAccount')}
        </Link>
      </div>
    )
  }

  const prefilledName = [preview.firstName, preview.lastName].filter(Boolean).join(' ')
  const loginHref = `/login?invite=${token}${preview.email ? `&email=${encodeURIComponent(preview.email)}` : ''}`
  const registerHref = `/register?invite=${token}${preview.email ? `&email=${encodeURIComponent(preview.email)}` : ''}`

  async function handleGuestSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuestError(null)
    setIsSubmitting(true)

    try {
      await guestLogin({ inviteToken: token, displayName: displayName.trim() || prefilledName })
      router.push('/feed')
    } catch (err) {
      setGuestError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <InviteLayout
      coverImageSrc={coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
      coverImageAlt={t('defaultHeroImageAlt')}
      eventTitle={preview.eventTitle}
      eventSubtitle={preview.eventSubtitle}
    >
      {preview.eventDescription && (
        <p className="text-sm text-ink-muted mb-7 leading-relaxed">{preview.eventDescription}</p>
      )}

      {!showGuestForm ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setDisplayName(prefilledName)
              setShowGuestForm(true)
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t('joinAsGuest')}
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href={loginHref}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-surface-muted/70 transition-colors"
          >
            {t('haveAccount')}
          </Link>
          <Link
            href={registerHref}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-surface-muted/70 transition-colors"
          >
            {t('createAccount')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleGuestSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              {t('guestForm.displayNameLabel')}
            </span>
            <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
              <User className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                type="text"
                placeholder={t('guestForm.displayNamePlaceholder')}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
              />
            </div>
          </label>

          {guestError && (
            <p role="alert" className="text-xs text-center text-red-500 -mt-1">
              {guestError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('guestForm.submit')}
          </button>

          <button
            type="button"
            onClick={() => setShowGuestForm(false)}
            className="text-xs text-center text-ink-muted hover:text-ink transition-colors"
          >
            {t('back')}
          </button>
        </form>
      )}
    </InviteLayout>
  )
}
