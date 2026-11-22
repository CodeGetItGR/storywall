'use client';

import { useCallback } from 'react';

import { FeedLook } from '@/components/feed/layout/FeedLook';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedSectionPreview } from '@/hooks/useFeedSectionPreviews';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { RenderContext } from '@/lib/invitation/render';

type FeedSectionCardProps = { preview: FeedSectionPreview; name: string; ctx: RenderContext; lang: string; onAdd: (type: NewSectionType) => void };

// One block in the Add section picker: a small live picture of it, then its name.
export function FeedSectionCard({ preview, name, ctx, lang, onAdd }: FeedSectionCardProps) {
    const add = useCallback(() => onAdd(preview.type), [onAdd, preview.type]);

    return (
        <button
            type="button"
            onClick={add}
            className="flex w-full flex-col overflow-hidden rounded-xl bg-surface-muted text-left transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
            {/* Preview: drawn at twice the card's width, then halved */}
            <div aria-hidden="true" inert className="pointer-events-none h-36 overflow-hidden">
                <div className="w-[200%] origin-top-left scale-50">
                    <FeedLook ctx={ctx} lang={lang} fontFaces="">
                        <InvitationSection section={preview.section} index={1} ctx={ctx} />
                    </FeedLook>
                </div>
            </div>

            {/* Name */}
            <span className="px-4 py-3 text-sm font-medium text-ink">{name}</span>
        </button>
    );
}
