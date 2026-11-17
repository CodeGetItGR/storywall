'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MoveArrowButton } from '@/components/saveMyDate/editor/handles/MoveArrowButton';
import type { MoveOptions } from '@/lib/invitation/canvasHandles';

type ColumnBreakMarkerProps = {
    moves: MoveOptions;
    // Moves the split back: the last item of the left column goes to the right one.
    onBack: () => void;
    onForward: () => void;
};

// The column split of a custom section (admins), between its two columns.
export function ColumnBreakMarker({ moves, onBack, onForward }: ColumnBreakMarkerProps) {
    const t = useTranslations('InvitationEditor.handles');

    return (
        <div className="smd-column-break flex font-sans items-center gap-1 rounded-full border border-[rgba(120,182,164,0.75)] bg-white px-1.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-[#39413e] shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
            <MoveArrowButton label={t('toRightColumn')} disabled={!moves.canBack} onClick={onBack} icon={ArrowLeft} />
            <span className="px-1">{t('twoColumns')}</span>
            <MoveArrowButton label={t('toLeftColumn')} disabled={!moves.canForward} onClick={onForward} icon={ArrowRight} />
        </div>
    );
}
