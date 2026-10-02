'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminModerationKeys } from '@/hooks/useAdminModeration';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { Page } from '@/lib/api/pagination';
import type {
    ContentNoticeDetailDto,
    ContentNoticeSummaryDto,
    NoticeCloseReason,
    NoticeEventCandidateDto,
    NoticeItemCandidateDto,
    NoticeListView,
    ReportTargetType,
} from '@/lib/api/types';

// Admin Notices tab (content-notices-fe-integration.md §2).

export const NOTICE_PAGE_SIZE = 50;
export const NOTICE_EVENTS_PAGE_SIZE = 20;
export const NOTICE_ITEMS_PAGE_SIZE = 30;
// Backend caps (§2.3): longer values are a 400.
const MAX_QUERY_LENGTH = 200;
const MAX_HOST_EMAIL_LENGTH = 320;

export interface NoticeEventFilters {
    q: string;
    hostEmail: string;
    date: string; // yyyy-MM-dd
}

export const adminNoticeKeys = {
    lists: ['admin', 'moderation', 'notices'] as const,
    list: (view: NoticeListView, page: number) => ['admin', 'moderation', 'notices', view, page] as const,
    // Detail and browse keys are separate trees, so refreshing a notice never refetches (and re-audits) the picker.
    notice: (id: string) => ['admin', 'moderation', 'notice', id] as const,
    browse: (id: string) => ['admin', 'moderation', 'notice-browse', id] as const,
    events: (id: string, filters: NoticeEventFilters, page: number) => ['admin', 'moderation', 'notice-browse', id, 'events', filters, page] as const,
    items: (id: string, eventId: string, type: ReportTargetType, page: number) =>
        ['admin', 'moderation', 'notice-browse', id, 'items', eventId, type, page] as const,
};

function search(params: Record<string, string | number>) {
    return new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
}

function normalizeFilters(filters: NoticeEventFilters): NoticeEventFilters {
    return {
        q: filters.q.trim().slice(0, MAX_QUERY_LENGTH),
        hostEmail: filters.hostEmail.trim().slice(0, MAX_HOST_EMAIL_LENGTH),
        date: filters.date,
    };
}

// 5109: another admin handled the notice. It has left the NEW list, and the detail is re-read once on
// purpose (a new NOTICE_VIEWED is correct: the admin is looking at it again, §2.7).
function refreshAfterRefusal(queryClient: QueryClient, error: unknown, id: string) {
    if (getErrorCode(error) !== ERROR_CODES.NOTICE_ALREADY_HANDLED) return;
    void queryClient.invalidateQueries({ queryKey: adminNoticeKeys.lists });
    void queryClient.invalidateQueries({ queryKey: adminNoticeKeys.notice(id) });
    queryClient.removeQueries({ queryKey: adminNoticeKeys.browse(id) });
}

export function useAdminNotices(view: NoticeListView, page: number) {
    return useQuery({
        queryKey: adminNoticeKeys.list(view, page),
        queryFn: () =>
            api.get<Page<ContentNoticeSummaryDto>>(`${endpoints.adminModeration.notices}?${search({ status: view, page, size: NOTICE_PAGE_SIZE })}`),
        // Keep the previous page while paging, but never show one view's rows under another (key[3] is the view).
        placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === view ? previous : undefined),
    });
}

// Every fetch writes a NOTICE_VIEWED audit row: one fetch per opening, never on focus/reconnect, never retried.
// gcTime 0 drops it when the drawer closes, so each opening is exactly one fetch and one logged view (§2.2).
export function useAdminNotice(id: string) {
    return useQuery({
        queryKey: adminNoticeKeys.notice(id),
        queryFn: () => api.get<ContentNoticeDetailDto>(endpoints.adminModeration.notice(id)),
        staleTime: Infinity,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });
}

// Writes no audit row. With no filter the backend returns an empty page, so nothing is sent.
export function useNoticeEventSearch(id: string, filters: NoticeEventFilters, page = 0) {
    const queryClient = useQueryClient();
    const normalized = normalizeFilters(filters);
    return useQuery({
        queryKey: adminNoticeKeys.events(id, normalized, page),
        queryFn: async () => {
            const params: Record<string, string | number> = { page, size: NOTICE_EVENTS_PAGE_SIZE };
            if (normalized.q) params.q = normalized.q;
            if (normalized.hostEmail) params.hostEmail = normalized.hostEmail;
            if (normalized.date) params.date = normalized.date;
            try {
                return await api.get<Page<NoticeEventCandidateDto>>(`${endpoints.adminModeration.noticeEvents(id)}?${search(params)}`);
            } catch (error) {
                refreshAfterRefusal(queryClient, error, id);
                throw error;
            }
        },
        enabled: Boolean(normalized.q || normalized.hostEmail || normalized.date),
        placeholderData: (previous) => previous,
        retry: false,
    });
}

// Page 0 of each call writes an EVENT_BROWSED row (§2.4): fetch only the type the admin picked, never
// prefetch the others, never refetch on focus. The gcTime keeps page 0 while the admin pages on and
// back, so returning to it is not a second logged browse; the picker's cache is dropped on attach,
// close or 5109.
export function useNoticeItems(id: string, eventId: string, type: ReportTargetType, page: number, enabled = true) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: adminNoticeKeys.items(id, eventId, type, page),
        queryFn: async () => {
            try {
                return await api.get<Page<NoticeItemCandidateDto>>(
                    `${endpoints.adminModeration.noticeItems(id, eventId)}?${search({ type, page, size: NOTICE_ITEMS_PAGE_SIZE })}`,
                );
            } catch (error) {
                refreshAfterRefusal(queryClient, error, id);
                throw error;
            }
        },
        enabled,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });
}

interface AttachNoticeVariables {
    id: string;
    eventId: string;
    targetType: ReportTargetType;
    targetId: string;
}

// The response is the updated detail: written into the cache rather than re-read (a re-read would log
// another NOTICE_VIEWED). The new report shows up in the moderation cases queue.
export function useAttachNotice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, eventId, targetType, targetId }: AttachNoticeVariables) =>
            api.post<ContentNoticeDetailDto>(endpoints.adminModeration.noticeAttach(id), { eventId, targetType, targetId }),
        onSuccess: (detail, { id }) => {
            queryClient.setQueryData(adminNoticeKeys.notice(id), detail);
            queryClient.removeQueries({ queryKey: adminNoticeKeys.browse(id) });
            return Promise.all([
                queryClient.invalidateQueries({ queryKey: adminNoticeKeys.lists }),
                queryClient.invalidateQueries({ queryKey: adminModerationKeys.lists }),
            ]);
        },
        onError: (error, { id }) => refreshAfterRefusal(queryClient, error, id),
    });
}

export function useCloseNotice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason, note }: { id: string; reason: NoticeCloseReason; note: string | null }) =>
            api.post<ContentNoticeDetailDto>(endpoints.adminModeration.noticeClose(id), { reason, note }),
        onSuccess: (detail, { id }) => {
            queryClient.setQueryData(adminNoticeKeys.notice(id), detail);
            queryClient.removeQueries({ queryKey: adminNoticeKeys.browse(id) });
            return queryClient.invalidateQueries({ queryKey: adminNoticeKeys.lists });
        },
        onError: (error, { id }) => refreshAfterRefusal(queryClient, error, id),
    });
}
