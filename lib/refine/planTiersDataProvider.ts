import type { BaseRecord, DataProvider } from '@refinedev/core';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlanScope, PlanTierResponseDto } from '@/lib/api/types';

type DataProviderParams = Parameters<DataProvider['getList']>[0];

// Mirrors paidServicesDataProvider.ts: the admin plan-tiers endpoint takes exactly
// two query params (scope, includeArchived), so getList picks those two filters
// off Refine's CrudFilters array and ignores the rest.
function queryPath(filters: DataProviderParams['filters']): string {
    const searchParams = new URLSearchParams();

    const scope = filters?.find((filter) => 'field' in filter && filter.field === 'scope')?.value as PlanScope | undefined;
    if (scope) searchParams.set('scope', scope);

    const includeArchived = filters?.find((filter) => 'field' in filter && filter.field === 'includeArchived')?.value as
        | boolean
        | undefined;
    if (includeArchived) searchParams.set('includeArchived', 'true');

    const query = searchParams.toString();
    return query ? `${endpoints.admin.planTiers.list}?${query}` : endpoints.admin.planTiers.list;
}

export const planTiersDataProvider: DataProvider = {
    getList: async <TData extends BaseRecord = BaseRecord>({ filters }: Parameters<DataProvider['getList']>[0]) => {
        const data = await api.get<PlanTierResponseDto[]>(queryPath(filters));
        return { data: data as unknown as TData[], total: data.length };
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['getOne']>[0]) => ({
        data: (await api.get<PlanTierResponseDto>(endpoints.admin.planTiers.byId(String(id)))) as unknown as TData,
    }),
    create: async <TData extends BaseRecord = BaseRecord>({ variables }: Parameters<DataProvider['create']>[0]) => ({
        data: (await api.post<PlanTierResponseDto>(endpoints.admin.planTiers.list, variables)) as unknown as TData,
    }),
    update: async <TData extends BaseRecord = BaseRecord>({ id, variables }: Parameters<DataProvider['update']>[0]) => ({
        data: (await api.patch<PlanTierResponseDto>(endpoints.admin.planTiers.byId(String(id)), variables)) as unknown as TData,
    }),
    deleteOne: async <TData extends BaseRecord = BaseRecord>({ id }: Parameters<DataProvider['deleteOne']>[0]) => {
        await api.del<void>(endpoints.admin.planTiers.byId(String(id)));
        return { data: { id } as unknown as TData };
    },
    // Only ever called for PUT /plan-tiers/{id}/modules — there is no generic REST
    // shape to dispatch on here, so this covers exactly the verbs the `api` client
    // exposes rather than modelling the full CustomParams method union.
    custom: async <TData extends BaseRecord = BaseRecord>({ url, method, payload }: Parameters<NonNullable<DataProvider['custom']>>[0]) => {
        switch (method) {
            case 'post':
                return { data: (await api.post<PlanTierResponseDto>(url, payload)) as unknown as TData };
            case 'patch':
                return { data: (await api.patch<PlanTierResponseDto>(url, payload)) as unknown as TData };
            case 'put':
                return { data: (await api.put<PlanTierResponseDto>(url, payload)) as unknown as TData };
            default:
                throw new Error(`planTiersDataProvider.custom: unsupported method "${method}"`);
        }
    },
    getApiUrl: () => process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
};
