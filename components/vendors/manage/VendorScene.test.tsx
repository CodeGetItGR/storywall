import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { VendorScene } from '@/components/vendors/manage/VendorScene';

afterEach(cleanup);

describe('VendorScene', () => {
    it('always draws every type but marks only the allowed ones', () => {
        render(<VendorScene scene={{ types: ['PHOTOGRAPHER', 'PLANNER', 'MUSIC'], alt: 'scene alt' }} />);
        const scene = screen.getByRole('img', { name: 'scene alt' });
        const drawn = [...scene.querySelectorAll('svg [data-vendor-type]')].map((group) => group.getAttribute('data-vendor-type'));
        expect(drawn).toEqual(['base', 'VENUE', 'DECORATION', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'PLANNER', 'CATERING', 'MUSIC']);
        expect(scene.querySelectorAll(':scope > span')).toHaveLength(3);
    });
});
