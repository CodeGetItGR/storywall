// The logic behind upload-themes.ts: which converted themes go up, what each request to the
// backend's theme admin API (guestwall-be InvitationThemeAdminController) carries, and the order
// of the calls. Kept apart from the command line so it can be tested against a mocked API.

import { invitationDocumentSchema } from '@/lib/invitation/document';
import { themeDesignSchema } from '@/lib/invitation/theme';

// A theme record in the backup's data/themes.json.
export type BackupTheme = {
    id: number | string;
    name: string;
    status: string;
    is_template: boolean;
    slug: string;
};

// What convert-backup.ts writes to templates/<id>.json.
export type ConvertedTemplate = {
    record: {
        id: string;
        name: string;
        category: string;
        status: string;
        slug: string;
        code?: string | null;
        description?: string | null;
        color?: string | null;
        seoTitle?: string | null;
        seoDescription?: string | null;
        isTemplate: boolean;
    };
    design: Record<string, unknown>;
    listing: {
        ogImage?: { mediaId: string };
        cardThumb?: { mediaId: string };
        productPhotos: { mediaId: string; alt: string }[];
    };
    document: Record<string, unknown>;
};

// An entry in convert-backup.ts's media.json.
export type MediaEntry = { mediaId: string; storagePath?: string; contentType?: string };

// guestwall-be InvitationThemeRequestDto.
export type ThemeRequest = {
    eventType: string;
    status: 'DRAFT' | 'ACTIVE' | 'HIDDEN';
    name: string;
    slug: string;
    code?: string;
    description?: string;
    cardColor?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageAssetId?: string;
    cardThumbAssetId?: string;
    productPhotos: { mediaId: string; alt: string }[];
    sortOrder: number;
    design: Record<string, unknown>;
    document: Record<string, unknown>;
    revision?: number;
};

// guestwall-be InvitationThemeSummaryDto and InvitationThemeAdminDto, the parts used here.
export type ThemeSummary = { id: string; slug: string };
export type ThemeAdmin = { id: string; slug: string; revision: number; assets: { assetId: string }[] };

// The published themes on savemydate.gr: live, and not a starting template.
export const PUBLISHED_STATUS = 'Ενεργό';

// The old admin's categories, as the backend's event type keys (as in import-fonts.ts).
export const EVENT_TYPES: Record<string, string> = {
    Γάμος: 'WEDDING',
    Βάπτιση: 'BAPTISM',
    Γενέθλια: 'BIRTHDAY',
    'Baby Shower': 'BABY_SHOWER',
    'Gender Reveal': 'GENDER_REVEAL',
};

// The backend's upload limits (InvitationThemeImagePipeline, the asset route's rate limit).
export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
export const ASSET_UPLOADS_PER_HOUR = 600;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// The themes savemydate.gr shows, in the backup's order.
export function pickPublishedThemes(themes: BackupTheme[]): BackupTheme[] {
    return themes.filter((theme) => theme.status === PUBLISHED_STATUS && theme.is_template === false);
}

// Every image id the theme uses: in its design, its starting invitation and its listing.
export function usedMediaIds(template: { design: unknown; document: unknown; listing?: unknown }): string[] {
    const ids = new Set<string>();
    const walk = (value: unknown) => {
        if (Array.isArray(value)) {
            value.forEach(walk);
        } else if (value && typeof value === 'object') {
            const mediaId = (value as { mediaId?: unknown }).mediaId;
            if (typeof mediaId === 'string') ids.add(mediaId);
            Object.values(value).forEach(walk);
        }
    };
    walk(template.design);
    walk(template.document);
    walk(template.listing);
    return [...ids];
}

const text = (value: string | null | undefined): string | undefined => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
};

function eventType(template: ConvertedTemplate): string {
    const type = EVENT_TYPES[template.record.category];
    if (!type) throw new Error(`${template.record.slug}: no event type for category "${template.record.category}"`);
    return type;
}

// The full theme: its design, starting invitation and listing, live in the catalogue.
export function themeRequest(template: ConvertedTemplate, sortOrder: number, revision?: number): ThemeRequest {
    const { record, listing } = template;
    return {
        eventType: eventType(template),
        status: 'ACTIVE',
        name: record.name.trim(),
        slug: record.slug,
        code: text(record.code),
        description: text(record.description),
        cardColor: record.color && HEX_COLOR.test(record.color) ? record.color : undefined,
        seoTitle: text(record.seoTitle),
        seoDescription: text(record.seoDescription),
        ogImageAssetId: listing.ogImage?.mediaId,
        cardThumbAssetId: listing.cardThumb?.mediaId,
        productPhotos: listing.productPhotos,
        sortOrder,
        design: template.design,
        document: template.document,
        revision,
    };
}

// What creates the theme. The backend refuses a design or invitation that points at images the
// theme doesn't have yet, so the first save has none: a hidden draft with the theme's colours and
// fonts, no art and no sections. The full theme replaces it once the images are up.
export function createRequest(template: ConvertedTemplate, sortOrder: number): ThemeRequest {
    const full = themeRequest(template, sortOrder);
    const design = template.design as { backgrounds: Record<string, { mode: string; stableRepeat: boolean }> };
    const backgrounds = Object.fromEntries(
        Object.entries(design.backgrounds).map(([slot, { mode, stableRepeat }]) => [slot, { mode, stableRepeat }]),
    );
    return {
        ...full,
        status: 'DRAFT',
        ogImageAssetId: undefined,
        cardThumbAssetId: undefined,
        productPhotos: [],
        design: { ...template.design, backgrounds, art: {}, elements: [], frames: [], transitions: [] },
        document: { ...template.document, sections: [] },
    };
}

// Throws when the converted theme isn't in the format the backend accepts, before anything is sent.
export function checkFormat(template: ConvertedTemplate): void {
    const design = themeDesignSchema.safeParse(template.design);
    const document = invitationDocumentSchema.safeParse(template.document);
    const problems = [
        ...(design.success ? [] : design.error.issues.map((issue) => `design.${issue.path.join('.')}: ${issue.message}`)),
        ...(document.success ? [] : document.error.issues.map((issue) => `document.${issue.path.join('.')}: ${issue.message}`)),
    ];
    if (problems.length) throw new Error(`${template.record.slug}: ${problems.join('; ')}`);
}

// The calls the script makes. upload-themes.ts backs it with fetch.
export type AdminApi = {
    list(): Promise<ThemeSummary[]>;
    find(id: string): Promise<ThemeAdmin>;
    create(body: ThemeRequest): Promise<ThemeAdmin>;
    update(id: string, body: ThemeRequest): Promise<ThemeAdmin>;
    uploadAsset(id: string, assetId: string, file: { name: string; bytes: Uint8Array; contentType?: string }): Promise<void>;
};

export const ADMIN_THEMES_PATH = '/api/admin/invitation-themes';

// The admin API over HTTP, signed in with the admin's access token.
export function httpAdminApi(origin: string, token: string, fetchImpl: typeof fetch = fetch): AdminApi {
    const base = `${origin.replace(/\/$/, '')}${ADMIN_THEMES_PATH}`;
    const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
        const response = await fetchImpl(`${base}${path}`, {
            ...init,
            headers: { Authorization: `Bearer ${token}`, ...init.headers },
        });
        if (!response.ok) {
            const hint = response.status === 429 ? ' (the image upload limit is 600 an hour: wait, then run it again)' : '';
            throw new Error(`${init.method ?? 'GET'} ${ADMIN_THEMES_PATH}${path}: ${response.status}${hint} ${await response.text()}`);
        }
        return (response.status === 204 ? undefined : await response.json()) as T;
    };
    const json = (method: string, body: unknown): RequestInit => ({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return {
        list: () => call<ThemeSummary[]>(''),
        find: (id) => call<ThemeAdmin>(`/${id}`),
        create: (body) => call<ThemeAdmin>('', json('POST', body)),
        update: (id, body) => call<ThemeAdmin>(`/${id}`, json('PUT', body)),
        uploadAsset: async (id, assetId, file) => {
            const form = new FormData();
            form.append('file', new Blob([file.bytes as Uint8Array<ArrayBuffer>], { type: file.contentType }), file.name);
            form.append('assetId', assetId);
            await call(`/${id}/assets`, { method: 'POST', body: form });
        },
    };
}

export type UploadInput = {
    themes: BackupTheme[];
    // templates/<id>.json by theme id; undefined when the converter wrote none.
    template: (id: string) => ConvertedTemplate | undefined;
    media: MediaEntry[];
    // A file in the backup's storage folder, by its storage path.
    readStorage: (storagePath: string) => Uint8Array;
    // Leave out for a dry run that never reaches the backend.
    api?: AdminApi;
    // Lists what it would do, reading from the backend at most.
    dryRun: boolean;
    print: (line: string) => void;
};

export type UploadSummary = { created: number; updated: number; assetsUploaded: number; assetsSkipped: number };

type PlannedTheme = {
    template: ConvertedTemplate;
    sortOrder: number;
    assets: { assetId: string; name: string; bytes: Uint8Array; contentType?: string }[];
};

// Reads and checks everything first, so a missing file stops the run before any call.
function plan(input: UploadInput): PlannedTheme[] {
    const media = new Map(input.media.map((entry) => [entry.mediaId, entry]));
    return pickPublishedThemes(input.themes).map((theme, sortOrder) => {
        const id = String(theme.id);
        const template = input.template(id);
        if (!template) throw new Error(`${theme.slug}: the converter wrote no templates/${id}.json`);
        checkFormat(template);
        const assets = usedMediaIds(template).map((assetId) => {
            const storagePath = media.get(assetId)?.storagePath;
            if (!storagePath) throw new Error(`${theme.slug}: image ${assetId} has no file in the backup`);
            const bytes = input.readStorage(storagePath);
            if (bytes.byteLength > MAX_ASSET_BYTES) throw new Error(`${theme.slug}: ${storagePath} is over 5 MB`);
            return { assetId, name: storagePath.split('/').pop() ?? assetId, bytes, contentType: media.get(assetId)?.contentType };
        });
        return { template, sortOrder, assets };
    });
}

// Creates each published theme, or updates it when its slug is already there, uploads the images
// it doesn't have yet and saves its design and starting invitation as active. Safe to run again.
export async function uploadThemes(input: UploadInput): Promise<UploadSummary> {
    const { api, dryRun, print } = input;
    if (!api && !dryRun) throw new Error('An admin API is needed unless this is a dry run');
    const planned = plan(input);
    const existing = api ? new Map((await api.list()).map((theme) => [theme.slug, theme.id])) : undefined;
    const summary: UploadSummary = { created: 0, updated: 0, assetsUploaded: 0, assetsSkipped: 0 };

    for (const { template, sortOrder, assets } of planned) {
        const { slug } = template.record;
        const id = existing?.get(slug);
        const current = id && api ? await api.find(id) : undefined;
        const have = new Set(current?.assets.map((asset) => asset.assetId));
        const missing = assets.filter((asset) => !have.has(asset.assetId));
        summary.assetsSkipped += assets.length - missing.length;
        const action = !existing ? 'create or update' : current ? 'update' : 'create';
        print(`${slug}: ${dryRun ? 'would ' : ''}${action}, ${missing.length} of ${assets.length} images to upload`);
        if (dryRun) {
            summary.assetsUploaded += missing.length;
            if (current) summary.updated++;
            else summary.created++;
            continue;
        }

        const theme = current ?? (await api!.create(createRequest(template, sortOrder)));
        for (const asset of missing) {
            await api!.uploadAsset(theme.id, asset.assetId, asset);
            summary.assetsUploaded++;
        }
        // Each upload leaves the revision as it was; the full theme goes on top of the loaded one.
        await api!.update(theme.id, themeRequest(template, sortOrder, theme.revision));
        if (current) summary.updated++;
        else summary.created++;
        print(`${slug}: saved as active`);
    }

    const verb = dryRun ? 'would be' : 'were';
    print(
        `${summary.created} themes ${verb} created, ${summary.updated} updated; ` +
            `${summary.assetsUploaded} images ${verb} uploaded, ${summary.assetsSkipped} already there`,
    );
    if (dryRun && summary.assetsUploaded > ASSET_UPLOADS_PER_HOUR) {
        print(`More than ${ASSET_UPLOADS_PER_HOUR} images: the run stops at the hourly limit; run it again an hour later.`);
    }
    return summary;
}
