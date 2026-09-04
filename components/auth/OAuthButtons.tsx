'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

import { useAppleIdSdk } from '@/hooks/useAppleIdSdk';
import { useGoogleIdentitySdk } from '@/hooks/useGoogleIdentitySdk';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID ?? '';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID ?? '';

interface OAuthButtonsProps {
    onSignIn: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>;
    onError: (error: unknown) => void;
}

export function OAuthButtons({ onSignIn, onError }: OAuthButtonsProps) {
    const t = useTranslations('OAuthButtons');
    const googleReady = useGoogleIdentitySdk();
    const appleReady = useAppleIdSdk();
    const googleButtonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!googleReady || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

        window.google!.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
                void onSignIn('GOOGLE', response.credential).catch(onError);
            },
        });
        window.google!.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 320 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [googleReady]);

    const handleAppleClick = useCallback(async () => {
        if (!appleReady || !APPLE_CLIENT_ID) return;

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
            <div ref={googleButtonRef} className="flex justify-center" />
            <button
                type="button"
                onClick={handleAppleClick}
                disabled={!appleReady}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {t('continueWithApple')}
            </button>
        </div>
    );
}
