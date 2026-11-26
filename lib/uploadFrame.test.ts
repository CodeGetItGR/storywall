import { afterEach, describe, expect, it } from 'vitest';

import { FRAME_DESIGNS, frameLayout, frameSvg, frameSvgDataUrl, frameText, readFrameChoice, saveFrameChoice } from '@/lib/uploadFrame';

const text = { title: 'Μαρία & Νίκος', date: '2 Ιουλίου 2026' };

// Spec 2026-11-26-graduation-event-type-design.md §7.2.
describe('the frame designs', () => {
    it('are classic, laurel and confetti', () => {
        expect(FRAME_DESIGNS).toEqual(['CLASSIC', 'LAUREL', 'CONFETTI']);
    });

    it.each([
        ['portrait', 1500, 2000],
        ['landscape', 2000, 1500],
    ])('cover the whole %s photo, keeping its shape, with the band along the bottom', (_, width, height) => {
        const layout = frameLayout({ width, height });
        expect(layout.border).toBe(Math.round(1500 * 0.035));
        expect(layout.bandTop + layout.band + layout.border).toBe(height);
        for (const design of FRAME_DESIGNS) {
            const svg = frameSvg(design, { width, height }, text);
            expect(svg).toContain(`width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`);
        }
    });

    it('scale with the short side, so portrait and landscape frames match', () => {
        expect(frameLayout({ width: 1500, height: 2000 }).band).toBe(frameLayout({ width: 2000, height: 1500 }).band);
    });

    it('each draw a graduation cap, the title and the date', () => {
        for (const design of FRAME_DESIGNS) {
            const svg = frameSvg(design, { width: 1500, height: 2000 }, text);
            expect(svg).toContain('data-part="cap"');
            expect(svg).toContain('Μαρία &amp; Νίκος');
            expect(svg).toContain('2 Ιουλίου 2026');
        }
    });

    it('look different from each other', () => {
        expect(frameSvg('LAUREL', { width: 1500, height: 2000 }, text)).toContain('data-part="laurel"');
        expect(frameSvg('CONFETTI', { width: 1500, height: 2000 }, text)).toContain('data-part="confetti"');
        expect(frameSvg('CLASSIC', { width: 1500, height: 2000 }, text)).not.toContain('data-part="laurel"');
    });

    it('never let the title break out of the SVG', () => {
        const svg = frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: '</text><script>alert(1)</script>', date: '"x"' });
        expect(svg).not.toContain('<script>');
        expect(svg).toContain('&lt;/text&gt;&lt;script&gt;');
        expect(svg).toContain('&quot;x&quot;');
    });

    it('squeeze a long title to the room it has', () => {
        const long = frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: 'Α'.repeat(80), date: '' });
        expect(long).toContain(`textLength="${frameLayout({ width: 1500, height: 2000 }).textWidth}"`);
        expect(frameSvg('CLASSIC', { width: 1500, height: 2000 }, text)).not.toContain('textLength');
    });

    it('leave the date out when the event has none', () => {
        expect(frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: 'Μαρία', date: '' })).not.toContain('data-part="date"');
    });

    it('can be used as an image source', () => {
        expect(frameSvgDataUrl('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E');
    });
});

describe('the frame text', () => {
    it("is the event's title and its start date in the uploader's language, on the event's own calendar day", () => {
        // 21:30 UTC is already the 2nd in Athens.
        const event = { title: ' Μαρία ', startAt: '2026-07-01T21:30:00Z', timezone: 'Europe/Athens' };
        expect(frameText(event, 'el')).toEqual({ title: 'Μαρία', date: '2 Ιουλίου 2026' });
        expect(frameText(event, 'en').date).toBe('July 2, 2026');
    });

    it('has no date for an event without one', () => {
        expect(frameText({ title: 'Μαρία', startAt: null, timezone: null }, 'el')).toEqual({ title: 'Μαρία', date: '' });
    });
});

describe('the Add frame choice', () => {
    afterEach(() => sessionStorage.clear());

    it('is off until turned on, and kept per event for the rest of the visit', () => {
        expect(readFrameChoice('e1')).toBe(false);
        saveFrameChoice('e1', true);
        expect(readFrameChoice('e1')).toBe(true);
        expect(readFrameChoice('e2')).toBe(false);
        expect(sessionStorage.getItem('storywall:upload-frame:e1')).toBe('on');
    });
});
