'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, InviartCollectionDto } from '@/lib/api/types';

// Which INVIART collection each occasion shows (/api/admin/inviart/collections).

export const adminInviartCollectionKeys = {
    all: ['admin', 'inviart', 'collections'] as const,
};

export function useAdminInviartCollections() {
    return useQuery({
        queryKey: adminInviartCollectionKeys.all,
        queryFn: () => api.get<InviartCollectionDto[]>(endpoints.admin.inviart.collections),
    });
}

// An empty handle clears the occasion's collection.
export function useSetInviartCollection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ eventType, collectionHandle }: { eventType: EventTypeConvention; collectionHandle: string }) =>
            api.put<InviartCollectionDto>(endpoints.admin.inviart.collection(eventType), { collectionHandle }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminInviartCollectionKeys.all });
        },
    });
}
