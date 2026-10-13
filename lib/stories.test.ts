import { describe, expect, it } from 'vitest';

import type { StoryResponseDto } from '@/lib/api/types';
import { findNextStory, type StoryGroup } from '@/lib/stories';

function story(id: string): StoryResponseDto {
    return { id } as StoryResponseDto;
}

function group(authorMemberId: string, ids: string[]): StoryGroup {
    return { authorMemberId, stories: ids.map(story), allSeen: false, latestCreatedAt: '' };
}

describe('findNextStory', () => {
    const ana = group('ana', ['a1', 'a2']);
    const ben = group('ben', ['b1']);
    const groups = [ben, ana];
    const order = ['ana', 'ben'];

    it("moves to the author's next story", () => {
        expect(findNextStory(order, ana, 0, groups)?.id).toBe('a2');
    });

    it('moves to the next author in the frozen order after the last one', () => {
        expect(findNextStory(order, ana, 1, groups)?.id).toBe('b1');
    });

    it('is null after the last author', () => {
        expect(findNextStory(order, ben, 0, groups)).toBeNull();
    });
});
