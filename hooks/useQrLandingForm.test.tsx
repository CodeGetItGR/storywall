import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useQrLandingForm } from '@/hooks/useQrLandingForm';

afterEach(cleanup);

async function flushMicrotasks() {
    await act(async () => {
        await Promise.resolve();
    });
}

describe('useQrLandingForm', () => {
    it('adds a Back step for a form opened from the choices, and Back closes it', async () => {
        const { result } = renderHook(() => useQrLandingForm('chooser'));
        const before = window.history.length;

        act(() => result.current.choose('wish'));
        await flushMicrotasks();

        expect(result.current.chosen).toBe('wish');
        expect(window.history.length).toBe(before + 1);

        act(() => window.history.back());
        await waitFor(() => expect(result.current.chosen).toBe('chooser'));
    });

    it('closes from the back arrow and resets the sent screen', async () => {
        const { result } = renderHook(() => useQrLandingForm('chooser'));

        act(() => result.current.choose('upload'));
        await flushMicrotasks();
        act(() => result.current.setIsSent(true));

        act(() => result.current.closeForm());

        expect(result.current.chosen).toBe('chooser');
        expect(result.current.isSent).toBe(false);
    });

    it('adds no Back step when the page opens straight on a form', async () => {
        const { result } = renderHook(() => useQrLandingForm('upload'));
        const before = window.history.length;

        await flushMicrotasks();

        expect(result.current.chosen).toBeNull();
        expect(window.history.length).toBe(before);
    });
});
