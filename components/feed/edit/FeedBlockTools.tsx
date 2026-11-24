'use client';

import { Eye, EyeOff, GripVertical, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedBlockMenu } from '@/components/feed/edit/FeedBlockMenu';
import { FEED_TOOL_CLASS } from '@/components/feed/edit/feedToolClass';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import { type FeedBlockToolActions, useFeedBlockHandlers } from '@/hooks/useFeedBlockHandlers';
import type { SectionDragHandle } from '@/hooks/useSectionSortable';
import { feedBlockTools } from '@/lib/feedBlockMenu';
import type { FeedBlockControls } from '@/lib/feedEditing';
import { sectionPhoto } from '@/lib/feedSectionBackground';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

type FeedBlockToolsProps = {
    section: InvitationSection;
    name: string;
    controls: FeedBlockControls;
    hasSettings: boolean;
    drag: SectionDragHandle;
    actions: FeedBlockToolActions;
    menuOpen: boolean;
    uploading: boolean;
};

// A module block's tools sit inside its card (FeedModuleBlock), 12 px from its edges. The block starts at the card's top:
// the card's own margin collapses out of it.
const MODULE_PLACE = 'inset-x-7 top-3';

// One block's tools (mockup 2026-11-24): the eye and the block's name on the left; the drag handle and the dropdown's
// chevron side by side on the right, ending on the content's right edge. Blocks move only by dragging (keyboard too: Space,
// arrows, Space). The cover shows no name, and a module block's card already does.
export function FeedBlockTools({ section, name, controls, hasSettings, drag, actions, menuOpen, uploading }: FeedBlockToolsProps) {
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

            {/* Drag and dropdown */}
            <div data-feed-block-tools-right className="pointer-events-auto flex shrink-0 gap-2">
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
                <FeedBlockMenu
                    tools={feedBlockTools(section, { hasSettings, canDelete: controls.canDelete })}
                    hasPhoto={sectionPhoto(section) !== undefined}
                    uploading={uploading}
                    open={menuOpen}
                    onOpenChange={on.setMenuOpen}
                    onSettings={on.openSettings}
                    onBackground={on.openBackground}
                    onPickPhoto={on.pickBackgroundPhoto}
                    onDelete={on.remove}
                />
            </div>
        </div>
    );
}
