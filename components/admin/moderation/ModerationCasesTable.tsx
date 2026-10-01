'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { SelectedCase } from '@/hooks/useModerationPanel';
import type { ModerationCaseSummaryDto, ReportTargetType } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };

// CLOSED has one row per decision, and an item decided twice has two (guide §3).
function rowKey(c: ModerationCaseSummaryDto): string {
    return c.decisionId ?? `${c.targetType}:${c.targetId}`;
}

export function ModerationCasesTable({ cases, onOpenAction }: { cases: ModerationCaseSummaryDto[]; onOpenAction: (c: SelectedCase) => void }) {
    const t = useTranslations('AdminPage.moderation');
    const tReason = useTranslations('Report.reasons');
    const locale = useLocale();
    const showOutcome = cases.some((c) => c.outcome !== null);

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const { targetType, targetId } = event.currentTarget.dataset;
        if (targetType && targetId) onOpenAction({ targetType: targetType as ReportTargetType, targetId });
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('type')}</th>
                        <th className="px-3 py-3 font-bold">{t('event')}</th>
                        <th className="px-3 py-3 font-bold">{t('reportsCol')}</th>
                        <th className="px-3 py-3 font-bold">{t('reason')}</th>
                        <th className="px-3 py-3 font-bold">{t('age')}</th>
                        {showOutcome ? <th className="px-5 py-3 font-bold">{t('outcomeCol')}</th> : null}
                    </tr>
                </thead>
                <tbody>
                    {cases.map((c) => {
                        const date = c.lastReportedAt ?? c.decidedAt;
                        return (
                            <tr key={rowKey(c)} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                <td className="px-5 py-3.5">
                                    <button
                                        type="button"
                                        data-target-type={c.targetType}
                                        data-target-id={c.targetId}
                                        onClick={handleOpen}
                                        className="text-left font-semibold text-ink hover:underline"
                                    >
                                        {t(`types.${c.targetType}`)}
                                    </button>
                                </td>
                                <td className="max-w-64 truncate px-3 py-3.5 text-ink-muted">{c.eventTitle ?? t('eventGone')}</td>
                                <td className="px-3 py-3.5 font-mono text-xs text-ink-muted">{c.reportCount}</td>
                                <td className="px-3 py-3.5 text-ink-muted">{c.topReason ? tReason(c.topReason) : '—'}</td>
                                <td className="px-3 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">
                                    {date ? formatDate(locale, date, DATE_FORMAT) : '—'}
                                </td>
                                {showOutcome ? (
                                    <td className="px-5 py-3.5">
                                        {c.outcome ? (
                                            <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                                {t(`outcome.${c.outcome}`)}
                                            </span>
                                        ) : null}
                                    </td>
                                ) : null}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
