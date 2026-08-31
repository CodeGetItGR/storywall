'use client';

import { Clock3, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import type { EventBillingResponseDto } from '@/lib/api/types';
import { formatMoney, navigateToCheckout } from '@/lib/billing';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';

export function OverviewDraftPanel({
    eventId,
    canPay,
    currency,
    selectedAddons,
    activationTotal,
    wishlistAvailable,
}: {
    eventId: string;
    canPay: boolean;
    currency: string;
    selectedAddons: EventBillingResponseDto['addons'];
    activationTotal: number | null;
    wishlistAvailable: boolean;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const checkout = useCheckout(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);

    async function handlePay() {
        if (!canPay) return;
        setError(null);

        try {
            navigateToCheckout(eventId, await checkout.mutateAsync());
        } catch (checkoutError) {
            setError(toErrorMessage(checkoutError));
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Clock3 className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{t('draft.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.body')}</p>
                </div>
            </div>

            {/* Selected add-ons */}
            {selectedAddons.length > 0 && (
                <div className="mt-4 border-t border-border/70 pt-4">
                    <p className="text-xs font-semibold text-ink">{t('draft.selectedAddons.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.selectedAddons.body')}</p>
                    <ul className="mt-2 space-y-1.5">
                        {selectedAddons.map((addon, index) => (
                            <li key={`${addon.code}-${index}`} className="flex items-center justify-between gap-3 text-xs text-ink-muted">
                                <span className="truncate font-semibold text-ink">{addon.name}</span>
                                <span className="shrink-0">
                                    {formatMoney(locale, addon.priceAmountMinor, currency)} {t('draftModules.once')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Gift account */}
            {wishlistAvailable && (
                <TargetedSection id={GIFT_ACCOUNT_SECTION_ID} className="mt-4">
                    <GiftAccountSetup eventId={eventId} />
                </TargetedSection>
            )}

            {/* Activation */}
            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {activationTotal !== null && (
                    <p className="text-sm font-semibold text-ink">
                        {t('draft.activationTotal', { total: formatMoney(locale, activationTotal, currency) })}
                    </p>
                )}
                {canPay ? (
                    <button
                        type="button"
                        onClick={handlePay}
                        disabled={checkout.isPending}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
                    >
                        {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                        {checkout.isPending ? t('draft.openingCheckout') : t('draft.payAndPublish')}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white opacity-40 sm:w-auto"
                    >
                        {t('draft.addStartDate')}
                    </button>
                )}
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
    );
}
