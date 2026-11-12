// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildCaptureList, captureId, type StoryIndex } from './stories';

const story = (id: string, tags: string[] = []) => ({ id, title: 'UI/Button', name: 'Default', type: 'story', tags });

const index = (...entries: ReturnType<typeof story>[]): StoryIndex => ({
    v: 5,
    entries: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
});

describe('buildCaptureList', () => {
    it('captures a story in both languages at both widths', () => {
        const ids = buildCaptureList(index(story('ui-button--default'))).map((target) => target.id);
        expect(ids).toEqual([
            'ui-button--default--el--desktop',
            'ui-button--default--el--mobile',
            'ui-button--default--en--desktop',
            'ui-button--default--en--mobile',
        ]);
    });

    it('skips stories tagged visual-skip', () => {
        expect(buildCaptureList(index(story('a--b', ['visual-skip'])))).toEqual([]);
    });

    it('limits width-tagged stories to that width', () => {
        const desktop = buildCaptureList(index(story('a--b', ['visual-desktop-only'])));
        const mobile = buildCaptureList(index(story('a--c', ['visual-mobile-only'])));
        expect(desktop.map((target) => target.width)).toEqual(['desktop', 'desktop']);
        expect(mobile.map((target) => target.width)).toEqual(['mobile', 'mobile']);
    });

    it('ignores docs entries', () => {
        const docs = { ...story('a--docs'), type: 'docs' };
        expect(buildCaptureList(index(docs))).toEqual([]);
    });

    it('keeps the story details on each target', () => {
        const [target] = buildCaptureList(index(story('a--b')));
        expect(target).toMatchObject({ storyId: 'a--b', title: 'UI/Button', name: 'Default', locale: 'el', width: 'desktop' });
        expect(target.id).toBe(captureId('a--b', 'el', 'desktop'));
    });
});
