import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invitationDocumentSchema } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import { themeDesignSchema } from '@/lib/invitation/theme';

import {
    type BackupTheme,
    type ConvertedTemplate,
    createRequest,
    httpAdminApi,
    type MediaEntry,
    pickPublishedThemes,
    themeRequest,
    type UploadInput,
    uploadThemes,
    usedMediaIds,
} from './themeUpload';

// Synthetic themes only: the real backup holds customers' data and never enters the repo.
const BACKUP_THEMES: BackupTheme[] = [
    { id: 1, name: 'Παλιό πρόχειρο', status: 'Κρυφό', is_template: false, slug: 'old-draft' },
    { id: 2, name: 'Γάμος πρότυπο', status: 'Ενεργό', is_template: true, slug: 'starter' },
    { id: 3, name: 'Γάμος 001 ', status: 'Ενεργό', is_template: false, slug: 'gamos-001' },
    { id: 4, name: 'Κύκνος', status: 'Ενεργό', is_template: false, slug: 'kyknos' },
    { id: 5, name: 'Αντίγραφο', status: 'Πρόχειρο', is_template: false, slug: 'copy' },
];

function converted(id: string, slug: string, name: string, category: string): ConvertedTemplate {
    return {
        record: {
            id,
            name,
            category,
            status: 'Ενεργό',
            slug,
            code: `WED-${id}`,
            description: 'Περιγραφή',
            color: '#b8dfd3',
            seoTitle: '',
            seoDescription: null,
            isTemplate: false,
        },
        design: structuredClone(SAMPLE_THEME) as Record<string, unknown>,
        listing: { cardThumb: { mediaId: `thumb-${id}` }, productPhotos: [{ mediaId: `photo-${id}`, alt: `Προσκλητήριο ${name.trim()}` }] },
        document: { ...structuredClone(SAMPLE_DOCUMENT), themeId: id } as Record<string, unknown>,
    };
}

const TEMPLATES: Record<string, ConvertedTemplate> = {
    '3': converted('3', 'gamos-001', 'Γάμος 001 ', 'Γάμος'),
    '4': converted('4', 'kyknos', 'Κύκνος', 'Βάπτιση'),
};
const IMAGE_IDS = [...new Set(Object.values(TEMPLATES).flatMap(usedMediaIds))];
const MEDIA: MediaEntry[] = IMAGE_IDS.map((mediaId) => ({ mediaId, storagePath: `theme-assets/themes/x/${mediaId}.png`, contentType: 'image/png' }));

// A fake of guestwall-be's theme admin API with the rules the script depends on: a design or
// invitation may point only at images the theme has, a save names the revision it was loaded at,
// and an image id is uploaded once.
type FakeTheme = { id: string; slug: string; revision: number; status: string; body: Record<string, unknown>; assets: string[] };

function fakeBackend() {
    const themes: FakeTheme[] = [];
    const calls: string[] = [];
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    const admin = (theme: FakeTheme) => ({ id: theme.id, slug: theme.slug, revision: theme.revision, assets: theme.assets.map((assetId) => ({ assetId })) });
    const problems = (body: Record<string, unknown>, assets: string[]) => {
        const design = themeDesignSchema.safeParse(body.design);
        const document = invitationDocumentSchema.safeParse(body.document);
        const used = usedMediaIds({ design: body.design, document: body.document, listing: { productPhotos: body.productPhotos } });
        const listing = [body.ogImageAssetId, body.cardThumbAssetId].filter((id): id is string => typeof id === 'string');
        return [
            ...(design.success ? [] : ['design']),
            ...(document.success ? [] : ['document']),
            ...[...used, ...listing].filter((id) => !assets.includes(id)),
        ];
    };

    const fetchImpl = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = new URL(String(input));
        const method = init.method ?? 'GET';
        calls.push(`${method} ${url.pathname.replace('/api/admin/invitation-themes', '')}`);
        expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token');
        const [, id, sub] = url.pathname.replace('/api/admin/invitation-themes', '').split('/');
        const theme = themes.find((item) => item.id === id);

        if (method === 'GET' && !id) return json(themes.map(({ id: themeId, slug }) => ({ id: themeId, slug })));
        if (method === 'GET' && theme) return json(admin(theme));
        if (method === 'POST' && !id) {
            const body = JSON.parse(String(init.body)) as Record<string, unknown>;
            if (themes.some((item) => item.slug === body.slug)) return json({ code: 'slug_taken' }, 409);
            const wrong = problems(body, []);
            if (wrong.length) return json({ problems: wrong }, 400);
            const created: FakeTheme = { id: `uuid-${themes.length + 1}`, slug: String(body.slug), revision: 0, status: String(body.status), body, assets: [] };
            themes.push(created);
            return json(admin(created), 201);
        }
        if (method === 'POST' && theme && sub === 'assets') {
            const form = init.body as FormData;
            const assetId = String(form.get('assetId'));
            expect(form.get('file')).toBeInstanceOf(Blob);
            if (theme.assets.includes(assetId)) return json({ code: 'asset_exists' }, 409);
            theme.assets.push(assetId);
            return json({ assetId }, 201);
        }
        if (method === 'PUT' && theme) {
            const body = JSON.parse(String(init.body)) as Record<string, unknown>;
            if (body.revision !== theme.revision) return json({ code: 'revision_stale' }, 409);
            const wrong = problems(body, theme.assets);
            if (wrong.length) return json({ problems: wrong }, 400);
            Object.assign(theme, { revision: theme.revision + 1, status: body.status, body });
            return json(admin(theme));
        }
        return json({ code: 'not_found' }, 404);
    });
    return { themes, calls, api: httpAdminApi('https://api.test/', 'test-token', fetchImpl as typeof fetch), fetchImpl };
}

function input(overrides: Partial<UploadInput> = {}): UploadInput & { lines: string[] } {
    const lines: string[] = [];
    return {
        themes: BACKUP_THEMES,
        template: (id) => TEMPLATES[id],
        media: MEDIA,
        readStorage: (path) => new TextEncoder().encode(path),
        dryRun: false,
        print: (line) => lines.push(line),
        lines,
        ...overrides,
    };
}

describe('Picking the themes to upload', () => {
    it('takes only the published themes that are not starting templates, in the backup order', () => {
        expect(pickPublishedThemes(BACKUP_THEMES).map((theme) => theme.slug)).toEqual(['gamos-001', 'kyknos']);
    });

    it("finds every image a theme uses: its design's, its invitation's and its listing's", () => {
        const ids = usedMediaIds(TEMPLATES['3']);
        expect(ids).toEqual(expect.arrayContaining(['m-top', 'm-leaf', 'm-frame-mask', 'm-wave', 'thumb-3', 'photo-3']));
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('The requests to the theme admin API', () => {
    it('maps a converted theme to the full, active theme', () => {
        expect(themeRequest(TEMPLATES['3'], 0, 4)).toEqual({
            eventType: 'WEDDING',
            status: 'ACTIVE',
            name: 'Γάμος 001',
            slug: 'gamos-001',
            code: 'WED-3',
            description: 'Περιγραφή',
            cardColor: '#b8dfd3',
            seoTitle: undefined,
            seoDescription: undefined,
            ogImageAssetId: undefined,
            cardThumbAssetId: 'thumb-3',
            productPhotos: [{ mediaId: 'photo-3', alt: 'Προσκλητήριο Γάμος 001' }],
            sortOrder: 0,
            design: TEMPLATES['3'].design,
            document: TEMPLATES['3'].document,
            revision: 4,
        });
        expect(themeRequest(TEMPLATES['4'], 1).eventType).toBe('BAPTISM');
    });

    it('leaves out a colour the backend would refuse and stops on an unknown category', () => {
        const template = converted('9', 'x', 'X', 'Γάμος');
        template.record.color = 'mint';
        expect(themeRequest(template, 0).cardColor).toBeUndefined();
        expect(() => themeRequest(converted('9', 'x', 'X', 'Κάτι άλλο'), 0)).toThrow('no event type for category "Κάτι άλλο"');
    });

    it('creates the theme as a draft that points at no images yet, in the invitation format', () => {
        const request = createRequest(TEMPLATES['3'], 2);
        expect(request).toMatchObject({ status: 'DRAFT', slug: 'gamos-001', sortOrder: 2, productPhotos: [], cardThumbAssetId: undefined });
        expect(usedMediaIds({ design: request.design, document: request.document, listing: { productPhotos: [] } })).toEqual([]);
        expect(themeDesignSchema.safeParse(request.design).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(request.document).success).toBe(true);
        expect(request.design).toMatchObject({ colors: SAMPLE_THEME.colors, fonts: SAMPLE_THEME.fonts });
    });
});

describe('Uploading against the admin API', () => {
    let backend: ReturnType<typeof fakeBackend>;
    beforeEach(() => {
        backend = fakeBackend();
    });

    it('creates each theme, uploads its images and saves it as active', async () => {
        const run = input({ api: backend.api });
        expect(await uploadThemes(run)).toEqual({ created: 2, updated: 0, assetsUploaded: usedMediaIds(TEMPLATES['3']).length * 2, assetsSkipped: 0 });

        expect(backend.themes.map(({ slug, status, revision }) => ({ slug, status, revision }))).toEqual([
            { slug: 'gamos-001', status: 'ACTIVE', revision: 1 },
            { slug: 'kyknos', status: 'ACTIVE', revision: 1 },
        ]);
        expect(backend.themes[0].body).toEqual(JSON.parse(JSON.stringify(themeRequest(TEMPLATES['3'], 0, 0))));
        expect(backend.themes[1].body.sortOrder).toBe(1);
        expect(backend.themes[0].assets.sort()).toEqual(usedMediaIds(TEMPLATES['3']).sort());
        expect(backend.calls.slice(0, 3)).toEqual(['GET ', 'POST ', 'POST /uuid-1/assets']);
        expect(run.lines.at(-1)).toBe(`2 themes were created, 0 updated; ${backend.themes[0].assets.length * 2} images were uploaded, 0 already there`);
    });

    it('updates the same themes when run again, without uploading their images twice', async () => {
        await uploadThemes(input({ api: backend.api }));
        backend.calls.length = 0;

        expect(await uploadThemes(input({ api: backend.api }))).toMatchObject({ created: 0, updated: 2, assetsUploaded: 0 });
        expect(backend.calls).toEqual(['GET ', 'GET /uuid-1', 'PUT /uuid-1', 'GET /uuid-2', 'PUT /uuid-2']);
        expect(backend.themes.map(({ status, revision }) => ({ status, revision }))).toEqual([
            { status: 'ACTIVE', revision: 2 },
            { status: 'ACTIVE', revision: 2 },
        ]);
    });

    it('finishes a run that stopped half way, uploading only the missing images', async () => {
        const failing = fakeBackend();
        let uploads = 0;
        const original = failing.api.uploadAsset;
        failing.api.uploadAsset = async (...args) => {
            if (++uploads === 4) throw new Error('connection reset');
            return original(...args);
        };
        await expect(uploadThemes(input({ api: failing.api }))).rejects.toThrow('connection reset');
        expect(failing.themes).toHaveLength(1);
        expect(failing.themes[0]).toMatchObject({ status: 'DRAFT', revision: 0 });

        failing.api.uploadAsset = original;
        const summary = await uploadThemes(input({ api: failing.api }));
        expect(summary).toMatchObject({ created: 1, updated: 1, assetsSkipped: 3 });
        expect(failing.themes.map(({ status }) => status)).toEqual(['ACTIVE', 'ACTIVE']);
    });

    it('lists what it would do in a dry run, only reading from the backend', async () => {
        await uploadThemes(input({ api: backend.api }));
        backend.calls.length = 0;
        const run = input({ api: backend.api, dryRun: true, themes: [...BACKUP_THEMES, { id: 6, name: 'Νέο', status: 'Ενεργό', is_template: false, slug: 'neo' }], template: (id) => TEMPLATES[id] ?? (id === '6' ? converted('6', 'neo', 'Νέο', 'Γάμος') : undefined), media: [...MEDIA, { mediaId: 'thumb-6', storagePath: 'a/thumb-6.png' }, { mediaId: 'photo-6', storagePath: 'a/photo-6.png' }] });

        expect(await uploadThemes(run)).toMatchObject({ created: 1, updated: 2 });
        expect(backend.calls.every((call) => call.startsWith('GET'))).toBe(true);
        expect(run.lines).toContain(`neo: would create, ${usedMediaIds(TEMPLATES['3']).length} of ${usedMediaIds(TEMPLATES['3']).length} images to upload`);
        expect(run.lines).toContain(`gamos-001: would update, 0 of ${usedMediaIds(TEMPLATES['3']).length} images to upload`);
    });

    it('needs no backend at all for a dry run without one', async () => {
        const run = input({ dryRun: true });
        await uploadThemes(run);
        expect(run.lines[0]).toMatch(/^gamos-001: would create or update, \d+ of \d+ images to upload$/);
    });

    it('stops before any call when a file is missing, too big or a theme was not converted', async () => {
        const missing = input({ api: backend.api, media: MEDIA.slice(1) });
        await expect(uploadThemes(missing)).rejects.toThrow(`gamos-001: image ${MEDIA[0].mediaId} has no file in the backup`);
        await expect(uploadThemes(input({ api: backend.api, readStorage: () => new Uint8Array(5 * 1024 * 1024 + 1) }))).rejects.toThrow('is over 5 MB');
        await expect(uploadThemes(input({ api: backend.api, template: (id) => (id === '4' ? undefined : TEMPLATES[id]) }))).rejects.toThrow(
            'kyknos: the converter wrote no templates/4.json',
        );
        expect(backend.calls).toEqual([]);
    });

    it('says to wait and run again when the hourly image limit is hit', async () => {
        backend.fetchImpl.mockImplementationOnce(async () => new Response('[]', { status: 200 }));
        backend.fetchImpl.mockImplementationOnce(async () => new Response(JSON.stringify({ id: 'uuid-1', slug: 'gamos-001', revision: 0, assets: [] }), { status: 201 }));
        backend.fetchImpl.mockImplementationOnce(async () => new Response('Too many requests', { status: 429 }));
        await expect(uploadThemes(input({ api: backend.api }))).rejects.toThrow('the image upload limit is 600 an hour: wait, then run it again');
    });
});
