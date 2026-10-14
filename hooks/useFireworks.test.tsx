import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFireworks } from '@/hooks/useFireworks';

const fireworks = vi.hoisted(() => ({ stop: vi.fn(), runFireworks: vi.fn() }));
vi.mock('@/lib/fireworks', () => ({ FIREWORKS_DURATION_MS: 300, runFireworks: fireworks.runFireworks }));

function canvasRef() {
    return { current: document.createElement('canvas') };
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useFireworks', () => {
    it('runs the fireworks once loaded, then calls onComplete', async () => {
        fireworks.runFireworks.mockReturnValue(fireworks.stop);
        const onComplete = vi.fn();

        renderHook(() => useFireworks(canvasRef(), onComplete));

        await waitFor(() => expect(fireworks.runFireworks).toHaveBeenCalledOnce());
        await waitFor(() => expect(onComplete).toHaveBeenCalledOnce(), { timeout: 1000 });
    });

    it('stops the fireworks on unmount and never calls onComplete', async () => {
        fireworks.runFireworks.mockReturnValue(fireworks.stop);
        const onComplete = vi.fn();

        const { unmount } = renderHook(() => useFireworks(canvasRef(), onComplete));
        await waitFor(() => expect(fireworks.runFireworks).toHaveBeenCalledOnce());
        unmount();

        expect(fireworks.stop).toHaveBeenCalledOnce();
        await new Promise((done) => setTimeout(done, 400));
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('starts nothing when unmounted before the code loads', async () => {
        const { unmount } = renderHook(() => useFireworks(canvasRef(), vi.fn()));
        unmount();

        await new Promise((done) => setTimeout(done, 20));
        expect(fireworks.runFireworks).not.toHaveBeenCalled();
    });
});
