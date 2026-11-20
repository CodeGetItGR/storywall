import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto, QrLinkResponseDto, QrLinkStatus, QrTargetType } from '@/lib/api/types';
import { demoQrNoticeKey, demoQrResolution } from '@/lib/demo/demoQrLanding';
import { qrLandingPlan } from '@/lib/qrLanding';

const event = (wishbook: boolean) =>
    ({
        id: 'evt-demo',
        title: 'Maria & Nikos',
        subtitle: null,
        coverMedia: null,
        theme: null,
        modules: wishbook ? [{ moduleKey: 'wishbook', isAvailable: true }] : [],
    }) as unknown as EventDetailResponseDto;

const link = (token: string, targetType: QrTargetType, status: QrLinkStatus = 'ACTIVE') => ({ token, targetType, status }) as QrLinkResponseDto;

const links = [link('tok-join', 'EVENT_JOIN'), link('tok-upload', 'MEDIA_UPLOAD')];
const guest = { isMember: false, hasWishbook: false };

describe('demoQrResolution', () => {
    it('offers join, upload and wish on the join code, like a real scan', () => {
        const scanned = demoQrResolution(event(true), links, 'invite');
        expect(scanned?.token).toBe('tok-join');
        expect(qrLandingPlan(scanned?.resolution, guest)).toMatchObject({
            choices: ['join', 'upload', 'wish'],
            joinInviteToken: 'tok-join',
            uploadToken: 'tok-upload',
            wishToken: 'tok-join',
        });
    });

    it('offers join and upload on the gallery code, with no wish without a wishbook', () => {
        const scanned = demoQrResolution(event(false), links, 'upload');
        expect(scanned?.token).toBe('tok-upload');
        expect(qrLandingPlan(scanned?.resolution, guest).choices).toEqual(['join', 'upload']);
    });

    it('is null when the scanned code is missing or revoked', () => {
        expect(demoQrResolution(event(true), [link('tok-upload', 'MEDIA_UPLOAD')], 'invite')).toBeNull();
        expect(demoQrResolution(event(true), [link('tok-join', 'EVENT_JOIN'), link('tok-upload', 'MEDIA_UPLOAD', 'REVOKED')], 'upload')).toBeNull();
    });
});

describe('demoQrNoticeKey', () => {
    it('names the demo on the choices and the upload form, not on the wish form', () => {
        expect(demoQrNoticeKey('chooser')).toBe('inviteNotice');
        expect(demoQrNoticeKey('upload')).toBe('uploadNotice');
        expect(demoQrNoticeKey('wish')).toBeNull();
    });
});
