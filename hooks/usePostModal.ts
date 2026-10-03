'use client';

import { useSearchParams } from 'next/navigation';

import { pushPageEntry } from '@/lib/overlayHistory';

const POST_PARAM = 'post';
// Older links can still carry these; closing the modal drops them too.
const LEGACY_PARAMS = ['media', 'view'];

// Opening and closing only rewrite the URL on the client: Next updates
// useSearchParams without a server render, so the modal never waits on the
// server. Each is its own Back step.
function pushSearchParams(update: (params: URLSearchParams) => void) {
    const url = new URL(window.location.href);
    update(url.searchParams);
    pushPageEntry(`${url.pathname}${url.search}`);
}

// A plain function rather than a hook, so a post card doesn't subscribe to
// the URL and re-render whenever any search param changes.
export function openPostModal(id: string) {
    pushSearchParams((params) => params.set(POST_PARAM, id));
}

export function usePostModal() {
    const postId = useSearchParams().get(POST_PARAM);

    function close() {
        pushSearchParams((params) => {
            for (const param of [POST_PARAM, ...LEGACY_PARAMS]) params.delete(param);
        });
    }

    return { postId, isOpen: postId !== null, close };
}
