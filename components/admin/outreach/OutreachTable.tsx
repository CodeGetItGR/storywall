'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { OutreachContactCell } from '@/components/admin/outreach/OutreachContactCell';
import { OutreachNextStepCell } from '@/components/admin/outreach/OutreachNextStepCell';
import { OutreachPriorityBadge } from '@/components/admin/outreach/OutreachPriorityBadge';
import { OutreachSortHeader } from '@/components/admin/outreach/OutreachSortHeader';
import { OutreachStatusPill } from '@/components/admin/outreach/OutreachStatusPill';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import type { OutreachSort } from '@/lib/adminOutreach';
import type { OutreachProspectRowDto } from '@/lib/api/types';

export function OutreachTable({
    rows,
    sort,
    onSortAction,
    onOpenAction,
}: {
    rows: OutreachProspectRowDto[];
    sort: OutreachSort;
    onSortAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.outreach');
    const format = useOutreachFormat();

    return (
        <table aria-label={t('table.label')} className="w-full min-w-[1040px] border-collapse text-sm">
            {/* Columns */}
            <thead>
                <tr className="border-b border-border text-left text-[11px] text-ink-faint">
                    <OutreachSortHeader field="priority" label={t('table.priority')} sort={sort} onSortAction={onSortAction} className="pl-4" />
                    <OutreachSortHeader field="name" label={t('table.business')} sort={sort} onSortAction={onSortAction} />
                    <OutreachSortHeader field="kind" label={t('table.type')} sort={sort} onSortAction={onSortAction} />
                    <OutreachSortHeader field="city" label={t('table.city')} sort={sort} onSortAction={onSortAction} />
                    <OutreachSortHeader field="status" label={t('table.status')} sort={sort} onSortAction={onSortAction} />
                    <th scope="col" className="px-3 py-2.5 font-bold tracking-wide uppercase">
                        {t('table.contact')}
                    </th>
                    <OutreachSortHeader field="lastContactOn" label={t('table.lastContact')} sort={sort} onSortAction={onSortAction} />
                    <OutreachSortHeader field="nextFollowupOn" label={t('table.nextStep')} sort={sort} onSortAction={onSortAction} className="pr-4" />
                </tr>
            </thead>

            {/* Rows */}
            <tbody>
                {rows.map((row) => (
                    <tr key={row.id} className="relative border-b border-border last:border-b-0 hover:bg-canvas/60">
                        <td className="py-2.5 pr-3 pl-4">
                            <OutreachPriorityBadge priority={row.priority} />
                        </td>
                        <td className="max-w-[15rem] px-3 py-2.5">
                            {/* The button covers the whole row */}
                            <button
                                type="button"
                                data-prospect-id={row.id}
                                onClick={onOpenAction}
                                className="block max-w-full truncate text-left font-semibold text-ink after:absolute after:inset-0"
                            >
                                {row.name}
                            </button>
                            {(row.subcategory || row.area) && (
                                <span className="block truncate text-xs text-ink-muted">
                                    {[row.subcategory, row.area].filter(Boolean).join(' · ')}
                                </span>
                            )}
                        </td>
                        <td className="min-w-[6.5rem] px-3 py-2.5 text-ink-muted">{t(`types.${row.type}`)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-ink-muted">{format.city(row.city)}</td>
                        <td className="max-w-[14rem] px-3 py-2.5">
                            <OutreachStatusPill status={row.status} />
                            {row.outcome && <span className="mt-1 block truncate text-xs text-ink-muted">{row.outcome}</span>}
                        </td>
                        <td className="max-w-[12rem] px-3 py-2.5">
                            <OutreachContactCell row={row} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-ink-muted tabular-nums">{format.day(row.lastContactOn)}</td>
                        {/* Short phrases, kept on one line so the rows stay one line tall */}
                        <td className="py-2.5 pr-4 pl-3 whitespace-nowrap tabular-nums">
                            <OutreachNextStepCell row={row} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
