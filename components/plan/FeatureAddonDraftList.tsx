'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeatureAddonLabel } from '@/components/plan/FeatureAddonLabel';
import type { FeatureAddons } from '@/hooks/useFeatureAddons';
import { cn } from '@/lib/utils';

// A draft adds or removes each feature; they're paid for with the plan.
export function FeatureAddonDraftList({ state }: { state: Pick<FeatureAddons, 'offers' | 'canPurchase' | 'pendingCode' | 'handleDraftAddonClick'> }) {
    const t = useTranslations('EventAddonsSettingsPage.features');

    return (
        <div>
            {/* Add-ons */}
            <ul className="mt-4 divide-y divide-ink/10">
                {state.offers.map(({ service, added }) => {
                    const isPending = state.pendingCode === service.code;
                    const nameId = `feature-addon-${service.code}`;
                    return (
                        <li key={service.id} className="flex min-h-14 items-center gap-3 py-2">
                            <FeatureAddonLabel service={service} nameId={nameId} />
                            <button
                                type="button"
                                data-service-code={service.code}
                                data-added={added}
                                onClick={state.handleDraftAddonClick}
                                disabled={!state.canPurchase || state.pendingCode !== null}
                                aria-describedby={nameId}
                                className={cn(
                                    'inline-flex min-h-10 min-w-24 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40',
                                    added ? 'bg-surface-muted text-ink' : 'bg-ink text-white',
                                )}
                            >
                                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                                {t(added ? 'remove' : 'add')}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* Payment note */}
            <p className="mt-3 text-xs text-ink-muted">{t('draftNote')}</p>
        </div>
    );
}
