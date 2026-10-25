import { Ellipsis, Heart, MessageCircle, Pin } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingFeedPost } from '@/lib/occasions/weddingCopy';
import type { WeddingFeedPostMedia } from '@/lib/occasions/weddingMedia';

type Loading = { loading?: 'eager' | 'lazy' };

// A post's face, name and time, with the pin and more buttons.
export function FeedPostAuthor({ face, loading, name, time }: Loading & { face: OccasionPhoto; name: string; time: string }) {
    return (
        <div className="flex items-start gap-[2.6cqw] px-[1.3cqw]">
            <MockPhoto className="block size-[11.5cqw] shrink-0 rounded-full" loading={loading} photo={face} sizes="56px" />
            <div className="min-w-0 flex-1 pt-[0.6cqw]">
                <p className="m-0 text-[3.3cqw] leading-tight font-bold">{name}</p>
                <p className="m-0 mt-[0.4cqw] text-[2.7cqw] leading-tight text-[#151313]/50">{time}</p>
            </div>
            <Pin className="mt-[1cqw] size-[3.8cqw] text-[#151313]/45" strokeWidth={1.7} />
            <Ellipsis className="mt-[1cqw] ml-[3cqw] size-[4.4cqw] text-[#151313]/45" />
        </div>
    );
}

// One photo across the post, or two side by side.
export function FeedPostPhotos({ loading, photos }: Loading & { photos: WeddingFeedPostMedia['photos'] }) {
    const [first, second] = photos;
    return second ? (
        <div className="grid grid-cols-2 gap-[1.5cqw]">
            <MockPhoto
                className="block aspect-[3/4] w-full rounded-[1.5cqw]"
                loading={loading}
                photo={first}
                sizes="(min-width: 901px) 180px, 31vw"
            />
            <MockPhoto
                className="block aspect-[3/4] w-full rounded-[1.5cqw]"
                loading={loading}
                photo={second}
                sizes="(min-width: 901px) 180px, 31vw"
            />
        </div>
    ) : (
        <MockPhoto className="block aspect-[4/3] w-full rounded-[1.5cqw]" loading={loading} photo={first} sizes="(min-width: 901px) 360px, 62vw" />
    );
}

// A guest's post: author, caption, photos, likes and comments, and the two latest replies.
export function FeedPost({ copy, loading, media }: Loading & { copy: WeddingFeedPost; media: WeddingFeedPostMedia }) {
    return (
        <article className="border-t border-[#151313]/8 px-[2.6cqw] pt-[3.5cqw] pb-[3cqw]">
            {/* Author */}
            <FeedPostAuthor face={media.author} loading={loading} name={copy.author} time={copy.time} />
            {/* Caption */}
            <p className="mx-[1.3cqw] mt-[2cqw] mb-[2.6cqw] text-[3.3cqw] leading-snug">{copy.caption}</p>
            {/* Photos */}
            <FeedPostPhotos loading={loading} photos={media.photos} />
            {/* Reactions */}
            <div className="mt-[2.4cqw] flex items-center gap-[5cqw] px-[1.3cqw] text-[3.1cqw] leading-none">
                <span className="flex items-center gap-[1.4cqw] text-[#e2445c]">
                    <Heart className="size-[4.6cqw] fill-[#ff5a7a] text-[#ff5a7a]" />
                    {copy.likes}
                </span>
                <span className="flex items-center gap-[1.4cqw] text-[#151313]/60">
                    <MessageCircle className="size-[4.4cqw]" strokeWidth={1.7} />
                    {copy.comments}
                </span>
            </div>
            {/* Replies */}
            <div className="mt-[2.4cqw] flex flex-col gap-[1.6cqw] border-t border-[#151313]/6 px-[1.3cqw] pt-[2.4cqw]">
                {copy.replies.map((reply, index) => (
                    <p className="m-0 flex items-center gap-[1.8cqw] text-[2.8cqw] leading-tight" key={reply.author}>
                        <MockPhoto className="block size-[5cqw] shrink-0 rounded-full" loading={loading} photo={media.replies[index]!} sizes="24px" />
                        <strong className="shrink-0 font-bold">{reply.author}</strong>
                        <span className="truncate">{reply.text}</span>
                    </p>
                ))}
            </div>
        </article>
    );
}
