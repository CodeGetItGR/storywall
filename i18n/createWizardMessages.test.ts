import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CREATE_WIZARD_NAMESPACES } from '@/i18n/createWizardMessages';

const ROOT = process.cwd();
const ENTRY = 'components/event/create/wizard/CreateEventDialog.tsx';

function resolveImport(specifier: string): string | null {
    if (!specifier.startsWith('@/')) return null;
    const base = path.join(ROOT, specifier.slice(2));
    for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts']) if (existsSync(base + suffix)) return base + suffix;
    return null;
}

// Every namespace read with useTranslations() in the pop-up's import graph.
function collect(): Set<string> {
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
    walk(path.join(ROOT, ENTRY));
    return namespaces;
}

describe('CREATE_WIZARD_NAMESPACES', () => {
    it('covers every namespace the pop-up reads', () => {
        const covered = (namespace: string) => CREATE_WIZARD_NAMESPACES.some((listed) => namespace === listed || namespace.startsWith(`${listed}.`));
        expect([...collect()].filter((namespace) => !covered(namespace))).toEqual([]);
    });
});
