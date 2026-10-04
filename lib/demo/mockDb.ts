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

// What localStorage holds: the state plus the version of the seed it grew from.
type Stored<Schema> = { version: string; state: Schema };

function loadState<Schema>(storageKey: string, version: string, seed: () => Schema, hydrate: (stored: Schema) => Schema): Schema {
    if (typeof window === 'undefined') return seed();

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return seed();
        const stored = JSON.parse(raw) as Stored<Schema>;
        // Saved from a different seed: the visitor's changes no longer apply to it.
        if (stored.version !== version) return seed();
        return hydrate(stored.state);
    } catch {
        console.warn(`[demo] Corrupt data at localStorage key "${storageKey}" — reseeding.`);
        return seed();
    }
}

function saveState<Schema>(storageKey: string, version: string, state: Schema): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(storageKey, JSON.stringify({ version, state } satisfies Stored<Schema>));
    } catch {
        // Quota exceeded or storage blocked — the in-memory state keeps working for this visit.
        console.warn(`[demo] Could not save to localStorage key "${storageKey}".`);
    }
}

export function createMockDb<Schema extends Record<string, WithId[]>>(
    storageKey: string,
    seed: () => Schema,
    options: {
        // Identifies the seed. State saved from a different version is dropped and seeded again.
        version?: string;
        // Runs on state restored from localStorage, e.g. to drop records that can't survive a reload.
        hydrate?: (stored: Schema) => Schema;
    } = {},
): MockDb<{ [K in keyof Schema]: Schema[K][number] }> {
    const { version = '', hydrate = (stored: Schema) => stored } = options;
    let state = loadState(storageKey, version, seed, hydrate);

    function persist() {
        saveState(storageKey, version, state);
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
