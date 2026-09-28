'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { toStoredRecentErrors } from '@/lib/adminBetaFeedback';
import { formatDate } from '@/lib/datetime';

export function BugReportRecentErrors({
    entries,
    onOpenErrorRefAction,
}: {
    entries: Record<string, unknown>[] | null;
    onOpenErrorRefAction: (errorRef: string) => void;
}) {
    const t = useTranslations('AdminPage.bugReports');
    const locale = useLocale();
    const errors = toStoredRecentErrors(entries);

    function handleOpenRef(event: MouseEvent<HTMLButtonElement>) {
        const ref = event.currentTarget.dataset.ref;
        if (ref) onOpenErrorRefAction(ref);
    }

    return (
        <section className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('recentErrors')}</h3>
            {errors.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('noRecentErrors')}</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[560px] border-collapse font-mono text-xs">
                        <thead>
                            <tr className="border-b border-border text-left font-sans text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="px-3 py-2 font-bold">{t('errorColumns.at')}</th>
                                <th className="px-3 py-2 font-bold">{t('errorColumns.request')}</th>
                                <th className="px-3 py-2 font-bold">{t('errorColumns.status')}</th>
                                <th className="px-3 py-2 font-bold">{t('errorColumns.code')}</th>
                                <th className="px-3 py-2 font-bold">{t('errorColumns.ref')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {errors.map((entry, index) => (
                                <tr key={`${entry.at}-${index}`} className="border-b border-border text-ink-muted last:border-b-0">
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        {entry.at ? formatDate(locale, entry.at, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-3 py-2 break-all">
                                        <span className="font-bold text-ink">{entry.method ?? '—'}</span> {entry.path ?? '—'}
                                    </td>
                                    <td className="px-3 py-2">{entry.status ?? '—'}</td>
                                    <td className="px-3 py-2">{entry.errorCode ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        {entry.errorRef ? (
                                            <button
                                                type="button"
                                                data-ref={entry.errorRef}
                                                onClick={handleOpenRef}
                                                title={t('openError')}
                                                className="font-semibold text-primary-dark hover:underline"
                                            >
                                                {entry.errorRef}
                                            </button>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
