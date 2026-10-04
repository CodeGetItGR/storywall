import { describe, expect, it } from 'vitest';

import { nextSortOrder, planSortOrderMove } from '@/lib/sortOrder';

type Row = { id: string; sortOrder: number };
const idOf = (row: Row) => row.id;

describe('nextSortOrder', () => {
    it('puts new rows last', () => {
        expect(nextSortOrder([{ sortOrder: 1 }, { sortOrder: 4 }])).toBe(5);
        expect(nextSortOrder([])).toBe(0);
    });
});

describe('planSortOrderMove', () => {
    const rows: Row[] = [
        { id: 'a', sortOrder: 0 },
        { id: 'b', sortOrder: 5 },
        { id: 'c', sortOrder: 9 },
    ];

    it('swaps sortOrder with the neighbour', () => {
        expect(planSortOrderMove(rows, idOf, 'b', 'up')).toEqual([
            { id: 'a', sortOrder: 5 },
            { id: 'b', sortOrder: 0 },
        ]);
        expect(planSortOrderMove(rows, idOf, 'b', 'down')).toEqual([
            { id: 'b', sortOrder: 9 },
            { id: 'c', sortOrder: 5 },
        ]);
    });

    it('does nothing at the ends or for an unknown row', () => {
        expect(planSortOrderMove(rows, idOf, 'a', 'up')).toEqual([]);
        expect(planSortOrderMove(rows, idOf, 'c', 'down')).toEqual([]);
        expect(planSortOrderMove(rows, idOf, 'x', 'up')).toEqual([]);
    });

    it('renumbers first when two rows share a sortOrder', () => {
        const tied: Row[] = [
            { id: 'a', sortOrder: 0 },
            { id: 'b', sortOrder: 0 },
            { id: 'c', sortOrder: 0 },
        ];
        expect(planSortOrderMove(tied, idOf, 'c', 'up')).toEqual([
            { id: 'b', sortOrder: 2 },
            { id: 'c', sortOrder: 1 },
        ]);
    });
});
