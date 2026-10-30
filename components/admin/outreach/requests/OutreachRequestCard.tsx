'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { OutreachRequestStatusPill } from '@/components/admin/outreach/requests/OutreachRequestStatusPill';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import type { OutreachRequestDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// One request: what is asked, by whom and why, and (once decided) the answer.
export function OutreachRequestCard({
    request,
    canDecide,
    onDecideClick,
    onOpenClick,
}: {
    request: OutreachRequestDto;
    canDecide: boolean;
    onDecideClick: (event: MouseEvent<HTMLButtonElement>) => void;
    onOpenClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.outreach.requests');
    const roles = useTranslations('AdminPage.collaborations.feedCard.roles');
    const format = useOutreachFormat();
    const add = request.kind === 'ADD';
    const proposal = request.proposal;
    const contacts = proposal ? [proposal.email, proposal.phone, proposal.website, proposal.instagram].filter(Boolean) : [];
    const Icon = add ? Plus : Minus;

    return (
        <li className="rounded-xl border border-border bg-card p-4 sm:p-5">
            {/* What is asked */}
            <div className="flex flex-wrap items-start gap-3">
                <span
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        add ? 'bg-status-good-wash text-status-good' : 'bg-status-danger-wash text-status-danger',
                    )}
                >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-ink-faint uppercase">{t(`kind.${request.kind}`)}</p>
                    <p className="truncate text-base font-bold text-ink">{request.prospectName}</p>
                    {proposal && (
                        <p className="text-sm text-ink-muted">
                            {[roles(proposal.kind), format.city(proposal.city), proposal.area].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    {contacts.length > 0 && <p className="truncate text-sm text-ink-muted">{contacts.join(' · ')}</p>}
                </div>
                <OutreachRequestStatusPill status={request.status} />
            </div>

            {/* Why */}
            <div className="mt-3 rounded-lg bg-canvas px-3 py-2.5">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-faint uppercase">{t('why')}</p>
                <p className="text-sm whitespace-pre-line text-ink">{request.note}</p>
                <p className="mt-1 text-xs text-ink-faint">
                    {t('requestedBy', { name: request.requestedBy ?? t('someone'), date: format.dateTime(request.requestedAt) })}
                </p>
            </div>

            {/* The answer */}
            {request.decidedAt && (
                <div className="mt-3 text-sm">
                    <p className="text-xs text-ink-faint">
                        {t('decided', {
                            status: t(`status.${request.status}`),
                            name: request.decidedBy ?? t('someone'),
                            date: format.dateTime(request.decidedAt),
                        })}
                    </p>
                    {request.decisionNote && <p className="whitespace-pre-line text-ink">{request.decisionNote}</p>}
                </div>
            )}

            {/* Actions */}
            {(canDecide && request.status === 'PENDING') || (add && request.status === 'APPROVED' && request.prospectId) ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {add && request.status === 'APPROVED' && request.prospectId && (
                        <button
                            type="button"
                            data-prospect-id={request.prospectId}
                            onClick={onOpenClick}
                            className="h-9 rounded-md px-3 text-sm font-semibold text-primary hover:underline"
                        >
                            {t('openBusiness')}
                        </button>
                    )}
                    {canDecide && request.status === 'PENDING' && (
                        <>
                            <button
                                type="button"
                                data-request-id={request.id}
                                data-decision="decline"
                                onClick={onDecideClick}
                                className="h-9 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted hover:text-ink"
                            >
                                {t('decline')}
                            </button>
                            <button
                                type="button"
                                data-request-id={request.id}
                                data-decision="approve"
                                onClick={onDecideClick}
                                className="h-9 rounded-md bg-primary px-4 text-sm font-bold text-white"
                            >
                                {t('approve')}
                            </button>
                        </>
                    )}
                </div>
            ) : null}
        </li>
    );
}
