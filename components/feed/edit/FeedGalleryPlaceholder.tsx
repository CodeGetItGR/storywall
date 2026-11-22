import { Plus } from 'lucide-react';

const TILES = [0, 1, 2];

// A gallery card's picture while it has no photos: a few empty tiles.
export function FeedGalleryPlaceholder() {
    return (
        <div className="grid h-full grid-cols-3 gap-2 p-4" data-testid="feed-gallery-placeholder">
            {TILES.map((tile) => (
                <div key={tile} className="flex items-center justify-center rounded-lg border-2 border-dashed border-black/15 bg-[#f6f2ee]">
                    <Plus className="h-6 w-6 text-[#8a8a8a]" aria-hidden="true" />
                </div>
            ))}
        </div>
    );
}
