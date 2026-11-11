'use client';

import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { OAuthSignupAcceptanceModal } from '@/components/auth/OAuthSignupAcceptanceModal';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { DetailsPreview } from '@/components/event/create/wizard/details/DetailsPreview';
import type { useLoginForm } from '@/hooks/useLoginForm';
import type { AccountView } from '@/lib/createEventWizardAccount';

type Props = {
    preview: Omit<ComponentProps<typeof DetailsPreview>, 'showLabel'>;
    oauth: ReturnType<typeof useLoginForm>;
    onOpen: (view: AccountView) => void;
};

// The account step's first screen: the event so far, Google and Apple first, then email.
export function AccountChoose({ preview, oauth, onOpen }: Props) {
    const t = useTranslations('CreateEventPage.wizard.account');
    const tRegister = useTranslations('RegisterPage');

    function openSignUp() {
        onOpen('signup');
    }

    function openSignIn() {
        onOpen('signin');
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Summary */}
            <DetailsPreview {...preview} showLabel={false} />

            {/* Heading */}
            <div className="flex flex-col gap-1.5">
                <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                    {t('heading')}
                </h1>
                <p className="text-[15px] text-[#6f6257]">{t('line')}</p>
            </div>

            {/* Google and Apple */}
            <OAuthButtons onSignIn={oauth.handleOAuthSignIn} onError={oauth.handleOAuthError} />
            {oauth.error && (
                <p role="alert" className="text-center text-xs text-red-500">
                    {oauth.error}
                </p>
            )}
            {oauth.oauthSignIn.pendingSignup && (
                <OAuthSignupAcceptanceModal
                    versions={oauth.oauthSignIn.pendingSignup.versions}
                    onConfirmAction={oauth.oauthSignIn.handleSignupConfirm}
                    onErrorAction={oauth.oauthSignIn.handleSignupError}
                    onCloseAction={oauth.oauthSignIn.handleSignupCancel}
                />
            )}

            {/* Email */}
            <button type="button" onClick={openSignUp} className="text-sm font-semibold text-ink underline-offset-4 focus-ring hover:underline">
                {tRegister('orWithEmail')}
            </button>
            <p className="text-center text-xs text-ink-muted">
                {tRegister('haveAccount')}{' '}
                <button type="button" onClick={openSignIn} className="font-semibold text-ink focus-ring hover:underline">
                    {tRegister('signInLink')}
                </button>
            </p>
        </div>
    );
}
