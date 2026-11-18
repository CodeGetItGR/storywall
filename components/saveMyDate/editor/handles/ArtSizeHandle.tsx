'use client';

import { useTranslations } from 'next-intl';

import { CanvasHandle } from '@/components/saveMyDate/editor/handles/CanvasHandle';
import { useArtSizeHandle } from '@/hooks/useArtSizeHandle';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { ART_SCALE, type ArtSlot } from '@/lib/invitation/themeAssets';

type ArtSizeHandleProps = { store: InvitationEditorStore; slot: ArtSlot; scale: number };

// A green dot on the corner of the main illustration or the ceremony icon (admin's theme editor).
export function ArtSizeHandle({ store, slot, scale }: ArtSizeHandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const drag = useArtSizeHandle(store, slot, scale);
    const percent = Math.round(scale * 100);

    return (
        <CanvasHandle
            variant="dot"
            label={t('resize')}
            value={percent}
            min={ART_SCALE.min * 100}
            max={ART_SCALE.max * 100}
            valueText={t('percent', { value: percent })}
            isDragging={drag.isDragging}
            handlers={drag.handlers}
            className="absolute -right-[15px] -bottom-[15px]"
        />
    );
}
