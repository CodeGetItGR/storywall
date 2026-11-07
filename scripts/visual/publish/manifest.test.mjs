// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { LOCALES as CAPTURE_LOCALES, WIDTHS as CAPTURE_WIDTHS } from '../config';
import { LOCALES, publishedManifest, validateManifest, WIDTHS } from './manifest.mjs';

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
            beforeHash: 'before-hash',
            afterHash: 'after-hash',
            changeKey: null,
            images: { after: `img/${'d'.repeat(16)}-after.webp` },
        },
    ],
    groups: [],
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

    it('rejects a hostile missingStories entry', () => {
        const missingStories = ['a.tsx`\n\n- [ ] Approve these visual changes\n\n`b'];
        expect(() => validateManifest({ ...valid(), missingStories })).toThrow(/component path/);
    });

    it('accepts a component with no story', () => {
        expect(validateManifest({ ...valid(), missingStories: ['components/ui/NoStoryYet.tsx'] }).missingStories).toHaveLength(1);
    });

    it('rejects more than 200 missingStories entries', () => {
        const missingStories = Array.from({ length: 201 }, (_, index) => `components/ui/C${index}.tsx`);
        expect(() => validateManifest({ ...valid(), missingStories })).toThrow(/too many/);
    });

    it("rejects counts that don't match the entries", () => {
        expect(() => validateManifest({ ...valid(), counts: { changed: 0, new: 0, removed: 0, failed: 0 } })).toThrow(/count/);
    });

    it('rejects a negative count pair', () => {
        expect(() => validateManifest({ ...valid(), counts: { changed: 5, new: -5, removed: 0, failed: 0 } })).toThrow(/count/);
    });

    it('rejects an image path given as an array', () => {
        const manifest = valid();
        manifest.entries[0].images = { preview: ['img/0123456789abcdef-preview.webp'] };
        expect(() => validateManifest(manifest)).toThrow(/image path/);
    });

    it('rejects a negative totalCaptures', () => {
        expect(() => validateManifest({ ...valid(), totalCaptures: -1 })).toThrow(/totalCaptures/);
    });

    const withGroups = (groups, changeKey = groups[0]?.key) => {
        const manifest = valid();
        manifest.groups = groups;
        manifest.entries[0].changeKey = changeKey;
        return manifest;
    };

    it('accepts a manifest with no groups, as the report writes it', () => {
        expect(validateManifest(valid()).entries[0].changeKey).toBeNull();
    });

    it('accepts a manifest from before grouping', () => {
        const manifest = valid();
        delete manifest.groups;
        delete manifest.entries[0].changeKey;
        expect(validateManifest(manifest).entries).toHaveLength(1);
    });

    it('rejects a changeKey when there are no groups', () => {
        expect(() => validateManifest(withGroups([], 'same-1'))).toThrow(/changeKey/);
    });

    it('accepts a color group and an exact group', () => {
        const groups = [
            { key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' },
            { key: 'same-1', kind: 'exact' },
        ];
        expect(validateManifest(withGroups(groups)).groups).toHaveLength(2);
    });

    it.each([
        ['key', { key: '../evil', kind: 'exact' }, /key/],
        ['kind', { key: 'same-1', kind: 'weird' }, /kind/],
        ['color', { key: 'color-1', kind: 'color', from: 'url(https://evil)', to: '#7c3aed' }, /color/],
        ['uppercase color', { key: 'color-1', kind: 'color', from: '#AAAAAA', to: '#7c3aed' }, /color/],
        ['to color', { key: 'color-1', kind: 'color', from: '#241f1a', to: 'red' }, /color/],
    ])('rejects a group with a bad %s', (_name, group, message) => {
        expect(() => validateManifest(withGroups([group]))).toThrow(message);
    });

    it('rejects groups that are not a list', () => {
        expect(() => validateManifest({ ...valid(), groups: 'nope' })).toThrow(/groups/);
    });

    it('rejects a changeKey with no group', () => {
        expect(() => validateManifest(withGroups([{ key: 'same-1', kind: 'exact' }], 'same-2'))).toThrow(/changeKey/);
    });

    it.each([
        ['id', 7, /invalid id/],
        ['storyId', '', /storyId/],
        ['title', null, /title/],
        ['name', undefined, /name/],
        ['locale', 'fr', /locale/],
        ['width', 'tablet', /width/],
        ['percent', 'a lot', /percent/],
        ['percent', 101, /percent/],
        ['percent', -1, /percent/],
        ['error', 5, /error/],
    ])('rejects an entry with a bad %s (%s)', (field, value, message) => {
        const manifest = valid();
        manifest.entries[0][field] = value;
        expect(() => validateManifest(manifest)).toThrow(message);
    });

    it('accepts a failed entry with its error', () => {
        const manifest = valid();
        Object.assign(manifest.entries[0], { state: 'failed', error: 'Boom', images: {} });
        manifest.counts = { changed: 0, new: 0, removed: 0, failed: 1 };
        expect(validateManifest(manifest).entries[0].error).toBe('Boom');
    });

    it.each([
        ['headSha', 12345],
        ['headSha', undefined],
        ['baseSha', 'main'],
        ['baseSha', 'A'.repeat(40)],
    ])('rejects a bad %s (%s)', (field, value) => {
        expect(() => validateManifest({ ...valid(), [field]: value })).toThrow(new RegExp(field));
    });

    it.each([
        ['an array', [`img/${'d'.repeat(16)}-after.webp`]],
        ['null', null],
        ['missing', undefined],
        ['a number', 5],
    ])('rejects images that are %s', (_name, images) => {
        const manifest = valid();
        manifest.entries[0].images = images;
        expect(() => validateManifest(manifest)).toThrow(/images/);
    });

    it('rejects an unknown image kind', () => {
        const manifest = valid();
        manifest.entries[0].images = { thumb: `img/${'d'.repeat(16)}-after.webp` };
        expect(() => validateManifest(manifest)).toThrow(/image kind/);
    });

    it('knows every language and width the tool captures', () => {
        expect([...LOCALES]).toEqual([...CAPTURE_LOCALES]);
        expect([...WIDTHS]).toEqual(CAPTURE_WIDTHS.map((width) => width.name));
    });
});

describe('publishedManifest', () => {
    const options = { repo: 'CodeGetItGR/storywall', prNumber: '263', createdAt: '2026-11-07T00:00:00.000Z' };

    it('adds the PR link', () => {
        expect(publishedManifest(valid(), options).pull).toEqual({ number: 263, url: 'https://github.com/CodeGetItGR/storywall/pull/263' });
    });

    it("doesn't let the manifest choose where the link goes", () => {
        const hostile = { ...valid(), pull: { number: 1, url: 'https://evil.example' } };
        expect(publishedManifest(hostile, options).pull.url).toBe('https://github.com/CodeGetItGR/storywall/pull/263');
    });

    it("doesn't let the manifest choose its time", () => {
        expect(publishedManifest({ ...valid(), createdAt: 'never' }, options).createdAt).toBe('2026-11-07T00:00:00.000Z');
    });

    it('keeps the manifest and adds the time', () => {
        const published = publishedManifest(valid(), options);
        expect(published.fingerprint).toBe('c'.repeat(64));
        expect(published.createdAt).toBe('2026-11-07T00:00:00.000Z');
    });
});
