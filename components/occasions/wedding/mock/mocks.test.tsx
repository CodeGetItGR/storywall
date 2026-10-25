import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OccasionCommentCard } from '@/components/occasions/OccasionCommentCard';
import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { MockPhone } from '@/components/occasions/wedding/mock/MockPhone';
import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import { MockTabBar } from '@/components/occasions/wedding/mock/MockTabBar';

const FACE = { src: '/landing/wedding/wedding-guest-woman-sun-hat.webp', width: 320, height: 320, position: '50% 20%' };

afterEach(cleanup);

describe('wedding mocks', () => {
    it('draws a decorative photo, cropped where the map says, after the page text', () => {
        const { container } = render(<MockPhoto className="size-10" photo={FACE} sizes="40px" />);
        const image = container.querySelector('img')!;
        expect(image).toHaveAttribute('alt', '');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('fetchpriority', 'low');
        expect(image.style.objectPosition).toBe('50% 20%');
    });

    it('puts the screen in a container, so what it holds scales with the phone', () => {
        render(
            <MockPhone className="w-40">
                <p>screen</p>
            </MockPhone>,
        );
        expect(screen.getByText('screen').parentElement).toHaveClass('[container-type:inline-size]', 'aspect-[9/19.5]');
    });

    it('fills an icon mask with the brand gradient', () => {
        const { container } = render(<GradientIcon className="size-14" src="/landing/wedding/icons/roles.webp" />);
        expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--icon')).toBe("url('/landing/wedding/icons/roles.webp')");
    });

    it('draws six tabs with the first one current', () => {
        const { container } = render(<MockTabBar />);
        const icons = container.querySelectorAll('svg');
        expect(icons).toHaveLength(6);
        expect(icons[0]).toHaveClass('text-[#ff765f]');
    });

    it('draws each comment card with its own faces', () => {
        const { container: heart } = render(<OccasionCommentCard faces={[FACE, FACE]} variant="heart" />);
        expect(heart.querySelectorAll('img')).toHaveLength(2);
        expect(heart.firstElementChild).toHaveClass('aspect-[705/360]');
        const { container: avatar } = render(<OccasionCommentCard faces={[FACE]} variant="avatar" />);
        expect(avatar.querySelectorAll('img')).toHaveLength(1);
        expect(avatar.firstElementChild).toHaveClass('aspect-[557/300]');
    });
});
