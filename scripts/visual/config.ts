export const LOCALES = ['en', 'el'] as const;
export type CaptureLocale = (typeof LOCALES)[number];

export const BROWSER_LOCALES: Record<CaptureLocale, string> = { en: 'en-US', el: 'el-GR' };

export const WIDTHS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
] as const;
export type WidthName = (typeof WIDTHS)[number]['name'];

export const TAG_SKIP = 'visual-skip';
export const TAG_DESKTOP_ONLY = 'visual-desktop-only';
export const TAG_MOBILE_ONLY = 'visual-mobile-only';

// A pixel differs when a channel is further apart than this. comparePixels'
// default of 16 would miss subtle colour changes.
export const CHANNEL_TOLERANCE = 2;
// A capture counts as changed when more pixels than this differ.
export const PIXEL_BUDGET = 10;
// A capture that differs is taken again this many times before it counts.
export const RETAKES = 2;
// Retakes stop after this many captures. That many differences means a real change,
// and retaking every capture would overrun the job.
export const MAX_RETAKEN_CAPTURES = 50;

// If this many captures at the start all fail, the run stops.
export const EARLY_STOP_AFTER = 20;

export const CONCURRENCY = 4;
export const RENDER_TIMEOUT_MS = 30_000;
export const STABLE_FRAME_ATTEMPTS = 10;
export const STABLE_FRAME_DELAY_MS = 250;

// Fonts come from Google at run time in Storybook, so that host stays reachable.
export const HOST_RESOLVER_RULES = 'MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost, EXCLUDE fonts.gstatic.com';
