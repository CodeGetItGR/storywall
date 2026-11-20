'use client';

import { useTranslations } from 'next-intl';

import { useConsentHint } from '@/hooks/useConsentHint';

/**
 * Tells the host why Pay is disabled and takes them to the unticked box.
 * The wizard passes its own label and highlight, so the box's row also glows once it's in view.
 */
export function EventOverviewConsentHint({ highlight = false, label }: { highlight?: boolean; label?: string } = {}) {
    const t = useTranslations('CreateEventPage');
    const hint = useConsentHint(highlight);

    // The submit error takes the slot when both apply.
    if (!hint.show) return null;

    return (
        <button
            type="button"
            onClick={hint.onShowBoxes}
            className="mb-2 flex min-h-8 w-full items-center justify-center text-xs font-semibold text-primary-dark underline underline-offset-2"
        >
            {label ?? t('overview.consentHint')}
        </button>
    );
}
