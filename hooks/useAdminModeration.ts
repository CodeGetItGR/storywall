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
    // Another case suspended the StoryWall first: allowedActions.suspendEvent is now false.
    ERROR_CODES.EVENT_ALREADY_SUSPENDED,
    // The custom role text changed since the case was read (member roles §6.2).
    ERROR_CODES.MEMBER_ROLE_TEXT_CHANGED,
]);

// 5106: someone else closed the case, so it has also left its tab.
function refreshAfterRefusal(queryClient: QueryClient, error: unknown, { targetType, targetId }: CaseTarget) {
    const code = getErrorCode(error);
    if (!CASE_STALE_CODES.has(code)) return;
    void queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) });
    if (code === ERROR_CODES.MODERATION_CASE_CLOSED) void queryClient.invalidateQueries({ queryKey: adminModerationKeys.lists });
}

export function useAdminModerationCases(status: ModerationCaseStatus, page: number, enabled = true) {
    return useQuery({
        enabled,
        queryKey: adminModerationKeys.cases(status, page),
        queryFn: () => api.get<Page<ModerationCaseSummaryDto>>(adminModerationCasesPath(status, page)),
        // Keep the previous page while paging, but never show one tab's rows under another (key[3] is the status).
        placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === status ? previous : undefined),
    });
}

// Every fetch writes a CONTENT_VIEWED audit row, so it happens only when an admin opens the case:
// never prefetched, never refetched on focus/reconnect while open, never retried. gcTime 0 drops it
// when the drawer closes, so each opening is exactly one fetch and one logged view (guide §1).
export function useAdminModerationCase(targetType: ReportTargetType, targetId: string) {
    return useQuery({
        queryKey: adminModerationKeys.case(targetType, targetId),
        queryFn: () => api.get<ModerationCaseDetailDto>(endpoints.adminModeration.case(targetType, targetId)),
        staleTime: Infinity,
        gcTime: 0,
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
        // The case is only marked stale, not re-read: the drawer closes on success, and a re-read
        // would log a CONTENT_VIEWED nobody sees. A consumer that keeps the drawer open after
        // deciding must refetch the case on purpose.
        onSuccess: (_decision, { targetType, targetId }) =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: adminModerationKeys.lists }),
                queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId), refetchType: 'none' }),
                // A decision records its outcome on the notice the case came from, so the Notices lists are stale.
                // Only the lists: the notice detail and the picker are audited reads and must not refetch. The key is
                // inlined (it is adminNoticeKeys.lists) because useAdminNotices imports this file.
                queryClient.invalidateQueries({ queryKey: ['admin', 'moderation', 'notices'] }),
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

// 204. 5111 means it was already lifted (by another admin): treated as done. 5112 means another admin
// closed it: shown as a refusal, and the case is re-read so the drawer shows the closed state. Re-reads
// only the case, like useLiftEventBan.
export function useLiftEventSuspension() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ eventId }: CaseTarget & { eventId: string }) => {
            try {
                await api.del<void>(endpoints.adminModeration.eventSuspension(eventId));
            } catch (error) {
                if (getErrorCode(error) !== ERROR_CODES.EVENT_NOT_SUSPENDED) throw error;
            }
        },
        onSuccess: (_result, { targetType, targetId }) => queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) }),
        onError: (error, { targetType, targetId }) => {
            if (getErrorCode(error) === ERROR_CODES.EVENT_ALREADY_CLOSED) {
                void queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) });
            }
        },
    });
}

// 204, no body. 5112 means another admin closed it first: treated as done. 5111 (lifted meanwhile) is
// shown as a refusal, and the case is re-read so the drawer shows it is no longer suspended.
export function useCloseEventSuspension() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ eventId }: CaseTarget & { eventId: string }) => {
            try {
                await api.post<void>(endpoints.adminModeration.closeEventSuspension(eventId));
            } catch (error) {
                if (getErrorCode(error) !== ERROR_CODES.EVENT_ALREADY_CLOSED) throw error;
            }
        },
        onSuccess: (_result, { targetType, targetId }) => queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) }),
        onError: (error, { targetType, targetId }) => {
            if (getErrorCode(error) === ERROR_CODES.EVENT_NOT_SUSPENDED) {
                void queryClient.invalidateQueries({ queryKey: adminModerationKeys.case(targetType, targetId) });
            }
        },
    });
}
