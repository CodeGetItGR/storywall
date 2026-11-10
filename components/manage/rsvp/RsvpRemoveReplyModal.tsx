'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { RsvpToRemove } from '@/hooks/useRsvpDuplicateActions';

type RsvpRemoveReplyModalProps = {
    toRemove: RsvpToRemove | null;
    isRemoving: boolean;
    onCancelAction: () => void;
    onConfirmAction: () => void | Promise<void>;
};

// Confirms deleting a reply for good.
export function RsvpRemoveReplyModal({ toRemove, isRemoving, onCancelAction, onConfirmAction }: RsvpRemoveReplyModalProps) {
    const t = useTranslations('ManagePage');

    return (
        <ConfirmActionModal
            open={toRemove !== null}
            title={t('rsvpDuplicate.removeTitle')}
            body={t('rsvpDuplicate.removeBody', { name: toRemove?.name ?? '' })}
            confirmLabel={t('rsvpDuplicate.removeConfirm')}
            cancelLabel={t('members.cancel')}
            onCloseAction={onCancelAction}
            onConfirmAction={onConfirmAction}
            isConfirming={isRemoving}
            icon={<Trash2 aria-hidden className="h-5 w-5" />}
        />
    );
}
