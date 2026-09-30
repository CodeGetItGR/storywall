import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { Page } from '@/lib/api/pagination';
import type { PostResponseDto } from '@/lib/api/types';
import { uniqueById, withFreshFirstPage } from '@/lib/postQueries';

// Pages of three, so a new post visibly pushes one across a page boundary.
function page(number: number, ids: string[], totalElements: number): Page<PostResponseDto> {
    return {
        content: ids.map((id) => ({ id }) as PostResponseDto),
        page: { number, size: 3, totalElements, totalPages: Math.ceil(totalElements / 3) },
    };
}

function feed(...pages: Page<PostResponseDto>[]): InfiniteData<Page<PostResponseDto>> {
    return { pages, pageParams: pages.map((item) => item.page.number) };
}

const ids = (data: InfiniteData<Page<PostResponseDto>>) => data.pages.map((item) => item.content.map((post) => post.id));

describe('withFreshFirstPage', () => {
    it('keeps a post pushed off the first page at the top of the second', () => {
        const old = feed(page(0, ['a', 'b', 'c'], 6), page(1, ['d', 'e', 'f'], 6));

        const merged = withFreshFirstPage(old, page(0, ['new', 'a', 'b'], 7));

        expect(ids(merged)).toEqual([
            ['new', 'a', 'b'],
            ['c', 'd', 'e', 'f'],
        ]);
    });

    it('drops a post from a later page once it is on the first', () => {
        const old = feed(page(0, ['a', 'b', 'c'], 9), page(1, ['d', 'e', 'f'], 9), page(2, ['g', 'h', 'i'], 9));

        // "h" was pinned, so it now sorts first.
        const merged = withFreshFirstPage(old, page(0, ['h', 'a', 'b'], 9));

        expect(ids(merged)).toEqual([
            ['h', 'a', 'b'],
            ['c', 'd', 'e', 'f'],
            ['g', 'i'],
        ]);
    });

    it('takes the totals from the fresh first page, so a feed that grew can load more', () => {
        const old = feed(page(0, ['a', 'b', 'c'], 6), page(1, ['d', 'e', 'f'], 6));

        const merged = withFreshFirstPage(old, page(0, ['new', 'a', 'b'], 7));

        const last = merged.pages[merged.pages.length - 1];
        expect(last.page.number).toBe(1);
        expect(last.page.totalPages).toBe(3);
        expect(last.page.totalElements).toBe(7);
    });

    it('leaves pageParams alone, so a full refetch asks for the same pages', () => {
        const old = feed(page(0, ['a', 'b', 'c'], 6), page(1, ['d', 'e', 'f'], 6));

        expect(withFreshFirstPage(old, page(0, ['new', 'a', 'b'], 7)).pageParams).toEqual([0, 1]);
    });
});

describe('uniqueById', () => {
    it('keeps the first occurrence of each id, in order', () => {
        expect(uniqueById([{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }, { id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    });
});
