import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// Save my date pages, editor and plans. While this is false they show
// everywhere but the production site; there they 404 and stay out of the
// sitemap, every link and every plan.
export const SAVE_MY_DATE_LAUNCHED = false;

// The module whose plan lets a host publish the event's invitation.
export const SAVE_MY_DATE_MODULE_KEY = 'save_my_date';

export function showsSaveMyDate(env?: Parameters<typeof showsUnreleasedPages>[0]): boolean {
    return showsUnreleasedPages(env, SAVE_MY_DATE_LAUNCHED);
}

// The module rows an admin may see. Where Save my date is hidden, its module is too, so no plan,
// unlock or event type can be given it there.
export function withoutUnreleasedModules<T extends { moduleKey: string }>(modules: T[], env?: Parameters<typeof showsUnreleasedPages>[0]): T[] {
    return showsSaveMyDate(env) ? modules : modules.filter((module_) => module_.moduleKey !== SAVE_MY_DATE_MODULE_KEY);
}
