import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BusinessSectionIcon, type BusinessSectionKey } from '@/components/business/BusinessSectionIcon';

const KEYS: BusinessSectionKey[] = ['insights', 'events', 'content', 'printPrices', 'previews', 'contact'];

describe('BusinessSectionIcon', () => {
    afterEach(cleanup);

    it.each(KEYS)('renders a hidden decorative tile for %s', (section) => {
        const { container } = render(<BusinessSectionIcon section={section} />);
        const tile = container.firstElementChild as HTMLElement;

        expect(tile.getAttribute('aria-hidden')).toBe('true');
        expect(tile.querySelector('svg')).not.toBeNull();
    });
});
