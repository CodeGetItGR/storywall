'use client';

import { Bug } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Floating on every signed-in page. On mobile it sits above the composer
// button (ComposerFab, bottom-20) so the two never overlap.
export function ReportProblemButton({ onClickAction }: { onClickAction: () => void }) {
    const t = useTranslations('BugReport');

    return (
        <button
            type="button"
            onClick={onClickAction}
            aria-label={t('open')}
            title={t('open')}
            className="fixed right-5 bottom-36 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-ink-muted shadow-[0_8px_24px_rgba(36,31,26,0.14)] transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none lg:right-6 lg:bottom-6 lg:h-11 lg:w-11"
        >
            <Bug className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}
