'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import type { PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';

function ReadOnlyValue({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-ink-muted">{children}</dd>
        </div>
    );
}

export function PaidServiceRow({ service, onEdit }: { service: PaidServiceResponseDto; onEdit: (service: PaidServiceResponseDto) => void }) {
    const t = useTranslations('AdminPage.paidServices');
    const locale = useLocale();
    const archived = !service.isAssignable && !service.isPublic;
    const handleEdit = useCallback(() => {
        onEdit(service);
    }, [onEdit, service]);

    return (
        <article className="border-b border-border py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-ink">{service.name}</h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{service.code}</span>
                        {archived && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{t('archived')}</span>
                        )}
                    </div>
                    {service.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{service.description}</p>}
                </div>
                <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('edit')}
                </button>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                <ReadOnlyValue label={t('fields.kind')}>{t(`kinds.${service.kind}`)}</ReadOnlyValue>
                <ReadOnlyValue label={t('fields.priceAmountMinor')}>
                    {formatMoney(locale, service.priceAmountMinor, service.priceCurrency)}
                </ReadOnlyValue>
                <ReadOnlyValue label={t('fields.grantsStorageBytes')}>
                    {service.grantsStorageBytes ? formatBytes(service.grantsStorageBytes) : t('notApplicable')}
                </ReadOnlyValue>
                <ReadOnlyValue label={t('fields.planTierIds')}>
                    {service.planTierIds.length > 0 ? service.planTierIds.join(', ') : t('allPlans')}
                </ReadOnlyValue>
                <ReadOnlyValue label={t('fields.assignable')}>{service.isAssignable ? t('yes') : t('no')}</ReadOnlyValue>
                <ReadOnlyValue label={t('fields.public')}>{service.isPublic ? t('yes') : t('no')}</ReadOnlyValue>
            </dl>
        </article>
    );
}
