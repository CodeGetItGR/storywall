'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention } from '@/lib/api/types';

type AttendingStatus = 'attending' | 'not-attending';

export function RsvpSubmittedView({
    eventType,
    attending,
    onBackToWallAction,
}: {
    eventType: EventTypeConvention | null;
    attending: AttendingStatus | null;
    onBackToWallAction: () => void;
}) {
    const t = useTranslations('RSVPPage');
    const voice = useEventTypeVoice(eventType);

    return (
        <ToolEmptyState
            title={attending === 'attending' ? t('onTheList') : t('rsvpReceived')}
            body={attending === 'attending' ? voice.rsvpAttendingConfirmation : t('declinedConfirmation')}
            icon={CheckCircle2}
            className="flex min-h-[calc(100dvh-10rem)] flex-col justify-center pt-16"
            action={
                <button
                    onClick={onBackToWallAction}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-brand px-8 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,122,89,0.28)] hover:opacity-90 transition-opacity"
                >
                    {t('backToTheWall')}
                </button>
            }
        />
    );
}
