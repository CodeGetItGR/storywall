// Event type lists on Save my date fonts and font pairings. Empty means every event type.

// Adds or removes one key, keeping the list sorted the way the backend returns it, so an unchanged
// list compares equal to the saved one.
export function toggleEventType(eventTypes: readonly string[], key: string, checked: boolean): string[] {
    const next = new Set(eventTypes);
    if (checked) next.add(key);
    else next.delete(key);
    return [...next].sort();
}

export function sameEventTypes(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((key, index) => key === sortedB[index]);
}
