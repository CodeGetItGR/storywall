const STATES = new Set(['changed', 'new', 'removed', 'failed']);
const IMAGE_PATH = /^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/;

// The manifest was written by the job that ran the PR's dependencies, so nothing in it is trusted.
export function validateManifest(manifest) {
    if (!/^[0-9a-f]{64}$/.test(manifest?.fingerprint ?? '')) throw new Error('Manifest has an invalid fingerprint');
    if (!Array.isArray(manifest.entries)) throw new Error('Manifest has no entries list');
    if (!Array.isArray(manifest.missingStories)) throw new Error('Manifest has no missingStories list');
    if (!Number.isInteger(manifest.totalCaptures)) throw new Error('Manifest has no totalCaptures');
    for (const state of STATES) {
        if (!Number.isInteger(manifest.counts?.[state])) throw new Error(`Manifest has no count for ${state}`);
    }
    for (const entry of manifest.entries) {
        if (!STATES.has(entry.state)) throw new Error(`Manifest entry has an unknown state: ${entry.state}`);
        for (const path of Object.values(entry.images ?? {})) {
            if (!IMAGE_PATH.test(path)) throw new Error(`Manifest entry has an invalid image path: ${path}`);
        }
    }
    return manifest;
}
