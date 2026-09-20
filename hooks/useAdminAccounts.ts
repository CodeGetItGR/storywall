import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminAccountsPath } from '@/lib/adminAccountProvisioning';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { AdminProvisionEventRequestDto, EventResponseDto, ProvisionedUserRequestDto, UserRequestDto, UserResponseDto } from '@/lib/api/types';

export const adminAccountKeys = {
    all: ['admin', 'accounts'] as const,
    list: (page: number, size: number, query: string, email: string) => ['admin', 'accounts', 'list', page, size, query, email] as const,
};

export function useAdminAccounts({
    page,
    size,
    query = '',
    email = '',
    enabled = true,
}: {
    page: number;
    size: number;
    query?: string;
    email?: string;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: adminAccountKeys.list(page, size, query, email),
        queryFn: () => api.get<Page<UserResponseDto>>(adminAccountsPath({ page, size, query, email })),
        enabled,
        placeholderData: (previous) => previous,
    });
}

export function useCreateProvisionedAccountMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: ProvisionedUserRequestDto) => api.post<UserResponseDto>(endpoints.users.provisioned, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminAccountKeys.all }),
    });
}

export function useUpdateAdminAccountMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UserRequestDto }) => api.patch<UserResponseDto>(endpoints.users.byId(id), input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminAccountKeys.all }),
    });
}

export function useProvisionAdminEventMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: AdminProvisionEventRequestDto) => api.post<EventResponseDto>(endpoints.admin.events.provision, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
        },
    });
}
