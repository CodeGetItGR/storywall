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

// The PATCHes that drop one row where another one sits (drag and drop) in an
// already-sorted list. The rows keep the list's existing sortOrder values, only
// handed out in the new order; if any two rows tie, the list is renumbered
// 0..n-1. Returns only the rows whose value changes.
export function planSortOrderReorder<T extends { sortOrder: number }>(
    sorted: T[],
    idOf: (item: T) => string,
    activeId: string,
    overId: string,
): SortOrderUpdate[] {
    const ids = moveId(sorted.map(idOf), activeId, overId);
    if (!ids) return [];

    const hasTies = new Set(sorted.map((item) => item.sortOrder)).size !== sorted.length;
    const orders = sorted.map((item, position) => (hasTies ? position : item.sortOrder));
    const current = new Map(sorted.map((item) => [idOf(item), item.sortOrder]));

    return ids.flatMap((id, position) => (current.get(id) === orders[position] ? [] : [{ id, sortOrder: orders[position] }]));
}

// The ids with `activeId` taken out and put back where `overId` was. Null when
// either id is missing or they are the same row.
export function moveId(ids: string[], activeId: string, overId: string): string[] | null {
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return null;

    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, activeId);
    return next;
}

// `items` in the order of `ids`. Items missing from `ids` go last, in their
// current order.
export function arrangeByIds<T>(items: T[], idOf: (item: T) => string, ids: string[]): T[] {
    const position = new Map(ids.map((id, index) => [id, index]));
    return [...items].sort((left, right) => (position.get(idOf(left)) ?? ids.length) - (position.get(idOf(right)) ?? ids.length));
}
