import { Fragment } from 'react';

import { FeedAppBar } from '@/components/occasions/wedding/feed/FeedAppBar';
import { FeedComposer } from '@/components/occasions/wedding/feed/FeedComposer';
import { FeedCover } from '@/components/occasions/wedding/feed/FeedCover';
import { FeedMusicCard } from '@/components/occasions/wedding/feed/FeedMusicCard';
import { FeedPost } from '@/components/occasions/wedding/feed/FeedPost';
import { FeedStories } from '@/components/occasions/wedding/feed/FeedStories';
import type { WeddingHeroFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import type { WeddingHeroMedia } from '@/lib/occasions/weddingMedia';

// The playlist card comes before the seventh post, as in the design.
const MUSIC_BEFORE_POST = 6;

type WeddingPhoneFeedProps = { copy: WeddingHeroFeedCopy; media: WeddingHeroMedia; mock: WeddingMockCopy };

// The hero phone's feed, drawn from the wedding photos and copy. Every photo loads at once (low
// priority), so none pops in while the feed scrolls.
export function WeddingPhoneFeed({ copy, media, mock }: WeddingPhoneFeedProps) {
    return (
        // The landing's feed track is 105.65% of the screen, shifted 2.85% left; this padding (2.7% of
        // the track) puts the feed's edges on the screen's.
        <div className="[container-type:inline-size] bg-white px-[2.7%] pb-[6cqw] text-[#151313]">
            {/* App bar */}
            <FeedAppBar units={mock.units} />
            {/* Cover, date and place */}
            <FeedCover date={copy.date} loading="eager" photo={media.cover} place={copy.place} title={copy.title} />
            {/* Stories */}
            <FeedStories badge={mock.scheduleBadge} labels={mock.stories} loading="eager" stories={media.stories} viewer={media.viewer} />
            {/* Composer */}
            <FeedComposer loading="eager" placeholder={mock.composer} viewer={media.viewer} />
            {/* Posts, with the playlist card */}
            {copy.posts.map((post, index) => (
                <Fragment key={post.author}>
                    {index === MUSIC_BEFORE_POST ? <FeedMusicCard copy={copy.music} /> : null}
                    <FeedPost copy={post} loading="eager" media={media.posts[index]!} />
                </Fragment>
            ))}
        </div>
    );
}
