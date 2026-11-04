import { getTranslations } from 'next-intl/server';

import { AnnouncementLabel } from '@/components/feed/post/AnnouncementLabel';
import { PostSkeleton } from '@/components/feed/PostSkeleton';
import { RenderPost } from '@/components/vendorPages/renders/RenderPost';

// An announcement in the feed, with a sample message and post skeletons under it.
export async function AnnouncementRender() {
    const tTypes = await getTranslations('Vendors.types');
    const t = await getTranslations('VendorPages.renders.announce');

    return (
        <div className="min-h-full bg-background">
            {/* Announcement */}
            <RenderPost tinted label={<AnnouncementLabel />} author={t('author')} role={tTypes('PLANNER')} body={t('body')} />

            {/* Rest of the feed */}
            <div className="flex flex-col gap-3 p-3">
                <PostSkeleton />
                <PostSkeleton />
            </div>
        </div>
    );
}
