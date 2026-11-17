'use client';

import { useTranslations } from 'next-intl';

import { CreateCoHostInvitationForm } from '@/components/manage/invitations/CreateCoHostInvitationForm';
import { Modal } from '@/components/ui/modal';

// Today's invite form, in a sheet instead of inline above the hosts.
export function InviteCoHostSheet({ eventId, open, onCloseAction }: { eventId: string; open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('ManagePage.invitations.coHosts');

    return (
        <Modal
            open={open}
            onClose={onCloseAction}
            closeLabel={t('cancel')}
            variant="sheet"
            size="md"
            showCloseButton={false}
            labelledBy="invite-co-host-title"
        >
            {/* Form */}
            <Modal.Body className="px-1 pt-2 pb-2">
                {open && <CreateCoHostInvitationForm eventId={eventId} onDoneAction={onCloseAction} />}
            </Modal.Body>
        </Modal>
    );
}
