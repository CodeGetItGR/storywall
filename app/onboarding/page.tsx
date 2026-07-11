'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Heart, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'login' | 'register' | 'invite'

export default function OnboardingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [showPw, setShowPw] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push('/feed')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Hero panel — desktop left / mobile top */}
      <div className="relative lg:w-1/2 h-56 lg:h-screen flex-shrink-0 overflow-hidden">
        <Image
          src="/images/couple-hero.png"
          alt="Emma and James — engaged couple at golden hour in a vineyard"
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
            Emma &amp; James
          </h1>
          <p className="text-sm lg:text-base opacity-80 mt-1.5">October 18, 2025 · Rosewood Estate, Napa Valley</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Logo mark on mobile */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-ink">StoryWall</span>
          </div>

          <h2 className="text-2xl font-bold text-ink mb-1">
            {tab === 'login' && 'Welcome back'}
            {tab === 'register' && 'Create account'}
            {tab === 'invite' && 'Enter invite code'}
          </h2>
          <p className="text-sm text-ink-muted mb-7">
            {tab === 'login' && "Sign in to join the celebration."}
            {tab === 'register' && "Join the wedding wall and share the love."}
            {tab === 'invite' && "You were invited — enter your code to get started."}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-muted rounded-full p-1 mb-7">
            {(['login', 'register', 'invite'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2 rounded-full text-sm font-medium transition-colors capitalize',
                  tab === t
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {t === 'login' ? 'Sign In' : t === 'register' ? 'Register' : 'Invite'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Full name</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <User className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    required
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                </div>
              </label>
            )}

            {tab !== 'invite' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Email</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <Mail className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                </div>
              </label>
            )}

            {tab !== 'invite' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Password</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <Lock className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="text-ink-faint hover:text-ink-muted transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
            )}

            {tab === 'invite' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Invite code</span>
                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                  <Heart className="w-4 h-4 text-ink-muted flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. EMMA-JAMES-2025"
                    required
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none tracking-widest uppercase"
                  />
                </div>
              </label>
            )}

            <button
              type="submit"
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : 'Join Wedding'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-xs text-center text-ink-muted mt-6">
            By joining you agree to share moments from Emma &amp; James&apos;s special day.
          </p>
        </div>
      </div>
    </div>
  )
}
