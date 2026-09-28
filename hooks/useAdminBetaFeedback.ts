'use client';

import { useQuery } from '@tanstack/react-query';

import { adminBugReportsPath, adminErrorEventsPath } from '@/lib/adminBetaFeedback';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { BugReportResponseDto, ErrorEventResponseDto, ErrorEventSource } from '@/lib/api/types';

export const adminBetaFeedbackKeys = {
    bugReports: (page: number) => ['admin', 'bug-reports', 'list', page] as const,
    bugReport: (id: string) => ['admin', 'bug-reports', 'detail', id] as const,
    errorEvents: (page: number, source: ErrorEventSource | null, ref: string) => ['admin', 'error-events', 'list', page, source, ref] as const,
};

export function useAdminBugReports(page: number) {
    return useQuery({
        queryKey: adminBetaFeedbackKeys.bugReports(page),
        queryFn: () => api.get<Page<BugReportResponseDto>>(adminBugReportsPath(page)),
        placeholderData: (previous) => previous,
    });
}

// Fetched on open so the presigned screenshot URL is fresh.
export function useAdminBugReport(id: string) {
    return useQuery({
        queryKey: adminBetaFeedbackKeys.bugReport(id),
        queryFn: () => api.get<BugReportResponseDto>(endpoints.betaFeedback.bugReportById(id)),
        staleTime: 0,
    });
}

export function useAdminErrorEvents({ page, source, ref }: { page: number; source: ErrorEventSource | null; ref: string }) {
    return useQuery({
        queryKey: adminBetaFeedbackKeys.errorEvents(page, source, ref),
        queryFn: () => api.get<Page<ErrorEventResponseDto>>(adminErrorEventsPath({ page, source, ref })),
        placeholderData: (previous) => previous,
    });
}
