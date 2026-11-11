'use client';

import { NextIntlClientProvider, useLocale, useTimeZone } from 'next-intl';
import { type ReactNode } from 'react';

import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { useCreateEventWizardMessages } from '@/hooks/useCreateEventWizardMessages';

// The app already has every namespace; public pages fetch the wizard's on first open.
export function CreateEventWizardMessages({ children }: { children: ReactNode }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const wizardMessages = useCreateEventWizardMessages();

    if (wizardMessages.status === 'present') return children;
    if (wizardMessages.status === 'loading') return <AuthLoadingState />;
    return (
        <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={wizardMessages.messages}>
            {children}
        </NextIntlClientProvider>
    );
}
