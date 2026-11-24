'use client';

import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';

import { FeedBlockButtons } from '@/components/feed/edit/FeedBlockButtons';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';
import { FeedNative } from '@/components/feed/layout/FeedLook';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { blockTextColor } from '@/lib/feedBlockEdits';
import type { FeedEditBannerBlock } from '@/lib/feedEditBannerLook';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { RenderContext } from '@/lib/invitation/render';
import { isFeedSectionType, type SectionType } from '@/lib/invitation/sections';

// The picture takes no taps: every tool is drawn, none does anything.
const NOTHING = () => undefined;
const TOOLS: FeedBlockToolActions = { onToggleVisible: NOTHING, onDelete: NOTHING, onOpenSettings: NOTHING };
const CONTROLS: FeedBlockControls = { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true };

type NameKey = `sectionNames.${Exclude<SectionType, 'footer'>}`;

// The banner picture's edit mode under the cover: Theme / Cancel / Save, then two sections with their tools, as the
// feed draws them while editing. ctx: a Save my date look, whose sections draw themselves and get the photo and colour
// buttons; without it, no Theme button.
export function FeedEditBannerBlocks({ blocks, ctx }: { blocks: FeedEditBannerBlock[]; ctx?: RenderContext }) {
    const t = useTranslations('InvitationEditor');
    const ids = blocks.map((block) => block.section.id);

    return (
        <>
            {/* Theme, Cancel and Save */}
            <FeedNative className="font-sans">
                <FeedEditRow saving={false} failed={false} onTheme={ctx ? NOTHING : undefined} onCancel={NOTHING} onSave={NOTHING} />
            </FeedNative>

            {/* Sections with their tools */}
            <DndContext>
                <SortableContext items={ids}>
                    <div className="isolate mt-3">
                        {blocks.map(({ section, index }) => {
                            // A Save my date section draws itself; the feed's own blocks are drawn by their names.
                            const drawn = ctx && !isFeedSectionType(section.type) ? ctx : null;
                            return (
                                <FeedEditBlock
                                    key={section.id}
                                    section={section}
                                    name={t(`sectionNames.${section.type}` as NameKey)}
                                    controls={CONTROLS}
                                    hasSettings
                                    actions={TOOLS}
                                    buttons={
                                        drawn && (
                                            <FeedBlockButtons
                                                color={blockTextColor(section, drawn)}
                                                uploading={false}
                                                onPhoto={NOTHING}
                                                onColor={NOTHING}
                                            />
                                        )
                                    }
                                >
                                    {drawn ? (
                                        <InvitationSection section={section} index={index} ctx={drawn} />
                                    ) : (
                                        // Tall enough for the tools stacked at its right
                                        <div className="min-h-40">
                                            <FeedBlockPlaceholder name={t(`sectionNames.${section.type}` as NameKey)} />
                                        </div>
                                    )}
                                </FeedEditBlock>
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>
        </>
    );
}
