'use client';

import { Database, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useStorageCheckout } from '@/hooks/useBilling';
import { useEventUsage } from '@/hooks/useUsage';
import type { PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney, navigateToCheckout } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StoragePackPurchase({ eventId, services }: { eventId: string; services: PaidServiceResponseDto[] }) {
    const t = useTranslations('EventPlanSettingsPage.storagePacks');
    const locale = useLocale();
    const usage = useEventUsage(eventId);
    const checkout = useStorageCheckout(eventId);
    const retryIn = useRetryAfterCountdown(checkout.error);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);
    const [selectedCode, setSelectedCode] = useState(() => services[0]?.code ?? '');
    const selectedService = services.find((service) => service.code === selectedCode) ?? services[0];

    async function buy(code: string) {
        setError(null);
        try {
            const result = await checkout.mutateAsync({ paidServiceCode: code });
            navigateToCheckout(eventId, result);
        } catch (purchaseError) {
            setError(toErrorMessage(purchaseError));
        }
    }

    if (services.length === 0) return null;

    function handleSelect(event: React.MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.serviceCode;
        if (code) {
            setSelectedCode(code);
            setError(null);
        }
    }

    function handleBuy() {
        if (selectedService) void buy(selectedService.code);
    }

    return (
        <section className="mt-6 border-t border-border pt-5">
            <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-5 w-5 text-primary-dark" aria-hidden="true" />
                <div>
                    <h2 className="text-sm font-bold text-ink">{t('title')}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('subtitle')}</p>
                </div>
            </div>
            {usage.data && (
                <p className="mt-3 text-xs font-semibold text-ink-muted">
                    {usage.data.planStorageBytes === null
                        ? t('unlimited')
                        : t('breakdown', {
                              plan: formatBytes(usage.data.planStorageBytes),
                              extra: formatBytes(usage.data.extraStorageBytes),
                              total: formatBytes(usage.data.storageLimitBytes ?? usage.data.planStorageBytes),
                          })}
                </p>
            )}

            <div className="mt-4" role="radiogroup" aria-label={t('selectorLabel')}>
                <div className="flex flex-wrap gap-2">
                    {services.map((service) => {
                        const isSelected = selectedService?.code === service.code;
                        return (
                            <button
                                key={service.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                data-service-code={service.code}
                                onClick={handleSelect}
                                className={cn(
                                    'min-w-24 rounded-full border px-4 py-2 text-center transition-colors',
                                    isSelected
                                        ? 'border-ink bg-ink text-white shadow-sm'
                                        : 'border-border bg-card text-ink hover:border-ink-faint hover:bg-surface-muted'
                                )}
                            >
                                <span className="block text-sm font-bold">
                                    +{service.grantsStorageBytes ? formatBytes(service.grantsStorageBytes) : service.name}
                                </span>
                                <span className={cn('block text-[11px]', isSelected ? 'text-white/70' : 'text-ink-muted')}>
                                    {formatMoney(locale, service.priceAmountMinor, service.priceCurrency)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {selectedService && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-ink-muted">
                            {t('selected', {
                                size: selectedService.grantsStorageBytes ? formatBytes(selectedService.grantsStorageBytes) : selectedService.name,
                                price: formatMoney(locale, selectedService.priceAmountMinor, selectedService.priceCurrency),
                            })}
                        </p>
                        <button
                            type="button"
                            onClick={handleBuy}
                            disabled={checkout.isPending || retryIn > 0}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {retryIn > 0 ? t('retryIn', { seconds: retryIn }) : t('buy')}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-2 text-xs text-ink-muted">{t('finalSale')}</p>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </section>
    );
}
