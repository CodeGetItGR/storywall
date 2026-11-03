'use client';

import { Banner } from '@/components/feed/Banner';
import { LiteHomeTabs } from '@/components/liteHome/LiteHomeTabs';
import { LiteQuickActions } from '@/components/liteHome/LiteQuickActions';
import type { LiteHomeState } from '@/hooks/useLiteHome';

// A lite event's home: the event's banner, the Bundle's Gallery / Wishbook tabs and the host's quick actions,
// in place of a module page's back-link header. The banner's title is the page's h1.
export function LiteHomeHeader({ home }: { home: LiteHomeState }) {
    return (
        <>
            {/* Banner */}
            <section className="mt-3">
                <Banner
                    image={home.event.coverMedia?.mediaUrl ?? null}
                    illustrationUrl={home.event.theme?.illustrationUrl ?? null}
                    title={home.event.title}
                    glowVisible={false}
                />
            </section>

            {/* Tabs */}
            {home.tabs && <LiteHomeTabs tabs={home.tabs} />}

            {/* Quick actions */}
            {home.actions.length > 0 && <LiteQuickActions home={home} />}
        </>
    );
}
