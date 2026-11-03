// The shop's shared classes, in the landing's palette. landing.css resets `.landing-page a`
// (color: inherit, no underline) outside any layer, so link colors need `!`.
export const SHOP_INNER = 'mx-auto w-full max-w-295 px-5 min-[761px]:px-8';
export const SHOP_CHIP = 'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold no-underline transition-colors';
export const SHOP_CHIP_IDLE = 'bg-white text-[#151313]! hover:bg-white/70';
export const SHOP_CHIP_ACTIVE = 'bg-[#151313] text-white!';
export const SHOP_PRIMARY_BUTTON =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#151313] px-6 text-sm font-semibold text-white! no-underline transition-opacity hover:opacity-85';
// A sideways strip (category chips, product photos) that scrolls without a scrollbar on every device.
// globals.css styles every scrollbar outside any layer, so these need `!`.
export const SHOP_SCROLL_ROW = 'overflow-x-auto [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden!';
export const SHOP_MUTED = 'text-[#151313]/60';
