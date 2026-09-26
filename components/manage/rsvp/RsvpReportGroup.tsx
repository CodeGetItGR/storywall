'use client';

import { useTranslations } from 'next-intl';

import type { RsvpReportGroupDto } from '@/lib/api/types';

import { RsvpReportTableRow } from './RsvpReportTableRow';

export function RsvpReportGroup({ group }: { group: RsvpReportGroupDto }) {
    const t = useTranslations('ManagePage.rsvpReport');
    const title = group.attending
        ? `${group.label} — ${t('responses', { count: group.responses })} / ${t('people', { count: group.people })}`
        : `${group.label} — ${t('responses', { count: group.responses })}`;

    return (
        <div>
            {/* Group heading */}
            <h3 className="mb-2 text-sm font-bold text-primary">{title}</h3>

            {/* Rows (small screens) */}
            <ul className="divide-y divide-border border-t border-border md:hidden print:hidden">
                {group.rows.map((row) => (
                    <li key={row.rsvpId} className="py-2.5 text-sm">
                        <p className="font-semibold text-ink">{row.name}</p>
                        <p className="text-xs text-ink-muted">
                            {[row.phone, `${t('columns.adults')} ${row.adults}`, `${t('columns.children')} ${row.children}`]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        {row.notes && <p className="mt-0.5 text-xs text-ink-muted">{row.notes}</p>}
                    </li>
                ))}
            </ul>

            {/* Rows (table) */}
            <table className="hidden w-full text-left text-sm md:table print:table">
                <thead>
                    <tr className="bg-surface-muted text-xs text-ink-faint">
                        <th className="min-w-40 px-2 py-1.5 font-bold whitespace-nowrap">{t('columns.name')}</th>
                        <th className="px-2 py-1.5 font-bold whitespace-nowrap">{t('columns.phone')}</th>
                        <th className="px-2 py-1.5 font-bold whitespace-nowrap">{t('columns.adults')}</th>
                        <th className="px-2 py-1.5 font-bold whitespace-nowrap">{t('columns.children')}</th>
                        <th className="px-2 py-1.5 font-bold whitespace-nowrap">{t('columns.notes')}</th>
                    </tr>
                </thead>
                <tbody>
                    {group.rows.map((row) => (
                        <RsvpReportTableRow key={row.rsvpId} row={row} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
