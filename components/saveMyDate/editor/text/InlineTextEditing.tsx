'use client';

import './textEditing.css';

import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useRef } from 'react';

import { EditableText } from '@/components/saveMyDate/editor/text/EditableText';
import { EditableTextContext } from '@/components/saveMyDate/editor/text/EditableTextContext';
import { FeedTextToolbar } from '@/components/saveMyDate/editor/text/FeedTextToolbar';
import { TextEditingContext } from '@/components/saveMyDate/editor/text/TextEditingContext';
import { TextToolbar } from '@/components/saveMyDate/editor/text/TextToolbar';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeactivateOnOutsideTap } from '@/hooks/useDeactivateOnOutsideTap';
import { useInlineTextEdit } from '@/hooks/useInlineTextEdit';
import { useTextToolbar } from '@/hooks/useTextToolbar';
import type { TextStylePresetDto } from '@/lib/api/types';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { EventFieldLinks } from '@/lib/invitation/eventData';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import type { InvitationTextProps } from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type InlineTextEditingProps = {
    store: InvitationEditorStore;
    document: InvitationDocument;
    theme: ThemeDesign;
    uploadedFonts?: InvitationFontDto[];
    // What the event fills, which the host changes on the event (KAN-84); null on no event.
    event?: InvitationEventData | null;
    fieldLinks?: EventFieldLinks | null;
    // 'feed': the feed's toolbar (FeedTextToolbar) instead of the invitation editor's.
    variant?: 'invitation' | 'feed';
    // The feed's Style presets.
    presets?: TextStylePresetDto[];
    // The feed: after Link adds a link to a block, open that block's settings.
    onLinkAdded?: (sectionId: string) => void;
    // The canvas: every text in it becomes editable in place.
    children: ReactNode;
};

const renderEditableText = (props: InvitationTextProps) => <EditableText {...props} />;
const NO_PRESETS: TextStylePresetDto[] = [];

// Typing straight into the invitation, with the text toolbar for the text being edited.
export function InlineTextEditing({
    store,
    document,
    theme,
    uploadedFonts,
    event = null,
    fieldLinks = null,
    variant = 'invitation',
    presets,
    onLinkAdded,
    children,
}: InlineTextEditingProps) {
    const t = useTranslations('InvitationEditor');
    const edit = useInlineTextEdit(store, document, event);
    const toolbar = useTextToolbar(edit, document, theme, uploadedFonts, fieldLinks);
    const root = useRef<HTMLDivElement>(null);
    useDeactivateOnOutsideTap(root, edit.active !== null, edit.deactivate);
    const { addLink } = edit;
    const addLinkAndOpen = useCallback(() => {
        const sectionId = addLink();
        if (sectionId) onLinkAdded?.(sectionId);
    }, [addLink, onLinkAdded]);

    return (
        <TextEditingContext.Provider value={edit}>
            {/* Canvas */}
            <EditableTextContext.Provider value={renderEditableText}>
                <div ref={root} className="smd-text-editing contents">
                    {children}
                </div>
            </EditableTextContext.Provider>

            {/* Text toolbar */}
            {edit.active &&
                (variant === 'feed' ? (
                    <FeedTextToolbar
                        toolbar={toolbar}
                        anchor={edit.element}
                        canAdd={edit.canAddText}
                        presets={presets ?? NO_PRESETS}
                        text={edit.snapshot?.text ?? ''}
                        onPreset={toolbar.applyPreset}
                        onAddLink={addLinkAndOpen}
                        onDelete={edit.requestDelete}
                        toolbarRef={edit.toolbarRef}
                        onKeyDown={edit.onToolbarKeyDown}
                    />
                ) : (
                    <TextToolbar
                        toolbar={toolbar}
                        anchor={edit.element}
                        canAdd={edit.canAddText}
                        onDelete={edit.requestDelete}
                        toolbarRef={edit.toolbarRef}
                        onKeyDown={edit.onToolbarKeyDown}
                    />
                ))}

            {/* Delete a section's own text */}
            <ConfirmActionModal
                open={edit.isConfirmingDelete}
                title={t('deleteTextTitle')}
                body={null}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                onCloseAction={edit.cancelDelete}
                onConfirmAction={edit.confirmDelete}
            />
        </TextEditingContext.Provider>
    );
}
