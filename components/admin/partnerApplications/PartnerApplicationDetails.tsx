'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useCountryName } from '@/hooks/useCountryName';
import type { AdminPartnerApplicationDto } from '@/lib/api/types';

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="text-xs font-semibold text-ink-faint">{label}</dt>
            <dd className="min-w-0 text-sm break-words text-ink">{children}</dd>
        </div>
    );
}

export function PartnerApplicationDetails({
    application,
    linkHref,
    source,
}: {
    application: AdminPartnerApplicationDto;
    linkHref: string | null;
    source: string | null;
}) {
    const t = useTranslations('AdminPage.partnerApplications');
    const tRoles = useTranslations('AdminPage.collaborations.feedCard.roles');
    const countryName = useCountryName();

    return (
        <dl className="divide-y divide-border">
            <Row label={t('fields.name')}>{application.name}</Row>
            <Row label={t('fields.email')}>
                <a href={`mailto:${application.email}`} className="font-mono text-[13px] hover:underline">
                    {application.email}
                </a>
            </Row>
            <Row label={t('fields.phone')}>
                {application.phone ? (
                    <a href={`tel:${application.phone}`} className="font-mono text-[13px] hover:underline">
                        {application.phone}
                    </a>
                ) : (
                    '—'
                )}
            </Row>
            <Row label={t('fields.link')}>
                {linkHref ? (
                    <a href={linkHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {application.link}
                    </a>
                ) : (
                    '—'
                )}
            </Row>
            <Row label={t('fields.role')}>{tRoles(application.role)}</Row>
            <Row label={t('fields.country')}>
                {countryName(application.countryCode)} <span className="font-mono text-[11px] text-ink-faint">{application.countryCode}</span>
            </Row>
            <Row label={t('fields.language')}>{t(`languages.${application.locale === 'el' ? 'el' : 'en'}`)}</Row>
            <Row label={t('fields.source')}>
                <span className="font-mono text-[13px]">{source ?? '—'}</span>
            </Row>
        </dl>
    );
}
