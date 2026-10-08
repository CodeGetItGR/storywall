'use client';

import { CalendarHeart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useEventInvitationPreview } from '@/hooks/useEventInvitations';

// The event an invite link leads to, shown above the login and register forms so the guest
// knows where they're headed. Nothing while loading, and nothing for an invite that can't be used.
export function InviteEventCard({ inviteToken }: { inviteToken: string | null }) {
    const t = useTranslations('InviteEventCard');
    const { data: preview } = useEventInvitationPreview(inviteToken);
    // An illustration that 404s falls back to the cover, as on the invite page.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    function handleIllustrationError() {
        setFailedUrl(preview?.theme?.illustrationUrl ?? null);
    }

    if (!preview || preview.expired || preview.alreadyUsed) return null;

    const theme = preview.theme;
    const illustrationUrl = theme?.illustrationUrl && theme.illustrationUrl !== failedUrl ? theme.illustrationUrl : null;
    const coverUrl = preview.coverMedia?.mediaUrl ?? null;

    return (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface-muted/70 p-2.5">
            <div
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${illustrationUrl ? '' : 'bg-gradient-brand'}`}
                style={illustrationUrl ? { backgroundColor: theme?.backgroundColor } : undefined}
            >
                {illustrationUrl ? (
                    <ProtectedImage src={illustrationUrl} alt="" fill sizes="48px" className="object-contain p-1" onError={handleIllustrationError} />
                ) : coverUrl ? (
                    <ProtectedImage src={coverUrl} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                    <CalendarHeart className="h-5 w-5 text-white" />
                )}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-ink-muted">{t('eyebrow')}</p>
                <p className="truncate text-sm font-semibold text-ink">{preview.eventTitle}</p>
            </div>
        </div>
    );
}
