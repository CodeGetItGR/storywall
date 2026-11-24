'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FeedEditFeatureIcon } from '@/components/manage/overview/FeedEditFeatureIcon';
import { AppLink } from '@/components/ui/AppLink';
import { FEED_EDIT_FEATURES, type FeedEditBannerState } from '@/lib/feedEditBanner';

type FeedEditBannerProps = { state: Exclude<FeedEditBannerState, null>; href: string; illustration: ReactNode };

// The Overview's invitation to customize the feed: unlock Save my date, or start editing.
// A small picture of the event's feed in edit mode beside what hosts can change, as tall as the list.
export function FeedEditBanner({ state, href, illustration }: FeedEditBannerProps) {
    const t = useTranslations('FeedEditor.banner');

    return (
        <section className="flex gap-3 overflow-hidden rounded-2xl bg-surface-muted p-3 sm:gap-4 sm:p-4">
            {/* Preview: the top of the event's feed in edit mode, in a Save my date theme or its wall look */}
            <div role="img" aria-label={t('previewAlt')} className="w-28 shrink-0 self-stretch sm:w-36">
                {illustration}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4 py-1 sm:py-2">
                {/* Title */}
                <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                    {state === 'locked' && <Lock data-banner-lock className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {t('title')}
                </h2>

                {/* What hosts can change */}
                <ul className="flex flex-col gap-2">
                    {FEED_EDIT_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm font-medium text-ink">
                            <FeedEditFeatureIcon feature={feature} />
                            <span className="min-w-0">{t(`features.${feature}`)}</span>
                        </li>
                    ))}
                </ul>

                {/* Action */}
                <AppLink
                    href={href}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2 text-center text-sm leading-tight font-semibold text-balance text-white transition-opacity bg-gradient-brand hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:w-auto sm:self-start"
                >
                    {state === 'locked' ? t('unlock') : t('startEditing')}
                </AppLink>
            </div>
        </section>
    );
}
