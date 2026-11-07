const STATES = new Set(['changed', 'new', 'removed', 'failed']);
const IMAGE_PATH = /^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/;
const COMPONENT_PATH = /^components\/[\w./-]+\.tsx$/;
const MAX_MISSING_STORIES = 200;

// The manifest was written by the job that ran the PR's dependencies, so nothing in it is trusted.
export function validateManifest(manifest) {
    if (!/^[0-9a-f]{64}$/.test(manifest?.fingerprint ?? '')) throw new Error('Manifest has an invalid fingerprint');
    if (!Array.isArray(manifest.entries)) throw new Error('Manifest has no entries list');
    if (!Array.isArray(manifest.missingStories)) throw new Error('Manifest has no missingStories list');
    if (manifest.missingStories.length > MAX_MISSING_STORIES) throw new Error('Manifest lists too many components with no story');
    for (const file of manifest.missingStories) {
        if (typeof file !== 'string' || !COMPONENT_PATH.test(file)) throw new Error(`Manifest has an invalid component path: ${file}`);
    }
    if (!Number.isInteger(manifest.totalCaptures) || manifest.totalCaptures < 0) throw new Error('Manifest has no totalCaptures');
    for (const entry of manifest.entries) {
        if (!STATES.has(entry.state)) throw new Error(`Manifest entry has an unknown state: ${entry.state}`);
        for (const path of Object.values(entry.images ?? {})) {
            if (typeof path !== 'string' || !IMAGE_PATH.test(path)) throw new Error(`Manifest entry has an invalid image path: ${path}`);
        }
    }
    for (const state of STATES) {
        const actual = manifest.entries.filter((entry) => entry.state === state).length;
        if (manifest.counts?.[state] !== actual) throw new Error(`Manifest count for ${state} doesn't match its entries`);
    }
    return manifest;
}
