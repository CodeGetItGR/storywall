import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

// The two comment cutouts beside the landing's hero phone, drawn in code. The root keeps the
// cutout's shape, so it drops into the cutout's place; the card inside is tilted like the cutout.
const SHAPE = {
    // Wide: a gradient heart, two lines, up to two faces.
    heart: { root: 'aspect-[705/360]', card: 'top-[14%] left-[7%] w-[86%] rotate-8' },
    // Small: a face, two lines, an outline heart.
    avatar: { root: 'aspect-[557/300]', card: 'top-[16%] left-[6%] w-[87%] -rotate-8' },
} as const;

type OccasionCommentCardProps = { faces: readonly OccasionPhoto[]; variant: keyof typeof SHAPE };

function Face({ className, photo }: { className: string; photo: OccasionPhoto }) {
    const t = useTranslations('LandingPage.imageAlts');

    return (
        <ProtectedImage
            alt={t('guestAvatar')}
            className={cn('rounded-full border-[0.9cqw] border-[#fbf9f6] object-cover', className)}
            height={photo.height}
            sizes="48px"
            src={photo.src}
            style={photo.position ? { objectPosition: photo.position } : undefined}
            width={photo.width}
        />
    );
}

// The brand gradient heart. The page draws one heart card, so the gradient id is fixed.
function GradientHeart() {
    return (
        <svg className="size-[13cqw] shrink-0" viewBox="0 0 24 24">
            <defs>
                <linearGradient id="occasion-comment-heart" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ff6f93" />
                    <stop offset="55%" stopColor="#ff936a" />
                    <stop offset="100%" stopColor="#ffd05b" />
                </linearGradient>
            </defs>
            <path
                d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z"
                fill="url(#occasion-comment-heart)"
            />
        </svg>
    );
}

// A tilted comment card beside the hero phone.
export function OccasionCommentCard({ faces, variant }: OccasionCommentCardProps) {
    const shape = SHAPE[variant];
    return (
        <div className={cn('[container-type:inline-size] relative', shape.root)}>
            <div
                className={cn(
                    'absolute flex items-center gap-[4cqw] rounded-[6cqw] bg-[#fbf9f6] px-[6cqw] py-[5cqw] shadow-[0_24px_40px_-18px_rgba(70,38,24,0.35)]',
                    shape.card,
                )}
            >
                {/* Reaction or author */}
                {variant === 'heart' ? <GradientHeart /> : <Face className="size-[13cqw] shrink-0" photo={faces[0]!} />}
                {/* Comment lines */}
                <span className="flex min-w-0 flex-1 flex-col gap-[2.6cqw]">
                    <span className="block h-[2.8cqw] w-full rounded-full bg-[#151313]/12" />
                    <span className="block h-[2.8cqw] w-[64%] rounded-full bg-[#151313]/10" />
                </span>
                {/* Faces or like */}
                {variant === 'heart' ? (
                    <span className="flex shrink-0 -space-x-[4cqw]">
                        {faces.map((face, index) => (
                            <Face className="size-[12cqw]" key={`${face.src}-${index}`} photo={face} />
                        ))}
                    </span>
                ) : (
                    <Heart className="size-[9cqw] shrink-0 text-[#ff5a7a]" strokeWidth={2} />
                )}
            </div>
        </div>
    );
}
