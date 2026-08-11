import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { QrLinkPatchDto, QrLinkRequestDto, QrLinkResolutionDto, QrLinkResponseDto } from '@/lib/api/types';

export const qrLinkKeys = {
    list: (eventId: string) => ['events', eventId, 'qr-links'] as const,
    detail: (id: string) => ['qr-links', id] as const,
    resolution: (token: string) => ['qr-links', token, 'resolution'] as const,
};

export function useQrLinkResolution(token: string | null) {
    return useQuery({
        queryKey: qrLinkKeys.resolution(token ?? ''),
        queryFn: () => api.publicGet<QrLinkResolutionDto>(endpoints.qrLinks.resolve(token!)),
        enabled: Boolean(token),
        retry: false,
    });
}

export function useEventQrLinks(eventId: string | null) {
    return useQuery({
        queryKey: qrLinkKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId),
    });
}

export function useCreateQrLink(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: QrLinkRequestDto) => api.post<QrLinkResponseDto>(endpoints.events.qrLinks(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qrLinkKeys.list(eventId) });
        },
    });
}

export function useUpdateQrLink(eventId: string, id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: QrLinkPatchDto) => api.patch<QrLinkResponseDto>(endpoints.qrLinks.byId(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qrLinkKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: qrLinkKeys.list(eventId) });
        },
    });
}

export function useRevokeQrLink(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.post<QrLinkResponseDto>(endpoints.qrLinks.revoke(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qrLinkKeys.list(eventId) });
        },
    });
}
