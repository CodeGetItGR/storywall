'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Heart, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/api/errors'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type Tab = 'login' | 'register' | 'invite'

export default function OnboardingPage() {
  const t = useTranslations('OnboardingPage')
  const router = useRouter()
  const { login, register, guestLogin } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (tab === 'login') {
        await login({ email, password })
      } else if (tab === 'register') {
        await register({ email, password })
      } else {
        // Accept either a bare token or a full invite link
        // (e.g. https://yourapp.com/invite/{token}) — use whatever's after
        // the last slash so pasting the full URL also works.
        const trimmed = inviteToken.trim()
        const token = trimmed.includes('/') ? trimmed.split('/').filter(Boolean).pop()! : trimmed
        await guestLogin(token)
      }
      router.push('/feed')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Hero panel — desktop left / mobile top */}
      <div className="relative lg:w-1/2 h-56 lg:h-screen flex-shrink-0 overflow-hidden">
        <Image
          src="/images/couple-hero.png"
          alt={t('heroImageAlt')}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60 lg:bg-gradient-to-r lg:from-transparent lg:to-black/40" />
        <div className="absolute bottom-6 left-6 right-6 lg:bottom-12 lg:left-10 lg:right-10 text-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-sm font-semibold tracking-wide opacity-90">StoryWall</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-balance">
            {t('coupleNames')}
          </h1>
          <p className="text-sm lg:text-base opacity-80 mt-1.5">{t('eventDateAndVenue')}</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <LanguageSwitcher className="mb-6 self-start" />
          {/* Logo mark on mobile */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-ink">StoryWall</span>
          </div>

          <h2 className="text-2xl font-bold text-ink mb-1">
            {tab === 'login' && t('titles.login')}
            {tab === 'register' && t('titles.register')}
            {tab === 'invite' && t('titles.invite')}
          </h2>
          <p className="text-sm text-ink-muted mb-7">
            {tab === 'login' && t('subtitles.login')}
            {tab === 'register' && t('subtitles.register')}
            {tab === 'invite' && t('subtitles.invite')}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-muted rounded-full p-1 mb-7">
            {(['login', 'register', 'invite'] as Tab[]).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={cn(
                  'flex-1 py-2 rounded-full text-sm font-medium transition-colors capitalize',
                  tab === tabKey
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {tabKey === 'login' ? t('tabs.login') : tabKey === 'register' ? t('tabs.register') : t('tabs.invite')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.fullName')}</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <User className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type="text"
                    placeholder={t('placeholders.fullName')}
                    required
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                </div>
              </label>
            )}

            {tab !== 'invite' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.email')}</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <Mail className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type="email"
                    placeholder={t('placeholders.email')}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                </div>
              </label>
            )}

            {tab !== 'invite' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.password')}</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <Lock className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? t('hidePassword') : t('showPassword')}
                    className="text-ink-faint hover:text-ink-muted transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
            )}

            {tab === 'invite' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.inviteLinkOrToken')}</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <Heart className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type="text"
                    placeholder={t('placeholders.inviteLinkOrToken')}
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                </div>
              </label>
            )}

            {error && (
              <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {tab === 'login' ? t('submit.login') : tab === 'register' ? t('submit.register') : t('submit.invite')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-center text-ink-muted mt-6">
            {t('disclaimer')}
          </p>
        </div>
      </div>
    </div>
  )
}
