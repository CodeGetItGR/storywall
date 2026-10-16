'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { InviteEventDetails } from '@/components/invite/InviteEventDetails';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteOnboardingState } from '@/components/invite/InviteOnboardingState';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { AppLink } from '@/components/ui/AppLink';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptEventInvitation, useEventInvitationPreview } from '@/hooks/useEventInvitations';
import { useInviteMemberRedirect } from '@/hooks/useInviteMemberRedirect';
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
    const isOpeningMemberFeed = useInviteMemberRedirect(preview?.eventId);

    const isLoading = isPreviewLoading || isBootstrapping || isOpeningMemberFeed;

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
                        <AppLink
                            href={routes.login}
                            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                        >
                            {t('haveAccount')}
                        </AppLink>
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
                        actions={
                            <div className="flex flex-col gap-3">
                                {acceptError && (
                                    <p role="alert" className="text-xs text-red-500">
                                        {acceptError}
                                    </p>
                                )}
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
                                                {t('join')}
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <>
                                        <AppLink
                                            href={loginHref}
                                            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                                        >
                                            {t('haveAccount')}
                                            <ArrowRight className="h-4 w-4" />
                                        </AppLink>
                                        <AppLink
                                            href={registerHref}
                                            className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-muted py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                                        >
                                            {t('createAccount')}
                                        </AppLink>
                                    </>
                                )}
                            </div>
                        }
                    >
                        <div className="space-y-6">
                            {/* Gift */}
                            {giftFraming && (
                                <p className="text-sm font-semibold text-ink">
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
                                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted">{activePreview.eventDescription}</p>
                            )}
                        </div>
                    </InviteLayout>
                ) : null
            }
        />
    );
}
