'use client';

import type { CSSProperties, ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { FeedEditBannerBlocks } from '@/components/manage/overview/FeedEditBannerBlocks';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';
import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';
import type { FeedEditBannerPicture } from '@/lib/feedEditBannerLook';

// The top of the event's feed in edit mode: its own cover, in a Save my date theme or, without one, in its wall look,
// inside the event's theme scope as on the feed, at its real width, then the edit row and two sections with their
// tools. Inert: nothing in it takes taps or focus.
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
                <>
                    <FeedCoverBlock event={preview.event} isHost={false} wishlist={false} thumbnail />
                    <FeedEditBannerBlocks blocks={preview.blocks} />
                </>
            ) : (
                // Save my date look
                <FeedLook ctx={preview.ctx} lang={preview.lang} fontFaces={preview.fontFaces}>
                    <FeedBlockShell section={preview.cover} index={preview.index} ctx={preview.ctx}>
                        <FeedNative>
                            <FeedCoverBlock event={preview.event} isHost={false} wishlist={false} thumbnail />
                        </FeedNative>
                    </FeedBlockShell>
                    <FeedEditBannerBlocks blocks={preview.blocks} ctx={preview.ctx} />
                </FeedLook>
            )}
        </FeedEditBannerFrame>
    );
}

// The picture's frame: the feed drawn at a phone's width (390px) and scaled down to the banner's picture column
// (112px, 144px from sm), as tall as the column, cut off at the bottom with a fade. The drawing is positioned out
// of the flow, so its full height never stretches the banner.
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
            className="pointer-events-none relative size-full min-h-40 overflow-hidden rounded-xl bg-event mask-b-from-85%"
            style={style}
            {...fontProps}
        >
            <div className="absolute top-0 left-0 w-[390px] origin-top-left scale-[0.2872] sm:scale-[0.3692]">{children}</div>
        </div>
    );
}
