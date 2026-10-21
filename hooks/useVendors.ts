'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PartnerRole, VendorCapability, VendorLinkDto, VendorMeDto, VendorRowDto } from '@/lib/api/types';
import { hasVendorCapability } from '@/lib/vendors';

export const vendorKeys = {
    links: (eventId: string) => ['events', eventId, 'vendors', 'links'] as const,
    list: (eventId: string) => ['events', eventId, 'vendors', 'list'] as const,
    me: (eventId: string) => ['events', eventId, 'vendors', 'me'] as const,
};

// A host sends hiddenByHost, a vendor sends optedOut: exactly one per request.
export type VendorPatch = { hiddenByHost: boolean; optedOut?: never } | { optedOut: boolean; hiddenByHost?: never };

// GET …/vendors/me. Null when the caller is not a vendor of the event (404).
export async function fetchMyVendorRole(eventId: string): Promise<VendorMeDto | null> {
    try {
        return await api.get<VendorMeDto>(endpoints.events.vendorMe(eventId));
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}

// No module gate: the backend answers with toolsOff MODULE_OFF while the module is off, and the screens need that.
export function useMyVendorRole(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: vendorKeys.me(eventId ?? ''),
        queryFn: () => fetchMyVendorRole(eventId!),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// Whether the caller may use one vendor tool. Hosts are checked by the caller, not here.
export function useHasVendorCapability(eventId: string | null, capability: VendorCapability) {
    const role = useMyVendorRole(eventId);
    return { allowed: hasVendorCapability(role.data, capability), isLoading: role.isLoading };
}

// Host only.
export function useVendorLinks(eventId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();
    const vendorsReadable = useModuleReadable(eventId, 'vendors');

    return useQuery({
        queryKey: vendorKeys.links(eventId ?? ''),
        queryFn: () => api.get<VendorLinkDto[]>(endpoints.events.vendorLinks(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated && vendorsReadable,
    });
}

// Any member: listed vendors; a host also gets hidden rows with their flags.
export function useEventVendors(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const vendorsReadable = useModuleReadable(eventId, 'vendors');

    return useQuery({
        queryKey: vendorKeys.list(eventId ?? ''),
        queryFn: () => api.get<VendorRowDto[]>(endpoints.events.vendors(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && vendorsReadable,
    });
}

export function useResetVendorLink(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vendorType: PartnerRole) => api.post<VendorLinkDto>(endpoints.events.vendorLinkReset(eventId, vendorType)),
        onSuccess: (link) => {
            // The reset returns the new link: show it at once, then confirm with a refetch.
            queryClient.setQueryData<VendorLinkDto[]>(vendorKeys.links(eventId), (links) =>
                links?.map((existing) => (existing.vendorType === link.vendorType ? link : existing)),
            );
            return queryClient.invalidateQueries({ queryKey: vendorKeys.links(eventId) });
        },
    });
}

export function usePatchVendor(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ vendorId, patch }: { vendorId: string; patch: VendorPatch }) =>
            api.patch<VendorRowDto>(endpoints.events.vendorById(eventId, vendorId), patch),
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: vendorKeys.list(eventId) }),
                queryClient.invalidateQueries({ queryKey: vendorKeys.me(eventId) }),
            ]),
    });
}

export function useRemoveVendor(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vendorId: string) => api.del<void>(endpoints.events.vendorById(eventId, vendorId)),
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: vendorKeys.list(eventId) }),
                queryClient.invalidateQueries({ queryKey: vendorKeys.me(eventId) }),
                // The membership goes too.
                queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(eventId) }),
            ]),
    });
}

// Counting only: a failed click (a 429 included) must never reach the user or block the link.
export function useRecordVendorClick(eventId: string) {
    return useCallback(
        (vendorId: string) => {
            api.post<void>(endpoints.events.vendorClicks(eventId, vendorId)).catch(() => undefined);
        },
        [eventId],
    );
}
