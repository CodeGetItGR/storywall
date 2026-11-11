'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { CreateEventWizardMessages } from '@/components/event/create/wizard/CreateEventWizardMessages';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { Modal } from '@/components/ui/modal';
import { useCreateEventRun } from '@/hooks/useCreateEventRun';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

// The wizard over the current page: full screen on phones, a centred window from md up. Its open
// state is the URL (?create=1), so Back steps through the wizard and out of it; Esc, the X and the
// backdrop call onClose. dismissOnBack is off: the URL already does that job.
export default function CreateEventDialog({ onClose }: { onClose: () => void }) {
    return (
        <Modal
            open
            onClose={onClose}
            size="full"
            dismissOnBack={false}
            showCloseButton={false}
            labelledBy={CREATE_EVENT_WIZARD_HEADING_ID}
            className="bg-white md:top-1/2 md:left-1/2 md:h-[min(90vh,52rem)] md:max-h-[90vh] md:w-110 md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-3xl"
        >
            {/* Wizard */}
            <CreateEventWizardMessages>
                <CreateEventDialogBody onClose={onClose} />
            </CreateEventWizardMessages>
        </Modal>
    );
}

function CreateEventDialogBody({ onClose }: { onClose: () => void }) {
    const t = useTranslations('CreateEventPage.wizard');
    const run = useCreateEventRun('wizard');

    if (!run.isReady) return <AuthLoadingState />;
    return (
        <CreateEventFormProvider mode="wizard">
            <CreateEventWizard
                leading={
                    <button
                        type="button"
                        aria-label={t('close')}
                        onClick={onClose}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-muted"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                }
            />
        </CreateEventFormProvider>
    );
}
