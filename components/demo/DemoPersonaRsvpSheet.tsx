'use client';

import { useTranslations } from 'next-intl';

import { RsvpForm } from '@/components/rsvp/RsvpForm';
import { Modal } from '@/components/ui/modal';
import { useDemoPersonaRsvp } from '@/hooks/useDemoPersonaRsvp';
import type { EventMemberResponseDto } from '@/lib/api/types';

// The guest RSVP form, filled in by the admin for a demo persona.
export function DemoPersonaRsvpSheet({ eventId, member, onCloseAction }: { eventId: string; member: EventMemberResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('DemoActAs');
    const tRsvp = useTranslations('RSVPPage');
    const form = useDemoPersonaRsvp({ eventId, member, onDoneAction: onCloseAction });

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="md" closeLabel={t('close')} ariaLabel={t('rsvpFor', { name: member.displayName })}>
            {/* Header */}
            <h2 className="px-5 pt-6 pr-12 text-lg font-semibold text-ink">{member.displayName}</h2>

            {/* Form */}
            <Modal.Body className="px-2 pb-[env(safe-area-inset-bottom)]">
                <RsvpForm
                    heading={t('rsvp')}
                    eventType={form.eventType}
                    attending={form.attending}
                    onAttend={form.onAttend}
                    onDecline={form.onDecline}
                    plusOnes={form.plusOnes}
                    onIncrementPlusOnes={form.onIncrementPlusOnes}
                    onDecrementPlusOnes={form.onDecrementPlusOnes}
                    sessionQuestions={form.sessionQuestions}
                    onSessionAnswer={form.onSessionAnswer}
                    message={form.message}
                    maxMessageLength={form.maxMessageLength}
                    onMessageChange={form.onMessageChange}
                    onSubmit={form.onSubmit}
                    isSubmitting={form.isSubmitting}
                    submitDisabled={!form.attending || form.isSubmitting || !form.canSubmitRsvp || form.hasUnansweredSessions}
                    submitError={!form.canSubmitRsvp ? tRsvp('eventReadOnly') : form.submitErrorMessage}
                    submitLabel={t('save')}
                />
            </Modal.Body>
        </Modal>
    );
}
