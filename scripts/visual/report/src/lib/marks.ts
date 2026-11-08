import type { ReportEntry } from '../../../types';
import type { ReportManifest } from './model';

// Capture id to its beforeHash|afterHash. A capture counts as reviewed only while both hashes match,
// so a new push keeps the marks on captures it didn't change and clears the rest.
export type Marks = ReadonlyMap<string, string>;

type Markable = Pick<ReportEntry, 'id' | 'beforeHash' | 'afterHash'>;

const markValue = ({ beforeHash, afterHash }: Markable) => `${beforeHash}|${afterHash}`;

export const isMarked = (marks: Marks, entry: Markable) => marks.get(entry.id) === markValue(entry);

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

// One key per PR, because every report on the site shares this browser's storage.
export const marksKey = ({ pull }: Pick<ReportManifest, 'pull'>) => `visual-report-marks-${pull?.number ?? 'local'}`;

const isPair = (value: unknown): value is [string, string] =>
    Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string';

export function readMarks(key: string): Marks {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return new Map(Array.isArray(stored) ? stored.filter(isPair) : []);
    } catch {
        return new Map();
    }
}

export function writeMarks(key: string, marks: Marks) {
    try {
        localStorage.setItem(key, JSON.stringify([...marks]));
    } catch {
        // The marks last until the page closes.
    }
}
