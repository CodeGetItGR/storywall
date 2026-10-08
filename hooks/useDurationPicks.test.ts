import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDurationPicks } from '@/hooks/useDurationPicks';

describe('useDurationPicks', () => {
    it('starts on the given picks, then follows picks and resets', () => {
        const { result } = renderHook(() => useDurationPicks({ START: 'o6' }));
        expect(result.current.picks).toEqual({ START: 'o6' });

        act(() => result.current.pickDuration('STORY', 'o3'));
        expect(result.current.picks).toEqual({ START: 'o6', STORY: 'o3' });

        act(() => result.current.resetPicks());
        expect(result.current.picks).toEqual({});
    });
});
