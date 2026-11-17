import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { sampleDraftDocument } from '@/lib/invitation/sampleDraft';

describe('useInvitationEditorStore', () => {
    it('sets the text colour and undoes and redoes it', () => {
        const initial = sampleDraftDocument();
        const { result } = renderHook(() => useInvitationEditorStore(initial));
        expect(result.current.canUndo).toBe(false);

        act(() => result.current.setTextColor('#112233'));
        expect(result.current.document.overrides.textColor).toBe('#112233');
        expect(result.current.canUndo).toBe(true);

        act(() => result.current.undo());
        expect(result.current.document.overrides.textColor).toBe(initial.overrides.textColor);
        expect(result.current.canRedo).toBe(true);

        act(() => result.current.redo());
        expect(result.current.document.overrides.textColor).toBe('#112233');
    });

    it('makes one undo step of colours picked in a row', () => {
        const initial = sampleDraftDocument();
        const { result } = renderHook(() => useInvitationEditorStore(initial));

        act(() => result.current.setTextColor('#111111'));
        act(() => result.current.setTextColor('#222222'));
        act(() => result.current.setTextColor('#333333'));
        act(() => result.current.undo());

        expect(result.current.document.overrides.textColor).toBe(initial.overrides.textColor);
        expect(result.current.canUndo).toBe(false);
    });

    it('keeps the same store across renders', () => {
        const { result, rerender } = renderHook(() => useInvitationEditorStore(sampleDraftDocument()));
        const { store } = result.current;
        rerender();
        expect(result.current.store).toBe(store);
    });
});
