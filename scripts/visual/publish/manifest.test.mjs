// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { validateManifest } from './manifest.mjs';

const valid = () => ({
    headSha: 'a'.repeat(40),
    baseSha: 'b'.repeat(40),
    totalCaptures: 2,
    counts: { changed: 1, new: 0, removed: 0, failed: 0 },
    fingerprint: 'c'.repeat(64),
    missingStories: [],
    entries: [
        {
            id: 'x',
            storyId: 'x',
            title: 'T',
            name: 'N',
            locale: 'en',
            width: 'mobile',
            state: 'changed',
            percent: 1,
            error: null,
            images: { after: `img/${'d'.repeat(16)}-after.webp` },
        },
    ],
});

describe('validateManifest', () => {
    it('accepts a valid manifest', () => {
        expect(validateManifest(valid()).fingerprint).toBe('c'.repeat(64));
    });

    it('rejects an image path outside img/', () => {
        const manifest = valid();
        manifest.entries[0].images.after = '../../evil.webp';
        expect(() => validateManifest(manifest)).toThrow(/image path/);
    });

    it('rejects a non-hex fingerprint', () => {
        expect(() => validateManifest({ ...valid(), fingerprint: 'nope' })).toThrow(/fingerprint/);
    });

    it('rejects an unknown state', () => {
        const manifest = valid();
        manifest.entries[0].state = 'weird';
        expect(() => validateManifest(manifest)).toThrow(/state/);
    });

    it('rejects a missing entries list', () => {
        expect(() => validateManifest({ ...valid(), entries: undefined })).toThrow(/entries/);
    });
});
