import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CreateEventFeatureIcon } from '@/components/event/create/wizard/CreateEventFeatureIcon';

afterEach(cleanup);

describe('CreateEventFeatureIcon', () => {
    it('masks the landing icon for features that have one', () => {
        const { container } = render(<CreateEventFeatureIcon featureKey="gallery" size="big" />);
        const icon = container.firstElementChild as HTMLElement;
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(icon.style.getPropertyValue('--icon')).toContain('/landing/wedding/icons/gallery.webp');
    });

    it('draws a line icon for QR cards, co-hosts, theme and boy or girl', () => {
        for (const featureKey of ['qr_cards', 'co_hosts', 'theme', 'he_or_she'] as const) {
            const { container, unmount } = render(<CreateEventFeatureIcon featureKey={featureKey} size="small" />);
            const svg = container.querySelector('svg');
            expect(svg?.getAttribute('aria-hidden')).toBe('true');
            expect(svg?.querySelector('linearGradient')).not.toBeNull();
            unmount();
        }
    });
});
