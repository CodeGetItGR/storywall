'use client';

import { useTranslations } from 'next-intl';

import { PublishAddonStep } from '@/components/saveMyDate/editor/publish/PublishAddonStep';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/modal';
import { useAddonSheetLock, useAddonStepFallback, useInvitationAddonCheckout, useInvitationAddonOffer } from '@/hooks/useInvitationAddonStep';
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
    // While payment is in flight the sheet can't be dismissed, Back included, so it can't close on a redirect.
    const lock = useAddonSheetLock(step.close);
    useAddonStepFallback(offer, step.fallBack, !lock.isPaying);

    return (
        <Modal
            open
            onClose={lock.close}
            variant="sheet"
            size="sm"
            ariaLabel={t('addOnTitle')}
            closeLabel={t('close')}
            closeDisabled={lock.isPaying}
        >
            <Modal.Body className="px-5 pt-5 pb-8 text-sm text-ink">
                {offer.step ? (
                    <>
                        {/* Choices and payment */}
                        <PublishAddonCheckout
                            eventId={eventId}
                            draftId={draftId}
                            addonStep={offer.step}
                            onCancel={step.close}
                            onPendingChange={lock.setIsPaying}
                        />
                    </>
                ) : (
                    <>
                        {/* Loading */}
                        {offer.isLoading && <LoadingState className="py-6" />}
                    </>
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
    onPendingChange,
}: {
    eventId: string;
    draftId: string;
    addonStep: InvitationAddonStep;
    onCancel: () => void;
    onPendingChange: (isPending: boolean) => void;
}) {
    const checkout = useInvitationAddonCheckout({ eventId, draftId, step: addonStep, onPendingChange });
    return <PublishAddonStep checkout={checkout} onCancel={onCancel} />;
}
