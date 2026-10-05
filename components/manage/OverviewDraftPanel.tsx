'use client';

import { AlertTriangle, CalendarClock, Clock3, Loader2, LockKeyhole, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ActivationDisclosures } from '@/components/checkout/ActivationDisclosures';
import { ActivationEventSummary } from '@/components/checkout/ActivationEventSummary';
import { CollaborationCodeSection } from '@/components/checkout/CollaborationCodeSection';
import { PriceBreakdownSummary } from '@/components/checkout/PriceBreakdownSummary';
import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { DraftStartDateModal } from '@/components/manage/DraftStartDateModal';
import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { DurationPicker } from '@/components/plan/DurationPicker';
import { useDraftActivationCheckout } from '@/hooks/useDraftActivationCheckout';
import { useDraftDuration } from '@/hooks/useDraftDuration';
import { useDraftStartDate } from '@/hooks/useDraftStartDate';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type {
    CoverageOptionResponseDto,
    EventBillingResponseDto,
    EventTypeConvention,
    PlanTierResponseDto,
    ProjectedCoverageDto,
} from '@/lib/api/types';
import { formatMoney, formatOptionalMoney } from '@/lib/billing';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';
import { getOptionPriceDetails } from '@/lib/planTiers';

// Shown where a price can't be worked out yet (the draft's duration is off sale).
const UNKNOWN_AMOUNT = '—';

export function OverviewDraftPanel({
    eventId,
    eventTitle,
    eventType,
    startAt,
    endAt,
    projectedCoverage,
    currentPlan,
    currentOption,
    savedOptionId,
    durationOptions,
    durationUnavailable,
    canPurchase,
    currency,
    selectedAddons,
    activationTotal,
    wishlistAvailable,
    cancelledCheckout,
    themeSection,
}: {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    startAt: string | null;
    endAt: string | null;
    projectedCoverage: ProjectedCoverageDto | null;
    currentPlan: PlanTierResponseDto | undefined;
    // The draft's duration while it is on sale; null once it was retired.
    currentOption: CoverageOptionResponseDto | null;
    savedOptionId: string | null;
    durationOptions: CoverageOptionResponseDto[];
    durationUnavailable: boolean;
    // Only the event's main host can buy.
    canPurchase: boolean;
    currency: string;
    selectedAddons: EventBillingResponseDto['addons'];
    activationTotal: number | null;
    wishlistAvailable: boolean;
    cancelledCheckout: boolean;
    // The theme picker. It saves on its own and renders nothing when the plan has no themes.
    themeSection?: ReactNode;
}) {
    const t = useTranslations('ManagePage');
    const tCommon = useTranslations('Common');
    const tCreate = useTranslations('CreateEventPage');
    const tCheckoutReview = useTranslations('CheckoutReviewPage');
    const tBilling = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const canPay = Boolean(startAt);
    const planActivation = currentPlan && currentOption ? getOptionPriceDetails(currentPlan, currentOption) : null;

    const duration = useDraftDuration({ eventId, options: durationOptions, currentOptionId: savedOptionId });
    // Only the main host can be quoted, and only once there is a start date and a duration on sale.
    const { consent, collaborationPreview, breakdown, handleCollaborationPreviewChange, submit, error, startPassed, isPending } =
        useDraftActivationCheckout(eventId, { quoteEnabled: canPay && canPurchase && Boolean(currentOption) && !duration.isSaving, startAt });
    const startDate = useDraftStartDate(eventId, { startAt, endAt });
    const canCheckout = canPurchase && Boolean(currentOption) && !duration.isSaving;

    // activationTotal already bundles the plan's own (non-collaboration-code) price with
    // whichever add-ons count toward activation (see useEventOverviewPlan). A collaboration
    // code only discounts the plan portion, so swap that portion out rather than replacing
    // the whole total — this keeps add-on charges intact when a code is applied.
    const dueNowMinor =
        collaborationPreview && activationTotal !== null && planActivation
            ? activationTotal - planActivation.amountMinor + collaborationPreview.payableAmountMinor
            : activationTotal;
    const dueNowCurrency = collaborationPreview?.currency ?? currency;
    const dueNowTotalLabel = breakdown
        ? formatMoney(locale, breakdown.totalMinor, breakdown.currency)
        : !currentOption
          ? UNKNOWN_AMOUNT
          : dueNowMinor !== null
            ? formatMoney(locale, dueNowMinor, dueNowCurrency)
            : tCreate('payment.noCharge');

    return (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            {/* Left: event, pricing, collaboration code, consent */}
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

                {/* Cancelled payment notice */}
                {cancelledCheckout && (
                    <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <div className="min-w-0 text-sm">
                            <p className="font-semibold text-ink">{tCheckoutReview('intent.activationCancelled.title')}</p>
                            <p className="mt-1 text-ink-muted">{tCheckoutReview('intent.activationCancelled.description')}</p>
                        </div>
                    </div>
                )}

                {/* Event summary */}
                <div className="border-t border-border/70 pt-5">
                    <ActivationEventSummary eventTitle={eventTitle} eventTypeName={eventTypeCopy(eventType).name} startAt={startAt} />
                </div>

                {/* Theme */}
                {themeSection}

                {/* Pricing */}
                <section aria-labelledby="draft-pricing-heading" className="border-t border-border/70 pt-5">
                    <div className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                        <h3 id="draft-pricing-heading" className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                            {tCreate('overview.pricing')}
                        </h3>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{tCreate('overview.pricingHint')}</p>

                    <div className="mt-3 divide-y divide-border/70">
                        {currentPlan && (
                            <EventOverviewPriceRow
                                label={currentPlan.name}
                                detail={tCreate('overview.planActivation')}
                                amount={breakdown ? '' : planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                                fallback={currentOption ? tCreate('payment.noCharge') : UNKNOWN_AMOUNT}
                            >
                                {/* Duration */}
                                <DurationPicker
                                    options={durationOptions}
                                    value={duration.selectedOptionId}
                                    onChangeAction={duration.changeDuration}
                                    disabled={!canPurchase || duration.isSaving}
                                    className="mt-2"
                                />
                                {durationUnavailable && <p className="mt-2 text-xs font-semibold text-amber-700">{t('draft.durationUnavailable')}</p>}
                                {duration.error && <p className="mt-2 text-xs text-rose-600">{duration.error}</p>}
                            </EventOverviewPriceRow>
                        )}
                        {/* The server's breakdown lists the add-ons and discounts itself */}
                        {!breakdown &&
                            selectedAddons.map((addon, index) => (
                                <EventOverviewPriceRow
                                    key={`${addon.code}-${index}`}
                                    label={addon.name}
                                    detail={t('draftModules.once')}
                                    amount={formatOptionalMoney(addon.priceAmountMinor, currency, locale) ?? tBilling('orders.gift')}
                                    fallback={tCreate('payment.noCharge')}
                                />
                            ))}
                        {!breakdown && collaborationPreview && planActivation && (
                            <EventOverviewPriceRow
                                label={tCreate('overview.discount')}
                                detail={tCreate('overview.discountDetail', {
                                    label: collaborationPreview.label,
                                    percent: collaborationPreview.combinedDiscountPercent,
                                })}
                                amount={`-${formatMoney(locale, planActivation.amountMinor - collaborationPreview.payableAmountMinor, collaborationPreview.currency)}`}
                                fallback={tCreate('payment.noCharge')}
                                amountClassName="text-emerald-700"
                            />
                        )}
                    </div>

                    {/* Price breakdown */}
                    {breakdown && (
                        <div className="mt-3">
                            <PriceBreakdownSummary breakdown={breakdown} showTotal={false} />
                        </div>
                    )}
                </section>

                {/* Collaboration code: a preview prices one duration, so a new pick starts it over */}
                {canPay && (
                    <CollaborationCodeSection
                        key={duration.selectedOptionId}
                        eventId={eventId}
                        onPreviewChangeAction={handleCollaborationPreviewChange}
                        disabled={!canCheckout}
                    />
                )}

                {/* Activation disclosures */}
                {canPay && <ActivationDisclosures projectedCoverage={projectedCoverage} />}

                {/* Withdrawal consent */}
                {canPay && (
                    <WithdrawalConsentSection
                        requestsImmediateStart={consent.requestsImmediateStart}
                        acknowledgesWithdrawalTerms={consent.acknowledgesWithdrawalTerms}
                        staleTerms={consent.staleTerms}
                        onRequestsImmediateStartChangeAction={consent.handleRequestsImmediateStartChange}
                        onAcknowledgesWithdrawalTermsChangeAction={consent.handleAcknowledgesWithdrawalTermsChange}
                    />
                )}

                {/* Gift account: like buying, only the main host may set it (4019 otherwise) */}
                {wishlistAvailable && canPurchase && (
                    <TargetedSection id={GIFT_ACCOUNT_SECTION_ID} className="border-t border-border/70 pt-5">
                        <GiftAccountSetup eventId={eventId} className="" />
                    </TargetedSection>
                )}
            </div>

            {/* Right: payment action */}
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-5 lg:sticky lg:top-24">
                <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{tCreate('overview.dueNow')}</p>
                <p className="mt-1 text-2xl font-bold text-primary-dark">{dueNowTotalLabel}</p>

                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

                {/* Passed date: move it to pay */}
                {startPassed && canPurchase && (
                    <button
                        type="button"
                        onClick={startDate.open}
                        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-dark underline underline-offset-2"
                    >
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        {t('draft.startDate.action')}
                    </button>
                )}

                {/* Co-host note */}
                {!canPurchase && <p className="mt-3 text-xs text-ink-muted">{tCommon('primaryHostOnly')}</p>}

                <div className="mt-4">
                    {canPay ? (
                        <button
                            type="button"
                            onClick={submit}
                            disabled={isPending || !canCheckout || !consent.consentSatisfied}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                            )}
                            {isPending ? t('draft.openingCheckout') : t('draft.payAndPublish')}
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
            </div>

            {/* Move the date */}
            <DraftStartDateModal date={startDate} eventType={eventType} />
        </div>
    );
}
