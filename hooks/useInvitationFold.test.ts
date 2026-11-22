import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useInvitationFold } from '@/hooks/useInvitationFold';

describe('useInvitationFold', () => {
    it('starts closed and toggles', () => {
        const { result } = renderHook(() => useInvitationFold());
        expect(result.current.open).toBe(false);
        act(() => result.current.toggle());
        expect(result.current.open).toBe(true);
        act(() => result.current.toggle());
        expect(result.current.open).toBe(false);
    });
});
