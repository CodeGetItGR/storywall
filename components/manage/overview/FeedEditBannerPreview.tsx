'use client';

import type { CSSProperties, ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { FeedLook } from '@/components/feed/layout/FeedLook';
import { FeedEditBannerBlock } from '@/components/manage/overview/FeedEditBannerBlock';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';
import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';
import type { FeedEditBannerPicture } from '@/lib/feedEditBannerLook';

// One section of the event's feed in edit mode, in a Save my date theme or, without one, in its wall look, inside the
// event's theme scope as on the feed, at its real width. Inert: nothing in it takes taps or focus.
export function FeedEditBannerPreview({ event }: { event: EventDetailResponseDto }) {
    const preview = useFeedEditBannerPreview(event);
    return preview ? <FeedEditBannerDrawing preview={preview} /> : <FeedEditBannerPlaceholder />;
}

// The picture itself, from its data (Storybook draws it from fixtures).
export function FeedEditBannerDrawing({ preview }: { preview: FeedEditBannerPicture }) {
    return (
        // Theme scope: the event's colours and heading font fill the whole frame
        <FeedEditBannerFrame style={preview.scope.style} fontProps={themeFontScopeProps(preview.scope.headingFont)}>
            <ThemeFontFace font={preview.scope.headingFont} />
            {preview.kind === 'wall' ? (
                // Wall look
                <FeedEditBannerBlock block={preview.block} />
            ) : (
                // Save my date look
                <FeedLook ctx={preview.ctx} lang={preview.lang} fontFaces={preview.fontFaces}>
                    <FeedEditBannerBlock block={preview.block} ctx={preview.ctx} />
                </FeedLook>
            )}
        </FeedEditBannerFrame>
    );
}

// The picture's frame: the section at the frame's own width, cut off at the bottom if it runs long.
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
            className="pointer-events-none max-h-64 w-full overflow-hidden rounded-xl bg-event"
            style={style}
            {...fontProps}
        >
            {children}
        </div>
    );
}
