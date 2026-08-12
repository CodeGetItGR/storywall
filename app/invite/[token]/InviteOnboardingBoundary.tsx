'use client';

import { ArrowRight, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { type ReactNode, useCallback, useState } from 'react';

import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { useAuth } from '@/hooks/useAuth';
import { useEventInvitationPreview } from '@/hooks/useEventInvitations';
import { useMediaItem } from '@/hooks/useMedia';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { routes } from '@/lib/routes';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

export default function InviteOnboardingBoundary({ token }: { token: string }) {
    const t = useTranslations('InviteOnboardingPage');
    const router = useRouter();
    const { guestLogin } = useAuth();

    const { data: preview, isLoading, error } = useEventInvitationPreview(token);
    const { data: coverMedia } = useMediaItem(preview?.coverMediaId ?? null);

    const [showGuestForm, setShowGuestForm] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [guestError, setGuestError] = useState<string | null>(null);
    const prefilledName = preview ? [preview.firstName, preview.lastName].filter(Boolean).join(' ') : '';

    const handleJoinAsGuest = useCallback(() => {
        setDisplayName(prefilledName);
        setShowGuestForm(true);
    }, [prefilledName]);

    const handleDisplayNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setDisplayName(event.target.value);
    }, []);

    const handleBackToChoices = useCallback(() => {
        setShowGuestForm(false);
    }, []);

    function renderTerminalState() {
        if ((error instanceof ApiError && error.status === 404) || !preview) {
            return <InviteTerminalState title={t('invalidInvite.title')} description={t('invalidInvite.description')} />;
        }

        if (preview.expired) {
            return <InviteTerminalState title={t('expiredInvite.title')} description={t('expiredInvite.description')} />;
        }

        if (preview.alreadyUsed) {
            return (
                <InviteTerminalState
                    title={t('alreadyUsedInvite.title')}
                    description={t('alreadyUsedInvite.description')}
                    action={
                        <Link
                            href={routes.login}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            {t('haveAccount')}
                        </Link>
                    }
                />
            );
        }

        return null;
    }

    const terminalState = renderTerminalState();

    const activePreview = terminalState ? null : preview;

    const loginHref = routes.auth.login({ invite: token, email: activePreview?.email });
    const registerHref = routes.auth.register({ invite: token, email: activePreview?.email });

    async function handleGuestSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setGuestError(null);
        setIsSubmitting(true);

        try {
            await guestLogin({
                inviteToken: token,
                displayName: displayName.trim() || prefilledName,
            });
            router.push(routes.feed);
        } catch (err) {
            setGuestError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <InviteOnboardingState
            isLoading={isLoading}
            terminalState={terminalState}
            content={
                activePreview ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={activePreview.eventTitle}
                        eventSubtitle={activePreview.eventSubtitle}
                    >
                        {activePreview.eventDescription && (
                            <p className="text-sm text-ink-muted mb-7 leading-relaxed">{activePreview.eventDescription}</p>
                        )}

                        {!showGuestForm ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={handleJoinAsGuest}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                    {t('joinAsGuest')}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <Link
                                    href={loginHref}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-surface-muted/70 transition-colors"
                                >
                                    {t('haveAccount')}
                                </Link>
                                <Link
                                    href={registerHref}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-surface-muted/70 transition-colors"
                                >
                                    {t('createAccount')}
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleGuestSubmit} className="flex flex-col gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                                        {t('guestForm.displayNameLabel')}
                                    </span>
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
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('guestForm.submit')}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleBackToChoices}
                                    className="text-xs text-center text-ink-muted hover:text-ink transition-colors"
                                >
                                    {t('back')}
                                </button>
                            </form>
                        )}
                    </InviteLayout>
                ) : null
            }
        />
    );
}

function InviteOnboardingState({ content, isLoading, terminalState }: { content: ReactNode; isLoading: boolean; terminalState: ReactNode }) {
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
            </div>
        );
    }

    if (terminalState) {
        return terminalState;
    }

    return content;
}
