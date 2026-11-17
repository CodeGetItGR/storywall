'use client';

import { useTranslations } from 'next-intl';

import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm';
import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { useRegisterForm } from '@/hooks/useRegisterForm';
import type { AuthSessionDto } from '@/lib/api/types';
import { rememberCodeSentAt } from '@/lib/emailCode';

// Email sign-up inside the wizard. The backend mails a 6-digit code instead of a link.
// isFinishing: signed up, waiting for the code screen; the button stays busy.
export function AccountSignUp({ onSignedIn, isFinishing }: { onSignedIn: () => void; isFinishing: boolean }) {
    const t = useTranslations('RegisterPage');
    const form = useRegisterForm({
        inviteToken: null,
        returnPath: null,
        initialFields: { email: '', firstName: '', lastName: '' },
        emailVerification: 'CODE',
        // Sign-up mailed a code: the code screen must not send another one.
        onSignedIn: (session: AuthSessionDto) => {
            rememberCodeSentAt(session.userId, Date.now());
            onSignedIn();
        },
    });

    return (
        <div className="flex flex-col gap-5">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('title')}
            </h1>

            {/* Form */}
            <RegisterEmailForm
                form={form}
                submitButton={
                    <CreateEventWizardButton
                        type="submit"
                        label={t('submit')}
                        pending={form.isSubmitting || isFinishing}
                        disabled={form.isSubmitting || isFinishing}
                    />
                }
            />
        </div>
    );
}
