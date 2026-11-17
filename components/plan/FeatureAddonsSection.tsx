'use client';

import { useTranslations } from 'next-intl';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { FeatureAddonCheckout } from '@/components/plan/FeatureAddonCheckout';
import { FeatureAddonDraftList } from '@/components/plan/FeatureAddonDraftList';
import type { FeatureAddons } from '@/hooks/useFeatureAddons';

// "Add features" on the Add-ons page (KAN-82): the feature add-ons the event's plan sells.
export function FeatureAddonsSection({ state, className }: { state: FeatureAddons; className?: string }) {
    const t = useTranslations('EventAddonsSettingsPage.features');
    const tCommon = useTranslations('Common');

    if (!state.mode || state.isLoading || state.offers.length === 0) return null;

    return (
        <section aria-labelledby="feature-addons-title" className={className}>
            {/* Title */}
            <h2 id="feature-addons-title" className="text-xl leading-tight font-black tracking-[.09em] text-ink uppercase">
                {t('title')}
            </h2>

            {/* Why buying is disabled */}
            {state.purchaseBlock && (
                <p className="mt-2 text-xs text-ink-muted">{tCommon(state.purchaseBlock === 'demo' ? 'demoPurchaseDisabled' : 'primaryHostOnly')}</p>
            )}
            <IncidentPausedNote className="mt-2" />

            {/* Paused while a withdrawal is under review */}
            {state.paused && <p className="mt-2 text-xs text-ink-muted">{t('paused')}</p>}

            {/* Add-ons */}
            {state.mode === 'checkout' ? <FeatureAddonCheckout state={state} /> : <FeatureAddonDraftList state={state} />}

            {/* Error */}
            {state.error && (
                <p role="alert" className="mt-4 text-sm text-rose-600">
                    {state.error}
                </p>
            )}
        </section>
    );
}
