// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pruneReports } from './reportsRepo.mjs';

describe('pruneReports', () => {
    let site;

    beforeEach(() => {
        site = mkdtempSync(join(tmpdir(), 'visual-prune-'));
    });

    afterEach(() => rmSync(site, { recursive: true, force: true }));

    function addReport(pr, createdAt, bytes) {
        const dir = join(site, `pr-${pr}`, 'abc');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ createdAt }));
        writeFileSync(join(dir, 'data.bin'), Buffer.alloc(bytes));
    }

    it('deletes the oldest reports until under the limit, never the current PR', () => {
        addReport(1, '2026-01-01T00:00:00Z', 1000);
        addReport(2, '2026-01-02T00:00:00Z', 1000);
        addReport(3, '2026-01-03T00:00:00Z', 1000);
        pruneReports(site, 3, 2500);
        expect(existsSync(join(site, 'pr-1'))).toBe(false);
        expect(existsSync(join(site, 'pr-2'))).toBe(true);
        expect(existsSync(join(site, 'pr-3'))).toBe(true);
    });

    it('keeps the current PR even when it is the oldest', () => {
        addReport(1, '2026-01-01T00:00:00Z', 1000);
        addReport(2, '2026-01-02T00:00:00Z', 1000);
        pruneReports(site, 1, 1500);
        expect(existsSync(join(site, 'pr-1'))).toBe(true);
        expect(existsSync(join(site, 'pr-2'))).toBe(false);
    });

    it('does nothing under the limit', () => {
        addReport(1, '2026-01-01T00:00:00Z', 1000);
        pruneReports(site, 2, 5000);
        expect(existsSync(join(site, 'pr-1'))).toBe(true);
    });
});
