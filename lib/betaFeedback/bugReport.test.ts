import { describe, expect, it } from 'vitest';

import { type BugReportContext, buildBugReportForm, buildBugReportRequest, currentDisplayMode, normalizeLocale } from '@/lib/betaFeedback/bugReport';

const EVENT_ID = '3f2b8c1e-5d4a-4f6b-9a7c-2e1d0b9a8c7f';

function context(overrides: Partial<BugReportContext> = {}): BugReportContext {
    return {
        description: '  The gallery never finishes loading.  ',
        pageUrl: 'https://app.example/events/:eventId/tools/gallery',
        eventId: EVENT_ID,
        appVersion: 'abc123def456',
        locale: 'el-GR',
        timeZone: 'Europe/Athens',
        viewportWidth: 390,
        viewportHeight: 844,
        displayMode: 'standalone',
        recentErrors: [],
        ...overrides,
    };
}

async function readReportPart(form: FormData) {
    const part = form.get('report');
    expect(part).toBeInstanceOf(Blob);
    return JSON.parse(await (part as Blob).text());
}

describe('buildBugReportForm', () => {
    it('sends `report` as a JSON Blob part, not a string field', async () => {
        const form = buildBugReportForm(buildBugReportRequest(context()), null);

        const part = form.get('report');
        expect(typeof part).not.toBe('string');
        expect((part as Blob).type).toBe('application/json');
        expect(await readReportPart(form)).toMatchObject({ description: 'The gallery never finishes loading.', eventId: EVENT_ID });
        expect(form.has('screenshot')).toBe(false);
    });

    it('adds the screenshot as its own part', () => {
        const screenshot = new File(['png'], 'shot.png', { type: 'image/png' });
        const form = buildBugReportForm(buildBugReportRequest(context()), screenshot);
        expect((form.get('screenshot') as File).name).toBe('shot.png');
    });

    it.each([undefined, null, '', '   '])('omits timeZone when it is unknown (%j)', async (timeZone) => {
        const report = await readReportPart(buildBugReportForm(buildBugReportRequest(context({ timeZone })), null));
        expect(report).not.toHaveProperty('timeZone');
    });

    it('sends only the fields the server knows', async () => {
        const report = await readReportPart(buildBugReportForm(buildBugReportRequest(context()), null));
        expect(Object.keys(report).sort()).toEqual(
            [
                'appVersion',
                'description',
                'displayMode',
                'eventId',
                'locale',
                'pageUrl',
                'recentErrors',
                'timeZone',
                'viewportHeight',
                'viewportWidth',
            ].sort(),
        );
    });
});

describe('buildBugReportRequest field rules', () => {
    it('nulls values the server would reject', () => {
        const report = buildBugReportRequest(context({ eventId: 'not-a-uuid', viewportWidth: 0, viewportHeight: 30000, locale: 'x' }));
        expect(report).toMatchObject({ eventId: null, viewportWidth: null, viewportHeight: null, locale: null });
    });

    it('keeps at most 10 recent errors', () => {
        const recentErrors = Array.from({ length: 12 }, (_, i) => ({ path: `/api/${i}`, status: 500 }));
        expect(buildBugReportRequest(context({ recentErrors })).recentErrors).toHaveLength(10);
    });
});

describe('normalizeLocale', () => {
    it.each([
        ['el-GR', 'el-GR'],
        ['en_US', 'en-US'],
        ['el', 'el'],
        ['', null],
        [undefined, null],
    ])('%j → %j', (input, expected) => {
        expect(normalizeLocale(input)).toBe(expected);
    });
});

describe('currentDisplayMode', () => {
    it('returns the first matching mode, else browser', () => {
        expect(currentDisplayMode((query) => ({ matches: query === '(display-mode: standalone)' }))).toBe('standalone');
        expect(currentDisplayMode(() => ({ matches: false }))).toBe('browser');
        expect(currentDisplayMode(undefined)).toBe('browser');
    });
});
