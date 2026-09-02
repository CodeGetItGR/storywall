'use client';

import { EventDangerZone } from '@/components/manage/settings/EventDangerZone';
import { EventDeleteConfirmModal } from '@/components/manage/settings/EventDeleteConfirmModal';
import { EventPendingDeletionBanner } from '@/components/manage/settings/EventPendingDeletionBanner';
import { useEventDeletionFlow } from '@/hooks/useEventDeletionFlow';
import type { EventDetailResponseDto } from '@/lib/api/types';

export default function DangerZoneTab({ event }: { event: EventDetailResponseDto }) {
    const deletionFlow = useEventDeletionFlow(event.id);

    if (event.deletionScheduledFor) {
        return (
            <EventPendingDeletionBanner
                deletionScheduledFor={event.deletionScheduledFor}
                onUndoAction={deletionFlow.undoDeletion}
                isUndoing={deletionFlow.isUndoing}
            />
        );
    }

    return (
        <>
            <EventDangerZone onDeleteOpenAction={deletionFlow.openConfirm} disabled={deletionFlow.isDeleting} />

            <EventDeleteConfirmModal
                eventId={event.id}
                open={deletionFlow.confirmOpen}
                password={deletionFlow.password}
                onPasswordChangeAction={deletionFlow.handlePasswordChange}
                passwordInvalid={deletionFlow.passwordInvalid}
                deleteError={deletionFlow.deleteError}
                isConfirming={deletionFlow.isDeleting}
                isRefundEligible={deletionFlow.isRefundEligible}
                onCloseAction={deletionFlow.closeConfirm}
                onConfirmAction={deletionFlow.confirmDelete}
            />
        </>
    );
}
