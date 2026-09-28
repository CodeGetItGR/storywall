import type { BugReportDisplayMode, BugReportRequestDto, RecentErrorDto } from '@/lib/api/types';

// Rules from beta-feedback-fe-integration.md §2. Anything invalid is a 400
// that still costs the tester one of their 5 reports an hour, so the client
// only ever sends values it has checked.

export const BUG_REPORT_DESCRIPTION_MIN = 10;
export const BUG_REPORT_DESCRIPTION_MAX = 4000;

const VIEWPORT_MAX = 20000;
const APP_VERSION_MAX = 64;
const LOCALE_MAX = 16;
const TIME_ZONE_MAX = 64;
const PAGE_URL_MAX = 2048;
const RECENT_ERRORS_MAX = 10;
const BCP47_PATTERN = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Checked in this order; `browser` when none match.
const DISPLAY_MODES: readonly BugReportDisplayMode[] = ['window-controls-overlay', 'fullscreen', 'standalone', 'minimal-ui'];

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || null;

export function isDescriptionValid(description: string): boolean {
    const length = description.trim().length;
    return length >= BUG_REPORT_DESCRIPTION_MIN && length <= BUG_REPORT_DESCRIPTION_MAX;
}

export function isScreenshotTooLarge(file: File, maxBytes: number): boolean {
    return file.size > maxBytes;
}

// First image on the clipboard, or null when the paste is text only.
export function findClipboardImage(clipboard: Pick<DataTransfer, 'files'> | null): File | null {
    if (!clipboard) return null;
    return Array.from(clipboard.files).find((file) => file.type.startsWith('image/')) ?? null;
}

export function currentDisplayMode(matchMedia: ((query: string) => { matches: boolean }) | undefined): BugReportDisplayMode {
    if (!matchMedia) return 'browser';
    return DISPLAY_MODES.find((mode) => matchMedia(`(display-mode: ${mode})`).matches) ?? 'browser';
}

// "en_US" is rejected server-side; "en-US" is fine.
export function normalizeLocale(raw: string | null | undefined): string | null {
    const locale = raw?.replace(/_/g, '-').trim();
    if (!locale || locale.length > LOCALE_MAX || !BCP47_PATTERN.test(locale)) return null;
    return locale;
}

// An empty string is a 400, so an unknown zone yields undefined and the field is left out.
export function normalizeTimeZone(raw: string | null | undefined): string | undefined {
    const zone = raw?.trim();
    if (!zone || zone.length > TIME_ZONE_MAX) return undefined;
    return zone;
}

function normalizeViewport(value: number | null | undefined): number | null {
    if (!value || !Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    return rounded >= 1 && rounded <= VIEWPORT_MAX ? rounded : null;
}

export interface BugReportContext {
    description: string;
    pageUrl: string | null;
    eventId: string | null;
    appVersion: string | null;
    locale: string | null | undefined;
    timeZone: string | null | undefined;
    viewportWidth: number | null | undefined;
    viewportHeight: number | null | undefined;
    displayMode: BugReportDisplayMode;
    recentErrors: RecentErrorDto[];
}

export function buildBugReportRequest(context: BugReportContext): BugReportRequestDto {
    const timeZone = normalizeTimeZone(context.timeZone);
    return {
        description: context.description.trim(),
        pageUrl: context.pageUrl && context.pageUrl.length <= PAGE_URL_MAX ? context.pageUrl : null,
        eventId: context.eventId && UUID_PATTERN.test(context.eventId) ? context.eventId : null,
        appVersion: context.appVersion ? context.appVersion.slice(0, APP_VERSION_MAX) : null,
        locale: normalizeLocale(context.locale),
        ...(timeZone ? { timeZone } : {}),
        viewportWidth: normalizeViewport(context.viewportWidth),
        viewportHeight: normalizeViewport(context.viewportHeight),
        displayMode: context.displayMode,
        recentErrors: context.recentErrors.slice(-RECENT_ERRORS_MAX),
    };
}

// `report` has to be a file part: a plain string field is answered with
// "Required request part 'report' is missing". FormData also makes the
// browser send Content-Length, without which the server answers 411.
export function buildBugReportForm(report: BugReportRequestDto, screenshot: File | null): FormData {
    const form = new FormData();
    form.append('report', new Blob([JSON.stringify(report)], { type: 'application/json' }), 'report.json');
    if (screenshot) form.append('screenshot', screenshot, screenshot.name);
    return form;
}

// Reads the browser context at submit time.
export function readBrowserContext(): Pick<BugReportContext, 'locale' | 'timeZone' | 'viewportWidth' | 'viewportHeight' | 'displayMode'> {
    let timeZone: string | undefined;
    try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        timeZone = undefined;
    }
    return {
        locale: navigator.language || document.documentElement.lang || null,
        timeZone,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        displayMode: currentDisplayMode(typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined),
    };
}
