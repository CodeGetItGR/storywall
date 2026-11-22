'use client';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';

// Only while the picture's data loads.
export function FeedEditBannerPlaceholder() {
    return <div className="bg-surface aspect-[4/5] w-full" />;
}

// The event's own cover, in a Save my date theme or, without one, in its wall look; drawn at four times the
// picture's width, then shrunk. Inert: nothing in it takes taps or focus.
export function FeedEditBannerPreview({ event }: { event: EventDetailResponseDto }) {
    const preview = useFeedEditBannerPreview(event);
    if (!preview) return <FeedEditBannerPlaceholder />;

    return (
        <div aria-hidden="true" inert className="pointer-events-none aspect-[4/5] w-full overflow-hidden">
            <div className="w-[400%] origin-top-left scale-25">
                {preview.kind === 'wall' ? (
                    // Wall look: the theme scope's colours and heading font, as on the feed itself
                    <div className="bg-event" style={preview.style} {...themeFontScopeProps(preview.headingFont)}>
                        <ThemeFontFace font={preview.headingFont} />
                        <FeedCoverBlock event={preview.event} isHost={false} wishlist={false} />
                    </div>
                ) : (
                    // Save my date look
                    <FeedLook ctx={preview.ctx} lang={preview.lang} fontFaces={preview.fontFaces}>
                        <FeedBlockShell section={preview.cover} index={preview.index} ctx={preview.ctx}>
                            <FeedNative>
                                <FeedCoverBlock event={event} isHost={false} wishlist={false} />
                            </FeedNative>
                        </FeedBlockShell>
                    </FeedLook>
                )}
            </div>
        </div>
    );
}
