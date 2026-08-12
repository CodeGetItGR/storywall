'use client';

import { useTranslations } from 'next-intl';

import { RsvpForm, RsvpHeader, RsvpSubmittedView } from '@/components/rsvp';
import type { useRsvpSubmitPageData } from '@/hooks/useRsvpSubmitPageData';

type RsvpSubmitPageData = ReturnType<typeof useRsvpSubmitPageData>;

export function RsvpSubmitPageContent({ data }: { data: RsvpSubmitPageData }) {
    if (data.submitted) {
        return <RsvpSubmittedContent data={data} />;
    }

    return <RsvpSubmitFormContent data={data} />;
}

function RsvpSubmittedContent({ data }: { data: RsvpSubmitPageData }) {
    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader onGoBack={data.onGoBack} />
            <RsvpSubmittedView attending={data.attending} onBackToWall={data.onBackToWall} />
        </div>
    );
}

function RsvpSubmitFormContent({ data }: { data: RsvpSubmitPageData }) {
    const t = useTranslations('RSVPPage');

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <RsvpHeader onGoBack={data.onGoBack} />

            <RsvpForm
                attending={data.attending}
                onAttend={data.onAttend}
                onDecline={data.onDecline}
                plusOnes={data.plusOnes}
                onIncrementPlusOnes={data.onIncrementPlusOnes}
                onDecrementPlusOnes={data.onDecrementPlusOnes}
                message={data.message}
                onMessageChange={data.onMessageChange}
                onSubmit={data.onSubmit}
                submitDisabled={!data.attending || !data.memberId || data.isSubmitting || !data.canSubmitRsvp}
                submitError={!data.canSubmitRsvp ? t('eventReadOnly') : data.submitErrorMessage}
            />
        </div>
    );
}
