import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function audioElement() {
    const audio = document.querySelector('audio');
    if (!audio) throw new Error('no audio element');
    return audio;
}

describe('VoiceWishPlayer', () => {
    it('labels the button Play, then Pause', () => {
        const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
        render(<VoiceWishPlayer src="a.m4a" durationMs={42_000} />);
        expect(screen.getByText('0:42')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'play' }));
        expect(play).toHaveBeenCalled();
        fireEvent.play(audioElement());

        expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument();
    });

    it('has a thumb-sized button', () => {
        render(<VoiceWishPlayer src="a.m4a" durationMs={42_000} />);
        expect(screen.getByRole('button', { name: 'play' })).toHaveClass('h-11', 'w-11');
    });

    it('says when a recording cannot be played', () => {
        render(<VoiceWishPlayer src="a.m4a" durationMs={42_000} />);
        expect(screen.queryByText('cantPlay')).not.toBeInTheDocument();
        fireEvent.error(audioElement());
        expect(screen.getByText('cantPlay')).toBeInTheDocument();
    });
});
