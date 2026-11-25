'use client';

import { Bug } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// Floating at the bottom left of every signed-in page. Phones: level with the composer button on the right
// (ComposerFab), clear of the tab bar. Desktop: just right of the navigation rail or the admin sidebar.
// Above a draft's pay bar. Away while something it would cover is open: a feed section's tools dropdown,
// the account panel or the wide navigation rail.
const PLACE = cn(
    'fixed bottom-21 left-5 z-30 md:bottom-6 md:left-6',
    'md:in-[body:has(.desktop-account-rail)]:left-26 lg:in-[body:has([data-admin-sidebar])]:left-70',
    'max-lg:in-[body:has([data-draft-pay-bar])]:bottom-36',
);
const AWAY =
    'in-[body:has(.account-panel-sidebar[data-open=true])]:invisible in-[body:has(.desktop-account-rail[data-expanded=true])]:invisible in-[body:has([data-feed-block-tools]_[data-popup-open])]:invisible';

export function ReportProblemButton({ onClickAction }: { onClickAction: () => void }) {
    const t = useTranslations('BugReport');

    return (
        <button
            type="button"
            onClick={onClickAction}
            aria-label={t('open')}
            title={t('open')}
            className={cn(
                PLACE,
                AWAY,
                'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-ink-muted shadow-[0_8px_24px_rgba(36,31,26,0.14)] transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none md:h-11 md:w-11',
            )}
        >
            <Bug className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}
