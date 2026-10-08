import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLandingPricingCategory } from '@/hooks/useLandingPricingCategory';

describe('useLandingPricingCategory', () => {
    it('starts on the default and follows clicks', () => {
        const { result } = renderHook(() => useLandingPricingCategory(['a', 'b'], 'b'));
        expect(result.current.category).toBe('b');
        act(() => result.current.selectCategory({ currentTarget: { dataset: { category: 'a' } } } as never));
        expect(result.current.category).toBe('a');
    });

    it('ignores a click on an unknown tab', () => {
        const { result } = renderHook(() => useLandingPricingCategory(['a', 'b'], 'a'));
        act(() => result.current.selectCategory({ currentTarget: { dataset: { category: 'zzz' } } } as never));
        expect(result.current.category).toBe('a');
    });

    it('falls back to the first tab when the chosen one disappears', () => {
        const { result, rerender } = renderHook(({ ids }) => useLandingPricingCategory(ids, null), { initialProps: { ids: ['a', 'b'] } });
        act(() => result.current.selectCategory({ currentTarget: { dataset: { category: 'b' } } } as never));
        rerender({ ids: ['a'] });
        expect(result.current.category).toBe('a');
    });

    it('has no tab when there are none', () => {
        const { result } = renderHook(() => useLandingPricingCategory([], null));
        expect(result.current.category).toBeNull();
    });

    it('wraps with the arrow keys', () => {
        const { result } = renderHook(() => useLandingPricingCategory(['a', 'b', 'c'], 'a'));
        const keyDown = (key: string) =>
            act(() => result.current.handleCategoryKeyDown({ key, preventDefault() {}, currentTarget: { parentElement: null } } as never));
        keyDown('ArrowLeft');
        expect(result.current.category).toBe('c');
        keyDown('ArrowRight');
        expect(result.current.category).toBe('a');
        keyDown('End');
        expect(result.current.category).toBe('c');
        keyDown('Home');
        expect(result.current.category).toBe('a');
    });
});
