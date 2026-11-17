import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

function closeTab() {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event;
}

describe('useUnsavedChangesWarning', () => {
    afterEach(cleanup);

    it('asks before closing while active', () => {
        renderHook(() => useUnsavedChangesWarning(true));
        expect(closeTab().defaultPrevented).toBe(true);
    });

    it('lets the tab close when nothing is unsaved', () => {
        renderHook(() => useUnsavedChangesWarning(false));
        expect(closeTab().defaultPrevented).toBe(false);
    });

    it('stops asking once the changes are saved', () => {
        const { rerender } = renderHook(({ active }) => useUnsavedChangesWarning(active), { initialProps: { active: true } });
        rerender({ active: false });
        expect(closeTab().defaultPrevented).toBe(false);
    });
});
