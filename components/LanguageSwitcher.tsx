'use client'

import { useLocale } from 'next-intl'
import { useTransition } from 'react'
import { Languages } from 'lucide-react'
import { setLocale } from '@/i18n/actions'
import { locales, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  el: 'EL',
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()

  function handleChange(next: Locale) {
    if (next === locale) return
    startTransition(() => {
      void setLocale(next)
    })
  }

  return (
    <div className={cn('flex items-center gap-1 bg-surface-muted rounded-full p-1', className)}>
      <Languages className="w-3.5 h-3.5 text-ink-faint ml-1.5" aria-hidden="true" />
      {locales.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => handleChange(l)}
          disabled={isPending}
          aria-pressed={locale === l}
          className={cn(
            'px-2 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-60',
            locale === l ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  )
}
