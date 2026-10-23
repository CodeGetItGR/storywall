// Incident switch: while on, every page shows the incident banner and the app
// refuses purchases and uploads before they reach Spring. Set to true to pause
// them during an incident.
export const INCIDENT_MODE = false;

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

// Whether a request is a purchase or an upload, regardless of the switch.
export function isPurchaseOrUpload(method: string | undefined, path: string, body: unknown): boolean {
    if (method !== 'POST') return false;
    return carriesFile(body) || isPurchasePath(path);
}

export function isPausedRequest(method: string | undefined, path: string, body: unknown): boolean {
    return INCIDENT_MODE && isPurchaseOrUpload(method, path, body);
}
