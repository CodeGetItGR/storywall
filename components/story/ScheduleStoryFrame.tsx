'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

function subscribe() {
    return () => {};
}

interface ScheduleStoryFrameProps {
    header: ReactNode;
    children: ReactNode;
}

// Full-screen schedule story. Portaled to <body> on the client because the app
// shell's page is transformed, which would otherwise trap `fixed` inside it and
// leave the page and the story as two separate scroll areas.
export function ScheduleStoryFrame({ header, children }: ScheduleStoryFrameProps) {
    const t = useTranslations('StoryPage');
    const isClient = useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );

    const frame = (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t('scheduleAuthor')}
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-surface-muted"
        >
            <div className="relative mx-auto min-h-full w-full max-w-sm">
                {/* Header */}
                <div className="sticky top-0 z-10 h-20 bg-surface-muted">
                    {header}
                    {/* Header Fade */}
                    <div
                        className="pointer-events-none absolute inset-x-0 top-full h-6 bg-linear-to-b from-surface-muted to-transparent"
                        aria-hidden="true"
                    />
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );

    return isClient ? createPortal(frame, document.body) : frame;
}
