'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { api, getRecentErrors } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isBetaFeedbackDisabledError } from '@/lib/api/errors';
import type { AppConfigResponseDto, BugReportCreatedDto } from '@/lib/api/types';
import { APP_VERSION, buildBugReportForm, buildBugReportRequest, readBrowserContext } from '@/lib/betaFeedback/bugReport';
import { currentPageUrl } from '@/lib/betaFeedback/routeTemplates';

type SubmitBugReportInput = {
    description: string;
    screenshot: File | null;
    eventId: string | null;
};

// POST /api/bug-reports. Never retried: every attempt counts against the
// tester's 5 an hour.
export function useSubmitBugReport() {
    const queryClient = useQueryClient();

    return useMutation({
        retry: false,
        mutationFn: ({ description, screenshot, eventId }: SubmitBugReportInput) => {
            const report = buildBugReportRequest({
                description,
                pageUrl: currentPageUrl(),
                eventId,
                appVersion: APP_VERSION,
                recentErrors: getRecentErrors(),
                ...readBrowserContext(),
            });
            return api.postForm<BugReportCreatedDto>(endpoints.betaFeedback.bugReports, buildBugReportForm(report, screenshot));
        },
        onError: (error) => {
            // Switched off since the config was read: hide everything quietly.
            if (!isBetaFeedbackDisabledError(error)) return;
            queryClient.setQueryData<AppConfigResponseDto>(appConfigKeys.all, (config) =>
                config ? { ...config, betaFeedback: { ...config.betaFeedback, enabled: false } } : config,
            );
        },
    });
}
