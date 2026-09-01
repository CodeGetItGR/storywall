'use client';

import { Check, Loader2, LockKeyhole } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { CollaborationCodeSection } from '@/components/checkout/CollaborationCodeSection';
import { BackButton } from '@/components/ui/BackButton';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCheckout, useEventBilling, useStorageCheckout, useUpgradeCheckout, useUpgradeOptions } from '@/hooks/useBilling';
import { useEvent } from '@/hooks/useEvent';
import type { CollaborationCodePreviewResponseDto, EventAddonDto } from '@/lib/api/types';
import { discountedAmountMinor, formatMoney, navigateToCheckout } from '@/lib/billing';
import { scopedPlans } from '@/lib/planTiers';
import { type CheckoutIntent, routes } from '@/lib/routes';

type ReviewLine = { label: string; amountMinor: number };

const CHECKOUT_INTENTS: CheckoutIntent[] = ['activation', 'upgrade', 'storage'];

function addonLines(addons: EventAddonDto[]): ReviewLine[] {
    return addons.map((addon) => ({
        label: addon.name,
        amountMinor: addon.priceAmountMinor,
    }));
}

export default function CheckoutReviewBoundary() {
    const { eventId } = useParams<{ eventId: string }>();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const t = useTranslations('CheckoutReviewPage');
    const tPageError = useTranslations('PageErrorState.billing');
    const appConfig = useAppConfig();
    const billing = useEventBilling(eventId, true);
    const event = useEvent(eventId);
    const activationCheckout = useCheckout(eventId);
    const upgradeCheckout = useUpgradeCheckout(eventId);
    const storageCheckout = useStorageCheckout(eventId);
    const upgradeOptions = useUpgradeOptions(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);
    const [collaborationCode, setCollaborationCode] = useState<string | null>(null);
    const [collaborationPreview, setCollaborationPreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const handleCollaborationPreviewChange = useCallback(
        (nextCode: string | null, nextPreview: CollaborationCodePreviewResponseDto | null) => {
            setCollaborationCode(nextCode);
            setCollaborationPreview(nextPreview);
        },
        []
    );
    const retry = useCallback(() => {
        void appConfig.refetch();
        void billing.refetch();
        void event.refetch();
        void upgradeOptions.refetch();
    }, [appConfig, billing, event, upgradeOptions]);

    const rawIntent = searchParams.get('intent');
    const intent = CHECKOUT_INTENTS.find((value) => value === rawIntent) ?? null;
    const code = searchParams.get('code');
    const isCancelledActivation = intent === 'activation' && searchParams.get('cancelled') === 'true';
    const plans = useMemo(() => scopedPlans(appConfig.data?.planTiers ?? [], 'EVENT'), [appConfig.data?.planTiers]);
    const currentPlan = plans.find((plan) => plan.code === billing.data?.planTierCode) ?? null;
    const targetPlan = code ? (plans.find((plan) => plan.code === code) ?? null) : null;
    const service = code ? (appConfig.data?.paidServices.find((item) => item.code === code) ?? null) : null;
    const upgradeOption =
        intent === 'upgrade' && targetPlan ? (upgradeOptions.data?.find((option) => option.planTierCode === targetPlan.code) ?? null) : null;

    if (appConfig.isLoading || billing.isLoading || event.isLoading || (intent === 'upgrade' && upgradeOptions.isLoading)) {
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
        (intent === 'activation' && !isCancelledActivation) ||
        (intent === 'upgrade' && upgradeOptions.error)
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

    const addons = billing.data.addons;
    const currency =
        intent === 'storage'
            ? (service?.priceCurrency ?? currentPlan.priceCurrency ?? 'EUR')
            : intent === 'upgrade'
              ? (upgradeOption?.currency ?? currentPlan.priceCurrency ?? 'EUR')
              : (targetPlan?.priceCurrency ?? currentPlan.priceCurrency ?? billing.data.orders[0]?.currency ?? 'EUR');

    let title = t('intent.activationCancelled.title');
    let description = t('intent.activationCancelled.description');
    let planLabel = currentPlan.name;
    let lines: ReviewLine[] = [];
    let consequence = t('intent.activationCancelled.consequence');
    let valid = true;

    if (intent === 'activation') {
        title = t('intent.activationCancelled.title');
        description = t('intent.activationCancelled.description');
        consequence = t('intent.activationCancelled.consequence');
        valid = billing.data.eventStatus === 'DRAFT' && currentPlan.priceAmountMinor !== null;
        if (currentPlan.priceAmountMinor !== null) {
            lines = [
                {
                    label: t('items.planActivation', { plan: currentPlan.name }),
                    amountMinor: collaborationPreview?.payableAmountMinor ?? discountedAmountMinor(currentPlan.priceAmountMinor, currentPlan),
                },
                ...addonLines(addons),
            ];
        }
    } else if (intent === 'upgrade') {
        title = t('intent.upgrade.title');
        description = t('intent.upgrade.description');
        consequence = t('intent.upgrade.consequence');
        valid = Boolean(targetPlan && upgradeOption);
        if (targetPlan && upgradeOption) {
            planLabel = t('planChange', { from: currentPlan.name, to: upgradeOption.planTierName });
            lines = [
                {
                    label: t('items.planUpgrade', { plan: upgradeOption.planTierName }),
                    amountMinor: upgradeOption.payableAmountMinor,
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
    const isPending = activationCheckout.isPending || upgradeCheckout.isPending || storageCheckout.isPending;
    const backHref =
        intent === 'storage'
            ? routes.events.settingsAddons(eventId)
            : intent === 'activation'
              ? routes.events.manage(eventId, { tab: 'overview' })
              : routes.events.manage(eventId, { tab: 'billing' });

    async function continueToCheckout() {
        if (!valid) return;
        setError(null);
        try {
            if (intent === 'activation') {
                navigateToCheckout(
                    eventId,
                    await activationCheckout.mutateAsync(collaborationCode ? { collaborationCode } : undefined)
                );
            } else if (intent === 'upgrade' && targetPlan) {
                navigateToCheckout(eventId, await upgradeCheckout.mutateAsync({ planTierCode: targetPlan.code }), targetPlan.code);
            } else if (intent === 'storage' && service) {
                navigateToCheckout(eventId, await storageCheckout.mutateAsync({ paidServiceCode: service.code }));
            }
        } catch (checkoutError) {
            setError(toErrorMessage(checkoutError));
        }
    }

    return (
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:pb-12 sm:pt-10">
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

            {intent === 'activation' && (
                <CollaborationCodeSection
                    eventId={eventId}
                    onPreviewChangeAction={handleCollaborationPreviewChange}
                />
            )}

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
                    {intent === 'upgrade' && upgradeOption?.discountLabel && upgradeOption.discountPercent !== undefined && (
                        <p className="mt-3 text-sm font-semibold text-emerald-700">
                            {t('autoDiscountApplied', { label: upgradeOption.discountLabel, discount: upgradeOption.discountPercent })}
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

            {!valid && <p className="mt-6 text-sm text-rose-600">{t('unavailable')}</p>}
            {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}

            {/* Checkout action */}
            <div className="mt-8">
                <button
                    type="button"
                    onClick={continueToCheckout}
                    disabled={!valid || lines.length === 0 || isPending}
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
        </main>
    );
}
