'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { SneakPeekPatchDto, SneakPeekRequestDto } from '@/lib/api/types';
import { sneakPeekPatch, toggleSneakPeekPick } from '@/lib/sneakPeek';

export type SneakPeekSubmit = SneakPeekRequestDto | SneakPeekPatchDto;

// The sheet's picks and caption. New: sends every pick and the caption. Edit: only what changed;
// an edit with no change just closes.
export function useSneakPeekSheet({
    mode,
    initialPicked,
    initialCaption,
    onSubmit,
    onClose,
}: {
    mode: 'new' | 'edit';
    initialPicked: readonly string[];
    initialCaption: string | null;
    onSubmit: (body: SneakPeekSubmit) => void;
    onClose: () => void;
}) {
    const { data: appConfig } = useAppConfig();
    const [picked, setPicked] = useState<string[]>(() => [...initialPicked]);
    const [caption, setCaption] = useState(initialCaption ?? '');

    const toggle = useCallback((id: string) => setPicked((current) => toggleSneakPeekPick(current, id)), []);
    // One handler for every item button; the button carries its item's id.
    const handlePick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const id = event.currentTarget.dataset.mediaId;
            if (id) toggle(id);
        },
        [toggle],
    );
    const handleCaption = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setCaption(event.target.value), []);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (picked.length === 0) return;
            if (mode === 'new') {
                const content = caption.trim();
                onSubmit(content ? { mediaIds: picked, content } : { mediaIds: picked });
                return;
            }
            const patch = sneakPeekPatch({ mediaIds: initialPicked, content: initialCaption }, { mediaIds: picked, content: caption });
            if (patch) onSubmit(patch);
            else onClose();
        },
        [caption, initialCaption, initialPicked, mode, onClose, onSubmit, picked],
    );

    return {
        picked,
        pickIndex: (id: string) => picked.indexOf(id),
        handlePick,
        caption,
        handleCaption,
        // The normal post caption limit, with EditPostModal's fallback.
        maxLength: appConfig?.contentLimits.postContentMaxLength ?? 500,
        canSubmit: picked.length > 0,
        handleSubmit,
    };
}
