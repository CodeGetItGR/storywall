'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { EventDetailPage } from '@/components/admin/events/EventDetailPage';
import { EventsFilters } from '@/components/admin/events/EventsFilters';
import { EventsTable } from '@/components/admin/events/EventsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventsPanel } from '@/hooks/useEventsPanel';

export function EventsSection() {
    const t = useTranslations('AdminPage.events');
    const panel = useEventsPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.eventsQuery.data;

    return (
        <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* One event */}
            {panel.selectedId && <EventDetailPage key={panel.selectedId} eventId={panel.selectedId} onBackAction={panel.backToList} />}

            {/* List: its filters and page live in the panel hook, so Back returns to the same results */}
            {!panel.selectedId && (
                <section className="space-y-5">
                    {/* Header */}
                    <header>
                        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    </header>

                    {/* Events */}
                    <section className="overflow-hidden rounded-xl border border-border bg-card">
                        <EventsFilters
                            filters={panel.filters}
                            search={panel.search}
                            planCode={panel.planCode}
                            hostLabel={panel.hostLabel}
                            onSearchChangeAction={panel.handleSearchChange}
                            onPlanCodeChangeAction={panel.handlePlanCodeChange}
                            onStatusChangeAction={panel.handleStatusChange}
                            onRestrictionChangeAction={panel.handleRestrictionChange}
                            onIncludeDeletedChangeAction={panel.handleIncludeDeletedChange}
                            onClearHostAction={panel.clearHost}
                        />

                        {panel.eventsQuery.isLoading && <LoadingState label={t('loading')} className="min-h-48" />}
                        {panel.eventsQuery.error ? (
                            <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.eventsQuery.error)}</p>
                        ) : null}
                        {data && data.content.length === 0 && (
                            <p className="px-5 py-14 text-center text-sm text-ink-muted">{panel.hasFilters ? t('noResults') : t('empty')}</p>
                        )}
                        {data && data.content.length > 0 && (
                            <>
                                <EventsTable events={data.content} />
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
