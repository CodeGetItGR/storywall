import { Heart, MessageCircle } from 'lucide-react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// A tilted post card beside the hero phone, drawn like the landing's wedding post cutouts.
export function OccasionPostCard({ avatar, photo, tilt }: { avatar: OccasionPhoto; photo: OccasionPhoto; tilt: 'left' | 'right' }) {
    return (
        <div
            className={`[container-type:inline-size] rounded-[7%/9%] bg-[#fbf9f6] p-[5%] shadow-[0_24px_40px_-18px_rgba(70,38,24,0.35)] ${tilt === 'left' ? '-rotate-6' : 'rotate-6'}`}
        >
            {/* Author */}
            <div className="mb-[4cqw] flex items-center gap-[3cqw]">
                <ProtectedImage
                    alt=""
                    className="size-[11cqw] rounded-full object-cover"
                    height={avatar.height}
                    sizes="40px"
                    src={avatar.src}
                    style={avatar.position ? { objectPosition: avatar.position } : undefined}
                    width={avatar.width}
                />
                <span className="flex flex-col gap-[2cqw]">
                    <span className="block h-[2.4cqw] w-[40cqw] rounded-full bg-[#151313]/12" />
                    <span className="block h-[2.4cqw] w-[26cqw] rounded-full bg-[#151313]/10" />
                </span>
            </div>
            {/* Photo */}
            <ProtectedImage
                alt=""
                className="aspect-[4/3] w-full rounded-[4cqw] object-cover"
                height={photo.height}
                sizes="(min-width: 761px) 260px, 40vw"
                src={photo.src}
                style={photo.position ? { objectPosition: photo.position } : undefined}
                width={photo.width}
            />
            {/* Reactions */}
            <div className="mt-[4cqw] flex items-center gap-[5cqw]">
                <Heart aria-hidden="true" className="size-[7cqw] fill-[#ff5a7a] text-[#ff5a7a]" />
                <MessageCircle aria-hidden="true" className="size-[7cqw] text-[#151313]/60" />
            </div>
        </div>
    );
}
