// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { findMissingStories } from './missingStories';

describe('findMissingStories', () => {
    const existing = new Set(['components/feed/Card.stories.tsx']);
    const exists = (path: string) => existing.has(path);

    it('lists a new component with no story', () => {
        expect(findMissingStories(['components/feed/Other.tsx'], exists)).toEqual(['components/feed/Other.tsx']);
    });

    it('skips a component with a story', () => {
        expect(findMissingStories(['components/feed/Card.tsx'], exists)).toEqual([]);
    });

    it('skips tests, stories, non-components and other folders', () => {
        expect(
            findMissingStories(
                ['components/feed/Other.test.tsx', 'components/feed/Other.stories.tsx', 'components/feed/util.ts', 'app/page.tsx'],
                exists,
            ),
        ).toEqual([]);
    });
});
