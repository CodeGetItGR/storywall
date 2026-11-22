import { routes } from '@/lib/routes';

// ?edit=blocks on the feed opens edit mode (the Overview's Start editing). A one-shot trigger:
// replaced away on the client, then edit mode starts; anyone who can't edit just loses the param.
export const EDIT_PARAM = 'edit';
export const EDIT_BLOCKS_VALUE = 'blocks' as const;

export function feedEditHref(eventId: string): string {
    return routes.events.feed(eventId, { edit: EDIT_BLOCKS_VALUE });
}

export function isFeedEditRequest(search: Pick<URLSearchParams, 'get'>): boolean {
    return search.get(EDIT_PARAM) === EDIT_BLOCKS_VALUE;
}

export function withoutEditParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.delete(EDIT_PARAM);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}
