'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { CanvasHandle } from '@/components/saveMyDate/editor/handles/CanvasHandle';
import type { CanvasHandlesValue } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { useLengthHandle } from '@/hooks/useSizeHandle';
import { DECORATION_WIDTH, setDecorationWidth } from '@/lib/invitation/canvasHandles';
import type { InvitationDocument } from '@/lib/invitation/document';

type DecorationSizeHandleProps = {
    sectionId: string;
    width: number;
    edit: CanvasHandlesValue['edit'];
};

// A green dot on the corner of a section's decoration (admins).
export function DecorationSizeHandle({ sectionId, width, edit }: DecorationSizeHandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const write = useCallback((draft: InvitationDocument, value: number) => setDecorationWidth(draft, sectionId, value), [sectionId]);
    const drag = useLengthHandle({ key: `decoration:${sectionId}`, value: width, write, edit, limits: DECORATION_WIDTH, axis: 'x' });

    return (
        <CanvasHandle
            variant="dot"
            label={t('resize')}
            value={width}
            min={DECORATION_WIDTH.min}
            max={DECORATION_WIDTH.max}
            valueText={t('pixels', { value: width })}
            isDragging={drag.isDragging}
            handlers={drag.handlers}
            className="absolute -right-[15px] -bottom-[15px]"
        />
    );
}
