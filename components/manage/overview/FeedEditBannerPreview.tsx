'use client';

import type { CSSProperties, ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';
import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';

// The event's own cover, in a Save my date theme or, without one, in its wall look, inside the event's theme
// scope as on the feed, at its real width. Inert: nothing in it takes taps or focus.
export function FeedEditBannerPreview({ event }: { event: EventDetailResponseDto }) {
    const preview = useFeedEditBannerPreview(event);
    if (!preview) return <FeedEditBannerPlaceholder />;

    return (
        // Theme scope: the event's colours and heading font fill the whole frame
        <FeedEditBannerFrame style={preview.scope.style} fontProps={themeFontScopeProps(preview.scope.headingFont)}>
            <ThemeFontFace font={preview.scope.headingFont} />
            {preview.kind === 'wall' ? (
                // Wall look
                <FeedCoverBlock event={preview.event} isHost={false} wishlist={false} thumbnail />
            ) : (
                // Save my date look
                <FeedLook ctx={preview.ctx} lang={preview.lang} fontFaces={preview.fontFaces}>
                    <FeedBlockShell section={preview.cover} index={preview.index} ctx={preview.ctx}>
                        <FeedNative>
                            <FeedCoverBlock event={preview.event} isHost={false} wishlist={false} thumbnail />
                        </FeedNative>
                    </FeedBlockShell>
                </FeedLook>
            )}
        </FeedEditBannerFrame>
    );
}

// The picture's frame: the cover drawn at the frame's own width, as on a phone.
export function FeedEditBannerFrame({
    style,
    fontProps,
    children,
}: {
    style?: CSSProperties;
    fontProps?: ReturnType<typeof themeFontScopeProps>;
    children: ReactNode;
}) {
    return (
        <div
            aria-hidden="true"
            inert
            className="pointer-events-none max-h-[22rem] w-full overflow-hidden rounded-xl bg-event pb-3"
            style={style}
            {...fontProps}
        >
            {children}
        </div>
    );
}
