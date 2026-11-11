import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { testAuth, WithAuth } from '@/hooks/testAuthContext';
import { useAutoPublish } from '@/hooks/useAutoPublish';

function renderAutoPublish(url: string, start: () => void, auth = testAuth()) {
    window.history.replaceState(null, '', url);
    const wrapper = ({ children }: { children: ReactNode }) => <WithAuth value={auth}>{children}</WithAuth>;
    return renderHook(() => useAutoPublish(start), { wrapper });
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useAutoPublish', () => {
    it('publishes once when the editor opens with the flag, and drops it from the address', () => {
        const start = vi.fn();
        const { rerender } = renderAutoPublish('/save-my-date/editor/draft-1?publish=1&tab=x#top', start);

        expect(start).toHaveBeenCalledOnce();
        expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/save-my-date/editor/draft-1?tab=x#top');
        rerender();
        expect(start).toHaveBeenCalledOnce();
    });

    it('waits for the session', () => {
        const start = vi.fn();
        renderAutoPublish('/save-my-date/editor/draft-1?publish=1', start, testAuth({ isBootstrapping: true }));
        expect(start).not.toHaveBeenCalled();
        expect(window.location.search).toBe('?publish=1');
    });

    it('does nothing without the flag', () => {
        const start = vi.fn();
        renderAutoPublish('/save-my-date/editor/draft-1', start);
        expect(start).not.toHaveBeenCalled();
    });
});
