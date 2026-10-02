'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { AccountingExportPopover } from '@/components/admin/orders/AccountingExportPopover';
import { OrderDetailPage } from '@/components/admin/orders/OrderDetailPage';
import { OrdersFilters } from '@/components/admin/orders/OrdersFilters';
import { OrdersTable } from '@/components/admin/orders/OrdersTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOrdersPanel } from '@/hooks/useOrdersPanel';

export function OrdersSection() {
    const t = useTranslations('AdminPage.orders');
    const panel = useOrdersPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.rangeInvalid ? undefined : panel.ordersQuery.data;

    return (
        <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* One order */}
            {panel.selectedId && <OrderDetailPage key={panel.selectedId} orderId={panel.selectedId} onBackAction={panel.backToList} />}

            {/* List — its filters and page live in the panel hook, so Back returns to the same results */}
            {!panel.selectedId && (
                <section className="space-y-5">
                    {/* Header */}
                    <header className="flex flex-wrap items-end justify-between gap-3">
                        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                        <AccountingExportPopover />
                    </header>

                    {/* Orders */}
                    <section className="overflow-hidden rounded-xl border border-border bg-card">
                        <OrdersFilters
                            filters={panel.filters}
                            search={panel.search}
                            buyerLabel={panel.buyerLabel}
                            rangeInvalid={panel.rangeInvalid}
                            moreOpen={panel.moreOpen}
                            onFilterChangeAction={panel.handleFilterChange}
                            onSearchChangeAction={panel.handleSearchChange}
                            onClearBuyerAction={panel.clearBuyer}
                            onToggleMoreAction={panel.toggleMore}
                        />

                        {panel.ordersQuery.isLoading && <LoadingState label={t('loading')} className="min-h-48" />}
                        {panel.ordersQuery.error ? (
                            <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.ordersQuery.error)}</p>
                        ) : null}
                        {data && data.content.length === 0 && (
                            <p className="px-5 py-14 text-center text-sm text-ink-muted">{panel.hasFilters ? t('noResults') : t('empty')}</p>
                        )}
                        {data && data.content.length > 0 && (
                            <>
                                <OrdersTable orders={data.content} />
                                <AdminPagination
                                    pageInfo={data.page}
                                    page={panel.page}
                                    summary={t('count', { count: data.page.totalElements })}
                                    onPageChangeAction={panel.setPage}
                                />
                            </>
                        )}
                    </section>
                </section>
            )}
        </div>
    );
}
