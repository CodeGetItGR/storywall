'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention } from '@/lib/api/types';

type AttendingStatus = 'attending' | 'not-attending';

export function RsvpSubmittedView({
    eventType,
    attending,
    onBackToWall,
}: {
    eventType: EventTypeConvention | null;
    attending: AttendingStatus | null;
    onBackToWall: () => void;
}) {
    const t = useTranslations('RSVPPage');
    const voice = useEventTypeVoice(eventType);

    return (
        <div className="flex flex-col items-center text-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">{attending === 'attending' ? t('onTheList') : t('rsvpReceived')}</h2>
            <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
                {attending === 'attending' ? voice.rsvpAttendingConfirmation : t('declinedConfirmation')}
            </p>
            <button
                onClick={onBackToWall}
                className="mt-8 px-8 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
                {t('backToTheWall')}
            </button>
        </div>
    );
}
