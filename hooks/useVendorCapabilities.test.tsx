import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorCapabilities } from '@/hooks/useVendorCapabilities';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const event = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => event.value }));

const withTypes = (allowedTypes: string[], id = 'e1') => ({ id, modules: [{ moduleKey: 'vendors', configuration: { allowedTypes } }] });

beforeEach(() => {
    event.value = withTypes(['PLANNER', 'VENUE', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER']);
});

describe('useVendorCapabilities', () => {
    it('gives every allowed type its own row in picture order, other vendors last and capitalised', () => {
        const { result } = renderHook(() => useVendorCapabilities('e1'));
        expect(result.current).toEqual([
            { type: 'VENUE', title: 'types.VENUE', body: 'manage.can.VENUE' },
            { type: 'DECORATION', title: 'types.DECORATION', body: 'manage.can.DECORATION' },
            { type: 'PLANNER', title: 'types.PLANNER', body: 'manage.can.PLANNER' },
            { type: 'CATERING', title: 'types.CATERING', body: 'manage.can.CATERING' },
            { type: 'MUSIC', title: 'types.MUSIC', body: 'manage.can.MUSIC' },
            { type: 'OTHER', title: 'Manage.can.others', body: 'manage.can.listed' },
        ]);
    });

    it('lists nothing for another event or without allowed types', () => {
        expect(renderHook(() => useVendorCapabilities('e2')).result.current).toEqual([]);
        event.value = withTypes([]);
        expect(renderHook(() => useVendorCapabilities('e1')).result.current).toEqual([]);
    });
});
