'use client';

import { FeedGalleryPlaceholder } from '@/components/feed/edit/FeedGalleryPlaceholder';
import { FeedLook } from '@/components/feed/layout/FeedLook';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedSectionPreview } from '@/lib/feedSectionPreview';
import type { RenderContext } from '@/lib/invitation/render';

// A live picture of a block the host may add (plan 5's preview), drawn at twice the box's width and halved. A gallery
// with no photos shows empty tiles. Inert: a block can draw buttons of its own (FAQ).
export function FeedSectionPreviewPicture({ preview, ctx, lang }: { preview: FeedSectionPreview; ctx: RenderContext; lang: string }) {
    return (
        <div aria-hidden="true" inert className="pointer-events-none overflow-hidden">
            {preview.placeholder ? (
                <FeedGalleryPlaceholder />
            ) : (
                <div className="w-[200%] origin-top-left scale-50">
                    <FeedLook ctx={ctx} lang={lang} fontFaces="">
                        <InvitationSection section={preview.section} index={1} ctx={ctx} />
                    </FeedLook>
                </div>
            )}
        </div>
    );
}
