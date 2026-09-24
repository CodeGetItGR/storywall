import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDisclosure } from '@/hooks/useDisclosure';

describe('useDisclosure', () => {
    it('starts closed by default', () => {
        const { result } = renderHook(() => useDisclosure());
        expect(result.current.open).toBe(false);
    });

    it('starts open when asked', () => {
        const { result } = renderHook(() => useDisclosure(true));
        expect(result.current.open).toBe(true);
    });

    it('flips on each toggle', () => {
        const { result } = renderHook(() => useDisclosure());

        act(() => result.current.toggle());
        expect(result.current.open).toBe(true);

        act(() => result.current.toggle());
        expect(result.current.open).toBe(false);
    });
});
