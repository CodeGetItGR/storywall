import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorScene } from '@/hooks/useVendorScene';

const LABELS: Record<string, Record<string, string>> = {
    en: { 'types.PHOTOGRAPHER': 'Photographer', 'types.PLANNER': 'Planner', 'types.MUSIC': 'Music', 'manage.sceneAlt': 'Vendors at an event: {types}' },
    el: { 'types.PHOTOGRAPHER': 'Φωτογράφος', 'types.PLANNER': 'Διοργάνωση', 'types.MUSIC': 'Μουσική', 'manage.sceneAlt': 'Επαγγελματίες σε μια εκδήλωση: {types}' },
};
const locale = vi.hoisted(() => ({ value: 'en' }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) =>
        (LABELS[locale.value][key] ?? key).replace('{types}', values?.types ?? ''),
    useLocale: () => locale.value,
}));
const event = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => event.value }));

const withTypes = (allowedTypes: string[], id = 'e1') => ({ id, modules: [{ moduleKey: 'vendors', configuration: { allowedTypes } }] });

beforeEach(() => {
    locale.value = 'en';
    event.value = withTypes(['MUSIC', 'OTHER', 'PLANNER', 'PHOTOGRAPHER']);
});

describe('useVendorScene', () => {
    it('draws only the allowed types, left to right, and never OTHER', () => {
        expect(renderHook(() => useVendorScene('e1')).result.current.types).toEqual(['PHOTOGRAPHER', 'PLANNER', 'MUSIC']);
    });

    it('names the drawn types in the alt text, lowercased and joined without a serial comma', () => {
        expect(renderHook(() => useVendorScene('e1')).result.current.alt).toBe('Vendors at an event: photographer, planner and music');
    });

    it('writes the alt text in Greek', () => {
        locale.value = 'el';
        expect(renderHook(() => useVendorScene('e1')).result.current.alt).toBe('Επαγγελματίες σε μια εκδήλωση: φωτογράφος, διοργάνωση και μουσική');
    });

    it('draws nothing for another event', () => {
        expect(renderHook(() => useVendorScene('e2')).result.current.types).toEqual([]);
    });
});
