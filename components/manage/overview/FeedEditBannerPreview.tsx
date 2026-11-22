'use client';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';
import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';

// The event's own cover, in a Save my date theme or, without one, in its wall look, inside the event's theme
// scope as on the feed; drawn at four times the picture's width, then shrunk. Inert: nothing in it takes taps or focus.
export function FeedEditBannerPreview({ event }: { event: EventDetailResponseDto }) {
    const preview = useFeedEditBannerPreview(event);
    if (!preview) return <FeedEditBannerPlaceholder />;

    return (
        // Theme scope: the event's colours and heading font fill the whole frame
        <div
            aria-hidden="true"
            inert
            className="pointer-events-none aspect-[4/5] w-full overflow-hidden bg-event"
            style={preview.scope.style}
            {...themeFontScopeProps(preview.scope.headingFont)}
        >
            <ThemeFontFace font={preview.scope.headingFont} />
            <div className="w-[400%] origin-top-left scale-25">
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
            </div>
        </div>
    );
}
