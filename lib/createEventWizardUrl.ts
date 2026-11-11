import {
    CREATE_EVENT_CODE_PARAM,
    CREATE_EVENT_OPTION_PARAM,
    CREATE_EVENT_PLAN_PARAM,
    CREATE_EVENT_RUN_PARAM,
    CREATE_EVENT_TYPE_PARAM,
} from '@/lib/createEventSteps';
import { routes } from '@/lib/routes';

// `?create=1` opens the create wizard as a pop-up over the page in the URL.
export const CREATE_WIZARD_PARAM = 'create';
export const CREATE_EVENT_STEP_PARAM = 'step';
// The compare-plans sheet on the plan step. Its own history entry, so Back closes it.
export const CREATE_EVENT_SHEET_PARAM = 'sheet';
export const PLANS_SHEET = 'plans';

// Every param the wizard reads or writes. Closing the pop-up removes them all.
const WIZARD_PARAMS = [
    CREATE_WIZARD_PARAM,
    CREATE_EVENT_STEP_PARAM,
    CREATE_EVENT_SHEET_PARAM,
    CREATE_EVENT_RUN_PARAM,
    CREATE_EVENT_TYPE_PARAM,
    CREATE_EVENT_PLAN_PARAM,
    CREATE_EVENT_OPTION_PARAM,
    CREATE_EVENT_CODE_PARAM,
] as const;

function relative(url: URL): string {
    return `${url.pathname}${url.search}${url.hash}`;
}

export function isWizardOpen(searchParams: URLSearchParams): boolean {
    return searchParams.get(CREATE_WIZARD_PARAM) === '1';
}

// A link (as written in an href) to the create page on this site.
export function isCreateEventHref(href: string, origin: string): boolean {
    try {
        const url = new URL(href, origin);
        return url.origin === origin && url.pathname === routes.events.new();
    } catch {
        return false;
    }
}

// The URL that opens the pop-up over the current page, carrying the clicked link's own params
// (type, plan, option, code), so it opens where the link would have.
export function wizardUrlForLink(createHref: string, current: URL): string {
    const target = new URL(withoutWizardParams(current), current.origin);
    target.searchParams.set(CREATE_WIZARD_PARAM, '1');
    new URL(createHref, current.origin).searchParams.forEach((value, key) => target.searchParams.set(key, value));
    return relative(target);
}

// The current URL with these params set (a string) or removed (null), everything else kept.
export function withWizardParams(current: URL, params: Partial<Record<(typeof WIZARD_PARAMS)[number], string | null>>): string {
    const next = new URL(current.href);
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') next.searchParams.delete(key);
        else next.searchParams.set(key, value);
    }
    return relative(next);
}

export function withoutWizardParams(current: URL): string {
    const next = new URL(current.href);
    for (const key of WIZARD_PARAMS) next.searchParams.delete(key);
    return relative(next);
}
