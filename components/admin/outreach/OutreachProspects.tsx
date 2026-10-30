'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { OutreachFilters } from '@/components/admin/outreach/OutreachFilters';
import { OutreachTable } from '@/components/admin/outreach/OutreachTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { OutreachTableState } from '@/hooks/useOutreachTable';

export function OutreachProspects({
    table,
    cities,
    onOpenAction,
}: {
    table: OutreachTableState;
    cities: string[];
    onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.outreach');
    const toErrorMessage = useApiErrorMessage();
    const isEmpty = !table.isLoading && !table.error && table.rows.length === 0;

    return (
        <section aria-labelledby="outreach-prospects-title" className="space-y-3">
            {/* Title */}
            <h2 id="outreach-prospects-title" className="text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">
                {t('table.title')}
            </h2>

            {/* Filters */}
            <OutreachFilters table={table} cities={cities} />

            {/* States */}
            {table.isLoading && <LoadingState className="justify-start py-6" />}
            {Boolean(table.error) && <p className="py-6 text-sm text-status-danger">{toErrorMessage(table.error)}</p>}
            {isEmpty && (
                <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-ink-muted">
                    {table.hasFilters ? (
                        <p>
                            {t('table.emptyFiltered')}{' '}
                            <button type="button" onClick={table.clearFilters} className="font-semibold text-ink underline underline-offset-2">
                                {t('filters.clear')}
                            </button>
                        </p>
                    ) : (
                        <p>{t('table.empty')}</p>
                    )}
                </div>
            )}

            {/* Table */}
            {table.rows.length > 0 && table.pageInfo && (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <OutreachTable rows={table.rows} sort={table.sort} onSortAction={table.handleSortClick} onOpenAction={onOpenAction} />
                    <AdminPagination
                        pageInfo={table.pageInfo}
                        page={table.page}
                        summary={t('table.count', { count: table.pageInfo.totalElements })}
                        onPageChangeAction={table.setPage}
                    />
                </div>
            )}
        </section>
    );
}
