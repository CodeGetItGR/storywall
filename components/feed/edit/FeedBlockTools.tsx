'use client';

import { Eye, EyeOff, GripVertical, Lock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

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

// One block's tools (mockup 2026-11-23): the eye and the block's name on the left; delete, drag and settings stacked on
// the right. Blocks move only by dragging (keyboard too: Space, arrows, Space).
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
            {/* Visibility and name */}
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
                {/* The block's group already carries its name for screen readers. */}
                <span aria-hidden="true" className="pointer-events-none min-w-0 truncate text-[13px] text-ink">
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

            {/* Delete, drag and settings, stacked */}
            <div data-feed-block-tools-right className="pointer-events-auto flex shrink-0 flex-col gap-2">
                {controls.canDelete && (
                    <SectionToolButton label={t('delete')} onClick={on.remove}>
                        <X aria-hidden="true" />
                    </SectionToolButton>
                )}
                {controls.movable && (
                    <SectionToolButton
                        ref={activator}
                        label={t('drag')}
                        className="cursor-grab touch-none active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical aria-hidden="true" />
                    </SectionToolButton>
                )}
                {hasSettings && <SectionSettingsButton onClick={on.openSettings} />}
            </div>
        </div>
    );
}
