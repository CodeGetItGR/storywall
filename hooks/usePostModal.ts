'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type PostModalView = 'media' | 'comments';

interface OpenPostModalOptions {
    // 0-based index into the post's media array. Omit (or 0) for the
    // default first item — kept out of the URL in that case.
    mediaIndex?: number;
    // Mobile-only: whether the comments sheet starts expanded. Ignored on
    // desktop (comments are always visible there) and ignored entirely
    // when the post has no media.
    view?: PostModalView;
}

export function usePostModal() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const postId = searchParams.get('post');
    const mediaIndex = Number(searchParams.get('media') ?? 0);
    const view: PostModalView = searchParams.get('view') === 'comments' ? 'comments' : 'media';

    function open(id: string, options: OpenPostModalOptions = {}) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('post', id);

        if (options.mediaIndex) {
            params.set('media', String(options.mediaIndex));
        } else {
            params.delete('media');
        }

        if (options.view === 'comments') {
            params.set('view', 'comments');
        } else {
            params.delete('view');
        }

        router.push(`${pathname}?${params.toString()}`);
    }

    // Paging through the carousel updates the URL without adding a history
    // entry per slide (replace, not push) — history is reserved for open/close.
    function setMediaIndex(index: number) {
        const params = new URLSearchParams(searchParams.toString());
        if (index) {
            params.set('media', String(index));
        } else {
            params.delete('media');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }

    function close() {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('post');
        params.delete('media');
        params.delete('view');
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    }

    return { postId, mediaIndex, view, isOpen: postId !== null, open, setMediaIndex, close };
}
