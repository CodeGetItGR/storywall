'use client';

import { useTranslations } from 'next-intl';

import { PublishAddonStep } from '@/components/saveMyDate/editor/publish/PublishAddonStep';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/modal';
import { useInvitationAddonCheckout, useInvitationAddonOffer } from '@/hooks/useInvitationAddonStep';
import type { PublishAddonStepState } from '@/hooks/usePublishInvitation';
import type { InvitationAddonStep } from '@/lib/invitation/addonStep';
import type { InvitationDocument } from '@/lib/invitation/document';

type PublishAddonSheetProps = {
    step: PublishAddonStepState;
    draftId: string;
    document: InvitationDocument;
};

// Publish on an event whose plan lacks the invitation but sells it as an add-on (KAN-82).
// Mounted only while open, so each opening starts from the event's current add-ons.
export function PublishAddonSheet({ step, draftId, document }: PublishAddonSheetProps) {
    return step.open && step.eventId ? <OpenPublishAddonSheet step={step} eventId={step.eventId} draftId={draftId} document={document} /> : null;
}

function OpenPublishAddonSheet({ step, eventId, draftId, document }: PublishAddonSheetProps & { eventId: string }) {
    const t = useTranslations('InvitationEditor');
    const offer = useInvitationAddonOffer({ eventId, document });

    return (
        <Modal open onClose={step.close} variant="sheet" size="sm" ariaLabel={t('addOnTitle')} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-8 text-sm text-ink">
                {offer.step ? (
                    <PublishAddonCheckout eventId={eventId} draftId={draftId} addonStep={offer.step} onCancel={step.close} />
                ) : (
                    offer.isLoading && <LoadingState className="py-6" />
                )}
            </Modal.Body>
        </Modal>
    );
}

function PublishAddonCheckout({
    eventId,
    draftId,
    addonStep,
    onCancel,
}: {
    eventId: string;
    draftId: string;
    addonStep: InvitationAddonStep;
    onCancel: () => void;
}) {
    const checkout = useInvitationAddonCheckout({ eventId, draftId, step: addonStep });
    return <PublishAddonStep checkout={checkout} onCancel={onCancel} />;
}
