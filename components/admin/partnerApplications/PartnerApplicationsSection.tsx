'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { PartnerApplicationDetail } from '@/components/admin/partnerApplications/PartnerApplicationDetail';
import { PartnerApplicationsTable } from '@/components/admin/partnerApplications/PartnerApplicationsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePartnerApplicationsPanel } from '@/hooks/usePartnerApplicationsPanel';
import { APPLICATION_STATUS_FILTERS } from '@/lib/adminPartnerApplications';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PartnerApplicationsSection() {
    const t = useTranslations('AdminPage');
    const panel = usePartnerApplicationsPanel();
    const filterOptions = APPLICATION_STATUS_FILTERS.map((value) => ({
        value: value ?? 'all',
        label: t(`partnerApplications.filter.${value ?? 'all'}`),
    }));

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Detail */}
            {panel.selectedId && (
                <PartnerApplicationDetail key={panel.selectedId} applicationId={panel.selectedId} onBackAction={panel.handleBackClick} />
            )}

            {!panel.selectedId && (
                <>
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('partnerApplications.title')}</h1>
                        <FunnelSegmented
                            label={t('partnerApplications.filterLabel')}
                            options={filterOptions}
                            value={panel.status ?? 'all'}
                            onChangeAction={panel.handleStatusChange}
                        />
                    </header>

                    {/* States */}
                    {panel.isLoading && <LoadingState label={t('partnerApplications.loading')} className="justify-start py-6" />}
                    {Boolean(panel.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(panel.error)}`)}</p>}
                    {!panel.isLoading && !panel.error && panel.rows.length === 0 && (
                        <p className="py-6 text-sm text-ink-muted">{t('partnerApplications.empty')}</p>
                    )}

                    {/* Table */}
                    {panel.rows.length > 0 && panel.pageInfo && (
                        <section className="overflow-x-auto rounded-xl border border-border bg-card">
                            <PartnerApplicationsTable rows={panel.rows} />
                            <AdminPagination
                                pageInfo={panel.pageInfo}
                                page={panel.page}
                                summary={t('partnerApplications.count', { count: panel.pageInfo.totalElements })}
                                onPageChangeAction={panel.setPage}
                            />
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
