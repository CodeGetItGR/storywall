'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { VendorMessageDrawer } from '@/components/admin/vendorMessages/VendorMessageDrawer';
import { VendorMessagesTable } from '@/components/admin/vendorMessages/VendorMessagesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useVendorMessagesPanel } from '@/hooks/useVendorMessagesPanel';

export function VendorMessagesPanel() {
    const t = useTranslations('AdminPage.vendorMessagesPanel');
    const panel = useVendorMessagesPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.query.data;

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
                <FunnelSegmented label={t('filterLabel')} options={panel.filterOptions} value={panel.filter} onChangeAction={panel.changeFilter} />
            </header>

            {/* Message list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {panel.query.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.query.error ? <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.query.error)}</p> : null}
                {data && data.content.length === 0 ? <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('empty')}</p> : null}
                {data && data.content.length > 0 ? (
                    <>
                        <VendorMessagesTable messages={data.content} onOpenAction={panel.openById} />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Message detail */}
            {panel.selected ? (
                <VendorMessageDrawer
                    key={panel.selected.id}
                    message={panel.selected}
                    isMarking={panel.isMarking}
                    error={panel.error}
                    onMarkAction={panel.mark}
                    onCloseAction={panel.close}
                />
            ) : null}
        </section>
    );
}
