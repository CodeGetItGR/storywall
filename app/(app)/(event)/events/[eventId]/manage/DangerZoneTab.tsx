'use client';

import { useTranslations } from 'next-intl';

import { EventDangerZone } from '@/components/manage/danger/EventDangerZone';
import { EventDeleteConfirmModal } from '@/components/manage/danger/EventDeleteConfirmModal';
import { EventPendingDeletionBanner } from '@/components/manage/danger/EventPendingDeletionBanner';
import { EventRefundSection } from '@/components/manage/danger/EventRefundSection';
import { useEventDeletionFlow } from '@/hooks/useEventDeletionFlow';
import type { EventDetailResponseDto } from '@/lib/api/types';

export default function DangerZoneTab({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');
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
        <div className="flex flex-col gap-6">
            {/* Refund */}
            <section>
                <h3 className="mb-2 text-sm font-semibold text-ink">{t('sections.refund')}</h3>
                <EventRefundSection eventId={event.id} />
            </section>

            {/* Delete event */}
            <section>
                <h3 className="mb-2 text-sm font-semibold text-ink">{t('settings.dangerZone.delete')}</h3>
                <EventDangerZone onDeleteOpenAction={deletionFlow.openConfirm} disabled={deletionFlow.isDeleting} />
            </section>

            <EventDeleteConfirmModal
                open={deletionFlow.confirmOpen}
                password={deletionFlow.password}
                onPasswordChangeAction={deletionFlow.handlePasswordChange}
                passwordInvalid={deletionFlow.passwordInvalid}
                deleteError={deletionFlow.deleteError}
                isConfirming={deletionFlow.isDeleting}
                onCloseAction={deletionFlow.closeConfirm}
                onConfirmAction={deletionFlow.confirmDelete}
            />
        </div>
    );
}
