'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminModerationCasesPath } from '@/lib/adminModeration';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, isNotFoundError } from '@/lib/api/errors';
import type { Page } from '@/lib/api/pagination';
import type {
    ModerationCaseDetailDto,
    ModerationCaseStatus,
    ModerationCaseSummaryDto,
    ModerationDecisionDto,
    ModerationDecisionRequestDto,
    ReportTargetType,
} from '@/lib/api/types';

// Admin report center (moderation-admin-fe-integration.md).

export const adminModerationKeys = {
    all: ['admin', 'moderation'] as const,
    lists: ['admin', 'moderation', 'cases'] as const,
    cases: (status: ModerationCaseStatus, page: number) => ['admin', 'moderation', 'cases', status, page] as const,
    case: (targetType: ReportTargetType, targetId: string) => ['admin', 'moderation', 'case', targetType, targetId] as const,
};

type CaseTarget = { targetType: ReportTargetType; targetId: string };

// The refusals after which the case must be re-read before the admin tries again (§5).
const CASE_STALE_CODES = new Set<unknown>([
    ERROR_CODES.MODERATION_DECISION_INVALID,
    ERROR_CODES.MODERATION_CASE_CLOSED,
    ERROR_CODES.MODERATION_MEMBER_IS_HOST,
    ERROR_CODES.MODERATION_TARGET_PROTECTED,
]);

// 5106: someone else closed the case, so it has also left its tab.
function refreshAfterRefusal(queryClient: QueryClient, error: unknown, { targetType, targetId }: CaseTarget) {
    const code = getErrorCode(error);
    if (!CASE_STALE_CODES.has(code)) return;
    void queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) });
    if (code === ERROR_CODES.MODERATION_CASE_CLOSED) void queryClient.invalidateQueries({ queryKey: adminModerationKeys.lists });
}

export function useAdminModerationCases(status: ModerationCaseStatus, page: number) {
    return useQuery({
        queryKey: adminModerationKeys.cases(status, page),
        queryFn: () => api.get<Page<ModerationCaseSummaryDto>>(adminModerationCasesPath(status, page)),
        placeholderData: (previous) => previous,
    });
}

// Every fetch writes a CONTENT_VIEWED audit row, so it happens only when an admin opens the case:
// never prefetched, never refetched on focus/reconnect/remount, never retried. The deliberate
// re-reads are the invalidations after a decision or a refused one.
export function useAdminModerationCase(targetType: ReportTargetType, targetId: string) {
    return useQuery({
        queryKey: adminModerationKeys.case(targetType, targetId),
        queryFn: () => api.get<ModerationCaseDetailDto>(endpoints.adminModeration.case(targetType, targetId)),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });
}

// 204. Moves the case from OPEN to UNDER_REVIEW; the open case is not re-read for that.
export function useStartModerationReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ targetType, targetId }: CaseTarget) => api.post<void>(endpoints.adminModeration.review(targetType, targetId)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminModerationKeys.lists }),
        onError: (error, target) => refreshAfterRefusal(queryClient, error, target),
    });
}

export function useDecideModerationCase() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ targetType, targetId, request }: CaseTarget & { request: ModerationDecisionRequestDto }) =>
            api.post<ModerationDecisionDto>(endpoints.adminModeration.decision(targetType, targetId), request),
        onSuccess: (_decision, { targetType, targetId }) =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: adminModerationKeys.lists }),
                queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) }),
            ]),
        onError: (error, target) => refreshAfterRefusal(queryClient, error, target),
    });
}

// 204. A 404 means the ban is already lifted (or never existed): treated as done (§2.5).
export function useLiftEventBan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ banId }: CaseTarget & { banId: string }) => {
            try {
                await api.del<void>(endpoints.adminModeration.ban(banId));
            } catch (error) {
                if (!isNotFoundError(error)) throw error;
            }
        },
        onSuccess: (_result, { targetType, targetId }) => queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) }),
    });
}
