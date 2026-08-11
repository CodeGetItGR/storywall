'use client';

import { ArrowRight, HeartCrack, Loader2, ScanLine, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { use, useCallback, useEffect, useState } from 'react';

import { Logo } from '@/components/common/Logo';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { useAuth } from '@/hooks/useAuth';
import { useMediaItem } from '@/hooks/useMedia';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode, getErrorMessage } from '@/lib/api/errors';
import type { QrLinkResolutionDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

function TerminalState({ title, description }: { title: string; description: string }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16">
            <Logo direction="col" className="mb-8" />
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
                <HeartCrack className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3 text-balance">{title}</h1>
            <p className="text-sm text-ink-muted max-w-sm leading-relaxed">{description}</p>
        </div>
    );
}

function terminalCopy(t: ReturnType<typeof useTranslations>, resolution?: QrLinkResolutionDto | null, error?: unknown) {
    if (error instanceof ApiError && (error.status === 404 || getErrorCode(error) === ERROR_CODES.QR_LINK_NOT_FOUND)) {
        return { title: t('unknown.title'), description: t('unknown.description') };
    }

    switch (resolution?.status) {
        case 'REVOKED':
            return { title: t('revoked.title'), description: t('revoked.description') };
        case 'EXPIRED':
            return { title: t('expired.title'), description: t('expired.description') };
        case 'TARGET_UNAVAILABLE':
            return { title: t('unavailable.title'), description: t('unavailable.description') };
        default:
            return { title: t('unknown.title'), description: t('unknown.description') };
    }
}

export default function QrCodeLandingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const t = useTranslations('QrCodePage');
    const router = useRouter();
    const { guestLogin } = useAuth();

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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
            </div>
        );
    }

    if (error || !resolution || resolution.status !== 'ACTIVE') {
        const copy = terminalCopy(t, resolution, error);
        return <TerminalState title={copy.title} description={copy.description} />;
    }

    if (!resolution.inviteToken) {
        return <TerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
    }

    if (resolution.targetType === 'INVITATION') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
            </div>
        );
    }

    const activeResolution = resolution;

    async function handleGuestSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setGuestError(null);
        setIsSubmitting(true);

        try {
            await guestLogin({
                inviteToken: activeResolution.inviteToken!,
                displayName: displayName.trim(),
            });
            router.push(activeResolution.eventId ? routes.post.feed(activeResolution.eventId) : routes.feed);
        } catch (err) {
            if (getErrorCode(err) === ERROR_CODES.INVITATION_EXHAUSTED) {
                setGuestError(t('invitationExhausted'));
            } else {
                setGuestError(getErrorMessage(err));
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
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

                {activeResolution.eventStatus === 'FROZEN' && <p className="text-sm leading-relaxed text-ink-muted">{t('frozenNotice')}</p>}

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('guestForm.displayNameLabel')}</span>
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
                </label>

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
    );
}
