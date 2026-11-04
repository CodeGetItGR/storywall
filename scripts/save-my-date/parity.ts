// Compares one theme in the old Save my date renderer and in the new one, per
// section, at phone and desktop width, and writes an HTML report.
//
//   npm run parity:save-my-date -- --old <old app folder> --backup <backup folder> \
//       --converted <convert-backup output folder> --out <report folder> --theme <id>
//
// The old page runs from the old app's public/ folder with its API answered
// from the backup, so no Supabase or old Next server is needed. It starts its
// own `next dev`, so nothing else may be using --port. The backup holds
// customers' data: keep every folder out of the repo.

import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { type BrowserContext, chromium, type Locator, type Page } from 'playwright-core';
import sharp from 'sharp';

import { comparePixels } from '../../lib/invitation/parity';

const WIDTHS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
];
// Fixed so the countdown shows the same numbers on both sides.
const FROZEN_TIME = new Date('2026-06-01T12:00:00');
const MEDIA_ORIGIN = 'https://parity.local/media/';
// Effects are not built in the new renderer yet (KAN-59), so they are hidden on both sides.
// The last rule undoes an old editor leftover: a theme saved with a selected
// section dims every section on the old page.
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
.wedart-fx-canvas,.wedart-fx-layer,.wedart-bg-fx{visibility:hidden!important}
nextjs-portal{display:none!important}
.site.has-selection .section:not(.selected){filter:none!important;opacity:1!important}`;

const { values: args } = parseArgs({
    options: {
        old: { type: 'string' },
        backup: { type: 'string' },
        converted: { type: 'string' },
        out: { type: 'string' },
        theme: { type: 'string' },
        threshold: { type: 'string', default: '2' },
        port: { type: 'string', default: '3101' },
    },
});

if (!args.old || !args.backup || !args.converted || !args.out || !args.theme) {
    console.error('Usage: parity:save-my-date -- --old <folder> --backup <folder> --converted <folder> --out <folder> --theme <id>');
    process.exit(1);
}

const oldPublic = join(resolve(args.old), 'public');
const backupDir = resolve(args.backup);
const convertedDir = resolve(args.converted);
const themeId = args.theme;
const threshold = Number(args.threshold);
const newOrigin = `http://localhost:${args.port}`;
const outDir = resolve(args.out, themeId);
mkdirSync(join(outDir, 'images'), { recursive: true });

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

type SectionInfo = { id: string; type: string; visible: boolean };
type Converted = { record: { name: string }; design: unknown; document: { sections: SectionInfo[] } };

const converted = readJson<Converted>(join(convertedDir, 'templates', `${themeId}.json`));
const stateRows = readJson<{ theme_id: string; state: unknown }[]>(join(backupDir, 'data', 'editor-states.json'));
const oldState = stateRows.find((row) => row.theme_id === themeId)?.state;
if (!oldState) throw new Error(`Theme ${themeId} has no editor state in the backup`);

type UploadedFont = { name: string; url: string };

const uploadedFonts = readJson<UploadedFont[]>(join(backupDir, 'data', 'global-fonts.json'));
const convertedText = JSON.stringify([converted.design, converted.document]);
const fontsUsed = uploadedFonts.filter((font) => convertedText.includes(font.name)).map((font) => font.name);
// The new renderer cannot load uploaded fonts yet, so the check adds them; the
// report names them so the gap stays visible.
const UPLOADED_FONTS_CSS = uploadedFonts
    .map((font) => `@font-face{font-family:"${font.name}";src:url("${font.url}");font-display:block}`)
    .join('');

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

function oldApiAnswer(path: string): unknown {
    if (path === '/api/theme-state') return { configured: true, state: oldState, updatedAt: '2026-01-01T00:00:00Z' };
    if (path === '/api/global-fonts') {
        return { configured: true, fonts: readJson(join(backupDir, 'data', 'global-fonts.json')) };
    }
    if (path === '/api/typography-presets') {
        return { presets: readJson(join(backupDir, 'data', 'typography-presets.json')) };
    }
    return {};
}

// Serves the old app's public/ folder and answers its API from the backup.
function startOldServer(): Promise<Server> {
    const server = createServer((request, response) => {
        const path = decodeURIComponent(new URL(request.url ?? '/', 'http://old').pathname);
        if (path.startsWith('/api/')) {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify(oldApiAnswer(path)));
            return;
        }
        const file = join(oldPublic, normalize(path));
        if (!file.startsWith(oldPublic) || !existsSync(file)) {
            response.writeHead(404);
            response.end();
            return;
        }
        response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
        response.end(readFileSync(file));
    });
    return new Promise((done) => server.listen(0, () => done(server)));
}

// The new renderer's images use the same backup files as the old page's.
function newMediaMap(): Record<string, string> {
    const media = readJson<{ mediaId: string; storagePath: string }[]>(join(convertedDir, 'media.json'));
    return Object.fromEntries(media.map((item) => [item.mediaId, `${MEDIA_ORIGIN}${item.storagePath}`]));
}

async function serveBackupMedia(context: BrowserContext) {
    const serve = async (route: Parameters<Parameters<BrowserContext['route']>[1]>[0], storagePath: string) => {
        const file = join(backupDir, 'storage', normalize(decodeURIComponent(storagePath)));
        if (!existsSync(file)) return route.abort();
        return route.fulfill({
            path: file,
            contentType: CONTENT_TYPES[extname(file).toLowerCase()],
            headers: { 'access-control-allow-origin': '*' },
        });
    };
    await context.route(/\/storage\/v1\/object\/public\/([^?]+)/, (route) =>
        serve(route, /\/storage\/v1\/object\/public\/([^?]+)/.exec(route.request().url())?.[1] ?? ''),
    );
    await context.route(`${MEDIA_ORIGIN}**`, (route) => serve(route, route.request().url().slice(MEDIA_ORIGIN.length).split('?')[0]));
}

// Walks down the page so lazy images and reveal-on-scroll text are in their
// final state, then waits for fonts and images.
async function settle(page: Page) {
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate(async () => {
        const pause = (ms: number) => new Promise((done) => window.setTimeout(done, ms));
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await pause(40);
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
        await document.fonts.ready;
    });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(300);
}

// The new page has no unbuilt sections yet, so a section starts at a different
// fractional height than on the old page and its text rounds differently.
// Alone on the page, both start at the same place.
async function showOnly(page: Page, attribute: string, id: string) {
    const css = `section[${attribute}]:not([${attribute}="${id}"]){display:none!important}`;
    await page.evaluate((text) => {
        const style = document.getElementById('parity-only') ?? document.head.appendChild(document.createElement('style'));
        style.id = 'parity-only';
        style.textContent = text;
    }, css);
}

async function shot(page: Page, section: Locator): Promise<Buffer> {
    // A tab in the background draws no new frames.
    await page.bringToFront();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const box = await section.boundingBox();
    if (!box) throw new Error('A section has no size on the page');
    const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
    return page.screenshot({ fullPage: true, clip });
}

type Raw = { data: Uint8Array; width: number; height: number };

async function toRaw(png: Buffer, width: number, height: number): Promise<Raw> {
    const { data } = await sharp(png)
        .ensureAlpha()
        .extend({
            right: width - (await sharp(png).metadata()).width,
            bottom: height - (await sharp(png).metadata()).height,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
    return { data, width, height };
}

const rawPng = ({ data, width, height }: Raw) => sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).png();

// Differing pixels in red over a faded copy of the old section.
function diffImage(old: Raw, mask: Uint8Array): Raw {
    const data = Uint8Array.from(old.data);
    for (let i = 0; i < mask.length; i += 1) {
        const p = i * 4;
        if (mask[i]) {
            data.set([230, 30, 60, 255], p);
        } else {
            for (let channel = 0; channel < 3; channel += 1) data[p + channel] = 255 - (255 - data[p + channel]) * 0.25;
            data[p + 3] = 255;
        }
    }
    return { data, width: old.width, height: old.height };
}

async function sideBySide(oldRaw: Raw, newRaw: Raw, diff: Raw, file: string) {
    const gap = 12;
    const { width, height } = oldRaw;
    const parts = await Promise.all([oldRaw, newRaw, diff].map((raw) => rawPng(raw).toBuffer()));
    await sharp({ create: { width: width * 3 + gap * 2, height, channels: 4, background: '#888888' } })
        .composite(parts.map((input, index) => ({ input, left: index * (width + gap), top: 0 })))
        .png()
        .toFile(file);
}

type Row = {
    id: string;
    type: string;
    width: string;
    status: 'compared' | 'not built' | 'missing in old';
    percent?: number;
    oldHeight?: number;
    newHeight?: number;
    image?: string;
};

async function compareWidth(context: BrowserContext, oldUrl: string, width: (typeof WIDTHS)[number]): Promise<Row[]> {
    const oldPage = await context.newPage();
    const newPage = await context.newPage();
    await oldPage.setViewportSize(width);
    await newPage.setViewportSize(width);
    await oldPage.goto(oldUrl, { waitUntil: 'load' });
    await oldPage.waitForFunction(() => !document.body.classList.contains('wedart-awaiting-load'), undefined, { timeout: 30_000 });
    await newPage.goto(`${newOrigin}/save-my-date/parity`, { waitUntil: 'load' });
    await newPage.addStyleTag({ content: UPLOADED_FONTS_CSS });
    await settle(oldPage);
    await settle(newPage);

    const rows: Row[] = [];
    for (const section of converted.document.sections.filter((item) => item.visible)) {
        const base = { id: section.id, type: section.type, width: width.name };
        const oldEl = oldPage.locator(`section[data-id="${section.id}"]`);
        const newEl = newPage.locator(`section[data-section-id="${section.id}"]`);
        if (!(await newEl.count())) {
            rows.push({ ...base, status: 'not built' });
            continue;
        }
        if (!(await oldEl.count())) {
            rows.push({ ...base, status: 'missing in old' });
            continue;
        }
        await showOnly(oldPage, 'data-id', section.id);
        await showOnly(newPage, 'data-section-id', section.id);
        const [oldShot, newShot] = [await shot(oldPage, oldEl), await shot(newPage, newEl)];
        const [oldMeta, newMeta] = [await sharp(oldShot).metadata(), await sharp(newShot).metadata()];
        const w = Math.max(oldMeta.width, newMeta.width);
        const h = Math.max(oldMeta.height, newMeta.height);
        const [oldRaw, newRaw] = [await toRaw(oldShot, w, h), await toRaw(newShot, w, h)];
        const diff = comparePixels(oldRaw.data, newRaw.data, w, h);
        const image = `images/${width.name}-${section.type}-${section.id}.png`;
        await sideBySide(oldRaw, newRaw, diffImage(oldRaw, diff.mask), join(outDir, image));
        rows.push({ ...base, status: 'compared', percent: diff.percent, oldHeight: oldMeta.height, newHeight: newMeta.height, image });
    }
    await oldPage.close();
    await newPage.close();
    return rows;
}

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

function writeReport(rows: Row[]) {
    const compared = rows.filter((row) => row.status === 'compared').sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
    const skipped = rows.filter((row) => row.status !== 'compared');
    const over = compared.filter((row) => (row.percent ?? 0) > threshold);
    const card = (row: Row) => `<figure class="${(row.percent ?? 0) > threshold ? 'over' : ''}">
<figcaption><b>${(row.percent ?? 0).toFixed(2)}%</b> ${row.width} · ${escapeHtml(row.type)} · ${row.id} · height old ${row.oldHeight} / new ${row.newHeight}</figcaption>
<a href="${row.image}"><img src="${row.image}" alt="${escapeHtml(row.type)}: old, new and difference" loading="lazy"></a></figure>`;
    const html = `<!doctype html><meta charset="utf-8"><title>Parity ${escapeHtml(converted.record.name)}</title>
<style>body{font:14px system-ui;margin:24px;background:#f4f4f5}figure{margin:0 0 24px;background:#fff;padding:12px;border-left:4px solid #16a34a}
figure.over{border-color:#dc2626}img{max-width:100%;display:block;margin-top:8px}</style>
<h1>${escapeHtml(converted.record.name)} (${themeId})</h1>
${fontsUsed.length ? `<p><b>Added by this check, the new renderer cannot load them yet:</b> ${fontsUsed.map(escapeHtml).join(', ')}</p>` : ''}
<p>${compared.length} compared, ${over.length} above ${threshold}%, ${skipped.length} not compared. Each image: old, new, difference.</p>
${compared.map(card).join('\n')}
<h2>Not compared</h2><ul>${skipped.map((row) => `<li>${row.width} · ${escapeHtml(row.type)} · ${row.status}</li>`).join('')}</ul>`;
    writeFileSync(join(outDir, 'report.html'), html);
    writeFileSync(join(outDir, 'report.json'), `${JSON.stringify({ themeId, threshold, fontsAddedByCheck: fontsUsed, rows }, null, 2)}\n`);
    return { compared, over, skipped };
}

function startNewServer(): ChildProcess {
    const child = spawn('npx', ['next', 'dev', '--webpack', '-p', args.port as string], {
        shell: true,
        stdio: 'ignore',
        env: { ...process.env, SMD_PARITY_INPUT: join(outDir, 'input.json') },
    });
    return child;
}

async function waitForNewServer() {
    for (let attempt = 0; attempt < 120; attempt += 1) {
        const status = await fetch(`${newOrigin}/save-my-date/parity`).then((response) => response.status, () => 0);
        if (status === 200) return;
        if (status === 404) throw new Error(`Something else is answering on ${newOrigin}: stop it and run again`);
        await new Promise((done) => setTimeout(done, 2000));
    }
    throw new Error('The dev server did not start');
}

function stopNewServer(child: ChildProcess) {
    if (!child.pid) return;
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    else child.kill();
}

async function main() {
    writeFileSync(join(outDir, 'input.json'), JSON.stringify({ document: converted.document, theme: converted.design, media: newMediaMap() }));
    const busy = await fetch(newOrigin).then(() => true, () => false);
    if (busy) throw new Error(`Port ${args.port} is in use: stop that server or pass --port`);
    const oldServer = await startOldServer();
    const oldPort = (oldServer.address() as AddressInfo).port;
    const oldUrl = `http://localhost:${oldPort}/legacy/editor.html?themeId=${encodeURIComponent(themeId)}&readonly=1&live=1`;
    const newServer = startNewServer();
    try {
        await waitForNewServer();
        const browser = await chromium.launch({ channel: 'chrome' });
        const context = await browser.newContext({ bypassCSP: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        await context.clock.setFixedTime(FROZEN_TIME);
        await serveBackupMedia(context);
        const rows: Row[] = [];
        for (const width of WIDTHS) rows.push(...(await compareWidth(context, oldUrl, width)));
        await browser.close();

        const { compared, over, skipped } = writeReport(rows);
        const print = (line: string) => process.stdout.write(`${line}\n`);
        for (const row of compared) {
            print(`${(row.percent ?? 0).toFixed(2).padStart(7)}%  ${row.width.padEnd(8)}${row.type.padEnd(16)}${row.oldHeight}/${row.newHeight}`);
        }
        print(`${compared.length} compared, ${over.length} above ${threshold}%, ${skipped.length} not compared`);
        if (fontsUsed.length) print(`Fonts added by the check: ${fontsUsed.join(', ')}`);
        print(join(outDir, 'report.html'));
    } finally {
        stopNewServer(newServer);
        oldServer.close();
    }
}

main().then(
    () => process.exit(0),
    (error: unknown) => {
        console.error(error);
        process.exit(1);
    },
);
