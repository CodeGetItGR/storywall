'use client';

import { useTranslations } from 'next-intl';

import { AddImageButton } from '@/components/composer/AddImageButton';
import Avatar from '@/components/ui/avatar';
import { initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveMember } from '@/providers/EventProvider';

export function ComposerCard() {
    const t = useTranslations('ComposerCard');
    const activeMember = useActiveMember();
    const { openPostComposer, openPostImagePicker, canComposePost } = useComposer();

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    if (!canComposePost) return null;

    return (
        <article className="relative isolate mx-2 mb-2 rounded-xl bg-background/50 p-px shadow-[0_14px_32px_rgba(36,31,26,0.12)] after:pointer-events-none after:absolute after:-inset-0.75 after:-z-10 after:rounded-[inherit] after:bg-linear-to-r after:from-[#c777b1]/20 after:via-primary/18 after:to-accent-orange/20 after:blur-xl sm:mx-5">
            {/* Composer shell */}
            <div className="rounded-[calc(1.75rem-1px)] bg-card/95 px-4 py-4 sm:px-5">
                {/* Compose row */}
                <div className="flex items-center gap-3">
                    <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
                    <button
                        type="button"
                        onClick={openPostComposer}
                        className="flex min-w-0 flex-1 items-center rounded-[1.4rem] bg-surface-muted px-4 py-2.5 text-left text-sm text-ink-faint shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors hover:text-ink-muted"
                        aria-label={t('placeholder')}
                    >
                        <span className="truncate">{t('placeholder')}</span>
                    </button>
                    <AddImageButton aria-label={t('addImage')} onClick={openPostImagePicker} />
                </div>
            </div>
        </article>
    );
}
