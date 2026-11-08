import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { testEntry } from '../../testing/fixture';
import { CompareView } from './CompareView';

const entry = testEntry('a', { locale: 'el' });

function show(props: Partial<Parameters<typeof CompareView>[0]> = {}) {
    render(<CompareView entry={entry} compare="side" slider={50} onSlider={vi.fn()} {...props} />);
}

describe('CompareView', () => {
    afterEach(cleanup);

    it('shows before and after side by side, with real alt text', () => {
        show();
        expect(screen.getByRole('img', { name: 'Feed/PostCard, Default, Greek, mobile, before' })).toHaveAttribute('src', entry.images.before);
        expect(screen.getByRole('img', { name: 'Feed/PostCard, Default, Greek, mobile, after' })).toHaveAttribute('src', entry.images.after);
    });

    it('shows only the diff', () => {
        show({ compare: 'diff' });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: /diff$/ })).toHaveAttribute('src', entry.images.diff);
    });

    it('moves the slider', () => {
        const onSlider = vi.fn();
        show({ compare: 'slider', onSlider });
        fireEvent.change(screen.getByRole('slider', { name: 'Move the divider between before and after' }), { target: { value: '20' } });
        expect(onSlider).toHaveBeenCalledWith(20);
    });

    it('shows only after for a new story', () => {
        show({ entry: testEntry('a', { state: 'new', images: { after: 'img/a.webp' } }), compare: 'slider' });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: /after$/ })).toBeInTheDocument();
    });

    it('shows only before for a removed story', () => {
        show({ entry: testEntry('a', { state: 'removed', images: { before: 'img/a.webp' } }) });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: /before$/ })).toBeInTheDocument();
    });

    it('shows the error of a failed story as text', () => {
        const error = '<img src=x onerror=alert(1)>';
        show({ entry: testEntry('a', { state: 'failed', error, images: {} }) });
        expect(screen.getByText('This story failed')).toBeInTheDocument();
        expect(screen.getByText(error)).toBeInTheDocument();
        expect(screen.getByText('Fix it before these changes can be approved.')).toBeInTheDocument();
        expect(document.querySelector('img')).toBeNull();
    });

    it('says when a failed story has no error message', () => {
        show({ entry: testEntry('a', { state: 'failed', error: null, images: {} }) });
        expect(screen.getByText('No error message.')).toBeInTheDocument();
    });
});
