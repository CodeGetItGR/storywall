import { Heart, MapPin, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionHeroFeed, OccasionPhoto } from '@/lib/occasions/occasionMedia';

export type OccasionFeedPost = { author: string; time: string; caption: string; likes: number; replies: { author: string; text: string }[] };

export type OccasionFeedCopy = {
    title: string;
    date: string;
    place: string;
    stories: string[];
    composer: string;
    posts: OccasionFeedPost[];
};

type OccasionPhoneFeedProps = { copy: OccasionFeedCopy; media: OccasionHeroFeed };

// Sizes are in container widths (cqw), so the feed scales with the phone like a screenshot would.
function Photo({ alt, className, photo, sizes }: { alt: string; className: string; photo: OccasionPhoto; sizes: string }) {
    return (
        <ProtectedImage
            alt={alt}
            className={`object-cover ${className}`}
            fetchPriority="low"
            height={photo.height}
            loading="eager"
            sizes={sizes}
            src={photo.src}
            style={photo.position ? { objectPosition: photo.position } : undefined}
            width={photo.width}
        />
    );
}

// A StoryWall feed drawn in code from the occasion's photos: the event header, its stories, then posts.
export function OccasionPhoneFeed({ copy, media }: OccasionPhoneFeedProps) {
    const t = useTranslations('ImageAlt');
    const avatar = (index: number) => media.avatars[index % media.avatars.length]!;

    return (
        <div className="[container-type:inline-size] bg-white text-[#151313]">
            {/* App bar */}
            <div className="flex items-center gap-[2cqw] px-[4cqw] pt-[9cqw] pb-[3cqw]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
                <img alt={t('storywallLogo')} className="h-[6cqw] w-auto" height={28} src="/assets/LogoText.svg" width={140} />
            </div>

            {/* Event cover */}
            <div className="relative mx-[3cqw] overflow-hidden rounded-[5cqw]">
                <Photo alt={copy.title} className="aspect-[16/11] w-full" photo={media.cover} sizes="300px" />
                <p className="absolute inset-x-0 bottom-0 m-0 bg-[linear-gradient(to_top,rgba(0,0,0,.55),transparent)] px-[4cqw] pt-[8cqw] pb-[3cqw] [font-family:var(--editorial)] text-[7cqw] leading-[1.05] text-white">
                    {copy.title}
                </p>
            </div>

            {/* Date and place */}
            <div className="flex items-center justify-between px-[4cqw] pt-[3cqw] text-[3.6cqw] tracking-[0.04em] uppercase">
                <span>{copy.date}</span>
                <span className="flex items-center gap-[1cqw]">
                    <MapPin aria-hidden="true" className="size-[3.6cqw]" />
                    {copy.place}
                </span>
            </div>

            {/* Stories */}
            <div className="flex justify-between px-[4cqw] pt-[4cqw]">
                {copy.stories.map((label, index) => (
                    <div className="flex w-[19cqw] flex-col items-center gap-[1.5cqw]" key={label}>
                        <span className="block rounded-full bg-[linear-gradient(135deg,#ff6f93,#ff936a_52%,#ffd05b)] p-[0.8cqw]">
                            <Photo alt={label} className="block size-[15cqw] rounded-full border-[0.8cqw] border-white" photo={avatar(index)} sizes="48px" />
                        </span>
                        <span className="text-[2.8cqw] whitespace-nowrap">{label}</span>
                    </div>
                ))}
            </div>

            {/* Composer */}
            <div className="mx-[4cqw] mt-[4cqw] rounded-full bg-[#fbeee8] px-[4cqw] py-[2.6cqw] text-[3.4cqw] text-[#151313]/45">{copy.composer}</div>

            {/* Posts */}
            {copy.posts.map((post, index) => (
                <article className="mt-[5cqw] border-t border-[#151313]/8 px-[4cqw] pt-[4cqw] pb-[2cqw]" key={post.author}>
                    <div className="flex items-center gap-[2.5cqw]">
                        <Photo alt={t('profilePhotoOf', { name: post.author })} className="block size-[9cqw] rounded-full" photo={avatar(index + 1)} sizes="32px" />
                        <div>
                            <p className="m-0 text-[3.6cqw] font-bold">{post.author}</p>
                            <p className="m-0 text-[2.8cqw] text-[#151313]/50">{post.time}</p>
                        </div>
                    </div>
                    <p className="mt-[2cqw] mb-[2.5cqw] text-[3.4cqw]">{post.caption}</p>
                    <Photo alt={t('photoBy', { name: post.author })} className="aspect-[4/3] w-full rounded-[3cqw]" photo={media.posts[index % media.posts.length]!} sizes="300px" />
                    <div className="mt-[2cqw] flex items-center gap-[4cqw] text-[3.2cqw] text-[#151313]/60">
                        <span className="flex items-center gap-[1cqw]">
                            <Heart aria-hidden="true" className="size-[4cqw] fill-[#ff5a7a] text-[#ff5a7a]" />
                            {post.likes}
                        </span>
                        <span className="flex items-center gap-[1cqw]">
                            <MessageCircle aria-hidden="true" className="size-[4cqw]" />
                            {post.replies.length}
                        </span>
                    </div>
                    {post.replies.map((reply) => (
                        <p className="mt-[1.5cqw] mb-0 text-[3.2cqw]" key={reply.author}>
                            <strong>{reply.author}</strong> {reply.text}
                        </p>
                    ))}
                </article>
            ))}
        </div>
    );
}
