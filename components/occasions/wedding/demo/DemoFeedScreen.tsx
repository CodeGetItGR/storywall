import { Plus } from 'lucide-react';

import { FeedAppBar } from '@/components/occasions/wedding/feed/FeedAppBar';
import { FeedComposer } from '@/components/occasions/wedding/feed/FeedComposer';
import { FeedCover } from '@/components/occasions/wedding/feed/FeedCover';
import { FeedPostAuthor, FeedPostPhotos } from '@/components/occasions/wedding/feed/FeedPost';
import { FeedStories } from '@/components/occasions/wedding/feed/FeedStories';
import type { WeddingDemoFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import type { WEDDING_DEMO_MEDIA } from '@/lib/occasions/weddingMedia';

type DemoFeedScreenProps = { copy: WeddingDemoFeedCopy; media: typeof WEDDING_DEMO_MEDIA; mock: WeddingMockCopy };

// The wedding feed: countdown, cover, stories, composer and the latest post, with the add button.
export function DemoFeedScreen({ copy, media, mock }: DemoFeedScreenProps) {
    return (
        <>
            <FeedAppBar units={mock.units} />
            <FeedCover date={copy.date} photo={media.cover} place={copy.place} title={copy.title} />
            <FeedStories badge={mock.scheduleBadge} labels={mock.stories} stories={media.stories} viewer={media.viewer} />
            <FeedComposer placeholder={mock.composer} viewer={media.viewer} />
            {/* Latest post */}
            <div className="border-t border-[#151313]/8 px-[2.6cqw] pt-[3.5cqw]">
                <FeedPostAuthor face={media.post.author} name={copy.author} time={copy.time} />
                <div className="mt-[2.6cqw]">
                    <FeedPostPhotos photos={media.post.photos} />
                </div>
            </div>
            {/* Add */}
            <span className="absolute right-[4cqw] bottom-[4cqw] grid size-[13cqw] place-items-center rounded-full bg-[linear-gradient(135deg,#ff6f93,#ff936a)] text-white">
                <Plus className="size-[7cqw]" strokeWidth={2.2} />
            </span>
        </>
    );
}
