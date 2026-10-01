'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { BugReportContextFacts } from '@/components/admin/betaFeedback/BugReportContextFacts';
import { BugReportRecentErrors } from '@/components/admin/betaFeedback/BugReportRecentErrors';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminBugReport } from '@/hooks/useAdminBetaFeedback';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { formatDate } from '@/lib/datetime';

export function BugReportDrawer({
    id,
    onCloseAction,
    onOpenErrorRefAction,
}: {
    id: string;
    onCloseAction: () => void;
    onOpenErrorRefAction: (errorRef: string) => void;
}) {
    const t = useTranslations('AdminPage.bugReports');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const { data: report, error, isLoading } = useAdminBugReport(id);

    const subtitle = report ? formatDate(locale, report.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : undefined;

    return (
        <AdminDrawer open onClose={onCloseAction} closeLabel={t('close')} title={t('detailTitle')} subtitle={subtitle} size="wide">
            {isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
            {error ? <p className="text-sm text-status-danger">{toErrorMessage(error)}</p> : null}

            {report ? (
                <div className="space-y-7">
                    {/* Description */}
                    <section className="space-y-2">
                        <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('description')}</h3>
                        <p className="text-sm leading-6 break-words whitespace-pre-wrap text-ink">{report.description}</p>
                    </section>

                    {/* Screenshot */}
                    {report.screenshotUrl ? (
                        <section className="space-y-2">
                            <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('screenshot')}</h3>
                            <a href={report.screenshotUrl} target="_blank" rel="noreferrer" className="block">
                                {/* Presigned, short-lived URL: next/image would cache it past expiry. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={report.screenshotUrl}
                                    alt={t('screenshot')}
                                    className="max-h-96 w-full rounded-lg border border-border bg-canvas object-contain"
                                />
                            </a>
                        </section>
                    ) : null}

                    {/* Context */}
                    <BugReportContextFacts report={report} />

                    {/* Recent errors */}
                    <BugReportRecentErrors entries={report.recentErrors} onOpenErrorRefAction={onOpenErrorRefAction} />

                    {/* Identifiers */}
                    <section className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                        <AdminIdentifier label={t('reportId')} value={report.id} />
                        {report.reporterUserId ? <AdminIdentifier label={t('reporterId')} value={report.reporterUserId} /> : null}
                        {report.eventId ? <AdminIdentifier label={t('eventId')} value={report.eventId} /> : null}
                    </section>
                </div>
            ) : null}
        </AdminDrawer>
    );
}
