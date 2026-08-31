'use client';

import { Calendar, Clock3, Loader2, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { EventBillingResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney, navigateToCheckout } from '@/lib/billing';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';
import { getPlanPriceDetails } from '@/lib/planTiers';

export function OverviewDraftPanel({
    eventId,
    eventTitle,
    eventType,
    startAt,
    currentPlan,
    currency,
    selectedAddons,
    activationTotal,
    wishlistAvailable,
}: {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    startAt: string | null;
    currentPlan: PlanTierResponseDto | undefined;
    currency: string;
    selectedAddons: EventBillingResponseDto['addons'];
    activationTotal: number | null;
    wishlistAvailable: boolean;
}) {
    const t = useTranslations('ManagePage');
    const tCreate = useTranslations('CreateEventPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const checkout = useCheckout(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);
    const canPay = Boolean(startAt);
    const planActivation = currentPlan ? getPlanPriceDetails(currentPlan) : null;
    const activationTotalLabel = activationTotal !== null ? formatMoney(locale, activationTotal, currency) : tCreate('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

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
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            {/* Left: event & plan details */}
            <div className="flex flex-col gap-5">
                {/* Status */}
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock3 className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">{t('draft.title')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{canPay ? t('draft.bodyReadyToPay') : t('draft.body')}</p>
                    </div>
                </div>

                {/* Event summary */}
                <section aria-labelledby="draft-event-heading" className="flex items-start gap-3 border-t border-border/70 pt-5">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <div className="min-w-0">
                        <h3 id="draft-event-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                            {tCreate('overview.event')}
                        </h3>
                        <p className="mt-1 font-semibold text-ink">{eventTitle}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">
                            {eventTypeCopy(eventType).name}
                            {startAt && ` · ${dateFormatter.format(new Date(startAt))}`}
                        </p>
                    </div>
                </section>

                {/* Pricing */}
                <section aria-labelledby="draft-pricing-heading" className="border-t border-border/70 pt-5">
                    <div className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                        <h3 id="draft-pricing-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                            {tCreate('overview.pricing')}
                        </h3>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{tCreate('overview.pricingHint')}</p>

                    <div className="mt-3 divide-y divide-border/70">
                        {currentPlan && (
                            <EventOverviewPriceRow
                                label={currentPlan.name}
                                detail={tCreate('overview.planActivation')}
                                amount={planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                                fallback={tCreate('payment.noCharge')}
                            />
                        )}
                        {selectedAddons.map((addon, index) => (
                            <EventOverviewPriceRow
                                key={`${addon.code}-${index}`}
                                label={addon.name}
                                detail={t('draftModules.once')}
                                amount={formatMoney(locale, addon.priceAmountMinor, currency)}
                                fallback={tCreate('payment.noCharge')}
                            />
                        ))}
                    </div>
                </section>

                {/* Gift account */}
                {wishlistAvailable && (
                    <TargetedSection id={GIFT_ACCOUNT_SECTION_ID} className="border-t border-border/70 pt-5">
                        <GiftAccountSetup eventId={eventId} className="" />
                    </TargetedSection>
                )}
            </div>

            {/* Right: payment action */}
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-5 lg:sticky lg:top-24">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{tCreate('overview.dueNow')}</p>
                <p className="mt-1 text-2xl font-bold text-primary-dark">{activationTotalLabel}</p>

                <div className="mt-4">
                    {canPay ? (
                        <button
                            type="button"
                            onClick={handlePay}
                            disabled={checkout.isPending}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white"
                        >
                            {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                            {checkout.isPending ? t('draft.openingCheckout') : t('draft.payAndPublish')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white opacity-40"
                        >
                            {t('draft.addStartDate')}
                        </button>
                    )}
                </div>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            </div>
        </div>
    );
}
