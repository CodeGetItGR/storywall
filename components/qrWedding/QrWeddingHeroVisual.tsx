'use client';

import { motion } from 'framer-motion';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { type LandingHeroFloat, useLandingHeroFloat } from '@/hooks/useLandingHeroFloat';
import { QR_WEDDING_MEDIA } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

export type QrWeddingHeroImageAlts = { newlyweds: string; reception: string; love: string; glasses: string; heart: string };

// Six-second bob, each item starting at its own point in the loop.
const BOB = { keyframes: { y: [0, -8, 0] }, duration: 6 };
const FLOATS: Record<string, LandingHeroFloat> = {
    newlyweds: BOB,
    reception: { ...BOB, delay: -2 },
    love: { ...BOB, delay: -4 },
    heartSmall: BOB,
    heartMedium: { ...BOB, delay: -3 },
};

const POST_SHADOW = '[filter:drop-shadow(0_14px_22px_rgba(60,40,25,.14))]';

// The items around the video: two guest posts, an emoji, glasses and hearts. Decorative, so hidden
// from screen readers; their alt text still describes them.
const ITEMS = [
    {
        key: 'newlyweds',
        file: 'hero-post-newlyweds',
        width: 624,
        height: 677,
        rotate: 6,
        alt: 'newlyweds',
        className: `top-[4%] right-[-34%] w-[46%] max-[901px]:right-[-26%] ${POST_SHADOW}`,
    },
    {
        key: 'reception',
        file: 'hero-post-reception',
        width: 696,
        height: 612,
        rotate: -7,
        alt: 'reception',
        className: `bottom-[6%] left-[-40%] w-1/2 max-[901px]:left-[-28%] ${POST_SHADOW}`,
    },
    { key: 'love', file: 'hero-heart-eyes-emoji', width: 441, height: 440, rotate: 0, alt: 'love', className: 'top-[-6%] left-[-14%] w-[26%]' },
    {
        key: 'glasses',
        file: 'hero-champagne-glasses',
        width: 253,
        height: 331,
        rotate: 0,
        alt: 'glasses',
        className: 'right-[-20%] bottom-[-10%] w-[30%]',
    },
    { key: 'heartSmall', file: 'hero-heart-small', width: 111, height: 155, rotate: 0, alt: 'heart', className: 'top-[-11%] left-[55%] w-[14%]' },
    { key: 'heartMedium', file: 'hero-heart-medium', width: 167, height: 219, rotate: 0, alt: 'heart', className: 'top-[52%] right-[-20%] w-[15%]' },
    { key: 'heartLarge', file: 'hero-heart-large', width: 200, height: 243, rotate: 0, alt: 'heart', className: 'bottom-[-11%] left-[14%] w-[15%]' },
] as const;

type QrWeddingHeroVisualProps = { videoLabel: string; poster: string; video: string; alts: QrWeddingHeroImageAlts };

// The looping video of a guest scanning the table QR code, with the floating items around it.
export function QrWeddingHeroVisual({ videoLabel, poster, video, alts }: QrWeddingHeroVisualProps) {
    const floats = useLandingHeroFloat(FLOATS, false);

    return (
        <div className="relative mx-auto mt-5 mb-12.5 w-[min(440px,34vw)] max-[901px]:mt-10 max-[901px]:mb-15 max-[901px]:w-[min(380px,100%_-_120px)] max-[561px]:w-[calc(100%_-_110px)]">
            {/* Video */}
            <video
                aria-label={videoLabel}
                autoPlay
                className="relative z-2 block aspect-[4/5] h-auto w-full rounded-[32px] bg-[#efe6da] object-cover shadow-[0_30px_60px_rgba(60,40,25,.2)] max-[561px]:rounded-3xl"
                height={900}
                loop
                muted
                playsInline
                poster={poster}
                preload="metadata"
                width={720}
            >
                <source src={video} type="video/mp4" />
            </video>

            {/* Floating items */}
            {ITEMS.map((item) => (
                <motion.div
                    aria-hidden="true"
                    className={cn('absolute z-3', item.className)}
                    key={item.key}
                    style={{ rotate: item.rotate, ...floats[item.key] }}
                >
                    <ProtectedImage
                        alt={alts[item.alt]}
                        className="block h-auto w-full"
                        height={item.height}
                        sizes="(max-width: 900px) 180px, 210px"
                        src={`${QR_WEDDING_MEDIA}/${item.file}.webp`}
                        width={item.width}
                    />
                </motion.div>
            ))}
        </div>
    );
}
