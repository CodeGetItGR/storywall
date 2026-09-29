// Event type keys are UPPER_SNAKE (WEDDING, BABY_SHOWER); demo URLs use a lowercase-kebab slug
// (/demo/wedding, /demo/baby-shower).
export const DEFAULT_DEMO_EVENT_TYPE_SLUG = 'wedding';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isDemoEventTypeSlug(value: string): boolean {
    return SLUG_PATTERN.test(value);
}

export function demoEventTypeKeyFromSlug(slug: string): string {
    return slug.toUpperCase().replace(/-/g, '_');
}

export function demoEventTypeSlugFromKey(key: string): string {
    return key.toLowerCase().replace(/_/g, '-');
}
