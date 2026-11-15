'use client';

import { type ChangeEvent, useCallback } from 'react';

import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import { FRAME_ANIMATIONS } from '@/lib/invitation/elements';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import { isFrameAnimation, setFrameAnimation, setFrameId } from '@/lib/invitation/photoFrameEdits';

// The admin's frame and frame effect lists on one frame. Each choice is one undo step.
export function useFrameSettings(element: PhotoFrameElement, edit: InvitationEditorState['edit']) {
    const id = element.id;

    const onFrame = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const frameId = event.target.value;
            edit((draft) => setFrameId(draft, id, frameId));
        },
        [edit, id],
    );

    const onAnimation = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const animation = event.target.value;
            if (isFrameAnimation(animation)) edit((draft) => setFrameAnimation(draft, id, animation));
        },
        [edit, id],
    );

    return { frameId: element.frameId, animation: element.animation, animations: FRAME_ANIMATIONS, onFrame, onAnimation };
}
