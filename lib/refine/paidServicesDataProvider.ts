import type { BaseRecord, DataProvider } from '@refinedev/core';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PaidServiceKind, PaidServiceResponseDto } from '@/lib/api/types';

type DataProviderParams = Parameters<DataProvider['getList']>[0];

// This backend's admin list endpoint is a flat, unpaginated collection with
// exactly two query params (kind, includeArchived) — there is no generic
// filter/sort/pagination DSL to translate Refine's CrudFilters onto. getList
// picks the two filters it understands off the array and ignores the rest;
// pagination is always "off" from the caller's side (see useTable usage).
function queryPath(filters: DataProviderParams['filters']): string {
    const searchParams = new URLSearchParams();

    const kind = filters?.find((filter) => 'field' in filter && filter.field === 'kind')?.value as PaidServiceKind | undefined;
    if (kind) searchParams.set('kind', kind);

    const includeArchived = filters?.find((filter) => 'field' in filter && filter.field === 'includeArchived')?.value as
        | boolean
        | undefined;
    if (includeArchived) searchParams.set('includeArchived', 'true');

    const query = searchParams.toString();
    return query ? `${endpoints.admin.paidServices.list}?${query}` : endpoints.admin.paidServices.list;
}

// DataProvider's methods are individually generic over TData (the shape Refine's
// caller expects back), but this provider only ever talks to one concrete DTO —
// the cast below is the standard shape for a provider written against a single
// resource rather than a fully generic backend.
export const paidServicesDataProvider: DataProvider = {
    getList: async <TData extends BaseRecord = BaseRecord>({ filters }: Parameters<DataProvider['getList']>[0]) => {
        const data = await api.get<PaidServiceResponseDto[]>(queryPath(filters));
        return { data: data as unknown as TData[], total: data.length };
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['getOne']>[0]) => ({
        data: (await api.get<PaidServiceResponseDto>(endpoints.admin.paidServices.byId(String(id)))) as unknown as TData,
    }),
    create: async <TData extends BaseRecord = BaseRecord>({ variables }: Parameters<DataProvider['create']>[0]) => ({
        data: (await api.post<PaidServiceResponseDto>(endpoints.admin.paidServices.list, variables)) as unknown as TData,
    }),
    update: async <TData extends BaseRecord = BaseRecord>({ id, variables }: Parameters<DataProvider['update']>[0]) => ({
        data: (await api.patch<PaidServiceResponseDto>(endpoints.admin.paidServices.byId(String(id)), variables)) as unknown as TData,
    }),
    deleteOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['deleteOne']>[0]) => {
        await api.del<void>(endpoints.admin.paidServices.byId(String(id)));
        // The backend returns no body on delete; only `id` is ever read off this.
        return { data: { id } as unknown as TData };
    },
    getApiUrl: () => process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
};
