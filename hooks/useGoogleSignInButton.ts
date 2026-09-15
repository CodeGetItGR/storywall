'use client';

import { useEffect, useRef } from 'react';

import { useGoogleIdentitySdk } from '@/hooks/useGoogleIdentitySdk';

interface UseGoogleSignInButtonOptions {
    clientId: string;
    locale: string;
    onCredential: (credential: string) => void;
}

export function useGoogleSignInButton({ clientId, locale, onCredential }: UseGoogleSignInButtonOptions) {
    const googleReady = useGoogleIdentitySdk(locale);
    const buttonRef = useRef<HTMLDivElement>(null);
    const credentialHandlerRef = useRef(onCredential);

    useEffect(() => {
        credentialHandlerRef.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        if (!googleReady || !clientId || !buttonRef.current) return;

        const buttonContainer: HTMLDivElement = buttonRef.current;

        window.google!.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => credentialHandlerRef.current(response.credential),
        });

        let renderedWidth = 0;

        function renderButton(availableWidth: number) {
            const width = Math.min(400, Math.floor(availableWidth));
            if (width <= 0 || width === renderedWidth) return;

            renderedWidth = width;
            buttonContainer.replaceChildren();
            window.google!.accounts.id.renderButton(buttonContainer, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                logo_alignment: 'left',
                width,
                locale,
            });
        }

        renderButton(buttonContainer.getBoundingClientRect().width);

        const resizeObserver = new ResizeObserver(([entry]) => {
            renderButton(entry.contentRect.width);
        });
        resizeObserver.observe(buttonContainer);

        return () => {
            resizeObserver.disconnect();
            buttonContainer.replaceChildren();
        };
    }, [clientId, googleReady, locale]);

    return buttonRef;
}
