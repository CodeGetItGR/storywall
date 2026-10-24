'use client';

import { useTranslations } from 'next-intl';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import type { PrintListItemDto } from '@/lib/api/types';

// A pick as the photographer sees it: thumbnail, size and copies.
export function PrintListReadRow({ item }: { item: PrintListItemDto }) {
    const t = useTranslations('Vendors.prints');
    const { media } = item;

    return (
        <li className="flex items-center gap-3 py-2">
            {/* Photo */}
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                {media && (
                    <MediaThumbnail
                        src={media.mediaUrl}
                        mediaType={media.mediaType}
                        status={media.status}
                        thumbnailUrl={media.thumbnailUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                    />
                )}
            </div>

            {/* Size and copies */}
            <p className="min-w-0 truncate text-sm text-ink">
                {item.sizeLabel ?? t('noSize')} · {t('copies', { count: item.copies })}
            </p>
        </li>
    );
}
