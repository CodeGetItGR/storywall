'use client';

import { Check, Puzzle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import type { PaidServiceResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { getModuleMeta } from '@/lib/planModules';
import { cn } from '@/lib/utils';

type EventAddonsStepProps = {
    modules: PlatformModuleResponseDto[];
    services: PaidServiceResponseDto[];
    selectedCodes: string[];
    onToggle: (code: string) => void;
};

export function EventAddonsStep({ modules, services, selectedCodes, onToggle }: EventAddonsStepProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();

    function handleToggle(event: ChangeEvent<HTMLInputElement>) {
        onToggle(event.currentTarget.value);
    }

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Intro */}
            <div>
                <h2 className="text-lg font-bold text-ink">{t('paidModules.title')}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{t('paidModules.body')}</p>
            </div>

            {/* Add-on List */}
            {services.length === 0 ? (
                <div className="rounded-xl bg-surface-muted px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-ink">{t('paidModules.emptyTitle')}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{t('paidModules.emptyBody')}</p>
                </div>
            ) : (
                <div className="divide-y divide-border/70 rounded-xl bg-surface-muted/70 px-4">
                    {services.map((service) => {
                        const moduleMeta = service.grantsModuleKey ? getModuleMeta(service.grantsModuleKey, modules) : null;
                        const Icon = moduleMeta?.Icon ?? Puzzle;
                        const checked = selectedCodes.includes(service.code);
                        const name = moduleMeta?.name ?? service.name;
                        const description = service.description ?? moduleMeta?.description;
                        const price = formatMoney(locale, service.priceAmountMinor, service.priceCurrency);

                        return (
                            <label key={service.id} className="flex min-h-16 cursor-pointer items-start gap-3 py-4">
                                <input
                                    type="checkbox"
                                    value={service.code}
                                    checked={checked}
                                    onChange={handleToggle}
                                    className="sr-only"
                                    aria-label={t('paidModules.toggle', { module: name })}
                                />
                                <span
                                    className={cn(
                                        'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition',
                                        checked ? 'border-primary bg-primary text-white' : 'border-border bg-background text-ink-muted'
                                    )}
                                    aria-hidden="true"
                                >
                                    {checked ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                        <span className="text-sm font-semibold text-ink">{name}</span>
                                        <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-primary-dark">
                                            {service.billingPeriod === 'ONE_TIME'
                                                ? t('paidModules.oncePrice', { price })
                                                : t('paidModules.monthlyPrice', { price })}
                                        </span>
                                    </span>
                                    {description && <span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span>}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}

            {/* Note */}
            <p className="text-xs leading-5 text-ink-muted">{t('paidModules.skipHint')}</p>
        </div>
    );
}
