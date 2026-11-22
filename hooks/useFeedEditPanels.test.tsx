import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedEditPanels } from '@/hooks/useFeedEditPanels';

function renderPanels() {
    const calls = { openSettingsFor: vi.fn(), closeSettings: vi.fn(), openAddSection: vi.fn() };
    const hook = renderHook(() => useFeedEditPanels(calls.openSettingsFor, calls.closeSettings, calls.openAddSection));
    return { ...calls, hook };
}

describe('useFeedEditPanels', () => {
    it('closes block settings when the theme sheet opens, and the theme sheet when settings open', () => {
        const { hook, closeSettings, openSettingsFor } = renderPanels();
        act(() => hook.result.current.openTheme());
        expect(hook.result.current.themeOpen).toBe(true);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        act(() => hook.result.current.openSettings('s-1'));
        expect(hook.result.current.themeOpen).toBe(false);
        expect(openSettingsFor).toHaveBeenCalledWith('s-1');
    });

    it('closes the theme sheet and block settings before Add section opens', () => {
        const { hook, closeSettings, openAddSection } = renderPanels();
        act(() => hook.result.current.openTheme());
        closeSettings.mockClear();
        act(() => hook.result.current.openAdd());
        expect(hook.result.current.themeOpen).toBe(false);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(openAddSection).toHaveBeenCalledTimes(1);
    });
});
