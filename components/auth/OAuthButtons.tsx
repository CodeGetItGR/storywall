'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useAppleIdSdk } from '@/hooks/useAppleIdSdk';
import { useGoogleSignInButton } from '@/hooks/useGoogleSignInButton';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID ?? '';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID ?? '';

interface OAuthButtonsProps {
    onSignIn: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>;
    onError: (error: unknown) => void;
}

function AppleLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 384 512" fill="currentColor" className={className} aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
    );
}

export function OAuthButtons({ onSignIn, onError }: OAuthButtonsProps) {
    const t = useTranslations('OAuthButtons');
    const locale = useLocale();
    const appleReady = useAppleIdSdk(Boolean(APPLE_CLIENT_ID));

    const handleGoogleCredential = useCallback(
        (credential: string) => {
            void onSignIn('GOOGLE', credential).catch(onError);
        },
        [onError, onSignIn],
    );
    const googleButtonRef = useGoogleSignInButton({ clientId: GOOGLE_CLIENT_ID, locale, onCredential: handleGoogleCredential });

    const handleAppleClick = useCallback(async () => {
        if (!appleReady) return;

        window.AppleID!.auth.init({
            clientId: APPLE_CLIENT_ID,
            scope: 'name email',
            redirectURI: typeof window !== 'undefined' ? `${window.location.origin}/auth/apple/callback` : '',
            usePopup: true,
        });

        try {
            const result = await window.AppleID!.auth.signIn();
            await onSignIn('APPLE', result.authorization.id_token);
        } catch (err) {
            onError(err);
        }
    }, [appleReady, onSignIn, onError]);

    return (
        <div className="flex flex-col gap-3">
            {/* Google sign-in */}
            <div ref={googleButtonRef} className="flex min-h-10 w-full min-w-0 justify-center overflow-hidden" />

            {/* Apple sign-in */}
            {APPLE_CLIENT_ID && (
                <button
                    type="button"
                    onClick={handleAppleClick}
                    disabled={!appleReady}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <AppleLogo className="h-4 w-4" />
                    {t('continueWithApple')}
                </button>
            )}
        </div>
    );
}
