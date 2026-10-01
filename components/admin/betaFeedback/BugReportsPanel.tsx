'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { BugReportDrawer } from '@/components/admin/betaFeedback/BugReportDrawer';
import { BugReportsTable } from '@/components/admin/betaFeedback/BugReportsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useBugReportsPanel } from '@/hooks/useBugReportsPanel';

export function BugReportsPanel() {
    const t = useTranslations('AdminPage.bugReports');
    const panel = useBugReportsPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.reportsQuery.data;

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Report list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {panel.reportsQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.reportsQuery.error ? (
                    <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.reportsQuery.error)}</p>
                ) : null}
                {data && data.content.length === 0 ? <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('empty')}</p> : null}
                {data && data.content.length > 0 ? (
                    <>
                        <BugReportsTable reports={data.content} onOpenAction={panel.openReport} />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Report detail */}
            {panel.selectedId ? (
                <BugReportDrawer
                    key={panel.selectedId}
                    id={panel.selectedId}
                    onCloseAction={panel.closeReport}
                    onOpenErrorRefAction={panel.openErrorRef}
                />
            ) : null}
        </section>
    );
}
