import { createHash } from 'node:crypto';

import type { ReportEntry } from './types';

// Identifies a PR's set of visual changes, so an approval can outlive a push that changes nothing visually.
export function fingerprint(entries: Pick<ReportEntry, 'id' | 'state' | 'beforeHash' | 'afterHash'>[]): string {
    const lines = entries.map((entry) => `${entry.id}|${entry.state}|${entry.beforeHash ?? ''}|${entry.afterHash ?? ''}`).sort();
    return createHash('sha256').update(lines.join('\n')).digest('hex');
}
