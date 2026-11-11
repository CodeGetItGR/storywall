'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { CanvasHandle } from '@/components/saveMyDate/editor/handles/CanvasHandle';
import type { CanvasHandlesValue } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { useFrameScaleHandle, useLengthHandle } from '@/hooks/useSizeHandle';
import { ELEMENT_WIDTH, FRAME_SCALE, setElementSize, type SizedElement, SPACER_HEIGHT } from '@/lib/invitation/canvasHandles';
import type { InvitationDocument } from '@/lib/invitation/document';

type ElementSizeHandleProps = {
    element: SizedElement;
    edit: CanvasHandlesValue['edit'];
};

// The handle inside a spacer, an added image or a photo frame.
export function ElementSizeHandle({ element, edit }: ElementSizeHandleProps) {
    const write = useCallback((draft: InvitationDocument, value: number) => setElementSize(draft, element.id, value), [element.id]);

    switch (element.kind) {
        case 'spacer':
            return <SpacerHandle id={element.id} value={element.height} write={write} edit={edit} />;
        case 'image':
            return <ImageSizeHandle id={element.id} value={element.width} write={write} edit={edit} />;
        case 'photoFrame':
            return <FrameSizeHandle id={element.id} value={element.boxScale} write={write} edit={edit} />;
    }
}

type HandleProps = {
    id: string;
    value: number;
    write: (draft: InvitationDocument, value: number) => void;
    edit: CanvasHandlesValue['edit'];
};

// A grey bar across the middle of a spacer.
function SpacerHandle({ id, value, write, edit }: HandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const drag = useLengthHandle({ key: `spacer:${id}`, value, write, edit, limits: SPACER_HEIGHT, axis: 'y' });

    return (
        <CanvasHandle
            variant="spacer"
            label={t('spacerHeight')}
            value={value}
            min={SPACER_HEIGHT.min}
            max={SPACER_HEIGHT.max}
            valueText={t('pixels', { value })}
            isDragging={drag.isDragging}
            handlers={drag.handlers}
            className="absolute top-1/2 left-1/2 -translate-1/2"
        />
    );
}

// A green dot on an image's bottom right corner; dragging right makes it wider.
function ImageSizeHandle({ id, value, write, edit }: HandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const drag = useLengthHandle({ key: `image:${id}`, value, write, edit, limits: ELEMENT_WIDTH, axis: 'x' });

    return (
        <CanvasHandle
            variant="dot"
            label={t('resize')}
            value={value}
            min={ELEMENT_WIDTH.min}
            max={ELEMENT_WIDTH.max}
            valueText={t('pixels', { value })}
            isDragging={drag.isDragging}
            handlers={drag.handlers}
            className="absolute -right-[15px] -bottom-[15px]"
        />
    );
}

// A green dot inside a photo frame's bottom right corner.
function FrameSizeHandle({ id, value, write, edit }: HandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const drag = useFrameScaleHandle({ key: `frame:${id}`, value, write, edit });
    const percent = Math.round(value * 100);

    return (
        <CanvasHandle
            variant="dot"
            label={t('resize')}
            value={percent}
            min={FRAME_SCALE.min * 100}
            max={FRAME_SCALE.max * 100}
            valueText={t('percent', { value: percent })}
            isDragging={drag.isDragging}
            handlers={drag.handlers}
            handleRef={drag.handleRef}
            className="absolute right-0 bottom-0"
        />
    );
}
