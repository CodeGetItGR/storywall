'use client';

import { useTranslations } from 'next-intl';

import { RsvpForm } from '@/components/rsvp/RsvpForm';
import { RsvpHeader } from '@/components/rsvp/RsvpHeader';
import type { RsvpSubmitPageData } from '@/components/rsvp/RsvpSubmitPageContent';

export function RsvpSubmitFormContent({ data }: { data: RsvpSubmitPageData }) {
    const t = useTranslations('RSVPPage');

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader backHref={data.backHref} />

            <RsvpForm
                eventType={data.eventType}
                attending={data.attending}
                onAttend={data.onAttend}
                onDecline={data.onDecline}
                plusOnes={data.plusOnes}
                onIncrementPlusOnes={data.onIncrementPlusOnes}
                onDecrementPlusOnes={data.onDecrementPlusOnes}
                message={data.message}
                maxMessageLength={data.maxMessageLength}
                onMessageChange={data.onMessageChange}
                onSubmit={data.onSubmit}
                isSubmitting={data.isSubmitting}
                submitDisabled={!data.attending || !data.memberId || data.isSubmitting || !data.canSubmitRsvp}
                submitError={!data.canSubmitRsvp ? t('eventReadOnly') : data.submitErrorMessage}
                submitLabel={t('submitRsvp')}
            />
        </div>
    );
}
