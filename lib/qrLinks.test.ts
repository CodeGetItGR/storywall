import { describe, expect, it } from 'vitest';

import type { QrLinkResolutionDto } from '@/lib/api/types';
import { getQrRedirectPath } from '@/lib/qrLinks';

const active = (targetType: QrLinkResolutionDto['targetType'], inviteToken?: string): QrLinkResolutionDto => ({
    status: 'ACTIVE',
    targetType,
    inviteToken,
});

describe('getQrRedirectPath', () => {
    it('sends an anonymous scanner of the join link straight to sign-up', () => {
        expect(getQrRedirectPath(active('EVENT_JOIN', 'tok'), false)).toBe('/register?invite=tok');
    });

    // /register bounces a signed-in visitor to /home and drops the invite; the
    // invite page can accept it for them or say why it can't.
    it('sends a signed-in scanner of the join link to the invite page', () => {
        expect(getQrRedirectPath(active('EVENT_JOIN', 'tok'), true)).toBe('/invite/tok');
    });

    it('sends a personal invitation to the invite page either way', () => {
        expect(getQrRedirectPath(active('INVITATION', 'tok'), false)).toBe('/invite/tok');
        expect(getQrRedirectPath(active('INVITATION', 'tok'), true)).toBe('/invite/tok');
    });

    it('does not redirect a gallery upload link, a link without a token, or one that is not active', () => {
        expect(getQrRedirectPath(active('MEDIA_UPLOAD'), true)).toBeNull();
        expect(getQrRedirectPath(active('EVENT_JOIN'), true)).toBeNull();
        expect(getQrRedirectPath({ ...active('EVENT_JOIN', 'tok'), status: 'REVOKED' }, true)).toBeNull();
        expect(getQrRedirectPath(undefined, true)).toBeNull();
    });
});
