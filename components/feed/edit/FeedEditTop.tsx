'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import type { ReactNode, Ref } from 'react';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditInvitationSection } from '@/components/feed/edit/FeedEditInvitationSection';
import { FeedEditPills } from '@/components/feed/edit/FeedEditPills';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { feedLookParts } from '@/components/feed/layout/FeedLookTop';
import { FeedTopFrame, type FeedTopParts, type FeedTopProps, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';
import { SettingsPartEditor } from '@/components/manage/settings/SettingsPartEditor';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import { AddSectionSheet } from '@/components/saveMyDate/editor/sections/AddSectionSheet';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import { useSettingsPreview } from '@/hooks/useSettingsPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedBlockControls } from '@/lib/feedEditing';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { FeedSectionType, InvitationSection, SectionType } from '@/lib/invitation/sections';

const MODIFIERS = [restrictToVerticalAxis];

// cancelRef: the Cancel pill, which takes focus as edit mode opens.
type FeedEditTopProps = Omit<FeedTopProps, 'view'> & { event: EventDetailResponseDto; onDone: () => void; cancelRef?: Ref<HTMLButtonElement> };

// SectionType also holds the footer, which a feed never has.
type FeedNameKey = `sectionNames.${NewSectionType | FeedSectionType}`;
const nameKey = (type: SectionType) => `sectionNames.${type}` as FeedNameKey;

// The top of the feed in edit mode: the same frame as the feed, every block with its tools,
// Save my date text typed in place, and the Add section row closing the middle.
export function FeedEditTop({ event, onDone, cancelRef, cover, details, stories, description, rsvp }: FeedEditTopProps) {
    const t = useTranslations('InvitationEditor');
    const session = useFeedEditSession(event, onDone);
    const view = useFeedTop(event, session.document);
    const fonts = useInvitationFonts(true);
    const actions = useFeedBlockActions(session.store, session.document, event, session.leaveTo);
    const preview = useSettingsPreview(event, true, true);
    const sheet = useFeedBlockSheet(session.store, session.document, session.theme, session.media, fonts.data, preview.parts);
    const middleIds = view.frame.middle.map((section) => section.id);
    const drag = useSectionDrag(middleIds.length, actions.reorder);

    const tools: FeedBlockToolActions = {
        onToggleVisible: actions.toggleVisible,
        onMove: actions.move,
        onDelete: actions.askDelete,
        onOpenSettings: sheet.openFor,
    };
    const pills = (
        <FeedEditPills saving={session.saving} failed={session.failed} onCancel={session.cancel} onSave={session.save} cancelRef={cancelRef} />
    );

    const wrap = (section: InvitationSection, node: ReactNode) => (
        <FeedEditBlock
            key={section.id}
            section={section}
            name={t(nameKey(section.type))}
            controls={feedBlockControls(session.document.sections, section)}
            hasSettings={sheet.hasSettings(section)}
            actions={tools}
            active={sheet.section?.id === section.id}
            corner={section.type === 'feedCover' ? pills : undefined}
        >
            {node}
        </FeedEditBlock>
    );
    const base = view.look ? feedLookParts(view) : PLAIN_PARTS;
    const parts: FeedTopParts = {
        // The feed's own blocks are set on the event, not typed here: their content takes no taps.
        block: (section, content) => wrap(section, base.block(section, <div inert>{content}</div>)),
        native: base.native,
        // Save my date blocks read the text editor's drawing from inside InlineTextEditing, so their text is typed in place.
        invitation: (section) =>
            wrap(
                section,
                view.look ? (
                    <FeedEditInvitationSection section={section} index={view.sections.indexOf(section)} ctx={view.ctx} />
                ) : (
                    base.invitation(section)
                ),
            ),
    };

    const frame = (
        <FeedTopFrame
            view={view}
            parts={parts}
            cover={cover}
            details={details}
            stories={stories}
            description={description || <FeedBlockPlaceholder name={t('sectionNames.feedDescription')} />}
            rsvp={rsvp ?? <FeedBlockPlaceholder name={t('sectionNames.feedRsvp')} />}
            afterMiddle={
                actions.showAdd && (
                    <FeedNative className="font-sans">
                        <FeedAddSectionRow locked={actions.locked} canBuy={actions.canBuy} onAdd={actions.openAdd} />
                    </FeedNative>
                )
            }
        />
    );

    return (
        <InlineTextEditing store={session.store} document={session.document} theme={session.theme} uploadedFonts={fonts.data}>
            {/* Blocks */}
            <DndContext
                sensors={drag.sensors}
                collisionDetection={closestCenter}
                modifiers={MODIFIERS}
                accessibility={drag.accessibility}
                onDragEnd={drag.onDragEnd}
            >
                <SortableContext items={middleIds} strategy={verticalListSortingStrategy}>
                    {/* Its own stacking context: the tools stay under the feed's sticky header. */}
                    <div className="isolate">
                        {view.look ? (
                            <FeedLook ctx={view.ctx} lang={view.lang} fontFaces={view.fontFaces}>
                                {frame}
                            </FeedLook>
                        ) : (
                            frame
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Block settings */}
            <FeedBlockSheet
                title={sheet.section ? t(nameKey(sheet.section.type)) : ''}
                open={sheet.section !== null}
                scope={sheet.scope}
                groups={sheet.groups}
                parts={sheet.parts}
                partLabels={preview.labels}
                isDesktop={preview.isDesktop}
                onOpenPart={preview.openEditor}
                onClose={sheet.close}
            />
            <SettingsPartEditor
                event={event}
                part={preview.openPart}
                label={preview.openPart ? preview.labels[preview.openPart] : ''}
                isDesktop={false}
                canUploadCover={preview.canUploadCover}
                onCloseAction={preview.closeEditor}
            />

            {/* Add section */}
            <AddSectionSheet open={actions.adding} types={actions.addable} onAdd={actions.add} onClose={actions.closeAdd} />

            {/* Delete */}
            <DeleteSectionDialog
                open={actions.remove.isOpen}
                sectionName={actions.remove.sectionType ? t(nameKey(actions.remove.sectionType)) : ''}
                onDelete={actions.remove.confirm}
                onCancel={actions.remove.cancel}
                finalFocus={actions.remove.finalFocus}
            />

            {/* Leave with changes */}
            <EditorLeaveDialog open={session.leaving} onLeave={session.leave} onStay={session.stay} />

            {/* Saved elsewhere */}
            <EditorConflictDialog open={session.conflict} isReloading={session.reloading} onReload={session.reload} />
        </InlineTextEditing>
    );
}
