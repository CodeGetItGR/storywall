'use client';

import { useTranslations } from 'next-intl';

import { RsvpDeadlineField } from '@/components/manage/rsvp/RsvpDeadlineField';
import { Modal } from '@/components/ui/modal';

type RsvpDeadlineSheetProps = {
    eventId: string;
    rsvpDeadline: string | null;
    open: boolean;
    onCloseAction: () => void;
};

// Today's deadline field, opened from the deadline block's pencil.
export function RsvpDeadlineSheet({ eventId, rsvpDeadline, open, onCloseAction }: RsvpDeadlineSheetProps) {
    const t = useTranslations('ManagePage');

    return (
        <Modal open={open} onClose={onCloseAction} closeLabel={t('rsvpReport.close')} variant="sheet" size="sm" ariaLabel={t('rsvpStats.editDeadline')}>
            {/* Field */}
            <Modal.Body className="px-1 pt-2 pb-2">
                {open && <RsvpDeadlineField eventId={eventId} rsvpDeadline={rsvpDeadline} canWrite onSavedAction={onCloseAction} />}
            </Modal.Body>
        </Modal>
    );
}
