'use client';

import { Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { type MouseEvent, useCallback, useTransition } from 'react';

import { setLocale } from '@/i18n/actions';
import { type Locale, locales } from '@/i18n/config';
import { cn } from '@/lib/utils';

const localeLabels: Record<Locale, string> = {
    en: 'EN',
    el: 'EL',
};

export function LanguageSwitcher({ className }: { className?: string }) {
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const handleChange = useCallback((next: Locale) => {
        if (next === locale) return;
        startTransition(() => {
            void setLocale(next);
        });
    }, [locale, startTransition]);

    const handleLocaleClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const nextLocale = event.currentTarget.dataset.locale as Locale | undefined;
            if (nextLocale) handleChange(nextLocale);
        },
        [handleChange]
    );

    return (
        <div className={cn('flex items-center gap-1 bg-surface-muted rounded-full p-1', className)}>
            <Languages className="w-3.5 h-3.5 text-ink-faint ml-1.5" aria-hidden="true" />
            {locales.map((l) => (
                <button
                    key={l}
                    type="button"
                    data-locale={l}
                    onClick={handleLocaleClick}
                    disabled={isPending}
                    aria-pressed={locale === l}
                    className={cn(
                        'px-2 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-60',
                        locale === l ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    )}
                >
                    {localeLabels[l]}
                </button>
            ))}
        </div>
    );
}
