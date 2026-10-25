import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';

const FACE = { src: '/landing/wedding/wedding-marquee-avatar-ioanna.webp', width: 160, height: 160, position: '50% 20%' };

afterEach(cleanup);

describe('wedding mocks', () => {
    it('draws a photo with its alt, cropped where the map says, after the page text', () => {
        const { container } = render(<MockPhoto alt="Φωτογραφία καλεσμένου" className="size-10" photo={FACE} sizes="40px" />);
        const image = container.querySelector('img')!;
        expect(image).toHaveAttribute('alt', 'Φωτογραφία καλεσμένου');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('fetchpriority', 'low');
        expect(image.style.objectPosition).toBe('50% 20%');
    });

    it('fills an icon mask with the brand gradient', () => {
        const { container } = render(<GradientIcon className="size-14" src="/landing/wedding/icons/roles.webp" />);
        expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--icon')).toBe("url('/landing/wedding/icons/roles.webp')");
    });
});
