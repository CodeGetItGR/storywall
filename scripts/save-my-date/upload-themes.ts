// Uploads the published Save my date themes (the 8 on savemydate.gr/themes) to the backend's theme
// catalogue, with their images, design and starting invitation, set to active. Safe to run again:
// a theme whose slug is already there is updated, and images it already has are skipped.
//
//   SMD_API_ORIGIN=<API origin> SMD_ADMIN_TOKEN=<admin access token> \
//     npm run upload-themes:save-my-date -- --backup <backup folder> --converted <converter output> [--dry-run]
//
// --converted is the folder convert-backup.ts wrote. A dry run only reads from the backend, and
// reaches it at all only when SMD_API_ORIGIN is set. The backup holds customers' data: keep it out
// of the repo.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { createJiti } from 'jiti';

import type { BackupTheme, ConvertedTemplate, MediaEntry } from './themeUpload';

const { values: args } = parseArgs({
    options: { backup: { type: 'string' }, converted: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
});
const origin = process.env.SMD_API_ORIGIN;
const token = process.env.SMD_ADMIN_TOKEN;
const dryRun = args['dry-run'] === true;
if (!args.backup || !args.converted || (!dryRun && (!origin || !token)) || (origin && !token)) {
    console.error(
        'Usage: SMD_API_ORIGIN=<origin> SMD_ADMIN_TOKEN=<token> upload-themes:save-my-date -- --backup <folder> --converted <folder> [--dry-run]',
    );
    process.exit(1);
}
const backupDir = resolve(args.backup);
const convertedDir = resolve(args.converted);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

function template(id: string): ConvertedTemplate | undefined {
    try {
        return readJson<ConvertedTemplate>(join(convertedDir, 'templates', `${id}.json`));
    } catch {
        return undefined;
    }
}

async function main() {
    // The upload logic checks themes with lib/invitation, which imports through the app's "@/" alias.
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const jiti = createJiti(import.meta.url, { alias: { '@': root } });
    const { httpAdminApi, uploadThemes } = await jiti.import<typeof import('./themeUpload')>('./themeUpload');
    await uploadThemes({
        themes: readJson<BackupTheme[]>(join(backupDir, 'data', 'themes.json')),
        template,
        media: readJson<MediaEntry[]>(join(convertedDir, 'media.json')),
        readStorage: (storagePath) => readFileSync(join(backupDir, 'storage', storagePath)),
        api: origin && token ? httpAdminApi(origin, token) : undefined,
        dryRun,
        print: (line) => process.stdout.write(`${line}\n`),
    });
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
