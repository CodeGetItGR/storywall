'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isNotFoundError } from '@/lib/api/errors';
import type { VendorProfileDto, VendorProfileRequestDto } from '@/lib/api/types';

export const vendorProfileKeys = { mine: ['me', 'vendor-profile'] as const };

async function fetchVendorProfile(): Promise<VendorProfileDto | null> {
    try {
        return await api.get<VendorProfileDto>(endpoints.me.vendorProfile);
    } catch (error) {
        // 404 until the first save.
        if (isNotFoundError(error)) return null;
        throw error;
    }
}

// Every event's vendor list and "me" carry the profile (name, logo, profileComplete, the partner
// prompt), so a change refreshes them all. Matches the keys in vendorKeys: ['events', id, 'vendors', ...].
function isEventVendorKey(queryKey: readonly unknown[]): boolean {
    return queryKey[0] === 'events' && queryKey[2] === 'vendors';
}

// Guest accounts can't be vendors (they have no /api/me profile), so they never ask.
export function useVendorProfile(enabled = true) {
    const { user } = useAuth();
    const canHaveProfile = user?.role === 'USER' || user?.role === 'ADMIN';

    return useQuery({
        queryKey: vendorProfileKeys.mine,
        queryFn: fetchVendorProfile,
        enabled: enabled && canHaveProfile,
    });
}

function useProfileMutation<TInput>(mutationFn: (input: TInput) => Promise<VendorProfileDto>) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: (profile) => {
            queryClient.setQueryData(vendorProfileKeys.mine, profile);
            queryClient.invalidateQueries({ predicate: (query) => isEventVendorKey(query.queryKey) });
        },
    });
}

export function useSaveVendorProfile() {
    return useProfileMutation((input: VendorProfileRequestDto) => api.put<VendorProfileDto>(endpoints.me.vendorProfile, input));
}

// The backend answers 404 until the first save, so the sheet only offers the logo after (or with) a save.
export function useUploadVendorLogo() {
    return useProfileMutation((file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.postForm<VendorProfileDto>(endpoints.me.vendorProfileLogo, formData);
    });
}

export function useDeleteVendorLogo() {
    return useProfileMutation<void>(() => api.del<VendorProfileDto>(endpoints.me.vendorProfileLogo));
}

export function useDismissPartnerPrompt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.post<void>(endpoints.me.vendorProfileDismissPartnerPrompt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorProfileKeys.mine });
            queryClient.invalidateQueries({ predicate: (query) => isEventVendorKey(query.queryKey) });
        },
    });
}
