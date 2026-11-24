import { cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';

import { useHideMobileTabBar } from '@/hooks/useHideMobileTabBar';
import { MobileChromeProvider, useMobileChrome } from '@/providers/MobileChromeProvider';

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => <MobileChromeProvider>{children}</MobileChromeProvider>;

it('hides the tab bar while asked, and brings it back', () => {
    const { result, rerender } = renderHook(
        ({ active }) => {
            useHideMobileTabBar(active, 'test');
            return useMobileChrome().isMobileTabBarHidden;
        },
        { wrapper, initialProps: { active: false } },
    );
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
});

function InvitationScreen() {
    useHideMobileTabBar(true, 'test');
    return null;
}

function BarState() {
    return <output>{useMobileChrome().isMobileTabBarHidden ? 'away' : 'shown'}</output>;
}

it('brings the tab bar back when the screen goes away', () => {
    const view = (open: boolean) => (
        <MobileChromeProvider>
            <BarState />
            {open && <InvitationScreen />}
        </MobileChromeProvider>
    );
    const { rerender } = render(view(true));
    expect(screen.getByRole('status').textContent).toBe('away');
    rerender(view(false));
    expect(screen.getByRole('status').textContent).toBe('shown');
});
