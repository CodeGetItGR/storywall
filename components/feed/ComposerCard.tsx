'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { initialsFromName } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveMember } from '@/providers/EventProvider';

export function ComposerCard() {
    const t = useTranslations('ComposerCard');
    const activeMember = useActiveMember();
    const { openPostComposer, canCompose } = useComposer();

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    return (
        <div className="bg-card/60 p-4 border-2 border-x border-border/60">
            <button
                type="button"
                onClick={openPostComposer}
                disabled={!canCompose}
                className="w-full flex items-center gap-3 text-left disabled:cursor-not-allowed"
            >
                <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
                <span className="flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink-faint">
                    {canCompose ? t('placeholder') : t('eventReadOnly')}
                </span>
            </button>
        </div>
    );
}
