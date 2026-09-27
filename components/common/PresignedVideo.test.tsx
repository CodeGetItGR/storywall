import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PresignedVideo } from '@/components/common/PresignedVideo';

const FILE_A = 'https://bucket.acct.r2.cloudflarestorage.com/events/e1/media/a.mp4';
const FILE_B = 'https://bucket.acct.r2.cloudflarestorage.com/events/e1/media/b.mp4';
const signed = (url: string, window: string) => `${url}?X-Amz-Date=${window}&X-Amz-Signature=${window}`;

function videoSrc(container: HTMLElement) {
    return container.querySelector('video')!.getAttribute('src');
}

describe('PresignedVideo', () => {
    afterEach(cleanup);

    // A refetch after the signing window rolls over hands down a new URL for the same file.
    // Swapping it into the element would restart a video someone is watching.
    it('keeps its URL when the same file is re-signed', () => {
        const { container, rerender } = render(<PresignedVideo src={signed(FILE_A, '1000')} />);

        rerender(<PresignedVideo src={signed(FILE_A, '1020')} />);

        expect(videoSrc(container)).toBe(signed(FILE_A, '1000'));
    });

    it('takes the newest URL once the one it has fails', () => {
        const { container, rerender } = render(<PresignedVideo src={signed(FILE_A, '1000')} />);
        rerender(<PresignedVideo src={signed(FILE_A, '1020')} />);

        fireEvent.error(container.querySelector('video')!);

        expect(videoSrc(container)).toBe(signed(FILE_A, '1020'));
    });

    it('switches straight away when it is given a different file', () => {
        const { container, rerender } = render(<PresignedVideo src={signed(FILE_A, '1000')} />);

        rerender(<PresignedVideo src={signed(FILE_B, '1000')} />);

        expect(videoSrc(container)).toBe(signed(FILE_B, '1000'));
    });
});
