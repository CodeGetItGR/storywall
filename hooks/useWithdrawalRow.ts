'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { formatAdminDateTime, splitWithdrawalGuidance } from '@/lib/adminWithdrawals';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';

export function useWithdrawalRow(row: WithdrawalAdminDto) {
    const locale = useLocale();
    const { sendTo } = useAdminNavigation();
    const { request } = row;

    const guidance = useMemo(() => splitWithdrawalGuidance(row.recommendation), [row.recommendation]);

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
