const STATES = new Set(['changed', 'new', 'removed', 'failed']);
// The same as config.ts, which this job can't import. A test keeps them equal. The publish job runs the base branch's copy,
// so a new language or width has to be merged before a PR can capture it.
export const LOCALES = new Set(['en', 'el']);
export const WIDTHS = new Set(['mobile', 'desktop']);
const GROUP_KINDS = new Set(['color', 'exact']);
const TEXT_FIELDS = ['id', 'storyId', 'title', 'name'];
const IMAGE_PATH = /^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/;
const COMPONENT_PATH = /^components\/[\w./-]+\.tsx$/;
const GROUP_KEY = /^(color|same)-\d+$/;
const COLOR = /^#[0-9a-f]{6}$/;
const SHA = /^[0-9a-f]{40}$/;
// Story ids become page addresses, so one can't look like another address or need decoding.
const STORY_ID = /^[^\s%#]+--[^\s%#]+$/;
const HASH = /^[0-9a-f]{64}$/;
const IMAGE_KINDS = new Set(['before', 'after', 'diff', 'preview']);
const MAX_MISSING_STORIES = 200;

// A report from before same-change grouping has no groups, and that's fine.
function validateGroups(groups) {
    if (groups === undefined) return new Set();
    if (!Array.isArray(groups)) throw new Error('Manifest has an invalid groups list');
    const keys = new Set();
    for (const group of groups) {
        if (typeof group?.key !== 'string' || !GROUP_KEY.test(group.key)) throw new Error(`Manifest group has an invalid key: ${group?.key}`);
        if (keys.has(group.key)) throw new Error(`Manifest has a repeated group key: ${group.key}`);
        if (!GROUP_KINDS.has(group.kind)) throw new Error(`Manifest group has an unknown kind: ${group.kind}`);
        for (const color of [group.from, group.to]) {
            if (color !== undefined && (typeof color !== 'string' || !COLOR.test(color)))
                throw new Error(`Manifest group has an invalid color: ${color}`);
        }
        keys.add(group.key);
    }
    return keys;
}

function validateEntry(entry, groupKeys) {
    for (const field of TEXT_FIELDS) {
        if (typeof entry[field] !== 'string' || entry[field] === '') throw new Error(`Manifest entry has an invalid ${field}`);
    }
    if (!STORY_ID.test(entry.storyId)) throw new Error(`Manifest entry has an invalid storyId: ${entry.storyId}`);
    if (!STATES.has(entry.state)) throw new Error(`Manifest entry has an unknown state: ${entry.state}`);
    if (!LOCALES.has(entry.locale)) throw new Error(`Manifest entry has an unknown locale: ${entry.locale}`);
    if (!WIDTHS.has(entry.width)) throw new Error(`Manifest entry has an unknown width: ${entry.width}`);
    // The same as captureId in stories.ts.
    if (entry.id !== `${entry.storyId}--${entry.locale}--${entry.width}`)
        throw new Error(`Manifest entry has an id that doesn't match its story: ${entry.id}`);
    for (const field of ['beforeHash', 'afterHash']) {
        if (entry[field] !== null && (typeof entry[field] !== 'string' || !HASH.test(entry[field])))
            throw new Error(`Manifest entry has an invalid ${field}`);
    }
    if (typeof entry.percent !== 'number' || !(entry.percent >= 0 && entry.percent <= 100)) throw new Error('Manifest entry has an invalid percent');
    if (entry.error !== null && typeof entry.error !== 'string') throw new Error('Manifest entry has an invalid error');
    if (entry.changeKey !== undefined && entry.changeKey !== null && !groupKeys.has(entry.changeKey)) {
        throw new Error(`Manifest entry has an unknown changeKey: ${entry.changeKey}`);
    }
    const images = entry.images;
    if (images === null || typeof images !== 'object' || Array.isArray(images)) throw new Error('Manifest entry has an invalid images list');
    for (const [kind, path] of Object.entries(images)) {
        if (!IMAGE_KINDS.has(kind)) throw new Error(`Manifest entry has an unknown image kind: ${kind}`);
        if (typeof path !== 'string' || !IMAGE_PATH.test(path)) throw new Error(`Manifest entry has an invalid image path: ${path}`);
    }
}

// The manifest was written by the job that ran the PR's dependencies, so nothing in it is trusted.
export function validateManifest(manifest) {
    if (!/^[0-9a-f]{64}$/.test(manifest?.fingerprint ?? '')) throw new Error('Manifest has an invalid fingerprint');
    for (const field of ['headSha', 'baseSha']) {
        if (typeof manifest[field] !== 'string' || !SHA.test(manifest[field])) throw new Error(`Manifest has an invalid ${field}`);
    }
    if (!Array.isArray(manifest.entries)) throw new Error('Manifest has no entries list');
    if (!Array.isArray(manifest.missingStories)) throw new Error('Manifest has no missingStories list');
    if (manifest.missingStories.length > MAX_MISSING_STORIES) throw new Error('Manifest lists too many components with no story');
    for (const file of manifest.missingStories) {
        if (typeof file !== 'string' || !COMPONENT_PATH.test(file)) throw new Error(`Manifest has an invalid component path: ${file}`);
    }
    if (!Number.isInteger(manifest.totalCaptures) || manifest.totalCaptures < 0) throw new Error('Manifest has no totalCaptures');
    const groupKeys = validateGroups(manifest.groups);
    const ids = new Set();
    for (const entry of manifest.entries) {
        validateEntry(entry, groupKeys);
        if (ids.has(entry.id)) throw new Error(`Manifest has a repeated capture id: ${entry.id}`);
        ids.add(entry.id);
    }
    for (const state of STATES) {
        const actual = manifest.entries.filter((entry) => entry.state === state).length;
        if (manifest.counts?.[state] !== actual) throw new Error(`Manifest count for ${state} doesn't match its entries`);
    }
    return manifest;
}

// The PR link comes last, so a manifest can't choose where it goes.
export function publishedManifest(manifest, { repo, prNumber, createdAt }) {
    return { ...manifest, createdAt, pull: { number: Number(prNumber), url: `https://github.com/${repo}/pull/${prNumber}` } };
}
