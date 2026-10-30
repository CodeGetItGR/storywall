'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { OutreachGroup } from '@/components/admin/outreach/OutreachGroup';
import { OutreachStatusPill } from '@/components/admin/outreach/OutreachStatusPill';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import type { OutreachProspectRowDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function OutreachDueList({
    rows,
    onOpenAction,
}: {
    rows: OutreachProspectRowDto[];
    onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.outreach');
    const format = useOutreachFormat();

    return (
        <OutreachGroup title={t('due.title')}>
            {/* Empty */}
            {rows.length === 0 && <p className="text-sm text-ink-muted">{t('due.empty')}</p>}

            {/* Rows */}
            {rows.length > 0 && (
                <ul className="-mx-2 divide-y divide-border">
                    {rows.map((row) => (
                        <li key={row.id}>
                            <button
                                type="button"
                                data-prospect-id={row.id}
                                onClick={onOpenAction}
                                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-canvas"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{row.name}</span>
                                    <span className="block truncate text-xs text-ink-muted">
                                        {t(`types.${row.type}`)} · {format.city(row.city)}
                                    </span>
                                </span>
                                <OutreachStatusPill status={row.status} />
                                <span
                                    className={cn(
                                        'w-28 shrink-0 text-right text-xs tabular-nums',
                                        row.followupDue ? 'font-bold text-status-warn' : 'text-ink-muted',
                                    )}
                                >
                                    {row.followupDue ? t('due.dueOn', { date: format.day(row.nextFollowupOn) }) : format.day(row.nextFollowupOn)}
                                </span>
                                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-faint" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </OutreachGroup>
    );
}
