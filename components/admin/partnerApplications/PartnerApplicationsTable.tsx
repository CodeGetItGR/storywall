'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { PartnerApplicationStatusPill } from '@/components/admin/partnerApplications/PartnerApplicationStatusPill';
import { useCountryName } from '@/hooks/useCountryName';
import { formatPartnerApplicationsHash } from '@/lib/adminPartnerApplicationsRouting';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationsTable({ rows }: { rows: AdminPartnerApplicationDto[] }) {
    const t = useTranslations('AdminPage.partnerApplications');
    const tRoles = useTranslations('AdminPage.collaborations.feedCard.roles');
    const locale = useLocale();
    const countryName = useCountryName();

    return (
        <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                    <th className="px-4 py-2.5 font-bold">{t('columns.received')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.business')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.role')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.country')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.source')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.status')}</th>
                    <th className="px-3 py-2.5" />
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.id} className="relative border-b border-border last:border-b-0 hover:bg-canvas/60">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted">
                            {/* The link covers the whole row */}
                            <a href={formatPartnerApplicationsHash(row.id)} className="after:absolute after:inset-0">
                                {formatAdminDateTime(locale, row.createdAt)}
                            </a>
                        </td>
                        <td className="px-3 py-2.5">
                            <span className="block font-semibold text-ink">{row.businessName}</span>
                            <span className="block text-xs text-ink-muted">{row.name}</span>
                        </td>
                        <td className="px-3 py-2.5">
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{tRoles(row.role)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">
                            {countryName(row.countryCode)} <span className="font-mono text-[11px] text-ink-faint">{row.countryCode}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted">{row.utmSource ?? '—'}</td>
                        <td className="px-3 py-2.5">
                            <PartnerApplicationStatusPill status={row.status} />
                        </td>
                        <td className="px-3 py-2.5 text-ink-faint">
                            <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
