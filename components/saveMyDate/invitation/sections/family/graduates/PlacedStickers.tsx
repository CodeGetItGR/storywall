import { Sticker } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/Sticker';
import type { StickerPlacement } from '@/lib/invitation/graduatesStyles';
import type { InvitationLabels } from '@/lib/invitation/labels';

// Stickers in fixed corners around a photo or the title.
export function PlacedStickers({ stickers, labels }: { stickers: readonly StickerPlacement[]; labels: InvitationLabels }) {
    return (
        <>
            {stickers.map((sticker) => (
                <Sticker key={`${sticker.kind}-${sticker.spot}`} kind={sticker.kind} labels={labels} tilt={sticker.tilt} className={`is-${sticker.spot}`} />
            ))}
        </>
    );
}
