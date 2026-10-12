'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { ErrorEventDrawer } from '@/components/admin/betaFeedback/ErrorEventDrawer';
import { ErrorEventFilters } from '@/components/admin/betaFeedback/ErrorEventFilters';
import { ErrorEventsTable } from '@/components/admin/betaFeedback/ErrorEventsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useErrorEventsPanel } from '@/hooks/useErrorEventsPanel';

export function ErrorEventsPanel() {
    const t = useTranslations('AdminPage.errorEvents');
    const panel = useErrorEventsPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.eventsQuery.data;

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Error list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <ErrorEventFilters
                    source={panel.source}
                    onSourceChangeAction={panel.setSource}
                    statusClass={panel.statusClass}
                    onStatusClassChangeAction={panel.setStatusClass}
                    refInput={panel.refInput}
                    refInvalid={panel.refInvalid}
                    onRefChangeAction={panel.handleRefChange}
                    onClearRefAction={panel.clearRef}
                />

                {panel.eventsQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.eventsQuery.error ? (
                    <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.eventsQuery.error)}</p>
                ) : null}
                {data && data.content.length === 0 ? (
                    <p className="px-5 py-14 text-center text-sm text-ink-muted">{panel.appliedRef ? t('refNotFound') : t('empty')}</p>
                ) : null}
                {data && data.content.length > 0 ? (
                    <>
                        <ErrorEventsTable events={data.content} onOpenAction={panel.openEvent} />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Error detail */}
            {panel.selected ? <ErrorEventDrawer key={panel.selected.id} event={panel.selected} onCloseAction={panel.closeEvent} /> : null}
        </section>
    );
}
