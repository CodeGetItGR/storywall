import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorCapabilities } from '@/hooks/useVendorCapabilities';

const LABELS: Record<string, string> = {
    'types.PLANNER': 'Planner',
    'types.VENUE': 'Venue',
    'types.DECORATION': 'Decoration',
    'types.CATERING': 'Catering',
    'types.MUSIC': 'Music',
    'manage.can.others': 'other vendors',
};
const locale = vi.hoisted(() => ({ value: 'en' }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => LABELS[key] ?? key,
    useLocale: () => locale.value,
}));
const event = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => event.value }));

const withTypes = (allowedTypes: string[], id = 'e1') => ({ id, modules: [{ moduleKey: 'vendors', configuration: { allowedTypes } }] });

beforeEach(() => {
    locale.value = 'en';
    event.value = withTypes(['PLANNER', 'VENUE', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER']);
});

describe('useVendorCapabilities', () => {
    it('gives each tool type its own line and joins the rest without a serial comma', () => {
        const { result } = renderHook(() => useVendorCapabilities('e1'));
        expect(result.current).toEqual([
            { key: 'PLANNER', type: 'PLANNER', title: 'Planner', body: 'manage.can.PLANNER' },
            { key: 'MUSIC', type: 'MUSIC', title: 'Music', body: 'manage.can.MUSIC' },
            { key: 'listed', type: 'VENUE', title: 'Venue, Decoration, Catering and other vendors', body: 'manage.can.listed' },
        ]);
    });

    it('joins the names the Greek way', () => {
        locale.value = 'el';
        event.value = withTypes(['VENUE', 'CATERING']);
        const { result } = renderHook(() => useVendorCapabilities('e1'));
        expect(result.current[0].title).toBe('Venue και Catering');
    });

    it('lists nothing for another event or without allowed types', () => {
        expect(renderHook(() => useVendorCapabilities('e2')).result.current).toEqual([]);
        event.value = withTypes([]);
        expect(renderHook(() => useVendorCapabilities('e1')).result.current).toEqual([]);
    });
});
