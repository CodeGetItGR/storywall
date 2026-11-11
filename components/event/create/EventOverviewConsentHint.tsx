'use client';

import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useConsentHint } from '@/hooks/useConsentHint';

const LINK_CLASS = 'mb-2 flex min-h-8 w-full items-center justify-center text-xs font-semibold text-primary-dark underline underline-offset-2';
const CHIP_CLASS =
    'mx-auto mb-2.5 flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary-light px-4 text-sm font-semibold text-primary-dark active:scale-[0.98]';

/**
 * Tells the host why Pay is disabled and takes them to the unticked box.
 * The chip is the wizard's: easier to spot, and it lights up the box it scrolls to.
 */
export function EventOverviewConsentHint({ variant = 'link' }: { variant?: 'link' | 'chip' } = {}) {
    const t = useTranslations('CreateEventPage');
    const hint = useConsentHint(variant === 'chip');

    // The submit error takes the slot when both apply.
    if (!hint.show) return null;

    if (variant === 'chip') {
        return (
            <button type="button" onClick={hint.onShowBoxes} className={CHIP_CLASS}>
                <ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('overview.consentHint')}
            </button>
        );
    }

    return (
        <button type="button" onClick={hint.onShowBoxes} className={LINK_CLASS}>
            {t('overview.consentHint')}
        </button>
    );
}
