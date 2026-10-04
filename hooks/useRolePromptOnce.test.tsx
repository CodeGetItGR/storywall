import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRolePromptOnce } from '@/hooks/useRolePromptOnce';

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useRolePromptOnce', () => {
    it('prompts once per member and remembers it', () => {
        const onPrompt = vi.fn();
        const { rerender } = renderHook((props) => useRolePromptOnce(props), { initialProps: { active: true, memberId: 'm1', onPromptAction: onPrompt } });
        rerender({ active: true, memberId: 'm1', onPromptAction: onPrompt });
        renderHook(() => useRolePromptOnce({ active: true, memberId: 'm1', onPromptAction: onPrompt }));

        expect(onPrompt).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem('sw.rolePrompt.m1')).toBe('1');
    });

    it('does nothing while inactive', () => {
        const onPrompt = vi.fn();
        renderHook(() => useRolePromptOnce({ active: false, memberId: 'm1', onPromptAction: onPrompt }));
        expect(onPrompt).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('sw.rolePrompt.m1')).toBeNull();
    });

    it('skips the prompt when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const onPrompt = vi.fn();
        renderHook(() => useRolePromptOnce({ active: true, memberId: 'm1', onPromptAction: onPrompt }));
        expect(onPrompt).not.toHaveBeenCalled();
    });
});
