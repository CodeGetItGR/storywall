'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { CollaboratorViesStatus } from '@/components/admin/collaborations/CollaboratorViesStatus';
import { collaboratorAddressText, collaboratorVatText, formatIban } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { viesCountryName } from '@/lib/businessProfile';
import { cn } from '@/lib/utils';

function DetailItem({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
            <dd className={cn('mt-0.5 text-sm break-words text-ink', mono && 'font-mono text-[13px]')}>{children}</dd>
        </div>
    );
}

export function CollaboratorBusinessDetails({ collaborator, onEditAction }: { collaborator: CollaboratorResponseDto; onEditAction: () => void }) {
    const t = useTranslations('AdminPage.collaborations.business');
    const locale = useLocale();
    const notSet = <span className="text-ink-faint">{t('notSet')}</span>;

    return (
        <section className="space-y-4">
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

            {/* Invoicing */}
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label={t('fields.legalName')}>{collaborator.legalName ?? notSet}</DetailItem>
                <DetailItem label={t('fields.vatNumber')} mono>
                    {collaboratorVatText(collaborator) ?? notSet}
                </DetailItem>
                <DetailItem label={t('fields.viesStatus')}>
                    <CollaboratorViesStatus collaborator={collaborator} />
                </DetailItem>
                <DetailItem label={t('fields.countryCode')}>
                    {collaborator.countryCode ? viesCountryName(locale, collaborator.countryCode, t('northernIreland')) : notSet}
                </DetailItem>
                <DetailItem label={t('fields.taxOffice')}>{collaborator.taxOffice ?? notSet}</DetailItem>
                <DetailItem label={t('fields.address')}>{collaboratorAddressText(collaborator) ?? notSet}</DetailItem>
            </dl>

            {/* Payout */}
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label={t('fields.payoutIban')} mono>
                    {collaborator.payoutIban ? formatIban(collaborator.payoutIban) : notSet}
                </DetailItem>
                <DetailItem label={t('fields.payoutAccountHolder')}>{collaborator.payoutAccountHolder ?? notSet}</DetailItem>
            </dl>

            {/* Contact */}
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label={t('fields.contactPersonName')}>{collaborator.contactPersonName ?? notSet}</DetailItem>
                <DetailItem label={t('fields.contactPhone')} mono>
                    {collaborator.contactPhone ?? notSet}
                </DetailItem>
                <DetailItem label={t('fields.billingEmail')} mono>
                    {collaborator.billingEmail ?? <span className="font-sans text-ink-faint">{t('billingEmailDefault')}</span>}
                </DetailItem>
                <DetailItem label={t('fields.websiteUrl')} mono>
                    {collaborator.websiteUrl ?? notSet}
                </DetailItem>
            </dl>
        </section>
    );
}
