import { WhyGuestTile, type WhyGuestTileData } from '@/components/occasions/sections/why/WhyGuestTile';

// A few guests' photos standing still in one centred row, the middle one lower. On a phone the
// outer ones run off the edges, as in the design.
export function WhyPhotoRow({ tiles }: { tiles: WhyGuestTileData[] }) {
    return (
        <div className="mt-6 flex justify-center overflow-hidden pl-2">
            <div className="flex w-max pb-7.5">
                <div className="flex gap-4 pr-4">
                    {tiles.map((tile) => (
                        <WhyGuestTile key={tile.photo.src} tile={tile} />
                    ))}
                </div>
            </div>
        </div>
    );
}
