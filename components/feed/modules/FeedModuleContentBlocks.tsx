'use client';

import { FeedGalleryBlock } from '@/components/feed/modules/FeedGalleryBlock';
import { FeedWishbookBlock } from '@/components/feed/modules/FeedWishbookBlock';
import { useFeedGalleryBlock } from '@/hooks/useFeedGalleryBlock';
import { useFeedWishbookBlock } from '@/hooks/useFeedWishbookBlock';
import type { EventDetailResponseDto } from '@/lib/api/types';

type Props = { event: EventDetailResponseDto; available: boolean; underTools: boolean };

// The feed's Gallery block with the event's photos (KAN-299).
export function FeedGalleryModule({ event, available, underTools }: Props) {
    return <FeedGalleryBlock {...useFeedGalleryBlock(event, available)} underTools={underTools} />;
}

// The feed's Wishbook block with the event's wishes (KAN-299).
export function FeedWishbookModule({ event, available, underTools }: Props) {
    return <FeedWishbookBlock {...useFeedWishbookBlock(event, available)} underTools={underTools} />;
}
