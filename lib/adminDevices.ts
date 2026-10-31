// Paired admin phones (spec 2026-10-28-admin-phone-widget-design).

export const ADMIN_DEVICE_NAME_MAX = 60;

export const ADMIN_DEVICE_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

// What the QR code holds. The phone talks to Spring at the same address the browser does.
export function devicePairingPayload(key: string): string {
    return JSON.stringify({ v: 1, api: process.env.NEXT_PUBLIC_API_BASE_URL ?? '', key });
}
