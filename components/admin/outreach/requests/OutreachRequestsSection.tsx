'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { OutreachRequestCard } from '@/components/admin/outreach/requests/OutreachRequestCard';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type OutreachDecision, useOutreachRequests } from '@/hooks/useAdminOutreachRequests';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOutreachRequestDecision } from '@/hooks/useOutreachRequestDecision';
import { formatOutreachHash } from '@/lib/adminOutreachRouting';
import type { OutreachRequestStatus } from '@/lib/api/types';
import { pushPageEntry } from '@/lib/overlayHistory';

type Filter = 'PENDING' | 'ALL';

// Requests to add or remove a business. Marketing sees theirs and what was decided; an admin decides.
export function OutreachRequestsSection() {
    const t = useTranslations('AdminPage.outreach.requests');
    const { role } = useAdminNavigation();
    const canDecide = role === 'ADMIN';
    const [filter, setFilter] = useState<Filter>('PENDING');
    const status: OutreachRequestStatus | null = filter === 'ALL' ? null : filter;
    const requests = useOutreachRequests(status);
    const decision = useOutreachRequestDecision();
    const toErrorMessage = useApiErrorMessage();
    const rows = useMemo(() => requests.data?.content ?? [], [requests.data]);
    const filters = [
        { value: 'PENDING' as const, label: t('pending') },
        { value: 'ALL' as const, label: t('all') },
    ];
    const pending = decision.pending;
    const approving = pending?.decision === 'approve';

    const { open } = decision;
    const handleDecideClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const { requestId, decision: chosen } = event.currentTarget.dataset;
            const request = rows.find((row) => row.id === requestId);
            if (request && chosen) open(request, chosen as OutreachDecision);
        },
        [open, rows],
    );

    // The business opens in Partner outreach's drawer.
    const handleOpenClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const id = event.currentTarget.dataset.prospectId;
        if (!id) return;
        pushPageEntry(formatOutreachHash(id));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    return (
        <div className="mx-auto max-w-3xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                <p className="text-sm text-ink-muted">{canDecide ? t('intro') : t('introMarketing')}</p>
            </header>

            {/* Filter */}
            <div className="mb-4">
                <FunnelSegmented label={t('filter')} options={filters} value={filter} onChangeAction={setFilter} />
            </div>

            {Boolean(decision.error) && (
                <p role="alert" className="mb-4 text-sm text-status-danger">
                    {toErrorMessage(decision.error)}
                </p>
            )}

            {/* Requests */}
            {requests.isLoading ? (
                <Loader2 aria-hidden="true" className="mx-auto h-5 w-5 animate-spin text-ink-faint" />
            ) : requests.error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {t('loadError')}
                </p>
            ) : rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
                    {filter === 'PENDING' ? t('empty') : t('emptyAll')}
                </p>
            ) : (
                <ul className="space-y-3">
                    {rows.map((request) => (
                        <OutreachRequestCard
                            key={request.id}
                            request={request}
                            canDecide={canDecide}
                            onDecideClick={handleDecideClick}
                            onOpenClick={handleOpenClick}
                        />
                    ))}
                </ul>
            )}

            {/* Decision */}
            <ConfirmActionModal
                open={pending !== null}
                title={
                    pending
                        ? approving
                            ? t(`approveTitle.${pending.request.kind}`, { name: pending.request.prospectName })
                            : t('declineTitle')
                        : ''
                }
                body={
                    <div className="space-y-3">
                        <p>{pending ? (approving ? t(`approveBody.${pending.request.kind}`) : t('declineBody')) : null}</p>
                        <AdminField label={t('decisionNote')}>
                            <textarea
                                value={decision.note}
                                onChange={decision.handleNoteChange}
                                maxLength={2000}
                                rows={3}
                                className={adminInputClass('resize-y')}
                            />
                        </AdminField>
                    </div>
                }
                confirmLabel={approving ? t('approve') : t('decline')}
                cancelLabel={t('cancel')}
                tone={approving && pending?.request.kind === 'ADD' ? 'default' : 'danger'}
                size="md"
                isConfirming={decision.isDeciding}
                onCloseAction={decision.close}
                onConfirmAction={decision.confirm}
                icon={decision.isDeciding ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </div>
    );
}
