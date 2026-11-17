'use client';

import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { EventFieldSource } from '@/lib/invitation/eventLinks';
import { cn } from '@/lib/utils';

type EventLockNoteProps = {
    source: EventFieldSource;
    // Where the host changes it; without one only the note shows.
    href: string | undefined;
    className?: string;
};

// A value the invitation takes from its event (KAN-84): the host changes it on the event, through the link.
export function EventLockNote({ source, href, className }: EventLockNoteProps) {
    const t = useTranslations('InvitationEditor.eventLock');

    return (
        <p className={cn('text-[12px] leading-snug text-(--smd-editor-muted)', className)}>
            {/* Note */}
            {t('note')}

            {/* Link */}
            {href && (
                <>
                    {' '}
                    <AppLink href={href} className="font-semibold text-(--smd-editor-text) underline underline-offset-2 hover:opacity-80">
                        {t(source)}
                    </AppLink>
                </>
            )}
        </p>
    );
}
