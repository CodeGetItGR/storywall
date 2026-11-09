'use client';

import './textEditing.css';

import { useTranslations } from 'next-intl';
import { type ReactNode, useRef } from 'react';

import { EditableText } from '@/components/saveMyDate/editor/text/EditableText';
import { TextEditingContext } from '@/components/saveMyDate/editor/text/TextEditingContext';
import { TextToolbar } from '@/components/saveMyDate/editor/text/TextToolbar';
import type { InvitationTextProps } from '@/components/saveMyDate/invitation/InvitationText';
import { EditableTextContext } from '@/components/saveMyDate/invitation/InvitationText';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeactivateOnOutsideTap } from '@/hooks/useDeactivateOnOutsideTap';
import { useInlineTextEdit } from '@/hooks/useInlineTextEdit';
import { useTextToolbar } from '@/hooks/useTextToolbar';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type InlineTextEditingProps = {
    store: InvitationEditorStore;
    document: InvitationDocument;
    theme: ThemeDesign;
    uploadedFonts?: InvitationFontDto[];
    // The canvas: every text in it becomes editable in place.
    children: ReactNode;
};

const renderEditableText = (props: InvitationTextProps) => <EditableText {...props} />;

// Typing straight into the invitation, with the text toolbar for the text being edited.
export function InlineTextEditing({ store, document, theme, uploadedFonts, children }: InlineTextEditingProps) {
    const t = useTranslations('InvitationEditor');
    const edit = useInlineTextEdit(store, document);
    const toolbar = useTextToolbar(edit, document, theme, uploadedFonts);
    const root = useRef<HTMLDivElement>(null);
    useDeactivateOnOutsideTap(root, edit.active !== null, edit.deactivate);

    return (
        <TextEditingContext.Provider value={edit}>
            {/* Canvas */}
            <EditableTextContext.Provider value={renderEditableText}>
                <div ref={root} className="smd-text-editing contents">
                    {children}
                </div>
            </EditableTextContext.Provider>

            {/* Text toolbar */}
            {edit.active && <TextToolbar toolbar={toolbar} anchor={edit.element} canAdd={edit.canAddText} onDelete={edit.requestDelete} />}

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
