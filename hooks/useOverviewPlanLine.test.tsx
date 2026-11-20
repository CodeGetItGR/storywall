import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOverviewPlanLine } from '@/hooks/useOverviewPlanLine';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const usage = { storageBytes: 1_200_000_000, storageLimitBytes: 10_000_000_000, storagePercent: 12, proStorageBytes: 0, proUsedBytes: 0 } as never;

describe('useOverviewPlanLine', () => {
    it('reads used of limit with the plan name', () => {
        const { result } = renderHook(() => useOverviewPlanLine('e1', 'Premium', usage));
        expect(result.current).toMatchObject({ planName: 'Premium', percent: 12, showPro: false });
        expect(result.current?.usage).toMatch(/^journey\.storage:/);
    });

    it('shows only the used amount when there is no limit', () => {
        const { result } = renderHook(() => useOverviewPlanLine('e1', 'Premium', { ...(usage as object), storageLimitBytes: null } as never));
        expect(result.current?.usage).not.toMatch(/journey\.storage/);
        expect(result.current?.percent).toBeNull();
    });

    it('is empty without usage', () => {
        expect(renderHook(() => useOverviewPlanLine('e1', 'Premium', null)).result.current).toBeNull();
    });
});
