'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { ModerationCaseDrawer } from '@/components/admin/moderation/ModerationCaseDrawer';
import { ModerationCasesTable } from '@/components/admin/moderation/ModerationCasesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useModerationPanel } from '@/hooks/useModerationPanel';
import { MODERATION_TABS } from '@/lib/adminModeration';
import type { ModerationCaseStatus } from '@/lib/api/types';

export function ModerationPanel() {
    const t = useTranslations('AdminPage.moderation');
    const panel = useModerationPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.casesQuery.data;

    function selectTab(event: MouseEvent<HTMLButtonElement>) {
        panel.setStatus(event.currentTarget.dataset.status as ModerationCaseStatus);
    }

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Status tabs */}
            <div role="group" aria-label={t('tabsLabel')} className="flex gap-2">
                {MODERATION_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        data-status={tab}
                        aria-pressed={panel.status === tab}
                        onClick={selectTab}
                        className={
                            panel.status === tab
                                ? 'rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas'
                                : 'rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-card'
                        }
                    >
                        {t(`tabs.${tab}`)}
                    </button>
                ))}
            </div>

            {/* Case list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {panel.casesQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.casesQuery.error ? (
                    <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.casesQuery.error)}</p>
                ) : null}
                {data && data.content.length === 0 ? <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('empty')}</p> : null}
                {data && data.content.length > 0 ? (
                    <>
                        <ModerationCasesTable cases={data.content} showOutcome={panel.status === 'CLOSED'} onOpenAction={panel.openCase} />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Case detail: one mount per opened case */}
            {panel.selected ? (
                <ModerationCaseDrawer
                    key={`${panel.selected.targetType}:${panel.selected.targetId}`}
                    targetType={panel.selected.targetType}
                    targetId={panel.selected.targetId}
                    onCloseAction={panel.closeCase}
                />
            ) : null}
        </section>
    );
}
