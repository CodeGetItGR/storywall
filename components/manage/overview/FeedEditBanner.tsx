'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import type { FeedEditBannerState } from '@/lib/feedEditBanner';

type FeedEditBannerProps = { state: Exclude<FeedEditBannerState, null>; href: string; illustration: ReactNode };

// The Overview's invitation to customize the feed: unlock Save my date, or start editing.
export function FeedEditBanner({ state, href, illustration }: FeedEditBannerProps) {
    const t = useTranslations('FeedEditor.banner');

    return (
        <section className="flex items-center gap-4 rounded-2xl bg-surface-muted p-4 sm:p-5">
            {/* Illustration: the event's cover in a Save my date theme, or in its wall look */}
            <div role="img" aria-label={t('previewAlt')} className="w-24 shrink-0 sm:w-28">
                <div className="-rotate-3 overflow-hidden rounded-xl shadow-[0_8px_22px_rgba(36,31,26,0.18)]">{illustration}</div>
            </div>

            {/* Message */}
            <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                    {state === 'locked' && <Lock data-banner-lock className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {t('title')}
                </h2>
                <AppLink
                    href={href}
                    className="inline-flex min-h-10 items-center rounded-full px-4 py-2 text-center text-sm leading-tight font-semibold text-balance text-white transition-opacity bg-gradient-brand hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    {state === 'locked' ? t('unlock') : t('startEditing')}
                </AppLink>
            </div>
        </section>
    );
}
