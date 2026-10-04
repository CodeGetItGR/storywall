'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { AcceptanceCheckboxes } from '@/components/legal/AcceptanceCheckboxes';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { communityGuidelinesQueryKey, useCommunityGuidelinesVersion } from '@/hooks/useCommunityGuidelinesVersion';
import { termsVersionQueryKey, useTermsVersion } from '@/hooks/useTermsVersion';
import { isGuidelinesVersionMismatchError, isTermsVersionMismatchError } from '@/lib/api/errors';
import type { SignupAcceptanceRequiredDetails } from '@/lib/api/types';

export type SignupAcceptance = { acceptedTermsVersion: string; acceptedGuidelinesVersion: string };

// A Google/Apple sign-in from the login page that would create an account came back
// 3044: nothing was created. This asks for the acceptance and the 18+ confirmation,
// then onConfirmAction resends the same ID token with them. Mounted only while a
// sign-up is pending.
export function OAuthSignupAcceptanceModal({
    versions,
    onConfirmAction,
    onErrorAction,
    onCloseAction,
}: {
    // From the 3044's details; null when they were missing, then the hooks' versions apply.
    versions: SignupAcceptanceRequiredDetails | null;
    // Throws what the resend threw.
    onConfirmAction: (acceptance: SignupAcceptance) => Promise<void>;
    // Any failure other than a changed version: the pending token is not worth retrying.
    onErrorAction: (error: unknown) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('OAuthSignupAcceptance');
    const queryClient = useQueryClient();
    const termsQuery = useTermsVersion();
    const guidelinesQuery = useCommunityGuidelinesVersion();
    // Once a resend meets a changed version, the 3044's versions are out of date.
    const [versionsChanged, setVersionsChanged] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [adultConfirmed, setAdultConfirmed] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const termsVersion = (!versionsChanged && versions?.currentTermsVersion) || termsQuery.data;
    const guidelinesVersion = (!versionsChanged && versions?.currentGuidelinesVersion) || guidelinesQuery.data;

    const onAcceptedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setAccepted(e.target.checked);
    }, []);

    const onAdultConfirmedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setAdultConfirmed(e.target.checked);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!termsVersion || !guidelinesVersion) return;
        setError(null);
        setIsConfirming(true);
        try {
            await onConfirmAction({ acceptedTermsVersion: termsVersion, acceptedGuidelinesVersion: guidelinesVersion });
        } catch (err) {
            if (isTermsVersionMismatchError(err) || isGuidelinesVersionMismatchError(err)) {
                // A newer version went live while the modal was open: fetch both and make them tick again.
                setAccepted(false);
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: termsVersionQueryKey }),
                    queryClient.invalidateQueries({ queryKey: communityGuidelinesQueryKey }),
                ]);
                setVersionsChanged(true);
                setError(t('changed'));
            } else {
                onErrorAction(err);
            }
        } finally {
            setIsConfirming(false);
        }
    }, [guidelinesVersion, onConfirmAction, onErrorAction, queryClient, t, termsVersion]);

    return (
        <ConfirmActionModal
            open
            tone="default"
            icon={<ScrollText className="h-5 w-5" aria-hidden="true" />}
            title={t('title')}
            body={
                <div className="flex flex-col gap-4">
                    <p>{t('body')}</p>
                    <AcceptanceCheckboxes
                        accepted={accepted}
                        adultConfirmed={adultConfirmed}
                        onAcceptedChangeAction={onAcceptedChange}
                        onAdultConfirmedChangeAction={onAdultConfirmedChange}
                    />
                    {error && (
                        <p role="alert" className="text-xs text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            }
            confirmLabel={t('confirm')}
            cancelLabel={t('cancel')}
            onCloseAction={onCloseAction}
            onConfirmAction={handleConfirm}
            isConfirming={isConfirming}
            confirmDisabled={!accepted || !adultConfirmed || !termsVersion || !guidelinesVersion}
        />
    );
}
