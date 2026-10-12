'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { AdminEmailPreviewDto, AdminEmailRequestDto, AdminEmailTemplateDto, AdminWelcomePreviewRequestDto } from '@/lib/api/types';

export const adminEmailKeys = {
    templates: (userId: string) => ['admin', 'emails', 'templates', userId] as const,
    preview: (userId: string, request: AdminEmailRequestDto | null) => ['admin', 'emails', 'preview', userId, request] as const,
    welcomePreview: (request: AdminWelcomePreviewRequestDto | null) => ['admin', 'emails', 'welcome-preview', request] as const,
};

export function useAdminEmailTemplates(userId: string) {
    return useQuery({
        queryKey: adminEmailKeys.templates(userId),
        queryFn: () => api.get<AdminEmailTemplateDto[]>(endpoints.admin.users.emails.templates(userId)),
    });
}

// A render, not a write: POST only because the body is too rich for a query string.
export function useAdminEmailPreview(userId: string, request: AdminEmailRequestDto | null) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: adminEmailKeys.preview(userId, request),
        queryFn: () => api.post<AdminEmailPreviewDto>(endpoints.admin.users.emails.preview(userId), request),
        enabled: request !== null,
        placeholderData: keepPreviousData,
        retry: false,
    });
    // The template stopped being available: re-read the templates so the picker shows why.
    const isTemplateUnavailable = getErrorCode(query.error) === ERROR_CODES.EMAIL_TEMPLATE_UNAVAILABLE;
    useEffect(() => {
        if (isTemplateUnavailable) void queryClient.invalidateQueries({ queryKey: adminEmailKeys.templates(userId) });
    }, [isTemplateUnavailable, queryClient, userId]);
    return query;
}

export function useWelcomeEmailPreview(request: AdminWelcomePreviewRequestDto | null) {
    return useQuery({
        queryKey: adminEmailKeys.welcomePreview(request),
        queryFn: () => api.post<AdminEmailPreviewDto>(endpoints.admin.events.welcomePreview, request),
        enabled: request !== null,
        placeholderData: keepPreviousData,
        retry: false,
    });
}

// A 409 carries no reason: re-read the templates so the picker shows why it's unavailable now.
export function useSendAdminEmailMutation(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: AdminEmailRequestDto) => api.post<void>(endpoints.admin.users.emails.send(userId), request),
        onError: () => queryClient.invalidateQueries({ queryKey: adminEmailKeys.templates(userId) }),
    });
}
