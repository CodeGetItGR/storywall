'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { type ReactNode, type Ref, useMemo } from 'react';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';
import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditBlockButtons } from '@/components/feed/edit/FeedEditBlockButtons';
import { FeedEditInvitationSection } from '@/components/feed/edit/FeedEditInvitationSection';
import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';
import { FeedThemeSheet } from '@/components/feed/edit/FeedThemeSheet';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { feedLookParts } from '@/components/feed/layout/FeedLookTop';
import { FeedTopFrame, type FeedTopParts, type FeedTopProps, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';
import { SettingsPartEditor } from '@/components/manage/settings/SettingsPartEditor';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { useFeedEditBlockTools } from '@/hooks/useFeedEditBlockTools';
import { useFeedEditPanels } from '@/hooks/useFeedEditPanels';
import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { useFeedEditThemeGrid } from '@/hooks/useFeedEditThemeGrid';
import { useEditPageTheme } from '@/hooks/useFeedPageTheme';
import { useFeedSectionPreviews } from '@/hooks/useFeedSectionPreviews';
import { useFeedTextPresets } from '@/hooks/useFeedTextPresets';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useFeedUploadedMedia } from '@/hooks/useFeedUploadedMedia';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import { useSettingsPreview } from '@/hooks/useSettingsPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { blockTextColor } from '@/lib/feedBlockEdits';
import { feedBlockControls } from '@/lib/feedEditing';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { type FeedSectionType, type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';

const MODIFIERS = [restrictToVerticalAxis];

// cancelRef: the Cancel pill, which takes focus as edit mode opens.
type FeedEditTopProps = Omit<FeedTopProps, 'view'> & { event: EventDetailResponseDto; onDone: () => void; cancelRef?: Ref<HTMLButtonElement> };

// SectionType also holds the footer, which a feed never has.
type FeedNameKey = `sectionNames.${NewSectionType | FeedSectionType}`;
const nameKey = (type: SectionType) => `sectionNames.${type}` as FeedNameKey;

// The top of the feed in edit mode: the same frame as the feed, Theme / Cancel / Save under the cover, every block
// with its tools, Save my date text typed in place, the Add section row closing the middle, and the Theme sheet. All
// held until Save.
export function FeedEditTop({ event, onDone, cancelRef, mode, modeSwitch, dateRow, cover, stories, description, rsvp }: FeedEditTopProps) {
    const t = useTranslations('InvitationEditor');
    const session = useFeedEditSession(event, onDone);
    // The saved layout's photos plus the ones the host uploads while editing.
    const uploads = useFeedUploadedMedia(session.media);
    const view = useFeedTop(event, { document: session.document, theme: session.theme, media: uploads.media });
    useEditPageTheme(event.id, session.wallTheme, session.background, view.backdrop);
    const fonts = useInvitationFonts(true);
    const textPresets = useFeedTextPresets(fonts.data);
    const hostOptions = useMemo(() => ({ rsvpMoves: view.rsvpMoves }), [view.rsvpMoves]);
    const actions = useFeedBlockActions(session.store, session.document, event, hostOptions);
    const sectionPreviews = useFeedSectionPreviews({
        types: actions.addable,
        themeSlug: session.themeSlug,
        document: session.document,
        theme: session.theme,
        media: uploads.media,
        eventType: event.eventType,
        enabled: actions.adding,
    });
    const preview = useSettingsPreview(event, true, true);
    const sheet = useFeedBlockSheet(session.store, session.document, session.theme, uploads.media, fonts.data, preview.parts);
    const panels = useFeedEditPanels(sheet.openFor, sheet.close, actions.openAdd);
    const themeGrid = useFeedEditThemeGrid(event, session);
    const middleIds = view.frame.middle.map((section) => section.id);
    const drag = useSectionDrag(middleIds.length, actions.reorder);
    const blockTools = useFeedEditBlockTools({
        eventId: event.id,
        store: session.store,
        document: session.document,
        ctx: view.ctx,
        remember: uploads.remember,
    });

    const tools: FeedBlockToolActions = {
        onToggleVisible: actions.toggleVisible,
        onDelete: actions.askDelete,
        onOpenSettings: panels.openSettings,
    };
    const editRow = (
        <FeedEditRow
            saving={session.saving}
            failed={session.failed}
            onTheme={panels.openTheme}
            onCancel={session.cancel}
            onSave={session.save}
            cancelRef={cancelRef}
        />
    );

    const wrap = (section: InvitationSection, node: ReactNode) => (
        <FeedEditBlock
            key={section.id}
            section={section}
            name={t(nameKey(section.type))}
            controls={feedBlockControls(session.document.sections, section, hostOptions)}
            hasSettings={sheet.hasSettings(section)}
            actions={tools}
            active={sheet.section?.id === section.id}
            buttons={
                !isFeedSectionType(section.type) && (
                    <FeedEditBlockButtons
                        sectionId={section.id}
                        color={blockTextColor(section, view.ctx)}
                        uploading={blockTools.uploadingId === section.id}
                        onPhoto={blockTools.addPhoto}
                        onColor={blockTools.setColor}
                    />
                )
            }
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
                    <FeedEditInvitationSection section={section} index={view.sections.indexOf(section)} ctx={blockTools.ctx} />
                ) : (
                    base.invitation(section)
                ),
            ),
    };

    const frame = (
        <FeedTopFrame
            view={view}
            mode={mode}
            modeSwitch={modeSwitch}
            editRow={editRow}
            dateRow={dateRow}
            parts={parts}
            cover={cover}
            stories={stories}
            description={description || <FeedBlockPlaceholder name={t('sectionNames.feedDescription')} />}
            rsvp={rsvp ?? <FeedBlockPlaceholder name={t('sectionNames.feedRsvp')} />}
            afterMiddle={
                // Feed mode's own list arrives with its sections (plan 8).
                actions.showAdd &&
                mode !== 'feed' && (
                    <FeedNative className="font-sans">
                        <FeedAddSectionRow onAdd={panels.openAdd} />
                    </FeedNative>
                )
            }
        />
    );

    return (
        <InlineTextEditing
            store={session.store}
            document={session.document}
            theme={session.theme}
            uploadedFonts={fonts.data}
            variant="feed"
            presets={textPresets.presets}
            onLinkAdded={panels.openSettings}
        >
            {/* The uploaded fonts the Style presets name */}
            {textPresets.fontFaces && <style>{textPresets.fontFaces}</style>}

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
                membersOnly={sheet.membersOnly}
                onMembersOnly={sheet.setMembersOnly}
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

            {/* Theme */}
            <FeedThemeSheet
                open={panels.themeOpen}
                isDesktop={preview.isDesktop}
                options={themeGrid.options}
                fontFaces={themeGrid.fontFaces}
                hasInvitationThemes={themeGrid.hasInvitationThemes}
                disabled={themeGrid.disabled}
                previewTitle={themeGrid.previewTitle}
                background={session.background}
                onSelect={themeGrid.select}
                onBackground={session.setBackground}
                onClose={panels.closeTheme}
            />

            {/* Add section */}
            <FeedAddSectionSheet open={actions.adding} previews={sectionPreviews} onAdd={actions.add} onClose={actions.closeAdd} />

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
