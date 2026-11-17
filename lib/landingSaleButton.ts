// The sale pill: pinned above the safe area on phones and tablets, a warm gradient with ink text (white on
// it is too low in contrast). The phone create button takes the same look during a sale.
export const SALE_BUTTON_CLASS =
    'fixed inset-x-3 bottom-[calc(var(--visual-viewport-bottom-inset,0px)+env(safe-area-inset-bottom,0px)+0.75rem)] z-30 mx-auto flex min-h-14 max-w-xl items-center justify-between gap-3 rounded-full bg-[linear-gradient(100deg,#ff6f93,#ff936a_52%,#ffd05b)] py-2 pr-2 pl-5 text-[15px] leading-tight text-[#151313] shadow-[0_12px_30px_rgba(36,31,26,0.28)] focus-ring transition-[opacity,translate,visibility] duration-200 motion-reduce:transition-none min-[761px]:hidden';

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
