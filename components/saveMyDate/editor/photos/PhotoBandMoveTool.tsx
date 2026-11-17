'use client';

import { MoveVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhotoToolButton } from '@/components/saveMyDate/editor/photos/PhotoToolButton';
import { usePhotoBandTool } from '@/hooks/usePhotoBandTool';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';

type PhotoBandMoveToolProps = {
    sectionId: string;
    imageY: number;
    edit: InvitationEditorState['edit'];
};

// The photo band's move button, bottom left: drag it up or down to pick which part shows.
export function PhotoBandMoveTool({ sectionId, imageY, edit }: PhotoBandMoveToolProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { buttonRef, handlers, isDragging } = usePhotoBandTool(sectionId, imageY, edit);

    return (
        <PhotoToolButton
            buttonRef={buttonRef}
            label={t('move')}
            data-dragging={isDragging}
            className="absolute bottom-3 left-3 z-10 cursor-ns-resize touch-none"
            {...handlers}
        >
            <MoveVertical className="h-5 w-5" aria-hidden="true" />
        </PhotoToolButton>
    );
}
