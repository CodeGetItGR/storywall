'use client';

import { ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SneakPeekLabel } from '@/components/feed/post/SneakPeekLabel';
import { VendorLogo } from '@/components/vendors/VendorLogo';

const TILES = [0, 1, 2] as const;

// How a sneak peek post looks in the guests' feed, drawn with the vendor's name and logo and placeholder photos.
export function SneakPeekSample({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    const t = useTranslations('BusinessPage.previews');

    return (
        <article className="overflow-hidden rounded-2xl bg-background ring-1 ring-ink/5">
            {/* Label */}
            <div className="px-4 pt-4">
                <SneakPeekLabel />
            </div>

            {/* Author */}
            <div className="flex items-center gap-2.5 px-4 pt-3">
                <VendorLogo logoUrl={logoUrl} name={name} />
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
            </div>

            {/* Caption */}
            <p className="px-4 pt-2 text-sm text-ink">{t('sampleCaption')}</p>

            {/* Photos */}
            <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-0.5">
                {TILES.map((tile) => (
                    <div key={tile} className="flex aspect-square items-center justify-center bg-surface-muted">
                        <ImageIcon className="size-5 text-ink-muted" />
                    </div>
                ))}
            </div>
        </article>
    );
}
