'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { InviteEventDetails } from '@/components/invite/InviteEventDetails';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteOnboardingState } from '@/components/invite/InviteOnboardingState';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptEventInvitation, useEventInvitationPreview } from '@/hooks/useEventInvitations';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { inviteGiftFraming } from '@/lib/gift';
import { routes } from '@/lib/routes';

export default function InviteOnboardingBoundary({ token }: { token: string }) {
    const t = useTranslations('InviteOnboardingPage');
    const router = useRouter();
    const toErrorMessage = useApiErrorMessage();

    const { isAuthenticated, isBootstrapping } = useAuth();
    const { data: preview, isLoading: isPreviewLoading, error } = useEventInvitationPreview(token);
    const coverMedia = preview?.coverMedia ?? null;
    const acceptInvitation = useAcceptEventInvitation();
    const [acceptError, setAcceptError] = useState<string | null>(null);

    const isLoading = isPreviewLoading || isBootstrapping;

    async function handleAcceptAsExistingUser() {
        setAcceptError(null);
        try {
            const member = await acceptInvitation.mutateAsync(token);
            router.replace(routes.events.feed(member.eventId));
        } catch (err) {
            // 409/5003 (5001 before the backend named it): already a member — someone reopening the
            // shared join link. They're in.
            const code = getErrorCode(err);
            if (preview && err instanceof ApiError && err.status === 409 && (code === ERROR_CODES.DUPLICATE_MEMBERSHIP || code === ERROR_CODES.CONFLICT)) {
                router.replace(routes.events.feed(preview.eventId));
                return;
            }
            setAcceptError(toErrorMessage(err));
        }
    }

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
                            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
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

    const giftFraming = inviteGiftFraming(activePreview?.gift);
    const loginHref = routes.auth.login({ invite: token, email: activePreview?.email });
    const registerHref = routes.auth.register({ invite: token, email: activePreview?.email });

    return (
        <InviteOnboardingState
            isLoading={isLoading}
            terminalState={terminalState}
            content={
                activePreview ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        theme={activePreview.theme}
                        eventTitle={activePreview.eventTitle}
                        eventSubtitle={activePreview.eventSubtitle}
                    >
                        {/* Gift */}
                        {giftFraming && (
                            <p className="mb-3 text-sm font-semibold text-ink">
                                {t('gift', { giver: giftFraming.giverDisplayName, recipient: giftFraming.recipientLabel })}
                            </p>
                        )}

                        {/* Details */}
                        <InviteEventDetails
                            startAt={activePreview.eventStartAt}
                            endAt={activePreview.eventEndAt}
                            timeZone={activePreview.eventTimezone}
                            locationName={activePreview.eventLocationName}
                        />

                        {/* Description */}
                        {activePreview.eventDescription && (
                            <p className="mb-7 text-sm leading-relaxed text-ink-muted">{activePreview.eventDescription}</p>
                        )}

                        {acceptError && (
                            <p role="alert" className="mb-3 text-xs text-red-500">
                                {acceptError}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            {isAuthenticated ? (
                                <button
                                    type="button"
                                    onClick={handleAcceptAsExistingUser}
                                    disabled={acceptInvitation.isPending}
                                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {acceptInvitation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            {t('haveAccount')}
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <>
                                    <Link
                                        href={loginHref}
                                        className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                                    >
                                        {t('haveAccount')}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href={registerHref}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-muted py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                                    >
                                        {t('createAccount')}
                                    </Link>
                                </>
                            )}
                        </div>
                    </InviteLayout>
                ) : null
            }
        />
    );
}
