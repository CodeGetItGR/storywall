'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

type DeleteSectionDialogProps = {
    open: boolean;
    // The section's name as the add list calls it.
    sectionName: string;
    onDelete: () => void;
    onCancel: () => void;
};

// Asks before a section is deleted.
export function DeleteSectionDialog({ open, sectionName, onDelete, onCancel }: DeleteSectionDialogProps) {
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
        />
    );
}
