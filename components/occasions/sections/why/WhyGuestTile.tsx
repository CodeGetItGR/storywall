import { ProtectedImage } from '@/components/common/ProtectedImage';
import { MockPhoto } from '@/components/occasions/sections/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

export type WhyGuestTileData = { alt: string; avatar: OccasionPhoto; avatarAlt: string; name: string; photo: OccasionPhoto; role: string };

// One guest's photo with a pill naming who posted it. Every second tile sits lower.
export function WhyGuestTile({ tile }: { tile: WhyGuestTileData }) {
    return (
        <div className="relative h-[clamp(228px,67vw,275px)] w-[clamp(168px,52vw,210px)] flex-none overflow-hidden rounded-3xl even:mt-7.5 min-[601px]:h-60 min-[601px]:w-45 min-[861px]:h-75 min-[861px]:w-57.5">
            <ProtectedImage
                alt={tile.alt}
                className="size-full object-cover"
                height={tile.photo.height}
                loading="lazy"
                sizes="(min-width: 861px) 230px, (min-width: 601px) 180px, 52vw"
                src={tile.photo.src}
                width={tile.photo.width}
            />
            {/* Who posted it; the photo's name already says it */}
            <div aria-hidden="true" className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-full bg-white/94 py-1.5 pr-3 pl-1.5 text-[12px]">
                <MockPhoto alt={tile.avatarAlt} className="size-7 flex-none rounded-full" photo={tile.avatar} sizes="28px" />
                <span className="truncate">
                    <b>{tile.name}</b> · {tile.role}
                </span>
            </div>
        </div>
    );
}
