// Shared classes for the theme catalogue and theme pages: the landing's ink, gradient and pill buttons.
export const STOREFRONT_WRAP = 'mx-auto w-[calc(100%-32px)] max-w-305 min-[761px]:w-[calc(100%-64px)]';

const BUTTON =
    'inline-flex min-h-11 items-center justify-center rounded-full px-5 py-1.5 text-center text-[15px] leading-tight font-semibold tracking-tight focus-ring transition-transform hover:-translate-y-0.5 motion-reduce:transition-none';

export const PRIMARY_BUTTON = `${BUTTON} bg-[linear-gradient(100deg,#ff6f93,#ff936a_52%,#ffd05b)] text-white shadow-[0_12px_24px_rgba(217,102,74,.15)]`;
export const SECONDARY_BUTTON = `${BUTTON} border border-[#151313]/20 bg-white text-[#151313]`;

export const CHIP =
    'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold focus-ring transition-colors aria-pressed:border-[#151313] aria-pressed:bg-[#151313] aria-pressed:text-white';
export const CHIP_IDLE = 'border-[#151313]/15 bg-white text-[#151313] hover:border-[#151313]/40';

// A small segmented control (sort, columns): a tinted track, the chosen option raised in white.
export const SEGMENTED_TRACK = 'inline-flex rounded-full bg-[#151313]/6 p-1';
export const SEGMENT_ON = 'bg-white text-[#151313] shadow-[0_1px_3px_rgba(21,19,19,.12)]';
export const SEGMENT_OFF = 'text-[#151313]/60 hover:text-[#151313]';

export const HEADING_SERIF = 'font-[Baskerville,Georgia,serif] font-normal tracking-[-.04em] text-balance';

// The catalogue's grid: one card a row on phones (two by choice), up to four on wide screens.
export const CATALOGUE_GRID = 'grid gap-4 min-[651px]:grid-cols-2 min-[651px]:gap-5 min-[981px]:grid-cols-3 min-[1221px]:grid-cols-4';
