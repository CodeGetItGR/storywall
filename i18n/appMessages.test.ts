import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { APP_KEPT_PARTS, APP_OMITTED_NAMESPACES, pickAppMessages } from '@/i18n/appMessages';
import elCatalog from '@/messages/el.json';
import enCatalog from '@/messages/en.json';

// Arrays in the catalog do not fit next-intl's message type, so cast once here.
const en = enCatalog as unknown as AbstractIntlMessages;
const el = elCatalog as unknown as AbstractIntlMessages;
const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'app', '(main)');
// The admin console's layout hands its pages the full catalog again.
const ADMIN_DIR = path.join(APP_DIR, '(admin)');
const ROUTE_FILE = /^(page|layout|template|error|not-found|loading|default|route)\.tsx?$/;
const SUFFIXES = ['', '.tsx', '.ts', '/index.tsx', '/index.ts'];

function routeFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(dir, entry.name);
        if (file === ADMIN_DIR) return [];
        if (entry.isDirectory()) return routeFiles(file);
        return ROUTE_FILE.test(entry.name) ? [file] : [];
    });
}

function resolveImport(from: string, specifier: string): string | null {
    let base: string;
    if (specifier.startsWith('@/')) base = path.join(ROOT, specifier.slice(2));
    else if (specifier.startsWith('.')) base = path.join(path.dirname(from), specifier);
    else return null;
    for (const suffix of SUFFIXES) {
        const file = base + suffix;
        if (existsSync(file) && statSync(file).isFile()) return file;
    }
    return null;
}

// Every source file a page outside the admin console can load: static, re-exported and lazy imports,
// server and client alike. Over-collecting is fine here; it can only keep a namespace in.
function reachableSources(): Map<string, string> {
    const sources = new Map<string, string>();
    const queue = routeFiles(APP_DIR);
    while (queue.length) {
        const file = queue.pop() as string;
        if (sources.has(file) || !/\.tsx?$/.test(file)) continue;
        const source = readFileSync(file, 'utf8');
        sources.set(file, source);
        for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
            const resolved = resolveImport(file, match[1]);
            if (resolved && !sources.has(resolved)) queue.push(resolved);
        }
    }
    return sources;
}

describe('APP_OMITTED_NAMESPACES', () => {
    it('are never read by a page outside the admin console', () => {
        const sources = reachableSources();
        // Guards the walk itself: an empty graph would pass trivially.
        expect(sources.size).toBeGreaterThan(500);

        const readers = [...sources]
            // appMessages.ts names them only to leave them out.
            .filter(([file]) => !/\.test\.tsx?$/.test(file) && file !== path.join(ROOT, 'i18n', 'appMessages.ts'))
            .flatMap(([file, source]) => {
                // The parts the app keeps may be read.
                const read = APP_KEPT_PARTS.reduce((rest, part) => rest.replaceAll(part, ''), source);
                return APP_OMITTED_NAMESPACES.filter((namespace) => new RegExp(`['"\`]${namespace}[.'"\`]`).test(read)).map(
                    (namespace) => `${namespace} in ${path.relative(ROOT, file)}`,
                );
            });
        expect(readers).toEqual([]);
    });

    it('exist in every catalog', () => {
        for (const namespace of APP_OMITTED_NAMESPACES) {
            expect(en[namespace], `en ${namespace}`).toBeDefined();
            expect(el[namespace], `el ${namespace}`).toBeDefined();
        }
    });
});

describe('pickAppMessages', () => {
    it('drops only the omitted namespaces, except the parts the app keeps', () => {
        const picked = pickAppMessages(en);
        const kept = APP_KEPT_PARTS.map((part) => part.split('.')[0]);
        const expected = Object.keys(en).filter(
            (namespace) => !(APP_OMITTED_NAMESPACES as readonly string[]).includes(namespace) || kept.includes(namespace),
        );

        expect(Object.keys(picked).sort()).toEqual(expected.sort());
        expect(picked.Common).toBe(en.Common);
        expect(en.AdminPage).toBeDefined();
        expect(picked.ForBusinessPage).toEqual({ apply: (en.ForBusinessPage as AbstractIntlMessages).apply });
    });
});
