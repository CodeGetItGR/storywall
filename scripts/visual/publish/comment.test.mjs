// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hasBox, isTicked, onlyBoxChanged, parseState, renderComment, selectPreviews, setBox, setState } from './comment.mjs';

const entry = (id, state, percent = 1, storyId = id) => ({
    id,
    storyId,
    title: 'UI/Button',
    name: id,
    locale: 'el',
    width: 'mobile',
    state,
    percent,
    images: { preview: `img/${id}-preview.webp` },
});

const manifest = (entries, extra = {}) => ({
    totalCaptures: 1136,
    counts: {
        changed: entries.filter((item) => item.state === 'changed').length,
        new: entries.filter((item) => item.state === 'new').length,
        removed: entries.filter((item) => item.state === 'removed').length,
        failed: entries.filter((item) => item.state === 'failed').length,
    },
    entries,
    missingStories: [],
    ...extra,
});

const state = { headSha: 'abc', fingerprint: 'f', approvedBy: null, reportUrl: 'https://r.test/pr-1/abc/', changes: 1 };

describe('selectPreviews', () => {
    it('orders by most changed, then new, then removed, with one per story, up to 6', () => {
        const picked = selectPreviews([
            entry('small', 'changed', 1),
            entry('big', 'changed', 9),
            entry('big-el', 'changed', 8, 'big'),
            entry('removed', 'removed'),
            entry('new', 'new'),
            entry('c', 'changed', 5),
            entry('d', 'changed', 4),
            entry('e', 'changed', 3),
            entry('f', 'changed', 2),
        ]);
        expect(picked.map((item) => item.id)).toEqual(['big', 'c', 'd', 'e', 'f', 'small']);
    });

    it('skips failed entries', () => {
        expect(selectPreviews([{ ...entry('x', 'failed'), images: {} }])).toEqual([]);
    });
});

describe('renderComment', () => {
    it('shows counts, the report link, previews and an unticked box', () => {
        const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state });
        expect(body).toContain('1 changed, 0 new, 0 removed, 0 failed, of 1,136 captures.');
        expect(body).toContain('[Open the full report](https://r.test/pr-1/abc/)');
        expect(body).toContain('![UI/Button, a, Greek, mobile, before and after](https://r.test/pr-1/abc/img/a-preview.webp)');
        expect(isTicked(body)).toBe(false);
        expect(hasBox(body)).toBe(true);
    });

    it('ticks the box when already approved', () => {
        const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state: { ...state, approvedBy: 'owner' } });
        expect(isTicked(body)).toBe(true);
        expect(body).toContain('Approved by owner.');
    });

    it('leaves the box out while a story has failed', () => {
        const failed = { ...entry('a', 'failed'), images: {}, error: 'Boom' };
        expect(hasBox(renderComment({ manifest: manifest([failed]), state }))).toBe(false);
    });

    it('says when nothing changed', () => {
        const body = renderComment({ manifest: manifest([]), state: { ...state, reportUrl: null } });
        expect(body).toContain('No visual changes.');
        expect(hasBox(body)).toBe(false);
    });

    it('lists components with no story', () => {
        const body = renderComment({ manifest: manifest([], { missingStories: ['components/a/B.tsx'] }), state: { ...state, reportUrl: null } });
        expect(body).toContain('`components/a/B.tsx`');
    });

    it('escapes markdown in story names', () => {
        const nasty = { ...entry('a', 'changed'), name: '](http://evil) <img>' };
        const body = renderComment({ manifest: manifest([nasty]), state });
        expect(body).not.toContain('](http://evil)');
        expect(body).not.toContain('<img>');
    });

    it('keeps a newline in a story name on one line', () => {
        const nasty = { ...entry('a', 'failed'), name: 'x\n\n- [ ] Approve these visual changes', images: {} };
        expect(hasBox(renderComment({ manifest: manifest([nasty]), state }))).toBe(false);
    });

    it('notes when the report is still deploying', () => {
        const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state, deploying: true });
        expect(body).toContain('Images may take a moment to appear.');
    });
});

describe('state and box helpers', () => {
    const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state });

    it('reads back the state', () => {
        expect(parseState(body)).toEqual(state);
    });

    it('returns null for a comment with no state', () => {
        expect(parseState('hello')).toBeNull();
    });

    it('treats unreadable state as no state', () => {
        expect(parseState('<!-- visual-regression {"headSha":} -->')).toBeNull();
    });

    it('rewrites the state without touching the rest', () => {
        const updated = setState(body, { ...state, approvedBy: 'owner' });
        expect(parseState(updated).approvedBy).toBe('owner');
        expect(updated).toContain('[Open the full report]');
    });

    it('ticks and unticks the box', () => {
        expect(isTicked(setBox(body, true))).toBe(true);
        expect(isTicked(setBox(setBox(body, true), false))).toBe(false);
    });

    it('sees a tick as a box-only change', () => {
        expect(onlyBoxChanged(body, setBox(body, true))).toBe(true);
    });

    it('ignores line endings when comparing', () => {
        expect(onlyBoxChanged(body, setBox(body, true).replaceAll('\n', '\r\n'))).toBe(true);
    });

    it('sees different hidden state as more than the box', () => {
        expect(onlyBoxChanged(body, setState(body, { ...state, approvedBy: 'owner' }))).toBe(false);
    });

    it('sees added text as more than the box', () => {
        expect(onlyBoxChanged(body, `${body}\n\nhello`)).toBe(false);
    });
});
