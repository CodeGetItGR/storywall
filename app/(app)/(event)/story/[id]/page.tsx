import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { StoryResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { routes } from '@/lib/routes';

type PageProps = { params: Promise<{ id: string }> };

// Bare /story/:id has no event id — kept only so old bookmarks/links keep
// working. Unlike the other bare-path stubs, the event id here has to come
// from the story itself (not the active-event cookie), same lookup
// post/[id]/PageClient.tsx does for posts.
export default async function StoryRedirectPage({ params }: PageProps) {
    const { id } = await params;
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);

    let eventId: string | null = null;
    if (accessToken) {
        try {
            const story = await serverGet<StoryResponseDto>(endpoints.stories.byId(id), accessToken);
            eventId = story.eventId;
        } catch {
            // Falls through to the feed redirect below.
        }
    }

    redirect(eventId ? routes.events.story(eventId, id) : routes.feed);
}
