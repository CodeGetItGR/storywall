'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { formatAdminDateTime, splitWithdrawalGuidance } from '@/lib/adminWithdrawals';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';

export function useWithdrawalDetail(row: WithdrawalAdminDto) {
    const locale = useLocale();
    const { sendTo } = useAdminNavigation();
    const { request } = row;

    // The calculated refund stays in view; the rest of the guidance is folded.
    const guidance = useMemo(() => {
        const { sections, decision } = splitWithdrawalGuidance(row.recommendation);
        const refund = sections.find((section) => section.key === 'refund') ?? null;
        const background = sections.filter((section) => section !== refund);
        return { refund, background: decision ? [...background, decision] : background };
    }, [row.recommendation]);

    const sendToAssignments = useCallback(() => sendTo('assignments', { eventId: request.eventId }), [request.eventId, sendTo]);
    const sendToPaidServices = useCallback(() => sendTo('paidServices', { eventId: request.eventId }), [request.eventId, sendTo]);

    return {
        held: request.status === 'HELD',
        amount: formatOptionalMoney(request.totalRefundMinor, request.currency, locale),
        submittedAt: formatAdminDateTime(locale, request.createdAt),
        decidedAt: request.decidedAt ? formatAdminDateTime(locale, request.decidedAt) : null,
        guidance,
        sendToAssignments,
        sendToPaidServices,
    };
}
