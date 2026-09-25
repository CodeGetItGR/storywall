'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useTransition } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { setLocale } from '@/i18n/actions';
import { type Locale, localeCookieMaxAge, localeCookieName, locales } from '@/i18n/config';
import { getPublicLandingPath, isPublicLandingPath } from '@/i18n/publicLocale';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MeUpdateRequestDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type LanguageSwitcherVariant = 'auth' | 'default' | 'sidebar';

export function LanguageSwitcher({ className, variant = 'default' }: { className?: string; variant?: LanguageSwitcherVariant }) {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('LanguageSwitcher');
    const { isAuthenticated } = useAuth();
    const [isPending, startTransition] = useTransition();

    const handleChange = useCallback(
        (next: Locale) => {
            if (next === locale) return;

            if (isPublicLandingPath(pathname)) {
                // `/` and `/[locale]` are sibling routes under the same root layout, so a
                // plain router.push leaves the layout (and its NextIntlClientProvider
                // messages) mounted with the old locale. router.refresh() forces the server
                // components, including the layout, to re-render with the new locale.
                document.cookie = `${localeCookieName}=${encodeURIComponent(next)}; path=/; max-age=${localeCookieMaxAge}; samesite=lax`;

                startTransition(() => {
                    router.push(getPublicLandingPath(next));
                    router.refresh();
                });

                if (isAuthenticated) {
                    void api.patch<unknown>(endpoints.me.profile, { locale: next } satisfies MeUpdateRequestDto).catch(() => {});
                }
                return;
            }

            startTransition(async () => {
                await setLocale(next);
                if (variant === 'auth') {
                    window.location.reload();
                } else {
                    router.refresh();
                }
            });
            // Best-effort: keeps the stored account locale (used for async
            // notification/invitation emails, see backend-localization-fe-integration.md
            // §5) in sync with the language the user is actually browsing in.
            // The UI switch above doesn't wait on this either way.
            if (isAuthenticated) {
                void api.patch<unknown>(endpoints.me.profile, { locale: next } satisfies MeUpdateRequestDto).catch(() => {});
            }
        },
        [isAuthenticated, locale, pathname, router, startTransition, variant],
    );

    const handleLocaleClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const nextLocale = event.currentTarget.dataset.locale as Locale | undefined;
            if (nextLocale) handleChange(nextLocale);
        },
        [handleChange],
    );

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full',
                variant === 'sidebar' ? 'gap-3' : variant === 'auth' ? 'gap-0' : 'gap-0.5 p-0.5',
                variant === 'default' ? 'bg-surface-muted' : 'bg-transparent',
                className,
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
                                  locale === l ? 'text-white underline underline-offset-4' : 'text-white/55 hover:text-white/85',
                              )
                            : variant === 'auth'
                              ? cn(
                                    'min-h-11 min-w-9 px-1.5 text-[11px] tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                                    locale === l
                                        ? 'text-ink-muted underline decoration-ink-faint/70 underline-offset-4'
                                        : 'text-ink-faint hover:text-ink-muted',
                                )
                              : locale === l
                                ? 'min-w-10 bg-card px-2.5 py-1 text-xs text-ink shadow-sm'
                                : 'min-w-10 px-2.5 py-1 text-xs text-ink-muted hover:text-ink',
                    )}
                >
                    {t(`languages.${l}`)}
                </button>
            ))}
        </div>
    );
}
