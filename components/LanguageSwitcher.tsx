'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useTransition } from 'react';

import { setLocale } from '@/i18n/actions';
import { type Locale, locales } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
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
        <div className={cn('inline-flex items-center gap-0.5 rounded-full bg-surface-muted p-0.5', className)} role="group" aria-label={t('label')}>
            {locales.map((l) => (
                <button
                    key={l}
                    type="button"
                    data-locale={l}
                    onClick={handleLocaleClick}
                    disabled={isPending}
                    aria-pressed={locale === l}
                    className={cn(
                        'min-w-10 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60',
                        locale === l ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    )}
                >
                    {t(`languages.${l}`)}
                </button>
            ))}
        </div>
    );
}
