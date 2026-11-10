'use client';

import { useTranslations } from 'next-intl';

import { CreateEventRouteState } from '@/components/event/create/CreateEventRouteState';
import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { BackButton } from '@/components/ui/BackButton';
import { useCreateEventRun } from '@/hooks/useCreateEventRun';
import { useCreateEventWizardAccess } from '@/hooks/useCreateEventWizardAccess';
import { routes } from '@/lib/routes';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

// /events/new with the wizard on: the same body as the pop-up, full page. Old links, bookmarks and
// the return from checkout land here.
export function CreateEventWizardPage() {
    const t = useTranslations('CreateEventPage');
    const access = useCreateEventWizardAccess();
    const run = useCreateEventRun('wizard');

    return (
        <CreateEventRouteState
            isBlocked={access.isBlocked || !run.isReady}
            content={
                <main className="h-full bg-white">
                    <div className="mx-auto flex h-full max-w-2xl flex-col">
                        <CreateEventFormProvider mode="wizard">
                            <CreateEventWizard leading={<BackButton variant="icon" href={routes.home} label={t('goBack')} />} />
                        </CreateEventFormProvider>
                    </div>
                </main>
            }
        />
    );
}
