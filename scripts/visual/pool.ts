export async function runPool<Item, Result>(items: Item[], limit: number, work: (item: Item) => Promise<Result>): Promise<Result[]> {
    const results = new Array<Result>(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await work(items[index]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}
