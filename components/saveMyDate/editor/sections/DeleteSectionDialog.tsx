'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { ModalFinalFocus } from '@/components/ui/modal';

type DeleteSectionDialogProps = {
    open: boolean;
    // The section's name as the add list calls it.
    sectionName: string;
    onDelete: () => void;
    onCancel: () => void;
    // Where focus goes once the modal closes.
    finalFocus?: ModalFinalFocus;
};

// Asks before a section is deleted.
export function DeleteSectionDialog({ open, sectionName, onDelete, onCancel, finalFocus }: DeleteSectionDialogProps) {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <ConfirmActionModal
            open={open}
            title={t('deleteTitle')}
            body={t('deleteBody', { name: sectionName })}
            confirmLabel={t('deleteConfirm')}
            cancelLabel={t('deleteCancel')}
            onCloseAction={onCancel}
            onConfirmAction={onDelete}
            finalFocus={finalFocus}
        />
    );
}
