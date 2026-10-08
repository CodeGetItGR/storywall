import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanCreateAssignments } from '@/hooks/usePlanCreateAssignments';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeModuleResponseDto, ModuleKey, PlatformModuleResponseDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

function moduleItem(moduleKey: ModuleKey, sortOrder: number): PlatformModuleResponseDto {
    return { id: moduleKey, moduleKey, name: moduleKey, description: null, isEnabled: true, sortOrder };
}

function matrixRow(moduleKey: ModuleKey, applicability: EventTypeModuleResponseDto['applicability']): EventTypeModuleResponseDto {
    return { eventTypeKey: 'WEDDING', moduleKey, applicability, defaultConfig: {}, sortOrder: 0, includedInPlan: null };
}

const MODULES = [moduleItem('posts', 0), moduleItem('theme', 1), moduleItem('rsvp', 2)];

function checkbox(value: string) {
    return { currentTarget: { value } } as unknown as ChangeEvent<HTMLInputElement>;
}

let client: QueryClient;

function render(initialEventTypeKey: 'WEDDING' | null) {
    return renderHook(() => usePlanCreateAssignments([], MODULES, initialEventTypeKey), {
        wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    api.get.mockReset();
});

describe('usePlanCreateAssignments', () => {
    it('does not offer a module the event type does not support', async () => {
        api.get.mockResolvedValue([matrixRow('posts', 'DEFAULT_ON'), matrixRow('theme', 'UNSUPPORTED'), matrixRow('rsvp', 'DEFAULT_ON')]);

        const { result } = render('WEDDING');

        await waitFor(() => expect(result.current.orderedModules.map((item) => item.moduleKey)).toEqual(['posts', 'rsvp']));
        expect(api.get).toHaveBeenCalledWith(endpoints.admin.eventTypes.modules('WEDDING'));
    });

    it('drops a module picked before the type turned out not to support it', async () => {
        let resolveMatrix: (rows: EventTypeModuleResponseDto[]) => void = () => {};
        api.get.mockReturnValue(new Promise((resolve) => (resolveMatrix = resolve)));

        const { result } = render('WEDDING');
        act(() => result.current.handleModuleChange(checkbox('theme')));
        act(() => result.current.handleModuleChange(checkbox('posts')));
        expect(result.current.moduleKeys).toEqual(['theme', 'posts']);

        act(() => resolveMatrix([matrixRow('theme', 'UNSUPPORTED')]));

        await waitFor(() => expect(result.current.moduleKeys).toEqual(['posts']));
    });

    it('offers every module before an event type is picked', () => {
        const { result } = render(null);

        expect(result.current.orderedModules.map((item) => item.moduleKey)).toEqual(['posts', 'theme', 'rsvp']);
        expect(api.get).not.toHaveBeenCalled();
    });
});
