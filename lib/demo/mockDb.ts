// A generic, localStorage-persisted collection store for the demo mock backend.
// `Schema` is a map of collection name -> record type, e.g. { posts: PostResponseDto }.
// Every record must carry a string `id` field.
type WithId = { id: string };

export interface MockDb<Schema extends Record<string, WithId>> {
    list<K extends keyof Schema>(collection: K): Schema[K][];
    get<K extends keyof Schema>(collection: K, id: string): Schema[K] | undefined;
    create<K extends keyof Schema>(collection: K, record: Schema[K]): Schema[K];
    update<K extends keyof Schema>(collection: K, id: string, patch: (record: Schema[K]) => Schema[K]): Schema[K] | undefined;
    remove<K extends keyof Schema>(collection: K, id: string): void;
    reset(): void;
}

function loadState<Schema>(storageKey: string, seed: () => Schema, hydrate: (stored: Schema) => Schema): Schema {
    if (typeof window === 'undefined') return seed();

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return seed();
        return hydrate(JSON.parse(raw) as Schema);
    } catch {
        console.warn(`[demo] Corrupt data at localStorage key "${storageKey}" — reseeding.`);
        return seed();
    }
}

function saveState<Schema>(storageKey: string, state: Schema): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
        // Quota exceeded or storage blocked — the in-memory state keeps working for this visit.
        console.warn(`[demo] Could not save to localStorage key "${storageKey}".`);
    }
}

export function createMockDb<Schema extends Record<string, WithId[]>>(
    storageKey: string,
    seed: () => Schema,
    // Runs on state restored from localStorage, e.g. to drop records that can't survive a reload.
    hydrate: (stored: Schema) => Schema = (stored) => stored,
): MockDb<{ [K in keyof Schema]: Schema[K][number] }> {
    let state = loadState(storageKey, seed, hydrate);

    function persist() {
        saveState(storageKey, state);
    }

    return {
        list: (collection) => state[collection] as never,
        get: (collection, id) => (state[collection] as WithId[]).find((r) => r.id === id) as never,
        create: (collection, record) => {
            state = { ...state, [collection]: [...(state[collection] as WithId[]), record] };
            persist();
            return record;
        },
        update: (collection, id, patch) => {
            let updated: WithId | undefined;
            state = {
                ...state,
                [collection]: (state[collection] as WithId[]).map((r) => {
                    if (r.id !== id) return r;
                    updated = patch(r as never);
                    return updated;
                }),
            };
            if (updated) persist();
            return updated as never;
        },
        remove: (collection, id) => {
            state = { ...state, [collection]: (state[collection] as WithId[]).filter((r) => r.id !== id) };
            persist();
        },
        reset: () => {
            state = seed();
            persist();
        },
    };
}
