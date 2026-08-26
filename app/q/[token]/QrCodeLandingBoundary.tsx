'use client';

import { ArrowRight, Loader2, ScanLine, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useState } from 'react';

import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useMediaItem } from '@/hooks/useMedia';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { getQrTerminalCopyKey } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

export default function QrCodeLandingBoundary({ token }: { token: string }) {
    const t = useTranslations('QrCodePage');
    const router = useRouter();
    const { guestLogin } = useAuth();
    const toErrorMessage = useApiErrorMessage();

    const { data: resolution, isLoading, error } = useQrLinkResolution(token);
    const { data: coverMedia } = useMediaItem(resolution?.status === 'ACTIVE' ? (resolution.coverMediaId ?? null) : null);

    const [displayName, setDisplayName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [guestError, setGuestError] = useState<string | null>(null);

    useEffect(() => {
        if (resolution?.status === 'ACTIVE' && resolution.targetType === 'INVITATION' && resolution.inviteToken) {
            router.replace(routes.inviteToken(resolution.inviteToken));
        }
    }, [resolution, router]);

    const handleDisplayNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setDisplayName(event.target.value);
    }, []);

    function renderTerminalState() {
        if (error || !resolution || resolution.status !== 'ACTIVE') {
            const copyKey = getQrTerminalCopyKey(resolution, error);
            return <InviteTerminalState title={t(`${copyKey}.title`)} description={t(`${copyKey}.description`)} />;
        }

        if (!resolution.inviteToken) {
            return <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
        }

        return null;
    }

    const terminalState = renderTerminalState();
    const isRedirectingToInvite = resolution?.status === 'ACTIVE' && resolution.targetType === 'INVITATION';
    const activeResolution = terminalState || isRedirectingToInvite || resolution?.status !== 'ACTIVE' ? null : resolution;

    async function handleGuestSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!activeResolution?.inviteToken) return;

        setGuestError(null);
        setIsSubmitting(true);

        try {
            await guestLogin({
                inviteToken: activeResolution.inviteToken,
                displayName: displayName.trim(),
            });
            router.push(
                activeResolution?.targetType === 'MEDIA_UPLOAD'
                    ? routes.tools.gallery
                    : activeResolution?.eventId
                      ? routes.post.feed(activeResolution.eventId)
                      : routes.feed
            );
        } catch (err) {
            if (getErrorCode(err) === ERROR_CODES.INVITATION_EXHAUSTED) {
                setGuestError(t('invitationExhausted'));
            } else {
                setGuestError(toErrorMessage(err));
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <QrLandingState
            isLoading={isLoading || isRedirectingToInvite}
            terminalState={terminalState}
            content={
                activeResolution ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={activeResolution.eventTitle ?? t('fallbackTitle')}
                        eventSubtitle={activeResolution.eventSubtitle}
                    >
                        <form onSubmit={handleGuestSubmit} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                                <ScanLine className="w-4 h-4" />
                                {activeResolution.targetType === 'MEDIA_UPLOAD' ? t('mediaUploadEyebrow') : t('eventJoinEyebrow')}
                            </div>

                            <FormFieldLabel label={t('guestForm.displayNameLabel')} required>
                                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                                    <User className="w-4 h-4 text-ink-muted shrink-0" />
                                    <input
                                        type="text"
                                        placeholder={t('guestForm.displayNamePlaceholder')}
                                        required
                                        value={displayName}
                                        onChange={handleDisplayNameChange}
                                        className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                                    />
                                </div>
                            </FormFieldLabel>

                            {guestError && (
                                <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                                    {guestError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {activeResolution.targetType === 'MEDIA_UPLOAD' ? t('guestForm.submitMedia') : t('guestForm.submit')}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </InviteLayout>
                ) : null
            }
        />
    );
}
