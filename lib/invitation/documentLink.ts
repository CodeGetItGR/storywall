import { linkSchema } from '@/lib/invitation/primitives';

// A link as typed, in the form the document stores: '' for none, a bare
// domain (facebook.com/name) with https:// added, or null when it can't be a link.
export function documentLink(value: string): string | null {
    const link = value.trim();
    if (!link || link === 'https://' || link === 'http://') return '';
    if (linkSchema.safeParse(link).success) return link;
    const withScheme = `https://${link}`;
    if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(link) && linkSchema.safeParse(withScheme).success) return withScheme;
    return null;
}
