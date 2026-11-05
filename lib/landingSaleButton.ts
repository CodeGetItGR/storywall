// Where the landing's sale button shows: after the first screen (the hero's own buttons are gone)
// and before the plans come into view. Past the plans the page has its own final button.
export function saleButtonInScrollRange({
    scrollY,
    viewportHeight,
    pricingTop,
}: {
    scrollY: number;
    viewportHeight: number;
    // The plans section's top, relative to the screen. null: not on the page, so nowhere to go.
    pricingTop: number | null;
}): boolean {
    if (pricingTop === null) return false;
    return scrollY >= viewportHeight && pricingTop > viewportHeight;
}
