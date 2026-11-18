const VIEWPORT_MARGIN = 8;
const GAP = 6;

type Box = { top: number; bottom: number; left: number; width: number };

// Where an info bubble goes: centred under its icon, flipped above it when there is no room below,
// and always inside the viewport.
export function placeInfoTip(trigger: Box, bubble: { width: number; height: number }, viewport: { width: number; height: number }) {
    const centred = trigger.left + trigger.width / 2 - bubble.width / 2;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(centred, viewport.width - bubble.width - VIEWPORT_MARGIN));
    const below = trigger.bottom + GAP;
    const fitsBelow = below + bubble.height <= viewport.height - VIEWPORT_MARGIN;
    const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, trigger.top - GAP - bubble.height);
    return { top, left };
}
