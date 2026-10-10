'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { upsertCollaborator } from '@/hooks/useAdmin';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isNotFoundError } from '@/lib/api/errors';
import type {
    CollaboratorBrandingRequestDto,
    CollaboratorResponseDto,
    EventPartnerBrandingRequestDto,
    EventPartnerBrandingResponseDto,
    PartnerBrandingReportDto,
} from '@/lib/api/types';

export type PartnerBrandingImageKind = 'logo' | 'cover';

export const partnerBrandingAdminKeys = {
    eventLink: (eventId: string) => ['admin', 'events', eventId, 'partner-branding'] as const,
    report: (from: string | null, to: string | null) => ['admin', 'partner-branding', 'report', from, to] as const,
};

export function useSaveCollaboratorBranding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: CollaboratorBrandingRequestDto }) =>
            api.put<CollaboratorResponseDto>(endpoints.admin.collaborators.branding(id), input),
        onSuccess: (saved) => upsertCollaborator(queryClient, saved),
    });
}

export function useUploadCollaboratorBrandingImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, kind, file }: { id: string; kind: PartnerBrandingImageKind; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<CollaboratorResponseDto>(endpoints.admin.collaborators.brandingImage(id, kind), formData);
        },
        onSuccess: (saved) => upsertCollaborator(queryClient, saved),
    });
}

export function useRemoveCollaboratorBrandingImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, kind }: { id: string; kind: PartnerBrandingImageKind }) =>
            api.del<CollaboratorResponseDto>(endpoints.admin.collaborators.brandingImage(id, kind)),
        onSuccess: (saved) => upsertCollaborator(queryClient, saved),
    });
}

export function useSetCollaboratorBrandingEnabled() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
            api.post<CollaboratorResponseDto>(
                enabled ? endpoints.admin.collaborators.brandingEnable(id) : endpoints.admin.collaborators.brandingDisable(id),
            ),
        onSuccess: (saved) => upsertCollaborator(queryClient, saved),
    });
}

/** An event's partner link; null when it has none (404). */
export function useAdminEventPartnerBranding(eventId: string | null) {
    return useQuery({
        queryKey: partnerBrandingAdminKeys.eventLink(eventId ?? ''),
        queryFn: async () => {
            try {
                return await api.get<EventPartnerBrandingResponseDto>(endpoints.admin.events.partnerBranding(eventId!));
            } catch (error) {
                if (isNotFoundError(error)) return null;
                throw error;
            }
        },
        enabled: Boolean(eventId),
        retry: false,
    });
}

export function useLinkEventPartnerBranding(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventPartnerBrandingRequestDto) =>
            api.put<EventPartnerBrandingResponseDto>(endpoints.admin.events.partnerBranding(eventId), input),
        onSuccess: (link) => queryClient.setQueryData(partnerBrandingAdminKeys.eventLink(eventId), link),
    });
}

export function useUnlinkEventPartnerBranding(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.del<void>(endpoints.admin.events.partnerBranding(eventId)),
        onSuccess: () => queryClient.setQueryData(partnerBrandingAdminKeys.eventLink(eventId), null),
    });
}

/** Clicks per card design; the server defaults to the last 30 days. */
export function usePartnerBrandingReport({ from, to }: { from: string | null; to: string | null }) {
    return useQuery({
        queryKey: partnerBrandingAdminKeys.report(from, to),
        queryFn: () => api.get<PartnerBrandingReportDto>(endpoints.admin.partnerBrandingReport({ from: from ?? undefined, to: to ?? undefined })),
        placeholderData: keepPreviousData,
    });
}
