'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useAcceptEventInvitation } from '@/hooks/useEventInvitations'
import { getErrorMessage } from '@/lib/api/errors'
import { joinEventAfterAuth } from '@/lib/invite/joinAfterAuth'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function LoginPage() {
  const t = useTranslations('LoginPage')
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const { login } = useAuth()
  const acceptInvitation = useAcceptEventInvitation()

  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email, password })

      if (inviteToken) {
        const result = await joinEventAfterAuth(
          (token) => acceptInvitation.mutateAsync(token),
          inviteToken,
        )
        if (result === 'expired') {
          setError(t('expiredInvite'))
          return
        }
      }

      router.push('/feed')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-ink mb-1">{t('title')}</h2>
      <p className="text-sm text-ink-muted mb-7">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              {t('submit')}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-center text-ink-muted mt-6">
        {t('noAccount')}{' '}
        <Link
          href={inviteToken ? `/register?invite=${inviteToken}` : '/register'}
          className="font-semibold text-ink hover:underline"
        >
          {t('createAccountLink')}
        </Link>
      </p>
    </AuthLayout>
  )
}
