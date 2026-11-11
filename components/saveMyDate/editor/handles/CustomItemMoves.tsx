'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { MoveArrowButton } from '@/components/saveMyDate/editor/handles/MoveArrowButton';
import type { MoveOptions } from '@/lib/invitation/canvasHandles';

type CustomItemMovesProps = {
    moves: MoveOptions | null;
    onBack: () => void;
    onForward: () => void;
    children: ReactNode;
};

// One item of a custom section with its arrows (admins): one place back or forward,
// across the column split too.
export function CustomItemMoves({ moves, onBack, onForward, children }: CustomItemMovesProps) {
    const t = useTranslations('InvitationEditor.handles');

    return (
        <div className="group/item relative w-full min-w-0">
            {/* Arrows */}
            {moves && (
                <div className="absolute top-0.5 right-0.5 z-[18] flex gap-0.5 rounded-full border border-[rgba(120,182,164,0.55)] bg-white/95 p-0.5 opacity-60 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity group-focus-within/item:z-[19] group-focus-within/item:opacity-100 group-hover/item:z-[19] group-hover/item:opacity-100">
                    <MoveArrowButton label={t('itemBack')} disabled={!moves.canBack} onClick={onBack} icon={ArrowUp} />
                    <MoveArrowButton label={t('itemForward')} disabled={!moves.canForward} onClick={onForward} icon={ArrowDown} />
                </div>
            )}

            {/* Item */}
            {children}
        </div>
    );
}
