import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';

type MembersOnlyLockProps = {
    // The locked section's name (InvitationEditor.sectionNames.*), or the feed's (FeedLayout.locked.feed).
    title: string;
    // The event's join page, where a visitor signs in and joins.
    joinHref: string;
};

// What a signed-out visitor sees in place of a members-only section, and at the end for the feed: its name, the app's
// lock, and a way in.
export function MembersOnlyLock({ title, joinHref }: MembersOnlyLockProps) {
    const t = useTranslations('FeedLayout.locked');

    return (
        <section className="mx-4 my-3 flex flex-col items-center gap-2 rounded-2xl bg-event-card px-4 py-6 text-center font-sans">
            {/* Lock */}
            <span className="flex size-9 items-center justify-center rounded-full bg-(image:--logo) shadow-sm">
                <Lock className="size-4 text-white" aria-hidden="true" />
            </span>

            {/* Name */}
            <h2 className="text-sm font-semibold text-ink">{title}</h2>

            {/* Way in */}
            <AppLink href={joinHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                {t('join')}
            </AppLink>
        </section>
    );
}
