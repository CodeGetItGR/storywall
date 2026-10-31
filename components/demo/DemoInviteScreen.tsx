'use client';

import { useTranslations } from 'next-intl';

import { DemoGuestNotice } from '@/components/demo/DemoGuestNotice';
import { InviteEventDetails } from '@/components/invite/InviteEventDetails';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { useActiveEvent } from '@/providers/EventProvider';

// What a guest sees after opening an invite link, inside the demo. Like /invite/{token}, but with
// no join buttons: nobody can join a demo event.
export function DemoInviteScreen() {
    const t = useTranslations('InviteOnboardingPage');
    const tDemo = useTranslations('Demo');
    const event = useActiveEvent();

    if (!event) return null;

    return (
        <InviteLayout
            coverImageSrc={event.coverMedia?.mediaUrl}
            coverImageAlt={t('defaultHeroImageAlt')}
            theme={event.theme}
            eventTitle={event.title}
            eventSubtitle={event.subtitle}
        >
            {/* Demo notice */}
            <DemoGuestNotice>{tDemo('inviteNotice')}</DemoGuestNotice>

            <div className="space-y-6">
                {/* Details */}
                <InviteEventDetails startAt={event.schedule.startAt} timeZone={event.schedule.timezone} locationName={event.location.name} />

                {/* Description */}
                {event.description && <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted">{event.description}</p>}
            </div>
        </InviteLayout>
    );
}
