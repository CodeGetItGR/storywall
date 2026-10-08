'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { CollaboratorViesStatus } from '@/components/admin/collaborations/CollaboratorViesStatus';
import { PlatformMetricGroup } from '@/components/admin/PlatformMetricGroup';
import { collaboratorAddressText, collaboratorVatText, formatIban } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { viesCountryName } from '@/lib/businessProfile';
import { cn } from '@/lib/utils';

// An empty value reads as "Not set" in the plain face, even in a mono field.
function DetailItem({ label, value, mono, className }: { label: string; value: ReactNode; mono?: boolean; className?: string }) {
    const t = useTranslations('AdminPage.collaborations.business');

    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-[13px] font-medium text-ink-muted">{label}</dt>
            <dd className="mt-1 text-sm break-words">
                {value === null || value === undefined ? (
                    <span className="text-ink-faint">{t('notSet')}</span>
                ) : (
                    <span className={cn('font-semibold text-ink', mono && 'font-mono text-[13px]')}>{value}</span>
                )}
            </dd>
        </div>
    );
}

export function CollaboratorBusinessDetails({ collaborator, onEditAction }: { collaborator: CollaboratorResponseDto; onEditAction: () => void }) {
    const t = useTranslations('AdminPage.collaborations.business');
    const locale = useLocale();

    return (
        <section className="space-y-3">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                <button
                    type="button"
                    onClick={onEditAction}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                    {t('edit')}
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Invoicing */}
                <PlatformMetricGroup title={t('groups.invoicing')} titleAs="h4">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <DetailItem label={t('fields.legalName')} value={collaborator.legalName} className="sm:col-span-2" />
                        <DetailItem label={t('fields.vatNumber')} value={collaboratorVatText(collaborator)} mono />
                        <DetailItem
                            label={t('fields.countryCode')}
                            value={collaborator.countryCode && viesCountryName(locale, collaborator.countryCode, t('northernIreland'))}
                        />
                        <DetailItem label={t('fields.taxOffice')} value={collaborator.taxOffice} />
                        <DetailItem label={t('fields.address')} value={collaboratorAddressText(collaborator)} />
                    </dl>
                </PlatformMetricGroup>

                {/* Payout */}
                <PlatformMetricGroup title={t('groups.payout')} titleAs="h4">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <DetailItem
                            label={t('fields.payoutIban')}
                            value={collaborator.payoutIban && formatIban(collaborator.payoutIban)}
                            mono
                            className="sm:col-span-2"
                        />
                        <DetailItem label={t('fields.payoutAccountHolder')} value={collaborator.payoutAccountHolder} className="sm:col-span-2" />
                        <div className="min-w-0 sm:col-span-2">
                            <dt className="text-[13px] font-medium text-ink-muted">{t('fields.viesStatus')}</dt>
                            <dd className="mt-1">
                                <CollaboratorViesStatus collaborator={collaborator} />
                            </dd>
                        </div>
                    </dl>
                </PlatformMetricGroup>

                {/* Contact */}
                <PlatformMetricGroup title={t('groups.contact')} titleAs="h4" className="lg:col-span-2">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label={t('fields.contactPersonName')} value={collaborator.contactPersonName} />
                        <DetailItem label={t('fields.contactPhone')} value={collaborator.contactPhone} mono />
                        <DetailItem
                            label={t('fields.billingEmail')}
                            value={collaborator.billingEmail ?? t('billingEmailDefault')}
                            mono={Boolean(collaborator.billingEmail)}
                        />
                        <DetailItem label={t('fields.websiteUrl')} value={collaborator.websiteUrl} mono />
                    </dl>
                </PlatformMetricGroup>
            </div>
        </section>
    );
}
