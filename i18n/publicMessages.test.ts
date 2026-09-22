import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { pickPublicMessages, PUBLIC_CLIENT_NAMESPACES } from '@/i18n/publicMessages';
import enCatalog from '@/messages/en.json';

// Arrays in the catalog do not fit next-intl's message type, so cast once here.
const en = enCatalog as unknown as AbstractIntlMessages;
const ROOT = process.cwd();
const ENTRY_FILES = ['components/landing/LandingPage.tsx', 'providers/PublicProviders.tsx'];

function resolveImport(specifier: string): string | null {
    if (!specifier.startsWith('@/')) return null;
    const base = path.join(ROOT, specifier.slice(2));
    for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
        if (existsSync(base + suffix)) return base + suffix;
    }
    return null;
}

// Collects every namespace read with useTranslations() in a client component
// or hook reachable from the landing page.
function collectClientNamespaces(): Set<string> {
    const seen = new Set<string>();
    const namespaces = new Set<string>();

    const walk = (file: string) => {
        if (seen.has(file)) return;
        seen.add(file);
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/useTranslations\('([^']+)'\)/g)) namespaces.add(match[1]);
        for (const match of source.matchAll(/(?:from|import\()\s*'(@\/[^']+)'/g)) {
            const resolved = resolveImport(match[1]);
            if (resolved) walk(resolved);
        }
    };

    for (const entry of ENTRY_FILES) walk(path.join(ROOT, entry));
    return namespaces;
}

function isCovered(namespace: string): boolean {
    return PUBLIC_CLIENT_NAMESPACES.some((listed) => namespace === listed || namespace.startsWith(`${listed}.`));
}

describe('PUBLIC_CLIENT_NAMESPACES', () => {
    it('covers every namespace a landing client island reads', () => {
        const missing = [...collectClientNamespaces()].filter((namespace) => !isCovered(namespace));
        expect(missing).toEqual([]);
    });

    it('lists only namespaces that exist in the catalog', () => {
        const picked = pickPublicMessages(en);
        for (const namespace of PUBLIC_CLIENT_NAMESPACES) {
            const value = namespace.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], picked);
            expect(value, namespace).toBeDefined();
        }
    });
});

describe('pickPublicMessages', () => {
    it('drops everything outside the listed namespaces', () => {
        const picked = pickPublicMessages(en);
        expect(Object.keys(picked).sort()).toEqual(['AccountDrawer', 'LandingPage', 'LanguageSwitcher', 'Modules']);
        expect(Object.keys(picked.LandingPage as object).sort()).toEqual(['featureDetails', 'features', 'hero', 'pricing', 'stack']);
        expect(picked.RootLayout).toBeUndefined();
    });
});
