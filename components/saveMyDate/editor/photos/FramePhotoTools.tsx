'use client';

import { Minus, Move, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhotoToolButton } from '@/components/saveMyDate/editor/photos/PhotoToolButton';
import { useFramePhotoTools } from '@/hooks/useFramePhotoTools';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';

type FramePhotoToolsProps = {
    element: PhotoFrameElement;
    edit: InvitationEditorState['edit'];
};

// Over a framed photo: a mouse drags it and the wheel zooms it; on a phone the
// move button drags it and two fingers zoom. Buttons on the left zoom it.
export function FramePhotoTools({ element, edit }: FramePhotoToolsProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { surfaceRef, move, zoomIn, zoomOut, canZoomIn, canZoomOut } = useFramePhotoTools(element, edit);

    return (
        <>
            {/* Photo */}
            <div
                ref={surfaceRef}
                data-testid="frame-photo-surface"
                data-panning={move.isDragging}
                className="absolute inset-0 z-[5] cursor-move touch-pan-x touch-pan-y select-none"
            />

            {/* Move and zoom */}
            <div className="absolute top-1/2 left-2.5 z-10 flex -translate-y-1/2 flex-col gap-1.5">
                <PhotoToolButton label={t('zoomIn')} onClick={zoomIn} disabled={!canZoomIn}>
                    <Plus className="h-5 w-5" aria-hidden="true" />
                </PhotoToolButton>
                <PhotoToolButton label={t('zoomOut')} onClick={zoomOut} disabled={!canZoomOut}>
                    <Minus className="h-5 w-5" aria-hidden="true" />
                </PhotoToolButton>
                <PhotoToolButton label={t('move')} data-dragging={move.isDragging} className="cursor-move touch-none" {...move.handlers}>
                    <Move className="h-[18px] w-[18px]" aria-hidden="true" />
                </PhotoToolButton>
            </div>
        </>
    );
}
