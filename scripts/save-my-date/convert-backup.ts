// Converts a Save my date backup into Storywall invitations and writes a
// report. Reads only the backup; writes only to the output folder, so it can
// run again any time with the same result.
//
//   npx jiti scripts/save-my-date/convert-backup.ts <backup folder> <output folder>
//
// The backup holds customers' data: keep both folders out of the repo.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type ConvertResult,convertState } from '@/lib/invitation/convert/convert';
import { MediaCollector } from '@/lib/invitation/convert/media';
import type { ConvertedTheme } from '@/lib/invitation/convert/theme';

type ThemeRecord = { id: number | string; name: string } & Record<string, unknown>;
type SiteRecord = { id: string; draft_id: string; theme_id: number | string; title: string } & Record<string, unknown>;
type StateRow = { theme_id: string; state: unknown };
type FontRecord = { id: number; name: string; url: string; hidden: boolean; categories: string[] };
type PresetRecord = Record<string, unknown> & { id: number; name: string };
type StorageEntry = { bucket: string; path: string; size?: number; contentType?: string };

type ReportItem = {
    kind: 'template' | 'site';
    id: string;
    name: string;
    ok: boolean;
    errors: string[];
    warnings: string[];
    unmapped: string[];
};

const [backupDir, outDir] = process.argv.slice(2);
if (!backupDir || !outDir) {
    console.error('Usage: convert-backup.ts <backup folder> <output folder>');
    process.exit(1);
}

const read = <T>(file: string): T => JSON.parse(readFileSync(join(backupDir, 'data', file), 'utf8')) as T;
const write = (file: string, value: unknown) => writeFileSync(join(outDir, file), `${JSON.stringify(value, null, 2)}\n`);

const themes = read<ThemeRecord[]>('themes.json');
const sites = read<SiteRecord[]>('customer-sites.json');
const states = new Map(
    read<StateRow[]>('editor-states.json').map((row) => [
        row.theme_id,
        typeof row.state === 'string' ? (JSON.parse(row.state) as unknown) : row.state,
    ]),
);
const storage = new Map(read<StorageEntry[]>('storage-index.json').map((entry) => [`${entry.bucket}/${entry.path}`, entry]));

// Clears only what an earlier run wrote, so stale files never linger.
for (const folder of ['templates', 'sites']) {
    rmSync(join(outDir, folder), { recursive: true, force: true });
    mkdirSync(join(outDir, folder), { recursive: true });
}

const media = new MediaCollector();
const report: ReportItem[] = [];
const templates = new Map<string, ConvertedTheme>();

const item = (kind: ReportItem['kind'], id: string, name: string, results: ConvertResult[], missing: string[] = []): ReportItem => ({
    kind,
    id,
    name,
    ok: !missing.length && results.every((result) => result.ok),
    errors: [...missing, ...results.flatMap((result) => result.errors)],
    warnings: [...new Set(results.flatMap((result) => result.warnings))],
    unmapped: [...new Set(results.flatMap((result) => result.unmapped))].sort(),
});

// Templates
for (const record of themes) {
    const id = String(record.id);
    const state = states.get(id);
    if (state === undefined) {
        report.push(item('template', id, record.name, [], ['no editor state in the backup']));
        continue;
    }
    const result = convertState({ state, themeId: id, themeName: record.name }, media);
    templates.set(id, result.theme);
    report.push(item('template', id, record.name, [result]));
    if (!result.ok) continue;
    const { name, category, status, slug, code, description, color, seo_title, seo_description, is_template } = record;
    write(`templates/${id}.json`, {
        record: { id, name, category, status, slug, code, description, color, seoTitle: seo_title, seoDescription: seo_description, isTemplate: is_template },
        design: result.theme.design,
        listing: result.theme.listing,
        document: result.document,
    });
}

// Customer sites: the draft and, when there is one, the published snapshot.
for (const site of sites) {
    const themeId = String(site.theme_id);
    const template = templates.get(themeId);
    const themeName = themes.find((theme) => String(theme.id) === themeId)?.name ?? themeId;
    const draftState = states.get(site.draft_id);
    const publishedState = states.get(`published:${site.draft_id}`);
    const missing = [
        ...(draftState === undefined ? ['no draft state in the backup'] : []),
        ...(template ? [] : [`its template ${themeId} did not convert`]),
    ];
    const draft = draftState === undefined ? undefined : convertState({ state: draftState, themeId, themeName, template }, media);
    const published = publishedState === undefined ? undefined : convertState({ state: publishedState, themeId, themeName, template }, media);
    const entry = item('site', site.id, site.title, [draft, published].filter((result) => result !== undefined), missing);
    report.push(entry);
    if (!entry.ok || !draft) continue;
    const { id, owner_user_id, event_type, title, slug, event_date, status, expires_at, created_at } = site;
    write(`sites/${site.id}.json`, {
        record: { id, ownerUserId: owner_user_id, themeId, eventType: event_type, title, slug, eventDate: event_date, status, expiresAt: expires_at, createdAt: created_at },
        draft: draft.document,
        // A published invitation keeps the theme as it was when published.
        published: published && { document: published.document, theme: published.theme.design },
    });
}

// Fonts and typography presets
const fonts = read<FontRecord[]>('global-fonts.json').map((font) => ({
    id: String(font.id),
    name: font.name,
    file: { mediaId: media.add(font.url) },
    hidden: font.hidden,
    categories: font.categories,
}));
write('fonts.json', fonts);
const presets = read<PresetRecord[]>('typography-presets.json').map((preset) => ({
    id: String(preset.id),
    name: preset.name,
    titleFont: preset.title_font,
    bodyFont: preset.body_font,
    buttonFont: preset.button_font || undefined,
    categories: preset.categories,
    hidden: preset.hidden,
    sortOrder: preset.sort_order,
}));
write('typography-presets.json', presets);

// Media: where each file comes from and whether the backup has it.
const mediaManifest = media.all().map((source) => {
    const entry = source.storagePath ? storage.get(source.storagePath) : undefined;
    const inBackup = source.storagePath ? existsSync(join(backupDir, 'storage', source.storagePath)) : Boolean(source.dataUrl);
    return {
        mediaId: source.mediaId,
        storagePath: source.storagePath,
        url: source.url,
        // Inline images: only the type, the data itself is in the state.
        dataUrlType: source.dataUrl?.slice(5, source.dataUrl.indexOf(';')),
        size: entry?.size,
        contentType: entry?.contentType,
        inStorageIndex: Boolean(entry) || !source.storagePath,
        inBackup,
    };
});
write('media.json', mediaManifest);

// Fonts used that are neither a global font file nor a system font. These
// should be Google Fonts; each needs checking before import.
const SYSTEM_FONTS = new Set(['arial', 'georgia', 'helvetica', 'times new roman', 'verdana', 'serif', 'sans-serif', 'cursive', 'monospace', 'system-ui']);
const globalNames = new Set(fonts.map((font) => font.name.toLowerCase()));
const fontFamilies = new Map<string, number>();
const collectFonts = (value: unknown, key = '') => {
    if (typeof value === 'string' && /font$/i.test(key)) {
        const family = value.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
        if (family) fontFamilies.set(family, (fontFamilies.get(family) ?? 0) + 1);
    } else if (Array.isArray(value)) {
        value.forEach((child) => collectFonts(child, key));
    } else if (typeof value === 'object' && value !== null) {
        for (const [childKey, child] of Object.entries(value)) collectFonts(child, childKey);
    }
};
for (const folder of ['templates', 'sites']) {
    for (const entry of report.filter((reportItem) => reportItem.ok && `${reportItem.kind}s` === folder)) {
        collectFonts(JSON.parse(readFileSync(join(outDir, folder, `${entry.id}.json`), 'utf8')));
    }
}
collectFonts(presets);
const otherFonts = [...fontFamilies.entries()]
    .filter(([family]) => !globalNames.has(family.toLowerCase()) && !SYSTEM_FONTS.has(family.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

// Report
const unmapped = new Map<string, string[]>();
for (const entry of report) for (const path of entry.unmapped) unmapped.set(path, [...(unmapped.get(path) ?? []), `${entry.kind} ${entry.id}`]);
const missingMedia = mediaManifest.filter((file) => !file.inBackup);
const summary = {
    templates: { converted: report.filter((entry) => entry.kind === 'template' && entry.ok).length, failed: report.filter((entry) => entry.kind === 'template' && !entry.ok).length },
    sites: { converted: report.filter((entry) => entry.kind === 'site' && entry.ok).length, failed: report.filter((entry) => entry.kind === 'site' && !entry.ok).length },
    unmappedSettings: unmapped.size,
    mediaFiles: mediaManifest.length,
    mediaMissingFromBackup: missingMedia.length,
    fontsToCheck: otherFonts.length,
};
write('report.json', { summary, items: report, unmapped: Object.fromEntries(unmapped), otherFonts: Object.fromEntries(otherFonts) });

const lines = [
    '# Save my date conversion report',
    '',
    `- Templates: ${summary.templates.converted} converted, ${summary.templates.failed} failed`,
    `- Customer sites: ${summary.sites.converted} converted, ${summary.sites.failed} failed`,
    `- Settings with no mapping: ${summary.unmappedSettings}`,
    `- Media files: ${summary.mediaFiles}, ${summary.mediaMissingFromBackup} not in the backup`,
    `- Fonts to check (not a global font or system font): ${summary.fontsToCheck}`,
    '',
    '## Failed',
    '',
    ...report.filter((entry) => !entry.ok).flatMap((entry) => [`### ${entry.kind} ${entry.id} (${entry.name})`, '', ...entry.errors.map((error) => `- ${error}`), '']),
    '## Settings with no mapping',
    '',
    ...[...unmapped.entries()].map(([path, where]) => `- \`${path}\`: ${where.join(', ')}`),
    '',
    '## Fonts to check',
    '',
    ...otherFonts.map(([family, count]) => `- ${family} (${count})`),
    '',
    '## Warnings',
    '',
    ...report.filter((entry) => entry.warnings.length).flatMap((entry) => [`### ${entry.kind} ${entry.id} (${entry.name})`, '', ...entry.warnings.map((warning) => `- ${warning}`), '']),
];
writeFileSync(join(outDir, 'report.md'), `${lines.join('\n')}\n`);

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
