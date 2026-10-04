// Shared ordering helpers for admin catalogs whose rows carry a numeric `sortOrder`.

export type SortOrderUpdate = { id: string; sortOrder: number };
export type MoveDirection = 'up' | 'down';

export function bySortOrder<T extends { sortOrder: number }>(left: T, right: T): number {
    return left.sortOrder - right.sortOrder;
}

// Where a new row goes: after every existing one.
export function nextSortOrder(items: Array<{ sortOrder: number }>): number {
    return items.length === 0 ? 0 : Math.max(...items.map((item) => item.sortOrder)) + 1;
}

// The PATCHes that move one row a step up or down in an already-sorted list.
// Swaps sortOrder with the neighbour; if any two rows tie, renumbers the list
// 0..n-1 first so the swap actually changes the order. Returns only the rows
// whose value changes.
export function planSortOrderMove<T extends { sortOrder: number }>(
    sorted: T[],
    idOf: (item: T) => string,
    id: string,
    direction: MoveDirection,
): SortOrderUpdate[] {
    const index = sorted.findIndex((item) => idOf(item) === id);
    const neighbour = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || neighbour < 0 || neighbour >= sorted.length) return [];

    const hasTies = new Set(sorted.map((item) => item.sortOrder)).size !== sorted.length;
    const orders = sorted.map((item, position) => (hasTies ? position : item.sortOrder));
    [orders[index], orders[neighbour]] = [orders[neighbour], orders[index]];

    return sorted.flatMap((item, position) => (orders[position] === item.sortOrder ? [] : [{ id: idOf(item), sortOrder: orders[position] }]));
}
