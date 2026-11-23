'use client';

import { Eye, EyeOff, GripVertical, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionMenu } from '@/components/saveMyDate/editor/sections/SectionMenu';
import { SectionSettingsButton } from '@/components/saveMyDate/editor/sections/SectionSettingsButton';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import { type FeedBlockToolActions, useFeedBlockHandlers } from '@/hooks/useFeedBlockHandlers';
import type { SectionDragHandle } from '@/hooks/useSectionSortable';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { InvitationSection } from '@/lib/invitation/sections';

type FeedBlockToolsProps = {
    section: InvitationSection;
    name: string;
    controls: FeedBlockControls;
    hasSettings: boolean;
    drag: SectionDragHandle;
    actions: FeedBlockToolActions;
};

// One block's tools: eye, pencil and the block's name on the left, drag and menu on the right (middle blocks only).
export function FeedBlockTools({ section, name, controls, hasSettings, drag, actions }: FeedBlockToolsProps) {
    const t = useTranslations('InvitationEditor.sections');
    const tLayout = useTranslations('FeedLayout');
    const on = useFeedBlockHandlers(section.id, actions);
    const { activator, attributes, listeners } = drag;

    return (
        // transition-none keeps the tools instant, as in the old editor's toolbar (SectionToolbar).
        <div
            data-feed-block-tools
            className="pointer-events-none absolute inset-x-2.5 top-3 z-40 flex items-start justify-between gap-2 transition-none"
        >
            {/* Visibility, settings and name */}
            <div className="flex min-w-0 items-center gap-2">
                {controls.canHide && (
                    <SectionToolButton
                        label={section.visible ? t('hide') : t('show')}
                        isOff={!section.visible}
                        onClick={on.toggleVisible}
                        className="pointer-events-auto"
                    >
                        {section.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    </SectionToolButton>
                )}
                {hasSettings && <SectionSettingsButton onClick={on.openSettings} className="pointer-events-auto" />}
                {/* The block's group already carries its name for screen readers. */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none min-w-0 truncate rounded-full bg-white/95 px-2.5 py-1 text-[12px] text-[#555] shadow-[0_4px_14px_rgba(0,0,0,0.16)]"
                >
                    {name}
                </span>
                {/* Hidden from guests */}
                {!section.visible && (
                    <span className="pointer-events-none shrink-0 rounded-full border border-black/10 bg-white/95 px-2.5 py-1 text-[11px] text-[#555]">
                        {t('hidden')}
                    </span>
                )}
                {/* Members only */}
                {section.membersOnly && (
                    <span className="pointer-events-none flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white/95 px-2.5 py-1 text-[11px] text-[#555]">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        {tLayout('membersOnly')}
                    </span>
                )}
            </div>

            {/* Move and menu */}
            {controls.movable && (
                <div className="pointer-events-auto flex shrink-0 gap-2">
                    <SectionToolButton
                        ref={activator}
                        label={t('drag')}
                        className="cursor-grab touch-none active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical aria-hidden="true" />
                    </SectionToolButton>
                    <SectionMenu
                        canMoveUp={controls.canMoveUp}
                        canMoveDown={controls.canMoveDown}
                        onMoveUp={on.moveUp}
                        onMoveDown={on.moveDown}
                        onDelete={controls.canDelete ? on.remove : undefined}
                    />
                </div>
            )}

        </div>
    );
}
