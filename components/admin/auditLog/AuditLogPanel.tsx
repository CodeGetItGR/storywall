'use client';

import { useTranslations } from 'next-intl';

import { AuditLogDrawer } from '@/components/admin/auditLog/AuditLogDrawer';
import { AuditLogFilters } from '@/components/admin/auditLog/AuditLogFilters';
import { AuditLogTable } from '@/components/admin/auditLog/AuditLogTable';
import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuditLogPanel } from '@/hooks/useAdminAuditLog';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';

// Every action a platform admin took, newest first, filterable by admin, event and action.
export function AuditLogPanel() {
    const t = useTranslations('AdminPage.auditLog');
    const panel = useAuditLogPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.query.data;

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Log */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <AuditLogFilters panel={panel} />

                {panel.query.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.query.error ? <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.query.error)}</p> : null}
                {data && data.content.length === 0 ? (
                    <p className="px-5 py-14 text-center text-sm text-ink-muted">{panel.hasFilters ? t('emptyFiltered') : t('empty')}</p>
                ) : null}
                {data && data.content.length > 0 ? (
                    <>
                        <AuditLogTable
                            entries={data.content}
                            onOpenAction={panel.open}
                            onAdminAction={panel.filterByAdmin}
                            onEventAction={panel.filterByEvent}
                        />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Entry */}
            {panel.selected ? <AuditLogDrawer key={panel.selected.id} entry={panel.selected} onCloseAction={panel.close} /> : null}
        </section>
    );
}
