import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WhyPhotoRow } from '@/components/occasions/sections/why/WhyPhotoRow';

const photo = (name: string) => ({ src: `/landing/${name}.webp`, width: 460, height: 600 });
const TILES = ['a', 'b', 'c'].map((name) => ({
    alt: `Photo ${name}`,
    avatar: photo(`avatar-${name}`),
    avatarAlt: `Face ${name}`,
    name: `Name ${name}`,
    photo: photo(name),
    role: 'aunt',
}));

afterEach(cleanup);

describe('WhyPhotoRow', () => {
    it('shows each photo once, named, with who posted it', () => {
        render(<WhyPhotoRow tiles={TILES} />);
        expect(screen.getAllByRole('img', { name: /^Photo / }).map((image) => image.getAttribute('alt'))).toEqual(['Photo a', 'Photo b', 'Photo c']);
        expect(screen.getByText('Name b')).toBeInTheDocument();
    });

    it('stands still and centred, the middle tile lower', () => {
        const { container } = render(<WhyPhotoRow tiles={TILES} />);
        expect(container.firstElementChild).toHaveClass('flex', 'justify-center', 'overflow-hidden');
        expect(container.querySelectorAll('[class*="even:mt-7.5"]')).toHaveLength(3);
    });
});
