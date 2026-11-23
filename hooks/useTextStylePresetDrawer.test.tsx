import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EMPTY_PRESET, useTextStylePresetDrawer } from '@/hooks/useTextStylePresetDrawer';

describe('useTextStylePresetDrawer', () => {
    it('starts a new preset empty and an existing one with its values', () => {
        expect(renderHook(() => useTextStylePresetDrawer(null)).result.current.draft).toEqual(EMPTY_PRESET);
        const preset = { id: 'p', sortOrder: 3, ...EMPTY_PRESET, nameEn: 'Title', size: 40 };
        expect(renderHook(() => useTextStylePresetDrawer(preset)).result.current.draft.size).toBe(40);
    });

    it('is valid only with both names, a font, and numbers in range', () => {
        const { result } = renderHook(() => useTextStylePresetDrawer(null));
        expect(result.current.valid).toBe(false);
        act(() => result.current.set({ nameEn: 'Title', nameEl: 'Τίτλος', font: 'serif', size: 40 }));
        expect(result.current.valid).toBe(true);
        act(() => result.current.set({ letterSpacing: 51 }));
        expect(result.current.valid).toBe(false);
    });

    it('sends every field but the id and the order', () => {
        const preset = { id: 'p', sortOrder: 3, ...EMPTY_PRESET, nameEn: 'Title', nameEl: 'Τίτλος', font: 'serif' };
        const { result } = renderHook(() => useTextStylePresetDrawer(preset));
        expect(result.current.body).toEqual({ ...EMPTY_PRESET, nameEn: 'Title', nameEl: 'Τίτλος', font: 'serif' });
    });
});
