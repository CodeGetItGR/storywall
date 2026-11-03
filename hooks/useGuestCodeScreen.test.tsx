import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGuestCodeScreen } from '@/hooks/useGuestCodeScreen';

describe('useGuestCodeScreen', () => {
    it('lets a Bundle guest open either action and come back to the choices', () => {
        const { result } = renderHook(() => useGuestCodeScreen(['UPLOAD', 'WISH']));
        expect(result.current.view).toBe('chooser');
        expect(result.current.canGoBack).toBe(false);

        act(() => result.current.open('wish'));
        expect(result.current.view).toBe('wish');
        expect(result.current.canGoBack).toBe(true);

        act(() => result.current.back());
        expect(result.current.view).toBe('chooser');
    });

    it('gives a one-action code no way back, since there is no chooser', () => {
        const { result } = renderHook(() => useGuestCodeScreen(['WISH']));
        expect(result.current.view).toBe('wish');
        expect(result.current.canGoBack).toBe(false);
    });
});
