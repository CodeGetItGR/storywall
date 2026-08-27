'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useTransition } from 'react';

import { setLocale } from '@/i18n/actions';
import { type Locale, locales } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'sidebar' }) {
    const locale = useLocale();
    const t = useTranslations('LanguageSwitcher');
    const [isPending, startTransition] = useTransition();

    const handleChange = useCallback(
        (next: Locale) => {
            if (next === locale) return;
            startTransition(() => {
                void setLocale(next);
            });
        },
        [locale, startTransition]
    );

    const handleLocaleClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const nextLocale = event.currentTarget.dataset.locale as Locale | undefined;
            if (nextLocale) handleChange(nextLocale);
        },
        [handleChange]
    );

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full',
                variant === 'sidebar' ? 'gap-3' : 'gap-0.5 p-0.5',
                variant === 'sidebar' ? 'bg-transparent' : 'bg-surface-muted',
                className
            )}
            role="group"
            aria-label={t('label')}
        >
            {locales.map((l) => (
                <button
                    key={l}
                    type="button"
                    data-locale={l}
                    onClick={handleLocaleClick}
                    disabled={isPending}
                    aria-pressed={locale === l}
                    className={cn(
                        'rounded-full font-semibold transition-colors disabled:opacity-60',
                        variant === 'sidebar'
                            ? cn(
                                  'px-0 py-0.5 text-sm',
                                  locale === l ? 'text-white underline underline-offset-4' : 'text-white/55 hover:text-white/85'
                              )
                            : locale === l
                              ? 'min-w-10 bg-card px-2.5 py-1 text-xs text-ink shadow-sm'
                              : 'min-w-10 px-2.5 py-1 text-xs text-ink-muted hover:text-ink'
                    )}
                >
                    {t(`languages.${l}`)}
                </button>
            ))}
        </div>
    );
}
