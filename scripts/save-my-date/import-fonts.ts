// Copies the fonts uploaded in the old Save my date admin into the backend's font catalogue.
// Safe to run again: a font that already has a file is skipped.
//
//   SMD_ADMIN_TOKEN=<admin access token> npm run import-fonts:save-my-date -- --backup <backup folder> --api <API origin>
//
// Run it against staging or a local stack only until KAN-125 clears the fonts' licences.

import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

// Against the backend's upload rules, and no saved theme uses them.
const LEFT_OUT = new Map([
    ['Kurland', 'over 2 MB'],
    ['TT2020 Style D', 'over 2 MB'],
    ['Great Vibes', 'no Greek'],
    ['great-vibes-latin-400-normal', 'no Greek'],
]);

const EVENT_TYPES: Record<string, string> = {
    Βάπτιση: 'BAPTISM',
    Γενέθλια: 'BIRTHDAY',
    'Baby Shower': 'BABY_SHOWER',
    'Gender Reveal': 'GENDER_REVEAL',
};

type OldFont = { name: string; url: string; categories: string[] };
type CatalogueFont = { id: string; key: string; url: string | null };

const { values: args } = parseArgs({ options: { backup: { type: 'string' }, api: { type: 'string' } } });
const token = process.env.SMD_ADMIN_TOKEN;
if (!args.backup || !args.api || !token) {
    console.error('Usage: SMD_ADMIN_TOKEN=<token> import-fonts:save-my-date -- --backup <folder> --api <origin>');
    process.exit(1);
}
const backupDir = resolve(args.backup);
const api = args.api.replace(/\/$/, '');
const print = (line: string) =>
    process.stdout.write(`${line}
`);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${api}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
    if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
    return response.json() as Promise<T>;
}

const sendJson = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

const fontKey = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

function eventTypes(font: OldFont): string[] {
    return font.categories.map((category) => {
        const type = EVENT_TYPES[category];
        if (!type) throw new Error(`${font.name}: no event type for category "${category}"`);
        return type;
    });
}

function fontFile(font: OldFont): { name: string; bytes: Buffer } {
    const storagePath = /\/storage\/v1\/object\/public\/([^?]+)/.exec(font.url)?.[1];
    if (!storagePath) throw new Error(`${font.name}: unexpected url`);
    const path = join(backupDir, 'storage', decodeURIComponent(storagePath));
    return { name: basename(path), bytes: readFileSync(path) };
}

async function main() {
    const oldFonts = JSON.parse(readFileSync(join(backupDir, 'data', 'global-fonts.json'), 'utf8')) as OldFont[];
    const existing = await request<CatalogueFont[]>('/api/admin/theme-fonts');

    for (const font of oldFonts) {
        const leftOut = LEFT_OUT.get(font.name);
        if (leftOut) {
            print(`${font.name}: left out, ${leftOut}`);
            continue;
        }
        const key = fontKey(font.name);
        const found = existing.find((item) => item.key === key);
        if (found?.url) {
            print(`${font.name}: already imported`);
            continue;
        }
        const row =
            found ??
            (await request<CatalogueFont>(
                '/api/admin/theme-fonts',
                sendJson('POST', { key, familyName: font.name.replace(/['"]/g, ''), fallback: 'serif' }),
            ));
        const types = eventTypes(font);
        if (types.length) await request(`/api/admin/theme-fonts/${row.id}`, sendJson('PATCH', { invitationEventTypes: types }));
        const { name, bytes } = fontFile(font);
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(bytes)]), name);
        await request(`/api/admin/theme-fonts/${row.id}/file`, { method: 'POST', body: form });
        print(`${font.name}: imported as ${key}`);
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
