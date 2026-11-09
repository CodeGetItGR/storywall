import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditorLeave } from '@/hooks/useEditorLeave';
import { routes } from '@/lib/routes';

const mocks = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), hasInAppPrevious: vi.fn(() => true) }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: mocks.back, push: mocks.push }) }));
vi.mock('@/lib/inAppHistory', () => ({ hasInAppPrevious: mocks.hasInAppPrevious }));

describe('useEditorLeave', () => {
    beforeEach(() => {
        mocks.back.mockReset();
        mocks.push.mockReset();
        mocks.hasInAppPrevious.mockReturnValue(true);
    });
    afterEach(cleanup);

    it('saves, then goes back to the previous app page', async () => {
        const flush = vi.fn(() => Promise.resolve(true));
        const { result } = renderHook(() => useEditorLeave(flush));

        await act(() => result.current.back());

        expect(flush).toHaveBeenCalledOnce();
        expect(mocks.back).toHaveBeenCalledOnce();
        expect(result.current.isConfirming).toBe(false);
    });

    it('goes home when the editor was opened from outside the app', async () => {
        mocks.hasInAppPrevious.mockReturnValue(false);
        const { result } = renderHook(() => useEditorLeave(() => Promise.resolve(true)));

        await act(() => result.current.back());

        expect(mocks.push).toHaveBeenCalledWith(routes.home);
        expect(mocks.back).not.toHaveBeenCalled();
    });

    it('asks first when the changes could not be saved', async () => {
        const { result } = renderHook(() => useEditorLeave(() => Promise.resolve(false)));

        await act(() => result.current.back());
        expect(result.current.isConfirming).toBe(true);
        expect(mocks.back).not.toHaveBeenCalled();

        act(() => result.current.stay());
        expect(result.current.isConfirming).toBe(false);
        expect(mocks.back).not.toHaveBeenCalled();

        await act(() => result.current.back());
        act(() => result.current.leave());
        expect(result.current.isConfirming).toBe(false);
        expect(mocks.back).toHaveBeenCalledOnce();
    });

    it('is busy while the save runs', async () => {
        let finish: (saved: boolean) => void = () => {};
        const flush = () => new Promise<boolean>((resolve) => (finish = resolve));
        const { result } = renderHook(() => useEditorLeave(flush));

        let leaving: Promise<void> = Promise.resolve();
        act(() => {
            leaving = result.current.back();
        });
        expect(result.current.isLeaving).toBe(true);

        await act(async () => {
            finish(true);
            await leaving;
        });
        expect(result.current.isLeaving).toBe(false);
    });
});
