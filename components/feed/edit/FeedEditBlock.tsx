'use client';

import '@/components/saveMyDate/editor/editor.css';

import type { ReactNode } from 'react';

import { FeedBlockTools } from '@/components/feed/edit/FeedBlockTools';
import { FeedNative } from '@/components/feed/layout/FeedLook';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { useFeedBlockTap } from '@/hooks/useFeedBlockTap';
import { useSectionSortable } from '@/hooks/useSectionSortable';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

type FeedEditBlockProps = {
    section: InvitationSection;
    name: string;
    controls: FeedBlockControls;
    hasSettings: boolean;
    actions: FeedBlockToolActions;
    // Its settings are open: the wash stays on.
    active?: boolean;
    menuOpen?: boolean;
    // One of its photos is on its way.
    uploading?: boolean;
    children: ReactNode;
};

// One block of the feed while editing: dimmed when hidden, with its tools floating over its top.
// Tapping it opens its settings; while they are open it keeps a faint coral wash (fainter on hover), under the tools.
// Only middle blocks drag; the rest pass locked to the sortable, so they stay put.
export function FeedEditBlock({ section, name, controls, hasSettings, actions, active = false, menuOpen = false, uploading = false, children }: FeedEditBlockProps) {
    const { setNodeRef, style, isDragging, drag } = useSectionSortable(section.id, name, !controls.movable);
    const onTap = useFeedBlockTap(section.id, hasSettings, actions.onOpenSettings);

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-editor-section={section.id}
            role="group"
            aria-label={name}
            aria-current={active || undefined}
            // Not a tab stop, but takes focus after the block next to it is deleted.
            tabIndex={-1}
            onClick={onTap}
            className={cn(
                'smd-editor relative rounded-[14px] outline-primary focus-visible:outline-2 focus-visible:-outline-offset-2',
                'after:pointer-events-none after:absolute after:inset-1.5 after:z-30 after:rounded-[14px]',
                active ? 'after:bg-primary/8' : 'hover:after:bg-primary/4',
                isDragging && 'z-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)]',
            )}
        >
            {/* Block: the tools float over its top; its content makes room for them while editing (FEED_TOOLS_ROOM) */}
            <div className={cn('min-h-14', !section.visible && 'opacity-[0.48]')}>{children}</div>

            {/* Editing tools: the app's own look, not the theme's (FeedNative undoes the invitation's element styles) */}
            <FeedNative className="contents font-sans">
                {/* Tools */}
                <FeedBlockTools
                    section={section}
                    name={name}
                    controls={controls}
                    hasSettings={hasSettings}
                    drag={drag}
                    actions={actions}
                    menuOpen={menuOpen}
                    uploading={uploading}
                />
            </FeedNative>
        </div>
    );
}
