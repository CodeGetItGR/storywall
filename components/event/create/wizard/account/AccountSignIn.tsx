'use client';

import { useTranslations } from 'next-intl';

import { LoginEmailForm } from '@/components/auth/LoginEmailForm';
import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { useLoginForm } from '@/hooks/useLoginForm';

// Email sign-in inside the wizard. Forgot password opens in a new tab so the wizard keeps its place.
// isFinishing: signed in, waiting for the next screen; the button stays busy.
export function AccountSignIn({ onSignedIn, isFinishing }: { onSignedIn: () => void; isFinishing: boolean }) {
    const t = useTranslations('LoginPage');
    const form = useLoginForm({ inviteToken: null, initialEmail: '', onSignedIn });

    return (
        <div className="flex flex-col gap-5">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('title')}
            </h1>

            {/* Form */}
            <LoginEmailForm
                form={form}
                forgotPasswordInNewTab
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
