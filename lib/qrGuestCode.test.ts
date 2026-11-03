import { describe, expect, it } from 'vitest';

import { guestCodeStartView } from '@/lib/qrGuestCode';

describe('guestCodeStartView', () => {
    it('opens straight on the one thing a code offers', () => {
        expect(guestCodeStartView(['UPLOAD'])).toBe('upload');
        expect(guestCodeStartView(['WISH'])).toBe('wish');
    });

    it('shows the chooser when a code offers both', () => {
        expect(guestCodeStartView(['UPLOAD', 'WISH'])).toBe('chooser');
    });

    it('has nothing to show when a code offers nothing', () => {
        expect(guestCodeStartView([])).toBeNull();
        expect(guestCodeStartView(undefined)).toBeNull();
    });
});
