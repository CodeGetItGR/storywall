'use client';

import { Eye, EyeOff, GripVertical, Lock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FEED_TOOL_CLASS } from '@/components/feed/edit/feedToolClass';
import { SectionSettingsButton } from '@/components/saveMyDate/editor/sections/SectionSettingsButton';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import { type FeedBlockToolActions, useFeedBlockHandlers } from '@/hooks/useFeedBlockHandlers';
import type { SectionDragHandle } from '@/hooks/useSectionSortable';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

type FeedBlockToolsProps = {
    section: InvitationSection;
    name: string;
    controls: FeedBlockControls;
    hasSettings: boolean;
    drag: SectionDragHandle;
    actions: FeedBlockToolActions;
};

// A module block's tools sit inside its card (FeedModuleBlock), 12 px from its edges. The block starts at the card's top:
// the card's own margin collapses out of it.
const MODULE_PLACE = 'inset-x-7 top-3';

// One block's tools (mockup 2026-11-23): the eye and the block's name on the left; delete, drag and settings stacked on
// the right, ending on the content's right edge. Blocks move only by dragging (keyboard too: Space, arrows, Space). The
// cover shows no name, and a module block's card already does.
export function FeedBlockTools({ section, name, controls, hasSettings, drag, actions }: FeedBlockToolsProps) {
    const t = useTranslations('InvitationEditor.sections');
    const tLayout = useTranslations('FeedLayout');
    const on = useFeedBlockHandlers(section.id, actions);
    const { activator, attributes, listeners } = drag;
    const isModule = section.type === 'feedModule';

    return (
        // transition-none keeps the tools instant, as in the old editor's toolbar (SectionToolbar).
        <div
            data-feed-block-tools
            className={cn(
                'pointer-events-none absolute z-40 flex items-start justify-between gap-2 transition-none',
                isModule ? MODULE_PLACE : 'inset-x-4 top-3',
            )}
        >
            {/* Visibility and name: from the content's left edge, centred on the first tool on the right */}
            <div className="flex min-h-8 min-w-0 items-center gap-2">
                {controls.canHide && (
                    <SectionToolButton
                        label={section.visible ? t('hide') : t('show')}
                        isOff={!section.visible}
                        onClick={on.toggleVisible}
                        className={cn('pointer-events-auto', FEED_TOOL_CLASS)}
                    >
                        {section.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    </SectionToolButton>
                )}
                {/* The block's group already carries its name for screen readers. */}
                {section.type !== 'feedCover' && !isModule && (
                    <span aria-hidden="true" className="pointer-events-none min-w-0 truncate text-[13px] text-ink">
                        {name}
                    </span>
                )}
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
                    <SectionToolButton label={t('delete')} onClick={on.remove} className={FEED_TOOL_CLASS}>
                        <X aria-hidden="true" />
                    </SectionToolButton>
                )}
                {controls.movable && (
                    <SectionToolButton
                        ref={activator}
                        label={t('drag')}
                        className={cn(FEED_TOOL_CLASS, 'cursor-grab touch-none active:cursor-grabbing')}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical aria-hidden="true" />
                    </SectionToolButton>
                )}
                {hasSettings && <SectionSettingsButton onClick={on.openSettings} className={FEED_TOOL_CLASS} />}
            </div>
        </div>
    );
}
