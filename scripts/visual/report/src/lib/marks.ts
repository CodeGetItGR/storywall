import type { ReportEntry } from '../../../types';
import type { ReportManifest } from './model';

// Capture id to its beforeHash|afterHash. A capture counts as reviewed only while both hashes match,
// so a new push keeps the marks on captures it didn't change and clears the rest.
export type Marks = ReadonlyMap<string, string>;

type Markable = Pick<ReportEntry, 'id' | 'state' | 'beforeHash' | 'afterHash'>;
type Stored = { savedAt?: unknown; marks?: unknown };

const PREFIX = 'visual-report-marks-';

const markValue = ({ beforeHash, afterHash }: Markable) => `${beforeHash}|${afterHash}`;

// A failed capture can have the same hashes as a removed one, so it never counts as reviewed.
export const isMarked = (marks: Marks, entry: Markable) => entry.state !== 'failed' && marks.get(entry.id) === markValue(entry);

export function withMarks(marks: Marks, entries: Markable[]): Marks {
    const next = new Map(marks);
    for (const entry of entries) next.set(entry.id, markValue(entry));
    return next;
}

export function withoutMarks(marks: Marks, entries: Markable[]): Marks {
    const next = new Map(marks);
    for (const entry of entries) next.delete(entry.id);
    return next;
}

// One key per PR, because every report on the site shares this browser's storage. The PR's address names the repo too.
export const marksKey = ({ pull }: Pick<ReportManifest, 'pull'>) => `${PREFIX}${pull?.url ?? 'local'}`;

const isPair = (value: unknown): value is [string, string] =>
    Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string';

const isFull = (error: unknown) => typeof error === 'object' && error !== null && 'name' in error && error.name === 'QuotaExceededError';

// Stored as { savedAt, marks }, so the marks saved longest ago can be cleared first.
function readStored(key: string): Stored {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    return typeof value === 'object' && value !== null ? (value as Stored) : {};
}

export function readMarks(key: string): Marks {
    try {
        const { marks } = readStored(key);
        return new Map(Array.isArray(marks) ? marks.filter(isPair) : []);
    } catch {
        return new Map();
    }
}

function savedAt(key: string): number {
    try {
        const { savedAt: time } = readStored(key);
        return typeof time === 'number' ? time : 0;
    } catch {
        return 0;
    }
}

function otherPrsOldestFirst(key: string): string[] {
    const found: [string, number][] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
        const name = localStorage.key(index);
        if (name !== null && name !== key && name.startsWith(PREFIX)) found.push([name, savedAt(name)]);
    }
    return found.sort((a, b) => a[1] - b[1]).map(([name]) => name);
}

function trySave(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (isFull(error)) return false;
        throw error;
    }
}

// When storage is full, other PRs' marks are cleared, saved longest ago first, until these fit.
export function writeMarks(key: string, marks: Marks, now = Date.now()) {
    const value = JSON.stringify({ savedAt: now, marks: [...marks] });
    try {
        let older: string[] | null = null;
        while (!trySave(key, value)) {
            older ??= otherPrsOldestFirst(key);
            const next = older.shift();
            if (next === undefined) return;
            localStorage.removeItem(next);
        }
    } catch {
        // Storage is unavailable, so the marks last until the page closes.
    }
}
