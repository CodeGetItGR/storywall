'use client';

import { useTranslations } from 'next-intl';

import { PublishEventChoice } from '@/components/saveMyDate/editor/publish/PublishEventChoice';
import { PublishPlanStep } from '@/components/saveMyDate/editor/publish/PublishPlanStep';
import { Modal } from '@/components/ui/modal';
import { useInvitationEventStep } from '@/hooks/useInvitationEventStep';
import type { PublishEventStepState } from '@/hooks/usePublishInvitation';
import type { InvitationDocument } from '@/lib/invitation/document';

type PublishEventSheetProps = {
    step: PublishEventStepState;
    draftId: string;
    eventType: string;
    document: InvitationDocument;
};

// Publishing a draft on no event: one of the host's events, or a new one made from the invitation.
// Mounted only while open, so the host's events and the plans load when they are needed, and the
// step starts over each time.
export function PublishEventSheet(props: PublishEventSheetProps) {
    return props.step.open ? <OpenPublishEventSheet {...props} /> : null;
}

function OpenPublishEventSheet({ step, draftId, eventType, document }: PublishEventSheetProps) {
    const t = useTranslations('InvitationEditor');
    const eventStep = useInvitationEventStep({ draftId, eventType, document, open: true, onAttached: step.onAttached });
    const isBusy = eventStep.checkout.isPending || eventStep.choice.choosingId !== null;

    return (
        <Modal
            open
            onClose={step.close}
            variant="sheet"
            size={eventStep.showsChoice ? 'sm' : 'lg'}
            ariaLabel={eventStep.showsChoice ? t('chooseEvent') : t('choosePlan')}
            closeLabel={t('close')}
            closeDisabled={isBusy}
        >
            <Modal.Body className="px-5 pt-5 pb-8 text-sm text-ink">
                {eventStep.showsChoice ? (
                    <PublishEventChoice choice={eventStep.choice} onNew={eventStep.startNew} />
                ) : (
                    <PublishPlanStep checkout={eventStep.checkout} onBack={eventStep.backToChoice} onCancel={step.close} />
                )}
            </Modal.Body>
        </Modal>
    );
}
