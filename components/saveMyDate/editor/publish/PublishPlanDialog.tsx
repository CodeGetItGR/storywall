'use client';

import { CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { PlanPrompt } from '@/hooks/usePublishInvitation';

type PublishPlanDialogProps = {
    prompt: PlanPrompt | null;
    onSeePlan: () => void;
    onClose: () => void;
};

// Publishing needs the event's plan to include the invitation and still run: this sends the host to it.
export function PublishPlanDialog({ prompt, onSeePlan, onClose }: PublishPlanDialogProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <ConfirmActionModal
            open={prompt !== null}
            title={prompt === 'coverage-ended' ? t('planEndedTitle') : t('planMissingTitle')}
            body={null}
            confirmLabel={t('seePlan')}
            cancelLabel={t('notNow')}
            onCloseAction={onClose}
            onConfirmAction={onSeePlan}
            tone="default"
            icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
            iconTone="neutral"
        />
    );
}
