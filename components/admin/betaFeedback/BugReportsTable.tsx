'use client';

import { ImageIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { firstLine, pagePathOf } from '@/lib/adminBetaFeedback';
import type { BugReportResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function BugReportsTable({ reports, onOpenAction }: { reports: BugReportResponseDto[]; onOpenAction: (id: string) => void }) {
    const t = useTranslations('AdminPage.bugReports');
    const tRole = useTranslations('AdminPage.accounts.role');
    const locale = useLocale();

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.reportId;
        if (id) onOpenAction(id);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.received')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.description')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.page')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.reporter')}</th>
                        <th className="px-5 py-3 font-bold">{t('columns.screenshot')}</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((report) => (
                        <tr key={report.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">
                                {formatDate(locale, report.createdAt, DATE_FORMAT)}
                            </td>
                            <td className="px-3 py-3.5">
                                <button
                                    type="button"
                                    data-report-id={report.id}
                                    onClick={handleOpen}
                                    aria-label={t('open')}
                                    className="block max-w-md truncate text-left font-semibold text-ink hover:underline"
                                >
                                    {firstLine(report.description)}
                                </button>
                            </td>
                            <td className="max-w-56 truncate px-3 py-3.5 font-mono text-xs text-ink-muted">{pagePathOf(report.pageUrl) ?? '—'}</td>
                            <td className="px-3 py-3.5">
                                <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                    {tRole(report.reporterRole)}
                                </span>
                            </td>
                            <td className="px-5 py-3.5 text-ink-faint">
                                {report.screenshotUrl ? <ImageIcon className="h-4 w-4" aria-label={t('hasScreenshot')} /> : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
