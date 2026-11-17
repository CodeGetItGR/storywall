import { readFileSync } from 'node:fs';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

// The local old vs new check (scripts/save-my-date/parity.ts). The script
// writes the invitation to a file and points the dev server at it; the page
// 404s without that, and always in production.

export type ParityInput = { document: InvitationDocument; theme: ThemeDesign; media: Record<string, string> };

export function readParityInput(env: NodeJS.ProcessEnv = process.env): ParityInput | undefined {
    if (env.NODE_ENV === 'production' || !env.SMD_PARITY_INPUT) return undefined;
    return JSON.parse(readFileSync(env.SMD_PARITY_INPUT, 'utf8')) as ParityInput;
}

export const parityMedia =
    (input: ParityInput): MediaResolver =>
    (mediaId) =>
        input.media[mediaId];

export type PixelDiff = { differing: number; total: number; percent: number; mask: Uint8Array };

// Compares two RGBA images of the same size. A pixel differs when any channel
// is further apart than `tolerance`, which ignores tiny colour rounding but
// still catches a moved or missing element. `mask` marks the differing pixels.
export function comparePixels(a: Uint8Array, b: Uint8Array, width: number, height: number, tolerance = 16): PixelDiff {
    const total = width * height;
    const mask = new Uint8Array(total);
    let differing = 0;
    for (let i = 0; i < total; i += 1) {
        const p = i * 4;
        for (let channel = 0; channel < 4; channel += 1) {
            if (Math.abs(a[p + channel] - b[p + channel]) > tolerance) {
                mask[i] = 1;
                differing += 1;
                break;
            }
        }
    }
    return { differing, total, percent: total ? (differing / total) * 100 : 0, mask };
}
