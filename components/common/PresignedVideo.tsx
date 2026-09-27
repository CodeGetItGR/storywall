'use client';

import { type ComponentProps, type SyntheticEvent, useState } from 'react';

import { samePresignedObject } from '@/lib/presignedUrls';

type PresignedVideoProps = Omit<ComponentProps<'video'>, 'src'> & { src: string };

// A <video> whose presigned `src` survives re-signing. Once per signing window a
// refetch hands down a new URL for the same file, and swapping that into the
// element would restart a video someone is watching. So it keeps the URL it has
// until that one fails (it expired), and only then takes the newest.
export function PresignedVideo({ src, onError, ...props }: PresignedVideoProps) {
    const [current, setCurrent] = useState(src);

    // A different file replaces the current one outright.
    if (!samePresignedObject(current, src)) {
        setCurrent(src);
    }

    function handleError(event: SyntheticEvent<HTMLVideoElement>) {
        if (current !== src) {
            setCurrent(src);
        }
        onError?.(event);
    }

    return <video {...props} src={samePresignedObject(current, src) ? current : src} onError={handleError} />;
}
