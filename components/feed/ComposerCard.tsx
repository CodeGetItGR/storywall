'use client';

import { useTranslations } from 'next-intl';

import { AddImageButton } from '@/components/composer/AddImageButton';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks';
import { initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveMember } from '@/providers/EventProvider';

export function ComposerCard() {
    const t = useTranslations('ComposerCard');
    const activeMember = useActiveMember();
    const profile = useAuth();
    const { openPostComposer, openPostImagePicker, canComposePost } = useComposer();

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    if (!canComposePost) return null;

    return (
        <article className="relative isolate mx-2 mb-2 rounded-xl story-ring p-px!">
            {/* Composer shell */}
            <div className="rounded-2xl bg-card/95 p-1 w-full">
                {/* Compose row */}
                <div className="flex items-center gap-3">
                    <Avatar src={profile.user?.profilePictureUrl} initials={initials} size="md" alt={activeMember?.displayName} />
                    <button
                        type="button"
                        onClick={openPostComposer}
                        className="flex min-w-0 flex-1 items-center rounded-[1.4rem] bg-surface-muted px-4 py-2.5 text-left text-sm text-ink-faint transition-colors hover:text-ink-muted"
                        aria-label={t('captionPlaceholder')}
                    >
                        <span className="truncate">{t('captionPlaceholder')}</span>
                    </button>
                    <AddImageButton aria-label={t('addMedia')} onClick={openPostImagePicker} />
                </div>
            </div>
        </article>
    );
}
