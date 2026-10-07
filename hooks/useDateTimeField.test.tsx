import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useDateTimeField } from './useDateTimeField';

function change(value: string) {
    return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

describe('useDateTimeField', () => {
    it('changes the time without moving the day', () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useDateTimeField({ value: '2026-10-08T00:30', onChange }));

        act(() => result.current.handleTimeChange(change('23:30')));

        expect(onChange).toHaveBeenCalledWith('2026-10-08T23:30');
    });

    it('reports an empty value until both parts are set', () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useDateTimeField({ value: '', onChange }));

        act(() => result.current.handleDateChange(change('2026-10-08')));
        expect(onChange).toHaveBeenLastCalledWith('');
        expect(result.current.date).toBe('2026-10-08');

        act(() => result.current.handleTimeChange(change('18:00')));
        expect(onChange).toHaveBeenLastCalledWith('2026-10-08T18:00');
    });

    it('bounds the time only on the bounding day', () => {
        const { result, rerender } = renderHook(({ value }) => useDateTimeField({ value, min: '2026-10-08T14:00' }), {
            initialProps: { value: '2026-10-08T15:00' },
        });
        expect(result.current.dateMin).toBe('2026-10-08');
        expect(result.current.timeMin).toBe('14:00');

        rerender({ value: '2026-10-09T15:00' });
        expect(result.current.timeMin).toBeUndefined();
    });
});
