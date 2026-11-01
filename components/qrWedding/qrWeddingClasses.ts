// Class strings the wedding QR page's sections share. Breakpoints follow the page design:
// max-[761px] is "760px and narrower", max-[768px] "767px and narrower", and so on.

export const QR_EDITORIAL = '[font-family:var(--editorial)]';

// Copy painted with the brand gradient.
export const QR_GRADIENT_TEXT = 'bg-(image:--brand-gradient) bg-clip-text text-transparent';

// The rounded, tinted panel most sections sit in, on a white band.
export const QR_PANEL_SECTION = 'bg-white pt-5.5 pb-15';
export const QR_PANEL = 'mx-auto w-[min(1220px,100%_-_64px)] rounded-[30px] max-[761px]:w-[calc(100%_-_36px)] max-[761px]:rounded-[22px]';
export const QR_PANEL_TINT = 'bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)]';

// A small coral or ink label above a section title.
export const QR_KICKER = 'text-[11px] font-bold tracking-[0.2em] [font-family:Arial,sans-serif]';

// A section title with its second line in the brand gradient.
export const QR_SECTION_TITLE = 'm-0 text-[#151313] [font-family:var(--editorial)] leading-[1.04] font-normal tracking-[-0.04em]';
export const QR_SECTION_TITLE_SUB = `mx-auto block w-fit pb-[.08em] ${QR_GRADIENT_TEXT}`;

// The intro paragraph under a centered section title.
export const QR_SECTION_INTRO = 'mx-auto font-[Arial,sans-serif] leading-[1.55] text-[#6f6a64]';
