import { describe, expect, it } from 'vitest';

import { guestChoiceRows } from '@/lib/invitationsQr';

describe('guestChoiceRows', () => {
    it('lists join, invitation, upload and wish in scan-page order', () => {
        expect(guestChoiceRows({ showInvitation: true, uploads: true, wishes: true })).toEqual(['join', 'invitation', 'upload', 'wish']);
    });

    it('always lists join, and only what the event offers', () => {
        expect(guestChoiceRows({ showInvitation: false, uploads: false, wishes: true })).toEqual(['join', 'wish']);
    });
});
