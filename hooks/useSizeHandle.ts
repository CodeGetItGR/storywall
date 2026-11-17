'use client';

import type { Draft } from 'immer';
import { useCallback, useRef } from 'react';

import { type DragDelta, nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';
import { draggedFrameScale, draggedLength, FRAME_SCALE, type HandleLimits } from '@/lib/invitation/canvasHandles';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';

type Write = (draft: Draft<InvitationDocument>, value: number) => void;

type SizeHandleOptions = {
    // Names the edit, for undo steps.
    key: string;
    value: number;
    write: Write;
    edit: InvitationEditorState['edit'];
};

type LengthStart = { value: number; key: string };

// A handle that drags one length in pixels: a spacer's height down, a width to the right.
export function useLengthHandle({ key, value, write, edit, limits, axis }: SizeHandleOptions & { limits: HandleLimits; axis: 'x' | 'y' }) {
    const start = useCallback((): LengthStart => ({ value, key: nextGestureKey(key) }), [key, value]);
    const move = useCallback(
        (delta: DragDelta, from: LengthStart) => {
            edit((draft) => write(draft, draggedLength(from.value, delta[axis], limits)), from.key, { gesture: true });
        },
        [axis, edit, limits, write],
    );
    const step = useCallback(
        (amount: number) => {
            // Up makes a spacer taller and right makes an image wider, as a slider does.
            edit((draft) => write(draft, draggedLength(value, amount, limits)), `${key}:keys`);
        },
        [edit, key, limits, value, write],
    );
    return useDragHandle({ start, move, step });
}

type ScaleStart = { value: number; width: number; height: number; key: string };

// A photo frame's size: the dot scales the whole frame, measured against the box it sits in.
export function useFrameScaleHandle({ key, value, write, edit }: SizeHandleOptions) {
    const handleRef = useRef<HTMLDivElement>(null);
    const start = useCallback((): ScaleStart | null => {
        const box = handleRef.current?.parentElement?.getBoundingClientRect();
        if (!box) return null;
        return { value, width: box.width, height: box.height, key: nextGestureKey(key) };
    }, [key, value]);
    const move = useCallback(
        (delta: DragDelta, from: ScaleStart) => {
            edit((draft) => write(draft, draggedFrameScale(from.value, delta.x, delta.y, from.width, from.height)), from.key, { gesture: true });
        },
        [edit, write],
    );
    const step = useCallback(
        (amount: number) => {
            const next = Math.min(FRAME_SCALE.max, Math.max(FRAME_SCALE.min, Math.round((value + amount / 100) * 100) / 100));
            edit((draft) => write(draft, next), `${key}:keys`);
        },
        [edit, key, value, write],
    );
    const drag = useDragHandle({ start, move, step });
    return { ...drag, handleRef };
}
