// Incident switch: while on, every page shows the incident banner and the app
// refuses purchases and uploads before they reach Spring. Flip back to false
// once the incident is over.
export const INCIDENT_MODE = true;

// Checkout POSTs that start a payment: activation, upgrade, storage pack, extension.
const PURCHASE_PATH = /\/(upgrade-|storage-|extension-)?checkout$/;

export function isPurchasePath(path: string): boolean {
    return PURCHASE_PATH.test(path.split('?')[0]);
}

// Stands in for Spring's refusal while purchases and uploads are paused.
export const INCIDENT_PAUSED_ERROR_CODE = 'INCIDENT_PAUSED';

// Any multipart body carrying a file is an upload; a bug report sent without a screenshot is not.
function carriesFile(body: unknown): boolean {
    if (!(body instanceof FormData)) return false;
    for (const value of body.values()) {
        if (value instanceof Blob) return true;
    }
    return false;
}

export function isPausedRequest(method: string | undefined, path: string, body: unknown): boolean {
    if (!INCIDENT_MODE || method !== 'POST') return false;
    return carriesFile(body) || isPurchasePath(path);
}
