import type { BaseRecord, DataProvider } from '@refinedev/core';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

// Event type keys are a fixed, seeded set: the admin API only exposes list
// and per-key patch, never create/delete. Those two methods are still part of
// the DataProvider interface, so they're implemented but never invoked from
// the UI (no "New event type" affordance exists on this resource).
export const platformEventTypesDataProvider: DataProvider = {
    getList: async <TData extends BaseRecord = BaseRecord>() => {
        const data = await api.get<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list);
        return { data: data as unknown as TData[], total: data.length };
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['getOne']>[0]) => ({
        data: (await api.get<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list)).find(
            (eventType) => eventType.eventTypeKey === String(id)
        ) as unknown as TData,
    }),
    create: async () => {
        throw new Error('platform-event-types does not support create');
    },
    update: async <TData extends BaseRecord = BaseRecord>({ id, variables }: Parameters<DataProvider['update']>[0]) => ({
        data: (await api.patch<PlatformEventTypeResponseDto>(
            endpoints.admin.platformEventTypes.byKey(String(id)),
            variables
        )) as unknown as TData,
    }),
    deleteOne: async () => {
        throw new Error('platform-event-types does not support delete');
    },
    getApiUrl: () => process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
};
