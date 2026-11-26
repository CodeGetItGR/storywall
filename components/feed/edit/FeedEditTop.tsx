'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { type ReactNode, type Ref, useCallback, useMemo } from 'react';

import { FeedAddBetween, FeedEditAddBetween } from '@/components/feed/edit/FeedAddBetween';
import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditInvitationSection } from '@/components/feed/edit/FeedEditInvitationSection';
import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';
import { FeedEditThemeSheet } from '@/components/feed/edit/FeedEditThemeSheet';
import { FeedPremiumTiles } from '@/components/feed/edit/FeedPremiumTiles';
import { feedPreviewParts } from '@/components/feed/edit/feedPreviewParts';
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
import { useFeedEditPreview } from '@/hooks/useFeedEditPreview';
import { useFeedEditSectionPart } from '@/hooks/useFeedEditSectionPart';
import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { useFeedInvitationAddItems } from '@/hooks/useFeedInvitationAddItems';
import { useFeedModeAddItems } from '@/hooks/useFeedModeAddItems';
import { useFeedModuleBlockPart } from '@/hooks/useFeedModuleBlockPart';
import { useFeedModuleTiles } from '@/hooks/useFeedModuleTiles';
import { useFeedOpenMenu } from '@/hooks/useFeedOpenMenu';
import { useEditPageTheme } from '@/hooks/useFeedPageTheme';
import { useFeedSectionContent } from '@/hooks/useFeedSectionContent';
import { useFeedSectionName } from '@/hooks/useFeedSectionName';
import { useFeedSectionPart } from '@/hooks/useFeedSectionPart';
import { useFeedSectionPreviews } from '@/hooks/useFeedSectionPreviews';
import { useFeedTextPresets } from '@/hooks/useFeedTextPresets';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useFeedUploadedMedia } from '@/hooks/useFeedUploadedMedia';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import { useSettingsPreview } from '@/hooks/useSettingsPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { draggableFeedBlocks, type FeedAddPlace, feedBlockControls, type FeedEditScope } from '@/lib/feedEditing';
import { moduleOfBlock } from '@/lib/feedModuleBlocks';
import { drawsCard, drawsScheduleCard } from '@/lib/feedSchedule';
import { feedImageUploader } from '@/lib/invitation/editorUploads';
import { type InvitationSection, isFeedModeSectionType } from '@/lib/invitation/sections';
import { themeColors } from '@/lib/invitation/textEditing';

const MODIFIERS = [restrictToVerticalAxis];

// The pieces a guest sees differently from the host editing.
export type FeedGuestParts = Pick<FeedTopProps, 'cover' | 'rsvp'>;

// scope: what may change (useFeedEditMode). guest: for the preview. cancelRef: the Cancel pill, which takes focus as
// edit mode opens.
type FeedEditTopProps = Omit<FeedTopProps, 'view' | 'editRow'> & {
    event: EventDetailResponseDto;
    scope: FeedEditScope;
    guest: FeedGuestParts;
    onDone: () => void;
    cancelRef?: Ref<HTMLButtonElement>;
};

// The top of the feed in edit mode: the same frame as the feed, Theme / Cancel / Save under the cover, every block
// with its tools, Save my date text typed in place, the Add section rows around the host's blocks, and the Theme sheet. All
// held until Save. Its eye shows it all as guests will see it, without the tools. Without Save my date only Feed mode's sections have tools: the rest draws as on the feed.
export function FeedEditTop({
    event,
    scope,
    guest,
    onDone,
    cancelRef,
    mode = 'single',
    modeSwitch,
    dateRow,
    cover,
    stories,
    description,
    rsvp,
}: FeedEditTopProps) {
    const t = useTranslations('InvitationEditor');
    const feedOnly = scope === 'feedSections';
    const { blockName } = useFeedSectionName(event.eventType);
    const session = useFeedEditSession(event, onDone);
    // The saved layout's photos plus the ones the host uploads while editing.
    const uploads = useFeedUploadedMedia(session.media);
    const sheetUploads = useMemo(() => ({ uploadImage: feedImageUploader(event.id), remember: uploads.remember }), [event.id, uploads.remember]);
    const { previewing, toggle: togglePreview } = useFeedEditPreview();
    const moduleBlock = useFeedModuleBlockPart(event, !previewing);
    const view = useFeedTop(event, {
        document: session.document,
        theme: session.theme,
        media: uploads.media,
        pageTone: session.pageTone,
        asGuest: previewing,
    });
    useEditPageTheme(event.id, session.wallTheme, session.background, view.backdrop);
    const fonts = useInvitationFonts(true);
    const textPresets = useFeedTextPresets(fonts.data);
    const hostOptions = useMemo(() => ({ rsvpMoves: view.rsvpMoves }), [view.rsvpMoves]);
    const actions = useFeedBlockActions(session.store, session.document, event, hostOptions);
    const addingInvitation = actions.adding?.kind === 'invitation';
    const addingFeed = actions.adding?.kind === 'feed';
    const sectionPreviews = useFeedSectionPreviews({
        types: actions.addable,
        themeSlug: session.themeSlug,
        document: session.document,
        theme: session.theme,
        media: uploads.media,
        eventType: event.eventType,
        enabled: addingInvitation,
    });
    const invitationItems = useFeedInvitationAddItems(sectionPreviews, event.eventType);
    const feedItems = useFeedModeAddItems(event, actions.addableFeed, uploads.media, addingFeed);
    const feedSection = useFeedEditSectionPart(event, uploads.media);
    const tiles = useFeedModuleTiles(session.document, event, addingInvitation);
    const preview = useSettingsPreview(event, true, true);
    const sheet = useFeedBlockSheet(session.store, session.document, session.theme, uploads.media, fonts.data, preview.parts, sheetUploads);
    const panels = useFeedEditPanels(sheet.openFor, sheet.close, actions.openAdd);
    const sortableIds = draggableFeedBlocks(view.frame, feedOnly ? 'feed' : mode).map((section) => section.id);
    const drag = useSectionDrag(sortableIds.length, actions.reorder);
    const blockTools = useFeedEditBlockTools({
        eventId: event.id,
        store: session.store,
        document: session.document,
        ctx: view.ctx,
        remember: uploads.remember,
    });
    const ownColors = useMemo(() => themeColors(session.theme), [session.theme]);
    const content = useFeedSectionContent(sheet.section, view.ctx, ownColors, blockTools);
    const menu = useFeedOpenMenu();
    // The preview hides every tool, so whatever is open closes first.
    const { closeAll } = panels;
    const { close: closeMenu } = menu;
    const onPreview = useCallback(() => {
        closeAll();
        closeMenu();
        togglePreview();
    }, [closeAll, closeMenu, togglePreview]);

    const tools: FeedBlockToolActions = {
        onToggleVisible: actions.toggleVisible,
        onDelete: actions.askDelete,
        onOpenSettings: panels.openSettings,
        onMenuOpenChange: menu.setOpen,
    };
    const editRow = (
        <FeedEditRow
            saving={session.saving}
            failed={session.failed}
            onTheme={feedOnly ? undefined : panels.openTheme}
            previewing={previewing}
            onPreview={onPreview}
            onCancel={session.cancel}
            onSave={session.save}
            cancelRef={cancelRef}
        />
    );

    const wrap = (section: InvitationSection, node: ReactNode) => (
        <FeedEditBlock
            key={section.id}
            section={section}
            name={blockName(section)}
            controls={feedBlockControls(view.sections, section, hostOptions)}
            // A module block has nothing to set: its tool is set on its own page.
            hasSettings={!moduleOfBlock(section) && sheet.hasSettings(section)}
            actions={tools}
            onCard={drawsCard(section, event)}
            active={sheet.section?.id === section.id}
            menuOpen={menu.openId === section.id}
            uploading={blockTools.uploadingId === section.id}
        >
            {node}
        </FeedEditBlock>
    );
    // "+ Add section" after each of the host's blocks; none at the section limit.
    const { openAdd } = panels;
    const addRow = useCallback(
        (place: FeedAddPlace) => (
            <FeedNative className="font-sans">
                <FeedEditAddBetween place={place} onOpen={openAdd} />
            </FeedNative>
        ),
        [openAdd],
    );
    const base = view.look ? feedLookParts(view) : PLAIN_PARTS;
    const editParts: FeedTopParts = {
        // The feed's own blocks are set on the event, not typed here: their content takes no taps, but for the empty schedule's
        // button to its editor (leaving with changes asks first).
        block: (section, content) => {
            const block = base.block(section, <div inert={!drawsScheduleCard(section, event)}>{content}</div>);
            return feedOnly ? block : wrap(section, block);
        },
        native: base.native,
        // Feed mode's sections draw their live content; a tap opens their settings, as on every block. It starts
        // well below the section's tools.
        feed: (section, content) =>
            wrap(
                section,
                base.feed(
                    section,
                    drawsScheduleCard(section, event) ? (
                        content
                    ) : (
                        <div inert className="pt-15">
                            {content}
                        </div>
                    ),
                ),
            ),
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

    const guestFeedSection = useFeedSectionPart(event, uploads.media, true);
    // The description starts 24 px down on the feed and a placeholder 12: the rest is room for their tools (FEED_TOOLS_ROOM).
    const placeholder = (name: string) => (
        <div className="pt-15">
            <FeedBlockPlaceholder name={name} />
        </div>
    );
    const editedDescription = description ? <div className="pt-12">{description}</div> : placeholder(t('sectionNames.feedDescription'));
    const shownDescription = feedOnly ? description : editedDescription;

    const guestPieces: Partial<FeedTopProps> = { ...guest, description, feedSection: guestFeedSection, between: undefined, afterFeed: undefined };

    const frame = (
        <FeedTopFrame
            view={view}
            mode={mode}
            modeSwitch={modeSwitch}
            editRow={editRow}
            dateRow={dateRow}
            parts={previewing ? feedPreviewParts(base) : editParts}
            cover={cover}
            stories={stories}
            description={shownDescription}
            rsvp={rsvp ?? (feedOnly ? null : placeholder(t('sectionNames.feedRsvp')))}
            moduleBlock={moduleBlock}
            between={actions.showAdd && !feedOnly ? addRow : undefined}
            feedSection={feedSection}
            afterFeed={
                actions.showAddFeed && (
                    <FeedNative className="font-sans">
                        <FeedAddBetween onAdd={panels.openAddFeed} />
                    </FeedNative>
                )
            }
            {...(previewing ? guestPieces : undefined)}
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
            paused={previewing}
        >
            {/* The uploaded fonts the Style presets name */}
            {textPresets.fontFaces && <style>{textPresets.fontFaces}</style>}

            {/* Blocks */}
            <DndContext
                sensors={drag.sensors}
                collisionDetection={closestCenter}
                modifiers={MODIFIERS}
                accessibility={drag.accessibility}
                onDragStart={menu.close}
                onDragEnd={drag.onDragEnd}
            >
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
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
                title={sheet.section ? blockName(sheet.section) : ''}
                open={sheet.section !== null}
                scope={sheet.scope}
                groups={sheet.groups}
                parts={sheet.parts}
                partLabels={preview.labels}
                isDesktop={preview.isDesktop}
                membersOnly={sheet.membersOnly}
                onMembersOnly={sheet.setMembersOnly}
                promptText={sheet.promptText}
                onPromptText={sheet.setPromptText}
                pinned={sheet.pinned}
                pinnedUploading={sheet.pinnedUploading}
                media={uploads.media}
                content={content}
                onAddPinned={sheet.addPinned}
                onRemovePinned={sheet.removePinned}
                onMovePinned={sheet.movePinned}
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
            {!feedOnly && (
                <FeedEditThemeSheet
                    event={event}
                    session={session}
                    open={panels.themeOpen}
                    isDesktop={preview.isDesktop}
                    onClose={panels.closeTheme}
                />
            )}

            {/* Add section: the invitation's, then Feed mode's own */}
            <FeedAddSectionSheet
                kind="invitation"
                open={addingInvitation}
                items={invitationItems}
                tiles={
                    tiles.length > 0 && <FeedPremiumTiles tiles={tiles} eventId={event.id} eventType={event.eventType} onAdd={actions.addModule} />
                }
                onAdd={actions.add}
                onClose={actions.closeAdd}
            />
            <FeedAddSectionSheet kind="feed" open={addingFeed} items={feedItems} tiles={null} onAdd={actions.add} onClose={actions.closeAdd} />

            {/* Delete */}
            <DeleteSectionDialog
                open={actions.remove.isOpen}
                sectionName={actions.remove.section ? blockName(actions.remove.section) : ''}
                fromFeed={actions.remove.section !== null && isFeedModeSectionType(actions.remove.section.type)}
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
