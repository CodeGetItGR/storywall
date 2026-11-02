// Reads an old editor state while recording every key it touches, so the
// converter can report each old setting it had no mapping for. A key is
// covered once it is read, or dropped on purpose with `drop`.

export type Json = unknown;

export class KeyLog {
    readonly used = new Set<string>();

    mark(path: string) {
        this.used.add(path);
    }

    // Old leaf keys under `root` that nothing read or dropped.
    unmapped(root: Json, prefix: string): string[] {
        const out = new Set<string>();
        // Reading an object covers only its empty self; its keys count one by one.
        const visit = (value: Json, path: string) => {
            if (this.coveredByTree(path)) return;
            if (isRecord(value) && Object.keys(value).length) {
                for (const [key, child] of Object.entries(value)) visit(child, join(path, key));
            } else if (Array.isArray(value) && value.length) {
                value.forEach((child) => visit(child, join(path, '#')));
            } else if (!this.used.has(path)) {
                out.add(path);
            }
        };
        visit(root, prefix);
        return [...out].sort();
    }

    // Under a subtree marked with `.*` (by `rawTree` or `drop`).
    private coveredByTree(path: string): boolean {
        if (this.used.has(`${path}.*`)) return true;
        let at = path.lastIndexOf('.');
        while (at > 0) {
            if (this.used.has(`${path.slice(0, at)}.*`)) return true;
            at = path.lastIndexOf('.', at - 1);
        }
        return false;
    }
}

function join(path: string, key: string): string {
    return path ? `${path}.${/^\d+$/.test(key) ? '#' : key}` : key;
}

export function isRecord(value: Json): value is Record<string, Json> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class Reader {
    constructor(
        readonly value: Record<string, Json>,
        readonly path: string,
        private readonly log: KeyLog,
    ) {}

    static of(value: Json, path: string, log: KeyLog): Reader {
        return new Reader(isRecord(value) ? value : {}, path, log);
    }

    has(key: string): boolean {
        return this.value[key] !== undefined && this.value[key] !== null;
    }

    raw(key: string): Json {
        this.log.mark(join(this.path, key));
        return this.value[key];
    }

    // Marks a whole subtree as handled.
    rawTree(key: string): Json {
        this.log.mark(`${join(this.path, key)}.*`);
        return this.raw(key);
    }

    // Read on purpose and thrown away (each call site says why).
    drop(...keys: string[]) {
        for (const key of keys) {
            this.log.mark(join(this.path, key));
            this.log.mark(`${join(this.path, key)}.*`);
        }
    }

    str(key: string, fallback = ''): string {
        const value = this.raw(key);
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        return fallback;
    }

    num(key: string): number | undefined {
        const value = this.raw(key);
        const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
        return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
    }

    bool(key: string): boolean | undefined {
        const value = this.raw(key);
        return typeof value === 'boolean' ? value : undefined;
    }

    obj(key: string): Reader {
        return Reader.of(this.raw(key), join(this.path, key), this.log);
    }

    list(key: string): Reader[] {
        const value = this.raw(key);
        if (!Array.isArray(value)) return [];
        const itemPath = `${join(this.path, key)}.#`;
        return value.map((item) => Reader.of(item, itemPath, this.log));
    }

    strings(key: string): string[] {
        const value = this.rawTree(key);
        return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    }

    keys(): string[] {
        return Object.keys(this.value);
    }
}
