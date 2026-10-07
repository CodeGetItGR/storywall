import { describe, expect, it } from 'vitest';

import type { EventModuleResponseDto, QrLinkResolutionDto } from '@/lib/api/types';
import { getQrRedirectPath, isMemberArchiveEnabled } from '@/lib/qrLinks';

const active = (targetType: QrLinkResolutionDto['targetType'], inviteToken?: string): QrLinkResolutionDto => ({
    status: 'ACTIVE',
    targetType,
    inviteToken,
});

describe('getQrRedirectPath', () => {
    // The invite page shows the event first and then asks whether the guest has an account.
    it('sends a scanner of the join link to the invite page', () => {
        expect(getQrRedirectPath(active('EVENT_JOIN', 'tok'))).toBe('/invite/tok');
    });

    it('sends a personal invitation to the invite page', () => {
        expect(getQrRedirectPath(active('INVITATION', 'tok'))).toBe('/invite/tok');
    });

    it('does not redirect a gallery upload link, a link without a token, or one that is not active', () => {
        expect(getQrRedirectPath(active('MEDIA_UPLOAD'))).toBeNull();
        expect(getQrRedirectPath(active('EVENT_JOIN'))).toBeNull();
        expect(getQrRedirectPath({ ...active('EVENT_JOIN', 'tok'), status: 'REVOKED' })).toBeNull();
        expect(getQrRedirectPath(undefined)).toBeNull();
    });
});

function gallery(isAvailable: boolean, configuration: Record<string, unknown> | null): EventModuleResponseDto[] {
    return [{ moduleKey: 'gallery', isAvailable, configuration } as EventModuleResponseDto];
}

describe('isMemberArchiveEnabled', () => {
    it('is on only when the gallery is available and the flag is exactly true', () => {
        expect(isMemberArchiveEnabled(gallery(true, { qrUploadEnabled: true, memberArchiveAfterEnd: true }))).toBe(true);
        expect(isMemberArchiveEnabled(gallery(false, { memberArchiveAfterEnd: true }))).toBe(false);
        expect(isMemberArchiveEnabled(gallery(true, { qrUploadEnabled: true }))).toBe(false);
        expect(isMemberArchiveEnabled(gallery(true, { memberArchiveAfterEnd: 'true' }))).toBe(false);
        expect(isMemberArchiveEnabled(gallery(true, null))).toBe(false);
        expect(isMemberArchiveEnabled(undefined)).toBe(false);
    });
});
