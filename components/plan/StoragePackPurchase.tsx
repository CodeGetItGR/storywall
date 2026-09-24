'use client';

import { Database } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { useStoragePackSelection } from '@/hooks/useStoragePackSelection';
import { useEventUsage } from '@/hooks/useUsage';
import type { PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const BUY_CLASS_NAME = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white';

export function StoragePackPurchase({
    eventId,
    services,
    canPurchase,
}: {
    eventId: string;
    services: PaidServiceResponseDto[];
    // Only the event's main host can buy a pack; co-hosts see the offer disabled.
    canPurchase: boolean;
}) {
    const t = useTranslations('EventPlanSettingsPage.storagePacks');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const usage = useEventUsage(eventId);
    const { selectedService, handleSelect } = useStoragePackSelection(services);

    if (services.length === 0) return null;

    return (
        <section>
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
                                    'min-w-24 rounded-full px-4 py-2 text-center transition-colors',
                                    isSelected ? 'bg-ink text-white' : 'bg-background text-ink hover:bg-surface-muted',
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
                    <div className="mt-4 flex flex-col gap-3 rounded-lg bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-ink-muted">
                            {t('selected', {
                                size: selectedService.grantsStorageBytes ? formatBytes(selectedService.grantsStorageBytes) : selectedService.name,
                                price: formatMoney(locale, selectedService.priceAmountMinor, selectedService.priceCurrency),
                            })}
                        </p>
                        {canPurchase ? (
                            <Link href={routes.events.checkoutReview(eventId, 'storage', { code: selectedService.code })} className={BUY_CLASS_NAME}>
                                {t('buy', {
                                    amount: formatMoney(locale, selectedService.priceAmountMinor, selectedService.priceCurrency),
                                })}
                            </Link>
                        ) : (
                            <span role="link" aria-disabled="true" className={cn(BUY_CLASS_NAME, 'cursor-not-allowed opacity-40')}>
                                {t('buy', {
                                    amount: formatMoney(locale, selectedService.priceAmountMinor, selectedService.priceCurrency),
                                })}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Co-host note */}
            {!canPurchase && <p className="mt-3 text-xs text-ink-muted">{tCommon('primaryHostOnly')}</p>}

            <p className="mt-2 text-xs text-ink-muted">{t('finalSale')}</p>
        </section>
    );
}
