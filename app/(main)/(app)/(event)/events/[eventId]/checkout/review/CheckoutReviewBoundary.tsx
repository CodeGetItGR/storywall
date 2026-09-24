'use client';

import { Check, Loader2, LockKeyhole } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { BackButton } from '@/components/ui/BackButton';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling, useStorageCheckout, useUpgradeCheckout, useUpgradeOptions } from '@/hooks/useBilling';
import { useEvent } from '@/hooks/useEvent';
import { useExtensionCheckoutReview } from '@/hooks/useExtensionCheckoutReview';
import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { formatBillingDate, formatMoney, navigateToCheckout } from '@/lib/billing';
import { scopedPlans } from '@/lib/planTiers';
import { type CheckoutIntent, routes } from '@/lib/routes';
import { linkedUpgradeDuration } from '@/lib/upgradeOptions';

type ReviewLine = { label: string; amountMinor: number };

const CHECKOUT_INTENTS: CheckoutIntent[] = ['upgrade', 'storage', 'extension'];

export default function CheckoutReviewBoundary() {
    const { eventId } = useParams<{ eventId: string }>();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const t = useTranslations('CheckoutReviewPage');
    const tCommon = useTranslations('Common');
    const tDurations = useTranslations('Durations');
    const tPageError = useTranslations('PageErrorState.billing');
    const appConfig = useAppConfig();
    const billing = useEventBilling(eventId, true);
    const event = useEvent(eventId);
    const upgradeCheckout = useUpgradeCheckout(eventId);
    const storageCheckout = useStorageCheckout(eventId);
    const canPurchase = useIsPrimaryHost();
    const upgradeOptions = useUpgradeOptions(eventId, canPurchase);
    const rawIntent = searchParams.get('intent');
    const intent = CHECKOUT_INTENTS.find((value) => value === rawIntent) ?? null;
    const code = searchParams.get('code');
    const optionId = searchParams.get('option');
    const extension = useExtensionCheckoutReview(eventId, intent === 'extension' ? optionId : null, intent === 'extension' && canPurchase);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);
    const [requestsImmediateStart, setRequestsImmediateStart] = useState(false);
    const [acknowledgesWithdrawalTerms, setAcknowledgesWithdrawalTerms] = useState(false);
    const [staleTerms, setStaleTerms] = useState(false);
    const handleRequestsImmediateStartChange = useCallback((changeEvent: ChangeEvent<HTMLInputElement>) => {
        setRequestsImmediateStart(changeEvent.target.checked);
    }, []);
    const handleAcknowledgesWithdrawalTermsChange = useCallback((changeEvent: ChangeEvent<HTMLInputElement>) => {
        setAcknowledgesWithdrawalTerms(changeEvent.target.checked);
    }, []);
    const retry = useCallback(() => {
        void appConfig.refetch();
        void billing.refetch();
        void event.refetch();
        void upgradeOptions.refetch();
        if (intent === 'extension') void extension.refetch();
    }, [appConfig, billing, event, upgradeOptions, intent, extension]);

    useResetOnBfcacheRestore(
        useCallback(() => {
            upgradeCheckout.reset();
            storageCheckout.reset();
            extension.reset();
        }, [upgradeCheckout, storageCheckout, extension]),
    );

    const plans = useMemo(() => scopedPlans(appConfig.data?.planTiers ?? [], 'EVENT'), [appConfig.data?.planTiers]);
    const currentPlan = plans.find((plan) => plan.code === billing.data?.planTierCode) ?? null;
    const targetPlan = code ? (plans.find((plan) => plan.code === code) ?? null) : null;
    const service = code ? (appConfig.data?.paidServices.find((item) => item.code === code) ?? null) : null;
    const upgradeEntry =
        intent === 'upgrade' && targetPlan ? (upgradeOptions.data?.find((entry) => entry.planTierCode === targetPlan.code) ?? null) : null;
    const upgradeDuration = upgradeEntry ? linkedUpgradeDuration(upgradeEntry, optionId) : null;

    if (
        appConfig.isLoading ||
        billing.isLoading ||
        event.isLoading ||
        (intent === 'upgrade' && upgradeOptions.isLoading) ||
        (intent === 'extension' && extension.isLoading)
    ) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
                <div className="h-8 w-44 animate-pulse rounded bg-surface-muted" />
                <div className="mt-8 h-72 animate-pulse rounded-lg bg-surface-muted" />
            </main>
        );
    }

    if (
        appConfig.error ||
        billing.error ||
        event.error ||
        !billing.data ||
        !currentPlan ||
        !intent ||
        (intent === 'upgrade' && upgradeOptions.error) ||
        (intent === 'extension' && extension.error)
    ) {
        return (
            <PageErrorState
                title={tPageError('title')}
                description={t('invalid')}
                onRetryAction={retry}
                actionHref={routes.events.manage(eventId, { tab: 'billing' })}
                actionLabel={t('backToBilling')}
            />
        );
    }

    const currency =
        intent === 'storage'
            ? (service?.priceCurrency ?? currentPlan.priceCurrency ?? 'EUR')
            : intent === 'extension'
              ? (extension.option?.currency ?? currentPlan.priceCurrency ?? 'EUR')
              : (upgradeEntry?.currency ?? currentPlan.priceCurrency ?? 'EUR');

    let title: string;
    let description: string;
    let planLabel = currentPlan.name;
    let lines: ReviewLine[] = [];
    let consequence: string;
    let valid: boolean;

    if (intent === 'upgrade') {
        title = t('intent.upgrade.title');
        description = t('intent.upgrade.description');
        consequence = t('intent.upgrade.consequence');
        valid = Boolean(targetPlan && upgradeEntry && upgradeDuration);
        if (targetPlan && upgradeEntry && upgradeDuration) {
            planLabel = t('planChange', { from: currentPlan.name, to: upgradeEntry.planTierName });
            lines = [
                {
                    label: t('items.planUpgrade', {
                        plan: upgradeEntry.planTierName,
                        duration: tDurations('months', { count: upgradeDuration.months }),
                    }),
                    amountMinor: upgradeDuration.payableAmountMinor,
                },
            ];
        }
    } else if (intent === 'extension') {
        title = t('intent.extension.title');
        description = t('intent.extension.description');
        consequence = t('intent.extension.consequence');
        valid = Boolean(extension.option) && !extension.ended;
        if (extension.option) {
            lines = [
                {
                    label: t('items.coverageExtension', { duration: tDurations('months', { count: extension.option.months }) }),
                    amountMinor: extension.option.amountMinor,
                },
            ];
        }
    } else {
        title = t('intent.storage.title');
        description = t('intent.storage.description');
        consequence = t('intent.storage.consequence');
        valid = Boolean(service && service.kind === 'STORAGE_PACK');
        if (service) {
            planLabel = currentPlan.name;
            lines = [{ label: service.name, amountMinor: service.priceAmountMinor }];
        }
    }

    const totalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
    const isPending = upgradeCheckout.isPending || storageCheckout.isPending || extension.isPending;
    const requiresConsent = intent === 'upgrade' || intent === 'storage' || intent === 'extension';
    // Never discounted, and only an estimate: the real span is fixed when the payment settles.
    const extensionEndsAt = intent === 'extension' && extension.option ? formatBillingDate(locale, extension.option.resultingCoverageEndsAt) : null;
    const coverageEnded = intent === 'extension' && extension.ended;
    const termsVersion = appConfig.data?.withdrawal.termsVersion ?? null;
    const consentSatisfied = !requiresConsent || (requestsImmediateStart && acknowledgesWithdrawalTerms && Boolean(termsVersion));
    const backHref = intent === 'storage' ? routes.events.settingsAddons(eventId) : routes.events.manage(eventId, { tab: 'billing' });

    async function continueToCheckout() {
        if (!valid || !consentSatisfied || !canPurchase) return;
        setError(null);
        setStaleTerms(false);
        try {
            if (intent === 'upgrade' && targetPlan && upgradeDuration) {
                navigateToCheckout(
                    eventId,
                    await upgradeCheckout.mutateAsync({
                        planTierCode: targetPlan.code,
                        coverageOptionId: upgradeDuration.coverageOptionId,
                        requestsImmediateStart,
                        acknowledgesWithdrawalTerms,
                        termsVersion: termsVersion!,
                    }),
                    targetPlan.code,
                );
            } else if (intent === 'extension') {
                await extension.startCheckout({ requestsImmediateStart, acknowledgesWithdrawalTerms });
            } else if (intent === 'storage' && service) {
                navigateToCheckout(
                    eventId,
                    await storageCheckout.mutateAsync({
                        paidServiceCode: service.code,
                        requestsImmediateStart,
                        acknowledgesWithdrawalTerms,
                        termsVersion: termsVersion!,
                    }),
                );
            }
        } catch (checkoutError) {
            if (getErrorCode(checkoutError) === ERROR_CODES.WITHDRAWAL_TERMS_VERSION_STALE) {
                setStaleTerms(true);
                setRequestsImmediateStart(false);
                setAcknowledgesWithdrawalTerms(false);
                void appConfig.refetch();
                setError(t('withdrawalTerms.stale'));
                return;
            }
            // The page already explains that coverage has ended and hides the action.
            const errorCode = getErrorCode(checkoutError);
            if (errorCode === ERROR_CODES.COVERAGE_ENDED) return;
            // The duration is no longer offered for this upgrade: reload the offers,
            // so the page shows the purchase as unavailable.
            if (intent === 'upgrade' && (errorCode === ERROR_CODES.COVERAGE_OPTION_INVALID || errorCode === ERROR_CODES.PLAN_TIER_NOT_AN_UPGRADE))
                void upgradeOptions.refetch();
            setError(toErrorMessage(checkoutError));
        }
    }

    return (
        <main className="mx-auto max-w-3xl px-4 pt-6 pb-28 sm:pt-10 sm:pb-12">
            <BackButton href={backHref} label={t('back')} />

            {/* Header */}
            <header className="mt-3">
                <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
            </header>

            {/* Purchase summary */}
            <section className="mt-6" aria-label={t('summaryTitle')}>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-xs font-semibold text-ink-muted">{t('event')}</dt>
                        <dd className="mt-1 font-semibold text-ink">{event.data?.title ?? t('eventFallback')}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold text-ink-muted">{t('plan')}</dt>
                        <dd className="mt-1 font-semibold text-ink">{planLabel}</dd>
                    </div>
                </dl>
            </section>

            {/* Payment breakdown */}
            <section className="mt-6" aria-labelledby="payment-breakdown-title">
                <h2 id="payment-breakdown-title" className="text-base font-bold text-ink">
                    {t('paymentBreakdown')}
                </h2>
                <div className="mt-3 rounded-lg bg-surface-muted/55 p-4">
                    {lines.length > 1 && (
                        <div className="space-y-3">
                            {lines.map((line, index) => (
                                <div key={`${line.label}-${index}`} className="flex items-start justify-between gap-6 text-sm">
                                    <span className="text-ink-muted">{line.label}</span>
                                    <span className="shrink-0 font-semibold text-ink">{formatMoney(locale, line.amountMinor, currency)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={lines.length > 1 ? 'mt-5 flex items-center justify-between gap-6' : 'flex items-center justify-between gap-6'}>
                        <p className="text-sm font-semibold text-ink">{lines.length === 1 ? lines[0]?.label : t('dueNow')}</p>
                        <p className="shrink-0 text-xl font-bold text-ink">{formatMoney(locale, totalMinor, currency)}</p>
                    </div>
                    {extensionEndsAt && <p className="mt-3 text-sm text-ink-muted">{t('extensionEndsAtEstimate', { date: extensionEndsAt })}</p>}
                    {intent === 'upgrade' && upgradeEntry && upgradeEntry.discountPercent !== null && (
                        <p className="mt-3 text-sm font-semibold text-emerald-700">
                            {upgradeEntry.discountLabel
                                ? t('autoDiscountApplied', { label: upgradeEntry.discountLabel, discount: upgradeEntry.discountPercent })
                                : t('autoDiscountAppliedNoLabel', { discount: upgradeEntry.discountPercent })}
                        </p>
                    )}
                </div>
            </section>

            {/* Payment consequence */}
            <section className="mt-6" aria-label={t('whatHappens')}>
                <div className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <p>{consequence}</p>
                </div>
            </section>

            {/* Withdrawal consent */}
            {requiresConsent && (
                <div className="mt-6">
                    <WithdrawalConsentSection
                        bodyKey={intent === 'storage' ? 'storageBody' : 'body'}
                        requestsImmediateStart={requestsImmediateStart}
                        acknowledgesWithdrawalTerms={acknowledgesWithdrawalTerms}
                        staleTerms={staleTerms}
                        onRequestsImmediateStartChangeAction={handleRequestsImmediateStartChange}
                        onAcknowledgesWithdrawalTermsChangeAction={handleAcknowledgesWithdrawalTermsChange}
                    />
                </div>
            )}

            {canPurchase && !valid && <p className="mt-6 text-sm text-rose-600">{coverageEnded ? t('coverageEnded') : t('unavailable')}</p>}
            {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}

            {/* Co-host note */}
            {!canPurchase && <p className="mt-6 text-xs text-ink-muted">{tCommon('primaryHostOnly')}</p>}

            {/* Checkout action */}
            {!coverageEnded && (
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={continueToCheckout}
                        disabled={!valid || lines.length === 0 || isPending || !consentSatisfied || !canPurchase}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isPending ? t('openingCheckout') : t('continueToCheckout')}
                    </button>
                </div>
            )}
        </main>
    );
}
