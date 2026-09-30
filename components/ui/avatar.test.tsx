import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Avatar from '@/components/ui/avatar';

afterEach(cleanup);

function image(container: HTMLElement) {
    return container.querySelector('img');
}

describe('Avatar', () => {
    it('shows the picture when there is one', () => {
        const { container } = render(<Avatar src="https://storage.test/a.jpg" initials="AN" />);
        expect(image(container)).not.toBeNull();
        expect(screen.queryByText('AN')).not.toBeInTheDocument();
    });

    it('falls back to the initials when the picture fails to load', () => {
        const { container } = render(<Avatar src="https://storage.test/a.jpg" initials="AN" />);

        fireEvent.error(image(container)!);

        expect(screen.getByText('AN')).toBeInTheDocument();
        expect(image(container)).toBeNull();
    });

    it('tries the picture again for a new src', () => {
        const { container, rerender } = render(<Avatar src="https://storage.test/a.jpg" initials="AN" />);
        fireEvent.error(image(container)!);

        rerender(<Avatar src="https://storage.test/b.jpg" initials="AN" />);

        expect(image(container)).not.toBeNull();
        expect(screen.queryByText('AN')).not.toBeInTheDocument();
    });
});
