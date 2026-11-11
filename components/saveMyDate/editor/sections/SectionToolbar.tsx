'use client';

import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionMenu } from '@/components/saveMyDate/editor/sections/SectionMenu';
import { SectionSettingsButton } from '@/components/saveMyDate/editor/sections/SectionSettingsButton';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import type { SectionDragHandle } from '@/hooks/useSectionSortable';
import { cn } from '@/lib/utils';

type SectionToolbarProps = {
    visible: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    drag: SectionDragHandle;
    onToggleVisible: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    // Left out when the section has no settings.
    onOpenSettings?: () => void;
    className?: string;
};

// The tools on top of a section: the eye on the left, drag and menu on the right.
export function SectionToolbar({
    visible,
    canMoveUp,
    canMoveDown,
    drag,
    onToggleVisible,
    onMoveUp,
    onMoveDown,
    onDelete,
    onOpenSettings,
    className,
}: SectionToolbarProps) {
    const t = useTranslations('InvitationEditor.sections');
    const { activator, attributes, listeners } = drag;

    return (
        // The tools show and hide by visibility. transition-none keeps that instant: the reduced-motion rule in
        // globals.css would otherwise give it a 1ms transition, and the tools would still be hidden right after a tap.
        <div className={cn('pointer-events-none absolute inset-x-2.5 top-3 z-40 flex items-start justify-between transition-none sm:top-6', className)}>
            {/* Visibility */}
            <SectionToolButton label={visible ? t('hide') : t('show')} isOff={!visible} onClick={onToggleVisible} className="pointer-events-auto">
                {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </SectionToolButton>

            {/* Settings, move and menu */}
            <div className="pointer-events-auto flex gap-2 transition-none">
                {onOpenSettings && <SectionSettingsButton onClick={onOpenSettings} />}
                <SectionToolButton
                    ref={activator}
                    label={t('drag')}
                    className="cursor-grab touch-none active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical aria-hidden="true" />
                </SectionToolButton>
                <SectionMenu canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={onDelete} />
            </div>
        </div>
    );
}
