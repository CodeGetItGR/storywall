'use client';

import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import { CanvasHandle } from '@/components/saveMyDate/editor/handles/CanvasHandle';
import type { CanvasHandlesValue } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { type TextEdge, useTextHandlePlaces, useTextSpacingHandle } from '@/hooks/useTextSpacingHandle';
import { TEXT_SPACING } from '@/lib/invitation/canvasHandles';
import type { TextStyle } from '@/lib/invitation/primitives';
import type { TextTarget } from '@/lib/invitation/textEditing';

type TextSpacingHandlesProps = {
    element: HTMLElement;
    target: TextTarget;
    style: TextStyle | undefined;
    edit: CanvasHandlesValue['edit'];
};

// The green bars above and below the text being edited (admins). They sit on the
// section frame, so they never change the text's own layout.
export function TextSpacingHandles({ element, target, style, edit }: TextSpacingHandlesProps) {
    const places = useTextHandlePlaces(element, style);
    if (!places) return null;

    return createPortal(
        <>
            {/* Space above */}
            <TextSpacingHandle edge="top" x={places.x} y={places.top} element={element} target={target} style={style} edit={edit} />
            {/* Space below */}
            <TextSpacingHandle edge="bottom" x={places.x} y={places.bottom} element={element} target={target} style={style} edit={edit} />
        </>,
        places.frame,
    );
}

type TextSpacingHandleProps = TextSpacingHandlesProps & { edge: TextEdge; x: number; y: number };

function TextSpacingHandle({ edge, x, y, element, target, style, edit }: TextSpacingHandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const drag = useTextSpacingHandle(element, target, style, edge, edit);

    return (
        <CanvasHandle
            variant="text"
            label={edge === 'top' ? t('spaceAbove') : t('spaceBelow')}
            value={drag.value}
            min={TEXT_SPACING.min}
            max={TEXT_SPACING.max}
            valueText={t('pixels', { value: drag.value })}
            isDragging={drag.isDragging}
            handlers={drag.handlers}
            className="absolute -translate-1/2"
            style={{ left: x, top: y }}
        />
    );
}
