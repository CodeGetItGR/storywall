export const postKeys = {
    list: (eventId: string) => ['events', eventId, 'posts'] as const,
    detail: (id: string) => ['posts', id] as const,
    media: (postId: string) => ['posts', postId, 'media'] as const,
};

export const POSTS_PAGE_SIZE = 20;
