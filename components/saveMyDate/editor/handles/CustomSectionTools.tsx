'use client';

import type { ReactNode } from 'react';

import type { CanvasHandlesValue } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { ColumnBreakMarker } from '@/components/saveMyDate/editor/handles/ColumnBreakMarker';
import { CustomItemMoves } from '@/components/saveMyDate/editor/handles/CustomItemMoves';
import { useCustomSectionMoves } from '@/hooks/useCustomSectionMoves';
import type { InvitationElement } from '@/lib/invitation/elements';

type CustomItemToolsProps = {
    sectionId: string;
    elements: readonly InvitationElement[];
    itemId: string;
    edit: CanvasHandlesValue['edit'];
    children: ReactNode;
};

export function CustomItemTools({ sectionId, elements, itemId, edit, children }: CustomItemToolsProps) {
    const moves = useCustomSectionMoves(edit, sectionId, elements, itemId, 'item');

    return (
        <CustomItemMoves moves={moves.options} onBack={moves.back} onForward={moves.forward}>
            {children}
        </CustomItemMoves>
    );
}

type ColumnBreakToolsProps = Omit<CustomItemToolsProps, 'children' | 'itemId'> & { breakId: string };

export function ColumnBreakTools({ sectionId, elements, breakId, edit }: ColumnBreakToolsProps) {
    const moves = useCustomSectionMoves(edit, sectionId, elements, breakId, 'break');
    if (!moves.options) return null;

    return <ColumnBreakMarker moves={moves.options} onBack={moves.back} onForward={moves.forward} />;
}
