'use client';

import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';

import { FeedBlockButtons } from '@/components/feed/edit/FeedBlockButtons';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { blockTextColor } from '@/lib/feedBlockEdits';
import type { FeedEditBannerBlock as Block } from '@/lib/feedEditBannerLook';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { RenderContext } from '@/lib/invitation/render';
import { isFeedSectionType, type SectionType } from '@/lib/invitation/sections';

// The picture takes no taps: every tool is drawn, none does anything.
const NOTHING = () => undefined;
const TOOLS: FeedBlockToolActions = { onToggleVisible: NOTHING, onDelete: NOTHING, onOpenSettings: NOTHING };
const CONTROLS: FeedBlockControls = { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true };

type NameKey = `sectionNames.${Exclude<SectionType, 'footer'>}`;

// The banner picture's one section as the feed draws it while editing: its outline and its tools. ctx: a Save my date
// look, where the section draws itself and gets the photo and colour buttons; without it, the feed's own block by name.
export function FeedEditBannerBlock({ block: { section, index }, ctx }: { block: Block; ctx?: RenderContext }) {
    const t = useTranslations('InvitationEditor');
    const name = t(`sectionNames.${section.type}` as NameKey);
    const drawn = ctx && !isFeedSectionType(section.type) ? ctx : null;

    return (
        <DndContext>
            <SortableContext items={[section.id]}>
                <FeedEditBlock
                    section={section}
                    name={name}
                    controls={CONTROLS}
                    hasSettings
                    actions={TOOLS}
                    active
                    buttons={
                        drawn && <FeedBlockButtons color={blockTextColor(section, drawn)} uploading={false} onPhoto={NOTHING} onColor={NOTHING} />
                    }
                >
                    {drawn ? (
                        <InvitationSection section={section} index={index} ctx={drawn} />
                    ) : (
                        // Tall enough for the tools stacked at its right
                        <div className="min-h-40">
                            <FeedBlockPlaceholder name={name} />
                        </div>
                    )}
                </FeedEditBlock>
            </SortableContext>
        </DndContext>
    );
}
