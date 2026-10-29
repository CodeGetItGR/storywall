import { describe, expect, it } from 'vitest';

import { scrubRecordingEvent } from '@/lib/sentry/options';

describe('scrubRecordingEvent', () => {
    it('scrubs the page URL of a meta event', () => {
        const event = { type: 4, data: { href: 'https://www.storywall.gr/invite/abc123?ref=1', width: 1, height: 1 } };

        expect(scrubRecordingEvent(event).data.href).toBe('https://www.storywall.gr/invite/:token');
    });

    it('scrubs the URL of a span', () => {
        const event = {
            type: 5,
            data: {
                tag: 'performanceSpan',
                payload: { op: 'navigation.push', description: '/gift/abc123', data: { url: '/q/xyz?ref=1' } },
            },
        };

        const scrubbed = scrubRecordingEvent(event).data.payload;
        expect(scrubbed.description).toBe('/gift/:token');
        expect(scrubbed.data.url).toBe('/q/:token');
    });

    it('leaves a DOM event alone', () => {
        const event = { type: 3, data: { source: 1, positions: [] } };

        expect(scrubRecordingEvent(event)).toEqual({ type: 3, data: { source: 1, positions: [] } });
    });
});
