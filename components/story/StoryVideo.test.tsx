import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StoryVideo } from '@/components/story/StoryVideo';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const pause = vi.fn();
const play = vi.fn();

beforeEach(() => {
    pause.mockReset();
    play.mockReset();
    play.mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = pause;
    HTMLMediaElement.prototype.play = play;
});

afterEach(cleanup);

describe('StoryVideo paused', () => {
    it('neither pauses nor replays a video that was never paused', () => {
        render(<StoryVideo src="v.mp4" paused={false} />);

        expect(pause).not.toHaveBeenCalled();
        expect(play).not.toHaveBeenCalled();
    });

    it('pauses when paused turns true and plays again when it turns false', () => {
        const { rerender } = render(<StoryVideo src="v.mp4" paused={false} />);

        rerender(<StoryVideo src="v.mp4" paused={true} />);
        expect(pause).toHaveBeenCalledTimes(1);
        expect(play).not.toHaveBeenCalled();

        rerender(<StoryVideo src="v.mp4" paused={false} />);
        expect(play).toHaveBeenCalledTimes(1);
    });

    it('swallows a rejected play() instead of throwing', async () => {
        play.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
        const unhandled = vi.fn();
        process.on('unhandledRejection', unhandled);
        const { rerender } = render(<StoryVideo src="v.mp4" paused={true} />);

        rerender(<StoryVideo src="v.mp4" paused={false} />);
        await new Promise((resolve) => setTimeout(resolve, 0));

        process.off('unhandledRejection', unhandled);
        expect(play).toHaveBeenCalledTimes(1);
        expect(unhandled).not.toHaveBeenCalled();
    });
});
