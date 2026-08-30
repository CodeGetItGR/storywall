import type { BaseRecord, DataProvider } from '@refinedev/core';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ReactionTypeResponseDto } from '@/lib/api/types';

type DataProviderParams = Parameters<DataProvider['getList']>[0];

function queryPath(filters: DataProviderParams['filters']): string {
    const searchParams = new URLSearchParams();
    const eventTypeKey = filters?.find((filter) => 'field' in filter && filter.field === 'eventTypeKey')?.value as string | undefined;
    const includeArchived = filters?.find((filter) => 'field' in filter && filter.field === 'includeArchived')?.value as boolean | undefined;

    if (eventTypeKey) searchParams.set('eventTypeKey', eventTypeKey);
    if (includeArchived) searchParams.set('includeArchived', 'true');

    const query = searchParams.toString();
    return query ? `${endpoints.admin.reactionTypes.list}?${query}` : endpoints.admin.reactionTypes.list;
}

export const reactionTypesDataProvider: DataProvider = {
    getList: async <TData extends BaseRecord = BaseRecord>({ filters }: Parameters<DataProvider['getList']>[0]) => {
        const data = await api.get<ReactionTypeResponseDto[]>(queryPath(filters));
        return { data: data as unknown as TData[], total: data.length };
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['getOne']>[0]) => ({
        data: (await api.get<ReactionTypeResponseDto>(endpoints.admin.reactionTypes.byId(String(id)))) as unknown as TData,
    }),
    create: async <TData extends BaseRecord = BaseRecord>({ variables }: Parameters<DataProvider['create']>[0]) => ({
        data: (await api.post<ReactionTypeResponseDto>(endpoints.admin.reactionTypes.list, variables)) as unknown as TData,
    }),
    update: async <TData extends BaseRecord = BaseRecord>({ id, variables }: Parameters<DataProvider['update']>[0]) => ({
        data: (await api.patch<ReactionTypeResponseDto>(endpoints.admin.reactionTypes.byId(String(id)), variables)) as unknown as TData,
    }),
    deleteOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['deleteOne']>[0]) => {
        await api.del<void>(endpoints.admin.reactionTypes.byId(String(id)));
        return { data: { id } as unknown as TData };
    },
    getApiUrl: () => process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
};
