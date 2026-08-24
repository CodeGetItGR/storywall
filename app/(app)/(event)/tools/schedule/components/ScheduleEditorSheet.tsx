'use client';

import { useTranslations } from 'next-intl';

import { ScheduleEditorForm, type ScheduleSessionMutator } from '@/app/(app)/(event)/tools/schedule/components/ScheduleEditorForm';
import { Modal } from '@/components/ui/modal';
import type { EventSessionResponseDto, EventStatus } from '@/lib/api/types';

interface ScheduleEditorSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: string;
    eventStatus: EventStatus;
    sessions: EventSessionResponseDto[];
    editingSession: EventSessionResponseDto | null;
    defaultStartAt: string;
    createSession: ScheduleSessionMutator;
    updateSession: ScheduleSessionMutator;
}

export function ScheduleEditorSheet({
    open,
    onOpenChange,
    eventId,
    eventStatus,
    sessions,
    editingSession,
    defaultStartAt,
    createSession,
    updateSession,
}: ScheduleEditorSheetProps) {
    const t = useTranslations('SchedulePage');

    function handleClose() {
        onOpenChange(false);
    }

    const sheetKey = `${editingSession?.id ?? 'new'}-${defaultStartAt}`;

    return (
        <Modal open={open} onClose={handleClose} size="md" variant="sheet" closeLabel={t('host.cancelEdit')} className="sm:max-w-2xl">
            {open && (
                <ScheduleEditorForm
                    key={sheetKey}
                    eventId={eventId}
                    eventStatus={eventStatus}
                    sessions={sessions}
                    editingSession={editingSession}
                    defaultStartAt={defaultStartAt}
                    createSession={createSession}
                    updateSession={updateSession}
                    onClose={handleClose}
                />
            )}
        </Modal>
    );
}
