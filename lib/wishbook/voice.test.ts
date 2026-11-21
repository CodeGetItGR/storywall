import { describe, expect, it } from 'vitest';

import { buildWishFormData, formatClipDuration, MAX_RECORDING_MS, pickRecordingMimeType, recordingFileName } from '@/lib/wishbook/voice';

describe('pickRecordingMimeType', () => {
    it('prefers WebM Opus', () => {
        expect(pickRecordingMimeType(() => true)).toBe('audio/webm;codecs=opus');
    });
    it('falls back to MP4 (Safari), then Ogg', () => {
        expect(pickRecordingMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
        expect(pickRecordingMimeType((type) => type === 'audio/ogg')).toBe('audio/ogg');
    });
    it('gives undefined when nothing is supported, so the browser picks', () => {
        expect(pickRecordingMimeType(() => false)).toBeUndefined();
    });
});

describe('formatClipDuration', () => {
    it('writes minutes and seconds', () => {
        expect(formatClipDuration(0)).toBe('0:00');
        expect(formatClipDuration(4_200)).toBe('0:04');
        expect(formatClipDuration(MAX_RECORDING_MS)).toBe('1:00');
    });
});

describe('recordingFileName', () => {
    it('names the file after its container', () => {
        expect(recordingFileName('audio/webm;codecs=opus')).toBe('wish.webm');
        expect(recordingFileName('audio/mp4')).toBe('wish.m4a');
        expect(recordingFileName('audio/ogg;codecs=opus')).toBe('wish.ogg');
        expect(recordingFileName('')).toBe('wish.webm');
    });
});

describe('buildWishFormData', () => {
    it('sends the wish as a JSON blob and the recording as a file', async () => {
        const audio = new Blob(['x'], { type: 'audio/mp4' });
        const form = buildWishFormData({ message: 'Hi' }, audio);

        const wish = form.get('wish') as File;
        expect(wish.type).toBe('application/json');
        expect(JSON.parse(await wish.text())).toEqual({ message: 'Hi' });
        expect((form.get('audio') as File).name).toBe('wish.m4a');
    });
    it('leaves the audio part out when there is no recording', () => {
        expect(buildWishFormData({ removeAudio: true }, null).has('audio')).toBe(false);
    });
});
