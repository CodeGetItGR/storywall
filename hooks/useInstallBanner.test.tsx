import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInstallBanner } from '@/hooks/useInstallBanner';
import { INSTALL_BANNER_DISMISSED_KEY } from '@/lib/pwaInstall';

const pwaInstall = vi.hoisted(() => ({ canInstall: true }));

vi.mock('@/hooks/usePwaInstall', () => ({
    usePwaInstall: () => ({ canInstall: pwaInstall.canInstall, install: vi.fn(), iosGuideOpen: false, closeIosGuide: vi.fn() }),
}));

describe('useInstallBanner', () => {
    beforeEach(() => {
        window.localStorage.clear();
        pwaInstall.canInstall = true;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('offers the install where the app can be installed', () => {
        const { result } = renderHook(() => useInstallBanner());
        expect(result.current.state).toBe('offer');
    });

    it('stays hidden where the app cannot be installed', () => {
        pwaInstall.canInstall = false;
        const { result } = renderHook(() => useInstallBanner());
        expect(result.current.state).toBe('hidden');
    });

    it('shows the tip after closing, then hides for good', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useInstallBanner());

        act(() => result.current.dismiss());
        expect(result.current.state).toBe('tip');
        expect(window.localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)).toBe('1');

        act(() => vi.advanceTimersByTime(4000));
        expect(result.current.state).toBe('hidden');
    });

    it('does not offer again once closed on this device', () => {
        window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, '1');
        const { result } = renderHook(() => useInstallBanner());
        expect(result.current.state).toBe('hidden');
    });
});
