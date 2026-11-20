'use client';

import { useCallback, useRef } from 'react';

import { type DragDelta, nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import { draggedBandPosition, POSITION_KEY_STEP, setPhotoBandPosition, steppedPercent } from '@/lib/invitation/photoFrameEdits';

type BandStart = { imageY: number; height: number; key: string };

// The photo band's move button: dragging it up or down picks which part of the
// photo shows, as in the old editor. The arrow keys move it too.
export function usePhotoBandTool(sectionId: string, imageY: number, edit: InvitationEditorState['edit']) {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const start = useCallback((): BandStart | null => {
        const band = buttonRef.current?.parentElement?.getBoundingClientRect();
        if (!band) return null;
        return { imageY, height: band.height, key: nextGestureKey(`photo-band:${sectionId}`) };
    }, [imageY, sectionId]);

    const move = useCallback(
        (delta: DragDelta, from: BandStart) => {
            edit((draft) => setPhotoBandPosition(draft, sectionId, draggedBandPosition(from.imageY, delta.y, from.height)), from.key, {
                gesture: true,
            });
        },
        [edit, sectionId],
    );

    // Up shows more of the bottom of the photo, as dragging up does. Shift moves twice as far.
    const step = useCallback(
        (amount: number) => {
            edit(
                (draft) =>
                    setPhotoBandPosition(
                        draft,
                        sectionId,
                        steppedPercent(imageY, Math.sign(amount) * POSITION_KEY_STEP * (Math.abs(amount) > 1 ? 2 : 1)),
                    ),
                `photo-band:${sectionId}:keys`,
            );
        },
        [edit, imageY, sectionId],
    );

    const drag = useDragHandle({ start, move, step });
    return { ...drag, buttonRef };
}
