'use client';

import { useCallback } from 'react';

import { FeedGalleryPlaceholder } from '@/components/feed/edit/FeedGalleryPlaceholder';
import { FeedLook } from '@/components/feed/layout/FeedLook';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedSectionPreview } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { RenderContext } from '@/lib/invitation/render';

type FeedSectionCardProps = { preview: FeedSectionPreview; name: string; ctx: RenderContext; lang: string; onAdd: (type: NewSectionType) => void };

// One block in the Add section picker: a small live picture of it, then its name. The name is the button and its
// hit area covers the whole card; the picture sits outside it, since a block can draw buttons of its own (FAQ).
export function FeedSectionCard({ preview, name, ctx, lang, onAdd }: FeedSectionCardProps) {
    const add = useCallback(() => onAdd(preview.type), [onAdd, preview.type]);

    return (
        <div className="relative flex w-full flex-col overflow-hidden rounded-xl bg-surface-muted transition-colors hover:bg-border has-focus-visible:ring-2 has-focus-visible:ring-primary">
            {/* Preview: drawn at twice the card's width, then halved; a gallery with no photos shows empty tiles */}
            <div aria-hidden="true" inert className="pointer-events-none h-36 overflow-hidden">
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

            {/* Name: the card's one button */}
            <button
                type="button"
                onClick={add}
                className="px-4 py-3 text-left text-sm font-medium text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
                {name}
            </button>
        </div>
    );
}
